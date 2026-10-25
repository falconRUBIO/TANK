// Seahorses on the torii gate: its straw rope's tassels are thin enough for a tail to wrap (the posts are not), so a seahorse can hitch on the
// gate as on a plant. Two seahorses, three plants and the gate, four minutes of tank time: the grip finder accepts the gate, a seahorse holds
// on it some of the time, and the posed seahorse is never inside the gate. Needs the solo game on 8123.   OUT=dir node tools/torii_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/torii'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.evaluate(() => document.querySelector('#modal.on #mok')?.click());
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Brave'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2.6, z: 2.3, ry: 0 }, { id: 'p2', type: 'fern', x: 1.4, z: 2.4, ry: 0 }, { id: 'p3', type: 'sword', x: -1.6, z: -0.3, ry: 0 }, { id: 'to', type: 'torii', x: 0.6, z: 1.0, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const box = await p.evaluate(async () => { const I = await import('/src/w3/items.js'), it = I.buildItem('torii', 3); let bad = 0, n = 0; it.group.traverse((o) => { if (!o.isInstancedMesh) return; n++; for (const v of o.instanceMatrix.array) if (!Number.isFinite(v)) bad++; }); return { meshes: n, bad }; });
ck('every voxel of the gate, its rope and tassels has a real position (a bad one blackens the sand under it: the contact shadow is sized from the box)', box.meshes >= 2 && box.bad === 0, JSON.stringify(box));
const r = await p.evaluate(async () => {
  window.__simClock(true); const F = window.__fishes, hs = ['h1', 'h2'].map((id) => F.byId.get(id)); hs.forEach((h) => { h.isNight = false; });
  const q = (hs[0].getSpots?.() ?? []).find((x) => x.type === 'torii'), first = q ? hs[0].holdSpot(q) : null;
  const held = {}, n = { total: 0 }, at = [];
  for (let i = 0; i < 4 * 60 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    if (i >= 600) { n.total++; for (const h of hs) { const H = h.holdfast; if (H?.on || H?.settle) { held[H.id] = (held[H.id] ?? 0) + 1; if (H.id === 'to' && H.on && at.length < 40) at.push([+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)]); } } }
    if (i % 2000 === 0) await new Promise((res) => setTimeout(res, 0)); }
  const onGate = hs.findIndex((h) => h.holdfast?.on && h.holdfast.id === 'to');
  return { grip: first, held: Object.fromEntries(Object.entries(held).map(([k, v]) => [k, Math.round(100 * v / (2 * n.total))])), at: at.slice(0, 3), onGate: onGate >= 0 ? F.list.indexOf(hs[onGate]) : -1 }; });
console.log('  four minutes:', JSON.stringify(r));
ck('the grip finder accepts the gate (on a tassel, not a post: the posts are too thick for a tail)', !!r.grip && Math.abs(Math.abs(r.grip.x - 0.6) - 0.91) > 0.15, JSON.stringify(r.grip));
console.log(`  (with three plants to choose from, by chance over four minutes: ${r.held.to ?? 0}% of seahorse time on the gate; on the plants ${['p1', 'p2', 'p3'].map((k) => r.held[k] ?? 0).join(' / ')}%)`);
// the gate the only holdfast: a seahorse must go and take it (it comes from wherever it is, round the gate if it is behind it)
await p.evaluate(() => { window.__simClock(false); const s = window.__game.state; s.decor = s.decor.filter((d) => d.type === 'torii'); window.__game.emit('state'); }); await p.waitForTimeout(2500);
const r2 = await p.evaluate(async () => { window.__simClock(true); const F = window.__fishes, hs = ['h1', 'h2'].map((id) => F.byId.get(id)); hs.forEach((h) => { h.isNight = false; if (h.holdfast && h.holdfast.id !== 'to') { h.holdfast = null; h.retarget = 0; } });
  let on = 0, n = 0, front = 0, behind = 0; const q = (hs[0].getSpots?.() ?? []).find((x) => x.type === 'torii');
  for (let i = 0; i < 3 * 60 * 20; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    if (i >= 400) for (const h of hs) { n++; if (h.holdfast?.on && h.holdfast.id === 'to') { on++; if (h.pos.z > q.z) front++; else behind++; } }
    if (i % 2000 === 0) await new Promise((res) => setTimeout(res, 0)); }
  return { on: Math.round(100 * on / n), front, behind }; });
ck('with the gate the only holdfast, the seahorses take it', r2.on >= 10, `${r2.on}% of the two seahorses' time on the gate (two never share one holdfast, so 50% is one of them on it all along; between holds they swim)`);
ck('holding on it, a seahorse is in front of the gate, toward the glass (not behind it, hidden by the beams)', r2.front > 0 && r2.behind === 0, `body in front ${r2.front}, behind ${r2.behind} samples`);
if (r.onGate >= 0) { await p.evaluate((i) => window.__focus(i), r.onGate); await p.waitForTimeout(2500); }
await p.screenshot({ path: `${out}/torii.png`, timeout: 90000 }).catch(() => {});
const sandOk = await p.evaluate(() => { const c = document.querySelector('canvas'); return !!c; });
ck('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
console.log(fails ? `${fails} failed` : 'Torii checks passed'); await b.close(); process.exit(fails ? 1 : 0);
