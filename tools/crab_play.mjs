// "Play with Marcel" for a hermit crab: open its card, press the play button, drag a finger across the screen: the crab comes along the sand
// after the spot under the finger (round the decorations), says so, and the play counts (a 'pet' on the server) when the finger lifts.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 300)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 6 }, { dev: true }); for (let i = 0; i < 10; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  await g.dispatch({ t: 'buyFish', species: 'blueleg', name: 'Marcel' }); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true }); await g.dispatch({ t: 'buyDecor', type: 'pot', x: 0, z: 1.2, ry: 0 }); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2000);
const opened = await p.evaluate(() => { const F = window.__fishes, c = F.list.find((x) => x.name === 'Marcel'); c.pos.set(-2.5, c.pos.y, 1.8); c.cs = { s: 'idle', t: 30 }; window.__showCard(c); return !!document.getElementById('pet'); });
await p.waitForTimeout(600); const label = await p.evaluate(() => document.getElementById('pet')?.textContent ?? null);
await p.evaluate(() => { const c = window.__fishes.list.find((x) => x.name === 'Marcel'); window.__playWith(c); window.__playOn(120000); });      // (what the card's play button calls; a slow test browser's card redraws too often to press it reliably)
await p.mouse.move(80, 700); await p.mouse.down(); const start = await p.evaluate(() => { const c = window.__fishes.list.find((x) => x.name === 'Marcel'); return [+c.pos.x.toFixed(2), +c.pos.z.toFixed(2)]; }); const seen = new Set(); let maxX = start[0], last = null;
// drag slowly across the lower part of the screen (over the sand), from the left to the right of the pot, sampling the crab as it goes
for (let k = 0; k <= 30; k++) { await p.mouse.move(80 + k * 4.3, 700 - Math.sin(k / 10) * 20); const s = await p.evaluate(() => { const F = window.__fishes, c = F.list.find((x) => x.name === 'Marcel'); for (let i = 0; i < 30; i++) { F.update(0.05, i * 0.05); c.update(0.05, Math.random, F.list); }      /* (the test browser draws a frame every few seconds: the tank is stepped by hand between finger moves) */ return { x: c.pos.x, z: c.pos.z, doing: c.doing, why: c.cs.why, pp: window.__pp, at: window.__ppat, s: c.cs.s }; });  maxX = Math.max(maxX, s.x); if (s.doing) seen.add(s.doing); if (await p.evaluate(() => !!window.__playOn())) last = s; else break; }      // (judged while play is on: a slow test browser runs out even a long play window)
const before = await p.evaluate(() => window.__game.state.fish.find((f) => f.name === 'Marcel')?.played ?? null);
await p.mouse.up(); await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({ played: window.__game.state.fish.find((f) => f.name === 'Marcel')?.played ?? null, j: window.__game.journal.slice(0, 3).map((e) => e.text) }));
ck('the card has a play button for the crab', opened && /Play with Marcel/.test(label ?? ''), label);
const gap = last?.at ? Math.hypot(last.x - last.at[0], last.z - last.at[2]) : 99, gap0 = last?.at ? Math.hypot(start[0] - last.at[0], start[1] - last.at[2]) : 0;
ck('dragging, Marcel comes along the sand after the spot under the finger (ends close to it, saying so)', gap < 1.0 && gap0 > 1.0 && [...seen].some((d) => /following your finger/.test(d)), { start, end: [+last?.x?.toFixed(2), +last?.z?.toFixed(2)], finger: last?.at?.map((v) => +v.toFixed(2)), gapAtEnd: +gap.toFixed(2), seen: [...seen] });
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
