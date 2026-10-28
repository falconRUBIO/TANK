// The octopus fetches its keepsake from anywhere in the tank: six fixed places for the shell, the den on the left. Each: does it reach it, pick it up (rendered: the shell rides with it), bring it home, and pick it up only once (no loop)?
// Seeded; rendered positions only.   node tools/keepsake_check.mjs [OUTDIR]
// Needs the solo game on 8123.   node tools/attach_check.mjs [OUTDIR]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8123', out = process.argv[2] || process.env.OUT || '/tmp/attach'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 760 } });
await ctx.addInitScript(() => { let a = 20261021; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });      // (every Math.random in the page, seeded)
const p = await ctx.newPage(); const errors = []; let fails = 0; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const ck = (n, ok, ev, x = '') => { console.log(ok ? '  ✓' : '  ✗', `[${ev}]`, n, x); if (!ok) fails++; };
const info = (ev, n, x = '') => console.log('  ·', `[${ev}]`, n, x);
const r2 = (v) => Math.round(v * 100) / 100;
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(() => { window.__simClock(true); window.__seed = (s) => { let a = s; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // a fresh tank: these animals, these decorations, these keepsakes; nothing else going on
  window.__stage = (seed, fish, decor, keeps = []) => { const g = window.__game, s = g.state, now = Date.now(), F = window.__fishes; s.flags.tut = 5; s.createdAt = now - 30 * 864e5; s.level = 8; F.rng = window.__seed(seed);
    s.fish.length = 0; s.fish.push(...fish.map((f) => ({ born: now - 12 * 864e5, stage: 'adult', happy: 0.9, health: 1, hunger: 0.1, owner: null, traits: [], ...f }))); s.decor.length = 0; s.decor.push(...decor.map((d) => ({ ry: 0, ...d })));
    s.adv = { octoAt: now + 9e9, smallAt: now + 9e9, hist: [] }; s.keeps = keeps; s.visitAt = now + 9e9; s.visitor = null; g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); };
  // n frames of 1/20 s; every 5th frame the rendered position of each id (and of any keepsake group) is recorded
  window.__run = (n, ids, seed, each) => { const F = window.__fishes, rnd = window.__seed(seed), tr = Object.fromEntries(ids.map((id) => [id, []])), kt = {};
    for (let i = 0; i < n; i++) { each?.(i, F); F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((f) => f.update(0.05, rnd, F.list));
      if (i % 5 === 0) { for (const id of ids) { const f = F.byId.get(id), q = f?.group?.position; tr[id].push(q ? [+q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3), f.holdfast?.on ? f.holdfast.id : null, f.greet ? 1 : 0] : null); }
        for (const [kid, it] of F.keeps0 ?? []) (kt[kid] ||= []).push([+it.group.position.x.toFixed(3), +it.group.position.z.toFixed(3), it.carried ? 1 : 0]); } }
    return { tr, kt }; }; });
const stage = async (...a) => { await p.evaluate((a) => window.__stage(...a), a); await p.waitForTimeout(2500); };
const run = (n, ids, seed, each) => p.evaluate(([n, ids, seed, each]) => window.__run(n, ids, seed, each ? new Function('i', 'F', each) : null), [n, ids, seed, each ?? null]);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, timeout: 180000 })      // (a slow machine takes a while to draw one);
const xz = (a, x, z) => Math.hypot(a[0] - x, a[2] - z), mean = (a) => a.reduce((s, c) => s + c, 0) / Math.max(1, a.length);
const pathLen = (t) => t.slice(1).reduce((s, c, i) => s + Math.hypot(c[0] - t[i][0], c[1] - t[i][1], c[2] - t[i][2]), 0);
const OCT = { species: 'octopus' };

const SPOTS = process.env.KSPOTS ? JSON.parse(process.env.KSPOTS) : [[2.6, -1.2], [2.2, 2.0], [0.6, -1.6], [3.2, 0.6], [1.0, 2.6], [-0.4, -1.8]];      // KSPOTS='[[x,z],…]' KDECOR='[{…}]': harder places (against a rock, at the back bank)
const KDECOR = process.env.KDECOR ? JSON.parse(process.env.KDECOR) : [];
let carriedN = 0, loops = 0, homeN = 0; const rows = [];
for (const [i, [kx, kz]] of SPOTS.entries()) {
  await stage(600 + i, [{ ...OCT, id: 'oK', name: 'Keeper', seed: 3, home: 'c1', bond: {}, advMem: { fav: 'k1', items: [{ k: 'shell', id: 'k1', at: Date.now() - 864e5 }] }, mem: { fav: null, fam: { c1: { k: 0.9, n: 12, x: -2.4, z: 0.4, at: Date.now() - 5 * 864e5 }, g1: { k: 0.9, n: 12, x: 0, z: 2.4, at: Date.now() - 5 * 864e5 } }, likes: [], fish: {}, keeps: { k1: { k: 0.9, n: 4 } } } }],
    [{ id: 'c1', type: 'coconut', x: -2.4, z: 0.4 }, { id: 'g1', type: 'grass', x: 0, z: 2.4 }, ...KDECOR], [{ id: 'k1', k: 'shell', adv: 'reef', by: 'oK', byName: 'Keeper', at: Date.now() - 864e5, x: kx, z: kz }]);
  await p.evaluate(() => { const F = window.__fishes; F.keeps0 = [...(window.__decor?.keeps ?? new Map())]; if (!F.keeps0.length) { const it = F.keepSpots()[0]?.it; F.keeps0 = it ? [['k1', it]] : []; } F.attnAt = Date.now() - 3e5; F.keepT = 0.5; const f = F.byId.get('oK'); f.inspect = null; f.task = null; f.keepNo = null; });      // (a fresh tank each time: nothing remembered from the last run)
  const { tr, kt } = await run(3000, ['oK'], 7 + i, 'F.attnAt = Date.now() - 3e5; const C = F.byId.get("oK").keepCarry; if (C?.phase === "carry") F.__carried = 1; if (i === 0) F.__carried = 0; if (!C && !F.__carried && i % 200 === 0) F.keepT = 0;');
  const K = kt.k1 ?? [], minD = r2(Math.min(...tr.oK.map((a) => xz(a, kx, kz)))), carried = K.filter((k) => k[2]).length, last = K.at(-1);
  const st = await p.evaluate(() => window.__game.state.keeps.find((k) => k.id === 'k1')?.h ?? {}); const home = last && Math.hypot(last[0] + 2.4, last[1] - 0.4) < 1.8;
  if (carried > 5) carriedN++; if (home) homeN++; if ((st.carries ?? 0) > 2) loops++;
  rows.push(`shell at (${kx}, ${kz}): closest ${minD}, carried ${carried} samples, pickups ${st.carries ?? 0}, ended ${JSON.stringify(last)}${home ? ' (by its den)' : ''}`);
  if (i === 0) await shot('keepsake-far');
}
for (const r of rows) console.log('   ', r);
ck('from all six places it reaches the shell and carries it (rendered)', carriedN === SPOTS.length, 'rendered', `${carriedN} of ${SPOTS.length}`);
ck('it brings it home to its den', homeN >= SPOTS.length - 1, 'rendered', `${homeN} of ${SPOTS.length} end by the den${homeN >= SPOTS.length - 1 ? '' : ' :: ' + rows.join(' // ')}`);      // (on a miss, each place's story on the same line: the CI log keeps only the ✓/✗ lines)
ck('no pickup loop: at most two pickups in a run (one, or one after a slip)', loops === 0, 'state', `${loops} runs with more`);
ck('no page errors', errors.length === 0, 'page', errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Keepsake checks passed'); process.exit(fails ? 1 : 0);
