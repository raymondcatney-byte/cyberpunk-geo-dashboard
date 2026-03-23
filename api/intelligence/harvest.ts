// POST /api/intelligence/harvest
// TRIAD v2 harvester: produces raw events + fused signals (heuristics-only).

import { Receiver } from '@upstash/qstash';

import { WATCHTOWER_FEEDS } from '../../server/watchtower_feeds.js';
import { readLatest, setIfNotExists, storeLatest } from '../../server/intelligence_store.js';

type Domain = 'markets' | 'crypto' | 'geopolitics' | 'biotech' | 'ai' | 'robotics';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type SourceType = 'official' | 'reference' | 'other';

type Evidence = { source: string; url: string; snippet?: string };

type RawEvent = {
  id: string;
  domain: Domain;
  severity: Severity;
  title: string;
  timestamp: string;
  source: string;
  sourceType: SourceType;
  url?: string;
  lat?: number;
  lng?: number;
  countryCode?: string;
  confidence: number; // 0..1
  payload: Record<string, unknown>;
};

type CollectorHealth = {
  id: string;
  domain: Domain;
  status: 'ok' | 'degraded';
  lastRunAt: string;
  lastOkAt?: string;
  lastError?: string;
  emitted: number;
};

type FusedSignal = {
  id: string;
  domain: Domain;
  relatedDomains: Domain[];
  severity: Severity;
  title: string;
  timestamp: string;
  thesis: string;
  why_now: string;
  next_moves: string[];
  watch_indicators: string[];
  relatedEventIds: string[];
  evidence: Evidence[];
  confidenceScore: number; // 0..1
  needs_confirmation?: boolean;
  lat?: number;
  lng?: number;
  score: number;
};

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function isoNow() {
  return new Date().toISOString();
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function hashId(s: string) {
  // Simple non-crypto hash to keep IDs stable-ish across harvests.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h${(h >>> 0).toString(16)}`;
}

function severityFromTitle(title: string): Severity {
  const t = title.toLowerCase();
  if (/(nuclear|invasion|missile|assassinat|coup|martial law|state of emergency)/i.test(t)) return 'critical';
  if (/(attack|strike|killed|explosion|sanction|embargo|collapse|default|crisis|lockdown)/i.test(t)) return 'high';
  if (/(warn|tension|protest|lawsuit|investigation|outage|breach|recall|halt|delay)/i.test(t)) return 'medium';
  return 'low';
}

function severityWeight(s: Severity) {
  switch (s) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

function defaultLatLngForDomain(domain: Domain): { lat: number; lng: number } {
  switch (domain) {
    case 'markets':
      return { lat: 40.706, lng: -74.009 }; // NYC
    case 'crypto':
      return { lat: 37.7749, lng: -122.4194 }; // SF
    case 'biotech':
      return { lat: 38.9072, lng: -77.0369 }; // DC
    case 'ai':
      return { lat: 47.6062, lng: -122.3321 }; // Seattle-ish
    case 'robotics':
      return { lat: 35.6895, lng: 139.6917 }; // Tokyo
    case 'geopolitics':
    default:
      return { lat: 20, lng: 0 };
  }
}

async function fetchJson(url: string, timeoutMs: number) {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.json();
  } finally {
    cancel();
  }
}

async function fetchText(url: string, timeoutMs: number) {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const r = await fetch(url, { headers: { Accept: '*/*' }, signal });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.text();
  } finally {
    cancel();
  }
}

function decodeEntities(s: string) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code)) return '';
      try {
        return String.fromCharCode(code);
      } catch {
        return '';
      }
    });
}

function stripTags(s: string) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickTag(block: string, tag: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = String(block || '').match(re);
  return m ? stripTags(decodeEntities(String(m[1] || '')).trim()) : '';
}

function pickAtomLink(block: string) {
  const m = String(block || '').match(/<link\s+[^>]*href\s*=\s*"([^"]+)"[^>]*>/i);
  return m ? String(m[1] || '').trim() : '';
}

function parseFeed(xml: string) {
  const out: Array<{ title: string; url: string; publishedAt?: string }> = [];
  const s = String(xml || '');
  const isAtom = /<feed\b/i.test(s) && /<entry\b/i.test(s);

  if (isAtom) {
    const entries = Array.from(s.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((m) => m[0]);
    for (const e of entries) {
      const title = pickTag(e, 'title');
      const url = pickAtomLink(e) || pickTag(e, 'link');
      const published = pickTag(e, 'updated') || pickTag(e, 'published');
      if (!title || !url) continue;
      out.push({ title, url, publishedAt: published || undefined });
    }
    return out;
  }

  const items = Array.from(s.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((m) => m[0]);
  for (const it of items) {
    const title = pickTag(it, 'title');
    const url = pickTag(it, 'link');
    const published = pickTag(it, 'pubDate') || pickTag(it, 'date');
    if (!title || !url) continue;
    out.push({ title, url, publishedAt: published || undefined });
  }

  return out;
}

function domainFromFeedTags(tags: string[]): Domain {
  const joined = tags.join(' ').toLowerCase();
  if (joined.includes('biotech') || joined.includes('health') || joined.includes('fda') || joined.includes('nih') || joined.includes('pharma')) return 'biotech';
  if (joined.includes('robot')) return 'robotics';
  if (joined.includes('ai') || joined.includes('ml') || joined.includes('agentic') || joined.includes('arxiv')) return 'ai';
  if (joined.includes('finance') || joined.includes('markets') || joined.includes('sec') || joined.includes('macro') || joined.includes('rates')) return 'markets';
  if (joined.includes('crypto')) return 'crypto';
  return 'geopolitics';
}

function sourceTypeFromTags(tags: string[]): SourceType {
  const joined = tags.join(' ').toLowerCase();
  if (joined.includes('official') || joined.includes('primary') || joined.includes('gov')) return 'official';
  if (joined.includes('reference')) return 'reference';
  return 'other';
}

function normalizeClaimKey(title: string): string {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'from', 'as', 'at']);
  const tokens = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t));

  return tokens.slice(0, 8).join(' ');
}

async function getCryptoCollector(): Promise<RawEvent[]> {
  const data = await fetchJson('https://api.coingecko.com/api/v3/search/trending', 8000).catch(() => null);
  if (!data || !Array.isArray((data as any).coins)) return [];

  const ts = isoNow();
  const { lat, lng } = defaultLatLngForDomain('crypto');

  const out: RawEvent[] = [];
  for (const row of (data as any).coins.slice(0, 8)) {
    const item = row?.item;
    const name = String(item?.name || '').trim();
    if (!name) continue;
    const symbol = String(item?.symbol || '').trim();
    const title = `Trending crypto: ${name}${symbol ? ` (${symbol})` : ''}`;

    out.push({
      id: hashId(`crypto:coingecko:${name}:${ts.slice(0, 13)}`),
      domain: 'crypto',
      severity: 'medium',
      title,
      timestamp: ts,
      source: 'CoinGecko',
      sourceType: 'reference',
      url: 'https://www.coingecko.com/en/discover',
      lat,
      lng,
      confidence: 0.55,
      payload: { symbol, score: item?.score ?? null },
    });
  }

  return out;
}

async function getGdacsCollector(): Promise<RawEvent[]> {
  const data = await fetchJson('https://www.gdacs.org/gdacsapi/api/events/geteventlist/js', 9000).catch(() => null);
  const features = data && Array.isArray((data as any).features) ? (data as any).features : [];

  const out: RawEvent[] = [];
  for (const feat of features.slice(0, 10)) {
    const props = feat?.properties || {};
    const geom = feat?.geometry?.coordinates;
    const title = String(props?.eventname || props?.name || '').trim();
    if (!title) continue;

    const lng = Array.isArray(geom) ? Number(geom[0]) : NaN;
    const lat = Array.isArray(geom) ? Number(geom[1]) : NaN;

    const url = props?.url ? String(props.url) : 'https://www.gdacs.org/';
    const ts = props?.fromdate ? new Date(String(props.fromdate)).toISOString() : isoNow();

    out.push({
      id: hashId(`gdacs:${url}:${ts.slice(0, 10)}`),
      domain: 'geopolitics',
      severity: severityFromTitle(title),
      title: `GDACS Alert: ${title}`,
      timestamp: ts,
      source: 'GDACS',
      sourceType: 'official',
      url,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      confidence: 0.75,
      payload: { description: props?.description ?? null, severity: props?.severity ?? null },
    });
  }

  return out;
}

async function getMarketsCollector(): Promise<RawEvent[]> {
  const ts = isoNow();
  const { lat, lng } = defaultLatLngForDomain('markets');

  const out: RawEvent[] = [];

  // Crypto spot (Coinbase stats). Emit only meaningful deltas.
  await Promise.all(
    ['BTC-USD', 'ETH-USD'].map(async (product) => {
      const stats = await fetchJson(`https://api.exchange.coinbase.com/products/${product}/stats`, 6000).catch(() => null);
      if (!stats) return;
      const open = Number((stats as any).open);
      const last = Number((stats as any).last);
      if (!Number.isFinite(open) || !Number.isFinite(last) || open === 0) return;
      const pct = ((last - open) / open) * 100;
      if (Math.abs(pct) < 3) return;

      out.push({
        id: hashId(`mkt:${product}:${ts.slice(0, 13)}`),
        domain: 'markets',
        severity: Math.abs(pct) >= 6 ? 'high' : 'medium',
        title: `${product} move: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        timestamp: ts,
        source: 'Coinbase',
        sourceType: 'reference',
        url: 'https://exchange.coinbase.com',
        lat,
        lng,
        confidence: 0.7,
        payload: { symbol: product, open, last, percentChange: pct },
      });
    })
  );

  // Equities (Stooq). Emit only meaningful deltas.
  const stooqMap: Record<string, string> = {
    SPY: 'spy.us',
    QQQ: 'qqq.us',
    NVDA: 'nvda.us',
    AAPL: 'aapl.us',
    TSLA: 'tsla.us',
  };

  await Promise.all(
    Object.entries(stooqMap).map(async ([sym, code]) => {
      const csv = await fetchText(`https://stooq.com/q/l/?s=${encodeURIComponent(code)}&f=sd2t2ohlcv&h&e=csv`, 6000).catch(
        () => ''
      );
      const lines = String(csv).trim().split('\n');
      if (lines.length < 2) return;
      const cols = lines[1].split(',');
      // Date,Time,Open,High,Low,Close,Volume
      const open = Number(cols[2]);
      const close = Number(cols[5]);
      if (!Number.isFinite(open) || !Number.isFinite(close) || open === 0) return;
      const pct = ((close - open) / open) * 100;
      if (Math.abs(pct) < 2) return;

      out.push({
        id: hashId(`mkt:${sym}:${ts.slice(0, 13)}`),
        domain: 'markets',
        severity: Math.abs(pct) >= 6 ? 'high' : 'medium',
        title: `${sym} move: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        timestamp: ts,
        source: 'Stooq',
        sourceType: 'reference',
        url: 'https://stooq.com',
        lat,
        lng,
        confidence: 0.6,
        payload: { symbol: sym, open, close, percentChange: pct },
      });
    })
  );

  return out;
}

async function getRssCollector(): Promise<RawEvent[]> {
  const feeds = Array.isArray(WATCHTOWER_FEEDS) ? WATCHTOWER_FEEDS.slice(0, 20) : [];

  const settled = await Promise.allSettled(
    feeds.map(async (f: any) => {
      const xml = await fetchText(String(f.url), 8000);
      const items = parseFeed(xml).slice(0, 10);
      const tags = Array.isArray(f.tags) ? f.tags.map((x: any) => String(x)) : [];
      const domain = domainFromFeedTags(tags);
      const sourceType = sourceTypeFromTags(tags);
      const { lat, lng } = defaultLatLngForDomain(domain);

      const out: RawEvent[] = [];
      for (const it of items) {
        const title = it.title;
        const severity = severityFromTitle(title);
        const publishedAt = it.publishedAt ? new Date(it.publishedAt).toISOString() : isoNow();
        out.push({
          id: hashId(`${domain}:${String(f.id)}:${it.url}:${publishedAt.slice(0, 10)}`),
          domain,
          severity,
          title,
          timestamp: publishedAt,
          source: String(f.name || f.id || 'Feed'),
          sourceType,
          url: it.url,
          lat,
          lng,
          confidence: sourceType === 'official' ? 0.75 : sourceType === 'reference' ? 0.65 : 0.55,
          payload: { region: f.region ?? null, tags },
        });
      }

      return out;
    })
  );

  const out: RawEvent[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') out.push(...s.value);
  }

  return out;
}

type CollectorDef = {
  id: string;
  domain: Domain;
  timeoutMs: number;
  fetch: () => Promise<RawEvent[]>;
};

async function getNewsAPICollector(): Promise<RawEvent[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.warn('[harvest] NEWSAPI_KEY not set, skipping NewsAPI collector');
    return [];
  }

  const categories = ['general', 'business', 'technology'];
  const allEvents: RawEvent[] = [];

  for (const category of categories) {
    try {
      const data = await fetchJson(
        `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=10&apiKey=${apiKey}`,
        10000
      );

      const articles = Array.isArray((data as any).articles) ? (data as any).articles : [];
      const { lat, lng } = defaultLatLngForDomain('geopolitics');

      for (const article of articles.slice(0, 8)) {
        const title = String(article?.title || '').trim();
        if (!title || title.toLowerCase().includes('[removed]')) continue;

        const sourceName = String(article?.source?.name || 'NewsAPI');
        const publishedAt = article?.publishedAt ? new Date(String(article.publishedAt)).toISOString() : isoNow();
        const url = String(article?.url || '');
        const description = String(article?.description || '');

        // Detect domain from title + description
        const combinedText = `${title} ${description}`.toLowerCase();
        let domain: Domain = 'geopolitics';
        if (combinedText.includes('crypto') || combinedText.includes('bitcoin') || combinedText.includes('ethereum')) {
          domain = 'crypto';
        } else if (combinedText.includes('stock') || combinedText.includes('market') || combinedText.includes('trade')) {
          domain = 'markets';
        } else if (combinedText.includes('ai') || combinedText.includes('artificial intelligence') || combinedText.includes('chatgpt')) {
          domain = 'ai';
        } else if (combinedText.includes('biotech') || combinedText.includes('fda') || combinedText.includes('drug') || combinedText.includes('vaccine')) {
          domain = 'biotech';
        }

        allEvents.push({
          id: hashId(`newsapi:${category}:${url}:${publishedAt.slice(0, 10)}`),
          domain,
          severity: severityFromTitle(title),
          title,
          timestamp: publishedAt,
          source: sourceName,
          sourceType: 'reference',
          url,
          lat,
          lng,
          confidence: 0.7,
          payload: { category, description: description.slice(0, 200) },
        });
      }
    } catch (err) {
      console.warn(`[harvest] NewsAPI ${category} failed:`, err);
    }
  }

  return allEvents;
}

// NASA FIRMS - Fire Information for Resource Management System
// Provides fire/hotspot data for conflict zones and environmental monitoring
async function getNasaFirmsCollector(): Promise<RawEvent[]> {
  try {
    // Fetch last 24 hours of fire data (worldwide, MODIS satellite)
    // Using the public CSV API (no API key required for basic access)
    const csv = await fetchText(
      'https://firms.modaps.eosdis.nasa.gov/api/area/csv/v1/VIIRS_NOAA20_NRT/world/1/2025-03-19',
      15000
    );
    
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Parse CSV header to find column indices
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_ti4');
    const scanIdx = headers.indexOf('scan');
    const trackIdx = headers.indexOf('track');
    const acqDateIdx = headers.indexOf('acq_date');
    const acqTimeIdx = headers.indexOf('acq_time');
    const satelliteIdx = headers.indexOf('satellite');
    const confidenceIdx = headers.indexOf('confidence');
    
    if (latIdx === -1 || lonIdx === -1) return [];
    
    const out: RawEvent[] = [];
    const ts = isoNow();
    
    // Process only high-confidence fires (top 15)
    const fires = lines.slice(1)
      .map(line => {
        const cols = line.split(',');
        return {
          lat: parseFloat(cols[latIdx] || '0'),
          lng: parseFloat(cols[lonIdx] || '0'),
          brightness: parseFloat(cols[brightIdx] || '0'),
          confidence: cols[confidenceIdx] || 'l',
          scan: parseFloat(cols[scanIdx] || '0'),
          track: parseFloat(cols[trackIdx] || '0'),
          acqDate: cols[acqDateIdx] || '',
          acqTime: cols[acqTimeIdx] || '',
          satellite: cols[satelliteIdx] || '',
        };
      })
      .filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
      .sort((a, b) => b.brightness - a.brightness)
      .slice(0, 15);
    
    for (const fire of fires) {
      const confidence = fire.confidence === 'h' ? 'high' : fire.confidence === 'n' ? 'medium' : 'low';
      const severity: Severity = fire.brightness > 350 ? 'critical' : fire.brightness > 330 ? 'high' : 'medium';
      
      out.push({
        id: hashId(`nasa:firms:${fire.lat.toFixed(2)}:${fire.lng.toFixed(2)}:${fire.acqDate}`),
        domain: 'geopolitics',
        severity,
        title: `Thermal anomaly detected (${fire.brightness.toFixed(1)}K brightness)`,
        timestamp: ts,
        source: 'NASA FIRMS',
        sourceType: 'official',
        url: `https://firms.modaps.eosdis.nasa.gov/map/#d:${fire.acqDate};@${fire.lng},${fire.lat},8z`,
        lat: fire.lat,
        lng: fire.lng,
        confidence: confidence === 'high' ? 0.85 : confidence === 'medium' ? 0.7 : 0.5,
        payload: { 
          brightness: fire.brightness, 
          scan: fire.scan, 
          track: fire.track,
          satellite: fire.satellite,
          type: 'thermal_anomaly'
        },
      });
    }
    
    return out;
  } catch (err) {
    console.warn('[harvest] NASA FIRMS failed:', err);
    return [];
  }
}

// CelesTrak - Satellite orbital data
// Provides satellite positions for globe visualization
async function getCelesTrakCollector(): Promise<RawEvent[]> {
  try {
    // Fetch active satellites from popular groups
    const groups = ['visual', 'weather', 'noaa', 'goes'];
    const allSatellites: RawEvent[] = [];
    
    for (const group of groups) {
      try {
        const text = await fetchText(
          `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
          8000
        );
        
        const lines = text.trim().split('\n');
        // TLE format: 3 lines per satellite (name, line1, line2)
        for (let i = 0; i < lines.length - 2; i += 3) {
          const name = lines[i].trim();
          if (!name) continue;
          
          // Parse TLE line 2 for orbital elements (simplified)
          const line2 = lines[i + 2];
          if (!line2 || line2.length < 60) continue;
          
          // Extract inclination from TLE (positions 09-16)
          const inclination = parseFloat(line2.substring(8, 16).trim());
          
          allSatellites.push({
            id: hashId(`celestrak:${group}:${name}`),
            domain: 'geopolitics',
            severity: 'low',
            title: `Satellite: ${name}`,
            timestamp: isoNow(),
            source: 'CelesTrak',
            sourceType: 'reference',
            url: `https://celestrak.org/satcat/search.php?q=${encodeURIComponent(name)}`,
            confidence: 0.9,
            payload: { 
              group, 
              inclination,
              type: 'satellite'
            },
          });
        }
      } catch (e) {
        console.warn(`[harvest] CelesTrak ${group} failed:`, e);
      }
    }
    
    // Return max 20 satellites to avoid overwhelming
    return allSatellites.slice(0, 20);
  } catch (err) {
    console.warn('[harvest] CelesTrak failed:', err);
    return [];
  }
}

const COLLECTORS: CollectorDef[] = [
  { id: 'newsapi:headlines', domain: 'geopolitics', timeoutMs: 15000, fetch: getNewsAPICollector },
  { id: 'nasa:firms', domain: 'geopolitics', timeoutMs: 15000, fetch: getNasaFirmsCollector },
  { id: 'celestrak:satellites', domain: 'geopolitics', timeoutMs: 12000, fetch: getCelesTrakCollector },
  { id: 'crypto:coingecko', domain: 'crypto', timeoutMs: 9000, fetch: getCryptoCollector },
  { id: 'geopol:gdacs', domain: 'geopolitics', timeoutMs: 10000, fetch: getGdacsCollector },
  { id: 'markets:delta', domain: 'markets', timeoutMs: 12000, fetch: getMarketsCollector },
  { id: 'rss:watchtower', domain: 'geopolitics', timeoutMs: 15000, fetch: getRssCollector },
];

function dedupeByUrlOrTitle(events: RawEvent[], cap: number) {
  const seen = new Set<string>();
  const out: RawEvent[] = [];

  for (const e of events) {
    const key = e.url ? `u:${e.url}` : `t:${e.domain}:${e.source}:${e.title}:${e.timestamp.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= cap) break;
  }

  return out;
}

function pickBestGeo(events: RawEvent[], domain: Domain) {
  for (const e of events) {
    if (typeof e.lat === 'number' && typeof e.lng === 'number') return { lat: e.lat, lng: e.lng };
  }
  return defaultLatLngForDomain(domain);
}

function makeFusedNarrative(params: {
  domain: Domain;
  title: string;
  sources: string[];
  verified: boolean;
  count: number;
}) {
  const { domain, title, sources, verified, count } = params;

  const thesisPrefix = verified
    ? 'Multiple independent sources converge on the same claim.'
    : 'Early signal with limited confirmation; treat as provisional.';

  const domainLine =
    domain === 'geopolitics'
      ? 'The binding constraints are geography, supply lines, and coercive instruments (sanctions, tariffs, basing).'
      : domain === 'markets'
        ? 'Market price action is reacting to new constraints; focus on liquidity, positioning, and second-order effects.'
        : domain === 'crypto'
          ? 'Separate narrative volatility from operational constraints (energy, regulation, custody, exchange flows).'
          : domain === 'biotech'
            ? 'Biotech signals propagate through regulation, trial timelines, manufacturing capacity, and supply chain fragility.'
            : domain === 'ai'
              ? 'AI signals propagate through compute constraints, export controls, and model capability inflection points.'
              : 'Robotics signals propagate through supply chains, defense procurement, and industrial scaling limits.';

  const thesis = `${thesisPrefix} ${domainLine}`;
  const whyNow = `Signal density increased: ${count} items across ${sources.length} source(s) (${sources.slice(0, 4).join(', ')}).`;

  const nextMoves =
    domain === 'geopolitics'
      ? ['Map chokepoints and dependencies', 'Identify leverage (secondary sanctions, denial, alliance disruption)', 'Monitor cascade triggers']
      : domain === 'markets'
        ? ['Quantify exposure and correlation', 'Watch liquidity and credit stress', 'Hedge tail risk; avoid narrative traps']
        : domain === 'crypto'
          ? ['Check flows and custody signals', 'Watch regulation and exchange outages', 'Separate accumulation vs panic behavior']
          : domain === 'biotech'
            ? ['Watch FDA/NIH updates and trial statuses', 'Monitor manufacturing/supply signals', 'Map second-order exposure (insurers, suppliers)']
            : domain === 'ai'
              ? ['Watch export controls and GPU availability', 'Track capability benchmarks and deployments', 'Monitor compute and energy constraints']
              : ['Watch procurement + factory scaling', 'Track components (sensors, motors, batteries)', 'Monitor regulatory and safety constraints'];

  const indicators =
    domain === 'geopolitics'
      ? ['Official statements + sanctions bulletins', 'Shipping/airspace disruptions', 'Energy price spikes and inventory draws']
      : domain === 'markets'
        ? ['Volatility regime shifts', 'Credit spreads', 'Large index/sector moves >2%']
        : domain === 'crypto'
          ? ['Exchange inflows/outflows', 'Stablecoin supply changes', 'Large moves >10% with whale activity']
          : domain === 'biotech'
            ? ['Trial halts/holds', 'Recall notices', 'Manufacturing disruptions']
            : domain === 'ai'
              ? ['Export control announcements', 'Data-center buildouts', 'Model releases tied to new compute']
              : ['Defense/industrial contracts', 'Factory commissioning', 'Component shortages'];

  return { thesis, whyNow, nextMoves, indicators };
}

function buildFusedFromClusters(raw: RawEvent[]) {
  const byClaim = new Map<string, RawEvent[]>();
  for (const e of raw) {
    const key = normalizeClaimKey(e.title) || e.title.toLowerCase();
    if (!byClaim.has(key)) byClaim.set(key, []);
    byClaim.get(key)!.push(e);
  }

  const fused: FusedSignal[] = [];

  for (const [claimKey, events] of byClaim.entries()) {
    if (!claimKey || events.length === 0) continue;

    // Determine primary domain by max severity weight; tie-break by count.
    const domains = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.domain] = (acc[e.domain] || 0) + 1;
      return acc;
    }, {});

    const relatedDomains = Object.keys(domains) as Domain[];

    const sortedBySeverity = [...events].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
    const top = sortedBySeverity[0]!;

    const sources = Array.from(new Set(events.map((e) => e.source)));
    const hasOfficial = events.some((e) => e.sourceType === 'official');
    const hasReference = events.some((e) => e.sourceType === 'reference');
    const verified = sources.length >= 2 || (hasOfficial && hasReference);

    const confidenceScore = clamp01(
      0.35 +
        Math.min(0.45, sources.length * 0.12) +
        (hasOfficial ? 0.18 : 0) +
        (hasReference ? 0.08 : 0) -
        (verified ? 0 : 0.12)
    );

    const narrative = makeFusedNarrative({
      domain: top.domain,
      title: top.title,
      sources,
      verified,
      count: events.length,
    });

    const { lat, lng } = pickBestGeo(events, top.domain);

    const evidence: Evidence[] = events
      .filter((e) => !!e.url)
      .slice(0, 6)
      .map((e) => ({ source: e.source, url: String(e.url) }));

    const relatedEventIds = events.map((e) => e.id);
    const ts = top.timestamp;

    const score =
      severityWeight(top.severity) +
      confidenceScore * 2 +
      (verified ? 1 : 0) +
      Math.max(0, relatedDomains.length - 1) * 0.6;

    fused.push({
      id: hashId(`fused:${top.domain}:${claimKey}:${ts.slice(0, 13)}`),
      domain: top.domain,
      relatedDomains,
      severity: top.severity,
      title: top.title,
      timestamp: ts,
      thesis: narrative.thesis,
      why_now: narrative.whyNow,
      next_moves: narrative.nextMoves,
      watch_indicators: narrative.indicators,
      relatedEventIds,
      evidence,
      confidenceScore,
      needs_confirmation: !verified,
      lat,
      lng,
      score,
    });
  }

  return fused;
}

function buildCorrelationSignals(raw: RawEvent[], windowHours: number) {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  const recent = raw.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && now - t <= windowMs;
  });

  const geo = recent.filter((e) => e.domain === 'geopolitics' && (e.severity === 'high' || e.severity === 'critical'));
  const mkt = recent.filter((e) => e.domain === 'markets' && (e.severity === 'high' || e.severity === 'medium'));
  const cry = recent.filter((e) => e.domain === 'crypto' && (e.severity === 'high' || e.severity === 'medium'));

  const out: FusedSignal[] = [];

  // Rule A: Risk-off cascade
  if (geo.length > 0 && mkt.length > 0) {
    const title = 'Cross-domain pressure: geopolitics -> markets';
    const related = [...geo.slice(0, 2), ...mkt.slice(0, 2), ...cry.slice(0, 1)];
    const evidence = related.filter((e) => !!e.url).slice(0, 6).map((e) => ({ source: e.source, url: String(e.url) }));
    const relatedDomains = Array.from(new Set(related.map((e) => e.domain)));
    const severity: Severity = geo.some((e) => e.severity === 'critical') ? 'critical' : 'high';
    const confidenceScore = clamp01(0.55 + Math.min(0.25, relatedDomains.length * 0.08) + Math.min(0.2, evidence.length * 0.03));
    const { lat, lng } = pickBestGeo(related, 'geopolitics');

    out.push({
      id: hashId(`corr:riskoff:${new Date().toISOString().slice(0, 13)}`),
      domain: 'geopolitics',
      relatedDomains: relatedDomains as Domain[],
      severity,
      title,
      timestamp: isoNow(),
      thesis:
        'Geopolitical pressure is propagating into financial conditions. Treat this as a regime shift until proven otherwise: shocks move through energy, logistics, and policy, then reprice risk assets.',
      why_now: `Multiple high-severity geopolitical items overlap with market dislocations inside a ${windowHours}h window.`,
      next_moves: ['Hedge tail risk; reduce crowded exposure', 'Track policy response windows', 'Watch second-order knock-ons (credit, shipping, energy)'],
      watch_indicators: ['Energy price spikes', 'Shipping/airspace disruptions', 'Index/sector moves >2% with volatility expansion'],
      relatedEventIds: related.map((e) => e.id),
      evidence,
      confidenceScore,
      lat,
      lng,
      score: severityWeight(severity) + confidenceScore * 2 + relatedDomains.length * 0.6,
    });
  }

  // Rule B: Cross-domain clustering (>=2 domains, high severity)
  const byDomain = recent.reduce<Record<string, number>>((acc, e) => {
    if (e.severity === 'high' || e.severity === 'critical') acc[e.domain] = (acc[e.domain] || 0) + 1;
    return acc;
  }, {});
  const hotDomains = Object.keys(byDomain).filter((d) => byDomain[d] > 0);
  if (hotDomains.length >= 2) {
    const related = recent
      .filter((e) => e.severity === 'high' || e.severity === 'critical')
      .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
      .slice(0, 6);

    const evidence = related.filter((e) => !!e.url).slice(0, 6).map((e) => ({ source: e.source, url: String(e.url) }));
    const severity: Severity = related.some((e) => e.severity === 'critical') ? 'critical' : 'high';
    const confidenceScore = clamp01(0.45 + Math.min(0.3, hotDomains.length * 0.1) + Math.min(0.2, evidence.length * 0.03));
    const { lat, lng } = pickBestGeo(related, related[0]?.domain || 'geopolitics');

    out.push({
      id: hashId(`corr:cluster:${new Date().toISOString().slice(0, 13)}`),
      domain: (related[0]?.domain || 'geopolitics') as Domain,
      relatedDomains: hotDomains as Domain[],
      severity,
      title: 'Multi-domain escalation cluster',
      timestamp: isoNow(),
      thesis:
        'Multiple domains are lighting up simultaneously. This is usually where cascades start: one constraint forces adaptation elsewhere, then second-order effects compound.',
      why_now: `High-severity activity detected across ${hotDomains.length} domains in the last ${windowHours}h.`,
      next_moves: ['Identify the choke point that links these domains', 'Pre-position hedges; reduce reaction time', 'Watch for defection/cascade thresholds'],
      watch_indicators: ['Policy announcements', 'Supply chain disruptions', 'Rapid volatility regime change'],
      relatedEventIds: related.map((e) => e.id),
      evidence,
      confidenceScore,
      lat,
      lng,
      score: severityWeight(severity) + confidenceScore * 2 + hotDomains.length * 0.6,
    });
  }

  return out;
}

function capAndSortFused(signals: FusedSignal[], maxSignals: number) {
  const seen = new Set<string>();
  const unique: FusedSignal[] = [];

  for (const s of signals) {
    const k = `${s.title}:${s.domain}:${s.timestamp.slice(0, 13)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(s);
  }

  unique.sort((a, b) => b.score - a.score);
  return unique.slice(0, maxSignals);
}

async function verifyQStash(req: any, res: any) {
  if (!(process.env.QSTASH_CURRENT_SIGNING_KEY || process.env.QSTASH_NEXT_SIGNING_KEY)) return null;
  if (req.method !== 'POST') return null;

  const signature = (req.headers?.['upstash-signature'] as string) || (req.headers?.['Upstash-Signature'] as string) || '';
  if (!signature) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }));
    return false;
  }

  try {
    const receiver = new Receiver({
      currentSigningKey: String(process.env.QSTASH_CURRENT_SIGNING_KEY || ''),
      nextSigningKey: String(process.env.QSTASH_NEXT_SIGNING_KEY || ''),
    });

    const body =
      typeof req.body === 'string'
        ? req.body
        : req.body && typeof req.body === 'object'
          ? JSON.stringify(req.body)
          : '';

    const host = String(req.headers?.host || '');
    const url = host ? `https://${host}${req.url}` : String(req.url || '');

    await receiver.verify({ signature, body, url });
    return true;
  } catch {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }));
    return false;
  }
}

export default async function handler(req: any, res: any) {
  // QStash calls POST; allow GET for manual triggering/debug.
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const qstashVerified = await verifyQStash(req, res);
  if (qstashVerified === false) return;

  const rawCap = clampInt(req.query?.rawCap, 100, 800, 400);
  const fusedCap = clampInt(req.query?.fusedCap, 10, 200, 80);
  const markerCap = clampInt(req.query?.markerCap, 10, 100, 50);

  // Rolling window for correlation (keep prior raw to correlate across runs).
  const priorRawPayload = await readLatest('intel:raw:latest');
  const priorRaw = Array.isArray(priorRawPayload?.events) ? (priorRawPayload.events as RawEvent[]) : [];

  const priorFusedPayload = await readLatest('intel:fused:latest');
  const priorFused = Array.isArray(priorFusedPayload?.events) ? (priorFusedPayload.events as FusedSignal[]) : [];

  const health: CollectorHealth[] = [];
  const newRaw: RawEvent[] = [];

  const runAt = isoNow();

  // Run collectors sequentially to keep fan-out predictable; each collector does internal parallelism.
  for (const c of COLLECTORS) {
    let emitted = 0;
    let status: 'ok' | 'degraded' = 'ok';
    let lastError: string | undefined;

    try {
      const events = await c.fetch();
      for (const e of events) {
        // Dedupe key persists across runs.
        const dedupeKey = e.url ? `u:${e.url}` : `t:${e.domain}:${e.source}:${e.title}:${e.timestamp.slice(0, 10)}`;
        const seenKey = `intel:seen:${hashId(dedupeKey)}`;
        const first = await setIfNotExists(seenKey, 24 * 60 * 60);
        if (!first) continue;
        newRaw.push(e);
        emitted += 1;
      }
    } catch (err: any) {
      status = 'degraded';
      lastError = err?.message ? String(err.message) : 'COLLECTOR_FAILED';
    }

    health.push({
      id: c.id,
      domain: c.domain,
      status,
      lastRunAt: runAt,
      lastOkAt: status === 'ok' ? runAt : undefined,
      lastError,
      emitted,
    });
  }

  // Merge new raw with prior raw for continuity.
  const mergedRaw = [...newRaw, ...priorRaw]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const rawEvents = dedupeByUrlOrTitle(mergedRaw, rawCap);

  // Build fused signals from clusters + correlation rules.
  const clustered = buildFusedFromClusters(rawEvents);
  const correlated = buildCorrelationSignals(rawEvents, 6);

  const fusedAll = [...correlated, ...clustered, ...priorFused];
  const fusedSignals = capAndSortFused(fusedAll, fusedCap);

  // Marker feed: hard cap and prefer highest score.
  const markerSignals = capAndSortFused(fusedSignals, markerCap);

  const updatedAt = isoNow();
  const ttlSeconds = 24 * 60 * 60;

  // Store raw + full fused + health.
  const rawStore = await storeLatest('intel:raw:latest', { updatedAt, events: rawEvents }, ttlSeconds);
  const fusedStore = await storeLatest('intel:fused:latest', { updatedAt, events: markerSignals }, ttlSeconds);
  await storeLatest('intel:health', { updatedAt, collectors: health }, ttlSeconds);

  // Back-compat: keep legacy key as fused markers.
  await storeLatest('intel:events:latest', { updatedAt, events: markerSignals }, ttlSeconds);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      ok: true,
      qstashVerified,
      updatedAt,
      raw: { count: rawEvents.length, backend: rawStore.backend },
      fused: { count: markerSignals.length, backend: fusedStore.backend },
      degraded: health.filter((h) => h.status !== 'ok'),
    })
  );
}