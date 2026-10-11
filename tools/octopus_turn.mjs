// An octopus with a coconut home shoves it along and turns it: the plan is made, the shell is dragged tipped on its side, set down turned, and the move reaches the game state.
// Steps the simulation by hand. Needs the solo game on 8123. node tools/octopus_turn.mjs OUTDIR
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const out = process.argv[2] || '/tmp/turn'; (await import('node:fs')).mkdirSync(out, { recursive: true }); const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1', movedAt: 0 });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 0.4, z: 1.5, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const r0 = await p.evaluate(() => { const F = window.__fishes, f = F.list[0]; f.pos.set(2.2, 0.6, 1.4); f.vel.set(0, 0, 0); f.inspect = null; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 };
  let plan = null; for (let i = 0; i < 40 && !(plan && plan.kind === 'turn'); i++) plan = F.planMove(f, f.mind ?? { tidy: 0.5 }); if (plan?.kind !== 'turn') return { plan };
  F.beginTask(f, plan); window.__cam = [plan.gx + 0.8, 2.0, plan.gz + 8.5, plan.gx, 0.4, plan.gz]; return { plan, task: f.task?.kind, homeId: f.homeId }; });
console.log('plan', JSON.stringify(r0));
let tipped = 0, trail = [];
for (let i = 0; i < 400; i++) { const st = await p.evaluate(() => { const F = window.__fishes, f = F.list[0]; for (let k = 0; k < 4; k++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); } const it = [...window.__decor.items.values()][0]; return { fx: +f.pos.x.toFixed(2), fz: +f.pos.z.toFixed(2), ax: f.task ? +f.task.ax.toFixed(2) : null, az: f.task ? +f.task.az.toFixed(2) : null, off: f.task ? +f.task.off.toFixed(2) : null, tgt: [+f.target.x.toFixed(2), +f.target.z.toFixed(2)], n: f.st?.prog?.n, stage: f.task?.stage ?? null, mode: f.st?.mode, s: f.st?.s, x: +it.group.position.x.toFixed(2), z: +it.group.position.z.toFixed(2), ry: +it.group.rotation.y.toFixed(2), rz: +it.group.rotation.z.toFixed(2), at: it.at, state: window.__game.state.decor[0] }; }); trail.push(st); if (st.rz > 0.2) tipped++; if (st.stage === 'haul' && tipped === 1) { await p.waitForTimeout(1500); await p.screenshot({ path: out + '/turn_haul.png' }); } if (st.stage === 'placed' || (st.stage == null && st.mode == null && i > 20)) break; }
for (const st of trail.slice(0, 60).filter((_, i) => i % 3 === 0)) console.log('  ', JSON.stringify({ ...st, state: undefined, at: undefined }));
const last = trail.at(-1); await p.waitForTimeout(1800); await p.screenshot({ path: out + '/turn_done.png' });
console.log('end', JSON.stringify(last));
const ok = r0.plan?.kind === 'turn' && tipped > 0 && Math.abs(last.at.ry) > 0.1 && Math.abs(last.state.ry) > 0.1 && Math.hypot(last.at.x - 0.4, last.at.z - 1.5) > 0.2;
console.log(ok ? 'Turn OK: planned, dragged on its side, set down turned, and recorded in the game' : 'TURN FAILED'); console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();
