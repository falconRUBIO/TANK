// Every kind knows a toy is there: crabs (timid ones tuck in when the ball lands close, curious ones walk up and look, bold ones poke), turtles
// shove the ball and follow the light, fish, octopus and seahorse as before. Steps the tank by hand.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 300)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 9 }, { dev: true }); for (let i = 0; i < 20; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const [sp, nm] of [['blueleg', 'Pebble'], ['scarlet', 'Ruby'], ['loggerhead', 'Tank'], ['goldfish', 'Nemo']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm }).catch(() => null); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true });
  for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2500);
const step = (n) => `for (let i = 0; i < ${n}; i++) { window.__fishes.update(0.05, i * 0.05); window.__fishes.list.forEach((x) => x.update(0.05, Math.random, window.__fishes.list)); window.__toys.update(0.05, i * 0.05); }`;
const have = await p.evaluate(() => window.__fishes.list.map((f) => f.name + ':' + f.sk));
console.log(have.join(' '));
const r = await p.evaluate(`(() => { const F = window.__fishes, T = window.__toys, P = F.list.find((f) => f.name === 'Pebble'), R = F.list.find((f) => f.name === 'Ruby');
  P.rec.crab.type = 'timid'; R.rec.crab.type = 'bold'; for (const c of [P, R]) { c.cs = { s: 'idle', t: 9 }; c.toyCool = 0; } P.cs.t = 60; for (const o of F.list) if (!o.crab) { o.pos.set(-4, 5, -1.5); o.target?.set(-4, 5, -1.5); }
  P.pos.set(0.4, P.pos.y, 0.6); R.pos.set(2.2, R.pos.y, 0.6); R.rng = () => 0.1; T.toss(P.pos.x, P.pos.z); T.ball.v.x = 0; const seen = new Set(), bseen = new Set(); for (let i = 0; i < 400; i++) { F.update(0.05, i * 0.05); for (const o of F.list) if (!o.crab) o.pos.set(-4, 5, -1.5); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); T.update(0.05, i * 0.05); seen.add(P.cs.s + '|' + P.doing); bseen.add(R.cs.s + '|' + R.doing); }
  const a = { timid: [...seen].join(','), bold: [...bseen].join(','), ball: T.ball && T.ball.m.position.toArray().map((x) => +x.toFixed(2)), P: P.pos.toArray().map((x) => +x.toFixed(2)), R: R.pos.toArray().map((x) => +x.toFixed(2)), cool: [P.toyCool, R.toyCool, performance.now()] }; ${step(200)}
  a.boldLater = R.cs.s + '|' + R.doing; a.who = [...(T.ball?.who ?? [])].length; return a; })()`);
ck('a timid crab tucks in when the ball lands close; a bold crab walks up and pokes it', /retract/.test(r.timid) && /ball/.test(r.timid) && (/toy|ball/.test(r.bold) || /ball/.test(r.boldLater)) , r);
const t = await p.evaluate(`(() => { const F = window.__fishes, T = window.__toys, tu = F.list.find((f) => f.name === 'Tank'); if (!tu) return { none: 1 }; T.ballEnd(true); tu.pos.set(1, 2, 0.5); T.toss(1.2, 0.5); ${step(800)} return { who: [...(T.ball?.who ?? [])].includes(tu.fid), d: T.ball ? tu.pos.distanceTo(T.ball.m.position).toFixed(2) : null }; })()`);
ck('a turtle comes over and shoves the ball', t.who, t);
const l = await p.evaluate(`(() => { const F = window.__fishes, T = window.__toys, R = F.list.find((f) => f.name === 'Ruby'); T.ballEnd(true); R.cs = { s: 'idle', t: 9 }; R.toyCool = 0; R.rng = () => 0.1; const at = R.pos.clone(); at.x += 1.5; T.lightOn(at); ${step(160)} return { doing: R.doing, s: R.cs.s, who: [...T.light.who].includes(R.fid) }; })()`);
ck('a bold crab walks into the light spot and reaches for it', /light/.test(l.doing ?? '') || l.who, l);
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
