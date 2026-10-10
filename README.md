# OUR TANK

Four friends, one living aquarium. Chunky voxel fish and decorations, modern lighting, and a calm loop built for short visits. Runs in any phone browser and installs to the home screen (it is a web app, not an App Store binary).

## The game

- **Start:** an empty tank where you choose the colour of your octopus (six colours), name it, and a starter pack of free items. Feed it, meet your friends, place something. Four short tips, skippable.
- **Care:** feed (tap the water to drop food, three drops per feeding; an octopus is fed crabs, which it hunts, while flakes and pellets are for the fish), wipe algae off the glass, change the water. You earn **shells** only when the tank actually needs the care. No streaks, no timers you must obey, no ads, no purchases.
- **Grow:** adopt fish (goldfish, neon school, guppies, corydoras, blue ram, angelfish, betta) and place decorations (18 items: plants, kelp, rocks, driftwood, lantern, chest, bubbler, clam, skull, torii gate, stone arch…). Fish grow baby → juvenile → adult over real days and the tank levels up (8 levels), unlocking new species, items and room.
- **Every fish has its own needs:** it gets hungry at its own pace (greedy fish sooner, lazy fish later), its happiness depends on clean water and on things it likes in the tank (shy fish like plants, curious fish like structures, playful fish like bubbles…), and its health slips if it is neglected. Tap a fish to see its mood.
- **Neglect has a cost.** A fish that goes hungry or sits in foul water slowly weakens. After two days it turns pale, slows down and a warning goes out; after five days it dies and floats belly-up at the surface until someone taps it to lay it to rest (a floating fish also fouls the water faster). Any real care wins the time back twice as fast. Guard rails keep it fair in a shared tank: no deaths in a tank's first three days, at most one death a day, and the last fish never dies. Lost fish are listed under Remembered in the Journal.
- **Playing with a fish:** tap a fish, then Play, and drag your finger along the glass. It follows. Five seconds builds your bond with it.
- **Together:** up to **four** caretakers share one tank with a six-character code or invite link. Everything is shared: fish, decorations, shells, journal, chat.
- **Things that bring you back, without streaks:** gifts turn up in the tank (an octopus, a fish or the filter gets the blame) and wait for you forever; new fish arrive after a short wait; one fish a day is a quarter cheaper; rare visitors (Moon Betta, Sun Angelfish, Rose Corydoras) drop by for a few hours and are added to the collection book when you say hello; two adult fish of one species sometimes lay an egg that hatches into a blend of both; the journal tells small true stories about your fish; friends can wash a message in a bottle into the tank for each other; the tank has a birthday every week.
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

- Exactly four seats per tank (`CHECK slot 1..4` + `UNIQUE(tank, slot)`, claimed inside one write transaction). A fifth player gets "This tank is full". A database made when tanks held three is rebuilt to four seats the first time the new server opens it.
- Codes: 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, random, unique, regenerable by any member. A code only lets you ask for a seat; attempts are rate limited.
- Every action carries an idempotency key, so a retry or a double tap never pays or charges twice. Two players spending the last shells at the same time: exactly one purchase succeeds.
- Identity is an anonymous account token kept in the browser (only its hash is stored).

## Keeping tanks across redeploys (do one of these)

A host whose disk is wiped on every deploy or restart (Render's free plan) forgets every tank, and the codes stop working. Pick one:

**A. An offsite copy (free).** The server copies its whole database to a bucket every five minutes and just before it stops, and puts it back when it starts with nothing. Any S3-compatible bucket works. With Backblaze B2 (free 10 GB, no card needed):
1. Create a Backblaze account, then Buckets, Create a Bucket (keep it private), for example `our-tank-data`.
2. App Keys, Add a New Application Key, limited to that bucket with read and write. Copy the keyID and the applicationKey now; the key is shown once.
3. On the bucket page note its Endpoint, like `s3.us-west-004.backblazeb2.com`. The region is the middle part, `us-west-004`.
4. In Render, open the service, Environment, and add: `S3_ENDPOINT` = `https://s3.us-west-004.backblazeb2.com`, `S3_BUCKET` = your bucket name, `S3_KEY` = the keyID, `S3_SECRET` = the applicationKey, `S3_REGION` = `us-west-004`. Save, and let it redeploy.
5. Open `/admin`: "Offsite copy" should say on, with the time of the last copy. Cloudflare R2 and Supabase Storage work the same way.

**A2. The same, kept in your own GitHub (no new account).**
1. On GitHub create a new **private** repository, for example `ourtank-data`, and tick "Add a README file".
2. Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token. Name it `our-tank`, choose the longest expiry, Repository access: Only select repositories, pick `ourtank-data`. Under Permissions, Repository permissions, set **Contents** to Read and write. Generate and copy the token (shown once). Put a reminder in your calendar to make a new one before it expires.
3. In Render, Environment: `GITHUB_BACKUP_TOKEN` = the token, `GITHUB_BACKUP_REPO` = `yourname/ourtank-data`. Save.
4. `/admin` shows "Offsite copy: on". Copies are compressed and sent at most every 25 minutes and always when the server stops, so a tank made in the last half hour before a crash can be lost; Settings, "Tank storage" shows Protected once the first copy is sent. It stores all accounts and tanks in that private repo.
5. Redeploys are safe: Render starts the new server before it stops the old one, so a new server sends nothing for its first three minutes, and if the old server's last copy arrives meanwhile it loads that copy instead of overwriting it. `node tools/backup_drill.mjs` rehearses a wiped-disk restart and an overlapping redeploy against a stand-in for GitHub.

**B. A persistent disk.** On a paid Render plan, mount a disk at `/data` and set `DB=/data/ourtank.db` (the included `render.yaml` does this).

Phones also keep a copy of their tank and put it back under the same code if the server ever loses it anyway.

## Notifications

What they say, when nobody has the tank open: a fish has died, a fish is in a critical state, a rare visitor, a solved puzzle jar, an arrival or a hatch, a growth milestone or a discovery. When nothing happened but care is overdue: your own octopus is hungry (only you are told), the fish are hungry or the water needs changing (everyone), each at most once in 12 hours. Also: a friend joined your tank, a nudge, a bottle. At most one a day per person (two when a friend writes to you), never between 22:00 and 08:00 local time.

They work with no setup: the server makes its own key pair the first time it starts and keeps it in the database (set `VAPID_PUBLIC`, `VAPID_PRIVATE` and `VAPID_SUBJECT` yourself only if you want to bring your own). Keep the disk attached, or phones will have to switch notifications back on after a redeploy. Players get a Notifications switch in Settings, plus a "Send a test" button to check that they arrive. At most one a day, never between 22:00 and 08:00 their time, never a "come back" reminder.

On iPhone they only work from the home-screen icon: in Safari tap Share, then Add to Home Screen, then open Our Tank from that icon (remove an older icon first) and switch them on in Settings. iOS 16.4 or later.

## Usage tracking and the developer view

The server records anonymous events (a random player id, a random tank id, an event name and a number; no names, no IP addresses, no message text): sessions (counting only time the game is visible), care actions, fish played with and inspected, decorations placed, shells earned and spent, daily wishes completed, discoveries, journal opened, friend interactions, fish deaths and level-ups. Set `ADMIN_KEY` on the server, then open `/admin?key=YOUR_KEY` (or `/admin/stats?key=YOUR_KEY` for JSON). It shows individual-player numbers (daily active players, session length, visits per day, retention on days 1, 7 and 30, what a session contains) separately from shared-tank numbers (active tanks, caretakers per tank, level distribution, deaths). Three people opening one tank count as three players and one tank. Without `ADMIN_KEY` the page does not exist.

## Known limits

- No App Store build. iPhone haptics are not available to web apps (Android vibrates).
- Recovery: every account has a recovery key (shown when you create a tank, and under Settings). Typing it on a new phone signs you back in and retires the old phone's token. Without the key, clearing browser data loses the identity.
- One server instance. The database keeps a rolling backup next to it (`ourtank.db.backup`, every six hours and on shutdown).

## If a tank or recovery key "disappears"
That means the server started with an empty database. On Render the database must live on the persistent disk: the service needs a disk mounted at `/data` and the environment variable `DB=/data/ourtank.db` (the blueprint in `render.yaml` does both, and needs a paid plan). Without a disk every deploy or restart wipes all tanks and recovery keys. The server log prints the database path and the number of players it found at start, and warns when it is not on `/data`; the developer page (`/admin`) shows "Data since", which should not reset after a deploy.

## Your data
Settings has **Backup of this tank** (downloads a JSON file with no account ids), **Delete my data** (removes the player; an empty tank goes with its last player) and a link to `/privacy.html`. On the welcome screen, **Restore a backup** makes a new tank from a backup file (validated and bounded). The server endpoints are `GET /api/export`, `POST /api/import` and `DELETE /api/me`.

## Looks cost a few shells
Sand and the Candy backdrop are free; other floors (20 to 40) and backdrops (25) are bought once with shells and kept by the tank. A tank that already uses a look keeps it.

## Quiet surprises
Nothing here pays shells or writes to the journal. Every few minutes, once the tutorial is done, something passes through the deep water behind the tank (a whale shark, a jellyfish, a turtle or a silver shoal, drawn as pale ghosts: the fish remembering the ocean), and holding a finger in the water calls the bold and curious fish over to look. `tools/shots_sights.mjs` parks each sighting mid-water for screenshots.

## Look
The far water has two layers of hazy, swaying kelp blades and rock outcrops behind the dunes (`buildBackdrop` in `web/src/w3/env.js`, tinted by the chosen backdrop and time of day). The menus share one skin: pixel-notched, water-tinted panels (the block at the end of the style sheet in `web/index.html`). `tools/shots_look.mjs` captures the tank at each time of day.
