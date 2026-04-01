// GET /api/markets/quotes?symbols=BTCUSD,ETHUSD,SPY...
// Returns market quotes with mock data

module.exports = async function handler(req, res) {
  // Set headers immediately
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const symbols = ['BTCUSD', 'ETHUSD', 'SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA'];
  
  const MOCK_QUOTES = {
    BTCUSD: { price: 67500, change: 1200, percentChange: 1.81 },
    ETHUSD: { price: 3450, change: 45, percentChange: 1.32 },
    SPY: { price: 445.20, change: -1.20, percentChange: -0.27 },
    QQQ: { price: 385.50, change: 0.80, percentChange: 0.21 },
    NVDA: { price: 890.25, change: 12.50, percentChange: 1.42 },
    AAPL: { price: 172.50, change: -0.80, percentChange: -0.46 },
    TSLA: { price: 175.30, change: -2.10, percentChange: -1.18 },
  };

  const data = symbols.map(symbol => {
    const mock = MOCK_QUOTES[symbol];
    return {
      symbol,
      price: mock.price,
      change: mock.change,
      percentChange: mock.percentChange,
      timestamp: new Date().toISOString(),
      source: 'mock',
    };
  });

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, data, errors: [] }));
};
