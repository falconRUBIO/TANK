// Cause and effect, measured: place a Reef Cave, Sea Fan, Live Rock and Shell Rubble (then move each), and record which animals come within
// reach of it, and what they say they are doing, over 40 simulated seconds, against the same animals before it was there. Nothing is
// forced: the tank is stepped by hand with its own rules. Also: a favorite place persists in the saved state.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 420)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 8 }, { dev: true }); for (let i = 0; i < 30; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const [sp, nm, kind] of [['seahorse', 'Sunny', 'erectus'], ['blueleg', 'Pebble'], ['scarlet', 'Ruby'], ['blue', 'Gram'], ['goldfish', 'Nemo'], ['puffer', 'Puff']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm, ...(kind ? { kind } : {}) }).catch(() => null);
  await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true }); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2500);
const run = (type, x, z, mode) => p.evaluate(async ({ type, x, z, mode }) => {
  const g = window.__game, F = window.__fishes, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), steps = 800;
  const watch = (at) => { const came = new Map(); for (let i = 0; i < steps; i++) { F.update(0.05, i * 0.05); for (const f of F.list) { f.update(0.05, Math.random, F.list); if (f.dead || f.visitor) continue; if (Math.hypot(f.pos.x - at.x, f.pos.z - at.z) < 1.4) { const e = came.get(f.name) ?? { s: 0, said: null }; e.s += 0.05; const d = f.crab ? f.doing : f.thought; if (d && /new|cover|look|pick|climb|holding|graz|investigat/i.test(d)) e.said = d; came.set(f.name, e); } } }
    return Object.fromEntries([...came].map(([k, v]) => [k, { s: Math.round(v.s), said: v.said }])); };
  const before = watch({ x, z });      // the same spot, before anything is there
  let d; if (mode === 'move') { d = g.state.decor.find((q) => q.type === type); await g.dispatch({ t: 'moveDecor', id: d.id, x, z, ry: 0 }); } else { await g.dispatch({ t: 'buyDecor', type, x, z, ry: 0 }); d = g.state.decor.at(-1); }
  await sleep(900); const after = watch({ x, z }); return { type, mode, before, after };
}, { type, x, z, mode });
const out = [];
for (const [type, x, z] of [['cave', -2.4, 0.2], ['seafan', 2.4, -0.4], ['liverock', 0.2, 1.4], ['rubble', -0.8, -1.0]]) { out.push(await run(type, x, z, 'place')); out.push(await run(type, -x * 0.6, z + 0.3, 'move')); }
for (const r of out) { const newcomers = Object.keys(r.after).filter((k) => (r.after[k].s ?? 0) > (r.before[k]?.s ?? 0) + 2);
  console.log(`${r.type} ${r.mode}: before ${JSON.stringify(r.before)}\n    after ${JSON.stringify(r.after)}`);
  ck(`${r.type} (${r.mode}): animals spend more time there than at the same empty spot`, newcomers.length > 0, newcomers); }
const persist = await p.evaluate(async () => { const g = window.__game, f = g.state.fish.find((x) => x.name === 'Nemo'), c = g.state.decor.find((d) => d.type === 'cave'); for (let i = 0; i < 4; i++) await g.dispatch({ t: 'fishLog', logs: [{ fish: f.id, dist: 3, lv: {}, places: [c.id], secs: { [c.id]: 150 } }] }); return { spot: g.state.fish.find((x) => x.name === 'Nemo').spotId === c.id }; });
await p.reload(); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
const kept = await p.evaluate(() => { const g = window.__game, f = g.state.fish.find((x) => x.name === 'Nemo'), c = g.state.decor.find((d) => d.type === 'cave'); return f?.spotId === c?.id; });
ck('a favorite place earned from time spent survives a reload (saved state)', persist.spot && kept, { persist, kept });
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
