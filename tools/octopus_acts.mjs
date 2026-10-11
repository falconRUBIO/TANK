// The octopus's repertoire: each impression and game is forced in turn, stepped by hand and photographed; then it is left to itself for
// eight minutes of tank time with fish and plants about, to prove it actually does these things on its own. Needs the solo game on 8123.
// node tools/octopus_acts.mjs OUTDIR
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/acts'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1', movedAt: 0 });
  s.fish.push({ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }, { id: 'g2', name: 'Miso', species: 'blue', seed: 4, born, stage: 'adult', traits: ['Brave'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 2.4, z: 1.5, ry: 0 }, { id: 'g1', type: 'grass', x: -2.6, z: 2.2, ry: 0 }, { id: 'f1', type: 'fern', x: 0.6, z: 2.4, ry: 0 }, { id: 'r1', type: 'rock', x: -1.2, z: 0.8, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const step = (n, dt = 0.05) => p.evaluate(({ n, dt }) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, (window.__t = (window.__t ?? 0) + dt)); F.list.forEach((x) => x.update(dt, Math.random, F.list)); } }, { n, dt });
const state = () => p.evaluate(() => { const f = window.__fishes.list[0]; return { s: f.st?.s, act: f.act, text: f.actText, x: +f.pos.x.toFixed(2), y: +f.pos.y.toFixed(2), z: +f.pos.z.toFixed(2), flat: +f.flatK.toFixed(2), lion: +f.lionK.toFixed(2), snake: +f.snakeK.toFixed(2), jelly: +f.jellyK.toFixed(2), kelp: +f.kelpK.toFixed(2), puff: +f.puffK.toFixed(2), sink: +f.sink.toFixed(2), pitch: +f.pitch.toFixed(2), thought: f.thought }; });
const force = (act, extra = {}) => p.evaluate(({ act, extra }) => { const F = window.__fishes, f = F.list[0]; f.pos.set(extra.x ?? -0.5, 0.6, extra.z ?? 1.6); f.vel.set(0, 0, 0); f.inspect = null; f.hunt = null; f.task = null; f.glassAt = null; f.restFor = 20; f.isNight = false;
  f.st = { s: 'rest', t: 0, n: 0, pulse: 0, mode: null }; f.ground = null; f.act = null; f.actText = null; const M = f.mind ?? { cur: 0.5, soc: 0.5, tidy: 0.5 };
  const rng = (() => { const seq = extra.seq ?? [0.0]; let i = 0; return () => seq[Math.min(i++, seq.length - 1)]; })();
  const ok = f.pickAct(f.st, rng, F.list, M, act); return { ok, s: f.st.s, act: f.act, text: f.actText }; }, { act, extra });
const cam = (x, y, z) => p.evaluate(({ x, y, z }) => { window.__cam = [x * 0.6, y + 2.4, z + 9.5, x * 0.6, y + 0.2, z]; }, { x, y, z });
// 1. each act on demand: the picker is handed a dice roll that lands on it (the weights are tried in order)
const seqFor = { flat: 0.0, bury: 0.09, lion: 0.13, snake: 0.17, jelly: 0.2, kelp: 0.24, follow: 0.3, watch: 0.4, tour: 0.46 };
const seen = {};
for (const act of ['flat', 'bury', 'lion', 'snake', 'jelly', 'kelp', 'follow', 'watch', 'tour']) {
  const at = act === 'kelp' ? { x: -2.0, z: 2.0 } : {};
  const r = await force(act, { ...at, seq: [seqFor[act]] });
  if (r.act !== act) { ck(`${act}: the picker takes it (${JSON.stringify(r)})`, false); continue; }
  await step(60); const mid = await state(); const key = { flat: 'flat', bury: 'sink', lion: 'lion', snake: 'snake', jelly: 'jelly', kelp: 'kelp' }[act];
  await cam(mid.x, mid.y, mid.z); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${act}.png` }); seen[act] = mid;
  if (key) ck(`${act}: the pose takes hold within three seconds and the card says so`, mid[key] > 0.6 && !!mid.text, `${key} ${mid[key]} "${mid.text}"`);
  else ck(`${act}: it is on its way and the card says so`, mid.s === (act === 'watch' ? 'watch' : 'jet') && !!mid.text, `${mid.s} "${mid.text}"`);
  if (act === 'jelly') ck('a jellyfish hangs upright, bell up, and rises', mid.pitch < -0.8 && mid.y > 1.0, `pitch ${mid.pitch} y ${mid.y}`);
  if (act === 'lion') ck('a lionfish holds up in the open water', mid.y > 1.6, `y ${mid.y}`);
  if (act === 'bury') { await step(80); const deep = await state(); ck('buried: it sinks until only the top shows', deep.sink > 0.6, `sink ${deep.sink}`); await cam(deep.x, deep.y, deep.z); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/bury_deep.png` }); }
  if (act === 'follow') { let near = 1e9; for (let i = 0; i < 16; i++) { await step(10); const st = await state(); const d = await p.evaluate(() => { const f = window.__fishes.list[0]; return f.follow ? +f.follow.pos.distanceTo(f.pos).toFixed(2) : null; }); if (d != null) near = Math.min(near, d); if (st.s !== 'jet') break; } ck('following, it gets within a couple of body lengths of the fish', near < 3.2, `nearest ${near}`); }
  // it finishes on its own
  let end = null; for (let i = 0; i < 90; i++) { await step(10); end = await state(); if (end.s === 'rest' && !end.act) break; }
  await step(70); end = await state();
  ck(`${act}: it ends on its own and the pose lets go`, !end.act && Math.max(end.flat, end.lion, end.snake, end.jelly, end.kelp, end.sink) < 0.35, JSON.stringify({ s: end.s, flat: end.flat, lion: end.lion, snake: end.snake, jelly: end.jelly, kelp: end.kelp, sink: end.sink }));
}
// 2. a fish that hangs about too close gets silt thrown at it
{
  const r = await p.evaluate(() => { const F = window.__fishes, f = F.list[0], o = F.list.find((q) => q.species.move !== 'jet'); f.pos.set(0.5, 0.6, 1.6); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 40, n: 0, pulse: 0, mode: null }; f.bold = 0.9; f.throwCool = 0; f.homing = false; f.sleepK = 0; f.mind = { ...(f.mind ?? {}), type: 'homebody', soc: 0.3 }; f.prank = null; f.inspect = null; f.movedAt = Date.now(); f.task = null;
    o.pos.set(1.7, 1.0, 1.6); o.target.copy(o.pos); o.retarget = 99; o.idle = 99; o.vel.set(0, 0, 0); let threw = null; for (let i = 0; i < 160 && !threw; i++) { o.pos.set(1.7, 1.0, 1.6); o.vel.set(0, 0, 0); f.pos.set(0.5, 0.6, 1.6); F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (!threw) o.pos.set(1.7, 1.0, 1.6); f.inspect = null; f.prank = null; if (/Threw silt/.test(f.actText ?? '')) threw = { i, text: f.actText, flee: o.fleeT > 0, clouds: (F.inks ?? []).length }; }
    return threw ?? { nearFor: f.nearFor, cool: f.throwCool, s: f.st.s, bold: f.bold, d: +o.pos.distanceTo(f.pos).toFixed(2) }; });
  ck('a fish hanging about too close gets silt thrown at it, and clears off', !!r?.flee && r.clouds > 0, JSON.stringify(r));
  await cam(0.5, 0.6, 1.6); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/silt.png` });
}
// 3. a quick fish close by makes it jump (sometimes with ink)
{
  const r = await p.evaluate(() => { const F = window.__fishes, f = F.list[0], o = F.list.find((q) => q.name === 'Miso'); f.pos.set(-0.5, 0.6, 1.6); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 40, n: 0, pulse: 0, mode: null }; f.startleCool = 0; f.scareT = 0; f.bold = 0.2;
    let jumped = null; for (let i = 0; i < 80 && !jumped; i++) { o.pos.set(-0.5 + Math.sin(i * 0.3) * 0.9, 1.1, 1.7); o.target.set(o.pos.x + 6, 1.1, 1.7); o.retarget = 9; o.idle = 0; o.fleeT = 1; o.vel.set(1.6, 0, 0); if (f.scareT <= 0) f.pos.set(-0.5, 0.6, 1.6); F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); if (f.scareT > 0) jumped = { i, s: f.st.s }; }
    return jumped ?? { vel: +o.vel.length().toFixed(2), d: +o.pos.distanceTo(f.pos).toFixed(2), cool: f.startleCool, s: f.st.s }; });
  ck('a quick fish close by makes it jump', r?.s === 'jet' && r.i != null, JSON.stringify(r));
}
// 4. left alone for eight minutes of tank time, it does these things by itself
{
  const log = await p.evaluate(() => { const F = window.__fishes, f = F.list[0]; f.pos.set(0, 0.6, 1.6); f.vel.set(0, 0, 0); f.st = { s: 'rest', t: 1, n: 0, pulse: 0, mode: null }; f.isNight = false; f.restFor = 10; f.shy = false; f.sleepK = 0;
    const acts = {}, gaits = {}; let last = null, lastG = null; for (let i = 0; i < 9600; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); const a = f.act; if (a && a !== last) acts[a] = (acts[a] ?? 0) + 1; last = a; const g = f.st?.s === 'crawl' ? f.gait : null; if (g && g !== lastG) { const name = Object.keys({ stroll: 1, creep: 1, stilt: 1, bounce: 1 }).find((k) => g.stride === ({ stroll: 1, creep: 0.6, stilt: 1.35, bounce: 1.1 })[k]); gaits[name] = (gaits[name] ?? 0) + 1; } lastG = g; }
    return { acts, gaits }; });
  const kinds = Object.keys(log.acts), n = Object.values(log.acts).reduce((a, c) => a + c, 0);
  ck('left to itself for eight minutes it does at least four different things, six times or more', kinds.length >= 4 && n >= 6, JSON.stringify(log.acts));
  ck('and walks in more than one way', Object.keys(log.gaits).length >= 2, JSON.stringify(log.gaits));
}
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Repertoire checks passed'); await b.close(); process.exit(fails ? 1 : 0);
