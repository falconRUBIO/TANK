// An octopus carries a coconut shell (or a pot) to a quiet corner and squeezes in, and builds a rock shelter when it has neither. node tools/octopus_move.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/oct'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const scen = async (name, decor) => {
  const watch = (async () => { for (let i = 0; i < 600; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__snapHaul).catch(() => false)) { await p.screenshot({ path: `${OUT}/${name}_haul.png` }); await p.evaluate(() => { window.__snapHaul = false; }); return; } } })();
  const out = await p.evaluate(async ({ decor }) => {
    const g = window.__game, F = window.__fishes, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 200; s.fish.length = 0; s.decor.length = 0; s.decor.push(...decor);
    s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed: 3, born: Date.now() - 9 * 864e5, stage: 'adult', traits: [], happy: 0.8, health: 1, appetite: 0, owner: null, bond: {} });
    g.emit('state'); await new Promise((r) => setTimeout(r, 1500));
    F.canMove = () => true; const o = F.list.find((f) => f.species.id === 'octopus'), res = { log: [] }; o.mind.tidy = 1; o.sulk = 0; o.shy = false; o.bondMe = 2; o.fav = { x: -3, z: 0.9, n: 20 }; o.failed = [];
    const run = (n) => { for (let i = 0; i < n; i++) { F.update(0.1, i * 0.1); window.__decor?.tick?.(i * 0.1, 0.1); F.list.forEach((f) => f.update(0.1, Math.random, F.list)); } };
    for (let round = 0; round < 4; round++) {
      s.fish[0].movedAt = 0; o.movedAt = 0; o.task = null; let plan = null; for (let i = 0; i < 30 && !plan; i++) plan = F.planMove(o, o.mind); if (!plan) { res.log.push('no plan'); break; }
      F.beginTask(o, plan); const oc = o.onTask; o.onTask = (f, ev) => { const r = oc(f, ev); res.log.push(`${ev}->${r} at ${f.pos.x.toFixed(2)},${f.pos.z.toFixed(2)} off ${f.task?.off}`); return r; };
      let steps = 0; while (o.task && steps < 4000) { run(1); steps++; if (o.task?.stage === 'haul' && !window.__hauled && plan.kind === 'home') { for (let k = 0; k < 40; k++) run(1); window.__hauled = [o.pos.x, o.pos.z]; window.__cam = [o.pos.x + 0.5, 2.6, o.pos.z + 12, o.pos.x, 1.0, o.pos.z]; await new Promise((rs) => setTimeout(rs, 2500)); window.__snapHaul = true; await new Promise((rs) => { const w = () => (window.__snapHaul ? setTimeout(w, 200) : rs()); w(); }); } }
      await new Promise((r) => setTimeout(r, 600)); res.log.push(`${plan.kind} ${plan.id} -> ${plan.gx.toFixed(1)},${plan.gz.toFixed(1)} in ${steps} steps; den ${o.den?.kind}${o.den?.home ? ' (home)' : ''} n=${o.den?.n ?? ''}`);
      if (plan.kind === 'home' || o.den?.kind === 'rocks') break;
    }
    o.inspect = null; o.task = null; o.st.s = 'rest'; o.st.mode = null; o.st.t = 1e5; const [x, z] = o.denGoal(Math.random); o.pos.set(x, 0.55, z); o.heading = Math.PI / 2; run(120); o.st.t = 1e5; res.sat = [o.pos.x - x, o.pos.z - z].map((v) => +v.toFixed(2));
    window.__cam = [o.den.x + 0.6, 2.4, 14, o.den.x, 0.8, o.den.z]; res.decor = s.decor.map((d) => `${d.id}@${d.x},${d.z}`); res.fishHome = s.fish[0].home; res.den = o.den; res.thought = o.thought; res.tuck = o.tuckK; return res;
  }, { decor });
  await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(out, null, 1));
};
const only = process.env.SCEN; const S = async (n, d) => { if (!only || only === n) await scen(n, d); };
await S('coconut', [{ id: 'c1', type: 'coconut', x: -2, z: 1.2, ry: 0 }, { id: 'r1', type: 'rock', x: 2.6, z: 1.4, ry: 0 }]);
await S('pot', [{ id: 'p1', type: 'pot', x: 1.5, z: 1.2, ry: 0 }]);
await S('rocks', [{ id: 'r1', type: 'rock', x: 2.6, z: 1.4, ry: 0 }, { id: 'r2', type: 'rock', x: 0.5, z: 0.6, ry: 0 }, { id: 'r3', type: 'skull', x: 2, z: 2.2, ry: 0 }]);
console.log(errors.length ? 'page errors: ' + errors.slice(0, 5).join('; ') : 'No page errors'); await b.close();
