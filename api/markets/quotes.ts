// GET /api/markets/quotes?symbols=BTCUSD,ETHUSD,AAPL,TSLA,SPY...
// Best-effort quote proxy (no secrets): Coinbase (crypto) + Stooq (equities/ETFs).

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
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'the-architect-markets/1.0' } });
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
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'the-architect-markets/1.0' } });
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

async function quoteCoinbase(symbol) {
  const map = { BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD' };
  const product = map[symbol];
  if (!product) return null;

  const stats = await fetchJson(`https://api.exchange.coinbase.com/products/${product}/stats`, 6000);
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
  };
  const stooq = map[symbol];
  if (!stooq) return null;

  // Daily history (last two bars) to compute change vs previous close.
  const csv = await fetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(stooq)}&i=d`, 7000);
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

  const url = new URL(req.url, 'http://localhost');
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

  // Parallel fetch but tolerate partial failures.
  const settled = await Promise.allSettled(
    symbols.map(async (s) => {
      if (s === 'BTCUSD' || s === 'ETHUSD') return await quoteCoinbase(s);
      return await quoteStooq(s);
    })
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
