// An octopus that comes up to the glass to greet you swims away again smoothly: no frame where it jumps. Needs the solo game on 8123.
//   node tools/glass_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(); s.flags.tut = 5; s.createdAt = now - 20 * 864e5; s.fish.length = 0;
  s.fish.push({ id: 'o1', name: 'Biscuit', species: 'octopus', seed: 5, born: now - 12 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', ownerName: 'You', home: 'c1', bond: { me: 30 } });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 1.0, z: 1.2, ry: 0 }); s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.visitAt = now + 9e9; g.emit('state'); });
await p.waitForTimeout(2500);
const res = [];
for (let run = 0; run < 3; run++) {
  const r = await p.evaluate(() => { window.__simClock(true); const F = window.__fishes, f = F.byId.get('o1'); F.rng = () => 0.3; f.greeted = null; f.inspect = null; f.task = null; F.greet();
    let maxJ = 0, maxZ = 0, at = null; const step = () => { const was = f.pos.clone(); F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); return f.pos.distanceTo(was); };
    for (let i = 0; i < 1400; i++) { const d = step(); maxZ = Math.max(maxZ, f.pos.z); if (i > 2 && d > maxJ) { maxJ = d; at = [i, f.st?.s, !!f.glassAt, +f.pos.z.toFixed(2)]; } }
    return { maxJ: +maxJ.toFixed(3), maxZ: +maxZ.toFixed(2), at, greeted: f.greeted }; });
  res.push(r);
}
console.log(JSON.stringify(res));
ck('it comes right up to the glass to greet you', res.some((r) => r.greeted === 'glass' && r.maxZ > 8));
ck('and swims away again with no jump (never more than a swim stroke in one frame)', res.every((r) => r.maxJ < 0.6), JSON.stringify(res.map((r) => r.at)));
const other = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('o1'); const seen = []; for (const v of [0.5, 0.8, 0.95]) { F.rng = () => v; f.greeted = null; f.glassAt = null; f.task = null; F.greet(); seen.push(f.greeted); } return seen; });
ck('only some times: on other days it stays where it is, or watches from its den', !other.includes('glass'), JSON.stringify(other));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Glass checks passed'); process.exit(fails ? 1 : 0);
