// OUR TANK game rules. Pure functions with no browser or server dependencies, so the exact same code
// runs on the server (authoritative, shared tank) and in the browser (solo tank).
import { skyOf } from './sky.js';
import { genesOf, blendGenes, seededRandom } from './genes.js';
export { genesOf };
export const SPECIES_DEF = {
  goldfish:  { label: 'Clownfish',  price: 10,  level: 1, wait: 10, count: 1, blurb: 'Bold and curious. Loves a hiding place.', traits: ['Curious', 'Social', 'Brave', 'Playful', 'Greedy'], speed: 1.0 },
  neon:      { label: 'Blue Chromis', price: 20, level: 1, wait: 20, count: 4, blurb: 'A shimmering school of four.',        traits: ['Social', 'Playful'], speed: 1.3, school: true },
  cory:      { label: 'Yellow Goby', price: 18, level: 2, wait: 60, count: 1, blurb: 'A tidy little reef sitter.',             traits: ['Shy', 'Lazy', 'Calm'], speed: 0.55 },
  blue:      { label: 'Royal Gramma', price: 28, level: 2, wait: 90, count: 1, blurb: 'A shy jewel of the reef.',         traits: ['Shy', 'Lazy', 'Brave', 'Curious'], speed: 0.9 },
  guppy:     { label: 'Damselfish', price: 18, level: 2, wait: 25, count: 2, blurb: 'A feisty, colourful pair.',   traits: ['Playful', 'Social', 'Curious'], speed: 1.1 },
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
  red:      { label: 'Red Gorgonian',     cat: 'PLANTS',     price: 10,  level: 1, blurb: 'A bright pop of colour.' },
  rock:     { label: 'Reef Rock',   cat: 'ROCKS',      price: 6,  level: 1, blurb: 'Small and mossy.' },
  boulder:  { label: 'Reef Boulder',       cat: 'ROCKS',      price: 12,  level: 1, blurb: 'A big rock to hide behind.' },
  starfish: { label: 'Starfish',      cat: 'SPECIAL',    price: 4,  level: 1, blurb: 'A cheerful little star.' },
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
  anemone:  { label: 'Sea Anemone',  cat: 'PLANTS',     price: 16, level: 2, blurb: 'Soft tentacles that sway. A clownfish favourite.' },
  brain:    { label: 'Brain Coral',   cat: 'ROCKS',      price: 14, level: 2, blurb: 'A ridged dome of coral.' },
  table:    { label: 'Table Coral',   cat: 'ROCKS',      price: 20, level: 3, blurb: 'A wide shelf to hover under.' },
  coconut:  { label: 'Coconut Shell', cat: 'ROCKS',      price: 8,   level: 2, blurb: 'A hollow half-shell. Octopuses like to hide under one.' },
  pot:      { label: 'Clay Pot',      cat: 'STRUCTURES', price: 14,  level: 2, blurb: 'A little den on its side, just the right size to curl up in.' },
  arch:     { label: 'Stone Arch',    cat: 'STRUCTURES', price: 30, level: 4, blurb: 'A little arch to swim through.' },
};
export const LEVEL_AT = [0, 14, 36, 66, 100, 140, 184, 220];                     // score needed for level 1..5
export const MAX_DECOR = 60;
export const BOUNDS = { x: [-4.4, 4.4], z: [-1.0, 3.3] };
export const NAMES = ['Pip', 'Mango', 'Bubbles', 'Nori', 'Coral', 'Biscuit', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Waffles', 'Misty'];
const HR = 1 / (5 * 3600), WR = 1 / (48 * 3600), GR = 1 / (30 * 3600);   // per second
const DAY = 864e5;

export const STAGE_SCALE = { baby: 0.62, juvenile: 0.82, adult: 1 };
export function stageOf(fish, now = Date.now()) { const d = (now - fish.born) / DAY; return d < 1 ? 'baby' : d < 3 ? 'juvenile' : 'adult'; }
export function nextStage(fish, now = Date.now()) {
  const age = now - fish.born, s = stageOf(fish, now);
  if (s === 'adult') return null;
  const ms = (s === 'baby' ? 1 : 3) * DAY - age, h = Math.ceil(ms / 36e5);
  return { to: s === 'baby' ? 'juvenile' : 'adult', ms, label: h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h <= 1 ? 'under an hour' : `${h}h` };
}
// What is coming, in plain words, for the end of the first session: a reason to come back that is actually true.
export function firstPromises(t, now = Date.now()) {
  const out = [], f = t.fish[0], n = f && nextStage(f, now); if (n) out.push(`${f.name} grows up in ${n.label}.`);
  if (!t.drift && t.driftAt > now) out.push('Something will turn up in the tank within a few hours.');
  if (t.visitAt && t.visitAt > now && t.visitAt - now < 30 * HOUR) out.push('A rare visitor may drop by tomorrow.');
  out.push('Tomorrow the tank has a new request for you.'); return out.slice(0, 4);
}
export const levelFor = (score) => LEVEL_AT.reduce((l, need, i) => (score >= need ? i + 1 : l), 1);
// one fish is a quarter cheaper each day; a reason to look in the shop, never a penalty for missing a day
export const dailyFish = (now = Date.now()) => { const ids = Object.keys(SPECIES_DEF).filter((k) => !SPECIES_DEF[k].visitor); return ids[Math.floor(now / 864e5 + 3) % ids.length]; };
export const fishPrice = (id, now = Date.now()) => { const p = SPECIES_DEF[id].price; return id === dailyFish(now) ? Math.max(1, Math.ceil(p * 0.75)) : p; };
// The first fish is free and chosen: one of these, named by the player who brings it in.
export const FIRST_FISH = ['goldfish', 'seahorse', 'octopus', 'neon'];
export const isFree = (t, type) => (t.flags.starter?.[type] ?? 0) > 0 || (t.flags.freePlant > 0 && DECOR_DEF[type].cat === 'PLANTS');
export const FLOORS = { sand: 'Sand', pearl: 'Pearl', gravel: 'Gravel', black: 'Black sand', coral: 'Pink coral' };
export const BACKDROPS = { candy: 'Candy', lagoon: 'Lagoon', sunset: 'Sunset', mint: 'Mint' };
// Sand and Candy are free; the other looks are bought once with shells and kept by the tank.
export const STYLE_PRICE = { floor: { sand: 0, pearl: 20, gravel: 20, black: 30, coral: 40 }, backdrop: { candy: 0, lagoon: 25, sunset: 25, mint: 25 } };
export const styleOwned = (t, kind, key) => !(STYLE_PRICE[kind]?.[key] > 0) || !!t.flags.styles?.[kind]?.[key];
export const pending = (t) => (t.orders ?? []).reduce((n, o) => n + SPECIES_DEF[o.species].count, 0);
export const capacity = (level) => 4 + 3 * level;
export function scoreOf(t, now = Date.now()) { return t.fish.length * 2 + t.decor.length + t.fish.filter((f) => stageOf(f, now) === 'adult').length * 2 + ((t.seen?.fish.length ?? 0) + (t.seen?.decor.length ?? 0)) + 3 * (t.wishIdx ?? 0); }
export function traitsFor(species, seed) { const pool = SPECIES_DEF[species].traits, a = pool[seed % pool.length], b = pool[(seed * 7 + 3) % pool.length]; return a === b ? [a] : [a, b]; }

// ── each fish has its own needs: it gets hungry at its own pace, and its happiness and health are real state ──
const APPETITE = { Greedy: 0.3, Playful: 0.1, Social: 0.05, Curious: 0.05, Lazy: -0.2, Calm: -0.1, Shy: -0.05, Brave: 0 };
export const appetiteOf = (traits = [], seed = 0) => Math.max(-0.25, Math.min(0.35, (traits.reduce((a, x) => a + (APPETITE[x] ?? 0), 0)) + ((seed % 7) - 3) * 0.02));
export function ensureFish(f) { if (f.happy == null) f.happy = 0.7; if (f.health == null) f.health = 1; if (f.appetite == null) f.appetite = appetiteOf(f.traits, f.seed); return f; }
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
export function needsOf(f, t, now = Date.now()) {
  ensureFish(f);
  const fed = Math.max(0, Math.min(1, 1 - t.hunger * (1 + f.appetite))), h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const energy = Math.max(0.1, Math.min(1, 0.55 + 0.4 * Math.sin(((h - 6) / 24) * Math.PI * 2) + ((f.traits ?? []).includes('Lazy') ? -0.15 : 0) + ((f.traits ?? []).includes('Playful') ? 0.1 : 0)));
  const mood = fed < 0.25 ? 'Hungry' : f.health < 0.5 ? 'Under the weather' : energy < 0.3 ? 'Sleepy' : f.happy > 0.75 ? 'Happy' : f.happy < 0.4 ? 'Gloomy' : 'Content';
  return { fed, happy: f.happy, energy, health: f.health, mood, vigor: 0.65 + 0.35 * Math.min(f.health, 0.4 + fed * 0.6) };
}
// Food: flakes are free, pellets and treats cost shells per drop and make fish happier. Each fish has a favourite.
export const FOODS = { flakes: { label: 'Flakes', price: 0 }, pellets: { label: 'Pellets', price: 2 }, treats: { label: 'Treats', price: 4 } };
export const favFoodOf = (f) => ((f.traits ?? []).includes('Greedy') ? 'treats' : (f.traits ?? []).some((x) => ['Shy', 'Lazy', 'Calm'].includes(x)) ? 'pellets' : 'flakes');
// Favourite spots and friendships come from what is really in the tank. Each is found once per fish, after it has lived here a while.
const SPOT = { Shy: ['PLANTS', 4, 'the plants'], Curious: ['STRUCTURES', 1, 'the structures'], Lazy: ['WOOD', 1, 'the driftwood'], Playful: ['SPECIAL', 1, 'the special things'], Brave: ['ROCKS', 2, 'the rocks'] };
export function favouriteOf(f, t) {
  for (const tr of f.traits ?? []) { const sp = SPOT[tr]; if (sp && count(t, sp[0]) >= sp[1]) { const hit = t.decor.find((d) => DECOR_DEF[d.type]?.cat === sp[0]); return { label: hit ? DECOR_DEF[hit.type].label.toLowerCase() : sp[2], key: tr }; } }
  return null;
}
// What fish are noticed doing. Each is recorded once per fish (`f.disc[key]`), permanently, and written to the journal.
// Some are noticed by the server from state; the rest are reported by a watching phone (`observe`) and checked here.
export const DISCOVERIES = {
  friend: { label: 'Found a best friend' }, spot: { label: 'Found a favourite spot' }, bond: { label: 'Trusts a caretaker' }, trust: { label: 'Follows a fingertip' }, parent: { label: 'Became a parent' },
  glass: { label: 'Comfortable at the glass', traits: ['Brave', 'Social'], line: (f) => `${f.name} has become comfortable near the glass.` },
  surface: { label: 'Waits at the surface', traits: ['Greedy'], line: (f) => `${f.name} has started waiting near the surface at feeding time.` },
  night_rest: { label: 'Rests at night', traits: null, line: (f) => `${f.name} settles low in the tank to rest at night.` },
  hideaway: { label: 'Has a hiding place', traits: ['Shy'], needsDecor: true, line: (f, x) => `${f.name} has a new hiding place behind the ${x.decor}.` },
  regular: { label: 'Returns to one decoration', traits: null, needsDecor: true, line: (f, x) => `${f.name} keeps coming back to the ${x.decor}.` },
  object: { label: 'Investigates objects', traits: ['Curious'], needsDecor: true, line: (f, x) => `${f.name} has started investigating the ${x.decor}.` },
  together: { label: 'Swims with a friend', traits: null, pair: true, line: (f, x) => `${f.name} and ${x.other} have begun swimming together.` },
  bubbles: { label: 'Plays in the bubbles', traits: ['Playful'], needsBubbler: true, line: (f) => `${f.name} has found the bubbles and plays in them.` },
  food: { label: 'Loves its favourite food', serverOnly: true, line: (f, x) => `${f.name} loves ${x.food}.` },
  routine: { label: 'Has a daily routine', traits: null, line: (f) => `${f.name} has settled into a daily routine.` },
};
export const FRIEND_REWARD = 3, AGE_REWARDS = [[14, 5], [30, 8]], FIRST_HATCH_REWARD = 5;
function unlock(t, f, key, now, ev, x = {}) {
  const d = DISCOVERIES[key]; if (!d) return false; f.disc ||= {}; const k = d.pair ? `${key}:${x.otherId}` : key; if (f.disc[k] || (d.pair && f.disc[key + ':' + x.otherId])) return false;
  f.disc[k] = now; if (d.pair) { f.disc.together = f.disc.together ?? now; if (x.otherObj) { x.otherObj.disc ||= {}; x.otherObj.disc['together:' + f.id] ??= now; x.otherObj.disc.together ??= now; } } if (!d.line) return true;
  ev.push({ journal: d.line(f, x), noticed: f.id, toast: d.line(f, x) }); return true;
}
function discover(t, now, ev) {
  const social = t.fish.filter((f) => (f.traits ?? []).includes('Social') && f.species !== 'neon');
  for (const f of t.fish) {
    ensureFish(f); f.found ||= []; if (now - f.born < 2 * 3600e3 || f.happy < 0.7) continue;
    const fav = favouriteOf(f, t);
    if (fav && !f.found.includes('spot')) { f.found.push('spot'); (f.disc ||= {}).spot ??= now; const dd = t.decor.find((d) => DECOR_DEF[d.type]?.cat === SPOT[fav.key]?.[0]); if (dd) f.spotId = dd.id; t.shells += 2; ev.push({ journal: `${f.name} found a favourite spot near the ${fav.label}.`, toast: `${f.name} found a favourite spot! +2 shells`, discovery: f.id }); }
    else if (social.length >= 2 && social.includes(f) && !f.found.includes('friend')) { const pal = social.find((o) => o !== f && !(o.found ?? []).includes('friend')) ?? social.find((o) => o !== f), key = [f.id, pal.id].sort().join('+'), first = !(t.flags.pairs ||= {})[key]; t.flags.pairs[key] = now; f.pal = pal.id; pal.pal ??= f.id; (f.disc ||= {}).friend ??= now; (pal.disc ||= {}).friend ??= now; f.found.push('friend'); pal.found ||= []; if (!pal.found.includes('friend')) pal.found.push('friend'); if (first) t.shells += FRIEND_REWARD; ev.push({ journal: `${f.name} and ${pal.name} have been spending more time together.`, toast: first ? `${f.name} made a friend. +${FRIEND_REWARD} shells` : `${f.name} and ${pal.name} are friends now!`, discovery: f.id }); }
  }
}
// Neglect is real. A fish that is starving or sitting in foul water slowly weakens (`ail`, in seconds); care wins the time back twice as fast.
// Days 1-2 normal. Day 3 (2d) sluggish and paler, growth pauses. Day 4 (3d) critical: slow, less appetite, a warning goes out.
// Day 5 (4d-5d) death is possible if the fish's own health stays critically low. Guard rails: no deaths in a new tank's first three days, at most one a day, the last fish never dies.
// A fish counts as going hungry only once it has gone this long without any feeding. Hunger itself rises to its cap within hours, so judging by the hunger bar alone would call a once-a-day caretaker neglectful.
export const FED_GRACE = 30 * 3600e3;
export const AIL_TIRED = 2 * 86400, AIL_WARN = 3 * 86400, AIL_DIE = 5 * 86400;       // day 3 sluggish and paler, day 4 critical, day 5 death becomes possible
function memorialOf(t, f, now) {
  const ms = [...(f.story ?? []).slice(0, 8).map((x) => x.text), `Reached the ${stageOf(f, now)} stage`]; if (f.found?.includes('spot')) ms.push(f.spotId ? `Found a favourite spot by the ${DECOR_DEF[t.decor.find((d) => d.id === f.spotId)?.type]?.label?.toLowerCase() ?? 'decorations'}` : 'Found a favourite spot');
  const pal = t.fish.find((x) => x.id === f.pal); if (pal) ms.push(`Best friends with ${pal.name}`); for (const [d] of AGE_REWARDS) if (f.found?.includes('age' + d)) ms.push(`Reached ${d} days old`); for (const k of f.tricks ?? []) ms.push(`Learned to ${TRICKS[k]?.label ?? k}`); if (Object.values(f.bond ?? {}).some((n) => n >= 10)) ms.push('Learned to trust a caretaker');
  return { id: f.id, name: f.name, species: f.species, born: f.born, died: now, owner: f.owner ?? null, ownerName: f.ownerName ?? null, traits: f.traits ?? [], milestones: ms, parents: (f.parents ?? []).map(lineOf), gen: f.gen ?? 0, disc: Object.keys(f.disc ?? {}), rested: null };
}
function tendFish(t, dt, now, ev = [], h0 = t.hunger, w0 = t.water) {
  for (const f of [...t.fish]) {
    ensureFish(f); const n = needsOf(f, t, now);
    // walk through the interval in half-hour steps so a feeding in the middle of it counts
    const steps = Math.max(1, Math.min(480, Math.ceil(dt / 1800))); f.ail = f.ail ?? 0; const stepMs = (dt / steps) * 1000;
    for (let k = 0; k < steps; k++) {
      const el = ((k + 0.5) / steps) * dt, hun = Math.min(t.hunger, h0 + el * HR), wat = Math.max(t.water, w0 - el * WR * (1 + 0.5 * Math.min(2, t.floaters.length))), fedK = 1 - hun * (1 + f.appetite), at = now - (dt - el) * 1000, hungry = fedK < 0.2 && at - (t.lastFed ?? -Infinity) > FED_GRACE, bad = hungry || wat < 0.5;
      f.ail = Math.max(0, f.ail + (bad ? dt / steps : -(dt / steps) * 2)); if (bad && f.ail >= AIL_TIRED) f.born += stepMs;      // growth pauses once a fish is run down
    }
    const target = Math.min(1, 0.3 + 0.28 * t.water + 0.12 * (1 - t.glass) + 0.18 * n.fed + likes(f, t));
    f.happy += (target - f.happy) * Math.min(1, dt / 2400);
    // health follows how long the fish has really been neglected: it sinks toward critical over days, and climbs back quickly with care
    const ht = t.water > 0.5 && n.fed > 0.2 ? 1 : Math.max(0.2, 0.4 + 0.6 * Math.min(t.water, n.fed + 0.2) - 0.45 * Math.min(1, f.ail / AIL_DIE));
    f.health = Math.max(0.2, Math.min(1, f.health + (ht - f.health) * Math.min(1, dt / (ht < f.health ? 5400 : 1800))));
    if (f.ail < AIL_TIRED) { f.warned = false; f.tiredSaid = false; }
    else if (!f.tiredSaid) { f.tiredSaid = true; ev.push({ journal: `${f.name} looks tired. It needs food and clean water.`, toast: `${f.name} looks tired. A little care would help.`, tired: f.id }); }
    else if (f.ail >= AIL_WARN && !f.warned) { f.warned = true; ev.push({ journal: `${f.name} is in a critical state. It needs food and clean water.`, toast: `${f.name} is in a critical state. The tank needs care.`, warn: f.id }); }
    // death follows the fish's real condition: five days of neglect AND health that has stayed critically low, then the guard rails
    if (f.ail >= AIL_DIE && f.health <= 0.4 && t.flags.mortality !== false) {
      const young = now - t.createdAt < 3 * 86400e3, rested = now - (t.lastDeath ?? 0) < 86400e3;
      if (young || rested || t.fish.length <= 1) f.ail = AIL_DIE - 1;
      else {
        t.fish.splice(t.fish.indexOf(f), 1); t.lastDeath = now; (t.memorial ||= []).push(memorialOf(t, f, now));
        (t.floaters ||= []).push({ id: f.id, name: f.name, species: f.species, seed: f.seed, stage: f.stage, born: f.born, died: now, owner: f.owner ?? null, ownerName: f.ownerName ?? null, traits: f.traits ?? [] });
        ev.push({ journal: `${f.name} has passed away.`, toast: `${f.name} has passed away.`, died: f.id }); continue;
      }
    } else if (f.ail >= AIL_DIE) f.ail = AIL_DIE - 1;
  }
}

// Older saves and fresh worlds both go through this, so every field below always exists.
export function norm(t, now = Date.now()) {
  t.flags ||= { tut: 0 }; t.style ||= { floor: 'sand', backdrop: 'candy' }; t.orders ||= []; t.eggs ||= []; t.memorial ||= []; t.floaters ||= []; t.bottles ||= []; t.visitor ??= null; t.visitAt ??= now + 6 * 3600e3; t.eggAt ??= now + 18 * 3600e3; t.storyAt ??= now + 3 * 3600e3; t.drift ??= null; t.driftAt ??= now + 20 * 60e3; t.wishIdx ??= 0; t.flags.collMs ??= 0; t.wantAt ??= now + 3 * 3600e3; t.want ??= null; t.req ??= null;
  // Repair: whatever an older version or a damaged save left behind must not stop a tank from running (one broken fish once kept an order from ever arriving).
  if (!Array.isArray(t.fish)) t.fish = []; if (!Array.isArray(t.decor)) t.decor = [];
  t.fish = t.fish.filter((f) => f && typeof f === 'object' && SPECIES_DEF[f.species]);
  for (const f of t.fish) { if (!Array.isArray(f.traits)) f.traits = []; if (typeof f.name !== 'string' || !f.name) f.name = 'Fish'; if (!Number.isFinite(f.born)) f.born = now; if (typeof f.stage !== 'string') f.stage = 'baby'; if (typeof f.id !== 'string') f.id = 'f' + (t.seq = (t.seq ?? 10) + 1); if (!Number.isFinite(f.seed)) f.seed = 1; }
  t.decor = t.decor.filter((d) => d && DECOR_DEF[d.type] && typeof d.id === 'string');
  t.orders = t.orders.filter((o) => o && SPECIES_DEF[o.species] && Number.isFinite(o.arrivesAt)); t.eggs = t.eggs.filter((e) => e && Number.isFinite(e.hatchAt));
  if (!Number.isFinite(t.shells)) t.shells = 10; if (!Number.isFinite(t.level)) t.level = 1; t.level = Math.max(1, Math.min(8, t.level | 0));
  for (const k of ['hunger', 'water', 'glass']) if (!Number.isFinite(t[k])) t[k] = k === 'water' ? 1 : 0.5;
  t.schema = 1;
  t.seen ||= { fish: [...new Set(t.fish.map((f) => f.species))], decor: [...new Set(t.decor.map((d) => d.type))] };
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
  const f = ensureFish({ id: nextId(t, 'f'), name: fname, species: o.species, seed, born: now, stage: 'baby', traits: traitsFor(o.species, seed), happy: 0.75, owner: o.owner ?? null, ownerName: o.ownerName ?? null }); t.fish.push(f);
  if (!t.seen.fish.includes(o.species)) t.seen.fish.push(o.species); return f;
}
const HOUR = 3600e3, BOTTLE_PAY = 2;      // a bottle pays what it cost to send, so swapping bottles cannot make shells
// A snapshot of a fish for its family record, so a family tree survives its members: identity, look, generation and its own parents' names.
const snap = (f) => f && ({ id: f.id, name: f.name, species: f.species, seed: f.seed, traits: f.traits ?? [], genes: f.genes ?? genesOf(f.seed), gen: f.gen ?? 0, owner: f.owner ?? null, ownerName: f.ownerName ?? null, parents: (f.parents ?? []).map((p) => ({ id: p.id, name: p.name })) });
const lineOf = (p) => ({ id: p.id, name: p.name, parents: (p.parents ?? []).map((q) => ({ id: q.id, name: q.name })) });
export const parentsOf = (f) => f.parents ?? [];
export function childrenOf(t, id) { return [...t.fish.filter((f) => (f.parents ?? []).some((p) => p.id === id)).map((f) => ({ id: f.id, name: f.name, alive: true })), ...(t.memorial ?? []).filter((m) => (m.parents ?? []).some((p) => p.id === id)).map((m) => ({ id: m.id, name: m.name, alive: false }))]; }
function puzzles(t, now, ev) {
  for (const f of t.fish) {
    const p = f.puzzle; if (!p || now < p.until) continue;
    f.puzzle = null; f.solved = (f.solved ?? 0) + 1; f.bestSecs = Math.min(f.bestSecs ?? 1e9, p.secs); f.happy = Math.min(1, (f.happy ?? 0.7) + 0.15);
    if (p.by) { f.bond ||= {}; f.bond[p.by] = (f.bond[p.by] ?? 0) + 1; }
    const first = f.solved === 1; if (first) t.shells += PUZZLE_FIRST_REWARD;
    ev.push({ journal: first ? `${f.name} worked out the puzzle jar.` : f.solved === 4 ? `${f.name} opens the puzzle jar in ${p.secs} seconds now.` : `${f.name} opened the puzzle jar in ${p.secs} seconds.`, puzzle: f.id, ...(first ? { toast: `${f.name} worked out the jar! +${PUZZLE_FIRST_REWARD} shells`, milestone: f.id } : {}) });
  }
}
function visitors(t, now, ev) {
  if (t.visitor && now >= t.visitor.until) { t.visitor = null; t.visitAt = now + (9 + (hash32(now / 6e4) % 6)) * HOUR; }
  if (t.visitor || now < t.visitAt || (t.flags.tut ?? 0) < 5) return;
  const all = Object.keys(SPECIES_DEF).filter((k) => SPECIES_DEF[k].visitor), fresh = all.filter((k) => !t.seen.fish.includes(k)), lure = themesOf(t).filter((x) => x.active && x.visitor && fresh.includes(x.visitor)).map((x) => x.visitor), pool = lure.length ? lure : fresh.length ? fresh : all;       // a theme draws its own kind of visitor
  const seq = (t.seq = (t.seq ?? 10) + 1), sp = pool[hash32(seq * 17 + Math.floor(now / 6e4)) % pool.length], d = SPECIES_DEF[sp];
  t.visitor = { id: 'v' + seq, species: sp, seed: hash32(seq * 13) % 90000, until: now + 3 * HOUR };
  ev.push({ journal: `A ${d.label} is visiting the tank.`, toast: `A rare visitor: ${d.label}! Tap it to say hello.`, visitor: true });
}
function eggs(t, now, ev) {
  for (const e of [...t.eggs]) {
    if (e.hatchAt > now) continue; t.eggs.splice(t.eggs.indexOf(e), 1);
    const A = e.pa ?? snap(t.fish.find((f) => f.id === e.a)), B = e.pb ?? snap(t.fish.find((f) => f.id === e.b)), h = hash32(e.hatchAt / 1e3);
    const seed = (h & 1 ? B?.seed : A?.seed) ?? e.seed, pick = (p, k) => (p?.traits?.length ? p.traits[(h >> k) % p.traits.length] : null);       // the pattern comes from one parent, the tint and size from both
    const traits = [...new Set([pick(A, 1), pick(B, 3)].filter(Boolean))];
    const genes = A && B ? blendGenes(A.genes, B.genes, seededRandom(h)) : genesOf(seed), gen = Math.max(A?.gen ?? 0, B?.gen ?? 0) + 1;
    const f = ensureFish({ id: nextId(t, 'f'), name: NAMES[(t.seq + h) % NAMES.length], species: e.species, seed, born: now, stage: 'baby', traits: traits.length ? traits : traitsFor(e.species, seed), happy: 0.8, genes, gen, parents: [A, B].filter(Boolean).map(lineOf), owner: A?.owner ?? null, ownerName: A?.ownerName ?? null }); t.fish.push(f);
    ev.push({ journal: A && B ? `An egg hatched: meet ${f.name}, child of ${A.name} and ${B.name}.` : `An egg hatched: meet ${f.name}.`, toast: `The egg hatched! Meet ${f.name}.`, arrival: [f.id] });
    if (!t.flags.firstHatch) { t.flags.firstHatch = { at: now, fish: f.id, parents: [A?.id ?? null, B?.id ?? null] }; t.shells += FIRST_HATCH_REWARD; ev.push({ toast: `Your first baby fish hatched. +${FIRST_HATCH_REWARD} shells`, milestone: f.id }); }
    if (gen > (t.flags.topGen ?? 0)) { t.flags.topGen = gen; ev.push({ journal: gen === 1 ? 'The first generation hatched in this tank.' : `A ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][gen] ?? gen + 'th'} generation has hatched in this tank.` }); }
  }
  if (now < t.eggAt) return; t.eggAt = now + (16 + (hash32(now / 6e4) % 12)) * HOUR;
  if (t.fish.length + pending(t) + t.eggs.length >= capacity(t.level)) return;
  const adults = t.fish.filter((f) => stageOf(f, now) === 'adult' && !SPECIES_DEF[f.species].school), by = {};
  for (const f of adults) (by[f.species] ||= []).push(f);
  const pairs = Object.values(by).filter((g) => g.length >= 2); if (!pairs.length) return;
  const g = pairs[hash32(now / 6e4) % pairs.length], [A, B] = [g[0], g[1]];
  t.eggs.push({ id: nextId(t, 'e'), species: A.species, a: A.id, b: B.id, seed: A.seed, pa: snap(A), pb: snap(B), hatchAt: now + 4 * HOUR }); unlock(t, A, 'parent', now, ev); unlock(t, B, 'parent', now, ev);
  ev.push({ journal: `${A.name} and ${B.name} laid an egg.`, toast: 'An egg! It will hatch in a few hours.' });
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
export const WANT_REWARD = 4, WANT_GAP = 6 * 3600e3, WANT_TTL = 24 * 3600e3;
const catOpen = (t, cat) => Object.values(DECOR_DEF).some((d) => d.cat === cat && d.level <= t.level && d.price > 0);
const likeWant = (trait, cat, n, text, gift) => ({ traits: [trait], ok: (t) => count(t, cat) < n && catOpen(t, cat), done: (t) => count(t, cat) >= n, text, gift });
export const WANTS = {
  den: { octopus: true, traits: [], ok: (t) => !t.decor.some((d) => ['pot', 'coconut'].includes(d.type)), done: (t) => t.decor.some((d) => ['pot', 'coconut'].includes(d.type)), text: (f) => `${f.name} wants a den to curl up in: a clay pot or a coconut shell.`, gift: 'a den to curl up in' },
  crab: { octopus: true, traits: [], ok: (t, f) => stageOf(f) !== 'baby' && (f.crabAt == null || Date.now() - f.crabAt > 3 * 3600e3) && t.shells >= CRAB_PRICE, done: (t, f, g) => g?.type === 'crab' && g.id === f.id, text: (f) => `${f.name} is hungry for a crab. Give it a crab treat from Care.`, gift: 'a crab' },
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
// Each tank-day has exactly one request: either a fish's own wish (when one can be granted) or the tank's daily wish. Never both, so there is one thing to look at.
const wantCands = (t, now) => { const cand = []; if (t.flags.noWants) return cand; for (const f of t.fish) { if (now - f.born < 3600e3 || (f.ail ?? 0) >= AIL_TIRED) continue; for (const [k, w] of Object.entries(WANTS)) { const oct = f.species === 'octopus'; if (oct ? !w.octopus : w.octopus) continue; if ((oct || w.traits.some((x) => (f.traits ?? []).includes(x))) && w.ok(t, f)) cand.push([f, k]); } } return cand; };
export function requestKind(t, now) {
  const day = Math.floor(now / DAY);
  if (!t.req || t.req.day !== day) { t.req = { day, kind: null, wantDone: false }; t.wantAt = Math.min(t.wantAt ?? now, now); }
  if (!t.req.kind) t.req.kind = t.daily && t.daily.day === day ? 'daily' : wantCands(t, now).length && hash32(day * 53 + ((t.createdAt ?? 0) % 977)) % 100 < 45 ? 'want' : 'daily';
  return t.req.kind;
}
function rollWant(t, now, ev) {
  if (t.want && (Math.floor(t.want.since / DAY) !== Math.floor(now / DAY) || now - t.want.since > WANT_TTL)) { t.want = null; t.wantAt = now; }          // it fades quietly at the end of the day
  if (t.want || (t.flags.tut ?? 0) < 5 || now < (t.wantAt ?? 0)) return;
  if (requestKind(t, now) !== 'want' || t.req.wantDone) return;
  const cand = wantCands(t, now); if (!cand.length) { t.req.kind = 'daily'; return; }
  const [f, kind] = cand[hash32(Math.floor(now / 6e4) * 13 + (t.seq ?? 0)) % cand.length], seq = (t.seq = (t.seq ?? 10) + 1);
  t.want = { id: 'w' + seq, fish: f.id, kind, text: WANTS[kind].text(f), since: now };
  ev.push({ toast: `${f.name} has a request. See the Care tab.`, want: f.id });
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
export const trainNeed = (f) => (isSmart(f) ? 2 : TRAIN_NEED);
export const PUZZLE_COST = 3, PUZZLE_GAP = 3 * 3600e3, PUZZLE_SECS = [150, 75, 35, 15], PUZZLE_FIRST_REWARD = 3;
export const puzzleSecs = (f) => PUZZLE_SECS[Math.min(PUZZLE_SECS.length - 1, f?.solved ?? 0)];
export const canPuzzle = (f, now = Date.now()) => isSmart(f) && stageOf(f, now) !== 'baby';
// A crab treat: the octopus eats crabs, not flakes. It costs shells, makes the octopus very happy, and every crab (and every day, and every jar) adds to its hoard of shells at its den.
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
  octopus:   { kind: 'Clever', size: 3, predator: true, nature: 'A curious problem-solver that explores everything. Small fish stay wary of it.', home: { cats: ['ROCKS', 'STRUCTURES'], text: 'a rock den' }, likes: [], line: 'Small fish are wary of it. Keep it busy.' },
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
export function comfortOf(t, f) {
  let pts = 0, max = 0; const tips = [];
  const add = (w, v, tip) => { v = Math.max(0, Math.min(1, v)); max += w; pts += w * v; if (v < 0.99) tips.push([w * (1 - v), tip]); };
  add(3, t.water >= 0.7 ? 1 : (t.water - 0.45) / 0.25, 'The water needs a change.'); add(2, 1 - Math.max(0, (t.glass - 0.3) / 0.5), 'The glass needs a wipe.'); add(2, 1 - Math.max(0, (t.hunger - 0.45) / 0.4), 'A meal would help.');
  if (f.species === 'octopus') { const dens = t.decor.filter((d) => ['pot', 'coconut', 'boulder', 'rock', 'brain', 'table', 'arch', 'pillar'].includes(d.type)).length; add(2.5, dens / 2, `${f.name} wants somewhere to make a den: a clay pot, a coconut shell or a couple of rocks (${Math.min(dens, 2)} of 2).`); add(1.5, (f.crabs ?? 0) > 0 || (f.solved ?? 0) > 0 ? 1 : 0, `${f.name} would enjoy a crab treat or a puzzle jar.`); }
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
const needs = (t) => [t.hunger > 0.3 && 'feed', t.water < 0.7 && 'water', t.glass > 0.3 && 'glass'].filter(Boolean);
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
  favourite: { tier: 'special', text: 'Watch a fish at its favourite spot', need: 1, ok: withSpot },
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
export const lookedAfter = (t) => t.fish.length > 0 && t.hunger <= 0.45 && t.water >= 0.7 && t.glass <= 0.45;
export function dayLogOf(t, now) { const day = Math.floor(now / DAY); if (!t.dayLog || t.dayLog.day !== day) t.dayLog = { day, care: false, bond: false, paid: false }; return t.dayLog; }
export const dayTicks = (t, now) => { const l = dayLogOf(t, now), day = Math.floor(now / DAY); return { care: !!l.care, wish: t.req && t.req.day === day && t.req.kind === 'want' ? !!t.req.wantDone : t.daily ? t.daily.day === day && !!t.daily.done : true, bond: !!l.bond, paid: !!l.paid }; };
function dayCheck(t, now, ev, key = null) {
  if ((t.flags.tut ?? 0) < 5 || !t.fish.length) return; const l = dayLogOf(t, now);
  if (key === 'care' && lookedAfter(t)) l.care = true; if (key === 'bond') l.bond = true;
  const k = dayTicks(t, now); if (k.care && k.wish && k.bond && !l.paid) { l.paid = true; t.shells += PERFECT_DAY_REWARD; ev.push({ journal: 'A perfect day: the tank is looked after, the wish is done and a fish got some attention.', toast: `A perfect day! +${PERFECT_DAY_REWARD} shells`, perfectDay: true }); }
}
// How the tank is doing right now, in one word and one sentence.
export function tankMood(t, now = Date.now()) {
  if (!t.fish.length) return { key: 'empty', label: 'Quiet', note: 'No fish yet.' };
  const worst = Math.max(...t.fish.map((f) => f.ail ?? 0)), happy = t.fish.reduce((n, f) => n + (f.happy ?? 0.7), 0) / t.fish.length;
  if (worst >= AIL_WARN) return { key: 'neglected', label: 'Neglected', note: 'A fish is in a critical state. Feed the tank and change the water.' };
  if (worst >= AIL_TIRED || !(t.hunger <= 0.7 && t.water >= 0.5)) return { key: 'attention', label: 'Needs care', note: t.hunger > 0.7 ? 'The fish are hungry.' : t.water < 0.5 ? 'The water is cloudy.' : 'A fish looks tired.' };
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
    ev.push({ journal: o.giftFrom ? `${made[0].name} the ${d.label.toLowerCase()} has arrived, a gift from ${o.giftFrom} to ${o.ownerName}.` : d.count === 1 ? `${made[0].name} the ${d.label.toLowerCase()} has arrived.` : `The ${d.label.toLowerCase()} school has arrived.`, toast: d.count === 1 ? `${made[0].name} has arrived!` : `Your ${d.label.toLowerCase()}s have arrived!`, arrival: made.map((f) => f.id) });
  }
}
// Chapters: quiet landmarks in the life of a tank. They pay nothing, so they cannot be farmed; they are a page in the journal and a moment to notice.
// A small gift for every caretaker, once a day. No streak, nothing to catch up on: miss a day and nothing is lost or owed. It goes into the shared wallet.
export const DAILY_GIFT = 2;
const giftKey = (now, tz) => Math.floor((now + Math.max(-840, Math.min(840, Math.round(+tz) || 0)) * 60e3) / DAY);
export function giftReady(t, uid, now = Date.now(), tz = 0) {
  if ((t.flags?.tut ?? 0) < 5 || !t.fish?.length) return false;
  const last = t.flags?.gift?.[uid]; return !last || (last.key !== giftKey(now, tz) && now - last.at >= 20 * HOUR);      // a new local day AND at least 20 hours, so changing the phone's clock or zone cannot claim twice
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
  while ((t.flags.collMs ?? 0) < due) { t.flags.collMs++; t.shells += 3; ev.push({ journal: `The collection book has ${t.flags.collMs * 5} entries.`, toast: `Collection: ${t.flags.collMs * 5} found! +3 shells` }); }
  const w = WISHES[t.wishIdx]; if (w && w.done(t)) { t.wishIdx++; t.shells += w.reward; ev.push({ journal: `The tank's wish came true: ${w.text.toLowerCase()}.`, toast: `Tank wish complete! +${w.reward} shells`, wish: true }); }
}

// `empty` is a brand new tank: no fish at all until its first caretaker chooses one in the opening.
export function newWorld(now = Date.now(), seed = 1, { empty = false } = {}) {
  return {
    style: { floor: 'sand', backdrop: 'candy' }, shells: 10, hunger: 0.55, orders: [], drift: null, driftAt: now + 20 * 60e3, wishIdx: 0, water: 1, glass: 0, level: 1, createdAt: now, simTs: now, seq: 10, flags: { tut: 0, firsts: empty ? {} : { me: true }, starter: { fern: 1, grass: 1, rock: 1, starfish: 1, moss: 1 } },
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
  if (dt >= 1) {
    const h0 = t.hunger, w0 = t.water;
    t.hunger = Math.min(Math.max(t.hunger, 0.85), t.hunger + dt * HR);
    t.water = Math.max(Math.min(t.water, 0.45), t.water - dt * WR * (1 + 0.5 * Math.min(2, t.floaters.length)));   // a fish left floating fouls the water faster
    t.glass = Math.min(Math.max(t.glass, 0.8), t.glass + dt * GR);
    guard('tend', () => tendFish(t, dt, now, ev, h0, w0)); t.simTs = now;
  }
  guard('growth', () => {
    for (const f of t.fish) {                                          // growth milestones
      const s = stageOf(f, now);
      if (s !== f.stage) {
        f.stage = s;
        const helpers = Object.values(t.care ?? {}).filter((c) => now - c.ts < 24 * HOUR).map((c) => c.name), crew = helpers.length ? { activity: { type: 'grow', text: `${helpers.join(' and ')} helped ${f.name} grow up.`, noUser: true } } : {};
        if (s === 'juvenile') { t.shells += 1; ev.push({ journal: `${f.name} is growing up.`, toast: `${f.name} grew! +1 shell`, grew: f.id }, ...(helpers.length ? [crew] : [])); }
        if (s === 'adult') { t.shells += 2; ev.push({ journal: `${f.name} reached adulthood.`, toast: `${f.name} is an adult! +2 shells`, grew: f.id }, ...(helpers.length ? [crew] : [])); }
      }
    }
  });
  guard('deliver', () => deliver(t, now, ev));
  guard('age', () => ageMilestones(t, now, ev));
  guard('drift', () => { if (!t.drift && now >= t.driftAt) { t.drift = makeDrift(t, now); ev.push({ found: t.drift.id, toast: `${driftBlame(t.drift)} Tap it in the tank.` }); } });
  guard('puzzles', () => puzzles(t, now, ev)); guard('visitors', () => visitors(t, now, ev)); guard('eggs', () => eggs(t, now, ev)); guard('want', () => rollWant(t, now, ev)); guard('daily', () => rollDaily(t, now)); guard('theme', () => themeCheck(t, now, ev));
  guard('birthday', () => { const weeks = Math.floor((now - t.createdAt) / (7 * DAY)); if (weeks > (t.flags.weeks ?? 0)) { t.flags.weeks = weeks; t.shells += 8; ev.push({ journal: `Our tank is ${weeks} week${weeks > 1 ? 's' : ''} old.`, toast: `Tank birthday! ${weeks} week${weeks > 1 ? 's' : ''} old. +8 shells` }); } });   // a birthday every week of the tank's life; missing a week costs nothing
  if (dt >= 1) guard('discover', () => discover(t, now, ev));
  guard('wish', () => checkWant(t, now, ev));
  guard('level', () => levelCheck(t, now, ev));
  return ev;
}
// A fish earns these by growing up here: age counts from its arrival, and a run-down fish stops ageing (growth pauses), so only well-kept days count.
function ageMilestones(t, now, ev) {
  for (const f of t.fish) {
    f.found ||= []; const days = (now - f.born) / DAY;
    for (const [d, pay] of AGE_REWARDS) { const key = 'age' + d; if (days < d || f.found.includes(key)) continue; f.found.push(key); t.shells += pay; ev.push({ journal: `${f.name} is ${d} days old.`, toast: `${f.name} is ${d} days old. +${pay} shells`, milestone: f.id }); }
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
    const ids = new Set(); for (const k of STORY_KEYS) if (typeof e[k] === 'string') ids.add(e[k]); for (const id of e.arrival ?? []) ids.add(id);
    for (const id of ids) { const f = t.fish.find((x) => x.id === id); if (!f) continue; const text = (e.arrival && e.arrival.includes(id) ? `Arrived in the tank` : e.journal) ?? null; if (!text) continue; f.story ||= []; if (f.story.some((x) => x.text === text)) continue; f.story.push({ at: now, text }); if (f.story.length > 14) f.story.splice(1, f.story.length - 14); }
  }
}
// what is next on the calendar, in plain words, for the end of a day
export function nextUp(t, now = Date.now()) {
  const c = [];
  for (const o of t.orders ?? []) c.push([o.arrivesAt - now, `${o.name || (SPECIES_DEF[o.species]?.label ?? 'A new fish')} arrives`]);
  for (const e of t.eggs ?? []) c.push([e.hatchAt - now, 'An egg hatches']);
  for (const f of t.fish) { const n = nextStage(f, now); if (n) c.push([n.ms, `${f.name} grows up`]); }
  if (t.drift == null && t.driftAt > now) c.push([t.driftAt - now, 'Something turns up in the tank']);
  if (!t.visitor && t.visitAt > now && (t.flags.tut ?? 0) >= 5) c.push([t.visitAt - now, 'A rare visitor may drop by']);
  c.sort((a, b) => a[0] - b[0]); const x = c.find((q) => q[0] > 0); if (!x) return 'Tomorrow brings a new request.';
  const h = Math.max(1, Math.round(x[0] / 3600e3)); return `${x[1]} ${h >= 20 ? 'tomorrow' : h <= 1 ? 'within the hour' : `in about ${h} hours`}.`;
}
export function applyAction(t, a, o) { const r = _applyAction(t, a, o); if (r?.events) recordStory(t, r.events, o?.now ?? Date.now()); return r; }
export function advance(t, now = Date.now()) { const ev = _advance(t, now); recordStory(t, ev, now); return ev; }
function _applyAction(t, a, { name = 'Someone', now = Date.now(), dev = false, solo = false, uid = 'me', members = null } = {}) {
  const events = advance(t, now);
  const fail = (reason) => ({ ok: false, reason, events });
  const ok = (extra = {}) => ({ ok: true, events, ...extra });
  switch (a.t) {
    case 'dailyGift': {
      if (!giftReady(t, uid, now, a.tz)) return ok({ applied: false, delta: 0 });
      (t.flags.gift ||= {})[uid] = { key: giftKey(now, a.tz), at: now }; t.shells += DAILY_GIFT;
      events.push({ toast: `A little gift for you: +${DAILY_GIFT} shells`, gift: true }); levelCheck(t, now, events); return ok({ applied: true, delta: DAILY_GIFT });
    }
    case 'feed': {
      const food = FOODS[a.food] ? a.food : 'flakes', price = FOODS[food].price;
      t.lastFed = now;                                                // any feeding, paid or not, counts as the fish being looked after
      { const lf = t.lastFeedBy; if (lf && lf.uid !== uid && now - lf.at < 90e3 && (t.flags.togetherAt == null || now - t.flags.togetherAt > 3 * HOUR) && (t.flags.tut ?? 0) >= 5 && t.fish.length) { t.flags.togetherAt = now; for (const f of t.fish) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.05); events.push({ journal: `${lf.name} and ${name} fed the fish together.`, toast: 'Fed together! The fish are delighted.', together: true }); } t.lastFeedBy = { uid, name, at: now }; }
      if (t.hunger < 0.08) return ok({ applied: false, delta: 0 });
      if (t.shells < price) return fail('NOT_ENOUGH_SHELLS');
      const needed = t.hunger > 0.25, pay = needed && food === 'flakes' ? 1 : 0;
      t.shells -= price; t.hunger = Math.max(0, t.hunger - 0.3); t.water = Math.max(0.3, t.water - 0.015); t.shells += pay;
      if (needed) { careBy(t, uid, name, now); progress(t, 'care', events, name); progress(t, 'care2', events, name, 'feed'); }
      if (food !== 'flakes') for (const f of t.fish) { const love = favFoodOf(f) === food; f.happy = Math.min(1, (f.happy ?? 0.7) + (love ? 0.1 : 0.03)); if (love) unlock(t, f, 'food', now, events, { food }); }
      if (needed) checkWant(t, now, events, { type: 'feed', food }); dayCheck(t, now, events, 'care');
      events.push({ activity: { type: 'feed', text: food === 'flakes' ? `${name} fed the fish.` : `${name} fed the fish ${FOODS[food].label.toLowerCase()}.` } });
      return ok({ applied: true, delta: pay - price, food });
    }
    case 'water': {
      if (t.water >= 0.7) return ok({ applied: false, delta: 0 });
      t.water = 1; t.shells += 2; careBy(t, uid, name, now); progress(t, 'care', events, name); progress(t, 'care2', events, name, 'water'); checkWant(t, now, events, { type: 'water' }); dayCheck(t, now, events, 'care');
      events.push({ activity: { type: 'water', text: `${name} changed the water.` } });
      return ok({ applied: true, delta: 2 });
    }
    case 'glass': {
      if (t.glass <= 0.12) return ok({ applied: false, delta: 0 });
      t.glass = 0; t.flags.cleans = (t.flags.cleans ?? 0) + 1; const find = t.flags.cleans % 5 === 0, gain = find ? 3 : 1; t.shells += gain;
      careBy(t, uid, name, now); if (gain) { progress(t, 'care', events, name); progress(t, 'care2', events, name, 'glass'); checkWant(t, now, events, { type: 'glass' }); dayCheck(t, now, events, 'care'); }
      events.push({ activity: { type: 'glass', text: `${name} cleaned the glass.` } });
      if (find) events.push({ journal: `${name} found a pearl while cleaning the glass.`, toast: 'You found a pearl! +2 bonus shells', found: true });
      return ok({ applied: true, delta: gain });
    }
    case 'buyFish': {
      const d = SPECIES_DEF[a.species]; if (!d) return fail('UNKNOWN_SPECIES');
      if (t.level < d.level) return fail('LEVEL_TOO_LOW');
      if (t.fish.length + pending(t) + d.count > capacity(t.level)) return fail('TANK_FULL');
      const price = fishPrice(a.species, now);
      if (t.shells < price) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= price;
      const base = Math.abs(Math.floor(num(a.seed) || now)) % 100000, nm = cleanName(a.name);
      const to = a.to && a.to !== uid ? (members ?? []).find((m) => m.id === a.to) : null;                      // a gift: the fish is for a friend in the tank, who becomes its first caretaker
      t.orders.push({ id: nextId(t, 'o'), species: a.species, name: nm, seed: base, by: name, owner: to ? to.id : uid, ownerName: to ? to.name : name, giftFrom: to ? name : null, at: now, arrivesAt: now + (a.rush && dev ? 0 : d.wait * 60e3) });
      events.push({ activity: { type: 'fish', text: to ? `${name} ordered a ${d.label.toLowerCase()} as a gift for ${to.name}.` : `${name} ordered a new fish.` }, toast: `On its way! Arrives in about ${d.wait >= 60 ? Math.round(d.wait / 60) + 'h' : d.wait + ' min'}.` });
      deliver(t, now, events); levelCheck(t, now, events);
      return ok({ ordered: true, wait: d.wait });
    }
    case 'nameFish': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND');
      const nm = cleanName(a.name); if (!nm) return fail('BAD_NAME');
      const old = f.name; f.name = nm; events.push({ activity: { type: 'fish', text: `${name} renamed ${old} to ${nm}.` } }); return ok();
    }
    case 'buyDecor': {
      const d = DECOR_DEF[a.type]; if (!d) return fail('UNKNOWN_ITEM');
      const x = num(a.x), z = num(a.z), ry = num(a.ry) || 0;
      if (!(x >= BOUNDS.x[0] && x <= BOUNDS.x[1] && z >= BOUNDS.z[0] && z <= BOUNDS.z[1])) return fail('OUT_OF_BOUNDS');
      if (t.level < d.level) return fail('LEVEL_TOO_LOW');
      if (t.decor.length >= MAX_DECOR) return fail('TANK_CROWDED');
      const gift = a.free && (t.flags.starter?.[a.type] ?? 0) > 0, free = gift || (a.free && t.flags.freePlant > 0 && d.cat === 'PLANTS');   // the starter pack, or the tutorial's free plant
      if (!free && t.shells < d.price) return fail('NOT_ENOUGH_SHELLS');
      if (gift) t.flags.starter[a.type]--; else if (free) t.flags.freePlant = 0; else t.shells -= d.price;
      const item = { id: nextId(t, 'd'), type: a.type, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2), at: now }; t.decor.push(item); if (!t.seen.decor.includes(a.type)) t.seen.decor.push(a.type);
      if (d.cat === 'PLANTS') progress(t, 'plant', events, name);
      events.push({ activity: { type: 'decor', text: `${name} added ${/^[aeiou]/i.test(d.label) ? 'an' : 'a'} ${d.label.toLowerCase()}.` }, placed: item.id });
      themeCheck(t, now, events); checkWant(t, now, events); levelCheck(t, now, events);
      return ok({ id: item.id });
    }
    case 'moveDecor': {
      const it = t.decor.find((x) => x.id === a.id); if (!it) return fail('NOT_FOUND');
      const x = num(a.x), z = num(a.z); if (!(x >= BOUNDS.x[0] && x <= BOUNDS.x[1] && z >= BOUNDS.z[0] && z <= BOUNDS.z[1])) return fail('OUT_OF_BOUNDS');
      it.x = +x.toFixed(2); it.z = +z.toFixed(2); it.ry = +(num(a.ry) || 0).toFixed(2); return ok();
    }
    case 'sellDecor': {
      const i = t.decor.findIndex((x) => x.id === a.id); if (i < 0) return fail('NOT_FOUND');
      const d = DECOR_DEF[t.decor[i].type]; t.decor.splice(i, 1); t.shells += Math.floor(d.price / 2); return ok({ delta: Math.floor(d.price / 2) });
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
    case 'pet': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); ensureFish(f); f.bond ||= {}; f.petAt ||= {}; const u = uid;
      if (now - (f.petAt[u] ?? 0) < 4 * 60e3) return ok({ applied: false, delta: 0 });
      f.petAt[u] = now; f.bond[u] = (f.bond[u] ?? 0) + 1; f.happy = Math.min(1, f.happy + 0.03); (f.disc ||= {}).trust ??= now; progress(t, 'play', events, name); progress(t, 'play3', events, name, f.id); checkWant(t, now, events, { type: 'pet', id: f.id }); dayCheck(t, now, events, 'bond');
      f.found ||= []; if (f.bond[u] >= 10 && !f.found.includes('bond:' + u)) { f.found.push('bond:' + u); (f.disc ||= {}).bond ??= now; t.shells += 2; events.push({ journal: `${f.name} has started to recognise ${name}.`, toast: `${f.name} knows you now! +2 shells`, discovery: f.id }); return ok({ applied: true, delta: 2, bond: f.bond[u] }); }
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
    case 'crab': {                                                  // a crab for the octopus (shells go in, a happy octopus and a bigger hoard come out)
      const os = t.fish.filter((f) => canPuzzle(f, now)); if (!os.length) return fail('CANT_TRAIN');
      const f = (a.id ? os.find((x) => x.id === a.id) : os.slice().sort((x, y) => (x.crabAt ?? 0) - (y.crabAt ?? 0))[0]); if (!f) return fail('NOT_FOUND');
      if (f.crabAt != null && now - f.crabAt < CRAB_GAP) return ok({ applied: false, delta: 0, wait: CRAB_GAP - (now - f.crabAt), id: f.id });
      if (t.shells < CRAB_PRICE) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= CRAB_PRICE; f.crabAt = now; checkWant(t, now, events, { type: 'crab', id: f.id }); f.crabs = (f.crabs ?? 0) + 1; f.happy = Math.min(1, (f.happy ?? 0.7) + 0.12); f.bond ||= {}; f.bond[uid] = (f.bond[uid] ?? 0) + 1;
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
      const f = makeFish(t, { species: FIRST_FISH.includes(a.species) ? a.species : 'goldfish', name: cleanName(a.name), seed: Math.abs(Math.floor(num(a.seed) || now)) % 100000, owner: uid, ownerName: name }, now, 0); t.flags.firsts[uid] = true;
      events.push({ journal: `${name} brought in ${f.name}, their first fish.`, toast: `${f.name} joined the tank!`, arrival: [f.id], activity: { type: 'fish', text: `${name} added their first fish.` } }); levelCheck(t, now, events); return ok({ id: f.id });
    }
    case 'chooseFirst': {                                           // the opening of a new tank: pick the free first fish and name it (once)
      if (t.flags.intro) return fail('ALREADY_HAVE'); if (!FIRST_FISH.includes(a.species)) return fail('UNKNOWN_SPECIES');
      if (!t.fish.length && !pending(t) && !(members && !members.some((m) => m.id === uid))) {   // an empty tank: the chosen fish simply arrives
        const made = makeFish(t, { species: a.species, name: cleanName(a.name), seed: Math.abs(Math.floor(num(a.seed) || now)) % 100000, owner: uid, ownerName: name }, now, 0); t.flags.intro = now; t.flags.firsts = { ...(t.flags.firsts ?? {}), [uid]: true };
        events.push({ journal: `${name} brought in ${made.name}, the first fish.`, toast: `${made.name} has arrived!`, arrival: [made.id] }); return ok({ id: made.id });
      }
      const f = t.fish.find((x) => x.id === 'f1'); if (!f || t.fish.length > 1 || (f.owner && f.owner !== uid)) return fail('FORBIDDEN');
      const seed = Math.abs(Math.floor(num(a.seed) || now)) % 100000, nm = cleanName(a.name) || f.name;
      Object.assign(f, { species: a.species, seed, name: nm, traits: traitsFor(a.species, seed), born: now, stage: 'baby', happy: 0.75, health: 1 }); delete f.appetite; delete f.genes; ensureFish(f);
      t.seen.fish = [a.species]; t.flags.intro = now; t.flags.firsts = { ...(t.flags.firsts ?? {}), [uid]: true };
      events.push({ journal: `${name} brought in ${f.name}, the first fish.`, toast: `${f.name} is home.`, arrival: [f.id] }); return ok({ id: f.id });
    }
    case 'observe': {                                              // a phone that is watching reports what its fish are really doing
      const key = String(a.key ?? ''), f = t.fish.find((x) => x.id === a.fish); let did = false;
      const other = a.with ? t.fish.find((x) => x.id === a.with) : null, spotOk = a.spot ? t.decor.some((x) => x.id === a.spot) : false;
      const sights = { watch: ['watch'], inspect: ['greet'], together: ['together', ...(f && other && (f.pal === other.id || other.pal === f.id) ? ['friends'] : [])], visit: ['visit'], regular: ['visit', ...(f?.found?.includes('spot') && spotOk ? ['favourite'] : [])], object: ['visit', ...(f && (f.traits ?? []).includes('Curious') && spotOk ? ['investigate'] : [])], hideaway: ['visit'], bubbles: ['bubbles'] }[key] ?? [];
      for (const kind of sights) if (progress(t, kind, events, name, kind === 'greet' ? String(a.fish ?? '') : null)) did = true;
      const d = DISCOVERIES[key];
      if (d && d.line && !d.serverOnly && f && !(f.stage === 'baby' && now - f.born < 3600e3)) {
        const tr = f.traits ?? [], decor = a.spot ? t.decor.find((x) => x.id === a.spot) : null, other = d.pair ? t.fish.find((x) => x.id === a.with && x.id !== f.id) : null;
        const okTrait = !d.traits || d.traits.some((x) => tr.includes(x)), okDecor = !d.needsDecor || decor, okPair = !d.pair || other, okBubble = !d.needsBubbler || t.decor.some((x) => x.type === 'bubbler');
        if (okTrait && okDecor && okPair && okBubble && unlock(t, f, key, now, events, { decor: decor ? DECOR_DEF[decor.type].label.toLowerCase() : '', other: other?.name, otherId: other?.id, otherObj: other })) did = true;
      }
      return ok({ applied: did });
    }
    case 'greet': {
      const v = t.visitor; if (!v || v.id !== a.id) return ok({ applied: false, delta: 0 });
      const d = SPECIES_DEF[v.species]; if (!t.seen.fish.includes(v.species)) t.seen.fish.push(v.species);
      t.visitor = null; t.visitAt = now + (9 + (hash32(now / 6e4) % 6)) * HOUR; t.shells += 4;
      events.push({ activity: { type: 'visitor', text: `${name} greeted a rare visitor.` }, journal: `${name} said hello to a ${d.label}.`, toast: `${d.label} added to the book! +4 shells` }); levelCheck(t, now, events); return ok({ applied: true, delta: 4 });
    }
    case 'bottle': {
      const to = members?.find((m) => m.id === a.to); if (!to || to.id === uid) return fail('NOT_A_FRIEND');
      const note = String(a.note ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40); if (!note) return fail('BAD_NAME');
      if (now - ((t.flags.bottleAt ||= {})[uid] ?? -Infinity) < 6 * HOUR || t.bottles.some((b) => b.from === uid && now - b.at < 6 * HOUR)) return fail('TOO_SOON');   // remembered after the bottle is opened, so opening it cannot reset the wait
      if (t.shells < 2) return fail('NOT_ENOUGH_SHELLS'); if (t.bottles.length >= 12) return fail('TANK_CROWDED');
      t.shells -= 2; t.flags.bottleAt[uid] = now; t.bottles.push({ id: nextId(t, 'b'), from: uid, fromName: name, to: to.id, note, at: now });
      events.push({ activity: { type: 'bottle', text: `${name} sent ${to.name} a bottle.` }, toast: `Bottle sent to ${to.name}` }); return ok();
    }
    case 'openBottle': {
      const b = t.bottles.find((x) => x.id === a.id && x.to === uid); if (!b) return ok({ applied: false, delta: 0 });
      t.bottles.splice(t.bottles.indexOf(b), 1); t.shells += BOTTLE_PAY;
      events.push({ activity: { type: 'bottle', text: `${name} opened a bottle from ${b.fromName}.` }, toast: `${b.fromName}: “${b.note}” +${BOTTLE_PAY} shells` }); levelCheck(t, now, events); return ok({ applied: true, delta: BOTTLE_PAY, from: b.fromName, note: b.note });
    }
    case 'note': {
      const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 90); if (!txt) return fail('BAD_NAME');
      events.push({ journal: `${name}: “${txt}”` }); return ok();
    }
    case 'dev': {
      if (!dev) return fail('FORBIDDEN');
      if (a.what === 'shells') t.shells += 50;
      if (a.what === 'rush') { for (const o of t.orders) o.arrivesAt = now; events.push(...advance(t, now)); }
      if (a.what === 'neglect') { t.createdAt -= 10 * DAY; t.lastDeath = 0; t.hunger = 0.85; t.water = 0.45; t.fish.forEach((f, i) => { f.ail = i === 0 ? AIL_DIE : i === 1 ? AIL_WARN + 100 : f.ail; if (i === 0) f.health = 0.2; }); events.push(...advance(t, now)); }
      if (a.what === 'visitor') { t.visitAt = now; t.flags.tut = Math.max(t.flags.tut ?? 0, 5); events.push(...advance(t, now)); }
      if (a.what === 'egg') { t.eggAt = now; for (const f of t.fish) f.born -= 4 * DAY; events.push(...advance(t, now)); }
      if (a.what === 'hatch') { for (const e of t.eggs) e.hatchAt = now; events.push(...advance(t, now)); }
      if (a.what === 'drift') { t.driftAt = now; events.push(...advance(t, now)); }
      if (a.what === 'day') { for (const f of t.fish) f.born -= DAY; t.hunger = Math.min(0.85, t.hunger + 0.3); t.water = Math.max(0.45, t.water - 0.2); t.glass = Math.min(0.8, t.glass + 0.3); events.push(...advance(t, now)); }
      return ok();
    }
    default: return fail('UNKNOWN_ACTION');
  }
}
