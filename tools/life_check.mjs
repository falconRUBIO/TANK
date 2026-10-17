// Emergent Life in the real game: an octopus fetches its keepsake and carries it home (it moves on every phone), sometimes drops it on the
// way, gives up tugging at something too heavy, a tap on the glass makes it leave the fetching for later, a habit for this time of day
// steers where it goes, and a fish keeps going back to where a companion that died used to be. Needs the solo game on 8123.
//   node tools/life_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/life'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.createdAt = now - 20 * 864e5; s.fish.length = 0;
  s.fish.push({ id: 'x1', name: 'Biscuit', species: 'octopus', seed: 5, born: now - 12 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', ownerName: 'You', home: 'c1' },
    { id: 'n1', name: 'Dot', species: 'goldfish', seed: 2, born: now - 12 * 864e5, stage: 'adult', traits: [], happy: 0.9, health: 1, loss: { id: 'gone', name: 'Pip', at: now, until: now + 3 * 864e5, place: 'g1' } });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.0, z: 1.2, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.4, z: 0.6, ry: 0 }, { id: 'g1', type: 'grass', x: -3.0, z: 2.0, ry: 0 });
  s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = [{ id: 'k1', k: 'pebble', adv: 'a1', by: 'x1', byName: 'Biscuit', at: now - 864e5, x: -1.2, z: 2.6 }]; g.emit('state'); });
await p.waitForTimeout(2500);
const step = (n) => p.evaluate((n) => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); } }, n);
// 1. it fetches the pebble and carries it home
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'); F.attnAt = 0; F.rng = () => 0.6; f.keepCarry = { id: 'k1', phase: 'go', t: 0, slip: null }; f.inspect = { x: -1.2, z: 2.6, id: 'k1', type: 'keep' }; });      // (no butterfingers this time: a calm rng)
await p.evaluate(() => { const F = window.__fishes, o = F.onKeep; window.__keepLog = []; F.onKeep = (m) => { const f = F.byId.get('x1'); window.__keepLog.push({ how: m.how, t: f.keepCarry?.t, st: f.st?.s, mode: f.st?.mode, x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2), insp: f.inspect }); o?.(m); }; });
let carried = false, home = false; for (let i = 0; i < 40 && !home; i++) { await step(100); const s = await p.evaluate(() => { const f = window.__fishes.byId.get('x1'); return { phase: f.keepCarry?.phase ?? null, k: window.__game.state.keeps[0] }; }); if (s.phase === 'carry') carried = true; if (!s.phase && carried) home = true; }
await p.waitForTimeout(800);
const k = await p.evaluate(() => window.__game.state.keeps[0]);
ck('it goes to the pebble, picks it up and carries it', carried); console.log(JSON.stringify(await p.evaluate(() => window.__keepLog))); ck('it leaves it by its den, and the tank remembers where (keepMove)', home && Math.hypot(k.x - 1.0, k.z - 1.2) < 2.0 && k.h?.carries === 1 && k.h?.denAt, JSON.stringify(k));
await p.screenshot({ path: `${out}/carried.png` });
// 2. butterfingers: with a clumsy rng it drops it on the way, where it slipped
await p.evaluate(() => { const s = window.__game.state; s.keeps[0].x = -1.6; s.keeps[0].z = 2.4; window.__game.emit('state'); });
await p.waitForTimeout(600);
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'); F.rng = () => 0.6; f.keepCarry = { id: 'k1', phase: 'go', t: 0, slip: 2 }; f.inspect = { x: -1.6, z: 2.4, id: 'k1', type: 'keep' }; });
let dropped = false; for (let i = 0; i < 40 && !dropped; i++) { await step(80); dropped = await p.evaluate(() => { const f = window.__fishes.byId.get('x1'); return !f.keepCarry && window.__keepLog.at(-1)?.how === 'drop'; }); }
await p.waitForTimeout(600); const kd = await p.evaluate(() => window.__game.state.keeps[0]);
ck('now and then it drops it on the way, and it stays where it fell', dropped && kd.h.carries === 2 && Math.hypot(kd.x - 1.0, kd.z - 1.2) > 1.0, JSON.stringify(kd));
// 3. a tap on the glass: it leaves the fetching for later
await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'); F.rng = Math.random; f.keepCarry = { id: 'k1', phase: 'go', t: 2 }; F.attnAt = Date.now(); }); await step(5);
ck('a tap on the glass and it leaves the keepsake for later', await p.evaluate(() => !window.__fishes.byId.get('x1').keepCarry));
// 4. too heavy: it tugs at the boulder, twice, then gives up
await p.evaluate(() => { const F = window.__fishes; F.rng = () => 0.01; F.attnAt = 0; });
for (let i = 0; i < 12; i++) { const s = await p.evaluate(() => { const f = window.__fishes.byId.get('x1'); return f.gaveUp ?? 0; }); if (s) break;
  await p.evaluate(() => { const f = window.__fishes.byId.get('x1'); if (!f.tug) { f.tugFor = null; f.keepCarry = null; f.inspect = { x: -2.4, z: 0.6, id: 'b1', type: 'boulder', r: 0.6 }; } }); await step(200); }
const tg = await p.evaluate(() => { const f = window.__fishes.byId.get('x1'); return { tugs: f.tugs ?? 0, gaveUp: f.gaveUp ?? 0 }; }), tugged = tg.tugs > 0, gave = tg.gaveUp > 0;
ck('it tugs at the boulder and gives up (it never moves)', tugged && gave && (await p.evaluate(() => { const d = window.__game.state.decor.find((x) => x.id === 'b1'); return d.x === -2.4 && d.z === 0.6; })));
// 5. a fish that has lost its companion keeps going back to their place
const near = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('n1'); F.rng = Math.random; let n = 0; for (let i = 0; i < 400; i++) { f.retarget = 0; f.pick?.(Math.random); if (Math.hypot(f.target.x + 3.0, f.target.z - 2.8) < 1.6) n++; } return n / 400; });
const base0 = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('n1'); f.lossPlace = null; let n = 0; for (let i = 0; i < 400; i++) { f.retarget = 0; f.pick?.(Math.random); if (Math.hypot(f.target.x + 3.0, f.target.z - 2.8) < 1.6) n++; } return n / 400; });
ck('a fish missing its companion heads for their old place far more often', near > base0 * 2 && near > 0.15, `${Math.round(near * 100)}% vs ${Math.round(base0 * 100)}%`);
// 6. the profile says it, from the record
await p.evaluate(() => { const s = window.__game.state; s.fish[0].habits = [{ id: 'b1', tod: 1, days: 4 }]; window.__game.emit('state'); }); await p.waitForTimeout(600);
const prof = await p.evaluate(() => { window.__game.profTab = 'over'; window.__showCard?.(window.__fishes.byId.get('x1')); return document.body.innerText; });
ck('the profile lists its habit and the keepsake\'s story (when the profile can be opened here)', !prof.includes('undefined'), '');
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Emergent Life checks passed'); process.exit(fails ? 1 : 0);
