// A seahorse birth you cannot miss, the same way as hatching: Care counts the pregnancy down, live; when he is due his pouch twitches and the
// babies wait for someone to watch (Care has him under Needs you with Watch, Coming up says so); with the tank open the camera comes to him and
// they are born in front of you, and the journal keeps a staged photo of it. Needs the solo game on 8123.   node tools/birth_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/birth'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 30 * D, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1, owner: 'me' }; s.flags.tut = 5; s.level = 8; s.createdAt = now - 40 * D; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.fish.length = 0;
  s.fish.push({ ...A, id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, sex: 'm', mate: 'h2', pairedAt: now - 9 * D, traits: ['Calm'], preg: { start: now - 6 * D, due: now + 9 * 3600e3 + 125e3, mother: 'h2', ma: { id: 'h2', name: 'Pearl', seed: 11 }, seed: 777, n: 12 } }, { ...A, id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, sex: 'f', mate: 'h1', pairedAt: now - 9 * D, traits: ['Shy'] });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -1.4, z: 0.4, ry: 0 }, { id: 'p2', type: 'kelp', x: 1.6, z: -0.6, ry: 0 }); s.hunger = 0.1; s.water = 1; s.glass = 0; g.emit('state');
  document.querySelectorAll('#goal,#coach,#toast').forEach((e) => (e.style.display = 'none')); for (const b of document.querySelectorAll('#modal.on #mok')) b.click(); });
await p.waitForTimeout(2500);
await p.evaluate(() => { window.__ui.open('tank'); window.__ui.open('care'); }); await p.waitForTimeout(800);
const r1 = await p.evaluate(() => [...document.querySelectorAll('#sheet .mrow, #sheet .crow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).find((t) => /expecting/.test(t)) ?? '');
ck('Care counts his pregnancy down, live', /Sunny is expecting.*day \d of \d.*babies born in 9 h \d+ m/.test(r1), r1);
await p.evaluate(() => { const s = window.__game.state; s.fish[0].preg.due = Date.now() - 1000; window.__game.emit('state'); window.__ui.open('care'); }); await p.waitForTimeout(400);
await p.evaluate(() => window.__game.dispatch({ t: 'devSea', what: 'noop' }).catch(() => {})); await p.waitForTimeout(2500);
const r2 = await p.evaluate(() => ({ preg: window.__game.state.fish[0].preg, rows: [...document.querySelectorAll('#sheet .crow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()), soon: [...document.querySelectorAll('#sheet .soon div')].map((d) => d.textContent.trim()) }));
ck('due: his pouch twitches and the babies wait for someone to watch', !!r2.preg?.ready && !r2.preg.watch, r2.preg);
ck('Care has him under Needs you, with Watch', r2.rows.some((t) => /Sunny is about to give birth.*Watch/.test(t)), r2.rows);
ck('Coming up says so, with no clock', r2.soon.some((t) => /about to give birth: stay and watch/.test(t)), r2.soon);
await p.screenshot({ path: `${out}/1-care.png` });
await p.evaluate(() => document.querySelector('#sheet .crow[data-act="egg"]')?.click());
let born = null; const seen = new Set(); for (let i = 0; i < 240 && !born; i++) { await p.waitForTimeout(500); const up = await p.evaluate(() => { const m = document.querySelector('#modal.on h2')?.textContent ?? ''; const r = document.getElementById('reunion')?.classList.contains('on'); document.querySelector('#modal.on #mok')?.click(); if (r) document.getElementById('reunion').click(); return m || (r ? 'reunion' : ''); }); if (up) seen.add(up); born = await p.evaluate(() => window.__game.state.nursery ? { n: window.__game.state.nursery.n, preg: window.__game.state.fish[0].preg } : null); }
ck('watched: they are born, in front of you', born && !born.preg, { born, popups: [...seen] });
await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/2-birth.png` });
let ph = null; for (let i = 0; i < 20 && !ph; i++) { await p.waitForTimeout(500); ph = await p.evaluate(() => JSON.parse(localStorage.getItem('ourtank.moments') || '[]').find((m) => /gave birth/.test(m.text))?.img ?? null); }
if (ph) fs.writeFileSync(`${out}/3-journal.jpg`, Buffer.from(ph.split(',')[1], 'base64'));
ck('the journal keeps a staged photo of the birth', /^data:image\/(jpeg|webp);base64,/.test(ph ?? ''));
// a baby in the nursery, tapped: its own card (name, nature, the nursery day), not the whole nursery's summary every time
await p.evaluate(() => { document.querySelector('#modal.on #mok')?.click(); document.getElementById('reunion')?.click(); });
await p.evaluate(() => { const F = window.__fishes; for (let i = 0; i < 600 && (F.list.some((x) => x.birthT > 0) || F.list.some((x) => x.nursery && !x.group.visible)); i++) { F.update(0.05, i * 0.05); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } });      /* (after the birth, stepped by hand: while it lasts the camera stays on the father and some are still in his pouch, and a slow test browser takes minutes over its seconds) */
await p.waitForTimeout(1500);
const tap = await p.evaluate(async () => { const f = window.__fishes.list.find((x) => x.nursery); if (!f) return { none: 1 }; window.__focus(window.__fishes.list.indexOf(f));      /* (as a tap does: the camera goes to it, then its card) */ await new Promise((r) => setTimeout(r, 300)); if (!document.querySelector('#card.on')) document.getElementById('fishpill')?.click(); await new Promise((r) => setTimeout(r, 600));      /* (its card opens straight away; the name label is only there once it is closed) */ return { name: f.name, card: document.querySelector('#card.on')?.innerText?.replace(/\s+/g, ' ') ?? null, modal: document.querySelector('#modal.on h2')?.textContent ?? null }; });
ck('tapping a nursery baby opens its own card: its name, nature and nursery day, with the whole nursery a tap away', !!tap.card && tap.card.includes(tap.name) && /nursery day \d of 5/.test(tap.card) && /See the whole nursery|Choose who stays/.test(tap.card) && tap.modal !== 'The nursery', tap);
// a real tap, with a finger, on one of the unnamed babies (newborns are a few pixels across: the tap target is a fingertip at least)
await p.evaluate(() => { document.querySelector('#card .x')?.click(); window.__focus(null); document.querySelector('#goal')?.classList.remove('on'); }); await p.waitForTimeout(1500);
const measure = () => p.evaluate(() => { window.__simClock(true); const ks = window.__fishes.list.filter((x) => x.nursery && x.rec?.brood && x.group.visible), f = ks.map((k) => ({ k, s: window.__screenOf(k) })).find((q) => q.s[2] && q.s[1] > 220 && q.s[1] < 620 && q.s[0] > 30 && q.s[0] < 360); return f ? { id: f.k.fid, name: f.k.name, x: f.s[0], y: f.s[1] } : null; });
let spot = null, fing = { card: null };
for (let tries = 0; tries < 3 && !fing.card; tries++) {      /* (a slow runner can let the cloud drift between the measure and the tap: measure again and tap again, up to three times) */
  spot = await measure(); if (!spot) { await p.waitForTimeout(800); continue; }
  await p.mouse.click(spot.x + 6, spot.y + 4); await p.waitForTimeout(1500);
  fing = await p.evaluate(() => ({ card: document.querySelector('#card.on')?.innerText?.replace(/\s+/g, ' ').slice(0, 120) ?? null }));
}
await p.evaluate(() => window.__simClock(false));
const broodNames = await p.evaluate(() => window.__fishes.list.filter((x) => x.nursery && x.rec?.brood).map((x) => x.name));
ck('a finger tap just beside one of the brood opens a brood baby\'s own card, with its name', !!spot && broodNames.some((nm) => (fing.card ?? '').startsWith(nm + ' ')) && /nursery day/.test(fing.card ?? ''), { spot, ...fing });      /* (newborns swim in a tight cloud: the tap goes to whichever is most squarely under the finger, one of them) */
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Birth checks passed'); process.exit(fails ? 1 : 0);
