// Where on the screen does everything spend its time? A typical tank (three octopuses, a mix of fish, a few decorations) is left
// alone for ten minutes of tank time and each creature's height on the screen is counted in five bands, top to bottom.
// Needs the solo game on 8123. node tools/screen_spread.mjs [minutes]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const MIN = +(process.argv[2] || 10);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  for (const [i, pal] of [[1, 0], [2, 3], [3, 5]]) s.fish.push({ id: 'o' + i, name: 'Ink' + i, species: 'octopus', seed: 5 + i * 3, pal, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', hunger: 0.1, movedAt: Date.now() });
  ['goldfish', 'neon', 'blue', 'guppy', 'platy', 'danio', 'betta', 'cory', 'angelfish', 'seahorse'].forEach((sp, i) => s.fish.push({ id: 'g' + i, name: 'F' + i, species: sp, seed: 3 + i * 7, born, stage: 'adult', traits: [['Calm', 'Shy', 'Brave', 'Playful', 'Social', 'Lazy', 'Curious', 'Greedy'][i % 8]], happy: 0.8, health: 1 }));
  s.decor.length = 0; s.decor.push({ id: 'd1', type: 'coconut', x: 2.2, z: 2.3, ry: 0 }, { id: 'd2', type: 'grass', x: -3.0, z: 2.4, ry: 0 }, { id: 'd4', type: 'fern', x: -2.4, z: -0.2, ry: 0 }, { id: 'd6', type: 'sword', x: -3.4, z: -3.2, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.evaluate(() => { window.__camRest = true; }); await p.waitForTimeout(3000); if (process.env.NOROOM) await p.evaluate(() => { window.__noRoom = true; });
let r = await p.evaluate(async (MIN) => {
  const F = window.__fishes, cam = window.__tank.camera, V = cam.position.constructor, v = new V(), stg = await import('/src/w3/stage.js'), T = await import('/src/w3/terrain.js'); cam.position.set(0, stg.CAM_Y, stg.CAM_Z); cam.lookAt(0, stg.LOOK_Y, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();      // where the camera rests, not part-way through its opening glide
  const cv = window.__tank.renderer.domElement, rc = cv.getBoundingClientRect(), sc = Math.max(rc.width / cv.width, rc.height / cv.height), dh = cv.height * sc, top = rc.height - dh;
  const shot = (pos) => { v.copy(pos).project(cam); return (top + (1 - v.y) / 2 * dh) / rc.height; };      // 0 at the top of the screen, 1 at the bottom
  const fish = { all: [0, 0, 0, 0, 0] }, octo = [0, 0, 0, 0, 0], pile = { n: 0, piled: 0 }, lv = { front: 0, middle: 0, rear: 0 }; let n = 0;
  for (let i = 0; i < MIN * 60 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    if (i % 10 === 0) { const fl = F.list.filter((x) => !x.dead && x.species.move !== 'jet'); for (const x of fl) { pile.n++; if (fl.filter((o) => o !== x && o.pos.distanceTo(x.pos) < 2.2).length >= 2) pile.piled++; } for (const x of F.list) { if (x.dead) continue; const k = Math.max(0, Math.min(4, Math.floor(shot(x.pos) * 5))); if (x.species.move === 'jet') { octo[k]++; lv[T.levelAt(x.pos.x, x.pos.z)]++; } else { fish.all[k]++; (fish[x.species.id] ??= [0, 0, 0, 0, 0])[k]++; } } n++; }
    if (i % 2000 === 0) await new Promise((q) => setTimeout(q, 0)); }
  const pc = (a) => { const t = a.reduce((s, c) => s + c, 0) || 1; return a.map((c) => Math.round(100 * c / t)); };
  const out = { octo: pc(octo), fish: pc(fish.all) }; const lt = lv.front + lv.middle + lv.rear || 1; for (const k in lv) lv[k] = Math.round(100 * lv[k] / lt); for (const k in fish) if (k !== 'all') out[k] = pc(fish[k]); return { lv, out, piled: Math.round(100 * pile.piled / Math.max(1, pile.n)) };
}, MIN);
console.log('  share of time in each fifth of the screen, top to bottom');
const piled = r.piled, lv = r.lv; r = r.out; console.log('  octopus time on each level of sand', JSON.stringify(lv));
for (const [k, a] of Object.entries(r)) console.log('   ', k.padEnd(10), a.map((x) => String(x).padStart(3) + '%').join(' '));
const f = r.fish, o = r.octo;
ck('the fish use the top of the screen too, not only the middle', f[0] + f[1] >= 30, `${f[0] + f[1]}% in the top two fifths`);
ck('the fish are not piled in the middle', f[2] <= 40, `${f[2]}% in the middle fifth`);
ck('the octopuses spend a good share of their time low on the screen, on the front floor', o[3] + o[4] >= 35, `${o[3] + o[4]}% in the bottom two fifths`);
ck('the octopuses use every level of the sand: the front floor, the middle bank and the high bank at the back', lv.front >= 25 && lv.middle >= 20 && lv.rear >= 10, JSON.stringify(lv));
ck('the octopuses are not piled in the middle either', o[2] <= 45, `${o[2]}% in the middle fifth`);
ck('they give each other room: a fish seldom has two others within a couple of body lengths', piled <= 25, `${piled}% of the time`);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Screen spread checks passed'); await b.close(); process.exit(fails ? 1 : 0);
