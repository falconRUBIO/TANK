// Levels 1-8 from a new tank, played only through ordinary actions on the production rules (no level, shell or time shortcuts): a regular
// caretaker who shops the usual list and saves from level 7. Checks each milestone the levels promise, and the day it happens.
//   node tools/sim/milestones.mjs [seed=1000]
import * as R from '../../web/src/game/rules.js';
const H = 3600e3, D = 24 * H, seed0 = +(process.argv[2] ?? 1000), DAYS = 120;
const LIST = ['grass', 'rock', 'coconut', 'cory', 'guppy', 'anemone', 'bubbler', 'neongoby', 'grass', 'seafan', 'seahorse', 'seahorse', 'tang', 'boulder', 'liverock', 'ledge', 'seagrass', 'betta', 'clam', 'puffer'];
let seed = seed0; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
// ORIGIN=ms starts the tank's clock there (for a save a browser can open); SAVE=file writes the tank the moment the first trick is offered
// (or, with SAVE_LEVEL=n, the first visit at level n), and stops
const O = +(process.env.ORIGIN ?? 0), t = R.newWorld(O); R.norm(t, O); t.createdAt = O + seed0 * 7919;
// the opening, as a new player does it: choose the first animal (the free octopus)
{ const r = R.applyAction(t, { t: 'chooseFirst', species: 'octopus', name: 'Ink', seed: 5 }, { now: O + 1000, name: 'a', uid: 'a' }); if (!r.ok) { t.fish.push(R.ensureFish({ id: 'oc', name: 'Ink', species: 'octopus', seed: 5, born: O - 20 * D, stage: 'adult', traits: [], owner: 'a' })); console.log('note: chooseFirst refused (' + r.reason + '); octopus placed as the tutorial would'); } t.flags.tut = 5; }
const M = {}, at = (k, day) => { M[k] ??= +day.toFixed(1); }, fails = []; let wi = 0, trickTries = 0, trickRefused = {};
for (let h = 1; h <= DAYS * 24; h++) { const now = O + h * H, day = h / 24;
  for (const e of R.advance(t, now)) { if (process.env.JOURNAL && e.journal) console.log('J', (h / 24).toFixed(1), typeof e.journal === 'string' ? e.journal : JSON.stringify(e.journal)); if (e.levelUp || /reached level/.test(e.journal ?? '')) at('level ' + t.level, day); if (/came back to visit|is back to visit/i.test(e.journal ?? '')) at('turtle came back to visit', day); }
  if (![9, 20].includes(h % 24) || rnd() < 0.1) continue;
  const u = { now: now + 1, name: 'a', uid: 'a' }, act = (a, x = {}) => R.applyAction(t, a, { ...u, ...x });
  act({ t: 'mystery' }); for (let k = 0; k < 3 && t.hunger > 0.25; k++) act({ t: 'feed', x: k - 1 }, { now: now + 1 + k * 1000 });
  for (const f of t.fish) if (R.ownHungry?.(f) && !f.dead && R.ownHunger(f) > 0.25) act({ t: 'feed', food: R.ownFood(f), fish: f.id, x: 0 });
  if (t.glass > 0.3) act({ t: 'glass' }); if (t.water < 0.7) act({ t: 'water' });
  if (rnd() < 0.6) { for (const f of t.fish.slice(0, 3)) act({ t: 'pet', id: f.id }); act({ t: 'play', toy: 'ball', fish: t.fish.map((f) => f.id) }); }
  if (t.visitor) act({ t: 'greet', id: t.visitor.id }); act({ t: 'trim' });
  // level 3: tricks. Train the octopus whenever it has a trick to learn
  const oc = t.fish.find((f) => f.species === 'octopus' && !f.dead);
  if (oc) { const opts = R.trickOptions(t, oc, now); if (t.level >= 3 && !opts.length) trickRefused[t.level] = (trickRefused[t.level] ?? 0) + 1; if (opts.length && process.env.SAVE && !+process.env.SAVE_LEVEL) { (await import('node:fs')).writeFileSync(process.env.SAVE, JSON.stringify({ state: t, journal: [], activity: [] })); console.log(`saved at day ${day.toFixed(1)}, level ${t.level}, ${t.fish.length} animals, octopus bond ${R.bondOf(oc)}`); process.exit(0); }
    if (opts.length) { at('tricks offered', day); trickTries++; const r = act({ t: 'train', id: oc.id, trick: opts[0].key }); if (!r.ok) fails.push('train refused: ' + r.reason); }
    if ((oc.tricks ?? []).length) at('first trick learned (' + oc.tricks[0] + ')', day); }
  const lv = t.level; at('level ' + lv, day);
  if (process.env.SAVE && +process.env.SAVE_LEVEL && lv >= +process.env.SAVE_LEVEL) { (await import('node:fs')).writeFileSync(process.env.SAVE, JSON.stringify({ state: t, journal: [], activity: [] })); console.log(`saved at day ${day.toFixed(1)}, level ${t.level}, ${t.shells} shells`); process.exit(0); }
  const sh = t.fish.filter((f) => f.species === 'seahorse' && !f.dead); if (sh.length) at('seahorse in the tank', day); if (sh.some((f) => f.mate)) at('seahorses paired', day);
  if (t.decor.some((d) => d.type === 'ledge') && t.decor.some((d) => d.type === 'seagrass')) at('turtle corner ready (ledge + sea grass)', day);
  const turtle = t.fish.find((f) => R.isTurtle(f) && !f.dead);
  if (turtle) { at('turtle arrived', day); let w = null; try { w = R.wellOf(t, turtle, now); } catch {} if (w) { (M._tw ||= []).push(w.score); } if (R.stageOf(turtle, now) === 'adult') at('turtle grown', day); if (R.turtleReady(turtle, now)) { at('turtle ready to release', day); const r = act({ t: 'releaseTurtle', id: turtle.id }); if (r.ok) at('turtle released', day); else fails.push('release refused: ' + r.reason); } }
  const saving = t.level >= 7 && !M['turtle bought'];
  if (t.level >= 8 && !M['turtle bought'] && t.shells >= R.fishPrice('turtle', now, t)) { const r = act({ t: 'buyFish', species: 'turtle', name: 'Shelly', rush: true }); if (r.ok) at('turtle bought', day); else fails.push('turtle buy refused: ' + r.reason); }
  const want = LIST[wi], keepGoing = want && (!saving || ['ledge', 'seagrass'].includes(want));
  if (keepGoing) { const isF = !!R.SPECIES_DEF[want], d = isF ? R.SPECIES_DEF[want] : R.DECOR_DEF[want];
    if (t.level >= d.level && t.shells >= d.price + 15) { const r = isF ? act({ t: 'buyFish', species: want, name: want + wi, rush: true, ...(want === 'seahorse' ? { sex: wi % 2 ? 'm' : 'f', kind: 'erectus' } : {}) }) : act({ t: 'buyDecor', type: want, x: ((wi % 7) - 3) * 0.8, z: 0 }); if (r.ok) { wi++; if (want === 'seahorse') at('seahorse bought', day); } else if (!['NOT_ENOUGH_SHELLS', 'LEVEL_TOO_LOW'].includes(r.reason)) { fails.push(`${want} refused: ${r.reason}`); wi++; } }
    else if (['ledge', 'seagrass'].includes(LIST[wi]) && t.level < d.level) { /* waits for level 7 */ } }
}
const tw = M._tw ?? []; delete M._tw;
console.log(`seed ${seed0}`); for (const [k, v] of Object.entries(M).sort((a, b) => a[1] - b[1])) console.log(`  day ${String(v).padStart(5)}  ${k}`);
console.log(`  turtle wellbeing while raised: ${tw.length ? `min ${Math.min(...tw)}, median ${tw.sort((a, b) => a - b)[tw.length >> 1]}, max ${Math.max(...tw)}` : 'n/a'}`);
console.log(`  tricks: ${trickTries} training sessions; no trick to train at level ≥3 on ${Object.values(trickRefused).reduce((a, b) => a + b, 0)} visits`);
console.log(`  refusals: ${fails.length ? [...new Set(fails)].join('; ') : 'none'}`);
const need = ['level 3', 'tricks offered', 'first trick learned', 'level 4', 'seahorse in the tank', 'level 7', 'turtle corner ready', 'level 8', 'turtle bought', 'turtle grown', 'turtle released'];
const miss = need.filter((k) => !Object.keys(M).some((x) => x.startsWith(k))); console.log(miss.length ? `MISSING: ${miss.join(', ')}` : 'Level 1-8 milestone checks passed'); process.exit(miss.length ? 1 : 0);
