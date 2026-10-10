// An octopus in a tank: runs its mind for a while in dirty water and in clean water and reports what it thinks. node tools/octopus.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const out = await p.evaluate(async () => {
  const g = window.__game, F = window.__fishes, s = g.state; s.flags.tut = 5; s.level = 5; s.shells = 200;
  for (const seed of [1, 2, 3, 4, 5, 6]) s.fish.push({ id: 'o' + seed, name: 'Oc' + seed, species: 'octopus', seed, born: Date.now() - 9 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0, owner: null, bond: {} });
  g.emit('state'); await new Promise((r) => setTimeout(r, 1500));
  const oct = F.list.filter((f) => f.species.id === 'octopus'), res = {};
  const run = (n) => { for (let i = 0; i < n; i++) { F.update(0.1, i * 0.1); F.list.forEach((f) => f.update(0.1, Math.random, F.list)); } };
  run(300); res.clean = oct.map((f) => `${f.mind.label}: ${f.thought || '-'}`);
  s.water = 0.3; g.emit('state'); F.aw = 0; run(50); res.dirty = oct.map((f) => `${f.mind.label}: sulk ${f.sulk.toFixed(2)} ${f.thought || '-'}`);
  s.water = 1; g.emit('state'); F.changedAt = performance.now() - 40 * 6e4; F.aw = 0; run(30); res.bored = oct.map((f) => `${f.mind.label}: bored ${f.bored.toFixed(2)} ${f.thought || '-'}`);
  F.people = ['x']; oct.forEach((f) => { f.bondMe = 2; f.bondIds = ['x']; }); F.aw = 0; run(30); res.watched = oct.map((f) => `${f.mind.label}: audience ${f.audience} ${f.thought || '-'}`);
  oct.forEach((f) => { f.startle(null); }); run(300); res.fears = oct.map((f) => f.fears?.length ?? 0);
  return res;
});
console.log(JSON.stringify(out, null, 1)); console.log(errors.length ? 'page errors: ' + errors.slice(0, 5).join('; ') : 'No page errors'); await b.close();
