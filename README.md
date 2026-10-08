# OUR TANK

Three friends, one living aquarium. Chunky voxel fish and decorations, modern lighting, and a calm loop built for short visits. Runs in any phone browser and installs to the home screen (it is a web app, not an App Store binary).

## The game

- **Start:** an empty tank with one goldfish and a starter pack of free items. Name your fish, feed it, meet your friends, place something. Four short tips, skippable.
- **Care:** feed (tap the water to drop food, three drops per feeding), wipe algae off the glass, change the water. You earn **shells** only when the tank actually needs the care. No streaks, no timers you must obey, no ads, no purchases.
- **Grow:** adopt fish (goldfish, neon school, guppies, corydoras, blue ram, angelfish, betta) and place decorations (18 items: plants, kelp, rocks, driftwood, lantern, chest, bubbler, clam, skull, torii gate, stone arch…). Fish grow baby → juvenile → adult over real days and the tank levels up (8 levels), unlocking new species, items and room.
- **Every fish has its own needs:** it gets hungry at its own pace (greedy fish sooner, lazy fish later), its happiness depends on clean water and on things it likes in the tank (shy fish like plants, curious fish like structures, playful fish like bubbles…), and its health slips if it is neglected. Neglect makes fish listless but never kills them; care brings them back. Tap a fish to see its mood.
- **Together:** up to **three** caretakers share one tank with a six-character code or invite link. Everything is shared: fish, decorations, shells, journal, chat.
- **Things that bring you back, without streaks:** gifts wash in and wait for you forever; new fish arrive after a short wait; one fish a day is a quarter cheaper; rare visitors (Moon Betta, Sun Angelfish, Rose Corydoras) drop by for a few hours and are added to the collection book when you say hello; two adult fish of one species sometimes lay an egg that hatches into a blend of both; the journal tells small true stories about your fish; friends can wash a message in a bottle into the tank for each other; the tank has a birthday every week.
- **Personalities are behaviour:** shy fish hide behind plants and bolt when others come close, brave fish swim to the glass, curious fish inspect decorations, social fish stick to a buddy, playful fish chase bubbles, lazy fish rest low, greedy fish wait by the surface. After dark most fish drift low and slow. Every fish is a little different in colour and size.
- **Make it yours:** pick the floor (sand, pearl, gravel, black sand, pink coral) and the backdrop. The light follows your phone's clock.
- **While you are away** the tank keeps living: hunger rises, water clouds, algae grows, fish grow. It is capped so a holiday never hurts the fish.

## Run it

```bash
npm install
npm start          # http://localhost:8080 – game + shared-tank server
npm test           # 6 rule tests + 35 server tests
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

## Notifications (optional)

Off until the server has a key pair. Generate one with `npx web-push generate-vapid-keys`, then set three environment variables on the server: `VAPID_PUBLIC`, `VAPID_PRIVATE` and `VAPID_SUBJECT` (a `mailto:` address you own). Players then get a Notifications switch in Settings. On iPhone it only appears after the game is added to the Home Screen (Share, then Add to Home Screen). Rules: opt in per phone, at most two a day per person, nothing between 22:00 and 08:00 their local time, and only for a rare visitor, a fish or egg arriving, a nudge or a bottle.

## Known limits

- No App Store build. iPhone haptics are not available to web apps (Android vibrates).
- Recovery: every account has a recovery key (shown when you create a tank, and under Settings). Typing it on a new phone signs you back in and retires the old phone's token. Without the key, clearing browser data loses the identity.
- One server instance. The database keeps a rolling backup next to it (`ourtank.db.backup`, every six hours and on shutdown).
