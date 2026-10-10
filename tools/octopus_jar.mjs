// The octopus working a puzzle jar and catching a crab, frame by frame, for art review. OUT=dir node tools/octopus_jar.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/octjar'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const log = await p.evaluate(async () => {
  const g = window.__game, F = window.__fishes, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 500; s.fish.length = 0; s.decor.length = 0;
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: 3, born: Date.now() - 9 * 864e5, stage: 'adult', traits: [], happy: 0.8, health: 1, appetite: 0, owner: null, bond: {}, solved: 2 });
  g.emit('state'); await new Promise((r) => setTimeout(r, 1200)); document.querySelector('#goal')?.remove(); document.querySelector('#sub')?.remove();
  const o = F.list[0]; window.__o = o; o.camoK = 0; const out = [];
  window.__run = (n) => { for (let i = 0; i < n; i++) { window.__t = (window.__t ?? 0) + 0.1; F.update(0.1, window.__t); F.list.forEach((f) => f.update(0.1, Math.random, F.list)); } };
  const r = await g.dispatch({ t: 'puzzle', id: 'o1' }); out.push('puzzle ' + JSON.stringify(r)); await new Promise((r) => setTimeout(r, 800));
  let n = 0; while (!(o.st?.s === 'work' && o.st.mode === 'jar') && n < 3000) { window.__run(1); n++; } out.push(`work after ${n} steps, jar at ${JSON.stringify(o.jarAt)} octo at ${o.pos.x.toFixed(2)},${o.pos.z.toFixed(2)}`);
  window.__jar = o.jarAt; return out;
});
console.log(log.join('\n'));
const shot = async (name, cam, steps) => { await p.evaluate(({ cam, steps }) => { window.__run(steps); const o = window.__o, j = window.__jar; window.__cam = [j.x + cam[0], cam[1], j.z + cam[2], j.x + cam[3], cam[4], j.z + cam[5]]; o.group.position.copy(o.pos); }, { cam, steps }); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 100, width: 390, height: 560 } }); };
await shot('jar_a_front', [0.3, 1.6, 6.5, 0, 0.7, 0], 10); await shot('jar_b_front', [0.3, 1.6, 6.5, 0, 0.7, 0], 25); await shot('jar_c_side', [5.5, 1.6, 2.5, 0, 0.7, 0], 10); await shot('jar_d_high', [0.5, 4.5, 4.5, 0, 0.5, 0], 15);
// the crab
const log2 = await p.evaluate(async () => {
  const g = window.__game, F = window.__fishes, o = window.__o, out = []; g.state.fish[0].puzzle = null; g.emit('state'); await new Promise((r) => setTimeout(r, 600)); out.push(`after solve: hunt ${!!o.hunt} jarAt ${!!o.jarAt} mode ${o.st.mode}`);
  let n = 0; while (!(o.st?.s === 'work' && o.st.mode === 'hunt') && n < 3000) { window.__run(1); n++; } out.push(`hunt after ${n} steps at ${o.pos.x.toFixed(2)},${o.pos.z.toFixed(2)} crab ${JSON.stringify(o.hunt && { x: o.hunt.x, z: o.hunt.z, y: o.hunt.y })}`);
  while (o.hunt && o.hunt.y > 0.25 && n < 6000) { window.__run(1); n++; } window.__jar = o.hunt ? { x: o.hunt.x, z: o.hunt.z } : { x: o.pos.x, z: o.pos.z }; return out;
});
console.log(log2.join('\n'));
await shot('crab_a_reach', [0.3, 1.6, 7, 0, 0.6, 0], 6); await shot('crab_b_grip', [0.3, 1.6, 7, 0, 0.6, 0], 8); await shot('crab_c_mouth', [0.3, 1.6, 7, 0, 0.6, 0], 10); await shot('crab_d_side', [6, 1.4, 2.5, 0, 0.6, 0], 2);
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();
