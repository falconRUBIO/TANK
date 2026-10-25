// Parents and eggs, in the tank: a clownfish father guards his clutch and drives the octopus off; it backs away and keeps clear, and only tries
// again when he has left; a cardinalfish father carries his eggs in his mouth and eats nothing. Needs the solo game on 8123. node tools/egg_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('crash', () => console.log('  (the page crashed)')); pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) console.log('  console:', m.text().slice(0, 200)); }); b.on('disconnected', () => console.log('  (the browser went away)'));
await pg.goto('http://localhost:8123/?q=0&dev=1&tod=afternoon'); await pg.waitForSelector('#modal.on #mok', { timeout: 120000 }); await pg.click('#mok'); await pg.waitForFunction(() => window.__game?.state); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const g = window.__game, s = g.state, D = 864e5, now = Date.now(); s.flags.tut = 5; s.level = 9;
  s.fish = [['p0', 'Marlin', 'm', 'goldfish'], ['p1', 'Coral', 'f', 'goldfish'], ['o1', 'Inky', null, 'octopus']].map(([id, name, sex, species], i) => ({ id, name, species, seed: 5 + i, ...(sex ? { sex } : {}), born: now - 20 * D, stage: 'adult', traits: ['Brave'], happy: 1, health: 1, fedAt: now }));
  s.decor = [{ id: 'g1', type: 'grass', x: 0.5, z: 0.2, ry: 0, at: now - D }, { id: 'c1', type: 'coconut', x: -3, z: 1.4, ry: 0, at: now - D }];
  s.eggs = [{ id: 'e1', species: 'goldfish', a: 'p1', b: 'p0', seed: 5, laid: now - D, hatchAt: now + 2 * D, cared: [1], guard: 'p0' }];
  g.emit('state'); }, null);
for (let k = 0; k < 6; k++) { await pg.waitForTimeout(700); if (await pg.$('#modal.on #mok')) await pg.evaluate(() => document.querySelector('#modal.on #mok')?.click()); }
const r = await pg.evaluate(async () => { const F = window.__fishes, eg = [...window.__eggs.values()][0], P = eg.group.position, G = F.byId.get('p0'), o = F.byId.get('o1'), log = []; let t = 100, last = '';
  await new Promise((q) => setTimeout(q, 3000));
  o.pos.set(P.x + 3.2, o.pos.y, P.z + 0.3); o.inspect = { x: P.x, z: P.z };      // it goes for the eggs
  const D = (a) => Math.hypot(a.pos.x - P.x, a.pos.z - P.z);
  for (let i = 0; i < 6000; i++) { t += 0.05;
    if (i === 3000) { const m = eg.care.octo.o1; m.probeAt = 0; }      // later: time for another look (he is there)
    if (i === 4200) { const m = eg.care.octo.o1; m.probeAt = 0; G.pos.set(P.x + 4, 9, P.z); G.seeking = true; }      // and once while he is off eating
    F.update(0.05, t); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); if (i > 4200 && i < 4300) G.seeking = true; { const m = eg.care?.octo?.o1; if (m?.strikes && !window.__firstAt) window.__firstAt = i; if (window.__firstAt && i > window.__firstAt + 300 && i < window.__firstAt + 1500) window.__clearMin = Math.min(window.__clearMin ?? 99, D(o)); } window.__eggCare(eg, 0.05, t);
    if (i % 20 === 0) { await new Promise((q) => setTimeout(q, 0)); const s = `${(o.memText ?? "").slice(0, 40)} st=${o.st?.s}/${o.st?.mode ?? ""} strikes=${eg.care?.octo?.o1?.strikes ?? 0}`; if (s !== last || i % 200 === 0) { log.push(`${(i * 0.05).toFixed(0)}s octo ${D(o).toFixed(1)} dad ${D(G).toFixed(1)} :: ${s}`); last = s; } } }
  const m = eg.care.octo.o1; return { strikes: m.strikes, eggs: window.__game.state.eggs.length, log, clearMin: window.__clearMin ?? 99 }; });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const D = r.dist ?? [];
ck('the father charges the octopus away from the eggs', r.strikes >= 1, `${r.strikes} times`);
ck('it is not chased over and over (one fight per visit)', r.strikes <= 6, `${r.strikes}`);
ck('after being driven off it keeps well clear for a while', r.clearMin >= 2.0, `closest ${r.clearMin?.toFixed?.(1)} in the minute after`);
ck('a guarded clutch is never taken', r.eggs === 1);
ck('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Egg checks passed'); process.exit(fails ? 1 : 0);
