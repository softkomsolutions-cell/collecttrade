# Brick Alpha — LEGO Market Data API

Production-ready backend endpoint for unified LEGO set market information across all Brick Alpha workspaces.

## Endpoint

```
GET /api/market-data/:setNumber
```

Returns a `SetMarketData` record for the requested LEGO set number.

### Example Request

```
GET /api/market-data/75252
```

### Example Response

```json
{
  "setNumber": "75252",
  "name": "Imperial Star Destroyer",
  "theme": "Star Wars",
  "retailPrice": 32999,
  "marketPrice": 44879,
  "lowestPrice": 44190,
  "highestPrice": 45871,
  "brickEconomyValue": 44879,
  "retirementStatus": "Retired",
  "estimatedRetirement": "2022-12-31",
  "lastUpdated": "2026-07-09T10:52:00.000Z",
  "imageUrl": "https://images.brickset.com/sets/images/75252-1.jpg",
  "thumbnailUrl": "https://images.brickset.com/sets/images/75252-1.jpg",
  "source": "Demo",
  "confidence": 55
}
```

### Error Responses

| Status | Body | When |
|--------|------|------|
| `404` | `{ "ok": false, "error": "set_not_found" }` | Unknown or invalid set number |
| `200` | `SetMarketData` | Set found (via live provider or demo fallback) |

Provider failures never return HTTP 500. The service falls back to the demo catalog automatically.

---

## Architecture

```
┌─────────────┐     GET /api/market-data/:setNumber     ┌──────────────────────┐
│   Client    │ ──────────────────────────────────────► │  Express (server.js) │
└─────────────┘                                         └──────────┬───────────┘
                                                                   │
                                                                   ▼
                                                        ┌──────────────────────┐
                                                        │  marketDataService   │
                                                        │  (cache + routing)   │
                                                        └──────────┬───────────┘
                                                                   │
                     ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
                     │                                             │                                             │
                     ▼                                             ▼                                             ▼
          ┌──────────────────┐                          ┌──────────────────┐                          ┌──────────────────┐
          │ MemoryMarketData │                          │  Provider Chain  │                          │   demoProvider   │
          │      Cache       │                          │  (when live on)  │                          │   (fallback)     │
          │   5-min TTL      │                          └────────┬─────────┘                          └──────────────────┘
          └──────────────────┘                                   │
                     ▲                         ┌──────────────────┼──────────────────┐
                     │                         │                  │                  │
                     └─────────────────────────┤                  │                  │
                                               ▼                  ▼                  ▼
                                    brickEconomyProvider  brickLinkProvider  rebrickableProvider
                                        (stub/TODO)         (stub/TODO)        (stub/TODO)
```

### File Layout

| Path | Role |
|------|------|
| `server/services/marketDataService.js` | Orchestration: cache, provider chain, fallback, logging |
| `server/services/marketDataCache.js` | In-memory TTL cache (Redis-ready interface) |
| `server/providers/demoProvider.js` | Demo catalog — only live provider today |
| `server/providers/brickEconomyProvider.js` | BrickEconomy stub |
| `server/providers/brickLinkProvider.js` | BrickLink stub |
| `server/providers/rebrickableProvider.js` | Rebrickable stub |
| `server/models/setMarketData.js` | `SetMarketData` normalization |
| `server/data/demoSetProfiles.js` | Canonical demo set profiles |
| `server/data/retirementDemoCatalog.js` | Retirement intelligence demo catalog |

---

## Provider Flow

1. **Normalize** set number (digits only, max 6 chars).
2. **Cache lookup** — return immediately on hit (logs `cache_hit`).
3. **Cache miss** — logs `cache_miss`, then:
   - If `LIVE_API_ENABLED=true`, try configured provider chain.
   - On provider success, logs `provider_used` and caches result.
   - On provider failure or no result, fall back to `demoProvider`.
   - On fallback after live attempt, logs `fallback_used`.
4. **Cache store** — successful results cached for `CACHE_TTL` ms (default 5 minutes).

### Provider Chain Order

When `LIVE_API_ENABLED=true`:

1. Preferred provider from `MARKET_PROVIDER`
2. Remaining live providers: BrickEconomy → BrickLink → Rebrickable
3. Demo provider (always available as final fallback)

When `LIVE_API_ENABLED=false` (default):

- Demo provider serves all requests directly.

---

## Configuration

Environment variables (see `server/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVE_API_ENABLED` | `false` | Enable live provider chain |
| `MARKET_PROVIDER` | `demo` | Preferred provider (`demo`, `brickEconomy`, `brickLink`, `rebrickable`) |
| `CACHE_TTL` | `300000` | Cache TTL in milliseconds (5 minutes) |

---

## Health Check

`GET /api/health` includes a `marketDataApi` section:

```json
{
  "marketDataApi": {
    "status": "online",
    "provider": "demo",
    "configuredProvider": "demo",
    "liveApiEnabled": false,
    "cache": {
      "status": "online",
      "hits": 12,
      "misses": 3,
      "entries": 3,
      "ttlMs": 300000
    },
    "mode": "demo",
    "requestCount": 15,
    "fallbackCount": 0
  }
}
```

---

## Logging

Structured JSON logs to stdout:

| Event | When |
|-------|------|
| `cache_hit` | Served from cache |
| `cache_miss` | Cache expired or not populated |
| `provider_used` | Live or demo provider returned data |
| `fallback_used` | Live chain failed, demo served request |
| `provider_error` | Individual provider threw (not exposed to client) |

Internal errors are never returned to the frontend.

---

## Future Integrations

### BrickEconomy (Priority)

- [ ] Add `BRICK_ECONOMY_API_KEY` env var
- [ ] Implement `brickEconomyProvider.getSet()` — pricing, retirement timeline, valuation
- [ ] Map API fields to `SetMarketData`
- [ ] Set `source: "BrickEconomy"` and `confidence: 72+`
- [ ] Enable with `LIVE_API_ENABLED=true` and `MARKET_PROVIDER=brickEconomy`

### BrickLink

- [ ] OAuth credentials (`BRICK_LINK_CONSUMER_KEY`, `BRICK_LINK_TOKEN`)
- [ ] Price guide API — min/avg/max used and new prices
- [ ] Currency normalization

### Rebrickable

- [ ] API key authentication
- [ ] Set metadata (name, theme, pieces, images)
- [ ] Catalog-only confidence scoring

### Infrastructure

- [ ] Replace `MemoryMarketDataCache` with Redis backend
- [ ] Rate limiting per provider
- [ ] Provider response validation middleware
- [ ] Batch endpoint: `GET /api/market-data?sets=75252,75313`

### Frontend Activation

The frontend `marketDataService.js` already targets `/api/market-data`. To enable:

```javascript
const LIVE_API_ENABLED = true;
```

in `frontend/src/services/marketDataService.js` once BrickEconomy integration is production-ready.

---

## Response Model: SetMarketData

| Field | Type | Description |
|-------|------|-------------|
| `setNumber` | `string` | Normalized LEGO set number |
| `name` | `string` | Set display name |
| `theme` | `string` | Theme (e.g. Star Wars, Icons) |
| `retailPrice` | `number` | Original retail price (ZAR cents) |
| `marketPrice` | `number` | Current estimated market price |
| `lowestPrice` | `number` | Recent low sale price |
| `highestPrice` | `number` | Recent high sale price |
| `brickEconomyValue` | `number` | BrickEconomy valuation |
| `retirementStatus` | `string` | `Active` or `Retired` |
| `estimatedRetirement` | `string\|null` | ISO date of expected retirement |
| `lastUpdated` | `string` | ISO timestamp of data freshness |
| `imageUrl` | `string\|null` | Primary set image |
| `thumbnailUrl` | `string\|null` | Thumbnail image |
| `source` | `string` | Data source badge (`Demo`, `BrickEconomy`, etc.) |
| `confidence` | `number` | 0–100 confidence score |
