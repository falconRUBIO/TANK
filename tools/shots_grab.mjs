// The octopus takes hold of things: it goes to a plant, a rock and its shell in turn and wraps its arms round each, then smacks a fish that comes too close.
// Portraits of each. Needs the solo game on 8123. OUT=dir node tools/shots_grab.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/grab'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', movedAt: Date.now() });
  s.fish.push({ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2.2, z: 1.2, ry: 0 }, { id: 'r1', type: 'rock', x: 0.6, z: 1.0, ry: 0 }, { id: 'c1', type: 'coconut', x: 2.8, z: 0.9, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const step = (n) => p.evaluate((n) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } }, n);
for (const id of ['p1', 'r1', 'c1']) {
  const r = await p.evaluate((id) => { const F = window.__fishes, f = F.byId.get('x1'), q = (f.getSpots?.() ?? []).find((s) => s.id === id); f.pos.set(q.x - 1.2, 0.6, q.z + 1.4); f.vel.set(0, 0, 0); f.task = null; f.hunt = null; f.glassAt = null; f.st = { s: 'rest', t: 0, n: 0, pulse: 0, mode: null };
    f.inspect = { x: q.x, z: q.z, id: q.id, type: q.type, r: { grass: 0.16, rock: 0.42, coconut: 0.85 }[q.type] }; const o = F.byId.get('g1'); o.pos.set(-3.5, 8, 0.8); o.target.set(-3.5, 8, 0.8); o.retarget = 99;
    let worked = 0, grip = 0; for (let i = 0; i < 400; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); o.pos.set(-3.5, 8, 0.8); if (f.st.s === 'work') { worked += 0.05; grip = Math.max(grip, f.rs.jr ? f.workK : 0); if (worked > 3) break; } }
    return { worked, grip, thought: f.thought, s: f.st.s, at: [+f.pos.x.toFixed(2), +f.pos.z.toFixed(2)], q: [q.x, q.z] }; }, id);
  await p.evaluate(({ q, at }) => { const mx = (q[0] + at[0]) / 2, mz = (q[1] + at[1]) / 2; window.__cam = [mx + 4.2, 3.6, mz + 8.5, mx, 0.6, mz]; }, r); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/grab_${id}.png`, clip: { x: 0, y: 120, width: 390, height: 520 } });
  await step(20); const th = await p.evaluate(() => window.__fishes.byId.get('x1').thought);
  ck(`it takes hold of the ${id === 'p1' ? 'plant' : id === 'r1' ? 'rock' : 'shell'} with its arms wrapped round it, and its card says so`, r.worked > 1 && r.grip > 0.6 && /Wrapping its arms/.test(th ?? ''), JSON.stringify({ ...r, th }));
}
// a fish hanging about within reach gets smacked
{
  const r = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('x1'), o = F.byId.get('g1'); f.pos.set(0, 0.6, 2.0); f.vel.set(0, 0, 0); f.inspect = null; f.st = { s: 'rest', t: 40, n: 0, pulse: 0, mode: null }; f.bold = 0.9; f.throwCool = 0; f.movedAt = Date.now(); f.lead = true; f.sleepK = 0;
    let got = null; for (let i = 0; i < 400 && !got; i++) { f.pos.set(0, 0.6, 2.0); o.pos.set(1.0, 1.3, 2.0); o.vel.set(0, 0, 0); o.target.copy(o.pos); o.retarget = 9; o.idle = 9; f.inspect = null; f.prank = null; F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (/Smacked/.test(f.actText ?? '')) got = { i, text: f.actText }; else if (/Threw|Flung|Squirted/.test(f.actText ?? '')) { f.throwCool = 0; f.actText = null; f.nearFor = 2; } }
    if (!got) return null; let reachK = 0; for (let i = 0; i < 6; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); reachK = Math.max(reachK, ...f.minds.map((m) => m.k)); } return { ...got, reachK: +reachK.toFixed(2), flee: o.fleeT > 0 }; });
  await p.evaluate(() => { window.__cam = [0.5, 2.2, 7.5, 0.5, 1, 2]; }); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/smack.png`, clip: { x: 0, y: 120, width: 390, height: 520 } });
  ck('a fish that hangs about within reach gets smacked by one arm, whipped out fast, and bolts', !!r && r.reachK > 0.8 && r.flee, JSON.stringify(r));
}
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Grab checks passed'); await b.close(); process.exit(fails ? 1 : 0);
