import {
  fetchProtocolOverview,
  fetchProtocolSentimentIntel,
  fetchYieldIntel,
} from '../../server/trading_intel.js';

export default async function handler(req: any, res: any) {
  const action = typeof req.query?.action === 'string' ? req.query.action.trim().toLowerCase() : '';

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    if (action === 'yields') {
      const limit = Math.min(20, Math.max(1, Number(req.query?.limit || 10) || 10));
      const yields = await fetchYieldIntel(limit);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, yields, updatedAt: new Date().toISOString(), status: 'live' }));
      return;
    }

    if (action === 'protocol') {
      const slug = typeof req.query?.slug === 'string' ? req.query.slug.trim() : '';
      if (!slug) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'MISSING_SLUG' }));
        return;
      }

      const data = await fetchProtocolOverview(slug);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, data, updatedAt: new Date().toISOString(), status: 'live' }));
      return;
    }

    if (action === 'sentiment') {
      const protocol = typeof req.query?.protocol === 'string' ? req.query.protocol.trim() : '';
      if (!protocol) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'MISSING_PROTOCOL' }));
        return;
      }

      const sentiment = await fetchProtocolSentimentIntel(protocol);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, sentiment, updatedAt: new Date().toISOString(), status: 'live' }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
  } catch (error) {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'UPSTREAM' }));
  }
}