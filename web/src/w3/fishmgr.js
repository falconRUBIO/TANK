// The living roster: spawns a Fish3D for every fish in the game state, grows them, gives each its own
// personality-driven wandering, and runs feeding (flakes sink, each fish picks its own piece).
import * as THREE from 'three';
import { SPECIES } from '../species.js';
import { Fish3D } from './fish3d.js';
import { buildJar, updateJar, buildCrab } from './jar.js';
import { buildHoard, shellMesh } from './den.js';
import { mulberry32 } from '../color.js';
import { SOCIAL, SPECIES_DEF, DECOR_DEF, STAGE_SCALE, hoardOf, octoMind, MOVABLE, MOVE_GAP, MOVE_MAX, AIL_TIRED, AIL_WARN, stageOf, needsOf, FOODS, favFoodOf } from '../game/rules.js';

const BANDS = {
  goldfish: { x: [-3.4, 3.6], y: [3, 10], z: [0.6, 2.0] }, neon: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, blue: { x: [-3.2, 3.4], y: [3, 11], z: [0.5, 1.9] },
  angelfish: { x: [-3.0, 3.6], y: [3, 10], z: [-3.0, -1.8] }, guppy: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, platy: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, danio: { x: [-3.2, 3.4], y: [3, 10], z: [0.6, 1.9] }, betta: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, cory: { x: [-3.4, 3.6], y: [0.35, 0.45], z: [0.6, 2.0] }, seahorse: { x: [-3.0, 3.2], y: [2.5, 9], z: [0.4, 1.8] }, octopus: { x: [-3.2, 3.4], y: [0.6, 3.2], z: [0.6, 2.0] },
};
export const TRAIT_TXT = { Shy: 'Hides behind plants and darts away from other fish.', Brave: 'Swims out front, close to the glass.', Curious: 'Goes to inspect decorations and other fish.', Social: 'Stays close to a buddy.', Playful: 'Restless and quick. Loves the bubbles.', Lazy: 'Drifts low and rests a lot.', Calm: 'Slow, smooth and unbothered.', Greedy: 'Waits near the surface for food.' };
const SPOTS = { Shy: 'Sea Grass', Curious: 'Stone Arch', Playful: 'Bubbles', Lazy: 'Driftwood', Calm: 'Open water', Brave: 'The glass', Social: 'Near friends', Greedy: 'The surface' };
const bubbleSpot = new THREE.Vector3(-3.6, 0, 0.5);

// little speech-bubble icons drawn once per mood
const EMOTE = { Hungry: ['🍤', '#2a1a1a'], Sleepy: ['💤', '#17203a'], Gloomy: ['☁️', '#1e2430'], 'Under the weather': ['🩹', '#2a1a22'] };
const emoteTex = {};
function emoteTexture(mood) {
  if (emoteTex[mood]) return emoteTex[mood];
  const [glyph, bg] = EMOTE[mood], c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(24, 21, 19, 0, 6.3); g.fill(); g.fillRect(14, 34, 8, 8); g.fillStyle = bg; g.globalAlpha = 0.1; g.fillRect(0, 0, 48, 48); g.globalAlpha = 1;
  g.font = '24px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 24, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return (emoteTex[mood] = t);
}
export class Fishes {
  constructor(scene) {
    this.scene = scene; this.list = []; this.byId = new Map(); this.rng = mulberry32(11); this.flakes = [];
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.04, 0.17), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x552200, emissiveIntensity: 0.6 }), 200);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.castShadow = true; scene.add(this.mesh);
    this.cols = [0xff7a1a, 0xffb02a, 0xe8442a, 0x9ad04a].map((c) => new THREE.Color(c));
    this.foodCols = { pellets: [0x8a5a2a, 0x9c6a34, 0x7a4c24, 0xa87a44].map((c) => new THREE.Color(c)), treats: [0xff6fa8, 0xff9ac0, 0xe8508a, 0xffc2d8].map((c) => new THREE.Color(c)) };
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
  sync(state, { arrivals = [] } = {}) {
    this.moveOn = !state.flags?.noRearrange;
    this.world = { water: state.water ?? 1, glass: state.glass ?? 0, hunger: state.hunger ?? 0 };
    { const sig = (state.decor?.length ?? 0) + ':' + state.fish.length + ':' + ((state.glass ?? 0) > 0.5 ? 1 : 0); if (sig !== this.sig) { if (this.sig != null) this.changedAt = performance.now(); this.sig = sig; } }
    const seen = new Set();
    state.fish.forEach((d, idx) => {
      seen.add(d.id); const k = STAGE_SCALE[stageOf(d)];
      let f = this.byId.get(d.id);
      if (!f) {
        const sp = SPECIES[d.species], def = SPECIES_DEF[d.species], band = BANDS[d.species] ?? BANDS.goldfish;
        const back = idx % 2 === 1 && d.species !== 'cory' && d.species !== 'angelfish';
        f = new Fish3D(sp, d.seed, { look: d.pal != null ? { pal: d.pal } : null, genes: d.genes, name: d.name, speed: def.speed * (0.9 + (d.seed % 5) * 0.05), scale: 1, band: back ? { ...band, z: [-3.0, -1.8] } : band });
        f.fid = d.id; f.sk = d.species; f.getSpots = () => this.spots?.() ?? []; f.profile = this.profileOf(d, state); f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1); f.setGrowth(k);
        const arriving = arrivals.includes(d.id);
        f.pos.set(arriving ? (this.rng() - 0.5) * 5 : (this.rng() - 0.5) * 6, arriving ? 13.5 : band.y[0] + this.rng() * (band.y[1] - band.y[0]), (band.z[0] + band.z[1]) / 2);
        if (!arriving) f.pick(this.rng); else { f.target.set(f.pos.x, 8, f.pos.z); f.retarget = 3; this.burst(f.pos); }
        this.relate(f, d); f.home = { x: (((d.seed * 37) % 100) / 100 - 0.5) * 6, y: 3 + (((d.seed * 13) % 100) / 100) * 8 }; this.wrapPick(f, d); this.sicken(f, d); this.makeEmote(f); this.scene.add(f.group); this.list.push(f); this.byId.set(d.id, f);
      } else {
        f.name = d.name; this.relate(f, d); this.sicken(f, d); f.profile = this.profileOf(d, state); f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1);
        if (Math.abs((f.growth ?? 1) - k) > 1e-3) f.setGrowth(k);
      }
    });
    this.syncJars(state);
    for (const x of state.floaters ?? []) {
      seen.add(x.id); let f = this.byId.get(x.id);
      if (!f) { f = new Fish3D(SPECIES[x.species], x.seed, { look: x.pal != null ? { pal: x.pal } : null, name: x.name, speed: 0.5, scale: 1, band: BANDS.goldfish }); f.fid = x.id; f.setGrowth(STAGE_SCALE[x.stage] ?? 1); f.pos.set((this.rng() - 0.5) * 6, 12.7, 1.2); this.scene.add(f.group); this.list.push(f); this.byId.set(x.id, f); }
      if (!f.dead) { f.dead = true; f.floater = true; f.setPale(0.6); f.profile = { traits: [], mood: 'Passed away', needs: [0, 0, 0, 0] }; if (f.emote) { f.emote.visible = false; } this.burst(f.pos); }
    }
    if (state.visitor) { seen.add(state.visitor.id); if (!this.byId.has(state.visitor.id)) this.addVisitor(state.visitor); }
    for (const f of [...this.list]) if (!seen.has(f.fid)) { this.scene.remove(f.group); if (f.glow) { this.scene.remove(f.glow); this.onSpriteGone?.(f.glow); } if (f.emote) { this.scene.remove(f.emote); this.onSpriteGone?.(f.emote); } this.list.splice(this.list.indexOf(f), 1); this.byId.delete(f.fid); }
  }
  makeEmote(f) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, opacity: 0 })); sp.scale.setScalar(0.8); sp.renderOrder = 9; sp.visible = false;
    f.emote = sp; f.emoteSeed = Math.random() * 20; this.scene.add(sp); this.onSprite?.(sp);
  }
  // the mood bubble shows for a few seconds out of every ~14, so the tank stays calm
  updateEmotes(t) {
    for (const f of this.list) {
      const sp = f.emote, mood = f.profile?.mood; if (!sp) continue; if (f.dead) { sp.visible = false; continue; }
      const phase = (t + f.emoteSeed) % 14, show = EMOTE[mood] && (phase < 3.4 || (mood === 'Hungry' && phase < 7)) && !f.group.parent?.userData?.hide;
      const want = show ? Math.min(1, Math.min(phase, 3.4 - phase + 0.4) * 2.5) : 0;
      sp.material.opacity += (want - sp.material.opacity) * 0.2; sp.visible = sp.material.opacity > 0.03;
      if (sp.visible) { if (sp.userData.mood !== mood) { sp.material.map = emoteTexture(mood); sp.material.needsUpdate = true; sp.userData.mood = mood; } sp.position.set(f.pos.x, f.pos.y + f.radius * 0.8 + 0.5 + Math.sin(t * 2 + f.emoteSeed) * 0.05, f.pos.z + 0.4); }
    }
  }
  // Watching: what the fish are really doing, reported once and only when it matters. The server checks every report.
  // A phone only counts what it actually sees, and only while the game is open and visible.
  said(f, key, extra = {}, cool = 600) {
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
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], k = a.fid < b.fid ? a.fid + b.fid : b.fid + a.fid; this.pt ||= {}; const close = a.pos.distanceTo(b.pos) < 1.7 && a.id !== 'neon' && !(a.species.school && a.id === b.id);
      this.pt[k] = close ? (this.pt[k] ?? 0) + dt : 0; if (this.pt[k] > 8 && (this.wants(a, 'together', b) || this.wants(b, 'together', a))) { this.said(a, 'together', { with: b.fid }); this.pt[k] = -20; }
    }
    if (this.rdirty && t - (this.rsave ?? 0) > 25) { this.rsave = t; this.rdirty = false; try { localStorage.setItem('ourtank.routine', JSON.stringify(this.routine)); } catch { /* storage unavailable */ } }
  }
  // ── moving things about: an octopus drags a rock or shell to where it wants it, or lifts a coconut shell and carries it off to live under ──
  haulTick(dt, t) {
    if (!this.decor) return;
    for (const f of this.list) {
      const T = f.task;
      if (T?.stage === 'haul') this.decor.haulMove(T.id, f.pos.x + T.ux * T.hold, f.pos.z + T.uz * T.hold, T.kind === 'home' ? 0.26 + Math.sin(t * 5) * 0.025 : 0.1, T.kind === 'home' ? 0 : null);
      if (f.species.id !== 'octopus' || !f.den?.home || f.den.kind !== 'coconut') continue;
      const it = this.decor.items.get(f.den.id); if (!it || it.haul || it.slide) continue;
      const under = !f.dead && f.st?.s === 'rest' && Math.hypot(f.pos.x - f.den.x, f.pos.z - (f.den.z - 0.3)) < 0.5, g = it.group.position;
      g.y += ((under ? 0.04 + Math.sin(t * 1.3) * 0.012 * (1 - (f.sleepK ?? 0)) : 0) - g.y) * Math.min(1, dt * 2);          // it holds the shell up over itself
    }
  }
  // it walks up to a thing until its arms touch it (off), then carries it held close in front (hold)
  beginTask(f, pl) {
    const at = this.decor.atOf(pl.id), type = (this.spots?.() ?? []).find((q) => q.id === pl.id)?.type, r = this.decor.reach(type), off = r + 0.8 * (f.radius ?? 2) + (f.cr ?? 0.6), hold = Math.max(0.5, r * 0.85), L = Math.hypot(pl.gx - at.x, pl.gz - at.z) || 1;
    f.task = { ...pl, type, off, hold, stage: 'go', ux: (pl.gx - at.x) / L, uz: (pl.gz - at.z) / L, t0: performance.now() }; f.task.ax = at.x - f.task.ux * off; f.task.az = at.z - f.task.uz * off; f.startTask(f.task);
  }
  taskEvent(f, ev) {
    const T = f.task, dc = this.decor; if (!T || !dc) return false;
    if (ev === 'grab') { const at = dc.atOf(T.id); if (!at || Math.hypot(at.x - f.pos.x, at.z - f.pos.z) > T.off + 1.0 || !dc.haulBegin(T.id)) { f.task = null; return false; } T.stage = 'haul'; return true; }
    if (ev === 'drop') {
      const good = Math.hypot(T.gx - (f.pos.x + T.ux * T.hold), T.gz - (f.pos.z + T.uz * T.hold)) < 1.0;
      if (good) { dc.haulEnd(T.id, T.gx, T.gz, T.kind === 'home' ? 0 : null); T.stage = 'placed'; f.movedAt = Date.now(); this.onMove?.({ fish: f.fid, id: T.id, x: T.gx, z: T.gz, home: T.kind === 'home', ry: 0 }); if (T.kind !== 'home') f.task = null; } else { dc.haulCancel(T.id); (f.failed ||= []).push({ x: T.gx, z: T.gz }); if (f.failed.length > 6) f.failed.shift(); f.task = null; }
      return good;
    }
    if (ev === 'abort') { if (T.stage === 'haul') dc.haulCancel(T.id); f.task = null; return false; }
    if (ev === 'home') { f.task = null; return true; }
    return false;
  }
  // an octopus makes up its mind to rearrange something: only the phone in charge of the fish decides, and the move is reported to the game when it is done
  planMove(f, M) {
    const dc = this.decor, spots = this.spots?.() ?? []; if (!dc || !spots.length) return null;
    const mine = new Set(this.list.map((o) => o.homeId).filter(Boolean)), rnd = () => this.rng();
    const free = (id, x, z) => x > -3.7 && x < 3.7 && z > -0.4 && z < 2.4 && dc.roomFor(id, x, z);
    const bad = (x, z) => (f.failed ?? []).some((q) => Math.hypot(q.x - x, q.z - z) < 0.9);
    const home = !f.homeId && spots.filter((q) => (q.type === 'coconut' || q.type === 'pot') && !mine.has(q.id)).sort((a, b) => (a.type === 'coconut' ? 0 : 1) - (b.type === 'coconut' ? 0 : 1))[0];
    if (home && rnd() < 0.7) {                                                                                  // a coconut and nowhere to live: carry it to a quiet corner
      const at = dc.atOf(home.id), want = f.fav ? [f.fav.x, f.fav.z] : null;
      for (let i = 0; i < 16; i++) { const sx = rnd() < 0.5 ? -1 : 1, x = want && i < 4 ? want[0] + (rnd() - 0.5) : sx * (2.4 + rnd() * 1.3), z = 0.2 + rnd() * 1.3; if (!bad(x, z) && Math.hypot(x - at.x, z - at.z) <= MOVE_MAX - 0.3 && Math.hypot(x - at.x, z - at.z) > 0.8 && free(home.id, x, z)) return { kind: 'home', id: home.id, gx: x, gz: z }; }
      return null;
    }
    const movers = spots.filter((q) => ['rock', 'skull'].includes(q.type) && Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 5);
    if (!movers.length) return null;
    if (!f.homeId && f.den?.kind !== 'rocks' && movers.length >= 2 && M.tidy > 0.3) {                                                // no shell or pot to live in: it gathers rocks into a shelter at its favourite spot
      const c = f.fav ?? { x: f.pos.x, z: f.pos.z }, cx = Math.max(-3.2, Math.min(3.2, c.x)), cz = Math.max(0.3, Math.min(1.9, c.z));
      const there = movers.filter((q) => Math.hypot(q.x - cx, q.z - cz) < 1.5), away = movers.filter((q) => Math.hypot(q.x - cx, q.z - cz) >= 1.5).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
      for (const m of away.slice(0, 3)) for (let i = 0; i < 10; i++) { const a = (there.length + i) * 2.1 + rnd() * 0.6; let x = cx + Math.cos(a) * 1.1, z = cz + Math.sin(a) * 0.75; const L = Math.hypot(x - m.x, z - m.z); if (L > MOVE_MAX) { x = m.x + ((x - m.x) / L) * (MOVE_MAX - 0.4); z = m.z + ((z - m.z) / L) * (MOVE_MAX - 0.4); }      // too far for one trip: bring it part of the way
        if (!bad(x, z) && Math.hypot(x - m.x, z - m.z) > 0.6 && free(m.id, x, z)) return { kind: 'build', id: m.id, gx: x, gz: z }; }
    }
    const m = movers[(rnd() * movers.length) | 0], homeSpot = f.den;
    for (let i = 0; i < 12; i++) {
      let x, z;
      if (homeSpot && M.tidy > 0.45) { const sx = rnd() < 0.5 ? -1 : 1; x = homeSpot.x + sx * (0.85 + rnd() * 0.3); z = homeSpot.z - 0.1 + rnd() * 0.5; }                // a wall beside its den
      else { const a = rnd() * 6.28, r = 1 + rnd() * 1.4; x = m.x + Math.cos(a) * r; z = m.z + Math.sin(a) * r * 0.5; }                           // shoves it about to see what happens
      if (!bad(x, z) && Math.hypot(x - m.x, z - m.z) > 0.6 && Math.hypot(x - m.x, z - m.z) <= MOVE_MAX && free(m.id, x, z)) return { kind: 'push', id: m.id, gx: x, gz: z };
    }
    return null;
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
      f.sulk = Math.max(0, Math.min(1, Math.max((0.62 - W.water) / 0.3, (W.glass - 0.6) / 0.3, (W.hunger - 0.7) / 0.3)));
      const bonded = (f.bondIds ?? []).some((i) => people.has(i)); f.audience = bonded ? 1 : people.size > 0 ? 0.35 : 0;
      f.bored = Math.max(0, Math.min(1, (calm - 8 * (1.4 - M.cur)) / 20)) * (0.4 + 0.6 * M.cur);
      const S = f.st; let th = '';
      if (f.sulk > 0.5) th = W.water < 0.62 ? 'Sulking in the cloudy water.' : W.glass > 0.6 ? 'Cannot see out through the dirty glass.' : 'Hungry and a bit grumpy.';
      else if (S?.s === 'work' && S.mode === 'greet') th = 'Come to say hello at the glass.';
      else if (S?.s === 'work' && S.mode === 'inspect') th = f.inspect && this.list.some((o) => o !== f && !o.dead && Math.hypot(o.pos.x - f.inspect.x, o.pos.z - f.inspect.z) < 1.2) ? 'Watching a neighbour.' : 'Examining something with its arms.';
      else if (f.sleepK > 0.6) th = 'Asleep. Its skin is dreaming.';
      else if (f.audience >= 1 && f.bondMe >= 1) th = 'Knows you are here.';
      else if (f.bored > 0.5) th = M.cur > 0.6 ? 'Restless. Nothing new in a while.' : 'A little bored.';
      else if (f.fearNear) th = 'Avoiding a spot that scared it.';
      else if (S?.s === 'rest' && f.den && Math.hypot(f.pos.x - f.den.x, f.pos.z - f.den.z) < 1.2) th = f.den.home ? (f.den.kind === 'pot' ? 'Curled up in its pot.' : 'Tucked into its coconut shell.') : f.den.kind === 'rocks' ? 'Home in the rock shelter it built.' : 'Home in its den.';
      f.thought = th;
      { const lk = f.likes && Object.entries(f.likes).sort((a, b) => b[1] - a[1])[0]; const sp = lk && lk[1] >= 3 ? (f.getSpots?.() ?? []).find((x) => x.id === lk[0]) : null; f.favThing = sp ? (DECOR_DEF[sp.type]?.label ?? null) : null; }
      if (M.type === 'showoff' && f.audience >= 1 && f.bondMe >= 1 && S?.s === 'rest' && !S.mode && !f.shy && this.rng() < 0.1) f.glassAt = { x: (this.rng() - 0.5) * 3, y: 2.5 + this.rng() * 3, until: performance.now() + 5000 };       // an audience it knows: it goes and shows off at the glass
      for (const o of this.list) if (o !== f && o.species.id === 'octopus' && !o.dead && o.mind && Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) < 2.4) {
        if (M.soc < 0.4 && S?.s !== 'jet') { f.annoyT = Math.max(f.annoyT, 3); f.fearNear = false; if (S?.s === 'rest' && !S.mode) { S.s = 'crawl'; S.t = 6; f.target.set(Math.max(-3.5, Math.min(3.5, f.pos.x + (f.pos.x >= o.pos.x ? 2.6 : -2.6))), 0.55, f.pos.z); } th = `Keeping its distance from ${o.name}.`; }
        else if (M.soc >= 0.55 && o.mind.soc >= 0.55 && S?.s === 'rest' && !S.mode && !f.inspect && this.rng() < 0.2) { f.inspect = { x: o.pos.x, z: o.pos.z }; th = `Getting to know ${o.name}.`; }
        break;
      }
      if (f.task) th = f.task.kind === 'home' ? `Carrying a ${(DECOR_DEF[(f.getSpots?.() ?? []).find((q) => q.id === f.task.id)?.type]?.label ?? 'shell').toLowerCase()} to a quiet corner.` : f.task.kind === 'build' ? 'Building a shelter out of rocks.' : 'Moving a stone where it wants it.';
      f.thought = th;
      if (!f.task && this.moveOn && this.canMove?.() && f.adultish && !f.shy && f.sulk < 0.5 && S?.s === 'rest' && !S.mode && !f.hunt && !f.jarAt && !f.inspect && !f.isNight && (f.sleepK ?? 0) < 0.2 && Date.now() - (f.movedAt ?? 0) > MOVE_GAP && this.rng() < 0.012 + 0.03 * M.tidy + 0.015 * M.cur) {
        const pl = this.planMove(f, M); if (pl) this.beginTask(f, pl);
      }
      if (M.type === 'trickster' && S?.s === 'rest' && !S.mode && !f.shy && this.rng() < 0.12) { const o = this.list.filter((q) => q !== f && !q.dead && !q.visitor && q.species.id !== 'octopus' && q.pos.distanceTo(f.pos) < 4 && q.pos.y < 6); if (o.length) { f.prank = o[(this.rng() * o.length) | 0]; f.inspect = { x: f.prank.pos.x, z: f.prank.pos.z }; } }
      if (f.prank) { const o = f.prank; if (o.dead || Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) < 1.7) { if (!o.dead) { o.fleeT = 1.2; o.target.set(Math.max(-4, Math.min(4, o.pos.x + (o.pos.x > f.pos.x ? 2.5 : -2.5))), Math.min(12, o.pos.y + 1), o.pos.z); o.retarget = 2; } f.prank = null; } else if (S?.s === 'rest' && S.t <= 0) f.prank = null; }
      if ((f.fav || f.likes) && f.favDirty) { f.favDirty = false; const all = this.loadOcto(); all[f.fid] = { x: f.fav ? +f.fav.x.toFixed(2) : undefined, z: f.fav ? +f.fav.z.toFixed(2) : undefined, likes: f.likes }; try { localStorage.setItem('ourtank.octo', JSON.stringify(all)); } catch { /* storage unavailable */ } }
    }
  }
  loadRoutine() { try { return JSON.parse(localStorage.getItem('ourtank.routine') || '{}'); } catch { return {}; } }
  // who a fish belongs to and who it likes: its original caretaker, or whoever has bonded with it most
  relate(f, d) {
    if (d.species === 'octopus') { f.bondMe = (d.bond?.[this.me] ?? 0) + (d.owner === this.me ? 1 : 0); f.shy = f.bondMe === 0 && stageOf(d) !== 'baby'; }       // it knows who has looked after it, and keeps to itself around someone it has never met
    if (d.species === 'octopus') { f.mind = octoMind(d); f.bold = f.mind.bold; }
    if (d.species === 'octopus') { f.movedAt = d.movedAt ?? 0; f.homeId = d.home ?? null; f.adultish = stageOf(d) !== 'baby'; f.onTask = (fish, ev) => this.taskEvent(fish, ev); }
    if (d.species === 'octopus') { f.bondIds = Object.entries(d.bond ?? {}).filter(([, v]) => v >= 1).map(([i]) => i).concat(d.owner ? [d.owner] : []); if (!f.fav && !f.likes) { const sv = this.loadOcto()[d.id]; if (sv) { if (sv.x != null) f.fav = { x: sv.x, z: sv.z, n: 8 }; if (sv.likes) f.likes = sv.likes; } } }
    if (d.species === 'octopus') this.syncDen(f, d);
    f.disc = d.disc ?? {}; f.palId = d.pal ?? null; f.spotId = d.spotId ?? null; f.ownerId = d.owner ?? null;
    const top = Object.entries(d.bond ?? {}).sort((a, b) => b[1] - a[1])[0]; f.mine = !!this.me && (d.owner === this.me || (top && top[1] >= 3 && top[0] === this.me));
  }
  // fish that are going without care look pale and tired, and keep low
  sicken(f, d) {
    const ail = d.ail ?? 0, k = ail >= AIL_WARN ? 0.55 : ail >= AIL_TIRED ? 0.3 : 0, weak = ail >= AIL_WARN, tired = ail >= AIL_TIRED;
    f.setPale(k); if (f.weak !== weak || f.tired !== tired) { f.weak = weak; f.tired = tired; f.tmul = this.mulFor(f); }
  }
  mulFor(f) { return (f.baseT ?? 1) * (this.night ? (f.isShy ? 1.1 : 0.6) : 1) * (f.weak ? 0.5 : f.tired ? 0.8 : 1); }
  // a rare visitor swims in from the side, glowing softly, until it is greeted or leaves
  addVisitor(v) {
    const sp = SPECIES[v.species], def = SPECIES_DEF[v.species]; if (!sp) return;
    const f = new Fish3D(sp, v.seed, { name: def.label, speed: def.speed, scale: 1, band: BANDS.goldfish });
    f.fid = v.id; f.visitor = true; f.vigor = 1; f.profile = { traits: def.traits, mood: 'Visiting', needs: [1, 1, 1, 1] }; f.setGrowth(1);
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
      base(r); const mood = f.profile?.mood, spots = this.spots?.() ?? [], others = this.list.filter((o) => o !== f);
      const T = (x, y, z, rt) => { f.target.set(Math.max(-4, Math.min(4, x)), Math.max(0.8, Math.min(Fish3D.topY - 0.3, y)), Math.max(-2, Math.min(2.8, z))); f.retarget = rt; };
      f.idle = 0;
      if (f.script?.length) { const w = f.script.shift(); return T(w.x, w.y, w.z, w.rt ?? 1.3); }       // a trick being performed
      if (f.weak) return T(-2.5 + r() * 5, 0.9 + r() * 1.4, 0.4 + r() * 1.6, 8);
      // what each kind of fish really does: the clownfish lives in its anemone, the gramma claims a cave (and rests upside down under it), the cardinalfish hides in shade by day,
      // the goby keeps watch low on the sand, and the dragonet picks over the rocks all day
      if (this.rain && (has('Curious') || has('Playful')) && !f.weak && r() < 0.4) return T(-3 + r() * 6, 11 + r() * 2, 0.8 + r() * 1.2, 3 + r() * 3);       // on a rainy day the curious ones drift up to look
      f.invert = false; const sk = f.sk, spot = (cats, types) => { const c = spots.filter((x) => (types && types.includes(x.type)) || (cats && cats.includes(DECOR_DEF[x.type]?.cat))); return c.length ? c[(f.seed ?? 0) % c.length] : null; };
      if (sk === 'goldfish') { const a = spot(null, ['anemone']); if (a && r() < 0.7) return T(a.x + (r() - 0.5) * 1.1, 1.0 + a.h * 0.5 + r() * 0.7, a.z + 0.5 + r() * 0.3, 3 + r() * 3); }
      if (sk === 'blue') { const c = spot(['ROCKS', 'STRUCTURES']); if (c && r() < 0.65) { f.invert = r() < 0.7; return T(c.x + (r() - 0.5) * 0.8, f.invert ? 0.9 + c.h * 0.75 : 1.0 + c.h * 0.4, c.z + 0.6, 5 + r() * 5); } }
      if (sk === 'platy' && !this.night) { const c = spot(['STRUCTURES', 'ROCKS']); if (c && r() < 0.6) return T(c.x + (r() - 0.5) * 0.9, 1.0 + c.h * 0.45, c.z + 0.5, 6 + r() * 5); }
      if (sk === 'cory') { const c = spot(['ROCKS']); if (r() < 0.6) { f.idle = 2 + r() * 3; return T(c ? c.x + (r() - 0.5) * 1.4 : -3 + r() * 6, 0.9 + r() * 0.5, c ? c.z + 0.7 : 0.8 + r(), 5 + r() * 4); } }
      if (sk === 'betta') { const c = spot(['ROCKS']); if (c && r() < 0.65) { f.idle = 3 + r() * 3; return T(c.x + (r() - 0.5) * 1.2, 1.0 + c.h * 0.35 + r() * 0.5, c.z + 0.6, 6 + r() * 4); } }
      // identity: a fish swims out to the glass for its own caretaker, goes back to its favourite spot, stays near its best friend, and has a corner of the tank it prefers
      if (f.mine && r() < (has('Shy') ? 0.1 : 0.25)) return T(-1.5 + r() * 3, 4 + r() * 6, 2.5 + r() * 0.4, 4);
      if (f.spotId && r() < 0.3) { const sp = spots.find((x) => x.id === f.spotId); if (sp) return T(sp.x + (r() - 0.5) * 0.8, 0.9 + sp.h * 0.4, sp.z + 0.9, 5); }
      if (f.palId && r() < 0.45) { const o = this.byId.get(f.palId); if (o && !o.dead) return T(o.pos.x - Math.cos(o.heading) * 1.4 + (r() - 0.5), o.pos.y + (r() - 0.5) * 0.8, o.pos.z + (r() - 0.5) * 0.5, 2.5); }
      if (f.home && r() < 0.22) return T(f.home.x + (r() - 0.5) * 1.6, f.home.y + (r() - 0.5) * 2, 0.4 + r() * 1.6, 4);
      if (this.night && !has('Playful')) {
        if (has('Shy')) return T(-3 + r() * 6, 4 + r() * 6, 0.8 + r() * 1.8, 4 + r() * 3);
        if (r() < 0.5) f.idle = 4; return T(-3.4 + r() * 6.8, 0.9 + r() * 2.2, -1 + r() * 2.5, 7 + r() * 4);
      }
      if (mood === 'Hungry' && r() < 0.5 && f.id !== 'cory') return T(-2.5 + r() * 5, 9 + r() * 2.5, 0.8 + r() * 1.2, 4);
      if (mood === 'Sleepy') return T(-3 + r() * 6, 1 + r() * 2.2, f.target.z, 8);
      if (has('Shy') && r() < 0.75) {                                              // tucks in behind plants and decorations, or hugs the back wall
        const s = spots.length ? spots[(r() * spots.length) | 0] : null;
        return s ? T(s.x + (r() - 0.5) * 0.8, 0.9 + r() * Math.max(0.6, s.h * 0.5), s.z - 0.9 - r() * 0.4, 6 + r() * 4) : T(-3.4 + r() * 7, 1 + r() * 2.5, -1.6 - r() * 1.2, 6 + r() * 4);
      }
      if (has('Brave') && r() < 0.6) return T(-2 + r() * 4, 3 + r() * 7, 2.2 + r() * 0.6, 3 + r() * 3);   // swims out front, close to the glass
      if (has('Curious') && r() < 0.65) {                                          // goes to inspect decorations and other fish
        if (spots.length && r() < 0.7) { const s = spots[(r() * spots.length) | 0]; return T(s.x + (r() - 0.5) * 0.8, 1 + s.h * 0.55, s.z + 1.2, 3.5); }
        const o = others[(r() * others.length) | 0]; if (o) return T(o.pos.x + (r() - 0.5) * 1.6, o.pos.y + (r() - 0.5), o.pos.z + 0.6, 3);
      }
      if (has('Social') && !school && r() < 0.7 && others.length) {                // sticks close to a buddy
        const mates = others.filter((o) => o.id === f.id), pool = mates.length ? mates : others, o = pool.reduce((a, c) => (c.pos.distanceTo(f.pos) < a.pos.distanceTo(f.pos) ? c : a), pool[0]);
        return T(o.pos.x - Math.cos(o.heading) * 1.6 + (r() - 0.5), o.pos.y + (r() - 0.5) * 0.8, o.pos.z + (r() - 0.5) * 0.5, 2.2);
      }
      if (has('Playful')) { f.retarget = 1.4 + r() * 1.4; if (r() < 0.4) T(this.bubbleAt.x + (r() - 0.5) * 0.8, 2 + r() * 8, 0.2 + r(), 2 + r()); return; }
      if (has('Lazy')) { f.target.y = 1 + r() * 2.5; f.retarget = 7 + r() * 5; if (r() < 0.4) f.idle = 3; return; }
      if (has('Greedy') && r() < 0.5) return T(-2.5 + r() * 5, 10.5 + r() * 3, 0.8 + r() * 1.6, 4);   // waits near the surface where food falls
      if (has('Calm')) f.retarget += 3;
    };
  }
  // Show a trick: a scripted route through or around a decoration, then back to normal wandering.
  perform(f, kind, spotId) {
    const s = (this.spots?.() ?? []).find((x) => x.id === spotId); if (!s || f.dead) return false; const y = 0.9 + s.h * 0.35, z = s.z + 0.15;
    f.script = kind === 'bubbles'
      ? [{ x: s.x, y: 1.4, z }, { x: s.x, y: 8, z }, { x: s.x + 0.9, y: 5, z }, { x: s.x - 0.4, y: 8.5, z }, { x: s.x, y: 2, z }]
      : [{ x: s.x - 2.4, y, z }, { x: s.x, y, z, rt: 1.1 }, { x: s.x + 2.4, y, z }, { x: s.x, y, z, rt: 1.1 }, { x: s.x - 2.4, y: y + 0.6, z }];
    f.pick(this.rng); return true;
  }
  burst(p) { for (let i = 0; i < 14 && this.bursts.length < 150; i++) this.bursts.push({ pos: p.clone().add(new THREE.Vector3((this.rng() - 0.5) * 1.2, (this.rng() - 0.5) * 0.6, (this.rng() - 0.5) * 0.6)), v: 0.6 + this.rng() * 1.2, age: 0, r: 0.05 + this.rng() * 0.07 }); }

  drop(x, n = 7, kind = 'flakes') {
    for (const f of this.list) if (this.rng() < 0.5) { f.flake = null; f.hold = this.rng() * 0.9 + (f.weak ? 5 : 0); }      // fish in a critical state have little appetite      // about half the fish notice the new food, the rest stay on the old
    for (let i = 0; i < n && this.flakes.length < 190; i++) this.flakes.push({ pos: new THREE.Vector3(x + (this.rng() - 0.5) * 0.9, Fish3D.topY + 0.2 + this.rng() * 0.4, 0.3 + this.rng() * 1.6), age: 0, ph: this.rng() * 6, c: (this.foodCols[kind] ?? this.cols)[(this.rng() * 4) | 0] });
  }
  // an octopus's den (a rock or structure it has taken to), its collection of shells at the entrance, and the shell it carries home now and then
  syncDen(f, d) {
    f.hoard = hoardOf(d, Date.now()); const spots = (this.spots?.() ?? []).filter((x) => ['ROCKS', 'STRUCTURES'].includes(DECOR_DEF[x.type]?.cat)), home = spots.find((x) => x.id === d.home);
    const rocks = spots.filter((x) => ['rock', 'skull'].includes(x.type)), near = (q) => rocks.filter((r) => r !== q && Math.hypot(r.x - q.x, r.z - q.z) < 2.4), built = rocks.map((q) => [q, near(q)]).filter(([, n]) => n.length >= 1).sort((a, b) => b[1].length - a[1].length)[0];
    const pref = spots.filter((x) => x.type === 'pot' || x.type === 'coconut'), cover = spots.filter((x) => ['boulder', 'table', 'arch', 'brain', 'chest'].includes(x.type)), den = home ?? (built ? null : pref.length ? pref[(d.seed ?? 0) % pref.length] : cover.length ? cover[(d.seed ?? 0) % cover.length] : null);      // a den needs real cover: a single small rock is not one
    if (home) f.den = { x: home.x, z: home.z, id: home.id, home: true, kind: home.type };
    else if (built) { const all = [built[0], ...built[1]], cx = all.reduce((a, q) => a + q.x, 0) / all.length, cz = all.reduce((a, q) => a + q.z, 0) / all.length; f.den = { x: cx, z: cz, id: built[0].id, home: false, kind: 'rocks', n: all.length }; }
    else f.den = den ? { x: den.x, z: den.z, id: den.id, home: false, kind: den.type } : null;
    const key = f.den ? `${f.den.id}|${f.den.kind}|${f.hoard}|${d.crabs ?? 0}` : '';
    if (f.hoardKey !== key) { f.hoardKey = key; if (f.hoardGroup) this.scene.remove(f.hoardGroup); f.hoardGroup = null; if (f.den && f.hoard > 0) { f.hoardGroup = buildHoard(f.hoard, d.crabs ?? 0, d.seed ?? 1); f.hoardGroup.position.set(f.den.x, 0.04, f.den.z); this.scene.add(f.hoardGroup); } }
    if (!f.carryMesh) { f.carryMesh = shellMesh('shell'); f.carryMesh.scale.setScalar(1.7); f.carryMesh.visible = false; f.carryMesh.position.set(11 * f.scale, -7 * f.scale, 6 * f.scale); f.group.add(f.carryMesh); f.onDrop = (p) => this.looseShell(p); f.onInk = (p) => this.ink(p); f.onPush = (p, d) => this.puff(p, d); f.isNight = !!this.night; f.onEat = (h) => this.eatCrab(h); }
  }
  looseShell(p) { const m = shellMesh(this.rng() < 0.5 ? 'shell' : 'clam'); m.position.set(p.x + 0.45, 0.1, p.z + 0.5); m.rotation.y = this.rng() * 6; this.scene.add(m); (this.loose ||= []).push({ m, until: performance.now() + 150e3 }); }
  // a crab treat: it sinks to the floor and the octopus goes after it
  dropCrab(fid) {
    const f = this.byId.get(fid); if (!f || f.dead || f.species.move !== 'jet') return; const x = Math.max(-3.4, Math.min(3.4, f.pos.x + (this.rng() - 0.5) * 3)), z = 1.0 + this.rng() * 1.2, m = buildCrab(); m.scale.setScalar(1.7); m.position.set(x, Fish3D.topY + 0.2, z); this.scene.add(m);
    const hnt = { x, z, mesh: m, y: Fish3D.topY + 0.2 }; (this.crabs ||= []).push(hnt); f.hunt = hnt; this.burst(new THREE.Vector3(x, 14, z));
  }
  // a crab dropped in at feeding time: it sinks where you tapped, and the octopus that is free (or the hungriest) goes after it
  dropCrabAt(x, fid = null) {
    const os = this.list.filter((f) => f.species.move === 'jet' && !f.dead && !f.visitor); if (!os.length) return;
    const f = (fid && os.find((o) => o.fid === fid)) ?? os.find((o) => !o.hunt) ?? os[0]; let z = 1.0 + this.rng() * 1.0;
    for (const o of os) { const dx = x - o.pos.x, d = Math.hypot(dx, z - o.pos.z); if (d < 2.0) { const side = dx !== 0 ? Math.sign(dx) : (o.pos.x > 0 ? -1 : 1); x = o.pos.x + side * 2.0; if (Math.abs(x) > 3.6) x = o.pos.x - side * 2.0; } }      // it lands clear of any octopus (to one side), never through one
    x = Math.max(-3.6, Math.min(3.6, x)); z = Math.max(0.3, Math.min(2.4, z));
    const m = buildCrab(); m.scale.setScalar(1.7); m.position.set(x, Fish3D.topY + 0.2, z); this.scene.add(m);
    const hnt = { x, z, mesh: m, y: Fish3D.topY + 0.2 }; (this.crabs ||= []).push(hnt); if (!f.hunt) f.hunt = hnt; else (f.hunts ||= []).push(hnt); this.burst(new THREE.Vector3(x, 14, z));
  }
  // a cloud of ink: dark puffs that swell and thin out over a few seconds
  ink(p) {
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + this.rng() * 0.2, 1), new THREE.MeshBasicMaterial({ color: 0x1a1428, transparent: true, opacity: 0.55, depthWrite: false })); m.position.set(p.x + (this.rng() - 0.5) * 0.8, p.y + (this.rng() - 0.3) * 0.6, p.z + (this.rng() - 0.5) * 0.6); this.scene.add(m); this.onSprite?.(m); (this.inks ||= []).push({ m, age: -i * 0.06, vx: (this.rng() - 0.5) * 0.5, vy: 0.1 + this.rng() * 0.25 }); }
  }
  puff(p, d) { const q = new THREE.Vector3(p.x - d.x * 0.6, p.y - d.y * 0.6 + 0.1, p.z - d.z * 0.6); for (let i = 0; i < 6 && this.bursts.length < 150; i++) this.bursts.push({ pos: q.clone().add(new THREE.Vector3((this.rng() - 0.5) * 0.5, (this.rng() - 0.5) * 0.4, (this.rng() - 0.5) * 0.5)), v: 0.5 + this.rng() * 0.9, age: 0, r: 0.04 + this.rng() * 0.05 }); }
  // a crab already on the sand (it climbed out of a jar), for the octopus to catch
  crabOut(x, z) { const m = buildCrab(); m.scale.setScalar(1.7); m.position.set(x, 0.13, z); m.rotation.y = this.rng() * 6; this.scene.add(m); const hnt = { x, z, mesh: m, y: 0.13 }; (this.crabs ||= []).push(hnt); return hnt; }
  eatCrab(hnt) { this.scene.remove(hnt.mesh); this.crabs = (this.crabs ?? []).filter((c) => c !== hnt); this.burst(new THREE.Vector3(hnt.x, 0.7, hnt.z)); const f = this.list.find((o) => o.hunts?.length && (o.hunt === hnt || !o.hunt)); if (f) { setTimeout(() => { if (!f.hunt && f.hunts?.length) f.hunt = f.hunts.shift(); }, 1500); } }
  // puzzle jars: one appears on the sand for each octopus that has been given one, and opens when it is solved
  syncJars(state) {
    this.jars ||= new Map();
    for (const d of state.fish) {
      const f = this.byId.get(d.id), jar = this.jars.get(d.id);
      if (d.puzzle) {
        if (!jar) { const j = buildJar(); let h = 0; for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) | 0; j.pos = { x: ((Math.abs(h) % 50) / 10) - 2.5, z: 1.3 + ((Math.abs(h) >> 6) % 8) / 10 }; j.root.position.set(j.pos.x, 0.12, j.pos.z); j.root.scale.setScalar(0.95); this.scene.add(j.root); this.onSprite?.(j.root); this.jars.set(d.id, j); this.burst(new THREE.Vector3(j.pos.x, 0.8, j.pos.z)); }
        if (f) f.jarAt = this.jars.get(d.id).pos;
      } else {
        if (f) f.jarAt = null;
        if (jar && jar.state === 'closed') { jar.state = 'open'; jar.t = 0; this.burst(new THREE.Vector3(jar.pos.x, 1.2, jar.pos.z)); if (f && !f.dead && !f.hunt) f.hunt = this.crabOut(jar.pos.x + 0.65, jar.pos.z + 0.25); }      // the crab scuttles out of the open jar, and the octopus catches it: that was the point
      }
    }
    for (const [id, jar] of [...this.jars]) if (!state.fish.some((d) => d.id === id) && jar.state === 'closed') { jar.state = 'open'; jar.t = 0; }
  }
  investigate(spot) {
    for (const f of this.list) if (!f.dead && !f.visitor && f.species.move === 'hover' && !f.greet) {                    // a seahorse drifts over to look, then holds still beside it for a while
      f.target.set(Math.max(-3.8, Math.min(3.8, spot.x + (this.rng() - 0.5) * 0.5)), 1.1 + (spot.h ?? 1) * (0.35 + this.rng() * 0.3), spot.z + 0.6); f.idle = 8 + this.rng() * 6; f.retarget = f.idle + 2; f.seeking = false; this.burst(new THREE.Vector3(spot.x, 1.5, spot.z + 0.4));
    }
    for (const f of this.list) if (!f.dead && !f.visitor && f.species.move !== 'jet' && f.species.move !== 'hover' && !f.script?.length && (f.profile?.traits ?? []).includes('Curious') && this.rng() < 0.6) {
      const y = 1.5 + (spot.h ?? 1) * 0.45; f.script = [{ x: spot.x - 0.9, y, z: spot.z + 1.2, rt: 2.4 }, { x: spot.x + 0.9, y: y + 0.4, z: spot.z + 1.2, rt: 2.2 }, { x: spot.x, y: y + 0.2, z: spot.z + 1.5, rt: 1.6 }]; f.pick(this.rng);
    } for (const f of this.list) if (f.species.move === 'jet' && !f.dead && !f.jarAt) f.inspect = { x: spot.x, z: spot.z }; }       // the octopus goes to look at anything new; other curious fish are handled in wrapPick
  squirt(f) { for (let k = 0; k < 6; k++) setTimeout(() => { if (f.dead) return; this.burst(f.pos.clone().add(new THREE.Vector3(0, 0.5 + k * 0.05, 0.6 + k * 0.55))); }, k * 80); f.flush = Math.max(f.flush ?? 0, 0.6); }
  // living with each other: bullies chase the timid, a predator makes small fish keep their distance, and territorial rivals turn on each other
  socialTick(dt) {
    this.stT = (this.stT ?? 0) - dt; if (this.stT > 0) return; this.stT = 0.6;
    const L = this.list.filter((f) => !f.dead && !f.visitor && SOCIAL[f.sk]), away = (o, from, d = 2.6) => { const v = o.pos.clone().sub(from); v.y *= 0.3; if (v.lengthSq() < 1e-4) v.set(1, 0, 0); v.normalize().multiplyScalar(d); o.target.set(Math.max(-4, Math.min(4, o.pos.x + v.x)), Math.max(0.9, Math.min(Fish3D.topY - 0.3, o.pos.y + v.y)), Math.max(-2, Math.min(2.8, o.pos.z + v.z))); o.retarget = 1.1; o.fleeT = 1.4; };
    for (const b of L) {
      const B = SOCIAL[b.sk]; b.chaseCool = (b.chaseCool ?? 0) - 0.6;
      if (B.bully && b.chaseCool <= 0 && b.species.move !== 'hover') {
        let best = null, bd = 3.4; for (const o of L) { const O = SOCIAL[o.sk]; if (o === b || o.sk === b.sk || O.size > 1 || O.bully) continue; const d = b.pos.distanceTo(o.pos); if (d < bd) { bd = d; best = o; } }
        if (best && this.rng() < 0.55) { b.target.copy(best.pos); b.retarget = 0.9; b.fleeT = 1.0; b.chaseCool = 7 + this.rng() * 9; away(best, b.pos); }
      }
      if (B.predator && b.species.move === 'jet' && b.scareT <= 0 && (b.st?.s === 'rest' || b.st?.s === 'crawl')) for (const o of L) if (o !== b && o.species.move !== 'hover' && o.vel.length() > 1.3 && o.pos.distanceTo(b.pos) < 1.1) { b.startle(o.pos); break; }      // something fast and close startles him
      if (B.predator && (b.st?.s === 'crawl' || b.st?.s === 'jet')) for (const o of L) { const O = SOCIAL[o.sk]; if (o !== b && O.size <= 1 && !O.bully && o.species.move !== 'hover' && o.pos.distanceTo(b.pos) < 1.9) away(o, b.pos, 2.2); }
      if (B.sameFoe) for (const o of L) if (o !== b && o.sk === b.sk && b.pos.distanceTo(o.pos) < 1.6 && o.species.move !== 'hover') away(o, b.pos, 2.0);
    }
  }
  // seahorses greet their partner: now and then (more in the morning) two of them meet at a plant, circle each other glowing, and part
  seahorseTick(dt, t) {
    this.shT = (this.shT ?? 30 + this.rng() * 40) - dt; if (this.shT > 0) return;
    const hs = this.list.filter((f) => f.sk === 'seahorse' && !f.dead && !f.greet && f.species.move === 'hover'); this.shT = (this.phase?.() === 'morning' ? 150 : 420) + this.rng() * 180; if (hs.length < 2) return;
    const [a, b] = hs, spots = (this.spots?.() ?? []).filter((x) => DECOR_DEF[x.type]?.cat === 'PLANTS'), mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
    let sp = null, bd = 1e9; for (const x of spots) { const d = Math.hypot(x.x - mid.x, x.z - mid.z); if (d < bd) { bd = d; sp = x; } }
    const cx = sp ? sp.x : Math.max(-3, Math.min(3, mid.x)), cz = sp ? sp.z + 0.5 : 1.2, y = sp ? 1.6 + sp.h * 0.6 : Math.max(2.5, Math.min(8, mid.y));
    a.greet = { cx, cz, y, r: 0.42, ang: 0, side: 1, t: 11 }; b.greet = { cx, cz, y, r: 0.42, ang: Math.PI, side: 1, t: 11 }; this.burst(new THREE.Vector3(cx, y, cz));
  }
  update(dt, t) {
    this.socialTick(dt); this.seahorseTick(dt, t); this.octoAware(dt); this.haulTick(dt, t);
    for (const k of this.inks ?? []) { k.age += dt; if (k.age < 0) continue; const q = k.age / 4; k.m.scale.setScalar(1 + q * 3.2); k.m.position.x += k.vx * dt; k.m.position.y += k.vy * dt; k.m.material.opacity = 0.55 * Math.max(0, 1 - q) * Math.min(1, k.age * 6); }
    if (this.inks?.length) this.inks = this.inks.filter((k) => { if (k.age < 4) return true; this.scene.remove(k.m); this.onSpriteGone?.(k.m); return false; });
    if (this.crabs?.length) { const old = this.crabs.filter((c) => !c.held && (c.age = (c.age ?? 0) + dt) > 150); for (const c of old) { for (const f of this.list) { if (f.hunt === c) f.hunt = null; if (f.hunts) f.hunts = f.hunts.filter((h) => h !== c); } this.eatCrab(c); } }
    // a crab on the sand is not easy prey: when the octopus closes in it scuttles off in a burst (away, and a little sideways), twice at most, then it tires and the octopus has it
    for (const c of this.crabs ?? []) {
      const R = (c.run ||= { dodges: 0, burst: 0, vx: 0, vz: 0, down: 0, face: this.rng() * 6.28 }), hunter = this.list.find((o) => o.hunt === c);
      c.mesh.userData.tick?.(t * (c.held ? 1.6 : R.burst > 0 ? 2.2 : 1), c.held || c.pinned ? 1 : R.burst > 0 ? 0.8 : c.y > 0.2 ? 0.6 : 0); if (c.held) continue;
      if (c.y > 0.13) { c.y = Math.max(0.13, c.y - 1.9 * dt); c.mesh.position.set(c.x + Math.sin(t * 2 + c.x) * 0.12, c.y, c.z); c.mesh.rotation.y += dt * 0.9; continue; }
      R.down += dt; R.burst -= dt;
      if (hunter && !c.pinned && R.burst <= -0.5 && R.dodges < 2 && R.down < 9) { const dx = c.x - hunter.pos.x, dz = c.z - hunter.pos.z, d = Math.hypot(dx, dz); if (d < 2.1) { const a = Math.atan2(dz, dx) + (this.rng() < 0.5 ? 1 : -1) * (0.6 + this.rng() * 0.6), sp = 1.5; R.vx = Math.cos(a) * sp; R.vz = Math.sin(a) * sp * 0.55; R.burst = 0.75; R.dodges++; R.face = a; } }
      if (R.burst > 0 && !c.pinned) { c.x = Math.max(-3.6, Math.min(3.6, c.x + R.vx * dt)); c.z = Math.max(0.3, Math.min(2.4, c.z + R.vz * dt)); }
      let ry = c.mesh.rotation.y, dr = R.face - ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.mesh.rotation.y = ry + dr * Math.min(1, dt * 8);
      c.mesh.position.set(c.x + (c.pinned ? Math.sin(t * 30) * 0.03 : R.burst > 0 ? 0 : Math.sin(t * 4 + c.z) * 0.04), c.y, c.z);
    }
    if (this.loose?.length) { const now = performance.now(); this.loose = this.loose.filter((l) => { if (now < l.until) return true; this.scene.remove(l.m); return false; }); }
    if (this.jars) for (const [id, jar] of [...this.jars]) { const f = this.byId.get(id); updateJar(jar, dt, t, !!f && f.workK > 0.6, f?.rs?.grab?.kind === 'jar' ? f.rs.grab.twist : null); if (jar.state === 'open' && jar.t > 3.2) { this.scene.remove(jar.root); this.onSpriteGone?.(jar.root); this.jars.delete(id); } }
    for (const f of this.flakes) { f.age += dt; if (f.pos.y > 0.2) { f.pos.y -= 0.42 * dt; f.pos.x += Math.sin(t * 1.6 + f.ph) * 0.12 * dt; } }
    this.flakes = this.flakes.filter((f) => !f.eaten && f.age < 30);
    this.mesh.count = this.flakes.length;
    this.flakes.forEach((f, i) => { this.m.makeRotationY(f.ph + t * 0.4); this.m.setPosition(f.pos); this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, f.c); });
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // every fish picks its own piece of food; claims spread them out
    const claims = new Map(), W = Fish3D.world, o = this.tmp;
    for (const f of this.list) { if (f.flake && !f.flake.eaten && this.flakes.includes(f.flake)) claims.set(f.flake, (claims.get(f.flake) || 0) + 1); else f.flake = null; }
    for (const f of this.list) {
      if (f.visitor || f.dead || f.species.move === 'jet') { f.flake = null; f.seeking = false; f.foodMul = 1; continue; }      // an octopus does not eat flakes
      const tr = f.profile?.traits ?? [], shy = tr.includes('Shy'), greedy = tr.includes('Greedy'), curious = tr.includes('Curious');
      f.hold = (f.hold ?? 0) - dt; f.think = (f.think ?? 0) - dt;
      let fl = f.flake;
      if ((!fl && f.hold <= 0) || (fl && f.think <= 0 && this.rng() < 0.4)) {
        f.think = 0.8 + this.rng() * 1.6;
        let best = null, bs = 1e9;
        for (const c of this.flakes) {
          if (c.eaten || (f.id === 'cory' && c.pos.y > 0.7) || (shy && c.age < 1.8)) continue;
          if (W.push) { o.set(0, 0, 0); if (W.push(c.pos, 0.25, o)) continue; }
          const d = f.pos.distanceTo(c.pos); if (d > 9) continue;
          const sc = d + ((claims.get(c) || 0) - (c === f.flake ? 1 : 0)) * (greedy ? 0.8 : 2.6) + this.rng() * 1.4 - (curious ? Math.max(0, 3 - c.age) * 0.6 : 0) - (c === f.flake ? 1 : 0);
          if (sc < bs) { bs = sc; best = c; }
        }
        if (best !== f.flake) { if (f.flake) claims.set(f.flake, claims.get(f.flake) - 1); if (best) claims.set(best, (claims.get(best) || 0) + 1); }
        fl = best;
      }
      f.flake = fl; f.seeking = !!fl; f.foodMul = fl ? (greedy ? 2.0 : 1.5) : 1;
      if (fl) {
        f.target.copy(fl.pos); f.retarget = 0.3;
        // bite test along the path the mouth travelled this frame (so a fast fish cannot swim through food), with depth counting half
        const m = f.mouth(), a = f.pm ?? m, ab = o.copy(m).sub(a), len2 = ab.lengthSq(), tt = len2 > 1e-6 ? Math.max(0, Math.min(1, (fl.pos.clone().sub(a).dot(ab)) / len2)) : 1;
        const cx = a.x + ab.x * tt - fl.pos.x, cy = a.y + ab.y * tt - fl.pos.y, cz = (a.z + ab.z * tt - fl.pos.z) * 0.5, reach = Math.max(0.45, f.radius * 0.5);
        f.pm = m.clone(); f.nibble = Math.hypot(cx, cy, cz);
        if (f.nibble < reach) { fl.eaten = true; f.flake = null; f.pm = null; f.gulp = 0.35; this.onEat?.(f); }
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
