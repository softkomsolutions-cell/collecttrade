# Collecttrade

Collecttrade is a combined trading and collectibles workspace with:

- `frontend/` - React + Vite product UI
- `server/` - Node.js API, EMA engine, news aggregation, auth, and portfolio logic

## Repo Layout

```text
collecttrade/
├── frontend/
└── server/
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

## Notes

- Add `TWELVE_DATA_API_KEY` to the server environment for live market candles.
- Server runtime data is intentionally ignored from Git.
