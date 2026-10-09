// CPU cost of the octopus rig per pose and per frame, and the whole tank's fish update with a full tank. node tools/perf_octo.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const mk = (id, sp) => ({ id, name: id, species: sp, seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You', bond: { me: 4 } }); s.fish.push(mk('o1', 'octopus'), mk('s1', 'seahorse'), mk('s2', 'seahorse'), ...['a', 'b', 'c', 'd'].map((n, i) => mk('n' + i, 'neon')), mk('c1', 'goldfish'), mk('c2', 'angelfish')); g.emit('state'); });
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => { const F = window.__fishes, o = F.list.find((f) => f.species.move === 'jet'); const t = (fn, n) => { const a = performance.now(); for (let i = 0; i < n; i++) fn(i); return +((performance.now() - a) / n).toFixed(3); };
  const rest = t(() => { o.setPose(Math.random() * 6); }, 200); o.st = { s: 'crawl', t: 99, n: 0, pulse: 0 }; o.crawlK = 1; o.restK = 0.25; const walk = t(() => o.setPose(Math.random() * 6), 200);
  const all = t((i) => { F.update(0.033, i * 0.033); F.list.forEach((f) => f.update(0.033, Math.random, F.list)); }, 120);
  return JSON.stringify({ voxels: o.vox.length, mobile: o.mobile.length, setPoseRestMs: rest, setPoseWalkMs: walk, wholeTankUpdateMsPerFrame: all, fish: F.list.length }); }));
await b.close();
