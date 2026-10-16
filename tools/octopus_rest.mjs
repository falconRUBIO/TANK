// The octopus rests the way a real one does: worn out (or frightened) it goes home to its coconut shell and stays under it a good while, instead of
// popping straight back out to the next thing. Needs the solo game on 8123. node tools/octopus_rest.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/den'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1' });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 0.4, z: 1.5, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.0, z: 1.5, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,header,nav,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { window.__simClock(true); const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, (window.__t = (window.__t ?? 0) + dt)); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
const state = () => p.evaluate(() => { const f = window.__fishes.list[0], it = [...window.__decor.items.values()].find((x) => x.type === 'coconut'), [gx, gz] = f.denGoal(Math.random); return { x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2), vx: +f.vel.x.toFixed(3), vz: +f.vel.z.toFixed(3), s: f.st?.s, mode: f.st?.mode, dist: +Math.hypot(f.pos.x - gx, f.pos.z - gz).toFixed(2), shellY: +it.group.position.y.toFixed(3), tilt: +it.group.rotation.x.toFixed(3), flip: +((it?.group.children.find((c) => c.isMesh)?.rotation.x) ?? 0).toFixed(2), den: f.den?.kind, home: !!f.den?.home, tuck: +(f.tuckK ?? 0).toFixed(2) }; });
for (const [why, set] of [['tired', 'f.fatigue = 0.9;'], ['frightened', 'f.fearHere();']]) {
  await p.evaluate((set) => { const f = window.__fishes.list[0]; f.pos.set(3.0, 0.6, 1.0); f.vel.set(0, 0, 0); f.inspect = null; f.st = { s: 'rest', t: 0, n: 0, pulse: 0, mode: null }; f.fatigue = 0; f.scared = 0; new Function('f', set)(f); }, set);
  const { under, n, first } = await p.evaluate(async () => { window.__simClock(true); const F = window.__fishes, f = F.list[0]; let under = 0, n = 0, first = null; for (let i = 0; i < 180 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    if (i % 5 === 0) { const [gx, gz] = f.denGoal(() => 0.5), r = Math.hypot(f.pos.x - gx, f.pos.z - gz) < 0.6 && f.st.s === 'rest'; n++; if (r) { under++; first ??= i * 0.05; } } if (i % 600 === 0) await new Promise((q) => setTimeout(q, 0)); } return { under, n, first }; });
  const txt = await p.evaluate(() => window.__fishes.list[0].actText);
  ck(`${why}, it goes home under its shell soon and spends most of the next three minutes there`, first != null && first < 60 && under / n > 0.5, `home after ${first}s, under it ${Math.round(100 * under / n)}% of the time`);
}
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Rest checks passed'); process.exit(fails ? 1 : 0);
