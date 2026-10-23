// How the animals move, in numbers: the octopus's turning and acceleration (spikes read as twitchy on screen), and the seahorses'
// way to their greeting dance (do they swim straight to their places facing the way they go, or glide about chasing a moving circle?).
// PORT=8124 node tools/motion_check.mjs   (old code on 8124, this code on 8123)
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const port = process.env.PORT || 8123;
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); let fails = 0; p.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 160)));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(`http://localhost:${port}/?q=1&dev=1&tod=afternoon`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, born = Date.now() - 20 * 864e5; s.flags.tut = 5; s.level = 8; s.fish.length = 0;
  const mk = (id, name, species, x = {}) => ({ id, name, species, seed: id.length * 7 + 3, born, stage: 'adult', traits: ['Playful'], happy: 0.85, health: 1, hunger: 0.2, ...x });
  s.fish.push(mk('o1', 'Inky', 'octopus'), mk('h1', 'Pip', 'seahorse', { sex: 'm' }), mk('h2', 'Mo', 'seahorse', { sex: 'f' }));
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'seagrass', x: 0, z: 0.4, ry: 0 }, { id: 'p2', type: 'kelp', x: -3.2, z: -0.6, ry: 0 }, { id: 'p3', type: 'kelp', x: 3.2, z: -0.4, ry: 0 }, { id: 'r1', type: 'rock', x: 2.2, z: 1.6, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion').forEach((e) => e.classList.remove('on')); window.__simHold = true; });
await p.waitForTimeout(2500);
const wrap = 'const W = (a) => Math.atan2(Math.sin(a), Math.cos(a)); const pct = (arr, q) => { const s = [...arr].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(3) : 0; };';
// ── the octopus: 240 s of its own life, with a jet and a crawl asked of it every 30 s so both are measured ──
const oct = await p.evaluate(`(() => { ${wrap}
  const F = window.__fishes, o = F.list.find((f) => f.species.id === 'octopus'); if (!o) return null; o.lead = true; o.audience = 0;
  const ang = [], acc = [], spd = [], pulses = []; let ph = o.heading, pv = o.vel.clone(), pp = o.pos.clone(), dt = 0.05, n = 0, jets = 0, crawls = 0, states = {}, pulseAcc = 0;
  for (let i = 0; i < 4800; i++) { const t = (window.__t = (window.__t ?? 0) + dt);
    if (i % 600 === 300 && o.st && o.st.s === 'rest') { if (jets <= crawls) { o.st.s = 'jet'; o.st.n = 3; o.st.t = 9; o.st.pulse = 0; o.st.mode = null; o.target.set((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 2); jets++; } else { o.st.s = 'crawl'; o.st.t = 10; o.st.mode = null; o.st.gaitSet = false; o.target.set((Math.random() - 0.5) * 5, 0.6, (Math.random() - 0.5) * 2); crawls++; } }
    F.update(dt, t); for (const x of F.list) x.update(dt, Math.random, F.list);
    const w = Math.abs(W(o.heading - ph)) / dt, a = o.vel.clone().sub(pv).length() / dt, v = o.pos.clone().sub(pp).length() / dt; ph = o.heading; pv.copy(o.vel); pp.copy(o.pos);
    if (o.st?.s === 'jet' && a > 3) pulseAcc = Math.max(pulseAcc, a); if (o.st?.s !== 'jet' && pulseAcc) { pulses.push(pulseAcc); pulseAcc = 0; }
    ang.push(w); acc.push(a); spd.push(v); states[o.st?.s] = (states[o.st?.s] ?? 0) + 1; n++; }
  const spikes = ang.filter((w) => w > 2.5).length, hard = acc.filter((a) => a > 6).length;
  return { angP95: pct(ang, 0.95), angMax: pct(ang, 1), angSpikes: spikes, accP95: pct(acc, 0.95), accMax: pct(acc, 1), hardAcc: hard, speedMax: pct(spd, 1), pulses: pulses.length, pulsePeak: pct(pulses, 0.5), states, jetsAsked: jets, crawlsAsked: crawls }; })()`);
console.log('  octopus', JSON.stringify(oct));
ck('the octopus never turns faster than 3 rad/s (a half turn takes over a second)', oct && oct.angMax < 3.0, `max ${oct?.angMax}`);
ck('fewer than 1 in 200 frames turn faster than 2.5 rad/s', oct && oct.angSpikes / 4800 < 0.005, `${oct?.angSpikes} spikes`);
ck('a jet pulse builds up, not a kick: peak acceleration under 15 units/s² (at 20 steps a second)', oct && oct.pulses > 0 && oct.pulsePeak < 15, `${oct?.pulses} pulses, median peak ${oct?.pulsePeak}`);
// ── the seahorses: put far apart, hitched, then asked to greet. How long till both are in place, how far each swam for the distance it had to cover, and did it face the way it swam ──
const sea = await p.evaluate(`(() => { ${wrap}
  const F = window.__fishes, hs = F.list.filter((f) => f.sk === 'seahorse'); if (hs.length < 2) return null; const [a, b2] = hs; F.night = false; F.isLead = () => true;
  for (const [f, x] of [[a, -3.0], [b2, 3.0]]) { f.holdfast = null; f.link = null; f.greet = null; f.sleepy = false; f.weak = false; f.persona = { ...(f.persona ?? {}), soc: 1, bold: 0.5, cur: 0.5 }; f.pos.set(x, 2.2, -0.2); f.target.copy(f.pos); f.vel.set(0, 0, 0); f.heading = x < 0 ? 0 : Math.PI; f.idle = 99; f.retarget = 99; }
  F.shT = 0; F.seahorseTick(0.05, window.__t ?? 0); if (!a.greet || !b2.greet) return { noGreet: true, a: !!a.greet, b: !!b2.greet };
  const G = a.greet, start = { a: a.pos.clone(), b: b2.pos.clone() }, path = { a: 0, b: 0 }, mis = { a: [], b: [] }, dt = 0.05; let tIn = null, tDance = null, settledAt = null;
  for (let i = 0; i < 1400; i++) { const t = (window.__t = (window.__t ?? 0) + dt); const pa = a.pos.clone(), pb = b2.pos.clone(); F.update(dt, t); for (const x of F.list) x.update(dt, Math.random, F.list);
    if (tIn == null) { path.a += a.pos.distanceTo(pa); path.b += b2.pos.distanceTo(pb); }      // (the way there; not the circling after)
    for (const [k, f, pp] of [['a', a, pa], ['b', b2, pb]]) { const vx = f.pos.x - pp.x, vz = f.pos.z - pp.z, sp = Math.hypot(vx, vz) / dt; if (sp > 0.12 && !(f.greet && f.greet.on)) mis[k].push(Math.abs(W(Math.atan2(-vz, vx) - f.heading))); }
    const inPl = (f) => Math.hypot(f.pos.x - G.cx, (f.pos.z - G.cz) / 0.7) < G.r + 0.3 && Math.abs(f.pos.y - G.y) < 0.4;
    if (tIn == null && a.greet && b2.greet && inPl(a) && inPl(b2)) tIn = i * dt; if (tDance == null && (a.greet?.on || (a.greet && a.greet.t < a.greet.T0 - 0.5 && tIn != null))) tDance = i * dt;
    if (!a.greet && !b2.greet && settledAt == null) settledAt = i * dt; if (settledAt != null && i * dt > settledAt + 1) break; }
  const need = { a: Math.hypot(G.cx - start.a.x, G.y - start.a.y, G.cz - start.a.z), b: Math.hypot(G.cx - start.b.x, G.y - start.b.y, G.cz - start.b.z) }, mean = (arr) => arr.length ? +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(2) : null;
  return { circle: { x: +G.cx.toFixed(2), z: +G.cz.toFixed(2), y: +G.y.toFixed(2), r: G.r }, timeToPlace: tIn, danceStart: tDance, ended: settledAt, wander: { a: +(path.a / Math.max(0.1, need.a)).toFixed(2), b: +(path.b / Math.max(0.1, need.b)).toFixed(2) }, faceOff: { a: mean(mis.a), b: mean(mis.b) }, frames: { a: mis.a.length, b: mis.b.length } }; })()`);
console.log('  seahorses', JSON.stringify(sea));
ck('both seahorses reach their places within 20 s', sea && !sea.noGreet && sea.timeToPlace != null && sea.timeToPlace < 20, `${sea?.timeToPlace} s`);
ck('each swims close to a straight line to its place (path under 1.5× the distance)', sea && sea.wander && sea.wander.a < 1.5 && sea.wander.b < 1.5, JSON.stringify(sea?.wander));
ck('on the way each faces the way it is going (mean heading error under 0.6 rad)', sea && sea.faceOff && sea.faceOff.a != null && sea.faceOff.a < 0.6 && sea.faceOff.b < 0.6, JSON.stringify(sea?.faceOff));
ck('the circling only starts once both are there', sea && sea.danceStart != null && sea.timeToPlace != null && sea.danceStart >= sea.timeToPlace - 0.3, `dance ${sea?.danceStart} s, in place ${sea?.timeToPlace} s`);
// ── a seahorse's ordinary swims, from one stem to the next: it should face the way it goes, not slide sideways ──
const swim = await p.evaluate(`(() => { ${wrap}
  const F = window.__fishes, hs = F.list.filter((f) => f.sk === 'seahorse'); if (!hs.length) return null; const f = hs[0]; f.greet = null; f.link = null; f.sleepy = false; const mis = [], byS = {}, dt = 0.05; let moving = 0, rel = 0;
  for (let i = 0; i < 2400; i++) { const t = (window.__t = (window.__t ?? 0) + dt); if (f.holdfast?.on && f.holdfast.held > 4) { f.release(0.5); rel++; } const pp = f.pos.clone(); F.update(dt, t); for (const x of F.list) x.update(dt, Math.random, F.list);
    const vx = f.pos.x - pp.x, vz = f.pos.z - pp.z, sp = Math.hypot(vx, vz) / dt; if (sp > 0.12 && !f.holdfast?.settle && !f.holdfast?.on && !(f.releaseT > 0)) { moving++;      /* (held by the tail it pivots on its stem: that is not swimming) */ const e = Math.abs(W(Math.atan2(-vz, vx) - f.heading)); mis.push(e); (byS[f.hs] ||= []).push(e); } }
  const mean = (arr) => arr.length ? +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(2) : null; return { releases: rel, movingFrames: moving, faceOff: mean(mis), faceOffP90: pct(mis, 0.9), byState: Object.fromEntries(Object.entries(byS).map(([k, v]) => [k, [v.length, mean(v)]])) }; })()`);
console.log('  seahorse swims', JSON.stringify(swim));
ck('swimming between stems a seahorse faces the way it goes (mean heading error under 0.5 rad)', swim && swim.movingFrames > 50 && swim.faceOff < 0.5, JSON.stringify(swim));
// ── a fish, a turtle and a crab, each left to itself for two minutes: how hard it turns and accelerates ──
await p.evaluate(() => { const g = window.__game, s = g.state, born = Date.now() - 20 * 864e5; const mk = (id, name, species, x = {}) => ({ id, name, species, seed: id.length * 7 + 3, born, stage: 'adult', traits: ['Playful'], happy: 0.85, health: 1, hunger: 0.2, ...x });
  s.fish.push(mk('f1', 'Tang', 'tang'), mk('t1', 'Shelly', 'turtle'), mk('c1', 'Marcel', 'blueleg', { crab: { type: 'bold', shell: { t: 'cshell_ivory', sz: 1 } } })); g.emit('state'); });
await p.waitForTimeout(2500);
const trio = await p.evaluate(`(() => { ${wrap}
  const F = window.__fishes, want = { fish: F.list.find((f) => f.species.id === 'tang'), turtle: F.list.find((f) => f.species.id === 'turtle'), crab: F.list.find((f) => f.crab) }; const R = {}, dt = 0.05;
  const S = {}; for (const k in want) if (want[k]) S[k] = { f: want[k], h: want[k].heading, p: want[k].pos.clone(), v: want[k].pos.clone(), ang: [], acc: [] };
  for (let i = 0; i < 2400; i++) { const t = (window.__t = (window.__t ?? 0) + dt); F.update(dt, t); for (const x of F.list) x.update(dt, Math.random, F.list);
    for (const k in S) { const q = S[k], f = q.f, w = Math.abs(W(f.heading - q.h)) / dt, vel = f.pos.clone().sub(q.p).multiplyScalar(1 / dt), a = vel.clone().sub(q.v).length() / dt; q.h = f.heading; q.p.copy(f.pos); q.v.copy(vel); if (i > 2) { q.ang.push(w); q.acc.push(a); if (a > 6) (q.worst ||= []).push({ i, a: +a.toFixed(1), y: +f.pos.y.toFixed(2), ledge: !!f.toLedge, blocked: +(f.blocked ?? 0).toFixed(2), idle: +(f.idle ?? 0).toFixed(1), rest: +(f.restK ?? 0).toFixed(2), near: F.list.filter((o) => o !== f && o.pos.distanceTo(f.pos) < (o.radius + f.radius)).length, cs: f.cs?.s }); } } }
  for (const k in S) R[k] = { angP95: pct(S[k].ang, 0.95), angMax: pct(S[k].ang, 1), angSpikes: S[k].ang.filter((w) => w > (k === 'crab' ? 4 : k === 'turtle' ? 1.6 : 3.5)).length, accP95: pct(S[k].acc, 0.95), accMax: pct(S[k].acc, 1), hard: (S[k].worst ?? []).length, worst: (S[k].worst ?? []).sort((x, y) => y.a - x.a).slice(0, 4) }; return R; })()`);
console.log('  fish/turtle/crab', JSON.stringify(trio));
ck('a fish turns no faster than 3.5 rad/s outside a fright (fewer than 1 in 100 frames over)', trio?.fish && trio.fish.angSpikes / 2400 < 0.01, `${trio?.fish?.angSpikes} spikes, max ${trio?.fish?.angMax}`);
ck('a turtle turns no faster than 1.6 rad/s (fewer than 1 in 100 frames over)', trio?.turtle && trio.turtle.angSpikes / 2400 < 0.01, `${trio?.turtle?.angSpikes} spikes, max ${trio?.turtle?.angMax}`);
ck('a crab turns no faster than 4 rad/s (fewer than 1 in 100 frames over)', trio?.crab && trio.crab.angSpikes / 2400 < 0.01, `${trio?.crab?.angSpikes} spikes, max ${trio?.crab?.angMax}`);
console.log(fails ? `${fails} failed` : 'all passed'); await b.close(); process.exit(fails ? 1 : 0);
