// The Toy box: a ball, bubbles and the light spot in a tank with fish, an octopus and a seahorse. The ball sinks, bounces and gets nosed and
// batted; bubbles rise and get popped and snapped at; the light is followed and pounced on; plays are counted and animals learn. Needs the solo game on 8123.
// node tools/toys_check.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/toys'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state, born = Date.now() - 20 * 864e5; s.flags.tut = 5; s.level = 8; s.fish.length = 0;
  const mk = (id, name, species, x = {}) => ({ id, name, species, seed: id.length * 7, born, stage: 'adult', traits: ['Playful'], happy: 0.85, health: 1, ...x });
  s.fish.push(mk('g1', 'Goldie', 'goldfish'), mk('g2', 'Sunny', 'guppy'), mk('g3', 'Dash', 'danio'), mk('o1', 'Inky', 'octopus'), mk('h1', 'Pip', 'seahorse', { sex: 'm' }));
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -3, z: 2.2, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion').forEach((e) => e.classList.remove('on')); });
await p.waitForTimeout(2500);
await p.evaluate(() => window.__ui.open('care')); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('[data-csub=play]')?.click()); await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/toybox.png` }); ck('the Toy box shows the ball as a button, and the next toy as a locked tile with its level (not a button)', await p.evaluate(() => !!document.querySelector('.toy[data-act="toy:ball"]') && !document.querySelector('.toy[data-act="toy:bubbles"]') && [...document.querySelectorAll('#sheet .toybox .toy.lock')].some((t) => /bubbles/i.test(t.textContent) && /Level \d/.test(t.textContent))));
await p.evaluate(() => document.querySelector('.toy[data-act="toy:ball"]').click()); await p.waitForTimeout(800);
ck('choosing it says how', await p.evaluate(() => window.__toys.armed === 'ball'));
const sim = (sec, fn) => p.evaluate(async ([sec, fn]) => { const F = window.__fishes, T = window.__toys, step = new Function('F', 'T', 'i', fn); for (let i = 0; i < sec * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); T.update(0.05, window.__t); if (fn) step(F, T, i); if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); } }, [sec, fn]);
// the ball
const r1 = await p.evaluate(() => { const T = window.__toys; T.toss(0, 0.8); T.armed = null; window.__ballY = []; window.__plays = []; const od = T.onDone; T.onDone = (k, ids) => { window.__plays.push([k, ids]); od(k, ids); }; return T.ball.m.position.y; });
await sim(3, 'if (T.ball) (window.__ballY ||= []).push(T.ball.m.position.y);'); await p.evaluate(() => document.getElementById('modal').classList.remove('on', 'party')); await p.screenshot({ path: `${out}/ball.png` });
await sim(25, 'if (T.ball) (window.__ballY ||= []).push(T.ball.m.position.y);');
const ball = await p.evaluate(() => ({ ys: window.__ballY, who: [...(window.__toys.ball?.who ?? [])], octo: (() => { const o = window.__fishes.byId.get('o1'), q = window.__toys.ball?.m.position; return q ? +Math.hypot(o.pos.x - q.x, o.pos.z - q.z).toFixed(2) : null; })() }));
console.log('  octopus to ball', ball.octo, 'who', ball.who, await p.evaluate(() => { const o = window.__fishes.byId.get('o1'); return JSON.stringify({ s: o.st?.s, mode: o.st?.mode, task: !!o.task, seeking: !!o.seeking, insp: o.inspect, pos: [o.pos.x.toFixed(1), o.pos.z.toFixed(1)] }); }));
ck('the ball drops in from the surface and sinks to the sand', r1 > 12 && Math.min(...ball.ys) < 2.5, `${r1.toFixed(1)} → ${Math.min(...ball.ys).toFixed(2)}`);
ck('fish come and nose it along', ball.who.filter((x) => x.startsWith('g')).length >= 2, `${ball.who.length} joined: ${ball.who}`);
await sim(25); ck('when the go is over it floats away and the play is counted', await p.evaluate(() => !window.__toys.ball && window.__plays.some((x) => x[0] === 'ball')), JSON.stringify(await p.evaluate(() => window.__plays)));
// bubbles
await p.evaluate(() => { window.__game.state.toyPlays = 3; const T = window.__toys; T.blow(window.__fishes.list[0].pos.clone().set(0, 0.4, 1)); window.__pops = 0; const os = T.onSound; T.onSound = (k) => { if (k === 'pop') window.__pops++; os?.(k); }; });
await sim(4); await p.evaluate(() => document.getElementById('modal').classList.remove('on', 'party')); await p.screenshot({ path: `${out}/bubbles.png` }); await sim(14);
const bub = await p.evaluate(() => ({ pops: window.__pops, plays: window.__plays }));
ck('bubbles rise and the animals pop and snap at some of them', bub.pops >= 3, `${bub.pops} popped`);
// light
await p.evaluate(() => { window.__game.state.toyPlays = Math.max(8, window.__game.state.toyPlays ?? 0); const T = window.__toys, s = window.__fishes.list[0].pos.clone(); s.set(-1.5, 0.4, 2); T.lightOn(s); });
await sim(10, 'T.moveLight(T.light.want.clone().set(-1.5 + Math.sin(i / 40) * 1.2, 0.4, 2));'); await p.evaluate(() => document.getElementById('modal').classList.remove('on', 'party')); await p.screenshot({ path: `${out}/light.png` });
const lt = await p.evaluate(() => { const L = window.__toys.light; const near = window.__fishes.list.filter((f) => f.sk !== 'octopus' && f.sk !== 'seahorse' && Math.hypot(f.pos.x - L.at.x, f.pos.z - L.at.z) < 2).length; return { near, who: [...L.who] }; });
ck('fish follow the light spot', lt.near >= 2, `${lt.near} fish close, ${lt.who.length} joined`);
await p.evaluate(() => window.__toys.lightOff()); await sim(3);
ck('plays are counted for the tank and the animals learn', await p.evaluate(() => (window.__game.state.toyPlays ?? 0) >= 9 && window.__plays.some((x) => x[0] === 'bubbles') && window.__game.state.fish.some((f) => Object.keys(f.toys ?? {}).length)), JSON.stringify(await p.evaluate(() => [window.__game.state.toyPlays, window.__game.state.fish.map((f) => [f.name, f.toys])])));
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Toy checks passed'); process.exit(fails ? 1 : 0);
