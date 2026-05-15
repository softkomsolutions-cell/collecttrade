# Collecttrade

Collecttrade is a trading workspace for:

- macro news and market context
- 8 / 21 EMA signal discovery
- trade planning and portfolio tracking
- collectibles as an alternative-assets lane
- broker, venue, and feed readiness

The app is split into:

- `frontend/` - React + Vite product UI
- `server/` - Node.js API, auth, signal engine, news aggregation, portfolio logic, connectors, and shared feedback board

## Repo Layout

```text
collecttrade/
|-- frontend/
`-- server/
```

## Local Development

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd server
npm install
npm run dev
```

Default local URLs:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:5000`
- health: `http://127.0.0.1:5000/api/health`

## Single-Service Staging Run

For partner testing, you usually want one shareable service instead of separate frontend and backend terminals.

From the repo root:

```powershell
npm run partner:staging
```

That will:

1. build the frontend into `frontend/dist`
2. start the backend
3. serve the built frontend from the backend on the same origin

After that, the app runs from:

- `http://127.0.0.1:5000`

If you are sharing through a tunnel or deployment platform, this is the mode you want.

## Always-On Partner Staging

For a steadier partner-testing setup, use Docker Compose so the app can come up the same way every time.

Prerequisite:

- Docker Desktop or another Docker Engine with `docker compose` enabled

First-time setup:

1. copy `.env.staging.example` to `.env.staging`
2. replace `AUTH_SECRET` and `CONNECTOR_SECRET`
3. add `TWELVE_DATA_API_KEY` when you want live candles

Then start staging from the repo root:

```powershell
npm run partner:compose
```

Useful companion commands:

```powershell
npm run partner:compose:logs
npm run partner:compose:down
```

What this gives you:

1. one container serving frontend and backend together on port `5000`
2. automatic restart if the container stops
3. persisted app state in `server/data`
4. a health-checked service that is easier to leave running for partner feedback rounds

After Compose is up, the app is available locally at:

- `http://127.0.0.1:5000`

And if you still want a public link on top of that local staging service, you can run:

```powershell
npm run partner:share
```

## Render Staging

For a proper partner-facing staging environment, the repo now includes a Render Blueprint:

- `render.yaml`

Recommended use:

1. Push the current repo to GitHub
2. Sign in to [Render](https://dashboard.render.com/)
3. Choose `New -> Blueprint`
4. Connect the `collecttrade` repo
5. Render will detect `render.yaml` and propose a Docker web service
6. During setup, provide a value for:
   - `TWELVE_DATA_API_KEY` if you want live candles
7. Let Render generate:
   - `AUTH_SECRET`
   - `CONNECTOR_SECRET`

The current Blueprint is set up with these assumptions:

- service name: `collecttrade-staging`
- runtime: Docker
- plan: `starter`
- region: `frankfurt`
- health check path: `/api/health`
- persistent disk mount: `/app/server/data`

Why this shape:

1. the app already serves the built frontend and backend together as one service
2. the Dockerfile matches that single-service runtime cleanly
3. the persistent disk preserves app state between restarts and deploys
4. `frankfurt` is a reasonable default region for South Africa / Europe-facing partner review

Important notes:

- Render persistent disks require a paid web service plan
- if you want a throwaway no-disk preview, remove the `disk` block and change the plan if needed
- the current Blueprint is meant for staging, not final production hardening

After deploy:

1. open the Render URL
2. confirm `/api/health` returns `200`
3. create a partner test account
4. ask partners to use `Settings -> Feedback Board`

## Temporary Public Share Link

Once staging is already running on port `5000`, open a temporary public link with:

```powershell
npm run partner:share
```

That command:

1. checks that the local staging app is reachable
2. prefers a Cloudflare quick tunnel when `cloudflared` is available
3. falls back to `localtunnel` when Cloudflare is unavailable
4. writes the live share status back into the app so `Settings -> Partner Testing` shows the current public link

Keep that terminal open while partners are testing.

## Environment

The backend supports the following environment variables:

- `AUTH_SECRET`
- `CONNECTOR_SECRET`
- `TWELVE_DATA_API_KEY`
- `TWELVE_DATA_INTERVAL`
- `TWELVE_DATA_JSE_SYMBOL`

Use `server/.env.example` as the template.

## Partner Testing Flow

Collecttrade now includes a built-in partner feedback loop.

Suggested test route:

1. Landing and login flow
2. News workspace
3. Trade desk and ticket flow
4. Collectibles workspace
5. Connections and Settings

Where partners should leave feedback:

- inside the app
- `Settings -> Feedback Board`

What the board supports:

- shared visibility across signed-in partner accounts
- structured feedback with area, type, severity, and notes
- owner triage through `New`, `Reviewing`, `Planned`, and `Resolved`

## Docker

You can also package the app as a single container:

```powershell
docker build -t collecttrade .
docker run --rm -p 5000:5000 collecttrade
```

That container serves the built frontend and backend together on port `5000`.

For repeat partner rounds, `docker compose` is the better default because it includes restart behavior, env-file configuration, and a stable local staging command.

## Sharing With Partners

Once the app is running as a single service, you can share it in one of these ways:

1. deploy the container or repo to a staging host
2. run it locally and expose port `5000` through a tunnel
3. run it on a machine your partners can reach over the network

For the cleanest feedback cycle:

1. give partners a test account
2. ask them to follow the landing -> news -> trade -> collectibles path
3. ask them to log notes in `Settings -> Feedback Board`

## Notes

- Add `TWELVE_DATA_API_KEY` to the server environment for live market candles.
- Server runtime data is intentionally ignored from Git.
- Live routing is still gated per connector. Paper mode remains the safe default outside configured lanes.
