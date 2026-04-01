# NERV Dashboard - AGENTS.md

## Project Overview

A cyberpunk-themed intelligence dashboard inspired by NERV from Neon Genesis Evangelion. This is a real-time situational awareness platform that aggregates geopolitical, market, crypto, biotech, AI, and robotics intelligence into a unified command interface.

**Live URL:** https://cyberpunk-dashboard-v2.vercel.app

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS 3.4 + Custom NERV Theme
- **UI Components:** Radix UI primitives + shadcn/ui patterns
- **State Management:** React hooks (useState, useCallback, useMemo)
- **Animations:** Framer Motion
- **3D/Globe:** Three.js + Globe.gl
- **Maps:** Leaflet + React-Leaflet
- **Charts:** Recharts
- **Package Manager:** pnpm 10.28.0
- **Deployment:** Vercel

## Project Structure

```
├── srs/                          # Source code (note: "srs" not "src")
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Global styles
│   ├── app/
│   │   ├── agent/page.tsx        # Agent tab view
│   │   └── components/           # React components
│   │       ├── HUD.tsx           # Left sidebar navigation
│   │       ├── Chat.tsx          # Communications chat
│   │       ├── WatchtowerConsole.tsx   # Intel feed display
│   │       ├── WarRoom.tsx       # Strategic globe view
│   │       ├── Overwatch.tsx     # System monitoring
│   │       ├── IntelBank.tsx     # Intelligence database
│   │       ├── ProtocolDetail.tsx        # Health protocol viewer
│   │       ├── ProtocolKnowledgeWorkbench.tsx
│   │       ├── GeopoliticalGlobe.tsx
│   │       ├── HexHeatmapGlobe.tsx
│   │       ├── SatelliteLayer.tsx
│   │       └── ... (50+ components)
│   ├── components/               # Shared UI components (shadcn)
│   ├── config/
│   │   ├── persona.ts            # AI persona definitions
│   │   ├── prompts.ts            # System prompts
│   │   └── responseStyle.ts      # Response formatting
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   │   ├── groq-client.ts        # Groq AI API client
│   │   └── protocol/             # Protocol parsing utilities
│   └── styles/
│       └── nerv-theme.css        # NERV color palette
├── api/                          # Vercel serverless API routes
│   ├── intelligence/
│   │   ├── harvest.ts            # TRIAD v2 intelligence harvester
│   │   └── index.ts
│   ├── watchtower/               # Intel feed API
│   ├── protocol-consultant/      # Health protocol AI
│   ├── biotech/                  # Biotech search
│   ├── defi/                     # DeFi data
│   ├── markets/                  # Market quotes
│   ├── polymarket/               # Prediction markets
│   └── search/                   # General search
├── server/                       # Server-side utilities
│   ├── watchtower_feeds.js       # RSS feed definitions
│   └── intelligence_store.js     # Data persistence
├── dist/                         # Build output
└── vendor/                       # Third-party vendored code
```

## NERV Theme System

The UI follows a warm amber/orange palette inspired by NERV's interface design:

```javascript
// Primary colors
--nerv-orange: #FF9800
--nerv-amber: #E8A03C
--nerv-rust: #8B5A2B
--nerv-brown: #5C3A1E
--nerv-void: #050505
--nerv-alert: #C9302C

// Typography
font-mono: 'JetBrains Mono'      // Code, data readouts
font-header: 'Space Grotesk'     // Headers, labels
```

See `tailwind.config.js` for complete color definitions and `srs/styles/nerv-theme.css` for CSS variables.

## Application Tabs

1. **Communications** (`communications`): Chat interface with "Bruce Wayne" AI persona + Watchtower intel feed
2. **Protocols** (`protocols`): Health protocol database with AI consultant
3. **Intel** (`intel`): Curated intelligence bank with categorized reports
4. **War Room** (`warroom`): 3D globe visualization with data layers
5. **Overwatch** (`overwatch`): System monitoring and agent control
6. **Agent** (`agent`): AI agent management interface
7. **Settings** (`settings`): Configuration panel

## API Routes

All API routes are serverless functions in `/api/`:

| Route | Description |
|-------|-------------|
| `POST /api/intelligence/harvest` | TRIAD v2 harvester - collects & fuses intel from multiple sources |
| `GET /api/watchtower/items` | Latest intelligence items |
| `GET /api/watchtower/search` | Search intel feeds |
| `POST /api/protocol-consultant` | Health protocol AI consultation |
| `GET /api/markets/quotes` | Market data quotes |
| `GET /api/polymarket/*` | Prediction market data |
| `GET /api/biotech/search` | Biotech research search |

## Environment Variables

Required for full functionality:

```bash
# AI/LLM
GROQ_API_KEY=                   # Groq AI API key

# Data Sources
NEWSAPI_KEY=                    # NewsAPI.org key
QSTASH_CURRENT_SIGNING_KEY=     # Upstash QStash (scheduled harvests)
QSTASH_NEXT_SIGNING_KEY=

# Optional
VITE_API_PROXY_TARGET=          # API proxy target for local dev
BUILD_MODE=                     # 'prod' for production builds
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (with API proxy)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint
pnpm lint
```

## Key Architecture Patterns

### State Management
- Lifted state in `App.tsx` for cross-tab communication
- Hooks pattern: `useSynthesis()` for intelligence aggregation
- Local component state for UI-specific concerns

### AI Integration
- Primary: Groq API with Llama 3.1 70B/8B models
- Persona system: "Bruce Wayne" tactical advisor persona
- Context injection: Real-time intelligence feeds into prompts
- Fallback: Template responses when API unavailable

### Intelligence Pipeline (TRIAD v2)
1. **Collectors** fetch from 7+ sources (RSS, APIs, satellite data)
2. **Fusing** clusters related events by claim similarity
3. **Correlation** detects cross-domain patterns
4. **Storage** uses Redis/Upstash for persistence

### Component Patterns
- Use Radix UI primitives for accessibility
- Tailwind for styling - follow existing color patterns
- Error boundaries wrap major sections
- Loading states use spinner + text pattern

## Data Types

```typescript
// Core domain types
type Domain = 'markets' | 'crypto' | 'geopolitics' | 'biotech' | 'ai' | 'robotics';
type Severity = 'critical' | 'high' | 'medium' | 'low';

// Intelligence event
type RawEvent = {
  id: string;
  domain: Domain;
  severity: Severity;
  title: string;
  timestamp: string;
  source: string;
  sourceType: 'official' | 'reference' | 'other';
  url?: string;
  lat?: number;
  lng?: number;
  confidence: number;
  payload: Record<string, unknown>;
};

// Fused signal (aggregated)
type FusedSignal = {
  id: string;
  domain: Domain;
  relatedDomains: Domain[];
  severity: Severity;
  title: string;
  thesis: string;
  why_now: string;
  next_moves: string[];
  watch_indicators: string[];
  evidence: Evidence[];
  confidenceScore: number;
};
```

## Common Tasks

### Adding a New Tab
1. Add tab type to `TabType` in `App.tsx`
2. Add tab button to `HUD.tsx`
3. Add content render case in `App.tsx` switch
4. Create view component in `srs/app/components/`

### Adding an Intelligence Collector
1. Add collector function in `api/intelligence/harvest.ts`
2. Add to `COLLECTORS` array with timeout and domain
3. Implement fetch logic returning `RawEvent[]`
4. Test via `GET /api/intelligence/harvest`

### Adding API Endpoints
1. Create folder in `api/` with route file
2. Export default handler function
3. Use `req.method` for routing
4. Set CORS headers: `res.setHeader('Access-Control-Allow-Origin', '*')`

## Important Notes

- Source directory is `srs/` not `src/` - Vite alias `@` points to `./srs`
- The theme is dark-only; no light mode support
- CRT scanline effects are decorative (via `CRTOverlay`)
- All times are ISO 8601 UTC
- Confidence scores are 0-1 floats
- Geospatial data uses lat/lng (WGS84)

## Dependencies to Know

- **@upstash/qstash**: Scheduled job verification
- **globe.gl**: 3D globe visualization
- **react-leaflet**: 2D map components
- **recharts**: Data visualization
- **framer-motion**: Animations
- **lucide-react**: Icons
- **zod**: Schema validation (if needed)

## Troubleshooting

- **Build fails**: Check Node version (18+) and pnpm installation
- **API 401 errors**: Verify environment variables are set
- **Globe not rendering**: Check WebGL support in browser
- **Intel feed empty**: Check rate limits on upstream APIs
