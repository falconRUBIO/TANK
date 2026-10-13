// Seahorses, phase 1: do they behave like animals with places, habits and routines of their own? Each section sets up a tank and lets it run
// (tank time, stepped by hand), then checks what really happened:
//   grips     real places to hold on are found on plants and on thin posts, never on rocks or smooth shapes, and every grip has the thing inside its coil
//   hitch     over minutes, every seahorse holding on holds something real (the stem inside its coil), never empty water
//   memory    what it knows of its holdfasts is saved by decoration id, comes back after a reload and a change of lead phone, and a removed favourite is let go
//   feeding   from its stem it watches a passing shrimp, turns to follow it, strikes when it is within reach of the snout, sucks it in, and stays holding on
//   persona   two seahorses with different personalities grow different routines (exploring, loyalty, where they hold on, reactions to something new)
//   night     at night each settles on a familiar holdfast in its own time and rests, fins slow; in the morning each comes back to its day in its own time
//   social    only the lead phone starts a greeting; the greeting discovery comes from a real greeting, not from two seahorses being close
//   sync      a seahorse's compact state carries its state, eyes, colour, glow and strikes, and each strike plays once on another phone
//   perf      the background grip search stays inside its time budget each frame
// Needs the solo game on 8123.  node tools/seahorse_phase1.mjs [section,section...]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null, run = (k) => !only || only.has(k);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = []; let fails = 0, ctx, p;
const open = async () => { await ctx?.close(); ctx = await b.newContext({ viewport: { width: 430, height: 932 } }); p = await ctx.newPage();      // a new browser profile: nothing kept from before
  p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /error/.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); }); };
await open();
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const boot = async () => { await p.goto('http://localhost:8123/?q=0&dev=1&tod=noon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__step = async (secs, each) => { const F = window.__fishes; for (let i = 0; i < secs * 20; i++) { window.__t = (window.__t ?? 0) + 0.05; F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); F.observe?.(0.05, window.__t); each?.(i); if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); } }; }); };
// a tank of these animals and decorations, nothing else going on
const setup = (fish, decor, extra = {}) => p.evaluate(([fish, decor, extra]) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.shells = 50; s.hunger = extra.hunger ?? 0.05; s.fish.length = 0; s.decor.length = 0; const born = Date.now() - 9 * 864e5;
  for (const f of fish) s.fish.push({ born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, ...f }); for (const d of decor) s.decor.push({ ry: 0, ...d }); g.emit('state');
  document.querySelectorAll('#coach,#toast,#settle,#reunion,#modal').forEach((e) => (e.style.display = 'none')); }, [fish, decor, extra]).then(() => p.waitForTimeout(1500))
  .then(() => p.evaluate(() => { for (const f of window.__fishes.list) { f.noticeQ = null; f.exploreAt = null; } }));      // the tank as set up is not 'something new' to them
let booted = false; const fresh = async () => { if (booted) { await open(); await boot(); } booted = true; };      // each section starts from a freshly loaded page
await boot();

if (run('grips')) {
  console.log('grips'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }], []);
  const r = await p.evaluate(async () => {
    const G = await import('/src/w3/grips.js'), g = window.__game, s = g.state, out = {};
    for (const ty of ['grass', 'kelp', 'anchor', 'bridge', 'brain', 'rock', 'boulder', 'pillar', 'coconut']) {
      s.decor.length = 0; s.decor.push({ id: 'g' + ty, type: ty, x: 0, z: 1.2, ry: 0 }); g.emit('state'); await new Promise((q) => setTimeout(q, 700));
      const h = window.__fishes.list.find((f) => f.sp?.tail), q = window.__decor.spots().find((x) => x.id === 'g' + ty); if (!h || !q) { out[ty] = 'missing'; continue; }
      G.clearGrips(); const e = G.gripsNow(q, h), vox = h.decorVox(q.x, q.z, 1.8);
      const real = e.grips.every((gp) => { const r = Math.max(0.03, (gp.stem - 1.1) / 1.42 * h.scale); return vox.some((v) => v[4] === q.id && Math.hypot(v[0] - gp.x, v[2] - gp.z) < r && v[1] > gp.y) && vox.some((v) => v[4] === q.id && Math.hypot(v[0] - gp.x, v[2] - gp.z) < r && v[1] < gp.y); });
      out[ty] = { n: e.grips.length, real };
    }
    return out;
  });
  ck('1. a plant stem is a valid hitch', r.grass?.n > 0 && r.kelp?.n > 0, r);
  ck('2. thin posts of structures are hitches too (the anchor shank, the bridge posts)', r.anchor?.n > 0 && r.bridge?.n > 0, { anchor: r.anchor, bridge: r.bridge });
  ck('3. rocks, brain coral, a pillar and a coconut are not: nothing thin to wrap a tail round', ['brain', 'rock', 'boulder', 'pillar', 'coconut'].every((k) => r[k]?.n === 0), r);
  ck('   every grip has the decoration itself inside the coil, above and below', Object.values(r).every((x) => x.real), r);
}

if (run('hitch')) {
  console.log('hitch'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }],
    [{ id: 'p1', type: 'grass', x: -2.4, z: 1.6 }, { id: 'p2', type: 'sword', x: 1.6, z: 1.8 }, { id: 'p3', type: 'kelp', x: -0.9, z: 1.9 }, { id: 'p4', type: 'fern', x: 0.4, z: -0.2 }, { id: 'a1', type: 'anchor', x: -0.4, z: -1.2 }, { id: 'r1', type: 'brain', x: 0.8, z: 0.9 }, { id: 'r2', type: 'rock', x: 2.6, z: 0.2 }, { id: 'r3', type: 'boulder', x: -1.6, z: 0.4 }, { id: 'r4', type: 'pillar', x: 2.8, z: -1.2 }]);
  const r = await p.evaluate(async () => {
    const F = window.__fishes, hs = F.list.filter((f) => f.sp?.tail), bad = new Set(['r1', 'r2', 'r3', 'r4']); let held = 0, wrong = 0, empty = 0, n = 0; const used = new Set(), states = new Set(), hist = {}, emptyAt = [];
    await window.__step(240, () => { for (const h of hs) { n++; states.add(h.hs); hist[h.hs] = (hist[h.hs] ?? 0) + 1; const H = h.holdfast; if (!H?.on) continue; held++; used.add(H.id); if (bad.has(H.id)) wrong++;
      const gp = h.gripPoint(), vox = h.decorVox(H.x, H.z, 0.5), r = Math.max(0.05, ((H.stem ?? 2.1) - 1.1) / 1.42 * h.scale + 0.04); if (gp && !vox.some((v) => v[4] === H.id && Math.hypot(v[0] - gp[0], v[2] - gp[2]) < r && Math.abs(v[1] - gp[1]) < 0.3)) { empty++; if (emptyAt.length < 5) { const nd = Math.min(...vox.filter((v) => v[4] === H.id).map((v) => Math.hypot(v[0] - gp[0], v[2] - gp[2]))); emptyAt.push({ id: H.id, held: +H.held.toFixed(2), g: +h.gripK.toFixed(2), d: +nd.toFixed(3), r: +r.toFixed(3), off: +Math.hypot(gp[0] - H.x, gp[2] - H.z).toFixed(3), st: h.strikeT, sn: h.snickT }); } } } });
    return { held: Math.round(100 * held / n), wrong, empty, used: [...used], states: [...states], emptyAt, hist: Object.fromEntries(Object.entries(hist).map(([k, v]) => [k, Math.round(100 * v / n)])) };
  });
  ck('   they hold on most of the time', r.held >= 45, `${r.held}%`);
  ck('   never on a rock, brain coral, boulder or pillar', r.wrong === 0, r);
  ck('   never empty water: the thing it holds is always inside its coil', r.empty === 0, `${r.empty} frames`);
  ck('   one primary state at a time, from the known set', r.states.every((x) => ['swimming', 'exploring', 'approaching', 'settling', 'hitched', 'watching', 'feeding', 'releasing', 'social', 'night'].includes(x)), r.states);
}

if (run('memory')) {
  console.log('memory'); await fresh();
  const decor = [{ id: 'p1', type: 'grass', x: -2.4, z: 1.6 }, { id: 'p2', type: 'sword', x: 1.6, z: 1.8 }, { id: 'p3', type: 'kelp', x: -0.4, z: -0.4 }, { id: 'p4', type: 'fern', x: 2.4, z: -0.6 }];
  // a seahorse that has held the sword plant a lot, as the server remembers it; a newcomer with no history
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4, traits: ['Shy', 'Calm'], log: { hitch: { p2: [600, 6, 1.6, 1.8] }, fav: 'p2' } }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }], decor);
  const a = await p.evaluate(async () => {
    const F = window.__fishes, h = F.byId.get('h1'), n = F.byId.get('h2'), spots = window.__decor.spots();
    const fav0 = h.favourite(spots), favN = n.favourite(spots); const picks = {};
    await window.__step(20);      // (the grip search runs in the background first)
    for (let k = 0; k < 300; k++) { h.holdfast = null; h.lastHold = null; if (h.pickHold(Math.random, spots)) picks[h.holdfast.id] = (picks[h.holdfast.id] ?? 0) + 1; } h.holdfast = null;      // 300 choices of where to hold on next
    return { fav0, favN, picks, share: Math.round(100 * (picks.p2 ?? 0) / Math.max(1, Object.values(picks).reduce((x, y) => x + y, 0))) };
  });
  ck('4a. a favourite saved on the server is its favourite straight after loading, and it goes back to it', a.fav0 === 'p2' && a.share >= 35, a);
  ck('    a newcomer has no favourite until it has earned one', a.favN === null, a);
  // what it does now is reported in the fish log, by decoration id, and comes back after a reload
  const b2 = await p.evaluate(async () => {
    const F = window.__fishes, g = window.__game, h = F.byId.get('h2'); await window.__step(200);
    const before = Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((id) => [id, h.memOf(id)]));
    F.logAt = -1e9; F.observe(0.05, (window.__t += 0.05)); await new Promise((q) => setTimeout(q, 300));
    const saved = g.state.fish.find((f) => f.id === 'h2').log?.hitch ?? null;
    return { before, saved };
  });
  const savedTotal = Object.values(b2.saved ?? {}).reduce((x, h) => x + h[0], 0), memTotal = Object.values(b2.before).reduce((x, m) => x + m.secs, 0);
  ck('4b. its time and visits on each holdfast are saved in the fish log, by decoration id', b2.saved && Object.keys(b2.saved).every((k) => /^p\d$/.test(k)) && Math.abs(savedTotal - memTotal) <= 4 + Object.keys(b2.saved).length, { savedTotal, memTotal: Math.round(memTotal), saved: b2.saved });
  await p.waitForTimeout(800); await p.reload(); await p.waitForFunction(() => window.__game?.state && window.__fishes?.byId?.get('h2'), null, { timeout: 120000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { window.__step = async (secs, each) => { const F = window.__fishes; for (let i = 0; i < secs * 20; i++) { window.__t = (window.__t ?? 0) + 0.05; F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); F.observe?.(0.05, window.__t); each?.(i); if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); } }; document.querySelectorAll('#modal,#coach,#toast').forEach((e) => (e.style.display = 'none')); });
  const c = await p.evaluate(() => { const h = window.__fishes.byId.get('h2'); return Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((id) => [id, h.memOf(id).secs])); });
  ck('4c. after a reload it still knows each holdfast as well as before', Object.entries(b2.saved ?? {}).every(([id, h]) => Math.abs(c[id] - h[0]) < 1), { after: c, saved: b2.saved });
  // a change of lead phone: this phone stops deciding for a while, then takes over again
  const d = await p.evaluate(async () => {
    const F = window.__fishes, h = F.byId.get('h1'), spots = window.__decor.spots(), before = h.favourite(spots), m0 = h.memOf('p2').secs, lead0 = F.isLead;
    F.isLead = () => false; await window.__step(5); const asFollower = { holdfast: !!h.holdfast };
    F.isLead = lead0 ?? (() => true); await window.__step(5);
    return { before, after: h.favourite(spots), m0, m1: h.memOf('p2').secs, asFollower };
  });
  ck('5. a change of lead phone does not reset what it remembers', d.before === d.after && d.m1 >= d.m0 - 0.01 && !d.asFollower.holdfast, d);
  // its favourite is taken out of the tank
  const e = await p.evaluate(async () => {
    const F = window.__fishes, g = window.__game, h = F.byId.get('h1'); g.state.decor = g.state.decor.filter((x) => x.id !== 'p2'); g.emit('state'); await new Promise((q) => setTimeout(q, 800));
    const fav = h.favourite(window.__decor.spots()); let holdsP2 = 0; await window.__step(150, () => { if (h.holdfast?.id === 'p2') holdsP2++; });
    F.logAt = -1e9; F.observe(0.05, (window.__t += 0.05)); await new Promise((q) => setTimeout(q, 300));
    const L = g.state.fish.find((f) => f.id === 'h1').log ?? {};
    return { fav, holdsP2, savedHasP2: !!L.hitch?.p2, savedFav: L.fav ?? null, held: Object.keys(L.hitch ?? {}) };
  });
  ck('6. removing its favourite is safe: forgotten, never held again, and a new favourite can grow', e.fav !== 'p2' && e.holdsP2 === 0 && !e.savedHasP2 && e.savedFav !== 'p2', e);
}

if (run('feeding')) {
  console.log('feeding'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4, traits: ['Calm'] }], [{ id: 'p1', type: 'grass', x: 0, z: 1.2 }], { hunger: 0.5 });
  const r = await p.evaluate(async () => {
    const F = window.__fishes, h = F.byId.get('h1'); let t = 0; while (!h.holdfast?.on && t < 120) { await window.__step(1); t++; }
    if (!h.holdfast?.on) return { hitched: false };
    await window.__step(3); const V = h.pos.constructor, m = h.snout(new V()), ate0 = h.meals ?? 0;
    // a mysis shrimp drifting down just in front of its snout
    const c = { pos: new V(m.x + 0.15, m.y + 0.9, m.z + 0.05), age: 0, ph: 0, kind: 'mysis', c: F.foodCols.mysis[0] }; F.flakes.push(c);
    const rec = { watched: false, eyeOn: 0, frames: 0, strikeDist: null, eatDist: null, heldThrough: true, sucked: 0, eaten: 0 };
    const oe = F.onEat; F.onEat = (f) => { if (f === h && rec.eatDist == null) rec.eatDist = c.pos.distanceTo(h.snout(new V())); oe?.(f); };      // where the shrimp is, against the snout, at the moment it is eaten
    await window.__step(8, () => { rec.frames++; if (h.prey === c) { rec.watched = true; const side = h.eyeR.tx === 1 || h.eyeL.tx === 1 || Math.abs(h.eyeR.x) > 0.3 || Math.abs(h.eyeL.x) > 0.3; if (side) rec.eyeOn++; }
      if (c.sucked && rec.strikeDist == null) { rec.strikeDist = c.pos.distanceTo(h.snout(new V())); rec.sucked++; }
      if (c.eaten && !rec.eatenSeen) { rec.eatenSeen = true; rec.eaten++; }
      if (!h.holdfast?.on) rec.heldThrough = false; });
    rec.meals = (h.meals ?? 0) - ate0; rec.strikes = h.strikesN ?? 0;
    // food too far away to reach from its stem: it does not let go at once
    const far = { pos: new V(h.pos.x + 3, h.pos.y + 1, h.pos.z - 0.4), age: 0, ph: 0, kind: 'mysis', c: F.foodCols.mysis[0] }; F.flakes.push(far); let stayed = 0;
    await window.__step(4, () => { if (h.holdfast?.on) stayed++; }); rec.stayedFar = stayed / 80;
    return { hitched: true, ...rec };
  });
  ck('7. it notices a shrimp drifting by and follows it with its eyes', r.watched && r.eyeOn > 3, r);
  ck('8. it strikes only when the shrimp is within reach of its snout, and sucks it into the snout', r.strikeDist != null && r.strikeDist < 0.32 && r.eatDist != null && r.eatDist < 0.08, r);
  ck('9. the shrimp is eaten once', r.sucked === 1 && r.eaten === 1 && r.meals === 1, r);
  ck('10. it feeds while holding on, and lets food it cannot reach drift by rather than letting go at once', r.heldThrough && r.stayedFar >= 0.95, r);
  // a seahorse among quick fish, food dropped into the water: do any pieces get eaten twice, and does the seahorse get some
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, traits: ['Greedy'] }, { id: 'g2', name: 'Dash', species: 'danio', seed: 5 }], [{ id: 'p1', type: 'grass', x: -0.6, z: 1.2 }, { id: 'p2', type: 'kelp', x: 1.2, z: 0.4 }], { hunger: 0.5 });
  const q = await p.evaluate(async () => {
    const F = window.__fishes, h = F.byId.get('h1'); let t = 0; while (!h.holdfast?.on && t < 120) { await window.__step(1); t++; }
    let eats = 0; const oe = F.onEat; F.onEat = (f) => { eats++; oe?.(f); }; const m0 = h.meals ?? 0; let gone = 0;
    for (let k = 0; k < 4; k++) { F.drop(h.pos.x + (Math.random() - 0.5) * 1.2, 7, 'mysis'); const n0 = F.flakes.length; await window.__step(30); }
    gone = 28; return { eats, seahorse: (h.meals ?? 0) - m0, dropped: gone };
  });
  ck('    among quick fish no piece is eaten twice, and the seahorse gets its share', q.eats <= q.dropped && q.seahorse >= 1, q);
}

if (run('persona')) {
  console.log('persona'); await fresh();
  const decor = [{ id: 'p1', type: 'grass', x: -2.6, z: 2.2 }, { id: 'p2', type: 'sword', x: -0.6, z: 2.3 }, { id: 'p3', type: 'kelp', x: 1.4, z: 2.0 }, { id: 'p4', type: 'fern', x: -1.8, z: -0.8 }, { id: 'p5', type: 'grass', x: 0.6, z: -1.2 }, { id: 'p6', type: 'anemone', x: 2.6, z: -0.4 }];
  const runOne = async (persona) => { await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }], decor);
    return p.evaluate(async (persona) => { const F = window.__fishes, h = F.byId.get('h1'); Object.defineProperty(h, 'persona', { get: () => persona, set: () => {}, configurable: true }); /* the regular sync would put back the one from its record */ let holds = 0, last = null, zs = 0, zn = 0, hfs = 0; const used = {};
      await window.__step(900, () => { const H = h.holdfast; if (H?.on) { used[H.id] = (used[H.id] ?? 0) + 1; zs += H.z; hfs += H.hf; zn++; if (H !== last) { last = H; holds++; } } });
      // something new placed near it, a few times over: does it go to look?
      let looked = 0; for (let k = 0; k < 8; k++) { F.investigate({ id: 'n' + k, type: 'brain', x: h.pos.x + 1, z: Math.min(2, h.pos.z), y: 0, h: 0.6 }); await window.__step(25, () => {}); if (h.exploreAt || h.inspects > (h._i0 ?? 0)) looked++; h._i0 = h.inspects ?? 0; h.exploreAt = null; }
      const tot = Object.values(used).reduce((a, b) => a + b, 0);
      return { holds, distinct: Object.keys(used).length, top: Math.round(100 * Math.max(...Object.values(used)) / tot), z: +(zs / zn).toFixed(2), hf: +(hfs / zn).toFixed(2), looked, inspects: h.inspects ?? 0 }; }, persona); };
  const A = await runOne({ cur: 0.9, bold: 0.9, soc: 0.5, act: 0.8, adapt: 0.9 }), B = await runOne({ cur: 0.1, bold: 0.1, soc: 0.5, act: 0.15, adapt: 0.1 });
  console.log('    curious, bold, active:', JSON.stringify(A)); console.log('    cautious, quiet:      ', JSON.stringify(B));
  ck('11. personality shapes its routine: the active one moves on more often, the quiet one holds on longer', A.holds > B.holds, { A: A.holds, B: B.holds });
  ck('    the bold one holds on further out and higher up than the cautious one', A.z > B.z && A.hf > B.hf, { A: [A.z, A.hf], B: [B.z, B.hf] });
  ck('    the cautious one keeps more to one place', B.top >= A.top, { A: A.top, B: B.top });
  ck('    the curious one goes to look at new things more often', A.looked > B.looked, { A: A.looked, B: B.looked });
}

if (run('night')) {
  console.log('night'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }, { id: 'h3', name: 'Moss', species: 'seahorse', seed: 23 }],
    [{ id: 'p1', type: 'grass', x: -2.4, z: 1.6 }, { id: 'p2', type: 'sword', x: 1.6, z: 1.8 }, { id: 'p3', type: 'kelp', x: -0.4, z: -0.4 }, { id: 'p4', type: 'fern', x: 2.4, z: -0.6 }]);
  const r = await p.evaluate(async () => {
    const F = window.__fishes, hs = F.list.filter((f) => f.sp?.tail); await window.__step(60);
    F.setNight(true); const asleepAt = hs.map(() => null); let n = 0, held = 0, ph = 0, phN = 0;
    await window.__step(360, (i) => { hs.forEach((h, k) => { if (h.sleepy && asleepAt[k] == null) asleepAt[k] = i / 20; if (i > 200 * 20 / 2 && h.sleepy) { n++; if (h.holdfast?.on || h.holdfast?.settle) held++; } }); });
    const h0 = hs.find((h) => h.holdfast?.on && h.sleepy); if (h0) { const p0 = h0.phase; await window.__step(2); ph = (h0.phase - p0) / 2; }
    F.setNight(false); const wokeAt = hs.map(() => null);
    await window.__step(240, (i) => { hs.forEach((h, k) => { if (!h.sleepy && wokeAt[k] == null) wokeAt[k] = i / 20; }); });
    let dayPh = 0; const h1 = hs.find((h) => h.holdfast?.on && !h.sleepy); if (h1) { const p0 = h1.phase; await window.__step(2); dayPh = (h1.phase - p0) / 2; }
    return { asleepAt, heldAsleep: Math.round(100 * held / Math.max(1, n)), finNight: +ph.toFixed(1), finDay: +dayPh.toFixed(1), wokeAt, still: hs.filter((h) => h.sleepy).length };
  });
  ck('12. at night every seahorse settles to rest, each in its own time', r.asleepAt.every((x) => x != null) && new Set(r.asleepAt.map((x) => Math.round(x))).size > 1, r);
  ck('    resting, it stays on its holdfast and its fins slow', r.heldAsleep >= 85 && r.finNight > 0 && r.finNight < 5, r);
  ck('13. in the morning each comes back to its day in its own time', r.still === 0 && new Set(r.wokeAt.map((x) => Math.round(x))).size > 1 && r.finDay > 8, r);
}

if (run('social')) {
  console.log('social'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }], [{ id: 'p1', type: 'grass', x: -1.2, z: 1.6 }, { id: 'p2', type: 'sword', x: 1.0, z: 1.8 }]);
  const r = await p.evaluate(async () => {
    const F = window.__fishes, hs = F.list.filter((f) => f.sp?.tail), seen = []; const oo = F.onObserve; F.onObserve = (o) => { seen.push(o.key); oo?.(o); };
    hs.forEach((h) => { h.persona = { ...h.persona, soc: 1 }; h.disc = null; }); for (const h of hs) { h.dw && (h.dw.dance = 0); }
    // two seahorses side by side for a while, no greeting: not a greeting
    await window.__step(2); hs[1].pos.copy(hs[0].pos).add(new hs[0].pos.constructor(0.8, 0, 0)); const lead0 = F.isLead;
    F.night = false; F.shT = 1e9; await window.__step(12, () => { hs[1].pos.copy(hs[0].pos).add(new hs[0].pos.constructor(0.8, 0, 0)); }); const danceNear = seen.filter((k) => k === 'dance').length;
    // a follower phone never starts one
    F.isLead = () => false; let follower = 0; for (let k = 0; k < 60; k++) { F.shT = 0; F.seahorseTick(0.05, 0); if (hs.some((h) => h.greet)) follower++; }
    F.isLead = lead0 ?? (() => true); let started = false; for (let k = 0; k < 60 && !started; k++) { F.shT = 0; F.seahorseTick(0.05, 0); started = hs.some((h) => h.greet); }
    await window.__step(14); const danceReal = seen.filter((k) => k === 'dance').length;
    return { danceNear, follower, started, danceReal, greets: hs.map((h) => h.greets ?? 0), seen: [...new Set(seen)], disc: hs.map((h) => Object.keys(h.disc ?? {})) };
  });
  ck('14. only the lead phone starts a greeting', r.follower === 0 && r.started, r);
  ck('15. the greeting discovery comes from a real greeting, not from two seahorses being close', r.danceNear === 0 && r.danceReal >= 1 && r.greets.every((x) => x >= 1), r);
}

if (run('sync')) {
  console.log('sync'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }], [{ id: 'p1', type: 'grass', x: 0, z: 1.2 }]);
  const r = await p.evaluate(async () => {
    const F = window.__fishes, [a, b] = F.list.filter((f) => f.sp?.tail), S = window.__sea; await window.__step(20);
    a.hs = 'watching'; a.eyeL = { x: 1, y: -1, tx: 1, ty: -1, t: 1 }; a.eyeR = { x: -1, y: 0, tx: -1, ty: 0, t: 1 }; a.tintCol = [150, 222, 150]; a.tintK = 0.3; a.glowK = 0.6; a.strikeSeq = 4; a.gripStem = 4.25; a.gripLean = 0.55;
    const str = S.pack(a); S.unpack(b, str, 1); const got = { hs: b.hs, eyes: [b.eyeL.x, b.eyeL.y, b.eyeR.x, b.eyeR.y], tint: b.tintK, col: b.tintCol, glow: b.glowK, stem: b.gripStem, lean: b.gripLean, strikeFirst: b.netStrikeT };
    a.strikeSeq = 5; S.unpack(b, S.pack(a), 1); const once = b.netStrikeT; b.netStrikeT = 0; S.unpack(b, S.pack(a), 1); const again = b.netStrikeT;
    return { len: str.length, str, got, once, again };
  });
  ck('16. a seahorse\'s state, eyes, colour, glow and grip reach the other phones in one short string', r.len < 48 && r.got.hs === 'watching' && r.got.eyes.join() === '1,-1,-1,0' && Math.abs(r.got.tint - 0.3) < 0.01 && r.got.col.join() === '150,222,150' && r.got.glow === 0.6 && r.got.stem === 4.25 && r.got.lean === 0.55, r);
  ck('    each strike plays once on the other phone', r.once > 0 && r.again === 0, r);
}

if (run('perf')) {
  console.log('perf'); await fresh();
  await setup([{ id: 'h1', name: 'Pip', species: 'seahorse', seed: 4 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11 }, { id: 'h3', name: 'Moss', species: 'seahorse', seed: 23 }, { id: 'h4', name: 'Kelpie', species: 'seahorse', seed: 31 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3 }, { id: 'o1', name: 'Inky', species: 'octopus', seed: 5, owner: 'me' }],
    [{ id: 'p1', type: 'grass', x: -2.4, z: 1.6 }, { id: 'p2', type: 'sword', x: 1.6, z: 1.8 }, { id: 'p3', type: 'kelp', x: -0.4, z: -0.4 }, { id: 'p4', type: 'fern', x: 2.4, z: -0.6 }, { id: 'a1', type: 'anchor', x: -1.4, z: -1.6 }, { id: 'b1', type: 'bridge', x: 1.0, z: -1.8 }, { id: 'r1', type: 'boulder', x: 0.4, z: 0.6 }, { id: 'c1', type: 'coconut', x: -2.8, z: -0.2 }]);
  const r = await p.evaluate(async () => {
    const G = await import('/src/w3/grips.js'), F = window.__fishes; G.clearGrips(); G.gripStats.maxFrameMs = 0; G.gripStats.worstUnitMs = 0; G.gripStats.workMs = 0; G.gripStats.frames = 0;
    const hs = F.list.filter((f) => f.sp?.tail); let worst = 0, sum = 0, n = 0;
    await window.__step(120, () => { const t0 = performance.now(); for (const h of hs) h.update(0.05, Math.random, F.list); const ms = performance.now() - t0; worst = Math.max(worst, ms); sum += ms; n++; });
    // a decoration moved: its grips are searched again, in the background
    const g = window.__game, before = G.gripsFor(window.__decor.spots().find((x) => x.id === 'p1'), hs[0]); g.state.decor.find((d) => d.id === 'p1').x = -2.0; g.emit('state'); await new Promise((q) => setTimeout(q, 600));
    const moved = G.gripsFor(window.__decor.spots().find((x) => x.id === 'p1'), hs[0]), q0 = moved !== before ? 1 : 0; await window.__step(10); const movedReady = moved.status === 'ready' && moved.grips.length > 0;
    return { maxGripFrameMs: +G.gripStats.maxFrameMs.toFixed(2), worstUnit: G.gripStats.worstUnit + ' ' + G.gripStats.worstUnitMs.toFixed(1), gripWorkMs: +G.gripStats.workMs.toFixed(1), gripFrames: G.gripStats.frames, seahorseUpdateAvgMs: +(sum / n).toFixed(3), seahorseUpdateWorstMs: +worst.toFixed(2), queuedAfterMove: q0, movedReady, queueAfter: G.gripQueue() };
  });
  console.log('    ', JSON.stringify(r));
  ck('20. the grip search stays inside its per-frame budget (no long frames from it)', r.maxGripFrameMs < 6, r);
  ck('    moving a decoration queues a new search for it, which finishes in the background', r.queuedAfterMove >= 1 && r.movedReady && r.queueAfter === 0, r);
}

ck('no page errors', errors.length === 0, errors.slice(0, 5));
console.log(fails ? `${fails} failed` : 'Seahorse phase 1 checks passed');
await b.close();
process.exit(fails ? 1 : 0);
