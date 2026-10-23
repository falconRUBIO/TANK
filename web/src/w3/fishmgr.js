// The living roster: spawns a Fish3D for every fish in the game state, grows them, gives each its own
// personality-driven wandering, and runs feeding (flakes sink, each fish picks its own piece).
import { sandH, sandUnder, placeable, crossesFace, levelAt, slopeAt, GLASS_Z } from './terrain.js';
// where a crab comes down for an octopus: near x,z but on the same level of sand as the octopus, on flat sand, so the hunt never has to go round by a ramp
const crabSpot = (o, x, z) => { const lv = levelAt(o.pos.x, o.pos.z); for (let k = 0; k < 24; k++) { const r = k * 0.12, a = k * 2.4, qx = Math.max(-3.6, Math.min(3.6, x + Math.cos(a) * r)), qz = Math.max(-3.3, Math.min(GLASS_Z - 0.8, z + Math.sin(a) * r)); if (levelAt(qx, qz) === lv && slopeAt(qx, qz).s < 0.8) return [qx, qz]; } return [o.pos.x + 0.8, o.pos.z]; };
import * as THREE from 'three';
const _tv = new THREE.Vector3();
import { SPECIES } from '../species.js';
import { Fish3D } from './fish3d.js';
import { Crab3D } from './crab3d.js';
import { isCrab, isShell, shellSz, TO_CRABS } from '../game/crabs.js';
import { gripWork, PLANTS } from './grips.js';
import { buildJar, updateJar, buildCrab } from './jar.js';
import { buildHoard, shellMesh } from './den.js';
const KEEPNAME = { cap: 'bottle cap', key: 'brass key', pebble: 'pebble', glass: 'sea glass', shard: 'painted shard', shell: 'spiral shell' };
const HEAVY = new Set(['boulder', 'pillar', 'torii', 'wood', 'chest', 'arch', 'brain']);      // too big for an octopus to shift (it may try)
import { mulberry32 } from '../color.js';
import { personaOf } from '../profile.js';
import { temperOf, affordOf, habitKind } from '../game/habitat.js';
import { KINDS, wellOf, coverOf, ECO, crowdOf, octoTrust, SOCIAL, SPECIES_DEF, DECOR_DEF, STAGE_SCALE, hoardOf, octoMind, MOVABLE, MOVE_GAP, MOVE_MAX, AIL_TIRED, AIL_WARN, stageOf, growthScale, needsOf, FOODS, broodOf, favFoodOf, babyRole } from '../game/rules.js';

// the fish that live up in open water: on the phone they keep to the upper half of the screen, leaving the sand and the lower water to the reef fish
const OPEN_WATER = new Set(['neon', 'danio', 'guppy', 'angelfish']);
const TURTLE_SK = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
const BANDS = {
  turtle: { x: [-3.4, 3.4], y: [0.7, 13.6], z: [-0.6, 2.0] }, hawksbill: { x: [-3.4, 3.4], y: [0.7, 13.6], z: [-0.6, 2.0] }, loggerhead: { x: [-3.4, 3.4], y: [0.7, 13.6], z: [-0.6, 2.0] }, kemps: { x: [-3.4, 3.4], y: [0.7, 13.6], z: [-0.6, 2.0] }, leatherback: { x: [-3.2, 3.2], y: [3, 13.6], z: [-1.4, 1.6] },      // a sea turtle uses the whole tank: down on the sand under a rock, and right up to the surface to breathe
  neongoby: { x: [-3.2, 3.4], y: [1.6, 6], z: [0.6, 1.9] }, tang: { x: [-3.4, 3.6], y: [5, 12.6], z: [0.4, 2.0] }, puffer: { x: [-3.2, 3.4], y: [3, 9.5], z: [0.8, 2.0] },
  goldfish: { x: [-3.4, 3.6], y: [4, 11.6], z: [0.6, 2.0] }, neon: { x: [-3.2, 3.4], y: [9, 13.1], z: [0.6, 1.9] }, blue: { x: [-3.2, 3.4], y: [2.5, 8], z: [0.5, 1.9] },
  angelfish: { x: [-3.0, 3.6], y: [5.5, 12], z: [-3.0, -1.8] }, guppy: { x: [-3.2, 3.4], y: [8, 13], z: [0.6, 1.9] }, platy: { x: [-3.2, 3.4], y: [3.5, 9.8], z: [0.6, 1.9] }, danio: { x: [-3.2, 3.4], y: [8.5, 13], z: [0.6, 1.9] }, betta: { x: [-3.2, 3.4], y: [4.5, 11], z: [0.6, 1.9] }, cory: { x: [-3.4, 3.6], y: [0.35, 0.45], z: [0.6, 2.0] }, seahorse: { x: [-3.0, 3.2], y: [3, 9.5], z: [0.4, 1.8] }, octopus: { x: [-3.4, 3.6], y: [0.6, 6.5], z: [-3.4, 2.9] },
};
export const TRAIT_TXT = { Shy: 'Hides behind plants and darts away from other fish.', Brave: 'Swims out front, close to the glass.', Curious: 'Goes to inspect decorations and other fish.', Social: 'Stays close to a buddy.', Playful: 'Restless and quick. Loves the bubbles.', Lazy: 'Drifts low and rests a lot.', Calm: 'Slow, smooth and unbothered.', Greedy: 'Waits near the surface for food.' };
const SPOTS = { Shy: 'Sea Grass', Curious: 'Stone Arch', Playful: 'Bubbles', Lazy: 'Driftwood', Calm: 'Open water', Brave: 'The glass', Social: 'Near friends', Greedy: 'The surface' };
const bubbleSpot = new THREE.Vector3(-3.6, 0, 0.5);

// little speech-bubble icons drawn once per mood
// The water is never quite still: a slow, gentle flow. It turns along the tank and back over a minute or so, a little differently at each depth and from front to back, and carries drifting food with it. It never steers food to anyone.
export function current(x, y, z, t, out) {
  out.x = 0.11 * Math.sin(0.05 * t + 0.5 * y + 0.4 * z) + 0.05 * Math.sin(0.12 * t + 1.1 * z + 0.35 * x + 1.7);
  out.z = 0.04 * Math.sin(0.07 * t + 0.7 * x + 0.3 * y + 0.6);
  out.y = 0.02 * Math.sin(0.09 * t + 0.8 * x + 2.1);
  return out;
}
const EMOTE = { Hungry: ['🍤', '#2a1a1a'], Sleepy: ['💤', '#17203a'], Gloomy: ['☁️', '#1e2430'], 'Under the weather': ['🩹', '#2a1a22'], Together: ['💞', '#2a1a2a'] };
const emoteTex = {};
function emoteTexture(mood) {
  if (emoteTex[mood]) return emoteTex[mood];
  // a Liquid Glass bubble: clear, faintly frosted, a bright rim and a soft highlight, so the mood reads without a white blob over the tank
  const [glyph] = EMOTE[mood], c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), bub = (x, y, r) => {
    const f = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); f.addColorStop(0, 'rgba(255,255,255,.30)'); f.addColorStop(0.7, 'rgba(220,240,255,.12)'); f.addColorStop(1, 'rgba(200,230,255,.22)');
    g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1.5, r * 0.09); g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r * 0.78, 3.6, 4.5); g.stroke(); };
  bub(48, 42, 34); bub(26, 82, 6); bub(16, 92, 3.5);      // the bubble, and two little ones trailing down to the animal
  g.fillStyle = 'rgba(8,30,52,.42)'; g.beginPath(); g.arc(48, 42, 25, 0, 6.3); g.fill();      // a soft dark core behind the picture, so it reads against bright water and sand
  g.font = '40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (mood === 'Sleepy') { g.fillStyle = '#ffffff'; g.font = '800 30px ui-rounded, -apple-system, system-ui, sans-serif'; g.fillText('Z', 40, 48); g.font = '800 21px ui-rounded, -apple-system, system-ui, sans-serif'; g.fillText('z', 58, 34); }      // crisp white Zz: the emoji's blue was lost in the glass
  else { g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 6; g.fillText(glyph, 48, 44); g.shadowBlur = 0; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (emoteTex[mood] = t);
}
const r2 = (v) => Math.round(v * 100) / 100;
// how each nature meets something new: how soon it goes (s), how willing it is, how long it watches first, whether it watches from its den, how often it goes back to a favorite and how drawn it is to things it has never touched
const AWARE = { explorer: { distract: 0.15, d: [1, 3], p: 0.95, watch: null, rev: 0.3, nov: 0.6 }, trickster: { distract: 0.35, d: [2, 4], p: 0.85, watch: null, rev: 0.4, nov: 0.45 }, showoff: { distract: 0.12, d: [3, 6], p: 0.75, watch: null, rev: 0.45, nov: 0.3 },
  collector: { distract: 0.08, d: [2, 5], p: 0.75, watch: null, rev: 0.65, nov: 0.35 }, watcher: { distract: 0.25, d: [3, 5], p: 0.7, watch: [8, 14], rev: 0.55, nov: 0.2 }, homebody: { distract: 0.05, d: [6, 12], p: 0.5, watch: [25, 45], den: true, rev: 0.75, nov: 0.1 } };
const HIDEY = new Set(['coconut', 'pot', 'rock', 'cave', 'castle', 'skull', 'chest']);      // somewhere to tuck into: a homebody takes an interest
const COLLECTIBLE = new Set(['shell', 'pot', 'coconut', 'chest', 'crystal', 'starfish', 'anchor', 'skull', 'lantern']);
const GRIP_R = { mangrove: 0.18, seafan: 0.2, urchin: 0.45, liverock: 0.45, grass: 0.16, fern: 0.16, sword: 0.18, red: 0.16, kelp: 0.3, bamboo: 0.3, anemone: 0.3, rock: 0.42, boulder: 0.95, coconut: 0.85, pot: 0.8, skull: 0.4, pillar: 0.3, lantern: 0.3, starfish: 0.35, moss: 0.3, shell: 0.25, chest: 0.6, anchor: 0.35, crystal: 0.35, spire: 0.3, brain: 0.5 };
const CRAB = 1.15;                // a crab is a meal-sized thing next to an octopus, not as big as its head
const spot = (v) => { const q = Math.sin(v * 127.1 + 311.7) * 43758.5453; return q - Math.floor(q); };          // a repeatable 0..1 from a number
export class Fishes {
  constructor(scene) {
    this.scene = scene; this.list = []; this.byId = new Map(); this.rng = mulberry32(11); this.flakes = [];
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.04, 0.17), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x552200, emissiveIntensity: 0.6 }), 200);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.castShadow = true; scene.add(this.mesh);
    this.cols = [0xff7a1a, 0xffb02a, 0xe8442a, 0x9ad04a].map((c) => new THREE.Color(c));
    this.foodCols = { greens: [0x3f9d4a, 0x5cc06a, 0x2e7d3c, 0x7fd38a].map((c) => new THREE.Color(c)), pellets: [0x8a5a2a, 0x9c6a34, 0x7a4c24, 0xa87a44].map((c) => new THREE.Color(c)), treats: [0xff6fa8, 0xff9ac0, 0xe8508a, 0xffc2d8].map((c) => new THREE.Color(c)), mysis: [0xf2c4b4, 0xe8a894, 0xf7d8cc, 0xd99080].map((c) => new THREE.Color(c)) };      // mysis: tiny pale pink shrimp
    this.m = new THREE.Matrix4(); this.tmp = new THREE.Vector3(); this.bursts = []; this.onEat = null; this.bubbleAt = bubbleSpot; this.onSprite = null; this.onSpriteGone = null; this.clock = 0;
    SPECIES.neon.school = true; SPECIES.danio.school = true;
    this.bm = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.22, 4, 8), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.7, depthWrite: false }), 160);
    this.bm.frustumCulled = false; this.bm.count = 0; scene.add(this.bm);
  }
  profileOf(f, st) {
    const tr = f.traits ?? [], n = needsOf(f, st);
    return { traits: tr, age: stageOf(f).replace(/^./, (c) => c.toUpperCase()), spot: f.found?.includes('spot') ? (DECOR_DEF[st.decor?.find((d) => d.id === f.spotId)?.type]?.label ?? SPOTS[tr[0]] ?? 'Found one') : 'Still looking', food: f.species === 'octopus' ? 'Crabs' : FOODS[favFoodOf(f)].label, needs: [n.fed, n.happy, n.energy, n.health], mood: n.mood, vigor: n.vigor };
  }
  // make the scene match the game's fish list
  sync(state, { arrivals = [] } = {}) { this.state = state; this.decorDiff(state);
    this.recs = new Map(state.fish.map((d) => [d.id, d]));      // each animal's saved record, as the server has it (a seahorse reads its memory of holdfasts from it)
    this.moveOn = !state.flags?.noRearrange;
    this.world = { water: state.water ?? 1, glass: state.glass ?? 0, hunger: state.hunger ?? 0 };
    { const sig = (state.decor?.length ?? 0) + ':' + state.fish.length + ':' + ((state.glass ?? 0) > 0.5 ? 1 : 0); if (sig !== this.sig) { if (this.sig != null) this.changedAt = performance.now(); this.sig = sig; } }
    const seen = new Set(); this.state = state;
    // the nursery's three babies swim in the tank as tiny seahorses of their own (the rest of the brood is a light swarm, see Nursery);
    // they grow through the five days, and the one that is kept carries on as the same seahorse
    const N = state.nursery, kids = N ? N.cands.filter((c) => !state.fish.some((x) => x.id === c.id)).map((c) => ({ id: c.id, name: c.name, species: 'seahorse', seed: c.seed, born: N.born, stage: 'baby', traits: c.traits, genes: c.genes, sex: c.sex, nursery: N.id, role: babyRole(N, c), happy: 0.8, health: 1, nk: Math.max(0, Math.min(1, (Date.now() - N.born) / Math.max(1, N.readyAt - N.born))), father: N.father, mother: N.mother })) : [];
    [...state.fish.filter((d) => !d.gift?.wrapped), ...kids].forEach((d, idx) => {      // (a gift still wrapped is not in the water yet: it is in its bag)
      seen.add(d.id); const k = d.nursery ? 0.3 + 0.32 * d.nk : growthScale(d);      /* (it grows a little every day, from tiny fresh from the egg to full size at ten days) */ const cute = d.nursery ? 1 : { baby: 1, juvenile: 0.45 }[stageOf(d)] ?? 0;
      if (this.adventure(d)) return;
      if ((d.restUntil ?? 0) > Date.now()) { const q = this.byId.get(d.id); if (q) q.fatigue = Math.max(q.fatigue ?? 0, 0.9); }      // a mother worn out from guarding: sleepy, in her den      // out on an adventure (or hiding where nobody can see): not in the water until it is back
      let f = this.byId.get(d.id);
      if (!f && isCrab(d.species)) { f = this.makeCrab(d); this.relate(f, d); this.makeEmote(f); this.scene.add(f.group); this.list.push(f); this.byId.set(d.id, f); f.profile = this.profileOf(d, state); f.persona = personaOf(d); return; }      // a hermit crab: its own body and walk (crab3d.js)
      if (!f) {
        const sp = SPECIES[d.species], def = SPECIES_DEF[d.species], band = BANDS[d.species] ?? BANDS.goldfish;
        const back = idx % 2 === 1 && d.species !== 'cory' && d.species !== 'angelfish';
        f = new Fish3D(sp, d.seed, { look: d.pal != null || d.kind ? { pal: d.pal ?? null, kind: d.kind ?? null } : null, genes: d.genes, name: d.name, speed: def.speed * (0.9 + (d.seed % 5) * 0.05) * (KINDS[d.species]?.[d.kind]?.speed ?? 1), scale: 1, band: back ? { ...band, z: [-3.0, -1.8] } : band });
        f.fid = d.id; f.sk = d.species; f.baseScale = KINDS[d.species]?.[d.kind]?.scale ?? 1; f.setGrowth(f.growth ?? 1); f.nursery = d.nursery ?? null; f.role = d.role ?? null; f.rec = d; f.mateId = d.mate ?? null; f.getSpots = () => this.spots?.() ?? []; f.decorVox = (x, z, r) => this.decorVox(x, z, r); f.decorVoxWarm = (x, z, r) => this.decorVoxWarm(x, z, r); f.decorSig = (x, z, r) => this.decorSig(x, z, r); f.food = () => this.flakes; f.tankHungry = () => (this.world?.hunger ?? 0) > 0.3; f.savedLog = () => this.recs?.get(f.fid)?.log; f.profile = this.profileOf(d, state); f.persona = personaOf(d); f.bornAt = d.born; f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1); f.cute = cute; f.setGrowth(k);
        const arriving = arrivals.includes(d.id);
        f.pos.set(arriving ? (this.rng() - 0.5) * 5 : (this.rng() - 0.5) * 6, arriving ? 13.5 : band.y[0] + this.rng() * (band.y[1] - band.y[0]), (band.z[0] + band.z[1]) / 2);
        if (!arriving) f.pick(this.rng); else { f.target.set(f.pos.x, 8, f.pos.z); f.retarget = 3; this.burst(f.pos); }
        if (d.nursery) { const dad = this.byId.get(d.father); if (dad && Date.now() - (state.nursery?.born ?? 0) < 15 * 60e3) f.pos.set(dad.pos.x + (this.rng() - 0.5) * 0.6, dad.pos.y - 0.3, dad.pos.z + 0.3); }      // just born: out of his pouch
        f.openWater = OPEN_WATER.has(d.species); f.leadOf = () => (this.isLead ? this.isLead() : true); this.relate(f, d); f.home = { x: (((d.seed * 37) % 100) / 100 - 0.5) * 6, y: f.band.y[0] + (((d.seed * 13) % 100) / 100) * (f.band.y[1] - f.band.y[0]) }; this.wrapPick(f, d); this.sicken(f, d); this.makeEmote(f); this.scene.add(f.group); this.list.push(f); this.byId.set(d.id, f);
      } else {
        f.name = d.name; f.rec = d; f.mateId = d.mate ?? null; f.nursery = d.nursery ?? null; f.role = d.role ?? null; this.relate(f, d); this.sicken(f, d); f.profile = this.profileOf(d, state); f.persona = personaOf(d); f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1);
        if (Math.abs((f.growth ?? 1) - k) > 1e-3 || f.cute !== cute) { f.cute = cute; f.setGrowth(k); }
      }
    });
    this.syncJars(state);
    for (const x of state.floaters ?? []) {
      seen.add(x.id); let f = this.byId.get(x.id);
      if (!f) { f = new Fish3D(SPECIES[x.species], x.seed, { look: x.pal != null ? { pal: x.pal } : null, name: x.name, speed: 0.5, scale: 1, band: BANDS.goldfish }); f.fid = x.id; f.setGrowth(STAGE_SCALE[x.stage] ?? 1); f.pos.set((this.rng() - 0.5) * 6, 12.7, 1.2); this.scene.add(f.group); this.list.push(f); this.byId.set(x.id, f); }
      if (!f.dead) { f.dead = true; f.floater = true; f.setPale(0.6); f.profile = { traits: [], mood: 'Passed away', needs: [0, 0, 0, 0] }; if (f.emote) { f.emote.visible = false; } this.burst(f.pos); }
    }
    for (const id of [...(this.out?.keys() ?? [])]) if (!state.fish.some((x) => x.id === id)) { const f = this.out.get(id); this.out.delete(id); this.byId.delete(id); this.scene.remove(f.group); if (f.shade) { this.scene.remove(f.shade); f.shade.geometry.dispose(); f.shade.material.dispose(); f.shade = null; }; }      // gone for good while it was away (sold, moved on)
    this.ready = true;
    if (state.visitor) { seen.add(state.visitor.id); if (!this.byId.has(state.visitor.id)) this.addVisitor(state.visitor); }
    for (const f of [...this.list]) if (!seen.has(f.fid)) { this.letGo(f); if (f.floater && !f.visitor) { (this.leaving ||= []).push({ f, age: 0, y: f.group.position.y, s: f.group.scale.x }); this.onGoodbye?.(f); } else if (TURTLE_SK.has(f.sk) && !f.dead) (this.rising ||= []).push({ f, age: 0, b: 0 }); else this.scene.remove(f.group); if (f.shade) { this.scene.remove(f.shade); f.shade.geometry.dispose(); f.shade.material.dispose(); f.shade = null; };      /* (a sea turtle let go, or a visiting one going home, swims up and away on every phone) */ if (f.glow) { this.scene.remove(f.glow); this.onSpriteGone?.(f.glow); } if (f.hoardGroup) { this.scene.remove(f.hoardGroup); f.hoardGroup = null; } if (f.emote) { this.scene.remove(f.emote); this.onSpriteGone?.(f.emote); } this.list.splice(this.list.indexOf(f), 1); this.byId.delete(f.fid); }
  }
  // Little Adventures: an octopus that has gone climbs out over the back rim if anyone is watching (otherwise it is simply not there), and
  // climbs back in the same way when it comes home. While it is away it is out of the list, so nothing in the tank looks for it.
  letGo(f) { if (f.keepCarry?.it) f.keepCarry.it.carried = false; f.keepCarry = null; }      // (whatever it was holding stays in the tank, where it is)
  adventure(d) {
    this.out ||= new Map(); const f = this.byId.get(d.id) ?? this.out.get(d.id), watching = typeof document === 'undefined' || document.visibilityState === 'visible';
    if (d.away) {
      if (!f || this.out.has(d.id)) return true;
      this.list.splice(this.list.indexOf(f), 1); this.out.set(d.id, f); this.letGo(f); if (f.emote) f.emote.visible = false;
      if (watching && !d.away.inTank && this.ready) this.climb(f, -1); else this.scene.remove(f.group); if (f.shade) { this.scene.remove(f.shade); f.shade.geometry.dispose(); f.shade.material.dispose(); f.shade = null; };
      return true;
    }
    if (f && this.out.has(d.id)) {
      this.out.delete(d.id); this.list.push(f); this.byId.set(d.id, f); if (!f.group.parent) this.scene.add(f.group);
      const den = (this.state?.decor ?? []).find((x) => x.id === d.home); if (d.away === undefined && watching && this.ready && !(d.advMem?.last?.out === 'hiding')) this.climb(f, 1, den); else if (den) { f.pos.set(den.x, sandH(den.x, den.z) + 0.6, den.z + 0.5); }
    }
    return false;
  }
  climb(f, dir, den = null) {
    const x = Math.max(-3.8, Math.min(3.8, f.pos.x)), top = Fish3D.topY + 0.4, back = -3.4, path = dir < 0
      ? [f.pos.clone(), new THREE.Vector3(x, Math.max(f.pos.y, 2), back), new THREE.Vector3(x, top, back), new THREE.Vector3(x, top + 1.6, back - 1.2)]
      : [new THREE.Vector3(x, top + 1.6, back - 1.2), new THREE.Vector3(x, top, back), new THREE.Vector3(x, 2.2, back), den ? new THREE.Vector3(den.x, sandH(den.x, den.z) + 0.6, den.z + 0.5) : new THREE.Vector3(x, 1.2, 0.5)];
    const T = 7, s0 = f.group.scale.x; let age = 0;
    f.puppet = (dt) => {
      age += dt; const q = Math.min(1, age / T), seg = Math.min(path.length - 2, Math.floor(q * (path.length - 1))), u = q * (path.length - 1) - seg, e = u * u * (3 - 2 * u);
      f.pos.lerpVectors(path[seg], path[seg + 1], e); f.group.position.copy(f.pos); f.group.rotation.x = seg === 1 ? -0.9 * Math.sin(e * Math.PI) : 0;      // flat against the back glass on the way up
      f.group.scale.setScalar(s0 * (dir < 0 ? (seg === path.length - 2 ? 1 - 0.6 * e : 1) : seg === 0 ? 0.4 + 0.6 * e : 1));
      if (q >= 1) { f.puppet = null; f.group.rotation.x = 0; f.group.scale.setScalar(s0); if (dir < 0) { this.scene.remove(f.group); if (f.shade) { this.scene.remove(f.shade); f.shade.geometry.dispose(); f.shade.material.dispose(); f.shade = null; } } else { f.target.copy(f.pos); this.drips(path[1]); } }
    };
    if (dir < 0) this.drips(path[2]);
  }
  // where it puts a keepsake down, by its nature (probabilities in what it fetches, a place in where it goes): beside its den; a homebody exactly
  // where it last kept it; a watcher out in front where it sits and watches; a show-off, with someone looking, near the glass; a trickster somewhere new
  keepDest(f, q, den, watched) {
    const ty = f.mind?.type, r = this.rng, last = [...(q.rec?.h?.places ?? [])].reverse().find((p) => Math.hypot(p.x - den.x, p.z - den.z) < 2);
    if (ty === 'homebody' && last) return { x: last.x, z: last.z };
    if (ty === 'watcher') return { x: den.x + (r() - 0.5) * 0.6, z: Math.min(3.0, den.z + 1.5) };
    if (ty === 'showoff' && watched) return { x: Math.max(-3, Math.min(3, den.x * 0.5)), z: 3.0 };
    if (ty === 'trickster') { const a = r() * 6.28; return { x: den.x + Math.cos(a) * 1.0, z: den.z + 0.4 + Math.sin(a) * 0.7 }; }
    return { x: den.x + (r() - 0.5) * 0.9, z: den.z + 0.55 };
  }
  // an octopus seeing a caretaker open the tank: it depends on who. One it trusts comes to the glass now and then; one it knows a little gets watched from the
  // den; a stranger it mostly ignores (the trust is per caretaker, earned by that person's own care, kept on the server). Nothing is lost by anyone.
  greet() {      // the caretaker opens the tank: each octopus answers by how well it knows them, its nature, and what it is doing (never forced)
    for (const f of this.list) { if (f.species?.move !== 'jet' || f.dead || f.puppet || f.away) continue;
      const lvl = f.trust ?? 0, ty = f.mind?.type, r = this.rng(), S = f.st, den = f.den ? Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z) : 9, far = f.pos.z < -1.2;
      const busy = f.task || f.keepCarry || f.hunt || f.jarAt || f.glassAt?.trick || S?.mode === 'tgo' || S?.mode === 'thaul' || S?.s === 'jet';
      const asleep = (f.sleepK ?? 0) > 0.5 || (S?.s === 'rest' && (f.restK ?? 0) > 0.6 && f.isNight);
      const look = (t, flush = 0) => { f.gazeT = Math.max(f.gazeT ?? 0, t); f.gazeFace = true; if (flush) f.flush = Math.max(f.flush ?? 0, flush); };      // its eyes go wide at you (and, glad, a flush of color)
      if (busy || lvl < 1) { f.greeted = 'busy'; continue; }                                                     // a stranger, or busy with something: it carries on
      if (asleep) { if (lvl >= 2) { look(3); f.greeted = 'stirs'; f.thought = 'Opened an eye at you'; } else f.greeted = 'asleep'; continue; }
      const toGlass = (close) => { if (this.rng() > 0.01) { look(3, lvl >= 3 ? 0.3 : 0); f.greeted = 'looked'; f.thought = 'Looked up at you'; return; }      /* (coming all the way to the glass is a rare thing: about one open in a hundred) */ f.glassAt = { x: (r - 0.5) * 3, y: 2.4 + r * 2, until: performance.now() + 10000, close }; f.inspect = null; f.greeted = 'glass'; f.thought = 'Came to the glass to see you'; look(4, close ? 0.5 : 0); };
      const fromDen = () => { look(4, lvl >= 2 ? 0.45 : 0); f.greeted = 'den'; f.thought = 'Watching you from its den'; if (den > 1.6 && f.st) { f.inspect = null; f.goDen?.(f.st, Math.random); } };
      if (lvl === 1) { if (f.den && f.st) fromDen(); else { look(2.5); f.greeted = 'noticed'; f.thought = 'Noticed you'; } continue; }
      if (ty === 'homebody') { fromDen(); continue; }                                                              // a homebody answers from home
      if (ty === 'watcher') { if (lvl >= 3 && !far) toGlass(false); else { look(6); f.greeted = 'watching'; f.thought = 'Watching you'; } continue; }
      if (ty === 'showoff') { toGlass(lvl >= 3); continue; }
      const p = lvl >= 3 ? 0.7 : 0.45;
      if (r < (far ? p * 0.5 : p)) toGlass(lvl >= 3); else { look(3.5); f.greeted = 'noticed'; f.thought = 'Looked up at you'; }      // far back in the tank it often just looks up
    }
  }
  denOf(f) { const sp = (this.spots?.() ?? []).find((x) => x.id === f.homeId); return sp ? { x: sp.x, z: sp.z } : f.fav ? { x: f.fav.x, z: f.fav.z } : null; }
  // ── hermit crabs (crab3d.js) ── one is made like any animal, set down on the sand, and given its view of the tank: the empty shells, what it can
  // climb, the food on the sand, where not to walk (a seahorse resting or carrying young, a goby's patch), and how to tell the tank it moved house
  makeCrab(d) {
    const f = new Crab3D(d.species, d.seed, { label: SPECIES_DEF[d.species]?.label, name: d.name, speed: 0.5, scale: 1, band: { y: [0, 1], z: [-2, 3] } }), r = this.rng;
    Object.assign(f, { fid: d.id, rec: d, name: d.name, sk: d.species, getSpots: () => this.spots?.() ?? [] }); f.setGrowth(1);
    f.pos.set((r() - 0.5) * 6, 0, (r() - 0.3) * 4); f.pos.y = sandH(f.pos.x, f.pos.z); f.heading = r() * 6.28; if (d.crab?.shell) f.wear(d.crab.shell.t, d.crab.shell.sz);
    const M = this, decorOf = (id) => M.state?.decor?.find((x) => x.id === id);
    f.W = {
      isLead: () => (M.isLead ? M.isLead() : true),
      empties: () => (M.state?.decor ?? []).filter((x) => isShell(x.type) && !M.claimed?.has(x.id)).map((x) => ({ id: x.id, type: x.type, x: x.x, z: x.z, ry: x.ry ?? 0, sz: shellSz(x) })),
      claimedBy: (id, c) => [...M.list].some((o) => o.crab && o !== c && o.cs?.s === 'swap' && o.cs.d?.id === id),
      spots: () => M.spots?.() ?? [],
      climbable: (sp) => ['ROCKS', 'WOOD'].includes(DECOR_DEF[sp.type]?.cat) && !['coconut', 'urchin', 'pot'].includes(sp.type) && !isShell(sp.type)      /* (rocks and wood: never a hollow pot, a coconut den or an urchin's spines) */ && (sp.h ?? 1) >= 0.35 && (sp.h ?? 1) <= 2.4,
      decorTop: (x, z, id) => { const it = id && M.decor?.items?.get(id), v = it ? M.dvOf(id, it).filter((q) => Math.hypot(q[0] - x, q[2] - z) < 0.45) : M.decorVox(x, z, 0.35); let top = null; for (const q of v) if (top == null || q[1] > top) top = q[1]; return top == null ? null : top + 0.06; },      // (the top of that one decoration, under its feet)
      label: (sp) => (DECOR_DEF[sp.type]?.label ?? 'rock').toLowerCase(),
      flakes: () => M.flakes,
      crabs: () => M.list.filter((q) => q.crab && !q.dead).length,
      cat: (sp) => DECOR_DEF[sp.type]?.cat,
      wobble: (id, a) => { const it = M.decor?.items?.get(id); if (it) it.group.rotation.z = a; },      // a shell being looked over rocks under the crab's claws
      addGhost: (c) => { const g = c.bodyG.clone(true); g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.color?.setRGB(1.25, 1.2, 1.1); } }); g.visible = true; g.scale.setScalar(c.need * 0.92);      // its shed skin: the same shape, pale and see-through, lying beside it on the sand
        const a = c.heading + 1.4; g.position.set(c.pos.x + Math.cos(a) * 0.35, sandH(c.pos.x, c.pos.z) + 0.03, c.pos.z - Math.sin(a) * 0.35); g.rotation.set(0.15, c.heading + 0.6, 0.25); M.scene.add(g); return g; },
      avoid: (x, z, c) => Object.values(c.noGo ?? {}).some((q) => q.until > Date.now() && Math.hypot(q.x - x, q.z - z) < 1.4) || M.list.some((o) => !o.dead && ((o.sk === 'seahorse' && o.holdfast?.on && (o.rec?.preg || (o.restK ?? 0) > 0.4)) || o.sk === 'cory') && Math.hypot(o.pos.x - x, o.pos.z - z) < (o.sk === 'cory' ? 0.9 : 1.1)),      // a seahorse resting or carrying young, a goby by its burrow: walked round
      claim: (dd, c) => { (M.claimed ||= new Set()).add(dd.id); const it = M.decor?.items?.get(dd.id); if (it) it.group.visible = false;      // it is going: the shell stays to be seen until the crab is in it
        const tmp = shellVoxTemp(dd, it); if (tmp) { M.scene.add(tmp); c.temps.push(tmp); c.newTmp = tmp; }
        return Promise.resolve(M.onCrabShell ? M.onCrabShell({ fish: c.fid, decor: dd.id, x: +c.pos.x.toFixed(2), z: +c.pos.z.toFixed(2), ry: +((-c.heading + 0.5) % 6.28).toFixed(2) }) : true).then((ok) => { if (!ok) { M.claimed.delete(dd.id); if (it) it.group.visible = true; if (tmp) tmp.parent?.remove(tmp); } return ok; }).catch(() => false); },
      leaveShell: (c) => { const g = c.shellG.clone(true); g.position.copy(c.group.position); g.quaternion.copy(c.group.quaternion); g.visible = true; M.scene.add(g); c.temps.push(g); setTimeout(() => g.parent?.remove(g), 5000); return g; },      // (until the tank's own copy of the old shell turns up where it was left)
      tookShell: (c) => { if (c.newTmp) { c.newTmp.parent?.remove(c.newTmp); c.newTmp = null; } for (const q of M.list) if (q.crab && q !== c && q.cs?.s === 'queue' && q.pos.distanceTo(c.pos) < 4) q.cs.chk = 1.5; },      // a vacancy chain: those waiting nearby look at the shell it just left
      remember: (c, m) => { const w = Object.entries(c.fear ?? {}).sort((a, b) => b[1] - a[1])[0]; M.onCrabMem?.({ fish: c.fid, ...m, wary: w && w[1] > 0.2 ? w[0] : null }); },
      note: () => {}, ate: () => {}, puff: (p) => M.burst?.(p.clone().setY(p.y + 0.1)),
    };
    const shellVoxTemp = (dd, it) => { if (!it) return null; const g = it.group.clone(true); g.visible = true; return g; };
    return f;
  }
  // the rest of the tank notices the crabs, each kind in its own way (TO_CRABS, from what these animals are to hermit crabs on a real reef):
  // territorial fish see one off their own patch (the crab remembers and keeps clear of it a while), the octopus watches and taps a tucked-in
  // crab's shell, a puffer or a loggerhead stalks one (a bold crab raises its claws, and a puffer puffs up at that), an angelfish picks at a shell,
  // a seahorse eyes one at its plant, a turtle stops to look, and fish on the bottom come to pinch a crab's food (it guards it, claws up)
  crabTick(dt) {
    if ((this.ctT = (this.ctT ?? 0) - dt) > 0) return; this.ctT = 0.5; const r = this.rng, crabs = this.list.filter((c) => c.crab && !c.dead && c.group.visible !== false); if (!crabs.length) return;
    const decor = this.state?.decor ?? [], homeOf = (o, kind) => { const types = { anemone: ['anemone'], cave: ['cave', 'boulder', 'arch', 'pot'], burrow: null, rock: ['rock', 'boulder', 'brain', 'liverock', 'table'] }[kind]; if (!types) return { x: o.home?.x ?? o.pos.x, z: o.pos.z, label: 'burrow', id: 'b:' + o.fid };
      let best = null, bd = 2.2; for (const d of decor) if (types.includes(d.type)) { const q = Math.hypot(d.x - o.pos.x, d.z - o.pos.z); if (q < bd) { bd = q; best = d; } } return best && { x: best.x, z: best.z, label: kind === 'rock' ? 'patch' : kind, id: best.id }; };
    for (const o of this.list) { if (o.dead || o.crab || o.puppet || o.group.visible === false) continue; o.crabCool = (o.crabCool ?? 0) - 0.5; const A = TO_CRABS[o.sk]; if (!A || A.how === 'ignores') continue;
      const c = crabs.slice().sort((a, b) => a.pos.distanceTo(o.pos) - b.pos.distanceTo(o.pos))[0], d = Math.hypot(c.pos.x - o.pos.x, c.pos.z - o.pos.z), low = o.pos.y < sandH(o.pos.x, o.pos.z) + 1.3;
      if (A.how === 'hunter' && o.species?.move === 'jet') { const S = o.st, free = !o.task && !o.keepCarry && !o.hunt && !o.jarAt && !o.glassAt && !o.inspect && (S?.s === 'crawl' || S?.s === 'rest') && !S?.mode;
        if (free && o.crabCool <= 0) { const col = o.mind?.type === 'collector', shells = decor.filter((x) => isShell(x.type) && !this.claimed?.has(x.id));
          if (col && shells.length && r() < 0.35) { const sh = shells[Math.floor(r() * shells.length)]; o.inspect = { x: sh.x, z: sh.z, id: sh.id, type: sh.type }; o.thought = 'Turning over an empty shell'; o.crabCool = 50 + r() * 50; }
          else if (d < 3.5 && r() < (col ? 0.3 : 0.18)) { o.inspect = { x: c.pos.x + (o.pos.x - c.pos.x) * 0.3, z: c.pos.z + (o.pos.z - c.pos.z) * 0.3, id: 'crab:' + c.fid, type: 'crab' }; o.gazeT = Math.max(o.gazeT ?? 0, 3); o.thought = `Watching ${c.name}`; o.crabCool = 40 + r() * 40; } else o.crabCool = 8; }
        if (o.inspect?.type === 'crab' && o.inspect.id === 'crab:' + c.fid) { o.inspect.x += (c.pos.x - o.inspect.x) * 0.2; o.inspect.z += (c.pos.z - o.inspect.z) * 0.2;      // (it follows the crab with its eyes and a careful step; it never grabs one)
          if (d < 0.9 && c.cs?.s === 'retract') { c.tapBy = o; c.cs.t = Math.max(c.cs.t, 2); o.thought = `Tapping ${c.name}'s shell`; o.gazeT = Math.max(o.gazeT ?? 0, 2); if (r() < 0.15) { o.inspect = null; o.thought = `Lost interest in ${c.name}`; } } }
        continue; }
      if (o.crabCool > 0) continue;
      if (A.how === 'territorial' && low) { const H = homeOf(o, A.home); if (H && Math.hypot(c.pos.x - H.x, c.pos.z - H.z) < 1.2 && Math.hypot(o.pos.x - H.x, o.pos.z - H.z) < 2) {      // the crab is on its patch: it charges, the crab backs off and remembers
          o.dartT = 0.9; o.target.set(c.pos.x, Math.max(o.pos.y - 0.3, sandH(c.pos.x, c.pos.z) + 0.4), c.pos.z); o.retarget = 1.2; o.thought = `Chased ${c.name} away from its ${H.label}`; o.crabCool = 12;
          (c.noGo ||= {})[H.id] = { x: H.x, z: H.z, until: Date.now() + 8 * 60e3 }; if (!['retract', 'swap', 'molt'].includes(c.cs?.s)) { const a = Math.atan2(c.pos.z - H.z, c.pos.x - H.x); c.cs = { s: 'walk', to: { x: H.x + Math.cos(a) * 1.8, z: H.z + Math.sin(a) * 1.8 }, then: { s: 'idle', t: 1 }, why: 'clear', who: o, home: H.label }; } continue; } }      // (away from its patch it is just a fish on the bottom: it may still come for a crab's food)
      if (A.how === 'stalker' && d < 3 && r() < 0.3) { o.target.set(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.75, c.pos.z); o.retarget = 4; o.thought = `Watching ${c.name}`; o.crabCool = 25;
        if (o.sk === 'puffer' && d < 1.3 && c.ctype?.bold > 0.7 && c.cs?.s !== 'retract') { c.clawUp = 1.5; o.puffT = 4.5; o.thought = `Puffed up at ${c.name}, who held up its claws`; } continue; }      // a bold crab stands its ground: claws up, and the puffer puffs
      if (A.how === 'curious' && d < 1.8) { o.idle = 2; o.thought = `Stopped to look at ${c.name}`; o.crabCool = 30; continue; }
      if (A.how === 'picker' && d < 1.4 && low && r() < 0.4) { o.target.set(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.4, c.pos.z); o.retarget = 2; o.thought = `Picked at ${c.name}'s shell`; o.crabCool = 40; continue; }
      if (A.how === 'wary') { if (o.holdfast?.on && d < 1.3) { o.glance = { x: c.pos.x, y: c.pos.y + 0.2, z: c.pos.z }; o.glanceT = 2; o.crabCool = 12; if (!o.rec?.preg && r() < 0.3) { o.release?.(); o.thought = `Moved off its plant as ${c.name} came by`; } } continue; }
      if (low && d < 1.4) { const eater = crabs.find((q) => q.cs?.s === 'eat' && Math.hypot(q.pos.x - o.pos.x, q.pos.z - o.pos.z) < 1.4); if (eater && r() < 0.5) { o.target.set(eater.pos.x, sandH(eater.pos.x, eater.pos.z) + 0.35, eater.pos.z); o.retarget = 1.5; o.thought = `Tried to pinch ${eater.name}'s food`; eater.guardFrom = o.name; eater.guardT = 2.5; o.crabCool = 20; } }
    }
    // the tank's own copy of an old shell is in: the stand-in can go
    for (const c of crabs) if (c.temps.length && decor.some((x) => x.left === c.fid && Date.now() - (x.at ?? 0) < 60e3)) { for (const m of c.temps) if (m !== c.newTmp) m.parent?.remove(m); c.temps = c.newTmp ? [c.newTmp] : []; }
    for (const id of [...(this.claimed ?? [])]) if (!decor.some((x) => x.id === id) && !crabs.some((c) => c.cs?.d?.id === id && c.cs.s === 'swap')) this.claimed.delete(id);
  }
  // an octopus taking a keepsake home: it goes to it, picks it up (the little thing rides under its arms), carries it to its den and leaves it
  // there. Now and then it drops it on the way (and may fetch it another time). Only the phone running the animals reports where it ended up.
  carryTick(dt) {
    const ks = this.keepSpots?.() ?? [], lead = this.isLead ? this.isLead() : true;
    for (const f of this.list) { const C = f.keepCarry; if (!C) continue; C.t += dt;
      const k = ks.find((x) => x.id === C.id) ?? (C.it ? { it: C.it } : null), den = this.denOf(f), put = (how) => { const it = C.it; if (it) { const x = Math.max(-4.2, Math.min(4.2, f.pos.x)), z = Math.max(-3.4, Math.min(3.7, f.pos.z)); it.carried = false; it.x = +x.toFixed(2); it.z = +z.toFixed(2); it.group.position.set(it.x, sandH(it.x, it.z) + 0.03, it.z); if (lead) this.onKeep?.({ id: C.id, x: it.x, z: it.z, how, fish: f.fid, idk: `${f.fid}:${C.id}:${Math.round(C.t0 ?? 0)}` }); } f.keepCarry = null; (f.keepNo ||= {})[C.id] = Date.now() + 120e3; };      /* (set down or dropped: it leaves that one alone a couple of minutes) */
      if (!k || f.dead || f.puppet || !den) { if (C.it) put('drop'); else f.keepCarry = null; continue; }
      if (C.phase === 'go') {
        if (Date.now() - (this.attnAt ?? 0) < 6e3 && C.t > 1) { f.keepCarry = null; f.inspect = null; f.thought = 'Stopped to look at you'; continue; }      // a tap on the glass: it leaves it for now
        if (C.t > 45) { f.keepCarry = null; continue; }
        const kd = Math.hypot(f.pos.x - k.x, f.pos.z - k.z), atIt = f.st?.s === 'work' && f.st?.mode === 'inspect' && f.inspect?.id === k.id;      // arrived and working at it: its walk stops where the sand lets it, which can be a little short of a far shell (as at its den, below)
        if (kd < 1.2 || (atIt && kd < 1.8)) {      /* within an arm's reach */ C.it = k.it; C.it.carried = true; C.phase = 'carry'; C.dest ||= { x: den.x, z: den.z + 0.55 }; if (C.slip === undefined) C.slip = this.rng() < 0.15 * (f.mind?.type === 'trickster' ? 1.5 : 1) ? 1.5 + this.rng() * 6 : null;      /* now and then it will slip, a few seconds into the carry */ C.t0 = Date.now() / 1000; C.t = 0; f.inspect = { x: C.dest.x, z: C.dest.z, id: 'den', type: 'keep' }; f.thought = 'Carrying its keepsake home'; }
        else if (!f.inspect) f.inspect = { x: k.x, z: k.z, id: k.id, type: 'keep' };
        continue;
      }
      const it = C.it; it.group.position.set(f.pos.x + Math.sin(f.heading ?? 0) * 0.15, Math.max(sandH(f.pos.x, f.pos.z) + 0.05, f.pos.y - 0.32), f.pos.z + 0.18);      // held low under its arms
      const dest = C.dest ?? { x: den.x, z: den.z + 0.55 }; if (!f.inspect) f.inspect = { x: dest.x, z: dest.z, id: 'den', type: 'keep' };
      const dd = Math.hypot(f.pos.x - dest.x, f.pos.z - dest.z);
      if (dd < 1.0 || (f.st?.s === 'work' && dd < 2.0)) { put('carry');      /* at its den (or as close as it gets: it stops an arm's length from where it was going) */ f.thought = 'Left its keepsake by its den'; }
      else if (C.t > 40) put('drop');
      else if (C.slip != null && C.t > C.slip) { put('drop'); f.inspect = null; f.thought = 'Dropped it'; }      // butterfingers: it lands on the sand where it slipped
    }
  }
  // Little accidents and quiet habits, a few times a second (Emergent Life). All harmless, all shown by movement.
  quirkTick(dt) {
    if ((this.qT = (this.qT ?? 0) - dt) > 0) { for (const f of this.list) this.wrongStep(f, dt); return; } this.qT = 0.5; const r = this.rng, now = Date.now(), ks = this.keepSpots?.() ?? [];
    for (const f of this.list) {
      if (f.dead || f.puppet || f.visitor) continue; this.wrongStep(f, 0.5);
      if (f.species?.move === 'jet') {
        f.nightOwl = ['explorer', 'trickster', 'collector'].includes(f.mind?.type);      // about more at night (fish3d), the others go home
        const S = f.st, den = f.den;
        // a fish that keeps poking about round its den while it rests there: that is annoying, and it remembers who (fish3d memo; the reason goes with its rival to the tank)
        if (den && S?.s === 'rest' && Math.hypot(f.pos.x - den.x, f.pos.z - den.z) < 0.9) for (const o of this.list) if (o !== f && !o.dead && !o.visitor && o.species?.move !== 'jet' && Math.hypot(o.pos.x - den.x, o.pos.z - den.z) < 1.3 && o.pos.y < 2.5) { f.memo?.(o, 'a', 0.3); (f.denPokes ||= {})[o.fid] = ((f.denPokes[o.fid] ?? 0) + 1); }
        // wrong entrance: coming home, it tries the den from an awkward side, backs out and goes round
        if (den && S?.s === 'crawl' && S.mode === 'den') { const d = Math.hypot(f.pos.x - den.x, f.pos.z - den.z); if (d > 2.2) f.denTry = false; else if (d < 1.6 && !f.denTry && !f.wrong) { f.denTry = true; if (r() < 0.2) { const side = f.pos.x < den.x ? -1 : 1; f.wrong = { t: 0, den, side, keep: f.target.clone() }; f.wrongs = (f.wrongs ?? 0) + 1; } } }
        // another octopus is handling something: a watching one may go and look at it after
        if (S?.s === 'work' && S.mode === 'inspect' && f.inspect?.id && f.inspect.type !== 'keep') for (const o of this.list) if (o !== f && o.species?.move === 'jet' && !o.dead && !o.inspect && !o.task && o.pos.distanceTo(f.pos) < 4 && (o.sawAt ?? 0) < now - 60e3 && r() < 0.25 * (o.mind?.cur ?? 0.5)) { o.sawAt = now; o.copyLook = { ...f.inspect, after: now + 8000 }; }
        if (f.copyLook && now > f.copyLook.after && !f.inspect && !f.task && !f.keepCarry && !S?.mode) { f.inspect = { x: f.copyLook.x, z: f.copyLook.z, id: f.copyLook.id, type: f.copyLook.type, r: f.copyLook.r }; f.copyLook = null; f.copied = (f.copied ?? 0) + 1; f.thought = 'Curious about what the other one was doing'; }
        // a keepsake moved by someone else: its owner goes to check on it; another octopus may go and look at a freshly moved one
        if (!f.inspect && !f.task && !f.keepCarry && !S?.mode) { const q = ks.find((k) => k.rec?.h?.movedBy && now - k.rec.h.movedBy.at < 15 * 60e3 && (k.by === f.fid ? k.rec.h.movedBy.id !== f.fid && (f.checked ?? '') !== k.id + k.rec.h.movedBy.at : k.rec.h.movedBy.id !== f.fid && (f.checked ?? '') !== k.id + k.rec.h.movedBy.at && r() < 0.15));
          if (q) { f.checked = q.id + q.rec.h.movedBy.at; f.inspect = { x: q.x, z: q.z, id: q.id, type: 'keep' }; f.thought = q.by === f.fid ? 'Checking where its keepsake went' : 'Looking at the keepsake that moved'; } }
        continue;
      }
      if (f.sk === 'seahorse') { const fav = f.rec?.log?.fav, D = fav && (this.state?.decor ?? []).find((x) => x.id === fav), mv = D?.h?.moves?.at(-1);
        if (mv?.from && Date.now() - mv.at < 12 * 3600e3 && f.oldFor !== mv.at && !f.holdfast?.on) { f.oldFor = mv.at; f.searchedOld = (f.searchedOld ?? 0) + 1; f.target.set(mv.from.x, Math.max(f.pos.y, 2.5), mv.from.z + 0.4); f.retarget = 6; f.idle = 0; f.thought = 'Looking for its plant'; }      // its plant was moved: it goes to where it was first
        if (f.holdfast?.on && !f.mate && (f.brood ?? 0) < 0.8 && r() < 0.5 * 0.0015 * (1 + (f.persona?.cur ?? 0.5))) { f.release(2.4); f.vel.set((r() - 0.5) * 0.25, 0.05, (r() - 0.5) * 0.15); f.drifts = (f.drifts ?? 0) + 1; } continue; }      // lets go and drifts a moment before finding another stem
      // fish: a sudden bubble, a curious approach that turns back, a schooling fish falling behind, a shy one turning from a bigger animal
      const tr = f.profile?.traits ?? [], resting = !!(f.restK && f.idle > 0);      // (settled at its place or by its friend; on the way there it is still a fish with whims)      // (a fish resting, or on its way to rest, isn't drawn off by these small whims; a fright still moves it)
      if (!resting && this.hasBubbler?.() && Math.hypot(f.pos.x - this.bubbleAt.x, f.pos.z - this.bubbleAt.z) < 0.9 && f.pos.y < 9 && !tr.includes('Playful') && r() < 0.15) { const dx = f.pos.x - this.bubbleAt.x || 0.1; f.vel.x += Math.sign(dx) * 2.2; f.target.set(f.pos.x + Math.sign(dx) * 2, f.pos.y + 0.5, f.pos.z); f.retarget = 2; f.startles = (f.startles ?? 0) + 1; }
      if (!resting && tr.includes('Curious') && !f.seeking && (f.backAt ?? 0) < now - 30e3) { const sp = (this.spots?.() ?? []).find((q) => Math.hypot(q.x - f.target.x, q.z + 0.6 - f.target.z) < 1.2 && Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 1.6); if (sp && r() < 0.12) { f.backAt = now; f.settle = null; f.target.set(f.pos.x + (f.pos.x - sp.x) * 1.2, f.pos.y + 0.3, f.pos.z + 0.8); f.retarget = 2.5; f.retreats = (f.retreats ?? 0) + 1; } }
      if (!resting && f.species?.school && !f.lagT && r() < 0.004) { f.lagT = 4; f.lags = (f.lags ?? 0) + 1; }
      if (f.lagT) { f.lagT = Math.max(0, f.lagT - 0.5); f.mul = f.lagT > 2 ? 0.5 : f.lagT > 0 ? 1.5 : 1; if (!f.lagT) f.mul = 1; }      // drops back, then hurries to catch up
      if (tr.includes('Shy')) { const big = this.list.find((o) => o !== f && !o.dead && (o.species?.move === 'jet' || o.sk === 'angelfish') && o.pos.distanceTo(f.pos) < 1.4); if (big && (f.shyAt ?? 0) < now - 8000) { f.shyAt = now; f.target.set(f.pos.x + (f.pos.x - big.pos.x) * 2, f.pos.y, f.pos.z + (f.pos.z - big.pos.z)); f.retarget = 2; f.turns = (f.turns ?? 0) + 1; } }
    }
  }
  wrongStep(f, dt) {
    const W = f.wrong; if (!W) return; W.t += dt; const dx = f.pos.x - W.den.x, dz = f.pos.z - W.den.z, d = Math.hypot(dx, dz) || 1;
    if (W.t < 1.4) { f.pos.x += (dx / d) * 0.55 * dt; f.pos.z += (dz / d) * 0.55 * dt; }      // backs out
    else if (W.t < 3.2) f.target.set(W.den.x + W.side * 1.1, f.target.y, W.den.z + 0.4);      // goes round to the other side
    else { f.wrong = null; f.target.copy(W.keep); }
  }
  // the octopus that knows a caretaker well notices them looking after someone else, and comes to the glass (no meter, nothing lost)
  attention(fid) {
    for (const o of this.list) if (o.species?.move === 'jet' && o.fid !== fid && !o.dead && !o.puppet && !o.task && !o.keepCarry && (o.trust ?? 0) >= 2 && (o.mind?.soc ?? 0.5) > 0.55 && (o.lookCool ?? 0) < Date.now() && this.rng() < 0.5) {
      o.lookCool = Date.now() + 5 * 60e3; o.glassAt = { x: (this.rng() - 0.5) * 3, y: 2.6 + this.rng() * 2, until: performance.now() + 9000, close: false }; o.noticed = (o.noticed ?? 0) + 1; }
  }
  // stubborn: a decoration being hauled catches on something; the octopus stops, backs off a little and tries again
  snag(f, T, dt) {
    if (T.snag === undefined) T.snag = this.rng() < 0.2 ? 1 + this.rng() * 2.5 : null; T.ht2 = (T.ht2 ?? 0) + dt;
    if (T.snag != null && T.ht2 > T.snag && T.ht2 < T.snag + 1.6) { f.pos.x -= T.ux * 0.35 * dt; f.pos.z -= T.uz * 0.35 * dt; if (!T.snagged) { T.snagged = true; f.snags = (f.snags ?? 0) + 1; } return true; }
    return false;
  }
  // too heavy: a bold octopus wraps its arms round something far too big to shift, leans back to pull, twice, then gives up and goes
  tugTick(dt) {
    for (const f of this.list) {
      if (f.species?.move !== 'jet' || f.dead || f.puppet) continue; const S = f.st, I = f.inspect;
      if (!f.tug && S?.s === 'work' && S.mode === 'inspect' && I && HEAVY.has(I.type) && f.tugFor !== I.id) { f.tugFor = I.id; if (this.rng() < 0.3 * (f.bold ?? 0.5) * 2) { f.tug = { t: 0, x: I.x, z: I.z }; f.tugs = (f.tugs ?? 0) + 1; } }
      if (!f.tug) continue; const T = f.tug; T.t += dt; const dx = f.pos.x - T.x, dz = f.pos.z - T.z, d = Math.hypot(dx, dz) || 1, pull = Math.max(0, Math.sin(T.t * Math.PI / 1.1)) * (T.t < 4.4 ? 1 : 0);
      f.pos.x += (dx / d) * pull * 0.5 * dt; f.pos.z += (dz / d) * pull * 0.5 * dt;      // leaning back, letting go, leaning back again
      if (T.t > 4.6) { f.tug = null; f.inspect = null; f.gaveUp = (f.gaveUp ?? 0) + 1; if (S) { S.mode = null; S.s = 'rest'; S.t = 2.5; } f.thought = 'That one is too heavy'; }
    }
  }
  drips(at) { for (let i = 0; i < 3; i++) this.burst(new THREE.Vector3(at.x + (i - 1) * 0.3, at.y - i * 0.4, at.z + 0.2)); }      // a few drops where it went over the rim (the wet trail)
  makeEmote(f) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, opacity: 0 })); sp.scale.setScalar(0.8); sp.renderOrder = 9; sp.visible = false;
    f.emote = sp; f.emoteSeed = Math.random() * 20; this.scene.add(sp); this.onSprite?.(sp);
  }
  // the mood bubble shows for a few seconds out of every ~14, so the tank stays calm
  // (a bubble still fading out when the mood changes to one with no bubble keeps the old picture until it is gone)
  updateEmotes(t) {
    for (const f of this.list) {
      const sp = f.emote, pt = f.rec?.partner && this.list.find((o) => o.fid === f.rec.partner && !o.dead), mood = pt && pt.pos.distanceTo(f.pos) < 2.4 ? 'Together' : f.profile?.mood;      /* two octopus partners close together: a heart now and then */ if (!sp) continue; if (f.dead) { sp.visible = false; continue; }
      const phase = (t + f.emoteSeed) % 14, show = EMOTE[mood] && (phase < 3.4 || (mood === 'Hungry' && phase < 7)) && !f.group.parent?.userData?.hide && !(mood === 'Sleepy' && f.species.move === 'jet' && (f.restK ?? 0) < 0.5 && (f.sleepK ?? 0) < 0.3);      // a sleepy octopus shows its Zz once it has settled, not while it is still on its way home
      const want = show ? Math.min(1, Math.min(phase, 3.4 - phase + 0.4) * 2.5) : 0;
      sp.material.opacity += (want - sp.material.opacity) * 0.2; sp.visible = sp.material.opacity > 0.03;
      if (sp.visible) { if (sp.userData.mood !== mood && EMOTE[mood]) { sp.material.map = emoteTexture(mood); sp.material.needsUpdate = true; sp.userData.mood = mood; } sp.position.set(f.pos.x, f.pos.y + f.radius * 0.8 + 0.5 + Math.sin(t * 2 + f.emoteSeed) * 0.05, f.pos.z + 0.4); }
    }
  }
  // Watching: what the fish are really doing, reported once and only when it matters. The server checks every report.
  // A phone only counts what it actually sees, and only while the game is open and visible.
  said(f, key, extra = {}, cool = 600) {
    if (f.nursery) return;      // (a nursery baby has no record on the server yet)
    const k = f.fid + key + (extra.with ?? '') + (extra.spot ?? ''), now = performance.now() / 1000; this.cool ||= new Map();
    if (now - (this.cool.get(k) ?? -1e9) < cool) return; this.cool.set(k, now); this.onObserve?.({ key, fish: f.fid, ...extra });
  }
  wants(f, key, other) {
    const kind = this.dailyKind?.(), sightFor = { together: ['together', 'friends'], visit: ['visit'], regular: ['visit', 'favourite'], object: ['visit', 'investigate'], hideaway: ['visit'], bubbles: ['bubbles'] }[key];
    const known = key === 'together' ? other && f.disc?.['together:' + other.fid] : f.disc?.[key];
    return !known || (sightFor && sightFor.includes(kind));
  }
  observe(dt, t) {
    if (document.hidden || !this.onObserve) return; dt = Math.min(dt, 0.1); const spots = this.spots?.() ?? [], live = this.list.filter((f) => !f.dead && !f.visitor && !f.weak);
    const phase = this.phase?.() ?? 'day';
    for (const f of live) {
      const tr = f.profile?.traits ?? [], has = (x) => tr.includes(x), d = (f.dw ||= { near: {} });
      d.glass = f.pos.z > 2.1 ? (d.glass ?? 0) + dt : Math.max(0, (d.glass ?? 0) - dt * 0.4); if ((has('Brave') || has('Social')) && d.glass > 12 && this.wants(f, 'glass')) this.said(f, 'glass');
      d.surface = f.pos.y > 10.5 ? (d.surface ?? 0) + dt : Math.max(0, (d.surface ?? 0) - dt * 0.4); if (has('Greedy') && d.surface > 12 && this.wants(f, 'surface')) this.said(f, 'surface');
      d.rest = this.night && f.pos.y < 3 && f.vel.length() < 0.4 ? (d.rest ?? 0) + dt : Math.max(0, (d.rest ?? 0) - dt * 2); if (d.rest > 20 && this.wants(f, 'night_rest')) this.said(f, 'night_rest');
      for (const sp of spots) {
        const n = (d.near[sp.id] ||= { t: 0, visits: 0, hide: 0 }), dx = f.pos.x - sp.x, dzr = f.pos.z - sp.z, near = Math.hypot(dx, dzr * 1.3) < 1.35 && f.pos.y < sp.h + 1.2;
        const behind = Math.abs(dx) < 1.2 && dzr < -0.25 && dzr > -1.9 && f.pos.y < sp.h + 1.4;       // tucked in behind it, out of sight from the glass
        n.hide = behind ? n.hide + dt : Math.max(0, n.hide - dt * 0.5); if (has('Shy') && n.hide > 8 && this.wants(f, 'hideaway')) this.said(f, 'hideaway', { spot: sp.id });
        if (near) {
          n.t += dt;
          if (has('Curious') && n.t > 5 && this.wants(f, 'object')) this.said(f, 'object', { spot: sp.id });
        } else if (n.t > 0) {
          if (n.t >= 3) { n.visits++; if (n.visits >= 3 && this.wants(f, 'regular')) this.said(f, 'regular', { spot: sp.id }); else if (this.wants(f, 'visit')) this.said(f, 'visit', { spot: sp.id }, 90); }
          n.t = 0;
        }
      }
      if (has('Playful') && Math.hypot(f.pos.x - this.bubbleAt.x, (f.pos.z - this.bubbleAt.z) * 1.1) < 1.6 && f.pos.y < 10 && this.hasBubbler?.()) { d.bub = (d.bub ?? 0) + dt; if (d.bub > 4 && this.wants(f, 'bubbles')) this.said(f, 'bubbles'); } else d.bub = Math.max(0, (d.bub ?? 0) - dt);
      // routine: the same part of the tank in two different parts of the day, remembered between visits
      const reg = (f.pos.x < -1.3 ? 0 : f.pos.x > 1.3 ? 2 : 1) * 2 + (f.pos.y > 7 ? 1 : 0); this.routine ||= this.loadRoutine(); const rr = ((this.routine[f.fid] ||= {})[phase] ||= {}); rr[reg] = (rr[reg] ?? 0) + dt; this.rdirty = true;
      if (!d.rchk || t - d.rchk > 20) { d.rchk = t; const seenIn = Object.values(this.routine[f.fid] ?? {}).filter((m) => Object.values(m).some((v) => v >= 40)); const hasTwo = [0, 1, 2, 3, 4, 5].some((r) => Object.values(this.routine[f.fid] ?? {}).filter((m) => (m[r] ?? 0) >= 40).length >= 2); if (hasTwo && seenIn.length && this.wants(f, 'routine')) this.said(f, 'routine'); }
    }
    this.kindTick(dt, t, live);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], k = a.fid < b.fid ? a.fid + b.fid : b.fid + a.fid; this.pt ||= {}; const close = a.pos.distanceTo(b.pos) < 1.7 && a.id !== 'neon' && !(a.species.school && a.id === b.id);
      this.pt[k] = close ? (this.pt[k] ?? 0) + dt : 0; if (this.pt[k] > 8 && (this.wants(a, 'together', b) || this.wants(b, 'together', a))) { this.said(a, 'together', { with: b.fid }); this.pt[k] = -20; }
    }
    if (this.rdirty && t - (this.rsave ?? 0) > 25) { this.rsave = t; this.rdirty = false; try { localStorage.setItem('ourtank.routine', JSON.stringify(this.routine)); } catch { /* storage unavailable */ } }
  }
  // what a seahorse or an octopus is seen doing, for its own journal, and a running tally of how each animal spends its time (sent by the lead phone every few minutes)
  kindTick(dt, t, live) {
    const lead = this.isLead ? this.isLead() : true, spots = this.spots?.() ?? [];
    for (const f of live) {
      const d = f.dw, sp = f.species.id, S = f.st;
      if (sp === 'seahorse') {
        const H = f.holdfast;
        if (H?.on && H.held > 4 && this.wants(f, 'hitch')) this.said(f, 'hitch');
        d.eyes = f.eyeL && f.eyeR && Math.abs(f.eyeL.x - f.eyeR.x) > 1 ? (d.eyes ?? 0) + dt : Math.max(0, (d.eyes ?? 0) - dt); if (d.eyes > 2.5 && this.wants(f, 'eyes')) this.said(f, 'eyes');
        if ((f.snicks ?? 0) >= 2 && this.wants(f, 'snick')) this.said(f, 'snick');
        if ((f.tintK ?? 0) > 0.15 && this.wants(f, 'blend')) this.said(f, 'blend');
        if (f.favHold && f.favourite?.(spots) === f.favHold && this.wants(f, 'favhitch')) this.said(f, 'favhitch', { spot: f.favHold });      // a favorite it has earned (held two minutes and gone back to)
        if (f.greeted) { f.greeted = false; f.greets = (f.greets ?? 0) + 1; if (this.wants(f, 'dance')) this.said(f, 'dance'); }      // a real greeting (see Fish3D.hoverUpdate), not just two seahorses close together
        if (f.link?.on && f.link.o.link?.on) { d.tails = (d.tails ?? 0) + dt; if (d.tails > 5 && this.wants(f, 'tails')) this.said(f, 'tails'); }
        // two seahorses that have shared the tank a while now and then link tails: never on their first day, more often the longer they have been together
        if (lead && !f.link && !f.seeking && !f.greet && !f.sleepy && !f.weak && !(f.linkCool > 0) && !this.night && !this.hungryNow?.()) for (const o of live) {
          if (o === f || o.species.id !== 'seahorse' || o.link || o.seeking || o.greet || o.sleepy || o.weak || o.linkCool > 0 || o.pos.distanceTo(f.pos) > 7) continue;
          const days = Math.min(Date.now() - (f.bornAt ?? Date.now()), Date.now() - (o.bornAt ?? Date.now())) / 864e5, mates = f.mateId === o.fid, bond = mates ? 3 : days < 0.25 ? 0 : Math.max(0, Math.min(1, 0.4 + 0.6 * days / 3));      /* from the start now and then, more as they get to know each other */      // (a pair holds tails far more often)
          if (bond > 0 && Math.random() < dt * 0.012 * bond * (0.4 + 0.6 * ((f.persona?.soc ?? 0.5) + (o.persona?.soc ?? 0.5)))) { /* sociable pairs link more often */ const T = (x, z) => ({ x: Math.max(-3, Math.min(3, x)), z: Math.max(-1.5, Math.min(1.8, z)) }), m = T((f.pos.x + o.pos.x) / 2, (f.pos.z + o.pos.z) / 2); m.y = Math.max(sandUnder(m.x, m.z, 0.8) + 1.5, Math.min(sandUnder(m.x, m.z, 0.8) + 2.6, (f.pos.y + o.pos.y) / 2));
            // open water: nothing in the way of the pair or of the tails curled under them
            const W = Fish3D.world, clear = () => ![0.3, 0, -0.5, -1, -1.4].some((dy) => [[0, 0], [0.4, 0], [-0.4, 0]].some(([dx, dz]) => W.at?.(m.x + dx, m.y + dy, m.z + dz) || W.soft?.at?.(m.x + dx, m.y + dy, m.z + dz)));
            for (let k = 0; k < 6 && !clear(); k++) m.y += 0.5;
            if (clear()) f.linkWith(o, m, 25 + Math.random() * 25); }
          break;
        }
      } else if (sp === 'octopus' && S) {
        const k = { flat: 'camo', kelp: 'camo', lion: 'mimic', snake: 'mimic', jelly: 'mimic', bury: 'bury', squirt: 'squirt' }[S.s === f.act ? f.act : ''];
        if (k && this.wants(f, k)) this.said(f, k);
        if (S.mode === 'inspect' && S.s === 'work' && this.wants(f, 'grab')) this.said(f, 'grab');
        if (f.den && (f.tuckK ?? 0) > 0.5 && this.wants(f, 'den')) this.said(f, 'den');
        d.rear = levelAt(f.pos.x, f.pos.z) === 'rear' && f.pos.y < sandH(f.pos.x, f.pos.z) + 1.5 ? (d.rear ?? 0) + dt : 0; if (d.rear > 10 && this.wants(f, 'highbank')) this.said(f, 'highbank');
      }
      // the tally: distance, the part of the tank it was in, holdfasts and snaps, the places it went
      const L = (d.log ||= { dist: 0, lv: {}, places: new Set(), holds: f.holdN ?? 0, snaps: f.snicks ?? 0, meals: f.meals ?? 0, strikes: f.strikesN ?? 0, greets: f.greets ?? 0, links: f.linksN ?? 0, inspects: f.inspects ?? 0 }); if (d.lp) L.dist += Math.min(1, f.pos.distanceTo(d.lp)); (d.lp ||= f.pos.clone()).copy(f.pos);
      const lv = sp === 'octopus' ? levelAt(f.pos.x, f.pos.z) : f.pos.y > 8.5 ? 'top' : f.pos.y > 5 ? 'mid' : 'low'; L.lv[lv] = (L.lv[lv] ?? 0) + dt;
      for (const q of spots) if (Math.hypot(f.pos.x - q.x, f.pos.z - q.z) < 1.2 && f.pos.y < (q.y ?? 0) + (q.h ?? 1) + 1) { L.places.add(q.id); (L.secs ||= {})[q.id] = (L.secs[q.id] ?? 0) + dt; }      // (and how long: where it really spends its time)
    }
    if (!lead || !this.onLog || t - (this.logAt ??= t) < 180) return; this.logAt = t;
    const logs = live.filter((f) => f.dw?.log && !f.nursery).map((f) => { const L = f.dw.log, e = { fish: f.fid, dist: +L.dist.toFixed(1), lv: Object.fromEntries(Object.entries(L.lv).map(([k, v]) => [k, Math.round(v)])), places: [...L.places], secs: Object.fromEntries(Object.entries(L.secs ?? {}).filter(([, v]) => v >= 5).slice(0, 12).map(([k, v]) => [k, Math.round(v)])), holds: (f.holdN ?? 0) - L.holds, snaps: (f.snicks ?? 0) - L.snaps };
      if (f.sk === 'seahorse') { Object.assign(e, { meals: (f.meals ?? 0) - L.meals, strikes: (f.strikesN ?? 0) - L.strikes, greets: (f.greets ?? 0) - L.greets, links: (f.linksN ?? 0) - L.links, inspects: (f.inspects ?? 0) - L.inspects });
        const M = f.memDelta; if (M) { e.hitch = {}; for (const id of new Set([...Object.keys(M.secs), ...Object.keys(M.visits)])) e.hitch[id] = [Math.round(M.secs[id] ?? 0), M.visits[id] ?? 0, ...(M.pos[id] ?? [])]; f.memDelta = null; }      // what it has done on each holdfast since the last report, by the decoration's id
        if (f.lastHitch) e.last = f.lastHitch; }
      f.dw.log = null; return e; });
    if (logs.length) this.onLog(logs);
  }
  // every voxel of the decorations near a point, as world-space boxes [x, y, z, half size]: for fitting a seahorse's tail round a real stem
  decorVox(cx, cz, r) {
    const D = this.decor; if (!D?.items) return []; const out = [];
    for (const [id, it] of D.items) {
      const g = it.group; if (Math.hypot(g.position.x - cx, g.position.z - cz) > r + 1.5) continue;
      for (const v of this.dvOf(id, it)) if (Math.hypot(v[0] - cx, v[2] - cz) < r) out.push(v);
    }
    return out;
  }
  // the world voxels of one decoration where it stands now, worked out once and kept
  dvOf(id, it) {
    const g = it.group, M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); this.dvCache ||= new Map();
    const key = id + ':' + g.position.x.toFixed(2) + ',' + g.position.z.toFixed(2) + ',' + g.rotation.y.toFixed(2); let vs = this.dvCache.get(key);
    if (!vs) { vs = []; g.updateMatrixWorld(true); g.traverse((o) => { if (!o.isInstancedMesh) return; o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, gs = (bb.max.x - bb.min.x) / 2; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); M.premultiply(o.matrixWorld); M.decompose(P, Q, S); vs.push([P.x, P.y, P.z, gs * Math.max(S.x, S.y, S.z), id]); } }); this.dvCache.set(key, vs); if (this.dvCache.size > 64) this.dvCache.delete(this.dvCache.keys().next().value); }
    return vs;
  }
  // for the grip search: work out the voxels of at most one more decoration near here; true once all of them are known
  decorVoxWarm(cx, cz, r) {
    const D = this.decor; if (!D?.items) return true;
    for (const [id, it] of D.items) { const g = it.group; if (Math.hypot(g.position.x - cx, g.position.z - cz) > r + 1.5) continue; if (!this.dvCache?.has(id + ':' + g.position.x.toFixed(2) + ',' + g.position.z.toFixed(2) + ',' + g.rotation.y.toFixed(2))) { this.dvOf(id, it); return false; } }
    return true;
  }
  // which decorations stand near a point and exactly where (id, position, turn): when this changes, grip points found there are out of date
  decorSig(cx, cz, r) {
    const D = this.decor; if (!D?.items) return ''; let s = '';
    for (const [id, it] of D.items) { const g = it.group; if (Math.hypot(g.position.x - cx, g.position.z - cz) > r + 1.5) continue; s += id + ':' + g.position.x.toFixed(2) + ',' + g.position.z.toFixed(2) + ',' + g.rotation.y.toFixed(2) + (it.haul ? '~' : '') + ';'; }
    return s;
  }
  // ── moving things about: an octopus drags a rock or shell to where it wants it, or lifts a coconut shell and carries it off to live under ──
  haulTick(dt, t) {
    if (!this.decor) return;
    for (const f of this.list) {
      const T = f.task;
      if (T?.stage === 'haul' && !this.snag(f, T, dt)) { this.decor.haulMove(T.id, f.pos.x + T.ux * T.hold, f.pos.z + T.uz * T.hold, T.kind === 'home' ? 0.26 + Math.sin(t * 5) * 0.025 : T.kind === 'turn' ? 0.12 + Math.sin(t * 4) * 0.03 : 0.1, T.kind === 'home' ? 0 : T.kind === 'turn' ? T.ry : null, dt);
        const it = this.decor.items.get(T.id); if (it && T.kind === 'turn') { T.ht = (T.ht ?? 0) + dt; it.group.rotation.z += (0.42 * Math.sin(Math.min(1, T.ht / 5) * Math.PI) - it.group.rotation.z) * Math.min(1, dt * 3); } }      // tipped over on its side while it is shoved, then set back down
      if (f.species.id === 'octopus') f.shellK = 0;
      if (f.species.id !== 'octopus' || !f.den?.home || f.den.kind !== 'coconut') continue;
      const it = this.decor.items.get(f.den.id); if (!it || it.haul || it.slide) continue;
      // the shell is lifted and tipped up at the front as the octopus goes in under it, then held just off the sand over itself, rocking a little as it breathes
      const S = f.st, dist = Math.hypot(f.pos.x - f.den.x, f.pos.z - (f.den.z - 0.2)), entering = !f.dead && S?.s === 'crawl' && (S.mode === 'den' || S.mode === 'tsettle') && dist < 1.5, under = !f.dead && S?.s === 'rest' && dist < 0.55, g = it.group.position;
      // like a real coconut octopus: its half shell lies dome up on the sand like a little hut. Coming home it lifts the near edge like a lid, crawls in
      // underneath and lets the shell down over itself, leaving a crack at the front to peek out of; leaving, it lifts the edge again and slips out
      const m = it.group.children.find((c) => c.isMesh); if (!m) continue; m.userData.y0 ??= m.position.y;
      // the octopus opens it itself: only when it is really going in (at the rim, pushing under) or coming out (lifting the edge from inside);
      // passing by, the shell stays shut. Going in, the lid rises as it gets its arms under the rim; coming out, it drops once it is clear
      if (under) it.wasUnder = performance.now(); const leaving = !f.dead && !under && dist < 1.1 && performance.now() - (it.wasUnder ?? -1e9) < 6000;
      const push = entering && dist < 1.3 ? Math.max(0, Math.min(1, (1.3 - dist) / 0.45)) : leaving ? Math.max(0, Math.min(1, (1.1 - dist) / 0.5)) : 0;
      if (push > 0.05) { f.lidReach = { x: f.den.x, z: f.den.z - 0.2, k: push }; } else if (f.lidReach) f.lidReach = null;
      const open = push > 0 ? push : under ? (f.sleepK ?? 0) > 0.5 ? 0.02 : (f.trust ?? 0) >= 1 ? 0.24 + Math.sin(t * 0.7) * 0.04 : 0.07 : 0;      /* (an octopus that does not know you yet keeps the shell nearly shut; one that does watches you through the crack) */      // (asleep, it pulls the shell right down)
      if (it.flipK == null && ((this.flipped ||= new Set()).has(it.id ?? f.den.id) || performance.now() - (this.openedAt ??= performance.now()) < 15000)) { it.flipK = 1; it.lidK = open; }      // opening the app, a home it already had is shown as it was, not turned over again before your eyes
      it.flipK = (it.flipK ?? 0) + (1 - (it.flipK ?? 0)) * Math.min(1, dt * 0.9); it.lidK = (it.lidK ?? 0) + (open - (it.lidK ?? 0)) * Math.min(1, dt * (open > (it.lidK ?? 0) ? 4 : 1.3));
      if (it.flipK > 0.99) (this.flipped ||= new Set()).add(it.id ?? f.den.id);      // (and a shell rebuilt later keeps its side)
      const q = it.flipK, e = q * q * (3 - 2 * q), L = it.lidK, R = 0.88, th = e * Math.PI / 2 - 0.85 * L * e;      // th: the cut face turned from facing you (0) to facing the sand (pi/2), less the lid's lift
      const hy = 0.17 + R * Math.cos(th), hz = R * (Math.sin(th) - 1);      // the shell hinges on its back rim, which stays on the sand
      m.rotation.x = th; m.position.y = m.userData.y0 * (1 - e) + hy * e; m.position.z = hz * e; m.scale.setScalar(1 + 0.18 * e);      /* (turned over, it is a roomier hut) */
      f.shellK = under ? e * (1 - 0.6 * L) : entering ? e * 0.4 : 0;
    }
  }
  // it walks up to a thing until its arms touch it (off), then carries it held close in front (hold)
  beginTask(f, pl) {
    const at = this.decor.atOf(pl.id), type = (this.spots?.() ?? []).find((q) => q.id === pl.id)?.type, r = this.decor.reach(type), off = pl.kind === 'turn' ? r + 0.45 * (f.radius ?? 2) + (f.cr ?? 0.6) : r + 0.55 * (f.radius ?? 2) + (f.cr ?? 0.6), hold = Math.max(0.5, r * 0.85), L = Math.hypot(pl.gx - at.x, pl.gz - at.z) || 1;      // for a shove it grips the rim up close
    const ux = (pl.gx - at.x) / L, uz = (pl.gz - at.z) / L, inside = (x, z) => Math.abs(x) <= 3.7 && z >= -3.4 && z <= 2.7 && slopeAt(x, z).s < 1.0 && !crossesFace(at.x, at.z, x, z) && (!f.freeSpot || f.freeSpot(x, z));      // on open sand, on the thing's own level, not on a face
    // where it stands to take hold: straight behind the thing, or failing that the nearest open spot round it; nowhere open, it leaves the job
    let ax = at.x - ux * off, az = at.z - uz * off, found = inside(ax, az);
    for (let k = 1; k <= 10 && !found; k++) for (const sgn of [1, -1]) { if (found) break; const a = Math.atan2(-uz, -ux) + sgn * k * 0.31, x = at.x + Math.cos(a) * off, z = at.z + Math.sin(a) * off; if (inside(x, z)) { ax = x; az = z; found = true; } }
    if (!found) return;
    f.task = { ...pl, type, off, hold, stage: 'go', ux, uz, ax, az, t0: performance.now() }; f.startTask(f.task);
  }
  taskEvent(f, ev) {
    const T = f.task, dc = this.decor; if (!T || !dc) return false;
    if (ev === 'grab') { const at = dc.atOf(T.id); if (!at || Math.hypot(at.x - f.pos.x, at.z - f.pos.z) > T.off + 1.0 || !dc.haulBegin(T.id)) { f.task = null; return false; } T.stage = 'haul'; return true; }
    if (ev === 'drop') {
      const good = Math.hypot(T.gx - (f.pos.x + T.ux * T.hold), T.gz - (f.pos.z + T.uz * T.hold)) < 1.0;
      if (good) { dc.haulEnd(T.id, T.gx, T.gz, T.kind === 'home' ? 0 : T.kind === 'turn' ? T.ry : null); T.stage = 'placed'; f.movedAt = Date.now(); this.selfMoved = { id: T.id, at: performance.now() }; if (T.kind === 'home') f.homeMovedAt = Date.now(); this.onMove?.({ fish: f.fid, id: T.id, x: T.gx, z: T.gz, home: T.kind === 'home', turn: T.kind === 'turn', ry: T.kind === 'turn' ? +T.ry.toFixed(2) : 0 }); if (T.kind !== 'home') f.task = null; } else { dc.haulCancel(T.id); (f.failed ||= []).push({ x: T.gx, z: T.gz }); if (f.failed.length > 6) f.failed.shift(); f.task = null; }
      return good;
    }
    if (ev === 'abort') { if (T.stage === 'haul') dc.haulCancel(T.id); f.task = null; return false; }
    if (ev === 'home') { f.task = null; return true; }
    return false;
  }
  // an octopus makes up its mind to rearrange something: only the phone in charge of the fish decides, and the move is reported to the game when it is done
  planMove(f, M, { relocate = false } = {}) {
    const dc = this.decor, spots = this.spots?.() ?? []; if (!dc || !spots.length) return null;
    const mine = new Set(this.list.filter((o) => !o.dead).map((o) => o.homeId).filter(Boolean)), rnd = () => this.rng();
    const free = (id, x, z) => x > -3.7 && x < 3.7 && z > -0.4 && z < 2.4 && dc.roomFor(id, x, z);
    const bad = (x, z, at = null) => (f.failed ?? []).some((q) => Math.hypot(q.x - x, q.z - z) < 0.9) || !placeable(x, z) || z < -3.3 || z > GLASS_Z - 0.9 || (at && crossesFace(at.x, at.z, x, z));      // a thing is shoved along the sand it sits on: never over the edge of a bank, never onto a face
    const home = !f.homeId && spots.filter((q) => (q.type === 'coconut' || q.type === 'pot') && !mine.has(q.id)).sort((a, b) => (a.type === 'coconut' ? 0 : 1) - (b.type === 'coconut' ? 0 : 1))[0];
    if (home && rnd() < 0.7) {                                                                                  // a coconut and nowhere to live: carry it to a quiet corner
      const at = dc.atOf(home.id), want = f.fav ? [f.fav.x, f.fav.z] : null;
      for (let i = 0; i < 16; i++) { const sx = rnd() < 0.5 ? -1 : 1, x = want && i < 4 ? want[0] + (rnd() - 0.5) : sx * (2.4 + rnd() * 1.3), z = want && i < 4 ? want[1] + (rnd() - 0.5) : at.z + (rnd() - 0.5) * 2.6; if (!bad(x, z, at) && Math.hypot(x - at.x, z - at.z) <= MOVE_MAX - 0.3 && Math.hypot(x - at.x, z - at.z) > 0.8 && free(home.id, x, z)) return { kind: 'home', id: home.id, gx: x, gz: z }; }
      return null;
    }
    if (f.homeId && (relocate || (rnd() < 0.35 && Date.now() - (f.homeMovedAt ?? 0) > 25 * 60e3))) {              // now and then it picks its whole shell up and carries it somewhere else to live under
      const at = dc.atOf(f.homeId); if (at) for (let i = 0; i < 16; i++) { const sx = rnd() < 0.5 ? -1 : 1, x = i < 6 ? sx * (1.2 + rnd() * 2.3) : -3.3 + rnd() * 6.6, z = at.z + (rnd() - 0.5) * 2.8, d = Math.hypot(x - at.x, z - at.z); if (d > 1.4 && d <= MOVE_MAX - 0.3 && !bad(x, z, at) && free(f.homeId, x, z)) return { kind: 'home', id: f.homeId, gx: x, gz: z }; }
    }
    if (f.homeId && rnd() < 0.6) {                                                                             // its own shell is light: now and then it shoves it along a little and turns it this way or that
      const at = dc.atOf(f.homeId); if (at) for (let i = 0; i < 10; i++) {
        const sx = rnd() < 0.5 ? -1 : 1, x = Math.max(-3.4, Math.min(3.4, at.x + sx * (0.35 + rnd() * 0.55))), z = Math.max(-3.3, Math.min(GLASS_Z - 1.0, at.z + (rnd() - 0.5) * 0.4)), ry = (rnd() - 0.5) * 1.3;      // mostly sideways, so it can stand on the far side and shove
        const L = Math.hypot(x - at.x, z - at.z) || 1, stand = 1.2 + 0.45 * (f.radius ?? 2), sxp = at.x - ((x - at.x) / L) * stand, szp = at.z - ((z - at.z) / L) * stand;
        if (L > 0.25 && Math.abs(sxp) < 3.7 && szp > -3.4 && szp < 2.5 && placeable(sxp, szp) && !crossesFace(at.x, at.z, sxp, szp) && !bad(x, z, at) && x > -3.7 && x < 3.7 && dc.roomFor(f.homeId, x, z, ry)) return { kind: 'turn', id: f.homeId, gx: x, gz: z, ry }; }
    }
    const movers = spots.filter((q) => ['rock', 'skull'].includes(q.type) && Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 5);
    if (!movers.length) return null;
    if (!f.homeId && f.den?.kind !== 'rocks' && movers.length >= 2 && M.tidy > 0.3) {                                                // no shell or pot to live in: it gathers rocks into a shelter at its favorite spot
      const c = f.fav ?? { x: f.pos.x, z: f.pos.z }, cx = Math.max(-3.2, Math.min(3.2, c.x)), cz = Math.max(-3.2, Math.min(GLASS_Z - 1.0, c.z));
      const there = movers.filter((q) => Math.hypot(q.x - cx, q.z - cz) < 1.5), away = movers.filter((q) => Math.hypot(q.x - cx, q.z - cz) >= 1.5).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
      for (const m of away.slice(0, 3)) for (let i = 0; i < 10; i++) { const a = (there.length + i) * 2.1 + rnd() * 0.6; let x = cx + Math.cos(a) * 1.1, z = cz + Math.sin(a) * 0.75; const L = Math.hypot(x - m.x, z - m.z); if (L > MOVE_MAX) { x = m.x + ((x - m.x) / L) * (MOVE_MAX - 0.4); z = m.z + ((z - m.z) / L) * (MOVE_MAX - 0.4); }      // too far for one trip: bring it part of the way
        if (!bad(x, z, m) && Math.hypot(x - m.x, z - m.z) > 0.6 && free(m.id, x, z)) return { kind: 'build', id: m.id, gx: x, gz: z }; }
    }
    const m = movers[(rnd() * movers.length) | 0], homeSpot = f.den;
    for (let i = 0; i < 12; i++) {
      let x, z;
      if (homeSpot && M.tidy > 0.45) { const sx = rnd() < 0.5 ? -1 : 1; x = homeSpot.x + sx * (0.85 + rnd() * 0.3); z = homeSpot.z - 0.1 + rnd() * 0.5; }                // a wall beside its den
      else { const a = rnd() * 6.28, r = 1 + rnd() * 1.4; x = m.x + Math.cos(a) * r; z = m.z + Math.sin(a) * r * 0.5; }                           // shoves it about to see what happens
      if (!bad(x, z, m) && Math.hypot(x - m.x, z - m.z) > 0.6 && Math.hypot(x - m.x, z - m.z) <= MOVE_MAX && free(m.id, x, z)) return { kind: 'push', id: m.id, gx: x, gz: z };
    }
    return null;
  }
  // what changed among the decorations since last time (from the game's own state, never by looking at every one every frame): put in, moved, taken out
  decorDiff(state) {
    const cur = new Map((state.decor ?? []).map((d) => [d.id, d])), ev = (this.decorEv ||= []), add = (e) => { e.n = this.evN = (this.evN ?? 0) + 1; ev.push(e); if (ev.length > 12) ev.shift(); };
    if (this.decorWas) {
      const fresh = (d) => Date.now() - (d.at ?? 0) < 20 * 60e3;      // (only something really put in lately is new: a tank swapped in whole, or a restored one, is not)
      for (const [id, d] of cur) { const o = this.decorWas.get(id); if (!o) { if (fresh(d)) add({ kind: 'new', id, type: d.type, x: d.x, z: d.z }); } else if (Math.hypot(o.x - d.x, o.z - d.z) > 0.3) add({ kind: 'moved', id, type: d.type, x: d.x, z: d.z, ox: o.x, oz: o.z }); }
      for (const [id, o] of this.decorWas) if (!cur.has(id)) add({ kind: 'removed', id, type: o.type, x: o.x, z: o.z });
    } else { const now = Date.now(); for (const d of cur.values()) if (now - (d.movedAt ?? d.at ?? 0) < 20 * 60e3) add({ kind: 'recent', id: d.id, type: d.type, x: d.x, z: d.z }); }      // a phone that has just opened (or taken over): something put in or moved lately still counts
    this.decorWas = new Map([...cur].map(([id, d]) => [id, { x: d.x, z: d.z, type: d.type }]));
  }
  // ── An octopus notices what changes in its tank, and goes to see for itself ──
  // Once a second, on the phone running the animals. Its nature sets how soon it goes, whether it watches first (from its den, for a homebody),
  // and how willing it is; hunger, a fright, sleep or a job of its own come first, and an errand that fails is tried again later, a few times at most.
  // It only learns about a thing once it has reached it and handled it (onTouchDecor); a thing moved while it was not looking is looked for where
  // it used to be, then a little way round, and recognized when found.
  aware(f, S) {
    const now = performance.now(), sp = f.getSpots?.() ?? [], find = (id) => sp.find((x) => x.id === id), lbl = (type) => (DECOR_DEF[type]?.label ?? 'thing').toLowerCase(), r = () => this.rng(), fam = f.fam ?? {};
    const P = AWARE[f.mind?.type] ?? AWARE.explorer, bold = f.mind?.bold ?? 0.5, awake = (f.sleepK ?? 0) < 0.4 && !(f.isNight && (f.tuckK ?? 0) > 0.5), near = (x, z) => Math.hypot(f.pos.x - x, f.pos.z - z) < 6.5;
    const start = (o) => { if (f.inv) { (f.invQ ||= []).push(o); if (f.invQ.length > 2) f.invQ.shift(); return; } f.inv = { tries: 0, born: now, ...o }; };
    for (const ev of this.decorEv ?? []) { if (ev.n <= (f.evDone ?? 0)) continue; f.evDone = ev.n;
      if (ev.kind === 'moved' && this.selfMoved?.id === ev.id && now - this.selfMoved.at < 120e3) continue;      // it moved that itself: nothing to wonder about
      const known = fam[ev.id]?.n > 0, L = lbl(ev.type);
      if (ev.kind === 'new' || ev.kind === 'recent') { if (!known && !fam[ev.id]?.gone && f.inv?.id !== ev.id) start({ kind: 'new', id: ev.id, type: ev.type, x: ev.x, z: ev.z, phase: 'notice', t: 0, text: `Noticed the new ${L}.` }); continue; }
      if (ev.kind === 'moved') { const seen = awake && (f.tuckK ?? 0) < 0.3 && (near(ev.x, ev.z) || near(ev.ox, ev.oz));      /* (tucked under its shell, it does not see things moved) */
        if (f.inv?.id === ev.id) { if (seen) { f.inv.x = ev.x; f.inv.z = ev.z; if (f.inspect?.inv) { f.inspect.x = ev.x; f.inspect.z = ev.z; } } continue; }
        if (!known) { if (seen) start({ kind: 'new', id: ev.id, type: ev.type, x: ev.x, z: ev.z, phase: 'notice', t: 0, text: `Noticed the ${L}.` }); continue; }
        const o = fam[ev.id]; start(seen ? { kind: 'moved', id: ev.id, type: ev.type, x: ev.x, z: ev.z, phase: 'notice', t: 0, text: `Watched the ${L} being moved.` } : { kind: 'moved', id: ev.id, type: ev.type, ox: o.x ?? ev.ox, oz: o.z ?? ev.oz, phase: 'oldspot', t: 20 + r() * 50 }); continue; }
      if (ev.kind === 'removed') { if (f.inv?.id === ev.id) { if (f.inspect?.inv || f.inspect?.oldspot) f.inspect = null; this.endInv(f); } f.invQ = (f.invQ ?? []).filter((q) => q.id !== ev.id);
        if ((fam[ev.id]?.k ?? 0) >= 0.35) { if (awake && near(ev.x, ev.z)) this.memSay(f, `Watched the ${lbl(ev.type)} go.`); else f.missingCheck = { x: ev.x, z: ev.z, label: lbl(ev.type), at: now + (30 + r() * 60) * 1e3 }; } }
    }
    const I = f.inv;
    if (!I) {
      if (f.missingCheck && now > f.missingCheck.at && S?.s === 'rest' && !S.mode && !f.inspect) { const m = f.missingCheck; if (!m.went) { m.went = true; f.inspect = { x: m.x, z: m.z, oldspot: true }; m.at = now + 25e3; } else { this.memSay(f, `Went to where the ${m.label} was. It is gone.`); f.missingCheck = null; } }      // one look where a thing it knew used to be; no endless searching
      if ((this.recogAt = (this.recogAt ?? 0) - 1) <= 0) { this.recogAt = 4; for (const [id, e] of Object.entries(fam)) { if (!e.mv || e.gone) continue; const d = find(id); if (d && Math.hypot(d.x - f.pos.x, d.z - f.pos.z) < 2.8 && S?.s === 'rest' && !S.mode && !f.inspect && awake) { start({ kind: 'moved', id, type: d.type, x: d.x, z: d.z, phase: 'goNow', t: 0, text: `Recognized the ${lbl(d.type)}: it has been moved.` }); break; } } }      // it comes across a thing it knew, somewhere new
      if (!f.inv && f.invQ?.length) f.inv = { tries: 0, born: now, ...f.invQ.shift() };
      return;
    }
    const d = find(I.id), L = lbl(I.type); if (!d) { this.endInv(f); return; }
    if (now - I.born > 6 * 60e3) { this.endInv(f); return; }
    const busy = f.dead || f.hunt || f.jarAt || f.task || f.glassAt || f.profile?.mood === 'Hungry' || (f.scared ?? 0) > 0 || (f.fatigue ?? 0) > 0.8 || !awake;
    if (busy) { if (f.inspect?.inv || f.inspect?.oldspot) f.inspect = null; if (I.phase === 'go' || I.phase === 'goOld') { I.phase = I.phase === 'go' ? 'later' : 'oldspot'; I.t = 30; } f.watchPt = null; return; }      // first things first; it comes back to it
    I.t -= 1; if (I.phase === 'notice' || I.phase === 'watch' || I.phase === 'later') (f.expo ||= {})[I.id] = (f.expo[I.id] ?? 0) + 1; const tgt = { x: I.x ?? d.x, y: 0.7, z: I.z ?? d.z };
    const goTo = () => { const k0 = fam[I.id]?.k ?? 0, d0 = Math.hypot(f.pos.x - tgt.x, f.pos.z - tgt.z); if (!I.paused && I.kind === 'new' && k0 < 0.2 && d0 > 2.5 && r() < (P.watch ? 0.8 : 0.25) + 0.4 * (0.5 - bold)) I.pauseD = d0 * (0.4 + 0.2 * r()); I.phase = 'go'; I.t = 45; f.inspect = { x: tgt.x, z: tgt.z, id: I.id, type: I.type, r: GRIP_R[I.type] ?? 0.5, inv: true }; if (!/^Recognized|^There it is/.test(I.text ?? '')) I.text = I.kind === 'moved' ? `Going over to the ${L} in its new spot.` : `Creeping over to the new ${L}.`; f.watchPt = null; };
    const decide = () => { let p = P.p * (0.7 + 0.6 * bold); if (f.mind?.type === 'showoff' && (f.audience ?? 0) > 0.3) p += 0.15; if (f.mind?.type === 'collector' && COLLECTIBLE.has(I.type)) p += 0.15; if (f.shy && I.kind === 'new') p -= 0.1;
      if (COLLECTIBLE.has(I.type)) p += 0.08; if (P.den && HIDEY.has(I.type)) p += 0.15; if ((f.likeIds ?? []).some((id) => find(id)?.type === I.type)) p += 0.12; p -= Math.min(0.3, (f.expo?.[I.id] ?? 0) / 400);      // small enough to handle, somewhere to hide, like a thing it already loves: more interesting; a thing it has stared at for ages without going is less so
      if (r() < Math.max(0.05, Math.min(0.98, p))) goTo();
      else { I.tries++; if (I.tries >= 3) { this.memSay(f, `Has decided to leave the ${L} alone for now.`); this.endInv(f); } else { I.phase = 'later'; I.t = 40 + r() * 50; I.text = `Keeping its distance from the ${L} for now.`; } } };
    if (I.phase === 'goNow') goTo();
    else if (I.phase === 'notice') { f.watchPt = tgt; if (!I.delaySet) { I.delaySet = true; I.t = this.delay(f, P, I) * (1 - 0.6 * Math.min(1, fam[I.id]?.k ?? 0)); } if (I.t <= 0) { if (P.watch && !I.watched && (fam[I.id]?.k ?? 0) < 0.35) { I.watched = true; I.phase = 'watch'; I.t = P.watch[0] + r() * (P.watch[1] - P.watch[0]); I.text = P.den && f.den ? `Watching the ${L} from its den.` : `Watching the ${L} from a distance.`; if (P.den && f.den && S?.s === 'rest' && !S.mode && Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z) > 1.4) f.goDen?.(S, () => this.rng()); } else decide(); } }
    else if (I.phase === 'watch') { f.watchPt = tgt; if (I.t <= 0) decide(); }
    else if (I.phase === 'pause') { f.watchPt = tgt; if (I.t <= 0) goTo(); }      // stopped short, looking: then on it goes
    else if (I.phase === 'later') { f.watchPt = null; if (I.t <= 0) { I.phase = 'notice'; I.delaySet = true; I.t = 1; } }
    else if (I.phase === 'go' && I.pauseD && !I.paused && f.inspect?.id === I.id && Math.hypot(f.pos.x - tgt.x, f.pos.z - tgt.z) < I.pauseD) { I.paused = true; I.pauseD = 0; f.inspect = null; I.phase = 'pause'; I.t = 2 + r() * 4 * (1.3 - bold); I.text = `Stopped short of the ${L} to have a good look.`; }      // a cautious first approach: halfway there it stops and looks before going on
    else if (I.phase === 'go' && !I.distracted && f.inspect?.id === I.id && (() => { const o = this.list.find((o) => o !== f && !o.dead && o.species.move !== 'jet' && o.pos.distanceTo(f.pos) < 1.4); if (!o || r() > (P.distract ?? 0.1)) return false; I.distracted = true; f.inspect = null; I.phase = 'later'; I.t = 8 + r() * 12; I.text = `Distracted by ${o.name}. It will get back to the ${L}.`; f.watchPt = { x: o.pos.x, y: o.pos.y, z: o.pos.z }; return true; })()) { /* once per errand at most: no endless retries */ }
    else if (I.phase === 'go') { if (!(f.inspect && f.inspect.id === I.id) || I.t <= 0) { if (f.inspect?.id === I.id) f.inspect = null; I.tries++; if (I.tries >= 3) this.endInv(f); else { I.phase = 'later'; I.t = 20 + r() * 30; } } }      // it could not get there: later, a few times at most
    else if (I.phase === 'feel') { if (I.t <= 0) this.endInv(f); }
    else if (I.phase === 'oldspot') { if (I.t <= 0 && S?.s === 'rest' && !S.mode && !f.inspect) { I.phase = 'goOld'; I.t = 40; f.inspect = { x: I.ox, z: I.oz, oldspot: true }; I.text = `Going to where the ${L} used to be.`; } }
    else if (I.phase === 'goOld') {
      if (S?.s === 'work' && S.mode === 'inspect' && f.inspect?.oldspot) { I.phase = 'feelOld'; I.t = 4; I.text = `Feeling around where the ${L} used to be.`; }
      else if (!f.inspect?.oldspot || I.t <= 0) { if (f.inspect?.oldspot) f.inspect = null; I.tries++; if (I.tries >= 3) this.endInv(f); else { I.phase = 'oldspot'; I.t = 20 + r() * 20; } } }
    else if (I.phase === 'feelOld' && I.t <= 0) {
      if (f.inspect?.oldspot) f.inspect = null;
      if (Math.hypot(d.x - f.pos.x, d.z - f.pos.z) < 3.4) { I.x = d.x; I.z = d.z; I.phase = 'go'; I.t = 45; f.inspect = { x: d.x, z: d.z, id: I.id, type: I.type, r: GRIP_R[I.type] ?? 0.5, inv: true }; I.text = `There it is: the ${L}, in a new spot.`; }      // it can see it from here
      else if ((I.search = (I.search ?? 0) + 1) > 2) { this.memSay(f, `Gave up looking for the ${L}.`); this.endInv(f); }      // (it will know it again when it comes across it)
      else { const a = r() * 6.28, rr = 1.5 + r() * 1.5, sx = Math.max(-4, Math.min(4, I.ox + Math.cos(a) * rr)), sz = Math.max(-1.8, Math.min(3.4, I.oz + Math.sin(a) * rr)); I.ox = sx; I.oz = sz; I.phase = 'goOld'; I.t = 35; f.inspect = { x: sx, z: sz, oldspot: true }; I.text = `Searching for the ${L}.`; } }
  }
  delay(f, P, I) { let k = P.d[0] + this.rng() * (P.d[1] - P.d[0]); k *= 1.3 - 0.6 * (f.mind?.bold ?? 0.5); if (f.mind?.type === 'showoff' && (f.audience ?? 0) > 0.3) k *= 0.4; if (f.mind?.type === 'collector' && COLLECTIBLE.has(I.type)) k *= 0.5; return Math.max(0.5, k); }
  endInv(f) { f.inv = null; f.watchPt = null; if (f.inspect?.inv || f.inspect?.oldspot) f.inspect = null; }
  memSay(f, text) { f.memText = text; f.memTextUntil = performance.now() + 9000; }
  // it reached a decoration and is handling it: report it (the game decides what that teaches it)
  touched(f, id) {
    const I = f.inv, kind = I?.id === id ? I.kind : f.fam?.[id]?.mv ? 'moved' : 'revisit';
    if (I?.id === id) { I.phase = 'feel'; I.t = 4; const L = (DECOR_DEF[I.type]?.label ?? 'thing').toLowerCase(); I.text = I.kind === 'moved' ? `Feeling the ${L} all over: yes, it is the same one.` : `Feeling the new ${L} all over with its arms.`; }
    if (f.lead !== false && id !== 'den') this.onTouchDecor?.({ fish: f.fid, decor: id, kind });
  }
  loadOcto() { try { return JSON.parse(localStorage.getItem('ourtank.octo') || '{}'); } catch { return {}; } }
  // What each octopus makes of the world around it, thought over once a second: sulks in dirty water, notices who is watching, gets restless when nothing changes,
  // and (the tricksters) goes to see what a nearby fish will do when startled. The fish act on these in jetUpdate.
  octoAware(dt) {
    this.aw = (this.aw ?? 0) - dt; if (this.aw > 0) return; this.aw = 1;
    const W = this.world ?? { water: 1, glass: 0, hunger: 0 }, people = new Set([this.me, ...(this.people ?? [])]), now = performance.now(), calm = (now - (this.changedAt ?? now)) / 6e4;
    let save = false;
    for (const f of this.list) {
      if (f.species.id !== 'octopus' || f.dead || !f.mind) continue;
      const M = f.mind;
      f.lead = this.isLead ? this.isLead() : true;      // only the lead phone decides what it does next; the others are shown it
      if (f.lead) this.aware(f, f.st);
      if (f.lead && (f.camoK ?? 0) > 0.85 && f.st?.s === 'rest') this.momentOf?.('camo', f); if (f.lead && f.glassAt?.close && f.pos.z > 12) this.momentOf?.('glass', f);      // worth a line (and a photo) in the journal
      if (f.lead && (f.buddy ?? null) + '|' + (f.rival ?? null) !== (f.sharedBuddy ?? null) + '|' + (f.sharedRival ?? null) && performance.now() - (f.memoSent ?? -1e9) > 20000) { f.memoSent = performance.now(); this.onMemo?.({ fish: f.fid, why: f.rival && (f.denPokes?.[f.rival] ?? 0) >= 4 ? 'den' : null, buddy: f.buddy ?? null, rival: f.rival ?? null }); }
      f.sulk = Math.max(0, Math.min(1, Math.max((0.62 - W.water) / 0.3, (W.glass - 0.6) / 0.3, (W.hunger - 0.7) / 0.3)));
      const bonded = (f.bondIds ?? []).some((i) => people.has(i)); f.audience = bonded ? 1 : people.size > 0 ? 0.35 : 0;
      f.bored = Math.max(0, Math.min(1, (calm - 8 * (1.4 - M.cur)) / 20)) * (0.4 + 0.6 * M.cur);
      const S = f.st; let th = '';
      if (f.sulk > 0.5) th = W.water < 0.62 ? 'Sulking in the cloudy water.' : W.glass > 0.6 ? 'Cannot see out through the dirty glass.' : 'Hungry and a bit grumpy.';
      else if (S?.s === 'work' && S.mode === 'greet') th = 'Come to say hello at the glass.';
      else if (S?.s === 'work' && S.mode === 'inspect' && f.inspect?.r && f.inspect.type) th = `Wrapping its arms round the ${(DECOR_DEF[f.inspect.type]?.label ?? 'thing').toLowerCase()}.`;
      else if (S?.s === 'work' && S.mode === 'inspect') th = f.inspect && this.list.some((o) => o !== f && !o.dead && Math.hypot(o.pos.x - f.inspect.x, o.pos.z - f.inspect.z) < 1.2) ? 'Watching a neighbour.' : 'Examining something with its arms.';
      else if (f.sleepK > 0.6) th = 'Asleep. Its skin is dreaming.';
      else if (f.audience >= 1 && f.bondMe >= 1) th = 'Knows you are here.';
      else if (f.bored > 0.5) th = M.cur > 0.6 ? 'Restless. Nothing new in a while.' : 'A little bored.';
      else if (f.actText) th = f.actText;
      else if (f.fearNear) th = 'Avoiding a spot that scared it.';
      else if (S?.s === 'rest' && f.den && Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z) < 1.2) th = f.den.home ? (f.den.kind === 'pot' ? 'Curled up in its pot.' : 'Tucked into its coconut shell.') : f.den.kind === 'rocks' ? 'Home in the rock shelter it built.' : 'Home in its den.';
      if (f.inv?.text && !f.hunt && !f.glassAt) th = f.inv.text; else if (f.memText && now < (f.memTextUntil ?? 0)) th = f.memText;
      f.thought = th;
      { const sp = f.likeIds?.length ? (f.getSpots?.() ?? []).find((x) => x.id === f.likeIds[0]) : null; f.favThing = sp ? (DECOR_DEF[sp.type]?.label ?? null) : null; }
      if (M.type === 'showoff' && f.audience >= 1 && f.bondMe >= 1 && S?.s === 'rest' && !S.mode && !f.shy && (f.glassCool ?? 0) <= 0 && this.rng() < 0.03) { f.glassAt = { x: (this.rng() - 0.5) * 3, y: 2.5 + this.rng() * 3, until: performance.now() + 8000, close: true }; f.glassCool = 300 + this.rng() * 300; }       // an audience it knows: it goes and shows off at the glass
      // its partner (see rules: octoPartners): it goes to find it now and then, and close by they touch arms, tasting each other with their suckers
      { const pt = f.rec?.partner && this.list.find((o) => o.fid === f.rec.partner && !o.dead && o.mind);
        if (pt && S?.s === 'rest' && !S.mode && !f.inspect && Math.hypot(pt.pos.x - f.pos.x, pt.pos.z - f.pos.z) >= 2.4 && this.rng() < 0.05) { S.s = 'crawl'; S.t = 6; const sd = f.pos.x >= pt.pos.x ? 1.3 : -1.3; f.target.set(Math.max(-3.5, Math.min(3.5, pt.pos.x + sd)), 0.55, pt.pos.z); th = `Going to find ${pt.name}.`; } }
      for (const o of this.list) if (o !== f && o.species.id === 'octopus' && !o.dead && o.mind && Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) < 2.4) {
        const mine = f.rec?.partner === o.fid, B = this.state?.octoBonds, k = [f.fid, o.fid].sort().join('|'), warming = (B?.[k] ?? 0) > 1.5 * 864e5;      // partners, or half way there: no more keeping away
        if (mine) { const nowP = performance.now(); if (S?.s === 'rest' && !S.mode && !f.inspect && nowP > (f.armAt ?? 0) && this.rng() < 0.3) { f.armAt = nowP + (240 + this.rng() * 360) * 1e3; f.inspect = { x: o.pos.x, z: o.pos.z }; f.twineWith = o; f.twineT = 25; o.twineWith = f; o.twineT = 25;      /* (25 seconds of tank time to get there and twine) */ this.burst?.(o.pos.clone().add(f.pos).multiplyScalar(0.5)); f.onMoment?.('arms', o); }      /* a few times an hour at most, so it stays special */ th = this.rng() < 0.5 ? `Touching arms with ${o.name}.` : `Resting close to ${o.name}.`; }
        else if (warming && M.soc < 0.4) { if (S?.s === "rest" && !S.mode && !f.inspect && this.rng() < 0.1) f.inspect = { x: o.pos.x, z: o.pos.z, r: 0.7 }; th = `Tasting ${o.name} with one careful arm.`; }
        else if (M.soc < 0.4 && S?.s !== 'jet') { f.annoyT = Math.max(f.annoyT, 3); f.fearNear = false; if (S?.s === 'rest' && !S.mode) { S.s = 'crawl'; S.t = 6; f.target.set(Math.max(-3.5, Math.min(3.5, f.pos.x + (f.pos.x >= o.pos.x ? 2.6 : -2.6))), 0.55, f.pos.z); } th = `Keeping its distance from ${o.name}.`; }
        else if (M.soc >= 0.55 && o.mind.soc >= 0.55 && S?.s === 'rest' && !S.mode && !f.inspect && this.rng() < 0.2) { f.inspect = { x: o.pos.x, z: o.pos.z }; th = `Getting to know ${o.name}.`; }
        break;
      }
      // how it is doing shows in how it lives (the same reading Health gives): well looked after it is busy and richly colored; missing what its kind needs,
      // it goes dull and listless and keeps to its den, and says what is missing
      { const now = Date.now(); if (!f.wellAt || now - f.wellAt > 8000) { f.wellAt = now; try { f.well = f.rec && this.state ? wellOf(this.state, f.rec, now) : null; } catch { f.well = null; } }
        const W = f.well; f.wellK = W ? W.score / 100 : 0.75;
        if (W && !f.task && (!th || S?.s === 'rest')) { const miss = (W.wants ?? []).filter((x) => !x.met && x.k !== 'food' && x.k !== 'play').map((x) => x.label.toLowerCase()); if (W.score < 55 && miss.length) th = `Dull and listless. It is missing ${miss[0]}.`; else if (W.score >= 90 && !th) th = 'Content and curious, its colors rich.'; } }
      if (f.task) th = f.task.kind === 'home' ? `Carrying a ${(DECOR_DEF[(f.getSpots?.() ?? []).find((q) => q.id === f.task.id)?.type]?.label ?? 'shell').toLowerCase()} to a quiet corner.` : f.task.kind === 'build' ? 'Building a shelter out of rocks.' : f.task.kind === 'turn' ? 'Shoving its shell about to see how it likes it there.' : 'Moving a stone where it wants it.';
      f.thought = th;
      if (!f.task && this.moveOn && this.canMove?.() && f.adultish && !f.shy && f.sulk < 0.5 && S?.s === 'rest' && !S.mode && !(f.homing && S.t > 8) && !f.hunt && !f.jarAt && !f.inspect && !f.isNight && (f.sleepK ?? 0) < 0.2 && (f.fatigue ?? 0) < 0.3 && !(f.scared > 0) && !f.keepCarry && !f.wrong && Date.now() - (f.movedAt ?? 0) > MOVE_GAP && this.rng() < 0.02 + 0.04 * M.tidy + 0.02 * M.cur) {
        const pl = this.planMove(f, M); if (pl) this.beginTask(f, pl);
      }
      if (M.type === 'trickster' && S?.s === 'rest' && !S.mode && !f.shy && this.rng() < 0.12) { const o = this.list.filter((q) => q !== f && !q.dead && !q.visitor && q.species.id !== 'octopus' && q.pos.distanceTo(f.pos) < 4 && q.pos.y < 6); if (o.length) { f.prank = o[(this.rng() * o.length) | 0]; f.inspect = { x: f.prank.pos.x, z: f.prank.pos.z }; } }
      if (f.prank) { const o = f.prank; if (o.dead || Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) < 1.7) { if (!o.dead) { o.fleeT = 1.2; o.target.set(Math.max(-4, Math.min(4, o.pos.x + (o.pos.x > f.pos.x ? 2.5 : -2.5))), Math.min(12, o.pos.y + 1), o.pos.z); o.retarget = 2; } f.prank = null; } else if (S?.s === 'rest' && S.t <= 0) f.prank = null; }
      if (f.lead && f.favDirty && now - (f.memSentAt ?? -1e9) > 120e3) { f.favDirty = false; f.memSentAt = now; const sv = f.memSrv?.fav, fv = f.fav && f.fav.n > 12 && (!sv || Math.hypot(sv.x - f.fav.x, sv.z - f.fav.z) > 0.4) ? { x: +f.fav.x.toFixed(2), z: +f.fav.z.toFixed(2) } : null;      // its favorite spot and how it feels about the fish, kept with the tank now and then
        const fm = f.fishMemo ? Object.fromEntries(Object.entries(f.fishMemo).sort((a, b) => (b[1].f + b[1].a) - (a[1].f + a[1].a)).slice(0, 6).map(([k, v]) => [k, { f: +(+v.f).toFixed(1), a: +(+v.a).toFixed(1) }])) : null;
        if (fv || fm) this.onMem?.({ fish: f.fid, ...(fv ? { fav: fv } : {}), ...(fm ? { fishMemo: fm } : {}) }); }
    }
  }
  loadRoutine() { try { return JSON.parse(localStorage.getItem('ourtank.routine') || '{}'); } catch { return {}; } }
  // who a fish belongs to and who it likes: its original caretaker, or whoever has bonded with it most
  relate(f, d) {
    if (d.species === 'octopus') { f.bondMe = (d.bond?.[this.me] ?? 0) + (d.owner === this.me ? 1 : 0); f.shy = f.bondMe === 0 && stageOf(d) !== 'baby'; f.trust = octoTrust(d, this.me).lvl; }       // it knows who has looked after it, and keeps to itself around someone it has never met
    if (d.species === 'octopus') { f.mind = octoMind(d); f.bold = f.mind.bold; }
    if (d.species === 'octopus') { f.movedAt = d.movedAt ?? 0; f.homeId = d.home ?? null; f.adultish = stageOf(d) !== 'baby'; f.onTask = (fish, ev) => this.taskEvent(fish, ev); }
    if (d.species === 'octopus') { f.sharedBuddy = d.buddy ?? null; f.sharedRival = d.rival ?? null; f.bondIds = Object.entries(d.bond ?? {}).filter(([, v]) => v >= 1).map(([i]) => i).concat(d.owner ? [d.owner] : []); if (!f.fav && !f.likes) { const sv = this.loadOcto()[d.id]; if (sv) { if (sv.x != null) f.fav = { x: sv.x, z: sv.z, n: 8 }; if (sv.likes) f.likes = sv.likes; if (sv.fish) { f.fishMemo = sv.fish; f.buddy = sv.buddy ?? null; f.rival = sv.rival ?? null; } } } }
    if (d.species === 'octopus') {      // what it remembers comes from the tank (the same on every phone); an older phone's own memories are offered once, and only if the tank has none
      const m = d.mem ?? null; f.memSrv = m; f.likeIds = m?.likes ?? []; f.fam = m?.fam ?? {}; const T = AWARE[f.mind?.type] ?? AWARE.explorer; f.revisitP = T.rev; f.noveltyP = T.nov;
      if (m?.fav && !(f.fav?.n > 12)) f.fav = { x: m.fav.x, z: m.fav.z, n: 20 }; if (m?.fish && !f.memLoaded) { f.fishMemo = JSON.parse(JSON.stringify(m.fish)); f.memLoaded = true; }
      if (!m && !(this.migrated ||= new Set()).has(d.id)) { const sv = this.loadOcto()[d.id]; if (sv && (sv.x != null || sv.likes || sv.fish)) { this.migrated.add(d.id); this.onMem?.({ fish: d.id, migrate: true, ...(sv.x != null ? { fav: { x: sv.x, z: sv.z } } : {}), ...(sv.likes ? { likes: sv.likes } : {}), ...(sv.fish ? { fishMemo: sv.fish } : {}) }); } }
    }
    if (d.species === 'octopus') this.syncDen(f, d);
    f.disc = d.disc ?? {}; f.palId = d.pal ?? null; f.spotId = d.spotId ?? null; f.ownerId = d.owner ?? null;
    if (d.species !== 'octopus' && d.species !== 'seahorse' && stageOf(d) !== 'adult') { const par = (d.parents ?? []).map((p) => this.recs?.get(p.id) ?? (this.state?.memorial ?? []).find((m) => m.id === p.id)).find((p) => p?.spotId ?? p?.place?.id); f.familySpot = par ? (par.spotId ?? par.place?.id) : null; } else if (d.species !== 'seahorse') f.familySpot = null;
    f.rivalId = d.rival ?? null; f.lossPlace = d.loss && Date.now() < d.loss.until ? d.loss.place : null; f.habits = d.habits ?? null;      // Emergent Life (life.js): a missed companion's place for a few days; its habits by time of day
    if (d.species === 'seahorse' && stageOf(d) !== 'adult') { const par = (d.parents ?? []).map((p) => this.recs?.get(p.id) ?? (this.state?.memorial ?? []).find((m) => m.id === p.id)).find((p) => p?.log?.fav ?? p?.place?.id); f.familyPlant = par ? (par.log?.fav ?? par.place?.id) : null; } else f.familyPlant = null;      // a young seahorse knows the plant its family used (it may or may not take to it)
    const top = Object.entries(d.bond ?? {}).sort((a, b) => b[1] - a[1])[0]; f.mine = !!this.me && (d.owner === this.me || (top && top[1] >= 3 && top[0] === this.me));
  }
  // fish that are going without care look pale and tired, and keep low
  sicken(f, d) {
    const ail = d.ail ?? 0, k = ail >= AIL_WARN ? 0.55 : ail >= AIL_TIRED ? 0.3 : 0, weak = ail >= AIL_WARN, tired = ail >= AIL_TIRED;
    const old = !!d.elder; f.setPale(Math.max(k, 0.5 * (f.starve ?? 0), old ? 0.22 : 0)); if (f.weak !== weak || f.tired !== tired || f.old !== old) { f.weak = weak; f.tired = tired; f.old = old; f.tmul = this.mulFor(f); }      // (an elder's colors have softened)
  }
  mulFor(f) { return (f.baseT ?? 1) * (this.night ? (f.isShy ? 1.1 : 0.6) : 1) * (f.weak ? 0.5 : f.tired ? 0.8 : 1) * (f.old ? 0.72 : 1) * (1 - 0.65 * (f.starve ?? 0)); }      // (and an elder takes life slowly)
  // a rare visitor swims in from the side, glowing softly, until it is greeted or leaves
  addVisitor(v) {
    const sp = SPECIES[v.species], def = SPECIES_DEF[v.species]; if (!sp) return;
    const f = new Fish3D(sp, v.seed, { name: def.label, speed: def.speed, scale: 1, band: BANDS.goldfish });
    f.fid = v.id; f.visitor = true; f.vigor = 1; f.spotId = v.spot ?? null;      /* the place it goes to: the same one each visit (life.js visitorArrives) */ f.profile = { traits: def.traits, mood: 'Visiting', needs: [1, 1, 1, 1] }; f.setGrowth(1);
    f.pos.set(this.rng() < 0.5 ? -4.6 : 4.6, 6 + this.rng() * 3, 1.2); this.wrapPick(f, { traits: def.traits }); f.pick(this.rng);
    if (!Fishes.glowMat) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,214,.8)'); gr.addColorStop(0.45, 'rgba(255,236,170,.25)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; Fishes.glowMat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); }
    f.glow = new THREE.Sprite(Fishes.glowMat); f.glow.renderOrder = 5; this.scene.add(f.glow); this.onSprite?.(f.glow);
    this.burst(f.pos); this.scene.add(f.group); this.list.push(f); this.byId.set(v.id, f);
    f.tmul *= this.night ? 0.8 : 1;
  }
  // after dark most fish drift low and slow; the shy ones come out into open water
  setNight(on) { this.night = !!on; for (const f of this.list) { f.isNight = !!on; if (!f.dead) f.tmul = this.mulFor(f); } }
  // personality: traits decide how a fish moves, where it goes and who it goes with
  wrapPick(f, d) {
    const base = f.pick.bind(f), tr = d.traits ?? [], has = (t) => tr.includes(t), school = !!f.species.school;
    f.tmul = (has('Lazy') ? 0.6 : 1) * (has('Calm') ? 0.85 : 1) * (has('Playful') ? 1.25 : 1) * (has('Shy') ? 0.9 : 1) * (has('Brave') ? 1.08 : 1) * (has('Greedy') ? 1.05 : 1);
    f.baseT = f.tmul; f.tmul = this.mulFor(f);
    f.isShy = has('Shy');
    f.pick = (r) => {
      if (f.restK && f.idle > 0 && !f.seeking && !((f.fleeT ?? 0) > 0)) { f.retarget = Math.min(f.idle, 2); return; }      // resting at its place or by its friend: it stays (a 'stuck' check or a timer doesn't move it on)
      base(r); const mood = f.profile?.mood, spots = this.spots?.() ?? [], others = this.list.filter((o) => o !== f);
      const T = (x, y, z, rt) => { const rv = f.rivalId && this.byId.get(f.rivalId); if (rv && !rv.dead && Math.hypot(rv.pos.x - x, rv.pos.y - y) < 1.6) x += (x >= rv.pos.x ? 1 : -1) * 1.8;      /* a rival: it picks somewhere else rather than swim into it */
        f.target.set(Math.max(-4, Math.min(4, x)), Math.max(0.8, Math.min(Fish3D.topY - 0.3, y)), Math.max(-2, Math.min(2.8, z))); f.retarget = rt; };
      f.idle = 0; const high = (f.band?.y?.[0] ?? 3) >= 6.5, lowK = high ? 0.4 : 1;      // a surface swimmer is drawn down to the sand far less often
      if (f.script?.length) { const w = f.script.shift(); return T(w.x, w.y, w.z, w.rt ?? 1.3); }       // a trick being performed
      if (f.weak) return T(-2.5 + r() * 5, 0.9 + r() * 1.4, 0.4 + r() * 1.6, 8);
      // what each kind of fish really does: the clownfish lives in its anemone, the gramma claims a cave (and rests upside down under it), the cardinalfish hides in shade by day,
      // the goby keeps watch low on the sand, and the dragonet picks over the rocks all day
      if (this.rain && (has('Curious') || has('Playful')) && !f.weak && r() < 0.4) return T(-3 + r() * 6, 11 + r() * 2, 0.8 + r() * 1.2, 3 + r() * 3);       // on a rainy day the curious ones drift up to look
      { const rec = this.state?.fish?.find((d) => d.away && !d.away.inTank && (d.buddy === f.fid || d.id === f.palId)), gone = rec && this.out?.get(rec.id);      /* (the tank's own record: the away animal's copy here is from before it left) */ if (gone && r() < 0.3) { f.waitedFor = (f.waitedFor ?? 0) + 1; return T(gone.pos.x + (r() - 0.5) * 0.8, 9 + r() * 2, -1.8, 6); } }      // its friend is away (out over the rim on an adventure): it hangs about up at the back, where it went
      f.invert = false; const sk = f.sk, spot = (cats, types) => { const c = spots.filter((x) => (types && types.includes(x.type)) || (cats && cats.includes(DECOR_DEF[x.type]?.cat))); return c.length ? c[(f.seed ?? 0) % c.length] : null; };
      // how it feels shows in how it moves (the same reading Health gives): stressed or uneasy, it slips off to its own kind of shelter and stays low and still;
      // lonely, a shoaling fish hangs back near the glass corners; happy, it is out in open water more
      { const now = Date.now(); if (!f.wellAt || now - f.wellAt > 8000) { f.wellAt = now; try { f.well = f.rec && this.state ? wellOf(this.state, f.rec, now) : null; } catch { f.well = null; } }
        const md = f.well?.mood?.[0], C = ECO[sk]?.cover; if ((md === 'Stressed' || md === 'Uneasy') && r() < 0.55) { const hs = spot(C?.cats ?? ['PLANTS', 'ROCKS'], C?.types); if (hs) { f.idle = 3 + r() * 4; f.hiding = true; return T(hs.x + (r() - 0.5) * 0.6, 0.9 + hs.h * 0.45, hs.z + 0.45, 7 + r() * 5); } }
        f.hiding = false; if (md === 'Lonely' && r() < 0.4) return T(r() < 0.5 ? -3.6 : 3.6, 2.5 + r() * 4, 0.4 + r() * 0.6, 6 + r() * 4); }
      // a sea turtle: long, slow cruises across the tank on its front flippers; every few minutes up to the surface to breathe (more often when it is
      // stressed or unwell, as a real one does); a nibble at the plants; and at night, or for a rest, wedged under a rock the way wild ones sleep under ledges
      if (TURTLE_SK.has(sk)) { f.toLedge = false; f.grazing = false; f.onBreath ??= (p) => { for (let i = 0; i < 3; i++) setTimeout(() => this.burst(p.clone().add(new THREE.Vector3(0.6, 0.3 + i * 0.25, 0))), i * 140); };
        const nowT = performance.now(), md2 = f.well?.mood?.[0], uneasy = md2 === 'Stressed' || md2 === 'Uneasy' || (f.well?.score ?? 80) < 55, tr2 = f.rec?.traits ?? [], lazy = tr2.includes('Lazy'), curious = tr2.includes('Curious'), shy = tr2.includes('Shy');
        f.breathAt ??= nowT + (40 + r() * 50) * 1e3; const breathK = sk === 'leatherback' ? 1.8 : sk === 'kemps' ? 0.7 : sk === 'loggerhead' ? 1.2 : 1;      // how long each kind holds its breath: a leatherback longest, a little ridley least
        // up to breathe: every few minutes (a resting turtle holds its breath much longer; a stressed one comes up far more often, as real ones do)
        if (nowT > f.breathAt) { f.breathAt = nowT + (uneasy ? 55 + r() * 30 : ((lazy ? 200 : 150) + r() * 120) * breathK) * 1e3; f.thought = uneasy ? 'Up to the surface again: it is not settled.' : 'Coming up to breathe.'; f.idle = 2.2; return T(Math.max(-3, Math.min(3, f.pos.x + (r() - 0.5) * 2)), Fish3D.topY - 0.3, Math.max(0.2, Math.min(1.8, f.pos.z)), 22); }
        // an octopus out and about: a shy turtle gives it room
        // a bold loggerhead does not give way: it shoulders a fish off what it is foraging; a feisty little ridley snaps at a fish that crowds it
        if ((sk === 'loggerhead' || sk === 'kemps') && r() < (sk === 'kemps' ? 0.18 : 0.12)) { const pest = this.list.find((o) => o !== f && !o.dead && !o.visitor && o.species.move !== 'jet' && !TURTLE_SK.has(o.sk) && o.pos.distanceTo(f.pos) < 1.8); if (pest) { pest.fleeT = 1.6; pest.chasedBy = f.fid; pest.chasedAt = Date.now(); pest.target.set(Math.max(-3.8, Math.min(3.8, pest.pos.x + Math.sign(pest.pos.x - f.pos.x || 1) * 2.4)), Math.min(12, pest.pos.y + 1), pest.pos.z); pest.retarget = 2; f.dartT = 0.8; f.thought = sk === 'kemps' ? `Snapping at ${pest.name ?? 'a fish'} for crowding it.` : `Shouldering ${pest.name ?? 'a fish'} out of its way.`; return T(pest.pos.x, pest.pos.y, pest.pos.z, 2); } }
        const oc = this.list.find((o) => !o.dead && o.species.move === 'jet' && o.pos.distanceTo(f.pos) < 2.6); if (oc && sk === 'loggerhead' && r() < 0.3) f.thought = `Ignoring ${oc.name ?? 'the octopus'}: a loggerhead fears very little.`; else if (oc && (shy || uneasy || sk === 'kemps') && r() < 0.6) { f.thought = `Keeping its distance from ${oc.name ?? 'the octopus'}.`; return T(Math.max(-3.3, Math.min(3.3, f.pos.x + Math.sign(f.pos.x - oc.pos.x || 1) * 3)), Math.min(10, f.pos.y + 1.5), f.pos.z, 10); }
        const ledge = spots.find((x) => x.type === 'ledge'), rock = ledge ?? spot(['ROCKS']);
        if (rock && (this.night || r() < (lazy ? 0.32 : 0.2))) { f.idle = this.night ? 25 + r() * 25 : (sk === 'kemps' ? 3 + r() * 4 : 6 + r() * 8); f.thought = this.night ? 'Asleep, wedged under the rock.' : sk === 'loggerhead' ? 'Dozing on the bottom by the rock.' : sk === 'kemps' ? 'A quick rest by the rock.' : 'Resting against the rock.';
          // by day, resting by the rock is also a cleaning station: a fish comes and picks its shell clean, and it hangs still with its flippers out to let it
          if (!this.night) { const cl = this.list.find((o) => !o.dead && !o.visitor && ['angelfish', 'cory', 'goldfish', 'blue'].includes(o.sk) && o.pos.distanceTo(f.pos) < 5); if (cl && r() < 0.5) { f.thought = `Holding still while ${cl.name ?? 'a fish'} picks its shell clean.`; f.cleaner = cl; cl.target.set(rock.x, 1.4 + rock.h * 0.3, rock.z + 0.7); cl.retarget = 8; cl.idle = 4; cl.thought = `Picking algae off ${f.name ?? 'the turtle'}'s shell.`; this.momentOf?.('clean', f); } }
          if (ledge) { const fx = ledge.x, fz = ledge.z + 1.6; if (Math.hypot(f.pos.x - fx, f.pos.z - fz) > 0.9 && !(f.toLedgeT > performance.now() - 30e3 && Math.hypot(f.pos.x - ledge.x, f.pos.z - ledge.z) < 1.2 && f.pos.y < sandH(f.pos.x, f.pos.z) + 1.4)) { f.idle = 0; f.thought = this.night ? 'Heading for the ledge to sleep.' : 'Heading for the ledge.'; return T(fx, 0.45, fz, 18); } f.toLedge = true; f.toLedgeT = performance.now(); }      /* (first low down in front of it, then straight in beneath the slab) */
          return ledge ? T(ledge.x + (r() - 0.5) * 0.4, 0.4, ledge.z + 0.1, 22) : T(rock.x + (r() - 0.5) * 0.5, 0.6 + rock.h * 0.15, rock.z + 0.7, 22); }
        // each kind forages its own way: a loggerhead cracks crabs and snails among the shells and rubble; a Kemp's ridley digs in open sand, kicking up puffs of it
        if (sk === 'loggerhead' && r() < 0.3) { const sh = spots.find((x) => ['rubble', 'shell', 'chest', 'liverock'].includes(x.type)) ?? spot(['ROCKS']); if (sh) { f.idle = 4 + r() * 3; f.grazing = true; f.thought = r() < 0.5 ? 'Cracking open a snail in its jaws.' : 'Rooting about the shells for crabs.'; return T(sh.x + (r() - 0.5) * 0.5, 0.7 + sh.h * 0.3, sh.z + 0.5, 14); } }
        if (sk === 'kemps' && r() < 0.35) { const x = (r() - 0.5) * 5.6, z = 0.6 + r() * 1.3; f.idle = 3 + r() * 2; f.grazing = true; f.thought = 'Digging in the sand for crabs.'; setTimeout(() => { if (!f.dead) this.sand?.(f.pos.clone(), 1); }, 2500); return T(x, 0.5, z, 10); }
        if (sk === 'leatherback') { f.thought = 'Passing through, slow and huge.'; return T((r() - 0.5) * 5.6, 5 + r() * 6, -1 + r() * 2, 14); }
        const pl = sk === 'loggerhead' || sk === 'kemps' ? null : sk === 'hawksbill' ? (spots.find((x) => x.type === 'sponge') ?? spots.find((x) => x.type === 'liverock' || x.type === 'brain') ?? spot(['ROCKS'])) : spots.find((x) => x.type === 'seagrass') ?? spot(['PLANTS']); if (pl && r() < (uneasy ? 0.15 : 0.28)) { f.idle = 4 + r() * 4; f.grazing = true; f.thought = sk === 'hawksbill' ? 'Prying at the reef rock for sponges.' : 'Grazing on the sea grass.'; return T(pl.x + (r() - 0.5) * 0.4, 0.8 + pl.h * 0.35, pl.z + 0.45, 16); }
        // a curious turtle (or any, now and then) comes right up to the front glass and looks out at whoever is there
        if (r() < (curious ? 0.22 : 0.08) * (sk === 'hawksbill' ? 1.6 : sk === 'loggerhead' ? 0.6 : 1) && !uneasy) { f.idle = 3 + r() * 3; f.thought = 'Up at the glass, looking out at you.'; return T(Math.max(-2.6, Math.min(2.6, f.pos.x + (r() - 0.5) * 2)), 3 + r() * 4, 1.95, 14); }
        f.thought = null; return T((r() - 0.5) * 6.4, 2.6 + r() * 6, -0.4 + r() * 2.4, 10 + r() * 6); }
      // a damselfish guards its patch of rock and chases off whatever swims into it; a big angelfish now and then pushes a small fish about; a clownfish and a
      // damselfish spar near the anemone. The more crowded the tank, the more often (the same rules that make the victims Stressed in Health)
      if ((sk === 'guppy' || sk === 'angelfish' || sk === 'goldfish') && this.state) { const cr = crowdOf(this.state), rate = (sk === 'guppy' ? 0.45 : sk === 'angelfish' ? 0.18 : 0.25) * (1 + Math.max(0, cr.r - 0.6) * 2), patch = sk === 'goldfish' ? spot(null, ['anemone']) : spot(['ROCKS']), home = patch ?? { x: f.pos.x, z: f.pos.z, h: 0 };
        const prey = this.list.filter((o) => o !== f && !o.dead && !o.visitor && o.species?.move !== 'jet' && o.sk && (sk === 'goldfish' ? o.sk === 'guppy' : sk === 'guppy' ? (o.sk === 'goldfish' || (SOCIAL[o.sk]?.size ?? 1) <= 1 && !SOCIAL[o.sk]?.bully) : (SOCIAL[o.sk]?.size ?? 1) <= 1 && !SOCIAL[o.sk]?.bully) && Math.hypot(o.pos.x - home.x, o.pos.z - home.z) < (sk === 'angelfish' ? 4 : 2.4));
        if (prey.length && r() < rate) { const o = prey[(r() * prey.length) | 0], cv = o.rec && this.state ? coverOf(this.state, o.rec) : { have: 0, need: 1 }, safe = cv.have >= cv.need;
          f.dartT = 1.1; f.chasing = o.fid; o.fleeT = 1.8; o.chasedBy = f.fid; o.chasedAt = Date.now();
          const away = Math.sign(o.pos.x - f.pos.x) || 1, hs = safe ? spots.find((x) => (ECO[o.sk]?.cover?.cats ?? []).includes(DECOR_DEF[x.type]?.cat) || (ECO[o.sk]?.cover?.types ?? []).includes(x.type)) : null;
          if (hs) { o.target.set(hs.x, 0.9 + hs.h * 0.45, hs.z + 0.45); o.idle = 2; } else o.target.set(Math.max(-4, Math.min(4, o.pos.x + away * 2.6)), Math.min(12, o.pos.y + 1.2), o.pos.z);      /* with shelter of its own kind it ducks into it; without, it just flees */
          o.retarget = 2.5; f.thought = sk === 'goldfish' ? `Sparring with ${o.name ?? 'the damselfish'} over the anemone.` : `Chasing ${o.name ?? 'a fish'} off its patch.`; return T(o.pos.x, o.pos.y, o.pos.z, 1.4); } }
      if (sk === 'guppy' && r() < 0.5) { const c = spot(['ROCKS']); if (c) return T(c.x + (r() - 0.5) * 1.6, 1.0 + c.h * 0.5 + r() * 1.2, c.z + 0.5 + r() * 0.4, 3 + r() * 3); }      // the rest of the time it patrols its patch
      if (sk === 'angelfish' && r() < 0.35) { const c = spot(['ROCKS']); if (c) { f.idle = 2 + r() * 2; return T(c.x + (r() - 0.5) * 1.0, 1.0 + c.h * 0.6, c.z + 0.6, 5 + r() * 3); } }      // it browses on the rock
      if (sk === 'goldfish') { const a = spot(null, ['anemone']); if (a && r() < 0.7) return T(a.x + (r() - 0.5) * 1.1, 1.0 + a.h * 0.5 + r() * 0.7, a.z + 0.5 + r() * 0.3, 3 + r() * 3); }
      if (sk === 'blue') { const c = spot(['ROCKS', 'STRUCTURES']); if (c && r() < 0.65) { f.invert = r() < 0.7; return T(c.x + (r() - 0.5) * 0.8, f.invert ? 0.9 + c.h * 0.75 : 1.0 + c.h * 0.4, c.z + 0.6, 5 + r() * 5); } }
      if (sk === 'platy' && !this.night) { const c = spot(['STRUCTURES', 'ROCKS']); if (c && r() < 0.6) return T(c.x + (r() - 0.5) * 0.9, 1.0 + c.h * 0.45, c.z + 0.5, 6 + r() * 5); }
      if (sk === 'cory') { const c = spot(['ROCKS']); if (r() < 0.6) { f.idle = 2 + r() * 3; return T(c ? c.x + (r() - 0.5) * 1.4 : -3 + r() * 6, 0.9 + r() * 0.5, c ? c.z + 0.7 : 0.8 + r(), 5 + r() * 4); } }
      if (sk === 'betta') { const c = spot(['ROCKS']); if (c && r() < 0.65) { f.idle = 3 + r() * 3; return T(c.x + (r() - 0.5) * 1.2, 1.0 + c.h * 0.35 + r() * 0.5, c.z + 0.6, 6 + r() * 4); } }
      // identity: a fish swims out to the glass for its own caretaker, goes back to its favorite spot, stays near its best friend, and has a corner of the tank it prefers
      if (f.mine && r() < (has('Shy') ? 0.1 : 0.25)) return T(-1.5 + r() * 3, 4 + r() * 6, 2.5 + r() * 0.4, 4);
      if (f.familySpot && !f.spotId && r() < 0.15) { const sp = spots.find((x) => x.id === f.familySpot); if (sp) return T(sp.x + (r() - 0.5) * 0.8, 0.9 + sp.h * 0.4, sp.z + 0.9, 5); }      // young: drawn to where its family liked to be (its own spot, once it has one, wins)
      if (has('Shy') && r() < 0.2) { const lead = this.list.find((o) => o !== f && !o.dead && !o.visitor && o.species?.move !== 'jet' && o.sk !== 'seahorse' && (o.profile?.traits ?? []).includes('Brave') && (o.fid === f.palId || o.pos.distanceTo(f.pos) < 3)); if (lead) { f.followed = (f.followed ?? 0) + 1; return T(lead.target.x - 0.8, lead.target.y, lead.target.z, 4); } }      // a shy one goes where a bold one goes
      if (f.lossPlace && r() < 0.35) { const sp = spots.find((x) => x.id === f.lossPlace); if (sp) return T(sp.x + (r() - 0.5) * 0.6, 0.9 + sp.h * 0.4, sp.z + 0.8, 7); }      // keeps going back to where it used to be with a companion that has died (a few days)
      if (this.night && f.palId && r() < 0.6) { const o = this.byId.get(f.palId); if (o && !o.dead) { f.idle = 3; return T(o.pos.x + (r() - 0.5) * 0.7, o.pos.y + (r() - 0.5) * 0.4, o.pos.z + (r() - 0.5) * 0.4, 8); } }      // best friends settle down near each other for the night
      { const D = f.spotId && (this.state?.decor ?? []).find((x) => x.id === f.spotId), mv = D?.h?.moves?.at(-1); if (mv && f.oldMove !== mv.at) { f.oldMove = mv.at; f.oldTries = 0; }      /* (a new move: a fresh search) */
        if (mv?.from && Date.now() - mv.at < 12 * 3600e3 && (f.oldTries ?? 0) < 2 && r() < 0.5) { f.oldTries = (f.oldTries ?? 0) + 1; f.searchedOld = (f.searchedOld ?? 0) + 1; return T(mv.from.x + (r() - 0.5) * 0.5, 1.2, mv.from.z + 0.8, 5); } }      // its place was moved: it looks where it used to be, twice, then settles for the new spot
      if (f.spotId && r() < 0.12 + 0.4 * temperOf({ species: sk, traits: f.profile?.traits }).keep) { const sp = spots.find((x) => x.id === f.spotId); if (sp && r() < 0.5) f.settle = { dur: 8 + r() * 6, why: 'spot' }; if (sp) return T(sp.x + (r() - 0.5) * 0.8, 0.9 + sp.h * 0.4, sp.z + 0.9, 5); }
      if (f.palId && !this.night && r() < 0.18) { const o = this.byId.get(f.palId), free = (q) => q && !q.dead && !q.seeking && !q.clean && !(q.fleeT > 0) && !(q.coverT > 0) && !q.settle && !(q.restK && q.idle > 0) && !q.sleepy;      // best friends, by day: now and then both stop and rest side by side a while
        if (free(o) && o.pos.distanceTo(f.pos) < 5) { const mx = (f.pos.x + o.pos.x) / 2, my = Math.max(1.2, (f.pos.y + o.pos.y) / 2), mz = (f.pos.z + o.pos.z) / 2, dur = 10 + r() * 6; f.settle = { dur, why: 'pal', o }; o.settle = { dur, why: 'pal', o: f }; o.target.set(mx - 0.6, my, mz); o.retarget = 8; return T(mx + 0.6, my, mz, 8);      /* (side by side, a body's width apart: their own personal space keeps them from touching) */ } }
      if (f.palId && r() < 0.45) { const o = this.byId.get(f.palId); if (o && !o.dead) return T(o.pos.x - Math.cos(o.heading) * 1.4 + (r() - 0.5), o.pos.y + (r() - 0.5) * 0.8, o.pos.z + (r() - 0.5) * 0.5, 2.5); }
      if (f.home && r() < 0.22) return T(f.home.x + (r() - 0.5) * 1.6, f.home.y + (r() - 0.5) * 2, 0.4 + r() * 1.6, 4);
      if (this.night && !has('Playful')) {
        if (has('Shy')) return T(-3 + r() * 6, 4 + r() * 6, 0.8 + r() * 1.8, 4 + r() * 3);
        if (r() < 0.5) f.idle = 4; return T(-3.4 + r() * 6.8, high ? 4 + r() * 3 : 0.9 + r() * 2.2, -1 + r() * 2.5, 7 + r() * 4);
      }
      if (mood === 'Hungry' && r() < 0.5 && f.id !== 'cory') return T(-2.5 + r() * 5, 9 + r() * 2.5, 0.8 + r() * 1.2, 4);
      if (mood === 'Sleepy') return T(-3 + r() * 6, high ? 4 + r() * 2.5 : 1 + r() * 2.2, f.target.z, 8);
      if (has('Shy') && r() < 0.75 * lowK) {                                              // tucks in behind plants and decorations, or hugs the back wall
        const s = spots.length ? spots[(r() * spots.length) | 0] : null;
        return s ? T(s.x + (r() - 0.5) * 0.8, 0.9 + r() * Math.max(0.6, s.h * 0.5), s.z - 0.9 - r() * 0.4, 6 + r() * 4) : T(-3.4 + r() * 7, 1 + r() * 2.5, -1.6 - r() * 1.2, 6 + r() * 4);
      }
      if (has('Brave') && r() < 0.6) return T(-2 + r() * 4, 3 + r() * 7, 2.2 + r() * 0.6, 3 + r() * 3);   // swims out front, close to the glass
      if (has('Curious') && r() < 0.65) {                                          // goes to inspect decorations and other fish
        if (spots.length && r() < 0.7 * lowK) { const s = spots[(r() * spots.length) | 0]; return T(s.x + (r() - 0.5) * 0.8, (s.y ?? 0) + 1 + s.h * 0.55, s.z + 1.2, 3.5); }
        const o = others[(r() * others.length) | 0]; if (o) return T(o.pos.x + (r() - 0.5) * 1.6, o.pos.y + (r() - 0.5), o.pos.z + 0.6, 3);
      }
      if (has('Social') && !school && r() < 0.7 && others.length) {                // sticks close to a buddy
        const mates = others.filter((o) => o.id === f.id), pool = mates.length ? mates : others, o = pool.reduce((a, c) => (c.pos.distanceTo(f.pos) < a.pos.distanceTo(f.pos) ? c : a), pool[0]);
        return T(o.pos.x - Math.cos(o.heading) * 1.6 + (r() - 0.5), o.pos.y + (r() - 0.5) * 0.8, o.pos.z + (r() - 0.5) * 0.5, 2.2);
      }
      if (has('Playful')) { f.retarget = 1.4 + r() * 1.4; if (r() < 0.4) T(this.bubbleAt.x + (r() - 0.5) * 0.8, 2 + r() * 8, 0.2 + r(), 2 + r()); return; }
      if (has('Lazy')) { f.target.y = high ? f.band.y[0] + r() * 2 : 1 + r() * 2.5; f.retarget = 7 + r() * 5; if (r() < 0.4) f.idle = 3; return; }
      if (has('Greedy') && r() < 0.5) return T(-2.5 + r() * 5, 10.5 + r() * 3, 0.8 + r() * 1.6, 4);   // waits near the surface where food falls
      if (has('Calm')) f.retarget += 3;
    };
    // Room to swim: wherever it means to go, if two or more others are already there (or headed there) it picks a quieter place
    // in its own layer of the water instead. A fish following a friend, schooling, doing a trick or going for food stays put.
    const chosen = f.pick;
    f.pick = (r) => {
      chosen(r); if (window.__noRoom || f.script?.length || f.palId || school || f.profile?.mood === 'Hungry' || f.weak) return;
      const crowd = (x, y, z) => this.list.reduce((n, o) => n + (o !== f && !o.dead && o.species.move !== 'jet' && (Math.hypot(o.pos.x - x, (o.pos.y - y) * 0.8, o.pos.z - z) < 1.5 || Math.hypot(o.target.x - x, (o.target.y - y) * 0.8, o.target.z - z) < 1.2) ? 1 : 0), 0);
      const T0 = f.target; if (crowd(T0.x, T0.y, T0.z) < 2) return;
      const b = f.band; let best = null, bn = 1e9;
      for (let k = 0; k < 8; k++) { const x = b.x[0] + r() * (b.x[1] - b.x[0]), y = Math.max(b.y[0], Math.min(b.y[1], T0.y + (r() - 0.5) * 3)), z = b.z[0] + r() * (b.z[1] - b.z[0]), n = crowd(x, y, z) + Math.hypot(x - T0.x, y - T0.y) * 0.05; if (n < bn) { bn = n; best = [x, y, z]; } }
      if (best) T0.set(best[0], Math.min(Fish3D.topY - 0.3, best[1]), best[2]);
    };
  }
  // Show a trick: a scripted route through or around a decoration, then back to normal wandering.
  perform(f, kind, spotId) {
    if (spotId === 'glass' && !f.dead) { const x = Math.max(-3, Math.min(3, f.pos.x)), y = Math.max(1.6, Math.min(4.5, f.pos.y)), z = 1.9;      // the twirl: up to the front glass, a full loop facing whoever asked, and a little bow
      f.script = [{ x, y, z }, { x: x + 0.7, y: y + 0.7, z, rt: 0.9 }, { x, y: y + 1.4, z, rt: 0.9 }, { x: x - 0.7, y: y + 0.7, z, rt: 0.9 }, { x, y, z, rt: 0.9 }, { x, y: y - 0.4, z: z - 0.3 }]; return this.route(f); }
    const s = (this.spots?.() ?? []).find((x) => x.id === spotId); if (!s || f.dead) return false; const y = 0.9 + s.h * 0.35, z = s.z + 0.15;
    f.script = kind === 'bubbles'
      ? [{ x: s.x, y: 1.4, z }, { x: s.x, y: 8, z }, { x: s.x + 0.9, y: 5, z }, { x: s.x - 0.4, y: 8.5, z }, { x: s.x, y: 2, z }]
      : [{ x: s.x - 2.4, y, z }, { x: s.x, y, z, rt: 1.1 }, { x: s.x + 2.4, y, z }, { x: s.x, y, z, rt: 1.1 }, { x: s.x - 2.4, y: y + 0.6, z }];
    return this.route(f);
  }
  // a fish follows a trick's route as its next swimming targets; an octopus moves by its own states, so it is steered point by point
  // through the same open-water steering that brings it to the glass (fish3d: S.s 'glass' with gl.trick), one point after another
  route(f) { if (f.species.move !== 'jet') { f.pick(this.rng); return true; } f.trickPts = f.script.map((w) => ({ x: w.x, y: w.y, z: w.z })); f.script = null; const w = f.trickPts.shift(); f.glassAt = { ...w, until: performance.now() + 6000, trick: true }; return true; }
  burst(p) { for (let i = 0; i < 14 && this.bursts.length < 150; i++) this.bursts.push({ pos: p.clone().add(new THREE.Vector3((this.rng() - 0.5) * 1.2, (this.rng() - 0.5) * 0.6, (this.rng() - 0.5) * 0.6)), v: 0.6 + this.rng() * 1.2, age: 0, r: 0.05 + this.rng() * 0.07 }); }

  drop(x, n = 7, kind = 'flakes') {
    for (const f of this.list) if (this.rng() < 0.5 || (kind === 'mysis' && f.sk === 'seahorse')) { f.flake = null;      /* a seahorse never misses its shrimp */ f.hold = this.rng() * 0.9 + (f.weak ? 5 : 0); }      // fish in a critical state have little appetite      // about half the fish notice the new food, the rest stay on the old
    for (let i = 0; i < n && this.flakes.length < 190; i++) this.flakes.push({ pos: new THREE.Vector3(x + (this.rng() - 0.5) * 0.9, Fish3D.topY + 0.2 + this.rng() * 0.4, 0.3 + this.rng() * 1.6), age: 0, ph: this.rng() * 6, kind, c: (this.foodCols[kind] ?? this.cols)[(this.rng() * 4) | 0] });
  }
  // an octopus's den (a rock or structure it has taken to), its collection of shells at the entrance, and the shell it carries home now and then
  syncDen(f, d) {
    f.hoard = hoardOf(d, Date.now()); const spots = (this.spots?.() ?? []).filter((x) => ['ROCKS', 'STRUCTURES'].includes(DECOR_DEF[x.type]?.cat)), home = spots.find((x) => x.id === d.home);
    const rocks = spots.filter((x) => ['rock', 'skull'].includes(x.type)), near = (q) => rocks.filter((r) => r !== q && Math.hypot(r.x - q.x, r.z - q.z) < 2.4), built = rocks.map((q) => [q, near(q)]).filter(([, n]) => n.length >= 1).sort((a, b) => b[1].length - a[1].length)[0];
    const taken = new Set(this.list.filter((o) => o !== f && o.species.move === 'jet' && !o.dead).map((o) => o.homeId).filter(Boolean));      // another octopus lives there: not a den for this one, and no crowding round it
    const pref = spots.filter((x) => (x.type === 'pot' || x.type === 'coconut') && !taken.has(x.id)), cover = spots.filter((x) => ['boulder', 'table', 'arch', 'brain', 'chest'].includes(x.type) && !taken.has(x.id)), den = home ?? (built ? null : pref.some((x) => x.type === 'pot') ? pref.find((x) => x.type === 'pot') : pref.length ? pref[(d.seed ?? 0) % pref.length] : cover.length ? cover[(d.seed ?? 0) % cover.length] : null);      // a den needs real cover: a single small rock is not one
    if (home) f.den = { x: home.x, z: home.z, ry: home.ry ?? 0, id: home.id, home: true, kind: home.type };
    else if (built) { const all = [built[0], ...built[1]], cx = all.reduce((a, q) => a + q.x, 0) / all.length, cz = all.reduce((a, q) => a + q.z, 0) / all.length; f.den = { x: cx, z: cz, id: built[0].id, home: false, kind: 'rocks', n: all.length }; }
    else f.den = den ? { x: den.x, z: den.z, ry: den.ry ?? 0, id: den.id, home: den.type === 'pot', kind: den.type } : null;      // a clay pot is a den it moves straight into (the way fishermen catch octopus: an empty pot is irresistible); a coconut it has to make its own first
    const key = f.den ? `${f.den.id}|${f.den.kind}|${f.hoard}|${d.crabs ?? 0}` : '';
    if (f.hoardKey !== key) { f.hoardKey = key; if (f.hoardGroup) this.scene.remove(f.hoardGroup); f.hoardGroup = null; if (f.den && f.hoard > 0) { f.hoardGroup = buildHoard(f.hoard, d.crabs ?? 0, d.seed ?? 1); f.hoardGroup.position.set(f.den.x, sandH(f.den.x, f.den.z) + 0.04, f.den.z); this.scene.add(f.hoardGroup); } }
    if (!f.carryMesh) { f.carryMesh = shellMesh('shell'); f.carryMesh.scale.setScalar(1.7); f.carryMesh.visible = false; f.carryMesh.position.set(11 * f.scale, -7 * f.scale, 6 * f.scale); f.group.add(f.carryMesh); f.onDrop = (p) => this.looseShell(p); f.onInk = (p) => { this.ink(p); this.momentOf?.('ink', f); }; f.onInkAt = (a, b) => this.inkJet(a, b); f.onPush = (p, d) => this.puff(p, d); f.onMoment = (kind, o) => { const k = kind + ':' + f.fid, now = performance.now(); if (now - ((this.momentAt ||= {})[k] ?? -1e9) < 3600e3) return; this.momentAt[k] = now; this.onMoment?.({ fish: f.fid, kind, other: o?.fid }); }; f.onThrow = (p, d, kind, at) => (kind === 'smack' ? this.burst(at) : kind === 'shell' ? this.toss(p, d) : kind === 'water' ? this.waterJet(p, d) : this.silt(p, d)); f.onSand = (p, k) => this.sand(p, k); f.isNight = !!this.night; f.onEat = (h) => this.eatCrab(h); f.onTouch = (id) => this.touched(f, id); }
  }
  looseShell(p) { const m = shellMesh(this.rng() < 0.5 ? 'shell' : 'clam'); m.position.set(p.x + 0.45, sandH(p.x + 0.45, p.z + 0.5) + 0.1, p.z + 0.5); m.rotation.y = this.rng() * 6; this.scene.add(m); (this.loose ||= []).push({ m, until: performance.now() + 150e3 }); }
  // a crab treat: it sinks to the floor and the octopus goes after it
  dropCrab(fid) {
    const f = this.byId.get(fid); if (!f || f.dead || f.species.move !== 'jet') return; const n = (f.crabN = (f.crabN ?? 0) + 1), key = [...fid].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) % 9973 + n * 17, [x, z] = crabSpot(f, Math.max(-3.4, Math.min(3.4, f.pos.x + (spot(key) - 0.5) * 3)), f.pos.z + (spot(key + 0.5) - 0.5) * 1.2), m = buildCrab(); m.scale.setScalar(CRAB); m.position.set(x, Fish3D.topY + 0.2, z); this.scene.add(m);
    const hnt = { x, z, mesh: m, y: Fish3D.topY + 0.2 }; (this.crabs ||= []).push(hnt); f.hunt = hnt; this.burst(new THREE.Vector3(x, 14, z));
  }
  // a crab dropped in at feeding time: it sinks where you tapped, and the octopus that is free (or the hungriest) goes after it
  dropCrabAt(x, fid = null) {
    const os = this.list.filter((f) => f.species.move === 'jet' && !f.dead && !f.visitor); if (!os.length) return;
    const f = (fid && os.find((o) => o.fid === fid)) ?? os.find((o) => !o.hunt) ?? os[0]; let z = 1.0 + spot(x * 7.31) * 1.0;      // where it lands follows from where it was dropped, so every phone agrees
    for (const o of os) { const dx = x - o.pos.x, d = Math.hypot(dx, z - o.pos.z); if (d < 2.0) { const side = dx !== 0 ? Math.sign(dx) : (o.pos.x > 0 ? -1 : 1); x = o.pos.x + side * 2.0; if (Math.abs(x) > 3.6) x = o.pos.x - side * 2.0; } }      // it lands clear of any octopus (to one side), never through one
    x = Math.max(-3.6, Math.min(3.6, x)); [x, z] = crabSpot(f, x, f.pos.z + (z - 1.5));
    const m = buildCrab(); m.scale.setScalar(CRAB); m.position.set(x, Fish3D.topY + 0.2, z); this.scene.add(m);
    const hnt = { x, z, mesh: m, y: Fish3D.topY + 0.2 }; (this.crabs ||= []).push(hnt); if (!f.hunt) f.hunt = hnt; else (f.hunts ||= []).push(hnt); this.burst(new THREE.Vector3(x, 14, z));
  }
  // a jet of ink squirted at a crab: puffs leave the siphon one after another, shoot toward it, slow down and bloom into a cloud around it
  inkJet(a, b) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length() || 1; d.divideScalar(L);
    for (let i = 0; i < 14; i++) { const r = 0.08 + i * 0.012 + this.rng() * 0.04, m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshBasicMaterial({ color: 0x150f22, transparent: true, opacity: 0, depthWrite: false }));
      m.position.copy(a); this.scene.add(m); this.onSprite?.(m); const sp = L * (3.7 + this.rng() * 0.5), j = () => (this.rng() - 0.5) * 0.5;
      (this.inks ||= []).push({ m, age: -i * 0.035, vx: d.x * sp + j(), vy: d.y * sp + j() * 0.6 + 0.15, vz: d.z * sp + j(), drag: 3.4, life: 2.8 + this.rng() * 0.8, grow: 1.6, op: i < 5 ? 0.5 : 0.32 }); }      // a dense head to the jet, then a thin smoky haze that clears in a few seconds
  }
  // a cloud of ink: dark puffs that swell and thin out over a few seconds
  // a puff of silt flung at a fish: a sandy cloud streaming the way it was thrown, gone in a couple of seconds
  silt(p, d) {
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + this.rng() * 0.14, 1), new THREE.MeshBasicMaterial({ color: 0xd9c79a, transparent: true, opacity: 0, depthWrite: false })); m.position.set(p.x + d.x * 0.5, p.y + 0.2 + d.y * 0.5, p.z + d.z * 0.5); this.scene.add(m); this.onSprite?.(m);
      const sp = 2.2 + this.rng() * 1.2, j = () => (this.rng() - 0.5) * 0.7; (this.inks ||= []).push({ m, age: -i * 0.04, vx: d.x * sp + j(), vy: d.y * sp + j() * 0.5 + 0.1, vz: d.z * sp + j(), drag: 2.6, life: 1.6 + this.rng() * 0.5, grow: 1.4, op: 0.45 }); }
  }
  // a shell from its hoard flung at a fish: it flies in a low arc, tumbling, and lands on the sand as a loose shell
  toss(p, d) { const m = shellMesh(this.rng() < 0.5 ? 'shell' : 'clam'); m.position.set(p.x + d.x * 0.4, p.y + 0.3, p.z + d.z * 0.4); m.rotation.y = this.rng() * 6; this.scene.add(m); (this.thrown ||= []).push({ m, vx: d.x * 2.6, vy: 1.7, vz: d.z * 1.6, age: 0 }); }
  // a squirt of water at a fish: a line of bubbles shooting out from its funnel
  waterJet(p, d) { for (let k = 0; k < 5; k++) { const q = new THREE.Vector3(p.x + d.x * (0.4 + k * 0.42), p.y + 0.25 + d.y * (0.4 + k * 0.42), p.z + d.z * (0.4 + k * 0.42)); for (let i = 0; i < 4 && this.bursts.length < 150; i++) this.bursts.push({ pos: q.clone().add(new THREE.Vector3((this.rng() - 0.5) * 0.25, (this.rng() - 0.5) * 0.2, (this.rng() - 0.5) * 0.25)), v: 0.5 + this.rng() * 0.8, age: 0, r: 0.025 + this.rng() * 0.035 }); } }
  // sand stirred up where the octopus digs in or bursts out
  sand(p, k = 1) {
    for (let i = 0; i < Math.round(6 * k); i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + this.rng() * 0.16, 1), new THREE.MeshBasicMaterial({ color: 0xd8c89c, transparent: true, opacity: 0, depthWrite: false })); m.position.set(p.x + (this.rng() - 0.5) * 1.1, p.y - 0.2 + this.rng() * 0.3, p.z + (this.rng() - 0.5) * 0.8); this.scene.add(m); this.onSprite?.(m);
      (this.inks ||= []).push({ m, age: -i * 0.03, vx: (this.rng() - 0.5) * 0.5, vy: 0.25 + this.rng() * 0.35 * k, vz: (this.rng() - 0.5) * 0.4, drag: 2, life: 1.2 + this.rng() * 0.6, grow: 1.3, op: 0.5 }); }
  }
  ink(p) {
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + this.rng() * 0.2, 1), new THREE.MeshBasicMaterial({ color: 0x1a1428, transparent: true, opacity: 0.55, depthWrite: false })); m.position.set(p.x + (this.rng() - 0.5) * 0.8, p.y + (this.rng() - 0.3) * 0.6, p.z + (this.rng() - 0.5) * 0.6); this.scene.add(m); this.onSprite?.(m); (this.inks ||= []).push({ m, age: -i * 0.06, vx: (this.rng() - 0.5) * 0.5, vy: 0.1 + this.rng() * 0.25 }); }
  }
  puff(p, d) { const q = new THREE.Vector3(p.x - d.x * 0.6, p.y - d.y * 0.6 + 0.1, p.z - d.z * 0.6); for (let i = 0; i < 6 && this.bursts.length < 150; i++) this.bursts.push({ pos: q.clone().add(new THREE.Vector3((this.rng() - 0.5) * 0.5, (this.rng() - 0.5) * 0.4, (this.rng() - 0.5) * 0.5)), v: 0.5 + this.rng() * 0.9, age: 0, r: 0.04 + this.rng() * 0.05 }); }
  // a crab already on the sand (it climbed out of a jar), for the octopus to catch
  crabOut(x, z) { const y = sandH(x, z) + 0.13, m = buildCrab(); m.scale.setScalar(CRAB); m.position.set(x, y, z); m.rotation.y = this.rng() * 6; this.scene.add(m); const hnt = { x, z, mesh: m, y }; (this.crabs ||= []).push(hnt); return hnt; }
  // several phones, one tank: the lead phone tells the others where its crabs are; they move theirs to match, add any they are missing and drop any extra
  crabSnap() { return (this.crabs ?? []).filter((c) => !c.held).slice(0, 8).map((c) => [r2(c.x), r2(c.y), r2(c.z), r2(c.mesh.rotation.y), c.pinned ? 1 : 0]); }
  netCrabs(list) {
    const now = performance.now(); this.eatenAt = (this.eatenAt ?? []).filter((e) => now - e.t < 6000);
    const mine = (this.crabs ?? []).filter((c) => !c.held), used = new Set();
    for (const c0 of list) {
      if (!Array.isArray(c0) || c0.length < 5 || !c0.slice(0, 4).every(Number.isFinite)) continue; const [x, y, z, ry, pin] = c0;
      let best = null, bd = 3; for (const c of mine) { if (used.has(c)) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
      if (!best) {
        if (this.eatenAt.some((e) => Math.hypot(e.x - x, e.z - z) < 2.2)) continue;                     // this phone has just seen that one eaten
        const m = buildCrab(); m.scale.setScalar(CRAB); m.position.set(x, y, z); m.rotation.y = ry; this.scene.add(m); best = { x, y, z, mesh: m, born: now }; (this.crabs ||= []).push(best);
        const o = this.list.filter((f) => f.species.move === 'jet' && !f.dead && !f.visitor && !f.hunt).sort((a, b) => Math.hypot(a.pos.x - x, a.pos.z - z) - Math.hypot(b.pos.x - x, b.pos.z - z))[0]; if (o) o.hunt = best;
      }
      used.add(best); best.net = { x, y, z, ry, pin, at: now };
    }
    for (const c of mine) if (!used.has(c) && !c.pinned && now - (c.born ?? 0) > 1500 && (!c.net || now - c.net.at > 600)) { for (const f of this.list) { if (f.hunt === c) f.hunt = null; if (f.hunts) f.hunts = f.hunts.filter((h) => h !== c); } this.scene.remove(c.mesh); this.crabs = this.crabs.filter((x) => x !== c); }
  }
  eatCrab(hnt) { (this.eatenAt ||= []).push({ x: hnt.x, z: hnt.z, t: performance.now() }); if (hnt.dropped && hnt.mesh) { (this.loose ||= []).push({ m: hnt.mesh, until: performance.now() + 40e3, fade: true }); hnt.mesh = { position: hnt.mesh.position }; }      // the empty shell stays on the sand for a while
    else this.scene.remove(hnt.mesh); this.crabs = (this.crabs ?? []).filter((c) => c !== hnt); this.burst(new THREE.Vector3(hnt.x, 0.7, hnt.z)); const f = this.list.find((o) => o.hunts?.length && (o.hunt === hnt || !o.hunt)); if (f) { setTimeout(() => { if (!f.hunt && f.hunts?.length) f.hunt = f.hunts.shift(); }, 1500); } }
  // puzzle jars: one appears on the sand for each octopus that has been given one, and opens when it is solved
  syncJars(state) {
    this.jars ||= new Map();
    for (const d of state.fish) {
      const f = this.byId.get(d.id), jar = this.jars.get(d.id);
      if (d.puzzle) {
        if (!jar) { const j = buildJar(); let h = 0; for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) | 0; j.pos = { x: ((Math.abs(h) % 50) / 10) - 2.5, z: 1.3 + ((Math.abs(h) >> 6) % 8) / 10 }; j.root.position.set(j.pos.x, sandH(j.pos.x, j.pos.z) + 0.12, j.pos.z); j.root.scale.setScalar(0.95); this.scene.add(j.root); this.onSprite?.(j.root); this.jars.set(d.id, j); this.burst(new THREE.Vector3(j.pos.x, 0.8, j.pos.z)); }
        if (f) f.jarAt = this.jars.get(d.id).pos;
      } else {
        if (f) f.jarAt = null;
        if (jar && jar.state === 'closed') { jar.state = 'open'; jar.t = 0; this.burst(new THREE.Vector3(jar.pos.x, 1.2, jar.pos.z)); if (f && !f.dead && !f.hunt) f.hunt = this.crabOut(jar.pos.x + 0.65, jar.pos.z + 0.25); }      // the crab scuttles out of the open jar, and the octopus catches it: that was the point
      }
    }
    for (const [id, jar] of [...this.jars]) if (!state.fish.some((d) => d.id === id) && jar.state === 'closed') { jar.state = 'open'; jar.t = 0; }
  }
  investigate(spot) {
    // a seahorse may notice it, after a moment of its own: the nearer and the more curious, the likelier. What it then does (let go and go to look,
    // or just turn an eye to it) is its own choice (see Fish3D.seahorse). It looks at the thing at its real height, from the sand it stands on.
    { let burst = false;
      for (const f of this.list) if (!f.dead && !f.visitor && f.species.move === 'hover' && !f.greet) {
        const cur = f.persona?.cur ?? 0.5, d = Math.hypot(f.pos.x - spot.x, f.pos.z - spot.z); if (this.rng() > 0.9 - d * 0.08 + (cur - 0.5) * 0.5) continue;
        const y = Math.min(Fish3D.topY - 1, (spot.y ?? sandH(spot.x, spot.z)) + Math.min(1.6, Math.max(0.5, (spot.h ?? 1) * 0.6)));
        f.noticeQ = { x: spot.x, y, z: spot.z, id: spot.id, at: (f.tt ?? 0) + 1.5 + this.rng() * 8 * (1.4 - cur) }; burst = true; }
      if (burst) this.burst(new THREE.Vector3(spot.x, (spot.y ?? 0) + 0.8, spot.z + 0.4)); }
    for (const f of this.list) if (!f.dead && !f.visitor && f.species.move !== 'jet' && f.species.move !== 'hover' && !f.script?.length && (f.profile?.traits ?? []).includes('Curious') && this.rng() < 0.6) {
      const y = 1.5 + (spot.h ?? 1) * 0.45; f.script = [{ x: spot.x - 0.9, y, z: spot.z + 1.2, rt: 2.4 }, { x: spot.x + 0.9, y: y + 0.4, z: spot.z + 1.2, rt: 2.2 }, { x: spot.x, y: y + 0.2, z: spot.z + 1.5, rt: 1.6 }]; f.pick(this.rng);
    } for (const f of this.list) if (f.species.move === 'jet' && !f.dead && !f.jarAt) f.inspect = { x: spot.x, z: spot.z }; }       // the octopus goes to look at anything new; other curious fish are handled in wrapPick
  squirt(f) { for (let k = 0; k < 6; k++) setTimeout(() => { if (f.dead) return; this.burst(f.pos.clone().add(new THREE.Vector3(0, 0.5 + k * 0.05, 0.6 + k * 0.55))); }, k * 80); f.flush = Math.max(f.flush ?? 0, 0.6); }
  // living with each other: bullies chase the timid, a predator makes small fish keep their distance, and territorial rivals turn on each other
  // ── what the newer reef animals do: the neon goby runs a cleaning station, the blue tang grazes the glass, the puffer puffs up when startled ──
  reefTick(dt, t) {
    for (const f of this.list) { if (f.dead || f.visitor || f.nursery || f.puppet) continue;
      { const L = f.rec?.leaveAsk; if (!L && f.distress) { f.mul = 1; f.thought = null; } f.distress = !!L; if (L) {      // an animal asking to leave looks it: slow and listless, keeping low toward the back, and says what it is missing
        f.mul = Math.min(f.mul ?? 1, 0.55); if ((f.sulkT = (f.sulkT ?? 0) - dt) <= 0 && !f.inspect && !f.hunt) { f.sulkT = 8 + this.rng() * 8; const B = BANDS[f.sk] ?? BANDS.goldfish; f.target.set(f.pos.x * 0.7, B.y[0] + 0.4 + this.rng() * 0.8, B.z[0] + 0.2); f.retarget = 6; }
        f.thought = L.why ? `Unhappy. It is missing ${L.why}` : 'Unhappy, and keeping to itself'; } }
      if (f.sk === 'neongoby') {      // a fish comes to its rock and holds still while the goby works over it, flank, gills and fins
        const C = f.clean; if (C) { const o = C.o; C.t -= dt; if (!o || o.dead || C.t <= 0) { f.clean = null; f.cleanGap = 18 + this.rng() * 24; if (o) { o.mul = 1; o.cleaned = performance.now(); } continue; }
          const side = Math.sin(t * 1.3 + C.ph) * 0.5, up = Math.cos(t * 0.9 + C.ph) * 0.25; f.target.set(o.pos.x + side, o.pos.y + up, o.pos.z + 0.35); f.retarget = Math.max(f.retarget ?? 0, 0.3);
          if (f.pos.distanceTo(o.pos) < 1.3) { o.mul = 0.12; o.vel.multiplyScalar(Math.exp(-dt * 3)); o.target.copy(o.pos); o.retarget = Math.max(o.retarget ?? 0, 0.4); f.thought = `Cleaning ${o.rec?.name ?? o.name ?? 'a fish'}`; } continue; }
        if ((f.cleanGap = (f.cleanGap ?? 3 + this.rng() * 5) - dt) > 0) {      // between clients it perches on top of its rock, propped on its fins, and waits
          const R = (f.perch && this.spots?.().find((q) => q.id === f.perch)) || (() => { const r = (this.spots?.() ?? []).filter((q) => DECOR_DEF[q.type]?.cat === 'ROCKS').sort((a, b) => (b.type === 'station') - (a.type === 'station') || Math.hypot(a.x - f.pos.x, a.z - f.pos.z) - Math.hypot(b.x - f.pos.x, b.z - f.pos.z))[0]; f.perch = r?.id ?? null; return r; })();
          if (R) { const top = (R.y ?? sandH(R.x, R.z)) + (R.h ?? 0.6) * 0.9 + 0.12; f.target.set(R.x, top, R.z + 0.1); f.retarget = Math.max(f.retarget ?? 0, 0.5); if (f.pos.distanceTo(f.target) < 0.35) { f.vel.multiplyScalar(Math.exp(-dt * 5)); f.mul = 0.15; f.pitch = 0; f.thought = 'Waiting at its cleaning station'; } else f.mul = 1; }
          continue; }
        f.mul = 1;
        const pool = this.list.filter((o) => o !== f && !o.dead && !o.visitor && !o.nursery && o.sk !== 'neongoby' && o.species?.move !== 'jet' && (performance.now() - (o.cleaned ?? 0)) > 60e3);
        const o = pool.sort((a, b) => a.pos.distanceTo(f.pos) - b.pos.distanceTo(f.pos))[0]; if (o) { f.clean = { o, t: 6 + this.rng() * 4, ph: this.rng() * 6 }; this.onBehave?.(f, 'clean', o); } else f.cleanGap = 10; }
      else if (f.sk === 'tang') {      // where algae has grown it grazes: it comes to the glass and crops the film off in little pecks (you see the clean bites appear), or nibbles over the rocks
        const al = this.algae ?? 0, G = f.graze; if (G) { G.t -= dt; if (G.t <= 0 || al < 0.08) { f.graze = null; f.grazeGap = (al > 0.5 ? 10 : 22) + this.rng() * 18; continue; }
          const at = G.rock ? this.spots?.().find((q) => q.id === G.rock) : null;
          if (G.rock && !at) { f.graze = null; continue; }
          if (at) f.target.set(at.x + Math.sin(t * 0.8) * 0.35, (at.y ?? sandH(at.x, at.z)) + (at.h ?? 0.6) * 0.8 + 0.25, at.z + 0.3); else f.target.set(G.x + Math.sin(t * 0.55) * 1.4, G.y + Math.sin(t * 0.9) * 0.6, 2.0);      /* (the front of its swimming room, right against the glass as you see it) */
          f.retarget = Math.max(f.retarget ?? 0, 0.3); if (f.pos.distanceTo(f.target) < 0.6) { f.pitch = Math.sin(t * 10) * 0.14; f.mul = 0.45; f.thought = at ? 'Grazing algae off the rock' : 'Grazing algae off the glass'; } else f.mul = 1; continue; }
        f.mul = 1; if (al < 0.15) continue;
        if ((f.grazeGap = (f.grazeGap ?? 4 + this.rng() * 6) - dt) <= 0) { const rocks = (this.spots?.() ?? []).filter((q) => DECOR_DEF[q.type]?.cat === 'ROCKS'), rock = rocks.length && this.rng() < 0.35 ? rocks[(this.rng() * rocks.length) | 0].id : null;
          f.graze = { t: 6 + this.rng() * 5, rock, x: (this.rng() - 0.5) * 5, y: 4.5 + this.rng() * 6 }; this.onBehave?.(f, 'graze'); } }
      else if (f.sk === 'octopus' && f.rec?.kind === 'cyanea' && !f.isNight) {      // a day octopus on the prowl sends waves of dark color over its skin to flush out prey, and reef fish tag along behind to catch what it scares up (real groupers and goatfish hunt with it)
        if ((f.flashT = (f.flashT ?? 4) - dt) <= 0) { f.flashT = 5 + this.rng() * 6; if ((f.vel?.length?.() ?? 0) > 0.2) f.flush = Math.max(f.flush ?? 0, 0.55); }
        if ((f.vel?.length?.() ?? 0) > 0.25) { let n = 0; for (const o of this.list) { if (o === f || o.dead || o.visitor || o.nursery || o.species?.move || TURTLE_SK.has(o.sk) || n >= 2) continue; if (o.pos.distanceTo(f.pos) < 4.5) { n++; o.target.set(f.pos.x - (f.vel.x || 0.5) * 0.8, f.pos.y + 0.7 + n * 0.3, f.pos.z); o.retarget = Math.max(o.retarget ?? 0, 0.5); o.thought = `Hunting along behind ${f.rec?.name ?? 'the octopus'}`; } } if (n) f.thought = n > 1 ? 'Out hunting, with fish in tow' : 'Out hunting, with a fish in tow'; } }
      else if (f.sk === 'octopus' && f.rec?.kind === 'mimic') {      // a fish that comes too close gets an impression aimed at it: a lionfish for most, a banded sea snake for a big one
        if ((f.mimT = (f.mimT ?? 0) - dt) <= 0) { const o = this.list.find((x) => x !== f && !x.dead && !x.species?.move && x.pos.distanceTo(f.pos) < 1.6); if (o) { f.mimT = 20 + this.rng() * 15; f.mimicWant = (SOCIAL[o.sk]?.size ?? 1) >= 2 ? 'snake' : 'lion'; f.thought = `Pretending to be a ${f.mimicWant === 'snake' ? 'sea snake' : 'lionfish'} to scare off ${o.rec?.name ?? 'a fish'}`; } else f.mimT = 1.5; } }
      else if (f.sk === 'octopus' && f.rec?.kind === 'bimac' && !f.inspect && !f.hunt && !f.keepCarry && Date.now() - (this.attnAt ?? 0) < 25e3) {      // a two-spot octopus comes to the front when someone is there, and watches them
        if ((f.peekT = (f.peekT ?? 2) - dt) <= 0) { f.peekT = 14 + this.rng() * 10; f.inspect = { x: Math.max(-3, Math.min(3, f.pos.x * 0.6)), z: 2.0, toy: true }; f.thought = 'Came to the front to see you'; } }
      else if (f.sk === 'puffer') {      // a puffer that is startled blows itself up into a ball, holds it a few seconds, and slowly lets it go
        if (!(f.puffT > 0)) { for (const o of this.list) { if (o === f || o.dead) continue; const d = o.pos.distanceTo(f.pos), fast = (o.vel?.length?.() ?? 0) > 1.4; if (d < 1.1 && (fast || o.species?.move === 'jet' || SOCIAL[o.sk]?.bully)) { f.puffT = 4 + this.rng() * 2; this.onBehave?.(f, 'puff', o); break; } } }
        if (f.puffT > 0) f.puffT -= dt; const want = f.puffT > 0.8 ? 1 : 0; f.puffK = (f.puffK ?? 0) + (want - (f.puffK ?? 0)) * Math.min(1, dt * (want ? 6 : 0.8));
        if ((f.puffK ?? 0) < 0.01) f.puffS0 = f.group.scale.x; else { f.group.scale.setScalar((f.puffS0 ?? 1) * (1 + 0.55 * f.puffK)); f.mul = 1 - 0.7 * f.puffK; if (f.puffK > 0.5) f.thought = 'Puffed up!'; }
        if (Date.now() - (this.attnAt ?? 0) < 20e3 && !(f.puffT > 0) && !f.settle && !(f.restK && f.idle > 0) && this.rng() < dt * 0.3) { f.target.set(f.pos.x * 0.6, f.pos.y, GLASS_Z - 0.5); f.retarget = 2; }      // someone is looking: it comes to the glass to look back
      } }
  }
  socialTick(dt) {
    this.stT = (this.stT ?? 0) - dt; if (this.stT > 0) return; this.stT = 0.6;
    const L = this.list.filter((f) => !f.dead && !f.visitor && SOCIAL[f.sk]), away = (o, from, d = 2.6) => { const v = o.pos.clone().sub(from); v.y *= 0.3; if (v.lengthSq() < 1e-4) v.set(1, 0, 0); v.normalize().multiplyScalar(d); o.target.set(Math.max(-4, Math.min(4, o.pos.x + v.x)), Math.max(0.9, Math.min(Fish3D.topY - 0.3, o.pos.y + v.y)), Math.max(-2, Math.min(2.8, o.pos.z + v.z))); o.retarget = 1.1; o.fleeT = 1.4; };
    for (const b of L) {
      const B = SOCIAL[b.sk]; b.chaseCool = (b.chaseCool ?? 0) - 0.6;
      if (B.bully && b.chaseCool <= 0 && b.species.move !== 'hover') {
        let best = null, bd = 3.4; for (const o of L) { const O = SOCIAL[o.sk]; if (o === b || o.sk === b.sk || O.size > 1 || O.bully) continue; const d = b.pos.distanceTo(o.pos); if (d < bd) { bd = d; best = o; } }
        if (best && this.rng() < 0.55) { b.target.copy(best.pos); b.retarget = 0.9; b.fleeT = 1.0; b.chaseCool = 7 + this.rng() * 9; away(best, b.pos); }
      }
      if (b.species.move === 'jet') b.startleCool = Math.max(0, (b.startleCool ?? 0) - 0.6);
      if (B.predator && b.species.move === 'jet' && b.lead !== false && b.scareT <= 0 && b.startleCool <= 0 && ['rest', 'crawl', 'flat', 'kelp', 'watch', 'snake'].includes(b.st?.s)) for (const o of L) if (o !== b && o.species.move !== 'hover' && o.vel.length() > 0.7 && Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) < 1.8 && Math.abs(o.pos.y - b.pos.y) < 2.4 && this.rng() < 0.4 + 0.5 * (1 - (b.bold ?? 0.5))) { b.startle(o.pos, o); b.startleCool = 35 + this.rng() * 30; break; }      // something quick and close makes it jump (the timid ones more easily), not more than once a minute
      if (B.predator && (b.st?.s === 'crawl' || b.st?.s === 'jet')) for (const o of L) { const O = SOCIAL[o.sk]; if (o !== b && O.size <= 1 && !O.bully && o.species.move !== 'hover' && o.pos.distanceTo(b.pos) < 1.9) away(o, b.pos, 2.2); }
      if (B.sameFoe) for (const o of L) if (o !== b && o.sk === b.sk && b.pos.distanceTo(o.pos) < 1.6 && o.species.move !== 'hover') away(o, b.pos, 2.0);
    }
  }
  // seahorses greet their partner: now and then (more in the morning) two of them meet at a plant, circle each other glowing, and part
  // the three nursery babies are each their own little character, and it shows in where they go: one roams the whole tank, one keeps to
  // the plants, one stays close to its father and the others (see Fish3D.pickHover). What each did is kept in f.bl, so a drill can measure it.
  // a young fish (out of the egg, not in the nursery) swims like a baby: little quick darts, a bob as it goes, and it keeps close to a parent
  hatchTick(dt) {
    for (const f of this.list) {
      if (f.dead || f.nursery || f.visitor || f.sk === 'seahorse' || f.species?.tail || (f.cute ?? 0) < 0.4 || f.species?.move === 'jet' || f.holdfast || f.perch?.on) continue;      // (seahorses keep their own ways: they hunt for stems to hold)
      f.target.y += Math.sin((f.tt ?? performance.now() / 1e3) * 5 + (f.phase ?? 0)) * 0.012 * f.cute;      // the bob
      if ((f.kidT = (f.kidT ?? Math.random() * 2) - dt) > 0) continue; f.kidT = (f.sleepy ? 6 : 1.6) + Math.random() * 2.2;
      const par = (f.rec?.parents ?? []).map((p) => this.byId.get(p.id)).filter((o) => o && !o.dead), near = par.sort((a, b) => a.pos.distanceTo(f.pos) - b.pos.distanceTo(f.pos))[0];
      if (near && Math.random() < 0.6 * f.cute) { f.target.set(near.pos.x - Math.cos(near.heading ?? 0) * 0.6 + (Math.random() - 0.5) * 0.5, near.pos.y + (Math.random() - 0.4) * 0.5, near.pos.z + (Math.random() - 0.5) * 0.5); f.retarget = 2.5; }      // tagging along just behind mum or dad
      else if (!f.sleepy) { f.target.set(f.pos.x + (Math.random() - 0.5) * 1.8, f.pos.y + (Math.random() - 0.5) * 0.8, f.pos.z + (Math.random() - 0.5) * 1.2); f.retarget = 1.4; }      // a quick little dart
    }
  }
  babyTick(dt) {
    const kids = this.list.filter((f) => f.nursery && !f.dead); if (!kids.length) return;
    if ((this.bsT = (this.bsT ?? 0) - dt) <= 0) { this.bsT = 1; this.bsp = this.spots?.() ?? []; }      // (the decorations, looked up once a second)
    const sp = this.bsp ?? [], plants = sp.filter((q) => PLANTS.has(q.type));
    for (const f of kids) {
      const L = (f.bl ||= { secs: 0, dist: 0, plant: 0, fam: 0, hitched: 0, holds: 0, home: 0, swimWith: 0, places: new Set() }), dad = this.byId.get(f.rec?.father), mum = this.byId.get(this.world?.nursery?.mother ?? f.rec?.mother), fam = [dad, mum, ...kids.filter((k) => k !== f)].filter(Boolean);
      L.secs += dt; if (f.lp) L.dist += f.lp.distanceTo(f.pos); (f.lp ||= new THREE.Vector3()).copy(f.pos);
      if (plants.some((q) => Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 0.9)) L.plant += dt;
      if (fam.some((o) => o.pos.distanceTo(f.pos) < 1.6)) L.fam += dt;
      const v = f.vel.length(), dn = Math.min(...fam.map((o) => o.pos.distanceTo(f.pos)), 99);
      if (v > 0.03 && !f.perch?.on && fam.some((o) => { const d = o.pos.distanceTo(f.pos); return o.vel.length() > 0.03 && !o.holdfast?.on && !o.perch?.on && d < 1.5 && f.vel.dot(_tv.copy(o.pos).sub(f.pos)) > 0.5 * v * d; })) L.swimWith += dt;      // swimming after or alongside one of them while it is on the move (heading its way, not just passing)
      if (dn > 2) f.blFar = true; else if (dn < 0.8 && f.blFar) { f.blFar = false; L.meets = (L.meets ?? 0) + 1; }      // came over to one of its family from across the tank
      const on = !!f.holdfast?.on || !!f.perch?.on; if (on) L.hitched += dt; if (on && !f.blOn) { L.holds++; if (f.homeId && (f.holdfast?.id ?? f.perch?.id) === f.homeId) L.home++; } f.blOn = on;
      const near = (q, r) => Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < r, keep = f.blAt && sp.find((q) => q.id === f.blAt && near(q, 1.4)), at = keep ? f.blAt : sp.find((q) => near(q, 0.8))?.id ?? null; if (at) L.places.add(at); if (at && at !== f.blAt) L.looks = (L.looks ?? 0) + 1; f.blAt = at;      // each time it comes up to a decoration
      f.kin = () => fam;      // (who its family is, for where it swims: see Fish3D.pickHover)
    }
  }
  seahorseTick(dt, t) {
    if (this.isLead && !this.isLead()) return;      // only the lead phone decides when two seahorses greet; the other phones are shown it in its snapshots
    this.shT = (this.shT ?? 30 + this.rng() * 40) - dt; if (this.shT > 0) return;
    const hs = this.list.filter((f) => f.sk === 'seahorse' && !f.dead && !f.greet && !f.link && !f.sleepy && !f.weak && f.species.move === 'hover'); this.shT = (this.phase?.() === 'morning' ? 150 : 420) + this.rng() * 180; if (hs.length < 2 || this.night) return;
    hs.sort((x, y) => (y.persona?.soc ?? 0.5) + this.rng() * 0.6 - ((x.persona?.soc ?? 0.5) + this.rng() * 0.6));      // the sociable ones start it
    const mated = hs.find((x) => x.mateId && hs.some((o) => o.fid === x.mateId)), court = mated && [mated, hs.find((o) => o.fid === mated.mateId)].some((x) => x.rec?.preg && Date.now() - x.rec.preg.start < 3 * 3600e3);
    if (mated) { const o = hs.find((x) => x.fid === mated.mateId); hs.splice(hs.indexOf(mated), 1); hs.splice(hs.indexOf(o), 1); hs.unshift(mated, o); }      // a pair greets each other, every morning
    else if (this.rng() > 0.35 + 0.65 * ((hs[0].persona?.soc ?? 0.5) + (hs[1].persona?.soc ?? 0.5)) / 2) return;      // two independent ones may let the chance go by
    if (court) this.shT = 50 + this.rng() * 40;      // just courted: they dance again and again for a while
    const [a, b] = hs, spots = (this.spots?.() ?? []).filter((x) => DECOR_DEF[x.type]?.cat === 'PLANTS'), mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
    let sp = null, bd = 1e9; for (const x of spots) { const d = Math.hypot(x.x - mid.x, x.z - mid.z); if (d < bd) { bd = d; sp = x; } }
    const cx = sp ? sp.x : Math.max(-3, Math.min(3, mid.x)), cz = sp ? sp.z + 0.5 : 1.2, y = Math.max(sandUnder(cx, cz, 0.7) + 2.4, sp ? (sp.y ?? 0) + sp.h + 1.4 : Math.max(2.5, Math.min(8, mid.y)));      // above the plant, so their tails hang clear of it and of the sand
    const T = court ? 22 : 11; a.greet = { cx, cz, y, r: court ? 0.34 : 0.42, ang: 0, side: 1, t: T, T0: T, court, o: b }; b.greet = { cx, cz, y, r: court ? 0.34 : 0.42, ang: Math.PI, side: 1, t: T, T0: T, court, o: a };      /* (each knows its partner: the circling waits until both have swum to their places) */ this.burst(new THREE.Vector3(cx, y, cz)); this.onDance?.();      /* a soft click as they meet */      // courting, they circle closer and longer
  }
  // ── sensing, shared by every kind: a coarse grid of who is where (rebuilt four times a second, not an all-to-all check every frame), then each
  // animal takes a look round on its own staggered beat. What it does about what it sees comes from its kind and its temperament: a shy fish
  // darts for the nearest real cover when something much bigger comes close, and the big one notices it go; a curious one goes to look at
  // something new in the tank. Familiar faces are counted, for relationships to grow from. ──
  senseTick(dt) {
    this.gridT = (this.gridT ?? 0) - dt; const C = 2;
    if (this.gridT <= 0) { this.gridT = 0.25; const G = (this.grid = new Map()); for (const f of this.list) { if (f.dead || f.visitor || f.away || f.group?.visible === false) continue; const k = Math.floor(f.pos.x / C) + ',' + Math.floor(f.pos.z / C); (G.get(k) ?? G.set(k, []).get(k)).push(f); } }
    const decor = this.state?.decor ?? [], ids = new Set(decor.map((d) => d.id));
    if (!this.seenDecor) this.seenDecor = ids; else if (decor.length !== this.seenDecor.size || decor.some((d) => !this.seenDecor.has(d.id))) { const fresh = decor.filter((d) => !this.seenDecor.has(d.id)); this.seenDecor = ids; this.fresh = fresh.map((d) => ({ d, until: performance.now() + 90e3 })); }
    for (const f of this.list) {
      if (f.dead || f.visitor || f.crab || f.nursery || f.sleepy) continue; f.senseT = (f.senseT ?? Math.random() * 0.5) - dt; if (f.senseT > 0) continue; f.senseT = 0.5;
      const k = habitKind(f.sk), T = (f.htemper ??= temperOf({ species: f.sk, traits: f.profile?.traits })), cx = Math.floor(f.pos.x / C), cz = Math.floor(f.pos.z / C), near = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of this.grid?.get(cx + i + ',' + (cz + j)) ?? []) if (o !== f && Math.abs(o.pos.y - f.pos.y) < 2.5 && o.pos.distanceTo(f.pos) < 2.4) near.push(o);
      for (const o of near) (f.knowT ||= {})[o.fid] = (f.knowT[o.fid] ?? 0) + 0.5;      // seconds spent near each other (relationships grow from this)
      if ((k === 'fish' || k === 'bottom') && T.cover >= 0.5 && !(f.coverT > 0)) {
        const size = (o) => (o.species?.move === 'jet' ? 4 : habitKind(o.sk) === 'turtle' ? 6 : (o.species?.length ?? 40) * (o.species?.vox ?? 0.04)) * (o.growth ?? 1), big = near.find((o) => o.sk !== f.sk && size(o) > size(f) * 1.8 && o.pos.distanceTo(f.pos) < 1.7);      // (body size, from the model)
        if (big && Math.random() < T.cover) { const hide = decor.filter((d) => affordOf(d.type).shelter >= 0.6).map((d) => ({ d, n: Math.hypot(d.x - f.pos.x, d.z - f.pos.z) })).filter((q) => q.n < 5).sort((a, b) => a.n - b.n)[0];
          if (hide) { f.target.set(hide.d.x + (Math.random() - 0.5) * 0.5, Math.max(sandH(hide.d.x, hide.d.z) + 0.5, 0.9), hide.d.z + 0.45); f.retarget = 4; f.idle = 3; f.coverT = 10; f.coverAt = hide.d.id; f.restK = 0; f.settle = null; f.thought = `Took cover by the ${(DECOR_DEF[hide.d.type]?.label ?? 'rock').toLowerCase()}`; f.coverFrom = big.fid;
            if (big.species?.move === 'jet') big.gazeT = Math.max(big.gazeT ?? 0, 1.2); else if (big.sk === 'seahorse') { big.glance = f.pos.clone(); big.glanceT = 1; } } }      // (and the big one turns to watch it go)
      }
      f.coverT = Math.max(0, (f.coverT ?? 0) - 0.5);
      if (f.settle) { const S = f.settle; if (f.seeking || f.clean || (f.fleeT ?? 0) > 0 || (f.coverT ?? 0) > 0 || (S.o && (S.o.dead || S.o.seeking))) f.settle = null;      /* food, fright or work comes first */
        else if (f.pos.distanceTo(f.target) < (S.why === 'pal' ? 1.5 : 0.9)) { const wait = S.why === 'pal' && S.o?.settle ? 4 : 0; f.idle = S.dur + wait; f.retarget = S.dur + wait;      /* (the first there waits for its friend) */ f.restK = 1; f.restWith = S.why === 'pal' ? S.o : null; f.settle = null; }      // there: it stays, barely moving its fins (the slow idle swim), for several seconds
        else if ((S.age = (S.age ?? 0) + 0.5) > 20) f.settle = null; }
      if (f.restK && (f.seeking || (f.fleeT ?? 0) > 0)) { f.restK = 0; f.idle = 0; f.restWith = null; } if (f.restK && !(f.idle > 0)) { f.restK = 0; f.restWith = null; }
      if (this.fresh?.length && (k === 'fish' || k === 'turtle' || k === 'bottom') && !(f.lookedNew > performance.now()) && !(f.restK && f.idle > 0)) {      /* (a resting fish finishes its rest first) */ const q = this.fresh.find((x) => x.until > performance.now() && !(f.sawNew ||= new Set()).has(x.d.id));
        if (q) { f.sawNew.add(q.d.id); if (Math.random() < 0.15 + 0.6 * T.roam - 0.3 * T.cover) { const d = q.d; f.target.set(d.x + (Math.random() - 0.5) * 0.6, Math.max(sandH(d.x, d.z) + 0.8, 1), d.z + 0.6); f.retarget = 4; f.lookedNew = performance.now() + 20e3; f.thought = `Came to look at the new ${(DECOR_DEF[d.type]?.label ?? 'thing').toLowerCase()}`; }
          else if (T.cover >= 0.5 && Math.random() < 0.6) { const d = q.d, a = Math.atan2(f.pos.z - d.z, f.pos.x - d.x); f.target.set(d.x + Math.cos(a) * 2.3, Math.max(sandH(d.x, d.z) + 1.4, 1.6), d.z + Math.sin(a) * 2.3); f.retarget = 5; f.idle = 3; f.lookedNew = performance.now() + 20e3; f.thought = `Watching the new ${(DECOR_DEF[d.type]?.label ?? 'thing').toLowerCase()} from a distance`; } } }      // a shy one keeps its distance and watches      // a curious one comes to look; a shy one hangs back
    }
  }
  // a soft dark disc on the sand under each animal, smaller and fainter the higher it swims: it grounds them in the tank (the real shadow
  // pass only catches animals near the floor, and the sun is in front so most of it falls behind)
  shadeTick() {
    this.shadeTex ||= (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(0.55, 'rgba(0,0,0,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
    for (const f of this.list) {
      const hide = f.dead || f.visitor || f.away || f.group?.visible === false || f.nursery || f.puppet || (f.species?.move === 'jet' && f.hunt) || f.sk === 'seahorse';      /* (a seahorse hangs in the plants: a disc under it reads as a mistake) */
      if (!f.shade) { if (hide) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shadeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; this.scene.add(m); f.shade = m; }
      const m = f.shade; if (hide) { m.visible = false; continue; }
      const gy = sandH(f.pos.x, f.pos.z), h = Math.max(0, f.pos.y - gy), r = (f.radius ?? 0.5) * (f.crab ? 0.5 : 1.15), k = Math.max(0, 1 - h / 7);
      m.visible = k > 0.02; if (!m.visible) continue; m.position.set(f.pos.x, gy + 0.04, f.pos.z); const s = r * (1.1 + h * 0.12); m.scale.set(s * 1.3, s, 1); m.material.opacity = 0.55 * k * k;
    }
  }
  update(dt, t) {
    this.senseTick(dt); this.shadeTick();
    this.denRetry = (this.denRetry ?? 0) - dt; if (this.denRetry <= 0) { this.denRetry = 1.5; for (const f of this.list) if (!f.den && !f.dead && f.species.move === 'jet') { const d = this.recs?.get(f.fid); if (d && (this.spots?.() ?? []).length) this.syncDen(f, d); } }      // the decorations may not have been built when the fish were: an octopus with no den yet looks again
    if ((this.broodT = (this.broodT ?? 0) - dt) <= 0) { this.broodT = 2; const now = Date.now(); for (const f of this.list) if (f.sk === 'seahorse' && f.rec) f.brood = Math.max(broodOf(f.rec, now), f.greet && f.rec.sex === 'm' ? 0.3 : 0);      /* a male puffs his pouch a little as he greets */
      // an octopus nobody has fed for a long time goes listless: from about 60% hunger it lies about more, slower and a little paler, until a crab comes
      for (const f of this.list) if ((f.species?.move === 'jet' || (f.sk === 'seahorse' && !f.nursery)) && f.rec && !f.dead && !f.visitor) {      /* (a seahorse has its own hunger too) */ const k = Math.max(0, Math.min(1, ((f.rec.hunger ?? 0) - 0.6) / 0.3)); if (Math.abs(k - (f.starve ?? 0)) > 0.04 || (k === 0) !== !f.starve) { f.starve = k; f.tmul = this.mulFor(f); this.sicken(f, f.rec); } } }      // a male's brood pouch, as full as his pregnancy says
    // laid to rest: the body sinks slowly and fades away, rather than vanishing
    if (this.rising?.length) this.rising = this.rising.filter((L) => { const f = L.f; L.age += dt; f.strokeK = 1; f.glideK = 0; f.restK = 0; f.headPitch = 0.4; f.neckK = 1; f.flipPh = (f.flipPh ?? 0) + dt * 3.2; f.pitch += (0.5 - f.pitch) * Math.min(1, dt * 2);
      f.group.position.y += dt * (1.2 + L.age * 0.8); f.group.position.z += (-2.5 - f.group.position.z) * Math.min(1, dt * 0.4); f.group.rotation.z = f.pitch; f.setPose(0, false); L.b -= dt; if (L.b <= 0) { L.b = 0.35; this.burst(f.group.position.clone()); }
      if (L.age < 5 && f.group.position.y < Fish3D.topY + 4) return true; this.scene.remove(f.group); if (f.shade) { this.scene.remove(f.shade); f.shade.geometry.dispose(); f.shade.material.dispose(); f.shade = null; }; return false; });      // up through the surface on long strokes, trailing bubbles, and gone
    if (this.leaving?.length) this.leaving = this.leaving.filter((L) => { L.age += dt; const q = Math.min(1, L.age / 2.6), e = q * q * (3 - 2 * q); L.f.group.position.y = L.y - e * 2.2; L.f.group.scale.setScalar(L.s * (1 - 0.85 * e)); L.f.group.rotation.z += dt * 0.25; if (q < 1) return true; this.scene.remove(L.f.group); return false; });
    if (this.out) for (const f of this.out.values()) if (f.puppet) f.puppet(dt);      // an octopus on its way out over the rim
    if ((this.keepT = (this.keepT ?? 30) - dt) <= 0) { this.keepT = 70 + this.rng() * 90;      // now and then an octopus goes and looks over a keepsake it brought home (its favorite most often)
      const ks = this.keepSpots?.() ?? []; for (const f of this.list) { if (f.species?.move !== 'jet' || f.dead || f.puppet || f.inspect || f.task || f.hunt || f.jarAt || !ks.length) continue;
        const mine = ks.filter((k) => k.by === f.fid), fav = mine.find((k) => k.id === f.rec?.advMem?.fav), pool = mine.length ? mine : ks; if (this.rng() > (mine.length ? 0.5 : 0.15)) continue;
        const q = fav && this.rng() < 0.6 ? fav : pool[(this.rng() * pool.length) | 0], den = this.denOf(f); if ((f.keepNo?.[q.id] ?? 0) > Date.now()) continue;
        // one it is attached to, lying away from its den: it may pick it up and take it home, more readily when nobody has been tapping or looking for a while
        // what it knows (Living History: f.rec.mem.keeps, earned by handling it): a known one it treats as its own, a strange one it only looks over
        const known = (f.rec?.mem?.keeps?.[q.id]?.k ?? 0) >= 0.3, ty = f.mind?.type, watched = Date.now() - (this.attnAt ?? 0) < 60e3, quiet = !watched && Date.now() - (this.attnAt ?? 0) > 90e3;
        const attach = known ? 1 : q.by === f.fid ? 0.6 : 0.15, coll = ty === 'collector' ? 1.5 : ty === 'trickster' ? 1.3 : ty === 'homebody' ? 1.1 : ty === 'showoff' && watched ? 1.6 : 0.8, far = den ? Math.hypot(q.x - den.x, q.z - den.z) : 0;
        const reach = ty === 'explorer' ? 1.3 + Math.min(1, far / 4) : 1, tidy = ty === 'trickster' && far <= 1.3 && known && this.rng() < 0.3;      // an explorer goes further for things; a trickster rearranges what is already home
        if (den && (far > 1.3 || tidy) && this.rng() < (quiet ? 0.55 : 0.25) * attach * coll * reach) { f.keepCarry = { id: q.id, phase: 'go', t: 0, dest: this.keepDest(f, q, den, watched) }; f.thought = known ? `Going to fetch its ${KEEPNAME[q.kind] ?? 'keepsake'}` : 'Going to fetch something new'; }
        f.inspect = { x: q.x, z: q.z, id: q.id, type: 'keep' }; if (!f.keepCarry) f.thought = known ? `Checking on its ${KEEPNAME[q.kind] ?? 'keepsake'}` : 'Investigating a strange object'; f.keepWhy = { id: q.id, known, thought: f.thought }; } }
    this.carryTick(dt); this.crabTick(dt); this.tugTick(dt); this.quirkTick(dt);
    gripWork(1.5);      // looking for real places to hold on, within a small time budget each frame (see grips.js)
    this.socialTick(dt); this.reefTick(dt, t); this.seahorseTick(dt, t); this.babyTick(dt); this.hatchTick(dt); this.octoAware(dt); this.haulTick(dt, t);
    for (const k of this.inks ?? []) { k.age += dt; if (k.age < 0) continue; if (k.vz) { k.m.position.z += k.vz * dt; const dr = Math.exp(-(k.drag ?? 0) * dt); k.vx *= dr; k.vy *= dr; k.vz *= dr; } const q = k.age / (k.life ?? 4); k.m.scale.setScalar(1 + q * (k.grow ?? 3.2)); k.m.position.x += k.vx * dt; k.m.position.y += k.vy * dt; k.m.material.opacity = (k.op ?? 0.55) * Math.max(0, 1 - q) * Math.min(1, k.age * 6); }
    if (this.inks?.length) this.inks = this.inks.filter((k) => { if (k.age < (k.life ?? 4)) return true; this.scene.remove(k.m); this.onSpriteGone?.(k.m); return false; });
    if (this.thrown?.length) this.thrown = this.thrown.filter((k) => { k.age += dt; k.vy -= 4.5 * dt; k.m.position.x += k.vx * dt; k.m.position.y += k.vy * dt; k.m.position.z += k.vz * dt; k.m.rotation.x += 7 * dt; if (k.m.position.y <= 0.1 && k.age > 0.2) { this.scene.remove(k.m); this.looseShell({ x: Math.max(-4, Math.min(4, k.m.position.x)) - 0.45, z: Math.max(0.3, Math.min(2.6, k.m.position.z)) - 0.5 }); return false; } return true; });      // a flung shell flies, lands and lies there
    if (this.crabs?.length) { const old = this.crabs.filter((c) => !c.held && (c.age = (c.age ?? 0) + dt) > 150); for (const c of old) { for (const f of this.list) { if (f.hunt === c) f.hunt = null; if (f.hunts) f.hunts = f.hunts.filter((h) => h !== c); } this.eatCrab(c); } }
    // a crab on the sand is not easy prey: when the octopus closes in it scuttles off in a burst (away, and a little sideways), twice at most, then it tires and the octopus has it
    for (const c of this.crabs ?? []) {
      const R = (c.run ||= { dodges: 0, burst: 0, vx: 0, vz: 0, down: 0, face: this.rng() * 6.28 }), hunter = this.list.find((o) => o.hunt === c);
      c.mesh.userData.tick?.(t * (c.held ? 1.6 : R.burst > 0 ? 2.2 : 1), c.held || c.pinned ? 1 : R.burst > 0 ? 0.8 : c.y > sandH(c.x, c.z) + 0.2 ? 0.6 : 0); if (c.held) continue;
      if (c.dazed > performance.now() && !c.pinned) { c.mesh.rotation.z = Math.sin(t * 7) * 0.1; c.mesh.rotation.y += dt * 0.6; } else if (!c.held && c.mesh.rotation.z && Math.abs(c.mesh.rotation.z) < 0.2) c.mesh.rotation.z *= 0.9;      // dazed in the ink: it reels on the spot
      if (c.net && performance.now() - c.net.at < 1200) { const k = Math.min(1, dt * 9), N = c.net; c.x += (N.x - c.x) * k; c.y += (N.y - c.y) * k; c.z += (N.z - c.z) * k; c.mesh.position.set(c.x, c.y, c.z); let dr = N.ry - c.mesh.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.mesh.rotation.y += dr * k; continue; }
      const cg = sandH(c.x, c.z) + 0.13; if (c.y > cg + 0.01) { c.y = Math.max(cg, c.y - 1.9 * dt); c.mesh.position.set(c.x + Math.sin(t * 2 + c.x) * 0.12, c.y, c.z); c.mesh.rotation.y += dt * 0.9; continue; }
      R.down += dt; R.burst -= dt;
      if (hunter && !c.pinned && !(c.dazed > performance.now()) && R.burst <= -0.5 && R.dodges < 2 && R.down < 9) { const dx = c.x - hunter.pos.x, dz = c.z - hunter.pos.z, d = Math.hypot(dx, dz); if (d < 2.1) { const a = Math.atan2(dz, dx) + (this.rng() < 0.5 ? 1 : -1) * (0.6 + this.rng() * 0.6), sp = 1.5; R.vx = Math.cos(a) * sp; R.vz = Math.sin(a) * sp * 0.55; R.burst = 0.75; R.dodges++; R.face = a; } }
      if (R.burst > 0 && !c.pinned) { c.x = Math.max(-3.6, Math.min(3.6, c.x + R.vx * dt)); c.z = Math.max(-3.4, Math.min(GLASS_Z - 0.6, c.z + R.vz * dt)); c.y = sandH(c.x, c.z) + 0.13; }      // it scuttles over the sand, up and down with it
      let ry = c.mesh.rotation.y, dr = R.face - ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.mesh.rotation.y = ry + dr * Math.min(1, dt * 8);
      c.mesh.position.set(c.x + (c.pinned ? Math.sin(t * 30) * 0.03 : R.burst > 0 ? 0 : Math.sin(t * 4 + c.z) * 0.04), c.y, c.z);
    }
    if (this.loose?.length) { const now = performance.now(); this.loose = this.loose.filter((l) => { if (l.fade && l.until - now < 2000 && l.until > now) l.m.scale.setScalar(Math.max(0.01, (l.m.userData.s0 ??= l.m.scale.x) * (l.until - now) / 2000)); if (now < l.until) return true; this.scene.remove(l.m); return false; }); }
    if (this.jars) for (const [id, jar] of [...this.jars]) { const f = this.byId.get(id); updateJar(jar, dt, t, !!f && f.workK > 0.6, f?.rs?.grab?.kind === 'jar' ? f.rs.grab.twist : null); if (jar.state === 'open' && jar.t > 3.2) { this.scene.remove(jar.root); this.onSpriteGone?.(jar.root); this.jars.delete(id); } }
    if (this.flakes.length && ((this.psT = (this.psT ?? 0) - dt) <= 0)) { this.psT = 2; this.plantSpots = (this.spots?.() ?? []).filter((q) => PLANTS.has(q.type)); }      // where the cover is, looked up now and then
    for (const f of this.flakes) {
      if (f.sucked) { const s = f.sucked, m = s.dead ? null : s.snout(this.tmp2 ||= new THREE.Vector3()); f.suckT = (f.suckT ?? 0) + dt;      // struck: drawn into the snout in a blink, and only then eaten
        if (!m) { f.sucked = null; continue; } f.pos.lerp(m, Math.min(1, dt * 28)); if (f.pos.distanceTo(m) < 0.05 || f.suckT > 0.14) { f.eaten = true; s.meals = (s.meals ?? 0) + 1; if (s.holdfast?.on) s.strikesN = (s.strikesN ?? 0) + 1; this.onEat?.(s); } continue; }
      f.age += dt; if (f.pos.y > sandH(f.pos.x, f.pos.z) + 0.2) {      // food settles on the sand wherever it lands, on any level
        const cur = current(f.pos.x, f.pos.y, f.pos.z, t, this.tmpC ||= new THREE.Vector3());
        if (f.kind === 'mysis') {      // tiny shrimp: they sink quickly to a depth of their own, down where the seahorses hold on, and there they are carried along by the water, with little darts of their own, before they settle
          f.depth ??= sandH(f.pos.x, f.pos.z) + 1.6 + this.rng() * 3.2; const free = f.pos.y <= f.depth;
          f.vx = Math.max(-0.08, Math.min(0.08, (f.vx ?? 0) + (this.rng() - 0.5) * dt * (free ? 0.6 : 0.2))); f.vz = Math.max(-0.06, Math.min(0.06, (f.vz ?? 0) + (this.rng() - 0.5) * dt * (free ? 0.45 : 0.15)));
          // like real mysids they keep near cover: a free one hangs about the nearest plant, in and out of its leaves at stem height, until the water carries it off to another
          let cx = 0, cz = 0; if (free) { f.freeT = (f.freeT ?? 0) + dt; if (!f.cover || (f.coverT = (f.coverT ?? 0) - dt) <= 0) { f.coverT = 3 + this.rng() * 3; let bd = 2.6; f.cover = null; for (const q of (this.plantSpots ??= [])) { const d = Math.hypot(q.x - f.pos.x, q.z - f.pos.z); if (d < bd) { bd = d; f.cover = q; } } if (f.cover && !f.coverY) { f.coverY = true; f.depth = sandH(f.cover.x, f.cover.z) + 2.4 + this.rng() * 2.0; } }
            const q = f.cover; if (q) { const a = t * (0.25 + (f.ph % 1) * 0.2) + f.ph, rr = 0.15 + (f.ph % 1) * 0.6, gx = q.x + Math.cos(a) * rr - f.pos.x, gz = q.z + Math.sin(a) * rr * 0.7 - f.pos.z, gl = Math.hypot(gx, gz) || 1, k = Math.min(0.09, gl * 0.12); cx = (gx / gl) * k; cz = (gz / gl) * k; } }
          const nx = f.pos.x + (f.vx + cur.x + cx) * dt, nz = f.pos.z + (f.vz + cur.z + cz) * dt;
          if (nx < -3.8 || nx > 3.8) f.vx = -f.vx; if (nz < -0.5 || nz > 2.2) f.vz = -f.vz;      // at the glass or the back, it turns along it
          f.pos.x = Math.max(-3.8, Math.min(3.8, nx)); f.pos.z = Math.max(-0.5, Math.min(2.2, nz)); f.pos.y += (free ? (f.depth - f.pos.y) * 0.25 + Math.sin(t * 3 + f.ph) * 0.12 + cur.y : -0.9) * dt; }      // free, it hovers about its depth with little bobs
        else { f.pos.y -= 0.42 * dt; f.pos.x += (Math.sin(t * 1.6 + f.ph) * 0.12 + cur.x * 0.6) * dt; f.pos.z = Math.max(-0.5, Math.min(2.4, f.pos.z + cur.z * 0.6 * dt)); } } }
    this.flakes = this.flakes.filter((f) => !f.eaten && (f.age < 30 || f.sucked));
    this.mesh.count = this.flakes.length;
    this.flakes.forEach((f, i) => { this.m.makeRotationY(f.ph + t * 0.4); this.m.setPosition(f.pos); this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, f.c); });
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // every fish picks its own piece of food; claims spread them out
    const claims = new Map(), W = Fish3D.world, o = this.tmp;
    for (const f of this.list) { if (f.flake && !f.flake.eaten && !f.flake.sucked && this.flakes.includes(f.flake)) claims.set(f.flake, (claims.get(f.flake) || 0) + 1); else f.flake = null; }
    for (const f of this.list) {
      if (f.visitor || f.dead || f.species.move === 'jet') { f.flake = null; f.seeking = false; f.foodMul = 1; continue; }      // an octopus does not eat flakes
      if (f.brood) { f.flake = null; f.seeking = false; f.foodMul = 1; continue; }      // a cardinalfish father with eggs in his mouth eats nothing until they hatch
      if (f.sk === 'seahorse' && f.leadOf?.() !== false && !f.chase && (f.holdfast?.on || f.releaseT > 0)) { f.flake = null; f.seeking = false; f.foodMul = 1; continue; }      // holding on, a seahorse hunts from its stem (see Fish3D.seahorse)
      const tr = f.profile?.traits ?? [], shy = tr.includes('Shy'), greedy = tr.includes('Greedy'), curious = tr.includes('Curious');
      f.hold = (f.hold ?? 0) - dt; f.think = (f.think ?? 0) - dt;
      let fl = f.flake;
      if ((!fl && f.hold <= 0) || (fl && f.think <= 0 && this.rng() < 0.4)) {
        f.think = 0.8 + this.rng() * 1.6;
        let best = null, bs = 1e9;
        for (const c of this.flakes) {
          if (c.eaten || c.sucked || (f.id === 'cory' && c.pos.y > 0.7) || (shy && c.age < 1.8)) continue;
          if (f.nursery && (c.kind !== 'flakes' && c.kind !== 'mysis' || f.pos.distanceTo(c.pos) > 5)) continue;      // a baby goes only for the tiniest bits, and only near it
          if (c.watchedBy && c.watchedBy !== f && c.watchedBy.prey === c && c.watchD < 1.2) continue;      // right in front of a seahorse that is watching it: fair's fair
          if (c.kind === 'mysis' && f.sk !== 'seahorse' && (c.freeT ?? 0) < 8) continue;      // the other fish are slow to notice the seahorses' shrimp: once down among the plants it drifts there a while on the current, and only then do the others come for what is left
          if (W.push) { o.set(0, 0, 0); if (W.push(c.pos, 0.25, o)) continue; }
          const d = f.pos.distanceTo(c.pos); if (d > (c.kind === 'mysis' && f.sk === 'seahorse' ? 16 : 9)) continue;      // its own shrimp, a seahorse comes up for from anywhere
          const sc = d + ((claims.get(c) || 0) - (c === f.flake ? 1 : 0)) * (greedy ? 0.8 : 2.6) + this.rng() * 1.4 - (curious ? Math.max(0, 3 - c.age) * 0.6 : 0) - (c === f.flake ? 1 : 0);
          if (sc < bs) { bs = sc; best = c; }
        }
        if (best !== f.flake) { if (f.flake) claims.set(f.flake, claims.get(f.flake) - 1); if (best) claims.set(best, (claims.get(best) || 0) + 1); }
        fl = best;
      }
      f.flake = fl; f.seeking = !!fl; f.foodMul = fl ? (greedy ? 2.0 : 1.5) : 1;
      if (fl) {
        f.target.copy(fl.pos); f.retarget = 0.3;
        // bite test along the path the mouth traveled this frame (so a fast fish cannot swim through food), with depth counting half
        const m = f.mouth(), a = f.pm ?? m, ab = o.copy(m).sub(a), len2 = ab.lengthSq(), tt = len2 > 1e-6 ? Math.max(0, Math.min(1, (fl.pos.clone().sub(a).dot(ab)) / len2)) : 1;
        const cx = a.x + ab.x * tt - fl.pos.x, cy = a.y + ab.y * tt - fl.pos.y, cz = (a.z + ab.z * tt - fl.pos.z) * 0.5, reach = f.nursery ? 0.22 : f.sk === 'seahorse' ? 0.3 : Math.max(0.45, f.radius * 0.5);
        f.pm = m.clone(); f.nibble = Math.hypot(cx, cy, cz);
        if (f.nibble < reach) { fl.eaten = true; f.flake = null; f.pm = null; f.gulp = 0.35; if (f.sk === 'seahorse') { f.meals = (f.meals ?? 0) + 1; f.strikeT = 0.16; f.strikeSeq = (f.strikeSeq ?? 0) + 1; } this.onEat?.(f); }
      } else f.pm = null;
    }
    for (const f of this.list) if (f.isShy && !f.dead && !(f.fleeT > 0) && !f.seeking) for (const o of this.list) {
      if (o === f || o.id === f.id || o.dead) continue; const dx = f.pos.x - o.pos.x, dy = f.pos.y - o.pos.y, dz = f.pos.z - o.pos.z;
      if (Math.hypot(dx, dy, dz) < 2.1) { const m = Math.hypot(dx, dy, dz) || 1; f.target.set(Math.max(-4, Math.min(4, f.pos.x + dx / m * 3)), Math.max(1, Math.min(12, f.pos.y + dy / m * 2)), Math.max(-2, Math.min(2.6, f.pos.z + dz / m * 2))); f.fleeT = 1.8; f.retarget = 2.5; break; }
    }
    for (const f of this.list) if (f.glow) { f.glow.position.copy(f.pos); const k = 2.6 + Math.sin(t * 2.1) * 0.35; f.glow.scale.set(k, k, 1); }
    this.updateEmotes(t);
    for (const b of this.bursts) { b.age += dt; b.pos.y += b.v * dt; }
    this.bursts = this.bursts.filter((b) => b.age < 1.4);
    this.bm.count = this.bursts.length;
    this.bursts.forEach((b, i) => { const k = b.r * (1 - b.age / 1.6); this.m.makeScale(k, k, k); this.m.setPosition(b.pos); this.bm.setMatrixAt(i, this.m); });
    this.bm.instanceMatrix.needsUpdate = true;
  }
}
