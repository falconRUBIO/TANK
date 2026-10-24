// The twist cube and the hitching hoop (v335): an octopus comes over, gathers the cube up in its arms (never inside its body), turns and twists it,
// sets it down, rests, and picks it up again; a seahorse takes the hoop as a real holdfast and rides along when the hoop is dragged. Solo server :8123.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:8123/?dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 60000 }); await p.click('#mok'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const g = window.__game, F = window.__fishes, T = window.__toys, D = 864e5; g.state.level = 5; g.state.flags.tut = 5;
  const oc = g.state.fish.find((f) => f.species === 'octopus'); oc.born = Date.now() - 20 * D; oc.stage = 'adult';
  for (let i = 0; i < 4; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  await g.dispatch({ t: 'buyFish', species: 'seahorse', name: 'Sol', seed: 3, rush: true, sex: 'm', kind: 'erectus' }, { dev: true }); await g.dispatch({ t: 'buyDecor', type: 'grass', x: -2.5, z: 0.5, ry: 0 }, { dev: true });
  await new Promise((r) => setTimeout(r, 1500));
  const o = F.byId.get(oc.id), sea = F.byId.get(g.state.fish.find((f) => f.species === 'seahorse').id); if (!o || !sea) return { err: 'no animals', n: F.list.length };
  // ── the cube, dropped right by the octopus; the sim is stepped by hand so the phases run in seconds, not minutes
  o.pos.set(0, 4, 0.9); o.st.s = 'rest'; o.st.mode = null; o.inspect = null; o.hunt = null; o.task = null; T.dropCube(0.6);
  const probe = {}; const phases = [], seen = new Set(); let minD = 9, armNear = 9, held = 0, clipped = 0; const C0 = T.cube;
  const step = (i, t0) => { const t = t0 + i * 0.05; F.update(0.05, t); T.update(0.05, t); for (const f of F.list) f.update(0.05, Math.random, F.list); };      /* (the frame body's order: the manager, the toys, then every animal) */
  for (let i = 0; i < 2400 && T.cube; i++) { step(i, 0); const C = T.cube; if (!C) break; if (phases.at(-1) !== C.phase) phases.push(C.phase); seen.add(C.phase);
    if (C.phase === 'hold' && C.held) { held++; (probe.modes ||= {})[`${o.st.mode}|${!!o.toyCube}|${!!o.rs?.grab}|${o.rs?.grab?.kind}`] = (probe.modes?.[`${o.st.mode}|${!!o.toyCube}|${!!o.rs?.grab}|${o.rs?.grab?.kind}`] ?? 0) + 1; const d = Math.hypot(C.g.position.x - o.pos.x, C.g.position.y - (o.pos.y + (o.lift ?? 0)), C.g.position.z - o.pos.z); minD = Math.min(minD, d); if (d < 0.5) clipped++;
      const G = o.rs?.grab; if (G && o.rig) { const tip = o.rig.pose(o.rig.arms[G.arm], 1, o.rs, o.rp), sc = o.scale || 0.06, ch = Math.cos(o.heading), sh = Math.sin(o.heading), tx = o.pos.x + tip[0] * sc * ch + tip[2] * sc * sh, ty = o.pos.y + (o.lift ?? 0) + tip[1] * sc, tz = o.pos.z - tip[0] * sc * sh + tip[2] * sc * ch; armNear = Math.min(armNear, Math.hypot(tx - C.g.position.x, ty - C.g.position.y, tz - C.g.position.z)); } } }
  const cube = { probe, phases: phases.slice(0, 12), cycles: C0?.cycles, rig: !!o.rig, held, minD: +minD.toFixed(2), clipped, armNear: +armNear.toFixed(2), mode: o.st.mode, thought: o.thought };
  // ── the hoop, hung by the seahorse: it should take it as a holdfast and hold on; dragging the hoop moves it with the ring
  sea.pos.set(1.2, 5.2, 0.6); T.hangHoop(1.4); let took = null, on = null, rode = null;
  const hp = []; for (let i = 0; i < 1200; i++) { step(i, 200); const H = sea.holdfast; if (i % 200 === 0) hp.push({ t: i * 0.05, hf: H?.id ?? null, on: H?.on ?? null, want: sea.hoopWant ?? null, rel: +(sea.releaseT ?? 0).toFixed(2), tail: !!sea.sp?.tail, d: +sea.pos.distanceTo(T.hoop?.at ?? sea.pos).toFixed(2), sleepy: !!sea.sleepy, weak: !!sea.weak, nursery: !!sea.nursery, greet: !!sea.greet, seeking: !!sea.seeking, hoop: !!T.hoop }); if (H?.id === 'hoop' && took == null) took = i * 0.05; if (H?.id === 'hoop' && H.on && on == null) { on = i * 0.05; T.moveHoop(-1.6, 5.2); } if (on != null && T.hoop && !T.hoop.goal && rode == null) rode = { seaX: +sea.pos.x.toFixed(2), hoopX: +T.hoop.g.position.x.toFixed(2), still: sea.holdfast?.id === 'hoop' && sea.holdfast.on }; }
  return { cube, hoop: { hp, took, on, rode, thought: sea.thought, who: T.hoop ? [...T.hoop.who] : null } };
});
console.log(JSON.stringify(r));
ok(!r.err, 'the animals are in the 3D tank');
const C = r.cube ?? {}; ok(C.phases?.[0] === 'free' && C.phases.includes('grab') && C.phases.includes('hold'), 'the octopus comes over and gathers the cube up: ' + (C.phases ?? []).join(' → '));
ok(C.phases?.includes('put') && C.phases.includes('rest'), 'it sets the cube down and rests'); ok((C.cycles ?? 0) >= 2, `and picks it up again (${C.cycles} times)`);
ok(C.held > 60 && C.minD >= 0.5 && C.clipped === 0, `held in front of the body, never inside it (nearest ${C.minD}, ${C.clipped} frames inside over ${C.held})`); ok(C.armNear < 0.6 || C.rig === false, `an arm tip works at the cube (nearest ${C.armNear}${C.rig === false ? ', no arm rig in this mode' : ''})`);
const H = r.hoop ?? {}; ok(H.took != null, `the seahorse takes the hoop as a holdfast (after ${H.took}s)`); ok(H.on != null, `and holds on to it (after ${H.on}s)`);
ok(H.rode && H.rode.still && Math.abs(H.rode.seaX - H.rode.hoopX) < 0.9, 'dragged across the tank, the seahorse rides along on the hoop: ' + JSON.stringify(H.rode));
ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
await b.close(); console.log(fails ? `${fails} failed` : 'toys_check2 passed');
