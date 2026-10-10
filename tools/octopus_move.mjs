// An octopus carries a coconut shell to a quiet corner and moves a rock beside its den. node tools/octopus_move.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('console', (m) => { if (m.text().startsWith('abort')) console.log(m.text()); }); p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const out = await p.evaluate(async () => {
  window.__dbg = 1; const g = window.__game, F = window.__fishes, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 200; s.fish.length = 0;
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: 3, born: Date.now() - 9 * 864e5, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, appetite: 0, owner: null, bond: {} });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: -2, z: 1.2, ry: 0 }); if (window.__rock) s.decor.push({ id: 'r1', type: 'rock', x: 2.6, z: 1.4, ry: 0 });
  g.emit('state'); await new Promise((r) => setTimeout(r, 1500));
  F.canMove = () => true; const o = F.list.find((f) => f.species.id === 'octopus'), res = { log: [] }, wasMove = F.onMove; F.onMove = (m) => { res.log.push(m); wasMove(m); };
  const run = (n) => { for (let i = 0; i < n; i++) { F.update(0.1, i * 0.1); decor_tick(0.1, i * 0.1); F.list.forEach((f) => f.update(0.1, Math.random, F.list)); } };
  const decor_tick = () => {}; o.mind.tidy = 1; o.sulk = 0; o.shy = false; o.bondMe = 2;
  const oc = o.onTask; o.onTask = (f, ev) => { const r = oc(f, ev); res.log.push(`${ev}->${r} stage=${f.task?.stage} s=${f.st.s}/${f.st.mode} at ${f.pos.x.toFixed(1)},${f.pos.z.toFixed(1)} tgt ${f.target.x.toFixed(1)},${f.target.z.toFixed(1)}`); return r; };
  let plan = null; for (let i = 0; i < 20 && !plan; i++) plan = F.planMove(o, o.mind); res.plan = plan; if (plan) { const at = F.decor.atOf(plan.id), L = Math.hypot(plan.gx - at.x, plan.gz - at.z) || 1; o.task = { ...plan, stage: 'go', ux: (plan.gx - at.x) / L, uz: (plan.gz - at.z) / L, t0: performance.now() }; o.task.ax = at.x - o.task.ux * 0.75; o.task.az = at.z - o.task.uz * 0.75; o.startTask(o.task); }
  o.pos.set(o.task?.ax ?? 0, 0.55, o.task?.az ?? 1);
  let steps = 0; window.__o = o; window.__run = run; window.__steps = 0; let last = ''; while (o.task && !(o.task.stage === 'haul' && steps > 700) && steps < 3000) { run(1); steps++; const k = `${o.st.s}/${o.st.mode}/${o.task?.stage}`; if (k !== last) { last = k; res.log.push(`${steps}: ${k} at ${o.pos.x.toFixed(1)},${o.pos.z.toFixed(1)}`); } } res.steps = steps; res.stage = o.task?.stage ?? 'none';
  await new Promise((r) => setTimeout(r, 800)); res.decor = s.decor.map((d) => `${d.id}@${d.x},${d.z}`); res.octo = { moved: s.fish[0].moved, home: s.fish[0].home, movedAt: !!s.fish[0].movedAt };
  return res;
});
const OUT = process.env.OUT || '/tmp/oct'; (await import('node:fs')).mkdirSync(OUT, { recursive: true });
await p.evaluate(() => { window.__cam = [-2.4, 1.8, 11, -2.4, 0.8, 1]; }); await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/1_hauling.png` });
const fin = await p.evaluate(() => { const o = window.__o; let n = 0; while (o.task && n < 4000) { window.__run(1); n++; } o.pos.set(o.den.x, 0.55, o.den.z + 0.0); o.st.s = 'rest'; o.st.mode = null; o.st.t = 1e5; o.restFor = 0; for (let i = 0; i < 40; i++) window.__run(1); o.pos.set(o.den.x, 0.55, o.den.z + 0.0); o.st.t = 1e5; return { n, at: [o.pos.x, o.pos.z], heading: o.heading, s: o.st.s, den: o.den }; });
await p.evaluate(() => { window.__cam = [-2.6, 2.2, 15, -3.2, 0.8, 0.4]; const o = window.__o; const z = o.den.z, x = o.den.x; o.update = function () { this.pos.set(x, 0.55, z + (window.__oz ?? 0)); this.heading = Math.PI / 2; this.group.position.copy(this.pos); }; }); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/2_home.png` });
console.log(JSON.stringify(fin)); console.log(JSON.stringify(out, null, 1)); console.log(errors.length ? 'page errors: ' + errors.slice(0, 5).join('; ') : 'No page errors'); await b.close();
