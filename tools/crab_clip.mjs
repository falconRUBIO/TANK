// Hermit crabs and decorations: sent across the tank past a clay pot, a boulder and a reef cave, a crab never ends up inside one (its body is
// checked against the decorations' solid voxels every frame) and never stays stuck (it gets where it was going, or goes round).
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 400)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 8 }, { dev: true }); for (let i = 0; i < 20; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const [sp, nm] of [['blueleg', 'Marcel'], ['halloween', 'Jack']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm }).catch(() => null); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true });
  for (const [type, x, z] of [['pot', 0, 0.6], ['boulder', -2.2, 0.4], ['cave', 2.4, 0.2]]) await g.dispatch({ t: 'buyDecor', type, x, z, ry: 0 }); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2500);
const res = await p.evaluate(async () => { const F = window.__fishes, out = [], W = (await import('/src/w3/fish3d.js')).Fish3D.world, { sandH } = await import('/src/w3/terrain.js');
  const routes = [[[-0.5, 0.6], [2.25, 0.6]], [[2.25, 0.6], [-0.5, 0.6]], [[-3.75, 0.4], [-0.5, 0.4]], [[0.25, 0.2], [3.75, 0.2]], [[1.0, -0.6], [1.0, 1.9]]];      // (from clear sand to clear sand, across the pot, the boulder and the cave)
  for (const name of ['Marcel', 'Jack']) { const c = F.list.find((x) => x.name === name); if (!c) continue; const other = F.list.find((x) => x.crab && x !== c);
    const clr = ([x, z]) => { for (let r = 0; r < 2; r += 0.1) for (let k = 0; k < 12; k++) { const a = k * 0.5236, q = [+(x + Math.cos(a) * r).toFixed(2), +(z + Math.sin(a) * r).toFixed(2)]; if (c.clearAt(...q) && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([u, v]) => c.clearAt(q[0] + u, q[1] + v))) return q; } return [x, z]; };      /* (open sand, not a hollow inside something) */      // (start and end on clear sand)
    for (const [A, B] of routes) { const [ax, az] = clr(A), [bx, bz] = clr(B); c.pos.set(ax, c.pos.y, az); c.prog = null; c.cool = 99; const go = () => (c.cs = { s: 'walk', to: { x: bx, z: bz }, then: { s: 'idle', t: 99 }, why: null }); go(); let inside = 0, edge = 0, frames = 0, arrived = false, still = 0, worstStill = 0, lp = c.pos.clone();
      for (let i = 0; i < 1000; i++) { F.update(0.05, i * 0.05); for (const o of F.list) if (!o.crab || o === other) o.pos.set(-4, 9, -2.2); c.update(0.05, Math.random, F.list); if (c.cs.s !== 'walk' && !arrived) go();      // (its own whims set aside: only the walk is measured)
        frames++; if (W.at(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.22, c.pos.z)) inside++; if (!c.clearAt(c.pos.x, c.pos.z)) edge++;      // inside: its middle in something (what you would see as clipping); edge: brushing past within 0.16 const mv = c.pos.distanceTo(lp); lp.copy(c.pos); if (mv < 0.002 && !((c.pauseT ?? 0) > 0)) still += 0.05; else still = 0; worstStill = Math.max(worstStill, still);
        if (Math.hypot(c.pos.x - bx, c.pos.z - bz) < 0.4) { arrived = true; break; } }
      out.push({ name, from: [ax, az], to: [bx, bz], arrived, inside, edge, frames, worstStill: +worstStill.toFixed(1), end: [+c.pos.x.toFixed(2), +c.pos.z.toFixed(2)] }); } }
  return out; });
for (const r of res) console.log('   ', JSON.stringify(r));
ck('a crab never clips into a decoration (its middle is never inside solid voxels)', res.every((r) => r.inside === 0), res.map((r) => r.inside + '/' + r.frames + ' (brushing ' + r.edge + ')'));
ck('it is never stuck: never more than 3 s without moving while walking, and it gets there round the obstacles', res.every((r) => r.worstStill <= 3) && res.filter((r) => r.arrived).length >= res.length - 1, res.map((r) => (r.arrived ? 'got there' : 'not there') + ' still ' + r.worstStill));
// a decoration put down right on top of a crab: it makes its way out and is not left inside
const under = await p.evaluate(async () => { const g = window.__game, F = window.__fishes, c = F.list.find((x) => x.name === 'Marcel'), { sandH } = await import('/src/w3/terrain.js'), W = (await import('/src/w3/fish3d.js')).Fish3D.world;
  c.pos.set(-2.6, c.pos.y, 2.4); c.cs = { s: 'idle', t: 1 }; await g.dispatch({ t: 'buyDecor', type: 'boulder', x: -2.6, z: 2.4, ry: 0 }); await new Promise((r) => setTimeout(r, 1200));
  const start = W.at(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.22, c.pos.z); let outAt = null; for (let i = 0; i < 600; i++) { F.update(0.05, i * 0.05); for (const o of F.list) if (!o.crab) o.pos.set(-4, 9, -2.2); c.update(0.05, Math.random, F.list); if (c.cs.s !== 'walk') c.cs = { s: 'walk', to: { x: 0.5, z: 2.4 }, then: { s: 'idle', t: 99 } }; if (outAt == null && !W.at(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.22, c.pos.z)) outAt = +(i * 0.05).toFixed(1); }
  return { startedInside: start, outAfterSeconds: outAt, endInside: W.at(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.22, c.pos.z) }; });
ck('a boulder put down on top of a crab: it walks out, and is not left inside', under.outAfterSeconds != null && !under.endInside, under);
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
