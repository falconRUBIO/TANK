# Tako Cove — core loop code for review

Excerpts of the game's loop: economy, levels, growth, shop pacing, Field Guide, daily mystery, decisions, layout, goals, raising, genetics, the Today sheet, and a 60-day pacing simulation. Shared rules run on both the phone and the Node server. Please review the loop design and the code: balance, pacing, bugs, what to cut or merge.

## rules.js: shop curve, levels, growth, daily special, score

```js
// ── The shop's curve ── a few basics to start, three or four new things with each level, and the price climbing with them: basics are a day or
// two of shells, nice pieces most of a week, centerpieces a few weeks of saving. Two pieces are never for sale: they are earned (EARNED).
const SHOP_CURVE = {
  grass: [1, 8], rock: [1, 8], moss: [1, 8], fern: [1, 10], starfish: [1, 10], coconut: [1, 12],
  sword: [2, 14], red: [2, 16], boulder: [2, 20], shell: [2, 22],
  pot: [3, 26], brain: [3, 28], anemone: [3, 32], kelp: [3, 30],
  wood: [4, 38], pillar: [4, 42], bubbler: [4, 48], skull: [4, 40],
  lantern: [5, 60], table: [5, 64], bamboo: [5, 55],
  chest: [6, 85], anchor: [6, 95], arch: [6, 120],
  bridge: [7, 150], crystal: [7, 190],
  spire: [8, 400],
};
for (const [k, [level, price]] of Object.entries(SHOP_CURVE)) if (DECOR_DEF[k]) Object.assign(DECOR_DEF[k], { level, price });
// earned, never bought: the torii gate for the first rare color bred here, the lighthouse for the third goal finished
export const EARNED = { torii: { why: 'Breed your first rare color', line: 'A torii gate for the tank: you bred your first rare color.' }, lighthouse: { why: 'Finish three goals', line: 'A lighthouse for the tank: three goals finished.' } };
for (const k of Object.keys(EARNED)) if (DECOR_DEF[k]) Object.assign(DECOR_DEF[k], { level: 1, price: 0, earned: true });
const SPECIES_CURVE = { goldfish: [1, 10], neon: [1, 20], cory: [2, 22], guppy: [2, 26], platy: [3, 36], blue: [3, 42], angelfish: [4, 60], seahorse: [4, 70], danio: [5, 50], betta: [5, 80], octopus: [6, 120] };
for (const [k, [level, price]] of Object.entries(SPECIES_CURVE)) if (SPECIES_DEF[k]) Object.assign(SPECIES_DEF[k], { level, price });
export const LEVEL_AT = [0, 20, 52, 120, 230, 360, 470, 590];                     // score needed for each level (see scoreOf: it grows by playing, not by buying)
export const MAX_DECOR = 60;
export const BOUNDS = { x: [-4.4, 4.4], z: [-3.6, 3.9] };              // the sand you can put things on: from the back of the high bank to the glass
export const NAMES = ['Pip', 'Mango', 'Bubbles', 'Nori', 'Coral', 'Biscuit', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Waffles', 'Misty'];
// The rhythm of looking after the tank (the water and glass come due a little before three full days, so someone who visits once a day at about the same time meets them on the third). Feeding is the everyday visit, about twice a day, because watching the fish rush for food
// and the octopus hunt its crab is the fun part. The water and the glass are a bigger job every few days, and pay more for it.
// A tank that misses a day is fine: a fish only starts to suffer after a day and a half with no food, or about five days of old water.
export const CARE = {
  meal: 12,         // hours after a full meal until the fish are due another (hunger 0 to 0.3)
  crab: 12,         // hours after a crab until an octopus is due its next (hunger 0 to OCTO_DUE)
  water: 66,        // hours until fresh water turns cloudy enough to change (1 to 0.7, with the little each meal leaves behind)
  glass: 66,        // hours until clean glass needs a wipe (0 to 0.3)
};
export const OCTO_DUE = 0.4, WATER_PAY = 0, GLASS_PAY = 0, PEARL_PAY = 0;      // care is care, not a job: it pays nothing (the shells come from the day's mystery, wishes and visitors)
export const HR = 0.3 / (CARE.meal * 3600), WR = 0.29 / (CARE.water * 3600), GR = 0.3 / (CARE.glass * 3600);   // per second
export const OHR = OCTO_DUE / (CARE.crab * 3600);                                 // an octopus has its own hunger, and only its own caretaker can feed it (a crab)
// how long until each part of the care is due, in milliseconds (0 when it is due now); a fish's own octopus hunger if one is given
export const dueIn = (t, what, f = null) => {
  const left = what === 'meal' ? (0.3 - t.hunger) / HR : what === 'crab' || what === 'mysis' ? (OCTO_DUE - ownHunger(f)) / OHR : what === 'water' ? (t.water - 0.7) / (WR * (1 + 0.5 * Math.min(2, t.floaters?.length ?? 0))) : what === 'glass' ? (0.3 - t.glass) / GR : 0;
  return Number.isFinite(left) ? Math.max(0, Math.round(left * 1000)) : 0;
};                                        // an octopus has its own hunger: it goes from fed to starving in about eight hours, and only its own caretaker can feed it (a crab)
export const isOcto = (f) => f?.species === 'octopus';
// What a fish fetches when it is sold to a new home: half of what was paid for it. A fish that came free (the first fish, a hatched egg, a
// rare visitor's gift) fetches nothing, so selling can never make shells from nothing. A fish from before prices were recorded counts as bought.
export const sellValue = (f) => { const d = SPECIES_DEF[f?.species]; if (!d) return 0; const paid = f.paid ?? (f.parents?.length ? 0 : Math.floor(d.price / d.count)); return Math.max(0, Math.floor(paid / 2) - (f.grewPay ?? 0)); };      // (less what it already paid out growing up: raising one to sell never makes shells)
// The tank's first caretaker: whoever sits in the first seat (the one who made the tank), or the lowest seat taken if that one has left.
export const founderOf = (members) => (members?.length ? members.reduce((a, m) => ((m.slot ?? 9) < (a.slot ?? 9) ? m : a)).id : null);
// who may sell a fish: its own caretaker, or anyone when it has none (or its caretaker has left the crew), and the tank's first caretaker
// may sell any fish, so a tank is never stuck with the octopus of someone who quit; alone, you may sell any
export const canSell = (f, uid, members = null) => !!f && !f.dead && (!members || !f.owner || f.owner === uid || !members.some((m) => m.id === f.owner) || founderOf(members) === uid);
// an octopus and a seahorse each have their own hunger, and only their own caretaker feeds them (an octopus a crab, a seahorse mysis shrimp);
// one with no caretaker (or alone in a solo tank) anyone may feed. Every other fish eats from the tank's shared food.
export const ownFood = (f) => (isOcto(f) ? 'crab' : f?.species === 'seahorse' ? 'mysis' : null);
export const ownHungry = (f) => !!ownFood(f);
export const ownHunger = (f) => (ownHungry(f) ? Math.max(0, Math.min(1, f.hunger ?? 0.3)) : 0);
export const canFeedOwn = (f, uid, shared = true) => ownHungry(f) && !f.dead && (!shared || !f.owner || f.owner === uid);
export const octoHunger = (f) => (isOcto(f) ? ownHunger(f) : 0);
export const canFeedOcto = (f, uid, shared = true) => isOcto(f) && canFeedOwn(f, uid, shared);
const DAY = 864e5;

export const STAGE_SCALE = { baby: 0.62, juvenile: 0.82, adult: 1 };
// lifespans in days: real aquarium lifespans, compressed about tenfold (the octopus a little less, so there is time to win its trust)
export const LIFESPAN = { goldfish: 420, angelfish: 420, blue: 300, cory: 300, guppy: 300, betta: 300, neon: 240, platy: 240, danio: 240, seahorse: 180, octopus: 120, sunangel: 420, moonbetta: 300, rosecory: 300 }, ELDER_AT = 0.75;
export const lifeOf = (f) => LIFESPAN[f.species] ?? 300;
export const BABY_DAYS = 3, ADULT_DAYS = 10;      // a baby for three days, a juvenile until day ten, then grown (slow enough to watch it happen)
export function stageOf(fish, now = Date.now()) { const d = (now - fish.born) / DAY; return d < BABY_DAYS ? 'baby' : d < ADULT_DAYS ? 'juvenile' : 'adult'; }
// how big it is, smoothly, from the day it hatched to the day it is grown: tiny fresh from the egg, half grown by the end of the baby days
export function growthScale(fish, now = Date.now()) { const d = Math.max(0, (now - (fish.hatched ?? fish.born)) / DAY), lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k)); const start = fish.parents?.length ? 0.2 : STAGE_SCALE.baby;
  return d < BABY_DAYS ? lerp(start, STAGE_SCALE.juvenile * 0.9, d / BABY_DAYS) : lerp(STAGE_SCALE.juvenile * 0.9, 1, (d - BABY_DAYS) / (ADULT_DAYS - BABY_DAYS)); }
export function nextStage(fish, now = Date.now()) {
  const age = now - fish.born, s = stageOf(fish, now);
  if (s === 'adult') return null;
  const ms = (s === 'baby' ? BABY_DAYS : ADULT_DAYS) * DAY - age, h = Math.ceil(ms / 36e5);
  return { to: s === 'baby' ? 'juvenile' : 'adult', ms, label: h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h <= 1 ? 'under an hour' : `${h}h` };
}
// The next chapter of one animal's life, in a line, for the top of its card: what it is on its way to, and roughly when (from the rules, so it is true).
export function storyNext(t, f, now = Date.now()) {
  if (!f || f.dead) return null; const nm = (id) => t.fish.find((x) => x.id === id && !x.dead)?.name, days = (ms) => { const d = Math.max(0, ms) / DAY; return d < 1 ? (ms < 3 * HOUR ? 'any time now' : 'later today') : d < 1.6 ? 'about a day' : `about ${Math.round(d)} days`; };
  if (f.away) return null;
  const egg = (t.eggs ?? []).find((e) => e.id === f.brood || e.guard === f.id || e.a === f.id || e.b === f.id);
  if (egg) return egg.ready ? 'The eggs are ready to hatch. Be there to watch.' : `${f.brood === egg.id ? 'Guarding' : 'Waiting on'} the eggs: they hatch in ${days(egg.hatchAt - now)}.`;
  if (f.preg) return f.preg.ready ? 'About to give birth. Be there to watch.' : `Carrying young in his pouch: due in ${days(f.preg.due - now)}.`;
  const ns = nextStage(f, now); if (ns) { const L = raiseLean(f), how = L.pending ? (L.n ? ` Leaning ${L.tr.toLowerCase()} so far, from how you raise it.` : ' How you raise it now decides who it becomes: pet it, play, hide treats, feed it every day.') : ` If it grew up today it would be ${L.tr.toLowerCase()}.`; return `Grows into ${ns.to === 'adult' ? 'an adult' : 'a juvenile'} in ${ns.label}.${how}`; }
  if (isOcto(f) && f.partner && nm(f.partner)) { const tog = (now - (f.partneredAt ?? now)) / DAY; return tog < OCTO_EGG_AFTER ? `Partners with ${nm(f.partner)} for ${Math.floor(tog)} day${Math.floor(tog) === 1 ? '' : 's'}. Octopus partners lay after about ${OCTO_EGG_AFTER}, if they have a den.` : `Partners with ${nm(f.partner)}. ${f.home ? 'Eggs could come any day now.' : 'They need a den of their own for eggs.'}`; }
  if (f.mate && nm(f.mate)) return `Paired with ${nm(f.mate)}. Seahorses pair for life, and the father carries the young.`;
  const same = t.fish.filter((x) => x !== f && !x.dead && x.species === f.species);
  if (!same.length && !SPECIES_DEF[f.species]?.visitor) return `The only ${(SPECIES_DEF[f.species]?.label ?? 'one').toLowerCase()} here. Another could become its friend, or more.`;
  if (f.pal && nm(f.pal)) return `Best friends with ${nm(f.pal)}.`;
  return null;
}
// What is coming, in plain words, for the end of the first session: a reason to come back that is actually true.
export function firstPromises(t, now = Date.now()) {
  const out = [], f = t.fish[0], n = f && nextStage(f, now); if (n) out.push(`${f.name} grows up in ${n.label}.`);
  if (!t.drift && t.driftAt > now && now - (t.createdAt ?? now) < 2 * DAY) out.push('Something will turn up in the tank within a few hours.');
  if (t.visitAt && t.visitAt > now && t.visitAt - now < 30 * HOUR) out.push('A rare visitor may drop by tomorrow.');
  out.push('Tomorrow the tank has a new request for you.'); return out.slice(0, 4);
}
export const levelFor = (score) => LEVEL_AT.reduce((l, need, i) => (score >= need ? i + 1 : l), 1);
// one fish is a quarter cheaper each day; a reason to look in the shop, never a penalty for missing a day
export const dailyFish = (now = Date.now()) => { const ids = Object.keys(SPECIES_DEF).filter((k) => !SPECIES_DEF[k].visitor); return ids[Math.floor(now / 864e5 + 3) % ids.length]; };
// Today's special in the shop carries a rare color (hidden in its genes, named in the shop): it costs a little more, not less
// For a tank it is picked to be useful: a kind already living there (so it can pair), carrying the color of the goal being worked on, or one
// that a fish there already carries; with nothing to go on, the day's fish and a color of the day.
export function specialOf(t, now = Date.now()) {
  const day = Math.floor(now / DAY), cols = Object.keys(MORPHS), h = hash32(day * 41 + ((t?.createdAt ?? 0) % 997)), live = (t?.fish ?? []).filter((f) => !f.dead && !isOcto(f) && SPECIES_DEF[f.species]?.count === 1 && !SPECIES_DEF[f.species]?.visitor && (SPECIES_DEF[f.species]?.level ?? 99) <= (t?.level ?? 1));
  const goalCol = t?.goal && MORPHS[t.goal.id] ? t.goal.id : null, carried = live.flatMap((f) => allelesOf(f).filter((x) => MORPHS[x]).map((c) => [f.species, c]));
  const pick = goalCol ? carried.find(([, c]) => c === goalCol) ?? (live.length ? [live[h % live.length].species, goalCol] : null) : carried.length ? carried[h % carried.length] : live.length ? [live[h % live.length].species, cols[h % cols.length]] : null;
  return pick ? { species: pick[0], color: pick[1] } : { species: dailyFish(now), color: cols[day % cols.length] };
}
export const specialColor = (now = Date.now(), t = null) => specialOf(t, now).color;
export const fishPrice = (id, now = Date.now(), t = null, special = false) => { const p = SPECIES_DEF[id].price; return special && id === specialOf(t, now).species && !isOcto({ species: id }) ? specialPrice(id) : p; };
export const specialPrice = (id) => Math.ceil(SPECIES_DEF[id].price * 1.4) + 8;      // (the carrier is a choice, beside the plain one at the usual price)
// The first fish is free and chosen: one of these, named by the player who brings it in.
export const FIRST_FISH = ['octopus'];                       // everyone starts with an octopus of their own, in a color they choose; fish come from the shop
export const OCTO_PALS = 6;
const palOf = (a, seed) => (Number.isInteger(a.pal) && a.pal >= 0 && a.pal < OCTO_PALS ? a.pal : seed % OCTO_PALS);
export const isFree = (t, type) => (t.flags.starter?.[type] ?? 0) > 0 || (t.flags.freePlant > 0 && DECOR_DEF[type].cat === 'PLANTS');
export const FLOORS = { sand: 'Sand', pearl: 'Pearl', gravel: 'Gravel', black: 'Black sand', coral: 'Pink coral' };
export const BACKDROPS = { candy: 'Candy', lagoon: 'Lagoon', sunset: 'Sunset', mint: 'Mint' };
// Sand and Candy are free; the other looks are bought once with shells and kept by the tank.
export const STYLE_PRICE = { floor: { sand: 0, pearl: 20, gravel: 20, black: 30, coral: 40 }, backdrop: { candy: 0, lagoon: 25, sunset: 25, mint: 25 } };
export const styleOwned = (t, kind, key) => !(STYLE_PRICE[kind]?.[key] > 0) || !!t.flags.styles?.[kind]?.[key];
export const pending = (t) => (t.orders ?? []).reduce((n, o) => n + SPECIES_DEF[o.species].count, 0);
export const capacity = (level) => 4 + 3 * level;
// life goes on in a full tank: eggs, hatchlings and a kept seahorse baby may go a little over what the shop allows (bought fish never do),
// so a finished tank still has births, and old age makes room again in time
export const BIRTH_ROOM = 4;
// The tank's level grows from what you do with it, never from what you buy: days of care, mysteries solved, decisions made, eggs hatched,
// babies raised to adulthood, rare colors bred, goals finished, Field Guide pages and the kinds of animal it has known. (So spending
// shells cannot buy the next level; looking after the tank and playing the game is what opens the shop's next shelf.)
export function scoreOf(t, now = Date.now()) { const S = t.stats ?? {}, n = (k) => S[k] ?? 0, raised = Object.keys(S).filter((k) => k.startsWith('raised_')).reduce((a, k) => a + S[k], 0);
  return 2 * n('careDays') + 2 * n('myst') + 3 * n('decided') + 4 * n('hatched') + 6 * n('grewHere') + 4 * raised + 10 * n('morphs') + 15 * (t.goalsDone ?? []).length + 3 * Object.keys(t.field ?? {}).length + 2 * (t.seen?.fish?.length ?? 0); }
export function traitsFor(species, seed) { const pool = SPECIES_DEF[species].traits, a = pool[seed % pool.length], b = pool[(seed * 7 + 3) % pool.length]; return a === b ? [a] : [a, b]; }

```

## rules.js: Field Guide, daily mystery, decisions, layout, goals

```js
// ── The Field Guide ── the remarkable things the animals do, each one filled in the first time someone in the tank sees it happen (the phone
// reports it while the tank is open and being watched; nothing is filled in from a line written while everyone was away). Each page keeps who did
// it, when, and the line that was written, so the journal's photo of that very moment is its picture.
export const FIELD = {
  glass: { label: 'Face at the glass', who: 'any', hint: 'Someone curious comes right up to look at you.' },
  camo: { label: 'Vanishing act', who: 'octopus', hint: 'An octopus matches the ground so well it disappears.' },
  ink: { label: 'Ink cloud', who: 'octopus', hint: 'A startled octopus bursts away in a cloud of ink.' },
  squirt: { label: 'Squirt!', who: 'octopus', hint: 'An octopus that is being watched sometimes answers back.' },
  bury: { label: 'Buried to the eyes', who: 'octopus', hint: 'An octopus digs into soft sand.' },
  flat: { label: 'Flatfish impression', who: 'octopus', hint: 'An octopus lies flat and slides across the sand.' },
  kelp: { label: 'Pretending to be a plant', who: 'octopus', hint: 'An octopus among the plants, arms up.' },
  lion: { label: 'Lionfish impression', who: 'octopus', hint: 'Arms out stiff, it passes for something dangerous.' },
  jelly: { label: 'Jellyfish impression', who: 'octopus', hint: 'Puffed up, drifting in open water.' },
  snake: { label: 'Sea snake impression', who: 'octopus', hint: 'Hidden in the sand, two striped arms showing.' },
  fish: { label: 'Copying a fish', who: 'octopus', hint: 'An octopus takes on a fish\'s colors and follows it.' },
  smack: { label: 'Too close!', who: 'octopus', hint: 'An octopus smacks a fish that crowds it.' },
  arms: { label: 'Touching arms', who: 'octopus', hint: 'Two octopuses that know each other well.' },
  ball: { label: 'Ball game', who: 'any', hint: 'Something sends the ball spinning across the tank.' },
  eggchase: { label: 'Guarding the eggs', who: 'fish', hint: 'A parent chases off anyone who comes near its eggs.' },
  chased: { label: 'Driven off', who: 'fish', hint: 'A brave parent charges at an octopus near its eggs.' },
  puzzle: { label: 'Puzzle solved', who: 'octopus', hint: 'An octopus works out the puzzle jar.' },
  visitor: { label: 'A rare visitor', who: 'any', hint: 'Now and then something from the open sea drops by. Tap it.' },
  hatch: { label: 'A hatching', who: 'fish', hint: 'Eggs ready to hatch wait for someone to watch.' },
  octohatch: { label: 'Baby octopuses', who: 'octopus', hint: 'Octopus partners, a den, and a lot of patience.' },
  seabirth: { label: 'A seahorse birth', who: 'seahorse', hint: 'Seahorse fathers carry the young. Be there when they are born.' },
};
export const FIELD_PAY = 0;      // (a page is its own reward: the photo, and the page filled in; the economy stays as it is)
function witness(t, id, f, now, ev, by = null, line = null) {
  const F = (t.field ||= {}); if (!FIELD[id] || F[id]) return false;
  if (by === 'You') by = null;      // (alone in the tank: no need to say who)
  F[id] = { at: now, fish: f?.id ?? null, name: f?.name ?? null, by, text: line }; const n = Object.keys(F).length, N = Object.keys(FIELD).length;
  ev.push({ journal: `Field Guide, page ${n} of ${N}: ${FIELD[id].label}.${by ? ` Seen first by ${by}.` : ''}`, toast: `New in the Field Guide: ${FIELD[id].label}!`, field: id }); return true;
}
// ── The daily mystery ── one small thing in the tank each day, there to be found: a glint, a trail of bubbles, tracks across the sand. Tapping
// it plays it out, and what it turns out to be differs from one day to the next; now and then it is not over, and tomorrow there is more.
// Nothing is owed and nothing is lost if it is missed: it is simply gone the next day (no streak, no reward to chase).
export const MYSTERY = {
  bubbles: { text: 'A thin trail of bubbles is rising from the sand.' },
  glint: { text: 'Something is glinting in the sand.' },
  tracks: { text: 'Little tracks wind across the sand.' },
  find: { text: 'Something has turned up on the sand.' },      // (what used to drift up on its own a few times a day: a pearl, lost shells, fish treats)
  eyes: { text: 'Two small eyes are watching from the plants.', ok: (t) => t.decor.some((d) => DECOR_DEF[d.type]?.cat === 'PLANTS') },
  bubbles2: { text: 'The bubbles are back, and stronger.', chain: true },
  tracks2: { text: 'Fresh tracks lead to the same place again.', chain: true },
};
const mystLive = (t) => t.fish.filter((f) => !f.dead && !f.away && !SPECIES_DEF[f.species]?.visitor);
function rollMystery(t, now) {
  const day = Math.floor(now / DAY); if ((t.flags.tut ?? 0) < 5 || t.myst?.day === day) return;
  const h = hash32(day * 71 + ((t.createdAt ?? 0) % 983)), N = t.mystNext?.day === day ? t.mystNext : null;
  const base = Object.keys(MYSTERY).filter((k) => !MYSTERY[k].chain && (!MYSTERY[k].ok || MYSTERY[k].ok(t))), kind = N ? N.kind : base[h % base.length];
  t.myst = { day, kind, x: N?.x ?? +(-3.8 + (h % 76) / 10).toFixed(1), z: N?.z ?? +(-0.8 + ((h >>> 8) % 22) / 10).toFixed(1), done: false, line: null, by: null }; t.mystNext = null;
  if (kind === 'find') t.myst.find = makeDrift(t, now);
}
export const mysteryOf = (t, now = Date.now()) => (t.myst && t.myst.day === Math.floor(now / DAY) ? t.myst : null);
// what it turns out to be: fixed by the day, so every phone in a shared tank finds the same thing
function mysteryOut(t, m, now) {
  const h = hash32(m.day * 97 + ((t.createdAt ?? 0) % 991)), live = mystLive(t), pick = (a) => (a.length ? a[(h >>> 4) % a.length] : null);
  const octo = pick(live.filter((f) => f.species === 'octopus')), any = pick(live), shy = pick(live.filter((f) => (f.traits ?? []).includes('Shy'))) ?? any, curious = pick(live.filter((f) => (f.traits ?? []).includes('Curious'))) ?? any;
  const decor = t.decor.length ? t.decor[(h >>> 6) % t.decor.length] : null, dl = decor ? (DECOR_DEF[decor.type]?.label ?? 'stone').toLowerCase() : 'big rock', r = h % 3;
  switch (m.kind) {
    case 'bubbles': return r === 0 ? { line: 'It was a tiny snail, breathing under the sand. It sank back out of sight.' }
      : r === 1 && curious ? { line: `${curious.name} came over to nose at the bubbles and dug up an old shell.`, fish: curious }
      : { line: 'The bubbles stopped the moment you looked. Something is down there.', next: 'bubbles2' };
    case 'find': { const g = m.find ?? { kind: 'shells', amount: 2 }, why = driftBlame(g, h);
      return g.kind === 'treat' ? { line: `Fish treats! ${why}`, treat: true } : g.kind === 'pearl' ? { line: `A pearl! ${why}`, pay: g.amount } : { line: `A few lost shells. ${why}`, pay: g.amount }; }
    case 'bubbles2': return { line: 'A little sea cucumber pushed up out of the sand, looked about, and slowly buried itself again. It lives here now.' };
    case 'glint': return r === 0 && octo ? { line: `It was ${octo.name}'s hidden stash: a shiny pebble, buried. ${octo.name} came straight over to take it back.`, fish: octo }
      : r === 1 && any ? { line: `One of ${any.name}'s old scales, shining like a tiny coin.`, fish: any }
      : { line: 'A piece of blue sea glass, worn smooth by the sea.' };
    case 'tracks': return r === 0 && octo ? { line: `${octo.name} went for a long walk across the sand in the night.${homeOf(t, octo) ? ' The tracks end at its den.' : ''}`, fish: octo }
      : r === 1 ? { line: 'A hermit crab passed through in the night and left by the far corner.' }
      : { line: `The tracks lead under the ${dl}, and stop. Keep an eye on it.`, next: 'tracks2' };
    case 'tracks2': return { line: `Under the ${dl}: a hermit crab has moved in, in a borrowed shell. It waved a claw at you.` };
    case 'eyes': return r === 2 ? { line: 'The eyes blinked and were gone. Something from the open sea is curious about the tank.', visit: true }
      : shy ? { line: `It was ${shy.name}, hiding in the plants to watch you.`, fish: shy } : { line: 'Only a shrimp, peering out. It hid again.' };
  }
  return { line: 'Whatever it was, it is gone.' };
}
// ── Decisions ── every few days something in the tank needs you to choose: two animals fighting over a den, one that looks unwell, an octopus
// that keeps pushing at the lid, a fish that keeps chasing another. Each choice costs something and changes what happens next; left alone for a
// day and a half, the tank decides for itself (and that is a choice too). What it turns out to be is fixed by the day, so every phone agrees.
export const DILEMMA = {
  den: { text: (x, y, d) => `${x.name} and ${y.name} keep fighting over the ${d}.`, opts: [['x', (x) => `Let ${x.name} have it`], ['y', (x, y) => `Let ${y.name} have it`], ['wait', () => 'Let them sort it out']] },
  sick: { text: (x) => `${x.name} looks pale and is hiding. It might be catching something.`, opts: [['treat', () => `Treat the water (${8} shells)`], ['isolate', () => 'Keep it apart for a day'], ['wait', () => 'Wait and see']] },
  lid: { text: (x) => `${x.name} keeps pushing at the lid. It wants out.`, opts: [['lid', () => 'Weigh the lid down'], ['busy', () => 'Keep it busy with a puzzle'], ['let', () => 'Let it explore']] },
  chase: { text: (x, y) => `${x.name} keeps chasing ${y.name} around the tank.`, opts: [['cover', (x, y) => `Move a plant to hide ${y.name}`], ['time', (x) => `Give ${x.name} a time out`], ['wait', () => 'Let them be']] },
};
export const DILEMMA_TREAT = 8;
const luckOf = (h) => (h >>> 11) % 100;
function rollDilemma(t, now, ev) {
  if ((t.flags.tut ?? 0) < 5) return; const D0 = t.dilemma;
  if (D0 && !D0.done && now >= D0.until) { const r = settleDilemma(t, D0, 'wait', now, null); ev.push(...r.events); }      // nobody chose: the tank decides
  if (now < (t.dilemmaAt ??= now + 3 * DAY)) return;      /* (the first one waits until the tank has settled: day three or four) */ t.dilemmaAt = now + (3 + (hash32(now / 6e4) % 2)) * DAY;
  const live = t.fish.filter((f) => !f.dead && !f.away && !SPECIES_DEF[f.species]?.visitor && stageOf(f, now) !== 'baby'), h = hash32(Math.floor(now / DAY) * 131 + ((t.createdAt ?? 0) % 977)), pick = (a, k = 0) => a[(h >>> k) % a.length];
  const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)), octos = live.filter(isOcto), fish = live.filter((f) => !isOcto(f)), c = [];
  const LO = layoutOf(t);
  if (dens.length && dens.length < octos.length + (fish.length ? 1 : 0) && live.length >= 2 && (octos.length >= 2 || (octos.length && fish.length))) { const x = octos[0], y = live.find((f) => f !== x); c.push({ kind: 'den', fish: [x.id, y.id], decor: (homeOf(t, x) ?? dens[0]).id }); }
  if (live.length >= 2) { const x = pick(live, 3); c.push({ kind: 'sick', fish: [x.id] }); }
  if (octos.length) c.push({ kind: 'lid', fish: [pick(octos, 5).id] });
  const calm = fish.filter((f) => !(f.calmUntil > now)); if (calm.length >= 1 && fish.length >= 2 && !(LO.thicket && luckOf(h) < 70)) { const x = pick(calm, 7), y = fish.find((f) => f !== x); c.push({ kind: 'chase', fish: [x.id, y.id] }); }
  if (!c.length) return; const D = pick(c, 9), F = D.fish.map((id) => t.fish.find((f) => f.id === id)), dl = D.decor ? (DECOR_DEF[t.decor.find((d) => d.id === D.decor)?.type]?.label ?? 'den').toLowerCase() : '';
  const crew = Object.entries(t.care ?? {}).filter(([, c]) => now - c.ts < 4 * DAY).sort((a, b) => (a[0] < b[0] ? -1 : 1)), turn = crew.length > 1 ? crew[(t.dlTurn = ((t.dlTurn ?? -1) + 1) % crew.length)] : null;      // in a shared tank, the caretakers take turns: it is one person's call first (12 hours), then anyone's
  t.dilemma = { id: 'dl' + Math.floor(now / 6e4), ...D, at: now, until: now + 1.5 * DAY, ...(turn ? { turn: { uid: turn[0], name: turn[1].name, until: now + 12 * HOUR } } : {}), text: DILEMMA[D.kind].text(F[0], F[1], dl), opts: DILEMMA[D.kind].opts.map(([k, l]) => ({ k, label: l(F[0], F[1]) })), done: false };
  ev.push({ journal: t.dilemma.text + (turn ? ` It is ${turn[1].name}'s call.` : ''), toast: `${t.dilemma.text} ${turn ? `${turn[1].name}'s call.` : 'What will you do?'}`, dilemma: t.dilemma.id });
}
function settleDilemma(t, D, k, now, name) {
  const events = [], F = D.fish.map((id) => t.fish.find((f) => f.id === id && !f.dead)), [x, y] = F, h = hash32((D.at / 6e4) | 0), luck = h % 100, who = name ? `${name} chose` : 'Nobody chose, so';
  const say = (line, f = x) => events.push({ journal: line, ...(f ? { story: f.id, text: line } : {}) }), hap = (f, d) => { if (f) f.happy = Math.max(0, Math.min(1, (f.happy ?? 0.7) + d)); };
  if (!x) { D.done = true; D.chose = k; return { ok: true, events }; }
  if (D.kind === 'den') { const dl = (DECOR_DEF[t.decor.find((d) => d.id === D.decor)?.type]?.label ?? 'den').toLowerCase();
    if (k === 'x' || k === 'y') { const [win, lose] = k === 'x' ? [x, y] : [y, x]; if (win && isOcto(win)) win.home = D.decor; hap(win, 0.15); hap(lose, -0.15); if (lose) lose.grudge = { id: win.id, name: win.name, since: now, why: 'den' }; say(`${who} to give the ${dl} to ${win.name}. ${lose?.name ?? 'The other'} has not forgotten.`, win); }
    else if (luck < 50 && y) { x.pal = y.id; y.pal = x.id; say(`${who} to let them sort it out. They did: ${x.name} and ${y.name} share the ${dl} now, and get on.`); }
    else { hap(x, -0.2); hap(y, -0.2); if (y) y.grudge = { id: x.id, name: x.name, since: now, why: 'den' }; say(`${who} to let them sort it out. They did not: ${x.name} and ${y?.name} are both on edge.`); } }
  if (D.kind === 'sick') {
    if (k === 'treat') { if (t.shells < DILEMMA_TREAT) return { ok: false, reason: 'NOT_ENOUGH_SHELLS', events }; t.shells -= DILEMMA_TREAT; x.ail = 0; hap(x, 0.1); say(`${who} to treat the water. ${x.name} is bright again by evening.`); }
    else if (k === 'isolate') { x.ail = Math.max(0, (x.ail ?? 0) - 0.1); const pal = t.fish.find((f) => f.id === x.pal && !f.dead); hap(pal, -0.15); hap(x, -0.1); say(`${who} to keep ${x.name} apart for a day. It did not spread${pal ? `, but ${pal.name} kept looking for it` : ''}.`); }
    else if (luck < 45) say(`${who} to wait and see. It was nothing: ${x.name} is back to itself.`);
    else { const others = t.fish.filter((f) => !f.dead && f !== x && !isOcto(f)).slice(0, 2); for (const f of [x, ...others]) f.ail = Math.min(0.9, (f.ail ?? 0) + 0.35); say(`${who} to wait and see. It spread: ${[x, ...others].map((f) => f.name).join(', ')} look unwell. Clean water and food will help.`); } }
  if (D.kind === 'lid') { t.adv ||= {};
    if (k === 'lid') { t.adv.octoAt = Math.max(t.adv.octoAt ?? now, now + 7 * DAY); hap(x, -0.2); say(`${who} to weigh the lid down. ${x.name} sulks in its den, but it stays in.`); }
    else if (k === 'busy') { t.adv.octoAt = Math.max(t.adv.octoAt ?? now, now + 3 * DAY); hap(x, 0.15); say(`${who} to keep ${x.name} busy. It forgets about the lid for now, and seems pleased with itself.`); }
    else { t.adv.octoAt = Math.min(t.adv.octoAt ?? Infinity, now + 2 * HOUR); hap(x, 0.2); say(`${who} to let ${x.name} explore. It will be off on an adventure soon.`); } }
  if (D.kind === 'chase') {
    if (k === 'cover') { hap(y, 0.15); say(`${who} to give ${y?.name} somewhere to hide. ${x.name} gave up the chase.`, y); }
    else if (k === 'time') { hap(x, -0.1); hap(y, 0.1); x.calmUntil = now + 2 * DAY; say(`${who} to give ${x.name} a time out. It is calmer for now.`); }
    else if (luck < 40) { hap(y, 0.05); if (y) { x.pal = y.id; y.pal = x.id; } say(`${who} to let them be. It was a game after all: ${x.name} and ${y?.name} are friends now.`); }
    else { hap(y, -0.25); if (y) y.grudge = { id: x.id, name: x.name, since: now }; say(`${who} to let them be. ${y?.name} is worn out and keeps away from ${x.name}.`, y); } }
  events.push({ dilemmaDone: { kind: D.kind, k, fish: D.fish } });      // (the tank shows it: the chased one hides, the octopus goes to its den or the glass)
  D.done = true; D.chose = k; D.by = name; return { ok: true, events };
}
// ── Layout ── where things stand matters. Two plants close together make a thicket where shy fish feel safe (and a bully loses interest);
// every octopus wants a den of its own (one den for two means fights, a den each and they settle faster); and a tank packed with things leaves
// no open water for the lively ones. Once a day it nudges how they feel, and Care says what would help.
export function layoutOf(t) {
  const P = t.decor.filter((d) => DECOR_DEF[d.type]?.cat === 'PLANTS'), thicket = P.some((a, i) => P.some((b, j) => j > i && Math.hypot(a.x - b.x, a.z - b.z) < 1.8));
  const live = t.fish.filter((f) => !f.dead && !f.away), octos = live.filter(isOcto).length, dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)).length, shy = live.filter((f) => (f.traits ?? []).includes('Shy')).length, lively = live.filter((f) => (f.traits ?? []).some((x) => x === 'Playful' || x === 'Active')).length;
  const packed = t.decor.length > Math.max(6, capacity(t.level ?? 1) * 0.9), notes = [];
  if (shy && !thicket) notes.push(P.length ? 'Move two plants close together: the shy ones need a thicket to hide in.' : 'The shy ones have nowhere to hide. Two plants side by side would help.');
  if (octos && dens < octos) notes.push(octos > 1 ? `${octos} octopuses and ${dens || 'no'} den${dens === 1 ? '' : 's'}: each wants its own.` : 'The octopus has no den of its own.');
  if (packed && lively) notes.push('The tank is packed: the lively ones need open water to swim.');
  return { thicket, dens, octos, packed, shy, lively, notes };
}
function layoutDay(t, now, ev) {
  const day = Math.floor(now / DAY); if (t.layoutDay === day) return; t.layoutDay = day; const L = layoutOf(t), hap = (f, d) => { f.happy = Math.max(0, Math.min(1, (f.happy ?? 0.7) + d)); };
  for (const f of t.fish) { if (f.dead || f.away) continue; const tr = f.traits ?? [];
    if (tr.includes('Shy')) hap(f, L.thicket ? 0.05 : -0.05);
    if (L.packed && (tr.includes('Playful') || tr.includes('Active'))) hap(f, -0.05);
    if (isOcto(f) && L.octos > L.dens) hap(f, -0.05); }
  if (L.thicket && L.shy && !t.flags.thicketSaid) { t.flags.thicketSaid = now; const sh = t.fish.find((f) => !f.dead && (f.traits ?? []).includes('Shy')); if (sh) ev.push({ journal: `${sh.name} has found the thicket, and hides there when it wants to.`, story: sh.id, text: 'Found a thicket to hide in.' }); }
}
// ── Goals ── a long aim for the tank, chosen from three: breed a rare color, raise a whole family, fill the Field Guide, earn an octopus's trust…
// Each has a few steps, each step says how to do it, and the next one is always on the home screen. Finishing one unlocks a new floor or
// backdrop (and some shells), and three new goals are offered. Steps count what happens from the day the goal is chosen (t.stats), so an
// old tank starts each goal fresh, and nothing is lost by changing your mind except the progress on that goal.
const statOf = (t, k) => t.stats?.[k] ?? 0;
export const bump = (t, k, n = 1) => { (t.stats ||= {})[k] = statOf(t, k) + n; };
const since = (k) => (t, g) => statOf(t, k) - (g.base?.[k] ?? 0);
const liveOf = (t) => t.fish.filter((f) => !f.dead && !f.away);
const carrierOf = (t, m) => liveOf(t).some((f) => (m ? allelesOf(f).includes(m) : allelesOf(f).some((x) => MORPHS[x])));
const colorGoal = (m) => ({
  title: m ? `Breed a ${MORPHS[m].label} fish` : 'Breed a rare color', blurb: m ? `${MORPHS[m].label} is hidden in your tank's genes. Bring two carriers together and see.` : 'Somewhere in your tank a rare color is hiding in the genes. Find it and breed it out.',
  ok: (t) => !m || carrierOf(t, m), icon: 'hatched',
  steps: [
    { text: m ? `Find a fish that carries ${MORPHS[m].label.toLowerCase()}` : 'Find a fish that carries a rare color', hint: "Open your fishes' cards: a carrier says \"Carries …\".", n: (t) => (carrierOf(t, m) ? 1 : 0), need: 1 },
    { text: 'Pair two carriers', hint: (t) => { const c = liveOf(t).filter((f) => (m ? allelesOf(f).includes(m) : allelesOf(f).some((x) => MORPHS[x]))).map((f) => f.name); return `${c.length ? `Your carriers: ${c.slice(0, 4).join(', ')}. ` : ''}On a carrier's card, tap "Pair with…": the odds are shown on each button.${c.length < 2 ? ' One carrier and a baby of its own can carry it too.' : ''}`; }, n: since(m ? `paired_${m}` : 'pairedRare'), need: 1 },
    { text: 'Hatch their babies', hint: (t) => (t.fish.length + pending(t) >= capacity(t.level) + BIRTH_ROOM ? 'Your tank is full, so no eggs can be laid: find one of your shop fish a new home, or send a baby to a friend.' : 'Keep the tank fed and the water clean while the eggs grow. Be there when they hatch.'), n: since('hatched'), need: 1 },
    { text: m ? `A ${MORPHS[m].label.toLowerCase()} baby` : 'A rare-colored baby', hint: 'About one baby in four from two carriers shows it. Keep trying: a full moon helps.', n: m ? since(`morph_${m}`) : since('morphs'), need: 1 },
  ] });
export const GOALS = {
  rare: colorGoal(null), gold: colorGoal('gold'), ghost: colorGoal('ghost'), blue: colorGoal('blue'), ember: colorGoal('ember'),
  family: { title: 'Raise a family', blurb: 'Eggs, a hatching you are there for, and one of the babies grown up in your care.', icon: 'friend', ok: (t) => liveOf(t).filter((f) => !isOcto(f) && f.species !== 'seahorse').length >= 2,
    steps: [
      { text: 'Bring a pair together', hint: 'Two grown fish of the same kind: tap "Pair with…" on one of their cards.', n: since('paired'), need: 1 },
      { text: 'Watch a hatching', hint: 'When eggs are ready, open the tank and watch: they wait for you.', n: since('watchedHatch'), need: 1 },
      { text: 'Raise a baby to adulthood', hint: 'Ten days: feed it, play with it, keep the water clean. How you raise it decides who it becomes.', n: since('grewHere'), need: 1 },
    ] },
  raise: { title: 'Four temperaments', blurb: 'Raise babies four different ways and get four different grown-ups.', icon: 'grown', ok: (t) => liveOf(t).length >= 2,
    steps: [
      { text: 'Raise a Brave one', hint: 'Pet it often while it is small.', n: since('raised_Brave'), need: 1 },
      { text: 'Raise a Playful one', hint: 'Play with it while it is small.', n: since('raised_Playful'), need: 1 },
      { text: 'Raise a Curious one', hint: 'Hide treats and give it puzzles while it is small.', n: since('raised_Curious'), need: 1 },
      { text: 'Raise a Calm one', hint: 'Feed it every day while it grows.', n: since('raised_Calm'), need: 1 },
    ] },
  guide: { title: 'Field naturalist', blurb: 'Catch your animals doing remarkable things and fill the Field Guide.', icon: 'spot', ok: (t) => Object.keys(t.field ?? {}).length < Object.keys(FIELD).length - 6,
    steps: [2, 4, 6].map((k) => ({ text: `${k} new Field Guide pages`, hint: 'Watch the tank: the Field Guide lists what to look for. A page fills the first time someone sees it.', n: (t, g) => Object.keys(t.field ?? {}).length - (g.base?.field ?? 0), need: k })) },
  octo: { title: 'An octopus family', blurb: 'Win an octopus over, give it a partner and a den, and see its babies hatch.', icon: 'trust', ok: (t) => liveOf(t).some(isOcto),
    steps: [
      { text: 'Your octopus trusts you', hint: 'Crabs from your hand, play, and time: it comes to the glass for you when it trusts you.', n: (t) => (liveOf(t).some((f) => isOcto(f) && Object.keys(f.bond ?? {}).some((u) => octoTrust(f, u).lvl >= 3)) ? 1 : 0), need: 1 },
      { text: 'Two octopus partners', hint: 'Two grown octopuses, a den each, both well fed: in a few days they become partners.', n: (t) => (liveOf(t).some((f) => isOcto(f) && f.partner) ? 1 : 0), need: 1 },
      { text: 'Eggs in the den', hint: 'Partners lay after about five days together, if she has a den.', n: since('octoEggs'), need: 1 },
      { text: 'Baby octopuses hatch', hint: 'Five days of guarding, then be there to watch.', n: since('octoHatch'), need: 1 },
    ] },
  peace: { title: 'A peaceful tank', blurb: 'Arrange the tank so everyone gets on, and settle the squabbles.', icon: 'friend', ok: (t) => { const L = layoutOf(t); return liveOf(t).length >= 3 && L.octos >= 1 && !(L.thicket && L.dens >= L.octos); },      /* (not offered when the layout is already right: the steps would be free) */
    steps: [
      { text: 'Make a thicket', hint: 'Move two plants close together: the shy ones hide there.', n: (t) => (layoutOf(t).thicket ? 1 : 0), need: 1 },
      { text: 'A den for every octopus', hint: 'A coconut shell or a clay pot each, from the Shop.', n: (t) => { const L = layoutOf(t); return L.dens >= L.octos ? 1 : 0; }, need: 1 },
      { text: 'Make three decisions', hint: 'When something needs your call, it waits in Care.', n: since('decided'), need: 3 },
      { text: 'Two pairs of friends', hint: 'Fish make friends when they are happy and the tank is calm.', n: (t) => Math.floor(liveOf(t).filter((f) => f.pal && t.fish.some((o) => o.id === f.pal && !o.dead)).length / 2), need: 2 },
    ] },
  dynasty: { title: 'Three generations', blurb: 'A baby you raised has babies of its own: a family line of your tank.', icon: 'grown', ok: (t) => t.fish.some((f) => !f.dead && (f.parents?.length || f.bornHere) && stageOf(f) === 'adult'),
    steps: [
      { text: 'Pair a fish you raised', hint: 'A grown baby from your tank: open its card and tap "Pair with…".', n: (t) => (t.match && [t.match.a, t.match.b].some((id) => t.fish.some((f) => f.id === id && (f.parents?.length || f.bornHere))) ? 1 : 0), need: 1 },
      { text: 'A second generation hatches', hint: 'Its babies, born in your tank: keep the water clean and be there to watch.', n: since('gen2'), need: 1 },
    ] },
  sleuth: { title: 'Tank detective', blurb: 'Look into the daily mysteries and follow one to the end.', icon: 'bubbles', ok: () => true,
    steps: [
      { text: 'Solve 3 daily mysteries', hint: 'Each day something glows on the sand: tap it.', n: since('myst'), need: 3 },
      { text: 'Follow a mystery into the next day', hint: 'Some are not over when you look. Come back tomorrow.', n: since('mystChain'), need: 1 },
      { text: 'Solve 7 daily mysteries', hint: 'One a day, there for the finding.', n: since('myst'), need: 7 },
    ] },
};
export const GOAL_SHELLS = 20;
// what finishing the current goal will unlock: the next floor or backdrop the tank does not have yet (alternating, so both kinds come)
export function nextPrize(t) { const fl = Object.keys(FLOORS).filter((k) => !styleOwned(t, 'floor', k)).map((k) => ['floor', k]), bd = Object.keys(BACKDROPS).filter((k) => !styleOwned(t, 'backdrop', k)).map((k) => ['backdrop', k]); const n = (t.goalsDone ?? []).length; return (n % 2 ? bd[0] ?? fl[0] : fl[0] ?? bd[0]) ?? null; }
export const prizeLabel = (p) => (p ? `${p[0] === 'floor' ? FLOORS[p[1]] : BACKDROPS[p[1]]} ${p[0]}` : null);
const stepsOf = (t, g) => GOALS[g.id].steps.map((s) => ({ ...s, hint: typeof s.hint === 'function' ? s.hint(t) : s.hint, have: Math.max(0, Math.min(s.need, s.n(t, g))) }));
export function goalOf(t) { const g = t.goal; if (!g || !GOALS[g.id]) return null; const S = stepsOf(t, g), next = S.find((s) => !g.done?.[S.indexOf(s)] && s.have < s.need), done = S.filter((s, i) => g.done?.[i] || s.have >= s.need).length;
  return { id: g.id, ...GOALS[g.id], at: g.at, steps: S.map((s, i) => ({ text: s.text, hint: s.hint, have: s.have, need: s.need, done: !!g.done?.[i] || s.have >= s.need })), next: next ? { text: next.text, hint: next.hint, have: next.have, need: next.need } : null, done, of: S.length }; }
function goalOffer(t, now) { const h = hash32(Math.floor(now / DAY) * 13 + ((t.createdAt ?? 0) % 991)), done = new Set((t.goalsDone ?? []).map((x) => x.id)); const ok = Object.keys(GOALS).filter((k) => !done.has(k) && GOALS[k].ok(t));
  const colors = ok.filter((k) => MORPHS[k]), rest = ok.filter((k) => !MORPHS[k] && k !== 'rare'), pick = [];
  pick.push(colors.length ? colors[h % colors.length] : ok.includes('rare') ? 'rare' : null);      // (one breeding goal is always among them when it can be)
  const off = (h >>> 5) % (rest.length || 1); for (let i = 0; i < rest.length && pick.filter(Boolean).length < 3; i++) { const k = rest[(off + i) % rest.length]; if (!pick.includes(k)) pick.push(k); }
  return pick.filter(Boolean).slice(0, 3); }
const baseOf = (t) => ({ ...(t.stats ?? {}), field: Object.keys(t.field ?? {}).length });
function goals(t, now, ev) {
  if ((t.flags.tut ?? 0) < 5) return;
  if (!t.goal) { if (!t.goalOffer?.length && now - (t.flags.promised ?? t.createdAt ?? now) >= 20 * HOUR) t.goalOffer = goalOffer(t, now); return; }      // (goals come on the second day: the first is for getting to know the tank)
  const g = t.goal; if (!GOALS[g.id]) { t.goal = null; return; } g.done ||= {}; const S = stepsOf(t, g);
  S.forEach((s, i) => { if (!g.done[i] && s.have >= s.need) { g.done[i] = now; const n = Object.keys(g.done).length; if (n < S.length) ev.push({ journal: `Goal, ${n} of ${S.length}: ${s.text}.`, toast: `${s.text}! (${n} of ${S.length})`, goalStep: g.id }); } });
  if (Object.keys(g.done).length >= S.length) {
    const st = nextPrize(t);
    if (st) ((t.flags.styles ||= {})[st[0]] ||= {})[st[1]] = true; t.shells += GOAL_SHELLS;
    const prize = st ? `${st[0] === 'floor' ? FLOORS[st[1]] : BACKDROPS[st[1]]} ${st[0]}` : null;
    (t.goalsDone ||= []).push({ id: g.id, at: now, title: GOALS[g.id].title, prize }); if (t.goalsDone.length >= 3) earn(t, 'lighthouse', now, ev); t.goal = null; t.goalOffer = goalOffer(t, now);
    ev.push({ activity: { type: 'goal', text: `The tank finished a goal: ${GOALS[g.id].title}.` } }); ev.push({ journal: `Goal complete: ${GOALS[g.id].title}.${prize ? ` The ${prize} is yours.` : ''}`, toast: `Goal complete! +${GOAL_SHELLS} shells${prize ? ` and the ${prize}` : ''}`, goalDone: g.id, milestone: true });
  }
}
export const homeOf = (t, f) => (f.home && t.decor.find((d) => d.id === f.home && ['coconut', 'pot'].includes(d.type))) || null;
// Every octopus has a temperament of its own, fixed by its seed: how curious, bold, sociable and tidy it is. Real octopuses differ like this from one individual to the next.
// The mix lands in one of six types, each with a line for the fish card. Nothing is stored: the same octopus always works out the same.
export const OCTO_TYPES = [
  { id: 'explorer',  label: 'The Explorer',  cur: 0.95, bold: 0.75, soc: 0.45, tidy: 0.3,  line: 'Goes and looks at anything new, then comes back to tell the others with its eyes.' },
  { id: 'homebody',  label: 'The Homebody',  cur: 0.3,  bold: 0.25, soc: 0.3,  tidy: 0.7,  line: 'Loves its den. It likes familiar things and will not be hurried out of them.' },
  { id: 'showoff',   label: 'The Show-off',  cur: 0.6,  bold: 0.95, soc: 0.9,  tidy: 0.25, line: 'Comes to the glass for anyone it knows, and likes an audience.' },
  { id: 'watcher',   label: 'The Watcher',   cur: 0.55, bold: 0.35, soc: 0.8,  tidy: 0.45, line: 'Quiet and observant. It follows the other fish with its eyes and notices who is around.' },
  { id: 'collector', label: 'The Collector', cur: 0.65, bold: 0.45, soc: 0.35, tidy: 0.95, line: 'Fetches shells and stones for its den and rearranges them when nobody is looking.' },
  { id: 'trickster', label: 'The Trickster', cur: 0.85, bold: 0.85, soc: 0.65, tidy: 0.2,  line: 'Pokes at things to see what happens, and tries a different way when the first one fails.' },
];
export function octoMind(f) {
  const h = (n) => { let x = ((f?.seed | 0) + 1) * 2654435761 + n * 40503; x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13; return ((x >>> 0) % 1000) / 1000; };
  const T = OCTO_TYPES[Math.floor(h(1) * OCTO_TYPES.length)], j = (v, n) => Math.max(0.05, Math.min(1, v + (h(n) - 0.5) * 0.3));
  return { type: T.id, label: T.label, line: T.line, cur: j(T.cur, 2), bold: j(T.bold, 3), soc: j(T.soc, 4), tidy: j(T.tidy, 5) };
}
```

## rules.js: raising shapes personality

```js
// ── Growing up shaped by care ── a young fish that was fed often grows up content; one that was played with a lot grows up bold
// How you raise a young one decides who it grows up to be. Each kind of attention while it is small counts (once an hour at most): petting
// makes it bold, games make it playful, hiding treats and puzzles make it curious, being fed every day makes it calm; left to itself it grows up shy.
const RAISE = [['pets', 5, 'Brave', (f) => `All that attention made ${f.name} bold: it grew up Brave.`], ['play', 3, 'Playful', (f) => `All those games: ${f.name} grew up Playful.`], ['seek', 2, 'Curious', (f) => `Hunting for hidden treats made ${f.name} grow up Curious.`], ['days', 4, 'Calm', (f) => `Well fed every day while it grew, ${f.name} grew up Calm and content.`]];
export function raiseLean(f) { const R = f?.raise ?? {}, n = (k) => (k === 'days' ? (R.days ?? []).length + (R.meals ?? 0) : R[k] ?? 0); const sc = RAISE.map(([k, need, tr, line]) => ({ k, tr, line, n: n(k), need, r: n(k) / need })).sort((a, b) => b.r - a.r); const top = sc[0];
  if (top.r >= 1) return top; if (sc.every((x) => x.n === 0) || (n('pets') + n('play') + n('seek') === 0 && n('days') < 2)) return { k: 'none', tr: 'Shy', line: (x) => `Left mostly to itself, ${x.name} grew up Shy.`, n: 0, r: 1 }; return { ...top, pending: true }; }
function raised(t, f, now, ev) {
  const L = raiseLean(f), tr = f.traits ?? []; delete f.raise; if (L.pending || tr.includes(L.tr)) return;
  const opp = { Brave: 'Shy', Shy: 'Brave', Playful: 'Lazy', Calm: 'Playful' }[L.tr]; f.traits = [...tr.filter((x) => x !== opp), L.tr].slice(-3); f.raisedAs = L.tr; bump(t, 'raised_' + L.tr); const line = L.line(f);
  ev.push({ journal: line, story: f.id, text: line, toast: `${f.name} grew up ${L.tr.toLowerCase()}, the way you raised it.` });
}
function raiseNote(t, now, kind, f = null) { const d = Math.floor(now / DAY), hr = Math.floor(now / HOUR); for (const x of f ? [f] : t.fish) { if (x.dead || stageOf(x, now) === 'adult') continue; const R = (x.raise ||= {}); if (kind === 'fed') { R.days ||= []; if (!R.days.includes(d)) R.days.push(d); continue; } const key = kind === 'pet' ? 'pets' : kind; R.at ||= {}; if (R.at[key] === hr) continue; R.at[key] = hr; R[key] = (R[key] ?? 0) + 1; } }
```

## rules.js: action and time entry points

```js
export function applyAction(t, a, o) { const r = _applyAction(t, a, o); if (r?.ok && r.events && t.goal) { try { goals(t, o?.now ?? Date.now(), r.events); } catch { /* a goal never stops an action */ } }      // (a step finished by this very action is told at once)
  if (r?.events) { recordStory(t, r.events, o?.now ?? Date.now()); recordHistory(t, r.events, o?.now ?? Date.now()); } return r; }
export function advance(t, now = Date.now()) { const ev = _advance(t, now); recordStory(t, ev, now); recordHistory(t, ev, now); return ev; }
const AWAY_BLOCK = new Set(['observe', 'moment', 'feed', 'puzzle', 'hide', 'crab', 'sellFish', 'releaseOcto', 'octoTouch', 'octoMove', 'pet', 'train', 'play', 'octoMem', 'octoMemo', 'octoMoment', 'fishNote']);
// what adventures.js needs from here (passed in rather than imported back, so the two files never depend on each other at load time)
const ADVR = { OHR, get DECOR_DEF() { return DECOR_DEF; }, get SPECIES_DEF() { return SPECIES_DEF; }, isOcto, stageOf, ownHunger, ownHungry, lifeOf, octoMind, unlock: (...x) => unlock(...x), ensureFish: (...x) => ensureFish(...x), pending: (...x) => pending(...x), capacity: (...x) => capacity(...x), memCap: (...x) => memCap(...x), get KEEPSAKES() { return KEEPSAKES; }, get AIL_TIRED() { return AIL_TIRED; } };
```

## genes.js: color genetics

```js
// Heritable look of a fish: a hue, saturation, brightness and size nudge. Founders derive theirs from their seed; offspring blend their parents'.
// (Pure and dependency free: the browser draws with it, the server breeds with it.)
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function genesOf(seed) { const r = rng((((seed | 0) * 2654435761 + 977) >>> 0)); const dh = (r() - 0.5) * 0.08, ds = 0.88 + r() * 0.24, dl = 0.95 + r() * 0.1, size = 0.93 + r() * 0.14;
  const k = r(), w = r(), m = k < 0.3 ? [RARE[Math.floor(w * RARE.length)], 'n'] : ['n', 'n'];      // (drawn after the others, so every fish's old look is unchanged; about one founder in three carries a rare color, hidden)
  return { dh, ds, dl, size, m }; }
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export function blendGenes(a, b, r, moon = false) {
  return { dh: cl((a.dh + b.dh) / 2 + (r() - 0.5) * 0.03, -0.06, 0.06), ds: cl((a.ds + b.ds) / 2 + (r() - 0.5) * 0.08, 0.85, 1.15), dl: cl((a.dl + b.dl) / 2 + (r() - 0.5) * 0.04, 0.93, 1.07), size: cl((a.size + b.size) / 2 + (r() - 0.5) * 0.05, 0.9, 1.1), m: inherit(a.m, b.m, r, moon) };
}
export const seededRandom = rng;
// Color morphs: a rare color shows only when a fish has two copies of it (one from each parent); with one copy it is carried, unseen.
// Two carriers of the same color have about one baby in four that shows it. Now and then a copy appears on its own (a mutation).
export const MORPHS = {
  gold: { label: 'Golden', h: 0.12, s: 0.95, l: 0.6 },
  ghost: { label: 'Ghost', s: 0.12, l: 0.86 },
  blue: { label: 'Sapphire', h: 0.6, s: 0.85, l: 0.55 },
  ember: { label: 'Ember', h: 0.01, s: 0.95, l: 0.5 },
};
const RARE = Object.keys(MORPHS);
function inherit(a = ['n', 'n'], b = ['n', 'n'], r, moon = false) { const m = [a[r() < 0.5 ? 0 : 1], b[r() < 0.5 ? 0 : 1]]; if (r() < (moon ? 0.12 : 0.03)) m[r() < 0.5 ? 0 : 1] = RARE[Math.floor(r() * RARE.length)];
  if (moon && m[0] !== m[1]) { const both = a.filter((x) => MORPHS[x] && b.includes(x)); if (both.length && r() < 0.25) m[0] = m[1] = both[0]; }      // laid under a full moon: a second chance at the color both parents carry
  return m; }
export const allelesOf = (f) => f?.genes?.m ?? genesOf(f?.seed ?? 0).m;
export const morphOf = (f) => { const m = allelesOf(f); return m[0] === m[1] && MORPHS[m[0]] ? m[0] : null; };
export const carriesOf = (f) => [...new Set(allelesOf(f).filter((x) => MORPHS[x]))].filter((x) => x !== morphOf(f));
// the chance that a baby of these two shows each color (for the hint on the card), exactly from their genes
// the chance the baby that stays shows each color: three of the clutch are in the running, and a rare one is the one that stays
export function morphOdds(a, b, moon = false) { const A = allelesOf(a), B = allelesOf(b), out = {}; for (const x of A) for (const y of B) if (x === y && MORPHS[x]) out[x] = (out[x] ?? 0) + 0.25; for (const k of Object.keys(out)) { let p = out[k]; if (moon) p = Math.min(1, p + (1 - p) * 0.25); out[k] = +(1 - (1 - p) ** 3).toFixed(2); } return out; }

```

## ui.js: Today sheet (goal ring, Needs you, goal card, goal picker)

```js
  }
  // the tank's goal, always in view: what it is, the next step and how far along (a choice waiting when there is none)
  // the tank's goal lives in the bell: a thin ring around it fills as the goal does (gold when a new one is waiting to be chosen), and the
  // bell's sheet opens with the goal at the top. The tank itself stays clear.
  function questBar(s) { const b = $('bell'); if (!b) return; const g = goalOf(s), on = (s.flags.tut ?? 0) >= 5, offer = on && !g && (s.goalOffer ?? []).length;
    b.style.setProperty('--goal', on && g ? `${Math.round((g.done / g.of) * 360)}deg` : '0deg'); b.classList.toggle('goal', !!(on && g)); b.classList.toggle('offer', !!offer); const q = $('quest'); if (q) q.hidden = true; }
  // what is happening in the tank right now, each one a tap away: a decision that is yours, eggs to watch, today's mystery, the next thing coming
  const nowHtml = () => { const s = S(); if (!s || (s.flags.tut ?? 0) < 5) return ''; const me = game.you?.userId, out = [], row = (icon, text, act, when = '', extra = '') => out.push(`<div class="nowr${extra ? ' big' : ''}"><button class="nowb" data-act="${act}"><i>${pix(icon, 22)}</i><span>${text}</span>${when ? `<b>${when}</b>` : ''}<em>›</em></button>${extra}</div>`);
    const D = s.dilemma && !s.dilemma.done ? s.dilemma : null, mine = D && (!D.turn || D.turn.uid === me || Date.now() > D.turn.until);
    if (D && mine) row('✨', `Your call: ${esc(D.text)}`, 'nowcare', 'decide', `<div class="nowopts">${D.opts.map((o) => `<button data-decide="${esc(o.k)}">${esc(o.label)}</button>`).join('')}</div>`);      // (decided right here)
    else if (D) row('✨', `${esc(D.turn.name)}'s call: ${esc(D.text)}`, 'nowcare');
    if ((s.eggs ?? []).some((e) => e.ready) || s.fish.some((f) => f.preg?.ready && !f.dead)) row('🥚', 'Ready to hatch: stay and watch', 'egg', 'now');
    const m = mysteryOf(s); if (m) row('🫧', m.done ? esc(m.line) : `${esc(MYSTERY[m.kind]?.text ?? '')} Tap the glow.`, m.done ? 'nowtank' : 'nowmyst', m.done ? 'found' : 'today');
    const f = forecast(s, Date.now(), 1)[0]; if (f) row(f.icon ?? '📦', esc(f.text), 'nowcare', f.when === 'now' ? 'now' : esc(f.when));
    return `<h4 class="ntsh">Needs you</h4>${out.length ? `<div class="nowl">${out.join('')}</div>` : '<p class="calm">Nothing needs you right now. The tank is calm.</p>'}`; };
  // the tank in one line: its mood, and how far to the next level (and what earns it)
  const tankLine = () => { const s = S(); if (!s) return ''; const m = tankMood(s, Date.now()), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, sc = scoreOf(s), pct = b ? Math.max(3, Math.min(100, Math.round(((sc - a) / (b - a)) * 100))) : 100;
    return `<div class="tline"><span class="mood ${esc(m.key)}">${esc(m.label)}</span><span class="lvl"><b>Level ${lv}</b>${b ? `<i><b style="width:${pct}%"></b></i><small>${sc}/${b}</small>` : '<small>top level</small>'}</span></div>`; };
  const goalCard = () => { const s = S(); if (!s || (s.flags.tut ?? 0) < 5) return ''; const g = goalOf(s), offer = s.goalOffer ?? [];
    if (g) return `<button class="gcard" data-act="goal"><span class="qi">🎯</span><span class="qt"><b>${esc(g.title)}</b><small>${g.next ? `Next: ${esc(g.next.text)}${g.next.need > 1 ? ` (${g.next.have}/${g.next.need})` : ''}` : 'Almost there'}</small>${g.next?.hint ? `<small class="how">${esc(g.next.hint)}</small>` : ''}<i class="qb"><b style="width:${Math.round((g.done / g.of) * 100)}%"></b></i></span><em>›</em></button>`;
    return offer.length ? `<button class="gcard offer" data-act="goal"><span class="qi">🎯</span><span class="qt"><b>Choose a goal for your tank</b><small>${offer.length} to choose from</small></span><em>›</em></button>` : ''; };
  function goalSheet() {
    const s = S(); if (!s) return; const g = goalOf(s), done = s.goalsDone ?? [];
    const finished = done.length ? `<p class="gdone">Goals finished: ${done.map((d) => esc(d.title)).join(' · ')}</p>` : '';
    if (g) {
      const steps = g.steps.map((st, i) => { const nx = !st.done && g.steps.findIndex((x) => !x.done) === i; return `<div class="gst ${st.done ? 'done' : nx ? 'next' : ''}"><i>${st.done ? '✓' : i + 1}</i><span><b>${esc(st.text)}${st.need > 1 ? ` (${st.have}/${st.need})` : ''}</b>${nx ? `<small>${esc(st.hint)}</small>` : ''}</span></div>`; }).join('');
      modal.innerHTML = `<div class="box gsheet"><h2>${esc(g.title)}</h2><p class="gbl">${esc(g.blurb)}</p>${steps}<p class="gprize">Reward: ${prizeLabel(nextPrize(s)) ? `the ${esc(prizeLabel(nextPrize(s)))}` : 'a gift for the tank'}, and ${GOAL_SHELLS} shells</p><button class="big gold" id="mok">Keep going</button><button class="lnk" id="mno">Set this goal aside</button>${finished}</div>`;
      modal.classList.add('on'); $('mok').onclick = () => modal.classList.remove('on');
      $('mno').onclick = async () => { const ok = await new Promise((r) => { modal.classList.remove('on'); setTimeout(() => dialog({ title: 'SET IT ASIDE?', text: 'Its progress is lost, and three goals are offered again.', ok: 'Set aside', cancel: 'Keep it' }).then(r), 300); }); if (!ok) return; const r = await game.dispatch({ t: 'pickGoal', drop: true }); if (r.ok) setTimeout(goalSheet, 400); };
      return;
    }
    const offer = (s.goalOffer ?? []).map((k) => [k, GOALS[k]]).filter(([, x]) => x);
    modal.innerHTML = `<div class="box gsheet"><h2>Choose a goal</h2><p class="gbl">A long aim for the tank. Each one takes days, and each step tells you how.</p>${offer.map(([k, x]) => `<button class="gch" data-goal="${esc(k)}"><b>${esc(x.title)}</b><small>${esc(x.blurb)} · ${x.steps.length} steps</small></button>`).join('')}${prizeLabel(nextPrize(s)) ? `<p class="gprize">Any of them unlocks the ${esc(prizeLabel(nextPrize(s)))}.</p>` : ''}<button class="lnk" id="mno">Later</button>${finished}</div>`;
    modal.classList.add('on'); $('mno').onclick = () => modal.classList.remove('on');
    modal.querySelectorAll('[data-goal]').forEach((b) => { b.onclick = async () => { const r = await game.dispatch({ t: 'pickGoal', id: b.dataset.goal }); modal.classList.remove('on'); if (!r.ok) { toast(REASONS[r.reason] ?? 'That did not work.'); return; } sfx('arrive'); updateHeader(); setTimeout(goalSheet, 450); }; });
  }
  $('quest') && ($('quest').onclick = () => { sfx('tap'); goalSheet(); });
  function goalText() {
    const s = S(); if (!s) return { text: '' };
```

## loop_sim.mjs: 60-day pacing simulation

```js
// The whole loop, played by a simulated caretaker through the real rules: it opens the tank a few times a day, looks after everyone, solves
// the mystery, makes the decisions, chooses goals and works on them (pairs carriers, watches hatchings, plays with the young), and buys new
// fish and decorations as the shells allow. It reports the day each milestone first happens, so pacing can be tuned to real numbers.
//   node tools/loop_sim.mjs [days=60] [runs=6] [visitsPerDay=3]
import * as R from '../web/src/game/rules.js';
const DAYS = +(process.argv[2] || 60), RUNS = +(process.argv[3] || 6), VISITS = +(process.argv[4] || 3), H = 3600e3, DAY = 864e5;
const gapsOf = (v) => (v === 1 ? [19] : v === 2 ? [8, 19] : v === 3 ? [8, 13, 20] : [8, 11, 14, 18, 21]);
function run(seed) {
  const t0 = seed * 7 * DAY, t = R.newWorld(t0, seed + 2); R.norm(t, t0); t.flags.tut = 5; t.tzMin = 0; for (const f of t.fish) { f.born = t0 - (R.ADULT_DAYS - 2) * DAY; f.arrived = t0; f.stage = 'juvenile'; }      // (as from the shop: a real tank starts with a baby octopus and buys its first fish nearly grown)
  t.fish.push(R.ensureFish({ id: 'oct', name: 'Ink', species: 'octopus', seed: seed * 13 + 3, born: t0, stage: 'baby', traits: ['Curious'], owner: 'sim', ownerName: 'Sim' }));
  const M = {}, mark = (k, now) => { M[k] ??= +((now - t0) / DAY).toFixed(1); }, goals = [], counts = { mystery: 0, decisions: 0, shellsIn: 0, shellsOut: 0 };
  let now = t0; const act = (a) => R.applyAction(t, a, { now, name: 'Sim', uid: 'sim' });
  for (let day = 0; day < DAYS; day++) for (const hr of gapsOf(VISITS)) {
    now = t0 + day * DAY + hr * H + ((day * 7919 + seed * 31) % 37) * 60e3; const s0 = t.shells;
    const ev = R.advance(t, now);
    // what the tank asks for, first
    const m = R.mysteryOf(t, now); if (m && !m.done) { act({ t: 'mystery', tz: 0 }); counts.mystery++; mark('first mystery', now); }
    if (t.dilemma && !t.dilemma.done) { const o = t.dilemma.opts[(day + hr) % t.dilemma.opts.length]; const r = act({ t: 'decide', id: t.dilemma.id, k: o.k }); if (r.ok && r.applied) { counts.decisions++; mark('first decision', now); } }
    if (!t.goal && (t.goalOffer ?? []).length) { const pref = t.goalOffer[(t.goalsDone ?? []).length % t.goalOffer.length]; /* (a player picks differently each time) */ act({ t: 'pickGoal', id: pref }); mark('first goal chosen', now); }
    // care
    if (t.hunger > 0.3) act({ t: 'feed' }); for (const f of t.fish.filter((x) => !x.dead && x.species === 'octopus' && R.octoHunger(x) > R.OCTO_DUE)) act({ t: 'feed', food: 'crab', fish: f.id });
    for (const f of t.fish.filter((x) => !x.dead && x.species === 'seahorse' && R.ownHunger(x) > 0.4)) act({ t: 'feed', food: 'mysis', fish: f.id });
    if (t.water < 0.7) act({ t: 'water' }); if (t.glass > 0.3) act({ t: 'glass' });
    // eggs and babies
    for (const e of t.eggs ?? []) if (e.ready) act({ t: 'watchEggs', id: e.id }); if (t.fryOffer) act({ t: 'keepFry', id: t.fryOffer.id, keep: t.fish.length < R.capacity(t.level) });
    if (t.nursery && now >= t.nursery.readyAt) act({ t: 'keepBaby', nursery: t.nursery.id, id: t.nursery.cands[0]?.id });
    const young = t.fish.filter((f) => !f.dead && R.stageOf(f, now) !== 'adult'); for (const f of young) { act({ t: 'pet', id: f.id }); } if (young.length && hr === gapsOf(VISITS)[1]) act({ t: 'play', toy: 'ball', fish: young.map((f) => f.id) });
    // breeding: bring the best pair together, once a day
    const adults = t.fish.filter((f) => !f.dead && !f.away && R.stageOf(f, now) === 'adult' && f.species !== 'seahorse');
    let best = null; for (const a of adults) for (const b of adults) if (a.id < b.id && a.species === b.species && (R.isOcto(a) ? !a.partner && !b.partner : R.sexOf(a) !== R.sexOf(b))) { const o = Object.values(R.morphOdds(a, b)).reduce((x, y) => x + y, 0); if (!best || o > best.o) best = { a, b, o }; }
    if (best && hr === gapsOf(VISITS)[0]) { const r = act({ t: 'matchmake', a: best.a.id, b: best.b.id }); if (r.ok) mark('first pairing', now); }
    // layout: two plants together and a den each, once there is something to buy them with
    // spending: a den for the octopus, a second of a kind for a pair, a new kind, plants
    for (let g = 0; g < 4; g++) {
      const room = (sp) => t.fish.length + R.pending(t) + (R.SPECIES_DEF[sp]?.count ?? 1) <= R.capacity(t.level);
      const kinds = {}; for (const f of t.fish.filter((x) => !x.dead)) kinds[f.species] = (kinds[f.species] ?? 0) + 1;
      const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)).length, octos = t.fish.filter((f) => !f.dead && R.isOcto(f)).length, plants = t.decor.filter((d) => R.DECOR_DEF[d.type]?.cat === 'PLANTS').length;
      const single = Object.entries(kinds).find(([k, n]) => n === 1 && !R.isOcto({ species: k }) && R.SPECIES_DEF[k]?.count === 1 && room(k) && t.shells >= R.fishPrice(k, now, t));
      const fresh = Object.entries(R.SPECIES_DEF).filter(([k, d]) => !d.visitor && d.count === 1 && k !== 'octopus' && !kinds[k] && d.level <= t.level && room(k)).sort((a, b) => a[1].price - b[1].price)[0];
      const SP = R.specialOf(t, now), sp = SP.species, want = t.goal && (R.MORPHS[t.goal.id] ? SP.color === t.goal.id : t.goal.id === 'rare'), mates = t.fish.filter((f) => !f.dead && f.species === sp).length;      // a player working on a color buys today's special when it carries what they need
      let r = null;
      if (want && sp !== 'octopus' && R.SPECIES_DEF[sp].count === 1 && R.SPECIES_DEF[sp].level <= t.level && room(sp) && t.shells >= R.specialPrice(sp) && !(t.flags.simSpecial === Math.floor(now / DAY))) { t.flags.simSpecial = Math.floor(now / DAY); const one = t.fish.find((f) => !f.dead && f.species === sp && R.allelesOf(f).includes(SP.color)); r = act({ t: 'buyFish', species: sp, name: 'Special', special: true, seed: now % 9973, ...(one ? { sex: R.sexOf(one) === 'm' ? 'f' : 'm' } : {}) }); if (r.ok) continue; }
      if (dens < octos && R.DECOR_DEF.coconut.level <= t.level && t.shells >= R.DECOR_DEF.coconut.price) r = act({ t: 'buyDecor', type: 'coconut', x: 2 + dens, z: 1.5, ry: 0 });
      else if (plants < 2 && R.DECOR_DEF.grass.level <= t.level && t.shells >= R.DECOR_DEF.grass.price) r = act({ t: 'buyDecor', type: 'grass', x: -2 + plants * 0.8, z: 1, ry: 0 });
      else if (single) { const one = t.fish.find((f) => !f.dead && f.species === single[0]); r = act({ t: 'buyFish', species: single[0], name: single[0] + '2', seed: now % 9973, sex: R.sexOf(one) === 'm' ? 'f' : 'm' }); }
      else if (fresh && t.shells >= R.fishPrice(fresh[0], now, t)) r = act({ t: 'buyFish', species: fresh[0], name: fresh[0], seed: now % 9973 });
      if (!r?.ok) break;
    }
    // a full tank lays no eggs: a player working on babies finds a shop fish a new home
    if (t.fish.length + R.pending(t) >= R.capacity(t.level) + 1 && hr === gapsOf(VISITS)[2]) { const o = t.fish.find((f) => !f.dead && !R.isOcto(f) && !(f.parents?.length) && !R.allelesOf(f).some((x) => R.MORPHS[x]) && f.id !== t.match?.a && f.id !== t.match?.b); if (o) { const r = act({ t: 'sellFish', id: o.id }); if (r.ok) counts.rehomed = (counts.rehomed ?? 0) + 1; } }
    // milestones
    if ((t.eggs ?? []).length) mark('first eggs', now); const bred = t.fish.filter((f) => f.parents?.length || f.bornHere);
    if (bred.length) mark('first baby', now); if (bred.some((f) => R.stageOf(f, now) === 'adult')) mark('first baby grown', now); if (bred.some((f) => (f.gen ?? 0) >= 2)) mark('second generation', now);
    if (Object.keys(t.morphs ?? {}).length) mark('first rare color', now); if (t.fish.some((f) => f.raisedAs)) mark('first raised temperament', now);
    if (t.fish.some((f) => R.isOcto(f) && f.partner)) mark('octopus partners', now);
    for (const d of t.goalsDone ?? []) if (!goals.some((g) => g.id === d.id && g.at === d.at)) goals.push({ id: d.id, at: d.at, day: +((d.at - t0) / DAY).toFixed(1) });
    for (const lv of [2, 3, 4, 5, 6]) if (t.level >= lv) mark('level ' + lv, now);
    const dS = t.shells - s0; if (dS > 0) counts.shellsIn += dS; else counts.shellsOut -= dS;
  }
  return { M, goals, counts, stuck: t.goal ? { id: t.goal.id, since: +((t.goal.at - t0) / DAY).toFixed(1), steps: R.goalOf(t).steps.map((x) => (x.done ? '✓' : x.have + '/' + x.need)).join(' ') } : null, end: { level: t.level, fish: t.fish.filter((f) => !f.dead).length, shells: t.shells, field: Object.keys(t.field ?? {}).length } };
}
const res = Array.from({ length: RUNS }, (_, i) => run(i + 1)), keys = [...new Set(res.flatMap((r) => Object.keys(r.M)))];
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`${RUNS} runs, ${DAYS} days, ${VISITS} visits a day. Median day of each milestone (and in how many runs it happened):`);
for (const k of keys.sort((a, b) => (med(res.map((r) => r.M[a])) ?? 999) - (med(res.map((r) => r.M[b])) ?? 999))) { const v = res.map((r) => r.M[k]); console.log(`  ${k.padEnd(26)} day ${String(med(v)).padStart(5)}   (${v.filter((x) => x != null).length}/${RUNS})`); }
const gd = res.flatMap((r) => r.goals.map((g, i) => ({ ...g, n: i }))); console.log(`Goals finished per run: ${res.map((r) => r.goals.length).join(', ')}; days between goals (median): ${med(res.flatMap((r) => r.goals.map((g, i) => g.day - (i ? r.goals[i - 1].day : 0))))}`);
const byId = {}; for (const g of gd) (byId[g.id] ||= []).push(g.day); console.log('Goal finish days by goal:', Object.entries(byId).map(([k, v]) => `${k} ${v.join('/')}`).join(' · '));
console.log(`Per day: shells in ${(med(res.map((r) => r.counts.shellsIn)) / DAYS).toFixed(1)}, out ${(med(res.map((r) => r.counts.shellsOut)) / DAYS).toFixed(1)}; decisions ${med(res.map((r) => r.counts.decisions))} in ${DAYS} days; mysteries ${med(res.map((r) => r.counts.mystery))}`);
console.log('End:', JSON.stringify(res.map((r) => r.end))); console.log('Goal in progress at the end:', res.map((r) => JSON.stringify(r.stuck)).join(' | '));
```
