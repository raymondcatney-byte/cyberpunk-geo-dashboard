// GET /api/markets/quotes?symbols=BTCUSD,ETHUSD,SPY...
// Returns market quotes via Finnhub

type QuoteRow = {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
  source: string;
};

const DEFAULT_SYMBOLS = ['BTCUSD', 'ETHUSD', 'SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA'];
const MAX_SYMBOLS = 20;
const SYMBOL_RE = /^[A-Z0-9.\-:]{1,15}$/;

function normalizeSymbols(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_SYMBOLS;
  const cleaned = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL_RE.test(s));
  return cleaned.length ? cleaned.slice(0, MAX_SYMBOLS) : DEFAULT_SYMBOLS;
}

function mapSymbolForFinnhub(symbol: string): string {
  if (symbol === 'BTCUSD') return 'BINANCE:BTCUSDT';
  if (symbol === 'ETHUSD') return 'BINANCE:ETHUSDT';
  return symbol;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED', timestamp: new Date().toISOString() }));
    return;
  }

  const token = process.env.FINNHUB_API_KEY || process.env.FINNHUB_TOKEN;
  if (!token) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, error: 'NOT_CONFIGURED', timestamp: new Date().toISOString() }));
    return;
  }

  const symbols = normalizeSymbols(req.query?.symbols);
  const timestamp = new Date().toISOString();

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const apiSymbol = mapSymbolForFinnhub(symbol);
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(apiSymbol)}&token=${encodeURIComponent(token)}`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP_${r.status}`);
      const payload = (await r.json()) as { c: number; d: number; dp: number };
      if (!payload || typeof payload.c !== 'number' || payload.c <= 0) {
        throw new Error('NO_DATA');
      }
      const row: QuoteRow = {
        symbol,
        price: payload.c,
        change: payload.d ?? 0,
        percentChange: payload.dp ?? 0,
        timestamp,
        source: 'finnhub',
      };
      return row;
    })
  );

  const data: QuoteRow[] = [];
  const errors: { symbol: string; error: string }[] = [];

  results.forEach((result, idx) => {
    const symbol = symbols[idx]!;
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      errors.push({ symbol, error: result.reason instanceof Error ? result.reason.message : 'UPSTREAM' });
    }
  });

  if (data.length === 0) {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: 'UPSTREAM', errors, timestamp }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, data, errors, timestamp }));
}
