// Where the fish keep: the open-water and midwater kinds should spend most of their time in the upper part of the tank, so the sand (the octopus,
// the crabs, the decorations) is not crowded; the bottom kinds (goby, dragonet) stay low because that is their nature; a father guarding eggs
// stays by them; a small youngster keeps near cover. Measured over four simulated minutes with no food in the water. Needs the solo game on 8123.
// OUT=dir node tools/height_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/height'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, born = now - 40 * D; s.flags.tut = 5; s.level = 8; s.fish.length = 0;
  const mk = (id, name, species, traits, x = {}) => ({ id, name, species, seed: id.charCodeAt(0) * 7 + id.length, born, stage: 'adult', traits, happy: 0.9, health: 1, fedAt: now, ...x });
  s.fish.push(mk('a1', 'Nemo', 'goldfish', ['Brave'], { sex: 'm' }), mk('a2', 'Pearl', 'goldfish', ['Calm'], { sex: 'f' }), mk('b1', 'Sky', 'neon', ['Social']), mk('b2', 'Mist', 'neon', ['Curious']), mk('c1', 'Dusty', 'guppy', ['Playful']),
    mk('d1', 'Ruby', 'platy', ['Shy']), mk('e1', 'Violet', 'blue', ['Curious']), mk('f1', 'Rosy', 'danio', ['Calm']), mk('g1', 'King', 'angelfish', ['Calm']), mk('h1', 'Sandy', 'cory', ['Lazy']), mk('i1', 'Mandy', 'betta', ['Curious']),
    mk('j1', 'Pip', 'neon', ['Social'], { born: now - 3 * D, stage: 'baby' }), mk('o1', 'Inky', 'octopus', ['Curious']));
  s.decor.length = 0; s.decor.push({ id: 'an', type: 'anemone', x: -2.2, z: 1.2, ry: 0, at: born }, { id: 'rk', type: 'rock', x: 2.4, z: 0.8, ry: 0, at: born }, { id: 'gr', type: 'grass', x: 0.4, z: 0.2, ry: 0, at: born }, { id: 'fn', type: 'fern', x: -0.9, z: 1.6, ry: 0, at: born }, { id: 'cc', type: 'coconut', x: 3.2, z: -1.2, ry: 0, at: born });
  s.eggs = [{ id: 'e1', species: 'goldfish', a: 'a2', b: 'a1', seed: 5, laid: now - D, hatchAt: now + 2 * D, cared: [1], guard: 'a1' }];
  g.emit('state'); });
for (let k = 0; k < 6; k++) { await p.waitForTimeout(700); await p.evaluate(() => document.querySelector('#modal.on #mok')?.click()); }
const R = await p.evaluate(async () => { const F = window.__fishes, eg = [...(window.__eggs?.values() ?? [])][0], P = eg?.group.position; let t = 100; const n = {}, up = {}, low = {}, near = {}, ov = { n: 0, pairs: 0 }, kinds = {}, ys = {}, moods = {}, dad = {};
  await new Promise((q) => setTimeout(q, 1500));
  for (let i = 0; i < 4800; i++) { t += 0.05; F.update(0.05, t); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); if (eg && window.__eggCare) window.__eggCare(eg, 0.05, t);
    if (i < 600) continue;      // (the first thirty seconds: everyone settling where it was put)
    const L = F.list.filter((f) => !f.dead && f.fid && f.species.move !== 'jet'); ov.n++;
    for (let a = 0; a < L.length; a++) { const f = L[a], k = f.fid; n[k] = (n[k] ?? 0) + 1; kinds[k] = f.sk; (ys[k] ||= []).push(+f.pos.y.toFixed(1)); if (f.hiding) moods[k] = (moods[k] ?? 0) + 1; if (f.pos.y >= 6) up[k] = (up[k] ?? 0) + 1; if (f.pos.y < 3) low[k] = (low[k] ?? 0) + 1; if (P && Math.hypot(f.pos.x - P.x, f.pos.y - P.y, f.pos.z - P.z) < 1.8) near[k] = (near[k] ?? 0) + 1; if (f.fid === 'a1') { const st = (eg?.care?.s ?? '?') + (f.seeking ? '+seeking' : '') + (f.guarding ? '' : '+notguarding') + '@' + f.target.y.toFixed(0); dad[st] = (dad[st] ?? 0) + 1; }
      for (let c = a + 1; c < L.length; c++) { const o = L[c]; const dd = Math.hypot(f.pos.x - o.pos.x, f.pos.y - o.pos.y, (f.pos.z - o.pos.z) * 1.6); if (dd < (f.radius + o.radius) * 0.55) ov.hard = (ov.hard ?? 0) + 1; if (dd < (f.radius + o.radius) * 0.9) { ov.pairs++; const key = f.fid + '+' + o.fid; ov[key] = (ov[key] ?? 0) + 1; } } }
    if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); }
  const pct = (m, k) => Math.round(100 * (m[k] ?? 0) / n[k]); const rows = Object.keys(n).map((k) => ({ id: k, kind: kinds[k], mood: F.list.find((f) => f.fid === k)?.well?.mood?.[0] ?? '', hiding: moods[k] ?? 0, r: +(F.list.find((f) => f.fid === k)?.radius ?? 0).toFixed(2), up: pct(up, k), low: pct(low, k), near: pct(near, k), mid: ys[k].sort((a, b) => a - b)[ys[k].length >> 1] }));
  const who = Object.entries(ov).filter(([k]) => k.includes('+')).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${Math.round(100 * v / ov.n)}%`); return { rows, dad, frames: ov.n, overlap: +(ov.pairs / ov.n).toFixed(2), hard: +((ov.hard ?? 0) / ov.n).toFixed(2), who, eggY: P ? +P.y.toFixed(2) : null }; });
console.log('  four minutes:', JSON.stringify(R));
const row = (id) => R.rows.find((r) => r.id === id), openKinds = ['b1', 'b2', 'c1', 'f1', 'g1'], midKinds = ['a2'];
ck('the open-water kinds (chromis, damsel, anthias, angelfish) keep to the upper part of the tank', openKinds.every((id) => row(id).up >= 55), openKinds.map((id) => `${row(id).kind} ${row(id).up}%`).join(', '));
ck('the clownfish off duty is up far more than it is down', midKinds.every((id) => row(id).up > row(id).low), midKinds.map((id) => `${row(id).kind} up ${row(id).up}% low ${row(id).low}% (${row(id).mood || 'content'}, hiding ${Math.round(100 * row(id).hiding / (R.frames || 1))}% of frames)`).join(', '));
ck('the bottom and cover kinds keep to their places: the goby on the sand, the dragonet and the gramma about the rocks, the cardinalfish in the shade (never the upper water)', row('h1').low >= 50 && row('h1').up < 10 && row('i1').up < 20 && row('i1').mid <= 4 && row('e1').up < 25 && row('d1').up < 35, ['h1', 'i1', 'e1', 'd1'].map((id) => `${row(id).kind} low ${row(id).low}% up ${row(id).up}% median ${row(id).mid}`).join(', '));
ck('the father guarding the eggs stays by them', row('a1').near >= 55, `${row('a1').near}% within 1.8 of the eggs; his frames: ${JSON.stringify(R.dad)}`);
console.log(`  (the baby chromis, let down to cover if it wants: up ${row('j1').up}% low ${row('j1').low}%)`);      // (a small one is not held up by the open-water floor; where it goes is its own business)
ck('fish do not sit on top of each other (pairs closer than half their two radii)', R.hard < 0.2, `${R.hard} intersecting pairs per frame; ${R.overlap} pairs within a body length (shoalmates, friends): ${R.who.slice(0, 3).join(', ')}`);
await p.screenshot({ path: `${out}/heights.png`, timeout: 90000 }).catch(() => {});
ck('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
console.log(fails ? `${fails} failed` : 'Height checks passed'); await b.close(); process.exit(fails ? 1 : 0);
