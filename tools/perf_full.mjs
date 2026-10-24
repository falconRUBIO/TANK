// A full level-8 tank (28 places: two octopuses, four seahorses, three hermit crabs, a sea turtle, the rest fish) and 36 decorations:
// what the behaviour watcher and the animal update cost per frame, headless. Compare tools/perf.mjs (11 fish, 30 decorations).
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game; g.state.level = 8; g.state.flags.tut = 5; for (let i = 0; i < 80; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  const types = ['grass', 'fern', 'rock', 'boulder', 'wood', 'pillar', 'lantern', 'chest', 'kelp', 'sword', 'red', 'bubbler', 'coconut', 'pot', 'cave', 'ledge', 'seagrass', 'seafan', 'liverock', 'mangrove'];
  for (let i = 0; i < 36; i++) await g.dispatch({ t: 'buyDecor', type: types[i % types.length], x: -4 + (i % 12) * 0.72, z: [-0.6, 0.6, 1.8][(i / 12) | 0], ry: 0 }, { dev: true });
  const buys = ['octopus', 'seahorse', 'seahorse', 'seahorse', 'seahorse', 'blueleg', 'scarlet', 'halloween', 'turtle', 'neon', 'danio', 'guppy', 'platy', 'goldfish', 'goldfish', 'cory', 'blue', 'betta', 'angelfish', 'tang', 'puffer', 'neongoby', 'goldfish', 'platy'];
  let bought = 0, refused = []; for (const sp of buys) { const r = await g.dispatch({ t: 'buyFish', species: sp, name: 'T', seed: 3, rush: true, ...(sp === 'seahorse' ? { sex: bought % 2 ? 'm' : 'f', kind: 'erectus' } : {}) }, { dev: true }); if (r.ok) bought++; else refused.push(sp + ':' + r.reason); }
  await new Promise((r) => setTimeout(r, 2500));
  const F = window.__fishes, N = F.list.length, live = g.state.fish.filter((f) => !f.dead).length;
  const t0 = performance.now(); for (let i = 0; i < 600; i++) F.observe(0.033, i * 0.033); const per = (performance.now() - t0) / 600;
  const t1 = performance.now(); for (let i = 0; i < 600; i++) F.update(0.033, i * 0.033); const per2 = (performance.now() - t1) / 600;
  const snap = JSON.stringify({ t: 'snap', ts: 1, fish: F.list.map((f) => ({ i: f.fid, x: f.pos.x, y: f.pos.y, z: f.pos.z, h: 1.2345, p: 0.1234, r: 0.1234, ph: 12.34, ...(f.sk === 'octopus' ? { o: new Array(29).fill(0.1234) } : {}), ...(f.sk === 'seahorse' ? { sh: 'x'.repeat(40), c: 0.5, g: 1 } : {}) })), crabs: [[1, 2, 3, 4, 1], [1, 2, 3, 4, 1], [1, 2, 3, 4, 1]] }).length;
  return { animals3d: N, animalsState: live, bought, refused, decor: g.state.decor.length, observeMsPerFrame: +per.toFixed(3), updateMsPerFrame: +per2.toFixed(3), snapBytes: snap, crowd: Math.round(100 * (g.state.fish.filter((f) => !f.dead).length) / 28) };
});
console.log(JSON.stringify(r)); await b.close(); console.log('FINISHED');
