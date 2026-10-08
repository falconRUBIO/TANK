// The living roster: spawns a Fish3D for every fish in the game state, grows them, gives each its own
// personality-driven wandering, and runs feeding (flakes sink, each fish picks its own piece).
import * as THREE from 'three';
import { SPECIES } from '../species.js';
import { Fish3D } from './fish3d.js';
import { mulberry32 } from '../color.js';
import { SPECIES_DEF, STAGE_SCALE, stageOf, needsOf } from '../game/rules.js';

const BANDS = {
  goldfish: { x: [-3.4, 3.6], y: [3, 10], z: [0.6, 2.0] }, neon: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, blue: { x: [-3.2, 3.4], y: [3, 11], z: [0.5, 1.9] },
  angelfish: { x: [-3.0, 3.6], y: [3, 10], z: [-3.0, -1.8] }, guppy: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, betta: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, cory: { x: [-3.4, 3.6], y: [0.35, 0.45], z: [0.6, 2.0] },
};
const SPOTS = { Shy: 'Tall Grass', Curious: 'Stone Arch', Playful: 'Bubbles', Lazy: 'Driftwood', Calm: 'Open water', Brave: 'The glass', Social: 'Near friends', Greedy: 'The surface' };
const bubbleSpot = new THREE.Vector3(-3.6, 0, 0.5);

// little speech-bubble icons drawn once per mood
const EMOTE = { Hungry: ['🍤', '#2a1a1a'], Sleepy: ['💤', '#17203a'], Happy: ['💛', '#2a2410'], Gloomy: ['☁️', '#1e2430'], 'Under the weather': ['🩹', '#2a1a22'] };
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
    this.m = new THREE.Matrix4(); this.tmp = new THREE.Vector3(); this.bursts = []; this.onEat = null; this.bubbleAt = bubbleSpot; this.onSprite = null; this.onSpriteGone = null; this.clock = 0;
    SPECIES.neon.school = true;
    this.bm = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.22, 4, 8), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.7, depthWrite: false }), 160);
    this.bm.frustumCulled = false; this.bm.count = 0; scene.add(this.bm);
  }
  profileOf(f, st) {
    const tr = f.traits ?? [], n = needsOf(f, st);
    return { traits: tr, age: stageOf(f).replace(/^./, (c) => c.toUpperCase()), spot: SPOTS[tr[0]] ?? 'Open water', food: 'Flakes', needs: [n.fed, n.happy, n.energy, n.health], mood: n.mood, vigor: n.vigor };
  }
  // make the scene match the game's fish list
  sync(state, { arrivals = [] } = {}) {
    const seen = new Set();
    state.fish.forEach((d, idx) => {
      seen.add(d.id); const k = STAGE_SCALE[stageOf(d)];
      let f = this.byId.get(d.id);
      if (!f) {
        const sp = SPECIES[d.species], def = SPECIES_DEF[d.species], band = BANDS[d.species] ?? BANDS.goldfish;
        const back = idx % 2 === 1 && d.species !== 'cory' && d.species !== 'angelfish';
        f = new Fish3D(sp, d.seed, { name: d.name, speed: def.speed * (0.9 + (d.seed % 5) * 0.05), scale: 1, band: back ? { ...band, z: [-3.0, -1.8] } : band });
        f.fid = d.id; f.profile = this.profileOf(d, state); f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1); f.setGrowth(k);
        const arriving = arrivals.includes(d.id);
        f.pos.set(arriving ? (this.rng() - 0.5) * 5 : (this.rng() - 0.5) * 6, arriving ? 13.5 : band.y[0] + this.rng() * (band.y[1] - band.y[0]), (band.z[0] + band.z[1]) / 2);
        if (!arriving) f.pick(this.rng); else { f.target.set(f.pos.x, 8, f.pos.z); f.retarget = 3; this.burst(f.pos); }
        this.wrapPick(f, d); this.makeEmote(f); this.scene.add(f.group); this.list.push(f); this.byId.set(d.id, f);
      } else {
        f.name = d.name; f.profile = this.profileOf(d, state); f.vigor = f.profile.vigor * (f.profile.mood === 'Sleepy' ? 0.5 : 1);
        if (Math.abs((f.growth ?? 1) - k) > 1e-3) f.setGrowth(k);
      }
    });
    for (const f of [...this.list]) if (!seen.has(f.fid)) { this.scene.remove(f.group); if (f.emote) { this.scene.remove(f.emote); this.onSpriteGone?.(f.emote); } this.list.splice(this.list.indexOf(f), 1); this.byId.delete(f.fid); }
  }
  makeEmote(f) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, opacity: 0 })); sp.scale.setScalar(0.8); sp.renderOrder = 9; sp.visible = false;
    f.emote = sp; f.emoteSeed = Math.random() * 20; this.scene.add(sp); this.onSprite?.(sp);
  }
  // the mood bubble shows for a few seconds out of every ~14, so the tank stays calm
  updateEmotes(t) {
    for (const f of this.list) {
      const sp = f.emote, mood = f.profile?.mood; if (!sp) continue;
      const phase = (t + f.emoteSeed) % 14, show = EMOTE[mood] && (phase < 3.4 || (mood === 'Hungry' && phase < 7)) && !f.group.parent?.userData?.hide;
      const want = show ? Math.min(1, Math.min(phase, 3.4 - phase + 0.4) * 2.5) : 0;
      sp.material.opacity += (want - sp.material.opacity) * 0.2; sp.visible = sp.material.opacity > 0.03;
      if (sp.visible) { if (sp.userData.mood !== mood) { sp.material.map = emoteTexture(mood); sp.material.needsUpdate = true; sp.userData.mood = mood; } sp.position.set(f.pos.x, f.pos.y + f.radius * 0.8 + 0.5 + Math.sin(t * 2 + f.emoteSeed) * 0.05, f.pos.z + 0.4); }
    }
  }
  // personality: traits change where a fish chooses to swim next
  wrapPick(f, d) {
    const base = f.pick.bind(f), tr = d.traits ?? [], all = this.list;
    f.pick = (r) => {
      base(r); const roll = r(), mood = f.profile?.mood;
      if (mood === 'Hungry' && roll < 0.5 && f.id !== 'cory') { f.target.set(-2.5 + r() * 5, 9 + r() * 2.5, 0.8 + r() * 1.2); f.retarget = 4; return; }
      if (mood === 'Sleepy') { f.target.set(-3 + r() * 6, 1 + r() * 2.2, f.target.z); f.retarget = 8; return; }
      if (tr.includes('Curious') && roll < 0.28) { f.target.set((r() - 0.5) * 6, 4 + r() * 5, 3.0); f.retarget = 4; }
      else if (tr.includes('Social') && roll < 0.22 && f.id !== 'neon') {
        const lead = all.filter((o) => o !== f && o.id !== 'neon' && o.profile?.traits.includes('Social') && !o.follower), o = lead[(r() * lead.length) | 0];
        if (o) { f.following = o; o.follower = f; f.target.set(o.pos.x - Math.cos(o.heading) * 2.4 + (r() - 0.5) * 1.2, o.pos.y + (r() - 0.5) * 1.2, o.pos.z - (r() - 0.5) * 0.4); f.retarget = 2.5; setTimeout(() => { if (o.follower === f) o.follower = null; f.following = null; }, 5000); }
      } else if (tr.includes('Shy') && roll < 0.45) { f.target.set(-3.4 + r() * 7, 1 + r() * 3, -1.6 - r() * 1.2); f.retarget = 7; }
      else if (tr.includes('Playful') && roll < 0.3) { f.target.set(this.bubbleAt.x + (r() - 0.5) * 0.6, 2 + r() * 8, 0.2 + r()); f.retarget = 3; }
      if (tr.includes('Lazy')) f.retarget += 4;
    };
  }
  burst(p) { for (let i = 0; i < 14 && this.bursts.length < 150; i++) this.bursts.push({ pos: p.clone().add(new THREE.Vector3((this.rng() - 0.5) * 1.2, (this.rng() - 0.5) * 0.6, (this.rng() - 0.5) * 0.6)), v: 0.6 + this.rng() * 1.2, age: 0, r: 0.05 + this.rng() * 0.07 }); }

  drop(x, n = 7) {
    for (const f of this.list) if (this.rng() < 0.5) { f.flake = null; f.hold = this.rng() * 0.9; }      // about half the fish notice the new food, the rest stay on the old
    for (let i = 0; i < n && this.flakes.length < 190; i++) this.flakes.push({ pos: new THREE.Vector3(x + (this.rng() - 0.5) * 0.9, 15 + this.rng() * 0.5, 0.3 + this.rng() * 1.6), age: 0, ph: this.rng() * 6, c: this.cols[(this.rng() * 4) | 0] });
  }
  update(dt, t) {
    for (const f of this.flakes) { f.age += dt; if (f.pos.y > 0.2) { f.pos.y -= 0.42 * dt; f.pos.x += Math.sin(t * 1.6 + f.ph) * 0.12 * dt; } }
    this.flakes = this.flakes.filter((f) => !f.eaten && f.age < 30);
    this.mesh.count = this.flakes.length;
    this.flakes.forEach((f, i) => { this.m.makeRotationY(f.ph + t * 0.4); this.m.setPosition(f.pos); this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, f.c); });
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // every fish picks its own piece of food; claims spread them out
    const claims = new Map(), W = Fish3D.world, o = this.tmp;
    for (const f of this.list) { if (f.flake && !f.flake.eaten && this.flakes.includes(f.flake)) claims.set(f.flake, (claims.get(f.flake) || 0) + 1); else f.flake = null; }
    for (const f of this.list) {
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
      if (fl) { f.target.copy(fl.pos); f.retarget = 0.3; if (f.mouth().distanceTo(fl.pos) < 0.34) { fl.eaten = true; f.flake = null; this.onEat?.(f); } }
    }
    this.updateEmotes(t);
    for (const b of this.bursts) { b.age += dt; b.pos.y += b.v * dt; }
    this.bursts = this.bursts.filter((b) => b.age < 1.4);
    this.bm.count = this.bursts.length;
    this.bursts.forEach((b, i) => { const k = b.r * (1 - b.age / 1.6); this.m.makeScale(k, k, k); this.m.setPosition(b.pos); this.bm.setMatrixAt(i, this.m); });
    this.bm.instanceMatrix.needsUpdate = true;
  }
}
