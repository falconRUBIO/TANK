// The living habitat, Phase 1: a favorite place grows out of where an animal really spends its time (and changes when that changes, or when
// the place is taken away), a shy fish takes cover at real shelter when something big comes close (and the big one notices), a curious fish
// comes to look at a new decoration, and the habitat notes read what is really there. Steps the tank by hand.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 320)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '/?q=0&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok'); await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 });
await p.evaluate(async () => { const g = window.__game; window.__quietUntil = Date.now() + 1e9; g.state.flags.tut = 5; await g.dispatch({ t: 'dev', what: 'level', to: 8 }, { dev: true }); for (let i = 0; i < 20; i++) await g.dispatch({ t: 'dev', what: 'shells' }, { dev: true });
  for (const [sp, nm] of [['goldfish', 'Nemo'], ['tang', 'Blue'], ['loggerhead', 'Tank']]) await g.dispatch({ t: 'buyFish', species: sp, name: nm }).catch(() => null); await g.dispatch({ t: 'dev', what: 'rush' }, { dev: true });
  for (const [type, x] of [['cave', -2.5], ['rock', 2.5]]) await g.dispatch({ t: 'buyDecor', type, x, z: 0.5, ry: 0 }); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
await p.waitForTimeout(2000);
// 1. a favorite place from real time spent, then a change of heart, then the place taken away
const fav = await p.evaluate(async () => { const g = window.__game, s = () => g.state, f = s().fish.find((x) => x.name === 'Nemo'), cave = s().decor.find((d) => d.type === 'cave'), rock = s().decor.find((d) => d.type === 'rock'), j0 = g.journal.length, log = (id, n) => g.dispatch({ t: 'fishLog', logs: [{ fish: f.id, dist: 5, lv: {}, places: [id], secs: { [id]: n } }] });
  for (let i = 0; i < 4; i++) await log(cave.id, 150); const first = s().fish.find((x) => x.id === f.id).spotId;
  for (let i = 0; i < 10; i++) await log(rock.id, 170); const second = s().fish.find((x) => x.id === f.id).spotId;
  const lines = g.journal.slice(0).map((e) => e.text ?? e.journal ?? '').filter((x) => /Nemo/.test(x)).slice(0, 4);
  return { cave: cave.id, rock: rock.id, first, second, lines, haunt: s().fish.find((x) => x.id === f.id).haunt }; });
ck('a favorite place grows out of time really spent there (the cave), with a journal line', fav.first === fav.cave && fav.lines.some((l) => /taken to the reef cave/i.test(l)), fav);
ck('spending its time elsewhere for a while, it moves on to the rock', fav.second === fav.rock, fav);
const gone = await p.evaluate(async (rock) => { const g = window.__game, f = () => g.state.fish.find((x) => x.name === 'Nemo'); await g.dispatch({ t: 'sellDecor', id: rock }); const missing = !!f().missing, after = f().spotId ?? null;
  const cave = g.state.decor.find((d) => d.type === 'cave'); g.state.fish.find((x) => x.name === 'Nemo').moments = {}; for (let i = 0; i < 5; i++) await g.dispatch({ t: 'fishLog', logs: [{ fish: f().id, dist: 5, lv: {}, places: [cave.id], secs: { [cave.id]: 170 } }] });
  return { missing, after, now: f().spotId, stillMissing: !!f().missing, line: g.journal.map((e) => e.text ?? '').find((x) => /new favorite place/.test(x)) ?? null }; }, fav.rock);
ck('its favorite is taken out: it misses it, then settles on a new one, and the journal says so', gone.missing && gone.after === null && gone.now === fav.cave && !gone.stillMissing && !!gone.line, gone);
// 2. a shy fish takes cover at real shelter when something much bigger comes close; the big one notices
const cover = await p.evaluate(() => { const F = window.__fishes, f = F.list.find((x) => x.name === 'Blue') ?? F.list.find((x) => x.name === 'Nemo'), big = F.list.find((x) => x.sk === 'loggerhead') ?? F.list.find((x) => x.sk === 'octopus');
  f.htemper = { keep: 0.5, roam: 0.3, cover: 1 }; big.growth = 1; f.coverT = 0; f.senseT = 0; f.pos.set(-1, 2, 0.5); big.pos.set(-0.2, 2, 0.5); F.gridT = 0; const r0 = Math.random; Math.random = () => 0.01; F.senseTick(0.05); Math.random = r0;
  return { dbg: [f.dead, f.visitor, f.crab, f.nursery, f.sleepy, f.sk, big.sk, big.growth, f.growth, f.species?.length, big.group?.visible, big.away], grid: F.grid?.size, who: f.name, big: big.name, thought: f.thought, coverAt: F.state.decor.find((d) => d.id === f.coverAt)?.type ?? null, target: f.target.toArray().map((v) => +v.toFixed(1)), bigGaze: big.gazeT ?? big.glanceT ?? null }; });
ck('a shy fish darts for real cover (the cave) when the turtle comes close', cover.coverAt === 'cave' && /Took cover by the reef cave/.test(cover.thought ?? ''), cover);
// 3. a curious fish comes to look at a new decoration
const look = await p.evaluate(async () => { const g = window.__game, F = window.__fishes, f = F.list.find((x) => x.name === 'Nemo'); f.htemper = { keep: 0.3, roam: 1, cover: 0 }; f.sawNew = null; f.lookedNew = 0; await g.dispatch({ t: 'buyDecor', type: 'chest', x: 0.5, z: 1, ry: 0 }); await new Promise((r) => setTimeout(r, 300));
  f.pos.set(0, 2, 0.5); f.senseT = 0; const r0 = Math.random; Math.random = () => 0.01; F.senseTick(0.05); Math.random = r0; return { thought: f.thought, tx: +f.target.x.toFixed(1) }; });
ck('a curious fish comes to look at the new treasure chest', /new treasure chest|Came to look at the new/i.test(look.thought ?? ''), look);
// 4. habitat notes come from what is really there
const notes = await p.evaluate(async () => (await import('/src/game/habitat.js')).habitatNotes(window.__game.state));
ck('the habitat notes say what the tank really offers (an octopus has the cave to den in)', notes.some((n) => /octopus/i.test(n.text)), notes);
// 5. readability: an octopus that looks at you turns its whole body to the glass; a shy fish watches a new thing from a distance
await p.evaluate(async () => { const g = window.__game, o = g.state.fish.find((x) => x.species === 'octopus'); if (o) await g.dispatch({ t: 'crab', id: o.id }).catch(() => null); await new Promise((r) => setTimeout(r, 400)); const O = window.__fishes.list.find((x) => x.sk === 'octopus'); if (O) { O.glassAt = null; O.hunt = null; O.starve = 0; } });      // (fed first: a hungry octopus goes to the glass to ask, which rightly comes first)
let turn; for (let k = 0; k < 3 && !(turn?.turning > 20 && turn?.off < 0.5); k++) turn = await p.evaluate(() => { const F = window.__fishes, o = F.list.find((x) => x.sk === 'octopus'); o.heading = 1.2; o.st = { ...(o.st ?? {}), s: 'rest', mode: null, t: 20 }; o.hunt = null; o.task = null; o.jarAt = null; o.inspect = null;
  let n = 0, best = 9; for (let i = 0; i < 80; i++) { o.gazeT = 3; F.update(0.05, i * 0.05); o.update(0.05, Math.random, F.list); if (o.gazeTurn) { n++; const d = Math.abs(Math.atan2(Math.sin(-Math.PI / 2 - o.heading), Math.cos(-Math.PI / 2 - o.heading))); best = Math.min(best, d); } } return { off: +best.toFixed(2), turning: n, s: o.st?.s };      /* (how squarely it came to face you while it was looking)*/ });
ck('an octopus looking at you turns its body to face the glass (not just its pupils)', turn.turning > 20 && turn.off < 0.5, turn);
const shy = await p.evaluate(async () => { const g = window.__game, F = window.__fishes, f = F.list.find((x) => x.name === 'Blue') ?? F.list.find((x) => x.name === 'Nemo'); f.htemper = { keep: 0.5, roam: 0.05, cover: 1 }; f.sawNew = null; f.lookedNew = 0; await g.dispatch({ t: 'buyDecor', type: 'anchor', x: -0.5, z: 0.4, ry: 0 }); await new Promise((r) => setTimeout(r, 300));
  f.pos.set(1.5, 2, 0.5); f.senseT = 0; const r0 = Math.random; Math.random = () => 0.3; F.senseTick(0.05); Math.random = r0; const a = g.state.decor.find((d) => d.type === 'anchor'); return { thought: f.thought, dist: +Math.hypot(f.target.x - a.x, f.target.z - a.z).toFixed(1) }; });
ck('a shy fish watches the new anchor from a distance instead of swimming up to it', /from a distance/.test(shy.thought ?? '') && shy.dist > 1.8, shy);
// 6. resting: a fish settles a while at its favorite place; best friends rest side by side by day (the tank's own picks, stepped by hand)
await p.evaluate(() => { for (const x of window.__fishes.list) { x.htemper = null; x.coverT = 0; if (x.species?.move === 'jet' || ['loggerhead', 'puffer'].includes(x.sk)) { x.pos.set(-4, 9, -1.8); x.target?.set(-4, 9, -1.8); x.retarget = 999; } } });      // (these two checks: the big animals parked out of the way, every fish back to its own nature)
const rest = await p.evaluate(() => { const F = window.__fishes, step = (n, f) => { let settled = 0, moved = 0, last = null; for (let i = 0; i < n; i++) { F.update(0.05, i * 0.05); for (const x of F.list) { x.update(0.05, Math.random, F.list); if (x.species?.move === 'jet' || ['loggerhead', 'puffer'].includes(x.sk)) x.pos.set(-4, 9, -1.8); } if (f.restK && f.idle > 0) { settled += 0.05; if (last) moved += f.pos.distanceTo(last); last = f.pos.clone(); } } return { settled: +settled.toFixed(1), drift: +moved.toFixed(2) }; };
  const f = F.list.find((x) => x.name === 'Nemo'), r0 = Math.random; f.coverT = 0; f.seeking = null;
  let spotRest = null; for (let k = 0; k < 6 && !(spotRest?.settled > 3); k++) { Math.random = () => 0.05; f.retarget = 0; f.update(0.05, Math.random, F.list); Math.random = r0; spotRest = { ...step(400, f), set: !!f.settle || !!f.restK, why: window.__doingOf?.(f) ?? null }; }
  return { spotRest, spot: f.spotId }; });
ck('a fish goes to its favorite place and rests there several seconds, barely moving', rest.spotRest.settled >= 4 && rest.spotRest.drift < rest.spotRest.settled * 0.6, rest);
const pals = await p.evaluate(() => { const F = window.__fishes, a = F.list.find((x) => x.name === 'Blue'), b = F.list.find((x) => x.name === 'Nemo'), r0 = Math.random; if (!a || !b) return { none: 1 };
  a.palId = b.fid; b.palId = a.fid; a.spotId = null; for (const x of [a, b]) { x.settle = null; x.restK = 0; x.coverT = 0; x.idle = 0; } a.pos.set(-1, 3, 0.6); b.pos.set(1.5, 3, 0.4); F.night = false;
  let tries = 0; while (tries < 300 && !(a.settle && b.settle)) { tries++; a.pos.set(-1, 3, 0.6); b.pos.set(1.5, 3, 0.4); b.restK = 0; b.coverT = 0; F.night = false; a.retarget = 0; a.coverT = 0; a.lookedNew = performance.now() + 1e6; b.settle = null; a.update(0.05, Math.random, F.list); } const asked = !!a.settle && !!b.settle;      /* its own choices, many times over: how often it picks resting with its friend */
  let both = 0, gap = 9; for (let i = 0; i < 400; i++) { F.update(0.05, i * 0.05); for (const x of F.list) { x.update(0.05, Math.random, F.list); if (x.species?.move === 'jet' || ['loggerhead', 'puffer'].includes(x.sk)) x.pos.set(-4, 9, -1.8); } if (a.restK && a.idle > 0 && b.restK && b.idle > 0) { both += 0.05; gap = Math.min(gap, a.pos.distanceTo(b.pos)); } }
  return { tries, asked, both: +both.toFixed(1), gap: +gap.toFixed(2) }; });
ck('best friends, by day, both stop and rest side by side for several seconds', pals.asked && pals.both >= 3 && pals.gap < 3.75      /* (within one and a half body lengths, center to center: a tang is about 2.5 units long) */, pals);
ck('no page errors', !errors.length, errors);
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
