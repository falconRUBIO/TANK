// The ball and every kind of animal: it is never inside a body (a fish, a seahorse held on its plant or swimming, an octopus, a turtle);
// fish nose it and flick it with their tails, a seahorse taps it with its snout or flicks it with its tail, an octopus whips an arm out and
// slaps it. Several balls dropped over the animals, a minute of tank time each. Needs the solo game on 8123.   OUT=dir node tools/ball_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.env.OUT || '/tmp/ball'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.evaluate(() => document.querySelector('#modal.on #mok')?.click());
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = Date.now() - 20 * 864e5;
  const mk = (id, name, species, traits, x = {}) => ({ id, name, species, seed: id.charCodeAt(0) * 3 + id.length, born, stage: 'adult', traits, happy: 0.85, health: 1, ...x });
  s.fish.push(mk('h1', 'Sunny', 'seahorse', ['Curious']), mk('h2', 'Pearl', 'seahorse', ['Curious']), mk('g1', 'Nori', 'goldfish', ['Playful']), mk('g2', 'Dash', 'danio', ['Playful']), mk('g3', 'Ruby', 'platy', ['Curious']), mk('o1', 'Inky', 'octopus', ['Playful']));
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -1.6, z: 1.6, ry: 0 }, { id: 'p2', type: 'fern', x: 1.4, z: 1.8, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => { window.__simClock(true); const { ballGap } = await import('/src/w3/toys.js'), F = window.__fishes, T = window.__toys, hs = F.list.filter((f) => f.sp?.tail);
  hs.forEach((h) => { h.isNight = false; }); let worst = 9, worstWho = '', inside = 0, frames = 0; const near = {};
  const drops = [() => { const h = hs.find((x) => x.holdfast?.on) ?? hs[0]; return [h.pos.x, h.pos.z]; }, () => [hs[1].pos.x, hs[1].pos.z], () => { const o = F.byId.get('o1'); return [o.pos.x, o.pos.z]; }, () => [0, 1.2], () => [-1.6, 1.6], () => [1.4, 1.8]];
  for (let k = 0; k < drops.length; k++) { for (let i = 0; i < 400; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); T.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); }      // (the animals go about their business between balls)
    const [x, z] = drops[k](); T.toss(x, Math.max(-1.6, Math.min(2.3, z)));
    for (let i = 0; i < 1100 && T.ball; i++) { F.update(0.05, (window.__t += 0.05)); T.update(0.05, window.__t); F.list.forEach((f) => f.update(0.05, Math.random, F.list)); T.settle(); const B = T.ball; if (!B || B.leaving != null) continue; frames++;
      for (const f of F.list) { if (f.dead) continue; const g = ballGap(f, B.m.position, 0.38); if (g < 0.4) near[f.sk] = (near[f.sk] ?? 0) + 1; if (g < worst) { worst = g; worstWho = f.sk; } if (g < -0.05) inside++; } }
    if (k % 2 === 1) await new Promise((res) => setTimeout(res, 0)); }
  const count = (key) => Object.fromEntries(F.list.filter((f) => f[key]).map((f) => [f.name, f[key]]));
  return { frames, inside, worst: +worst.toFixed(3), worstWho, near, nosed: count('nosed'), tailed: count('tailed'), snouted: count('snouted'), tailFlicks: count('tailFlicks'), slaps: count('slaps') }; });
console.log('  six balls:', JSON.stringify(r));
ck('the ball is never inside an animal (deeper than 5 cm): it bounces off their bodies', r.inside === 0, `${r.inside} frames inside of ${r.frames}; deepest ${r.worst} (${r.worstWho})`);
ck('it came up against the seahorses (the test reached them)', (r.near.seahorse ?? 0) > 20, `${r.near.seahorse ?? 0} frames within 0.4 of a seahorse`);
ck('fish push it with their noses', Object.values(r.nosed).reduce((a, c) => a + c, 0) >= 3, JSON.stringify(r.nosed));
ck('a seahorse plays with it: a tap of its snout or a flick of its tail', Object.values(r.snouted).reduce((a, c) => a + c, 0) + Object.values(r.tailFlicks).reduce((a, c) => a + c, 0) >= 1, `snout ${JSON.stringify(r.snouted)} tail ${JSON.stringify(r.tailFlicks)}`);
ck('the octopus slaps it with an arm', Object.values(r.slaps).reduce((a, c) => a + c, 0) >= 1, JSON.stringify(r.slaps));
console.log(`  (fish tail flicks: ${JSON.stringify(r.tailed)})`);
await p.screenshot({ path: `${out}/ball.png`, timeout: 90000 }).catch(() => {});
ck('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
console.log(fails ? `${fails} failed` : 'Ball checks passed'); await b.close(); process.exit(fails ? 1 : 0);
