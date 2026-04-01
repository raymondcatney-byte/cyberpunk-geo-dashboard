// GET /api/markets/quotes?symbols=BTCUSD,ETHUSD,AAPL,TSLA,SPY...
// Best-effort quote proxy (no secrets): Coinbase (crypto) + Stooq (equities/ETFs).

import { getRequestUrl } from '../../server/request_url.js';

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = String(x || '').trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

async function fetchJson(url, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { 
      signal: ac.signal, 
      headers: { 
        'User-Agent': 'cyberpunk-dashboard/1.0',
        'Accept': 'application/json'
      } 
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { 
      signal: ac.signal, 
      headers: { 
        'User-Agent': 'cyberpunk-dashboard/1.0',
        'Accept': 'text/csv,text/plain,*/*'
      } 
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

function parseCsvLines(csv) {
  const lines = String(csv || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const obj = {};
    for (let i = 0; i < header.length; i += 1) obj[header[i]] = cols[i];
    rows.push(obj);
  }
  return rows;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchHyperliquidInfo(payload, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      signal: ac.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'cyberpunk-dashboard-v2/1.0',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function quoteHyperliquidDaily(symbol) {
  const map = { BTCUSD: 'BTC', ETHUSD: 'ETH' };
  const coin = map[symbol];
  if (!coin) return null;

  const endTime = Date.now();
  const startTime = endTime - 8 * 24 * 60 * 60 * 1000;

  const data = await fetchHyperliquidInfo(
    { type: 'candleSnapshot', req: { coin, interval: '1d', startTime, endTime } },
    7000
  );

  const rows = Array.isArray(data) ? data : Array.isArray(data?.candles) ? data.candles : null;
  if (!rows || rows.length < 2) return null;

  const sorted = rows
    .slice()
    .sort((a, b) => Number(a?.t ?? a?.time ?? 0) - Number(b?.t ?? b?.time ?? 0));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const close = num(last?.c ?? last?.close);
  const prevClose = num(prev?.c ?? prev?.close);
  if (close == null || prevClose == null || prevClose === 0) return null;

  const change = close - prevClose;
  const pct = (change / prevClose) * 100;

  return {
    symbol,
    price: close,
    change,
    percentChange: pct,
    timestamp: new Date().toISOString(),
    source: 'hyperliquid',
  };
}

async function quoteCoinGeckoXaut(symbol) {
  if (symbol !== 'GC') return null;

  // Tether Gold (XAUT) proxy for spot gold in USD.
  const data = await fetchJson(
    'https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true',
    7000
  );

  const price = num(data?.['tether-gold']?.usd);
  const pct = num(data?.['tether-gold']?.usd_24h_change);
  if (price == null || pct == null) return null;

  const change = price * (pct / 100);
  return {
    symbol,
    price,
    change,
    percentChange: pct,
    timestamp: new Date().toISOString(),
    source: 'coingecko',
  };
}

async function quoteCoinbase(symbol) {
  const map = { BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD' };
  const product = map[symbol];
  if (!product) return null;

  const stats = await fetchJson(`https://api.exchange.coinbase.com/products/${product}/stats`, 4000);
  const last = num(stats?.last);
  const open = num(stats?.open);
  if (last == null || open == null || open === 0) return null;

  const change = last - open;
  const pct = (change / open) * 100;

  return {
    symbol,
    price: last,
    change,
    percentChange: pct,
    timestamp: new Date().toISOString(),
    source: 'coinbase',
  };
}

async function quoteStooq(symbol) {
  const map = {
    AAPL: 'aapl.us',
    TSLA: 'tsla.us',
    NVDA: 'nvda.us',
    SPY: 'spy.us',
    QQQ: 'qqq.us',
    // Commodities (best-effort; may be unavailable depending on upstream coverage)
    GC: 'gc.f',
    CL: 'cl.f',
  };
  const stooq = map[symbol];
  if (!stooq) return null;

  // Daily history (last two bars) to compute change vs previous close.
  const csv = await fetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(stooq)}&i=d`, 4000);
  const rows = parseCsvLines(csv);
  if (rows.length < 2) return null;

  const lastRow = rows[rows.length - 1];
  const prevRow = rows[rows.length - 2];

  const close = num(lastRow?.Close);
  const prevClose = num(prevRow?.Close);
  if (close == null || prevClose == null || prevClose === 0) return null;

  const change = close - prevClose;
  const pct = (change / prevClose) * 100;

  return {
    symbol,
    price: close,
    change,
    percentChange: pct,
    timestamp: new Date().toISOString(),
    source: 'stooq',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const url = getRequestUrl(req);
  const raw = String(url.searchParams.get('symbols') || '').trim();
  if (!raw) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'BAD_REQUEST' }));
    return;
  }

  const symbols = uniq(raw.split(',').map((s) => s.trim().toUpperCase())).slice(0, 10);
  if (symbols.length === 0) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'BAD_REQUEST' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const data = [];
  const errors = [];

  // Fetch with individual timeouts to avoid hanging
  const fetchWithTimeout = async (symbol) => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 5000); // 5s max per symbol
    
    try {
      let result = null;
      
      if (symbol === 'BTCUSD' || symbol === 'ETHUSD') {
        try {
          result = await quoteCoinbase(symbol);
        } catch { /* fall through */ }
        if (!result) {
          try {
            result = await quoteHyperliquidDaily(symbol);
          } catch { /* fall through */ }
        }
      } else if (symbol === 'GC') {
        try {
          result = await quoteCoinGeckoXaut(symbol);
        } catch { /* fall through */ }
        if (!result) {
          try {
            result = await quoteStooq(symbol);
          } catch { /* fall through */ }
        }
      } else {
        try {
          result = await quoteStooq(symbol);
        } catch { /* fall through */ }
      }
      
      return result;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Parallel fetch but tolerate partial failures.
  const settled = await Promise.allSettled(
    symbols.map(s => fetchWithTimeout(s))
  );

  for (let i = 0; i < settled.length; i += 1) {
    const s = symbols[i];
    const r = settled[i];
    if (r.status === 'fulfilled' && r.value) {
      data.push(r.value);
    } else {
      errors.push({ symbol: s, error: 'DEGRADED' });
    }
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, data, errors }));
}
