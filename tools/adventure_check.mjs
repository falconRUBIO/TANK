// Little Adventures in the real game: the octopus climbs out over the back rim while you watch, is gone from the water (nothing can feed it),
// the Feed screen and Coming up say so without a time, keepsakes lie on the sand by its den, and it climbs back in when it comes home.
// Needs the solo game on 8123. node tools/adventure_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/adv'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.createdAt = now - 20 * 864e5; s.fish.length = 0;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: now - 12 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', ownerName: 'You', home: 'c1' }, { id: 'n1', name: 'Dot', species: 'neon', seed: 2, born: now - 12 * 864e5, stage: 'adult', traits: [], happy: 0.9, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 0.4, z: 1.5, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.0, z: 1.5, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = []; g.emit('state'); });
await p.waitForTimeout(2500);
const inWater = () => p.evaluate(() => window.__fishes.list.some((f) => f.fid === 'x1'));
ck('the octopus is in the water to begin with', await inWater());
// it goes now (as the rules would after its restless pacing), with somebody watching
await p.evaluate(() => { const s = window.__game.state, f = s.fish[0], now = Date.now(); f.restless = { id: 'aB', at: now - 1000, until: now - 10, kind: 'night', out: 'cap' }; window.__game.emit('state'); });
await p.waitForFunction(() => window.__fishes.out?.get('x1'), null, { timeout: 30000 }).catch(() => {});
const mid = await p.evaluate(() => { const F = window.__fishes, f = F.out?.get('x1'); return { away: !!window.__game.state.fish[0].away, out: !!f, puppet: !!f?.puppet, y: f?.pos.y, z: f?.pos.z }; });
ck('it leaves: out of the list, climbing (a puppet path to the back rim)', mid.away && mid.out && mid.puppet, JSON.stringify(mid));
await p.screenshot({ path: `${out}/climbing.png` });
await p.evaluate(() => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < 200; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } });
const gone = await p.evaluate(() => { const f = window.__fishes.out?.get('x1'); return { parent: !!f?.group.parent, puppet: !!f?.puppet }; });
ck('after the climb it is gone from the scene', !gone.parent && !gone.puppet, JSON.stringify(gone));
ck('nothing in the water is the octopus', !(await inWater()));
const fed = await p.evaluate(async () => { const r = await window.__game.dispatch({ t: 'feed', food: 'crab', fish: 'x1' }); return r; });
ck('it cannot be fed while away', !fed.ok || fed.applied === false, JSON.stringify(fed).slice(0, 120));
await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(600);
const care = await p.evaluate(() => document.querySelector('#sheet')?.innerText ?? document.body.innerText);
ck('Coming up says it is out exploring, with no time', /Inky is out exploring/.test(care) && !/out exploring\s*(in|tomorrow|now)/i.test(care), care.slice(0, 200).replace(/\n/g, ' | '));
await p.evaluate(() => { const b = document.querySelector('[data-act="feeddrawer"]'); if (b) b.click(); }); await p.waitForTimeout(600);
const feed = await p.evaluate(() => document.querySelector('#sheet')?.innerText ?? '');
await p.screenshot({ path: `${out}/feed.png` });
ck('the Feed screen shows "Octopus · Out exploring"', /Octopus · Out exploring/.test(feed), feed.slice(0, 200).replace(/\n/g, ' | '));
const noCrab = await p.evaluate(() => !document.querySelector('[data-feed="crab"][data-for="x1"]')); ck('no Feed button for the octopus', noCrab);
await p.evaluate(() => window.__ui.open('tank')); await p.waitForTimeout(300);
// home again: the rules resolve the return, the keepsake lies by its den, and it climbs back in
await p.evaluate(() => { const s = window.__game.state, f = s.fish[0]; f.away.until = Date.now() - 10; window.__game.emit('state'); });
await p.waitForFunction(() => { const F = window.__fishes; return F.list.includes(F.byId.get('x1')); }, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(300);      /* (until the rules' next tick has brought it home: a fixed 1.5 s once fell between two ticks on a slow machine, where a frame of the tank can take over a second) */
const back = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'), sf = window.__game.state.fish.find((x) => x.id === 'x1'); return { away: sf?.away ? Math.round((sf.away.until - Date.now()) / 1000) : null, sim: window.__game.state.simTs ? Math.round((Date.now() - window.__game.state.simTs) / 1000) : null, list: F.list.includes(f), puppet: !!f?.puppet, keeps: window.__game.state.keeps.length, mesh: window.__decor.keeps?.size ?? 0, journal: window.__game.journal.slice(-3).map((e) => e.text) }; });
back.errs = errors.slice(0, 3).map((e) => String(e).slice(0, 160));      /* (anything the page reported: a rules step that failed is logged, not thrown) */
ck('home again: back in the water, climbing in over the rim', back.list && back.puppet, JSON.stringify(back));
ck('the bottle cap it brought lies on the sand (a mesh by its den)', back.keeps === 1 && back.mesh === 1, JSON.stringify(back));
ck('the journal says it came back with a bottle cap', back.journal.some((t) => /bottle cap/.test(t)), JSON.stringify(back.journal));
await p.evaluate(() => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < 200; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } });
const settled = await p.evaluate(() => { const f = window.__fishes.byId.get('x1'), k = [...window.__decor.keeps.values()][0]; return { puppet: !!f.puppet, d: Math.hypot(f.pos.x - 0.4, f.pos.z - 2.0), kd: Math.hypot(k.x - 0.4, k.z - 1.5) }; });
ck('it finishes the climb near its den, and the keepsake is by the den', !settled.puppet && settled.d < 2.5 && settled.kd < 1.2, JSON.stringify(settled));
await p.screenshot({ path: `${out}/home.png` });
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Adventure checks passed'); process.exit(fails ? 1 : 0);
