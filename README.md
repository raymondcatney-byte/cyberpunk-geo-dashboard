# NERV Dashboard (cyberpunk-dashboard-v2)

Cyberpunk-themed real-time intelligence terminal (NERV/MAGI aesthetic) aggregating geopolitical, market, crypto, biotech, AI, and prediction-market intelligence.

**Live:** https://cyberpunk-dashboard-v2.vercel.app
**Repo:** https://github.com/raymondcatney-byte/cyberpunk-geo-dashboard

## Stack

React 18 + TypeScript + Vite · Tailwind CSS · Three.js/Globe.gl · Recharts · Vercel serverless (`api/`) · Upstash Redis · Groq AI · pnpm 10.x

See [AGENTS.md](./AGENTS.md) for full architecture, API routes, theme system, and troubleshooting.

## Development

```bash
pnpm install
pnpm dev     # Vite dev server; /api proxied to VITE_API_PROXY_TARGET (defaults to production)
pnpm build   # tsc -b && vite build
```

Note: the active frontend source lives in `srs/` (not `src/`); the `@` alias points to `./srs`.

## Deployment

Push to `main` → Vercel builds and deploys automatically (~2-4 min).

- Production: https://cyberpunk-dashboard-v2.vercel.app
- Branches build separate preview deployments (visible in the Vercel dashboard)
- Build status is reported as a commit status on GitHub ("Vercel – cyberpunk-dashboard-v2")

## API quick reference

| Route | Description |
|-------|-------------|
| `/api/polymarket?type=watchlist` | Watchlist markets |
| `/api/polymarket/events` | Tag-based live events, CLOB-enriched prices |
| `/api/polymarket/search?q=` | Hybrid live search (pool scoring + public-search) |
| `/api/polymarket/market?id= or ?slug=` | Market detail with order book |
| `/api/intelligence` | Fused intel (TRIAD v2) |
| `/api/markets/quotes` | Finnhub quotes |
