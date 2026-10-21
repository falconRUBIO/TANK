// The octopus and its clay pot: an empty pot is irresistible, so known or not it goes in through the mouth (never the wall), curls up just
// inside it facing out with its eyes at the opening, and stays a good while. Steps the simulation by hand. Needs the solo game on 8123. OUT=dir node tools/octopus_pot.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/pot'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const setup = (k) => p.evaluate((k) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'p1', mem: { fav: null, fam: k ? { p1: { k, n: 4, x: 0.4, z: 1.2, at: 0 } } : {}, likes: [], fish: {} } });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'pot', x: 0.4, z: 1.2, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,header,nav,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, k);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, (window.__t = (window.__t ?? 0) + dt)); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
const go = () => p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(3.0, 0.6, 2.2); f.vel.set(0, 0, 0); f.camoWill = false; f.inspect = null; f.jarAt = null; f.hunt = null; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.goDen(f.st, Math.random, 30); });
const st = () => p.evaluate(() => { const f = window.__fishes.list[0], d = window.__game.state.decor[0], [gx, gz] = f.denGoal(Math.random); return { g: +Math.hypot(f.pos.x - gx, f.pos.z - gz).toFixed(2), s: f.st?.s, mode: f.st?.mode, home: !!f.den?.home, kind: f.den?.kind, inPot: f.potIn(), dz: +(f.pos.z - d.z).toFixed(2), dx: +(f.pos.x - d.x).toFixed(2), sy: +f.group.scale.y.toFixed(2), sx: +f.group.scale.x.toFixed(2), homing: !!f.homing }; });
const cam = () => p.evaluate(() => { window.__cam = [2.6, 2.6, 9.5, 0.4, 0.5, 1.2]; });
const run = async (secs) => { const tr = []; for (let i = 0; i < secs * 4; i++) { await step(5); tr.push(await st()); } return tr; };
for (const [k, name] of (process.env.ONLY === 'known' ? [[0.6, 'known']] : [[0, 'new'], [0.6, 'known']])) {
  await setup(k); await p.waitForTimeout(2500); await go(); const tr = await run(40), end = tr.at(-1); if (name === 'known') { await setup(0.6); await p.waitForTimeout(2000); await go(); await run(14); } await cam(); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/pot_${name}.png` });
  const homeAt = tr.findIndex((x) => x.homing); if (process.env.TRACE) console.log(name, tr.filter((_, i) => i % 8 === 0).map((x) => `${x.s}/${x.mode ?? ''} ${x.dx},${x.dz} y${x.sy}${x.homing ? ' H' : ''}`).join(' | '));
  const inside = tr.filter((x) => x.homing && x.g < 0.4 && x.dz > 0 && x.dz < 0.8);
  ck(`a pot it ${name === 'new' ? 'does not know' : 'knows well'}: it goes in through the mouth and stays a good while`, homeAt >= 0 && inside.length >= 40, `${(inside.length / 4).toFixed(0)} s inside`);
  ck(`curled up to fit (${name})`, inside.length && Math.max(...inside.slice(8).map((x) => x.sy)) < 0.8, `height x${inside.at(-1)?.sy}, width x${inside.at(-1)?.sx}`);
}
await setup(0.3); const r = await p.evaluate(async () => { const g = window.__game; return g.dispatch({ t: 'octoTouch', fish: 'x1', decor: 'p1', kind: 'revisit' }); });
const j = await p.evaluate(() => window.__game.journal.slice(-3).map((e) => e.text));
ck('the night it learns, the journal says so', j.some((t) => /worked out how to squeeze inside the clay pot/.test(t)), j.join(' | '));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Pot checks passed'); process.exit(fails ? 1 : 0);
