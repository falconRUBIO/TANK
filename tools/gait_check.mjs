// Each kind swims its own way, in the real game: a clownfish cruises on its pectoral fins with its body nearly straight (its waddle); the chromis
// swims in burst-and-coast and picks at the water; a goby sits still and moves in hops; the mandarin potters and pecks; a puffer backs off without
// turning round; the chromis school bunches up when the octopus comes close. The fish are stepped directly (Fish3D.update at 30 frames a second)
// because a headless browser renders about one frame a second.   Needs the solo game on 8123.   node tools/gait_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5, A = { born: now - 30 * D, stage: 'adult', happy: 0.9, health: 1 }; s.flags.tut = 5; s.level = 8; s.visitAt = s.eggAt = now + 9e9; s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.fish.length = 0;
  s.fish.push({ ...A, id: 'c1', name: 'Nemo', species: 'goldfish', seed: 3, sex: 'f', traits: ['Calm'] }, { ...A, id: 'n1', name: 'Chro', species: 'neon', seed: 5, sex: 'f', traits: ['Social'] }, ...[2, 3, 4].map((k) => ({ ...A, id: 'n' + k, name: 'Chro' + k, species: 'neon', seed: 5 + k * 7, sex: 'f', traits: ['Social'] })), { ...A, id: 'y1', name: 'Goby', species: 'cory', seed: 13, sex: 'f', traits: ['Calm'] },
    { ...A, id: 'm1', name: 'Mandy', species: 'betta', seed: 11, sex: 'm', traits: ['Calm'] }, { ...A, id: 'p1', name: 'Puff', species: 'puffer', seed: 21, sex: 'm', traits: ['Curious'] });
  s.decor.length = 0; s.decor.push({ id: 'r1', type: 'rock', x: 2, z: -0.4, ry: 0 }, { id: 'g1', type: 'grass', x: -2.6, z: -0.6, ry: 0 }); s.hunger = 0.05; s.lastFed = now; s.water = 1; s.glass = 0; g.emit('state');
  for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(3500);
// step every fish (not the octopus) for sec seconds of game time, recording what each does
const run = (sec, setup = '', each = '') => p.evaluate(([sec, setup, each]) => { const per = each ? new Function('F', each) : null; const F = window.__fishes, L = F.list.filter((f) => !f.dead && f.species?.move !== 'jet'); new Function('F', setup)(F); const st = {}, dt = 1 / 30;
  for (const f of L) { f.hops = 0; f.pecks = 0; f.picks = 0; f.backs = 0; st[f.fid] = { sk: f.sk, sp: [], bend: [], still: 0, n: 0, h0: f.heading, spread: [] }; }
  for (let i = 0; i < sec * 30; i++) { per?.(F); for (const f of L) { f.update(dt, Math.random, F.list); const S = st[f.fid], v = f.vel.length(); S.sp.push(v); S.n++; if (v < 0.08) S.still++; if (!(f.fleeT > 0) && !(f.dartT > 0) && !f.seeking) S.bend.push(f.bendK ?? 1); }
    const sch = L.filter((f) => f.sk === 'neon'); if (sch.length > 1 && i % 10 === 0) { let d = 0, k = 0; for (let a = 0; a < sch.length; a++) for (let c = a + 1; c < sch.length; c++) { d += sch[a].pos.distanceTo(sch[c].pos); k++; } st[sch[0].fid].spread.push(d / k); } }
  const out = {}; for (const f of L) { const S = st[f.fid], m = S.sp.reduce((a, b) => a + b, 0) / S.n, sd = Math.sqrt(S.sp.reduce((a, b) => a + (b - m) ** 2, 0) / S.n);
    out[f.name + '#' + f.fid] = { sk: f.sk, mean: +m.toFixed(2), cv: +(sd / (m || 1)).toFixed(2), still: +(S.still / S.n).toFixed(2), bend: S.bend.length ? +(S.bend.reduce((a, b) => a + b, 0) / S.bend.length).toFixed(2) : null, fin: f.finK, hops: f.hops, pecks: f.pecks, picks: f.picks, backs: +f.backs.toFixed(2), turned: +Math.abs(Math.atan2(Math.sin(f.heading - S.h0), Math.cos(f.heading - S.h0))).toFixed(2), spread: S.spread.length ? +(S.spread.slice(S.spread.length >> 1).reduce((a, b) => a + b, 0) / Math.max(1, S.spread.length - (S.spread.length >> 1))).toFixed(2) : null      /* (once it has settled: the second half of the run) */ }; }
  return out; }, [sec, setup, each]);
const by = (R, sk) => Object.values(R).find((x) => x.sk === sk);
const R = await run(30);
const clown = by(R, 'goldfish'), chro = by(R, 'neon'), goby = by(R, 'cory'), mand = by(R, 'betta');
ck('a clownfish cruises on its pectoral fins, body nearly straight', clown.bend != null && clown.bend < 0.7 && clown.fin >= 2, clown);
ck('the chromis swims in burst and coast: its speed rises and falls', chro.cv > 0.25, chro);
{ const all = Object.values(R).filter((x) => x.sk === 'neon').reduce((a, x) => a + x.picks, 0); ck('and the school picks at the water', all >= 2, all); }
ck('a goby sits still most of the time and moves in hops', goby.still > 0.4 && goby.hops >= 5, goby);
ck('the mandarin potters and pecks every second or two', mand.pecks >= 8 && mand.still > 0.3, mand);
// asleep (lights out): no pottering, no pecking, no hops or darts. It rests level where it settled, as a sleeping mandarin lies on the rubble
{ const Z = await run(20, 'window.__mp = 0; window.__mf = 0; for (const f of F.list) { f.isNight = true; f.sleepy = true; }', 'for (const f of F.list) { if (f.dead || f.species?.move === "jet") continue; f.isNight = true; f.sleepy = true; if (f.sk === "betta" && ++window.__mf > 60) window.__mp = Math.max(window.__mp, Math.abs(f.pitch ?? 0)); }      /* (after it has settled: the first two seconds it may still be finishing a peck from before) */');
  const zm = by(Z, 'betta'), zg = by(Z, 'cory'), zc = Object.values(Z).filter((x) => x.sk === 'neon').reduce((a, x) => a + x.picks, 0), mp = await p.evaluate(() => +window.__mp.toFixed(2));
  ck('asleep, the mandarin lies still: no pecks, no hops, no nodding up and down', zm.pecks === 0 && zm.hops === 0 && mp < 0.2, { ...zm, maxPitch: mp });
  ck('asleep, the goby stops hopping and the chromis stop picking at the water', zg.hops === 0 && zc === 0, { goby: zg.hops, chromisPicks: zc });
  await p.evaluate(() => { for (const f of window.__fishes.list) { f.isNight = false; f.sleepy = false; f.pitch = 0; } }); }      // (awake again for what follows)
const back = await run(1.2, "const f = F.list.find((x) => x.sk === 'puffer'); f.vel.set(0, 0, 0); f.target.set(f.pos.x - Math.cos(f.heading) * 0.9, f.pos.y, f.pos.z + Math.sin(f.heading) * 0.9); f.retarget = 9; f.idle = 0; f.seeking = false; f.fleeT = 0; f.dartT = 0;");
const pu = by(back, 'puffer'); ck('a puffer with something just behind it backs off without turning round', pu.backs > 0.3 && pu.turned < 0.35, pu);
const school = "const o = F.list.find((x) => x.species?.move === 'jet'); let k = 0; for (const f of F.list) if (f.sk === 'neon') { f.fleeT = -9; f.retarget = 99; f.idle = 0; f.target.set(k % 2 ? 3 : -3, k < 2 ? 3 : 8, 1); f.pos.set(f.target.x * 0.5, f.target.y, 1); k++; }";
const calm = by(await run(8, school + " if (o) o.pos.set(9, 9, 9);"), 'neon'), scared = by(await run(8, school, "for (const f of F.list) if (f.sk === 'neon') f.fleeT = -1;"), 'neon');      /* (danger kept near the whole time, as an octopus hanging about would) */
ck('the chromis school bunches up when danger is near', scared.spread < calm.spread * 0.85, { calm: calm.spread, scared: scared.spread });
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Gait checks passed'); process.exit(fails ? 1 : 0);
