// The octopus and its coconut shell: it goes in through the mouth of the shell (never through the wall), the shell lifts and tips as it goes under, and with something in its way
// it steps around it or gives up, never pushing against it for ever. Steps the simulation by hand. Needs the solo game on 8123. OUT=dir node tools/octopus_den.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/den'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.fish.length = 0; s.fish.push({ id: 'x1', name: 'Inky', species: 'octopus', seed: 5, born: Date.now() - 12 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, owner: 'me', ownerName: 'You', home: 'c1' });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: 0.4, z: 1.5, ry: 0 }, { id: 'b1', type: 'boulder', x: -2.0, z: 1.5, ry: 0 }); g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,header,nav,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const step = (n, dt = 0.05) => p.evaluate(([n, dt]) => { const F = window.__fishes; for (let i = 0; i < n; i++) { F.update(dt, (window.__t = (window.__t ?? 0) + dt)); F.list.forEach((f) => f.update(dt, Math.random, F.list)); } }, [n, dt]);
const state = () => p.evaluate(() => { const f = window.__fishes.list[0], it = [...window.__decor.items.values()].find((x) => x.type === 'coconut'), [gx, gz] = f.denGoal(Math.random); return { x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2), vx: +f.vel.x.toFixed(3), vz: +f.vel.z.toFixed(3), s: f.st?.s, mode: f.st?.mode, dist: +Math.hypot(f.pos.x - gx, f.pos.z - gz).toFixed(2), shellY: +it.group.position.y.toFixed(3), tilt: +it.group.rotation.x.toFixed(3), den: f.den?.kind, home: !!f.den?.home, tuck: +(f.tuckK ?? 0).toFixed(2) }; });
const cam = (x, z) => p.evaluate(([x, z]) => { window.__cam = [x + 1.2, 2.2, z + 8.5, x + 0.3, 0.5, z]; }, [x, z]);
const shot = async (n) => { await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${n}.png` }); };
// how it moves: count the turnarounds (velocity flipping against its previous direction while moving), the signature of pushing against something over and over
const run = async (secs, label) => { let prev = null, flips = 0, frames = 0; const trail = []; for (let i = 0; i < secs * 4; i++) { await step(5, 0.05); const st = await state(); trail.push(st); const v = [st.vx, st.vz], m = Math.hypot(...v); if (prev && m > 0.08 && Math.hypot(...prev) > 0.08 && (v[0] * prev[0] + v[1] * prev[1]) < -0.3 * m * Math.hypot(...prev)) flips++; prev = v; frames++; if (label === 'den' && st.s === 'rest' && st.dist < 0.5 && i > 8) break; } return { flips, trail }; };
// 1. going home into the coconut, from across the tank
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(3.0, 0.6, 1.0); f.vel.set(0, 0, 0); f.heading = 0; f.camoWill = false; for (const m of f.minds) { m.k = 0; m.next = 999; } f.inspect = null; f.jarAt = null; f.hunt = null; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; f.goDen(f.st, Math.random, 30); });
const s0 = await state(); ck('it has the coconut as its home', s0.den === 'coconut' && s0.home);
ck('it heads for the mouth of the shell first', s0.mode === 'denfront', s0.mode);
let entered = null, lifted = false, tilted = false; const home = await (async () => { let prev = null, flips = 0; const trail = []; for (let i = 0; i < 160; i++) { await step(5, 0.05); const st = await state(); trail.push(st); if (st.shellY > 0.1) lifted = true; if (st.tilt < -0.15) tilted = true; if (!entered && st.mode === 'den' && st.dist < 1.5) { entered = st; await cam(st.x, st.z); await shot('1_going_in'); } const v = [st.vx, st.vz], m = Math.hypot(...v); if (prev && m > 0.08 && Math.hypot(...prev) > 0.08 && (v[0] * prev[0] + v[1] * prev[1]) < -0.3 * m * Math.hypot(...prev)) flips++; prev = v; if (st.s === 'rest' && st.dist < 0.5 && i > 8) break; } return { flips, trail }; })();
if (process.env.DEBUG) { for (const st of home.trail.slice(0, 24)) console.log('   ', JSON.stringify(st)); console.log('   ', JSON.stringify(await p.evaluate(() => { const f = window.__fishes.list[0]; return { S: f.st, homing: f.homing, failed: f.failed, target: f.target.toArray().map((v) => +v.toFixed(2)), band: f.band }; }))); if (process.env.ONLY1) process.exit(0); }
const end = home.trail.at(-1); await cam(end.x, end.z); await step(40); await shot('2_under_the_shell');
const under = await state();
ck('it ends up inside the shell, resting', under.s === 'rest' && under.dist < 0.5, JSON.stringify(under));
ck('it went in steadily, without turning back and forth', home.flips <= 2, `${home.flips} turnarounds over ${home.trail.length / 4}s`);
ck('the shell lifted and tipped up as it went under', lifted && tilted);
ck('it tucks in under the shell', under.tuck > 0.2, 'tuck ' + under.tuck);
ck('the shell settles just over it, tipped a little', under.shellY > 0.02 && under.shellY < 0.12 && under.tilt < -0.04, `y ${under.shellY} tilt ${under.tilt}`);
// 2. something in the way: it wants to cross the tank with a boulder between it and where it is going
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-3.4, 0.6, 1.5); f.vel.set(0, 0, 0); f.heading = 0; f.inspect = null; f.st = { s: 'crawl', t: 40, n: 0, pulse: 0 }; f.target.set(-0.6, 0.55, 1.5); f.tuckWant = 0; });
await cam(-2, 1.5); const cross = await run(22, 'cross'); const last = cross.trail.at(-1); await shot('3_around_the_boulder');
const got = cross.trail.some((st) => Math.abs(st.x - -0.6) < 0.5 && Math.abs(st.z - 1.5) < 0.6), gaveUp = cross.trail.some((st) => st.s === 'rest');
ck('with a boulder in the way it gets round it, or gives up', got || gaveUp, got ? 'got there' : gaveUp ? 'gave up' : 'still at it: ' + JSON.stringify(last));
ck('and never pushes against it over and over', cross.flips <= 3, `${cross.flips} turnarounds in ${cross.trail.length / 4}s`);
// 3. a crab behind the coconut: the hunt must not become a stutter against the shell
await p.evaluate(() => { const F = window.__fishes, f = F.list[0]; f.pos.set(0.4, 0.6, 2.4); f.vel.set(0, 0, 0); f.heading = Math.PI / 2; f.st = { s: 'rest', t: 999, n: 0, pulse: 0 }; F.dropCrab('x1'); const h = f.hunt; h.y = 0.13; h.x = 0.4; h.z = 0.35; h.mesh.position.set(h.x, 0.13, h.z); h.run = { dodges: 9, burst: -1, vx: 0, vz: 0, down: 99, face: 0 }; });
const hunt = await run(24, 'hunt'); const hl = hunt.trail.at(-1); await shot('4_crab_behind_shell');
const caught = await p.evaluate(() => { const f = window.__fishes.list[0]; return { hunting: !!f.hunt, grab: f.rs.grab?.t ?? null, crabs: (window.__fishes.crabs ?? []).length, s: f.st?.s, mode: f.st?.mode }; });
ck('a crab behind the shell is reached round the side, or let be; no endless stutter', hunt.flips <= 3 && (caught.grab != null || !caught.hunting || caught.s === 'rest'), `${hunt.flips} turnarounds, ${JSON.stringify(caught)}`);
ck('no page errors', errors.length === 0, errors.join('; '));
console.log(fails ? `${fails} failed` : 'Den checks passed'); await b.close(); process.exit(fails ? 1 : 0);
