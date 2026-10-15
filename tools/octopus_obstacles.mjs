// An octopus crawling across a cluttered floor: plants, rocks, the back of its coconut. It must get round things or give up honestly,
// never walk in place and never crawl through a plant. Steps the simulation by hand. Needs the solo game on 8123. node tools/octopus_obstacles.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/obstacles'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const DECOR = [{ id: 'c1', type: 'coconut', x: 2.4, z: 1.5, ry: 0 }, { id: 'r1', type: 'rock', x: -2.0, z: 0.1, ry: 0 }, { id: 'b1', type: 'boulder', x: -0.2, z: -0.3, ry: 0 }, { id: 'g1', type: 'grass', x: -3.4, z: 2.75, ry: 0 }, { id: 'f1', type: 'fern', x: 1.0, z: 2.3, ry: 0 }, { id: 's1', type: 'sword', x: -1.4, z: 2.4, ry: 0 }, { id: 'k1', type: 'kelp', x: -4.1, z: 2.6, ry: 0 }];
await p.evaluate((DECOR) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1', movedAt: 0 });
  s.decor.length = 0; s.decor.push(...DECOR); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, DECOR);
await p.waitForTimeout(2500);
// each trip: start somewhere, crawl to a goal that has something in the way
const TRIPS = [
  { name: 'along the front, past the kelp and the grass', from: [-4.2, 1.6], to: [-2.2, 2.4] },
  { name: 'along the terrace, past the rock and the boulder', from: [-4.0, 0.2], to: [2.1, -0.6] },
  { name: 'through the fern, round the front of the coconut', from: [0.0, 2.7], to: [4.0, 2.6] },
  { name: 'down the side of the coconut', from: [4.0, 2.6], to: [4.3, 0.3] },
  { name: 'along the back, where the coconut and the boulder block the way', from: [4.3, 0.3], to: [-3.6, 0.3] },
  { name: 'through the fern and the seaweed', from: [2.4, 2.7], to: [-2.2, 2.4] },
  { name: 'past the seaweed to the rock', from: [0.0, 2.7], to: [-3.2, 1.9] },
];
const plants = DECOR.flatMap((d) => d.type === 'kelp' ? [[-0.3, 0], [0.05, 0.25], [0.35, -0.1]].map(([a, c]) => ({ x: d.x + a, z: d.z + c })) : ['grass', 'fern', 'sword', 'red'].includes(d.type) ? [{ x: d.x, z: d.z }] : []);      // where the stems stand
let worstPlant = 1e9, inPlaceMax = 0, trips = [];
for (const T of TRIPS) {
  const r = await p.evaluate(async ({ T, plants }) => {
    window.__dbgWh = true; let seed = 7; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; const F = window.__fishes, f = F.list[0]; if (!f.freeSpot(T.to[0], T.to[1])) return { badGoal: true }; f.pos.set(T.from[0], 0.6, T.from[1]); f.vel.set(0, 0, 0); f.inspect = null; f.hunt = null; f.task = null; f.glassAt = null; f.failed = [];
    f.st = { s: 'crawl', t: 60, n: 0, pulse: 0, mode: null }; f.target.set(T.to[0], 0.55, T.to[1]);
    let t = 0, inPlace = 0, inPlaceMax = 0, plantMin = 1e9, reached = false, gaveUp = false, hopped = false, plantAt = null, path = [], last = [f.pos.x, f.pos.z];
    for (let i = 0; i < 1400; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, rng, F.list)); t += 0.05;
      const moved = Math.hypot(f.pos.x - last[0], f.pos.z - last[1]) / 0.05; last = [f.pos.x, f.pos.z];
      if (f.st.s === 'crawl' && f.crawlK > 0.5 && moved < 0.12) { inPlace += 0.05; inPlaceMax = Math.max(inPlaceMax, inPlace); } else inPlace = 0;        // crawling animation with the body not getting anywhere
      if (f.pos.y < 1.3) for (const q of plants) { const dq = Math.hypot(f.pos.x - q.x, f.pos.z - q.z); if (dq < plantMin) { plantMin = dq; plantAt = [+t.toFixed(1), +f.pos.x.toFixed(2), +f.pos.z.toFixed(2), +f.pos.y.toFixed(2), f.st.s, q.x, q.z]; } }      // on the floor; swimming over the leaves is what fish do
      if (i % 10 === 0) path.push([+f.pos.x.toFixed(2), +f.pos.z.toFixed(2), f.st.s, f.st.detour ? 'D' : '', ...(f.st.wh ?? [])]);
      const d = Math.hypot(f.target.x - f.pos.x, f.target.z - f.pos.z);
      if (Math.hypot(T.to[0] - f.pos.x, T.to[1] - f.pos.z) < 0.6) { reached = true; break; }
      if (f.st.s === 'jet') hopped = true;
      if (f.st.s === 'rest' && i > 10) { gaveUp = f.failed.length > 0; break; }
    }
    return { t: +t.toFixed(1), reached, gaveUp, hopped, plantAt, end: f.st.s, inPlaceMax: +inPlaceMax.toFixed(2), plantMin: +plantMin.toFixed(2), path };
  }, { T, plants });
  if (r.badGoal) { ck(T.name + ': the goal is a free spot', false); continue; }
  trips.push({ name: T.name, ...r }); worstPlant = Math.min(worstPlant, r.plantMin); inPlaceMax = Math.max(inPlaceMax, r.inPlaceMax);
  console.log(`  ${T.name}: ${r.reached ? 'reached' : r.gaveUp ? 'gave up' : 'stopped (' + r.end + ')'}${r.hopped ? ' (jetted over something)' : ''} in ${r.t}s, walked in place ${r.inPlaceMax}s, nearest plant ${r.plantMin}`);
  if (process.env.DEBUG) console.log('    nearest plant at', JSON.stringify(r.plantAt), r.reached ? '' : JSON.stringify(r.path.slice(-14)));
  await p.evaluate(() => { window.__cam = null; }); await p.waitForTimeout(400); await p.screenshot({ path: out + '/' + T.name.replace(/\W+/g, '_') + '.png' });
}
const done = trips.filter((t) => t.reached || t.gaveUp).length;
ck('every trip ends: at the goal, or given up honestly after trying on foot and over the top, within 70 s', done === trips.length && trips.every((t) => t.t < 70), `${done}/${trips.length}`);
ck('at least five of the seven goals are reached', trips.filter((t) => t.reached).length >= 5, `${trips.filter((t) => t.reached).length}`);
ck('it never walks in place for more than 1.5 s', inPlaceMax <= 1.5, `${inPlaceMax}s`);
ck('on the floor, its body never passes through a plant stem', worstPlant >= 0.25, `nearest ${worstPlant}`);
ck('no page errors', errors.length === 0, errors.join('; '));
if (process.env.DEBUG) console.log('  decor at the end', JSON.stringify(await p.evaluate(() => window.__game.state.decor.map((d) => [d.type, d.x, d.z]))));
console.log(fails ? `${fails} failed` : 'Obstacle checks passed'); await b.close(); process.exit(fails ? 1 : 0);
