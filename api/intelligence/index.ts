// GET /api/intelligence country and geo filters

import { readLatest } from '../../server/intelligence_store.js';
import { getRequestUrl } from '../../server/request_url.js';

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseSince(v: unknown): number | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const ms = new Date(v).getTime();
  if (!Number.isFinite(ms)) return null;
  return ms;
}

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  ISR: ['israel', 'gaza', 'palestine', 'hamas', 'netanyahu'],
  UKR: ['ukraine', 'zelensky', 'kyiv'],
  RUS: ['russia', 'putin', 'moscow'],
  CHN: ['china', 'xi', 'beijing', 'taiwan', 'tsmc'],
  IRN: ['iran', 'tehran', 'ayatollah'],
  TWN: ['taiwan', 'tsmc', 'strait']
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const url = getRequestUrl(req);
  const view = String(url.searchParams.get('view') || 'fused').trim().toLowerCase();
  const limit = clampInt(url.searchParams.get('limit'), 1, 200, 100);
  const domain = String(url.searchParams.get('domain') || '').trim();
  const country = String(url.searchParams.get('country') || '').trim().toUpperCase();
  const lat = Number(url.searchParams.get('lat') || 'NaN');
  const lng = Number(url.searchParams.get('lng') || 'NaN');
  const radius = clampInt(url.searchParams.get('radius'), 1, 1000, 100);
  const sinceMs = parseSince(url.searchParams.get('since'));

  const key = view === 'raw' ? 'intel:raw:latest' : 'intel:fused:latest';
  const payload = await readLatest(key);
  const fallback = view !== 'raw' && !payload ? await readLatest('intel:events:latest') : null;
  const activePayload = payload || fallback;
  const events = Array.isArray(activePayload?.events) ? activePayload!.events : [];

  let filtered = events;
  
  if (domain) {
    filtered = filtered.filter((e: any) => String(e?.domain || '') === domain);
  }
  
  if (country) {
    filtered = filtered.filter((e: any) => {
      const eventCountry = String(e?.countryCode || '').toUpperCase();
      const eventTitle = String(e?.title || '').toLowerCase();
      if (eventCountry === country) return true;
      const keywords = COUNTRY_KEYWORDS[country] || [];
      return keywords.some(kw => eventTitle.includes(kw));
    });
  }
  
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    filtered = filtered.filter((e: any) => {
      const eLat = Number(e?.lat);
      const eLng = Number(e?.lng);
      if (!Number.isFinite(eLat) || !Number.isFinite(eLng)) return false;
      const dist = haversine(lat, lng, eLat, eLng);
      return dist <= radius;
    });
  }
  
  if (sinceMs) {
    filtered = filtered.filter((e: any) => {
      const ts = new Date(String(e?.timestamp || '')).getTime();
      return Number.isFinite(ts) && ts > sinceMs;
    });
  }

  const healthPayload = await readLatest('intel:health');
  const collectors = Array.isArray(healthPayload?.collectors) ? healthPayload.collectors : [];
  const degraded = collectors.filter((c: any) => String(c?.status || '') !== 'ok');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      ok: true,
      view: view === 'raw' ? 'raw' : 'fused',
      updatedAt: activePayload?.updatedAt || null,
      events: filtered.slice(0, limit),
      degraded: degraded.length ? degraded : undefined,
    })
  );
}
