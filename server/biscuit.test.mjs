// The Biscuit proof: one octopus, one bottle cap, three systems that have to be one story.
// Biscuit escapes (Little Adventures), comes home with a bottle cap, carries it to its den over several days (Emergent Life), the server is
// restarted from its database file in the middle, and 30 simulated days later Biscuit still knows that same bottle cap and keeps it by its den
// (Living History). Everything goes through the real server: its database, its actions, its time step.  node server/biscuit.test.mjs
process.env.TICK_MS = '3600000';      // (the server's own clock tick stays out of the way: this test moves time itself)
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { start } from './server.mjs';
import * as L from './logic.mjs';
import * as R from '../web/src/game/rules.js';
const DAY = 864e5, H = 3600e3, MIN = 60e3, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biscuit-')), file = path.join(dir, 'tank.db');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
const collector = (() => { for (let s = 1; s < 5000; s++) if (R.octoMind({ seed: s }).type === 'collector') return s; })();
console.log('The Biscuit proof');

let S = await start({ port: 0, dbPath: file });
const call = async (p, body, token) => { const r = await fetch(`http://localhost:${S.port}${p}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return r.json(); };
const me = await call('/api/users', { name: 'Ana', avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }), tk = await call('/api/tanks', { name: 'Biscuit' }, me.token), user = { id: me.userId, name: 'Ana' };
const getW = () => JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(tk.id).world), setW = (w) => S.db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), tk.id);
const act = (a, now, idem) => L.act(S.db, user, a, { idem, now });
const tick = (now) => L.tickTank(S.db, tk.id, now);
const journal = () => S.db.prepare('SELECT text, ts FROM journal WHERE tank_id=? ORDER BY id').all(tk.id);

// a settled tank: Biscuit in its coconut shell, a few things about
const T0 = Date.now() - 50 * DAY; let now = T0 + 20 * DAY;
{ const w = getW(); Object.assign(w, { createdAt: T0, simTs: now - 1000, level: 6, shells: 100, flags: { ...w.flags, tut: 5 }, visitAt: 9e15, eggAt: 9e15, driftAt: 9e15, storyAt: 9e15 });
  w.fish = [R.ensureFish({ id: 'o1', name: 'Biscuit', species: 'octopus', seed: collector, born: T0 + 2 * DAY, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: user.id, ownerName: 'Ana', home: 'd1' })];
  w.decor = [{ id: 'd1', type: 'coconut', x: 1.2, z: 0.6, ry: 0 }, { id: 'd2', type: 'boulder', x: -2.2, z: -0.6, ry: 0 }, { id: 'd3', type: 'grass', x: -2.8, z: 1.8, ry: 0 }];
  w.adv = { octoAt: 9e15, smallAt: 9e15, hist: [] }; w.keeps = []; setW(w); tick(now); }
const feed = (t) => act({ t: 'feed', food: 'crab', fish: 'o1' }, t, 'feed' + t);

// 1. the escape: Biscuit grows restless and goes (this is the step the scheduler takes; the outcome is a bottle cap)
{ const w = getW(); w.fish[0].restless = { id: 'aB', at: now, until: now + 20 * MIN, kind: 'short', out: 'cap' }; setW(w); }
tick(now + 21 * MIN); let w = getW();
ok('Biscuit climbs out and is away: not in the water, cannot be fed', () => { assert.ok(w.fish[0].away && !w.fish[0].away.inTank); assert.equal(feed(now + 25 * MIN).ok, false); assert.ok(journal().some((j) => /Biscuit (climbed out over the top|squeezed through the gap|slid up the glass|went over the top)/.test(j.text))); });
const back = w.fish[0].away.until; tick(back + MIN); w = getW(); const cap = w.keeps.find((k) => k.by === 'o1');
ok('it comes home with a bottle cap, kept on the sand by its den, from that very adventure', () => { assert.ok(!w.fish[0].away); assert.ok(cap && cap.k === 'cap' && cap.adv === 'aB'); assert.ok(Math.hypot(cap.x - 1.2, cap.z - 0.6) < 1.2); assert.ok(journal().some((j) => /came back holding a bottle cap/.test(j.text) && j.ts === back)); assert.equal(w.fish[0].advMem.items[0].id, cap.id); });
// 2. Emergent Life: over the next days it wanders off with it and brings it back, handles it (the phone reports each real touch)
now = back + H;
for (let d = 0; d < 4; d++) { const t1 = now + d * DAY; feed(t1);
  act({ t: 'keepMove', id: cap.id, x: -1.5 + d * 0.3, z: 2.4, how: 'drop', fish: 'o1', idk: 'away' + d }, t1 + H, 'mv1-' + d);      // it took it off somewhere (and dropped it there)
  act({ t: 'octoTouch', fish: 'o1', decor: cap.id, kind: 'revisit' }, t1 + 2 * H, 'touch-' + d);
  act({ t: 'keepMove', id: cap.id, x: 1.6, z: 1.0, how: 'carry', fish: 'o1', idk: 'home' + d }, t1 + 3 * H, 'mv2-' + d);      // and carried it home
  tick(t1 + 4 * H); }
now += 4 * DAY; tick(now); w = getW();
ok('it carries the cap home on four days; the cap keeps that history and the den milestone is written once', () => { const k = w.keeps.find((q) => q.id === cap.id); assert.equal(k.h.carries, 8); assert.ok(k.h.denAt); assert.equal(journal().filter((j) => /Biscuit has been carrying the bottle cap around/.test(j.text)).length, 1); });
ok('Biscuit knows the cap now (from handling it, not from being told)', () => { assert.ok(R.knowsKeep(w.fish[0], cap.id), JSON.stringify(w.fish[0].mem.keeps)); });

// 3. the server is restarted from its database file
await S.close(); S = await start({ port: 0, dbPath: file }); w = getW();
ok('after a restart everything is still there: the cap, its history, Biscuit\'s memory of it, its den', () => { const k = w.keeps.find((q) => q.id === cap.id); assert.ok(k && k.h.carries === 8 && k.adv === 'aB'); assert.ok(R.knowsKeep(w.fish[0], cap.id)); assert.equal(w.fish[0].advMem.items[0].id, cap.id); });

// 4. thirty simulated days later, with nothing special happening (it is fed; it does not handle the cap again)
for (let d = 1; d <= 30; d++) { feed(now + d * DAY); tick(now + d * DAY + H); }
now += 30 * DAY + H; w = getW(); const f = w.fish.find((x) => x.id === 'o1');
ok('30 days on, Biscuit still knows that same bottle cap', () => { assert.ok(f, 'Biscuit is alive'); assert.ok(R.knowsKeep(f, cap.id), JSON.stringify(f.mem.keeps)); });
ok('the cap is still the one from its adventure, still by its den, and its den record lists it', () => { const k = w.keeps.find((q) => q.id === cap.id); assert.equal(k.adv, 'aB'); assert.ok(Math.hypot(k.x - 1.2, k.z - 0.6) < 2); assert.ok(f.denMem?.objs.includes(cap.id), JSON.stringify(f.denMem)); });
ok('its story says so, only from the record', () => { const s = R.keepStory(w, w.keeps.find((q) => q.id === cap.id), R); assert.match(s, /^Bottle cap: Biscuit found it on day \d+, carried 8 times, kept beside its den for (2[89]|3\d) days\.$/, s); });
ok('the tank\'s history has the adventure and the cap, once each, in order', () => { const H0 = w.history ?? []; const a = H0.findIndex((h) => /came back holding a bottle cap/.test(h.text)), c = H0.findIndex((h) => /carrying the bottle cap around/.test(h.text)); assert.ok(a >= 0 && c > a, JSON.stringify(H0.map((h) => h.text))); assert.equal(H0.filter((h) => /came back holding/.test(h.text)).length, 1); });
// (audit) news that comes due during a refused action is never lost: a second adventure ends while someone's action is refused
{ const w2 = getW(); const o = w2.fish.find((x) => x.id === 'o1'); o.away = { id: 'aC', kind: 'short', at: now - 2 * H, until: now - H, out: 'quiet', inTank: false, hunger: 0.1, fedAt: null }; setW(w2); }
ok('a refused action still keeps what time brought: Biscuit\'s return is written even though the action was refused', () => { const r = act({ t: 'sellFish', id: 'nobody' }, now + MIN, 'refused-1'); assert.equal(r.ok, false); assert.ok(journal().some((j) => /came back from a quiet little adventure/.test(j.text) && j.ts === now - H), 'the return is in the journal'); assert.ok((r.events ?? []).some((e) => e.adventure?.phase === 'back'), 'and goes out to the phones'); });
await S.close(); fs.rmSync(dir, { recursive: true, force: true });
console.log(`All ${n} Biscuit proof checks passed`);
