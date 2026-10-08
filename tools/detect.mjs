// Do the behaviour detectors fire from real simulated swimming (not from direct calls)? Five simulated minutes with a varied tank.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
await p.goto('http://localhost:8123/?lite=1&dev=1'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game; g.state.level = 8; g.state.flags.tut = 5; for (let i = 0; i < 40; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  let sd = 1; for (const sp of ['goldfish', 'goldfish', 'goldfish', 'goldfish', 'goldfish', 'goldfish', 'cory', 'blue', 'guppy', 'betta', 'angelfish', 'platy']) await g.dispatch({ t: 'buyFish', species: sp, name: 'T', seed: sd++ * 3, rush: true }, { dev: true });
  for (const [t, x, z] of [['fern', -2.4, 1.5], ['rock', 0.4, 2.7], ['wood', 2.4, 0.3], ['bubbler', -3.4, 0.3], ['chest', 1.2, 1.5], ['grass', -1.2, 0.3]]) await g.dispatch({ t: 'buyDecor', type: t, x, z, ry: 0 }, { dev: true });
  await new Promise((r) => setTimeout(r, 1500));
  const F = window.__fishes, keys = {}; F.onObserve = (o) => { keys[o.key] = (keys[o.key] ?? 0) + 1; }; F.night = false;
  const dt = 1 / 30; for (let i = 0; i < 9000; i++) { F.update(dt, i * dt); F.observe(dt, i * dt); F.list.forEach((f) => f.update(dt, F.rng, F.list)); }
  F.phase = () => 'evening'; for (let i = 9000; i < 11000; i++) { F.update(dt, i * dt); F.observe(dt, i * dt); F.list.forEach((f) => f.update(dt, F.rng, F.list)); }
  F.phase = () => 'morning'; for (let i = 11000; i < 13000; i++) { F.update(dt, i * dt); F.observe(dt, i * dt); F.list.forEach((f) => f.update(dt, F.rng, F.list)); }
  F.night = true; for (let i = 13000; i < 16000; i++) { F.update(dt, i * dt); F.observe(dt, i * dt); F.list.forEach((f) => f.update(dt, F.rng, F.list)); }
  return { simulatedSeconds: 530, fish: F.list.length, reported: keys, traits: F.list.map((f) => f.profile.traits.join('+')) };
});
console.log(JSON.stringify(r)); await b.close(); console.log('FINISHED');
