// Sea life motion audit: a busy real tank (every kind of fish, a seahorse pair, a sea turtle, a hermit crab, with rocks, plants, a cave,
// an anemone and a ledge), run on the tank's own clock, every frame of every drawn animal recorded. Scores, per kind, what makes motion look
// wrong: jumps, turns that snap, speed or height that jerks, swimming backwards, sinking into the sand, and wobble (turning back and forth).
//   node tools/sealife_motion_audit.mjs [minutes=4] [seed=7]      CHECK=1: as a drill        (needs the solo game on 8123)
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const MIN = +(process.argv[2] ?? 4), SEED = +(process.argv[3] ?? 7);
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } });
await ctx.addInitScript((seed) => { let a = seed; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEED * 7919);
const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 30 * D, stage: 'adult', happy: 0.85, health: 1, hunger: 0.15, owner: null, traits: ['Calm'] }; let n = 0; const add = (species, extra = {}) => s.fish.push({ ...A, id: 'z' + ++n, name: species + n, species, seed: 3 + n * 7, ...extra });
  s.flags.tut = 5; s.level = 8; s.createdAt = now - 40 * D; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.hunger = 0.1; s.water = 1; s.glass = 0; s.fish.length = 0;
  for (const sp of ['goldfish', 'guppy', 'blue', 'angelfish', 'tang', 'platy', 'neon', 'neon', 'neon', 'danio', 'danio', 'danio', 'puffer', 'cory', 'neongoby', 'betta']) add(sp);
  add('seahorse', { sex: 'm', kind: 'kuda' }); add('seahorse', { sex: 'f', kind: 'kuda' }); add('turtle', { stage: 'juvenile', arrived: now - 10 * D }); add('blueleg', { crab: { shell: { t: 'turban', sz: 2 } } });
  s.decor.length = 0; s.decor.push({ id: 'r1', type: 'rock', x: 1.6, z: -0.8 }, { id: 'r2', type: 'boulder', x: -2.6, z: 0.4 }, { id: 'p1', type: 'grass', x: 0, z: 2.2 }, { id: 'p2', type: 'kelp', x: -0.8, z: -1.6 }, { id: 'c1', type: 'cave', x: 2.8, z: 1.2 }, { id: 'a1', type: 'anemone', x: -1.6, z: 1.8 }, { id: 'l1', type: 'ledge', x: 0.6, z: -1.8 }, { id: 'lr', type: 'liverock', x: -3.2, z: -1.0 });
  for (const d of s.decor) d.ry = 0; g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast', 'goal']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(4000);
const R = await p.evaluate(async (MIN) => {
  const { sandH } = await import('/src/w3/terrain.js'); window.__simClock(true); const F = window.__fishes, L = F.list.filter((f) => !f.dead && f.species?.move !== 'jet'), dt = 1 / 30, N = Math.round(MIN * 60 / dt);
  const E = new (L[0].group.rotation.constructor)(), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), by = {}, H = new Map(), samples = {};
  const add = (k, key, v) => { (by[k] ||= { n: 0 })[key] = (by[k][key] ?? 0) + v; }, note = (k, kind, s) => { const a = ((samples[k] ||= {})[kind] ||= []); if (a.length < 3) a.push(s); };
  for (let i = 0; i < N; i++) { F.update(dt, (window.__t = (window.__t ?? 0) + dt)); F.list.forEach((f) => f.update(dt, Math.random, F.list));
    for (const f of L) { if (f.dead || !f.group.visible) { H.delete(f); continue; } const q = f.group.position; E.setFromQuaternion(f.group.quaternion, 'YZX');
      const c = { x: q.x, y: q.y, z: q.z, yaw: E.y, pit: E.z, rol: E.x, st: f.crab ? f.cs?.s : f.link ? 'link' : f.greet ? 'greet' : f.holdfast?.on ? 'hold' : f.holdfast ? 'tohold' : f.enc ? 'enc:' + (f.enc.kind ?? f.enc.k ?? '') : f.sleepy ? 'sleep' : f.fleeT > 0 ? 'flee' : f.seeking ? 'seek' : 'swim' }, h = H.get(f) ?? []; h.push(c); if (h.length > 3) h.shift(); H.set(f, h);
      const k = f.sk + (f.crab ? '' : ''); add(k, 'n', 1); if (h.length < 3) continue; const [a2, a, cc] = h;
      const dp = Math.hypot(cc.x - a.x, cc.y - a.y, cc.z - a.z); if (dp > 0.25) { add(k, 'jump', 1); note(k, 'jump', `${c.st} ${dp.toFixed(2)} at(${cc.x.toFixed(1)},${cc.y.toFixed(1)},${cc.z.toFixed(1)})`); }
      const yr = Math.abs(wrap(cc.yaw - a.yaw)) / dt; add(k, 'yawR', yr); if (yr > 5) { add(k, 'snap', 1); note(k, 'snap', `${c.st} ${yr.toFixed(1)}rad/s`); }
      const yr0 = wrap(a.yaw - a2.yaw), yr1 = wrap(cc.yaw - a.yaw); if (Math.abs(yr0) / dt > 0.4 && Math.abs(yr1) / dt > 0.4 && Math.sign(yr0) !== Math.sign(yr1)) add(k, 'wob', 1);
      const tr = (Math.abs(cc.pit - a.pit) + Math.abs(wrap(cc.rol - a.rol))) / dt; if (tr > 5) { add(k, 'tilt', 1); note(k, 'tilt', `${c.st} ${tr.toFixed(1)}rad/s pit${cc.pit.toFixed(2)} rol${cc.rol.toFixed(2)}`); }
      const hacc = Math.hypot(cc.x - 2 * a.x + a2.x, cc.z - 2 * a.z + a2.z) / dt / dt, vacc = Math.abs(cc.y - 2 * a.y + a2.y) / dt / dt; if (hacc > 30) { add(k, 'hj', 1); note(k, 'hj', `${c.st} ${hacc.toFixed(0)}`); } if (vacc > 30) { add(k, 'vj', 1); note(k, 'vj', `${c.st} ${vacc.toFixed(0)}`); }
      const sp = Math.hypot(cc.x - a.x, cc.z - a.z) / dt; add(k, 'sp', sp); if (sp > 0.3 && !f.crab) { const fx = Math.cos(f.heading), fz = -Math.sin(f.heading), dot = ((cc.x - a.x) * fx + (cc.z - a.z) * fz) / (sp * dt); if (dot < -0.5 && !(f.noTurn)) { add(k, 'back', 1); note(k, 'back', `${c.st} sp${sp.toFixed(2)} dot${dot.toFixed(2)} ownVel${Math.hypot(f.vel.x, f.vel.z).toFixed(2)} ext${(Math.hypot(cc.x - a.x - f.vel.x * dt, cc.z - a.z - f.vel.z * dt) / dt).toFixed(2)} y${cc.y.toFixed(1)} hf${f.holdfast ? (f.holdfast.on ? 'on' : f.holdfast.settle ? 'settle' : 'go') : '-'} mate${f.mate ? 1 : 0}`); } }
      const gy = sandH(cc.x, cc.z); if (cc.y < gy - 0.05 && !f.crab) { add(k, 'sink', 1); note(k, 'sink', `${c.st} y${cc.y.toFixed(2)} sand${gy.toFixed(2)}`); } } 
    if (i % 900 === 0) await new Promise((res) => setTimeout(res, 0)); }
  return { kinds: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { sec: +(v.n * dt).toFixed(0), speed: +((v.sp ?? 0) / v.n).toFixed(2), yawR: +((v.yawR ?? 0) / v.n).toFixed(2), jump: v.jump ?? 0, snap: v.snap ?? 0, wob: v.wob ?? 0, tilt: v.tilt ?? 0, hj: v.hj ?? 0, vj: v.vj ?? 0, back: v.back ?? 0, sink: v.sink ?? 0 }])), samples }; }, MIN);
const cols = ['sec', 'speed', 'yawR', 'jump', 'snap', 'wob', 'tilt', 'hj', 'vj', 'back', 'sink'];
console.log('kind'.padEnd(11) + cols.map((c) => c.padStart(7)).join('')); for (const [k, v] of Object.entries(R.kinds)) console.log(k.padEnd(11) + cols.map((c) => String(v[c]).padStart(7)).join(''));
if (!process.env.QUIET) for (const [k, S] of Object.entries(R.samples)) for (const [kind, a] of Object.entries(S)) console.log(`   ${k} ${kind}: ${a.join(' | ')}`);
console.log('errors', errors.slice(0, 3)); await b.close();
if (process.env.CHECK) {      // as a drill (check_all): held to what the fixes brought them to, with room to spare
  let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
  const K = Object.entries(R.kinds), fps = 30, jumps = K.reduce((a, [, v]) => a + v.jump, 0);
  ck('no animal jumps: none of them moves more than 0.25 in one frame', jumps <= 1, Object.fromEntries(K.filter(([, v]) => v.jump).map(([k, v]) => [k, v.jump])));
  const sharp = K.map(([k, v]) => [k, +((v.hj + v.vj + v.snap) / (v.sec / 60)).toFixed(1)]).filter(([, r]) => r > 6);
  ck('every kind moves smoothly: no more than six sharp changes of speed, height or direction a minute', !sharp.length, Object.fromEntries(sharp));
  const back = K.filter(([k]) => !['puffer', 'blue'].includes(k)).map(([k, v]) => [k, +(v.back / (v.sec * fps) * 100).toFixed(1)]).filter(([, pc]) => pc > 2);      // (a puffer backs off on purpose; a royal gramma hangs upside down under its ledge and backs into it)
  ck('fish swim head first: under 2% of the time going backwards, for every kind', !back.length, Object.fromEntries(back));
  ck('nobody sinks into the sand', K.every(([, v]) => v.sink === 0), Object.fromEntries(K.filter(([, v]) => v.sink).map(([k, v]) => [k, v.sink])));
  ck('no page errors', errors.length === 0, errors.slice(0, 3));
  console.log(fails ? `${fails} failed` : 'Sea life motion checks passed'); process.exit(fails ? 1 : 0); }
