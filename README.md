# OUR TANK

Three friends, one living aquarium. Chunky voxel fish and decorations, modern lighting, and a calm loop built for short visits. Runs in any phone browser and installs to the home screen (it is a web app, not an App Store binary).

## The game

- **Start:** name your first fish, feed it, meet your friends, place a free plant. Four short tips, skippable.
- **Care:** feed (tap the water to drop food, three drops per feeding), wipe algae off the glass, change the water. You earn **shells** only when the tank actually needs the care. No streaks, no timers you must obey, no ads, no purchases.
- **Grow:** adopt fish (goldfish, neon school, corydoras, blue ram, angelfish) and place decorations (plants, rocks, driftwood, lantern, chest, torii gate…). Fish grow baby → juvenile → adult over real days and the tank levels up, unlocking new species, items and room.
- **Together:** up to **three** caretakers share one tank with a six-character code or invite link. Everything is shared: fish, decorations, shells, journal, chat.
- **While you are away** the tank keeps living: hunger rises, water clouds, algae grows, fish grow. It is capped so a holiday never hurts the fish.

## Run it

```bash
npm install
npm start          # http://localhost:8080 – game + shared-tank server
npm test           # 31 backend tests
```

Without the server (static hosting) the game runs solo and saves to the browser.
Handy URL options: `?fps=1` frame-rate meter · `?q=0|1|2` pin graphics quality · `?tod=night` time of day · `?dev=1` test tools in Settings (+50 shells, skip a day).

## Deploy (so friends can join over the internet)

You need any host that runs a Docker container with a small persistent disk. HTTPS is required for invite links, sharing and the home-screen install.

- **Render:** New → Blueprint → select this repo (`render.yaml` is included).
- **Fly.io:** `fly launch --copy-config --no-deploy && fly volumes create ourtank_data --size 1 && fly deploy` (`fly.toml` is included).
- **Anything else:** `docker build -t our-tank . && docker run -p 8080:8080 -v ourtank:/data our-tank`.

Environment: `PORT` (default 8080), `DB` (SQLite path, default `ourtank.db`). `DEV=1` allows the developer actions; never set it in production. One instance only (SQLite + in-memory live rooms).

## Layout

- `web/` the client, no build step. `src/main.js` wiring · `src/game/` rules + game state (shared with the server) · `src/w3/` 3D stage, fish, items, plants · `src/ui.js` interface · `src/online.js` onboarding + realtime.
- `server/` Node + SQLite + WebSocket. The server runs the same `rules.js` as the browser and is authoritative for membership, shells, purchases and progression.
- `tools/` screenshot helpers, a four-browser end-to-end test (`e2e.mjs`) and a full solo playthrough (`playthrough.mjs`).

## Rules the server enforces

- Exactly three seats per tank (`CHECK slot 1..3` + `UNIQUE(tank, slot)`, claimed inside one write transaction). A fourth player gets "This tank is full".
- Codes: 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, random, unique, regenerable by any member. A code only lets you ask for a seat; attempts are rate limited.
- Every action carries an idempotency key, so a retry or a double tap never pays or charges twice. Two players spending the last shells at the same time: exactly one purchase succeeds.
- Identity is an anonymous account token kept in the browser (only its hash is stored).

## Known limits

- No App Store build. iPhone haptics are not available to web apps (Android vibrates).
- Account recovery is not built yet: clearing browser data loses the identity (the tank stays on the server).
- One server instance. Push notifications are not built.
