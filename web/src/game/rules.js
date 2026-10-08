// OUR TANK game rules. Pure functions with no browser or server dependencies, so the exact same code
// runs on the server (authoritative, shared tank) and in the browser (solo tank).
export const SPECIES_DEF = {
  goldfish:  { label: 'Goldfish',   price: 8,  level: 1, count: 1, blurb: 'Curious and bold. Loves flakes.', traits: ['Curious', 'Social', 'Brave', 'Playful', 'Greedy'], speed: 1.0 },
  neon:      { label: 'Neon Tetra', price: 14, level: 1, count: 4, blurb: 'A glowing school of four.',        traits: ['Social', 'Playful'], speed: 1.3, school: true },
  cory:      { label: 'Corydoras',  price: 12, level: 2, count: 1, blurb: 'Tidy bottom dweller.',             traits: ['Shy', 'Lazy', 'Calm'], speed: 0.55 },
  blue:      { label: 'Blue Ram',   price: 18, level: 2, count: 1, blurb: 'A shy jewel of the tank.',         traits: ['Shy', 'Lazy', 'Brave', 'Curious'], speed: 0.9 },
  angelfish: { label: 'Angelfish',  price: 26, level: 3, count: 1, blurb: 'Elegant and calm.',                traits: ['Calm', 'Curious'], speed: 0.7 },
};
export const DECOR_DEF = {
  grass:    { label: 'Tall Grass',    cat: 'PLANTS',     price: 4,  level: 1, blurb: 'Soft blades that sway.' },
  fern:     { label: 'Fern',          cat: 'PLANTS',     price: 5,  level: 1, blurb: 'A lime frond with tiny leaves.' },
  sword:    { label: 'Sword Plant',   cat: 'PLANTS',     price: 5,  level: 1, blurb: 'Broad green leaves.' },
  red:      { label: 'Red Plume',     cat: 'PLANTS',     price: 7,  level: 1, blurb: 'A bright pop of colour.' },
  rock:     { label: 'Pebble Rock',   cat: 'ROCKS',      price: 4,  level: 1, blurb: 'Small and mossy.' },
  boulder:  { label: 'Boulder',       cat: 'ROCKS',      price: 8,  level: 1, blurb: 'A big rock to hide behind.' },
  starfish: { label: 'Starfish',      cat: 'SPECIAL',    price: 3,  level: 1, blurb: 'A cheerful little star.' },
  wood:     { label: 'Driftwood',     cat: 'WOOD',       price: 12, level: 2, blurb: 'An arch to swim around.' },
  pillar:   { label: 'Old Pillar',    cat: 'STRUCTURES', price: 10, level: 2, blurb: 'A broken column.' },
  lantern:  { label: 'Stone Lantern', cat: 'STRUCTURES', price: 14, level: 2, blurb: 'Glows warm at dusk.' },
  chest:    { label: 'Treasure Chest',cat: 'SPECIAL',    price: 16, level: 2, blurb: 'Lid open, gold inside.' },
  torii:    { label: 'Torii Gate',    cat: 'STRUCTURES', price: 22, level: 3, blurb: 'A red gate to swim through.' },
};
export const LEVEL_AT = [0, 14, 30, 50, 75];                     // score needed for level 1..5
export const MAX_DECOR = 40;
export const BOUNDS = { x: [-4.4, 4.4], z: [-1.0, 3.3] };
export const NAMES = ['Pip', 'Mango', 'Bubbles', 'Nori', 'Coral', 'Biscuit', 'Fin', 'Pearl', 'Sunny', 'Dot', 'Waffles', 'Misty'];
const HR = 1 / (5 * 3600), WR = 1 / (48 * 3600), GR = 1 / (30 * 3600);   // per second
const DAY = 864e5;

export const STAGE_SCALE = { baby: 0.62, juvenile: 0.82, adult: 1 };
export function stageOf(fish, now = Date.now()) { const d = (now - fish.born) / DAY; return d < 1 ? 'baby' : d < 3 ? 'juvenile' : 'adult'; }
export const levelFor = (score) => LEVEL_AT.reduce((l, need, i) => (score >= need ? i + 1 : l), 1);
export const capacity = (level) => 4 + 3 * level;
export function scoreOf(t, now = Date.now()) { return t.fish.length * 3 + t.decor.length + t.fish.filter((f) => stageOf(f, now) === 'adult').length * 3; }
export function traitsFor(species, seed) { const pool = SPECIES_DEF[species].traits, a = pool[seed % pool.length], b = pool[(seed * 7 + 3) % pool.length]; return a === b ? [a] : [a, b]; }

export function newWorld(now = Date.now(), seed = 1) {
  return {
    shells: 10, hunger: 0.55, water: 1, glass: 0, level: 1, createdAt: now, simTs: now, seq: 10, flags: { tut: 0 },
    fish: [{ id: 'f1', name: 'Pip', species: 'goldfish', seed: 1 + (seed % 5), born: now, stage: 'baby', traits: ['Curious', 'Social'] }],
    decor: [
      { id: 'd1', type: 'grass', x: -3.6, z: 2.6, ry: 0 }, { id: 'd2', type: 'grass', x: 3.4, z: 1.8, ry: 0 },
      { id: 'd3', type: 'fern', x: -4.2, z: 1.0, ry: 0 }, { id: 'd4', type: 'rock', x: 1.2, z: 2.4, ry: 0.4 },
    ],
  };
}

// Time passing. Bounded, so a long absence never punishes: hunger tops out at 85%, water bottoms at 45%.
export function advance(t, now = Date.now()) {
  const ev = [], dt = Math.max(0, (now - t.simTs) / 1000);
  if (dt >= 1) {
    t.hunger = Math.min(Math.max(t.hunger, 0.85), t.hunger + dt * HR);
    t.water = Math.max(Math.min(t.water, 0.45), t.water - dt * WR);
    t.glass = Math.min(Math.max(t.glass, 0.8), t.glass + dt * GR);
    t.simTs = now;
  }
  for (const f of t.fish) {                                          // growth milestones
    const s = stageOf(f, now);
    if (s !== f.stage) {
      f.stage = s;
      if (s === 'juvenile') { t.shells += 2; ev.push({ journal: `${f.name} is growing up.`, toast: `${f.name} grew! +2 shells` }); }
      if (s === 'adult') { t.shells += 5; ev.push({ journal: `${f.name} reached adulthood.`, toast: `${f.name} is an adult! +5 shells` }); }
    }
  }
  levelCheck(t, now, ev);
  return ev;
}
function levelCheck(t, now, ev) {
  const lv = levelFor(scoreOf(t, now));
  if (lv > t.level) { t.level = lv; t.shells += 10; ev.push({ journal: `Our tank reached level ${lv}.`, toast: `Tank level ${lv}! +10 shells`, levelUp: lv }); }
}
const nextId = (t, p) => p + (t.seq = (t.seq ?? 10) + 1);
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
const num = (v) => (Number.isFinite(+v) ? +v : NaN);

// Apply one player action. Mutates `t`; returns { ok, reason?, events[], delta? }.
export function applyAction(t, a, { name = 'Someone', now = Date.now(), dev = false, solo = false } = {}) {
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
      t.glass = 0; t.shells += 1;
      events.push({ activity: { type: 'glass', text: `${name} cleaned the glass.` } });
      return ok({ applied: true, delta: 1 });
    }
    case 'buyFish': {
      const d = SPECIES_DEF[a.species]; if (!d) return fail('UNKNOWN_SPECIES');
      if (t.level < d.level) return fail('LEVEL_TOO_LOW');
      if (t.fish.length + d.count > capacity(t.level)) return fail('TANK_FULL');
      if (t.shells < d.price) return fail('NOT_ENOUGH_SHELLS');
      t.shells -= d.price;
      const base = Math.abs(Math.floor(num(a.seed) || now)) % 100000, nm = cleanName(a.name), made = [];
      for (let i = 0; i < d.count; i++) {
        const seed = base + i * 3, fname = d.count === 1 ? (nm || NAMES[(t.seq + i) % NAMES.length]) : `${nm || d.label.split(' ')[0]} ${i + 1}`;
        const f = { id: nextId(t, 'f'), name: fname, species: a.species, seed, born: now, stage: 'baby', traits: traitsFor(a.species, seed) }; t.fish.push(f); made.push(f);
      }
      events.push({ journal: d.count === 1 ? `${name} brought home ${made[0].name}, a new ${d.label.toLowerCase()}.` : `${name} introduced a school of ${d.label.toLowerCase()}s.`, activity: { type: 'fish', text: `${name} added a new fish.` }, arrival: made.map((f) => f.id) });
      levelCheck(t, now, events);
      return ok({ ids: made.map((f) => f.id) });
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
      const free = a.free && t.flags.freePlant > 0 && d.cat === 'PLANTS';                      // the tutorial's free plant
      if (!free && t.shells < d.price) return fail('NOT_ENOUGH_SHELLS');
      if (free) t.flags.freePlant = 0; else t.shells -= d.price;
      const item = { id: nextId(t, 'd'), type: a.type, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2) }; t.decor.push(item);
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
      if (a.reset) { if (!(solo || dev)) return fail('FORBIDDEN'); t.flags.tut = 0; t.flags.freePlant = 1; return ok(); }
      const step = Math.max(0, Math.min(9, num(a.step) | 0)); if (step > (t.flags.tut ?? 0)) { t.flags.tut = step; if (step === 3 && t.flags.freePlant === undefined) t.flags.freePlant = 1; }
      return ok();
    }
    case 'dev': {
      if (!dev) return fail('FORBIDDEN');
      if (a.what === 'shells') t.shells += 50;
      if (a.what === 'day') { for (const f of t.fish) f.born -= DAY; t.hunger = Math.min(0.85, t.hunger + 0.3); t.water = Math.max(0.45, t.water - 0.2); t.glass = Math.min(0.8, t.glass + 0.3); events.push(...advance(t, now)); }
      return ok();
    }
    default: return fail('UNKNOWN_ACTION');
  }
}
