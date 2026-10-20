// Can you tell the six octopus natures apart by watching one at a time? For each nature: the real game, one grown octopus with its own coconut,
// a few fish and plants, and SEC seconds of the tank's own clock (stepped here, so a slow machine does not change it). Records how far from its
// den it keeps, time at the glass, carrying, watching, and the lines it shows (what its card says it is doing).
// Needs the solo game on 8123.   node tools/personality_solo.mjs [seconds=150]
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const SEC = +(process.argv[2] || 150), base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); const errors = [];
const SEEDS = { explorer: 1, showoff: 2, collector: 3, watcher: 4, homebody: 6, trickster: 8 }, rows = [];
for (const [k, seed] of Object.entries(SEEDS)) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 0.5 })).newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.evaluate(() => document.querySelector('#modal.on #mok').click()); await p.waitForTimeout(2500);
  await p.evaluate(([k, seed]) => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; window.__quietUntil = Date.now() + 9e9;
    s.fish = [{ id: 'o1', name: k, species: 'octopus', seed, pal: 1, born: now - 40 * D, stage: 'adult', traits: [], happy: 0.9, health: 1, hunger: 0.1, owner: 'me', home: 'den' }];
    s.fish.push(...['Gil', 'Dot', 'Fay'].map((n, i) => ({ id: 'g' + i, name: n, species: ['goldfish', 'platy', 'neon'][i], seed: 4 + i, born: now - 30 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1 })));
    s.decor = [{ id: 'den', type: 'coconut', x: 2.4, z: 1.2, ry: 0 }, { id: 'k1', type: 'kelp', x: -2, z: -0.5, ry: 0 }, { id: 'r1', type: 'rock', x: -0.5, z: 0.6, ry: 0 }, { id: 'sh', type: 'shell', x: -2.8, z: 2.2, ry: 0 }];
    g.emit('state'); document.querySelectorAll('#modal.on #mok').forEach((m) => m.click()); }, [k, seed]);
  await p.waitForTimeout(4000);
  const A = { n: 0, dist: 0, far: 0, glass: 0, carry: 0, watch: 0, lines: {} };
  for (let i = 0; i < SEC; i++) {
    const o = await p.evaluate(() => { window.__simHold = true; window.__sim(30); const f = [...window.__fishes.byId.values()].find((x) => x.species?.id === 'octopus'), d = window.__game.state.decor.find((x) => x.id === 'den');
      return f ? { type: f.mind?.type, dd: Math.hypot(f.pos.x - d.x, f.pos.z - d.z), glass: !!f.glassAt || f.st?.mode === 'greet', carry: /carry/.test(f.st?.mode ?? ''), watch: f.st?.s === 'watch' || f.follow != null, line: f.actFlash > 0 ? f.actText : null } : null; });
    if (!o) continue; A.type = o.type; A.n++; A.dist += o.dd; if (o.dd > 2) A.far++; if (o.glass) A.glass++; if (o.carry) A.carry++; if (o.watch) A.watch++; if (o.line) A.lines[o.line] = (A.lines[o.line] ?? 0) + 1;
  }
  const pc = (x) => Math.round((x / Math.max(1, A.n)) * 100) + '%';
  rows.push({ k, type: A.type, fromDen: +(A.dist / Math.max(1, A.n)).toFixed(1), awayFromDen: pc(A.far), glass: pc(A.glass), carry: pc(A.carry), watch: pc(A.watch), says: Object.keys(A.lines).slice(0, 4) });
  console.log(JSON.stringify(rows.at(-1))); await p.close();
}
console.log('page errors', errors.slice(0, 3)); await b.close();
