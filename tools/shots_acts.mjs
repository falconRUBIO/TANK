// Portraits of the octopus's repertoire on clean sand, one per act, for a look at the shapes. OUT=dir node tools/shots_acts.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/acts_shots'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate((nofish) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', movedAt: Date.now() });
  if (!nofish) s.fish.push({ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'g1', type: 'grass', x: -1.4, z: 1.3, ry: 0 }, { id: 'c1', type: 'coconut', x: 3.3, z: 0.7, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, !!process.env.NOFISH);
await p.waitForTimeout(2500);
for (const act of (process.env.ACTS ? process.env.ACTS.split(',') : ['flat', 'bury', 'lion', 'snake', 'jelly', 'kelp', 'watch', 'follow'])) {
  await p.evaluate((act) => { const F = window.__fishes, f = F.list[0]; f.pos.set(act === 'kelp' ? -0.7 : 0.2, 0.6, 1.5); f.vel.set(0, 0, 0); f.heading = act === 'snake' ? Math.PI / 2 : 0.5; f.inspect = null; f.task = null; f.restFor = 20; f.ground = null; f.camoWill = false; f.st = { s: 'rest', t: 0, n: 0, pulse: 0, mode: null }; f.pickAct(f.st, () => 0, F.list, f.mind ?? { cur: 0.5, soc: 0.5 }, act); window.__cam = act === 'jelly' ? [0.2, 6.5, 14, 0.2, 5.4, 1.5] : act === 'lion' ? [0.2, 3.8, 12, 0.2, 2.4, 1.5] : act === 'snake' || act === 'flat' ? [0.2, 3.2, 12.5, 0.2, 0.9, 1.5] : [0.2, 2.4, 8.5, 0.2, 0.9, 1.5]; }, act);
  await p.evaluate((n) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } }, act === 'bury' ? 130 : act === 'jelly' ? 110 : 70); await p.waitForTimeout(600); const st = await p.evaluate(() => { const f = window.__fishes.list[0]; return [f.st.s, f.actText, +f.pos.y.toFixed(2)]; });
  await p.screenshot({ path: `${out}/${act}.png` }); console.log(act, JSON.stringify(st));
  // a close-up from the front and from the side, to judge the shape
  // framed on the octopus's own bounds: the middle of all its voxels in the tank, and how far they spread
  const box = await p.evaluate(() => { const f = window.__fishes.list[0], arr = f.mesh.instanceMatrix.array, V = f.pos.constructor, v = new V(); f.group.updateMatrixWorld(true); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < f.vox.length; i++) { v.set(arr[i * 16 + 12], arr[i * 16 + 13], arr[i * 16 + 14]).applyMatrix4(f.mesh.matrixWorld); const q = [v.x, v.y, v.z]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); } }
    return { c: lo.map((x, k) => (x + hi[k]) / 2), r: Math.max(...hi.map((x, k) => x - lo[k])) / 2 }; });
  const D = Math.max(4, box.r * 6.5), c = box.c;
  for (const [name, dx, dy, dz] of [['front', 0, 0.35, 1], ['side', 0.85, 0.35, 0.5], ['top', 0.15, 1.1, 0.35], ['below', -0.5, -0.25, 1], ['back', -0.9, 0.1, -0.3]]) { const Lh = Math.hypot(dx, dy, dz); await p.evaluate(({ c, e }) => { window.__cam = [c[0] + e[0], c[1] + e[1], c[2] + e[2], c[0], c[1], c[2]]; }, { c, e: [dx / Lh * D, dy / Lh * D, dz / Lh * D] }); await p.waitForTimeout(450); await p.screenshot({ path: `${out}/${act}_${name}.png`, clip: { x: 0, y: 120, width: 390, height: 520 } }); }
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();
