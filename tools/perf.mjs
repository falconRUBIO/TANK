// How much does the behaviour watcher cost per frame with a full tank?
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game; g.state.level = 8; g.state.flags.tut = 5; for (let i = 0; i < 40; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const sp of ['neon', 'danio', 'guppy', 'platy', 'goldfish', 'goldfish', 'cory', 'blue', 'betta', 'angelfish', 'goldfish']) await g.dispatch({ t: 'buyFish', species: sp, name: 'T', seed: 3, rush: true }, { dev: true });
  const types = ['grass', 'fern', 'rock', 'boulder', 'wood', 'pillar', 'lantern', 'chest', 'kelp', 'sword', 'red', 'bubbler']; let n = 0;
  for (let i = 0; i < 30; i++) { const r = await g.dispatch({ t: 'buyDecor', type: types[i % types.length], x: -4 + (i % 10) * 0.8, z: [0.3, 1.5, 2.7][(i / 10) | 0], ry: 0 }, { dev: true }); if (r.ok) n++; }
  await new Promise((r) => setTimeout(r, 1500));
  const F = window.__fishes, N = F.list.length, t0 = performance.now(); for (let i = 0; i < 600; i++) F.observe(0.033, i * 0.033); const per = (performance.now() - t0) / 600;
  const t1 = performance.now(); for (let i = 0; i < 600; i++) F.update(0.033, i * 0.033); const per2 = (performance.now() - t1) / 600;
  return { fish: N, decor: g.state.decor.length, observeMsPerFrame: +per.toFixed(3), updateMsPerFrame: +per2.toFixed(3) };
});
console.log(JSON.stringify(r)); await b.close(); console.log('FINISHED');
