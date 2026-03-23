import { WATCHTOWER_FEEDS } from '../../server/watchtower_feeds.js';

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function decodeEntities(s) {
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

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = String(block || '').match(re);
  return m ? stripTags(decodeEntities(String(m[1] || '')).trim()) : '';
}

function pickAtomLink(block) {
  const m = String(block || '').match(/<link\s+[^>]*href\s*=\s*"([^"]+)"[^>]*>/i);
  return m ? String(m[1] || '').trim() : '';
}

function parseFeed(xml, feedMeta) {
  const out = [];
  const s = String(xml || '');
  const isAtom = /<feed\b/i.test(s) && /<entry\b/i.test(s);

  if (isAtom) {
    const entries = Array.from(s.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((m) => m[0]);
    for (const e of entries) {
      const title = pickTag(e, 'title');
      const url = pickAtomLink(e) || pickTag(e, 'link');
      const published = pickTag(e, 'updated') || pickTag(e, 'published');
      if (!title || !url) continue;
      out.push({
        id: `${feedMeta.id}:${url}`,
        title,
        url,
        source: feedMeta.name,
        publishedAt: published || undefined,
        region: feedMeta.region,
        tags: feedMeta.tags,
      });
    }
    return out;
  }

  const items = Array.from(s.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((m) => m[0]);
  for (const it of items) {
    const title = pickTag(it, 'title');
    const url = pickTag(it, 'link');
    const published = pickTag(it, 'pubDate') || pickTag(it, 'date');
    if (!title || !url) continue;
    out.push({
      id: `${feedMeta.id}:${url}`,
      title,
      url,
      source: feedMeta.name,
      publishedAt: published || undefined,
      region: feedMeta.region,
      tags: feedMeta.tags,
    });
  }

  return out;
}

async function fetchText(url, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { 'User-Agent': 'cyberpunk-geo-dashboard/watchtower/1.0' },
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  const action = typeof req.query?.action === 'string' ? req.query.action.trim().toLowerCase() : '';

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const limit = clampInt(url.searchParams.get('limit'), 1, 50, 25);
  const q = String(url.searchParams.get('q') || '').trim();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const settled = await Promise.allSettled(
      WATCHTOWER_FEEDS.map(async (f) => {
        const xml = await fetchText(String(f.url), 8000);
        return parseFeed(xml, f);
      })
    );

    const all = [];
    for (const s of settled) {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) all.push(...s.value);
    }

    const seen = new Set();
    const deduped = [];
    for (const it of all) {
      const u = String(it.url || '');
      if (!u || seen.has(u)) continue;
      seen.add(u);
      deduped.push(it);
    }

    deduped.sort((a, b) => {
      const da = new Date(String(a.publishedAt || '')).getTime();
      const db = new Date(String(b.publishedAt || '')).getTime();
      if (!Number.isFinite(da) && !Number.isFinite(db)) return 0;
      if (!Number.isFinite(da)) return 1;
      if (!Number.isFinite(db)) return -1;
      return db - da;
    });

    if (action === 'items') {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, total: deduped.length, results: deduped.slice(0, limit) }));
      return;
    }

    if (action === 'search') {
      if (q.length < 2 || q.length > 80) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'BAD_REQUEST' }));
        return;
      }

      const qLower = q.toLowerCase();
      const filtered = deduped.filter((it) => {
        const title = String(it.title || '').toLowerCase();
        const source = String(it.source || '').toLowerCase();
        const region = String(it.region || '').toLowerCase();
        const tags = Array.isArray(it.tags) ? it.tags.join(' ').toLowerCase() : '';
        return title.includes(qLower) || source.includes(qLower) || region.includes(qLower) || tags.includes(qLower);
      });

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, query: q, total: filtered.length, results: filtered.slice(0, limit) }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: 'UPSTREAM' }));
  }
}