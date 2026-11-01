// The animals' day, in the real game: lights on and they wake one by one (the lazy last), stretching; a usual mealtime and they gather at the surface,
// Care saying so; the last hour before lights-out the day fish wind down while the cardinalfish comes out; lights out and each settles at its own time,
// colors fading into night coloration, the mandarin down on the sand; asleep, nobody picks them for a chase. The routine's clocks are stepped directly (routine.tick)
// because a headless browser renders about one frame a second.   Needs the solo game on 8123.   node tools/routine_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/routine'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=morning&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 30 * D, stage: 'adult', happy: 0.9, health: 1 }; s.flags.tut = 5; s.level = 6; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.fish.length = 0;
  s.fish.push({ ...A, id: 'g1', name: 'Goldie', species: 'goldfish', seed: 3, sex: 'f', traits: ['Brave'] }, { ...A, id: 'g2', name: 'Doze', species: 'goldfish', seed: 8, sex: 'm', traits: ['Lazy'] }, { ...A, id: 'n1', name: 'Neo', species: 'neon', seed: 5, sex: 'f', traits: ['Calm'] },
    { ...A, id: 'b1', name: 'Siam', species: 'betta', seed: 11, sex: 'm', traits: ['Calm'] }, { ...A, id: 'c1', name: 'Corky', species: 'platy', seed: 13, sex: 'f', traits: ['Curious'] });
  s.decor.length = 0; s.decor.push({ id: 'r1', type: 'rock', x: 2, z: -0.4, ry: 0 }, { id: 'p1', type: 'grass', x: -2.6, z: -0.6, ry: 0 }); s.hunger = 0.05; s.lastFed = now - 3600e3; s.water = 1; s.glass = 0; g.emit('state');
  for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(3000);
const look = () => p.evaluate(() => Object.fromEntries(window.__fishes.list.filter((f) => !f.dead).map((f) => [f.name, { night: !!f.isNight, sleepy: !!f.sleepy, pale: +(f.pale ?? 0).toFixed(2), roll: f.poseRoll ?? null, th: f.thought ?? '' }])));
const step = (sec) => p.evaluate((sec) => { const R = window.__fishes.routine; for (let i = 0; i < sec * 4; i++) R.tick(0.25); }, sec);
// lights on
await p.evaluate(() => window.__lightsOn()); await p.waitForTimeout(300); await step(3);
let L = await look(); ck('lights off first: every day fish asleep, colors faded', ['Goldie', 'Doze', 'Neo', 'Siam'].every((n) => L[n].sleepy && L[n].pale > 0.1), L);
ck('the cardinalfish (a night feeder) is not a day sleeper', !L.Corky.sleepy, L.Corky);
await p.waitForTimeout(2200); const woke = {}; let lines = [];
for (let sec = 1; sec <= 60; sec++) { await step(1); L = await look(); for (const [n, x] of Object.entries(L)) if (!x.night && woke[n] == null && n !== 'Corky') { woke[n] = sec; lines.push(x.th); } if (sec === 6) await p.screenshot({ path: `${out}/1-waking.png`, timeout: 180000 }); }
const ws = Object.values(woke); ck('they wake one by one, not all at once', ws.length === 4 && Math.max(...ws) - Math.min(...ws) >= 6, woke);
ck('the brave one is up before the lazy one', woke.Goldie < woke.Doze, woke);
ck('waking shows: a stretch line as each one wakes', lines.length === 4 && lines.every((t) => /stretch|Coming round|rising|yawn/i.test(t)), lines);
await step(10); L = await look(); ck('a minute on, everyone is up and their colors are back', ['Goldie', 'Doze', 'Neo', 'Siam'].every((n) => !L[n].night && !L[n].sleepy && L[n].pale < 0.05), L);
// mealtime
const meal = await p.evaluate(async () => { const g = window.__game, s = g.state, F = window.__fishes; s.feedHrs = Array(24).fill(0); s.feedHrs[8] = 4; s.feedHrs[9] = 0.6; s.hunger = 0.45; s.lastFed = Date.now() - 6 * 3600e3; g.emit('state'); F.routine.slow = 0; F.routine.tick(0.25);
  const E = F.routine.expect; let up = 0, says = ''; for (const f of F.list) { if (f.dead || f.sk === 'platy') continue; f.retarget = 0; f.idle = 0; f.restK = 0; for (let i = 0; i < 6; i++) { f.pick(Math.random); if (f.target.y >= 9 && /nearly/.test(f.thought ?? '')) { up++; says = f.thought; break; } } }
  window.__ui.open('care'); await new Promise((r) => setTimeout(r, 900)); const row = [...document.querySelectorAll('#sheet .crow, #sheet .mrow')].map((r) => r.textContent.replace(/\s+/g, ' ')).find((t) => /surface|could use food/.test(t)) ?? ''; window.__ui.open('tank');
  return { E, up, says, row }; });
ck('fed around 8 most days: at 8 they expect breakfast', meal.E?.at >= 8 && meal.E?.at < 9.5, meal.E);
ck('they gather up at the surface where the food falls', meal.up >= 3, meal);
ck('and say why', /nearly breakfast/.test(meal.says), meal.says);
ck('Care says it too', /Waiting at the surface: they know it's breakfast time/.test(meal.row), meal.row);
const fed = await p.evaluate(() => { const s = window.__game.state; s.lastFed = Date.now(); s.hunger = 0.1; const R = window.__fishes.routine; R.slow = 0; R.tick(0.25); return R.expect; }); ck('once fed, the waiting is over', fed === null, fed);
// dusk
const dusk = await p.evaluate(() => { window.__routineHour = 20.5; const F = window.__fishes, R = F.routine; R.slow = 0; R.tick(0.25); const c = F.list.find((f) => f.sk === 'platy'), g = F.list.find((f) => f.name === 'Goldie'); let cy = 9, cth = ''; for (let i = 0; i < 12 && !/Dusk/.test(cth); i++) { c.restK = 0; c.idle = 0; c.pick(Math.random); cth = c.thought ?? ''; cy = c.target.y; } let wind = ''; for (let i = 0; i < 12 && !/Winding down/.test(wind); i++) { g.restK = 0; g.idle = 0; g.pick(Math.random); wind = g.thought ?? ''; }
  return { dusk: R.dusk, cory: cth, coryY: +cy.toFixed(2), wind, slow: +(g.tmul / (g.baseT ?? 1)).toFixed(2) }; });
ck('the last hour before lights-out is dusk', dusk.dusk, dusk); ck('the cardinalfish comes out of the shade into open water at dusk', /Dusk/.test(dusk.cory) && dusk.coryY > 2.5, dusk); ck('the day fish wind down near where they sleep, a little slower', /Winding down/.test(dusk.wind) && dusk.slow < 1, dusk);
// lights out
await p.evaluate(() => { window.__routineHour = 23; window.__fishes.setNight(true); }); await step(1); L = await look();
ck('lights out: not everyone asleep at once', ['Goldie', 'Doze', 'Neo', 'Siam'].some((n) => !L[n].sleepy), L);
await step(80); L = await look();
ck('soon all the day fish are asleep', ['Goldie', 'Doze', 'Neo', 'Siam'].every((n) => L[n].sleepy), L);
ck('night coloration: the chromis goes duller than the clownfish', L.Neo.pale >= 0.3 && L.Neo.pale > L.Goldie.pale, { Neo: L.Neo.pale, Goldie: L.Goldie.pale });
{ const md = await p.evaluate(() => { const F = window.__fishes, f = F.list.find((x) => x.sk === 'betta'); f.restK = 0; f.idle = 0; f.retarget = 0; let th = ''; for (let i = 0; i < 12 && !/sand/.test(th); i++) { f.pick(Math.random); th = f.thought ?? ''; } return { th, y: +f.target.y.toFixed(2), roll: f.poseRoll, pitch: f.posePitch }; }); ck('the mandarin sleeps down on the sand, level on its fins', /sand/.test(md.th) && md.y < 1 && md.roll === 0 && md.pitch === 0, md); }
const enc = await p.evaluate(() => { const E = window.__enc; return window.__fishes.list.filter((f) => !f.dead && f.sleepy).map((f) => E.free(f)); }); ck('asleep, nobody picks them for a chase', enc.length >= 4 && enc.every((x) => !x), enc);
await p.evaluate(() => { window.__cam = [0, 5, 13, 0, 3, 0]; }); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/2-asleep.png`, timeout: 180000 });
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Routine checks passed'); process.exit(fails ? 1 : 0);
