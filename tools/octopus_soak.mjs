// A realistic tank, left alone for twenty minutes of tank time: how often does the octopus actually do each of the things it can do?
// Counts acts, walks, shell moves, den visits, startles, throws and swims, and the share of time in each state. Needs the solo game on 8123.
// node tools/octopus_soak.mjs [minutes]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const MIN = +(process.argv[2] || 20);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && /^(fish|tank|frame|sync|water change) error/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.fish.length = 0; const born = Date.now() - 12 * 864e5;
  s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1', movedAt: 0, crabs: 3 });
  s.fish.push({ id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, born, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1 }, { id: 'g2', name: 'Miso', species: 'blue', seed: 4, born, stage: 'adult', traits: ['Brave'], happy: 0.8, health: 1 }, { id: 'g3', name: 'Pip', species: 'guppy', seed: 6, born, stage: 'adult', traits: ['Playful'], happy: 0.8, health: 1 });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 2.4, z: 1.5, ry: 0 }, { id: 'g1', type: 'grass', x: -2.6, z: 2.2, ry: 0 }, { id: 'f1', type: 'fern', x: 0.6, z: 2.4, ry: 0 }, { id: 'r1', type: 'rock', x: -1.2, z: 0.8, ry: 0 }, { id: 'r2', type: 'rock', x: -3.4, z: 1.0, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(2500);
const log = await p.evaluate(async (MIN) => {
  const F = window.__fishes, f = F.list[0]; f.isNight = false; f.shy = false; f.restFor = 10;
  const n = { acts: {}, gaits: {}, tasks: {}, den: 0, startle: 0, throw: 0, jets: 0, hops: 0, inspect: 0, glass: 0 }, time = {}, texts = new Set();
  let last = null, lastG = null, lastS = null, tuckWas = 0, scareWas = 0, lastText = null, lastHop = 0, lastInspect = null, lastMode = null;
  const origBegin = F.beginTask.bind(F); F.beginTask = (ff, pl) => { n.tasks[pl.kind] = (n.tasks[pl.kind] ?? 0) + 1; return origBegin(ff, pl); };
  const steps = MIN * 60 * 20, GNAME = { 1: 'stroll', 0.6: 'creep', 1.35: 'stilt', 1.1: 'bounce' };
  for (let i = 0; i < steps; i++) {
    if (i % 12000 === 0 && i > 0) { f.movedAt = 0; f.homeMovedAt = 0; }                         // the ten-minute gap between shell moves runs on the clock: let it pass every ten minutes of tank time
    F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list));
    const S = f.st; const s = S?.s; time[s] = (time[s] ?? 0) + 0.05;
    if (f.act && f.act !== last) n.acts[f.act] = (n.acts[f.act] ?? 0) + 1; last = f.act;
    if (s === 'crawl' && f.gait && f.gait !== lastG) { const g = GNAME[f.gait.stride] ?? '?'; n.gaits[g] = (n.gaits[g] ?? 0) + 1; } lastG = s === 'crawl' ? f.gait : null;
    if (s === 'jet' && lastS !== 'jet') { n.jets++; if (S.after) n.hops++; } lastS = s;
    if ((S?.mode === 'den' || S?.mode === 'denfront') && lastMode !== 'den' && lastMode !== 'denfront') n.den++; if ((f.tuckK ?? 0) > 0.2 && tuckWas <= 0.2) n.tucked = (n.tucked ?? 0) + 1; tuckWas = f.tuckK ?? 0;
    if (f.scareT > 0 && scareWas <= 0) n.startle++; scareWas = f.scareT;
    if (f.actText && f.actText !== lastText) { texts.add(f.actText); if (/Threw|Flung|Squirted/.test(f.actText)) n.throw++; } lastText = f.actText;
    { let nearH = 1e9, quick = false; for (const o of F.list) { if (o === f || o.dead || o.species.move === 'jet') continue; const h = Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z), dy = Math.abs(o.pos.y - f.pos.y); if (dy < 3.2 && h < nearH) nearH = h; if (h < 1.8 && dy < 2.4 && o.vel.length() > 0.7) quick = true; }
      n.near2 = (n.near2 ?? 0) + (nearH < 2.2 ? 0.05 : 0); n.near1 = (n.near1 ?? 0) + (nearH < 1.5 ? 0.05 : 0); n.quick = (n.quick ?? 0) + (quick ? 0.05 : 0); }
    if (S?.mode === 'inspect' && lastMode !== 'inspect') n.inspect++; if (S?.s === 'glass' && lastS !== 'glass') n.glass++; lastMode = S?.mode;
    if (i % 2000 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const total = Object.values(time).reduce((a, c) => a + c, 0); for (const k in time) time[k] = +(100 * time[k] / total).toFixed(1);
  return { ...n, time, texts: [...texts], den_home: f.den?.home ?? null, shell: window.__game.state.decor.find((d) => d.id === 'c1') };
}, MIN);
console.log(`  ${MIN} minutes of tank time`);
console.log('  acts     ', JSON.stringify(log.acts)); console.log('  walks    ', JSON.stringify(log.gaits)); console.log('  shell    ', JSON.stringify(log.tasks), 'now at', JSON.stringify([+log.shell.x.toFixed(2), +log.shell.z.toFixed(2), +(log.shell.ry ?? 0).toFixed(2)]));
console.log(`  a fish within 2.2 of it (and not far above) for ${log.near2.toFixed(0)} s, within 1.5 for ${log.near1.toFixed(0)} s, a quick one close by for ${log.quick.toFixed(1)} s`);
console.log(`  den visits ${log.den} · startles ${log.startle} · throws ${log.throw} · swims ${log.jets} (hops ${log.hops}) · inspections ${log.inspect} · glass ${log.glass}`);
console.log('  time     ', JSON.stringify(log.time)); console.log('  card said', JSON.stringify(log.texts));
const acts = Object.values(log.acts).reduce((a, c) => a + c, 0), kinds = Object.keys(log.acts).length;
ck('it does something worth watching about once a minute, of at least five kinds', acts >= MIN * 0.6 && kinds >= 5, `${acts} acts, ${kinds} kinds`);
ck('it walks in at least three different ways', Object.keys(log.gaits).length >= 3, JSON.stringify(log.gaits));
ck('it moves its shell: a turn or a carry at least once', (log.tasks.turn ?? 0) + (log.tasks.home ?? 0) >= 1, JSON.stringify(log.tasks));
ck('it goes home to its shell at least twice', log.den >= 2, `${log.den} trips, tucked in ${log.tucked ?? 0}`);
ck('it swims at least ten times', log.jets >= 10, `${log.jets}`);
ck('it is startled by a fish at least once', log.startle >= 1, `${log.startle}`);
ck('it throws something at a fish now and then, not all the time', log.throw >= 1 && log.throw <= 8, `${log.throw}`);
ck('it is not resting more than two thirds of the time', (log.time.rest ?? 0) < 67, `rest ${log.time.rest}%`);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Soak checks passed'); await b.close(); process.exit(fails ? 1 : 0);
