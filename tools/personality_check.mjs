// Can you tell the six octopus natures apart by watching? The real game in a browser: one grown octopus of each nature, each with its own den,
// a few fish, watched for MIN minutes. Every second it records each one's distance from its den, whether it is at the glass, and what it is doing.
// Needs the solo game on 8123.   node tools/personality_check.mjs [minutes=6]
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const MIN = +(process.argv[2] || 6), base = process.env.BASE || 'http://localhost:8123', out = process.env.OUT || '/tmp/personality'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message)); let closing = false; p.on('crash', () => { console.log('  (the page crashed)'); process.exit(2); }); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) console.log('  console:', m.text().slice(0, 200)); }); b.on('disconnected', () => { if (closing) return; console.log('  (the browser went away)'); process.exit(2); });
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForTimeout(2500);
const SEEDS = { explorer: 1, showoff: 2, collector: 3, watcher: 4, homebody: 6, trickster: 8 };
await p.evaluate((SEEDS) => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; window.__quietUntil = Date.now() + 9e9;
  const xs = [-3.6, -2.2, -0.7, 0.8, 2.3, 3.7]; s.fish = Object.entries(SEEDS).map(([k, seed], i) => ({ id: 'o' + k, name: k[0].toUpperCase() + k.slice(1), species: 'octopus', seed, pal: i % 6, born: now - 40 * D, stage: 'adult', traits: [], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', home: 'den' + i }));
  s.fish.push(...['Gil', 'Dot', 'Fay'].map((n, i) => ({ id: 'g' + i, name: n, species: ['goldfish', 'platy', 'neon'][i], seed: 4 + i, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 })));
  s.decor = xs.map((x, i) => ({ id: 'den' + i, type: 'coconut', x, z: i % 2 ? 0.2 : 1.6, ry: 0 })).concat([{ id: 'k1', type: 'kelp', x: -1.5, z: -0.5, ry: 0 }, { id: 'r1', type: 'rock', x: 1.5, z: -0.8, ry: 0 }, { id: 'sh', type: 'shell', x: 0, z: 2.6, ry: 0 }]);
  g.emit('state'); for (const m of document.querySelectorAll('#modal.on #mok')) m.click(); }, SEEDS);
await p.waitForTimeout(5000);
const S = {}; for (const k of Object.keys(SEEDS)) S[k] = { n: 0, dist: 0, far: 0, glass: 0, states: {}, moved: 0 };
const last = {};
for (let i = 0; i < MIN * 60; i++) {
  const snap = await p.evaluate(() => window.__game.state.fish.filter((f) => f.species === 'octopus').map((r) => { const f = window.__fishes.byId.get(r.id), d = window.__game.state.decor.find((x) => x.id === r.home); return f ? { k: r.name.toLowerCase(), x: f.pos.x, z: f.pos.z, y: f.pos.y, dd: d ? Math.hypot(f.pos.x - d.x, f.pos.z - d.z) : null, s: f.st?.s ?? '?', mode: f.st?.mode ?? '', glass: !!f.glassAt, home: !!f.homing } : null; }).filter(Boolean));
  for (const o of snap) { const A = S[o.k]; if (!A) continue; A.n++; A.dist += o.dd ?? 0; if ((o.dd ?? 0) > 2.5) A.far++; if (o.glass || o.mode === 'greet') A.glass++; const st = o.mode === 'carry1' || o.mode === 'carry2' ? 'carry' : o.s; A.states[st] = (A.states[st] ?? 0) + 1; if (last[o.k]) A.moved += Math.hypot(o.x - last[o.k].x, o.z - last[o.k].z); last[o.k] = o; }
  if (i === 90) await p.screenshot({ path: `${out}/natures.png` });
  await p.evaluate(() => { window.__simHold = true; window.__sim(30); });      /* one second of the tank's own time, stepped here: a browser without a graphics chip draws under one frame a second */
}
const rows = Object.entries(S).map(([k, A]) => { const top = Object.entries(A.states).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, n]) => `${s} ${Math.round((n / A.n) * 100)}%`).join(', '); return { k, avgFromDen: +(A.dist / A.n).toFixed(2), farFromDen: Math.round((A.far / A.n) * 100) + '%', atGlassOrGreeting: Math.round((A.glass / A.n) * 100) + '%', travelled: +A.moved.toFixed(0), carry: Math.round(((A.states.carry ?? 0) / A.n) * 100) + '%', watch: Math.round(((A.states.watch ?? 0) / A.n) * 100) + '%', top }; });
console.log(`${MIN} minutes watched, sampled each second of tank time:`); for (const r of rows) console.log(JSON.stringify(r)); console.log('page errors', errors.slice(0, 3)); closing = true; await b.close();
