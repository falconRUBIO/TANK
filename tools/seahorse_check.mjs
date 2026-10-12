// Two seahorses in a planted tank, left alone for four minutes of tank time: do they behave like seahorses? Anchored by the tail most of
// the time, on their own holdfasts, coming back to a favourite, snapping up plankton, each eye looking its own way, the tail trailing when
// they swim and coiled when they hold on, taking on a little of the holdfast's colour. Close-ups at the end. Needs the solo game on 8123.
// node tools/seahorse_check.mjs OUTDIR
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/seahorse'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'h1', name: 'Sunny', species: 'seahorse', seed: 4, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }, { id: 'h2', name: 'Pearl', species: 'seahorse', seed: 11, born, stage: 'adult', traits: ['Shy'], happy: 0.8, health: 1 }, { id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Brave'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2.6, z: 2.3, ry: 0 }, { id: 'p2', type: 'fern', x: 1.2, z: 2.4, ry: 0 }, { id: 'p3', type: 'sword', x: -1.0, z: -0.3, ry: 0 }, { id: 'p4', type: 'brain', x: 2.6, z: 2.2, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const T = await import('/src/w3/terrain.js'), F = window.__fishes, hs = ['h1', 'h2'].map((id) => F.byId.get(id)); hs.forEach((h) => { h.isNight = false; });
  const n = { held: [0, 0], swim: [0, 0], total: 0, snicks: [0, 0], holds: [new Set(), new Set()], same: 0, eyesApart: 0, eyesN: 0, curlHeld: [], curlSwim: [], tint: 0, thoughts: new Set(), sunk: 0 };
  for (let i = 0; i < 4 * 60 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); n.total++;
    hs.forEach((h, k) => { const on = h.holdfast?.on || h.holdfast?.settle; /* settling on is the tail taking hold */ if (on) { n.held[k]++; n.holds[k].add(h.holdfast.id); n.curlHeld.push(h.curlK); } else if (h.vel.length() > 0.12) { n.swim[k]++; if (!(h.tuckT > 0) && !(h.releaseT > 0) && (!h.holdfast || h.pos.distanceTo(h.target) > 1.7)) n.curlSwim.push(h.curlK); /* travelling in open water, not tucking past a plant or curling ready at its stem */ } if (h.thought) n.thoughts.add(h.thought); if (h.pos.y - T.sandH(h.pos.x, h.pos.z) < 0.3) n.sunk++; n.tint = Math.max(n.tint, h.tintK ?? 0); });
    if (hs[0].holdfast?.on && hs[1].holdfast?.on && hs[0].holdfast.id === hs[1].holdfast.id) n.same++;
    const e1 = hs[0].eyeL, e2 = hs[0].eyeR; if (e1 && e2) { n.eyesN++; if (Math.abs(e1.tx - e2.tx) + Math.abs(e1.ty - e2.ty) > 0) n.eyesApart++; }
    if (i % 2000 === 0) await new Promise((q) => setTimeout(q, 0)); }
  const avg = (a) => a.length ? a.reduce((s, c) => s + c, 0) / a.length : NaN;
  return { held: n.held.map((x) => Math.round(100 * x / n.total)), swim: n.swim.map((x) => Math.round(100 * x / n.total)), snicks: hs.map((h) => h.snicks ?? 0), holds: n.holds.map((s) => [...s]), fav: hs.map((h) => h.favHold ?? null), favEarned: hs.map((h) => !h.favHold || (h.memOf(h.favHold).secs >= 120 && h.memOf(h.favHold).visits >= 2)), same: n.same, eyesApart: Math.round(100 * n.eyesApart / Math.max(1, n.eyesN)), curlHeld: +avg(n.curlHeld).toFixed(2), curlSwim: +avg(n.curlSwim).toFixed(2), tint: +n.tint.toFixed(2), thoughts: [...n.thoughts], sunk: n.sunk };
});
console.log('  four minutes:', JSON.stringify(r));
ck('each seahorse spends most of its time anchored by its tail', r.held.every((x) => x >= 50), `${r.held}% of the time`);
ck('they swim between holdfasts too, slowly', r.swim.every((x) => x > 0 && x < 40), `${r.swim}% of the time swimming`);
ck('each uses more than one holdfast, and a favourite is earned, never handed out (two visits, two minutes held)', r.holds.every((h) => h.length >= 2) && r.favEarned.every(Boolean), JSON.stringify({ holds: r.holds, fav: r.fav }));
ck('two seahorses never hold on to the same stem at once', r.same === 0, `${r.same} frames`);
ck('they snap up plankton every so often', r.snicks.every((x) => x >= 6), `${r.snicks} snaps`);
ck('each eye looks its own way much of the time', r.eyesApart >= 40, `${r.eyesApart}% of the time the eyes look different ways`);
ck('the tail coils tight to hold on and trails out to swim', r.curlHeld > 0.8 && r.curlSwim < -0.2, `holding ${r.curlHeld}, swimming ${r.curlSwim}`);
ck('it takes on a little of its holdfast\'s colour', r.tint >= 0.15, `${r.tint}`);
ck('its card says what it is doing', r.thoughts.some((t) => /with its tail/.test(t)) && r.thoughts.some((t) => /plankton/.test(t)), JSON.stringify(r.thoughts.slice(0, 6)));
ck('it never sinks into the sand', r.sunk === 0, `${r.sunk}`);
// close-ups: holding on, and swimming
const look = async (name, want) => { await p.evaluate((want) => { const F = window.__fishes, h = F.byId.get('h1'); for (let i = 0; i < 2400; i++) { F.update(0.05, (window.__t += 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); const on = !!h.holdfast?.on; if (want === 'hold' ? on && h.holdfast.held > 3 : !on && h.vel.length() > 0.15) break; } window.__cam = [h.pos.x + 0.4, h.pos.y + 0.4, h.pos.z + 4.2, h.pos.x, h.pos.y - 0.1, h.pos.z]; }, want); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${name}.png` }); };
await look('holding', 'hold'); await look('swimming', 'swim');
await p.evaluate(() => { window.__cam = null; }); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/tank.png` });
// holding tails: two that have shared the tank for days link tails now and then; one that arrived today does not
const tl = await p.evaluate(async () => {
  const F = window.__fishes, [a, b] = ['h1', 'h2'].map((id) => F.byId.get(id)), step = (n) => { for (let i = 0; i < n; i++) { const t = (window.__t = (window.__t ?? 0) + 0.05); F.update(0.05, t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); F.observe(0.05, t); } };
  a.unlink?.(); a.linkCool = 0; b.linkCool = 0; a.linkWith(b, { x: 0, y: 6, z: 1 }, 60); step(20 * 25);
  const on = !!(a.link?.on && b.link?.on), gap = +a.pos.distanceTo(b.pos).toFixed(2), facing = Math.cos(a.heading) > 0.8 && Math.cos(b.heading) < -0.8 && a.pos.x < b.pos.x, curl = [a.curlK, b.curlK].map((v) => +v.toFixed(2)), thought = a.thought;
  F.drop(0, 7); step(20 * 4); const parted = !a.link && !b.link;
  // a newcomer: the same pair, but one of them only just arrived
  a.unlink?.(); const was = b.bornAt; b.bornAt = Date.now() - 3600e3; a.linkCool = b.linkCool = 0; let linkedNew = 0; step(20 * 60 * 3); linkedNew = a.link || b.link ? 1 : 0; b.bornAt = was;
  return { on, gap, facing, curl, thought, parted, linkedNew, r: +a.radius.toFixed(2) };
});
console.log('  tails:', JSON.stringify(tl));
ck('two seahorses that know each other hold tails: they meet, face each other and curl up', tl.on && tl.facing && tl.curl.every((c) => c > 0.8) && /Holding tails/.test(tl.thought), JSON.stringify(tl));
ck('side by side, not inside each other', tl.gap > tl.r * 0.45 && tl.gap < tl.r * 1.2, `${tl.gap} apart`);
ck('food in the water and they let go', tl.parted);
ck('one that only just arrived does not hold tails yet', tl.linkedNew === 0);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Seahorse checks passed'); await b.close(); process.exit(fails ? 1 : 0);
