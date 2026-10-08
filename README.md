# OUR TANK

A three-player shared aquarium: three friends, one living tank. PS1-style voxel fish and low-poly ruins with modern lighting, rendered with three.js.

## Run it

```bash
npm install
npm start            # http://localhost:8080  (client + multiplayer server)
npm test             # 23 backend integration tests
```

- Open the page, **Create a tank**, share the 6-character code (or the `/join/CODE` link), and two friends can **Join**.
- Without the server (e.g. static hosting) the game falls back to offline solo play stored in the browser.
- Add `?fps=1` to see a frame-rate meter on a real device; `?q=2|1|0` pins quality (otherwise it adapts).

## Layout

- `web/` – the game client (no build step). `src/main3d.js` scene + game loop, `src/species.js` voxel fish, `src/w3/` environment/FX, `src/online.js` onboarding + realtime client.
- `server/` – Node + SQLite + WebSocket. `logic.mjs` holds the rules (the server is authoritative for membership, shells and tank condition), `db.mjs` the schema.
- `tools/` – screenshot and end-to-end helpers.

## Multiplayer rules (as implemented)

- Identity: anonymous account created on first use; the token is kept in `localStorage` and only its SHA-256 hash is stored.
- Codes: 6 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, crypto-random, unique in the database, regenerable by any member. A code only lets someone *request* a seat; join attempts are rate limited per IP and per user.
- Exactly three seats: `slot CHECK (1..3)` + `UNIQUE (tank, slot)` in SQLite, assigned inside a `BEGIN IMMEDIATE` transaction.
- Actions (feed / water change / glass cleaning) carry an idempotency key; replays never pay twice. Offline decay is bounded.

## Deploying

The server needs a host that can run Node 22+ with a persistent disk for the SQLite file (Fly.io, Render, a VPS…). Set `PORT` and `DB`. Put it behind HTTPS so invite links and `wss://` work.
