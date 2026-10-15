// How seahorses really get their food in an ordinary tank: three seahorses and six other fish among plants, fed the way a player feeds
// (a few taps, seven pieces each, a feed every minute and a half, mysis and flakes in turn), for about twenty minutes of tank time.
// Every meal a seahorse eats is counted as taken from its stem (still holding on) or after letting go to chase. Food is never steered
// towards a seahorse by the drill; the food moves only as it does in the game.
// Needs the solo game on 8123.  node tools/seahorse_feeding.mjs [feeds=14] [seed=1]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
const FEEDS = +(process.argv[2] || 14), SEED = +(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 430, height: 932 } })).newPage(); const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8123}/?q=0&dev=1&tod=noon`); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.hunger = 0.5; s.fish.length = 0; s.decor.length = 0; const born = Date.now() - 9 * 864e5;
  [['h1', 'Pip', 4, ['Curious']], ['h2', 'Pearl', 11, ['Shy']], ['h3', 'Moss', 23, ['Calm']]].forEach(([id, name, seed, traits]) => s.fish.push({ id, name, species: 'seahorse', seed, born, stage: 'adult', traits, happy: 0.8, health: 1 }));
  ['neon', 'danio', 'guppy', 'platy', 'goldfish', 'blue'].forEach((sp, i) => s.fish.push({ id: 'f' + i, name: 'F' + i, species: sp, seed: 3 + i * 7, born, stage: 'adult', traits: [['Calm', 'Greedy', 'Playful', 'Social', 'Curious', 'Brave'][i]], happy: 0.8, health: 1 }));
  s.decor.push({ id: 'p1', type: 'grass', x: -2.6, z: 2.0, ry: 0 }, { id: 'p2', type: 'sword', x: -1.0, z: 2.3, ry: 0 }, { id: 'p3', type: 'kelp', x: 0.6, z: 2.1, ry: 0 }, { id: 'p4', type: 'fern', x: 2.2, z: 2.0, ry: 0 },
    { id: 'p5', type: 'red', x: -1.8, z: 0.3, ry: 0 }, { id: 'p6', type: 'anemone', x: 1.4, z: 0.4, ry: 0 }, { id: 'a1', type: 'anchor', x: -0.2, z: -0.6, ry: 0.3 }, { id: 'r1', type: 'rock', x: 2.8, z: -0.4, ry: 0 });
  g.emit('state'); document.querySelectorAll('#coach,#toast,#settle,#reunion,#modal,#goal,#fishpill').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(1500);
const r = await p.evaluate(async ([FEEDS, SEED]) => {
  const F = window.__fishes; let s = SEED * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (const f of F.list) { f.noticeQ = null; f.exploreAt = null; }
  const hs = F.list.filter((f) => f.sp?.tail), out = { hitched: 0, free: 0, byKind: {}, fish: 0, released: 0, watched: 0, strikes: 0, perHorse: {} };
  const oe = F.onEat; F.onEat = (f) => { if (f.sp?.tail) { const on = !!f.holdfast?.on; out[on ? 'hitched' : 'free']++; const k = (out.byKind[f.lastFood ?? '?'] ||= { hitched: 0, free: 0 }); k[on ? 'hitched' : 'free']++; (out.perHorse[f.name] ||= { hitched: 0, free: 0 })[on ? 'hitched' : 'free']++; } else out.fish++; oe?.(f); };
  // note what each seahorse is eating (the piece it struck, or the one it bit)
  const seen = new Set(); let wasChase = new Map();
  const step = async (secs) => { for (let i = 0; i < secs * 20; i++) { window.__t = (window.__t ?? 0) + 0.05; for (const h of hs) { const pc = h.prey ?? h.flake; if (pc) h.lastFood = pc.kind ?? 'flakes'; if (h.prey && !seen.has(h.prey)) { seen.add(h.prey); out.watched++; } const c = !!h.chase; if (c && !wasChase.get(h)) out.released++; wasChase.set(h, c); }
    F.update(0.05, window.__t); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); F.observe?.(0.05, window.__t); if (i % 400 === 0) await new Promise((q) => setTimeout(q, 0)); } };
  await step(90);      // settle in: holdfasts found and taken
  for (let k = 0; k < FEEDS; k++) { const kind = k % 2 ? 'flakes' : 'mysis', n = 1 + Math.floor(rnd() * 3);      // one to three taps, as a player does
    for (let j = 0; j < n; j++) { F.drop(-3 + rnd() * 6, 7, kind); await step(0.7); }
    await step(90 - n * 0.7); }
  out.strikes = hs.reduce((a, h) => a + (h.strikesN ?? 0), 0);
  const tot = out.hitched + out.free; out.hitchedPct = tot ? Math.round(100 * out.hitched / tot) : 0; out.seahorseMeals = tot;
  return out;
}, [FEEDS, SEED]);
console.log(JSON.stringify(r));
console.log(`seahorse meals: ${r.seahorseMeals}, from the stem: ${r.hitched} (${r.hitchedPct}%), after letting go: ${r.free}; times a seahorse let go to chase: ${r.released}; pieces watched from a stem: ${r.watched}; other fish meals: ${r.fish}`);
console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join('; ') : 'no page errors'); await b.close();
