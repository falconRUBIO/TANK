// OUR TANK game rules. Pure functions with no browser or server dependencies, so the exact same code
// runs on the server (authoritative, shared tank) and in the browser (solo tank).
export const SPECIES_DEF = {
  goldfish:  { label: 'Goldfish',   price: 10,  level: 1, wait: 10, count: 1, blurb: 'Curious and bold. Loves flakes.', traits: ['Curious', 'Social', 'Brave', 'Playful', 'Greedy'], speed: 1.0 },
  neon:      { label: 'Neon Tetra', price: 20, level: 1, wait: 20, count: 4, blurb: 'A glowing school of four.',        traits: ['Social', 'Playful'], speed: 1.3, school: true },
  cory:      { label: 'Corydoras',  price: 18, level: 2, wait: 60, count: 1, blurb: 'Tidy bottom dweller.',             traits: ['Shy', 'Lazy', 'Calm'], speed: 0.55 },
  blue:      { label: 'Blue Ram',   price: 28, level: 2, wait: 90, count: 1, blurb: 'A shy jewel of the tank.',         traits: ['Shy', 'Lazy', 'Brave', 'Curious'], speed: 0.9 },
  guppy:     { label: 'Guppy',      price: 18, level: 2, wait: 25, count: 2, blurb: 'A cheerful pair with big tails.',   traits: ['Playful', 'Social', 'Curious'], speed: 1.1 },
  angelfish: { label: 'Angelfish',  price: 40, level: 3, wait: 180, count: 1, blurb: 'Elegant and calm.',                traits: ['Calm', 'Curious'], speed: 0.7 },
  platy:     { label: 'Platy',      price: 24, level: 3, wait: 40, count: 2, blurb: 'Colourful, easygoing pair.',        traits: ['Social', 'Playful', 'Calm'], speed: 1.0 },
  danio:     { label: 'Zebra Danio',price: 32, level: 4, wait: 60, count: 4, blurb: 'A striped school that never stops.', traits: ['Playful', 'Social', 'Brave'], speed: 1.35, school: true },
  betta:     { label: 'Betta',      price: 52, level: 4, wait: 240, count: 1, blurb: 'Flowing fins, quiet pride.',        traits: ['Brave', 'Calm', 'Shy'], speed: 0.65 },
};
// rare visitors are not for sale: they drop by, and saying hello adds them to the collection book
SPECIES_DEF.moonbetta = { label: 'Moon Betta', price: 0, level: 99, wait: 0, count: 1, blurb: 'A pale visitor from the deep.', traits: ['Shy', 'Calm'], speed: 0.7, visitor: true };
SPECIES_DEF.sunangel = { label: 'Sun Angelfish', price: 0, level: 99, wait: 0, count: 1, blurb: 'Golden and unhurried.', traits: ['Calm', 'Curious'], speed: 0.75, visitor: true };
SPECIES_DEF.rosecory = { label: 'Rose Corydoras', price: 0, level: 99, wait: 0, count: 1, blurb: 'A pink bottom dweller passing through.', traits: ['Social', 'Lazy'], speed: 0.6, visitor: true };
export const DECOR_DEF = {
  grass:    { label: 'Tall Grass',    cat: 'PLANTS',     price: 6,  level: 1, blurb: 'Soft blades that sway.' },
  fern:     { label: 'Fern',          cat: 'PLANTS',     price: 7,  level: 1, blurb: 'A lime frond with tiny leaves.' },
  sword:    { label: 'Sword Plant',   cat: 'PLANTS',     price: 7,  level: 1, blurb: 'Broad green leaves.' },
  red:      { label: 'Red Plume',     cat: 'PLANTS',     price: 10,  level: 1, blurb: 'A bright pop of colour.' },
  rock:     { label: 'Pebble Rock',   cat: 'ROCKS',      price: 6,  level: 1, blurb: 'Small and mossy.' },
  boulder:  { label: 'Boulder',       cat: 'ROCKS',      price: 12,  level: 1, blurb: 'A big rock to hide behind.' },
  starfish: { label: 'Starfish',      cat: 'SPECIAL',    price: 4,  level: 1, blurb: 'A cheerful little star.' },
  wood:     { label: 'Driftwood',     cat: 'WOOD',       price: 18, level: 2, blurb: 'An arch to swim around.' },
  pillar:   { label: 'Old Pillar',    cat: 'STRUCTURES', price: 15, level: 2, blurb: 'A broken column.' },
  lantern:  { label: 'Stone Lantern', cat: 'STRUCTURES', price: 20, level: 2, blurb: 'Glows warm at dusk.' },
  chest:    { label: 'Treasure Chest',cat: 'SPECIAL',    price: 24, level: 2, blurb: 'Lid open, gold inside.' },
  torii:    { label: 'Torii Gate',    cat: 'STRUCTURES', price: 34, level: 3, blurb: 'A red gate to swim through.' },
  moss:     { label: 'Moss Ball',     cat: 'PLANTS',     price: 6,  level: 1, blurb: 'A soft green cushion.' },
  kelp:     { label: 'Giant Kelp',    cat: 'PLANTS',     price: 14,  level: 3, blurb: 'Tall ribbons in the current.' },
  bubbler:  { label: 'Bubbler',       cat: 'SPECIAL',    price: 16, level: 2, blurb: 'A stream of bubbles. Playful fish love it.' },
  shell:    { label: 'Pearl Clam',    cat: 'SPECIAL',    price: 14,  level: 2, blurb: 'A clam with a tiny pearl.' },
  skull:    { label: 'Mossy Skull',   cat: 'SPECIAL',    price: 10,  level: 2, blurb: 'Spooky, but very cute.' },
  anchor:   { label: 'Old Anchor',    cat: 'SPECIAL',    price: 24, level: 5, blurb: 'Rusty, mossy, and full of stories.' },
  bamboo:   { label: 'Bamboo',        cat: 'PLANTS',     price: 18, level: 5, blurb: 'Tall green stalks that creak softly.' },
  bridge:   { label: 'Little Bridge', cat: 'STRUCTURES', price: 44, level: 6, blurb: 'A wooden arch to swim under.' },
  crystal:  { label: 'Glow Crystal',  cat: 'SPECIAL',    price: 56, level: 7, blurb: 'A cluster that glows blue in the dark.' },
  arch:     { label: 'Stone Arch',    cat: 'STRUCTURES', price: 30, level: 4, blurb: 'A little arch to swim through.' },
};
export const LEVEL_AT = [0, 14, 36, 66, 100, 140, 184, 226];                     // score needed for level 1..5
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
export const levelFor = (score) => LEVEL_AT.reduce((l, need, i) => (score >= need ? i + 1 : l), 1);
// one fish is a quarter cheaper each day; a reason to look in the shop, never a penalty for missing a day
export const dailyFish = (now = Date.now()) => { const ids = Object.keys(SPECIES_DEF).filter((k) => !SPECIES_DEF[k].visitor); return ids[Math.floor(now / 864e5 + 3) % ids.length]; };
export const fishPrice = (id, now = Date.now()) => { const p = SPECIES_DEF[id].price; return id === dailyFish(now) ? Math.max(1, Math.ceil(p * 0.75)) : p; };
export const isFree = (t, type) => (t.flags.starter?.[type] ?? 0) > 0 || (t.flags.freePlant > 0 && DECOR_DEF[type].cat === 'PLANTS');
export const FLOORS = { sand: 'Sand', pearl: 'Pearl', gravel: 'Gravel', black: 'Black sand', coral: 'Pink coral' };
export const BACKDROPS = { candy: 'Candy', lagoon: 'Lagoon', sunset: 'Sunset', mint: 'Mint' };
export const pending = (t) => (t.orders ?? []).reduce((n, o) => n + SPECIES_DEF[o.species].count, 0);
export const capacity = (level) => 4 + 3 * level;
export function scoreOf(t, now = Date.now()) { return t.fish.length * 2 + t.decor.length + t.fish.filter((f) => stageOf(f, now) === 'adult').length * 2 + ((t.seen?.fish.length ?? 0) + (t.seen?.decor.length ?? 0)) + 3 * (t.wishIdx ?? 0); }
export function traitsFor(species, seed) { const pool = SPECIES_DEF[species].traits, a = pool[seed % pool.length], b = pool[(seed * 7 + 3) % pool.length]; return a === b ? [a] : [a, b]; }

// ── each fish has its own needs: it gets hungry at its own pace, and its happiness and health are real state ──
const APPETITE = { Greedy: 0.3, Playful: 0.1, Social: 0.05, Curious: 0.05, Lazy: -0.2, Calm: -0.1, Shy: -0.05, Brave: 0 };
export const appetiteOf = (traits = [], seed = 0) => Math.max(-0.25, Math.min(0.35, (traits.reduce((a, x) => a + (APPETITE[x] ?? 0), 0)) + ((seed % 7) - 3) * 0.02));
export function ensureFish(f) { if (f.happy == null) f.happy = 0.7; if (f.health == null) f.health = 1; if (f.appetite == null) f.appetite = appetiteOf(f.traits, f.seed); return f; }
const count = (t, cat) => t.decor.filter((d) => DECOR_DEF[d.type]?.cat === cat).length;
function likes(f, t) {
  let l = 0; const tr = f.traits ?? [];
  if (tr.includes('Shy') && count(t, 'PLANTS') >= 4) l += 0.12;
  if (tr.includes('Curious') && count(t, 'STRUCTURES') >= 1) l += 0.1;
  if (tr.includes('Playful') && (count(t, 'SPECIAL') >= 1 || t.decor.some((d) => d.type === 'bubbler'))) l += 0.1;
  if (tr.includes('Lazy') && count(t, 'WOOD') >= 1) l += 0.1;
  if (tr.includes('Social') && t.fish.length >= 4) l += 0.08;
  if (tr.includes('Brave') && count(t, 'ROCKS') >= 2) l += 0.06;
  return Math.min(0.25, l + Math.min(0.1, t.decor.length * 0.006));
}
export function needsOf(f, t, now = Date.now()) {
  ensureFish(f);
  const fed = Math.max(0, Math.min(1, 1 - t.hunger * (1 + f.appetite))), h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const energy = Math.max(0.1, Math.min(1, 0.55 + 0.4 * Math.sin(((h - 6) / 24) * Math.PI * 2) + ((f.traits ?? []).includes('Lazy') ? -0.15 : 0) + ((f.traits ?? []).includes('Playful') ? 0.1 : 0)));
  const mood = fed < 0.25 ? 'Hungry' : f.health < 0.5 ? 'Under the weather' : energy < 0.3 ? 'Sleepy' : f.happy > 0.75 ? 'Happy' : f.happy < 0.4 ? 'Gloomy' : 'Content';
  return { fed, happy: f.happy, energy, health: f.health, mood, vigor: 0.65 + 0.35 * Math.min(f.health, 0.4 + fed * 0.6) };
}
// Favourite spots and friendships come from what is really in the tank. Each is found once per fish, after it has lived here a while.
const SPOT = { Shy: ['PLANTS', 4, 'the plants'], Curious: ['STRUCTURES', 1, 'the structures'], Lazy: ['WOOD', 1, 'the driftwood'], Playful: ['SPECIAL', 1, 'the special things'], Brave: ['ROCKS', 2, 'the rocks'] };
export function favouriteOf(f, t) {
  for (const tr of f.traits ?? []) { const sp = SPOT[tr]; if (sp && count(t, sp[0]) >= sp[1]) { const hit = t.decor.find((d) => DECOR_DEF[d.type]?.cat === sp[0]); return { label: hit ? DECOR_DEF[hit.type].label.toLowerCase() : sp[2], key: tr }; } }
  return null;
}
function discover(t, now, ev) {
  const social = t.fish.filter((f) => (f.traits ?? []).includes('Social') && f.species !== 'neon');
  for (const f of t.fish) {
    ensureFish(f); f.found ||= []; if (now - f.born < 2 * 3600e3 || f.happy < 0.7) continue;
    const fav = favouriteOf(f, t);
    if (fav && !f.found.includes('spot')) { f.found.push('spot'); t.shells += 2; ev.push({ journal: `${f.name} found a favourite spot near the ${fav.label}.`, toast: `${f.name} found a favourite spot! +2 shells`, discovery: f.id }); }
    else if (social.length >= 2 && social.includes(f) && !f.found.includes('friend')) { const pal = social.find((o) => o !== f); f.found.push('friend'); pal.found ||= []; if (!pal.found.includes('friend')) pal.found.push('friend'); t.shells += 2; ev.push({ journal: `${f.name} and ${pal.name} have been spending more time together.`, toast: `${f.name} and ${pal.name} are friends now! +2 shells`, discovery: f.id }); }
  }
}
// Neglect has a cost. A fish that is starving or sitting in foul water slowly weakens (`ail`, in seconds). Two days: it looks pale and a warning goes out.
// Five days: it dies. Any real care wins the time back twice as fast. Guard rails keep a shared tank fair: no deaths in a tank's first three days,
// at most one death a day, and the last fish never dies.
export const AIL_WARN = 2 * 86400, AIL_DIE = 5 * 86400;
function tendFish(t, dt, now, ev = [], h0 = t.hunger, w0 = t.water) {
  for (const f of [...t.fish]) {
    ensureFish(f); const n = needsOf(f, t, now);
    // walk through the interval in half-hour steps so a feeding in the middle of it counts
    const steps = Math.max(1, Math.min(96, Math.ceil(dt / 1800))); f.ail = f.ail ?? 0;
    for (let k = 0; k < steps; k++) {
      const fr = (k + 0.5) / steps, hun = h0 + (t.hunger - h0) * fr, wat = w0 + (t.water - w0) * fr, fedK = 1 - hun * (1 + f.appetite);
      f.ail = Math.max(0, f.ail + ((fedK < 0.2 || wat < 0.5) ? dt / steps : -(dt / steps) * 2));
    }
    if (f.ail < AIL_WARN / 2) f.warned = false;
    else if (f.ail >= AIL_WARN && !f.warned) { f.warned = true; ev.push({ journal: `${f.name} is very weak. The tank needs care soon.`, toast: `${f.name} is very weak. Feed the tank.`, warn: f.id }); }
    if (f.ail >= AIL_DIE) {
      const young = now - t.createdAt < 3 * 86400e3, rested = now - (t.lastDeath ?? 0) < 86400e3;
      if (young || rested || t.fish.length <= 1) f.ail = AIL_DIE - 1;
      else {
        t.fish.splice(t.fish.indexOf(f), 1); t.lastDeath = now; (t.floaters ||= []).push({ id: f.id, name: f.name, species: f.species, seed: f.seed, stage: f.stage, born: f.born, died: now });
        ev.push({ journal: `${f.name} has passed away.`, toast: `${f.name} has passed away. Tap to lay them to rest.`, died: f.id }); continue;
      }
    }
    const target = Math.min(1, 0.3 + 0.28 * t.water + 0.12 * (1 - t.glass) + 0.18 * n.fed + likes(f, t));
    f.happy += (target - f.happy) * Math.min(1, dt / 2400);
    const ht = t.water > 0.5 && n.fed > 0.2 ? 1 : Math.max(0.35, 0.4 + 0.6 * Math.min(t.water, n.fed + 0.2));
    f.health = Math.max(0.35, Math.min(1, f.health + (ht - f.health) * Math.min(1, dt / (ht < f.health ? 5400 : 1800))));
  }
}

// Older saves and fresh worlds both go through this, so every field below always exists.
export function norm(t, now = Date.now()) {
  t.flags ||= { tut: 0 }; t.style ||= { floor: 'sand', backdrop: 'candy' }; t.orders ||= []; t.eggs ||= []; t.memorial ||= []; t.floaters ||= []; t.bottles ||= []; t.visitor ??= null; t.visitAt ??= now + 6 * 3600e3; t.eggAt ??= now + 18 * 3600e3; t.storyAt ??= now + 3 * 3600e3; t.drift ??= null; t.driftAt ??= now + 20 * 60e3; t.wishIdx ??= 0; t.flags.collMs ??= 0;
  t.seen ||= { fish: [...new Set(t.fish.map((f) => f.species))], decor: [...new Set(t.decor.map((d) => d.type))] };
  return t;
}
const hash32 = (n) => { let h = (n | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
export const WISHES = [
  { text: 'Have three fish swimming together', done: (t) => t.fish.length >= 3, reward: 4 },
  { text: 'Place six decorations', done: (t) => t.decor.length >= 6, reward: 4 },
  { text: 'Reach tank level 3', done: (t) => t.level >= 3, reward: 5 },
  { text: 'Keep every fish happy (80%+)', done: (t) => t.fish.length >= 2 && t.fish.every((f) => (f.happy ?? 0.7) >= 0.8), reward: 5 },
  { text: 'Have three kinds of fish', done: (t) => new Set(t.fish.map((f) => f.species)).size >= 3, reward: 6 },
  { text: 'Raise a fully grown fish', done: (t) => t.fish.some((f) => f.stage === 'adult'), reward: 6 },
  { text: 'Fill the tank with twelve fish', done: (t) => t.fish.length >= 12, reward: 8 },
  { text: 'Reach tank level 6', done: (t) => t.level >= 6, reward: 10 },
  { text: 'Fill the tank with twenty-five fish', done: (t) => t.fish.length >= 25, reward: 15 },
  { text: 'Reach tank level 8', done: (t) => t.level >= 8, reward: 15 },
  { text: 'Discover 20 things for the collection book', done: (t) => t.seen.fish.length + t.seen.decor.length >= 20, reward: 12 },
  { text: 'Find every fish and decoration in the book', done: (t) => t.seen.fish.length + t.seen.decor.length >= COLLECTION_SIZE(), reward: 25 },
];
export const COLLECTION_SIZE = () => Object.keys(SPECIES_DEF).length + Object.keys(DECOR_DEF).length;
function makeDrift(t, now) {
  const seq = (t.seq = (t.seq ?? 10) + 1), r = hash32(Math.floor(now / 6e4) * 31 + seq) % 100;
  const kind = r < 62 ? 'shells' : r < 85 ? 'treat' : 'pearl', amount = kind === 'shells' ? 1 + (r % 3) : kind === 'pearl' ? 4 : 0;
  const h = hash32(seq * 77 + 5); return { id: 'g' + seq, kind, amount, x: +(-3.4 + (h % 68) / 10).toFixed(2), z: +(0.4 + ((h >> 8) % 26) / 10).toFixed(2) };
}
function makeFish(t, o, now, idx) {
  const d = SPECIES_DEF[o.species], seed = o.seed + idx * 3, fname = d.count === 1 ? (o.name || NAMES[(t.seq + idx) % NAMES.length]) : `${o.name || d.label.split(' ')[0]} ${idx + 1}`;
  const f = ensureFish({ id: nextId(t, 'f'), name: fname, species: o.species, seed, born: now, stage: 'baby', traits: traitsFor(o.species, seed), happy: 0.75 }); t.fish.push(f);
  if (!t.seen.fish.includes(o.species)) t.seen.fish.push(o.species); return f;
}
const HOUR = 3600e3;
function visitors(t, now, ev) {
  if (t.visitor && now >= t.visitor.until) { t.visitor = null; t.visitAt = now + (9 + (hash32(now / 6e4) % 6)) * HOUR; }
  if (t.visitor || now < t.visitAt || (t.flags.tut ?? 0) < 5) return;
  const all = Object.keys(SPECIES_DEF).filter((k) => SPECIES_DEF[k].visitor), fresh = all.filter((k) => !t.seen.fish.includes(k)), pool = fresh.length ? fresh : all;
  const seq = (t.seq = (t.seq ?? 10) + 1), sp = pool[hash32(seq * 17 + Math.floor(now / 6e4)) % pool.length], d = SPECIES_DEF[sp];
  t.visitor = { id: 'v' + seq, species: sp, seed: hash32(seq * 13) % 90000, until: now + 3 * HOUR };
  ev.push({ journal: `A ${d.label} is visiting the tank.`, toast: `A rare visitor: ${d.label}! Tap it to say hello.`, visitor: true });
}
function eggs(t, now, ev) {
  for (const e of [...t.eggs]) {
    if (e.hatchAt > now) continue; t.eggs.splice(t.eggs.indexOf(e), 1);
    const A = t.fish.find((f) => f.id === e.a), B = t.fish.find((f) => f.id === e.b), h = hash32(e.hatchAt / 1e3);
    const seed = A && B ? ((A.seed + B.seed) >> 1) + (h % 9) : e.seed, pick = (f, k) => (f?.traits?.length ? f.traits[(h >> k) % f.traits.length] : null);
    const traits = [...new Set([pick(A, 1), pick(B, 3)].filter(Boolean))];
    const f = ensureFish({ id: nextId(t, 'f'), name: NAMES[(t.seq + h) % NAMES.length], species: e.species, seed, born: now, stage: 'baby', traits: traits.length ? traits : traitsFor(e.species, seed), happy: 0.8 }); t.fish.push(f);
    ev.push({ journal: `An egg hatched: meet ${f.name}.`, toast: `The egg hatched! Meet ${f.name}.`, arrival: [f.id] });
  }
  if (now < t.eggAt) return; t.eggAt = now + (16 + (hash32(now / 6e4) % 12)) * HOUR;
  if (t.fish.length + pending(t) + t.eggs.length >= capacity(t.level)) return;
  const adults = t.fish.filter((f) => stageOf(f, now) === 'adult' && !SPECIES_DEF[f.species].school), by = {};
  for (const f of adults) (by[f.species] ||= []).push(f);
  const pairs = Object.values(by).filter((g) => g.length >= 2); if (!pairs.length) return;
  const g = pairs[hash32(now / 6e4) % pairs.length], [A, B] = [g[0], g[1]];
  t.eggs.push({ id: nextId(t, 'e'), species: A.species, a: A.id, b: B.id, seed: A.seed, hatchAt: now + 4 * HOUR });
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
    ev.push({ journal: d.count === 1 ? `${made[0].name} the ${d.label.toLowerCase()} has arrived.` : `The ${d.label.toLowerCase()} school has arrived.`, toast: d.count === 1 ? `${made[0].name} has arrived!` : `Your ${d.label.toLowerCase()}s have arrived!`, arrival: made.map((f) => f.id) });
  }
}
function milestones(t, now, ev) {
  const n = t.seen.fish.length + t.seen.decor.length, due = Math.floor(n / 5);
  while ((t.flags.collMs ?? 0) < due) { t.flags.collMs++; t.shells += 3; ev.push({ journal: `The collection book has ${t.flags.collMs * 5} entries.`, toast: `Collection: ${t.flags.collMs * 5} found! +3 shells` }); }
  const w = WISHES[t.wishIdx]; if (w && w.done(t)) { t.wishIdx++; t.shells += w.reward; ev.push({ journal: `The tank's wish came true: ${w.text.toLowerCase()}.`, toast: `Tank wish complete! +${w.reward} shells`, wish: true }); }
}

export function newWorld(now = Date.now(), seed = 1) {
  return {
    style: { floor: 'sand', backdrop: 'candy' }, shells: 10, hunger: 0.55, orders: [], drift: null, driftAt: now + 20 * 60e3, wishIdx: 0, water: 1, glass: 0, level: 1, createdAt: now, simTs: now, seq: 10, flags: { tut: 0, starter: { fern: 1, grass: 1, rock: 1, starfish: 1, moss: 1 } },
    fish: [{ id: 'f1', name: 'Pip', species: 'goldfish', seed: 1 + (seed % 5), born: now, stage: 'baby', traits: ['Curious', 'Social'], happy: 0.75, health: 1, appetite: 0.05 }],
    decor: [],
    seen: { fish: ['goldfish'], decor: [] },
  };
}

// Time passing. Bounded, so a long absence never punishes: hunger tops out at 85%, water bottoms at 45%.
export function advance(t, now = Date.now()) {
  norm(t, now); const ev = [], dt = Math.max(0, (now - t.simTs) / 1000);
  if (dt >= 1) {
    const h0 = t.hunger, w0 = t.water;
    t.hunger = Math.min(Math.max(t.hunger, 0.85), t.hunger + dt * HR);
    t.water = Math.max(Math.min(t.water, 0.45), t.water - dt * WR * (1 + 0.5 * Math.min(2, t.floaters.length)));   // a fish left floating fouls the water faster
    t.glass = Math.min(Math.max(t.glass, 0.8), t.glass + dt * GR);
    tendFish(t, dt, now, ev, h0, w0); t.simTs = now;
  }
  for (const f of t.fish) {                                          // growth milestones
    const s = stageOf(f, now);
    if (s !== f.stage) {
      f.stage = s;
      if (s === 'juvenile') { t.shells += 1; ev.push({ journal: `${f.name} is growing up.`, toast: `${f.name} grew! +1 shell`, grew: f.id }); }
      if (s === 'adult') { t.shells += 2; ev.push({ journal: `${f.name} reached adulthood.`, toast: `${f.name} is an adult! +2 shells`, grew: f.id }); }
    }
  }
  deliver(t, now, ev);
  if (!t.drift && now >= t.driftAt) t.drift = makeDrift(t, now);
  visitors(t, now, ev); eggs(t, now, ev); stories(t, now, ev);
  const weeks = Math.floor((now - t.createdAt) / (7 * DAY));                // a birthday every week of the tank's life; missing a week costs nothing
  if (weeks > (t.flags.weeks ?? 0)) { t.flags.weeks = weeks; t.shells += 8; ev.push({ journal: `Our tank is ${weeks} week${weeks > 1 ? 's' : ''} old.`, toast: `Tank birthday! ${weeks} week${weeks > 1 ? 's' : ''} old. +8 shells` }); }
  if (dt >= 1) discover(t, now, ev);
  levelCheck(t, now, ev);
  return ev;
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
export function applyAction(t, a, { name = 'Someone', now = Date.now(), dev = false, solo = false, uid = 'me', members = null } = {}) {
  const events = advance(t, now);
  const fail = (reason) => ({ ok: false, reason, events });
  const ok = (extra = {}) => ({ ok: true, events, ...extra });
  switch (a.t) {
    case 'feed': {
      if (t.hunger < 0.08) return ok({ applied: false, delta: 0 });
      const pay = t.hunger > 0.25 ? 1 : 0;
      t.hunger = Math.max(0, t.hunger - 0.3); t.water = Math.max(0.3, t.water - 0.015); t.shells += pay;
      events.push({ activity: { type: 'feed', text: `${name} fed the fish.` } });
      return ok({ applied: true, delta: pay });
    }
    case 'water': {
      if (t.water >= 0.7) return ok({ applied: false, delta: 0 });
      t.water = 1; t.shells += 2;
      events.push({ journal: `${name} changed the water.`, activity: { type: 'water', text: `${name} changed the water.` } });
      return ok({ applied: true, delta: 2 });
    }
    case 'glass': {
      if (t.glass <= 0.12) return ok({ applied: false, delta: 0 });
      t.glass = 0; t.flags.cleans = (t.flags.cleans ?? 0) + 1; const find = t.flags.cleans % 5 === 0, gain = find ? 3 : 1; t.shells += gain;
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
      t.orders.push({ id: nextId(t, 'o'), species: a.species, name: nm, seed: base, by: name, at: now, arrivesAt: now + (a.rush && dev ? 0 : d.wait * 60e3) });
      events.push({ journal: `${name} ordered ${d.count === 1 ? (nm || 'a new fish') + ' the ' + d.label.toLowerCase() : 'a school of ' + d.label.toLowerCase() + 's'}.`, activity: { type: 'fish', text: `${name} ordered a new fish.` }, toast: `On its way! Arrives in about ${d.wait >= 60 ? Math.round(d.wait / 60) + 'h' : d.wait + ' min'}.` });
      deliver(t, now, events); levelCheck(t, now, events);
      return ok({ ordered: true, wait: d.wait });
    }
    case 'nameFish': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND');
      const nm = cleanName(a.name); if (!nm) return fail('BAD_NAME');
      const old = f.name; f.name = nm; events.push({ journal: `${old} is now called ${nm}.` }); return ok();
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
      const item = { id: nextId(t, 'd'), type: a.type, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2) }; t.decor.push(item); if (!t.seen.decor.includes(a.type)) t.seen.decor.push(a.type);
      events.push({ journal: t.decor.length % 4 === 0 || d.price >= 14 ? `${name} added ${/^[aeiou]/i.test(d.label) ? 'an' : 'a'} ${d.label.toLowerCase()}.` : undefined, activity: { type: 'decor', text: `${name} added ${/^[aeiou]/i.test(d.label) ? 'an' : 'a'} ${d.label.toLowerCase()}.` }, placed: item.id });
      levelCheck(t, now, events);
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
      return ok();
    }
    case 'scoop': {
      const x = t.floaters.find((f) => f.id === a.id); if (!x) return ok({ applied: false });
      t.floaters.splice(t.floaters.indexOf(x), 1); t.memorial.push({ name: x.name, species: x.species, born: x.born, died: x.died, by: name });
      events.push({ journal: `${name} laid ${x.name} to rest.`, toast: `${x.name} was laid to rest.` }); return ok({ applied: true });
    }
    case 'collect': {
      const g = t.drift; if (!g || g.id !== a.id) return ok({ applied: false, delta: 0 });
      t.drift = null; t.driftAt = now + 6 * 3600e3;
      if (g.kind === 'treat') { for (const f of t.fish) f.happy = Math.min(1, (f.happy ?? 0.7) + 0.15); events.push({ journal: `${name} found a bottle of fish treats washed in.`, toast: 'Fish treats! Everyone feels happier.' }); return ok({ applied: true, delta: 0, kind: 'treat' }); }
      t.shells += g.amount; if (g.kind === 'pearl') events.push({ journal: `${name} found a pearl washed in.`, toast: `A pearl! +${g.amount} shells` });
      else events.push({ toast: `Something washed in: +${g.amount} shells` });
      levelCheck(t, now, events); return ok({ applied: true, delta: g.amount, kind: g.kind });
    }
    case 'pet': {
      const f = t.fish.find((x) => x.id === a.id); if (!f) return fail('NOT_FOUND'); ensureFish(f); f.bond ||= {}; f.petAt ||= {}; const u = uid;
      if (now - (f.petAt[u] ?? 0) < 4 * 60e3) return ok({ applied: false, delta: 0 });
      f.petAt[u] = now; f.bond[u] = (f.bond[u] ?? 0) + 1; f.happy = Math.min(1, f.happy + 0.03);
      f.found ||= []; if (f.bond[u] >= 10 && !f.found.includes('bond:' + u)) { f.found.push('bond:' + u); t.shells += 2; events.push({ journal: `${f.name} has started to recognise ${name}.`, toast: `${f.name} knows you now! +2 shells`, discovery: f.id }); return ok({ applied: true, delta: 2, bond: f.bond[u] }); }
      return ok({ applied: true, delta: 0, bond: f.bond[u] });
    }
    case 'style': {
      const fl = a.floor ?? t.style?.floor ?? 'sand', bd = a.backdrop ?? t.style?.backdrop ?? 'candy';
      if (!FLOORS[fl] || !BACKDROPS[bd]) return fail('BAD_NAME');
      t.style = { floor: fl, backdrop: bd }; events.push({ activity: { type: 'decor', text: `${name} restyled the tank.` } }); return ok();
    }
    case 'greet': {
      const v = t.visitor; if (!v || v.id !== a.id) return ok({ applied: false, delta: 0 });
      const d = SPECIES_DEF[v.species]; if (!t.seen.fish.includes(v.species)) t.seen.fish.push(v.species);
      t.visitor = null; t.visitAt = now + (9 + (hash32(now / 6e4) % 6)) * HOUR; t.shells += 4;
      events.push({ journal: `${name} said hello to a ${d.label}.`, toast: `${d.label} added to the book! +4 shells` }); levelCheck(t, now, events); return ok({ applied: true, delta: 4 });
    }
    case 'bottle': {
      const to = members?.find((m) => m.id === a.to); if (!to || to.id === uid) return fail('NOT_A_FRIEND');
      const note = String(a.note ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40); if (!note) return fail('BAD_NAME');
      if (t.bottles.some((b) => b.from === uid && now - b.at < 6 * HOUR)) return fail('TOO_SOON');
      if (t.shells < 2) return fail('NOT_ENOUGH_SHELLS'); if (t.bottles.length >= 12) return fail('TANK_CROWDED');
      t.shells -= 2; t.bottles.push({ id: nextId(t, 'b'), from: uid, fromName: name, to: to.id, note, at: now });
      events.push({ activity: { type: 'bottle', text: `${name} sent ${to.name} a bottle.` }, toast: `Bottle sent to ${to.name}` }); return ok();
    }
    case 'openBottle': {
      const b = t.bottles.find((x) => x.id === a.id && x.to === uid); if (!b) return ok({ applied: false, delta: 0 });
      t.bottles.splice(t.bottles.indexOf(b), 1); t.shells += 4;
      events.push({ journal: `${name} opened a bottle from ${b.fromName}: “${b.note}”`, toast: `${b.fromName}: “${b.note}” +4 shells` }); levelCheck(t, now, events); return ok({ applied: true, delta: 4, from: b.fromName, note: b.note });
    }
    case 'note': {
      const txt = String(a.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 90); if (!txt) return fail('BAD_NAME');
      events.push({ journal: `${name}: “${txt}”` }); return ok();
    }
    case 'dev': {
      if (!dev) return fail('FORBIDDEN');
      if (a.what === 'shells') t.shells += 50;
      if (a.what === 'rush') { for (const o of t.orders) o.arrivesAt = now; events.push(...advance(t, now)); }
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
