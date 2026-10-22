// Attachment, measured on screen: two octopus natures roam differently; an octopus comes to the glass for a caretaker it knows and not for a
// stranger; a fish goes back to its favourite decoration (and a seahorse to its saved favourite holdfast); pals swim together; an octopus fetches
// its keepsake; a seahorse pair meets where single seahorses do not. Every check is taken from the rendered objects (f.group.position, the
// keepsake's group) over simulated frames; state-only evidence is printed apart and labelled [state]. Seeded (Math.random, F.rng) so it repeats.
// Needs the solo game on 8123.   node tools/attach_check.mjs [OUTDIR]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.argv[2] || process.env.OUT || '/tmp/attach'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } });
await ctx.addInitScript(() => { let a = 20261021; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });      // (every Math.random in the page, seeded)
const p = await ctx.newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, ev, x = '') => { console.log(ok ? '  ✓' : '  ✗', `[${ev}]`, n, x); if (!ok) fails++; };
const info = (ev, n, x = '') => console.log('  ·', `[${ev}]`, n, x);
const r2 = (v) => Math.round(v * 100) / 100;
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { window.__simClock(true); window.__seed = (s) => { let a = s; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // a fresh tank: these animals, these decorations, these keepsakes; nothing else going on
  window.__stage = (seed, fish, decor, keeps = []) => { const g = window.__game, s = g.state, now = Date.now(), F = window.__fishes; s.flags.tut = 5; s.createdAt = now - 30 * 864e5; s.level = 8; F.rng = window.__seed(seed);
    s.fish.length = 0; s.fish.push(...fish.map((f) => ({ born: now - 12 * 864e5, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1, owner: null, traits: [], ...f }))); s.decor.length = 0; s.decor.push(...decor.map((d) => ({ ry: 0, ...d })));
    s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = keeps; s.visitAt = now + 9e9; s.visitor = null; g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); };
  // n frames of 1/20 s; every 5th frame the rendered position of each id (and of any keepsake group) is recorded
  window.__run = (n, ids, seed, each) => { const F = window.__fishes, rnd = window.__seed(seed), tr = Object.fromEntries(ids.map((id) => [id, []])), kt = {};
    for (let i = 0; i < n; i++) { each?.(i, F); F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, rnd, F.list));
      if (i % 5 === 0) { for (const id of ids) { const f = F.byId.get(id), q = f?.group?.position; tr[id].push(q ? [+q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3), f.holdfast?.on ? f.holdfast.id : null, f.greet ? 1 : 0] : null); }
        for (const [kid, it] of F.keeps0 ?? []) (kt[kid] ||= []).push([+it.group.position.x.toFixed(3), +it.group.position.z.toFixed(3), it.carried ? 1 : 0]); } }
    return { tr, kt }; }; });
const stage = async (...a) => { await p.evaluate((a) => window.__stage(...a), a); await p.waitForTimeout(2500); };
const run = (n, ids, seed, each) => p.evaluate(([n, ids, seed, each]) => window.__run(n, ids, seed, each ? new Function('i', 'F', each) : null), [n, ids, seed, each ?? null]);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, timeout: 180000 })      // (a slow machine takes a while to draw one);
const xz = (a, x, z) => Math.hypot(a[0] - x, a[2] - z), mean = (a) => a.reduce((s, c) => s + c, 0) / Math.max(1, a.length);
const pathLen = (t) => t.slice(1).reduce((s, c, i) => s + Math.hypot(c[0] - t[i][0], c[1] - t[i][1], c[2] - t[i][2]), 0);
const OCT = { species: 'octopus' };

const on = (n) => !process.env.ONLY || process.env.ONLY.split(',').includes(String(n));      // ONLY=5 node tools/attach_check.mjs: just the keepsake
// 1. two natures, the same tank, the same 5 minutes: a homebody (seed 6) and an explorer (seed 5), each in turn with the coconut den on the left
if (on(1)) { const D1 = [{ id: 'c1', type: 'coconut', x: -2.4, z: 0.6 }, { id: 'c2', type: 'coconut', x: 2.4, z: 0.6 }, { id: 'r1', type: 'boulder', x: 0, z: -1.6 }, { id: 'g1', type: 'grass', x: -0.6, z: 2.4 }, { id: 'g2', type: 'fern', x: 0.8, z: 2.3 }];
  const known = () => ({ fav: null, likes: [], fish: {}, fam: Object.fromEntries(D1.map((d) => [d.id, { k: 0.9, n: 12, x: d.x, z: d.z, at: Date.now() - 5 * 864e5 }])) });      // (a tank it has lived in for days: nothing new to investigate)
  // each alone in the same tank, from the same den, for the same frames (two octopuses together start to avoid each other, which muddies it)
  const tr = {}, st = []; for (const [id, name, seed] of [['oH', 'Hob', 6], ['oE', 'Exo', 5]]) { await stage(101, [{ ...OCT, id, name, seed, home: 'c1', bond: {}, mem: known() }], D1);
    st.push(await p.evaluate((id) => window.__fishes.byId.get(id).mind?.type, id)); await run(600, [], 11); tr[id] = (await run(6000, [id], 1)).tr[id]; if (id === 'oE') await shot('1-personalities'); }
  const m = (t, dx) => ({ path: r2(pathLen(t)), far: r2(Math.max(...t.map((a) => xz(a, dx, 0.6)))), den: r2(mean(t.map((a) => (xz(a, dx, 0.6) < 1.2 ? 1 : 0)))), glass: r2(mean(t.map((a) => (a[2] > 2.6 ? 1 : 0)))) });
  const H = m(tr.oH, -2.4), E = m(tr.oE, -2.4);
  info('state', 'natures from octoMind(seed)', JSON.stringify(st));
  ck('the homebody roams less than the explorer over the same frames (rendered path length)', st[0] === 'homebody' && st[1] === 'explorer' && H.path < 0.8 * E.path, 'rendered', `homebody ${JSON.stringify(H)} explorer ${JSON.stringify(E)}`);
  ck('the homebody spends more of its frames at its den than the explorer does', H.den > E.den, 'rendered', `${H.den} vs ${E.den}`); }

// 2. the caretaker looks in: an octopus that trusts them (bond 20) and a stranger (no bond), side by side, both resting at the back
if (on(2)) { await stage(202, [{ ...OCT, id: 'oF', name: 'Fond', seed: 5, home: 'c1', bond: { me: 20 } }, { ...OCT, id: 'oS', name: 'Strange', seed: 13, home: 'c2', bond: {} }],
    [{ id: 'c1', type: 'coconut', x: -2.0, z: -0.8 }, { id: 'c2', type: 'coconut', x: 2.0, z: -0.8 }, { id: 'g1', type: 'grass', x: 0, z: 2.4 }]);
  await run(400, ['oF', 'oS'], 2);
  const z0 = await p.evaluate(() => { const F = window.__fishes; F.rng = window.__seed(7); const o = {}; for (const id of ['oF', 'oS']) { const f = F.byId.get(id); f.inspect = null; f.task = null; f.greeted = null; o[id] = +f.group.position.z.toFixed(2); } F.rng = () => 0.3; F.greet(); F.rng = window.__seed(8);
    return { z: o, st: Object.fromEntries(['oF', 'oS'].map((id) => { const f = F.byId.get(id); return [id, { trust: f.trust, greeted: f.greeted, glassAt: !!f.glassAt }]; })) }; });
  const { tr } = await run(300, ['oF', 'oS'], 3); await shot('2-familiar-caretaker');
  const mz = (t) => r2(Math.max(...t.map((a) => a[2]))), gf = (t) => r2(mean(t.map((a) => (a[2] > 3.0 ? 1 : 0))));
  info('state', 'trust level and greeting chosen by F.greet()', JSON.stringify(z0.st));
  const pr = (t) => r2(mean(t.map((a) => (a[2] > 4.0 ? 1 : 0))));      // (only a greeting 'close' brings it up against the front pane, past z 3.5: fish3d.js zMax)
  ck('the octopus that knows you comes right up to the front glass for you; the stranger never does (rendered z past the pane line)', pr(tr.oF) > 0.3 && pr(tr.oS) === 0, 'rendered', `fond z ${z0.z.oF}→max ${mz(tr.oF)}, pressed to the glass ${pr(tr.oF)} of frames; stranger z ${z0.z.oS}→max ${mz(tr.oS)}, ${pr(tr.oS)}`); }

// 3. a favourite place: a goldfish whose spot is a sword plant, one whose spot is the big boulder, and one with none; two seahorses each with a
//    saved favourite holdfast (fish.log.hitch / log.fav, from earlier days), at opposite ends of the tank, plus one with no history
if (on(3)) { const D = [{ id: 'r1', type: 'boulder', x: -2.6, z: -0.6 }, { id: 'r2', type: 'rock', x: 2.8, z: -1.0 }, { id: 's1', type: 'shell', x: 0.4, z: -1.8 }, { id: 'p1', type: 'grass', x: 2.6, z: 2.2 }, { id: 'p2', type: 'fern', x: -1.2, z: 2.3 }, { id: 'p3', type: 'sword', x: 1.2, z: -0.4 }, { id: 'p4', type: 'grass', x: -0.2, z: 1.0 }];
  const HS = { species: 'seahorse', traits: ['Calm'], sex: 'f' }, G = { species: 'goldfish', seed: 3 };
  await stage(303, [{ ...G, id: 'fS', name: 'Sword', spotId: 'p3', found: ['spot'] }, { ...G, id: 'fB', name: 'Rocky', spotId: 'r1', found: ['spot'] }, { ...G, id: 'fC', name: 'Ctrl' },
    { ...HS, id: 'hA', name: 'Ama', seed: 4, log: { hitch: { p1: [900, 8, 2.6, 2.4] }, fav: 'p1' } }, { ...HS, id: 'hB', name: 'Bel', seed: 9, log: { hitch: { p2: [900, 8, -1.2, 2.5] }, fav: 'p2' } }, { ...HS, id: 'hN', name: 'New', seed: 11 }], D);
  const { tr } = await run(6000, ['fS', 'fB', 'fC', 'hA', 'hB', 'hN'], 4); await shot('3-favourite-place');
  const near = (t, x, z, r) => r2(mean(t.slice(60).map((a) => (xz(a, x, z) < r ? 1 : 0)))), on = (t, id, x, z) => r2(mean(t.slice(60).map((a) => (a[3] === id || xz(a, x, z) < 0.9 ? 1 : 0))));
  const sw = [near(tr.fS, 1.2, -0.4, 1.5), near(tr.fC, 1.2, -0.4, 1.5)], bo = [near(tr.fB, -2.6, -0.6, 1.8), near(tr.fC, -2.6, -0.6, 1.8)];
  ck('the fish whose spot is the sword plant is by it far more often than a fish without a spot', sw[0] > 1.5 * sw[1] && sw[0] - sw[1] > 0.1, 'rendered', `${sw[0]} vs ${sw[1]} of frames within 1.5`);
  const tg = await p.evaluate(() => { const F = window.__fishes, f = F.byId.get('fB'); let n = 0, gap = 0; for (let i = 0; i < 200; i++) { f.retarget = 0; f.pick(Math.random); if (Math.hypot(f.target.x + 2.6, f.target.z + 0.6) < 1.8) { n++; gap += Math.hypot(f.target.x + 2.6, f.target.z + 0.6); } } return { aimsThere: n / 200, meanTargetFromBoulder: +(gap / Math.max(1, n)).toFixed(2) }; });
  info('state', 'the boulder fish\'s chosen targets (f.pick): how often it aims at its boulder, and how far from the boulder centre (boulder pick radius 1.2)', JSON.stringify(tg));
  ck('the fish whose spot is the big boulder is by it more often than a fish without a spot', bo[0] > 1.5 * bo[1] && bo[0] - bo[1] > 0.1, 'rendered', `${bo[0]} vs ${bo[1]} of frames within 1.8`);
  const sv = await p.evaluate(() => ['hA', 'hB', 'hN'].map((id) => { const f = window.__fishes.byId.get(id); return [id, typeof f.savedLog === 'function', f.favourite(f.getSpots())]; }));
  info('state', 'seahorses: saved log handed to the 3D animal, and the favourite it reads from it', JSON.stringify(sv));
  const A = [on(tr.hA, 'p1', 2.6, 2.2), on(tr.hA, 'p2', -1.2, 2.3)], B = [on(tr.hB, 'p2', -1.2, 2.3), on(tr.hB, 'p1', 2.6, 2.2)], N = [on(tr.hN, 'p1', 2.6, 2.2), on(tr.hN, 'p2', -1.2, 2.3)];
  ck('seahorses with a saved favourite holdfast spend their time on their own favourite, not on the other one\'s (rendered, both pooled)', A[0] + B[0] > 2 * (A[1] + B[1]) + 0.1, 'rendered', `Ama p1 ${A[0]} / p2 ${A[1]}; Bel p2 ${B[0]} / p1 ${B[1]}; no-history seahorse p1 ${N[0]} / p2 ${N[1]}`); }

// 4. pals: two goldfish who are best friends (pal), two who are not, same species, same tank
if (on(4)) { await stage(404, [{ id: 'a1', name: 'Ann', species: 'goldfish', seed: 21, pal: 'a2' }, { id: 'a2', name: 'Abe', species: 'goldfish', seed: 22, pal: 'a1' }, { id: 'b1', name: 'Bea', species: 'goldfish', seed: 23 }, { id: 'b2', name: 'Bo', species: 'goldfish', seed: 24 }],
    [{ id: 'r1', type: 'rock', x: -2.4, z: 0 }, { id: 'p1', type: 'grass', x: 2.4, z: 1.8 }]);
  const pal = await p.evaluate(() => ['a1', 'a2', 'b1', 'b2'].map((id) => window.__fishes.byId.get(id).palId));
  const { tr } = await run(3000, ['a1', 'a2', 'b1', 'b2'], 5); await shot('4-companions');
  const dd = (u, v) => tr[u].slice(40).map((a, i) => { const c = tr[v][i + 40]; return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]); });
  const P = dd('a1', 'a2'), U = dd('b1', 'b2'), cl = (a) => r2(mean(a.map((d) => (d < 2 ? 1 : 0))));
  info('state', 'palId on the 3D fish', JSON.stringify(pal));
  ck('the pals swim closer together than two fish that are not pals (mean rendered distance)', mean(P) < 0.7 * mean(U), 'rendered', `pals ${r2(mean(P))} (within 2: ${cl(P)}) vs others ${r2(mean(U))} (${cl(U)})`); }

// 5. a keepsake: a shell this octopus brought home and knows, lying across the tank from its den; it goes to it and carries it home
if (on(5)) { await stage(505, [{ ...OCT, id: 'oK', name: 'Keeper', seed: 3, home: 'c1', bond: {}, advMem: { fav: 'k1', items: [{ k: 'shell', id: 'k1', at: Date.now() - 864e5 }] }, mem: { fav: null, fam: { c1: { k: 0.9, n: 12, x: -2.4, z: 0.4, at: Date.now() - 5 * 864e5 }, g1: { k: 0.9, n: 12, x: 0, z: 2.4, at: Date.now() - 5 * 864e5 } }, likes: [], fish: {}, keeps: { k1: { k: 0.9, n: 4 } } } }],
    [{ id: 'c1', type: 'coconut', x: -2.4, z: 0.4 }, { id: 'g1', type: 'grass', x: 0, z: 2.4 }], [{ id: 'k1', k: 'shell', adv: 'reef', by: 'oK', byName: 'Keeper', at: Date.now() - 864e5, x: 2.6, z: -1.2 }]);
  const k0 = await p.evaluate(() => { const F = window.__fishes; F.keeps0 = [...(window.__decor?.keeps ?? new Map())]; const ks = F.keepSpots(); F.attnAt = Date.now() - 3e5; F.keepT = 0.5; const f = F.byId.get('oK'); f.inspect = null; f.task = null; return { ks: ks.map((k) => [k.id, k.x, k.z]), groups: F.keeps0.length, type: f.mind?.type }; });
  if (!k0.groups) await p.evaluate(() => { const F = window.__fishes, it = F.keepSpots()[0]?.it; F.keeps0 = it ? [['k1', it]] : []; });
  const { tr, kt } = await run(3600, ['oK'], 6, 'F.attnAt = Date.now() - 3e5; const C =  F.byId.get("oK").keepCarry; if (C) { (F.kc ||= {})[C.phase] = (F.kc[C.phase] ?? 0) + 1; } else if (i % 200 === 0) F.keepT = 0;'); await shot('5-keepsake');
  const K = kt.k1 ?? [], minD = r2(Math.min(...tr.oK.map((a) => xz(a, 2.6, -1.2)))), carried = K.filter((k) => k[2]).length, last = K.at(-1);
  const follow = r2(mean(K.map((k, i) => (k[2] ? Math.hypot(k[0] - tr.oK[i][0], k[1] - tr.oK[i][2]) : null)).filter((v) => v != null)));
  const st = await p.evaluate(() => ({ keep: window.__game.state.keeps.find((k) => k.id === 'k1'), thought: window.__fishes.byId.get('oK').keepWhy?.thought, carryFrames: window.__fishes.kc ?? {} }));
  info('state', 'keepsake k1 in the tank state after the run, and its thought', JSON.stringify(st) + ` nature ${k0.type}`);
  ck('the octopus goes over to its keepsake and stays by it (rendered: within 1.5 of the shell, across the tank from its den)', minD < 1.5, 'rendered', `closest ${minD} (it picks up only within 1.2: fishmgr.js carryTick)`);
  ck('it carries it: the shell rides with it, then lies by its den', K.length > 0 && carried > 5 && follow < 0.5 && last && Math.hypot(last[0] + 2.4, last[1] - 0.4) < 1.6, 'rendered', `carried ${carried} of ${K.length} samples, mean ${follow} from the octopus while carried, ended at ${JSON.stringify(last)}`); }

// 6. seahorses: a mated pair and two singles; the meeting scheduler is woken every 40 s of tank time so there are chances to meet
if (on(6)) { const HS = { species: 'seahorse', traits: ['Social'] };
  await stage(606, [{ ...HS, id: 'm1', name: 'Mo', seed: 4, sex: 'm', mate: 'm2' }, { ...HS, id: 'm2', name: 'Mia', seed: 11, sex: 'f', mate: 'm1' }, { ...HS, id: 's1', name: 'Sol', seed: 15, sex: 'm' }, { ...HS, id: 's2', name: 'Sue', seed: 19, sex: 'f' }],
    [{ id: 'p1', type: 'grass', x: -2.6, z: 2.2 }, { id: 'p2', type: 'fern', x: 2.6, z: 2.2 }, { id: 'p3', type: 'sword', x: -1.0, z: -0.4 }, { id: 'p4', type: 'grass', x: 1.2, z: -0.4 }, { id: 'p5', type: 'kelp', x: 0, z: 1.6 }]);
  const mates = await p.evaluate(() => ['m1', 'm2', 's1', 's2'].map((id) => window.__fishes.byId.get(id).mateId));
  const { tr } = await run(4800, ['m1', 'm2', 's1', 's2'], 7, 'if (i % 800 === 400) F.shT = 0; F.isLead = () => true;'); await shot('6-seahorse-pair');
  const dd = (u, v) => tr[u].map((a, i) => Math.hypot(a[0] - tr[v][i][0], a[1] - tr[v][i][1], a[2] - tr[v][i][2])), gr = (u) => tr[u].filter((a) => a[4]).length;
  const P = dd('m1', 'm2'), S = dd('s1', 's2'), meet = (a) => a.filter((d) => d < 1.2).length;
  info('state', 'mateId on the 3D seahorses', JSON.stringify(mates));
  ck('the mated pair meets and circles together (rendered: frames within 1.2 of each other); the singles do not', meet(P) > 10 && meet(P) > 3 * meet(S), 'rendered', `pair ${meet(P)} close samples (greeting in ${gr('m1')}), singles ${meet(S)} (greeting in ${gr('s1')}); mean distance ${r2(mean(P))} vs ${r2(mean(S))}`);
  { const po = mean(P.filter((d, i) => !tr.m1[i][4])), so = mean(S.filter((d, i) => !tr.s1[i][4])); ck('outside their meetings the pair keeps closer than two singles (rendered: mean distance)', po < 0.8 * so, 'rendered', `pair mean ${r2(po)} vs singles ${r2(so)}`); } }

ck('no page errors', errors.length === 0, 'page', errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Attachment checks passed'); process.exit(fails ? 1 : 0);
