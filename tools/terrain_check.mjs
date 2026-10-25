// The sand banks, played for real: an octopus crawls from the front floor up to the high bank at the back and down again by the
// ramps (never straight over a face), three octopuses spread over the three levels, no fish ever ends up inside the sand, and a
// finger on each level puts a decoration down on that level, standing on the sand. Needs the solo game on 8123. node tools/terrain_check.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/terrain'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8123}/?q=0&dev=1&tod=noon`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 500; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  for (const [i, pal] of [[1, 0], [2, 3], [3, 5]]) s.fish.push({ id: 'o' + i, name: 'Ink' + i, species: 'octopus', seed: 5 + i * 3, pal, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger: 0.1, movedAt: Date.now() });
  for (const [i, sp] of [[1, 'goldfish'], [2, 'cory'], [3, 'angelfish'], [4, 'neon']]) s.fish.push({ id: 'g' + i, name: 'F' + i, species: sp, seed: 3 + i, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 });
  s.decor.length = 0; g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
// 1. up and down: one octopus, sent from the front floor to the top of the back bank, and back
await p.evaluate(() => { window.__dbgWh = true; });
const trip = (from, to) => p.evaluate(async ({ from, to }) => {
  const T = await import('/src/w3/terrain.js'), F = window.__fishes, f = F.byId.get('o1'); F.list.filter((o) => o !== f && o.species.move === 'jet').forEach((o) => { o.pos.set(-4, T.sandH(-4, 2.4) + 0.55, 2.4); o.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; });
  f.pos.set(from[0], T.sandH(from[0], from[1]) + 0.55, from[1]); f.vel.set(0, 0, 0); f.inspect = null; f.task = null; f.hunt = null; f.den = null; f.failed = []; f.isNight = false; f.shy = false; f.noSwimTrips = true; f.roamSpot = () => [to[0], to[1]];      // its own wish to wander goes the same way, so it cannot change the trip under test
  const S = (f.st = { s: 'crawl', t: 60, n: 0, pulse: 0, mode: 'greet' }); f.target.set(to[0], 0.55, to[1]);
  let maxFace = 0, ramp = 0, levels = [], t = 0, jets = 0; window.__tr = [];
  for (let i = 0; i < 20 * 120; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => { if (x === f || x.species.move !== 'jet') x.update(0.05, Math.random, F.list); }); t += 0.05;      // the fish swim on as usual; the other octopuses wait at the side
    if (i % 5 === 0 && t < 40) (window.__tr ||= []).push([+t.toFixed(2), f.st.s, f.st.mode, f.pos.x.toFixed(2), f.pos.z.toFixed(2), T.slopeAt(f.pos.x, f.pos.z).s.toFixed(2), f.st.detour ? f.st.detour.x.toFixed(1) + ',' + f.st.detour.z.toFixed(1) : '-', (f.st.route ?? []).map((q) => q.x.toFixed(1) + ',' + q.z.toFixed(1)).join(' '), f.st.prog?.n, f.target.x.toFixed(1) + ',' + f.target.z.toFixed(1), JSON.stringify(f.st.wh ?? null), f.pos.y.toFixed(2), T.sandH(f.pos.x, f.pos.z).toFixed(2)].join(' '));
    if (f.st.s === 'jet') jets++; if (f.st.s === 'crawl') { const sl = T.slopeAt(f.pos.x, f.pos.z).s; if (sl > maxFace) { maxFace = sl; window.__faceAt = { t: +t.toFixed(1), pos: f.pos.toArray().map((v) => +v.toFixed(2)), vel: f.vel.toArray().map((v) => +v.toFixed(2)), route: (f.st.route ?? []).map((q) => [+q.x.toFixed(1), +q.z.toFixed(1)]), tgt: [+f.target.x.toFixed(1), +f.target.z.toFixed(1)], detour: !!f.st.detour, prog: f.st.prog ? 1 : 0, gait: f.gait?.name }; } }
    for (const r of Object.values(T.RAMPS)) for (const q of r) if (Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 0.9) ramp++;
    const lv = T.levelAt(f.pos.x, f.pos.z); if (levels.at(-1) !== lv) levels.push(lv);
    if (f.st.s !== 'crawl' && f.st.s !== 'jet' && Math.hypot(f.pos.x - to[0], f.pos.z - to[1]) < 1.2) break;
    if (f.st.s === 'crawl' && Math.hypot(f.pos.x - to[0], f.pos.z - to[1]) < 0.6) break; if (f.st.s !== 'crawl' && f.st.s !== 'jet') { f.st = { s: 'crawl', t: 60, n: 0, pulse: 0, mode: 'greet' }; f.target.set(to[0], 0.55, to[1]); }
    if (i % 400 === 0) await new Promise((r) => setTimeout(r, 0)); }
  return { t: +t.toFixed(1), at: [+f.pos.x.toFixed(2), +f.pos.y.toFixed(2), +f.pos.z.toFixed(2)], level: T.levelAt(f.pos.x, f.pos.z), dist: +Math.hypot(f.pos.x - to[0], f.pos.z - to[1]).toFixed(2), maxFace: +maxFace.toFixed(2), ramp, levels, jets, ground: +(f.pos.y - T.sandH(f.pos.x, f.pos.z)).toFixed(2) };
}, { from, to });
let r = await trip([-2, 2.3], [-2.5, -3.1]); console.log('  up:', JSON.stringify(r));
ck('crawling from the front floor it reaches the top of the back bank', r.level === 'rear' && r.dist < 1.3, JSON.stringify(r.at));
if (process.env.TRACE) { const tr = await p.evaluate(() => window.__tr); console.log('UPTRACE\n' + tr.join('\n')); }
if (process.env.DEBUG) console.log('  face', JSON.stringify(await p.evaluate(() => window.__faceAt)));
ck('it goes up by the ramps, through the terrace, not straight up a face', r.ramp > 0 && r.levels.join() === 'front,middle,rear' && r.maxFace < 1.3, `levels ${r.levels} · steepest under it ${r.maxFace}`);
ck('it is standing on the sand up there, not floating or sunk', Math.abs(r.ground - 0.55) < 0.12, `${r.ground}`);
await p.evaluate(() => { window.__tank.camera.updateMatrixWorld(); }); await p.screenshot({ path: `${out}/up_there.png` });
r = await trip([-2.5, -3.1], [1.0, 2.3]); console.log('  down:', JSON.stringify(r));
if (process.env.TRACE) { const tr = await p.evaluate(() => window.__tr); console.log('DOWNTRACE\n' + tr.join('\n')); }
if (process.env.DEBUG) console.log('  face down', JSON.stringify(await p.evaluate(() => window.__faceAt)));
ck('and it comes back down to the front floor the same way', r.level === 'front' && r.dist < 1.3 && r.levels[0] === 'rear' && r.levels.indexOf('middle') > 0 && r.levels.indexOf('middle') < r.levels.indexOf('front') && r.maxFace < 1.3, `levels ${r.levels} · steepest ${r.maxFace}`);
// 2. left alone: three octopuses over twenty minutes of tank time use all three levels, and no fish goes into the sand
const spread = await p.evaluate(async () => {
  const T = await import('/src/w3/terrain.js'), F = window.__fishes, oct = F.list.filter((o) => o.species.move === 'jet'); oct.forEach((o, i) => { o.pos.set(-2 + i * 2, T.sandH(-2 + i * 2, 2.2) + 0.55, 2.2); o.st = { s: 'rest', t: 1, n: 0, pulse: 0 }; o.isNight = false; });
  oct.forEach((o) => { o.noSwimTrips = false; }); const time = { front: 0, middle: 0, rear: 0 }, per = oct.map(() => new Set()); let sunk = 0, worst = 9, together = 0;
  for (let i = 0; i < 20 * 60 * 20; i++) { if (i % 4800 === 0) oct.forEach((o) => { o.movedAt = 0; });
    F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    oct.forEach((o, k) => { const lv = T.levelAt(o.pos.x, o.pos.z); time[lv] += 0.05; per[k].add(lv); });
    if (oct.every((o) => Math.hypot(o.pos.x - oct[0].pos.x, o.pos.z - oct[0].pos.z) < 1.6)) together += 0.05;
    for (const x of F.list) { if (x.dead) continue; const gap = x.pos.y - T.sandH(x.pos.x, x.pos.z); worst = Math.min(worst, gap); if (gap < 0.3) sunk++; }
    if (i % 2000 === 0) await new Promise((r) => setTimeout(r, 0)); }
  const tot = time.front + time.middle + time.rear; for (const k in time) time[k] = +(100 * time[k] / tot).toFixed(1);
  return { time, per: per.map((s) => [...s]), sunk, worst: +worst.toFixed(2), together: +together.toFixed(0) };
});
console.log('  twenty minutes:', JSON.stringify(spread));
ck('the octopuses use every level: the floor and the terrace most, the small high bank at the back now and then, none of them more than two thirds of the time', spread.time.front > 15 && spread.time.middle > 15 && spread.time.rear > 2.5 && Object.values(spread.time).every((v) => v < 67), JSON.stringify(spread.time));
ck('at least one of them spends time up on the high bank', spread.per.some((s) => s.includes('rear')), JSON.stringify(spread.per));
ck('each octopus visits at least two levels', spread.per.every((s) => s.length >= 2), JSON.stringify(spread.per));
ck('they do not all huddle in one place', spread.together < 120, `${spread.together} s all within 1.6 of each other`);
ck('no fish or octopus ever ends up inside the sand', spread.sunk === 0 && spread.worst >= 0.3, `lowest above the sand ${spread.worst}`);
await p.screenshot({ path: `${out}/after_twenty_minutes.png`, timeout: 90000 }).catch(() => {});
// 3. placing with a finger: tap a spot on each level, the decoration goes there and stands on the sand
await p.evaluate(() => { window.__fishes.list.forEach((o) => { o.pos.x = 4.5; }); });
const place = async (wx, wz) => {
  const sc = await p.evaluate(async ({ wx, wz }) => { const T = await import('/src/w3/terrain.js'), cam = window.__tank.camera, V = cam.position.constructor, v = new V(wx, T.sandH(wx, wz), wz).project(cam), cv = window.__tank.renderer.domElement, r = cv.getBoundingClientRect(), sc = Math.max(r.width / cv.width, r.height / cv.height), dw = cv.width * sc, dh = cv.height * sc; return { x: r.left + (r.width - dw) / 2 + (v.x + 1) / 2 * dw, y: r.top + (r.height - dh) + (1 - v.y) / 2 * dh }; }, { wx, wz });
  await p.mouse.move(sc.x, sc.y); await p.mouse.down(); await p.mouse.move(sc.x + 1, sc.y + 1); await p.mouse.move(sc.x, sc.y); await p.waitForTimeout(200); const pv = await p.evaluate(async () => { const T = await import('/src/w3/terrain.js'), d = window.__decor.preview; return d ? { x: d.x, z: d.z, valid: d.valid, level: T.levelAt(d.x, d.z), y: +(d.item.group.position.y - T.sandH(d.x, d.z)).toFixed(2) } : null; }); await p.mouse.up(); return { sc, pv };
};
await p.evaluate(() => window.__startPlace('rock')); await p.waitForTimeout(400);
for (const [name, wx, wz, lv] of [['front floor', -1.0, 2.4, 'front'], ['terrace', -1.6, -0.3, 'middle'], ['back bank', -2.6, -3.0, 'rear'], ['a face', -1.0, 1.15, null]]) {
  const r2 = await place(wx, wz); console.log(`  finger on the ${name}:`, JSON.stringify(r2.pv));
  if (lv) ck(`a finger on the ${name} puts it on the ${name}, near the finger, standing on the sand`, r2.pv && r2.pv.level === lv && Math.hypot(r2.pv.x - wx, r2.pv.z - wz) < 0.5 && r2.pv.valid && r2.pv.y > -0.25 && r2.pv.y < 0.35, JSON.stringify(r2.pv));
  else ck('a finger on a steep face moves it to the nearest flat sand, never leaves it on the face', r2.pv && r2.pv.valid && Math.hypot(r2.pv.x - wx, r2.pv.z - wz) < 1.7, JSON.stringify(r2.pv));
  await p.screenshot({ path: `${out}/place_${name.replace(/ /g, '_')}.png` });
}
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Terrain checks passed'); await b.close(); process.exit(fails ? 1 : 0);
