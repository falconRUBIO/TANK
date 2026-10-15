// Phase A, observed in the tank: an octopus notices a new decoration, goes over in its own way (an explorer soon, a watcher after watching, a homebody
// from its den, perhaps not at all), handles it and learns it; keeps going back to it; finds it again when it is moved out of its sight (old spot first,
// then a short search) and recognizes it; lets it go when it is taken out; and remembers all this across a reload. Measures what it really does.
// Needs the solo game on 8123. node tools/octopus_aware.mjs [runs]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const RUNS = +(process.argv[2] || 3), base = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let ctx = await b.newContext({ viewport: { width: 390, height: 760 } }), p = await ctx.newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const boot = async () => { await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000); };
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const setup = (seed) => p.evaluate((seed) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 9; s.shells = 999; s.fish.length = 0; s.hunger = 0; s.water = 1;
  s.fish.push({ id: 'o1', name: 'Inky', species: 'octopus', seed, born: Date.now() - 20 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.85, health: 1, owner: 'me', ownerName: 'You', fedAt: Date.now(), home: 'c1' });
  s.decor.length = 0; s.decor.push({ id: 'c1', type: 'coconut', x: -2.8, z: 1.6, ry: 0, at: Date.now() - 9 * 864e5 }, { id: 'r1', type: 'rock', x: 2.8, z: -0.6, ry: 0, at: Date.now() - 9 * 864e5 }, { id: 'p1', type: 'grass', x: 0.2, z: -1.2, ry: 0, at: Date.now() - 9 * 864e5 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,header,nav,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')); }, seed);
// run the tank for a while, sampling what the octopus does once a (simulated) second
const sim = (secs, watchId) => p.evaluate(async ([secs, watchId]) => { const F = window.__fishes, f = F.list.find((x) => x.sk === 'octopus'), g = window.__game; const out = { notice: null, watch: false, touch: null, phases: new Set(), thoughts: new Set(), minD: 99, oldMin: 99, awareMs: 0, awareN: 0 };
  const aw = F.aware.bind(F); F.aware = (...a) => { const t0 = performance.now(); aw(...a); out.awareMs += performance.now() - t0; out.awareN++; };
  for (let i = 0; i < secs * 10; i++) { F.update(0.1, (window.__t = (window.__t ?? 0) + 0.1)); F.list.forEach((x) => x.update(0.1, Math.random, F.list));
    if (i % 10 === 0) { const ts = i / 10, I = f.inv; if (I?.id === watchId) { out.notice ??= ts; out.phases.add(I.phase); if (I.phase === 'watch') out.watch = true; } if (f.thought) out.thoughts.add(f.thought);
      const d = g.state.decor.find((x) => x.id === watchId); if (d) out.minD = Math.min(out.minD, Math.hypot(f.pos.x - d.x, f.pos.z - d.z)); if (window.__oldSpot) out.oldMin = Math.min(out.oldMin, Math.hypot(f.pos.x - window.__oldSpot.x, f.pos.z - window.__oldSpot.z));
      const e = g.state.fish.find((x) => x.id === f.fid)?.mem?.fam?.[watchId]; if (e?.n && out.touch == null) out.touch = ts; await new Promise((q) => setTimeout(q, 0)); } }
  F.aware = aw; return { ...out, phases: [...out.phases], thoughts: [...out.thoughts].filter((x) => /new|pot|shell|moved|spot|gone|look/i.test(x)).slice(0, 8), awareMs: +(out.awareMs / Math.max(1, out.awareN)).toFixed(3) }; }, [secs, watchId]);
const place = (type, x, z) => p.evaluate(async ([type, x, z]) => { const r = await window.__game.dispatch({ t: 'buyDecor', type, x, z, ry: 0 }); return r.ok ? window.__game.state.decor.at(-1).id : 'fail:' + r.reason; }, [type, x, z]);
const mem = () => p.evaluate(() => window.__game.state.fish[0].mem ?? null);
// 1. three natures meet the same new pot, several five-minute visits each
if (process.env.ONLY !== 'mem') {
console.log('Personality: the same new pot, five-minute visits');
const table = {};
for (const [type, seed] of [['explorer', 1], ['watcher', 4], ['homebody', 6], ['collector', 3]]) {
  const rows = []; for (let k = 0; k < RUNS; k++) { await setup(seed); await p.waitForTimeout(600); await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(1.5, 0.6, 1.2); f.tired = 0; f.scared = 0; });
    const id = await place('pot', 0.6, 0.4); const r = await sim(240, id); rows.push(r); }
  const went = rows.filter((r) => r.touch != null), avg = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null);
  table[type] = { noticed: rows.filter((r) => r.notice != null).length, watchedFirst: rows.filter((r) => r.watch).length, investigated: went.length, secsToTouch: avg(went.map((r) => r.touch)), awareMs: avg(rows.map((r) => r.awareMs)) };
  console.log(`  ${type.padEnd(9)} ${JSON.stringify(table[type])}`, rows[0].thoughts.slice(0, 3).join(' / '));
}
ck('every nature notices the new pot', Object.values(table).every((t) => t.noticed === RUNS), JSON.stringify(table));
ck('an explorer goes over sooner than a watcher or a homebody', table.explorer.secsToTouch != null && table.explorer.secsToTouch < (table.watcher.secsToTouch ?? 999) && table.explorer.secsToTouch < (table.homebody.secsToTouch ?? 999));
ck('a watcher and a homebody watch first; an explorer does not', table.watcher.watchedFirst === RUNS && table.homebody.watchedFirst === RUNS && table.explorer.watchedFirst === 0);
ck('a homebody is the least willing', table.homebody.investigated <= table.explorer.investigated);
ck('the awareness check is cheap (once a second)', Object.values(table).every((t) => t.awareMs < 0.5), JSON.stringify(Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v.awareMs]))));
// 2. an explorer learns it, goes back to it, finds it after it is moved out of sight, lets it go when it is taken out, remembers across a reload
}
if (process.env.ONLY === 'pers') { await b.close(); console.log(fails ? `${fails} failed` : 'Awareness checks passed'); process.exit(fails ? 1 : 0); }
console.log('Memory: one collector and its pot'); await ctx.close(); ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); await boot();      // (a fresh page)
await setup(3); await p.waitForTimeout(600); const pot = await place('pot', 2.4, 1.2); await sim(150, pot);
let m = await mem(); ck('it investigated the pot, so now it knows it (and only then)', m?.fam?.[pot]?.n >= 1, JSON.stringify(m?.fam?.[pot]));
const j1 = await p.evaluate(() => window.__game.journal.filter((x) => /investigated the new clay pot/.test(x.text)).length); ck('one journal line for it', j1 === 1, String(j1));
await sim(420, pot); m = await mem(); ck('it goes back to it again and again: familiar', m.fam[pot].n >= 2 && m.fam[pot].k >= 0.3, JSON.stringify(m.fam[pot]));
// moved while it is at the far end of the tank, out of sight of both places
await p.evaluate(() => { const f = window.__fishes.list[0]; f.pos.set(-4.2, f.pos.y, -1.5); f.vel.set(0, 0, 0); f.inspect = null; f.inv = null; f.st.s = 'rest'; f.st.mode = null; f.st.t = 3; });
const tucked = await p.evaluate(() => { const f = window.__fishes.list[0]; return Math.hypot(f.pos.x - 2.4, f.pos.z - 1.2); });
await p.evaluate((pot) => { const d = window.__game.state.decor.find((x) => x.id === pot); window.__oldSpot = { x: d.x, z: d.z }; return window.__game.dispatch({ t: 'moveDecor', id: pot, x: d.x + 1.6, z: d.z - 0.6, ry: 0 }); }, pot);
await p.evaluate(() => { const f = window.__fishes.list[0]; f.tired = 0; });
const mv = await sim(300, pot); m = await mem();
ck('moved out of its sight, it first goes to where the pot used to be', mv.oldMin < 1.6 && mv.phases.some((x) => /old/i.test(x)), `it was ${tucked.toFixed(2)} away, came within ${mv.oldMin.toFixed(2)} of the old spot; phases ${mv.phases}`);
ck('then finds it in its new spot and knows it is the same one', !m.fam[pot].mv && Math.abs(m.fam[pot].x - (await p.evaluate(() => window.__oldSpot.x)) - 1.6) < 0.05, JSON.stringify(m.fam[pot]));
const found = await p.evaluate(() => window.__game.journal.filter((x) => /in its new spot/.test(x.text)).length); ck('and the journal says so, once', found === 1, String(found));
// reload: the memory is the tank's
await p.reload(); await p.waitForFunction(() => window.__game?.state && window.__fishes?.list?.length, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const after = await p.evaluate((pot) => { const f = window.__fishes.list.find((x) => x.sk === 'octopus'); return { fam: f.fam?.[pot] ?? null, likes: f.likeIds }; }, pot);
ck('after a reload it still knows the pot (and its favorites)', after.fam?.n >= 2, JSON.stringify(after));
// taken out
await p.evaluate(() => document.querySelectorAll('#goal,#coach,#toast,header,nav,#modal,#settle,#reunion,#fishpill').forEach((e) => (e.style.display = 'none')));
await p.evaluate((pot) => window.__game.dispatch({ t: 'sellDecor', id: pot }), pot); const gone = await sim(90, pot);
const stillAfter = await p.evaluate((pot) => { const f = window.__fishes.list[0]; return !!(f.inv?.id === pot || f.inspect?.id === pot); }, pot); m = await mem();
ck('taken out: it stops going after it, and does not go looking forever', !stillAfter && m.fam[pot]?.gone && !m.likes.includes(pot), JSON.stringify({ stillAfter, e: m.fam[pot] }));
ck('memory stays small', Object.keys(m.fam).length <= 12 && (m.likes ?? []).length <= 3);
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Awareness checks passed'); process.exit(fails ? 1 : 0);
