// OUR TANK game rules. Pure functions with no browser or server dependencies, so the exact same code
// runs on the server (authoritative, shared tank) and in the browser (solo tank).
import { skyOf } from './sky.js';
import { genesOf, blendGenes, seededRandom, allelesOf, morphOf, carriesOf, morphOdds, MORPHS } from './genes.js';
export { allelesOf, morphOf, carriesOf, morphOdds, MORPHS };
const gOf = (p, seed) => ({ ...(p?.genes ?? genesOf(p?.seed ?? seed)), m: allelesOf(p ?? { seed }) });      // (a parent's genes, with its color genes even if they were stored before there were any)
import { adventures, isAway, awayLine, moveKeep, advForecast, advMemOf, KEEPSAKES, ADV, ADV_KINDS, OUTCOME_IDS, canAdventure, eligibleLong } from './adventures.js';
import { lifeDay, noteVisit, carried, keepStory, visitorArrives, todOf, TOD, LIFE, decorVisit, decorMoved, decorStory } from './life.js';
export { keepStory, todOf, TOD, LIFE, decorStory };
import { touchKeep, knowsKeep, historyDay, recordHistory, stayOffer, decideStay, dayOfTank, HIST } from './history.js';
export { knowsKeep, dayOfTank, HIST };
export { isAway, awayLine, advMemOf, KEEPSAKES, ADV, ADV_KINDS, OUTCOME_IDS, canAdventure, eligibleLong };
export { genesOf };
export const SPECIES_DEF = {
  goldfish:  { label: 'Clownfish',  price: 10,  level: 1, wait: 10, count: 1, blurb: 'Bold and curious. Loves a hiding place.', traits: ['Curious', 'Social', 'Brave', 'Playful', 'Greedy'], speed: 1.0 },
  neon:      { label: 'Blue Chromis', price: 20, level: 1, wait: 20, count: 4, blurb: 'A shimmering school of four.',        traits: ['Social', 'Playful'], speed: 1.3, school: true },
  cory:      { label: 'Yellow Goby', price: 18, level: 2, wait: 60, count: 1, blurb: 'A tidy little reef sitter.',             traits: ['Shy', 'Lazy', 'Calm'], speed: 0.55 },
  blue:      { label: 'Royal Gramma', price: 28, level: 2, wait: 90, count: 1, blurb: 'A shy jewel of the reef.',         traits: ['Shy', 'Lazy', 'Brave', 'Curious'], speed: 0.9 },
  guppy:     { label: 'Damselfish', price: 18, level: 2, wait: 25, count: 2, blurb: 'A feisty, colorful pair.',   traits: ['Playful', 'Social', 'Curious'], speed: 1.1 },
  angelfish: { label: 'Emperor Angelfish', price: 40, level: 3, wait: 180, count: 1, blurb: 'Elegant and calm.',                traits: ['Calm', 'Curious'], speed: 0.7 },
  platy:     { label: 'Cardinalfish', price: 24, level: 3, wait: 40, count: 2, blurb: 'A gentle, glowing pair.',        traits: ['Social', 'Playful', 'Calm'], speed: 1.0 },
  danio:     { label: 'Pink Anthias', price: 32, level: 4, wait: 60, count: 4, blurb: 'A pink school that never stops.', traits: ['Playful', 'Social', 'Brave'], speed: 1.35, school: true },
  betta:     { label: 'Mandarin Dragonet', price: 52, level: 4, wait: 240, count: 1, blurb: 'Swirled in blue and orange. Quiet pride.',        traits: ['Brave', 'Calm', 'Shy'], speed: 0.65 },
};
SPECIES_DEF.seahorse = { label: 'Seahorse', price: 36, level: 3, wait: 120, count: 1, blurb: 'Upright, gentle and a little shy.', traits: ['Shy', 'Calm', 'Curious'], speed: 0.45 };
SPECIES_DEF.octopus = { label: 'Octopus', price: 52, level: 4, wait: 240, count: 1, blurb: 'Clever, curious and always exploring.', traits: ['Curious', 'Brave', 'Playful', 'Shy'], speed: 0.7 };
// rare visitors are not for sale: they drop by, and saying hello adds them to the collection book
SPECIES_DEF.moonbetta = { label: 'Ghost Dragonet', price: 0, level: 99, wait: 0, count: 1, blurb: 'A pale visitor from the deep.', traits: ['Shy', 'Calm'], speed: 0.7, visitor: true };
SPECIES_DEF.sunangel = { label: 'Golden Angelfish', price: 0, level: 99, wait: 0, count: 1, blurb: 'Golden and unhurried.', traits: ['Calm', 'Curious'], speed: 0.75, visitor: true };
SPECIES_DEF.rosecory = { label: 'Rose Goby', price: 0, level: 99, wait: 0, count: 1, blurb: 'A pink bottom dweller passing through.', traits: ['Social', 'Lazy'], speed: 0.6, visitor: true };
export const DECOR_DEF = {
  grass:    { label: 'Sea Grass',    cat: 'PLANTS',     price: 6,  level: 1, blurb: 'Soft blades that sway.' },
  fern:     { label: 'Purple Sea Fan',          cat: 'PLANTS',     price: 7,  level: 1, blurb: 'A lime frond with tiny leaves.' },
  sword:    { label: 'Broadleaf Seaweed',   cat: 'PLANTS',     price: 7,  level: 1, blurb: 'Broad green leaves.' },
  red:      { label: 'Red Gorgonian',     cat: 'PLANTS',     price: 10,  level: 1, blurb: 'A bright pop of color.' },
  rock:     { label: 'Reef Rock',   cat: 'ROCKS',      price: 6,  level: 1, blurb: 'Small and mossy.' },
  boulder:  { label: 'Reef Boulder',       cat: 'ROCKS',      price: 12,  level: 1, blurb: 'A big rock to hide behind.' },
  starfish: { label: 'Starfish',      cat: 'SPECIAL',    price: 4,  level: 1, blurb: 'A real little sea star. It creeps slowly about the sand.' },
  wood:     { label: 'Driftwood',     cat: 'WOOD',       price: 18, level: 2, blurb: 'An arch to swim around.' },
  pillar:   { label: 'Old Pillar',    cat: 'STRUCTURES', price: 15, level: 2, blurb: 'A broken column.' },
  lantern:  { label: 'Stone Lantern', cat: 'STRUCTURES', price: 20, level: 2, blurb: 'Glows warm at dusk.' },
  chest:    { label: 'Treasure Chest',cat: 'SPECIAL',    price: 24, level: 2, blurb: 'Lid open, gold inside.' },
  torii:    { label: 'Torii Gate',    cat: 'STRUCTURES', price: 34, level: 3, blurb: 'A red gate to swim through.' },
  moss:     { label: 'Coralline Ball',     cat: 'PLANTS',     price: 6,  level: 1, blurb: 'A soft green cushion.' },
  kelp:     { label: 'Giant Kelp',    cat: 'PLANTS',     price: 14,  level: 3, blurb: 'Tall ribbons in the current.' },
  bubbler:  { label: 'Bubbler',       cat: 'SPECIAL',    price: 16, level: 2, blurb: 'A stream of bubbles. Playful fish love it.' },
  shell:    { label: 'Giant Clam',    cat: 'SPECIAL',    price: 14,  level: 2, blurb: 'A clam with a tiny pearl.' },
  skull:    { label: 'Mossy Skull',   cat: 'SPECIAL',    price: 10,  level: 2, blurb: 'Spooky, but very cute.' },
  anchor:   { label: 'Old Anchor',    cat: 'SPECIAL',    price: 24, level: 5, blurb: 'Rusty, mossy, and full of stories.' },
  bamboo:   { label: 'Orange Sea Whip',        cat: 'PLANTS',     price: 18, level: 5, blurb: 'Tall green stalks that creak softly.' },
  bridge:   { label: 'Little Bridge', cat: 'STRUCTURES', price: 44, level: 6, blurb: 'A wooden arch to swim under.' },
  crystal:  { label: 'Glow Crystal',  cat: 'SPECIAL',    price: 56, level: 7, blurb: 'A cluster that glows blue in the dark.' },
  lighthouse: { label: 'Little Lighthouse', cat: 'STRUCTURES', price: 150, level: 7, blurb: 'A landmark the whole tank saves for. Its lamp glows at night.' },
  spire:    { label: 'Coral Spire',   cat: 'SPECIAL',    price: 250, level: 8, blurb: 'The biggest piece in the tank. A towering reef of pink coral.' },
  anemone:  { label: 'Sea Anemone',  cat: 'PLANTS',     price: 16, level: 2, blurb: 'Soft tentacles that sway. A clownfish favorite.' },
  brain:    { label: 'Brain Coral',   cat: 'ROCKS',      price: 14, level: 2, blurb: 'A ridged dome of coral.' },
  table:    { label: 'Table Coral',   cat: 'ROCKS',      price: 20, level: 3, blurb: 'A wide shelf to hover under.' },
  coconut:  { label: 'Coconut Shell', cat: 'ROCKS',      price: 8,   level: 2, blurb: 'A big hollow half-shell. An octopus may carry it off and move in.' },
  pot:      { label: 'Clay Pot',      cat: 'STRUCTURES', price: 14,  level: 2, blurb: 'A little den on its side, just the right size to curl up in.' },
  arch:     { label: 'Stone Arch',    cat: 'STRUCTURES', price: 30, level: 4, blurb: 'A little arch to swim through.' },
};
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
  spire: [8, 300],      /* (measured: about three weeks of a regular household's shells once level 8 opens) */
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
// rare visitor's gift) fetches nothing, so selling can never make shells from nothing. A fish from before prices were recorded counts as bought,
// unless something about it says it came free (bred here, a gift, sent from a friend, a visitor that stayed, the starter fish or an octopus).
export const sellValue = (f) => { const d = SPECIES_DEF[f?.species]; if (!d) return 0; const paid = f.paid ?? (f.parents?.length || f.bornHere || f.gift || f.from || f.resident || f.id === 'f1' || isOcto(f) ? 0 : Math.floor(d.price / d.count)); return Math.max(0, Math.floor(paid / 2) - (f.grewPay ?? 0)); };      // (less what it already paid out growing up: raising one to sell never makes shells)
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
export function growthScale(fish, now = Date.now()) { const d = Math.max(0, (now - fish.born) / DAY),      /* (the same clock as stageOf: a strong hatchling's head start shows in its size too) */ lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k)); const start = fish.parents?.length ? 0.2 : STAGE_SCALE.baby;
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
  const open = Object.keys(SPECIES_DEF).filter((k) => !SPECIES_DEF[k].visitor && !isOcto({ species: k }) && SPECIES_DEF[k].count === 1 && (SPECIES_DEF[k].level ?? 99) <= (t?.level ?? 1));      /* (never a fish the tank's level has not opened yet) */
  return pick ? { species: pick[0], color: pick[1] } : { species: open.length ? open[h % open.length] : dailyFish(now), color: cols[day % cols.length] };
}
export const specialColor = (now = Date.now(), t = null) => specialOf(t, now).color;
export const fishPrice = (id, now = Date.now(), t = null, special = false) => { const p = SPECIES_DEF[id].price; return special && id === specialOf(t, now).species && !isOcto({ species: id }) ? specialPrice(id, t, now) : p; };
export const specialPrice = (id, t = null, now = Date.now()) => (stuckOnColor(t, now) && specialOf(t, now).species === id ? SPECIES_DEF[id].price : Math.ceil(SPECIES_DEF[id].price * 1.4) + 8);      // (the carrier is a choice, beside the plain one at the usual price)
// a color goal that has not moved for a week: the carrier it needs is sold at the usual price (still bought, still paired, still bred: nothing is given)
export const STUCK_DAYS = 7;
export function stuckOnColor(t, now = Date.now()) { const g = t?.goal; if (!g || !(MORPHS[g.id] || g.id === 'rare')) return false; const last = Math.max(g.at ?? 0, ...Object.values(g.done ?? {}).filter(Number.isFinite)); return now - last >= STUCK_DAYS * DAY; }
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
  const W = SCORE_W; return W.care * n('careDays') + W.myst * n('myst') + W.decided * n('decided') + W.hatched * n('hatched') + W.grown * n('grewHere') + W.raised * raised + W.morph * n('morphs') + W.goal * (t.goalsDone ?? []).length + W.field * Object.keys(t.field ?? {}).length + W.species * (t.seen?.fish?.length ?? 0); }
// what each thing is worth toward the level: time spent caring counts steadily, the one-off things (a page of the Field Guide, a new kind of
// animal, a rare color, a goal) count most, and what repeats every day or every clutch (the mystery, another hatching) counts least
export const SCORE_W = { care: 2, myst: 1, decided: 3, hatched: 2, grown: 6, raised: 4, morph: 10, goal: 15, field: 6, species: 4 };
export function traitsFor(species, seed) { const pool = SPECIES_DEF[species].traits, a = pool[seed % pool.length], b = pool[(seed * 7 + 3) % pool.length]; return a === b ? [a] : [a, b]; }

// ── each fish has its own needs: it gets hungry at its own pace, and its happiness and health are real state ──
const APPETITE = { Greedy: 0.3, Playful: 0.1, Social: 0.05, Curious: 0.05, Lazy: -0.2, Calm: -0.1, Shy: -0.05, Brave: 0 };
export const appetiteOf = (traits = [], seed = 0) => Math.max(-0.25, Math.min(0.35, (traits.reduce((a, x) => a + (APPETITE[x] ?? 0), 0)) + ((seed % 7) - 3) * 0.02));
export function ensureFish(f) { if (f && f.arrived == null && Number.isFinite(f.born)) f.arrived = f.born;      /* when it joined the tank (born moves while it is run down; this never does) */ if (ownHungry(f) && !Number.isFinite(f.hunger)) f.hunger = 0.3; if (f.happy == null) f.happy = 0.7; if (f.health == null) f.health = 1; if (f.appetite == null) f.appetite = appetiteOf(f.traits, f.seed); return f; }
const count = (t, cat) => t.decor.filter((d) => DECOR_DEF[d.type]?.cat === cat).length;

// ── reef themes ──
// Pieces that belong together make a place the fish love. A theme is active once the tank holds enough of its pieces; it lifts every fish a little, draws its own kind of
// rare visitor, and pays a few shells the first time it is completed. Duplicates count, so a themed corner can be built from cheap pieces or grand ones.
export const THEMES = {
  kelp:    { label: 'Kelp Forest',   types: ['kelp', 'grass', 'sword', 'bamboo'],                         need: 4, visitor: 'rosecory', blurb: 'Sea grass, kelp and tall weeds sway together.' },
  coral:   { label: 'Coral Garden',  types: ['anemone', 'red', 'fern', 'moss', 'brain', 'table', 'spire'], need: 4, visitor: 'moonbetta', blurb: 'Anemones, sea fans and coral heads make a garden.' },
  ruins:   { label: 'Sunken Ruins',  types: ['pot', 'coconut', 'pillar', 'arch', 'torii', 'bridge', 'skull', 'anchor', 'chest'], need: 3, visitor: 'sunangel', blurb: 'Old stone and lost things make a place to explore.' },
  lanterns:{ label: 'Lantern Cove',  types: ['lantern', 'crystal', 'lighthouse', 'bubbler'],               need: 2, visitor: null,      blurb: 'Glowing things turn the night into a cove.' },
};
export const THEME_REWARD = 3;
export function themesOf(t) { return Object.entries(THEMES).map(([key, th]) => { const have = t.decor.filter((d) => th.types.includes(d.type)).length; return { key, label: th.label, blurb: th.blurb, have: Math.min(have, th.need), need: th.need, active: have >= th.need, visitor: th.visitor }; }); }
function themeCheck(t, now, ev) {
  if ((t.flags.tut ?? 0) < 5) return; t.flags.themes ||= {};
  for (const th of themesOf(t)) if (th.active && !t.flags.themes[th.key]) { t.flags.themes[th.key] = now; t.shells += THEME_REWARD; ev.push({ journal: `${th.label}: the fish have found their place.`, toast: `${th.label}! The fish love it. +${THEME_REWARD} shells`, theme: th.key }); }
}
function likes(f, t) {
  let l = 0; const tr = f.traits ?? [];
  if (tr.includes('Shy') && count(t, 'PLANTS') >= 4) l += 0.12;
  if (tr.includes('Curious') && count(t, 'STRUCTURES') >= 1) l += 0.1;
  if (tr.includes('Playful') && (count(t, 'SPECIAL') >= 1 || t.decor.some((d) => d.type === 'bubbler'))) l += 0.1;
  if (tr.includes('Lazy') && count(t, 'WOOD') >= 1) l += 0.1;
  if (tr.includes('Social') && t.fish.length >= 4) l += 0.08;
  if (tr.includes('Brave') && count(t, 'ROCKS') >= 2) l += 0.06;
  const so = socialOf(t, f); l += Math.min(0.05, so.good.length * 0.02) - Math.min(0.12, so.penalty * 0.25) + Math.min(0.06, themesOf(t).filter((x) => x.active).length * 0.03);
  return Math.min(0.25, l + Math.min(0.1, t.decor.length * 0.006));
}
let clockHour = null;
export function setClockHour(h) { clockHour = Number.isFinite(h) ? h : null; }   // a forced time of day (?tod=) makes moods follow the light, not the phone's clock
export function needsOf(f, t, now = Date.now()) {
  ensureFish(f);
  const fed = Math.max(0, Math.min(1, 1 - (ownHungry(f) ? ownHunger(f) : t.hunger) * (1 + f.appetite))), h = clockHour ?? new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const energy = Math.max(0.1, Math.min(1, 0.55 + 0.4 * Math.sin(((h - 6) / 24) * Math.PI * 2) + ((f.traits ?? []).includes('Lazy') ? -0.15 : 0) + ((f.traits ?? []).includes('Playful') ? 0.1 : 0)));
  const mood = fed < 0.25 ? 'Hungry' : f.health < 0.5 ? 'Under the weather' : energy < 0.3 ? 'Sleepy' : f.happy > 0.75 ? 'Happy' : f.happy < 0.4 ? 'Gloomy' : 'Content';
  return { fed, happy: f.happy, energy, health: f.health, mood, vigor: 0.65 + 0.35 * Math.min(f.health, 0.4 + fed * 0.6) };
}
// Food: flakes are free, pellets and treats cost shells per drop and make fish happier. Each fish has a favorite.
// an octopus eats crabs, not flakes. A seahorse eats tiny shrimp: mysis is what seahorses are fed, so it is on the menu whenever there is one.
// It feeds the same shared meal as flakes and costs the same (nothing), so it changes nothing in the economy; only a seahorse is cheered by it.
export const FOODS = { flakes: { label: 'Flakes', price: 0 }, pellets: { label: 'Pellets', price: 2 }, treats: { label: 'Treats', price: 4 }, mysis: { label: 'Mysis shrimp', price: 0, sea: true }, crab: { label: 'Crab', price: 0, octo: true } };
export const hasOcto = (t) => t.fish.some((f) => f.species === 'octopus' && !f.dead), hasFishOnly = (t) => t.fish.some((f) => f.species !== 'octopus' && !f.dead);
export const hasSeahorse = (t) => t.fish.some((f) => f.species === 'seahorse' && !f.dead);
export const favFoodOf = (f) => (f.species === 'octopus' ? 'crab' : f.species === 'seahorse' ? 'mysis' : (f.traits ?? []).includes('Greedy') ? 'treats' : (f.traits ?? []).some((x) => ['Shy', 'Lazy', 'Calm'].includes(x)) ? 'pellets' : 'flakes');
// Favorite spots and friendships come from what is really in the tank. Each is found once per fish, after it has lived here a while.
const SPOT = { Shy: ['PLANTS', 4, 'the plants'], Curious: ['STRUCTURES', 1, 'the structures'], Lazy: ['WOOD', 1, 'the driftwood'], Playful: ['SPECIAL', 1, 'the special things'], Brave: ['ROCKS', 2, 'the rocks'] };
export function favouriteOf(f, t) {
  for (const tr of f.traits ?? []) { const sp = SPOT[tr]; if (sp && count(t, sp[0]) >= sp[1]) { const hit = t.decor.find((d) => DECOR_DEF[d.type]?.cat === sp[0]); return { label: hit ? DECOR_DEF[hit.type].label.toLowerCase() : sp[2], key: tr }; } }
  return null;
}
// What fish are noticed doing. Each is recorded once per fish (`f.disc[key]`), permanently, and written to the journal.
// Some are noticed by the server from state; the rest are reported by a watching phone (`observe`) and checked here.
export const DISCOVERIES = {
  friend: { label: 'Found a best friend' }, spot: { label: 'Found a favorite spot' }, bond: { label: 'Trusts a caretaker' }, trust: { label: 'Follows a fingertip' }, parent: { label: 'Became a parent' },
  glass: { label: 'Comfortable at the glass', traits: ['Brave', 'Social'], line: (f) => `${f.name} has become comfortable near the glass.` },
  surface: { label: 'Waits at the surface', traits: ['Greedy'], line: (f) => `${f.name} has started waiting near the surface at feeding time.` },
  night_rest: { label: 'Rests at night', traits: null, line: (f) => `${f.name} settles low in the tank to rest at night.` },
  hideaway: { label: 'Has a hiding place', traits: ['Shy'], needsDecor: true, line: (f, x) => `${f.name} has a new hiding place behind the ${x.decor}.` },
  regular: { label: 'Returns to one decoration', traits: null, needsDecor: true, line: (f, x) => `${f.name} keeps coming back to the ${x.decor}.` },
  object: { label: 'Investigates objects', traits: ['Curious'], needsDecor: true, line: (f, x) => `${f.name} has started investigating the ${x.decor}.` },
  together: { label: 'Swims with a friend', traits: null, pair: true, line: (f, x) => `${f.name} and ${x.other} have begun swimming together.` },
  bubbles: { label: 'Plays in the bubbles', traits: ['Playful'], needsBubbler: true, line: (f) => `${f.name} has found the bubbles and plays in them.` },
  food: { label: 'Loves its favorite food', serverOnly: true, line: (f, x) => `${f.name} loves ${x.food}.` },
  routine: { label: 'Has a daily routine', traits: null, line: (f) => `${f.name} has settled into a daily routine.` },
  // what a seahorse and an octopus are seen to do. These are quiet: a line in that animal's own journal, nothing in the tank's, and no shells
  hitch: { label: 'Tail hitching', kind: 'seahorse', quiet: true, line: (f) => `${f.name} wrapped its tail round a stem and held on.` },
  eyes: { label: 'Independent eyes', kind: 'seahorse', quiet: true, line: (f) => `${f.name} watched two things at once, one eye each way.` },
  snick: { label: 'Snaps up plankton', kind: 'seahorse', quiet: true, line: (f) => `${f.name} snapped up a speck of plankton with a flick of its head.` },
  blend: { label: 'Color matching', kind: 'seahorse', quiet: true, line: (f) => `${f.name} slowly took on the color of the plant it was holding.` },
  favhitch: { label: 'Favourite holdfast', kind: 'seahorse', quiet: true, needsDecor: true, line: (f, x) => `${f.name} keeps going back to the ${x.decor}. It seems to be its favorite place to hold on.` },
  dance: { label: 'Greeting dance', kind: 'seahorse', quiet: true, line: (f) => `${f.name} met another seahorse and they circled each other, glowing.` },
  tails: { label: 'Holding tails', kind: 'seahorse', quiet: true, line: (f) => `${f.name} curled its tail round another seahorse's and they drifted along together.` },
  camo: { label: 'Camouflage', kind: 'octopus', quiet: true, line: (f) => `${f.name} changed the color and the texture of its skin to match what was behind it.` },
  den: { label: 'Den dwelling', kind: 'octopus', quiet: true, line: (f) => `${f.name} tucked itself into its den.` },
  grab: { label: 'Arm exploration', kind: 'octopus', quiet: true, line: (f) => `${f.name} wrapped its arms round something to feel it all over.` },
  mimic: { label: 'Impressions', kind: 'octopus', quiet: true, line: (f) => `${f.name} pretended to be another animal.` },
  bury: { label: 'Burying', kind: 'octopus', quiet: true, line: (f) => `${f.name} dug itself into the sand until only its eyes showed.` },
  squirt: { label: 'Squirting water', kind: 'octopus', quiet: true, line: (f) => `${f.name} squirted a jet of water.` },
  escape1: { label: 'First Escape', kind: 'octopus', quiet: true, line: (f) => `${f.name} went out over the top of the tank for the first time, and came home.` },
  collector: { label: 'The Collector', kind: 'octopus', quiet: true, line: (f) => `${f.name} has brought home three keepsakes now. It is building a collection.` },
  homeagain: { label: 'Home Again', kind: 'octopus', quiet: true, line: (f) => `${f.name} was gone all night and still found its way home.` },
  favfind: { label: 'A Familiar Find', kind: 'octopus', quiet: true, line: (f) => `${f.name} found something just like a keepsake it already has.` },
  rearrange: { label: 'Rearranging', kind: 'octopus', quiet: true, line: (f) => `${f.name} moved something in the tank to suit itself.` },
  puzzle: { label: 'Puzzle solving', kind: 'octopus', quiet: true, line: (f) => `${f.name} opened a puzzle jar.` },
  highbank: { label: 'Climbing the high bank', kind: 'octopus', quiet: true, line: (f) => `${f.name} explored the high bank at the back of the tank.` },
};
// the behaviors each animal could show, in the order the profile lists them: its own species' first, then the ones its traits allow
const BEHAVIOURS = { seahorse: ['hitch', 'eyes', 'snick', 'blend', 'favhitch', 'dance', 'tails', 'night_rest', 'food'], octopus: ['camo', 'den', 'grab', 'mimic', 'bury', 'squirt', 'rearrange', 'puzzle', 'highbank', 'escape1', 'homeagain', 'collector', 'favfind', 'food'] };
export function behavioursFor(f) {
  const own = BEHAVIOURS[f?.species]; if (own) return own;
  const tr = f?.traits ?? []; return ['spot', 'friend', 'glass', 'surface', 'night_rest', 'hideaway', 'regular', 'object', 'together', 'bubbles', 'routine', 'food'].filter((k) => { const d = DISCOVERIES[k]; return !d.kind && (!d.traits || d.traits.some((x) => tr.includes(x))); });
}
export const seenBehaviour = (f, k) => !!(f?.disc?.[k] || (k === 'spot' && f?.found?.includes('spot')) || (k === 'friend' && f?.pal) || (k === 'puzzle' && (f?.solved ?? 0) > 0));
export const FRIEND_REWARD = 3, AGE_REWARDS = [[14, 5], [30, 8]], FIRST_HATCH_REWARD = 5;
function unlock(t, f, key, now, ev, x = {}) {
  const d = DISCOVERIES[key]; if (!d) return false; f.disc ||= {}; const k = d.pair ? `${key}:${x.otherId}` : key; if (f.disc[k] || (d.pair && f.disc[key + ':' + x.otherId])) return false;
  f.disc[k] = now; if (d.pair) { f.disc.together = f.disc.together ?? now; if (x.otherObj) { x.otherObj.disc ||= {}; x.otherObj.disc['together:' + f.id] ??= now; x.otherObj.disc.together ??= now; } } if (!d.line) return true;
  if (d.quiet) { ev.push({ story: f.id, text: d.line(f, x) }); return true; }
  ev.push({ journal: d.line(f, x), noticed: f.id, toast: d.line(f, x) }); return true;
}
function discover(t, now, ev) {
  const social = t.fish.filter((f) => (f.traits ?? []).includes('Social') && f.species !== 'neon' && !f.gift?.wrapped);
  for (const f of t.fish) {
    ensureFish(f); f.found ||= []; if (now - Math.max(f.born, f.arrived ?? -Infinity) < 2 * 3600e3 || f.happy < 0.7 || f.gift?.wrapped) continue;      /* (settled in for a couple of hours first; a wrapped gift says nothing until it is opened) */
    const fav = favouriteOf(f, t);
    if (fav && !f.found.includes('spot')) { f.found.push('spot'); (f.disc ||= {}).spot ??= now; const dd = t.decor.find((d) => DECOR_DEF[d.type]?.cat === SPOT[fav.key]?.[0]); if (dd) f.spotId = dd.id; t.shells += 2; ev.push({ journal: `${f.name} found a favorite spot near the ${fav.label}.`, toast: `${f.name} found a favorite spot! +2 shells`, discovery: f.id }); }
    else if (social.length >= 2 && social.includes(f) && !f.found.includes('friend')) { const pal = social.find((o) => o !== f && !(o.found ?? []).includes('friend')) ?? social.find((o) => o !== f), key = [f.id, pal.id].sort().join('+'), first = !(t.flags.pairs ||= {})[key]; t.flags.pairs[key] = now; f.pal = pal.id; pal.pal ??= f.id; (f.disc ||= {}).friend ??= now; (pal.disc ||= {}).friend ??= now; f.found.push('friend'); pal.found ||= []; if (!pal.found.includes('friend')) pal.found.push('friend'); if (first) t.shells += FRIEND_REWARD; ev.push({ journal: `${f.name} and ${pal.name} have been spending more time together.`, toast: first ? `${f.name} made a friend. +${FRIEND_REWARD} shells` : `${f.name} and ${pal.name} are friends now!`, discovery: f.id }); }
  }
}
// Neglect is real. A fish that is starving or sitting in foul water slowly weakens (`ail`, in seconds); care wins the time back twice as fast.
// Days 1-2 normal. Day 3 (2d) sluggish and paler, growth pauses. Day 4 (3d) critical: slow, less appetite, a warning goes out.
// Day 5 (4d-5d) death is possible if the fish's own health stays critically low. Guard rails: no deaths in a new tank's first three days, at most one a day, the last fish never dies.
// A fish counts as going hungry only once it has gone this long without any feeding. Hunger itself rises to its cap within hours, so judging by the hunger bar alone would call a once-a-day caretaker neglectful.
export const FED_GRACE = 30 * 3600e3;
export const AIL_TIRED = 2 * 86400, AIL_WARN = 3 * 86400, AIL_DIE = 5 * 86400;       // day 3 sluggish and paler, day 4 critical, day 5 death becomes possible
// the place it was most attached to, by decoration id: its holdfast, its favourite spot, the thing it loved most (kept with its memorial, so family can be compared with it)
const memPlace = (t, f) => { const id = f.log?.fav ?? f.spotId ?? f.mem?.likes?.[0] ?? null; return id && t.decor.some((d) => d.id === id) ? { id } : null; };
function memorialOf(t, f, now) {
  const ms = [...(f.story ?? []).slice(0, 8).map((x) => x.text), `Reached the ${stageOf(f, now)} stage`]; if (f.found?.includes('spot')) ms.push(f.spotId ? `Found a favorite spot by the ${DECOR_DEF[t.decor.find((d) => d.id === f.spotId)?.type]?.label?.toLowerCase() ?? 'decorations'}` : 'Found a favorite spot');
  const pal = t.fish.find((x) => x.id === f.pal); if (pal) ms.push(`Best friends with ${pal.name}`); for (const [d] of AGE_REWARDS) if (f.found?.includes('age' + d)) ms.push(`Reached ${d} days old`); for (const k of f.tricks ?? []) ms.push(`Learned to ${TRICKS[k]?.label ?? k}`); if (Object.values(f.bond ?? {}).some((n) => n >= 10)) ms.push('Learned to trust a caretaker');
  return { id: f.id, name: f.name, species: f.species, born: f.born, died: now, owner: f.owner ?? null, ownerName: f.ownerName ?? null, traits: f.traits ?? [], milestones: ms, parents: (f.parents ?? []).map(lineOf), gen: f.gen ?? 0, friend: pal?.name ?? null, elder: !!f.elder, disc: Object.keys(f.disc ?? {}), rested: null, place: memPlace(t, f), keeps: (t.keeps ?? []).filter((k) => k.by === f.id).map((k) => k.id) };
}
function tendFish(t, dt, now, ev = [], h0 = t.hunger, w0 = t.water, oh0 = null) {
  for (const f of [...t.fish]) {
    if (f.away) continue;      /* out on an adventure: nothing about it changes until it is back (see adventures.js) */
    ensureFish(f); const n = needsOf(f, t, now), octo = ownHungry(f), fh0 = oh0?.get(f.id) ?? ownHunger(f);      /* (octo: it has its own hunger, an octopus or a seahorse) */
    // walk through the interval in half-hour steps so a feeding in the middle of it counts
    const steps = Math.max(1, Math.min(480, Math.ceil(dt / 1800))); f.ail = f.ail ?? 0; const stepMs = (dt / steps) * 1000;
    for (let k = 0; k < steps; k++) {
      const el = ((k + 0.5) / steps) * dt, hun = octo ? Math.min(ownHunger(f), fh0 + el * OHR) : Math.min(t.hunger, h0 + el * HR), wat = Math.max(t.water, w0 - el * WR * (1 + 0.5 * Math.min(2, t.floaters.length))), fedK = 1 - hun * (1 + f.appetite), at = now - (dt - el) * 1000, hungry = (fedK < 0.2 || hun >= 0.8) && at - (octo ? (f.fedAt ?? f.born) : (t.lastFed ?? -Infinity)) > FED_GRACE, bad = hungry || wat < 0.5;      // a fish of small appetite still goes hungry when nobody feeds it at all; an octopus is judged by its own last crab (or its arrival), never by the tank's flakes
      f.ail = Math.max(0, f.ail + (bad ? dt / steps : -(dt / steps) * 2)); if (bad && f.ail >= AIL_TIRED) f.born += stepMs;      // growth pauses once a fish is run down
    }
    const target = Math.min(1, 0.3 + 0.28 * t.water + 0.12 * (1 - t.glass) + 0.18 * n.fed + likes(f, t));
    f.happy += (target - f.happy) * Math.min(1, dt / 2400);
    // health follows how long the fish has really been neglected: it sinks toward critical over days, and climbs back quickly with care
    const ht = t.water > 0.5 && n.fed > 0.2 ? 1 : Math.max(0.2, 0.4 + 0.6 * Math.min(t.water, n.fed + 0.2) - 0.45 * Math.min(1, f.ail / AIL_DIE));
    f.health = Math.max(0.2, Math.min(1, f.health + (ht - f.health) * Math.min(1, dt / (ht < f.health ? 5400 : 1800))));
    if (f.ail < AIL_TIRED) { f.warned = false; f.tiredSaid = false; }
    else if (!f.tiredSaid) { f.tiredSaid = true; ev.push({ journal: `${f.name} looks tired. It needs food and clean water.`, toast: `${f.name} looks tired. A little care would help.`, tired: f.id }); }
    else if (f.ail >= AIL_WARN && !f.warned) { f.warned = true; ev.push({ journal: `${f.name} is very unwell. It needs food and clean water, then a little time to recover.`, toast: `${f.name} is very unwell. The tank needs care.`, warn: f.id }); }
    // old age: real lifespans, compressed about tenfold. From three quarters of its span an animal is an elder; past its full span, each day there is a
    // small and slowly rising chance it slips away peacefully (worked out from the day, so every phone agrees). Well looked-after ones live a little longer.
    { const L = lifeOf(f), age = (now - f.born) / DAY;
      if (age >= L * ELDER_AT && !f.elder && !f.dead) { f.elder = now; ev.push({ journal: `${f.name} is getting old. Its colors have softened and it takes life slowly now.`, toast: `${f.name} is an elder now.`, story: f.id, text: 'Became an elder.' }); }
      const over = age - L * (1 + 0.1 * Math.max(0, (f.happy ?? 0.7) - 0.6) / 0.4), d = Math.floor(now / DAY);
      if (over > 0 && f.oldDay !== d && t.flags.mortality !== false) { f.oldDay = d; const p = Math.min(0.5, 0.03 + 0.02 * over / 7);
        if (hash32(d * 7919 + [...String(f.id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 3)) % 10000 < p * 10000 && now - (t.lastDeath ?? 0) > DAY && t.fish.length > 1) {
          t.fish.splice(t.fish.indexOf(f), 1); t.lastDeath = now; const m = memorialOf(t, f, now); m.oldAge = true; (t.memorial ||= []).push(m);
          (t.floaters ||= []).push({ id: f.id, name: f.name, species: f.species, seed: f.seed, stage: f.stage, born: f.born, died: now, owner: f.owner ?? null, ownerName: f.ownerName ?? null, traits: f.traits ?? [], oldAge: true });
          const yrs = Math.round(age); ev.push({ journal: `${f.name} passed away peacefully of old age, after ${yrs} days in the tank. A long, full life.`, toast: `${f.name} passed away peacefully of old age.`, died: f.id }); continue; } } }
    // neglect never kills: a run-down animal stays very unwell (slow, pale, keeping to itself) until it is looked after, then recovers over a
    // day or two and the journal says so. Only old age ends a life (above).
    if (f.ail >= AIL_DIE) f.ail = AIL_DIE - 1;
    if (f.ail >= AIL_WARN) f.wasUnwell = true;
    else if (f.wasUnwell && f.ail < AIL_TIRED * 0.25) { f.wasUnwell = false; ev.push({ journal: `${f.name} is back to its old self.`, toast: `${f.name} has recovered.`, story: f.id, text: 'Recovered after a hard few days.' }); }
  }
}

// Older saves and fresh worlds both go through this, so every field below always exists.
export function norm(t, now = Date.now()) {
  if ((t.flags?.growV ?? 1) < 2 && Array.isArray(t.fish)) { const R0 = { baby: 0, juvenile: 1, adult: 2 }, min = { juvenile: BABY_DAYS, adult: ADULT_DAYS }; for (const f of t.fish) { if (!f || !min[f.stage] || R0[stageOf(f, now)] >= R0[f.stage]) continue; f.born = Math.min(f.born, now - min[f.stage] * DAY); } (t.flags ||= {}).growV = 2; }      // (growing up now takes ten days, not three: an animal that had already grown keeps the stage it reached)
  t.flags ||= { tut: 0 }; t.style ||= { floor: 'sand', backdrop: 'candy' }; t.orders ||= []; t.eggs ||= []; t.memorial ||= []; if (t.memorial.length > 150) t.memorial.splice(0, t.memorial.length - 150);      /* (the oldest go first: a tank of many years stays small) */ t.floaters ||= []; t.bottles ||= []; t.visitor ??= null; t.visitAt ??= now + 6 * 3600e3; t.eggAt ??= now + 18 * 3600e3; t.storyAt ??= now + 3 * 3600e3; t.drift ??= null; t.driftAt ??= now + 20 * 60e3; t.wishIdx ??= 0; t.flags.collMs ??= 0; t.wantAt ??= now + 3 * 3600e3; t.want ??= null; t.req ??= null;
  // Repair: whatever an older version or a damaged save left behind must not stop a tank from running (one broken fish once kept an order from ever arriving).
  if (!Array.isArray(t.fish)) t.fish = []; if (!Array.isArray(t.decor)) t.decor = [];
  if (t.nursery && (typeof t.nursery !== 'object' || !Array.isArray(t.nursery.cands) || !Number.isFinite(t.nursery.readyAt))) t.nursery = null; t.nursery ??= null; if (t.lastDepart && (typeof t.lastDepart !== 'object' || !Array.isArray(t.lastDepart.left))) t.lastDepart = null;
  t.fish = t.fish.filter((f) => f && typeof f === 'object' && SPECIES_DEF[f.species]);
  for (const f of t.fish) { if (!Array.isArray(f.traits)) f.traits = []; if (typeof f.name !== 'string' || !f.name) f.name = 'Fish'; if (!Number.isFinite(f.born)) f.born = now; if (typeof f.stage !== 'string') f.stage = 'baby'; if (typeof f.id !== 'string') f.id = 'f' + (t.seq = (t.seq ?? 10) + 1); if (!Number.isFinite(f.seed)) f.seed = 1; }
  t.decor = t.decor.filter((d) => d && DECOR_DEF[d.type] && typeof d.id === 'string');
  t.orders = t.orders.filter((o) => o && SPECIES_DEF[o.species] && Number.isFinite(o.arrivesAt)); (t.fish ?? []).forEach((f) => { if (f?.mem && typeof f.mem === 'object') memCap(t, f, now); else if (f) delete f.mem; });      // (an octopus's memories, kept bounded)
  t.eggs = t.eggs.filter((e) => e && Number.isFinite(e.hatchAt) && (e.species !== 'octopus' || e.den)); t.noteLog = (t.noteLog ?? []).filter((n) => n && now - n.at < NOTE_KEEP); t.notes = (t.notes ?? []).filter((n) => { if (!n || typeof n.text !== 'string') return false; if (now - n.at < NOTE_LIFE) return true; logNote(t, n); return false; });      // (octopuses never lay eggs in the tank: an old one from before that rule just goes)
  if (!Number.isFinite(t.shells)) t.shells = 10; if (!Number.isFinite(t.level)) t.level = 1; t.level = Math.max(1, Math.min(8, t.level | 0));
  for (const k of ['hunger', 'water', 'glass']) if (!Number.isFinite(t[k])) t[k] = k === 'water' ? 1 : 0.5;
  t.schema = 1;
  t.seen ||= {}; if (!Array.isArray(t.seen.fish)) t.seen.fish = [...new Set((t.fish ?? []).map((f) => f?.species).filter(Boolean))]; if (!Array.isArray(t.seen.decor)) t.seen.decor = [...new Set((t.decor ?? []).map((d) => d?.type).filter(Boolean))];      // (repairs a half-written one too)
  if (!Number.isFinite(t.simTs)) t.simTs = now; if (!Number.isFinite(t.createdAt)) t.createdAt = now;      // a save without a clock never moved on (and its weekly birthday was NaN)
  t.lastFed ??= t.simTs ?? now;
  { const ow = (t.flags.styles ||= { floor: {}, backdrop: {} }); ow.floor ||= {}; ow.backdrop ||= {}; ow.floor[t.style?.floor ?? 'sand'] = true; ow.backdrop[t.style?.backdrop ?? 'candy'] = true; }      // a look a tank already uses stays its own
  if (!t.flags.msV) {                                   // a tank saved before fish milestones existed: record what its fish already reached, pay nothing retroactively
    t.flags.msV = 1;
    for (const f of t.fish) { f.found ||= []; for (const [d] of AGE_REWARDS) if ((now - f.born) / DAY >= d && !f.found.includes('age' + d)) f.found.push('age' + d); }
    if ((t.flags.topGen ?? 0) > 0 && !t.flags.firstHatch) t.flags.firstHatch = { at: now, legacy: true };
  }
  return t;
}
const hash32 = (n) => { let h = (n | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
export const WISHES = [
  { text: 'Have three fish swimming together', done: (t) => t.fish.length >= 3, reward: 4 },
  { text: 'Place six decorations', done: (t) => t.decor.length >= 6, reward: 4 },
  { text: 'Reach tank level 3', done: (t) => t.level >= 3, reward: 5 },
  { text: 'Keep the fish happy (70%+ on average)', done: (t) => t.fish.length >= 2 && t.fish.reduce((n, f) => n + (f.happy ?? 0.7), 0) / t.fish.length >= 0.7, reward: 5 },
  { text: 'Have three kinds of fish', done: (t) => new Set(t.fish.map((f) => f.species)).size >= 3, reward: 6 },
  { text: 'Raise a fully grown fish', done: (t) => t.fish.some((f) => f.stage === 'adult'), reward: 6 },
  { text: 'Fill the tank with twelve fish', done: (t) => t.fish.length >= 12, reward: 8 },
  { text: 'Reach tank level 6', done: (t) => t.level >= 6, reward: 10 },
  { text: 'Fill the tank with twenty-five fish', done: (t) => t.fish.length >= 25, reward: 15 },
  { text: 'Discover 20 things for the collection book', done: (t) => t.seen.fish.length + t.seen.decor.length >= 20, reward: 12 },
  { text: 'Find every fish and decoration in the book', done: (t) => t.seen.fish.length + t.seen.decor.length >= COLLECTION_SIZE(), reward: 25 },
  { text: 'Reach tank level 8', done: (t) => t.level >= 8, reward: 15 },        // last: a wish that needs level 8 must not stand in front of wishes that count toward it
];
export const COLLECTION_SIZE = () => Object.keys(SPECIES_DEF).length + Object.keys(DECOR_DEF).length;
// It is a tank, not the sea: whatever turns up was brought by something that lives in it, or dropped in from above.
function culprit(t, h) {
  const live = (t.fish ?? []).filter((f) => !f.dead), pool = [['lid', 2], ['filter', 2], ['stone', 1], ['rock', 1]];
  for (const f of live) pool.push([f.species === 'octopus' ? 'oct:' + f.name : 'fish:' + f.name, f.species === 'octopus' ? 4 : 1]);
  let n = h % pool.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of pool) { if ((n -= w) < 0) { const [kind, name] = k.split(':'); return name ? { k: kind, n: name } : { k: kind }; } }
  return { k: 'lid' };
}
// The one-line story of how a find got there. `h` picks between a few wordings so it does not read the same every time.
export function driftBlame(g, h = 0) {
  const b = g?.by, n = b?.n ?? 'A fish', pick = (a) => a[(h + (g?.id?.length ?? 0)) % a.length];
  switch (b?.k) {
    case 'oct': return pick([`${n} dragged it out of its den.`, `${n} brought it back from behind the filter.`, `${n} was hiding it under an arm.`]);
    case 'fish': return pick([`${n} nosed it loose from the plants.`, `${n} dug it out of the sand.`, `${n} pushed it up from the gravel.`]);
    case 'filter': return pick(['The filter coughed it up.', 'The filter bubbled it loose.']);
    case 'stone': return 'The air stone knocked it loose.';
    case 'rock': return 'It tumbled out from behind a rock.';
    default: return pick(['It dropped in through the lid.', 'It slipped in from above.']);
  }
}
function makeDrift(t, now) {
  const seq = (t.seq = (t.seq ?? 10) + 1), r = hash32(Math.floor(now / 6e4) * 31 + seq) % 100;
  const full = skyOf(now).event?.key === 'fullmoon', kind = full ? (r < 55 ? 'pearl' : 'shells') : r < 62 ? 'shells' : r < 85 ? 'treat' : 'pearl', amount = kind === 'shells' ? 1 + (r % 3) : kind === 'pearl' ? 4 : 0;
  const h = hash32(seq * 77 + 5); return { id: 'g' + seq, kind, amount, by: culprit(t, h), x: +(-3.4 + (h % 68) / 10).toFixed(2), z: +(0.4 + ((h >> 8) % 26) / 10).toFixed(2) };
}
function makeFish(t, o, now, idx) {
  const d = SPECIES_DEF[o.species], seed = o.seed + idx * 3, fname = d.count === 1 ? (o.name || NAMES[(t.seq + idx) % NAMES.length]) : `${o.name || d.label.split(' ')[0]} ${idx + 1}`;
  const f = ensureFish({ id: nextId(t, 'f'), name: fname, species: o.species, seed, born: o.carry || o.fromEgg ? now : now - (ADULT_DAYS - 2) * DAY, stage: o.carry || o.fromEgg ? 'baby' : 'juvenile',      /* (from the shop it comes young but nearly grown: ready to pair in a couple of days; only babies bred here start from the egg) */ traits: traitsFor(o.species, seed), happy: 0.75, owner: o.owner ?? null, ownerName: o.ownerName ?? null, paid: Math.floor((o.paid ?? 0) / d.count) }); if (o.pal != null) f.pal = o.pal; if (o.sex) f.sex = o.sex; t.fish.push(f);      /* (a seahorse's sex, if its caretaker chose one) */
  if (!o.carry && !o.fromEgg) f.arrived = now;      // (its days here start now, whatever its age)
  if (o.carries && MORPHS[o.carries]) f.genes = { ...genesOf(seed), m: [o.carries, 'n'] };      // today's special: it carries a rare color
  if (!t.seen.fish.includes(o.species)) t.seen.fish.push(o.species); return f;
}
const HOUR = 3600e3, BOTTLE_PAY = 2;      // a bottle pays what it cost to send, so swapping bottles cannot make shells
// A snapshot of a fish for its family record, so a family tree survives its members: identity, look, generation and its own parents' names.
const snap = (f) => f && ({ id: f.id, name: f.name, species: f.species, seed: f.seed, traits: f.traits ?? [], genes: f.genes ?? genesOf(f.seed), gen: f.gen ?? 0, owner: f.owner ?? null, ownerName: f.ownerName ?? null, parents: (f.parents ?? []).map((p) => ({ id: p.id, name: p.name })) });
// a young one's temperament leans a little toward its parents' (beyond the one trait it takes from each): what both parents share it leans
// toward more, and only sometimes. Kept as a small nudge on its own personality (profile.js personaOf), never a copy of theirs.
const LEAN = { Curious: 'cur', Social: 'soc', Brave: 'bold', Shy: 'bold-', Playful: 'act', Lazy: 'act-', Calm: 'adapt' };
export function leanOf(par, h) { const c = {}; for (const p of par.filter(Boolean)) for (const tr of p.traits ?? []) if (LEAN[tr]) c[LEAN[tr]] = (c[LEAN[tr]] ?? 0) + 1; const out = {}; for (const [k, n] of Object.entries(c)) { if (n < 2 && (h >>> (k.length + 3)) % 3) continue; const [dim, neg] = k.split('-'); const v = (neg === '' ? -1 : 1) * 0.05 * n; out[k.endsWith('-') ? dim : dim] = +((out[dim] ?? 0) + v).toFixed(2); } const dims = Object.keys(out); return dims.length ? { from: par.filter((p) => p && (p.traits ?? []).some((tr) => LEAN[tr] && dims.includes(LEAN[tr].replace('-', '')))).map((p) => p.name).slice(0, 2), ...out } : null; }      // (named: only the parents it really takes after)
const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][n - 1] ?? `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
// links to an animal that has left the tank (rehomed or let go) are cleared from the others, so nobody follows or squabbles with a ghost
const unlink = (o, id) => { if (o.buddy === id) delete o.buddy; if (o.rival === id) delete o.rival; if (o.grudge?.id === id) delete o.grudge; if (o.pal === id) delete o.pal; if (o.mate === id) delete o.mate; if (o.partner === id) delete o.partner; };
const lineOf = (p) => ({ id: p.id, name: p.name, parents: (p.parents ?? []).map((q) => ({ id: q.id, name: q.name })) });
export const parentsOf = (f) => f.parents ?? [];
export function childrenOf(t, id) { const me = t.fish.find((f) => f.id === id) ?? (t.memorial ?? []).find((m) => m.id === id), sp = me?.species; return [...t.fish.filter((f) => (!sp || f.species === sp) && (f.parents ?? []).some((p) => p.id === id)).map((f) => ({ id: f.id, name: f.name, alive: true })), ...(t.memorial ?? []).filter((m) => (!sp || !m.species || m.species === sp) && (m.parents ?? []).some((p) => p.id === id)).map((m) => ({ id: m.id, name: m.name, alive: false }))]; }      // (only its own kind: an id that matches by accident never makes a goldfish an octopus's child)
// ── Hide a treat ── a caretaker hides a treat in one of the decorations and the octopus searches for it, spot by spot. Where it looks first
// is what it has learnt about that caretaker: the spots they have used, and the last one, count for more with every hunt; with no history it
// is mostly a guess. So it soon goes straight to a favorite hiding place, and the only way to fool it is to keep changing. Shells in, no shells out.
export const HIDE_COST = 5, HIDE_GAP = 20 * 60e3, HIDE_STEP = 9;
export const hideLabel = (t, id) => (DECOR_DEF[t.decor.find((d) => d.id === id)?.type]?.label ?? 'thing').toLowerCase();
export function hideOrder(t, f, uid) {
  const mine = f.hides?.[uid] ?? {}, all = f.hidesAll ?? {}, last = f.lastHide?.[uid], w = Math.min(1, (f.seekN ?? 0) / 4), u = hash32(String(uid ?? '')) ;
  return t.decor.map((d) => { const noise = (hash32((f.seekN ?? 0) * 97 + u + hash32(d.id)) % 1000) / 500;      // 0..2: its own guess, different each hunt
    return [d.id, w * (3 * (mine[d.id] ?? 0) + (all[d.id] ?? 0) + (d.id === last ? 1.5 : 0)) + (2 - 1.5 * w) * noise]; }).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
}
function hunts(t, now, ev) {
  for (const f of t.fish) {
    const H = f.seek; if (!H || now < H.until) continue;
    f.seek = null; const by = H.by ?? 'solo', tries = H.path.length, L = hideLabel(t, H.spot);
    ((f.hides ||= {})[by] ||= {})[H.spot] = (f.hides[by][H.spot] ?? 0) + 1; (f.hidesAll ||= {})[H.spot] = (f.hidesAll[H.spot] ?? 0) + 1; (f.lastHide ||= {})[by] = H.spot;
    { const sc = ((f.hideScore ||= {})[by] ||= { you: 0, it: 0 }); if (tries >= 3) { sc.you++; t.shells += HIDE_COST * 2; } else if (tries === 1) sc.it++; H.won = tries >= 3 ? 'you' : tries === 1 ? 'it' : null; H.score = { ...sc }; }      // a real contest: fool it (three tries or more) and the treat pays back double; let it find it first try and it scores
    f.seekN = (f.seekN ?? 0) + 1; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.1); f.bond ||= {}; f.bond[by] = (f.bond[by] ?? 0) + 1; f.seekRun ||= {}; f.seekRun[by] = tries === 1 ? (f.seekRun[by] ?? 0) + 1 : 0;
    const who = H.name ?? 'You', before = H.path.slice(0, -1).slice(-2).map((id) => 'the ' + hideLabel(t, id));
    const you = who === 'You', whose = you ? 'your' : who + "'s", hides = you ? 'you hide' : who + ' hides';
    const line = tries === 1 ? (f.seekN > 2 ? `${f.name} went straight to the ${L}: it knows where ${hides} things.` : `${f.name} found ${whose} treat in the ${L} on the first try. A lucky guess?`)
      : tries === 2 ? `${f.name} found ${whose} treat in the ${L} on its second try.` : `${who} fooled ${f.name}: it searched ${before.join(' and ')} before finding the treat in the ${L}.`;
    const tally = H.score ? ` (${who === 'You' ? 'you' : who} ${H.score.you} · ${f.name} ${H.score.it})` : ''; ev.push({ journal: line + tally, story: f.id, text: line, toast: tries === 1 ? `${f.name} found it straight away! It scores.${tally}` : tries >= 3 ? `You fooled ${f.name}! +${HIDE_COST * 2} shells${tally}` : `${f.name} found it on try ${tries}.${tally}`, hunt: f.id });
    if (f.seekRun[by] >= 3 && !(f.disc ||= {})['reader:' + by]) { f.disc['reader:' + by] = now; const l2 = `${f.name} has learned ${who === 'You' ? 'your' : who + "'s"} hiding places.`; ev.push({ journal: l2, story: f.id, text: l2, discovery: true }); }
  }
}
function puzzles(t, now, ev) {
  for (const f of t.fish) {
    const p = f.puzzle; if (!p || now < p.until) continue;
    f.puzzle = null; f.solved = (f.solved ?? 0) + 1; f.disc ||= {}; f.disc.puzzle ??= now; f.bestSecs = Math.min(f.bestSecs ?? 1e9, p.secs); f.happy = Math.min(1, (f.happy ?? 0.7) + 0.15);
    if (p.by) { f.bond ||= {}; f.bond[p.by] = (f.bond[p.by] ?? 0) + 1; }
    const first = f.solved === 1; if (first) t.shells += PUZZLE_FIRST_REWARD;
    if (now - p.until < 120e3) witness(t, 'puzzle', f, now, ev, null, first ? `${f.name} worked out the puzzle jar.` : f.solved === 4 ? `${f.name} opens the puzzle jar in ${p.secs} seconds now.` : `${f.name} opened the puzzle jar in ${p.secs} seconds.`);      // (seen as it happened, not caught up afterwards)
    ev.push({ journal: first ? `${f.name} worked out the puzzle jar.` : f.solved === 4 ? `${f.name} opens the puzzle jar in ${p.secs} seconds now.` : `${f.name} opened the puzzle jar in ${p.secs} seconds.`, puzzle: f.id, ...(first ? { toast: `${f.name} worked out the jar! +${PUZZLE_FIRST_REWARD} shells`, milestone: f.id } : {}) });
  }
}
function visitors(t, now, ev) {
  if (t.visitor && now >= t.visitor.until) { t.visitor = null; t.visitAt = now + (48 + (hash32(now / 6e4) % 49)) * HOUR; }
  if (t.visitor || now < t.visitAt || (t.flags.tut ?? 0) < 5) return;
  if (todOf(t, now) < 2 && hash32(Math.floor(t.visitAt / 6e4)) % 10 < 4 && !t.visitWait) { t.visitWait = true; const h = new Date(now + (Number(t.tzMin) || 0) * 60e3).getUTCHours(); t.visitAt = now + ((22 - h + 24) % 24 || 24) * HOUR; return; }      // some visitors only come at night: this one waits for the evening (life.js)
  t.visitWait = false;
  const all = Object.keys(SPECIES_DEF).filter((k) => SPECIES_DEF[k].visitor && !t.visitMem?.[k]?.kept), fresh = all.filter((k) => !t.seen.fish.includes(k)), lure = themesOf(t).filter((x) => x.active && x.visitor && fresh.includes(x.visitor)).map((x) => x.visitor), pool = lure.length ? lure : fresh.length ? fresh : all;       // a theme draws its own kind of visitor (a kind that stayed lives here now: it never visits)
  if (!pool.length) { t.visitAt = now + 7 * DAY; return; }
  const seq = (t.seq = (t.seq ?? 10) + 1), sp = pool[hash32(seq * 17 + Math.floor(now / 6e4)) % pool.length], d = SPECIES_DEF[sp];
  t.visitor = { id: 'v' + seq, species: sp, seed: hash32(seq * 13) % 90000, until: now + 3 * HOUR }; const vm = visitorArrives(t, t.visitor, now, ADVR); const stay = stayOffer(t, t.visitor, now, ADVR);      // (a visitor that has been before goes back to its old place, and stays longer)
  if (stay) ev.push({ journal: `The ${d.label} is back again, for the ${ordinal(vm.n)} time. It looks as if it would like to stay.`, toast: `The ${d.label} looks as if it would like to stay. Tap it to decide.`, visitor: true, stayAsk: t.visitor.id, hist: 'visitor' });
  else if (t.visitor.full) ev.push({ journal: `The ${d.label} is back again, for the ${ordinal(vm.n)} time. It might have stayed, but the tank is full.`, toast: `The ${d.label} is back! Tap it to say hello.`, visitor: true, hist: 'visitor' });
  else if ([2, 5, 10].includes(vm.n)) ev.push({ journal: `The ${d.label} is back. It has visited ${vm.n === 2 ? 'twice' : `${vm.n} times`} now, and went straight to its old spot.`, toast: `The ${d.label} is back! Tap it to say hello.`, visitor: true });
  else ev.push({ journal: `A ${d.label} is visiting the tank.`, toast: `A rare visitor: ${d.label}! Tap it to say hello.`, visitor: true });
}
export const EGG_DAYS = 3;
export const OCTO_EGG_AFTER = 5, OCTO_EGG_DAYS = 5, OCTO_EGG_GAP = 25;      // octopus partners: days together before eggs, days the mother broods them, and days before she lays again
export const EGG_WAIT = 10 * HOUR, FRY_KEEP = 45 * 60e3;      // ready eggs wait this long for someone to watch, then hatch anyway (in the morning); a second little one waits this long to be kept
// a moment in the tank's own daytime (9 in the morning to 8 in the evening, its caretakers' clock): a hatching nobody has to set an alarm for
export function wakeAt(t, ms) { const tz = (Number(t.tzMin) || 0) * 60e3, L = new Date(ms + tz), h = L.getUTCHours() + L.getUTCMinutes() / 60, j = (hash32(Math.floor(ms / 6e4)) % 90) * 60e3;
  if (h >= 9 && h < 20) return ms; const day = Date.UTC(L.getUTCFullYear(), L.getUTCMonth(), L.getUTCDate()) - tz; return (h < 9 ? day : day + DAY) + 9 * HOUR + j; }
export const POT_SKILL = 0.35;      // how well an octopus must know a clay pot before it squeezes all the way inside (until then it sits in the mouth)
export const AWAY_DAYS = 14;      // a caretaker not seen for this long: a friend may take on their animals
export const awayOwner = (f, members, now = Date.now()) => { if (!f?.owner || f.dead) return null; const m = (members ?? []).find((x) => x.id === f.owner); return !m ? { name: f.ownerName ?? 'its caretaker', left: true } : now - (m.lastSeen ?? m.last_seen ?? now) >= AWAY_DAYS * DAY ? { name: m.name, days: Math.floor((now - (m.lastSeen ?? m.last_seen)) / DAY) } : null; };
// How each kind really looks after its eggs. guard: a patch of eggs stuck down by a rock, the father on guard (fanning them, picking out bad ones,
// chasing others off), the mother never far; mouth: the father carries them in his mouth and eats nothing until they hatch; drift: the pair rise
// together at dusk and let the eggs go to drift, as they do in the sea, so the care is all yours.
export const EGG_CARE = {
  goldfish: { mode: 'guard', on: 'rock', fact: 'Clownfish fathers guard their eggs, fanning water over them and picking out any that go bad.' },
  guppy: { mode: 'guard', on: 'rock', fact: 'A damselfish father guards his eggs fiercely, chasing off fish far bigger than he is.' },
  cory: { mode: 'guard', on: 'rock', fact: 'Goby fathers guard their eggs in a hollow under a rock, fanning them clean.' },
  blue: { mode: 'guard', on: 'plant', fact: 'A royal gramma father lines a nest with bits of seaweed and guards the eggs in it.' },
  platy: { mode: 'mouth', fact: 'Cardinalfish fathers carry the eggs in their mouths, and eat nothing until they hatch.' },
  angelfish: { mode: 'drift', fact: 'Angelfish pairs rise together at dusk and let their eggs drift away on the current.' },
  betta: { mode: 'drift', fact: 'Mandarin pairs rise together at dusk and release their eggs to drift.' },
  octopus: { mode: 'den', fact: 'An octopus mother hangs her eggs in strings from the roof of her den and guards them: she cleans them, blows fresh water over them, and hardly leaves until they hatch.' },
};
export const eggCareOf = (e) => EGG_CARE[e?.species] ?? EGG_CARE.goldfish;
// who is looking after an egg now: its guardian if still here, else the other parent, else nobody (the caretaker)
function eggGuard(t, e, ev, now = Date.now()) {
  if (eggCareOf(e).mode === 'drift') return;
  const live = (id) => t.fish.find((f) => f.id === id && !f.dead);
  if (e.guard === undefined) e.guard = [e.b, e.a].map(live).find((f) => f && sexOf(f) === 'm')?.id ?? [e.a, e.b].find(live) ?? null;      // (an egg from before parents looked after them: its father takes it on)
  if (e.guard && live(e.guard)) { const day = Math.floor(now / DAY); if (eggCareOf(e).mode !== 'drift' && e.said !== day && e.laid && now - e.laid > 20 * 3600e3) { e.said = day; ev.push({ journal: eggCareOf(e).mode === 'mouth' ? `${live(e.guard).name} is still carrying the eggs, and has not eaten.` : `${live(e.guard).name} has not left the eggs all day.` }); } return; }      // a line a day about the father's watch
  const was = e.guard, other = [e.a, e.b].find((id) => id !== was && live(id));
  if (eggCareOf(e).mode === 'den') { if (e.guard !== null) { e.guard = null; if (was) ev.push({ journal: 'The octopus eggs have nobody guarding them now. Keep the water clean for them.' }); } return; }
  if (other && eggCareOf(e).mode === 'guard') { e.guard = other; if (was) ev.push({ journal: `${live(other).name} has taken over guarding the eggs.` }); return; }
  if (e.guard !== null) { e.guard = null; if (was) ev.push({ journal: 'The eggs have no parent watching them now. It is up to you to keep the water clean and the tank fed.' }); }
}
const logNote = (t, n) => { t.noteLog = [n, ...(t.noteLog ?? []).filter((x) => x.id !== n.id)].slice(0, 12); };      // the board keeps the last twelve notes for two weeks
export const NOTE_KEEP = 14 * 864e5, NOTE_COLORS = ['butter', 'blush', 'mint', 'sky', 'lilac'], NOTE_DOODLES = ['🐙', '🐠', '🐟', '🌿', '💛', '⭐', '🫧', '🦀'], NOTE_LIFE = 3 * DAY;
const careEgg = (t, now) => { const d = Math.floor(now / DAY); for (const e of t.eggs ?? []) { e.cared ||= []; if (!e.cared.includes(d) && now < e.hatchAt) e.cared.push(d); } };      // food or clean water on a day counts as looking after the egg that day
export const eggCare = (e) => (e?.cared ?? []).length;
// one little one from these eggs, its looks and nature from both parents (the same way for the first and for a second one that is kept)
// a baby that shows a rare color: a line in the journal, and the first of each color is kept in the Field Guide's color pages
function morphBorn(t, f, now, ev) {
  const m = morphOf(f); if (!m) return; earn(t, 'torii', now, ev); bump(t, 'morphs'); bump(t, 'morph_' + m); (t.morphLog ||= []).push({ m, at: now }); if (t.morphLog.length > 60) t.morphLog.splice(0, t.morphLog.length - 60);      /* (kept for the weekly board across tanks) */ const M = MORPHS[m], first = !(t.morphs ||= {})[m]; if (first) t.morphs[m] = { at: now, fish: f.id, name: f.name, species: f.species };
  ev.push({ activity: { type: 'morph', text: `${f.name} hatched ${M.label.toLowerCase()}!` } }); ev.push({ journal: `${f.name} is ${M.label.toLowerCase()}! ${first ? `The first ${M.label.toLowerCase()} ${(SPECIES_DEF[f.species]?.label ?? 'fish').toLowerCase()} ever bred in this tank.` : 'A rare color, from both parents.'}`, story: f.id, morph: m });      // (no toast: the reveal on screen says it, after a breath)
}
// an earned piece: placed in the tank as a present, once (it can be moved like any other)
function earn(t, type, now, ev) { if (!DECOR_DEF[type] || (t.flags.earned ||= {})[type]) return; t.flags.earned[type] = now; const used = t.decor.map((d) => d.x), x = [-3, 3, -1.5, 1.5, 0].find((v) => !used.some((u) => Math.abs(u - v) < 1)) ?? 0;
  t.decor.push({ id: nextId(t, 'd'), type, x, z: -0.6, ry: 0, at: now }); if (!t.seen.decor.includes(type)) t.seen.decor.push(type); ev.push({ journal: EARNED[type].line, toast: `Earned: ${DECOR_DEF[type].label}! It is in the tank now.`, placed: type, milestone: true }); }
function makeChild(t, e, now) {
  const A = e.pa ?? snap(t.fish.find((f) => f.id === e.a)), B = e.pb ?? snap(t.fish.find((f) => f.id === e.b)), h = hash32(e.hatchAt / 1e3);
  const seed = (h & 1 ? B?.seed : A?.seed) ?? e.seed, pick = (p, k) => (p?.traits?.length ? p.traits[(h >> k) % p.traits.length] : null);       // the pattern comes from one parent, the tint and size from both
  const traits = [...new Set([pick(A, 1), pick(B, 3)].filter(Boolean))];
  const roll = (k) => blendGenes(gOf(A, seed), gOf(B, seed), seededRandom(h + k * 7919), !!e.moon), clutch = A && B ? [0, 1, 2].map(roll) : [], genes = A && B ? clutch.find((g) => g.m[0] === g.m[1] && MORPHS[g.m[0]]) ?? clutch[0] : genesOf(seed)      /* (a clutch is many eggs: of the three that hatch strongest, the one that stays is the rare one if there is one) */, gen = Math.max(A?.gen ?? 0, B?.gen ?? 0) + 1;
  const f = ensureFish({ id: nextId(t, 'f'), name: NAMES[(t.seq + h) % NAMES.length], species: e.species, seed, born: now, stage: 'baby', lean: leanOf([A, B], h), traits: traits.length ? traits : traitsFor(e.species, seed), happy: 0.8, genes, gen, paid: 0, parents: [A, B].filter(Boolean).map(lineOf), owner: t.fish.find((x) => x.id === e.a && !x.dead)?.owner ?? A?.owner ?? null, ownerName: t.fish.find((x) => x.id === e.a && !x.dead)?.ownerName ?? A?.ownerName ?? null }); t.fish.push(f);
  return { f, A, B, h, gen };
}
function eggs(t, now, ev) {
  if (t.fryOffer && now > t.fryOffer.until) t.fryOffer = null;      // (the second little one has drifted off after the others)
  for (const e of [...t.eggs]) {
    // very rarely, an egg nobody has looked after at all is found by the octopus (only when it was flagged at laying, see below)
    if (e.risk && !e.guard && !(e.cared ?? []).length && now >= (e.laid ?? e.hatchAt) + 2 * DAY && now < e.hatchAt) { const o = t.fish.find((f) => f.species === 'octopus' && !f.dead && !f.away); if (o) { t.eggs.splice(t.eggs.indexOf(e), 1); ev.push({ journal: `${o.name} found the egg nobody was watching, and ate it.`, toast: `${o.name} ate the egg. Looking after the tank keeps eggs safe.` }); continue; } }
    eggGuard(t, e, ev, now);
    if (!e.eyes && e.laid && now - e.laid > 1.05 * DAY && now < e.hatchAt) { e.eyes = true; const M = t.fish.find((x) => x.id === e.a) ?? e.pa; ev.push({ journal: `Tiny eyes have appeared in ${M?.name ? `${M.name}'s` : 'the'} eggs.` }); }      // a little look at the eggs on their second day
    if (e.hatchAt > now) continue;
    if (!e.ready) { e.ready = e.hatchAt; e.by = wakeAt(t, e.ready + EGG_WAIT); const nmA = t.fish.find((x) => x.id === e.a)?.name ?? e.pa?.name, nmB = t.fish.find((x) => x.id === e.b)?.name ?? e.pb?.name;
      ev.push({ journal: eggCareOf(e).mode === 'den' ? `${nmA ?? 'The mother'} is blowing water over her eggs, and tiny shapes are moving inside them. They are ready to hatch.` : `${nmA && nmB ? `${nmA} and ${nmB}'s eggs` : 'The eggs'} are wriggling. They are ready to hatch.`, toast: 'The eggs are ready to hatch! Stay and watch.', eggReady: e.id, jat: e.ready }); }
    if (!e.watch && now < e.by) continue;      // ready: they hatch while someone is watching (or, failing that, by the next morning)
    t.eggs.splice(t.eggs.indexOf(e), 1);
    const { f, A, B, h, gen } = makeChild(t, e, now); morphBorn(t, f, now, ev); bump(t, 'hatched'); if (e.watch) bump(t, 'watchedHatch'); if (gen >= 2) bump(t, 'gen2'); if (e.species === 'octopus') bump(t, 'octoHatch');
    f.hatched = now; const loved = (e.cared ?? []).length >= 2; if (loved) { f.happy = 1; f.born -= 8 * HOUR; f.loved = true; ev.push({ journal: `${f.name} hatched strong, from an egg that was well looked after.` }); }      // an egg looked after on two or more days hatches strong: a head start in growing (still a baby), and as happy as can be
    const md = eggCareOf(e).mode, G = t.fish.find((x) => x.id === e.guard && !x.dead);
    for (const o of t.fish) if (o.brood === e.id) { delete o.brood; if (isOcto(o)) { o.restUntil = now + 2 * DAY; ev.push({ journal: `${o.name} is worn out after guarding her eggs for days. She is resting in her den.`, story: o.id, text: 'Worn out after guarding her eggs; resting in her den.', jat: now + 60e3 }); } }      // (her watch is over; an octopus mother rests a while)
    const how = md === 'den' ? `${G?.name ?? 'The mother'}'s eggs hatched. Tiny octopuses jetted out of the den in a little cloud, and most drifted up and away on the current; one stayed close to ${G?.name ?? 'the den'}: meet ${f.name}` : md === 'mouth' && G ? `${G.name} opened his mouth and the little ones swam out. Most drifted off on the current, as larvae do; one stayed: meet ${f.name}` : md === 'guard' ? `The eggs hatched. A little cloud of larvae rose from them and most drifted off on the current; one stayed by ${G ? G.name : 'the rocks'}: meet ${f.name}` : `The drifting eggs hatched. Most of the tiny larvae floated away; one little one stayed: meet ${f.name}`;
    const fry = 5 + (h % 4), room = t.fish.length + pending(t) < capacity(t.level) + BIRTH_ROOM, watched = !!e.watch;
    ev.push({ journal: A && B ? `${how}, child of ${A.name} and ${B.name}.` : `${how}.`, toast: `The eggs hatched! Meet ${f.name}.`, arrival: [f.id], hatch: { egg: e.id, fish: f.id, fry, mode: md, watched } });
    if (watched) witness(t, md === 'den' ? 'octohatch' : 'hatch', f, now, ev, e.watchBy ?? null, A && B ? `${how}, child of ${A.name} and ${B.name}.` : `${how}.`);
    if (watched && room) { t.fryOffer = { id: 'fo' + e.id, egg: { ...e, hatchAt: e.hatchAt + 7e3 }, at: now, until: now + FRY_KEEP, first: f.id }; ev.push({ fryOffer: t.fryOffer.id }); }      // you were there: one more is still by the eggs, for a little while
    if (A && B && [e.a, e.b].every((id) => t.fish.some((x) => x.id === id && !x.dead))) ev.push({ journal: `${A.name} and ${B.name} came over to meet ${f.name}.` });
    if (!t.flags.firstHatch) { t.flags.firstHatch = { at: now, fish: f.id, parents: [A?.id ?? null, B?.id ?? null] }; t.shells += FIRST_HATCH_REWARD; ev.push({ toast: `Your first baby fish hatched. +${FIRST_HATCH_REWARD} shells`, milestone: f.id }); }
    if (gen > (t.flags.topGen ?? 0)) { t.flags.topGen = gen; ev.push({ journal: gen === 1 ? 'The first generation hatched in this tank.' : `A ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][gen] ?? gen + 'th'} generation has hatched in this tank.` }); }
  }
  if (now < t.eggAt) return; t.eggAt = now + (16 + (hash32(now / 6e4) % 12)) * HOUR;
  const busy = t.eggs.length > 0;      // one clutch of fish eggs at a time, so each one is an event (an octopus's eggs hang in her own den, so they are not kept waiting by the fish)
  if (t.fish.length + pending(t) + t.eggs.length >= capacity(t.level) + BIRTH_ROOM) return;
  // two octopus partners, settled for a while, both well fed: now and then the mother lays her eggs in her den and stays with them
  { const os = t.fish.filter((f) => isOcto(f) && !f.dead && !f.away && f.partner && stageOf(f, now) === 'adult'), Mo = !t.eggs.some((e) => e.species === 'octopus') && os.find((f) => sexOf(f) === 'f' && f.home && t.decor.some((d) => d.id === f.home) && now - (f.partneredAt ?? now) >= OCTO_EGG_AFTER * DAY && now >= (f.broodAt ?? 0)), Fa = Mo && os.find((f) => f.id === Mo.partner && sexOf(f) === 'm');
    const fed = (f) => ownHunger(f) < 0.5 || now - (f.fedAt ?? 0) < DAY;      /* (well fed: fed today, not full at this very minute) */
    if (Mo && Fa && fed(Mo) && fed(Fa) && (Mo.health ?? 1) >= 0.8 && !Mo.puzzle && !Mo.seek && hash32(now / 6e4 + 11) % 3 === 0) {
      Mo.broodAt = now + OCTO_EGG_GAP * DAY;
      t.eggs.push({ id: nextId(t, 'e'), moon: skyOf(now).event?.key === 'fullmoon' || undefined, species: 'octopus', a: Mo.id, b: Fa.id, seed: Mo.seed, pa: snap(Mo), pb: snap(Fa), laid: now, hatchAt: wakeAt(t, now + OCTO_EGG_DAYS * DAY), cared: [], guard: Mo.id, den: Mo.home }); Mo.brood = t.eggs.at(-1).id; bump(t, 'octoEggs');      /* (she stays: no adventures while she broods) */
      unlock(t, Mo, 'parent', now, ev); unlock(t, Fa, 'parent', now, ev); t.eggAt = now + (OCTO_EGG_DAYS + 3) * DAY;
      ev.push({ journal: `${Mo.name} has hung strings of tiny eggs from the roof of her den. She will guard them and hardly leave until they hatch.`, egg: true, story: Mo.id, text: 'Laid her eggs in her den, and guards them.' }); return; } }
  if (busy) return;
  const adults = t.fish.filter((f) => !f.dead && stageOf(f, now) === 'adult' && !SPECIES_DEF[f.species].school && f.species !== 'seahorse' && f.species !== 'octopus'), by = {};      // (seahorses do not lay eggs: the male carries the young, see seaFamilies)
  for (const f of adults) (by[f.species] ||= []).push(f);
  const pairs = Object.values(by).filter((g) => g.some((f) => sexOf(f) === 'm') && g.some((f) => sexOf(f) === 'f')); if (!pairs.length) return;      // a father and a mother
  const Mt = t.match && now < t.match.until ? [t.match.a, t.match.b].map((id) => adults.find((f) => f.id === id)) : [], set = Mt[0] && Mt[1];      // the pair you brought together, if they are still here and grown
  const g = pairs[hash32(now / 6e4) % pairs.length], A = set ? Mt[0] : g[0], B = set ? Mt[1] : g.find((f) => sexOf(f) !== sexOf(A)), [Mo, Fa] = sexOf(A) === 'f' ? [A, B] : [B, A], C = EGG_CARE[A.species] ?? EGG_CARE.goldfish;
  t.eggs.push({ id: nextId(t, 'e'), moon: skyOf(now).event?.key === 'fullmoon' || undefined, species: A.species, a: A.id, b: B.id, seed: A.seed, pa: snap(A), pb: snap(B), laid: now, hatchAt: wakeAt(t, now + EGG_DAYS * DAY), cared: [], guard: C.mode === 'drift' ? null : Fa.id, risk: C.mode !== 'mouth' && t.fish.some((f) => f.species === 'octopus' && !f.dead) && hash32(now / 6e4 + 7) % 40 === 0 });      /* (and only while no parent is guarding it, see eggs()) */ t.eggAt = now + (EGG_DAYS + 2 + (hash32(now / 6e4 + 3) % 3)) * DAY; unlock(t, A, 'parent', now, ev); unlock(t, B, 'parent', now, ev);
  const say = C.mode === 'mouth' ? { journal: `${Mo.name} laid eggs and ${Fa.name} took them into his mouth. He will carry them, eating nothing, until they hatch.` }
    : C.mode === 'drift' ? { journal: `${A.name} and ${B.name} rose together and let their eggs go, as their kind do. The eggs drift by the plants now.` }
    : { journal: `${Mo.name} laid a patch of eggs by the ${C.on === 'plant' ? 'seaweed' : 'rocks'}, and ${Fa.name} is guarding them.` };
  ev.push({ ...say, egg: true });
}
// ── Seahorse families ── pairs form slowly between a male and a female that share the tank as adults (never parent and child, never brother
// and sister); now and then a settled pair courts at dawn and the male carries their young in his brood pouch for six to nine days; he gives
// birth (on the server's clock, whether or not anyone is watching) and the babies grow up in the tank for five days; then the caretakers
// choose one to stay, and the others swim off to new homes. All of it lives in the tank record, so every phone shows the same.
export const SEA = { PAIR_DAYS: 2, COURT_AFTER: 1, PREG_MIN: 6, PREG_MAX: 9, NURSERY: 5, COOLDOWN: 14 };
export const sexOf = (f) => f?.sex ?? ((hash32((f?.seed ?? 0) * 31 + 7) & 1) ? 'm' : 'f');
export const relatedFish = (a, b) => { const pa = (a.parents ?? []).map((p) => p.id), pb = (b.parents ?? []).map((p) => p.id); return pa.includes(b.id) || pb.includes(a.id) || pa.some((id) => pb.includes(id)); };
// how full a male's brood pouch is now (0 to 1): it fills through his pregnancy, and after the birth goes back down over two days
export const broodOf = (f, now = Date.now()) => f?.preg ? Math.max(0, Math.min(1, (now - f.preg.start) / Math.max(1, f.preg.due - f.preg.start))) : Number.isFinite(f?.lastBirth) ? Math.max(0, 0.7 * (1 - (now - f.lastBirth) / (2 * DAY))) : 0;
// the three tracked babies: one roams the tank, one keeps to the plants, one stays close to its family
export const BABY_ROLES = ['explore', 'plants', 'social'], ROLE_TRAIT = { explore: 'Curious', plants: 'Calm', social: 'Social' };
export const babyRole = (N, c) => c?.role ?? BABY_ROLES[Math.max(0, N?.cands?.indexOf(c) ?? 0) % 3];
export const nurseryReady = (t, now = Date.now()) => !!t.nursery && now >= t.nursery.readyAt;
// a courtship that takes: he carries their young for six to nine days (the length comes from h, a number of the moment)
function conceive(m, w, now, h, ev, t = null) {
  const days = SEA.PREG_MIN + ((h >>> 8) % 1000) / 1000 * (SEA.PREG_MAX - SEA.PREG_MIN);
  m.preg = { start: now, due: t ? wakeAt(t, Math.round(now + days * DAY)) : Math.round(now + days * DAY), mother: w.id, ma: snap(w), seed: h, n: 10 + ((h >>> 4) % 6) };
  ev.push({ journal: `${m.name} and ${w.name} courted at dawn, circling with their tails linked. ${m.name} is carrying their young.`, court: m.id });      /* (told with its own card, on every phone: see lifeCheck in main.js) */
}
// where a tank's seahorse family is now, for the developer's lifecycle test panel (read only)
export function seaStage(t, now = Date.now()) {
  const hs = (t.fish ?? []).filter((f) => f.species === 'seahorse' && !f.dead), m = hs.find((f) => f.preg) ?? hs.find((f) => sexOf(f) === 'm' && f.mate && hs.some((x) => x.id === f.mate)), w = m && hs.find((x) => x.id === (m.preg?.mother ?? m.mate));
  const N = t.nursery, out = { male: m?.name ?? null, female: w?.name ?? null, kept: t.lastDepart?.kept ? hs.find((f) => f.id === t.lastDepart.kept)?.name ?? null : null };
  if (N) { const day = Math.min(SEA.NURSERY, Math.floor((now - N.born) / DAY) + 1); return { ...out, stage: now >= N.readyAt ? 'ready' : 'nursery', nurseryDay: day, fed: N.fed ?? 0, babies: N.cands.map((c) => c.name), father: N.pa?.name ?? null }; }
  if (m?.preg) { const P = m.preg; return { ...out, stage: 'pregnant', pregDay: Math.floor((now - P.start) / DAY) + 1, pregDays: Math.round((P.due - P.start) / DAY) }; }
  if (m) return { ...out, stage: 'paired' };
  return { ...out, stage: 'none' };
}
// The developer's lifecycle test. It runs only on a test aquarium (the server allows it nowhere else) and never changes a duration or the
// clock: it creates a pair, starts a pregnancy the way a courtship does, or moves this one family's own timestamps forward, and then the
// game's rules (seaFamilies, through advance) do what they always do: the pairing, the birth, the nursery, the moment they are ready.
const DEV_SEA = new Set(['pair', 'pregnant', 'preg3', 'preg6', 'birth', 'nurs2', 'nurs4', 'ready']);
function devSea(t, op, now, ev) {
  if (!DEV_SEA.has(op)) return 'BAD_STEP';
  const hs = () => t.fish.filter((f) => f.species === 'seahorse' && !f.dead), st = seaStage(t, now), fam = () => { const m = hs().find((f) => f.preg) ?? hs().find((f) => sexOf(f) === 'm' && f.mate); return { m, w: m && hs().find((x) => x.id === (m.preg?.mother ?? m.mate)) }; };
  const shift = (d, ...objs) => { for (const [o, ...ks] of objs) for (const k of ks) if (Number.isFinite(o?.[k])) o[k] += d; };
  if (op === 'pair') {
    if (st.stage !== 'none') return 'NOT_NOW';
    const free = (sx) => hs().find((f) => sexOf(f) === sx && !f.mate && stageOf(f, now) === 'adult');
    let m = free('m'), w = free('f');
    if (w && m && relatedFish(m, w)) w = null;
    if (t.fish.length + (m ? 0 : 1) + (w ? 0 : 1) > capacity(t.level)) return 'TANK_FULL';
    const add = (sx, name, seed) => { const f = ensureFish({ id: nextId(t, 'f'), name, species: 'seahorse', seed, born: now - 40 * DAY, stage: 'adult', traits: traitsFor('seahorse', seed), sex: sx, happy: 0.85, paid: 0, owner: null }); t.fish.push(f); return f; };
    m ||= add('m', NAMES.find((n) => n === 'Sunny' && !t.fish.some((f) => f.name === n)) ?? 'Coral', 104); w ||= add('f', NAMES.find((n) => n === 'Pearl' && !t.fish.some((f) => f.name === n)) ?? 'Shell', 211);
    m.sex = 'm'; w.sex = 'f'; t.bonds ||= {}; t.bonds[m.id + '|' + w.id] = SEA.PAIR_DAYS * DAY; t.pairAt = 0; t.pairLast = now;      // they have shared the tank long enough: the pairing itself is the game's
    ev.push(...advance(t, now)); return fam().m?.mate ? null : 'NOT_NOW';
  }
  const { m, w } = fam();
  if (op === 'pregnant') {
    if (st.stage !== 'paired' || !m || !w) return 'NOT_NOW';
    m.breedAt = 0; m.pairedAt = Math.min(m.pairedAt ?? now, now - SEA.COURT_AFTER * DAY); conceive(m, w, now, hash32(Math.floor(now / 6e4) * 13 + (m.seed ?? 1)), ev, t); return null;
  }
  if (op === 'preg3' || op === 'preg6' || op === 'birth') {
    if (st.stage !== 'pregnant') return 'NOT_NOW';
    const P = m.preg, total = P.due - P.start, want = op === 'birth' ? total + 1000 : ((op === 'preg3' ? 3 : 6) - 1) * DAY + HOUR, have = now - P.start;      // how far into it he should be, and is
    if (have >= want || (op !== 'birth' && want >= total)) return 'NOT_NOW';      // only forward, and a day never past the birth
    shift(have - want, [P, 'start', 'due']); if (op === 'birth') P.watch = now; ev.push(...advance(t, now)); return null;
  }
  const N = t.nursery; if (!N || st.stage !== 'nursery') return 'NOT_NOW';
  const want = op === 'ready' ? N.readyAt - N.born + 1000 : ((op === 'nurs2' ? 2 : 4) - 1) * DAY + HOUR, have = now - N.born;
  if (have >= want) return 'NOT_NOW';
  const dad = t.fish.find((f) => f.id === N.father); shift(have - want, [N, 'born', 'readyAt'], [dad, 'lastBirth', 'breedAt']); ev.push(...advance(t, now)); return null;
}
// one key per two seahorses getting to know each other: male first for a male and a female (as before), else in id order
export const bondKey = (x, y) => (x.sex !== y.sex ? (x.sex === 'm' ? [x, y] : [y, x]) : [x, y].sort((a, b) => (a.id < b.id ? -1 : 1))).map((f) => f.id).join('|');
// ── Two octopuses ── solitary by nature, but two that share a tank long enough, and are never fed short, stop sizing each other up: they touch arms
// (octopuses taste with their suckers, so this is how they get to know one another), take turns resting in each other's den, and become partners.
// Any two, whatever their sex: no mating, no eggs, just company. A hungry one stays wary, so a neglected pair takes longer.
export const OCTO_PAIR_DAYS = 3;
function octoPartners(t, now, ev) {
  const os = t.fish.filter((f) => f.species === 'octopus' && !f.dead), byId = new Map(os.map((f) => [f.id, f]));
  for (const f of os) if (f.partner && !byId.has(f.partner)) { const gone = (t.memorial ?? []).find((m) => m.id === f.partner)?.name ?? 'its partner'; delete f.partner; delete f.partneredAt; const line = `${f.name} keeps checking the den where ${gone} used to rest.`; ev.push({ journal: line, story: f.id, text: line }); }
  if (now < (t.octoBondAt ?? 0)) return; const step = Math.max(0, Math.min(now - (t.octoBondLast ?? now), 2 * DAY)); t.octoBondLast = now; t.octoBondAt = now + 3 * HOUR; t.octoBonds ||= {};
  const free = os.filter((f) => !f.partner && !f.away && stageOf(f, now) === 'adult');
  for (const k of Object.keys(t.octoBonds)) { const [a, b] = k.split('|'), still = (id) => free.some((f) => f.id === id) || os.some((f) => f.id === id && f.away && !f.partner); if (!still(a) || !still(b)) delete t.octoBonds[k]; }      // (one of them out on an adventure: the bond waits, it is not lost)
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) { const x = free[i], y = free[j], k = [x.id, y.id].sort().join('|'), calm = (Math.min(x.happy ?? 0.7, y.happy ?? 0.7) > 0.45 ? 1 : 0.4) * (layoutOf(t).dens >= 2 ? 1.5 : 1);      /* (a den each: they settle faster) */ t.octoBonds[k] = (t.octoBonds[k] ?? 0) + step * calm; }
  for (const [k, ms] of Object.entries(t.octoBonds).sort((p, q) => q[1] - p[1])) { if (ms < OCTO_PAIR_DAYS * DAY) continue; const [a, b] = k.split('|'), x = byId.get(a), y = byId.get(b); if (!x || !y || x.partner || y.partner) continue;
    x.partner = y.id; y.partner = x.id; x.partneredAt = y.partneredAt = now; delete t.octoBonds[k];
    const line = `${x.name} and ${y.name} have stopped sizing each other up. They touch arms now, and take turns resting in each other's den.`; ev.push({ journal: line, toast: `${x.name} and ${y.name} are partners now.` }, { story: x.id, text: `Became partners with ${y.name}.` }, { story: y.id, text: `Became partners with ${x.name}.` }); }
}
function seaFamilies(t, now, ev) {
  const hs = t.fish.filter((f) => f.species === 'seahorse' && !f.dead), byId = new Map(hs.map((f) => [f.id, f])), adult = (f) => stageOf(f, now) === 'adult';
  for (const f of hs) { if (!f.sex) f.sex = sexOf(f); if (f.mate && !byId.has(f.mate)) {      // a partner that has left: seahorses pair for life, so the one left behind grieves a while before it could pair again
    const gone = (t.memorial ?? []).find((m) => m.id === f.mate)?.name ?? t.lastDepart?.name ?? 'its partner'; delete f.mate; delete f.pairedAt; f.widowAt = now; f.happy = Math.max(0.3, (f.happy ?? 0.7) - 0.2);
    const line = `${f.name} misses ${gone}. They were a pair.`; ev.push({ journal: line, toast: line, story: f.id, text: line }); } }
  // pairing: the time each male and female have spent in the tank together as adults adds up; after a couple of days they pair
  if (now >= (t.pairAt ?? 0)) {
    const step = Math.max(0, Math.min(now - (t.pairLast ?? now), 2 * DAY)); t.pairLast = now; t.pairAt = now + 3 * HOUR; t.bonds ||= {};      // (a long absence counts for at most two days)
    for (const k of Object.keys(t.bonds)) { const [a, b] = k.split('|'); if (!byId.has(a) || !byId.has(b) || byId.get(a).mate || byId.get(b).mate) delete t.bonds[k]; }
    const ready = (f) => !f.mate && adult(f) && !f.elder && (f.widowAt == null || now - f.widowAt > 7 * DAY), free = hs.filter(ready);      // (not while grieving, and elders do not start again)
    // any two unrelated adults get to know each other: a male and a female become a pair; two males or two females, short of a partner, can bond as companions (as kept seahorses really do)
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) { const x = free[i], y = free[j]; if (relatedFish(x, y)) continue; const k = bondKey(x, y); t.bonds[k] = (t.bonds[k] ?? 0) + step; }
    for (const [k, ms] of Object.entries(t.bonds).sort((x, y) => y[1] - x[1])) {
      if (ms < SEA.PAIR_DAYS * DAY) continue; const [a, b] = k.split('|'), m = byId.get(a), w = byId.get(b); if (!m || !w || m.mate || w.mate) continue;
      m.mate = w.id; w.mate = m.id; m.pairedAt = w.pairedAt = now; delete t.bonds[k]; unlock(t, m, 'pair', now, ev); unlock(t, w, 'pair', now, ev);
      if (m.sex === w.sex) ev.push({ journal: `${m.name} and ${w.name} have bonded as companions. They greet each other every morning, though they will not have babies.`, toast: `${m.name} and ${w.name} are companions now.` });
      else ev.push({ journal: `${m.name} and ${w.name} have paired up. Seahorses pair for life.`, toast: `${m.name} and ${w.name} are a pair now.`, pair: m.id });
    }
  }
  // the morning dance: once a day, in the journal and in both their stories (a pair, or two companions)
  { const d = Math.floor(now / DAY); if (t.dawnDay !== d && new Date(now).getHours() >= 6) { t.dawnDay = d; const seen = new Set();
    for (const f of hs) { const o = byId.get(f.mate); if (!o || seen.has(f.id) || f.dead || o.dead) continue; seen.add(o.id); const line = `${f.name} and ${o.name} danced at sunrise, tails linked.`; ev.push({ journal: line, story: f.id, text: line }, { story: o.id, text: line }); } } }
  // courtship and pregnancy: a settled pair, now and then, when no other family is under way and his cooldown is over
  if (now >= (t.courtAt ?? 0)) {
    t.courtAt = now + 6 * HOUR;
    if (!t.nursery && !hs.some((f) => f.preg)) for (const m of hs) {
      const w = byId.get(m.mate); if (m.sex !== 'm' || !w || w.sex !== 'f' || !adult(m) || !adult(w) || m.elder || w.elder || now < (m.breedAt ?? 0) || now - (m.pairedAt ?? now) < SEA.COURT_AFTER * DAY) continue;
      const h = hash32(Math.floor(now / 6e4) * 13 + (m.seed ?? 1)); if (h % 100 >= 15) continue;      // a small chance at each look (every six hours): courtship is not every day
      conceive(m, w, now, h, ev, t); break;
    }
  }
  // birth: on the day it is due, whether or not anyone is watching. The pregnancy ends here in the same change, so it happens once.
  for (const m of hs) {
    if (!m.preg || now < m.preg.due) continue;
    if (!m.preg.ready) { m.preg.ready = m.preg.due; m.preg.by = wakeAt(t, m.preg.due + EGG_WAIT); ev.push({ journal: `${m.name}'s pouch is twitching. The babies are coming.`, toast: `${m.name} is about to give birth! Stay and watch.`, birthReady: m.id, jat: m.preg.due }); }
    if (!m.preg.watch && now < m.preg.by) continue;      // like eggs: born while someone is watching (or by the next morning)
    const P = m.preg, born = Math.min(now, P.watch ?? P.by), w = byId.get(P.mother), ma = w ? snap(w) : P.ma, pa = snap(m), fam = nextId(t, 'n');
    m.preg = null; m.lastBirth = born; m.breedAt = born + SEA.COOLDOWN * DAY; m.births = (m.births ?? 0) + 1; if (w) w.births = (w.births ?? 0) + 1;
    const taken = new Set(t.fish.map((f) => f.name)), names = NAMES.filter((n) => !taken.has(n)), cands = [];
    for (let i = 0; i < 3; i++) { const h = hash32(P.seed + i * 7919), pick = (p, k) => (p?.traits?.length ? p.traits[(h >> k) % p.traits.length] : null), traits = [...new Set([pick(ma, 1), pick(pa, 3)].filter(Boolean))];
      const role = BABY_ROLES[i], tr = [ROLE_TRAIT[role], ...(traits.length ? traits : traitsFor('seahorse', h % 90000)).filter((x) => x !== ROLE_TRAIT[role])].slice(0, 2);      // each of the three is its own little character, and its first trait is the one it shows
      let k = (h + i) % Math.max(1, names.length); while (names.length > cands.length && cands.some((c) => c.name === names[k])) k = (k + 1) % names.length;      // three different names
      cands.push({ id: nextId(t, 'f'), name: names[k] ?? NAMES[(h + i) % NAMES.length], seed: h % 90000, role, traits: tr, genes: ma && pa ? blendGenes(gOf(ma), gOf(pa), seededRandom(h)) : genesOf(h % 90000), sex: i === 0 ? 'm' : i === 1 ? 'f' : (h & 1 ? 'm' : 'f') }); }
    t.nursery = { id: fam, father: m.id, mother: P.mother, pa, ma, born, readyAt: wakeAt(t, born + SEA.NURSERY * DAY), n: P.n, gen: Math.max(pa.gen ?? 0, ma?.gen ?? 0) + 1, cands };
    if (P.watch) witness(t, 'seabirth', m, now, ev, null, `${m.name} gave birth to ${P.n} tiny seahorses.${ma ? ` ${ma.name} is their mother.` : ''} They will grow up here in the tank for five days.`);
    ev.push({ journal: `${m.name} gave birth to ${P.n} tiny seahorses.${ma ? ` ${ma.name} is their mother.` : ''} They will grow up here in the tank for five days.`, toast: `${m.name} gave birth! ${P.n} tiny seahorses.`, birth: m.id });
  }
  // each nursery day, one baby's line in the journal, in turn: what its own way of living (roaming, the plants, staying near family) had it
  // do in this tank, with the tank's real plants and parents, so the choice at the end is between three babies the caretakers have come to know
  if (t.nursery && now < t.nursery.readyAt) { const N = t.nursery, day = Math.floor((now - N.born) / DAY);
    if (day >= 1 && day > (N.told ?? 0) && N.cands?.length) { N.told = day; const c = N.cands[(day - 1) % N.cands.length], role = babyRole(N, c), h = hash32((N.born % 1e9) + day * 131 + c.seed),
        plants = t.decor.filter((d) => DECOR_DEF[d.type]?.cat === 'PLANTS').map((d) => (DECOR_DEF[d.type]?.label ?? 'plant').toLowerCase()), plant = plants.length ? plants[h % plants.length] : 'sea grass',
        dad = N.pa?.name ?? 'its father', mom = N.ma?.name, other = t.fish.find((f) => !f.dead && !f.nursery && f.id !== N.father && f.id !== N.mother && f.species !== 'seahorse')?.name;
      const lines = { explore: [`Nursery, day ${day}: ${c.name} swam the whole length of the tank today, all on its own.`, `Nursery, day ${day}: ${c.name} came right up to the glass to look out at you.`, other ? `Nursery, day ${day}: ${c.name} followed ${other} halfway across the tank before turning back.` : `Nursery, day ${day}: ${c.name} found the far corner of the tank and liked it there.`],
        plants: [`Nursery, day ${day}: ${c.name} has found the ${plant} and holds on to it with its tiny tail for hours.`, `Nursery, day ${day}: ${c.name} spent the day tucked in the ${plant}, snapping up whatever drifted past.`, `Nursery, day ${day}: ${c.name} tried a new stem today, then went back to the ${plant}.`],
        social: [`Nursery, day ${day}: ${c.name} never strayed far from ${dad} today.`, mom ? `Nursery, day ${day}: ${c.name} kept close to ${mom}, copying the way she sways.` : `Nursery, day ${day}: ${c.name} stayed with its brothers and sisters all day.`, `Nursery, day ${day}: ${c.name} swims to ${dad} whenever something new happens in the tank.`] }[role] ?? [];
      if (lines.length) ev.push({ journal: lines[h % lines.length], nurseryDay: day }); } }
  // the babies are ready (said once); the choice itself is a caretaker's (keepBaby)
  if (t.nursery && now >= t.nursery.readyAt && !t.nursery.said) { t.nursery.said = true; ev.push({ journal: 'The baby seahorses are ready to leave the nursery. One can stay in the tank.', toast: "They're ready! Choose one baby seahorse to stay.", ready: true }); }
  if (t.nursery && !byId.has(t.nursery.father) && !t.nursery.pa) t.nursery = null;      // (a damaged record)
}
const STORY = {
  Shy: (f, t) => (t.decor.length ? `${f.name} spent a while tucked in behind the plants.` : null),
  Brave: (f) => `${f.name} swam right up to the glass to look at you.`,
  Curious: (f, t) => { const d = t.decor[hash32(f.seed + t.seq) % Math.max(1, t.decor.length)]; return d ? `${f.name} went to inspect the ${DECOR_DEF[d.type].label.toLowerCase()}.` : `${f.name} nosed around the tank.`; },
  Social: (f, t) => { const o = t.fish.find((x) => x.id !== f.id); return o ? `${f.name} and ${o.name} swam together for a while.` : null; },
  Playful: (f) => `${f.name} chased bubbles for ages.`,
  Lazy: (f) => `${f.name} napped low on the sand.`,
  Calm: (f) => `${f.name} drifted around without a care.`,
  Greedy: (f) => `${f.name} waited near the surface, just in case.`,
};
// ── fish wishes ──
// One fish at a time quietly wants something that fits its personality. Granting it pays a little, cheers the fish, and is written to the journal.
// A wish is only offered if it can be granted now, never expires with a penalty (it just fades after a day), and a new one waits a few hours.
export const WANT_REWARD = 4, WANT_GAP = 18 * 3600e3, WANT_TTL = 24 * 3600e3;
const catOpen = (t, cat) => Object.values(DECOR_DEF).some((d) => d.cat === cat && d.level <= t.level && d.price > 0);
const likeWant = (trait, cat, n, text, gift) => ({ traits: [trait], ok: (t) => count(t, cat) < n && catOpen(t, cat), done: (t) => count(t, cat) >= n, text, gift });
export const WANTS = {
  den: { octopus: true, traits: [], ok: (t) => !t.decor.some((d) => ['pot', 'coconut'].includes(d.type)), done: (t) => t.decor.some((d) => ['pot', 'coconut'].includes(d.type)), text: (f) => `${f.name} wants a den to curl up in: a clay pot or a coconut shell.`, gift: 'a den to curl up in' },
  crab: { octopus: true, traits: [], ok: (t, f) => stageOf(f) !== 'baby' && (f.crabAt == null || Date.now() - f.crabAt > 3 * 3600e3) && octoHunger(f) > 0.3, done: (t, f, g) => g?.type === 'crab' && g.id === f.id, text: (f) => `${f.name} is hungry for a crab. Its caretaker can drop one from Feed.`, gift: 'a crab' },
  hide: likeWant('Shy', 'PLANTS', 4, (f) => `${f.name} wants more plants to hide among (4 in all).`, 'plants to hide among'),
  explore: likeWant('Curious', 'STRUCTURES', 1, (f) => `${f.name} wants something to explore, like a pillar, lantern or arch.`, 'something to explore'),
  rest: likeWant('Lazy', 'WOOD', 1, (f) => `${f.name} wants driftwood to rest beside.`, 'driftwood to rest beside'),
  fun: likeWant('Playful', 'SPECIAL', 1, (f) => `${f.name} wants something fun to play with, like a bubbler.`, 'something fun to play with'),
  perch: likeWant('Brave', 'ROCKS', 2, (f) => `${f.name} wants a couple of rocks to perch on.`, 'rocks to perch on'),
  company: { traits: ['Social'], ok: (t) => t.fish.length < 4 && t.fish.length + pending(t) < capacity(t.level) - 1 && t.fish.length + pending(t) < 4, done: (t) => t.fish.length >= 4, text: (f) => `${f.name} wants more company (4 fish in all).`, gift: 'more company' },
  play: { traits: ['Playful', 'Social', 'Curious', 'Brave'], ok: () => true, done: (t, f, g) => g?.type === 'pet' && g.id === f.id, text: (f) => `${f.name} wants to play. Open its card and play with it.`, gift: 'a game' },
  view: { traits: ['Brave'], ok: (t) => t.glass > 0.3, done: (t, f, g) => g?.type === 'glass', text: (f) => `${f.name} wants a clear view of you. Wipe the glass.`, gift: 'a clear view' },
  fresh: { traits: ['Calm', 'Shy'], ok: (t) => t.water < 0.7, done: (t, f, g) => g?.type === 'water', text: (f) => `${f.name} would love fresher water.`, gift: 'fresher water' },
  meal: { traits: ['Greedy'], ok: (t) => t.hunger > 0.3 && t.shells >= FOODS.treats.price, done: (t, f, g) => g?.type === 'feed' && g.food === 'treats', text: (f) => `${f.name} wants a treat. Choose Treats when you feed.`, gift: 'a treat' },
};
// ── one request a day ──
// Each tank-day has exactly one request: a fish's own wish whenever one can be granted, and only failing that the tank's general daily wish. Never both, so there is one thing to look at.
const wantCands = (t, now) => { const cand = []; if (t.flags.noWants) return cand; for (const f of t.fish) { if (now - f.born < 3600e3 || (f.ail ?? 0) >= AIL_TIRED) continue; for (const [k, w] of Object.entries(WANTS)) { const oct = f.species === 'octopus'; if (oct ? !w.octopus : w.octopus) continue; if ((oct || w.traits.some((x) => (f.traits ?? []).includes(x))) && w.ok(t, f)) cand.push([f, k]); } } return cand; };
export function requestKind(t, now) {
  const day = Math.floor(now / DAY);
  if (!t.req || t.req.day !== day) { t.req = { day, kind: null, wantDone: false }; t.wantAt = Math.min(t.wantAt ?? now, now); }
  if (!t.req.kind) t.req.kind = t.daily && t.daily.day === day ? 'daily' : wantCands(t, now).length ? 'want' : 'daily';
  return t.req.kind;
}
function rollWant(t, now, ev) {
  if (t.want && (Math.floor(t.want.since / DAY) !== Math.floor(now / DAY) || now - t.want.since > WANT_TTL)) { t.want = null; t.wantAt = now; }          // it fades quietly at the end of the day
  if (t.want || (t.flags.tut ?? 0) < 5 || now < (t.wantAt ?? 0)) return;
  if (requestKind(t, now) !== 'want' || t.req.wantDone) return;
  const cand = wantCands(t, now); if (!cand.length) { t.req.kind = 'daily'; return; }
  const [f, kind] = cand[hash32(Math.floor(now / 6e4) * 13 + (t.seq ?? 0)) % cand.length], seq = (t.seq = (t.seq ?? 10) + 1);
  t.want = { id: 'w' + seq, fish: f.id, kind, text: WANTS[kind].text(f), since: now };
  ev.push({ journal: `${f.name} has a request: see the Care tab.`, want: f.id });      /* (a request waits in Care and Today: no toast for it) */
}
// `grant` says what just happened ({ type: 'pet' | 'feed' | 'glass' | 'water', id }); wishes about the tank's contents are also checked on every change.
function checkWant(t, now, ev, grant = null) {
  const w = t.want; if (!w) return; const f = t.fish.find((x) => x.id === w.fish), d = WANTS[w.kind];
  if (!f || !d) { t.want = null; return; } if (!d.done(t, f, grant)) return;
  t.want = null; t.wantAt = now + WANT_GAP; if (t.req) t.req.wantDone = true; t.shells += WANT_REWARD; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.1); f.wishes = (f.wishes ?? 0) + 1;
  ev.push({ journal: `${f.name} got ${d.gift}, just as it had hoped.`, toast: `${f.name} is delighted. +${WANT_REWARD} shells`, wishDone: f.id }); dayCheck(t, now, ev);
}

// ── tricks: a fish that trusts you can be taught to do something with a decoration ──
export const TRICKS = { gate: { label: 'swim through the gate', types: ['arch', 'torii', 'wood', 'bridge'] }, bubbles: { label: 'ride the bubbles', types: ['bubbler'] } };
export const TRAIN_NEED = 5, TRAIN_GAP = 20 * 60e3, TRICK_REWARD = 3, TRICK_BOND = 3;
// The octopus is the clever one: it learns a trick in two lessons instead of five, remembers whoever looks after it, and can be given a puzzle jar
// with a crab inside. The first jar takes minutes to work out; every one after is quicker, down to seconds, because it remembers how.
export const isSmart = (f) => f?.species === 'octopus';
// An octopus can shift small things about: rocks, shells, a clay pot, a coconut shell. It can carry a coconut shell to a quiet corner and live under it.
// Only the small pieces move, only a little at a time, and each octopus does it at most once every 10 minutes. A tank can switch it off.
export const MOVABLE = ['rock', 'coconut', 'pot', 'skull'];
export const MOVE_GAP = 4 * 60e3, MOVE_MAX = 4.5;
// the moments an octopus's journal remembers, and how often each kind may be written in
// moments any animal can have, reported by the phone running the animals; each kind at most so often for each animal, so the journal stays special
export const MOMENTS = {
  ink: { gap: 8 * 3600e3, text: (n) => `${n} burst away in a cloud of ink!` },
  camo: { gap: 12 * 3600e3, text: (n) => `${n} matched the ground so well it seemed to vanish.` },
  glass: { gap: 12 * 3600e3, text: (n) => `${n} swam right up to the glass and looked in at you.` },
  eggchase: { gap: 4 * 3600e3, other: true, text: (n, o) => `${n} chased ${o} away from the eggs.` },
  ball: { gap: 12 * 3600e3, text: (n) => `${n} sent the ball spinning across the tank!` },
};
export const OCTO_MOMENTS = {
  squirt: { gap: 12 * 3600e3, text: (n) => `${n} squirted water at whoever was watching.` },
  arms: { gap: DAY, other: true, text: (n, o) => `${n} and ${o} sat side by side and touched arms for a while.` },
  chased: { gap: 12 * 3600e3, other: true, text: (n, o) => `${o} charged at ${n} and drove it away from the eggs.` },
  smack: { gap: 12 * 3600e3, other: true, text: (n, o) => `${n} smacked ${o} with an arm for coming too close.` },
  lion: { gap: 3 * DAY, text: (n) => `${n} put its arms out stiff and passed for a lionfish.` },
  jelly: { gap: 3 * DAY, text: (n) => `${n} puffed up and drifted about like a jellyfish.` },
  snake: { gap: 3 * DAY, text: (n) => `${n} hid in the sand with two striped arms out, like a sea snake.` },
  flat: { gap: 3 * DAY, text: (n) => `${n} lay flat as a sole and slid across the sand.` },
  kelp: { gap: 3 * DAY, text: (n) => `${n} stood among the plants with its arms up, pretending to be one.` },
  bury: { gap: 3 * DAY, text: (n) => `${n} dug itself into the sand until only its eyes showed.` },
  fish: { gap: 3 * DAY, other: true, text: (n, o) => `${n} took on ${o}'s colors and followed it about.` },
};
// ── The Field Guide ── the remarkable things the animals do, each one filled in the first time someone in the tank sees it happen (the phone
// reports it while the tank is open and being watched; nothing is filled in from a line written while everyone was away). Each page keeps who did
// it, when, and the line that was written, so the journal's photo of that very moment is its picture.
export const FIELD = {
  glass: { label: 'Face at the glass', who: 'any', hint: "Someone curious comes right up to the glass. Most likely when you have just opened the tank and stay a while." },
  camo: { label: 'Vanishing act', who: 'octopus', hint: "A resting octopus matches the ground so well it disappears. Look where it rests, on the sand or by the rocks." },
  ink: { label: 'Ink cloud', who: 'octopus', hint: "A startled octopus bursts away in a cloud of ink. Something sudden near it sets it off." },
  squirt: { label: 'Squirt!', who: 'octopus', hint: "An octopus that is being watched sometimes answers back. Stay and watch it for a while." },
  bury: { label: 'Buried to the eyes', who: 'octopus', hint: "An octopus digs into soft sand. Watch it out on the open sand floor." },
  flat: { label: 'Flatfish impression', who: 'octopus', hint: "An octopus lies flat and slides across the sand, out on the open floor." },
  kelp: { label: 'Pretending to be a plant', who: 'octopus', hint: "An octopus among the plants, arms up. Most often when it is calm and well fed, so look after a feed." },
  lion: { label: 'Lionfish impression', who: 'octopus', hint: "Arms out stiff, it passes for something dangerous. More likely when it has been startled." },
  jelly: { label: 'Jellyfish impression', who: 'octopus', hint: "Puffed up, drifting in open water. Rare: only when it feels safe and nobody is close by." },
  snake: { label: 'Sea snake impression', who: 'octopus', hint: "Hidden in the sand, two striped arms showing. More likely when it has been startled." },
  fish: { label: 'Copying a fish', who: 'octopus', hint: "An octopus takes on a fish's colors and tags along behind it. Easier with a fish it likes." },
  smack: { label: 'Too close!', who: 'octopus', hint: "An octopus smacks a fish that crowds it. A busy tank makes it likelier." },
  arms: { label: 'Touching arms', who: 'octopus', hint: "Two octopuses that are partners, resting close together." },
  ball: { label: 'Ball game', who: 'any', hint: "Something sends the ball spinning across the tank. Play with the ball from the Toy box." },
  eggchase: { label: 'Guarding the eggs', who: 'fish', hint: "A parent chases off anyone who comes near its eggs. Watch while eggs are waiting." },
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
  const who = FIELD[id].who; if (f && who !== 'any' && (who === 'fish' ? isOcto(f) || f.species === 'seahorse' : f.species !== who)) return false;      /* (a page is only filled by the kind of animal it is about) */
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
  const base = Object.keys(MYSTERY).filter((k) => !MYSTERY[k].chain && (!MYSTERY[k].ok || MYSTERY[k].ok(t))), fresh = base.filter((k) => k !== t.mystLast), kind = N ? N.kind : (fresh.length ? fresh : base)[h % (fresh.length || base.length)]; t.mystLast = kind;
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
    case 'glint': { const kp = octo && (t.keeps ?? []).find((k) => k.by === octo.id); if (r === 0 && kp) return { line: `It was the ${(KEEPSAKES[kp.k]?.label ?? 'keepsake').toLowerCase()} ${octo.name} brought back from its adventure, half buried in the sand. ${octo.name} came straight over to see.`, fish: octo }; }      /* (only a keepsake it really brought home: nothing is made up about it) */
      return r === 1 && any ? { line: `One of ${any.name}'s old scales, shining like a tiny coin.`, fish: any }
      : { line: 'A piece of blue sea glass, worn smooth by the sea.' };
    case 'tracks': return r === 0 && octo ? { line: `Arm prints, octopus-sized, cross the sand${homeOf(t, octo) ? ` and end at ${octo.name}'s den` : ''}. Someone was out walking while the tank slept.` }
      : r === 1 ? { line: 'A hermit crab passed through in the night and left by the far corner.' }
      : { line: `The tracks lead under the ${dl}, and stop. Keep an eye on it.`, next: 'tracks2' };
    case 'tracks2': return { line: `Under the ${dl}: a hermit crab has moved in, in a borrowed shell. It waved a claw at you.` };
    case 'eyes': return r === 2 ? { line: 'The eyes blinked and were gone. Something from the open sea is curious about the tank.', visit: true }
      : shy ? { line: `It was ${shy.name}, hiding in the plants to watch you.`, fish: shy } : { line: 'Only a shrimp, peering out. It hid again.' };
  }
  return { line: 'Whatever it was, it is gone.' };
}
// ── Decisions ── now and then (four to seven days apart, and only when the tank really has it) something needs you to choose: two animals fighting over a den, one that looks unwell, an octopus
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
  if (D0 && !D0.done && now >= D0.until) { const r = settleDilemma(t, D0, 'wait', D0.until, null); ev.push(...r.events); }      /* (settled at the moment it ran out, however late the tank is opened) */      // nobody chose: the tank decides
  if (now < (t.dilemmaAt ??= now + 3 * DAY)) return;      /* (the first one waits until the tank has settled: day three or four) */
  const due = Math.max(t.dilemmaAt, now - DAY); t.dilemmaAt = due + (4 + (hash32(due / 6e4) % 4)) * DAY;      /* (four to seven days apart, counted from when it was due, so a tank opened hourly or once a day comes out the same) */
  const live = t.fish.filter((f) => !f.dead && !f.away && !SPECIES_DEF[f.species]?.visitor && stageOf(f, due) !== 'baby'), h = hash32(Math.floor(due / DAY) * 131 + ((t.createdAt ?? 0) % 977)), pick = (a, k = 0) => a[(h >>> k) % a.length];
  const dens = t.decor.filter((d) => ['coconut', 'pot'].includes(d.type)), octos = live.filter(isOcto), fish = live.filter((f) => !isOcto(f)), c = [];
  const LO = layoutOf(t);
  if (dens.length && dens.length < octos.length + (fish.length ? 1 : 0) && live.length >= 2 && (octos.length >= 2 || (octos.length && fish.length))) { const x = octos[0], y = live.find((f) => f !== x); c.push({ kind: 'den', fish: [x.id, y.id], decor: (homeOf(t, x) ?? dens[0]).id }); }
  const ill = live.filter((f) => (f.ail ?? 0) >= AIL_TIRED / 2 && !isOcto(f)); if (ill.length) c.push({ kind: 'sick', fish: [pick(ill, 3).id] });      /* (only a fish that really is off colour: its ail has been building for half a day or more) */
  const restless = octos.filter((f) => (!f.restUntil || f.restUntil < now) && f.lid && now - f.lid.at < 3 * DAY && f.lid.n >= 2);      /* (only an octopus seen testing the lid, more than once in the last three days) */ if (restless.length && !(t.adv?.lidUntil > now)) c.push({ kind: 'lid', fish: [pick(restless, 5).id] });      /* (and not already kept in by a weighted lid) */
  const SO = (f) => SOCIAL[f.species] ?? {}, calm = fish.filter((f) => !(f.calmUntil > now));
  const pairs = calm.flatMap((x) => fish.filter((y) => y !== x && (y.grudge?.id === x.id || (SO(x).bully && (SO(y).shy || (SO(y).size ?? 1) < (SO(x).size ?? 1) || SO(y).kind === 'Peaceful')) || (SO(x).sameFoe && y.species === x.species))).map((y) => [x, y]));      /* (a real reason: a bully and a smaller or shy fish, two of a kind that will not share, or an old grudge) */
  if (pairs.length && !(LO.thicket && luckOf(h) < 70)) { const [x, y] = pick(pairs, 7); c.push({ kind: 'chase', fish: [x.id, y.id] }); }
  if (!c.length) { t.dilemmaAt = now + DAY; delete t.omen; return; }      /* (nothing real to decide: look again tomorrow rather than inventing something) */
  // first the tank shows it (a day of the octopus at the lid, the chasing, the pale fish hiding), and only then is anyone asked
  const O = t.omen && due - t.omen.at < 2.5 * DAY ? t.omen : null, same = O && (c.find((x) => x.kind === O.kind && x.fish[0] === O.fish[0]) ?? c.find((x) => x.kind === O.kind));
  if (!same) { const W = pick(c, 9), Fw = W.fish.map((id) => t.fish.find((f) => f.id === id)); t.omen = { kind: W.kind, fish: W.fish, at: due }; t.dilemmaAt = due + 0.9 * DAY;
    const line = W.kind === 'lid' ? `${Fw[0].name} keeps reaching up to the lid and testing it.` : W.kind === 'chase' ? `${Fw[0].name} keeps chasing ${Fw[1].name} about.` : W.kind === 'sick' ? `${Fw[0].name} looks a little pale today and is keeping to itself.` : `${Fw[0].name} and ${Fw[1].name} are both hanging about the same den.`;
    ev.push({ journal: line, story: Fw[0].id, text: line, omen: W.kind }); return; }
  c.length = 0; c.push(same); delete t.omen; const D = pick(c, 9), F = D.fish.map((id) => t.fish.find((f) => f.id === id)), dl = D.decor ? (DECOR_DEF[t.decor.find((d) => d.id === D.decor)?.type]?.label ?? 'den').toLowerCase() : '';
  const crew = Object.entries(t.care ?? {}).filter(([, c]) => now - c.ts < 4 * DAY).sort((a, b) => (a[0] < b[0] ? -1 : 1)), turn = crew.length > 1 ? crew[(t.dlTurn = ((t.dlTurn ?? -1) + 1) % crew.length)] : null;      // in a shared tank, the caretakers take turns: it is one person's call first (12 hours), then anyone's
  t.dilemma = { id: 'dl' + Math.floor(due / 6e4), ...D, at: due, until: due + 1.5 * DAY, ...(turn ? { turn: { uid: turn[0], name: turn[1].name, until: due + 12 * HOUR } } : {}), text: DILEMMA[D.kind].text(F[0], F[1], dl), opts: DILEMMA[D.kind].opts.map(([k, l]) => ({ k, label: l(F[0], F[1]) })), done: false };
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
    else if (k === 'isolate') { x.ail = Math.max(0, (x.ail ?? 0) - 0.5 * 86400);      /* (ail is kept in seconds of neglect: half a day better) */ const pal = t.fish.find((f) => f.id === x.pal && !f.dead); hap(pal, -0.15); hap(x, -0.1); say(`${who} to keep ${x.name} apart for a day. It did not spread${pal ? `, but ${pal.name} kept looking for it` : ''}.`); }
    else if (luck < 45) say(`${who} to wait and see. It was nothing: ${x.name} is back to itself.`);
    else { const others = t.fish.filter((f) => !f.dead && f !== x && !isOcto(f)).slice(0, 2); for (const f of [x, ...others]) f.ail = Math.min(AIL_DIE - 3600, Math.max(f.ail ?? 0, AIL_TIRED) + 0.5 * 86400);      /* (it spread: everyone it reached is unwell, never past what neglect allows) */ say(`${who} to wait and see. It spread: ${[x, ...others].map((f) => f.name).join(', ')} look unwell. Clean water and food will help.`); } }
  if (D.kind === 'lid') { t.adv ||= {};
    if (k === 'lid') { t.adv.octoAt = Math.max(t.adv.octoAt ?? now, now + 7 * DAY); t.adv.lidUntil = now + 7 * DAY; hap(x, -0.2); say(`${who} to weigh the lid down. ${x.name} sulks in its den, but it stays in.`); }
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
// a full tank lays no eggs: every breeding step says so plainly, and what to do, rather than waiting in silence
const fullTank = (t) => t.fish.length + pending(t) + (t.eggs ?? []).length >= capacity(t.level) + BIRTH_ROOM;
const FULL_HINT = 'Your tank is full, so no eggs can be laid: find one of your shop fish a new home, or send a baby to a friend.';
const roomy = (h) => (t) => (fullTank(t) ? FULL_HINT : typeof h === 'function' ? h(t) : h);
const colorGoal = (m) => ({
  title: m ? `Breed a ${MORPHS[m].label} fish` : 'Breed a rare color', blurb: m ? `${MORPHS[m].label} is hidden in your tank's genes. Bring two carriers together and see.` : 'Somewhere in your tank a rare color is hiding in the genes. Find it and breed it out.',
  ok: (t) => !m || carrierOf(t, m), icon: 'hatched',
  steps: [
    { text: m ? `Find a fish that carries ${MORPHS[m].label.toLowerCase()}` : 'Find a fish that carries a rare color', hint: "Open your fishes' cards: a carrier says \"Carries …\".", n: (t) => (carrierOf(t, m) ? 1 : 0), need: 1 },
    { text: 'Pair two carriers', hint: (t) => { const c = liveOf(t).filter((f) => (m ? allelesOf(f).includes(m) : allelesOf(f).some((x) => MORPHS[x]))).map((f) => f.name); return `${c.length ? `Your carriers: ${c.slice(0, 4).join(', ')}. ` : ''}On a carrier's card, tap "Pair with…": the odds are shown on each button.${c.length < 2 ? (m && specialOf(t).color === m ? ` Today's special in the Shop carries ${MORPHS[m].label.toLowerCase()}: a second carrier.` : ' One carrier and a baby of its own can carry it too.') : ''}`; }, n: since(m ? `paired_${m}` : 'pairedRare'), need: 1 },
    { text: 'Hatch their babies', hint: roomy('Keep the tank fed and the water clean while the eggs grow. Be there when they hatch.'), n: since('hatched'), need: 1 },
    { text: m ? `A ${MORPHS[m].label.toLowerCase()} baby` : 'A rare-colored baby', hint: 'About one baby in four from two carriers shows it. Keep trying: a full moon helps.', n: m ? since(`morph_${m}`) : since('morphs'), need: 1 },
  ] });
export const GOALS = {
  rare: colorGoal(null), gold: colorGoal('gold'), ghost: colorGoal('ghost'), blue: colorGoal('blue'), ember: colorGoal('ember'),
  family: { title: 'Raise a family', blurb: 'Eggs, a hatching you are there for, and one of the babies grown up in your care.', icon: 'friend', ok: (t) => liveOf(t).filter((f) => !isOcto(f) && f.species !== 'seahorse').length >= 2,
    steps: [
      { text: 'Bring a pair together', hint: 'Two grown fish of the same kind: tap "Pair with…" on one of their cards.', n: since('paired'), need: 1 },
      { text: 'Watch a hatching', hint: roomy('When eggs are ready, open the tank and watch: they wait for you.'), n: since('watchedHatch'), need: 1 },
      { text: 'Raise a baby to adulthood', hint: 'Ten days: feed it, play with it, keep the water clean. How you raise it decides who it becomes.', n: since('grewHere'), need: 1 },
    ] },
  raise: { title: 'Three temperaments', blurb: 'Raise three young ones three different ways, and get three different grown-ups.', icon: 'grown', ok: (t) => liveOf(t).length >= 2,
    steps: [1, 2, 3].map((k) => ({ text: k === 1 ? 'Raise one the way you choose' : k === 2 ? 'A second, different temperament' : 'A third, different again', hint: 'While it is small: pet it often (Brave), play ball (Playful), let it chase the light or the bubbles (Curious), or feed it every day (Calm). Stick to one way.', n: (t, g) => ['Brave', 'Playful', 'Curious', 'Calm', 'Shy'].filter((x) => statOf(t, 'raised_' + x) > (g.base?.['raised_' + x] ?? 0)).length, need: k })) },      /* (any three, in any order: three childhoods, not a checklist of four) */
  guide: { title: 'Field naturalist', blurb: 'Catch your animals doing remarkable things and fill the Field Guide.', icon: 'spot', ok: (t) => Object.keys(t.field ?? {}).length < Object.keys(FIELD).length - 6,
    steps: [2, 4, 6].map((k) => ({ text: `${k} new Field Guide pages`, hint: 'Watch the tank: the Field Guide lists what to look for. A page fills the first time someone sees it.', n: (t, g) => Object.keys(t.field ?? {}).length - (g.base?.field ?? 0), need: k })) },
  octo: { title: 'An octopus family', blurb: 'Win an octopus over, give it a partner and a den, and see its babies hatch.', icon: 'trust', ok: (t) => { const os = liveOf(t).filter(isOcto); return os.some((f) => sexOf(f) === 'f') && os.some((f) => sexOf(f) === 'm'); },      /* (eggs need a mother and a father: never offered when they cannot come) */
    steps: [
      { text: 'Your octopus trusts you', hint: 'Crabs from your hand, play, and time: it comes to the glass for you when it trusts you.', n: (t) => (liveOf(t).some((f) => isOcto(f) && Object.keys(f.bond ?? {}).some((u) => octoTrust(f, u).lvl >= 3)) ? 1 : 0), need: 1 },
      { text: 'A female and a male become partners', hint: 'Two grown octopuses, she and he, a den each, both well fed: in a few days they become partners.', n: (t) => (liveOf(t).some((f) => isOcto(f) && f.partner && sexOf(f) === 'f' && t.fish.some((m) => m.id === f.partner && !m.dead && sexOf(m) === 'm')) ? 1 : 0), need: 1 },
      { text: 'Eggs in the den', hint: roomy('Partners lay after about five days together, if she has a den of her own and both are well fed.'), n: since('octoEggs'), need: 1 },
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
      { text: 'A second generation hatches', hint: roomy('Its babies, born in your tank: keep the water clean and be there to watch.'), n: since('gen2'), need: 1 },
    ] },
  sleuth: { title: 'Tank detective', blurb: 'Look into the daily mysteries and follow one to the end.', icon: 'bubbles', ok: () => true,
    steps: [
      { text: 'Solve 3 daily mysteries', hint: 'Each day something glows on the sand: tap it.', n: since('myst'), need: 3 },
      { text: 'Follow a mystery into the next day', hint: 'Some are not over when you look. Come back tomorrow.', n: since('mystChain'), need: 1 },
      { text: 'Solve 7 daily mysteries', hint: 'One a day, there for the finding.', n: since('myst'), need: 7 },
    ] },
};
export const GOAL_SHELLS = 20;
// how long each goal usually takes, measured in the simulation (tools/loop_sim.mjs, median days from choosing to finishing), and what it needs first
export const GOAL_PACE = { family: ['A few days', 'two grown fish of a kind'], sleuth: ['About a week', ''], dynasty: ['About a week', 'a grown fish bred here'], ember: ['One to two weeks', 'a carrier in the tank'], ghost: ['Two to three weeks', 'a carrier in the tank'], peace: ['Two to three weeks', 'an octopus and room for plants'], guide: ['Two to three weeks', 'time spent watching'], blue: ['About three weeks', 'a carrier in the tank'], gold: ['About three weeks', 'a carrier in the tank'], rare: ['About four weeks', ''], octo: ['About four weeks', 'a female and a male octopus'], raise: ['Several weeks', 'young ones to raise, one at a time'] };
// what finishing the current goal will unlock: the next floor or backdrop the tank does not have yet (alternating, so both kinds come)
export function nextPrize(t) { const fl = Object.keys(FLOORS).filter((k) => !styleOwned(t, 'floor', k)).map((k) => ['floor', k]), bd = Object.keys(BACKDROPS).filter((k) => !styleOwned(t, 'backdrop', k)).map((k) => ['backdrop', k]); const n = (t.goalsDone ?? []).length; return (n % 2 ? bd[0] ?? fl[0] : fl[0] ?? bd[0]) ?? null; }
export const prizeLabel = (p) => (p ? `${p[0] === 'floor' ? FLOORS[p[1]] : BACKDROPS[p[1]]} ${p[0]}` : null);
const stepsOf = (t, g) => GOALS[g.id].steps.map((s) => ({ ...s, hint: typeof s.hint === 'function' ? s.hint(t) : s.hint, have: Math.max(0, Math.min(s.need, s.n(t, g))) }));
export function goalOf(t) { const g = t.goal; if (!g || !GOALS[g.id]) return null; const S = stepsOf(t, g), next = S.find((s, i) => !g.done?.[i] && s.have < s.need), done = S.filter((s, i) => g.done?.[i] || s.have >= s.need).length;
  return { id: g.id, ...GOALS[g.id], at: g.at, steps: S.map((s, i) => ({ text: s.text, hint: s.hint, have: s.have, need: s.need, done: !!g.done?.[i] || s.have >= s.need })), next: next ? { text: next.text, hint: next.hint, have: next.have, need: next.need } : null, done, of: S.length }; }
function goalOffer(t, now) { const h = hash32(Math.floor(now / DAY) * 13 + ((t.createdAt ?? 0) % 991)), done = new Set((t.goalsDone ?? []).map((x) => x.id)); const ok = Object.keys(GOALS).filter((k) => !done.has(k) && GOALS[k].ok(t));
  const colors = ok.filter((k) => MORPHS[k]), rest = ok.filter((k) => !MORPHS[k] && k !== 'rare'), pick = [];
  pick.push(colors.length ? colors[h % colors.length] : ok.includes('rare') ? 'rare' : null);      // (one breeding goal is always among them when it can be)
  const off = (h >>> 5) % (rest.length || 1); for (let i = 0; i < rest.length && pick.filter(Boolean).length < 3; i++) { const k = rest[(off + i) % rest.length]; if (!pick.includes(k)) pick.push(k); }
  if (!(t.goalsDone ?? []).length && !pick.some((k) => k === 'family' || k === 'sleuth')) { const quick = ['family', 'sleuth'].find((k) => ok.includes(k)); if (quick) pick[Math.min(2, pick.filter(Boolean).length)] = quick; }      /* (a first goal on offer that takes days, not weeks) */
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
// ── What an octopus remembers (kept with the tank, so every phone and every caretaker sees the same animal) ──
// mem = { fav: {x,z} | null, fam: { [decorId]: { k, n, x, z, at, mv?, gone? } }, likes: [decorId ×3], fish: { [fishId]: { f, a } } }
// k: how familiar a decoration is (0–1, grows only when it actually handles it); n: times it has; x,z: where it last knew it to be (a decoration
// moved while it was not looking keeps the old place here until the octopus finds it again); mv: moved since; gone: taken out (forgotten after 3 days).
export const OCTO_MEM = { FAM: 12, LIKES: 3, FISH: 6, GONE_DAYS: 3 };
const COLLECT = new Set(['shell', 'pot', 'coconut', 'chest', 'crystal', 'starfish', 'anchor', 'skull', 'lantern']), DENNY = new Set(['rock', 'boulder', 'pot', 'coconut', 'arch', 'brain', 'moss']), PLANTY = new Set(['grass', 'fern', 'sword', 'red', 'kelp', 'bamboo', 'anemone']);
export const memOf = (f) => (f.mem ||= { fav: null, fam: {}, likes: [], fish: {} });
// how much this octopus cares for a kind of thing: its nature, and a little of its own (so two collectors still end up with different favorites)
export function octoAffinity(f, d) {
  const M = octoMind(f), type = d?.type ?? '', h = ((hash32(((f.seed | 0) * 131) ^ String(d?.id ?? '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) >>> 0) % 1000) / 1000;
  let a = 0.6 + 0.4 * h;
  if (M.type === 'collector' && COLLECT.has(type)) a += 0.6; if (M.type === 'homebody' && DENNY.has(type)) a += 0.5; if (M.type === 'watcher' && PLANTY.has(type)) a += 0.4;
  if (M.type === 'showoff' && (d?.z ?? 0) > 1) a += 0.4; if (M.type === 'explorer' && (d?.z ?? 0) < 0) a += 0.3; if (M.type === 'trickster' && COLLECT.has(type)) a += 0.25;
  return a;
}
function memLikes(t, f) {      // its three favorite decorations: the ones it knows best and cares most for
  const m = memOf(f), score = (id) => { const e = m.fam[id], d = t.decor.find((x) => x.id === id); return e && d && !e.gone && e.n >= 2 ? e.k * octoAffinity(f, d) : 0; };
  m.likes = Object.keys(m.fam).filter((id) => score(id) > 0.25).sort((a, b) => score(b) - score(a)).slice(0, OCTO_MEM.LIKES);
}
function memCap(t, f, now) {      // bounded: forgotten things fall away first, then the least familiar
  const m = memOf(f); m.fam ||= {}; m.likes ||= []; m.fish ||= {}; for (const [id, e] of Object.entries(m.fam)) if (!e || typeof e !== 'object' || (e.gone && now - e.gone > OCTO_MEM.GONE_DAYS * DAY)) delete m.fam[id];
  const ids = Object.keys(m.fam); if (ids.length > OCTO_MEM.FAM) for (const id of ids.sort((a, b) => (m.likes.includes(a) - m.likes.includes(b)) || ((m.fam[a].gone ? -1 : 0) - (m.fam[b].gone ? -1 : 0)) || (m.fam[a].k - m.fam[b].k)).slice(0, ids.length - OCTO_MEM.FAM)) delete m.fam[id];
  const fk = Object.keys(m.fish); if (fk.length > OCTO_MEM.FISH) { for (const id of fk.sort((a, b) => (m.fish[a].f + m.fish[a].a) - (m.fish[b].f + m.fish[b].a)).slice(0, fk.length - OCTO_MEM.FISH)) delete m.fish[id]; }
  memLikes(t, f);
}
export const famStage = (e) => (!e || !e.n ? 'new' : e.k >= 0.6 ? 'loved' : e.k >= 0.35 ? 'familiar' : 'investigated');
export const trainNeed = (f) => (isSmart(f) ? 2 : TRAIN_NEED);
// ── Toys ── free, in the Toy box: the ball is there from the start; bubbles and the light spot open up as the tank plays. Each animal learns a toy
// by playing with it (five goes and it knows it, and has a favorite). Who likes what follows the real animals: fish chase and nose things,
// an octopus bats and grabs, a seahorse snaps at small drifting things and watches the rest with its eyes.
export const TOYS = {
  ball: { label: 'Ball', unlock: 0, icon: 'ball', how: 'Tap the water to toss it in.', who: 'Fish nose it along, an octopus bats it about.', fits: ['fish', 'octopus'] },
  bubbles: { label: 'Bubbles', unlock: 3, icon: 'bubbles', how: 'Tap the sand: a stream of bubbles rises from it.', who: 'Fish chase and pop them; seahorses snap at them.', fits: ['fish', 'seahorse', 'octopus'] },
  light: { label: 'Light spot', unlock: 8, icon: 'light', how: 'Hold and drag on the sand.', who: 'Fish follow it, an octopus stalks and pounces, seahorses watch it.', fits: ['fish', 'octopus', 'seahorse'] },
};
export const TOY_LEARN = 5;
export const toyKind = (f) => (f.species === 'octopus' ? 'octopus' : f.species === 'seahorse' ? 'seahorse' : 'fish');
export const toysOpen = (t) => Object.keys(TOYS).filter((k) => (t.toyPlays ?? 0) >= TOYS[k].unlock);
export const favToy = (f) => { const e = Object.entries(f?.toys ?? {}).sort((a, b) => b[1] - a[1])[0]; return e && e[1] >= 2 ? e[0] : null; };
export const PUZZLE_COST = 3, PUZZLE_GAP = 3 * 3600e3, PUZZLE_SECS = [150, 75, 35, 15], PUZZLE_FIRST_REWARD = 3;
export const puzzleSecs = (f) => PUZZLE_SECS[Math.min(PUZZLE_SECS.length - 1, f?.solved ?? 0)];
export const canPuzzle = (f, now = Date.now()) => isSmart(f) && stageOf(f, now) !== 'baby';
// A crab treat (old phones only: the button is gone, a hungry octopus's crab from Feed does all this now): the octopus eats crabs, not flakes. It costs shells, makes the octopus very happy, and every crab (and every day, and every jar) adds to its hoard of shells at its den.
export const CRAB_PRICE = 4, CRAB_GAP = 2 * 3600e3;
export const hoardOf = (f, now = Date.now()) => (isSmart(f) ? Math.min(14, Math.floor(Math.max(0, now - f.born) / (2 * 864e5)) + (f.solved ?? 0) + (f.crabs ?? 0)) : 0);
export const bondOf = (f) => Object.values(f.bond ?? {}).reduce((n, x) => n + x, 0);
// what this fish can be taught right now: it has to be past the baby stage, trust someone, and the tank needs the decoration
export function trickOptions(t, f, now = Date.now()) {
  if (!f || stageOf(f, now) === 'baby' || bondOf(f) < TRICK_BOND) return [];
  return Object.entries(TRICKS).filter(([k]) => !(f.tricks ?? []).includes(k)).map(([k, d]) => ({ key: k, label: d.label, spot: t.decor.find((x) => d.types.includes(x.type))?.id ?? null, have: f.skill?.[k] ?? 0, need: trainNeed(f) })).filter((o) => o.spot);
}


// ── who gets along ──
// Each species has a real-world nature (reef-keeping guides, Project Seahorse and aquarium notes): who is a bully, who is territorial, who is shy, who needs a shoal or a pair,
// what it likes to live in, and who it likes. The game turns that into plain comfort tips and a small happiness effect. Nothing here can hurt a fish by itself.
export const SOCIAL = {
  goldfish:  { kind: 'Friendly', size: 1, nature: 'Friendly and curious. Nestles in an anemone, swaying with it, and gets on with nearly everyone.', home: { types: ['anemone'], text: 'a sea anemone to nestle in' }, likes: ['cory', 'neon', 'danio', 'blue'], line: 'Gets on with most peaceful fish. Loves an anemone.' },
  blue:      { kind: 'Territorial', size: 1, shy: true, sameFoe: true, nature: 'Claims a cave in the rocks and defends it from other grammas. Rests upside down under ledges.', home: { cats: ['ROCKS', 'STRUCTURES'], text: 'a rock cave to claim' }, likes: ['platy', 'goldfish'], line: 'Keep just one. Peaceful with other kinds.' },
  angelfish: { kind: 'Bossy', size: 3, bully: true, nature: 'Large and confident. Grazes on the rocks and pushes smaller fish around.', home: { cats: ['ROCKS'], text: 'rocks to graze on' }, likes: [], line: 'Can bully small, shy fish. Give them places to hide.' },
  neon:      { kind: 'Peaceful', size: 1, shoal: 3, nature: 'A small, lively shoaling fish that feels safest in a group.', home: null, likes: ['neon', 'danio', 'goldfish'], line: 'Happiest in a group of three or more.' },
  cory:      { kind: 'Peaceful', size: 1, sameFoe: true, nature: 'Sits on the sand keeping watch, ready to dart into a burrow. Territorial only with other gobies.', home: { cats: ['ROCKS'], text: 'rocks to keep watch from' }, likes: ['goldfish'], line: 'Easygoing, but only one goby to a tank.' },
  guppy:     { kind: 'Aggressive', size: 1, bully: true, nature: 'Bold, tough and territorial. Guards its patch of reef and chases other fish away.', home: { cats: ['ROCKS'], text: 'rocks to guard' }, likes: [], line: 'Bullies shy fish. Best with bold fish and lots of rocks.' },
  platy:     { kind: 'Calm', size: 1, shy: true, nature: 'Calm, a little shy by day, and most active after dark. Likes shade.', home: { cats: ['STRUCTURES', 'ROCKS'], text: 'a shady structure' }, likes: ['blue', 'neon'], line: 'Gentle. Comes out more at night.' },
  danio:     { kind: 'Peaceful', size: 1, shoal: 3, nature: 'A graceful shoaling fish that stays close to its own kind.', home: null, likes: ['neon', 'goldfish', 'danio'], line: 'Happiest with a few of its own kind.' },
  betta:     { kind: 'Gentle', size: 1, shy: true, sameFoe: true, nature: 'Slow and peaceful. Picks tiny food from the rocks all day, so quick eaters can crowd it out.', home: { cats: ['ROCKS'], text: 'rocks to pick over' }, likes: ['seahorse'], line: 'Needs quiet company, and only one dragonet.' },
  seahorse:  { kind: 'Gentle', size: 1, shy: true, pair: true, nature: 'Slow, upright and gentle. Pairs for life, greets its partner each morning, and holds on to plants.', home: { cats: ['PLANTS'], text: 'plants to hold on to' }, likes: ['betta', 'seahorse'], line: 'Pairs for life. Easily crowded out at mealtimes.' },
  octopus:   { kind: 'Clever', size: 3, predator: true, nature: 'A curious problem-solver that explores everything. Small fish stay wary of it.', home: { cats: ['ROCKS', 'STRUCTURES'], text: 'a rock den' }, likes: [], line: 'Keep it busy: it loves puzzles and new things to explore.' },
};
const hides = (t) => count(t, 'PLANTS') + count(t, 'ROCKS') + count(t, 'STRUCTURES');
const hasHome = (t, h) => !h || t.decor.some((d) => h.types?.includes(d.type) || h.cats?.includes(DECOR_DEF[d.type]?.cat));
// How this fish is getting on with the others. `penalty` is the strain from bullies, rivals and a predator (0 to about 1), `notes` say why, `needs` are things it wants, `good` are friendships.
export function socialOf(t, f) {
  const S = SOCIAL[f.species], out = { penalty: 0, notes: [], needs: [], good: [] }; if (!S) return out;
  const cover = Math.min(1, hides(t) / 4), timid = S.size <= 1 && !S.bully, seen = new Set();
  for (const o of t.fish) {
    if (o === f) continue; const O = SOCIAL[o.species]; if (!O) continue;
    if (o.species === f.species && S.sameFoe) { out.penalty += 0.35; out.notes.push(`${o.name} and ${f.name} squabble: ${SPECIES_DEF[f.species].label}s prefer to be the only one of their kind.`); }
    else if (O.bully && o.species !== f.species && timid && !seen.has(o.species)) { seen.add(o.species); out.penalty += 0.3 * (1 - 0.6 * cover); out.notes.push(`${o.name} bullies ${f.name}.${cover < 1 ? ' More hiding places (plants, rocks) would help.' : ''}`); }
    else if (O.predator && o.species !== f.species && timid && !seen.has(o.species)) { seen.add(o.species); out.penalty += 0.12; out.notes.push(`${f.name} keeps a wary eye on ${o.name}.`); }
    if (S.likes?.includes(o.species) && !out.good.some((g) => g.id === o.id)) out.good.push({ id: o.id, text: `${f.name} enjoys ${o.name}'s company.` });
  }
  const own = t.fish.filter((o) => o.species === f.species).length;
  if (S.shoal && own < S.shoal) out.needs.push(`${f.name} feels safest with at least ${S.shoal} of its own kind (${own} now).`);
  if (S.pair && own < 2) out.needs.push(`Seahorses pair for life. A partner would make ${f.name} happier.`);
  if (!hasHome(t, S.home)) out.needs.push(`${f.name} would like ${S.home.text}.`);
  return out;
}
// The tank as a whole: how harmonious it is, and the most useful thing to fix.
export function harmonyOf(t) {
  if (t.fish.length < 2) return { key: 'calm', label: 'Calm', note: 'Nobody to squabble with.', strain: 0 };
  let strain = 0, worst = null; for (const f of t.fish) { const s = socialOf(t, f); strain += s.penalty; if (s.notes[0] && (!worst || s.penalty > worst.p)) worst = { p: s.penalty, text: s.notes[0] }; }
  const k = strain / t.fish.length; return k > 0.2 ? { key: 'tense', label: 'Tense', note: worst?.text ?? 'Some fish are not getting on.', strain: k } : k > 0 ? { key: 'uneasy', label: 'A little uneasy', note: worst?.text ?? 'A fish is wary.', strain: k } : { key: 'harmony', label: 'Harmonious', note: 'Everyone gets along.', strain: 0 };
}
// A heads-up before adopting: who in the tank this newcomer would clash with. Soft advice only.
export function adoptAdvice(t, species) {
  const S = SOCIAL[species], d = SPECIES_DEF[species]; if (!S || !d) return null; const msgs = [];
  const mine = t.fish.filter((o) => o.species === species);
  if (S.sameFoe && mine.length) msgs.push(`${d.label}s prefer to be the only one of their kind, and you already have ${mine[0].name}.`);
  const timidNames = [...new Set(t.fish.filter((o) => SOCIAL[o.species] && SOCIAL[o.species].size <= 1 && !SOCIAL[o.species].bully && o.species !== species).map((o) => SPECIES_DEF[o.species].label))];
  if (S.bully && timidNames.length) msgs.push(`${d.label} can bully smaller, shy fish like ${timidNames.slice(0, 2).join(' and ')}.${hides(t) < 4 ? ' More plants and rocks would help them hide.' : ''}`);
  if (S.predator && timidNames.length) msgs.push(`Small fish will be wary of an octopus.`);
  const bully = t.fish.find((o) => SOCIAL[o.species]?.bully && o.species !== species); if (bully && S.size <= 1 && !S.bully) msgs.push(`${bully.name} the ${SPECIES_DEF[bully.species].label} may bully a ${d.label}.`);
  return msgs.length ? msgs.join(' ') : null;
}
// ── comfort: how well the tank suits a fish, as a plain label and the most useful thing to change ──
export function comfortOf(t, f, now = Date.now()) {
  let pts = 0, max = 0; const tips = [];
  const add = (w, v, tip) => { v = Math.max(0, Math.min(1, v)); max += w; pts += w * v; if (v < 0.99) tips.push([w * (1 - v), tip]); };
  add(3, t.water >= 0.7 ? 1 : (t.water - 0.45) / 0.25, 'The water needs a change.'); add(2, 1 - Math.max(0, (t.glass - 0.3) / 0.5), 'The glass needs a wipe.'); add(2, 1 - Math.max(0, (t.hunger - 0.45) / 0.4), 'A meal would help.');
  if (f.species === 'octopus') { const dens = f.home || t.decor.some((d) => d.type === 'pot' || d.type === 'coconut') ? 2 : t.decor.filter((d) => ['boulder', 'rock', 'brain', 'table', 'arch', 'pillar', 'skull', 'chest'].includes(d.type)).length; add(2.5, dens / 2, `${f.name} wants somewhere to make a den: a clay pot, a coconut shell or a couple of rocks (${Math.min(dens, 2)} of 2).`); { const baby = stageOf(f, now) === 'baby', fed = f.fedAt != null && now - f.fedAt < 8 * HOUR; add(1.5, (f.crabs ?? 0) > 0 || (f.solved ?? 0) > 0 || fed || baby ? 1 : 0, `${f.name} would enjoy a crab treat or a puzzle jar.`); } }      // never asks for what it cannot have yet: a baby is not offered jars, and a crab it just ate counts
  else for (const tr of f.traits ?? []) { const sp = SPOT[tr]; if (sp) add(2, count(t, sp[0]) / sp[1], `${f.name} would feel more at home with ${sp[2]} (${Math.min(count(t, sp[0]), sp[1])} of ${sp[1]}).`); }
  if ((f.traits ?? []).includes('Social') && f.species !== 'octopus') add(1.5, (t.fish.length - 1) / 3, `${f.name} would like more company.`);
  { const so = socialOf(t, f); if (so.penalty) add(2.5, 1 - Math.min(1, so.penalty), so.notes[0]); for (const nd of so.needs.slice(0, 1)) add(1.2, 0.3, nd); }
  add(1, new Set(t.decor.map((d) => d.type)).size / 5, 'A few different decorations would make the tank richer.');
  const score = Math.round((100 * pts) / max); tips.sort((a, b) => b[0] - a[0]);
  return { score, label: score >= 80 ? 'Cosy' : score >= 55 ? 'Comfortable' : 'Could be better', tips: tips.slice(0, 2).map((x) => x[1]) };
}

// ── plants grow and can be trimmed ──
export const TRIM_AFTER = 3 * 864e5, GROWN_AFTER = 7 * 864e5;
export const plantAge = (t, d, now) => now - (d.trimAt ?? d.at ?? t.createdAt ?? now);
export const readyToTrim = (t, now) => t.decor.filter((d) => DECOR_DEF[d.type]?.cat === 'PLANTS' && plantAge(t, d, now) >= TRIM_AFTER);
export const growthOf = (t, d, now) => (DECOR_DEF[d.type]?.cat === 'PLANTS' ? 1 + 0.45 * Math.min(1, Math.max(0, plantAge(t, d, now)) / GROWN_AFTER) : 1);

// One small shared wish a day, per tank. It resets at UTC midnight on the server clock, so every caretaker sees the same wish whatever their time zone.
// Optional, replaced (never carried over) the next day, never penalised, paid once to the shared wallet. Three tiers: easy 3, normal 5, special 8.
// A wish is only chosen if the tank can do it right now, so a lone fish is never asked for a friendship and a spotless tank is never asked for care.
const minorDecor = ['starfish', 'moss', 'shell'], seenDecor = (t) => t.decor.some((d) => !minorDecor.includes(d.type));
export const needs = (t) => [(t.hunger > 0.3 || t.fish.some((f) => ownHungry(f) && !f.dead && ownHunger(f) > OCTO_DUE)) && 'feed', t.water < 0.7 && 'water', t.glass > 0.3 && 'glass'].filter(Boolean);
const withSpot = (t) => t.fish.some((f) => f.found?.includes('spot') && t.decor.some((d) => d.id === f.spotId));
export const DAILY = {
  watch: { tier: 'easy', text: 'Watch your fish swim for 15 seconds', need: 1, ok: (t) => t.fish.length >= 1 },
  greet: { tier: 'easy', text: 'Say hello to three fish', need: 3, ok: (t) => t.fish.length >= 3 },
  play: { tier: 'easy', text: 'Play with a fish', need: 1, ok: (t) => t.fish.length >= 1 },
  care: { tier: 'easy', text: 'Give the tank some care it needs', need: 1, ok: (t) => needs(t).length >= 1 },
  plant: { tier: 'easy', text: 'Place a plant', need: 1, ok: (t) => t.decor.length < MAX_DECOR && t.shells >= 6 },
  together: { tier: 'normal', text: 'See two fish swimming together', need: 1, ok: (t) => t.fish.length >= 2 },
  visit: { tier: 'normal', text: 'Watch a fish visit a decoration', need: 1, ok: (t) => t.fish.length >= 1 && seenDecor(t) },
  play3: { tier: 'normal', text: 'Play with three different fish', need: 3, ok: (t) => t.fish.length >= 3 },
  care2: { tier: 'normal', text: 'Give two kinds of care the tank needs', need: 2, ok: (t) => needs(t).length >= 2 },
  friends: { tier: 'special', text: 'Watch two friends swim together', need: 1, ok: (t) => t.fish.some((f) => f.pal && t.fish.some((o) => o.id === f.pal)) },
  investigate: { tier: 'special', text: 'Watch a curious fish investigate a decoration', need: 1, ok: (t) => seenDecor(t) && t.fish.some((f) => (f.traits ?? []).includes('Curious')) },
  favourite: { tier: 'special', text: 'Watch a fish at its favorite spot', need: 1, ok: withSpot },
  bubbles: { tier: 'special', text: 'Watch a playful fish by the bubbles', need: 1, ok: (t) => t.decor.some((d) => d.type === 'bubbler') && t.fish.some((f) => (f.traits ?? []).includes('Playful')) },
};
export const DAILY_TIER = { easy: 3, normal: 5, special: 8 };
export const DAILY_REWARD = DAILY_TIER.easy;
const DISTINCT = ['greet', 'play3', 'care2'];                      // these count different fish or different kinds of care, never the same one twice
function rollDaily(t, now) {
  const day = Math.floor(now / DAY); if ((t.flags.tut ?? 0) < 5) return;
  if (requestKind(t, now) === 'want') { t.daily = null; return; }                       // today's request is a fish's own wish
  if (t.daily && t.daily.day === day && (t.daily.done || t.daily.have > 0 || DAILY[t.daily.kind]?.ok(t, now))) return;      // a wish already under way is kept even if the need has since been met
  const roll = hash32(day * 17 + (t.createdAt % 991)) % 100, want = roll < 50 ? 'easy' : roll < 85 ? 'normal' : 'special';
  const feasible = Object.keys(DAILY).filter((k) => DAILY[k].ok(t, now) && k !== t.daily?.kind), pool = [want, 'normal', 'easy'].map((tier) => feasible.filter((k) => DAILY[k].tier === tier)).find((p) => p.length) ?? [];
  const pick = pool.length ? pool[hash32(day * 31 + (t.createdAt % 997)) % pool.length] : null; if (!pick) { t.daily = null; return; }
  t.daily = { day, kind: pick, tier: DAILY[pick].tier, reward: DAILY_TIER[DAILY[pick].tier], text: DAILY[pick].text, need: DAILY[pick].need, have: 0, ids: [], done: false };
}
// ── a day's care, at a glance ──
// Three small things every day: the tank is looked after, today's wish is done, and a fish got some attention. All three pays a small bonus once.
// It is per tank-day (UTC, like the daily wish), shared by everyone, and missing it costs nothing: there is no streak.
export const PERFECT_DAY_REWARD = 3;
export const lookedAfter = (t) => t.fish.length > 0 && (t.hunger <= 0.45 || !t.fish.some((f) => !isOcto(f))) && t.water >= 0.7 && t.glass <= 0.45;      // the tank itself; each octopus is its own caretaker's job and pays on its own
export function dayLogOf(t, now) { const day = Math.floor(now / DAY); if (!t.dayLog || t.dayLog.day !== day) t.dayLog = { day, care: false, bond: false, paid: false }; return t.dayLog; }
export const dayTicks = (t, now) => { const l = dayLogOf(t, now), day = Math.floor(now / DAY); return { care: !!l.care, wish: t.req && t.req.day === day && t.req.kind === 'want' ? !!t.req.wantDone : t.daily ? t.daily.day === day && !!t.daily.done : true, bond: !!l.bond, paid: !!l.paid }; };
function dayCheck(t, now, ev, key = null, due = false) {
  if ((t.flags.tut ?? 0) < 5 || !t.fish.length) return; const l = dayLogOf(t, now);
  if (key === 'care' && (lookedAfter(t) || due) && !l.counted) { bump(t, 'careDays'); l.counted = true; } if (key === 'care' && lookedAfter(t)) l.care = true;      /* (a day of care counts for the level when someone did care that was due: one feeding a day is enough, nobody has to top the tank up twice) */ if (key === 'bond') l.bond = true;
  const k = dayTicks(t, now); if (k.care && k.wish && k.bond && !l.paid) l.paid = true;      // (a full day is ticked on the checklist; it is not paid or posted: the day is its own reward)
}
// How the tank is doing right now, in one word and one sentence.
export function tankMood(t, now = Date.now()) {
  if (!t.fish.length) return { key: 'empty', label: 'Quiet', note: 'No fish yet.' };
  const worst = Math.max(...t.fish.map((f) => f.ail ?? 0)), happy = t.fish.reduce((n, f) => n + (f.happy ?? 0.7), 0) / t.fish.length;
  if (worst >= AIL_WARN) return { key: 'neglected', label: 'Neglected', note: 'A fish is in a critical state. Feed the tank and change the water.' };
  const hungryOcto = t.fish.find((f) => isOcto(f) && !f.dead && octoHunger(f) > 0.75);
  const fishHungry = t.hunger > 0.7 && t.fish.some((f) => !isOcto(f) && !f.dead);      // the tank's hunger is the fish's; an octopus has its own
  if (worst >= AIL_TIRED || hungryOcto || fishHungry || t.water < 0.5) return { key: 'attention', label: 'Needs care', note: fishHungry ? 'The fish are hungry.' : hungryOcto ? `${hungryOcto.name} is hungry.` : t.water < 0.5 ? 'The water is cloudy.' : 'A fish looks tired.' };
  { const todo = [t.water < 0.7 && 'the water is turning cloudy', t.glass > 0.45 && 'algae is growing on the glass', t.fish.some((f) => isOcto(f) && !f.dead && octoHunger(f) > 0.4) && `${t.fish.find((f) => isOcto(f) && !f.dead && octoHunger(f) > 0.4).name} is getting peckish`, t.hunger > 0.45 && t.fish.some((f) => !isOcto(f) && !f.dead) && 'the fish are getting peckish'].filter(Boolean);
    if (todo.length) return { key: 'good', label: 'Could use a hand', note: todo[0][0].toUpperCase() + todo.slice(0, 2).join(' and ').slice(1) + '.' }; }
  if (lookedAfter(t) && happy >= 0.75) return { key: 'thriving', label: 'Thriving', note: 'Clean, fed and happy.' };
  return { key: 'good', label: 'Doing well', note: 'Nothing urgent.' };
}
let NOW = 0;                                                         // the clock of the call in progress, so a wish finished deep inside it knows what day it is
function progress(t, kind, ev, who, id = null) {
  const d = t.daily; if (!d || d.done || d.kind !== kind) return false;
  if (DISTINCT.includes(kind)) { if (!id || d.ids.includes(id)) return false; d.ids.push(id); d.have = d.ids.length; } else d.have++;
  if (d.have < d.need) return true;
  const pay = d.reward ?? DAILY_REWARD;
  d.done = true; d.by = who; t.shells += pay; ev.push({ activity: { type: 'wish', text: `${who} completed today's wish.` }, toast: `Today's wish is done. +${pay} shells`, dailyDone: true }); dayCheck(t, NOW, ev); return true;
}
// who has been looking after the tank lately, so a growing fish can thank the right people
function careBy(t, uid, name, now) { (t.care ||= {})[uid] = { name, ts: now }; }
function stories(t, now, ev) {
  if (now < t.storyAt || !t.fish.length || (t.flags.tut ?? 0) < 5) return; t.storyAt = now + (3 + (hash32(now / 6e4) % 3)) * HOUR;
  const f = t.fish[hash32(now / 6e4 + 7) % t.fish.length], tr = f.traits?.[hash32(now / 6e4 + 11) % Math.max(1, f.traits.length)], line = STORY[tr]?.(f, t);
  if (line) ev.push({ journal: line });
}
function deliver(t, now, ev) {
  for (const o of [...t.orders]) {
    if (o.arrivesAt > now) continue;
    t.orders.splice(t.orders.indexOf(o), 1); const d = SPECIES_DEF[o.species], made = [];
    for (let i = 0; i < d.count; i++) made.push(makeFish(t, o, now, i));
    if (o.carry && made[0]) { const C = o.carry, f = made[0]; Object.assign(f, { name: C.name ?? f.name, seed: C.seed ?? f.seed, sex: C.sex ?? f.sex, traits: C.traits ?? f.traits, genes: C.genes ?? f.genes, gen: C.gen ?? 0, parents: C.parents ?? [], raisedAs: C.raisedAs ?? undefined, born: Math.min(now, C.born ?? now), from: { tank: C.fromTank, by: C.by } }); f.stage = stageOf(f, now); f.fedAt = now; f.ail = 0;
      const mo = morphOf(f); ev.push({ journal: `${f.name} has arrived from ${C.fromTank}, sent by ${C.by}: ${mo ? `a ${MORPHS[mo].label.toLowerCase()} ` : 'a '}${d.label.toLowerCase()} bred there.`, toast: `${f.name} arrived from ${C.fromTank}!`, arrival: [f.id], story: f.id, text: `Came from ${C.fromTank}, sent by ${C.by}.` }); if (!t.seen.fish.includes(o.species)) t.seen.fish.push(o.species); continue; }      // an animal sent from a friend's tank: the same animal, with its genes, its parents and how it was raised
    if (o.giftFrom) for (const f of made) f.gift = { id: o.id, from: o.giftFrom, fromId: o.giftFromId ?? null, note: o.giftNote ?? null, at: now, ...(o.surprise ? { wrapped: true } : {}) };
    if (o.giftFrom && o.surprise) { ev.push({ journal: `A gift from ${o.giftFrom} arrived for ${o.ownerName}. It is still wrapped.`, toast: `A gift from ${o.giftFrom} has arrived for ${o.ownerName}!`, giftArrived: { for: o.owner } }); continue; }      // wrapped: nothing says what is inside
    ev.push({ journal: o.giftFrom ? `${made[0].name} the ${d.label.toLowerCase()} has arrived, a gift from ${o.giftFrom} to ${o.ownerName}.` : d.count === 1 ? `${made[0].name} the ${d.label.toLowerCase()} has arrived.` : `The ${d.label.toLowerCase()} school has arrived.`, toast: d.count === 1 ? `${made[0].name} has arrived!` : `Your ${d.label.toLowerCase()}s have arrived!`, arrival: made.map((f) => f.id) });
  }
}
// An animal bred here can be sent to a friend's tank (by its code): one a day per caretaker, never an octopus or a school, never one that is
// guarding eggs or carrying young. It leaves with its genes, its parents' names and how it was raised, and arrives there within the hour.
export const SEND_GAP = DAY;
export function canSend(t, f, uid, now = Date.now()) { if (!f || f.dead || f.away || isOcto(f) || (SPECIES_DEF[f.species]?.count ?? 1) > 1 || SPECIES_DEF[f.species]?.visitor) return 'CANT_SEND'; if (!(f.parents?.length || f.bornHere) || f.from) return 'NOT_BRED_HERE'; if (f.owner && f.owner !== uid) return 'NOT_YOURS'; if (t.fish.filter((x) => !x.dead).length <= 1) return 'LAST_FISH';      /* (one that came from another tank stays: it is not passed on again) */
  if (f.preg || f.brood || (t.eggs ?? []).some((e) => e.guard === f.id)) return 'BUSY'; if (now - ((t.flags.sentAt ?? {})[uid] ?? -Infinity) < SEND_GAP) return 'TOO_SOON'; return null; }
export function sendOut(t, id, uid, name, toTank, now = Date.now()) { const f = t.fish.find((x) => x.id === id), why = canSend(t, f, uid, now); if (why) return { ok: false, reason: why };
  t.fish.splice(t.fish.indexOf(f), 1); (t.flags.sentAt ||= {})[uid] = now; for (const o of t.fish) unlink(o, f.id); if (t.match && (t.match.a === f.id || t.match.b === f.id)) t.match = null; const mo = morphOf(f);
  const carry = { name: f.name, seed: f.seed, sex: f.sex, traits: f.traits, genes: f.genes ?? genesOf(f.seed), gen: f.gen ?? 1, parents: (f.parents ?? []).map((p) => ({ id: p.id, name: p.name })), raisedAs: f.raisedAs, born: f.born, fromTank: null, by: name };      // (its friends stay behind: ids mean nothing in another tank)
  bump(t, 'sent'); return { ok: true, carry, species: f.species, events: [{ journal: `${name} sent ${f.name}${mo ? ` the ${MORPHS[mo].label.toLowerCase()}` : ''} to ${toTank}. It will grow up there.`, activity: { type: 'sent', text: `${name} sent ${f.name} to ${toTank}.` } }] }; }
// Chapters: quiet landmarks in the life of a tank. They pay nothing, so they cannot be farmed; they are a page in the journal and a moment to notice.
// A small gift for every caretaker, once a day. No streak, nothing to catch up on: miss a day and nothing is lost or owed. It goes into the shared wallet.
export const DAILY_GIFT = 6;      // (comes with the day's mystery; it stands in for what feeding and cleaning used to pay)
// feeding a hungry animal pays one shell once a day for the tank (the care itself is the point; it is not a shell tap)
const giftKey = (now, tz) => Math.floor((now + Math.max(-840, Math.min(840, Math.round(+tz) || 0)) * 60e3) / DAY);
export function giftReady(t, uid, now = Date.now(), tz = 0) {
  if ((t.flags?.tut ?? 0) < 5 || !t.fish?.length) return false;
  const last = t.flags?.gift?.tank; return !last || (last.key !== giftKey(now, tz) && now - last.at >= 20 * HOUR);      // a new local day AND at least 20 hours, so changing the phone's clock or zone cannot claim twice
}
export const CHAPTERS = [
  { key: 'day1', title: 'Day One', text: 'A whole day of fish and water. The tank has found its rhythm.', when: (t, now) => now - t.createdAt >= 86400e3 },
  { key: 'crew', title: 'A Small Crew', text: 'Three fish now share the water.', when: (t) => t.fish.length >= 3 },
  { key: 'week', title: 'A Week Together', text: 'Seven days. This is starting to feel like home.', when: (t, now) => now - t.createdAt >= 7 * 86400e3 },
  { key: 'octo', title: 'Eight Arms Aboard', text: 'An octopus lives here now, and it has opinions.', when: (t) => t.fish.some((f) => f.species === 'octopus') },
  { key: 'reef', title: 'A Little Reef', text: 'Five kinds of fish. It is getting crowded in a good way.', when: (t) => new Set(t.fish.map((f) => f.species)).size >= 5 },
  { key: 'grown', title: 'All Grown Up', text: 'A fish has grown up in your care.', when: (t) => t.fish.some((f) => f.stage === 'adult') },
  { key: 'busy', title: 'A Busy Tank', text: 'Ten fish. Someone is always up to something.', when: (t) => t.fish.length >= 10 },
  { key: 'month', title: 'A Month of Water', text: 'Thirty days of looking after each other.', when: (t, now) => now - t.createdAt >= 30 * 86400e3 },
];
function chapters(t, now, ev) {
  const done = (t.flags.chapters ||= []);
  if (!t.flags.chV) { t.flags.chV = 1; for (const c of CHAPTERS) if (c.when(t, now) && !done.includes(c.key)) done.push(c.key); return; }          // a tank saved before chapters existed: record what is already true, say nothing
  for (const c of CHAPTERS) if (!done.includes(c.key) && c.when(t, now)) { done.push(c.key); ev.push({ journal: `Chapter: ${c.title}. ${c.text}`, chapter: { key: c.key, title: c.title, text: c.text } }); }
}
function milestones(t, now, ev) {
  chapters(t, now, ev);
  const n = t.seen.fish.length + t.seen.decor.length, due = Math.floor(n / 5);
  while ((t.flags.collMs ?? 0) < due) { t.flags.collMs++; t.shells += 3; ev.push({ journal: `The Field Guide lists ${t.flags.collMs * 5} species and decorations.`, toast: `Field Guide: ${t.flags.collMs * 5} found! +3 shells` }); }
  const w = WISHES[t.wishIdx]; if (w && w.done(t)) { t.wishIdx++; t.shells += w.reward; ev.push({ journal: `The tank's wish came true: ${w.text.toLowerCase()}.`, toast: `Tank wish complete! +${w.reward} shells`, wish: true }); }
}

// `empty` is a brand new tank: no fish at all until its first caretaker chooses one in the opening.
export function newWorld(now = Date.now(), seed = 1, { empty = false } = {}) {
  return {
    style: { floor: 'sand', backdrop: 'candy' }, shells: 20, hunger: 0.55, orders: [], drift: null, driftAt: now + 20 * 60e3, wishIdx: 0, water: 1, glass: 0, level: 1, createdAt: now, simTs: now, seq: 10, flags: { tut: 0, growV: 2, firsts: empty ? {} : { me: true }, starter: { fern: 1, grass: 1, rock: 1, starfish: 1, moss: 1 } },
    fish: empty ? [] : [{ id: 'f1', name: 'Pip', species: 'goldfish', seed: 1 + (seed % 5), born: now, stage: 'baby', traits: ['Curious', 'Social'], happy: 0.75, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' }],
    decor: [],
    seen: { fish: empty ? [] : ['goldfish'], decor: [] },
  };
}

// Time passing. Bounded, so a long absence never punishes: hunger tops out at 85%, water bottoms at 45%.
// Every step of time passing runs on its own: if one of them ever hits something unexpected in a tank's data, the others still happen. A fish order must never wait forever because of an unrelated problem.
const guard = (name, fn) => { try { fn(); } catch (e) { if (!guard.seen.has(name)) { guard.seen.add(name); console.error('time step failed:', name, e); } } };
guard.seen = new Set();
export const timeStepErrors = () => [...guard.seen];      // shown on the developer page so a stuck tank is easy to spot
function _advance(t, now = Date.now()) {
  NOW = now; norm(t, now); const ev = [], dt = Math.max(0, (now - t.simTs) / 1000);
  const t0 = t.simTs, pre = new Map(t.fish.filter((f) => isOcto(f) && !f.away).map((f) => [f.id, [f.ail ?? 0, f.health ?? 1]]));      // (an octopus that leaves partway through: only its time in the tank counts against it)
  guard('seahorses', () => seaFamilies(t, now, ev)); guard('octopals', () => octoPartners(t, now, ev));      // first: a birth that was due while nobody looked happens on its day, before the time away is counted against anyone's health
  if (dt >= 1) {
    const h0 = t.hunger, w0 = t.water, oh0 = new Map();
    t.hunger = Math.min(Math.max(t.hunger, 0.85), t.hunger + dt * HR);
    for (const f of t.fish) if (ownHungry(f) && !f.away) { ensureFish(f); oh0.set(f.id, f.hunger); f.hunger = Math.min(Math.max(f.hunger, 0.9), f.hunger + dt * OHR); }
    t.water = Math.max(Math.min(t.water, 0.45), t.water - dt * WR * (1 + 0.5 * Math.min(2, t.floaters.length)));   // a fish left floating fouls the water faster
    t.glass = Math.min(Math.max(t.glass, 0.8), t.glass + dt * GR);
    guard('tend', () => tendFish(t, dt, now, ev, h0, w0, oh0)); t.simTs = now;
  }
  guard('growth', () => {
    for (const f of t.fish) {                                          // growth milestones
      const s = stageOf(f, now);
      if (s !== f.stage) {
        f.stage = s;
        const helpers = Object.values(t.care ?? {}).filter((c) => now - c.ts < 24 * HOUR).map((c) => c.name), crew = helpers.length ? { activity: { type: 'grow', text: `${helpers.join(' and ')} helped ${f.name} grow up.`, noUser: true } } : {};
        if (s === 'juvenile') { t.shells += 1; f.grewPay = (f.grewPay ?? 0) + 1; ev.push({ journal: `${f.name} is growing up.`, grew: f.id }, ...(helpers.length ? [crew] : [])); }
        if (s === 'adult' && (f.hatched || f.bornHere)) bump(t, 'grewHere');
        if (s === 'adult' && f.hatched) { const P = (f.parents ?? []).map((p) => t.fish.find((x) => x.id === p.id && !x.dead)).filter(Boolean); if (P.length) ev.push({ journal: `${f.name} is all grown up, with ${P.map((x) => x.name).join(' and ')} close by. The whole family, together.`, hist: 'family', story: f.id, text: 'All grown up, with family close by.' }); }      // a family photo
        if (s === 'adult') { t.shells += 2; f.grewPay = (f.grewPay ?? 0) + 2; ev.push({ journal: `${f.name} reached adulthood.`, toast: `${f.name} is an adult! +2 shells`, grew: f.id}, ...(helpers.length ? [crew] : [])); raised(t, f, now, ev); for (const pa of f.parents ?? []) if (pa?.id && t.fish.some((x) => x.id === pa.id)) ev.push({ story: pa.id, text: `${f.name}, one of its young, is all grown up.` }); }
      }
    }
  });
  guard('dayone', () => { for (const f of t.fish) { if (!f.hatched || f.dayOne || f.dead || now - f.hatched < 20 * HOUR) continue; f.dayOne = now; if (now - f.hatched > 3 * DAY) continue;      /* its first day: a line about how it is doing, from what is true */
    const par = (f.parents ?? []).map((p) => t.fish.find((x) => x.id === p.id && !x.dead)).filter(Boolean)[0], twin = t.fish.find((x) => x !== f && x.hatched && Math.abs(x.hatched - f.hatched) < HOUR && !x.dead);
    const line = twin && f.id > twin.id ? null : `${f.name}'s first day: ${twin ? `${f.name} and ${twin.name} have grown a little, and` : 'it has grown a little, and'} ${par ? `stay${twin ? '' : 's'} close to ${par.name} wherever ${par.name} goes` : `${twin ? 'are' : 'is'} exploring the plants`}.`;
    if (line) ev.push({ journal: line, story: f.id, text: line }); } });
  guard('deliver', () => deliver(t, now, ev));
  guard('age', () => ageMilestones(t, now, ev));
  guard('drift', () => { if (!t.drift && now >= t.driftAt && now - (t.createdAt ?? now) < 2 * DAY) {      /* (after the first days, finds come as the daily mystery) */ t.drift = makeDrift(t, now); ev.push({ found: t.drift.id, toast: `${driftBlame(t.drift)} Tap it in the tank.` }); } });
  guard('puzzles', () => puzzles(t, now, ev)); guard('hunts', () => hunts(t, now, ev)); guard('adventures', () => { adventures(t, now, ev, ADVR); for (const f of t.fish) { const p = pre.get(f.id); if (!p || !f.away || f.away.at <= t0 || now <= t0) continue; const k = Math.min(1, (f.away.at - t0) / (now - t0)); f.ail = p[0] + ((f.ail ?? 0) - p[0]) * k; f.health = p[1] + ((f.health ?? 1) - p[1]) * k; } }); guard('life', () => { const d0 = t.life?.day; lifeDay(t, now, ev, ADVR); if (t.life?.day !== d0 && (d0 != null || now - (t.createdAt ?? now) < DAY)) historyDay(t, now, ev, ADVR); });      /* (a brand-new tank gets its day 1 capsule on day 1) */ guard('visitors', () => visitors(t, now, ev)); guard('eggs', () => eggs(t, now, ev)); guard('want', () => rollWant(t, now, ev)); guard('daily', () => rollDaily(t, now)); guard('mystery', () => rollMystery(t, now)); guard('dilemma', () => rollDilemma(t, now, ev)); guard('layout', () => layoutDay(t, now, ev)); guard('goals', () => goals(t, now, ev)); guard('theme', () => themeCheck(t, now, ev));
  guard('birthday', () => { const weeks = Math.floor((now - t.createdAt) / (7 * DAY)); if (weeks > (t.flags.weeks ?? 0)) { t.flags.weeks = weeks; if (weeks === 4) ev.push({ journal: 'Our tank is one month old.' }); else if (weeks % 52 === 0) ev.push({ journal: `Our tank is ${weeks / 52} year${weeks > 52 ? 's' : ''} old.` });      /* (only the real milestones: a month, then each year) */ } });   // a birthday every week of the tank's life; missing a week costs nothing
  if (dt >= 1) guard('discover', () => discover(t, now, ev));
  guard('wish', () => checkWant(t, now, ev));
  guard('level', () => levelCheck(t, now, ev));
  return ev;
}
// A fish earns these by growing up here: age counts from its arrival, and a run-down fish stops ageing (growth pauses), so only well-kept days count.
const annivFacts = (t, f) => { const s = historyFacts(t, f); return s ? s + '.' : ''; };
function historyFacts(t, f) { const out = [], k = (t.keeps ?? []).find((q) => q.id === f.advMem?.fav) ?? (t.keeps ?? []).find((q) => q.by === f.id), pal = t.fish.find((x) => x.id === f.pal); if (k) out.push(`It keeps the ${KEEPSAKES[k.k]?.label.toLowerCase()} it found`); if (pal) out.push(`${k ? 'and it' : 'It'} is best friends with ${pal.name}`); return out.join(' '); }
function ageMilestones(t, now, ev) {
  for (const f of t.fish) {
    f.found ||= []; const days = (now - Math.max(f.born, f.arrived ?? -Infinity)) / DAY;      /* (counted from the day it came to this tank: a fish bought nearly grown starts at zero) */
    for (const [d, pay] of AGE_REWARDS) { const key = 'age' + d; if (days < d || f.found.includes(key)) continue; f.found.push(key); t.shells += pay; ev.push({ journal: d === 30 ? `${f.name} is 30 days old. ${annivFacts(t, f)}`.trim() : `${f.name} is ${d} days old.`, anniv: d === 30 ? 30 : undefined, ...(d >= 30 ? { toast: `${f.name} is ${d} days old. +${pay} shells` } : {}), milestone: f.id }); }      /* (the small birthdays go in the journal; a month or more is worth a toast) */
  }
}
function levelCheck(t, now, ev) {
  milestones(t, now, ev);
  const lv = levelFor(scoreOf(t, now));
  if (lv > t.level) { const bonus = 3 + lv; t.level = lv; t.shells += bonus; ev.push({ journal: `Our tank reached level ${lv}.`, toast: `Tank level ${lv}! +${bonus} shells`, levelUp: lv }); }
}
const nextId = (t, p) => p + (t.seq = (t.seq ?? 10) + 1);
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
const num = (v) => (Number.isFinite(+v) ? +v : NaN);

// Apply one player action. Mutates `t`; returns { ok, reason?, events[], delta? }.
// ── each fish's own story: the moments that happened to it, in order, kept on its card and in its memorial ──
const STORY_KEYS = ['grew', 'noticed', 'discovery', 'milestone', 'wishDone', 'puzzle', 'crab'];
function recordStory(t, ev, now) {
  for (const e of ev) {
    if (e.story && e.text) { const f = t.fish.find((x) => x.id === e.story); if (f) { f.story ||= []; if (!f.story.some((x) => x.text === e.text)) { f.story.push({ at: now, text: e.text }); if (f.story.length > 14) f.story.splice(1, f.story.length - 14); } } continue; }
    const ids = new Set(); for (const k of STORY_KEYS) if (typeof e[k] === 'string') ids.add(e[k]); for (const id of e.arrival ?? []) ids.add(id);
    for (const id of ids) { const f = t.fish.find((x) => x.id === id); if (!f) continue; const text = (e.arrival && e.arrival.includes(id) ? `Arrived in the tank` : e.journal) ?? null; if (!text) continue; f.story ||= []; if (f.story.some((x) => x.text === text)) continue; f.story.push({ at: now, text }); if (f.story.length > 14) f.story.splice(1, f.story.length - 14); }
  }
}
// what is next on the calendar, in plain words, for the end of a day
// two different people looking after the tank on the same day: the tank glows that evening
function teamCare(t, uid, name, now, ev) {
  const d = Math.floor(now / DAY); if (t.careDay?.d !== d) t.careDay = { d, by: {} }; t.careDay.by[uid] = name;
  const who = Object.values(t.careDay.by); if (who.length >= 2 && t.teamDay !== d) { t.teamDay = d; t.glowUntil = Math.max(t.glowUntil ?? 0, now + 12 * HOUR); ev.push({ journal: `${who.slice(0, 2).join(' and ')} both looked after the tank today.`, teamGlow: true });      /* (the glow itself says it: no toast every day) */ }
}
// ── A small surprise with the day's first feeding ── something real happens, different each day (worked out from the day, so every phone agrees)
function dailySurprise(t, now, ev) {
  const d = Math.floor(now / DAY); if (t.surpriseDay === d) return; t.surpriseDay = d;
  const live = t.fish.filter((f) => !f.dead && !f.nursery), fish = live.filter((f) => f.species !== 'octopus'), r = (k) => hash32(d * 31 + k + (t.seq ?? 0)), pick = (a, k) => a[r(k) % a.length], opts = [];
  const young = fish.filter((f) => stageOf(f, now) !== 'adult'), lonely = fish.filter((f) => !f.pal), octo = live.find((f) => f.species === 'octopus' && stageOf(f, now) !== 'baby'), seas = fish.filter((f) => f.species === 'seahorse');
  if (young.length) opts.push(() => { const f = pick(young, 1); (f.raise ||= {}).meals = (f.raise.meals ?? 0) + 1; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.08); return { f, text: `${f.name} ate its biggest meal yet and did a happy little wiggle.` }; });
  if (lonely.length >= 2) opts.push(() => { const a = pick(lonely, 2), b = lonely.filter((x) => x !== a && x.species === a.species)[0] ?? lonely.find((x) => x !== a); a.pal ??= b.id; b.pal ??= a.id; (a.disc ||= {}).friend ??= now; (b.disc ||= {}).friend ??= now; return { f: a, text: `${a.name} and ${b.name} shared the first flakes, and now they swim side by side. Friends!` }; });
  if (octo) opts.push(() => { octo.happy = Math.min(1, (octo.happy ?? 0.7) + 0.05); return { f: octo, text: `${octo.name} shot up and snatched the first pinch of food before anyone else could.` }; });
  if (seas.length) opts.push(() => { const f = pick(seas, 3); return { f, text: `${f.name} snicked a flake right out of the water with a flick of its snout.` }; });
  if (fish.length) opts.push(() => { const f = pick(fish, 4); (f.disc ||= {}).glass ??= now; return { f, text: `${f.name} came right up to the glass to watch you feed.` }; });
  if (fish.length >= 3) opts.push(() => { const f = pick(fish, 5); return { f, text: `${f.name} led the whole tank in a little parade to the food.` }; });
  if (!opts.length) return; const o = pick(opts, 6)(); ev.push({ story: o.f.id, text: o.text, surprise: { fish: o.f.id, text: o.text } });      /* (the surprise has its own card in the tank: no toast as well) */      // (in that fish's own story, not the tank's journal: feeding stays quiet there)
}
// ── Growing up shaped by care ── a young fish that was fed often grows up content; one that was played with a lot grows up bold
// How you raise a young one decides who it grows up to be. Each kind of attention while it is small counts (once an hour, twice a day at most): petting
// makes it bold, games make it playful, chasing the light or the bubbles, hidden treats and puzzles make it curious, being fed every day makes it calm; left to itself it grows up shy.
const RAISE = [['pets', 8, 'Brave', (f) => `All that attention made ${f.name} bold: it grew up Brave.`], ['play', 6, 'Playful', (f) => `All those games: ${f.name} grew up Playful.`], ['seek', 4, 'Curious', (f) => `All that chasing and hunting about made ${f.name} grow up Curious.`], ['days', 8, 'Calm', (f) => `Well fed every day while it grew, ${f.name} grew up Calm and content.`]];
export function raiseLean(f) { const R = f?.raise ?? {}, n = (k) => (k === 'days' ? (R.days ?? []).length : R[k] ?? 0); const sc = RAISE.map(([k, need, tr, line]) => ({ k, tr, line, n: n(k), need, r: n(k) / need })).sort((a, b) => b.r - a.r); const top = sc[0];
  if (top.r >= 1) return top; if (sc.every((x) => x.n === 0) || (n('pets') + n('play') + n('seek') === 0 && n('days') < 2)) return { k: 'none', tr: 'Shy', line: (x) => `Left mostly to itself, ${x.name} grew up Shy.`, n: 0, r: 1 }; return { ...top, pending: true }; }
function raised(t, f, now, ev) {
  const L = raiseLean(f), tr = f.traits ?? []; delete f.raise; if (L.pending) return;
  if (tr.includes(L.tr)) { f.raisedAs = L.tr; bump(t, 'raised_' + L.tr); const line = `${f.name} grew up ${L.tr}, as it always was, and more so for the way you raised it.`; ev.push({ journal: line, story: f.id, text: line }); return; }      /* (raised the way it already leaned: it still counts as raised) */
  const opp = { Brave: 'Shy', Shy: 'Brave', Playful: 'Lazy', Calm: 'Playful' }[L.tr]; f.traits = [...tr.filter((x) => x !== opp), L.tr].slice(-3); f.raisedAs = L.tr; bump(t, 'raised_' + L.tr); const line = L.line(f);
  ev.push({ journal: line, story: f.id, text: line, toast: `${f.name} grew up ${L.tr.toLowerCase()}, the way you raised it.` });
}
// raising: what you did with a young one counts toward who it becomes, once it really happened (a refused or empty action counts for nothing).
// A ball game makes it playful; chasing the light spot or the bubbles, hunting a hidden treat or working at a puzzle make it curious.
function raiseFrom(t, a, now) { const kind = a.t === 'play' ? (['light', 'bubbles'].includes(a.toy) ? 'seek' : 'play') : { hide: 'seek', puzzle: 'seek' }[a.t]; if (!kind) return;
  const ids = [a.id, ...(Array.isArray(a.fish) ? a.fish : [a.fish])].filter((x) => typeof x === 'string').slice(0, 10); for (const id of new Set(ids)) { const yf = t.fish.find((f) => f.id === id && !f.dead); if (yf) raiseNote(t, now, kind, yf); } }      /* (a toy game names everyone who joined in) */
function raiseNote(t, now, kind, f = null) { const d = Math.floor(now / DAY), hr = Math.floor(now / HOUR); for (const x of f ? [f] : t.fish) { if (x.dead || stageOf(x, now) === 'adult') continue; const R = (x.raise ||= {}); if (kind === 'fed') { R.days ||= []; if (!R.days.includes(d)) R.days.push(d); continue; } const key = kind === 'pet' ? 'pets' : kind; R.at ||= {}; R.on ||= {}; if (R.at[key] === hr) continue; const dk = key + d; if ((R.on[dk] ?? 0) >= 2) continue; R.at[key] = hr; R.on = Object.fromEntries(Object.entries(R.on).filter(([k2]) => k2.endsWith(String(d)))); R.on[dk] = (R.on[dk] ?? 0) + 1; R[key] = (R[key] ?? 0) + 1; } }      /* (at most two of each kind a day count: a childhood is the whole ten days, not one afternoon of tapping) */
// ── Each fish's milestones ── one path for every fish, from the day it came home to raising young of its own
// ── An octopus learns to trust you ── slowly, from crabs and from time spent with it (each crab or play counts once): first it hides from you,
// then it watches you from its shell, then it comes to the glass when you look in, and at last it takes a crab from your fingers
export const OCTO_TRUST = [
  { at: 0, label: 'Hides from you', line: null },
  { at: 3, label: 'Watches you', line: (n) => `${n} has started watching you from its shell.` },
  { at: 8, label: 'Comes to the glass', line: (n) => `${n} comes to the glass when you look in now.` },
  { at: 15, label: 'Takes a crab from your hand', line: (n) => `${n} trusts you enough to take a crab from your fingers.` },
];
export function octoTrust(f, uid) { const b = f?.bond?.[uid] ?? 0, i = OCTO_TRUST.reduce((k, x, j) => (b >= x.at ? j : k), 0), nx = OCTO_TRUST[i + 1]; return { lvl: i, label: OCTO_TRUST[i].label, bond: b, next: nx ? { label: nx.label, need: nx.at - b } : null }; }
function trustStep(f, uid, was, ev) { if (f.species !== 'octopus') return; const now = octoTrust(f, uid).lvl; if (now > was && OCTO_TRUST[now].line) { const t = OCTO_TRUST[now].line(f.name); ev.push({ journal: t, toast: t, trust: { fish: f.id, lvl: now } }); } }
// ── What the animals would like in the tank ── a shy fish wants somewhere to hide, a seahorse a stem to hold, the octopus a shell to live under,
// a playful fish bubbles, a crowd of fish some plants. Each names who wants it and which decorations would do; it goes away once the tank has one.
const NEEDS = [
  { key: 'hide', has: ['rock', 'boulder', 'arch', 'pot', 'chest', 'wood', 'skull', 'coconut', 'brain'], types: ['rock', 'boulder', 'arch', 'pot'], who: (fs) => fs.find((f) => (f.traits ?? []).includes('Shy') && f.species !== 'octopus'), text: (n) => `${n} would like somewhere to hide.`, done: (n, d) => `${n} found a hiding place by the new ${d}.` },
  { key: 'stem', has: ['grass', 'kelp', 'sword', 'fern', 'bamboo', 'red'], types: ['kelp', 'grass', 'sword'], who: (fs) => fs.find((f) => f.species === 'seahorse'), text: (n) => `${n} needs a stem to wrap its tail round.`, done: (n, d) => `${n} wrapped its tail round the new ${d} straight away.` },
  { key: 'shell', has: ['coconut', 'pot'], types: ['coconut', 'pot'], who: (fs) => fs.find((f) => f.species === 'octopus'), text: (n) => `${n} would love a shell to hide under.`, done: (n, d) => `${n} has its eye on the new ${d}. A home at last.` },
  { key: 'bubbles', has: ['bubbler'], types: ['bubbler'], who: (fs) => fs.find((f) => (f.traits ?? []).includes('Playful')), text: (n) => `${n} would love some bubbles to play in.`, done: (n) => `${n} raced straight into the bubbles.` },
  { key: 'plants', has: null, types: ['grass', 'fern', 'kelp'], who: (fs) => (fs.filter((f) => f.species !== 'octopus').length >= 3 ? fs.find((f) => f.species !== 'octopus') : null), text: () => 'The fish would like some plants to swim through.', done: () => 'The fish are weaving through the new plants.' },
];
export function tankNeeds(t, now = Date.now()) {
  const fs = t.fish.filter((f) => !f.dead && !f.nursery && stageOf(f, now) !== 'baby'), types = new Set(t.decor.map((d) => d.type)), out = [];
  for (const N of NEEDS) { const have = N.has ? N.has.some((x) => types.has(x)) : t.decor.some((d) => DECOR_DEF[d.type]?.cat === 'PLANTS'); if (have) continue; const f = N.who(fs); if (!f) continue; out.push({ key: N.key, fish: f.id, name: f.name, text: N.text(f.name), types: N.types }); }
  return out.slice(0, 2);
}
function needsMet(t, before, type, now, ev) { const after = new Set(tankNeeds(t, now).map((n) => n.key)); for (const n of before) { if (after.has(n.key)) continue; const N = NEEDS.find((x) => x.key === n.key), f = t.fish.find((x) => x.id === n.fish); if (f) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.12); const line = N.done(n.name, (DECOR_DEF[type]?.label ?? type).toLowerCase()); ev.push({ journal: line, toast: line }); } }
export function milestonesOf(f) {
  const D = f.disc ?? {}, hatched = (f.parents ?? []).length > 0, grown = stageOf(f) === 'adult';
  return [
    { key: 'home', icon: hatched ? '🥚' : '🏠', label: hatched ? 'Hatched' : 'Came home', done: true },
    { key: 'friend', icon: '💞', label: 'Made a friend', done: !!(f.pal || f.mate || f.partner || D.friend || D.together || Object.keys(D).some((k) => k.startsWith('together'))) },
    { key: 'spot', icon: '📍', label: 'Found a favorite spot', done: !!(D.spot || D.regular || D.hideaway || D.favhitch || D.den || (f.found ?? []).includes('spot')) },
    { key: 'trust', icon: '🤝', label: 'Trusts you', done: !!(D.bond || D.trust) },
    { key: 'trick', icon: '✨', label: 'Learned a trick', done: (f.tricks ?? []).length > 0 || !!(f.solved) },
    { key: 'grown', icon: '🌟', label: 'All grown up', done: grown },
    { key: 'parent', icon: '👪', label: 'Became a parent', done: !!D.parent },
  ];
}
// everything coming up, soonest first, as short lines with when
export function forecast(t, now = Date.now(), n = 3) {
  const c = [], nm = (id, sn) => t.fish.find((f) => f.id === id)?.name ?? sn?.name;
  for (const e of t.eggs ?? []) if (!e.ready) { const pa = e.pa ?? t.fish.find((f) => f.id === e.a), pb = e.pb ?? t.fish.find((f) => f.id === e.b), o = pa && pb ? Object.entries(morphOdds(pa, pb, !!e.moon)).sort((x, y) => y[1] - x[1])[0] : null; c.push([e.hatchAt - now, `${nm(e.a, e.pa) && nm(e.b, e.pb) ? `${nm(e.a, e.pa)} & ${nm(e.b, e.pb)}'s eggs are` : 'The eggs are'} ready to hatch${o ? ` (${Math.round(o[1] * 100)}% ${MORPHS[o[0]].label.toLowerCase()})` : ''}`, '🥚']); }
  for (let d = 0; d <= 4; d++) { const at = now + d * DAY; if (skyOf(at).event?.key === 'fullmoon') { c.push([Math.max(1, at - now), d ? 'Full moon: eggs laid under it have better odds of a rare color' : 'Full moon tonight: eggs laid now have better odds of a rare color', '🌕']); break; } }      // a window that does not come back for a month
  for (const f of t.fish) if (f.preg && !f.preg.ready && !f.dead) c.push([f.preg.due - now, f.preg.due - now > DAY ? `${f.name} is expecting: the babies are born` : `${f.name}'s babies are born`, '🌿', f]);
  for (const [k, ms] of Object.entries(t.bonds ?? {})) { if (ms < 0.4 * SEA.PAIR_DAYS * DAY) continue; const [a, b] = k.split('|').map((id) => t.fish.find((f) => f.id === id && !f.dead)); if (a && b && !a.mate && !b.mate) c.push([SEA.PAIR_DAYS * DAY - ms, `${a.name} and ${b.name} are getting close: they may pair up`, '💞', a]); }      // (the pairing clock: a seahorse pair forming)
  if (t.nursery?.readyAt > now) c.push([t.nursery.readyAt - now, 'The nursery babies are ready to choose', '🍼']);
  for (const o of t.orders ?? []) c.push([o.arrivesAt - now, o.surprise ? `A gift for ${o.ownerName ?? 'a friend'} arrives` : `${o.name || (SPECIES_DEF[o.species]?.label ?? 'A new fish')} arrives`, o.surprise ? '🎁' : '📦']);
  for (const f of t.fish) { const s = nextStage(f, now); if (s && !f.dead) c.push([s.ms, s.to === 'adult' ? `${f.name} turns 3 days old and becomes an adult` : `${f.name} turns 1 day old and becomes a youngster`, '🌱', f]); }      // (what really happens, not just "grows up")
  for (const f of t.fish) if (f.species === 'octopus' && !f.dead && f.puzzleAt != null && now - f.puzzleAt < PUZZLE_GAP) c.push([PUZZLE_GAP - (now - f.puzzleAt), `${f.name} is ready for a new puzzle`, '🧩', f]);
  if (t.surpriseDay !== Math.floor(now / DAY) && t.fish.some((f) => !f.dead)) c.push([1, "Today's surprise is waiting: feed the fish", '🎁']);
  c.sort((a, b) => a[0] - b[0]);
  const when = (ms) => ms <= 60e3 ? 'now' : ms < 3600e3 ? `in ${Math.max(1, Math.round(ms / 60e3))} min` : ms < 20 * 3600e3 ? `in ${Math.round(ms / 3600e3)} h` : ms < 40 * 3600e3 ? 'tomorrow' : `in ${Math.round(ms / DAY)} days`;
  const away = advForecast(t).map((x) => ({ ms: 0, text: x.text, icon: x.icon, when: '' }));
  for (const f of t.fish) if (f.preg?.ready && !f.dead) away.unshift({ ms: 0, text: `${f.name} is about to give birth: stay and watch`, icon: '🌿', when: 'now' });
  for (const e of t.eggs ?? []) if (e.ready) away.unshift({ ms: 0, text: `${nm(e.a, e.pa) && nm(e.b, e.pb) ? `${nm(e.a, e.pa)} & ${nm(e.b, e.pb)}'s eggs are` : 'The eggs are'} ready to hatch: stay and watch`, icon: '🥚', when: 'now' });      // (ready: no clock, it waits for you)      /* (an octopus out exploring: no time, nobody should be waiting on a clock) */
  return [...away, ...c.filter((x) => x[0] > 0 && x[0] <= (x[2] === '🌿' ? 10 * 24 : x[2] === '💞' ? 48 : x[2] === '🌕' ? 96 : x[2] === '🥚' && /ready to hatch/.test(x[1]) ? 72 : 8) * 3600e3).slice(0, n)      /* (what is coming soon: the next eight hours; a day ahead for an egg; a whole pregnancy; a pair forming) */.map(([ms, text, icon, f]) => ({ ms, text, icon, when: when(ms), ...(f ? { fish: f.id, species: f.species, pal: f.pal } : {}) }))].slice(0, n);      // (about an animal: the card shows that animal itself)
}
export function nextUp(t, now = Date.now()) {
  const c = [];
  for (const o of t.orders ?? []) c.push([o.arrivesAt - now, o.surprise ? 'A gift arrives' : `${o.name || (SPECIES_DEF[o.species]?.label ?? 'A new fish')} arrives`]);
  for (const e of t.eggs ?? []) c.push([e.hatchAt - now, 'An egg hatches']);
  for (const f of t.fish) { const n = nextStage(f, now); if (n) c.push([n.ms, `${f.name} grows up`]); }
  if (t.drift == null && t.driftAt > now && now - (t.createdAt ?? now) < 2 * DAY) c.push([t.driftAt - now, 'Something turns up in the tank']);
  if (!t.visitor && t.visitAt > now && (t.flags.tut ?? 0) >= 5) c.push([t.visitAt - now, 'A rare visitor may drop by']);
  c.sort((a, b) => a[0] - b[0]); const x = c.find((q) => q[0] > 0); if (!x) return 'Tomorrow brings a new request.';
  const h = Math.max(1, Math.round(x[0] / 3600e3)); return `${x[1]} ${h >= 20 ? 'tomorrow' : h <= 1 ? 'within the hour' : `in about ${h} hours`}.`;
}
export function applyAction(t, a, o) { const r = _applyAction(t, a, o); if (r?.ok && r.applied !== false) raiseFrom(t, a, o?.now ?? Date.now()); if (r?.ok && r.events && t.goal) { try { goals(t, o?.now ?? Date.now(), r.events); } catch { /* a goal never stops an action */ } }      // (a step finished by this very action is told at once)
  if (r?.events) { recordStory(t, r.events, o?.now ?? Date.now()); recordHistory(t, r.events, o?.now ?? Date.now()); } return r; }
export function advance(t, now = Date.now()) { const ev = _advance(t, now); recordStory(t, ev, now); recordHistory(t, ev, now); return ev; }
const AWAY_BLOCK = new Set(['observe', 'moment', 'feed', 'puzzle', 'hide', 'crab', 'sellFish', 'releaseOcto', 'octoTouch', 'octoMove', 'pet', 'train', 'play', 'octoMem', 'octoMemo', 'octoMoment', 'fishNote']);
// what adventures.js needs from here (passed in rather than imported back, so the two files never depend on each other at load time)
const ADVR = { OHR, get DECOR_DEF() { return DECOR_DEF; }, get SPECIES_DEF() { return SPECIES_DEF; }, isOcto, stageOf, ownHunger, ownHungry, lifeOf, octoMind, unlock: (...x) => unlock(...x), ensureFish: (...x) => ensureFish(...x), pending: (...x) => pending(...x), capacity: (...x) => capacity(...x), memCap: (...x) => memCap(...x), get KEEPSAKES() { return KEEPSAKES; }, get AIL_TIRED() { return AIL_TIRED; } };
function _applyAction(t, a, { name = 'Someone', now = Date.now(), dev = false, test = false, solo = false, uid = 'me', members = null } = {}) {
  const events = advance(t, now);
  const fail = (reason) => ({ ok: false, reason, events });
  const ok = (extra = {}) => ({ ok: true, events, ...extra });
  if (AWAY_BLOCK.has(a.t) && [a.id, a.fish, a.with].flat().filter((x) => typeof x === 'string').some((id) => t.fish.find((x) => x.id === id)?.away)) return fail('AWAY');      // (every animal the action names: one listed under another field once slipped through)      // an animal out on an adventure cannot be fed, played with, sold or let go until it is back
  switch (a.t) {
    case 'watchEggs': {      // someone has the tank open and is looking: ready eggs hatch now, in front of them
      const e = (t.eggs ?? []).find((x) => x.id === a.id) ?? (t.eggs ?? []).find((x) => x.ready), m = t.fish.find((f) => f.preg?.ready && !f.dead && (!a.id || f.id === a.id));
      if (e?.ready) { e.watch = now; e.watchBy = name; } else if (m) m.preg.watch = now; else return ok({ applied: false });      // (a seahorse father about to give birth is watched the same way)
      events.push(...advance(t, now)); return ok({ hatched: true });
    }
    case 'keepFry': {      // one more little one was still by the eggs: keep it too (or let it go with the others); the first answer decides
      const O = t.fryOffer; if (!O || O.id !== a.id) return fail('NOT_FOUND'); t.fryOffer = null; if (now > O.until) return ok({ applied: false, gone: true });
      if (!a.keep) { events.push({ journal: 'The last little larva drifted off after the others.' }); return ok({ keep: false }); }
      if (t.fish.length + pending(t) >= capacity(t.level) + BIRTH_ROOM) return fail('TANK_FULL');
      const { f } = makeChild(t, O.egg, now); morphBorn(t, f, now, events); bump(t, 'hatched'); f.hatched = O.at ?? now; const sib = t.fish.find((x) => x.id === O.first);
      events.push({ journal: `${name} kept one more: ${f.name}${sib ? `, ${sib.name}'s twin` : ''}, stays too.`, toast: `${f.name} stays too!`, arrival: [f.id], hatch: { egg: O.egg.id, fish: f.id, fry: 0, twin: true } });
      return ok({ keep: true, fish: f.id });
    }
    case 'visitorStay': { const r = decideStay(t, a, now, uid, name, ADVR); if (!r.ok) return fail(r.reason); events.push(...(r.events ?? [])); return ok({ applied: r.applied, keep: r.keep, fish: r.fish }); }      // a visitor that keeps coming back: let it stay, or let it wander (the first answer decides)
    case 'keepMove': { const k = (t.keeps ?? []).find((q) => q.id === a.id); if (!k) return fail('NOT_FOUND'); if (a.idk && k.h?.last === a.idk) return ok({ applied: false });      // the octopus carried or dropped a keepsake (the phone running the animals reports it, once per move)
      if (!moveKeep(t, a.id, num(a.x), num(a.z), now)) return fail('NOT_FOUND'); const f = t.fish.find((x) => x.id === a.fish && !x.dead && !x.away) ?? null; carried(t, k, f, a.how === 'drop' ? 'drop' : a.how === 'carry' ? 'carry' : 'move', now, events, ADVR); if (a.idk) k.h.last = String(a.idk).slice(0, 40); return ok(); }      // the octopus carried a keepsake (the phone running the animals reports it)
    case 'dailyGift': {
      if (!giftReady(t, uid, now, a.tz)) return ok({ applied: false, delta: 0 });
      (t.flags.gift ||= {}).tank = { key: giftKey(now, a.tz), at: now, by: uid }; if (Number.isFinite(+a.tz)) t.tzMin = Math.max(-840, Math.min(840, Math.round(+a.tz))); t.shells += DAILY_GIFT;      // one gift a day for the tank, for whoever opens it first
      events.push({ toast: `A little gift for you: +${DAILY_GIFT} shells`, gift: true }); levelCheck(t, now, events); return ok({ applied: true, delta: DAILY_GIFT });
    }
    case 'feed': {
      const food = FOODS[a.food] ? a.food : 'flakes', price = FOODS[food].price;
      if (food === 'crab' || food === 'mysis') {                       // a crab for an octopus, mysis for a seahorse: each has its own hunger, and only its own caretaker feeds it
        const kind = (x) => ownFood(x) === food && !x.away, mine = t.fish.filter((f) => kind(f) && canFeedOwn(f, uid, !solo)), f = (a.fish ? t.fish.find((x) => x.id === a.fish && kind(x) && !x.dead) : null) ?? mine.slice().sort((x, y) => ownHunger(y) - ownHunger(x))[0];
        if (!f) return fail(t.fish.some((x) => kind(x) && !x.dead) ? 'NOT_YOURS' : 'NOT_FOUND'); if (!canFeedOwn(f, uid, !solo)) return fail('NOT_YOURS');
        if (food === 'mysis' && t.nursery) t.nursery.fed = (t.nursery.fed ?? 0) + 1;      // (the nursery babies eat the shrimp too)
        ensureFish(f);
        if (f.hunger < 0.08) return ok({ applied: false, delta: 0, food, fish: f.id });
        f.fedAt = now;      /* (its own meal: it does not count as feeding the fish, and a full one is not fed at all) */
        const needed = f.hunger > 0.25, pay = 0;      // (feeding is care: no pay)
        f.hunger = Math.max(0, f.hunger - 0.5); t.shells += pay; f.fedBy = { uid, name, at: now };      // shown in the feed menu, so two caretakers do not feed back to back
         f.happy = Math.min(1, (f.happy ?? 0.7) + 0.08); f.bond ||= {}; const tw = octoTrust(f, uid).lvl; f.bond[uid] = (f.bond[uid] ?? 0) + 1; trustStep(f, uid, tw, events); unlock(t, f, 'food', now, events, { food });
        if (needed) { careEgg(t, now); raiseNote(t, now, 'fed'); dailySurprise(t, now, events); teamCare(t, uid, name, now, events); careBy(t, uid, name, now); progress(t, 'care', events, name); progress(t, 'care2', events, name, 'feed'); checkWant(t, now, events, { type: 'feed', food }); if (food === 'crab') { checkWant(t, now, events, { type: 'crab', id: f.id }); f.crabs = (f.crabs ?? 0) + 1; if (f.crabs === 1) events.push({ journal: `${f.name} caught its first crab.` }); } }      // a real meal is a crab caught: it counts towards the shells it keeps at its den
        dayCheck(t, now, events, 'care', needed); events.push({ activity: { type: 'feed', text: food === 'crab' ? `${name} fed ${f.name} a crab.` : `${name} fed ${f.name} mysis shrimp.` } });
        return ok({ applied: true, delta: pay, food, fish: f.id });
      }
      if (t.nursery) t.nursery.fed = (t.nursery.fed ?? 0) + 1;      // the babies eat with everyone else (no meter: just remembered for the nursery card)
      t.lastFed = now;                                                // any feeding, paid or not, counts as the fish being looked after
      { const lf = t.lastFeedBy; if (lf && lf.uid !== uid && now - lf.at < 90e3 && (t.flags.togetherAt == null || now - t.flags.togetherAt > 3 * HOUR) && (t.flags.tut ?? 0) >= 5 && t.fish.length) { t.flags.togetherAt = now; for (const f of t.fish) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.05); events.push({ journal: `${lf.name} and ${name} fed the fish together.`, toast: 'Fed together! The fish are delighted.', together: true }); } t.lastFeedBy = { uid, name, at: now }; }
      if (t.hunger < 0.08) return ok({ applied: false, delta: 0 });
      if (t.shells < price) return fail('NOT_ENOUGH_SHELLS');
      const needed = t.hunger > 0.25, pay = 0;
      t.shells -= price; t.hunger = Math.max(0, t.hunger - 0.3); t.fedBy = { uid, name, at: now, food }; t.water = Math.max(0.3, t.water - 0.005); t.shells += pay;
      if (needed) { careEgg(t, now); raiseNote(t, now, 'fed'); dailySurprise(t, now, events); teamCare(t, uid, name, now, events); careBy(t, uid, name, now); progress(t, 'care', events, name); progress(t, 'care2', events, name, 'feed'); }
      if (food !== 'flakes') for (const f of t.fish) { if ((food === 'crab') !== (f.species === 'octopus') || (FOODS[food].sea && f.species !== 'seahorse')) continue; const love = favFoodOf(f) === food; f.happy = Math.min(1, (f.happy ?? 0.7) + (love ? 0.1 : 0.03)); if (love) unlock(t, f, 'food', now, events, { food }); }
      if (needed) checkWant(t, now, events, { type: 'feed', food }); dayCheck(t, now, events, 'care', needed);
      events.push({ activity: { type: 'feed', text: food === 'flakes' ? `${name} fed the fish.` : food === 'crab' ? `${name} fed the octopus a crab.` : food === 'mysis' ? (() => { const hs = t.fish.filter((f) => f.species === 'seahorse' && !f.dead); return `${name} fed ${hs.length === 1 ? hs[0].name : 'the seahorses'} mysis shrimp.`; })() : `${name} fed the fish ${FOODS[food].label.toLowerCase()}.` } });
      return ok({ applied: true, delta: pay - price, food });
    }
    case 'water': {
      if (t.water >= 0.7) return ok({ applied: false, delta: 0 });
      t.water = 1; careEgg(t, now); teamCare(t, uid, name, now, events); t.shells += WATER_PAY; careBy(t, uid, name, now); progress(t, 'care', events, name); progress(t, 'care2', events, name, 'water'); checkWant(t, now, events, { type: 'water' }); dayCheck(t, now, events, 'care', true);
      events.push({ activity: { type: 'water', text: `${name} changed the water.` } });
      return ok({ applied: true, delta: WATER_PAY });
    }
    case 'glass': {
      if (t.glass <= 0.12) return ok({ applied: false, delta: 0 });
      t.glass = 0; t.flags.cleans = (t.flags.cleans ?? 0) + 1; const find = t.flags.cleans % 5 === 0, gain = find ? PEARL_PAY : GLASS_PAY; t.shells += gain;
      careBy(t, uid, name, now); { progress(t, 'care', events, name); progress(t, 'care2', events, name, 'glass'); checkWant(t, now, events, { type: 'glass' }); dayCheck(t, now, events, 'care', true); }
      events.push({ activity: { type: 'glass', text: `${name} cleaned the glass.` } });
      return ok({ applied: true, delta: gain });
    }
    case 'buyFish': {
      const d = SPECIES_DEF[a.species]; if (!d) return fail('UNKNOWN_SPECIES');
      if (t.level < d.level) return fail('LEVEL_TOO_LOW');
      if (t.fish.length + pending(t) + d.count > capacity(t.level)) return fail('TANK_FULL');
      const sp = specialOf(t, now), special = !!a.special && a.species === sp.species && a.species !== 'octopus', price = fishPrice(a.species, now, t, special);
      if (t.shells < price) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= price;
      const base = Math.abs(Math.floor(num(a.seed) || now)) % 100000, nm = cleanName(a.name);
      const to = a.to && a.to !== uid ? (members ?? []).find((m) => m.id === a.to) : null;                      // a gift: the fish is for a friend in the tank, who becomes its first caretaker
      t.orders.push({ id: nextId(t, 'o'), species: a.species, ...(special ? { carries: sp.color } : {}), ...(SPECIES_DEF[a.species].count === 1 && (a.sex === 'm' || a.sex === 'f') ? { sex: a.sex } : {}),      /* (any single fish can be chosen male or female: so a pair can be completed) */  name: nm, seed: base, paid: price, by: name, owner: to ? to.id : uid, ownerName: to ? to.name : name, giftFrom: to ? name : null, ...(to ? { giftFromId: uid, giftNote: String(a.note ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) || null, surprise: a.surprise !== false } : {}), at: now, arrivesAt: now + (a.rush && dev ? 0 : d.wait * 60e3) });
      events.push({ activity: { type: 'fish', text: to ? (a.surprise !== false ? `${name} sent ${to.name} a surprise gift.` : `${name} ordered a ${d.label.toLowerCase()} as a gift for ${to.name}.`) : `${name} ordered a new fish.` },      /* (a surprise says nothing of what it is, anywhere, until it is opened) */ toast: `On its way! Arrives in about ${d.wait >= 60 ? Math.round(d.wait / 60) + 'h' : d.wait + ' min'}.` });
      deliver(t, now, events); levelCheck(t, now, events);
      return ok({ ordered: true, wait: d.wait });
    }
    case 'nameFish': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND');
      const nm = cleanName(a.name); if (!nm) return fail('BAD_NAME');
      const old = f.name; f.name = nm; f.named = true; events.push({ activity: { type: 'fish', text: `${name} renamed ${old} to ${nm}.` } }); return ok();
    }
    case 'buyDecor': {
      const d = DECOR_DEF[a.type]; if (!d) return fail('UNKNOWN_ITEM'); if (d.earned) return fail('EARNED_ONLY');
      const x = num(a.x), z = num(a.z), ry = num(a.ry) || 0;
      if (!(x >= BOUNDS.x[0] && x <= BOUNDS.x[1] && z >= BOUNDS.z[0] && z <= BOUNDS.z[1])) return fail('OUT_OF_BOUNDS');
      if (t.level < d.level) return fail('LEVEL_TOO_LOW');
      if (t.decor.length >= MAX_DECOR) return fail('TANK_CROWDED');
      const gift = a.free && (t.flags.starter?.[a.type] ?? 0) > 0, free = gift || (a.free && t.flags.freePlant > 0 && d.cat === 'PLANTS');   // the starter pack, or the tutorial's free plant
      if (!free && t.shells < d.price) return fail('NOT_ENOUGH_SHELLS');
      const needs0 = tankNeeds(t, now); if (gift) t.flags.starter[a.type]--; else if (free) t.flags.freePlant = 0; else t.shells -= d.price;
      const item = { id: nextId(t, 'd'), type: a.type, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2), at: now, paid: free ? 0 : d.price };      /* (what it cost: a free one sells for nothing) */ t.decor.push(item); if (!t.seen.decor.includes(a.type)) t.seen.decor.push(a.type);
      if (d.cat === 'PLANTS') progress(t, 'plant', events, name);
      events.push({ activity: { type: 'decor', text: `${name} added ${/^[aeiou]/i.test(d.label) ? 'an' : 'a'} ${d.label.toLowerCase()}.` }, placed: item.id });
      needsMet(t, needs0, a.type, now, events); themeCheck(t, now, events); checkWant(t, now, events); levelCheck(t, now, events);
      return ok({ id: item.id });
    }
    case 'octoLid': {                                               // the phone that runs the animals saw an octopus go up and test the lid (a real behavior: what a lid decision is about)
      const f = t.fish.find((x) => x.id === a.fish && isOcto(x) && !x.dead && !x.away); if (!f || stageOf(f, now) === 'baby') return fail('NOT_FOUND');
      const L = (f.lid ||= { n: 0, at: 0, first: now }); if (now - L.at < HOUR) return ok({ applied: false });
      if (now - L.at > 3 * DAY) L.n = 0; L.n += 1; L.at = now; if (!f.disc?.lid) { (f.disc ||= {}).lid = now; const line = `${f.name} went up to the lid and tested it with its arms.`; events.push({ story: f.id, text: line }); }      /* (the first time goes in its story; after that it is only remembered) */
      return ok();
    }
    case 'octoMove': {                                              // an octopus shifts a small decoration (the phone that is watching reports it)
      if (t.flags.noRearrange) return fail('OFF');
      const f = t.fish.find((x) => x.id === a.fish && x.species === 'octopus'); if (!f || f.dead || stageOf(f, now) === 'baby') return fail('NOT_FOUND');
      const it = t.decor.find((x) => x.id === a.id); if (!it || !MOVABLE.includes(it.type)) return fail('NOT_FOUND');
      if (f.movedAt != null && now - f.movedAt < MOVE_GAP) return ok({ applied: false });
      const x = num(a.x), z = num(a.z); if (!(x >= BOUNDS.x[0] && x <= BOUNDS.x[1] && z >= BOUNDS.z[0] && z <= BOUNDS.z[1])) return fail('OUT_OF_BOUNDS');
      if (Math.hypot(x - it.x, z - it.z) > MOVE_MAX) return fail('OUT_OF_BOUNDS');
      it.x = +x.toFixed(2); it.z = +z.toFixed(2); f.movedAt = now; f.moved = (f.moved ?? 0) + 1; f.disc ||= {}; f.disc.rearrange ??= now;
      const home = a.home === true && ['coconut', 'pot'].includes(it.type), own = f.home === it.id; if (home) f.home = it.id; if (home || own) it.ry = +Math.max(-1, Math.min(1, num(a.ry) || 0)).toFixed(2);      // its own shell it may also turn
      events.push({ journal: home ? `${f.name} carried the ${DECOR_DEF[it.type].label.toLowerCase()} to a quiet corner and moved in.` : own ? `${f.name} shoved its ${DECOR_DEF[it.type].label.toLowerCase()} about and turned it round.` : `${f.name} moved the ${DECOR_DEF[it.type].label.toLowerCase()}.`, activity: { type: 'decor', text: `${f.name} moved the ${DECOR_DEF[it.type].label.toLowerCase()}.` } });
      return ok({ applied: true });
    }
    case 'octoTouch': {                                             // an octopus really reached a decoration and handled it (the phone running the animals reports it): it knows it a little better
      const f = t.fish.find((x) => x.id === a.fish && isOcto(x) && !x.dead), d = t.decor.find((x) => x.id === a.decor);
      { const k = !d && (t.keeps ?? []).find((q) => q.id === a.decor); if (f && k) return ok({ applied: touchKeep(t, f, k, now), keep: true, k: f.mem?.keeps?.[k.id]?.k ?? 0 }); }      // a keepsake it handled: it comes to know it (history.js)
      if (!f || !d) return fail('NOT_FOUND');
      const m = memOf(f), e = (m.fam[d.id] ||= { k: 0, n: 0, x: d.x, z: d.z, at: 0 }); if (now - (e.at ?? 0) < 45e3) return ok({ applied: false });      // one go is one go: a second phone, or a handoff, cannot count it twice
      const k0 = e.k, M = octoMind(f), first = !e.n, wasMoved = !!e.mv, label = (DECOR_DEF[d.type]?.label ?? 'decoration').toLowerCase();
      e.k = +Math.min(1, e.k + (first ? 0.2 + 0.15 * M.cur : 0.1 + 0.06 * M.cur) * (1 - e.k) * (0.8 + 0.4 * Math.min(1.5, octoAffinity(f, d)) / 1.5)).toFixed(3); e.n++; noteVisit(t, f, e, now); decorVisit(t, d, f, now, events, ADVR); e.at = now; e.x = d.x; e.z = d.z; delete e.mv; delete e.gone;
      const recent = now - (d.movedAt ?? d.at ?? 0) < 6 * 3600e3;
      if (d.type === 'pot' && k0 < POT_SKILL && e.k >= POT_SKILL) { const line = `${f.name} has worked out how to squeeze inside the clay pot.`; events.push({ journal: line, story: f.id, text: line }); }      // from the mouth to all the way in, learned one night at a time
      if (first && recent && a.kind === 'new') { const line = `${f.name} investigated the new ${label}.`; events.push({ journal: line, story: f.id, text: line }); }      // only after it really went over and felt it, and once
      else if (wasMoved && a.kind === 'moved') { const line = `${f.name} found the ${label} in its new spot.`; const mo = (f.moments ||= {}); if (now - (mo.found ?? 0) > 6 * 3600e3) { mo.found = now; events.push({ journal: line, story: f.id, text: line }); } }
      const was = m.likes.includes(d.id); memCap(t, f, now); if (!was && m.likes[0] === d.id && e.n >= 3) { const line = `${f.name} keeps going back to the ${label}. It is a favorite now.`; const mo = (f.moments ||= {}); if (now - (mo.fav ?? 0) > DAY) { mo.fav = now; events.push({ journal: line, story: f.id, text: line }); } }
      return ok({ k: e.k, n: e.n, stage: famStage(e) });
    }
    case 'octoMem': {                                               // the rest of what it remembers: its favorite spot, how it feels about the fish (and, once, what an older phone had kept)
      const f = t.fish.find((x) => x.id === a.fish && isOcto(x) && !x.dead); if (!f) return fail('NOT_FOUND');
      if (a.migrate && f.mem) return ok({ applied: false });      // never over newer memories kept here
      const m = memOf(f), inB = (q) => q && Number.isFinite(+q.x) && Number.isFinite(+q.z) && Math.abs(+q.x) <= 5 && +q.z >= -4 && +q.z <= 4.6;
      if (inB(a.fav)) m.fav = { x: +(+a.fav.x).toFixed(2), z: +(+a.fav.z).toFixed(2) };
      if (a.fishMemo && typeof a.fishMemo === 'object') for (const [id, v] of Object.entries(a.fishMemo).slice(0, 20)) if (t.fish.some((x) => x.id === id && x.id !== f.id) && v && typeof v === 'object') m.fish[id] = { f: Math.max(0, Math.min(99, +(+v.f || 0).toFixed(1))), a: Math.max(0, Math.min(99, +(+v.a || 0).toFixed(1))) };
      if (a.migrate && a.likes && typeof a.likes === 'object') for (const [id, n] of Object.entries(a.likes).slice(0, 20)) { const d = t.decor.find((x) => x.id === id); const c = Math.max(0, Math.min(20, n | 0)); if (d && c) m.fam[id] = { k: +Math.min(0.6, 0.12 * c).toFixed(3), n: c, x: d.x, z: d.z, at: 0 }; }      // its old likes, counted on one phone, kept as familiarity
      memCap(t, f, now); return ok();
    }
    case 'octoMemo': {                                              // who an octopus gets on with and who it has it in for, kept with the tank so every phone shows the same
      const f = t.fish.find((x) => x.id === a.fish && isOcto(x) && !x.dead); if (!f) return fail('NOT_FOUND');
      const fishOk = (id) => id == null || t.fish.some((x) => x.id === id && !x.dead && x.id !== f.id); if (!fishOk(a.buddy) || !fishOk(a.rival) || (a.buddy && a.buddy === a.rival)) return fail('NOT_FOUND');
      const buddy = a.buddy ?? null, rival = a.rival ?? null; if ((f.buddy ?? null) === buddy && (f.rival ?? null) === rival) return ok({ applied: false });
      const nameOf = (id) => t.fish.find((x) => x.id === id)?.name;
      const say = (k, text) => { const m = (f.moments ||= {}); if (now - (m[k] ?? 0) >= DAY) { m[k] = now; events.push({ journal: text }); } };      // a change of heart is kept at once, but written in the journal at most once a day
      if (buddy && buddy !== f.buddy) say('friend', `${f.name} and ${nameOf(buddy)} are friends now. It follows ${nameOf(buddy)} about.`);
      if (!rival && f.rival && f.grudge?.id === f.rival && now - f.grudge.since <= 2 * DAY) return ok({ applied: false });      // a grudge is not let go of the same day: it holds at least two days (the phone may try sooner)
      if (rival && rival !== f.rival && f.grudge) { (f.grudges ||= []).push({ id: f.grudge.id, name: f.grudge.name, since: f.grudge.since, until: now }); if (f.grudges.length > 4) f.grudges.shift(); }      // a new one replaces the old: the old is remembered
      if (rival && rival !== f.rival) { f.grudge = { id: rival, name: nameOf(rival), since: now, why: a.why === 'den' ? 'den' : null }; say('rival', a.why === 'den' ? `${f.name} has decided ${nameOf(rival)} is a nuisance. It keeps poking about round its den.` : `${f.name} has it in for ${nameOf(rival)}.`); }      // a grudge is kept, with the reason (an octopus remembers who keeps bothering its den)
      if (!rival && f.rival && f.grudge?.id === f.rival && now - f.grudge.since > 2 * DAY) { events.push({ story: f.id, text: `Has made its peace with ${f.grudge.name}.` }); (f.grudges ||= []).push({ id: f.grudge.id, name: f.grudge.name, since: f.grudge.since, until: now }); if (f.grudges.length > 4) f.grudges.shift(); delete f.grudge; }      // and, in time, let go of
      if (buddy) f.buddy = buddy; else delete f.buddy; if (rival) f.rival = rival; else delete f.rival; return ok();
    }
    case 'moment': {
      const f = t.fish.find((x) => x.id === a.fish && !x.dead), m = MOMENTS[a.kind]; if (!f || !m) return fail('NOT_FOUND');
      const o = a.other ? t.fish.find((x) => x.id === a.other && !x.dead && x.id !== f.id) : null; if (m.other && !o) return fail('NOT_FOUND');
      const at = (f.moments ||= {}); if (now - (at[a.kind] ?? 0) < m.gap) return ok({ applied: false });
      at[a.kind] = now; const line = m.text(f.name, o?.name); events.push({ journal: line }); witness(t, a.kind, f, now, events, name, line); return ok();
    }
    case 'octoMoment': {                                            // something worth remembering an octopus did, written in the journal now and then (each kind of moment at most so often)
      const f = t.fish.find((x) => x.id === a.fish && isOcto(x) && !x.dead), m = OCTO_MOMENTS[a.kind]; if (!f || !m) return fail('NOT_FOUND');
      const o = a.other ? t.fish.find((x) => x.id === a.other && !x.dead && x.id !== f.id) : null; if (m.other && !o) return fail('NOT_FOUND');
      const at = (f.moments ||= {}); if (now - (at[a.kind] ?? 0) < m.gap) return ok({ applied: false });
      at[a.kind] = now; const line = m.text(f.name, o?.name); events.push({ journal: line }); witness(t, a.kind, f, now, events, name, line); return ok();
    }
    case 'tankPref': { if (typeof a.rearrange === 'boolean') { if (a.rearrange) delete t.flags.noRearrange; else t.flags.noRearrange = true; } return ok(); }
    case 'moveDecor': {
      const it = t.decor.find((x) => x.id === a.id); if (!it) return fail('NOT_FOUND');
      const x = num(a.x), z = num(a.z); if (!(x >= BOUNDS.x[0] && x <= BOUNDS.x[1] && z >= BOUNDS.z[0] && z <= BOUNDS.z[1])) return fail('OUT_OF_BOUNDS');
      const moved = Math.hypot(it.x - x, it.z - z) > 0.3, from = { x: it.x, z: it.z }; it.x = +x.toFixed(2); it.z = +z.toFixed(2); it.ry = +(num(a.ry) || 0).toFixed(2);
      if (moved) { decorMoved(it, now, from); it.movedAt = now; for (const f of t.fish) { const e = f.mem?.fam?.[it.id]; if (e && !e.gone) e.mv = now; } }      // an octopus that knew it there still thinks it is there, until it finds it again
      return ok();
    }
    case 'sellDecor': {
      const i = t.decor.findIndex((x) => x.id === a.id); if (i < 0) return fail('NOT_FOUND');
      const it = t.decor[i], d = DECOR_DEF[it.type], lbl = d.label.toLowerCase();
      for (const f of t.fish) { if (f.dead || (f.home !== it.id && f.spotId !== it.id)) continue; const wasHome = f.home === it.id; delete f.home; if (f.spotId === it.id) delete f.spotId; f.happy = Math.max(0.2, (f.happy ?? 0.7) - 0.15); f.missing = { what: lbl, at: now };      // an animal that loved it misses it, and goes looking for somewhere new
        const line = wasHome ? `${f.name} lost its home when the ${lbl} was taken out. It is looking for a new one.` : `${f.name} misses the ${lbl}. It is looking for a new favorite spot.`; events.push({ journal: line, toast: line, story: f.id, text: line }); }
      for (const f of t.fish) { const e = f.mem?.fam?.[it.id]; if (e) { e.gone = now; delete e.mv; memLikes({ ...t, decor: t.decor.filter((x) => x.id !== it.id) }, f); } }      // gone: it stops seeking it, and forgets it in a few days
      if (it.type === 'starfish') events.push({ activity: { type: 'decor', text: `${name} let the starfish go back to the sea.` } });
      const back = Math.floor((Number.isFinite(it.paid) ? it.paid : d.price) / 2); t.decor.splice(i, 1); t.shells += back; return ok({ delta: back });      // half of what was really paid (a starter gift once sold for shells, again and again in a solo tank)
    }
    case 'tut': {                                                    // tutorial progress; the free plant is granted once
      if (a.reset) { if (!(solo || dev)) return fail('FORBIDDEN'); t.flags.tut = 0; t.flags.starter = { fern: 1, grass: 1, rock: 1, starfish: 1, moss: 1 }; return ok(); }
      const step = Math.max(0, Math.min(9, num(a.step) | 0)); if (step > (t.flags.tut ?? 0)) { t.flags.tut = step; }
      if (step >= 5 && !t.flags.promised) { t.flags.promised = now; t.driftAt = now + (4 + (hash32(now / 6e4) % 4)) * HOUR; t.visitAt = Math.min(t.visitAt ?? Infinity, now + 22 * HOUR); }      // the first session ends with real things on their way
      return ok();
    }
    case 'scoop': {
      const x = t.floaters.find((f) => f.id === a.id); if (!x) return ok({ applied: false });
      t.floaters.splice(t.floaters.indexOf(x), 1); const m = t.memorial.find((r) => r.id === x.id); if (m) m.rested = { by: name, at: now };
      events.push({ journal: `${name} laid ${x.name} to rest.`, toast: `${x.name} was laid to rest.` }); return ok({ applied: true });
    }
    case 'collect': {
      const g = t.drift; if (!g || g.id !== a.id) return ok({ applied: false, delta: 0 });
      t.drift = null; t.driftAt = now + 6 * 3600e3;
      if (g.kind === 'treat') { for (const f of t.fish) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.15); events.push({ activity: { type: 'gift', text: `${name} found fish treats. ${driftBlame(g)}` }, toast: 'Fish treats! Everyone feels happier.' }); return ok({ applied: true, delta: 0, kind: 'treat' }); }
      t.shells += g.amount; if (g.kind === 'pearl') events.push({ journal: `${name} found a pearl. ${driftBlame(g)}`, toast: `A pearl! +${g.amount} shells` });
      else events.push({ toast: `${driftBlame(g)} +${g.amount} shells` });
      levelCheck(t, now, events); return ok({ applied: true, delta: g.amount, kind: g.kind });
    }
    case 'play': {                                                  // a toy played with: who joined in learns it a little more; the tank's plays open the next toy
      const toy = TOYS[a.toy] ? a.toy : null; if (!toy || !toysOpen(t).includes(toy)) return fail('NOT_FOUND');
      const at = (t.flags.toyAt ||= {}), k = uid + ':' + toy; if (now - (at[k] ?? 0) < 45e3) return ok({ applied: false });      // (a play is one go with a toy, not every bounce)
      at[k] = now; const before = toysOpen(t); t.toyPlays = (t.toyPlays ?? 0) + 1;
      const ids = [...new Set((Array.isArray(a.fish) ? a.fish : []).map(String))].slice(0, 10), who = ids.map((id) => t.fish.find((f) => f.id === id && !f.dead)).filter((f) => f && TOYS[toy].fits.includes(toyKind(f)));
      for (const f of who) { f.toys ||= {}; f.toys[toy] = (f.toys[toy] ?? 0) + 1; if (f.toys[toy] === TOY_LEARN) { const line = `${f.name} has learned to play with the ${TOYS[toy].label.toLowerCase()}.`; events.push({ journal: line, story: f.id, text: line, toast: line }); } }
      for (const n of toysOpen(t).filter((x) => !before.includes(x))) events.push({ journal: `A new toy in the Toy box: ${TOYS[n].label.toLowerCase()}.`, toast: `New toy: ${TOYS[n].label}` });
      return ok({ n: who.length });
    }
    case 'pet': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); ensureFish(f); f.bond ||= {}; f.petAt ||= {}; const u = uid;
      if (now - (f.petAt[u] ?? 0) < 4 * 60e3) return ok({ applied: false, delta: 0 });
      f.petAt[u] = now; raiseNote(t, now, 'pet', f); const tw = octoTrust(f, u).lvl; f.bond[u] = (f.bond[u] ?? 0) + 1; trustStep(f, u, tw, events); f.happy = Math.min(1, f.happy + 0.03); (f.disc ||= {}).trust ??= now; progress(t, 'play', events, name); progress(t, 'play3', events, name, f.id); checkWant(t, now, events, { type: 'pet', id: f.id }); dayCheck(t, now, events, 'bond');
      f.found ||= []; if (f.bond[u] >= 10 && !f.found.includes('bond:' + u)) { const first = !f.found.some((x) => x.startsWith('bond:')); f.found.push('bond:' + u); (f.disc ||= {}).bond ??= now; if (first) t.shells += 2; events.push({ journal: `${f.name} has started to recognise ${name}.`, toast: first ? `${f.name} knows you now! +2 shells` : `${f.name} knows you now!`, discovery: f.id }); return ok({ applied: true, delta: first ? 2 : 0, bond: f.bond[u] }); }      // (the shells once per animal: a new caretaker is welcome, not a payday)
      return ok({ applied: true, delta: 0, bond: f.bond[u] });
    }
    case 'trim': {                                                  // snip every grown plant (or one): a small reward, and it starts growing again
      const ready = readyToTrim(t, now).filter((d) => !a.id || d.id === a.id); if (!ready.length) return ok({ applied: false, delta: 0 });
      for (const d of ready) d.trimAt = now; t.shells += ready.length; careBy(t, uid, name, now);
      events.push({ activity: { type: 'decor', text: `${name} trimmed the plants.` }, toast: `Plants trimmed. +${ready.length} shell${ready.length > 1 ? 's' : ''}` }); return ok({ applied: true, delta: ready.length, n: ready.length });
    }
    case 'fishNote': {                                              // a short note any caretaker can leave on a fish's card
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40); if (!txt) return fail('BAD_NAME');
      f.notes = [...(f.notes ?? []), { by: uid, name, text: txt, at: now }].slice(-3); dayCheck(t, now, events, 'bond');
      events.push({ journal: `${name} left ${f.name} a note: “${txt}”`, activity: { type: 'fish', text: `${name} left a note for ${f.name}.` } }); return ok();
    }
    case 'perform': {      // ask for a learned trick: it does it if it trusts you and is in the mood; each time it does, it gets surer
      const f = t.fish.find((x) => x.id === a.id && !x.dead); if (!f || !(f.tricks ?? []).includes(a.trick)) return fail('NOT_FOUND'); if (now - (f.showAt ?? 0) < 60e3) return ok({ applied: false, wait: true });
      f.showAt = now; const bond = Math.min(10, f.bond?.[uid] ?? 0), done = f.shows?.[a.trick] ?? 0, mood = f.happy ?? 0.7, hunger = ownFood(f) ? ownHunger(f) : t.hunger ?? 0.3;
      const chance = Math.min(0.97, 0.25 + bond * 0.04 + Math.min(done, 10) * 0.03 + (mood - 0.5) * 0.5 - Math.max(0, hunger - 0.6) * 0.6), roll = (hash32(Math.floor(now / 1000) + (f.seed | 0)) % 1000) / 1000;
      if (roll < chance) { f.shows = { ...(f.shows ?? {}), [a.trick]: done + 1 }; f.happy = Math.min(1, mood + 0.03); f.bond ||= {}; f.bond[uid] = (f.bond[uid] ?? 0) + (done < 3 ? 1 : 0); if (done + 1 === 10) events.push({ journal: `${f.name} will ${TRICKS[a.trick].label} whenever ${name === 'You' ? 'you ask' : name + ' asks'} now.`, story: f.id }); return ok({ applied: true, success: true, chance }); }
      return ok({ applied: true, success: false, chance, why: hunger > 0.6 ? 'hungry' : mood < 0.5 ? 'mood' : 'trust' });
    }
    case 'train': {                                                 // practise a trick; five good sessions and it is learned for good
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); const opt = trickOptions(t, f, now).find((o) => o.key === a.trick); if (!opt) return fail('CANT_TRAIN');
      if (now - (f.trainAt ?? 0) < TRAIN_GAP) return ok({ applied: false, delta: 0, wait: TRAIN_GAP - (now - f.trainAt) });
      f.trainAt = now; f.skill = { ...(f.skill ?? {}), [a.trick]: (f.skill?.[a.trick] ?? 0) + 1 }; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.02); progress(t, 'play', events, name); dayCheck(t, now, events, 'bond');
      if (f.skill[a.trick] >= trainNeed(f)) { f.tricks = [...(f.tricks ?? []), a.trick]; t.shells += TRICK_REWARD; events.push({ journal: `${f.name} learned to ${TRICKS[a.trick].label}.`, toast: `${f.name} learned a trick! +${TRICK_REWARD} shells`, milestone: f.id }); return ok({ applied: true, delta: TRICK_REWARD, learned: a.trick, n: trainNeed(f) }); }
      return ok({ applied: true, delta: 0, n: f.skill[a.trick], need: trainNeed(f) });
    }
    case 'puzzle': {                                                // a puzzle jar for the octopus; it works on it for a while and the game finishes it on its own
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); if (!canPuzzle(f, now)) return fail('CANT_TRAIN');
      if (f.puzzle) return ok({ applied: false, delta: 0, busy: true, until: f.puzzle.until });
      if (f.puzzleAt != null && now - f.puzzleAt < PUZZLE_GAP) return ok({ applied: false, delta: 0, wait: PUZZLE_GAP - (now - f.puzzleAt) });
      if (t.shells < PUZZLE_COST) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= PUZZLE_COST; f.puzzleAt = now; const secs = puzzleSecs(f); f.puzzle = { at: now, until: now + secs * 1000, secs, by: uid ?? null };
      dayCheck(t, now, events, 'bond'); events.push({ activity: { type: 'fish', text: `${name} gave ${f.name} a puzzle jar.` } });
      return ok({ applied: true, delta: -PUZZLE_COST, secs, until: f.puzzle.until });
    }
    case 'hide': {                                                  // a treat hidden in a decoration: the octopus hunts for it (see hunts)
      const f = t.fish.find((x) => x.id === a.id && isSmart(x) && !x.dead); if (!f) return fail('NOT_FOUND');
      if (f.seek) return ok({ applied: false, delta: 0, busy: true, until: f.seek.until });
      if (f.seekAt != null && now - f.seekAt < HIDE_GAP) return ok({ applied: false, delta: 0, wait: HIDE_GAP - (now - f.seekAt) });
      if (t.decor.length < 2 || !t.decor.some((d) => d.id === a.spot)) return fail('NOT_FOUND');
      if (t.shells < HIDE_COST) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= HIDE_COST; f.seekAt = now; const order = hideOrder(t, f, uid ?? 'solo'), path = order.slice(0, order.indexOf(a.spot) + 1);
      f.seek = { spot: a.spot, path, by: uid ?? 'solo', name: solo ? 'You' : name, at: now, until: now + (path.length * HIDE_STEP + 3) * 1000 };
      events.push({ activity: { type: 'fish', text: `${name} hid a treat for ${f.name}.` } });
      return ok({ applied: true, delta: -HIDE_COST, tries: path.length, until: f.seek.until });
    }
    case 'crab': {                                                  // a crab for the octopus (shells go in, a happy octopus and a bigger hoard come out)
      const os = t.fish.filter((f) => isSmart(f) && !f.dead && !f.away); if (!os.length) return fail(t.fish.some((f) => f.away) ? 'AWAY' : 'CANT_TRAIN');      // any octopus, baby or grown, can have a crab treat
      const f = (a.id ? os.find((x) => x.id === a.id) : os.filter((x) => canFeedOcto(x, uid, !solo)).sort((x, y) => (x.crabAt ?? 0) - (y.crabAt ?? 0))[0]); if (!f) return fail('NOT_FOUND'); if (!canFeedOcto(f, uid, !solo)) return fail('NOT_YOURS');
      if (f.crabAt != null && now - f.crabAt < CRAB_GAP) return ok({ applied: false, delta: 0, wait: CRAB_GAP - (now - f.crabAt), id: f.id });
      if (t.shells < CRAB_PRICE) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= CRAB_PRICE; f.crabAt = now; checkWant(t, now, events, { type: 'crab', id: f.id }); f.crabs = (f.crabs ?? 0) + 1; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.12); f.bond ||= {}; const tw = octoTrust(f, uid).lvl; f.bond[uid] = (f.bond[uid] ?? 0) + 1; trustStep(f, uid, tw, events);
      dayCheck(t, now, events, 'bond'); events.push({ journal: f.crabs === 1 ? `${f.name} caught its first crab.` : null, activity: { type: 'fish', text: `${name} gave ${f.name} a crab.` }, crab: f.id }); if (!events.at(-1).journal) delete events.at(-1).journal;
      return ok({ applied: true, delta: -CRAB_PRICE, id: f.id });
    }
    case 'style': {
      const fl = a.floor ?? t.style?.floor ?? 'sand', bd = a.backdrop ?? t.style?.backdrop ?? 'candy';
      if (!FLOORS[fl] || !BACKDROPS[bd]) return fail('BAD_NAME');
      let cost = 0; for (const [kind, key] of [['floor', fl], ['backdrop', bd]]) if (!styleOwned(t, kind, key)) cost += STYLE_PRICE[kind][key];
      if (cost > t.shells) return fail('NOT_ENOUGH_SHELLS');
      if (cost) { t.shells -= cost; for (const [kind, key] of [['floor', fl], ['backdrop', bd]]) (t.flags.styles[kind] ||= {})[key] = true; }
      t.style = { floor: fl, backdrop: bd }; events.push({ activity: { type: 'decor', text: `${name} restyled the tank.` } }); return ok({ delta: cost ? -cost : 0 });
    }
    case 'firstFish': {                                            // every caretaker gets a free first fish of their own
      if (members && !members.some((m) => m.id === uid)) return fail('FORBIDDEN');
      t.flags.firsts ||= {}; if (t.flags.firsts[uid]) return fail('ALREADY_HAVE'); if (t.fish.length + pending(t) + t.eggs.length >= capacity(t.level)) return fail('TANK_FULL');
      const seed = Math.abs(Math.floor(num(a.seed) || now)) % 100000, f = makeFish(t, { species: 'octopus', name: cleanName(a.name), seed, pal: palOf(a, seed), owner: uid, ownerName: name, fromEgg: true }, now, 0); t.flags.firsts[uid] = true;
      events.push({ journal: `${name} brought in ${f.name}, their own octopus.`, toast: `${f.name} joined the tank!`, arrival: [f.id], activity: { type: 'fish', text: `${name} brought in their octopus.` } }); levelCheck(t, now, events); return ok({ id: f.id });
    }
    // an octopus nobody in the crew looks after (its caretaker is gone, or the server once lost the tank and gave them a new identity)
    case 'fishLog': {                                              // the lead phone's tally of what its animals did lately: how far each went, where it spent its time, what it held on to
      let did = false; const n = (v, max) => Math.max(0, Math.min(max, num(v) || 0));
      for (const e of (Array.isArray(a.logs) ? a.logs : []).slice(0, 30)) {
        const f = t.fish.find((x) => x.id === e?.fish && !x.dead && !x.away); if (!f) continue; const L = (f.log ||= {}); did = true;
        L.dist = +((L.dist ?? 0) + n(e.dist, 120)).toFixed(1); L.snaps = (L.snaps ?? 0) + Math.round(n(e.snaps, 60)); L.holds = (L.holds ?? 0) + Math.round(n(e.holds, 30));
        L.lv ||= {}; for (const k of ['front', 'middle', 'rear', 'top', 'mid', 'low']) if (e.lv?.[k]) L.lv[k] = Math.round((L.lv[k] ?? 0) + n(e.lv[k], 400));
        { const seen = new Set([...(Array.isArray(e.places) ? e.places : []), ...(e.hitch && typeof e.hitch === 'object' ? Object.keys(e.hitch) : [])].slice(0, 12)); for (const id of seen) decorVisit(t, t.decor.find((x) => x.id === id), f, now, events, ADVR); }      // the decoration remembers who comes (one count a day each)
        if (Array.isArray(e.places)) { L.places ||= []; for (const id of e.places.slice(0, 10)) if (typeof id === 'string' && t.decor.some((d) => d.id === id) && !L.places.includes(id)) L.places.push(id); L.places = L.places.slice(-40); }
        // a seahorse's holdfasts, by the decoration's id (never by position, so a moved decoration is still the same place to it):
        // seconds held, visits, and where it stood when last held. Ones no longer in the tank are forgotten, and only the 16 most used are kept.
        const has = (id) => typeof id === 'string' && t.decor.some((d) => d.id === id);
        if (e.hitch && typeof e.hitch === 'object') { L.hitch ||= {}; for (const [id, h] of Object.entries(e.hitch).slice(0, 12)) { if (!has(id) || !Array.isArray(h)) continue; const H = (L.hitch[id] ||= [0, 0, null, null]); H[0] = Math.round(H[0] + n(h[0], 200)); H[1] += Math.round(n(h[1], 6)); if (Number.isFinite(+h[2]) && Number.isFinite(+h[3])) { H[2] = +Math.max(-6, Math.min(6, +h[2])).toFixed(2); H[3] = +Math.max(-6, Math.min(6, +h[3])).toFixed(2); } } }
        if (L.hitch) { for (const id of Object.keys(L.hitch)) if (!has(id)) delete L.hitch[id]; const ks = Object.keys(L.hitch).sort((a2, b2) => L.hitch[b2][0] - L.hitch[a2][0]); for (const id of ks.slice(16)) delete L.hitch[id]; }
        if (has(e.last)) L.last = e.last;
        // its favorite is earned on the server too: the holdfast it has held longest, once it has gone back to it and held it two minutes in all
        if (L.hitch && Object.keys(L.hitch).length) { const [bid, b] = Object.entries(L.hitch).sort((x, y) => y[1][0] - x[1][0])[0]; if (b[0] >= 120 && b[1] >= 2) L.fav = bid; else if (!has(L.fav)) delete L.fav; }
        else if (typeof e.fav === 'string' && has(e.fav)) L.fav = e.fav;      // (an older phone's report)
        if (L.fav && !has(L.fav)) delete L.fav;
        // what it has really done since tracking began: meals, strikes from its stem, greetings, tails held, new things looked at
        for (const k of ['meals', 'strikes', 'greets', 'links', 'inspects']) if (e[k] != null) L[k] = (L[k] ?? 0) + Math.round(n(e[k], k === 'meals' ? 60 : 30));
      }
      return ok({ applied: did });
    }
    case 'claimOcto': {                                            // a caretaker with no octopus of their own takes it on
      if (!members) return fail('FORBIDDEN'); const f = t.fish.find((x) => x.id === a.id); if (!f || !isSmart(f) || f.dead) return fail('NOT_FOUND');
      if (f.owner && members.some((m) => m.id === f.owner)) return fail('NOT_YOURS');
      if (t.fish.some((x) => isSmart(x) && !x.dead && x.owner === uid) || t.orders.some((o) => o.species === 'octopus' && o.owner === uid)) return fail('ALREADY_HAVE');
      f.owner = uid; f.ownerName = name; (t.flags.firsts ||= {})[uid] = true; f.bond ||= {}; f.bond[uid] = Math.max(f.bond[uid] ?? 0, 1);
      events.push({ journal: `${name} took ${f.name} under their wing.`, toast: `${f.name} is yours now.`, activity: { type: 'fish', text: `${name} is now looking after ${f.name}.` } }); return ok({ id: f.id });
    }
    case 'keepBaby': {                                             // the caretakers choose the one baby seahorse that stays: it becomes a seahorse of the tank, the others swim off to new homes
      const N = t.nursery; if (!N || N.id !== a.nursery) return fail('NOT_FOUND');      // (already chosen, perhaps by someone else a moment ago)
      if (now < N.readyAt) return fail('NOT_READY');
      const c = N.cands.find((x) => x.id === a.baby); if (!c) return fail('NOT_FOUND');
      if (t.fish.length + pending(t) + t.eggs.length >= capacity(t.level) + BIRTH_ROOM) return fail('TANK_FULL');      // nothing is ever moved out to make room: the choice waits
      if (t.fish.some((x) => x.id === c.id)) return fail('NOT_FOUND');
      const f = ensureFish({ id: c.id, name: c.name, species: 'seahorse', seed: c.seed, born: now, lean: leanOf([N.pa, N.ma], hash32(c.seed + 11)), birthDate: N.born, bornHere: true, stage: 'baby', traits: c.traits, sex: c.sex, genes: c.genes, gen: N.gen ?? 1, happy: 0.8, paid: 0, parents: [N.pa, N.ma].filter(Boolean).map(lineOf), owner: null, ownerName: null });
      const left = N.cands.filter((x) => x.id !== c.id).map((x) => x.id); t.fish.push(f); morphBorn(t, f, now, events); t.nursery = null; t.lastDepart = { nursery: N.id, left, kept: f.id, at: now, n: N.n };      /* every phone watching sees the others swim off, once */ (t.families ||= []).push({ id: N.id, born: N.born, father: N.pa?.name ?? null, mother: N.ma?.name ?? null, kept: f.id, n: N.n }); t.families = t.families.slice(-20);
      if (!t.flags.firstHatch) t.flags.firstHatch = { at: now, fish: f.id, parents: [N.father, N.mother] };
      events.push({ journal: `${f.name} is staying in the tank, a little seahorse born here to ${N.pa?.name ?? 'its father'} and ${N.ma?.name ?? 'its mother'}. The other babies have swum off to new homes.`, toast: `${f.name} is staying!`, kept: f.id }); return ok();
    }
    case 'sellFish': {                                             // a fish goes to a new home: it leaves the tank, and the shared wallet gets half of what it cost. Never the last fish
      const f = t.fish.find((x) => x.id === a.id); if (!f || f.dead) return fail('NOT_FOUND');
      if (!canSell(f, uid, members)) return fail('NOT_YOURS');
      if (t.fish.filter((x) => !x.dead).length <= 1) return fail('LAST_FISH');
      if (f.preg) return fail('EXPECTING');                          // a father carrying his brood stays until they are born
      const pay = sellValue(f); t.fish.splice(t.fish.indexOf(f), 1); t.shells += pay; if (t.want?.fish === f.id) t.want = null;
      for (const o of t.fish) { const close = o.pal === f.id || o.buddy === f.id || o.mate === f.id || o.partner === f.id; unlink(o, f.id); if (close) o.loss = { id: f.id, name: f.name, at: now, until: now + 2 * DAY, place: o.spotId ?? null, rehomed: true }; }      // a friend that has gone to a new home is missed for a little while (not mourned: it is alive, elsewhere)
      const forOther = f.owner && f.owner !== uid && members?.some((m) => m.id === f.owner);      // the first caretaker selling someone else's fish says so
      if (f.resident) { const M = t.visitMem?.[f.species]; if (M) { delete M.kept; M.stay = { no: now }; } events.push({ journal: `${name} let ${f.name} go back to the open water. It knows the way, and may visit again.`, toast: `${f.name} swam back out to the open water.` }); return ok({ id: f.id, delta: 0 }); }      // a visitor that stayed is not sold: it goes back where it came from, and may come visiting again
      events.push({ journal: forOther ? `${name} found ${f.name} a new home, for ${f.ownerName ?? 'its caretaker'}.` : `${name} found ${f.name} a new home.`, toast: pay ? `${f.name} went to a new home. +${pay} shells` : `${f.name} went to a new home.`, activity: { type: 'fish', text: `${name} sold ${f.name} to a new home.` }, released: f.id });
      return ok({ id: f.id, delta: pay });
    }
    case 'releaseOcto': {                                          // it is let go: it slips over the back of the tank to the reef. Not a death, nothing is paid, and never the last fish
      if (!members) return fail('FORBIDDEN'); const f = t.fish.find((x) => x.id === a.id); if (!f || !isSmart(f) || f.dead) return fail('NOT_FOUND');
      if (!f.owner || members.some((m) => m.id === f.owner)) return fail('NOT_YOURS');      // only one whose caretaker is gone; one that never had a caretaker (a tank restored from a file) is taken on, not let go
      if (t.fish.filter((x) => !x.dead).length <= 1) return fail('LAST_FISH');
      t.fish.splice(t.fish.indexOf(f), 1); if (t.want?.fish === f.id) t.want = null; for (const o of t.fish) unlink(o, f.id);
      events.push({ journal: `${f.name} was let go, and slipped away over the reef.`, toast: `${f.name} slipped away to the reef.`, activity: { type: 'fish', text: `${name} let ${f.name} go.` }, released: f.id }); return ok({ id: f.id });
    }
    case 'chooseFirst': {                                           // the opening of a new tank: pick the free first fish and name it (once)
      if (t.flags.intro) return fail('ALREADY_HAVE'); if (!FIRST_FISH.includes(a.species)) return fail('UNKNOWN_SPECIES');
      if (!t.fish.length && !pending(t) && !(members && !members.some((m) => m.id === uid))) {   // an empty tank: the chosen fish simply arrives
        const seed = Math.abs(Math.floor(num(a.seed) || now)) % 100000, made = makeFish(t, { species: a.species, name: cleanName(a.name), seed, pal: palOf(a, seed), owner: uid, ownerName: name, fromEgg: true }, now, 0); t.flags.intro = now; t.flags.firsts = { ...(t.flags.firsts ?? {}), [uid]: true };
        events.push({ journal: `${name} brought in ${made.name}, the first fish.`, toast: `${made.name} has arrived!`, arrival: [made.id] }); return ok({ id: made.id });
      }
      const f = t.fish.find((x) => x.id === 'f1'); if (!f || t.fish.length > 1 || (f.owner && f.owner !== uid)) return fail('FORBIDDEN');
      const seed = Math.abs(Math.floor(num(a.seed) || now)) % 100000, nm = cleanName(a.name) || f.name;
      Object.assign(f, { species: a.species, seed, pal: palOf(a, seed), name: nm, traits: traitsFor(a.species, seed), born: now, stage: 'baby', happy: 0.75, health: 1 }); delete f.appetite; delete f.genes; ensureFish(f);
      t.seen.fish = [a.species]; t.flags.intro = now; t.flags.firsts = { ...(t.flags.firsts ?? {}), [uid]: true };
      events.push({ journal: `${name} brought in ${f.name}, the first fish.`, toast: `${f.name} is home.`, arrival: [f.id] }); return ok({ id: f.id });
    }
    case 'observe': {                                              // a phone that is watching reports what its fish are really doing
      const key = String(a.key ?? ''), f = t.fish.find((x) => x.id === a.fish); let did = false;
      const other = a.with ? t.fish.find((x) => x.id === a.with) : null, spotOk = a.spot ? t.decor.some((x) => x.id === a.spot) : false;
      const sights = { watch: ['watch'], inspect: ['greet'], together: ['together', ...(f && other && (f.pal === other.id || other.pal === f.id) ? ['friends'] : [])], visit: ['visit'], regular: ['visit', ...(f?.found?.includes('spot') && spotOk ? ['favourite'] : [])], object: ['visit', ...(f && (f.traits ?? []).includes('Curious') && spotOk ? ['investigate'] : [])], hideaway: ['visit'], bubbles: ['bubbles'] }[key] ?? [];
      for (const kind of sights) if (progress(t, kind, events, name, kind === 'greet' ? String(a.fish ?? '') : null)) did = true;
      const d = DISCOVERIES[key];
      if (d && d.line && !d.serverOnly && f && (!d.kind || d.kind === f.species) && !(f.stage === 'baby' && now - f.born < 3600e3)) {
        const tr = f.traits ?? [], decor = a.spot ? t.decor.find((x) => x.id === a.spot) : null, other = d.pair ? t.fish.find((x) => x.id === a.with && x.id !== f.id) : null;
        const okTrait = !d.traits || d.traits.some((x) => tr.includes(x)), okDecor = !d.needsDecor || decor, okPair = !d.pair || other, okBubble = !d.needsBubbler || t.decor.some((x) => x.type === 'bubbler');
        if (okTrait && okDecor && okPair && okBubble && unlock(t, f, key, now, events, { decor: decor ? DECOR_DEF[decor.type].label.toLowerCase() : '', other: other?.name, otherId: other?.id, otherObj: other })) did = true;
      }
      return ok({ applied: did });
    }
    case 'mystery': {      // someone tapped today's mystery: it plays out, once, for everyone in the tank
      const m = mysteryOf(t, now); if (!m || m.done) return ok({ applied: false });
      if (Number.isFinite(+a.tz)) t.tzMin = Math.max(-840, Math.min(840, Math.round(+a.tz)));      // (the phone's clock, for when the tank's events wake)
      let pay = giftReady(t, uid, now, a.tz) ? DAILY_GIFT : 0; if (pay) { (t.flags.gift ||= {}).tank = { key: giftKey(now, a.tz), at: now, by: uid }; t.shells += pay; }      // the day's small gift comes with the mystery now, not as a box of its own
      bump(t, 'myst'); if (MYSTERY[m.kind]?.chain) bump(t, 'mystChain');
      const o = mysteryOut(t, m, now); m.done = true; if (o.pay) { t.shells += o.pay; pay += o.pay; } if (o.treat) for (const f of t.fish) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.15); m.line = o.line; m.by = name; m.fish = o.fish?.id ?? null; const day = m.day;
      if (o.next) t.mystNext = { day: day + 1, kind: o.next, x: m.x, z: m.z };
      if (o.visit && !t.visitor) t.visitAt = Math.min(t.visitAt ?? Infinity, wakeAt(t, (day + 1) * DAY + 2 * HOUR));      // (the visitor it hinted at comes tomorrow)
      events.push({ journal: o.line, ...(o.fish ? { story: o.fish.id } : {}), mystery: { kind: m.kind, fish: m.fish, next: !!o.next }, activity: { type: 'mystery', text: `${name} looked into today's mystery.` } });
      levelCheck(t, now, events); return ok({ applied: true, line: o.line, fish: m.fish, next: !!(o.next || o.visit), delta: pay });
    }
    case 'pickGoal': {      // choose one of the goals on offer (or give up the current one, and three are offered again)
      if (a.drop) { if (!t.goal) return ok({ applied: false }); events.push({ journal: `${name} set aside the goal: ${GOALS[t.goal.id]?.title ?? ''}.` }); t.goal = null; t.goalOffer = goalOffer(t, now); return ok({ applied: true }); }
      if (t.goal || !(t.goalOffer ?? []).includes(a.id) || !GOALS[a.id]) return fail('NOT_FOUND');
      t.goal = { id: a.id, at: now, base: baseOf(t), done: {}, by: name }; t.goalOffer = null; events.push({ journal: `New goal: ${GOALS[a.id].title}.`, goalSet: a.id }); events.push(...advance(t, now)); return ok({ applied: true });
    }
    case 'decide': { const D = t.dilemma; if (!D || D.id !== a.id || D.done) return ok({ applied: false }); if (!D.opts.some((o) => o.k === a.k)) return fail('NOT_FOUND'); if (D.turn && D.turn.uid !== uid && now < D.turn.until) return fail('NOT_YOUR_TURN'); const r = settleDilemma(t, D, a.k, now, name); if (!r.ok) return fail(r.reason); if (name && a.k) bump(t, 'decided'); events.push(...r.events); return ok({ applied: true, line: r.events[0]?.journal }); }
    case 'matchmake': {      // bring two together: fish of a kind spawn sooner and it is these two; two octopuses get to know each other faster
      const x = t.fish.find((f) => f.id === a.a && !f.dead), y = t.fish.find((f) => f.id === a.b && !f.dead); if (!x || !y || x === y) return fail('NOT_FOUND');
      if (x.species !== y.species) return fail('NOT_SAME_KIND'); if (stageOf(x, now) !== 'adult' || stageOf(y, now) !== 'adult') return fail('TOO_YOUNG');
      if (now - (t.flags.matchAt ?? -Infinity) < DAY) return fail('TOO_SOON'); t.flags.matchAt = now;
      if (isOcto(x)) { if (x.partner || y.partner) return fail('ALREADY_PAIRED'); const k = [x.id, y.id].sort().join('|'); (t.octoBonds ||= {})[k] = (t.octoBonds[k] ?? 0) + 1.5 * DAY; events.push({ journal: `${name} brought ${x.name} and ${y.name} together. They are getting to know each other.` }); return ok(); }
      if (x.species === 'seahorse') return fail('SEAHORSES_CHOOSE');
      if (sexOf(x) === sexOf(y)) return fail('SAME_SEX');
      t.match = { a: sexOf(x) === 'f' ? x.id : y.id, b: sexOf(x) === 'f' ? y.id : x.id, until: now + 5 * DAY, by: name }; t.eggAt = Math.min(t.eggAt ?? Infinity, now + 8 * HOUR);
      bump(t, 'paired'); const odds = morphOdds(x, y); if (Object.keys(odds).length) bump(t, 'pairedRare'); for (const k of Object.keys(odds)) bump(t, 'paired_' + k); const best = Object.entries(odds).sort((p, q) => q[1] - p[1])[0];
      events.push({ journal: `${name} brought ${x.name} and ${y.name} together.${best ? ` Their babies could be ${MORPHS[best[0]].label.toLowerCase()}.` : ''}` }); return ok({ odds });
    }
    case 'greet': {
      const v = t.visitor; if (!v || v.id !== a.id) return ok({ applied: false, delta: 0 });
      const d = SPECIES_DEF[v.species]; if (!t.seen.fish.includes(v.species)) t.seen.fish.push(v.species);
      t.visitor = null; t.visitAt = now + (48 + (hash32(now / 6e4) % 49)) * HOUR; t.shells += 4;
      witness(t, 'visitor', null, now, events, name, `${name} said hello to a ${d.label}.`);
      events.push({ activity: { type: 'visitor', text: `${name} greeted a rare visitor.` }, journal: `${name} said hello to a ${d.label}.`, toast: `${d.label} added to the book! +4 shells` }); levelCheck(t, now, events); return ok({ applied: true, delta: 4 });
    }
    case 'lookAfter': {                                              // a friend has not been in for two weeks (or has left): someone else takes their animal on, so it is never left to fend for itself
      const f = t.fish.find((x) => x.id === a.id && !x.dead); if (!f) return fail('NOT_FOUND'); if (!f.owner || f.owner === uid) return fail('ALREADY_HAVE');
      const ow = (members ?? []).find((m) => m.id === f.owner); if (ow && now - (ow.lastSeen ?? ow.last_seen ?? now) < AWAY_DAYS * DAY) return fail('STILL_HERE');
      const was = f.ownerName ?? 'its caretaker'; f.ownerWas = { id: f.owner, name: was, at: now }; f.owner = uid; f.ownerName = name;
      events.push({ journal: ow ? `${name} is looking after ${f.name} while ${was} is away.` : `${name} is looking after ${f.name} now.` }); return ok();
    }
    case 'openGift': {                                              // the one it is for unwraps it: everything inside comes out at once (a school, too)
      const f = t.fish.find((x) => x.id === a.id && x.gift?.wrapped); if (!f) return fail('NOT_FOUND'); if (f.owner !== uid) return fail('NOT_YOURS');
      const all = t.fish.filter((x) => x.gift?.id === f.gift.id && x.gift.wrapped), d = SPECIES_DEF[f.species];
      for (const x of all) { delete x.gift.wrapped; x.gift.opened = now; }
      const what = all.length > 1 ? `${all.length} ${d.label.toLowerCase()}s` : `${f.name} the ${d.label.toLowerCase()}`;
      events.push({ journal: `${name} opened ${f.gift.from}'s gift: ${what}!`, giftOpened: { to: f.gift.fromId, text: `${name} opened your gift and met ${all.length > 1 ? `the ${d.label.toLowerCase()}s` : f.name}.` } });
      return ok({ ids: all.map((x) => x.id) });
    }
    case 'thankGift': {
      const f = t.fish.find((x) => x.id === a.id && x.gift && !x.gift.wrapped); if (!f) return fail('NOT_FOUND'); if (f.owner !== uid) return fail('NOT_YOURS');
      if (f.gift.thanked) return ok({ applied: false });
      for (const x of t.fish) if (x.gift?.id === f.gift.id) x.gift.thanked = now;
      events.push({ journal: `${name} thanked ${f.gift.from} for ${f.name}.`, giftOpened: { to: f.gift.fromId, text: `${name} says thank you for ${f.name}!` } });
      return ok();
    }
    case 'bottle': {
      const to = members?.find((m) => m.id === a.to); if (!to || to.id === uid) return fail('NOT_A_FRIEND');
      const note = String(a.note ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80); if (!note) return fail('BAD_NAME');
      if (now - ((t.flags.bottleAt ||= {})[uid] ?? -Infinity) < 6 * HOUR || t.bottles.some((b) => b.from === uid && now - b.at < 6 * HOUR)) return fail('TOO_SOON');   // remembered after the bottle is opened, so opening it cannot reset the wait
      if (t.shells < 2) return fail('NOT_ENOUGH_SHELLS'); if (t.bottles.length >= 12) return fail('TANK_CROWDED');
      t.shells -= 2; t.flags.bottleAt[uid] = now; t.bottles.push({ id: nextId(t, 'b'), from: uid, fromName: name, to: to.id, note, at: now });
      events.push({ activity: { type: 'bottle', text: `${name} sent ${to.name} a bottle.` }, toast: `Bottle sent to ${to.name}` }); return ok();
    }
    case 'openBottle': {
      const b = t.bottles.find((x) => x.id === a.id && x.to === uid); if (!b) return ok({ applied: false, delta: 0 });
      t.bottles.splice(t.bottles.indexOf(b), 1); t.shells += BOTTLE_PAY;
      events.push({ activity: { type: 'bottle', text: `${name} found a bottle from ${b.fromName}.` } }); levelCheck(t, now, events); return ok({ applied: true, delta: BOTTLE_PAY, from: b.fromName, fromId: b.from, note: b.note, at: b.at });      // (the words are for the one who found it: no toast for everyone)
    }
    case 'glassNote': {                                             // a note left on the glass for the others: one per person (a new one replaces your last), gone after three days
      const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120); if (!txt) return fail('BAD_NAME');
      const color = NOTE_COLORS.includes(a.color) ? a.color : NOTE_COLORS[0], doodle = NOTE_DOODLES.includes(a.doodle) ? a.doodle : NOTE_DOODLES[0];
      for (const o of (t.notes ?? []).filter((n) => n.by === uid)) logNote(t, o); t.notes = (t.notes ?? []).filter((n) => n.by !== uid); const n = { id: nextId(t, 'n'), by: uid, name, text: txt, color, doodle, at: now, read: [] }; t.notes.push(n);
      events.push({ activity: { type: 'note', text: `${name} left a note on the glass.` }, glassNote: n.id }); return ok({ id: n.id });
    }
    case 'readNote': { const n = [...(t.notes ?? []), ...(t.noteLog ?? [])].find((x) => x.id === a.id); if (!n) return fail('NOT_FOUND'); if (a.dismiss) { n.gone = [...new Set([...(n.gone ?? []), uid])]; } if (n.by !== uid && !n.read.includes(uid)) { n.read.push(uid); if (a.heart) { n.hearts = [...(n.hearts ?? []), name]; events.push({ activity: { type: 'note', text: `${name} loved ${n.name}'s note.` } }); } } return ok(); }
    case 'editNote': { const n = (t.notes ?? []).find((x) => x.id === a.id); if (!n) return fail('NOT_FOUND'); if (n.by !== uid) return fail('NOT_YOURS');      // your own note, changed where it sticks (its hearts stay)
      const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120); if (!txt) return fail('BAD_NAME'); n.text = txt; if (NOTE_COLORS.includes(a.color)) n.color = a.color; if (NOTE_DOODLES.includes(a.doodle)) n.doodle = a.doodle; n.edited = now; return ok(); }
    case 'moveNote': { const n = (t.notes ?? []).find((x) => x.id === a.id); if (!n) return fail('NOT_FOUND'); if (n.by !== uid) return fail('NOT_YOURS');      // where on the glass it sticks, as a share of the screen, the same on every phone
      const x = Math.max(0, Math.min(1, +a.x || 0)), y = Math.max(0, Math.min(1, +a.y || 0)); n.pos = { x: +x.toFixed(3), y: +y.toFixed(3) }; return ok(); }
    case 'keepNote': { const n = (t.notes ?? []).find((x) => x.id === a.id); if (!n) return fail('NOT_FOUND'); if (n.by === uid) return fail('NOT_YOURS');      // peel someone's note off your glass and keep it
      n.gone = [...new Set([...(n.gone ?? []), uid])]; if (!n.read.includes(uid)) n.read.push(uid); t.kept ||= {}; const mine = (t.kept[uid] ||= []); if (!mine.some((k) => k.id === n.id)) mine.unshift({ id: n.id, by: n.by, name: n.name, text: n.text, color: n.color, doodle: n.doodle, at: n.at, kept: now }); t.kept[uid] = mine.slice(0, 30);
      events.push({ activity: { type: 'note', text: `${name} kept ${n.name}'s note.` } }); return ok(); }
    case 'peelNote': { const n = (t.notes ?? []).find((x) => x.id === a.id); if (!n) return fail('NOT_FOUND'); if (n.by !== uid) return fail('NOT_YOURS'); logNote(t, n); t.notes = t.notes.filter((x) => x !== n); return ok(); }
    case 'note': {
      const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 90); if (!txt) return fail('BAD_NAME');
      events.push({ journal: `${name}: “${txt}”` }); return ok();
    }
    case 'devSea': {                                               // the developer's seahorse lifecycle test: only ever on a test aquarium (the server decides)
      if (!test) return fail('FORBIDDEN');
      const why = devSea(t, String(a.op ?? ''), now, events); return why ? fail(why) : ok({ stage: seaStage(t, now) });
    }
    case 'dev': {
      if (!dev) return fail('FORBIDDEN');
      if (a.what === 'shells') t.shells += 50;
      if (a.what === 'rush') { for (const o of t.orders) o.arrivesAt = now; events.push(...advance(t, now)); }
      if (a.what === 'neglect') { t.createdAt -= 10 * DAY; t.lastDeath = 0; t.hunger = 0.85; t.water = 0.45; t.fish.forEach((f, i) => { f.ail = i === 0 ? AIL_DIE : i === 1 ? AIL_WARN + 100 : f.ail; if (i === 0) f.health = 0.2; }); events.push(...advance(t, now)); }
      if (a.what === 'visitor') { t.visitAt = now; t.visitWait = true; t.flags.tut = Math.max(t.flags.tut ?? 0, 5); events.push(...advance(t, now)); }
      if (a.what === 'egg') { t.eggAt = now; for (const f of t.fish) f.born -= 4 * DAY; events.push(...advance(t, now)); }
      if (a.what === 'hatch') { for (const e of t.eggs) { e.hatchAt = now; e.watch = now; } events.push(...advance(t, now)); }
      if (a.what === 'drift') { t.driftAt = now; events.push(...advance(t, now)); }
      if (a.what === 'adventure') { (t.adv ||= {}).octoAt = now; t.flags.tut = Math.max(t.flags.tut ?? 0, 5); t.createdAt = Math.min(t.createdAt, now - 4 * DAY); events.push(...advance(t, now)); }      // Little Adventures: a chance for the octopus to go now (a homebody may still stay in)
      if (a.what === 'moment') { (t.adv ||= {}).smallAt = now; t.flags.tut = Math.max(t.flags.tut ?? 0, 5); events.push(...advance(t, now)); }
      if (a.what === 'advRate') t.flags.advRate = Math.max(0.1, Math.min(100, Number(a.rate) || 1));      // testing: adventures this many times as often
      if (a.what === 'day') { for (const f of t.fish) f.born -= DAY; t.hunger = Math.min(0.85, t.hunger + 0.3); t.water = Math.max(0.45, t.water - 0.2); t.glass = Math.min(0.8, t.glass + 0.3); events.push(...advance(t, now)); }
      return ok();
    }
    default: return fail('UNKNOWN_ACTION');
  }
}
