// Real 3D voxel fish: the species voxel models become instanced cubes that are lit,
// shadowed and animated (tail bend, fin flutter) in the scene, steered in 3D.
import * as THREE from 'three';
import { buildModel } from '../voxel.js';
import { seahorseTail, SEAHORSE_LEAN, SEAHORSE_SNOUT, SEAHORSE_STEM } from '../species.js';
import { gripsFor, gripsNow, PLANTS } from './grips.js';
const SWIVEL = 0.15;      // how far a seahorse turns either way on its stem as it watches (radians)
// a seahorse feeding: how far from its snout it notices food, how close food must come to be sucked in, and how long the strike takes (seconds)
const SEA_WATCH = 2.4, SEA_REACH = 0.3, SEA_STRIKE = 0.16;
import { genesOf } from '../game/genes.js';
import { patch } from './env.js';
import { sandH, sandUnder, slopeAt, levelAt, routeBetween, crossesFace, GLASS_Z } from './terrain.js';
const _m4 = new THREE.Matrix4(), _eu = new THREE.Euler(), _rq = [0, 0, 0], _snt = new THREE.Vector3();
const OCT_BACK = -3.5, OCT_FRONT = GLASS_Z - 0.45;               // how far back an octopus roams on the sand (the back bank) and how near the glass it comes
const walkable = (x, z) => slopeAt(x, z).s < 1.0;      // somewhere to stand: a level, a ramp, not a face

const VOX = 0.052, GLOBAL = 1.05;
// the octopus's repertoire when nothing much is going on: impressions of other creatures, games and ways of walking, each with the thought it shows on its card
const HOLD_COLS = { brain: [214, 150, 170], pillar: [196, 186, 160], anchor: [120, 110, 100], torii: [200, 80, 60], wood: [150, 110, 70], crystal: [170, 150, 230], moss: [190, 110, 170], rock: [150, 146, 136], boulder: [150, 146, 136] };
const LABEL = { grass: 'seagrass', fern: 'fern', sword: 'sword plant', red: 'red plant', kelp: 'kelp', bamboo: 'bamboo', anemone: 'anemone', brain: 'brain coral', pillar: 'pillar', anchor: 'anchor', torii: 'gate', bridge: 'bridge', crystal: 'crystal', spire: 'spire', lighthouse: 'lighthouse', wood: 'driftwood', moss: 'moss', arch: 'arch', rock: 'rock', boulder: 'boulder' };
// the colours of the plants it imitates, base to tip, as the tank draws them
const PLANT_COLS = { grass: [[40, 112, 84], [150, 222, 150]], fern: [[124, 48, 156], [246, 140, 210]], sword: [[96, 104, 40], [196, 176, 80]], red: [[120, 30, 40], [236, 96, 90]], kelp: [[40, 108, 56], [150, 204, 84]], bamboo: [[70, 130, 60], [150, 206, 96]], anemone: [[176, 110, 134], [255, 214, 240]] };
// What each temperament likes doing when nothing much is going on (a weight on each act), how brisk it is, and the tricks one of its kind may make its own.
// An explorer grabs and roams, a homebody buries itself and plays plant, a show-off does the lionfish and the jellyfish, a watcher watches,
// a collector handles everything, a trickster tags along behind the fish and plays the snake.
const TEMPER = {
  explorer:  { grab: 1.8, tour: 1.6, follow: 1.0, watch: 0.8, flat: 1.0, bury: 0.6, lion: 0.9, snake: 1.0, jelly: 1.0, kelp: 0.8, squirt: 0.6, tempo: 1.2, sig: ['grab', 'tour', 'snake'] },
  homebody:  { grab: 0.8, tour: 0.4, follow: 0.5, watch: 1.0, flat: 1.2, bury: 2.2, lion: 0.5, snake: 1.2, jelly: 0.5, kelp: 1.6, squirt: 0.2, tempo: 0.75, sig: ['bury', 'kelp', 'flat'] },
  showoff:   { grab: 0.9, tour: 1.4, follow: 1.0, watch: 0.7, flat: 0.8, bury: 0.4, lion: 2.2, snake: 1.0, jelly: 1.8, kelp: 0.8, squirt: 1.2, tempo: 1.1, sig: ['lion', 'jelly'] },
  watcher:   { grab: 0.8, tour: 0.7, follow: 1.4, watch: 2.2, flat: 1.0, bury: 1.0, lion: 0.6, snake: 0.8, jelly: 0.8, kelp: 1.4, squirt: 0.3, tempo: 0.85, sig: ['watch', 'kelp', 'follow'] },
  collector: { grab: 2.0, tour: 0.8, follow: 0.7, watch: 0.8, flat: 1.0, bury: 1.2, lion: 0.6, snake: 0.8, jelly: 0.6, kelp: 1.0, squirt: 0.4, tempo: 1.0, sig: ['grab', 'flat'] },
  trickster: { grab: 1.2, tour: 1.2, follow: 1.6, watch: 0.8, flat: 1.2, bury: 0.8, lion: 1.0, snake: 1.6, jelly: 1.0, kelp: 1.0, squirt: 2.5, tempo: 1.25, sig: ['follow', 'snake', 'squirt'] },
};
const SIG_TEXT = { grab: 'Taking hold of things', tour: 'A swim round the tank', snake: 'The sea snake', bury: 'Burying itself', kelp: 'Pretending to be a plant', flat: 'The flatfish', lion: 'The lionfish', jelly: 'The jellyfish', watch: 'Watching the fish', follow: 'Tagging along behind fish', squirt: 'Squirting water at you' };
// how rough its skin goes for each impression: the spiky lionfish and the plant are all papillae, the snake and the jellyfish smooth
// how wide a thing is where the arms take hold of it: round a plant's stem, a rock, the shell, a pillar
const GRIP = { grass: 0.16, fern: 0.16, sword: 0.18, red: 0.16, kelp: 0.3, bamboo: 0.3, anemone: 0.3, rock: 0.42, boulder: 0.95, coconut: 0.85, pot: 0.8, skull: 0.4, pillar: 0.3, lantern: 0.3, starfish: 0.35, moss: 0.3, shell: 0.25, chest: 0.6, anchor: 0.35, crystal: 0.35, spire: 0.3, brain: 0.5, wood: 0.5, bubbler: 0.3, lighthouse: 0.4, table: 0.6, torii: 0.3, arch: 0.4, bridge: 0.5 };
const COSTUME_BUMP = { sole: 0.35, lion: 0.95, snake: 0, jelly: 0, kelp: 1, fish: 0.08 };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ACT_TEXT = { flat: 'Flat as a sole, sliding over the sand.', bury: 'Dug into the sand, just its eyes showing.', lion: 'Spines out: pretending to be a lionfish.', snake: 'Two arms out, rippling like a sea snake.', jelly: 'Puffed up and drifting like a jellyfish.', kelp: 'Arms up, swaying like the plant beside it.', tour: 'Out for a swim round the tank.' };
const GAITS = { stroll: { stride: 1, lift: 0, sp: 1, bob: 1 }, creep: { stride: 0.6, lift: 0, sp: 0.7, bob: 0.5 }, stilt: { stride: 1.35, lift: 0.22, sp: 1.15, bob: 1.6 }, bounce: { stride: 1.1, lift: 0.08, sp: 0.95, bob: 2.2 } };
const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0 });
// Soft lighting on hard voxels: blend each cube's face normal with the smoothed body normal,
// so light rolls across the form like a rounded 3D shape while the silhouette stays blocky.
import { fishBoost, voxShading, swayTime } from './voxshade.js';
export { fishBoost };
voxShading(mat);
const dummy = new THREE.Matrix4();
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _o = new THREE.Vector3();
const col = new THREE.Color();
const h3 = (x, y, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v), L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w); };

const _w1 = new THREE.Vector3(), _w2 = new THREE.Vector3(), _g = new THREE.Vector3();
export class Fish3D {
  static world = { push: null };
  static poseScale = 1;                     // 1 at full quality; larger on slower phones, so the rig is posed less often
  static topY = 13.2;                       // the highest a fish may go: below the status bar and the phone's safe area, so nothing swims out of view
  static groundAt = null;                   // set by the scene: what the ground looks like at x,z, as { key, cols, scale }            // decoration colliders, set by the scene
  constructor(species, seed, opts = {}) {
    this.species = species; this.id = species.id; this.seed = seed;
    const model = buildModel(species.make(seed, opts.look ?? null));
    const key = (x, y, z) => `${x},${y},${z}`;
    const occ = new Set(model.list.filter((v) => v.tag !== 'pouch').map((v) => key(v.x, v.y, v.z)));      // (a brood pouch is not there most of the time: it does not shade the belly)
    // drop voxels buried on all six sides – they can never be seen
    this.vox = model.list.filter((v) => !(occ.has(key(v.x + 1, v.y, v.z)) && occ.has(key(v.x - 1, v.y, v.z)) && occ.has(key(v.x, v.y + 1, v.z)) && occ.has(key(v.x, v.y - 1, v.z)) && occ.has(key(v.x, v.y, v.z + 1)) && occ.has(key(v.x, v.y, v.z - 1))));
    this.sp = model.sp; this.cx = model.sp.center?.[0] ?? 0;
    this.scale = (opts.scale ?? 1) * (species.vox ?? VOX) * GLOBAL;
    const n = this.vox.length;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
    this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    const jr = (i) => 0.94 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.1;
    this.vox.forEach((v, i) => {
      const k = jr(i) * (1 + (species.move === 'jet' && v.arm < 0 ? 0.6 : 0.1) * Math.max(0, -v.ny) - 0.07 * Math.max(0, v.ny)), glow = v.em > 1 ? 1.2 : v.em ? 1.0 : 1;      // counter-shading: backs a touch darker, bellies lighter
      col.setRGB(Math.min(1, v.c[0] / 255 * k) * glow, Math.min(1, v.c[1] / 255 * k) * glow, Math.min(1, v.c[2] / 255 * k) * glow, THREE.SRGBColorSpace);
      this.mesh.setColorAt(i, col);
    });
    // every fish is its own: a small hue, saturation, brightness and size shift from its seed (neutral whites and eyes stay put)
    { const gn = opts.genes ?? genesOf(seed), dh = gn.dh, ds = gn.ds, dl = gn.dl, hsl = {};
      this.size = gn.size;
      this.vox.forEach((v, i) => { this.mesh.getColorAt(i, col); col.getHSL(hsl); if (hsl.s > 0.2) { col.setHSL((hsl.h + dh + 1) % 1, Math.min(1, hsl.s * ds), Math.min(0.95, hsl.l * dl)); this.mesh.setColorAt(i, col); } }); }
    // baked ambient occlusion from neighbour density + smooth normals for the shader
    const nrm = new Float32Array(n * 3);
    this.vox.forEach((v, i) => {
      let c = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy || dz) && occ.has(key(v.x + dx, v.y + dy, v.z + dz))) c++;
      const ao = Math.max(0, Math.min(0.28, (c / 26 - 0.42) * 1.4));
      this.mesh.getColorAt(i, col); col.multiplyScalar(1 - ao); this.mesh.setColorAt(i, col);
      if (!v.thin) { nrm[i * 3] = v.nx; nrm[i * 3 + 1] = v.ny; nrm[i * 3 + 2] = v.nz; if (v.tag === 'web' || v.tag === 'beak') { nrm[i * 3] = 0; nrm[i * 3 + 1] = 0.45; nrm[i * 3 + 2] = 0.89; }          // the underside of the face is lit from the front, never left in the dark
      else if (species.move === 'jet' && v.arm < 0 && v.ny < 0) { const ny = v.ny * 0.3, m = Math.hypot(v.nx, ny, v.nz) || 1; nrm[i * 3] = v.nx / m; nrm[i * 3 + 1] = ny / m; nrm[i * 3 + 2] = v.nz / m; }   // the underside is not left in the dark when the arms are away
      if (v.arm >= 0) { const a = 0.5, nx = v.nx * a, ny = v.ny * a + 0.5, nz = v.nz * a, m = Math.hypot(nx, ny, nz) || 1; nrm[i * 3] = nx / m; nrm[i * 3 + 1] = ny / m; nrm[i * 3 + 2] = nz / m; } }   // arms move, so light them from above in every pose
    });
    this.mesh.geometry.setAttribute('aN', new THREE.InstancedBufferAttribute(nrm, 3));
    this.baseCol = Float32Array.from(this.mesh.instanceColor.array);
    this.mobile = [];
    this.vox.forEach((v, i) => { if (species.move === 'jet' || (this.sp.bend && v.x + this.cx < this.sp.bend.pivot) || v.flap || v.wave || v.tag === 'tail' || v.tag === 'glint' || v.tag === 'pouch') this.mobile.push(i); });
    this.sq = 0; this.restK = 0; this.crawlK = 0; { const mc = this.sp.mantleC ?? [3, 7]; this.mcx = mc[0] - this.cx; this.mcy = mc[1] - (this.sp.center?.[1] ?? 0); this.rig = this.sp.rig ?? null; this.rs = { rest: 0, crawl: 0, sq: 0, ph: 0, work: 0, greet: 0 }; this.workK = 0; this.greetK = 0; this.glowK = 0; this.greet = null; this.jar = null;
    // the octopus's body language and its own arms: each arm has a mind (it probes the floor, reaches for a passing fish), it can press itself flat against the glass, it shows mood in its skin, and it keeps a den
    this.minds = Array.from({ length: 8 }, () => ({ k: 0, until: 0, next: 1 + Math.random() * 5, x: 0, y: 0, z: 0 })); this.rs.minds = this.minds; this.rs.glass = 0; this.glassNear = 0; this.glassAt = null; this.hunt = null; this.den = null; this.hoard = 0;
    this.stride = 0.85 + (((seed | 0) % 7) / 7) * 0.4; this.rs.stride = this.stride; this.gr = null; this.bold = (((seed | 0) * 37) % 100) / 100; this.glideK = 0; this.cruiseK = 0; this.landK = 0; this.dashK = 0; this.lookX = 0; this.lookY = 0; this.lookT = 0; this.lift = 0; this.sleepK = 0; this.blinkK = 0; this.blinkNext = 3 + Math.random() * 5; this.wakeT = 0; this.isNight = false; this.mw = { scared: 0, annoyed: 0, hunting: 0, fond: 0 }; this.mwA = { scared: 0, annoyed: 0, hunting: 0, fond: 0 }; this.scareT = 0; this.annoyT = 0; this.pokes = 0; this.pokeT = 0; this.bump = 0; this.fondFocus = false; this.carryMesh = null;
    { let sy = 0, n = 0; for (const v of this.vox) { if (v.tag === 'eye') { sy += v.y; n++; } v.pap = species.move === 'jet' && h3(v.x * 3, v.y * 5 + 1, v.z * 7) > 0.7; } this.eyeY = n ? sy / n : 0; } this.camoK = 0; this.camoApplied = 0; this.camoMix = 1; this.flush = 0; this.restFor = 0; this.camoT0 = 0; this.rp = [0, 0, 0]; this.flatK = 0; this.lionK = 0; this.snakeK = 0; this.jellyK = 0; this.kelpK = 0; this.puffK = 0; this.sink = 0; this.gait = null; this.act = null; this.actText = null; this.follow = null; this.startleCool = 0; this.throwCool = 0; this.nearFor = 0; }
    this.setPose(0, true);
    this.group = new THREE.Group(); this.group.add(this.mesh);
    // state
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(1, 0, 0); this.target = new THREE.Vector3();
    this.phase = Math.random() * 6; this.retarget = 0; this.heading = 0; this.pitch = 0; this.roll = 0;
    this.speed = opts.speed ?? 1; this.band = opts.band ?? { x: [-3.6, 3.6], y: [2, 13], z: [0.4, 1.9] };
    this.name = opts.name ?? species.label; this.profile = opts.profile; this.radius = (species.length ?? 50) * (species.vox ?? VOX) * GLOBAL * (opts.scale ?? 1) * 0.55; this.accum = 0; this.cool = 0; this.baseScale = (opts.scale ?? 1) * (this.size ?? 1); this.cr = Math.max(0.2, this.radius * 0.3);
  }
  // growth: baby -> juvenile -> adult changes the fish's size
  // the sand its body has to stay above: under an octopus, the highest sand across its mantle and head; under a fish, along its length from nose to tail
  sandBelow() {
    if (this.species.move === 'jet') return sandH(this.pos.x, this.pos.z);      // an octopus walks by the sand under its middle; its body is drawn lifted clear of a slope beside it (see liftSand)
    const L = this.radius * 0.75, cp = Math.cos(this.pitch || 0), fx = Math.cos(this.heading) * L * cp, fz = -Math.sin(this.heading) * L * cp, fy = Math.sin(this.pitch || 0) * L, deep = Math.max(0, this.radius * 0.45 - 0.35) + (this.sp.tail ? (this.tailLow != null ? Math.max(0, -(this.holdfast ? Math.max(this.tailLow, this.tailLowHeld ?? -99) : this.tailLow) * this.scale - 0.3) : this.radius * 0.5) : 0);      // a seahorse's tail hangs below it; on its way to a stem it curls up ready to grip, so it can come down to where it will hold on      // a deep-bodied fish (and a seahorse's hanging tail) needs more room under it
    return deep + Math.max(sandUnder(this.pos.x, this.pos.z, this.radius * 0.28), sandH(this.pos.x + fx, this.pos.z + fz) - fy, sandH(this.pos.x - fx, this.pos.z - fz) + fy);
  }
  setGrowth(k) { this.growth = k; this.scale = k * (this.species.vox ?? VOX) * GLOBAL * (this.baseScale ?? 1); this.radius = (this.species.length ?? 50) * (this.species.vox ?? VOX) * GLOBAL * k * (this.baseScale ?? 1) * 0.55; this.cr = Math.max(0.2, this.radius * (this.species.move === 'jet' ? 0.25 : 0.3)); this.setPose(this.phase, true); }
  // write per-voxel transforms for a tail phase
  setPose(phase, all = false) {
    const b = this.sp.bend, s = this.scale, arr = this.mesh.instanceMatrix.array, jet = this.species.move === 'jet';
    const list = all ? null : this.mobile, tailRig = this.sp.tail ? (this.tailRig = seahorseTail(this.sp, this.curlK ?? 0, this.gripK ?? 0, this.tailRig, this.gripStem ?? SEAHORSE_STEM, this.gripLean ?? SEAHORSE_LEAN)) : null;
    if (tailRig) { const cp = Math.cos(this.pitch || 0), sp = Math.sin(this.pitch || 0); let lo = 0; for (let i = 0; i < tailRig.x.length; i += 3) lo = Math.min(lo, tailRig.x[i] * sp + tailRig.y[i] * cp); this.tailLow = lo - 2.6; }      // how far below its middle the tail reaches as it is posed now (model voxels), so the sand clamp keeps all of it out of the sand
    const n = all ? this.vox.length : list.length;
    // an octopus arm is posed once per station along its centre line, not once per voxel: a few thousand voxels share a few hundred stations
    let pc = null, pcs = null, stamp = 0, poseAt = null, layAt = null;
    if (jet && this.rig) {
      pc = this.pc ||= new Float32Array(8 * 1024 * 3); pcs = this.pcs ||= new Int32Array(8 * 1024); stamp = this.pstamp = (this.pstamp | 0) + 1; const rig = this.rig, rp = this.rp, S = this.rs;
      S.rest = this.restK; S.crawl = this.crawlK; S.sq = this.sq; S.ph = phase; S.work = this.workK; S.greet = this.greetK; S.glass = this.glassNear; S.stride = this.stride * (this.gait?.stride ?? 1); S.glide = this.glideK; S.cruise = this.cruiseK; S.land = this.landK; S.dash = this.dashK;
      S.flat = this.flatK; S.lion = this.lionK; S.snake = this.snakeK; S.jelly = this.jellyK; S.kelp = this.kelpK; S.tt = this.tt ?? 0; S.sinkY = (0.5 * this.sink) / (this.scale || 0.06);
      // the arms lie on the real sand: a point of an arm that would be under the sand (on a slope, or against the face of a bank) is lifted back onto it, along the octopus's own up
      const ready = !!(this.group && this.pos), gs = ready ? this.group.scale.x || 1 : 1, W = s * gs, e = _m4.makeRotationFromEuler(_eu.set(this.roll || 0, this.heading || 0, this.pitch || 0, 'YZX')).elements, ox = ready ? this.pos.x : 0, oy = ready ? this.pos.y + (this.lift ?? 0) + (this.liftSand ?? 0) : 0, oz = ready ? this.pos.z : 0;
      const onSand = ready && this.st?.s !== 'bury' && (this.sink ?? 0) < 0.05 && W > 0;
      const lay = (p) => { const wx = ox + (e[0] * p[0] + e[4] * p[1] + e[8] * p[2]) * W, wy = oy + (e[1] * p[0] + e[5] * p[1] + e[9] * p[2]) * W, wz = oz + (e[2] * p[0] + e[6] * p[1] + e[10] * p[2]) * W, g = sandUnder(wx, wz, 0.12) + 0.12;
        if (wy < g) { const d = (g - wy) / W; p[0] += e[1] * d; p[1] += e[5] * d; p[2] += e[9] * d; }
      };

      // and an arm never goes into a rock, a pot, the coconut shell or a plant: each arm is followed out from the body, and if it would meet something it is drawn back
      // to stop short of it (eased, so it does not snap), the way an octopus pulls in an arm that touches something. An arm wrapped round a thing it is holding is left as it is.
      const reach = (this.reach ||= new Float32Array(8).fill(1)), Wd = Fish3D.world, solidAt = (x, y, z) => { for (const h of [Wd, Wd?.soft]) if (h?.at && (h.at(x, y, z) || h.at(x + 0.1, y, z) || h.at(x - 0.1, y, z) || h.at(x, y, z + 0.1) || h.at(x, y, z - 0.1) || h.at(x, y + 0.1, z))) return true; return false; };
      if (ready && Wd?.at && rig.arms.length <= 8) for (let a = 0; a < rig.arms.length; a++) {
        let free = 1; if (!(this.rs.jr > 0)) for (let k = 2; k <= 12; k++) { rig.pose(rig.arms[a], k / 12, S, _rq); const p = _rq, wx = ox + (e[0] * p[0] + e[4] * p[1] + e[8] * p[2]) * W, wy = oy + (e[1] * p[0] + e[5] * p[1] + e[9] * p[2]) * W, wz = oz + (e[2] * p[0] + e[6] * p[1] + e[10] * p[2]) * W;
          if (solidAt(wx, Math.max(wy, sandH(wx, wz) + 0.1), wz)) { free = Math.max(0.22, (k - 1.6) / 12); break; } }
        reach[a] += (free - reach[a]) * (free < reach[a] ? 0.6 : 0.12);
      }
      layAt = onSand ? lay : null;
      poseAt = (arm, at) => { const key = arm * 1024 + Math.round(at * 990), k3 = key * 3; if (pcs[key] !== stamp) { rig.pose(rig.arms[arm], at * (reach[arm] ?? 1), S, rp); if (onSand) lay(rp); pc[k3] = rp[0]; pc[k3 + 1] = rp[1]; pc[k3 + 2] = rp[2]; pcs[key] = stamp; } else { rp[0] = pc[k3]; rp[1] = pc[k3 + 1]; rp[2] = pc[k3 + 2]; } };
    }
    for (let j = 0; j < n; j++) {
      const i = all ? j : list[j], v = this.vox[i];
      let x = v.x, y = v.y, z = v.z, grow = 1;
      if (v.tag === 'pouch') { grow = (this.brood ?? 0) >= v.pk ? 1 : 0; if (this.contractK) x -= 1.2 * this.contractK * v.pk; }      // a male's brood pouch, only as full as it is (squeezed as he gives birth)
      if (b) {
        const piv = b.pivot - this.cx;
        if (x < piv) { const d = piv - x, t = Math.min(1, d / b.len), th = b.amp * Math.sin(phase) * Math.pow(t, 1.15); x = piv - d * Math.cos(th); z += d * Math.sin(th); y += b.bob * Math.sin(phase + 1.3) * t; }
      }
      if (v.flap) z += Math.sign(v.z || 1) * v.flap * (0.55 + 0.45 * Math.sin(phase * 2 + x * 0.25));
      if (v.wave) z += v.wave * Math.sin(phase + x * 0.45);
      if (tailRig && v.tag === 'tail') { const ti = v.at, k3 = ti * 3, T = tailRig.T, Nn = tailRig.N, B = tailRig.B, ot = v.off[0], on = v.off[1], oz = v.z; x = tailRig.x[ti] + ot * T[k3] + on * Nn[k3] + oz * B[k3]; y = tailRig.y[ti] + ot * T[k3 + 1] + on * Nn[k3 + 1] + oz * B[k3 + 1]; z = tailRig.z[ti] + ot * T[k3 + 2] + on * Nn[k3 + 2] + oz * B[k3 + 2]; }      // the seahorse's tail: each voxel keeps its place across the tail's own frame as the tail curls flat or wraps round a stem
      else if (tailRig && v.tag === 'glint') { const e = v.z > 0 ? this.eyeR : this.eyeL; if (e) { x += e.x; y += e.y; z += Math.sign(v.z) * 0.3; } }      // each eye looks its own way
      if (jet && v.pupil) { x += this.lookX; y += this.lookY; }
      if (jet && v.tag === 'eye') { const lid = Math.max(this.sleepK * 0.92, this.blinkK, (this.squintK ?? 0) * 0.55) - (this.wideK ?? 0) * 0.3; if (Math.abs(lid) > 0.02) y = this.eyeY + (y - this.eyeY) * (1 - 0.88 * lid); }
      if (jet) {                                                           // octopus: arms spread flat at rest and stream back tight in a jet, the mantle squeezes with each pulse
        if (v.arm >= 0 && this.rig) {                                      // a rigged arm: its centre line is posed for the current state and the voxel keeps its offset from it
          poseAt(v.arm, v.at);
          const k = 1 - 0.2 * this.sq; x = this.rp[0] + v.off[0] * k; y = this.rp[1] + v.off[1] * k; z = this.rp[2] + v.off[2] * k;
        }
        else if (v.web && this.rig) {                                      // webbing between two arms: it hangs between the two centre lines at the same point along each
          const w = v.web; poseAt(w.a, w.at); const ax = this.rp[0], ay = this.rp[1], az = this.rp[2]; poseAt(w.b, w.at);
          const gather = 1 - this.restK * 0.85 - this.crawlK * 0.3, sag = w.sag * (1 + 0.6 * Math.max(0, gather));
          x = ax + (this.rp[0] - ax) * w.u; y = ay + (this.rp[1] - ay) * w.u - sag; z = az + (this.rp[2] - az) * w.u;
          if (layAt) { _rq[0] = x; _rq[1] = y; _rq[2] = z; layAt(_rq); x = _rq[0]; y = _rq[1]; z = _rq[2]; }
        }
        else if (v.tag === 'arm') { z *= 1 + 0.75 * this.restK + 0.35 * this.crawlK - 0.62 * this.sq; y = y * (1 - 0.42 * this.restK - 0.2 * this.crawlK - 0.3 * this.sq) - 1.2 * this.restK; if (this.crawlK) y += Math.sin(phase * 1.3 + z * 0.5) * 0.9 * this.crawlK * (v.wave || 0); }
        else { const k = 1 - 0.15 * this.sq + (0.025 + 0.02 * this.restK) * Math.sin((this.tt ?? 0) * (1.8 - 0.9 * this.sleepK));      // he breathes, slower when asleep
           // puffed up like a jellyfish the body swells and each voxel grows with it, so no gaps open between them
           const fK = Math.min(1, (this.flatK ?? 0) + 0.6 * (this.snakeK ?? 0)), pK = this.puffK ?? 0, sxk = 1 + 0.06 * this.sq + 0.13 * this.glideK + 0.22 * fK + 0.2 * pK, szk = k * (1 - 0.05 * this.glideK) * (1 + 0.22 * fK + 0.2 * pK);
           const ih = 1 + 0.1 * (this.inhaleK ?? 0); x = this.mcx + (x - this.mcx) * sxk * ih; y = this.mcy + (y - this.mcy) * k * (1 - 0.1 * this.restK) * (1 - 0.05 * this.glideK) * (1 + 0.2 * pK) * ih; z *= szk * ih; grow = Math.max(sxk, szk, 1 + 0.2 * pK); if (v.pap && this.bump > 0.03) { const bb = this.bump * 1.3; x += v.nx * bb; y += v.ny * bb; z += v.nz * bb; }
           if (this.lean) { const dx = x, dy = y + 2, cl = Math.cos(this.lean), sl = Math.sin(this.lean); x = dx * cl - dy * sl; y = -2 + dx * sl + dy * cl; }                 // tips about the neck
           if (fK > 0.01) { y = -2.5 + (y + 2.5) * (1 - 0.5 * fK) - 1.2 * fK; grow = Math.max(grow, 1 + 0.12 * fK); }      // flat as a sole: the mantle laid back along the sand and the whole body pressed down onto the roots of its arms, so the head stays joined to them
           if (this.yaw && v.tag !== 'mantle') { const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), dx = x; x = dx * cy - z * sy; z = dx * sy + z * cy; }                 // the head turns
           if (v.tag === 'web' || v.tag === 'beak') { const j = 1 - this.restK - 0.6 * this.crawlK; if (j > 0) { x -= 1.4 * j; y += 1.6 * j; z *= 1 - 0.12 * j; } if (this.chewK > 0.01) { const ch = this.chewK * Math.sin(this.tt * 16); if (v.tag === 'beak') { y += ch * 0.8; z += Math.sign(v.z || 1) * ch * 0.7; } else if (!v.web && v.y < -5) y += ch * 0.4; } }      // chewing: the beak works and the lips move with it      // jetting, the mouth and the web draw up into the head behind the streaming arms
           y += this.bob ?? 0; }
      }
      const o = i * 16, sg = s * grow;
      arr[o] = sg; arr[o + 5] = sg; arr[o + 10] = sg; arr[o + 15] = 1;
      arr[o + 12] = x * s; arr[o + 13] = y * s; arr[o + 14] = z * s;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  // hard constraints: never end a frame inside a decoration or another fish
  resolve(others) {
    const W = Fish3D.world, R = this.radius, cp = Math.cos(this.pitch), fx = cp * Math.cos(this.heading), fy = Math.sin(this.pitch), fz = -cp * Math.sin(this.heading);
    // a fish is solid down its length; an octopus only in its mantle and head (its arms wrap round things, they do not hold it off them), and one frame can only ever nudge it, never throw it
    const jet = this.species.move === 'jet', sea = !!this.sp?.tail, offs = jet ? [-0.3, 0, 0.3] : sea ? [-0.55, -0.25, 0.05, 0.35] : [-0.8, -0.4, 0, 0.4, 0.8]; if (jet) _p2.copy(this.pos);
    // a seahorse is upright and slim: it is felt for from its tail up to its head and snout. Swimming, it keeps off leaves too, but not on the last stretch
    // onto its own holdfast, nor while it holds on, greets or holds tails (its grip was found clear of every leaf already)
    const Hf = this.holdfast, seaSoft = sea && !this.link && !this.greet && !(Hf && (Hf.on || Hf.settle || this.pos.distanceTo(this.target) < 1.0));
    if (seaSoft && W.soft?.at) { const v = Math.hypot(this.vel.x, this.vel.z);      // leaves just ahead: it rises over them rather than pushing through
      if (v > 0.02) { const blocked = (ang) => { const c = Math.cos(ang), s2 = Math.sin(ang), dx = (this.vel.x * c - this.vel.z * s2) / v, dz = (this.vel.x * s2 + this.vel.z * c) / v; return [0.5, 0.9].some((d) => [-0.55, -0.2, 0.15, 0.4].some((k) => W.soft.at(this.pos.x + dx * d, this.pos.y + R * k, this.pos.z + dz * d) || W.at?.(this.pos.x + dx * d, this.pos.y + R * k, this.pos.z + dz * d))); };
        if (blocked(0)) { const ang = [0.6, -0.6, 1.1, -1.1].find((a2) => !blocked(a2));      // a way round: the nearest clear heading either side, eased into
          if (ang != null) { const k = Math.min(1, (this.rdt ?? 1 / 60) * 2.5) * ang, c = Math.cos(k), s2 = Math.sin(k), vx = this.vel.x * c - this.vel.z * s2; this.vel.z = this.vel.x * s2 + this.vel.z * c; this.vel.x = vx; }
          else this.pos.y += 0.45 * (this.rdt ?? 1 / 60); } } }      // no way round: over the top
    if (W.push && !this.homing) for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const off of jet ? [...offs, 'mantle'] : sea ? [...offs, 'snout'] : offs) {                   // samples down the length of the body (and an octopus's mantle, which trails up behind its head)
        if (off === 'mantle') { const sc = this.scale || 0.06; _p1.set(this.pos.x + fx * this.mcx * sc, this.pos.y + this.mcy * sc, this.pos.z + fz * this.mcx * sc); } else if (off === 'snout') this.snout(_p1); else if (sea) _p1.set(this.pos.x, this.pos.y + R * off, this.pos.z); else _p1.set(this.pos.x + fx * R * off, this.pos.y + fy * R * off, this.pos.z + fz * R * off); _o.set(0, 0, 0);
        const n = W.push(_p1, this.cr, _o) + (W.soft && (jet ? this.st?.s !== 'kelp' && this.st?.s !== 'jar' : !this.sp.tail) ? W.soft.push(_p1, this.cr * (jet ? 1.0 : 0.85), _o) : seaSoft && W.soft ? W.soft.push(_p1, this.cr * 0.9, _o) : 0);      // plants are soft: only the octopus, crawling through the floor clutter or coming down to land, is kept off their stems; jetting, it passes over the leaves like a fish
        if (n) { if (_o.lengthSq() < 1e-6) _o.set(fx, 0, fz); const m = _o.length() || 1, step = Math.min(0.25, 0.04 * n + 0.04); this.pos.addScaledVector(_o, step / m); moved = true; }
      }
      if (!moved) break;
    }
    if (jet) { const L = this.pos.distanceTo(_p2); if (L > 0.08) this.pos.lerpVectors(_p2, this.pos, 0.08 / L); if (this.pos.z < OCT_BACK && this.pos.y < sandH(this.pos.x, this.pos.z) + 1.3) this.pos.z = OCT_BACK; }      // and on the sand it is never pushed off the back of the bank
    for (const o of others) {                                               // fish are solid too
      if (o === this || (jet && o.species.move !== 'jet') || this.link?.o === o) continue;      // a fish gets out of an octopus's way, never the other way round: a passing fish must not shove it off a ramp
      const dx = this.pos.x - o.pos.x, dy = this.pos.y - o.pos.y, dz = (this.pos.z - o.pos.z) * 1.5, dd = Math.hypot(dx, dy, dz), min = this.sp.tail && o.sp?.tail ? 0.9 * (this.cr + o.cr) : Math.max(0.5, 0.42 * (this.radius + o.radius));      // two seahorses are slim and may hold on side by side
      if (dd < min * 0.92 && dd > 1e-3) { const k = (min * 0.92 - dd) / dd * (!jet && o.species.move === 'jet' ? 1 : 0.5); this.pos.x += dx * k; this.pos.y += dy * k; this.pos.z += dz * k / 1.5; }
    }
    this.pos.x = Math.max(-4.7, Math.min(4.7, this.pos.x)); this.pos.y = Math.max(0.35 + this.sandBelow(), Math.min(Fish3D.topY - Math.min(0.9, this.radius * 0.35), this.pos.y)); this.pos.z = Math.max(-3.8, Math.min(GLASS_Z - 0.2, this.pos.z));
  }
  mouth() { if (this.sp.tail) return this.snout(new THREE.Vector3()); return new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading)).multiplyScalar(this.radius * 0.62).add(this.pos); }      // a seahorse eats at the tip of its snout
  pick(rng) {
    const b = this.band;
    this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0]));
    for (let tries = 0; tries < 10 && Fish3D.world.push; tries++) { _o.set(0, 0, 0); if (!Fish3D.world.push(this.target, this.radius * 0.5 + 0.4, _o)) break; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); }
    this.retarget = 3 + rng() * 5;
  }
  // catching a crab, and eating it the way an octopus does. The nearest arm reaches out, pins it, and lifts it up in front of the face, clear of the body and the sand.
  // Then the arms beside it take turns: one reaches over, tugs a leg until it comes away, and carries it on its tip to the beak under the head, where it is chewed
  // (a puff of crumbs). The legs go first, then the claws. The empty shell is turned over and dropped on the sand beside it, the way octopuses leave shells outside their dens.
  updateGrab(dt, S) {
    const h = this.hunt, sc = this.scale || 0.06, ch = Math.cos(this.heading), sh = Math.sin(this.heading), rig = this.rig; if (!h || !rig) return;
    const dx = h.x - this.pos.x, dz = h.z - this.pos.z, hg = sandH(h.x, h.z), C = [(dx * ch - dz * sh) / sc, (hg + 0.2 - this.pos.y) / sc, (dx * sh + dz * ch) / sc];      // the crab on the sand where it is, on whichever level
    const H = [22, 4, 0], MD = [7.5, -8.6, 0], D = [23, -6.5, 5];               // H: held up in front of the eyes. MD: just under the beak. D: where the empty shell is left
    const parts = h.mesh?.userData?.parts ?? [], P0 = 3.4, STEP = 0.95, TB = P0 + parts.length * STEP, END = TB + 2.0;
    let G = this.rs.grab; if (!G) {
      const ang = Math.atan2(C[2], C[0] - 3); let best = 0, bd = 9; rig.arms.forEach((a, i) => { const d = Math.abs(Math.atan2(Math.sin(a.th - ang), Math.cos(a.th - ang))); if (d < bd) { bd = d; best = i; } });
      const p0 = rig.pose(rig.arms[best], 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0]); G = this.rs.grab = { arm: best, n1: (best + 1) % 8, n2: (best + 7) % 8, p: [...p0], p0: [...p0], w: 0, t: 0, pk: null };
      // now and then it inks the crab first: decided from where the crab is, so every phone in the tank agrees
      if (!h.inked && (h.forceInk || Math.abs(Math.sin(Math.round(h.x * 10) * 12.9898 + Math.round(h.z * 10) * 78.233) * 43758.5453) % 1 < 0.35)) { G.ink = true; G.t = -1.1; }
    }
    if (h.y > hg + 0.25) { G.t = G.ink && !h.inked ? -1.1 : 0; G.w = 0; return; }                                                            // wait for the crab to land
    if (G.t < 1.0 && !h.pinned && Math.hypot(h.x - this.pos.x, h.z - this.pos.z) > 1.7) { this.rs.grab = null; this.gr = null; G.w = 0; S.s = 'crawl'; S.t = 6; this.flush = Math.max(this.flush, 0.4); return; }      // the crab bolted before the arm closed: after it again
    G.t += dt; const t = G.t, e = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };
    if (t < 1.8) { const gap = Math.hypot(dx, dz), want = 12 * sc + 0.85 * (h.mesh?.scale?.x ?? 1.15) / 1.15; if (gap < want && gap > 1e-3) { const k = (want - gap) * Math.min(1, dt * 5); this.pos.x -= (dx / gap) * k; this.pos.z -= (dz / gap) * k; } }      // it keeps an arm's length: the crab is never under its head
    const toWorld = (m, out) => { const x = m[0] * sc, z = m[2] * sc; return out.set(this.pos.x + x * ch + z * sh, this.pos.y + this.lift + m[1] * sc, this.pos.z - x * sh + z * ch); };
    const toModel = (w) => { const ddx = w.x - this.pos.x, ddz = w.z - this.pos.z; return [(ddx * ch - ddz * sh) / sc, (w.y - this.pos.y - this.lift) / sc, (ddx * sh + ddz * ch) / sc]; };
    // inking: it fixes on the crab, pumps its mantle and squirts a jet of ink straight at it. The crab is left dazed in the cloud and does not dodge, and the arm goes in through the ink
    if (t < 0) {
      const u = 1.1 + t; this.sq = Math.max(this.sq, 0.4 * Math.sin(Math.min(1, u / 0.55) * Math.PI)); this.flush = Math.max(this.flush, 0.5); G.w = 0;
      if (u > 0.5 && !h.inked) { h.inked = true; h.dazed = performance.now() + 5000; const side = C[2] >= 0 ? 1 : -1; this.onInkAt?.(toWorld([-1.5, -1.5, 7.5 * side], _w1).clone(), new THREE.Vector3(h.x, 0.28, h.z)); this.flush = 1; this.sq = 0.55; }
      return;
    }
    // the holding arm
    let T; if (t < 1.0) { const q = e(t / 1.0); T = [G.p0[0] + (C[0] - G.p0[0]) * q, G.p0[1] + (C[1] - G.p0[1]) * q + Math.sin(q * Math.PI) * 3, G.p0[2] + (C[2] - G.p0[2]) * q]; }
    else if (t < 1.8) { T = [C[0] + Math.sin(t * 31) * 0.9, C[1] + Math.abs(Math.sin(t * 27)) * 0.6, C[2] + Math.cos(t * 29) * 0.9]; this.sq = Math.max(this.sq, 0.22 * Math.abs(Math.sin(t * 24))); this.flush = Math.max(this.flush, 0.6); }      // pinned: the crab kicks, the arm holds, the mantle pumps
    else if (t < 3.1) { const q = e((t - 1.8) / 1.3), out = Math.sin(q * Math.PI), r = Math.hypot(C[0] - 3, C[2]) || 1; T = [C[0] + (H[0] - C[0]) * q + ((C[0] - 3) / r) * out * 5, C[1] + (H[1] - C[1]) * q + out * 4, C[2] + (H[2] - C[2]) * q + (C[2] / r) * out * 5]; }      // lifted out and away from the body first, then up in front
    else if (t < TB) T = [H[0] + Math.sin(t * 1.3) * 0.6, H[1] + Math.sin(t * 2.1) * 0.4, H[2] + Math.sin(t * 0.9) * 1.2];      // held up, turned a little this way and that
    else { const q = e((t - TB) / 1.3); T = [H[0] + (D[0] - H[0]) * q, H[1] + (D[1] - H[1]) * q + Math.sin(q * Math.PI) * 2, H[2] + (D[2] - H[2]) * q]; }
    G.w = Math.min(1, t / 0.3) * (t > END - 0.5 ? Math.max(0, 1 - (t - (END - 0.5)) / 0.45) : 1);
    h.pinned = t >= 1.0;
    const S0 = this.rs, tip = rig.pose(rig.arms[G.arm], 1, S0, this.rp), steer = Math.min(1, dt * 6); G.p[0] += (T[0] - tip[0]) * steer; G.p[1] += (T[1] - tip[1]) * steer; G.p[2] += (T[2] - tip[2]) * steer;
    let chew = 0;
    if (t > 1.8 && h.mesh && !h.dropped) {
      h.y = 0.2; h.held = true; const was = (h.from ??= h.mesh.position.clone()), at = toWorld([tip[0], tip[1] + 1, tip[2]], _w1), kb = e((t - 1.8) / 0.5); h.mesh.position.copy(was).lerp(at, kb);      // taken smoothly from where it sat into the arm's grip
      const s0 = (h.s0 ??= h.mesh.scale.x), small = s0 - (s0 - 0.95) * e((t - 1.8) / 1.3); h.mesh.scale.setScalar(small);       // drawn in a little as it is lifted
      { const want = Math.atan2(ch, -sh) + Math.sin(t * 0.9) * 0.3, r0 = (h.ry0 ??= h.mesh.rotation.y), d = Math.atan2(Math.sin(want - r0), Math.cos(want - r0)); h.mesh.rotation.y = r0 + d * e((t - 2.25) / 0.85); h.mesh.rotation.x = 0; }      // turned so its claws point away from the octopus and its legs to either side, where the arms can reach them
      h.mesh.rotation.z = t < TB ? Math.min(0.35, (t - 1.8) * 0.4) : 0.35 + (Math.PI - 0.35) * e((t - TB) / 1.1);   // the empty shell is turned over as it is put down
      const rest = sandH(h.mesh.position.x, h.mesh.position.z) + 0.13 + 0.2 * (1 - Math.cos(h.mesh.rotation.z)) * (h.mesh.scale.x / 0.95);                  // resting height: upside down, the dome is underneath, so it sits higher
      if (t > TB) h.mesh.position.y = Math.max(h.mesh.position.y, rest + 0.25 * (1 - e((t - TB) / 1.3)));      // set down on the sand, never into it
      if (t > TB + 1.3) { h.dropped = true; h.mesh.position.y = rest; h.x = h.mesh.position.x; h.z = h.mesh.position.z; }
    }
    // the plucking arms, one leg at a time
    if (t > P0 - 0.1 && t < TB && h.mesh && parts.length) {
      const i = Math.max(0, Math.min(parts.length - 1, Math.floor((t - P0) / STEP))), pt = parts[i], q = (t - (P0 + i * STEP)) / STEP, arm = i % 2 ? G.n1 : G.n2;
      if (!G.pk || G.pk.i !== i) { const p0 = rig.pose(rig.arms[arm], 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0]); G.pk = { i, arm, p: [...p0], w: 0 }; for (let k = 0; k < i; k++) parts[k].visible = false; }
      h.mesh.updateMatrixWorld(true);
      const U = pt.userData; if (!U.c) { const b = new THREE.Box3().setFromObject(pt), cw = b.getCenter(new THREE.Vector3()); U.c = pt.worldToLocal(cw.clone()); U.home = pt.position.clone(); }
      const ptip = rig.pose(rig.arms[arm], 1, S0, [0, 0, 0]);
      let Tk, attached = q < 0.46;
      const partW = pt.localToWorld(_w2.copy(U.c)), partM = toModel(partW);
      if (q < 0.32) { const k = e(q / 0.32); Tk = [G.pk.p[0] + (partM[0] - G.pk.p[0]) * k, G.pk.p[1] + (partM[1] + 2 - G.pk.p[1]) * k, G.pk.p[2] + (partM[2] - G.pk.p[2]) * k]; }
      else if (q < 0.46) Tk = partM;
      else if (q < 0.66) { const k = e((q - 0.46) / 0.2), W = [15, -8.2, partM[2] * 0.3]; Tk = [partM[0] + (W[0] - partM[0]) * k, partM[1] + (W[1] - partM[1]) * k, partM[2] + (W[2] - partM[2]) * k]; }      // down first, to the level of the beak, in front of the head
      else if (q < 0.86) { const k = e((q - 0.66) / 0.2), W = [15, -8.2, partM[2] * 0.3]; Tk = [W[0] + (MD[0] - W[0]) * k, W[1] + (MD[1] - W[1]) * k, W[2] + (MD[2] - W[2]) * k]; }      // then in under it, to the beak
      else Tk = MD;
      G.pk.w = Math.min(1, q / 0.15) * (q > 0.9 ? Math.max(0, 1 - (q - 0.9) / 0.1) : 1);
      const ks = Math.min(1, dt * 8); G.pk.p[0] += (Tk[0] - ptip[0]) * ks; G.pk.p[1] += (Tk[1] - ptip[1]) * ks; G.pk.p[2] += (Tk[2] - ptip[2]) * ks;
      if (attached) { const tug = q > 0.32 ? Math.sin((q - 0.32) / 0.14 * Math.PI * 4) * 0.05 * (1 - (q - 0.32) / 0.14) : 0; pt.position.set(U.home.x + tug, U.home.y + tug * 0.5, U.home.z); pt.scale.setScalar(1); }    // a few tugs, then it comes away
      else {                                                                                                // it rides on the tip of the plucking arm to the beak, and is gone
        const s2 = q < 0.58 ? 1 : Math.max(0.01, 1 - (q - 0.58) / 0.34),      // bitten down as it goes in, so nothing big ever slides under the head
        lp = pt.parent.worldToLocal(toWorld(ptip, _w1)); pt.scale.setScalar(s2); pt.position.set(lp.x - U.c.x * s2, lp.y - U.c.y * s2, lp.z - U.c.z * s2);
        if (q > 0.92) pt.visible = false;
        if (q > 0.86 && !U.crumb) { U.crumb = true; this.onPush?.(toWorld(MD, _w1).clone(), new THREE.Vector3(0, -0.4, 0)); this.flush = Math.max(this.flush, 0.35); }
        chew = Math.max(chew, q > 0.7 ? Math.sin(Math.min(1, (q - 0.7) / 0.3) * Math.PI) : 0);
      }
    } else if (G.pk) { G.pk.w = Math.max(0, G.pk.w - dt * 3); if (t >= TB) for (const pt of parts) pt.visible = false; }
    this.chewK = Math.max(chew, t > P0 && t < TB + 0.4 ? 0.2 + 0.12 * Math.sin(t * 9) : 0);                  // the beak keeps working while it eats
    if (t > P0 && t < TB) this.sq = Math.max(this.sq, 0.06 + 0.05 * Math.sin(t * 6));                          // a slow, contented pulse of the mantle
    if (t >= END) { S.t = 0; }
  }
  // holding something: a shell carried home in the front arms, or one arm gripping the jar's lid and twisting it while the others steady the glass
  updateHold(dt, S, kind) {
    const sc = this.scale || 0.06, rig = this.rig; if (!rig) return;
    let G = this.rs.grab; if (!G || G.kind !== kind) {
      const ang = kind === 'jar' ? Math.atan2(this.rs.jz ?? 0, (this.rs.jx ?? 14) - 3) : 0; let best = 0, bd = 9; rig.arms.forEach((a, i) => { const d = Math.abs(Math.atan2(Math.sin(a.th - ang), Math.cos(a.th - ang))); if (d < bd) { bd = d; best = i; } });
      const p0 = rig.pose(rig.arms[best], 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0]); G = this.rs.grab = { kind, arm: best, n1: (best + 1) % 8, n2: (best + 7) % 8, p: [...p0], p0: [...p0], w: 0, t: 0, a0: ang };
    }
    G.t += dt; G.w = Math.min(1, G.t / 0.5); let T;
    if (kind === 'carry') T = [9, -7.3, 0.4 + Math.sin(G.t * 2) * 0.3];
    else { const R = (this.rs.jr ?? 12) * 0.92, a = Math.PI + G.a0 + Math.sin(G.t * 1.7) * 0.8; G.twist = Math.sin(G.t * 1.7) * 0.8; T = [(this.rs.jx ?? 14) + Math.cos(a) * R * 0.8, (1.25 - this.pos.y) / sc, (this.rs.jz ?? 0) + Math.sin(a) * R * 0.8]; G.w = Math.min(1, G.t / 0.8); }
    const tip = rig.pose(rig.arms[G.arm], 1, this.rs, this.rp), k = Math.min(1, dt * 6); for (let i = 0; i < 3; i++) G.p[i] += (T[i] - tip[i]) * k;
    if (kind === 'carry' && this.carryMesh) { this.carryMesh.visible = true; this.carryMesh.position.set(tip[0] * sc, tip[1] * sc, tip[2] * sc); }       // the shell sits in the arm
  }
  // being poked: a few taps in a row and he gets annoyed (dark skin, a squirt); something sudden makes him startle, pale, and jet away
  poke() { this.wakeT = 6; this.pokes++; this.pokeT = 12; if (this.pokes >= 4) { this.pokes = 0; this.annoyT = 8; this.fearHere(); return true; } return false; }
  // where it settles at its den: inside the mouth of a coconut or pot it moved into, between the rocks of a shelter it built, or just in front of anything else
  // a spot on the floor an octopus can actually stand on: nothing solid there (plants included)
  freeSpot(x, z) { const W = Fish3D.world; if (!W.push) return true; _p2.set(x, 0.55 + sandH(x, z), z); _o.set(0, 0, 0); return !(W.push(_p2, this.cr + 0.1, _o) + (W.soft ? W.soft.push(_p2, this.cr * 0.55, _o) : 0)); }
  clearWay(x, z) { const n = Math.ceil(Math.hypot(x - this.pos.x, z - this.pos.z) / 0.3); for (let i = 1; i <= n; i++) { const t = i / n; if (!this.freeSpot(this.pos.x + (x - this.pos.x) * t, this.pos.z + (z - this.pos.z) * t)) return false; } return true; }
  // where to crawl: the spot it had in mind if it is free, else somewhere near it that is, preferring one it can see a clear way to
  crawlGoal(x, z, rng, spread = 1.2) {
    const b = this.band, zlo = Math.max(b.z[0], OCT_BACK), zhi = OCT_FRONT, cl = (px, pz) => [Math.max(b.x[0], Math.min(b.x[1], px)), Math.max(zlo, Math.min(zhi, pz))];
    let best = null; for (let k = 0; k < 10; k++) { const [px, pz] = k === 0 ? cl(x, z) : cl(x + (rng() - 0.5) * 2 * spread * (1 + k * 0.15), z + (rng() - 0.5) * 2 * spread); if (!walkable(px, pz) || !this.freeSpot(px, pz) || this.failed?.some((q) => Math.hypot(q.x - px, q.z - pz) < 0.9)) continue; if (this.clearWay(px, pz)) return [px, pz]; best ||= [px, pz]; }
    return best ?? cl(x, z);
  }
  // a little way forward or back, but on the level it is on (a slow slide like the sole's never goes over the edge of a bank)
  levelZ(z) { const zz = Math.max(OCT_BACK, Math.min(OCT_FRONT - 0.1, z)); return crossesFace(this.pos.x, this.pos.z, this.pos.x, zz) ? this.pos.z : zz; }
  // somewhere to wander to on the sand, on any of the three levels: a few places are weighed, and one on a level, or near a spot, that other octopuses already have is less likely
  roamSpot(rng, others = []) {
    const b = this.band, octs = others.filter((o) => o !== this && !o.dead && o.species.move === 'jet'), here = levelAt(this.pos.x, this.pos.z); let best = null, bv = -1e9;
    const LV = ['front', 'middle', 'rear'], count = (lv) => octs.filter((o) => levelAt(o.pos.x, o.pos.z) === lv).length, w = LV.map((lv) => (1 / (1 + count(lv)) + (lv === here ? 0.25 : 0)) * (lv === 'rear' ? 3.2 : lv === 'front' ? 0.7 : 1)),      // the high bank is worth the trip: a little more likely, so it is not left empty
      wsum = w.reduce((a2, c) => a2 + c, 0);
    for (let k = 0; k < 8; k++) {
      let r0 = rng() * wsum, want = LV[0]; for (let q = 0; q < 3; q++) { if (r0 < w[q]) { want = LV[q]; break; } r0 -= w[q]; }      // first which level, the emptier ones more likely, then a place on it
      let x = 0, z = 0, okk = false; for (let tries = 0; tries < 12 && !okk; tries++) { x = b.x[0] + rng() * (b.x[1] - b.x[0]); z = want === 'front' && rng() < 0.5 ? OCT_FRONT - rng() * rng() * 2.4 : Math.max(OCT_BACK, b.z[0]) + rng() * (Math.min(OCT_FRONT, b.z[1]) - Math.max(OCT_BACK, b.z[0])); okk = walkable(x, z) && levelAt(x, z) === want; }      // on the floor, mostly the open sand down by the glass if (!okk) continue;
      const lv = levelAt(x, z), crowd = octs.reduce((n, o) => n + (Math.hypot(o.pos.x - x, o.pos.z - z) < 1.8 ? 1 : 0) + (levelAt(o.pos.x, o.pos.z) === lv ? 0.35 : 0), 0);
      const v = rng() * 1.2 - crowd;
      if (v > bv) { bv = v; best = [x, z]; }
    }
    return best ?? [this.pos.x, this.pos.z];
  }
  // crawling has got it nowhere: it jets over whatever is in the way, toward where it wanted to go, and remembers the spot as a hard one to reach on foot
  hop(S, rng) {
    const nx = S.route?.length ? S.route[0] : null, gx = nx ? nx.x : this.target.x, gz = nx ? nx.z : this.target.z, again = S.after && Math.hypot(S.after.x - gx, S.after.z - gz) < 0.5 ? S.after.n + 1 : 1;
    if (again > 2) { (this.failed ||= []).push({ x: gx, z: gz }); if (this.failed.length > 6) this.failed.shift(); S.after = null; } else S.after = { x: gx, z: gz, mode: S.mode, n: again };      // twice over the top and still not there: that spot is not for walking to
    let lx = Math.max(-3.8, Math.min(3.8, gx)), lz = Math.max(OCT_BACK, Math.min(OCT_FRONT - 0.1, gz));
    for (let k = 0; k < 12 && (!this.freeSpot(lx, lz) || !walkable(lx, lz)); k++) { lx = Math.max(-3.8, Math.min(3.8, gx + (rng() - 0.5) * 2.4)); lz = Math.max(OCT_BACK, Math.min(OCT_FRONT - 0.1, gz + (rng() - 0.5) * 2)); }      // it comes down on open sand, not in a plant
    S.detour = null; S.prog = null; S.sideBias = 0; S.backT = 0; S.mode = null; S.s = 'jet'; S.n = Math.hypot(lx - this.pos.x, lz - this.pos.z) > 2.5 ? 2 : 1; S.t = 9; S.pulse = 0;
    this.target.set(lx, sandH(lx, lz) + 1.9 + rng() * 0.6, lz); this.flush = Math.max(this.flush, 0.2);
  }
  temper() { return TEMPER[this.mind?.type] ?? null; }
  signatureText() { return SIG_TEXT[this.signature()] ?? null; }
  // its own favourite trick, for good: one of the tricks its kind likes, picked by its seed
  signature() { const T = this.temper(); if (!T) return null; return T.sig[Math.abs((this.seed | 0) * 7 + 3) % T.sig.length]; }
  // who it gets on with and who it has it in for: friendly time (following, watching) and annoyance (being startled, chasing off) per fish
  memo(o, kind, n = 1) {
    if (!o?.fid) return; const m = (this.fishMemo ||= {}), e = (m[o.fid] ||= { f: 0, a: 0 }); e[kind] += n; let bf = null, bv = 2.5, rf = null, rv = 1.5;
    for (const [id, v] of Object.entries(m)) { if (v.f - v.a > bv) { bv = v.f - v.a; bf = id; } if (v.a - v.f * 0.5 > rv) { rv = v.a - v.f * 0.5; rf = id; } }
    this.buddy = bf; this.rival = rf === bf ? null : rf; this.favDirty = true;
  }
  // nothing much going on: now and then it does something worth watching. What it picks depends on what is about (a fish to follow or watch,
  // a plant to stand beside, sand to dig into), on its nature (the bold ones show off more), and it happens less at night
  pickAct(S, rng, others, M, want = null) {
    const fish = others.filter((o) => o !== this && !o.dead && !o.visitor && o.species.move !== 'jet' && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 4.5 && o.pos.y < 8);
    const plant = (this.getSpots?.() ?? []).find((q) => PLANTS.has(q.type) && Math.hypot(q.x - this.pos.x, q.z - this.pos.z) < 1.7);
    const things = (this.getSpots?.() ?? []).filter((q) => GRIP[q.type] && Math.hypot(q.x - this.pos.x, q.z - this.pos.z) < 3.5);
    const onSand = this.ground ? this.ground.kind !== 'decor' : true, bold = this.bold, cur = M.cur ?? 0.5, soc = M.soc ?? 0.5, floor = 0.55 + this.sandBelow(), night = this.isNight ? 0.3 : 1;
    const opts = [['flat', 0.06 * (0.6 + cur)], ['bury', onSand && this.restFor > 5 ? 0.06 : 0], ['lion', 0.05 * (0.5 + bold)], ['snake', 0.05], ['jelly', 0.05], ['kelp', plant ? 0.1 : 0], ['follow', fish.length ? 0.1 * (0.5 + soc) : 0], ['watch', fish.length ? 0.1 : 0], ['tour', 0.15 * (0.5 + bold)], ['grab', things.length ? 0.09 * (0.5 + cur) : 0]];
    { const T = this.temper(), sig = this.signature(), watched = (this.audience ?? 0) > 0; if (watched && T && (this.squirtCool ?? 0) <= 0) opts.push(['squirt', 0.035 * T.squirt]);
      for (const o of opts) o[1] *= (T?.[o[0]] ?? 1) * (o[0] === sig ? 2.2 : 1) * (watched && (o[0] === 'lion' || o[0] === 'jelly') && this.mind?.type === 'showoff' ? 1.6 : 1); }      // its nature decides what it likes doing, and an audience brings out the show-off
    // the weights are shares of one roll: if together they would pass nine in ten, they are scaled down so every act keeps its share and there is still a chance of doing nothing
    { const tot = opts.reduce((a, o) => a + o[1], 0); if (tot > 0.9) for (const o of opts) o[1] *= 0.9 / tot; }
    let r = rng() / night, act = want; if (!act) for (const [k, w] of opts) { if (r < w) { act = k; break; } r -= w; }
    if (!act || (want && !opts.some(([k, w]) => k === want && w > 0))) return false;
    S.mode = null; S.n = 0; S.pulse = 0; S.detour = null; S.prog = null; S.tour = null; S.popped = false; S.digs = 0; this.act = act; this.actText = ACT_TEXT[act] ?? null;
    if (['flat', 'bury', 'lion', 'snake', 'jelly', 'kelp'].includes(act)) this.onMoment?.(act);
    // off to take hold of something: the inspect errand walks it there and wraps its arms round it
    if (act === 'grab') { const q = things[(rng() * things.length) | 0]; this.inspect = { x: q.x, z: q.z, id: q.id, type: q.type, r: GRIP[q.type] }; this.actText = null; S.t = 0; return this.ponder(S, rng, { x: q.x, y: 0.7, z: q.z }); }
    if (act === 'squirt') { this.squirtCool = 120 + rng() * 120; S.s = 'squirt'; S.t = 1.6; S.done = false; this.actText = 'Squirting water at you!'; return this.ponder(S, rng, { x: this.pos.x, y: 4.6, z: 30 }); }
    if (act === 'follow') { const bud = fish.find((q) => q.fid === this.buddy), o = bud && rng() < 0.65 ? bud : fish[(rng() * fish.length) | 0]; this.follow = o; this.memo(o, 'f'); this.onMoment?.('fish', o); this.actText = `Tagging along behind ${o.name}.`; S.s = 'jet'; S.n = 1; S.t = 10 + rng() * 5; this.target.copy(o.pos); return this.ponder(S, rng, o.pos); }
    if (act === 'watch') { const bud = fish.find((q) => q.fid === this.buddy), o = bud && rng() < 0.6 ? bud : fish.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0]; this.memo(o, 'f', 0.5); this.watchFish = o; this.actText = `Watching ${o.name}.`; S.s = 'watch'; S.t = 5 + rng() * 4; return this.ponder(S, rng, o.pos); }
    if (act === 'tour') { const b = this.band, ys = 3 + rng() * 4; S.tour = [[-2.8 + rng(), ys, -1 + rng() * 3], [2.8 - rng(), Math.min(Fish3D.topY - 2.5, ys + 1.5), -1 + rng() * 3], ((q) => [q[0], sandH(q[0], q[1]) + 1.6 + rng(), q[1]])(this.roamSpot(rng, others))]; if (rng() < 0.5) S.tour.reverse(); const f0 = S.tour.shift(); this.target.set(f0[0], f0[1], f0[2]); S.s = 'jet'; S.n = 2; S.t = 24; return this.ponder(S, rng, this.target.clone()); }
    S.s = act; S.t = act === 'bury' ? 14 + rng() * 14 : act === 'flat' ? 9 + rng() * 6 : act === 'kelp' ? 10 + rng() * 6 : 7 + rng() * 5; S.t0 = S.t;
    if (act === 'flat') { const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), floor, this.levelZ(this.pos.z + (rng() - 0.5) * 1.5)); }
    if (act === 'lion' || act === 'jelly') { const lx = Math.max(-3, Math.min(3, this.pos.x + (rng() - 0.5) * 2)), lz = Math.max(OCT_BACK, Math.min(2.2, this.pos.z)); this.target.set(lx, Math.max(3.5, sandH(lx, lz) + 2.6), lz); }
    if (act === 'kelp') this.target.set(this.pos.x, floor, this.pos.z);
    return this.ponder(S, rng, act === 'flat' ? this.target.clone() : null);
  }
  // a beat before it acts: it stops, looks at what it has in mind (eyes first, then its head and body turn), and only then goes.
  // The plan is kept and taken up when the beat is over.
  ponder(S, rng, at) { S.pend = { s: S.s, t: S.t, n: S.n }; S.s = 'ponder'; S.t = 0.5 + rng() * 0.8 * (1.3 - 0.3 * (this.temper()?.tempo ?? 1)); this.intent = at ? { x: at.x, y: at.y ?? 0.6, z: at.z } : null; return true; }
  endAct(S, rng, next = 'rest') { this.act = null; this.actText = null; this.watchFish = null; this.follow = null; S.tour = null; S.popped = false; S.digs = 0; if (next === 'drift') { S.s = 'drift'; S.t = 6; } else { S.s = 'rest'; S.t = 4 + rng() * 6; } }
  // a fish has hung about too close for too long: it flings a puff of silt at it with the arms on that side, and the fish clears off
  throwAt(o, rng) {
    this.memo(o, 'a'); this.sq = Math.max(this.sq, 0.7); this.flush = Math.max(this.flush, 0.4); this.annoyT = 2; const d = _p2.copy(o.pos).sub(this.pos); d.y = Math.max(0, d.y); d.normalize();
    const k = rng(), reach = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 2.0 && Math.abs(o.pos.y - this.pos.y) < 2.6, kind = reach && k < 0.7 ? 'smack' : this.hoard > 0 && k < 0.7 ? 'shell' : k < 0.85 ? 'silt' : 'water';
    this.onThrow?.(this.pos.clone(), d.clone(), kind, o.pos.clone()); o.fleeT = kind === 'smack' ? 1.8 : 1.4; o.target.set(Math.max(-4, Math.min(4, o.pos.x + d.x * 2.5)), Math.min(12, o.pos.y + 1), Math.max(0.3, Math.min(2.4, o.pos.z + d.z * 1.5))); o.retarget = 2;
    const sc = this.scale || 0.06, ch = Math.cos(this.heading), sh = Math.sin(this.heading), dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, dy = o.pos.y - this.pos.y, lx = (dx * ch - dz * sh) / sc, lz = (dx * sh + dz * ch) / sc, ang = Math.atan2(lz, lx - 3);
    let one = false; this.minds.map((m, i) => [m, Math.abs(Math.atan2(Math.sin((this.rig?.arms[i]?.th ?? 0) - ang), Math.cos((this.rig?.arms[i]?.th ?? 0) - ang)))]).sort((p, q) => p[1] - q[1]).forEach(([m, df]) => { if (kind === 'smack' ? one : df > 0.9) return; one = true; m.x = lx; m.y = dy / sc; m.z = lz; m.until = kind === 'smack' ? 0.45 : 1.1; m.fast = true; m.next = 4 + rng() * 3; });      // a smack is one arm, whipped out and back
    if (kind === 'smack') this.onMoment?.('smack', o);
    this.actText = kind === 'smack' ? `Smacked ${o.name} with an arm.` : kind === 'shell' ? `Flung a shell at ${o.name}.` : kind === 'water' ? `Squirted water at ${o.name}.` : `Threw silt at ${o.name}.`; this.actFlash = 4;
  }
  denGoal(rng) { const d = this.den; return d.home ? [d.x, d.z + (d.kind === 'pot' ? 0.5 : -0.2)] :      // in a coconut it sits well inside the hollow (the cut face is at the shell's centre line), its arms spilling out of the mouth
     d.kind === 'rocks' ? [d.x, d.z] : [d.x + (rng() - 0.5) * 0.6, d.z + 0.85]; }
  // going home: first to the open side of the shell or pot (its mouth faces the front), then straight in through it. Never through the wall.
  goDen(S, rng, t = 12) { S.mode = 'den'; S.s = 'crawl'; S.t = t; const [x, z] = this.denGoal(rng); if (this.den.home && Math.hypot(this.pos.x - x, this.pos.z - z) > 1.1) { S.mode = 'denfront'; S.t = t; this.target.set(x, 0.55, z + 1.25); } else this.target.set(x, 0.55, z); }
  // a job in hand comes before any trip to the glass or impression it had in mind
  startTask(T) { const S = (this.st ||= { s: 'rest', t: 1, n: 0, pulse: 0 }); this.task = T; this.glassAt = null; this.act = null; this.actText = null; S.mode = 'tgo'; S.s = 'crawl'; S.t = 20 + 12 * Math.hypot(T.ax - this.pos.x, T.az - this.pos.z); this.target.set(T.ax, 0.55, T.az); }
  fearHere() { (this.fears ||= []).push({ x: this.pos.x, z: this.pos.z, t: performance.now() }); if (this.fears.length > 4) this.fears.shift(); }
  startle(from, by = null) {
    this.memo(by, 'a', 1.5); this.fearHere(); this.scareT = 2.6; this.wakeT = 8; if (this.onInk && Math.random() < 0.3 + 0.4 * (1 - this.bold)) this.onInk(this.pos); const S = this.st; if (S && ['rest', 'crawl', 'flat', 'kelp', 'watch', 'snake'].includes(S.s) && !this.seeking) { if (this.act) this.endAct(S, Math.random); S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 4; S.mode = null; const b = this.band; this.target.set(Math.max(-3.5, Math.min(3.5, this.pos.x + (from && from.x > this.pos.x ? -2.4 : 2.4))), Math.min(6, this.pos.y + 2.2), this.pos.z); this.sq = 1; }
  }
  // an octopus changes colour to suit its mood: it fades into the sand and rocks when resting or shy, and flushes bright when something exciting has just happened
  // the colour and pattern of the ground under it, one target colour per voxel (a patchy value noise over the ground's own palette, kept shaded by the octopus's own form)
  buildCamo(spec) {
    const n = this.vox.length, tex = new Float32Array(n * 3), cols = spec.cols, sc = spec.scale, b = this.baseCol;
    for (let i = 0; i < n; i++) {
      const v = this.vox[i], o = i * 3, p = vnoise(v.x * sc * 0.55 + 7, v.y * sc * 0.55, v.z * sc * 0.55 + 3), q = h3(v.x, v.y, v.z);
      let idx = Math.min(cols.length - 1, Math.floor(p * cols.length * 1.15)); if (q > 0.9) idx = (idx + 1) % cols.length;           // a few grains of another colour, like the ground itself
      const c = cols[idx], l = b[o] * 0.3 + b[o + 1] * 0.59 + b[o + 2] * 0.11, m = 0.36 + 0.34 * l + (q - 0.5) * 0.1;   // fish are lit brighter than the floor, so the target is darkened to look the same once rendered
      const r = Math.max(0, (c[0] / 255) * m - 0.1), g = Math.max(0, (c[1] / 255) * m - 0.1), bl = Math.max(0, (c[2] / 255) * m - 0.1), gr = (r + g + bl) / 3;      // the lights add a glow of their own, so dark surfaces need an even darker fish      // the lights wash colour out of a fish, so push the saturation back up
      tex[o] = Math.max(0, gr + (r - gr) * 1.45); tex[o + 1] = Math.max(0, gr + (g - gr) * 1.45); tex[o + 2] = Math.max(0, gr + (bl - gr) * 1.45);
    }
    this.camoTex = tex;
  }
  // An impression is in the skin as well as the shape: one target colour per voxel, painted in the creature's own pattern and kept shaded by the octopus's form.
  // u runs along the body from the front of the head (0) to the back of the mantle (1), and along each arm from its root (0) to its tip (1).
  buildCostume(key, src) {
    const n = this.vox.length, tex = new Float32Array(n * 3), b = this.baseCol; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ls = 0;
    for (let i = 0; i < n; i++) { const v = this.vox[i]; ls += b[i * 3] * 0.3 + b[i * 3 + 1] * 0.59 + b[i * 3 + 2] * 0.11; if (v.arm >= 0 || v.web) continue; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const lavg = ls / n, fishMap = key === 'fish' && src?.vox ? this.fishColours(src) : null, plant = PLANT_COLS[src] ?? PLANT_COLS.kelp;
    for (let i = 0; i < n; i++) {
      const v = this.vox[i], o = i * 3, arm = v.arm >= 0 ? v.arm : v.web ? v.web.a : -1, onArm = arm >= 0, at = v.arm >= 0 ? v.at : v.web ? v.web.at * 0.4 : 0;
      const u = onArm ? at : (x1 - v.x) / Math.max(1, x1 - x0), h = onArm ? 0.5 : (v.y - y0) / Math.max(1, y1 - y0), q = h3(v.x * 3 + 1, v.y * 5, v.z * 7 + 2);
      let c;
      if (key === 'sole') {                   // a banded sole: cream sand with dark chocolate bands across it and a dark-spotted fringe
        const cream = [224, 202, 160], brown = [104, 72, 44], band = onArm ? Math.sin(at * Math.PI * 9) > 0.45 : Math.sin(u * Math.PI * 8 + h * 1.2) > 0.5;
        c = band ? brown : cream; if (q > 0.86) c = [80, 56, 36]; if (onArm && at > 0.85) c = mixc(c, [240, 228, 200], 0.6);
      } else if (key === 'lion') {            // a lionfish: maroon and cream stripes, slanted on the body, ringed along every spine, with pale tips
        const maroon = [156, 36, 28], cream = [246, 232, 214], stripe = onArm ? Math.sin(at * Math.PI * 11) > 0 : Math.sin((v.x * 0.55 + v.y * 0.32) * 1.15) > 0.05;
        c = stripe ? maroon : cream; if (!onArm && q > 0.9) c = [90, 20, 18]; if (onArm && at > 0.9) c = [255, 244, 236];
      } else if (key === 'snake') {           // a banded sea snake: crisp black and cream rings down the two arms that show; the hidden body a dull sandy brown
        const show = arm === 2 || arm === 6; c = onArm && show ? (Math.sin(at * Math.PI * 13) > 0 ? [20, 18, 26] : [196, 214, 240]) : onArm ? [150, 128, 96] : mixc([132, 110, 80], [176, 152, 112], q);
        if (onArm && show && at > 0.94) c = [26, 24, 32];
      } else if (key === 'jelly') {           // a jellyfish: a pale, milky bell with a lilac rim and white specks, the arms fading to pink at their tips
        c = onArm ? mixc([250, 238, 246], [228, 164, 208], at) : mixc([196, 160, 226], [240, 226, 248], Math.min(1, h * 1.3)); if (!onArm && q > 0.88) c = [255, 255, 255];
      } else if (key === 'kelp') {            // a plant: its own colours, darker at the base and brighter at the tips, with a few flecks
        c = onArm ? mixc(plant[0], plant[1], Math.min(0.8, at * 0.9)) : mixc(plant[0], plant[1], 0.1 + 0.3 * h); if (q > 0.86) c = mixc(c, plant[0], 0.5);
      } else if (fishMap) {                   // another fish: its colours and markings laid along the octopus, its head on the head, its tail down the arms
        const fu = onArm ? 0.55 + 0.45 * at : u * 0.55, fh = onArm ? 0.5 : h; c = fishMap(fu, fh);
      } else c = [b[o] * 255, b[o + 1] * 255, b[o + 2] * 255];
      // keep the octopus's own shading so it still looks round; a named colour is darkened and its saturation pushed back up, since the tank's lights wash a fish out (a fish's own colours are already lit that way)
      const l = b[o] * 0.3 + b[o + 1] * 0.59 + b[o + 2] * 0.11, sh = Math.max(0.55, Math.min(1.25, 0.9 + 0.7 * (l - lavg)));
      let r = (c[0] / 255) * sh, g = (c[1] / 255) * sh, bl = (c[2] / 255) * sh;
      if (!fishMap) { r = Math.max(0, r * 0.7 - 0.04); g = Math.max(0, g * 0.7 - 0.04); bl = Math.max(0, bl * 0.7 - 0.04); const gr = (r + g + bl) / 3; r = gr + (r - gr) * 1.4; g = gr + (g - gr) * 1.4; bl = gr + (bl - gr) * 1.4; }
      tex[o] = Math.max(0, Math.min(1, r)); tex[o + 1] = Math.max(0, Math.min(1, g)); tex[o + 2] = Math.max(0, Math.min(1, bl));
    }
    return tex;
  }
  // a fish's colours as a map from (along its length 0 head to 1 tail, up its side 0 belly to 1 back) to the colour most of its voxels there have
  fishColours(o) {
    const NX = 20, NY = 4, vox = o.vox, b = o.baseCol; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const v of vox) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const bins = Array.from({ length: NX * NY }, () => new Map());
    vox.forEach((v, i) => { const gx = Math.min(NX - 1, Math.floor(((x1 - v.x) / Math.max(1, x1 - x0)) * NX)), gy = Math.min(NY - 1, Math.floor(((v.y - y0) / Math.max(1, y1 - y0)) * NY)), r = b[i * 3], g = b[i * 3 + 1], bl = b[i * 3 + 2], key = ((r * 7) | 0) * 64 + ((g * 7) | 0) * 8 + ((bl * 7) | 0), m = bins[gx * NY + gy], e = m.get(key) ?? [0, 0, 0, 0]; e[0] += r; e[1] += g; e[2] += bl; e[3]++; m.set(key, e); });
    const cell = bins.map((m) => { let best = null; for (const e of m.values()) if (!best || e[3] > best[3]) best = e; return best ? [best[0] / best[3] * 255, best[1] / best[3] * 255, best[2] / best[3] * 255] : null; });      // the commonest colour in each cell, so a white band stays white instead of blurring into its neighbours
    return (fu, fh) => { const gx = Math.min(NX - 1, Math.floor(fu * NX)), gy = Math.min(NY - 1, Math.floor(fh * NY)); for (let d = 0; d < NX; d++) for (const s of [0, -1, 1]) { const x = gx + s * d, row = x >= 0 && x < NX ? x : -1; if (row < 0) continue; for (const y of [gy, 1, 2, 0, 3]) { const c = cell[row * NY + y]; if (c) return c; } } return [200, 120, 80]; };
  }
  camoEase(k) { return k * k * (3 - 2 * k); }
  applyCamo() {
    const a = this.mesh.instanceColor.array, b = this.baseCol, f = this.flush, raw = this.camoK, k = this.camoEase(Math.max(0, Math.min(1, raw / 0.94))) * 0.94; this.camoApplied = raw; this.flushApplied = f > 0;
    if (this.camoMix < 1) this.camoMix = Math.min(1, (performance.now() - (this.camoMixT ?? 0)) / 1400);                    // moving to a different ground while camouflaged: the pattern cross-fades, it does not jump
    const pv = this.camoMix < 1 ? this.camoPrev : null, mx = this.camoEase(this.camoMix ?? 1);
    if (k > 0.02 && !this.camoTex && this.camoSpec) this.buildCamo(this.camoSpec); const tex = k > 0.02 ? this.camoTex : null;
    const mw = this.mw, tnow = this.tt ?? 0, eb = mw.fond, cq = this.camoEase(Math.max(0, Math.min(1, this.costumeK ?? 0))) * 0.96, ct = cq > 0.01 ? this.costumeTex : null; this.costumeApplied = this.costumeK ?? 0;
    for (const kk in this.mwA) this.mwA[kk] = mw[kk];
    for (let i = 0; i < this.vox.length; i++) {
      const o = i * 3, v = this.vox[i];
      if (v.tag === 'beak') { a[o] = b[o] * 1.1; a[o + 1] = b[o + 1] * 1.1; a[o + 2] = b[o + 2] * 1.1; continue; }
      if (v.tag === 'eye') { const bar = eb > 0.01 && Math.abs(v.y - this.eyeY) <= 1.2 ? 1 - 0.92 * eb : 1, ring = ct && !v.pupil && b[o] + b[o + 1] + b[o + 2] > 0.5 ? cq * 0.8 : 0; a[o] = (b[o] + ((ct?.[o] ?? 0) - b[o]) * ring) * bar; a[o + 1] = (b[o + 1] + ((ct?.[o + 1] ?? 0) - b[o + 1]) * ring) * bar; a[o + 2] = (b[o + 2] + ((ct?.[o + 2] ?? 0) - b[o + 2]) * ring) * bar; continue; }      // in disguise the rings of its eyes change too; the pupils stay dark       // someone it knows: a dark bar across the eye
      let tr = tex ? tex[o] : b[o], tg = tex ? tex[o + 1] : b[o + 1], tb = tex ? tex[o + 2] : b[o + 2]; if (pv && tex) { tr = pv[o] + (tr - pv[o]) * mx; tg = pv[o + 1] + (tg - pv[o + 1]) * mx; tb = pv[o + 2] + (tb - pv[o + 2]) * mx; }
      const lift = 1 + 0.4 * f; let R = (b[o] + (tr - b[o]) * k) * lift * (1 + 0.18 * f), G = (b[o + 1] + (tg - b[o + 1]) * k) * (1 + 0.15 * f), B = (b[o + 2] + (tb - b[o + 2]) * k) * (1 + 0.1 * f) * (1 - 0.18 * f);   // excited: bright and warm
      if (ct) { R += (ct[o] - R) * cq; G += (ct[o + 1] - G) * cq; B += (ct[o + 2] - B) * cq; if (this.costume === 'jelly') { R += 0.06 * cq; G += 0.05 * cq; B += 0.07 * cq; } }      // in costume
      if (mw.scared > 0.01) { const q = 0.7 * mw.scared; R += (0.93 - R) * q; G += (0.91 - G) * q; B += (0.95 - B) * q; }                       // startled: drained to a pale white
      if (this.sleepK > 0.05) { const sk = this.sleepK, dr = 1 - 0.18 * sk + 0.22 * sk * Math.max(0, Math.sin(tnow * 1.1 + v.x * 0.35 + v.z * 0.3 + Math.sin(tnow * 0.4) * 2)); R *= dr; G *= dr * 0.97; B *= dr * 1.04; }                  // asleep: a little darker and paler, with slow ripples of colour like a dream
      if (mw.annoyed > 0.01) { const q = 1 - 0.45 * mw.annoyed; R = R * q + 0.05 * mw.annoyed; G *= q; B = B * q + 0.1 * mw.annoyed; }                  // annoyed: dark and purplish
      if (mw.hunting > 0.01) { const q = 1 + (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(tnow * 3.4 + v.x * 0.3 - v.y * 0.12)) - 1) * mw.hunting; R *= q; G *= q; B *= q; }   // hunting: dark clouds ripple along the body
      if (v.tag === 'mantle' || v.tag === 'head') { const sh = Math.max(0, Math.sin(v.x * 0.16 + v.y * 0.27 + v.nz * 1.4 + tnow * 0.55)) ** 6 * 0.11 * (1 - this.sleepK) * (1 - k) * (1 - cq); R += (0.78 - R) * sh; G += (0.96 - G) * sh; B += (1 - B) * sh; }       // a faint iridescent sheen drifting over the skin, gone when it is camouflaged
      a[o] = Math.min(1, R); a[o + 1] = Math.min(1, G); a[o + 2] = Math.min(1, B);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  // a warm, bright flush (a greeting seahorse changes colour when it meets its partner)
  applyGlow() { if (this.pale) return; const a = this.mesh.instanceColor.array, b = this.baseCol, k = this.glowK; for (let i = 0; i < a.length; i += 3) { a[i] = Math.min(1, b[i] * (1 + 0.5 * k) + 0.1 * k); a[i + 1] = Math.min(1, b[i + 1] * (1 + 0.35 * k) + 0.05 * k); a[i + 2] = Math.min(1, b[i + 2] * (1 + 0.1 * k)); } this.mesh.instanceColor.needsUpdate = true; }
  // sickness and death drain the colour
  setPale(k) {
    if (k === this.pale) return; this.pale = k; const a = this.mesh.instanceColor.array, b = this.baseCol;
    for (let i = 0; i < a.length; i += 3) { const g = (b[i] * 0.3 + b[i + 1] * 0.59 + b[i + 2] * 0.11) * 0.85 + 0.08; a[i] = b[i] + (g - b[i]) * k; a[i + 1] = b[i + 1] + (g * 1.03 - b[i + 1]) * k; a[i + 2] = b[i + 2] + (g * 1.1 - b[i + 2]) * k; }
    this.mesh.instanceColor.needsUpdate = true;
  }
  // a fish that has died drifts up and floats belly-up at the surface until someone scoops it out
  deadUpdate(dt) {
    this.tt = (this.tt ?? 0) + dt; this.pos.y += (12.7 + Math.sin(this.tt * 1.1 + this.phase) * 0.09 - this.pos.y) * Math.min(1, dt * 0.22); this.pos.x += Math.sin(this.tt * 0.23 + this.phase) * 0.06 * dt;
    this.roll += (Math.PI - this.roll) * Math.min(1, dt * 1.6); this.pitch += (Math.sin(this.tt * 0.7) * 0.06 - this.pitch) * Math.min(1, dt); this.vel.set(0, 0, 0);
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
  }
  // ── shared helpers for the two non-fish gaits ──
  face(dt, turn) { const sp = Math.hypot(this.vel.x, this.vel.z); if (sp > 0.06) { let dy = Math.atan2(-this.vel.z, this.vel.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * turn); } return sp; }
  settle() { this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX')); this.accum += 1 / 60; }
  separate(others, gain = 2.4) {
    for (const o of others) {
      if (o === this) continue; const dx = this.pos.x - o.pos.x, dy = this.pos.y - o.pos.y, dz = (this.pos.z - o.pos.z) * 1.6, dd = Math.hypot(dx, dy, dz), min = (this.radius + o.radius) * 0.9;
      if (dd < min && dd > 1e-3) { const k = ((min - dd) / min) * gain; this.vel.x += (dx / dd) * k * 0.05; this.vel.y += (dy / dd) * k * 0.05; this.vel.z += (dz / dd) * k * 0.035; }
    }
  }
  // Seahorse: an upright, weak swimmer. It hovers with its dorsal fin blurring, drifts in short steps, bobs gently, never pitches, and likes to hold on to a plant or decoration for a long while.
  hoverUpdate(dt, rng, others) {
    this.tt = (this.tt ?? 0) + dt; const t = this.tt; this.retarget -= dt; this.idle = (this.idle ?? 0) - dt;
    const G = this.greet, lead = this.leadOf?.() !== false;
    if (this.sp.tail && lead) { this.others = others; const st = this.seaState(G); if (st !== this.hs) { this.seaEnter(st, this.hs); this.hs = st; this.hsAt = this.tt; } }      // one primary state at a time (see seaState)
    if (G) {                                                                         // the morning greeting: two partners meet at a plant and circle each other, glowing, then part
      if (this.holdfast) this.letGo(); if (G.t < 6 && G.t + dt >= 6) this.greeted = true;      // half way through, glowing: a real greeting, for its journal and its log
      if (this.sp.tail) { this.curlK = (this.curlK ?? 0) + (0.5 - (this.curlK ?? 0)) * Math.min(1, dt * 1.5); this.gripK = (this.gripK ?? 0) * Math.exp(-dt * 3); }      // a seahorse lets go of its stem to dance, its tail loosening
      G.t -= dt; G.ang += dt * 0.85 * G.side; const wantX = G.cx + Math.cos(G.ang) * G.r, wantZ = G.cz + Math.sin(G.ang) * G.r * 0.7, wantY = Math.max(G.y + Math.sin(t * 1.4 + G.side) * 0.12, 0.35 + this.sandBelow());
      this.pos.x += (wantX - this.pos.x) * Math.min(1, dt * 1.6); this.pos.y += (wantY - this.pos.y) * Math.min(1, dt * 1.6); this.pos.z += (wantZ - this.pos.z) * Math.min(1, dt * 1.6);
      let dy = Math.atan2(-(G.cz - this.pos.z), G.cx - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 2.5); this.vel.multiplyScalar(Math.exp(-3 * dt));
      this.glowK += ((G.t > 1.2 ? 1 : 0) - this.glowK) * Math.min(1, dt * 1.2);
      if (G.t <= 0) { this.greet = null; this.idle = 4 + rng() * 4; this.retarget = 6; this.pickHover(rng); }
    } else if (!(this.netGlowAt > performance.now() - 2000)) this.glowK += (0 - this.glowK) * Math.min(1, dt * 1.2);      // (on another phone the glow comes from the lead phone)
    if (Math.abs(this.glowK - (this.glowApplied ?? 0)) > 0.03) { this.glowApplied = this.glowK; this.applyGlow(); }
    if (G) { this.pitch += (Math.sin(t * 0.8 + this.phase) * 0.04 - this.pitch) * Math.min(1, dt * 2); this.phase += dt * 14; this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(0, this.heading, this.pitch, 'YZX')); this.accum += dt; if (this.accum > 1 / 24) { this.accum = 0; this.setPose(this.phase); } return; }
    if (this.sp.tail && this.birthT > 0) {      // giving birth: he lets go, straightens a little, and his pouch contracts in pulses as the babies come out of it
      this.birthT -= dt; if (lead && this.holdfast) this.release(0.2); this.vel.multiplyScalar(Math.exp(-3 * dt)); this.pos.y += 0.04 * dt;
      const c = this.birthT > 1.2 ? Math.max(0, Math.sin((7.5 - this.birthT) * 4.5)) : 0; this.contractK = c;
      this.pitch += ((-0.06 + 0.14 * c) - this.pitch) * Math.min(1, dt * 6); this.curlK += (-0.2 - (this.curlK ?? 0)) * Math.min(1, dt * 2); this.gripK = (this.gripK ?? 0) * Math.exp(-dt * 4); this.phase += dt * 14;
      this.place(dt); return; }
    if (this.sp.tail) { if (!lead) { this.holdfast = null; } else if (this.seahorse(dt, rng)) return; }      // in a shared tank only the lead phone decides where a seahorse holds on; the others are shown it
    if (!this.seeking && ((this.retarget <= 0 && this.idle <= 0) || (this.pos.distanceTo(this.target) < 0.3 && this.idle <= 0))) this.pickHover(rng);
    const to = this.target.clone().sub(this.pos), d = to.length() || 1, holding = this.idle > 0 && !this.seeking;
    const base = this.speed * (this.tmul ?? 1) * (this.mul ?? 1) * (this.vigor ?? 1) * (this.foodMul ?? 1) * (this.seeking ? 1.15 : this.holdfast && !this.holdfast.on ? 0.75 : 0.5) * (holding ? 0.06 : 1);      // (a seahorse on its way to a holdfast swims steadily, still slowly)
    to.multiplyScalar((base / d) * Math.min(1, this.holdfast && !this.holdfast.on ? d / 0.6 : d)); to.y += Math.sin(t * 1.3 + this.phase) * (holding ? 0.03 : 0.1);      // (a seahorse on its way to a holdfast keeps its pace until it settles onto it)
    this.vel.lerp(to, Math.min(1, dt * 0.9)); this.separate(others); const vmax = this.speed * 0.75 * (this.mul ?? 1); if (this.vel.length() > vmax) this.vel.setLength(vmax);
    this.pos.addScaledVector(this.vel, dt); this.rdt = dt; this.resolve(others);
    const sp = this.face(dt, 0.9);
    this.pitch += ((-this.vel.y * 0.12) + Math.sin(t * 0.8 + this.phase) * 0.04 - (this.strikeT > 0 ? 0.25 * Math.sin(Math.PI * (1 - this.strikeT / SEA_STRIKE)) : 0) - this.pitch) * Math.min(1, dt * (this.strikeT > 0 ? 40 : 2)); this.roll += (Math.sin(t * 0.6 + this.phase) * 0.03 - this.roll) * Math.min(1, dt * 2);
    this.phase += dt * (12 + sp * 4);                                    // the dorsal fin flutters fast even when hardly moving
    if (this.sp.tail) {
      const going = this.vel.length() > 0.08, H = this.holdfast, near = H && !H.on ? Math.max(0, Math.min(1, (1.6 - this.pos.distanceTo(this.target)) / 1.1)) : 0;
      if (this.tailHits() || (going && this.tailHits(this.vel.x * 0.6, this.vel.y * 0.6, this.vel.z * 0.6))) this.tuckT = 1.5;      // it tucks its tail up before it would brush a leaf, not after this.tuckT = Math.max(0, (this.tuckT ?? 0) - dt);
      const want = this.tuckT > 0 ? 1 : (going ? -0.65 + 0.15 * Math.sin(t * 2.2) : 0.1) * (1 - near) + near;      // swimming, the tail lets out and trails; drifting, it hangs in its loose hook; nearing its stem it curls ready to grip; about to brush a plant, a rock or the sand, it tucks up
      this.curlK += (want - this.curlK) * Math.min(1, dt * (this.tuckT > 0 ? 4 : 1.5)); this.gripK = (this.gripK ?? 0) + (near * 0.6 - (this.gripK ?? 0)) * Math.min(1, dt * 3); this.pitch *= 0.6; }      // the body stays upright      // swimming, the tail lets out and trails; drifting, it hangs in its loose hook; the body stays upright
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > 1 / 24) { this.accum = 0; this.setPose(this.phase); }
  }
  // ── The seahorse ──
  // A seahorse is a poor swimmer and spends most of its time anchored by its curled tail to something upright (a 'holdfast'): seagrass,
  // a plant, a thin branch or post. From there it watches for food drifting past, each eye on its own, and sucks it in with a flick of the snout.
  // It has places it knows and a favourite it has earned by going back to it, a small home range, a routine for the night, and a personality.
  //
  // One primary state at a time (this.hs), decided in one place (seaState) with clear priorities:
  //   social (a greeting or holding tails) > feeding (a strike, or swimming after food it cannot reach from its stem) > releasing >
  //   night (resting on a holdfast) > hitched / watching (holding on, eyes on passing food) > settling > approaching > exploring > swimming.
  // Overlays run alongside the state: the eyes, the colour, the fins, a glance at something new.
  static SEA_STATES = ['swimming', 'exploring', 'approaching', 'settling', 'hitched', 'watching', 'feeding', 'releasing', 'social', 'night'];
  seaState(G) {
    if (G || this.link) return 'social';
    if (this.strikeT > 0) return 'feeding';
    if (this.releaseT > 0) return 'releasing';
    const H = this.holdfast;
    if (!H && this.seeking) return 'feeding';
    if (H) return !H.on ? (H.settle ? 'settling' : 'approaching') : this.sleepy ? 'night' : this.prey ? 'watching' : 'hitched';
    return this.exploreAt ? 'exploring' : 'swimming';
  }
  // what changes as it goes from one state to another
  seaEnter(s, from) {
    if (s === 'social' && this.holdfast) this.letGo();                                         // a friend come to dance or to hold tails: it lets go
    if (from === 'feeding' && s !== 'feeding' && !this.seeking) this.chase = false;
    if (s !== 'watching' && s !== 'feeding') this.prey = null;
  }
  // the pose it holds on in (tail coiled, body leaning back), and the ways it turns and tilts on its stem: what the grip search tests against the decorations
  // where the stem passes through its coils (model voxels from its centre), for a stem of this thickness
  gripLocalFor(stem = SEAHORSE_STEM, lean = SEAHORSE_LEAN) { const k = stem.toFixed(2) + ':' + lean.toFixed(2), m = (this.gripLocals ||= new Map()); let g = m.get(k); if (!g) { const c = seahorseTail(this.sp, 1, 1, undefined, stem, lean); g = [c.ax, c.ay]; m.set(k, g); } return g; }
  hasHeldPose(stem, lean) { return this.heldPoses?.get(stem.toFixed(2) + ':' + lean.toFixed(2))?.sc === (this.scale || 0.03); }
  heldPoseData(stem = SEAHORSE_STEM, lean = SEAHORSE_LEAN) {
    const sc = this.scale || 0.03, k = stem.toFixed(2) + ':' + lean.toFixed(2), cache = (this.heldPoses ||= new Map()); let hp = cache.get(k);
    if (hp?.sc !== sc) {      // worked out once for its size and the thickness of what it holds: every other voxel as it holds on, and the ways it leans
      const L = lean, keep = [this.curlK, this.gripK, this.pitch, this.gripStem, this.gripLean]; this.curlK = 1; this.gripK = 1; this.pitch = 0; this.gripStem = stem; this.gripLean = lean; this.setPose(0, true); const arr = this.mesh.instanceMatrix.array, raw = [], isTail = [];
      for (let i = 0; i < this.mesh.count; i += 2) { const o = i * 16; raw.push(arr[o + 12], arr[o + 13], arr[o + 14]); isTail.push(this.vox[i]?.tag === 'tail'); }
      if (stem === SEAHORSE_STEM && lean === SEAHORSE_LEAN) this.tailLowHeld = this.tailLow; this.curlK = keep[0] ?? 0; this.gripK = keep[1] ?? 0; this.pitch = keep[2] ?? 0; this.gripStem = keep[3]; this.gripLean = keep[4]; this.setPose(this.phase ?? 0, true);
      const tilt = (p) => { const c = Math.cos(p), s2 = Math.sin(p), o = new Float32Array(raw.length); for (let i = 0; i < raw.length; i += 3) { o[i] = raw[i] * c - raw[i + 1] * s2; o[i + 1] = raw[i] * s2 + raw[i + 1] * c; o[i + 2] = raw[i + 2]; } return o; };
      const leant = tilt(L); hp = { sc, stem, lean: L, gripLocal: this.gripLocalFor(stem, L), isTail, poses: [[0, L, leant], [SWIVEL, L, leant], [-SWIVEL, L, leant], [0, L - 0.1, tilt(L - 0.1)]] }; cache.set(k, hp);      // as it holds on it turns a little either way on its stem and flicks its head forward to strike: every one of those must be clear too
    }
    return hp;
  }
  // a grip on this decoration found straight away (for tests and tools); in the tank the search runs a little each frame (see grips.js)
  holdSpot(q) { const e = gripsNow(q, this), g = e.grips[0]; return g ? { ...g, bad: 0 } : null; }
  // where the stem passes through its coiled tail, in the world, from how it is posed: the same on every phone, since the curl and grip are shared
  gripPoint() {
    if (!this.sp.tail || ((this.gripK ?? 0) < 0.5 && !this.holdfast?.settle) || this.dead) return null;      // (gliding the last little way onto its stem, the leaves part for it already)
    const gl = this.gripLocalFor(this.gripStem ?? SEAHORSE_STEM, this.gripLean ?? SEAHORSE_LEAN), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), gx = gl[0] * cp - gl[1] * sp, gy = gl[0] * sp + gl[1] * cp, sc = this.scale;
    return [this.pos.x + Math.cos(this.heading) * gx * sc, this.pos.y + gy * sc, this.pos.z - Math.sin(this.heading) * gx * sc];
  }
  // the tip of its snout in the world: its mouth
  snout(out) {
    const S = SEAHORSE_SNOUT, sc = this.scale, cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), px = S.x * cp - S.y * sp, py = S.x * sp + S.y * cp;
    return out.set(this.pos.x + Math.cos(this.heading) * px * sc, this.pos.y + py * sc, this.pos.z - Math.sin(this.heading) * px * sc);
  }
  // would its tail, as posed now, touch the sand or a decoration? A few points along it are checked in the world
  tailHits(ox = 0, oy = 0, oz = 0) {      // (ox, oy, oz: where it will be shortly, to tuck its tail before it gets there)
    const R = this.tailRig, W = Fish3D.world; if (!R) return false; const sc = this.scale, cp = Math.cos(this.pitch || 0), sp = Math.sin(this.pitch || 0), ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    for (const i of [12, 20, 28, 36, 44, 51]) { const x = R.x[i], y = R.y[i], z = R.z[i], px = x * cp - y * sp, py = x * sp + y * cp, wx = this.pos.x + ox + (px * ch + z * sh) * sc, wy = this.pos.y + oy + py * sc, wz = this.pos.z + oz + (-px * sh + z * ch) * sc;
      if (wy < sandH(wx, wz) + 0.08 || W.at?.(wx, wy, wz) || W.soft?.at?.(wx, wy, wz)) return true; }
    return false;
  }
  // ── memory ── what it knows of each holdfast, by the decoration's id: seconds held, visits, and where it stood when last held.
  // The totals are saved with the fish on the server (fish.log.hitch, sent by the lead phone in the fish log), so a reload, a new caretaker or
  // a new lead phone keeps them; what has happened since the last report is added on top.
  memOf(id) {
    const b = this.savedLog?.()?.hitch?.[id], d = this.memDelta;
    return { secs: (b?.[0] ?? 0) + (d?.secs[id] ?? 0), visits: (b?.[1] ?? 0) + (d?.visits[id] ?? 0), pos: d?.pos[id] ?? (b && b[2] != null ? [b[2], b[3]] : null) };
  }
  // its favourite is earned: the holdfast it has spent most time on, once it has gone back to it at least twice and held it two minutes in all.
  // A decoration that has gone is simply not among the choices any more, and a new favourite grows from where it holds on next.
  favourite(spots) {
    let best = null, bs = 0;
    for (const q of spots) { const m = this.memOf(q.id); if (m.secs >= 120 && m.visits >= 2 && m.secs > bs) { bs = m.secs; best = q.id; } }
    return best;
  }
  remember(H, secs, visit) {
    const d = (this.memDelta ||= { secs: {}, visits: {}, pos: {} });
    if (secs) d.secs[H.id] = (d.secs[H.id] ?? 0) + secs;
    if (visit) { d.visits[H.id] = (d.visits[H.id] ?? 0) + 1; d.pos[H.id] = [+H.qx.toFixed(2), +H.qz.toFixed(2)]; this.lastHitch = H.id; }
  }
  // how long it stays on a holdfast: an active seahorse moves on sooner, a quiet one holds on far longer
  holdLength(rng) { return (35 + rng() * 50) * (1.35 - (this.persona?.act ?? 0.45) * 0.8); }
  // ── choosing a holdfast ── among the decorations with real grip points (found in the background, see grips.js), weighed by distance, by what it
  // knows and by its personality; then one of that decoration's grips, at the height its boldness likes and where no other seahorse is.
  pickHold(rng, spots, roost = false) {
    const P = this.persona ?? {}, cur = P.cur ?? 0.5, bold = P.bold ?? 0.5, soc = P.soc ?? 0.5, adapt = P.adapt ?? 0.5, cautious = 1 - bold;
    const others = (this.others ?? []).filter((o) => o !== this && o.sp?.tail && !o.dead), taken = new Set(others.filter((o) => o.holdfast).map((o) => o.holdfast.id));
    const pool = []; let tot = 0;
    for (const q of spots) {
      if (taken.has(q.id)) continue;
      const e = gripsFor(q, this); if (e.status !== 'ready' || !e.grips.length) continue;
      const m = this.memOf(q.id), fam = Math.min(1, m.secs / 300), moved = m.pos && Math.hypot(m.pos[0] - q.x, m.pos[1] - q.z) > 0.3;
      let w = (PLANTS.has(q.type) ? 3 : 1.6) / (1 + (1.1 - 0.6 * bold) * Math.hypot(q.x - this.pos.x, q.z - this.pos.z) ** 2);      // a small home range: near is far more likely than across the tank (a bold one roams a little further)
      w *= 1 + fam * (0.5 + 2.5 * cautious) * (roost ? 3 : 1);                                // a cautious seahorse goes back to places it knows (and every seahorse does, for the night)
      if (!m.visits) w *= roost ? 0.3 : 0.55 + 0.9 * cur;                                      // somewhere it has never held: a curious one is drawn to it
      w *= 1 + (bold - 0.5) * 0.9 * Math.max(0, Math.min(1, (q.z + 0.5) / 2.5));               // out in front near the glass: a bold one likes it, a cautious one hangs back
      if (moved) w *= 0.25 + 0.75 * adapt;                                                      // its old place stands somewhere new: an adaptable one takes to it at once, another needs time
      if (others.some((o) => o.holdfast?.on && Math.hypot(o.holdfast.x - q.x, o.holdfast.z - q.z) < 1.6)) w *= 0.6 + 0.9 * soc;      // near another seahorse
      if (q.id === this.novel) w *= 1 + 2 * cur;                                                // something new it has just been to look at
      pool.push([q, w, e]); tot += w;
    }
    if (!roost && pool.filter(([q]) => q.id !== this.lastHold && (pool.length > 2 || Math.hypot(q.x - this.pos.x, q.z - this.pos.z) < 4.2)).length >= 1) { for (let i = pool.length - 1; i >= 0; i--) if (pool[i][0].id === this.lastHold) { tot -= pool[i][1]; pool.splice(i, 1); } }      // not straight back to where it just was, if there is a real choice (two others, or one within a short swim)
    { const dq = ([q]) => Math.hypot(q.x - this.pos.x, q.z - this.pos.z);      // a small home range: with somewhere near to go, nowhere far away
      const favId = this.favourite(spots); if (pool.some((x) => x[0].id !== this.lastHold && dq(x) < 3.2)) for (let i = pool.length - 1; i >= 0; i--) if (dq(pool[i]) > 4.5 && pool[i][0].id !== favId) { /* its favourite is home, however far */ tot -= pool[i][1]; pool.splice(i, 1); } }
    if (!pool.length) return false;
    const fav = this.favourite(spots), fq = fav && spots.find((q) => q.id === fav), fd = fq ? Math.hypot(fq.x - this.pos.x, fq.z - this.pos.z) : 0;
    let pick = fav && rng() < (roost ? (fd < 2.5 ? 0.85 : 0.35) : 0.2 + 0.4 * cautious) ? pool.find(([q]) => q.id === fav) : null;      // for the night, its favourite if it is not far; otherwise somewhere near it knows
    if (!pick) { let r = rng() * tot; for (const x of pool) { r -= x[1]; if (r <= 0) { pick = x; break; } } pick ||= pool[0]; }
    const [q, , e] = pick, want = 0.25 + 0.6 * bold;      // a bold seahorse holds on higher up, a cautious one lower down
    const free = e.grips.filter((g) => !others.some((o) => o.holdfast && Math.hypot(o.holdfast.x - g.x, o.holdfast.z - g.z) < 0.6 && Math.abs(o.holdfast.y - g.y) < 0.9)); if (!free.length) return false;
    let g = free[0], gs = 9; for (const x of free) { const sc = Math.abs(x.hf - want) + rng() * 0.3; if (sc < gs) { gs = sc; g = x; } }
    this.gripStem = g.stem ?? SEAHORSE_STEM; this.gripLean = g.lean ?? SEAHORSE_LEAN; this.holdfast = { id: q.id, type: q.type, qx: q.x, qz: q.z, x: g.x, y: g.y, z: g.z, face: g.face, hf: g.hf, stem: this.gripStem, lim: 20 + 7 * Math.hypot(g.x - this.pos.x, g.y - this.pos.y, g.z - this.pos.z), on: false, until: this.holdLength(rng), snick: 2 + rng() * 5, held: 0, roost };
    this.idle = 0; this.retarget = 40; this.target.set(g.x, g.y, g.z); this.novel = q.id === this.novel ? null : this.novel;
    this.thought = roost ? `Settling on the ${(LABEL[q.type] ?? q.type)} for the night.` : `Swimming slowly over to the ${(LABEL[q.type] ?? q.type)}.`; return true;
  }
  // letting go: the tail loosens and unwinds and it pushes off gently, rather than snapping free
  release(T = 0.6) { if (this.holdfast) this.lastHold = this.holdfast.id; this.holdfast = null; this.releaseT = T; this.idle = 0; this.retarget = 0; this.thought = null; }
  seahorse(dt, rng) {
    const t = this.tt, P = this.persona ?? {}, cur = P.cur ?? 0.5, bold = P.bold ?? 0.5; this.curlK ??= 0;
    this.strikeT = Math.max(0, (this.strikeT ?? 0) - dt);
    // ── the night ── it rests through the night on a holdfast it knows; each seahorse settles and wakes in its own time
    const h01 = (n) => ((((this.seed ?? 1) * 2654435761 + n * 40503) >>> 0) % 1000) / 1000;
    if (this.isNight) { this.nightT = (this.nightT ?? 0) + dt; this.dayT = 0; } else { this.dayT = (this.dayT ?? 999) + dt; this.nightT = 0; }
    const bed = 15 + h01(1) * 90 + (P.act ?? 0.45) * 60, wake = 10 + h01(2) * 80 + (1 - (P.act ?? 0.45)) * 40, was = this.sleepy;
    this.sleepy = this.isNight ? this.nightT > bed : !!was && this.dayT < wake;
    if (was && !this.sleepy && this.holdfast?.on) this.holdfast.until = Math.min(this.holdfast.until, 5 + rng() * 25);      // morning: back to its day in its own time
    // ── the eyes ── each looks its own way; one follows food it is watching; something new catches its eye; both lock forward to strike
    for (const k of ['eyeL', 'eyeR']) {
      const e = (this[k] ||= { x: 0, y: 0, tx: 0, ty: 0, t: 0 }); e.t -= dt;
      if (e.t <= 0) { e.t = this.sleepy ? 3 + rng() * 5 : 0.5 + rng() * 2.5; e.tx = this.sleepy ? 0 : Math.round((rng() - 0.5) * 2.2); e.ty = this.sleepy ? -Math.round(rng()) : Math.round((rng() - 0.5) * 2.2); }
      let tx = e.tx, ty = e.ty;
      const look = this.prey?.pos ?? (this.glanceT > 0 ? this.glance : null);
      if (look) { const dx = look.x - this.pos.x, dz = look.z - this.pos.z, ch = Math.cos(this.heading), sh = Math.sin(this.heading), lx = dx * ch - dz * sh, lz = dx * sh + dz * ch, side = lz >= 0 ? 'eyeR' : 'eyeL';
        if (k === side || this.aimT > 0) { tx = Math.max(-1, Math.min(1, Math.round(lx * 2))); ty = Math.max(-1, Math.min(1, Math.round((look.y - (this.pos.y + 40 * this.scale)) * 2))); } }
      if (this.aimT > 0 || this.strikeT > 0) { tx = 1; ty = Math.max(-1, Math.min(0, ty)); }
      e.x += (tx - e.x) * Math.min(1, dt * 9); e.y += (ty - e.y) * Math.min(1, dt * 9);
    }
    this.aimT = Math.max(0, (this.aimT ?? 0) - dt); this.glanceT = Math.max(0, (this.glanceT ?? 0) - dt);
    this.linkCool = Math.max(0, (this.linkCool ?? 0) - dt);
    // something new placed in the tank: it notices after a moment; a curious one may let go and go to look, another just watches it
    const N = this.noticeQ; if (N && t >= N.at) { this.noticeQ = null;
      if (!this.sleepy && !this.link && rng() < (this.holdfast?.on ? 0.15 + 0.75 * cur : 0.35 + 0.6 * cur)) { if (this.holdfast) this.release(0.5); this.exploreAt = { x: N.x, y: N.y, z: N.z, id: N.id, t: 0 }; this.thought = 'Off to see what is new.'; }
      else { this.glance = new THREE.Vector3(N.x, N.y, N.z); this.glanceT = 3 + rng() * 3; this.thought = 'One eye on the new thing in the tank.'; } }
    if (this.link) { const L = this.link, o = L.o; L.t -= dt; if (o.dead || o.link?.o !== this || this.seeking || L.t <= 0) this.unlink(); else return this.linked(dt, L); }      // holding tails with a partner
    const food = this.food?.() ?? [], H = this.holdfast;
    if (!food.length) { this.chase = false; this.foodWait = 0; }
    // letting go: the coils unwind and it drifts up off the stem
    if (this.releaseT > 0) { this.releaseT -= dt; this.gripK = (this.gripK ?? 0) * Math.exp(-dt * 6); this.curlK += (0.2 - this.curlK) * Math.min(1, dt * 3); this.pos.y += 0.12 * dt; this.pitch += (0 - this.pitch) * Math.min(1, dt * 3); this.phase += dt * 12; this.place(dt); return true; }
    if (H && !H.on && this.seeking) { this.release(0.3); return true; }                         // food on its way and no hold yet: it goes for the food
    if (!H) { if (!this.seeking && (this.tintK ?? 0) > 0.01) this.setTint(Math.max(0, this.tintK - dt * 0.02)); return this.explore(dt, rng); }
    // where its tail grips: the stem passes through the coils of its tail
    const gl = this.gripLocalFor(this.gripStem ?? SEAHORSE_STEM, this.gripLean ?? SEAHORSE_LEAN), sc = this.scale, cp = Math.cos(this.pitch), spn = Math.sin(this.pitch), gx = gl[0] * cp - gl[1] * spn, gy = gl[0] * spn + gl[1] * cp;      // the grip point as the body is leaning now
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading), wx = H.x - ch * gx * sc, wy = H.y - gy * sc, wz = H.z + sh * gx * sc;
    if (!H.on) {                                                                    // still on its way: slow and upright, turning side-on as it arrives
      // it comes in from open water on the side its body will be, a little above, then glides in: not straight through the leaves
      if (!H.via) { let ox = wx - H.x, oz = wz - H.z, ol = Math.hypot(ox, oz); if (ol < 0.05) { ox = Math.cos(H.face); oz = -Math.sin(H.face); ol = 1; } H.via = { x: wx + (ox / ol) * 0.8, y: wy + 0.3, z: Math.min(GLASS_Z - 0.4, wz + (oz / ol) * 0.8), done: Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z) < 1.0 }; }
      if (!H.via.done && Math.hypot(H.via.x - this.pos.x, H.via.y - this.pos.y, H.via.z - this.pos.z) < 0.35) H.via.done = true;
      if (H.via.done) this.target.set(wx, wy, wz); else this.target.set(H.via.x, H.via.y, H.via.z); this.idle = 0; this.retarget = 40; const d = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      if (d < 0.9) { let dh = H.face - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 2); }
      if (d < 0.6 && H.via.done) H.settle = true;
      if (H.settle) {                                                               // close enough to reach: it glides the last little way onto its spot, leans back and wraps its tail round the stem
        const k = Math.min(1, dt * 4); this.pos.x += (wx - this.pos.x) * k; this.pos.y += (wy - this.pos.y) * k; this.pos.z += (wz - this.pos.z) * k; this.vel.set(0, 0, 0);
        const g0 = this.gripK ?? 0; this.curlK += (1 - this.curlK) * Math.min(1, dt * 3); this.gripK = d < 0.2 ? Math.min(1, g0 + dt * 2.2) : g0;
        let dh = H.face - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 3); this.pitch += ((this.gripLean ?? SEAHORSE_LEAN) * this.gripK - this.pitch) * Math.min(1, dt * 4);
        if (this.gripK >= 1 && d < 0.03) { H.on = true; H.settle = false; this.holdN = (this.holdN ?? 0) + 1; this.remember(H, 0, true); }
        this.phase += dt * 10; this.place(dt);
        if ((H.trip = (H.trip ?? 0) + dt) > (H.lim ?? 25) + 6) this.release(0.4);
        return true;
      }
      if ((H.trip = (H.trip ?? 0) + dt) > (H.lim ?? 25)) this.release(0.4);         // could not get there (a seahorse is slow, so it allows for how far it had to go): tries somewhere else
      return false;
    }
    // ── anchored ──
    H.held += dt; if (!this.sleepy) H.until -= dt; this.heldFor = (this.heldFor ?? {}); this.heldFor[H.id] = (this.heldFor[H.id] ?? 0) + dt; this.remember(H, dt, false);
    this.favHold = this.favourite(this.getSpots?.() ?? []) ?? this.favHold;
    this.curlK += (1 - this.curlK) * Math.min(1, dt * 2.5); this.gripK = (this.gripK ?? 0) + (1 - (this.gripK ?? 0)) * Math.min(1, dt * 2);      // the tail coils round the stem
    this.vel.set(0, 0, 0);
    // ── hunting from the stem ── it watches the nearest piece of food within sight of its snout, turns its head to follow it, and strikes
    // the moment it is within reach of the mouth; food it cannot reach from here it lets drift by, and only after a while (sooner if it is
    // bold, never at night unless the tank is hungry) does it let go and swim after it
    let aimH = 0, aimP = 0;
    if (food.length) {
      const m = this.snout(_snt), seen = (c) => !c.eaten && (!c.sucked || c.sucked === this);
      if (this.prey && (!seen(this.prey) || this.prey.pos.distanceTo(m) > SEA_WATCH * 1.2)) this.prey = null;
      { const cur = this.prey ? this.prey.pos.distanceTo(m) : SEA_WATCH; let bd = this.prey ? cur * 0.6 : SEA_WATCH, pick = null;      // the nearest piece in sight; it switches only to one clearly nearer than the one it is watching
        for (const c of food) if (c !== this.prey && seen(c)) { const d = c.pos.distanceTo(m); if (d < bd) { bd = d; pick = c; } }
        if (pick) { this.prey = pick; this.preyT = 0; } }
      if (this.prey) {
        this.preyT += dt; const p = this.prey.pos; this.prey.watchedBy = this; this.prey.watchD = p.distanceTo(m);      // other fish leave a shrimp right in front of a watching seahorse (see the scramble in fishmgr)
        let want = Math.atan2(-(p.z - H.z), p.x - H.x) - H.face; want = Math.atan2(Math.sin(want), Math.cos(want)); aimH = Math.max(-0.75, Math.min(0.75, want));      // it turns on its stem to face it, within what the grip allows
        // and pivots on its grip to bring its snout to it: held by the tail, its snout swings round the grip at a fixed distance, so the lean that
        // points the snout at the shrimp is worked out from where the shrimp is, seen from the grip in the plane it faces (within how far it can lean)
        { const gl = this.gripLocalFor(this.gripStem ?? SEAHORSE_STEM, this.gripLean ?? SEAHORSE_LEAN), va = SEAHORSE_SNOUT.x - gl[0], vb = SEAHORSE_SNOUT.y - gl[1];
          const along = (p.x - H.x) * Math.cos(this.heading) - (p.z - H.z) * Math.sin(this.heading), up = p.y - H.y;
          let pk = Math.atan2(up, along) - Math.atan2(vb, va); pk = Math.atan2(Math.sin(pk), Math.cos(pk)); aimP = Math.max(-0.38, Math.min(0.3, pk - (this.gripLean ?? SEAHORSE_LEAN)));
          // never into a leaf or a decoration: where its snout would be at that lean is checked, and it leans less if it would touch something
          const Wd = Fish3D.world, sc = this.scale, ch = Math.cos(this.heading), shh = Math.sin(this.heading), L0 = this.gripLean ?? SEAHORSE_LEAN;
          for (let k = 0; k < 3 && aimP; k++) { const pp = L0 + aimP, aa = (va * Math.cos(pp) - vb * Math.sin(pp)) * sc, bb = (va * Math.sin(pp) + vb * Math.cos(pp)) * sc, sx = H.x + ch * aa, sy = H.y + bb, sz = H.z - shh * aa;
            if (!(Wd.at?.(sx, sy, sz) || Wd.soft?.at?.(sx, sy, sz))) break; aimP *= 0.5; } }
        if (!this.strikeT && this.preyT > 0.25 && p.distanceTo(m) < SEA_REACH) {      // within reach of the snout: a very quick strike, sucking it in
          this.strikeT = SEA_STRIKE; this.foodWait = 0; this.strikeSeq = (this.strikeSeq ?? 0) + 1; this.prey.sucked = this; this.prey.suckT = 0; this.aimT = 0.2; this.thought = 'Struck! Sucked in a shrimp in a flash.'; this.snickSaid = 3; }
      }
      { // food still falling, or drifting in the water near its own height, may yet come by on the current: while there is any, it keeps watching
        // and its patience runs down only slowly. Food that has settled out of reach, or is far off, is what it may in the end let go and go after.
        const sy = this.pos.y, promising = food.some((c) => !c.eaten && !c.sucked && Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z) < 3.2 && c.pos.y > sy - 2.2 && (c.pos.y < sy + 2.6 || !c.depth || c.pos.y > c.depth));
        this.foodWait = (this.foodWait ?? 0) + dt * (promising ? 0.2 : 1);
        const urgent = this.tankHungry?.() ?? false, patience = this.weak ? Infinity : this.sleepy ? (urgent ? 25 : Infinity) : 6 + 14 * (1 - bold);      // a weak one stays put and only takes what comes by
        if (this.foodWait > patience && food.some((c) => !c.eaten && !c.sucked && c.pos.distanceTo(this.pos) < 7)) { this.chase = true; this.release(0.4); return true; }      // nothing comes near: it goes to find it
      }
    } else this.prey = null;
    const strike = this.strikeT > 0 ? Math.sin(Math.PI * (1 - this.strikeT / SEA_STRIKE)) : 0;
    // turning on its stem: a little either way as it watches, much less at night, or round to follow its prey
    const sway = this.sleepy ? 0.3 : 1; let dh = H.face + (this.prey ? aimH : Math.sin(t * 0.35 + this.phase) * SWIVEL * sway) - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * (this.prey ? 3 : 1.2));
    // plankton: now and then (not at night) a snick at something too small to see
    if (!this.sleepy && !this.prey) { H.snick -= dt; if (H.snick < 0.7 && H.snick + dt >= 0.7) this.aimT = 0.7; if (H.snick <= 0) { H.snick = 4 + rng() * 10; this.snickT = 0.32; this.snicks = (this.snicks ?? 0) + 1; this.snickSaid = 3; this.onSnick?.(this); } }
    this.snickT = Math.max(0, (this.snickT ?? 0) - dt); const flick = this.snickT > 0 ? Math.sin(Math.PI * (1 - this.snickT / 0.32)) : 0;
    // leaning back from its stem; the head tips to follow its prey; a flick of the head for plankton, a much faster, deeper one to strike
    this.pitch += (((this.gripLean ?? SEAHORSE_LEAN) * (this.gripK ?? 0) + (this.prey ? aimP : 0) - 0.1 * flick - 0.2 * strike + Math.sin(t * 0.7 + this.phase) * 0.02) - this.pitch) * Math.min(1, dt * (strike ? 45 : flick ? 30 : this.prey ? 6 : 3));
    // its colour: a little of its holdfast's, and darker through the night
    if (H.held > 6 || this.sleepy) { const base = PLANT_COLS[H.type]?.[1] ?? HOLD_COLS[H.type] ?? [150, 140, 120], col = this.sleepy ? [Math.round(base[0] * 0.35 + 30), Math.round(base[1] * 0.35 + 28), Math.round(base[2] * 0.35 + 40)] : base;
      if (!this.tintCol || this.tintCol[0] !== col[0] || this.tintCol[1] !== col[1] || this.tintCol[2] !== col[2]) { this.tintCol = col; this.tintApplied = -1; }
      const want = this.sleepy ? 0.4 : 0.3; this.setTint(Math.min(want, (this.tintK ?? 0) + dt * (this.sleepy ? 0.03 : 0.012))); }
    this.snickSaid = Math.max(0, (this.snickSaid ?? 0) - dt);
    this.thought = this.snickSaid > 0 ? (this.thought?.startsWith('Struck') ? this.thought : 'Snapped up a speck of plankton.') : this.prey ? 'Watching a shrimp drift closer.' : this.sleepy ? `Resting on the ${(LABEL[H.type] ?? H.type)} for the night.` : this.glanceT > 0 ? 'One eye on the new thing in the tank.' : this.aimT > 0 ? 'Both eyes on something drifting past.' : H.held < 8 ? `Holding on to the ${(LABEL[H.type] ?? H.type)} with its tail.` : (this.tintK ?? 0) > 0.15 ? `Blending in with the ${(LABEL[H.type] ?? H.type)}.` : 'Watching the water, one eye each way.';
    // at night it stays, shifting to another familiar stem only now and then; by day it moves on when its time is up
    if (this.sleepy ? rng() < dt / 420 : H.until <= 0) { this.release(0.6); return true; }
    this.phase += dt * (this.sleepy ? 3.5 : 10);                                    // the dorsal fin still flutters, slowly at night
    // the body turns and tilts about the grip itself (placed after this frame's turning and tilting), so the stem stays inside the coil through every flick and strike
    { const cp2 = Math.cos(this.pitch), sp2 = Math.sin(this.pitch), gx2 = gl[0] * cp2 - gl[1] * sp2, gy2 = gl[0] * sp2 + gl[1] * cp2, ch2 = Math.cos(this.heading), sh2 = Math.sin(this.heading), x = H.x - ch2 * gx2 * sc, y = H.y - gy2 * sc, z = H.z + sh2 * gx2 * sc;
      if (H.held > 0.6) this.pos.set(x, y, z); else { const k = Math.min(1, dt * 6); this.pos.x += (x - this.pos.x) * k; this.pos.y += (y - this.pos.y) * k; this.pos.z += (z - this.pos.z) * k; } }
    this.place(dt); return true;
  }
  // not holding on: off to look at something new, or (when nothing else is going on) the usual slow hovering, choosing where to hold on next
  explore(dt, rng) {
    const X = this.exploreAt; if (!X) return false;
    X.t += dt; const d = Math.hypot(X.x - this.pos.x, X.z + 0.7 - this.pos.z);
    this.target.set(X.x + 0.35, X.y, X.z + 0.7); this.idle = 0; this.retarget = 2;
    if (d < 1.0 && !X.seen) { X.seen = this.tt; X.stay = 6 + rng() * 5; this.inspects = (this.inspects ?? 0) + 1; this.glance = new THREE.Vector3(X.x, X.y, X.z); this.glanceT = X.stay; this.thought = 'Looking over something new.'; }      // there: it hangs beside it, both eyes on it, for a while
    if (X.seen && this.tt - X.seen > X.stay) { this.novel = X.id; this.exploreAt = null; this.retarget = 0; }      // then it may well try holding on to it
    else if (!X.seen && X.t > 30) this.exploreAt = null;      // could not get there
    return false;
  }
  // the group follows its position and pose, and the rig is posed at 24 Hz
  place(dt) { this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(_eu.set(this.roll, this.heading, this.pitch, 'YZX')); this.accum += dt; if (this.accum > 1 / 24) { this.accum = 0; this.setPose(this.phase); } }
  // two seahorses that have shared the tank a while sometimes link tails: they swim to a meeting point, face each other, curl their tails round each other's and drift together
  linkWith(o, m, secs) { this.letGo(); o.letGo?.(); this.link = { o, m, t: secs, side: -1, on: false, ph: Math.random() * 6 }; o.link = { o: this, m, t: secs, side: 1, on: false, ph: this.link.ph }; }
  unlink() { const o = this.link?.o; this.link = null; this.idle = 0; this.retarget = 0; this.thought = null; this.linkCool = 150; if (o?.link?.o === this) { o.link = null; o.idle = 0; o.retarget = 0; o.thought = null; o.linkCool = 150; } }
  linked(dt, L) {
    // side by side a body-width apart, facing each other, each leaning back a little so the curled tails swing in under them and twine together in the middle
    const t = this.tt, S = Math.max(0.3, this.radius * 0.62), face = L.side < 0 ? 0 : Math.PI;
    const mx = L.m.x + Math.sin(t * 0.2 + L.ph) * 0.25, my = L.m.y + Math.sin(t * 0.3 + L.ph) * 0.15, mz = L.m.z + Math.cos(t * 0.17 + L.ph) * 0.1;      // the pair drifts slowly together
    const wx = mx + L.side * S / 2, wy = Math.max(my + L.side * 0.05, 0.35 + this.sandBelow()), wz = mz + L.side * 0.06, d = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
    let dh = face + Math.sin(t * 0.35 + L.ph + L.side) * 0.1 - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    if (!L.on) {                                                                     // on its way to the meeting point: slow and upright, turning to face its partner as it arrives
      this.target.set(wx, wy, wz); this.idle = 0; this.retarget = 40;
      _p2.set(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z).multiplyScalar(Math.min(0.55, d * 1.2) / (d || 1)); this.vel.lerp(_p2, Math.min(1, dt * 2)); this.pos.addScaledVector(this.vel, dt);
      if (d < 1.2) this.heading += dh * Math.min(1, dt * 2); else { let mh = Math.atan2(-this.vel.z, this.vel.x) - this.heading; mh = Math.atan2(Math.sin(mh), Math.cos(mh)); this.heading += mh * Math.min(1, dt * 1.5); }
      this.curlK += (-0.4 - this.curlK) * Math.min(1, dt * 1.5); this.gripK = (this.gripK ?? 0) * Math.exp(-dt * 3); this.phase += dt * 12; this.pitch *= 0.9;
      if (d < 0.2) { L.on = true; this.vel.set(0, 0, 0); this.linksN = (this.linksN ?? 0) + 1; }      // a real tail-link, counted for its log
      if ((L.trip = (L.trip ?? 0) + dt) > 30) { this.unlink(); return false; }      // could not get there: another time
      this.thought = `Swimming over to ${L.o.name ?? 'its partner'}.`;
      this.place(dt); return true;
    }
    this.heading += dh * Math.min(1, dt * 1.2); this.curlK += (1 - this.curlK) * Math.min(1, dt * 2.5); this.gripK = (this.gripK ?? 0) * Math.exp(-dt * 3);
    this.pos.x += (wx - this.pos.x) * Math.min(1, dt * 4); this.pos.y += (wy - this.pos.y) * Math.min(1, dt * 4); this.pos.z += (wz - this.pos.z) * Math.min(1, dt * 4); this.vel.set(0, 0, 0);
    this.pitch += (0.32 + Math.sin(t * 0.6 + L.ph) * 0.05 - this.pitch) * Math.min(1, dt * 2); this.roll += (Math.sin(t * 0.5 + L.side) * 0.03 - this.roll) * Math.min(1, dt * 2);
    this.thought = `Holding tails with ${L.o.name ?? 'its partner'}.`; this.phase += dt * 8;
    this.place(dt); return true;
  }
  letGo() { if (this.holdfast) this.lastHold = this.holdfast.id; this.holdfast = null; this.idle = 0; this.retarget = 0; this.thought = null; }
  setTint(k) {
    this.tintK = k; if (this.pale || (this.glowK ?? 0) > 0.03 || Math.abs(k - (this.tintApplied ?? 0)) < 0.02) return; this.tintApplied = k;
    const a = this.mesh.instanceColor.array, b = this.baseCol, c = this.tintCol ?? [200, 200, 200], cr = c[0] / 255, cg = c[1] / 255, cb = c[2] / 255;
    for (let i = 0; i < a.length; i += 3) { const l = b[i] * 0.3 + b[i + 1] * 0.59 + b[i + 2] * 0.11; a[i] = b[i] + (cr * (0.4 + l) - b[i]) * k; a[i + 1] = b[i + 1] + (cg * (0.4 + l) - b[i + 1]) * k; a[i + 2] = b[i + 2] + (cb * (0.4 + l) - b[i + 2]) * k; }
    this.mesh.instanceColor.needsUpdate = true;
  }
  pickHover(rng) {
    const spots = this.getSpots?.() ?? [], b = this.band;
    // a nursery baby shows its own character in where it goes next: the explorer seldom settles and heads off anywhere, the plant-lover
    // goes back to a stem whenever it can, the social one swims over to its father or a brother or sister
    const role = this.nursery ? this.role : null, kin = role === 'social' ? this.kin?.() : null;
    if (kin?.length && rng() < 0.75) { const o = kin[(rng() * kin.length) | 0]; this.target.set(o.pos.x + (rng() - 0.5) * 0.7, o.pos.y + (rng() - 0.5) * 0.4, o.pos.z + (rng() - 0.5) * 0.4); this.idle = 1 + rng() * 2; this.retarget = 3 + rng() * 2; return; }
    if (role === 'explore' && rng() < 0.8) { this.target.set(-4 + rng() * 8, b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); this.idle = 0.5 + rng(); this.retarget = 4 + rng() * 3; return; }
    if (this.sp.tail && !this.seeking && (role !== 'explore') && this.pickHold(rng, spots, !!this.sleepy || role === 'plants')) return;
    // at the sand's own height under the thing it rests beside, not a fixed height above the floor
    if (spots.length && rng() < 0.6) { const s = spots[(rng() * spots.length) | 0], y = Math.max((s.y ?? 0) + 0.8, (s.y ?? 0) + s.h * (0.3 + rng() * 0.4) + 0.4); this.target.set(s.x + (rng() - 0.5) * 0.5, Math.min(Fish3D.topY - 1, y), s.z + 0.55); this.idle = 7 + rng() * 9; this.retarget = this.idle + 3; return; }   // hold on and rest
    this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); this.idle = 1.5 + rng() * 3; this.retarget = 4 + rng() * 4;
    if (this.sp.tail && this.sleepy) { this.idle *= 2; this.retarget = Math.min(this.retarget, 3); }      // at night: little wandering, soon back to a stem
    for (let k = 0; k < 8 && Fish3D.world.push; k++) { _o.set(0, 0, 0); if (!Fish3D.world.push(this.target, this.radius * 0.5 + 0.4, _o)) break; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); }
  }
  // Octopus: rests on the bottom with its arms spread flat, crawls along it, and now and then jets through the water in pulses (mantle squeezes, arms stream back) before drifting down again.
  jetUpdate(dt, rng, others) {
    this.tt = (this.tt ?? 0) + dt; const mul = (this.mul ?? 1) * (this.vigor ?? 1) * (this.tmul ?? 1); const S = (this.st ||= { s: 'rest', t: 1 + rng() * 3, n: 0, pulse: 0 }); S.t -= dt * (S.s === 'rest' ? (this.temper()?.tempo ?? 1) : 1);
    const floor = 0.55 + this.sandBelow(), onFloor = this.pos.y < floor + 0.5;      // the sand under it, on whichever level it is
    if (this.task && (S.s === 'jet' || S.s === 'dash' || S.s === 'glass' || this.seeking || this.hunt || this.jarAt || this.scareT > 0 || (performance.now() - this.task.t0 > 240000))) { this.onTask?.(this, 'abort'); this.task = null; if (S.mode === 'tgo' || S.mode === 'thaul' || S.mode === 'tsettle') S.mode = null; }
    if (this.seeking && S.s !== 'jet') { S.s = 'jet'; S.n = 2; S.t = 6; S.pulse = 0; }
    // its mind: a puzzle jar to work on, something new to inspect, or someone it knows to greet at the glass
    if (this.carryMesh && S.mode !== 'carry2') this.carryMesh.visible = false;
    const want = this.task ? null : this.jarAt ? 'jar' : this.hunt ? 'hunt' : this.inspect ? 'inspect' : null;
    // to take hold of a thing it comes up beside it, so you see the arms close round it
    if (want && S.mode !== want && S.s !== 'jet' && S.s !== 'ponder' && !this.seeking) { S.mode = want; S.s = 'crawl'; S.t = 16; const p = want === 'jar' ? this.jarAt : want === 'hunt' ? this.hunt : this.inspect; const grip = want === 'inspect' && p.r, gs = this.pos.x < p.x ? -1 : 1, ax = Math.max(-3.6, Math.min(3.6, grip ? p.x + gs * (p.r + 0.6) : p.x - (want === 'jar' ? 0.3 : want === 'hunt' ? 0.4 : 0.7))), az = Math.max(OCT_BACK, Math.min(OCT_FRONT, grip ? p.z + 0.3 : p.z - (want === 'jar' ? 1.4 : want === 'hunt' ? 1.0 : -0.9))); if (want === 'inspect' && !grip) { const [gx, gz] = this.crawlGoal(ax, az, rng, 0.7); this.target.set(gx, floor, gz); }
      // that side is blocked: the nearest open spot round it, the glass side preferred
      else if (grip && !this.freeSpot(ax, az)) { let best = null, bd = 1e9; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = p.r + 0.55 + (k % 2) * 0.25, x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr; if (Math.abs(x) > 3.7 || z < OCT_BACK || z > OCT_FRONT + 0.2 || !walkable(x, z) || !this.freeSpot(x, z)) continue; const d = Math.hypot(x - this.pos.x, z - this.pos.z) - 0.6 * Math.sin(a); if (d < bd) { bd = d; best = [x, z]; } } if (best) this.target.set(best[0], floor, best[1]); } else this.target.set(ax, floor, az); }       // it settles behind the jar or the crab, facing the glass, and sits back so the arms do the reaching where you can see them
    if (!want && (S.mode === 'jar' || S.mode === 'hunt' || S.mode === 'inspect')) { if (S.mode === 'jar' && S.s === 'work') { this.flush = 1; S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 5; this.target.set(this.pos.x + (this.pos.x > 0 ? -1 : 1) * 1.5, this.pos.y + 2.5, this.pos.z); } else if (S.s === 'work' || S.s === 'crawl') { S.s = 'rest'; S.t = 3; } S.mode = null; }
    const wrapAt = S.mode === 'jar' && this.jarAt ? this.jarAt : S.mode === 'inspect' && S.s === 'work' && this.inspect?.r ? this.inspect : null;      // a jar it is working on, or a thing it has hold of: the arms that face it close round it and climb it
    if (wrapAt) { const sc = this.scale || 0.06, dx = wrapAt.x - this.pos.x, dz = wrapAt.z - this.pos.z, ch = Math.cos(this.heading), sh = Math.sin(this.heading); this.rs.jx = (dx * ch - dz * sh) / sc; this.rs.jz = (dx * sh + dz * ch) / sc; this.rs.jr = (wrapAt === this.jarAt ? 0.58 : wrapAt.r) / sc; } else this.rs.jr = 0;
    if (S.s !== 'work') { this.workK += (0 - this.workK) * Math.min(1, dt * 3); this.greetK += (0 - this.greetK) * Math.min(1, dt * 3); }
    if (S.s === 'rest') this.restFor += dt; else { this.restFor = 0; this.homing = false; }
    const gl = this.glassAt && performance.now() < this.glassAt.until ? this.glassAt : null; if (this.glassAt && !gl) this.glassAt = null;                               // a finger held on the glass: the octopus comes to press its arms against it
    if (gl && S.s !== 'glass' && S.s !== 'work' && S.s !== 'jet' && !this.seeking && !this.jarAt && !this.hunt && !this.dead) { S.s = 'glass'; S.mode = null; if (this.carryMesh) this.carryMesh.visible = false; }
    if (S.s === 'glass' && !gl) { S.s = 'drift'; S.t = 5; }
    if (S.s === 'glass') {
      const GZ = 3.1, tx = Math.max(-3.6, Math.min(3.6, gl.x)), ty = Math.max(1.8, Math.min(9.5, gl.y)), to = _p2.set(tx, ty, GZ).sub(this.pos), d = to.length() || 1;
      to.multiplyScalar(Math.min(2.4, 0.5 + d * 0.9) / d); this.vel.lerp(to, Math.min(1, dt * 2.2)); this.restK += (1 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 3);
      this.glassNear += ((1 - Math.max(0, Math.min(1, (d - 0.15) / 2.2))) - this.glassNear) * Math.min(1, dt * 3); if (d < 0.35) this.vel.multiplyScalar(Math.exp(-6 * dt));
    } else this.glassNear *= Math.exp(-dt * 2.5);
    if (S.s === 'work' && S.mode === 'hunt' && this.hunt) this.updateGrab(dt, S); else if (S.mode === 'carry2' || (S.s === 'work' && S.mode === 'jar' && this.jarAt)) this.updateHold(dt, S, S.mode === 'jar' ? 'jar' : 'carry'); else if (this.rs.grab) { this.rs.grab = null; this.gr = null; }
    if (S.s === 'work') {
      const jar = S.mode === 'jar' ? this.jarAt : S.mode === 'hunt' ? this.hunt : S.mode === 'inspect' ? this.inspect : null;
      this.vel.multiplyScalar(Math.exp(-4 * dt)); this.restK += (0.7 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      if (S.mode === 'greet') this.greetK += (1 - this.greetK) * Math.min(1, dt * 2); else this.workK += ((S.mode === 'inspect' ? (this.inspect?.r ? 0.9 : 0.65) : S.mode === 'hunt' && (this.rs.grab?.t ?? 0) > 1.8 ? 0.3 : 1) - this.workK) * Math.min(1, dt * 2);      // eating, the other arms settle and only the working arms move
      if (jar) { let dy = Math.atan2(-(jar.z - this.pos.z), jar.x - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 2.2); }
      else if (S.mode === 'greet') { let dy = Math.atan2(-1, 0) * -1 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.6); }          // faces the glass
      if (S.mode === 'hunt' && S.t <= 0 && this.hunt) { this.onEat?.(this.hunt); this.hunt = null; this.flush = 1; }
      if (S.mode !== 'jar' && S.t <= 0) { if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 4 + rng() * 5; }
    } else if (S.s === 'glass') {
      /* handled above */
    } else if (S.s === 'ponder') {
      this.restK += (1 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 3); this.vel.multiplyScalar(Math.exp(-5 * dt)); if (!onFloor) this.vel.y -= 0.4 * dt;
      const I = this.intent; if (I && Math.hypot(I.x - this.pos.x, I.z - this.pos.z) > 0.6 && I.z < 20) { let dy = Math.atan2(-(I.z - this.pos.z), I.x - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += Math.max(-dt * 1.4, Math.min(dt * 1.4, dy)) * Math.min(1, S.t < 0.4 ? 1 : 0.5); }
      if (S.t <= 0) { const P = S.pend ?? { s: 'rest', t: 2, n: 0 }; S.s = P.s; S.t = P.t; S.n = P.n; S.pend = null; this.intent = null; }
    } else if (S.s === 'squirt') {                                           // a trickster's joke: it turns to face whoever is watching, draws in water and squirts it at the glass
      this.restK += (0.85 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 3); this.vel.multiplyScalar(Math.exp(-4 * dt));
      let dh = Math.PI / 2 - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 7);
      if (!S.done && S.t < 1.0) { this.inhaleK = Math.max(this.inhaleK ?? 0, 1); }
      if (!S.done && S.t < 0.6) { S.done = true; this.sq = 1; this.flush = Math.max(this.flush, 0.5); this.onThrow?.(this.pos.clone(), _p2.set(0, 0.25, 1).normalize().clone(), 'water'); this.onThrow?.(this.pos.clone().add(_p2.set(0, 0.2, 1.4)), _p2.set(0, 0.3, 1).normalize().clone(), 'water'); this.actFlash = 4; this.onMoment?.('squirt'); }
      if (S.t <= 0) this.endAct(S, rng);
    } else if (S.s === 'rest') {
      S.prog = null; S.detour = null; this.vel.multiplyScalar(Math.exp(-3 * dt)); this.restK += (1 - this.restK) * Math.min(1, dt * 1.5); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      if (!onFloor) this.vel.y -= 0.5 * dt;
      this.homing = false;
      if (this.den?.home) { const [hx, hz] = this.denGoal(rng); if (Math.hypot(this.pos.x - hx, this.pos.z - hz) < 0.9) { let dy = Math.PI / 2 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.2); this.homing = true; this.tuckWant = this.den.kind === 'pot' ? 0.44 : 0.4; this.pos.x += (hx - this.pos.x) * Math.min(1, dt * 1.5); this.pos.z += (hz - this.pos.z) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-6 * dt)); } }       // in its shell or pot it faces the room and squeezes itself in; soft-bodied, it is not pushed out by the walls
      const M = { ...(this.mind ?? { cur: 0.5, soc: 0.5, tidy: 0.5 }) }, sk = this.sulk ?? 0, bo = this.bored ?? 0, au = this.audience ?? 0; M.cur = Math.min(1, M.cur * (1 - sk) + 0.5 * bo); M.soc = M.soc * (1 - 0.5 * sk) + 0.25 * au;
      if (onFloor && S.t > 6 && this.den == null) { const q = (this.fav ||= { x: this.pos.x, z: this.pos.z, n: 0 }); q.n = Math.min(40, q.n + dt); const w = Math.min(0.02, dt * 0.01); if (this.restFor > 8) { q.x += (this.pos.x - q.x) * w; q.z += (this.pos.z - q.z) * w; this.favDirty = true; } }
      const near = S.t <= 0 && others.some((o) => o !== this && !o.dead && !o.visitor && o.pos.distanceTo(this.pos) < 1.5);
      S.gaitSet = false; this.glassCool = Math.max(0, (this.glassCool ?? 0) - dt); this.squirtCool = Math.max(0, (this.squirtCool ?? 0) - dt); this.begCool = Math.max(0, (this.begCool ?? 0) - dt); if (this.act === 'grab' && !this.inspect) this.act = null;
      if (S.t <= 0 && this.isNight && this.den && !S.mode && Math.hypot(this.pos.x - this.den.x, this.pos.z - this.den.z) > 1.4 && rng() < 0.7) this.goDen(S, rng);     // it turns in at its den for the night
      else if (S.t <= 0 && !S.mode && !this.inspect && this.profile?.mood !== 'Hungry' && (levelAt(this.pos.x, this.pos.z) === 'rear' || ((S.stay = 0), false)) && (S.stay = (S.stay ?? 0) + 1) <= 5 && rng() < 0.7) { S.t = 6 + rng() * 8; this.lookX = (rng() - 0.5) * 1.6; }      // up on the high bank it likes to stay a while and look out over the tank
      else if (S.t <= 0 && this.profile?.mood === 'Hungry' && (this.begCool ?? 0) <= 0 && this.lead !== false && !this.shy && !this.glassAt && rng() < 0.6) { this.begCool = 90 + rng() * 60; this.glassAt = { x: (rng() - 0.5) * 3, y: 2.2 + rng() * 1.4, until: performance.now() + 6500 }; this.actText = 'Hungry. Watching you for a crab.'; this.actFlash = 9; }      // hungry, it comes to the front and watches you, hoping
      else if (S.t <= 0 && this.den?.home && !S.mode && !this.inspect && Math.hypot(this.pos.x - this.den.x, this.pos.z - this.den.z) > 1.4 && rng() < 0.12 + 0.15 * (this.shy ? 1 : 0)) this.goDen(S, rng);
      else if (S.t <= 0 && !S.mode && !this.inspect && !this.glassAt && !this.homing && (this.tuckK ?? 0) < 0.1 && this.sleepK < 0.2 && this.lead !== false && this.pickAct(S, rng, others, M)) { /* an impression, a game or a look round: pickAct set it up */ }
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && !this.den && this.fav && this.fav.n > 12 && Math.hypot(this.pos.x - this.fav.x, this.pos.z - this.fav.z) > 1.2 && rng() < 0.2) { S.s = 'crawl'; S.t = 8; const [gx, gz] = this.crawlGoal(this.fav.x, this.fav.z, rng, 0.8); this.target.set(gx, floor, gz); }     // no den yet: it goes back to its favourite spot
      // the sand itself is worth exploring: now and then it sets off for somewhere on the banks, a level the others are not on more likely, and more often in a tank with little else in it
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < ((this.getSpots?.() ?? []).length > 2 ? 0.17 : 0.26) * (0.6 + M.cur)) { const [rx, rz] = this.roamSpot(rng, others), [gx, gz] = this.crawlGoal(rx, rz, rng, 0.6); S.s = 'crawl'; S.t = 8; this.target.set(gx, floor, gz); if (levelAt(gx, gz) !== levelAt(this.pos.x, this.pos.z) && rng() < 0.55) { S.s = 'jet'; S.n = 2; S.t = 9; S.pulse = 0; this.target.y = Math.max(sandH(gx, gz), floor - 0.55) + 1.6; } }
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.22 * (0.4 + M.cur)) { const sp = this.getSpots?.() ?? [], fv = this.likes && rng() < 0.55 ? sp.find((x) => x.id === Object.entries(this.likes).sort((a, b) => b[1] - a[1])[0]?.[0]) : null, q = fv ?? (sp.length ? sp[(rng() * sp.length) | 0] : null); if (q) this.inspect = { x: q.x, z: q.z, id: q.id, type: q.type, r: GRIP[q.type] ?? 0.4 }; }                       // curious ones go and look at things on their own, and keep going back to a favourite
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.12 * M.soc) { const fs = others.filter((o) => o !== this && !o.dead && !o.visitor); if (fs.length) { const o = fs[(rng() * fs.length) | 0]; this.inspect = { x: o.pos.x, z: o.pos.z }; } }       // sociable ones go to see the other fish
      else if (near && M.soc < 0.4 && this.den && rng() < 0.5) this.goDen(S, rng, 10);     // a loner leaves when it gets crowded
      else if (S.t <= 0 && (this.bondMe >= 3 || (au >= 1 && this.bondMe >= 1)) && !this.shy && rng() < 0.12 + 0.35 * M.soc + (this.mind?.type === 'showoff' ? 0.25 * au : 0)) { S.mode = 'greet'; S.s = 'crawl'; S.t = 10; const [gx, gz] = this.crawlGoal((rng() - 0.5) * 3, 2.4, rng, 1.0); this.target.set(gx, floor, gz); }
      else if (S.t <= 0 && this.den && this.hoard > 0 && !this.shy && rng() < 0.05 + 0.3 * (this.mind?.tidy ?? 0.4)) { S.mode = 'carry1'; S.s = 'crawl'; S.t = 12; const b = this.band, [gx, gz] = this.crawlGoal(b.x[0] + rng() * (b.x[1] - b.x[0]), b.z[0] + rng() * (b.z[1] - b.z[0]), rng); this.target.set(gx, floor, gz); }     // fetch a shell for the collection
      else if (S.t <= 0 && this.den && rng() < (this.shy ? 0.55 : 0.28) + 0.4 * sk + (this.mind?.type === 'homebody' ? 0.15 : 0)) this.goDen(S, rng);           // home to the den
      else if (S.t <= 0 && this.shy && rng() < 0.6) { S.s = 'crawl'; S.t = 6; const spots = this.getSpots?.() ?? [], s2 = spots.length ? spots[(rng() * spots.length) | 0] : null; const [gx, gz] = this.crawlGoal(s2 ? s2.x : -3 + rng() * 6, s2 ? s2.z - 0.6 : 0.3, rng); this.target.set(gx, floor, gz); S.t = 5; }
      else if (S.t <= 0 && !this.shy && rng() < (0.07 + 0.1 * this.bold + 0.12 * bo) * (1 - 0.8 * sk)) { S.s = 'dash'; S.t = 4; const b = this.band, [gx, gz] = this.crawlGoal(this.pos.x + (rng() < 0.5 ? -1 : 1) * (2 + rng() * 2), b.z[0] + rng() * (b.z[1] - b.z[0]), rng); this.target.set(gx, floor, gz); }
      else if (S.t <= 0 && !this.shy && !this.glassAt && (this.glassCool ?? 0) <= 0 && rng() < 0.02 + 0.05 * this.bold + 0.05 * bo) { this.glassAt = { x: (rng() - 0.5) * 5, y: 2.2 + rng() * 5, until: performance.now() + 7000 + rng() * 6000 }; this.glassCool = 60 + rng() * 90; }      // the bold ones jet up to the glass on their own and hang there, arms pressed to it
      else if (S.t <= 0) { if (rng() < 0.42) { S.s = 'crawl'; S.t = 3 + rng() * 4; const spots = this.getSpots?.() ?? [], b = this.band, s = spots.length && rng() < 0.6 ? spots[(rng() * spots.length) | 0] : null; const roam = s ? null : this.roamSpot(rng, others), [gx, gz] = this.crawlGoal(s ? s.x + (rng() - 0.5) * 1.2 : roam[0], s ? s.z + 0.8 : roam[1], rng); this.target.set(gx, floor, gz); if (levelAt(gx, gz) !== levelAt(this.pos.x, this.pos.z) && rng() < (levelAt(gx, gz) === 'rear' || levelAt(this.pos.x, this.pos.z) === 'rear' ? 0.65 : 0.45)) { S.s = 'jet'; S.n = 2; S.t = 9; S.pulse = 0; S.mode = null; this.target.y = Math.max(sandH(gx, gz), floor - 0.55) + 1.6; } } else { S.s = 'jet'; S.n = 2 + ((rng() * 2) | 0); S.t = 9; S.pulse = 0; const [jx, jz] = this.roamSpot(rng, others); this.target.set(jx, sandH(jx, jz) + 2.4 + rng() * 5, jz); } }
    } else if (S.s === 'crawl') {
      if (this.fears?.length && !S.fearChecked) { S.fearChecked = true; const nowt = performance.now(); this.fears = this.fears.filter((q) => nowt - q.t < 3e5); this.fearNear = false; for (const q of this.fears) if (Math.hypot(this.target.x - q.x, this.target.z - q.z) < 1.8 && S.mode !== 'den' && !(S.mode ?? '').startsWith('t')) { this.fearNear = true; const ax = this.target.x - q.x || 1, b = this.band; this.target.x = Math.max(b.x[0], Math.min(b.x[1], q.x + Math.sign(ax) * 2.4)); } }
      this.restK += (0.25 - this.restK) * Math.min(1, dt * 2); this.crawlK += (1 - this.crawlK) * Math.min(1, dt * 2);
      if (!S.gaitSet) { S.gaitSet = true; const r = rng(); const far = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) > 2.2; this.gait = S.mode && S.mode[0] === 't' ? GAITS.stroll : r < 0.38 ? GAITS.stroll : r < 0.56 ? (far ? GAITS.stilt : GAITS.creep) : r < 0.78 ? GAITS.stilt : GAITS.bounce; }      // a stroll, a creep, up on stilts or a bouncing walk
      // to another level it goes the long way round, by the ramps: the stops are worked out once for each goal, and each is let go once it is reached
      if (!S.routeFor || Math.hypot(S.routeFor.x - this.target.x, S.routeFor.z - this.target.z) > 0.3) { S.routeFor = { x: this.target.x, z: this.target.z }; S.routeWeighed = false; S.route = slopeAt(this.pos.x, this.pos.z).s <= 1.15 && crossesFace(this.pos.x, this.pos.z, this.target.x, this.target.z) ? routeBetween(this.pos.x, this.pos.z, this.target.x, this.target.z) : []; }      // standing on a face already (it landed there, or was nudged), it just steps off it
      while (S.route?.length && Math.hypot(S.route[0].x - this.pos.x, S.route[0].z - this.pos.z) < 0.45) S.route.shift();
      // a long way round by the ramps for somewhere it could swim to: more often than not it swims (not with something in its arms, and not when it is hunting or busy at a task)
      if (S.route?.length && !S.routeWeighed) { S.routeWeighed = true; let L = 0, px = this.pos.x, pz = this.pos.z; for (const q of [...S.route, this.target]) { L += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; }
        if (!this.noSwimTrips && L > 4 && L > 1.8 * Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) && S.mode !== 'hunt' && !(S.mode ?? '').startsWith('t') && S.mode !== 'carry2' && rng() < 0.7) { const gx = this.target.x, gz = this.target.z; S.route = []; S.s = 'jet'; S.n = 2; S.t = 9; S.pulse = 0; S.after = S.mode ? { x: gx, z: gz, mode: S.mode, n: 1 } : null; S.mode = null; this.target.set(gx, Math.max(sandH(gx, gz), sandH(this.pos.x, this.pos.z)) + 1.7, gz); } }
      if (S.route?.length) S.t = Math.max(S.t, 3);      // the long way takes longer: it is not given up on halfway
      if (S.detour) S.detour.left -= dt; const det = S.detour && S.detour.left > 0 ? S.detour : null, goal = det ? _g.set(det.x, floor, det.z) : S.route?.length ? _g.set(S.route[0].x, floor, S.route[0].z) : this.target;      // a detour is a sidestep around something in the way
      const to = goal.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = to.length() || 1, sp = 0.5 * this.speed * mul * (S.mode === 'hunt' ? (this.hunt?.run?.burst > 0 ? 2.1 : 1.5) : (this.gait?.sp ?? 1) * (0.8 + 0.2 * (this.temper()?.tempo ?? 1))); to.multiplyScalar(sp / d);
      // going in through the mouth of its den the walls are allowed to brush it; anywhere else it feels for what is ahead and slides along it rather than pushing into it
      this.homing = (S.mode === 'den' || S.mode === 'tsettle') && !!this.den?.home && d < 1.5;
      const W = Fish3D.world; let side = 0, sliding = false;
      if (W.push && !this.homing && d > this.cr + 0.7) {
        // whiskers: it feels ahead and round to both sides, and takes the cheapest way on: open sand first, then through soft plants, never into rock or shell or off the open floor.
        // The side it picks it keeps to, so it does not dither in front of something; straight on is free again, it lets the choice go
        let feelS = 0; const ux = to.x / (sp || 1), uz = to.z / (sp || 1), reach = Math.min(this.cr + 0.55, d - 0.1), soft = W.soft, onFace = slopeAt(this.pos.x, this.pos.z).s > 1.15;      // a sand face is a wall to walk round, unless it is already on one      // it feels no further than where it is going
        const feel = (a) => { const c = Math.cos(a), sn = Math.sin(a), wx = ux * c - uz * sn, wz = ux * sn + uz * c; _p1.set(this.pos.x + wx * reach, this.pos.y + 0.15, this.pos.z + wz * reach); _p1.y = Math.max(_p1.y, sandH(_p1.x, _p1.z) + 0.7); feelS = slopeAt(_p1.x, _p1.z).s;
          if ((_p1.z < OCT_BACK - 0.1 && _p1.z < this.pos.z - 0.05) || (!onFace && slopeAt(_p1.x, _p1.z).s > 1.15) || (_p1.z > GLASS_Z - 0.4 && _p1.z > this.pos.z + 0.05) || (Math.abs(_p1.x) > 4.6 && Math.abs(_p1.x) > Math.abs(this.pos.x) + 0.05)) return 1;      // the edges of the open sand are walls too
          _o.set(0, 0, 0); if (W.push(_p1, this.cr * 0.9, _o)) return 1; _o.set(0, 0, 0); return soft && soft.push(_p1, this.cr * 0.55, _o) ? 0.9 : 0; };
        const ahead = feel(0);
        if (ahead > 0) {
          let best = 0, bestCost = 1e9; const bias = S.sideBias ?? 0, dbg = window.__dbgWh ? [] : null;
          for (const a of [0, 0.75, -0.75, 1.45, -1.45, 2.4, -2.4]) { const cost = (a === 0 ? (feel(0), ahead) : feel(a)) + 0.3 * Math.min(1.2, feelS) + 0.1 * Math.abs(a) + (bias && Math.sign(a) === -bias ? 0.35 : 0); if (dbg) dbg.push(+cost.toFixed(2)); if (cost < bestCost) { bestCost = cost; best = a; } }
          if (best !== 0) { S.sideBias = Math.sign(best); const c = Math.cos(best), sn = Math.sin(best), pull = Math.abs(best) > 2 ? 0 : 0.5; let wx = ux * c - uz * sn + ux * pull, wz = ux * sn + uz * c + uz * pull; const wm = Math.hypot(wx, wz) || 1; wx /= wm; wz /= wm; to.x = wx * sp * 0.85; to.z = wz * sp * 0.85; sliding = true; side = S.sideBias; }
          if (bestCost >= 1) { to.x = 0; to.z = 0; sliding = true; S.backT = (S.backT ?? 0) + dt * 2; }      // nothing passable anywhere: it stops pushing
          if (Math.abs(best) > 2) S.backT = (S.backT ?? 0) + dt; else if (bestCost < 1) S.backT = Math.max(0, (S.backT ?? 0) - dt * 0.5);
          if (S.backT > 1.2 && (!S.mode || S.mode === 'inspect' || S.mode === 'greet' || S.mode === 'carry1')) this.hop(S, rng);      // boxed in on foot: over the top instead
          if (dbg) S.wh = [best, ...dbg];
        } else { S.sideBias = 0; S.wh = null; } }
      this.vel.lerp(to, Math.min(1, dt * (S.mode === 'hunt' ? 2.6 : 1.6)));      // after a running crab it goes flat out
      if (this.pos.z < OCT_BACK && this.vel.z < 0) this.vel.z = 0; if (this.pos.z > GLASS_Z - 0.45 && this.vel.z > 0) this.vel.z = 0;      // the crawl stays on the open sand, never off the back of the bank or into the glass
      // the watchdog: if it has barely moved for a couple of seconds, it is being held up by something. Sidestep once or twice; if that fails, give it up rather than push forever
      const stop = S.route?.length ? S.route[0] : this.target, dist = Math.hypot(stop.x - this.pos.x, stop.z - this.pos.z); if (S.prog && S.mode !== 'hunt' && Math.hypot(S.prog.tx - this.target.x, S.prog.tz - this.target.z) > 0.4) S.prog = null;      // a new goal is a fresh start (a running crab is not a new goal)
      // reaching a stop on the way is progress: it is measured from the next stop
      const pr = (S.prog ||= { d: dist, t: 0, n: 0, v: 0, tx: this.target.x, tz: this.target.z, x: this.pos.x, z: this.pos.z }); if (pr.stop !== stop) { pr.stop = stop; pr.d = dist; } pr.t += dt; pr.v += Math.hypot(this.vel.x, this.vel.z) * dt; if (sliding) pr.slid = true;
      if (pr.t > 2.5) {
        // what counts as progress: nearer its goal; after a crab, nearer the crab, and nothing is held against it while the crab is running
        const hd = S.mode === 'hunt' && this.hunt ? Math.hypot(this.hunt.x - this.pos.x, this.hunt.z - this.pos.z) : null;
        let gained = hd != null ? (this.hunt.run?.burst > 0 ? 1e9 : (pr.hd ?? hd) - hd) : pr.d - dist; const tried = pr.v;
        if ((sliding || pr.slid) && (pr.slidN = (pr.slidN ?? 0) + 1) <= 2) gained = Math.max(gained, Math.hypot(this.pos.x - pr.x, this.pos.z - pr.z)); else if (!(sliding || pr.slid)) pr.slidN = 0;      // working its way round something: getting about counts for a few seconds, then it has to be getting somewhere
        pr.hd = hd; pr.d = dist; pr.t = 0; pr.v = 0; pr.x = this.pos.x; pr.z = this.pos.z; pr.slid = false;
        if (gained > 0.3 * Math.max(tried, 0.05)) pr.n = 0; else if (!this.homing && d > 0.5) { pr.n++;      // barely moving while trying to crawl counts as held up too
          if (pr.n >= 3 && (!S.mode || S.mode === 'inspect' || S.mode === 'greet' || S.mode === 'carry1')) this.hop(S, rng);
          else if (pr.n >= 3) { pr.n = 0; S.detour = null; (this.failed ||= []).push({ x: this.target.x, z: this.target.z }); if (this.failed.length > 6) this.failed.shift(); if (S.mode === 'hunt') this.hunt = null; if (S.mode === 'tgo' || S.mode === 'thaul') this.onTask?.(this, 'abort'); if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 3 + rng() * 4; this.flush = Math.max(this.flush, 0.3); }
          else if (!sliding) { const L = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) || 1, px = -(this.target.z - this.pos.z) / L, pz = (this.target.x - this.pos.x) / L, sd = side || (rng() < 0.5 ? -1 : 1); const q = [sd, -sd].map((k) => ({ x: Math.max(-3.5, Math.min(3.5, this.pos.x + px * k * 1.5)), z: Math.max(OCT_BACK, Math.min(OCT_FRONT - 0.1, this.pos.z + pz * k * 1.5)) })).find((c) => !crossesFace(this.pos.x, this.pos.z, c.x, c.z) && [0.25, 0.5, 0.75, 1].every((u) => walkable(this.pos.x + (c.x - this.pos.x) * u, this.pos.z + (c.z - this.pos.z) * u))); if (q) S.detour = { ...q, left: 2.2 }; } } }      // a step to the side, on open sand on the same level: never off the side of a ramp or down a face
      if (S.mode === 'hunt' && this.hunt) { const h = this.hunt, bx = Math.max(-3.6, Math.min(3.6, h.x - 0.4)), bz = Math.max(OCT_BACK, h.z - 1.0), behind = !crossesFace(h.x, h.z, bx, bz) && walkable(bx, bz); this.target.set(behind ? bx : Math.max(-3.6, Math.min(3.6, h.x + (h.x > this.pos.x ? -1.0 : 1.0))), floor, behind ? bz : h.z); if (h.run?.burst > 0) S.t = Math.max(S.t, 5); }      // the crab is moving: keep aiming behind it, and do not give up while it runs
      if (S.t <= 0 && S.after && d > 0.6) { (this.failed ||= []).push({ x: S.after.x, z: S.after.z }); if (this.failed.length > 6) this.failed.shift(); S.after = null; }      // over the top and still not there in time: that spot is given up, and remembered
      if (S.t <= 0 || d < 0.35 || (S.mode === 'hunt' && d < 1.5) || (S.mode === 'inspect' && this.inspect?.r && d < 0.65) || ((S.mode === 'den' || S.mode === 'tsettle') && this.den?.home && d < 0.9)) { S.fearChecked = false;
        if (S.mode === 'den') { S.mode = null; S.s = 'rest'; S.t = this.freshHome ? 30 + rng() * 20 : 10 + rng() * 12; this.freshHome = false; }
        else if (S.mode === 'denfront') { S.mode = 'den'; S.s = 'crawl'; S.t = 8; const [hx, hz] = this.denGoal(rng); this.target.set(hx, 0.55, hz); }      // at the mouth: now in
        else if (S.mode === 'tgo') { if (this.onTask?.(this, 'grab')) { const T = this.task; S.mode = 'thaul'; S.t = 25 + 16 * Math.hypot(T.gx - T.ax, T.gz - T.az); this.target.set(T.gx - T.ux * T.hold, floor, T.gz - T.uz * T.hold); } else { S.mode = null; S.s = 'rest'; S.t = 6; } }
        else if (S.mode === 'thaul') { const T = this.task, kind = T?.kind; if (this.onTask?.(this, 'drop') && kind === 'home') { S.mode = 'tsettle'; S.t = 14; this.target.set(T.gx, floor, T.gz + (T.type === 'pot' ? 0.5 : -0.2)); } else { S.mode = null; S.s = 'rest'; S.t = 10 + rng() * 8; this.flush = 0.5; } }
        // its shell set down where it wanted it: it moves in and stays a good while (if it is not under it yet, it goes round to the opening and in)
        else if (S.mode === 'tsettle') { this.onTask?.(this, 'home'); S.mode = null; S.s = 'rest'; S.t = 30 + rng() * 20; this.freshHome = true; this.inspect = null; this.act = null; if (this.den?.home) { const [hx, hz] = this.denGoal(rng); if (Math.hypot(this.pos.x - hx, this.pos.z - hz) > 0.6) this.goDen(S, rng, 14); } }
        else if (S.mode === 'carry1') { S.mode = 'carry2'; if (this.carryMesh) this.carryMesh.visible = true; S.t = 14; this.target.set(this.den.x + (rng() - 0.5) * 0.7, floor, this.den.z + 0.95); }
        else if (S.mode === 'carry2') { S.mode = null; if (this.carryMesh) this.carryMesh.visible = false; this.onDrop?.(this.pos); S.s = 'rest'; S.t = 6 + rng() * 8; }
        else if (S.mode && d < (S.mode === 'hunt' ? 1.6 : S.mode === 'inspect' && this.inspect?.r ? 0.8 : 1.3)) { S.s = 'work'; S.t = S.mode === 'greet' ? 6 : S.mode === 'inspect' ? 7 : S.mode === 'hunt' ? 1e9 : 1e9; if (S.mode === 'inspect') { this.inspectBlend = rng() < 0.45; const id = this.inspect?.id; if (id) { (this.likes ||= {})[id] = (this.likes[id] ?? 0) + 1; this.favDirty = true; } } }
        else { if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 4 + rng() * 8; }
      }
    } else if (S.s === 'dash') {                                                // a sudden dash across the floor, rising on the two back arms with the rest streaming behind
      this.restK += (0 - this.restK) * Math.min(1, dt * 3); this.crawlK += (1 - this.crawlK) * Math.min(1, dt * 3);
      const to = this.target.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = to.length() || 1; to.multiplyScalar((1.05 * this.speed * (0.8 + 0.4 * this.bold)) / d); this.vel.lerp(to, Math.min(1, dt * 2.2));
      if (S.t <= 0 || d < 0.4) { S.s = 'rest'; S.t = 3 + rng() * 4; }
    } else if (S.s === 'jet') {
      this.restK += (0 - this.restK) * Math.min(1, dt * 4); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 4);
      S.pulse -= dt;
      // he turns to face where he is going, then pushes along the way he is facing (he steers with his funnel, not by sliding sideways)
      if (this.follow) { const o = this.follow; if (o.dead || S.t <= 0 || o.pos.distanceTo(this.pos) > 8) { this.follow = null; S.n = 0; this.actText = null; this.act = null; } else { const vl = Math.hypot(o.vel.x, o.vel.z), fx = vl > 0.05 ? o.vel.x / vl : Math.cos(o.heading), fz = vl > 0.05 ? o.vel.z / vl : -Math.sin(o.heading); this.target.set(o.pos.x - fx * 1.3, Math.max(1.2, Math.min(Fish3D.topY - 1.5, o.pos.y - 0.2)), Math.max(OCT_BACK, Math.min(OCT_FRONT, o.pos.z - fz * 1.3))); if (S.pulse <= 0 && S.n <= 0 && this.target.distanceTo(this.pos) > 1.2) S.n = 1; } }      // tagging along behind a fish: a body length back, another pulse whenever it falls behind
      if (S.tour) { if (this.pos.distanceTo(this.target) < 1.0 || (S.n <= 0 && S.pulse <= -0.3)) { const nx = S.tour.shift(); if (nx) { this.target.set(nx[0], nx[1], nx[2]); S.n = 2; S.pulse = 0; } else { S.tour = null; this.act = null; this.actText = null; } } }
      { const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z; this.aimErr = 0; if (Math.hypot(tx, tz) > 0.12) { let dh = Math.atan2(-tz, tx) - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += Math.max(-dt * 3.4, Math.min(dt * 3.4, dh)); this.aimErr = Math.abs(dh); } }
      if (S.pulse <= 0 && S.n > 0 && this.aimErr < 0.55 && (S.wind = (S.wind ?? 0) + dt) > 0.24) {
        S.wind = 0;
        S.n--; S.pulse = (1.5 + rng() * 0.7) * (1.15 - 0.3 * this.bold); const vy = Math.max(-0.3, Math.min(0.8, (this.target.y - this.pos.y) * 0.35 + 0.25)), dir = _p2.set(Math.cos(this.heading), vy, -Math.sin(this.heading)).normalize();
        this.vel.addScaledVector(dir, 2.6 * this.speed * Math.max(0.5, mul) * (0.9 + 0.25 * this.bold)); this.sq = 1; this.onPush?.(this.pos, dir);
      }
      this.vel.multiplyScalar(Math.exp(-1.25 * dt)); if (!this.seeking) this.vel.y -= 0.12 * dt;
      if (this.seeking) { const to = this.target.clone().sub(this.pos); if (to.length() > 0.2) this.vel.addScaledVector(to.normalize(), 0.8 * dt * this.speed); }
      if (this.follow) { const to = this.target.clone().sub(this.pos); if (to.length() > 0.5) this.vel.addScaledVector(to.normalize(), 1.1 * dt * this.speed); }      // and steers after the fish between pulses
      if (S.n <= 0 && S.pulse <= -0.6 && !this.seeking && !this.follow && !S.tour) { S.s = 'drift'; S.t = 6; }
    } else if (S.s === 'flat') {                                             // a flatfish: pressed flat to the sand, gliding along with the edges of its arms rippling
      this.restK += (1 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      const to = this.target.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = Math.hypot(to.x, to.z) || 1; to.x *= 0.16 * this.speed / d; to.z *= 0.16 * this.speed / d; this.vel.lerp(to, Math.min(1, dt * 1.2));
      if (d < 0.4 && S.t > 2) { const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), floor, this.levelZ(this.pos.z + (rng() - 0.5) * 1.5)); }
      if (S.t <= 0) this.endAct(S, rng);
    } else if (S.s === 'bury') {                                             // it digs into the sand with a few shoves and sits with just the top of its head and its eyes showing, then pops out again
      this.restK += (1 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2); this.vel.multiplyScalar(Math.exp(-4 * dt));
      S.pulse -= dt; const digging = S.n === 0, out = S.t <= 1.6;
      if (digging && S.pulse <= 0) { S.pulse = 0.45; this.sq = Math.max(this.sq, 0.5); this.onSand?.(this.pos, 0.6); if ((S.digs = (S.digs ?? 0) + 1) >= 5) S.n = 1; }
      const wantSink = out ? 0 : digging ? Math.min(0.75, (S.digs ?? 0) * 0.16) : 0.75; this.sink += (wantSink - this.sink) * Math.min(1, dt * (out ? 3 : 1.4));
      if (out && !S.popped) { S.popped = true; this.onSand?.(this.pos, 1); this.sq = Math.max(this.sq, 0.6); this.flush = Math.max(this.flush, 0.3); }
      if (S.t <= 0) this.endAct(S, rng);
    } else if (S.s === 'lion' || S.s === 'jelly') {                        // up in the open water: a lionfish holds still with its spines out; a jellyfish pulses gently upward, arms trailing
      this.restK += ((S.s === 'lion' ? 0.3 : 0.2) - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 3);
      S.pulse -= dt; const wantY = S.s === 'lion' ? 3.2 + 0.4 * Math.sin(this.tt * 0.7) : Math.min(Fish3D.topY - 2, 3.5 + 2.5 * Math.min(1, ((S.t0 ?? 10) - S.t) / 6));
      if (S.s === 'jelly' && S.pulse <= 0) { S.pulse = 1.7; this.vel.y += 0.45; this.sq = Math.max(this.sq, 0.5); this.onPush?.(this.pos, _p2.set(0, -1, 0)); }
      this.vel.y += (wantY - this.pos.y) * 0.5 * dt; this.vel.x += (this.target.x - this.pos.x) * 0.12 * dt; this.vel.z += (this.target.z - this.pos.z) * 0.12 * dt; this.vel.multiplyScalar(Math.exp(-(S.s === 'lion' ? 1.6 : 0.9) * dt));
      if (S.t <= 0) this.endAct(S, rng, 'drift');
    } else if (S.s === 'snake') {                                            // a sea snake: two arms out straight, it slides sideways along the sand and back
      this.restK += (1 - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      const side = Math.sin(this.tt * 0.5) > 0 ? 1 : -1, lx = Math.sin(this.heading) * side, lz = Math.cos(this.heading) * side;
      _p2.set(lx * 0.14, (floor - this.pos.y) * 2, lz * 0.14); this.vel.lerp(_p2, Math.min(1, dt * 1.5)); if ((this.pos.x > 3.6 && this.vel.x > 0) || (this.pos.x < -3.6 && this.vel.x < 0)) this.vel.x = 0; if ((this.pos.z > GLASS_Z - 0.5 && this.vel.z > 0) || (this.pos.z < OCT_BACK + 0.1 && this.vel.z < 0)) this.vel.z = 0;
      if (S.t <= 0) this.endAct(S, rng);
    } else if (S.s === 'kelp' || S.s === 'watch') {                        // sitting still: as a plant beside a real one, arms up and swaying; or sat up, following a fish with its eyes and head
      this.restK += ((S.s === 'kelp' ? 1 : 0.7) - this.restK) * Math.min(1, dt * 2); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2); this.vel.multiplyScalar(Math.exp(-4 * dt)); if (!onFloor) this.vel.y -= 0.5 * dt;
      if (S.s === 'watch') { const o = this.watchFish; if (!o || o.dead) S.t = 0; else { let dy = Math.atan2(-(o.pos.z - this.pos.z), o.pos.x - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += Math.max(-dt * 0.9, Math.min(dt * 0.9, dy)); } }
      if (S.t <= 0) this.endAct(S, rng);
    } else {                                                                  // drift: arms trail and it sinks back toward the bottom
      this.restK += (0.2 - this.restK) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-1.0 * dt)); this.vel.y -= 0.35 * dt;
      if (S.after) { const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, L = Math.hypot(dx, dz); if (L > 0.3) { this.vel.x += (dx / L) * 0.7 * dt; this.vel.z += (dz / L) * 0.7 * dt; } }
      if (this.pos.y < floor + 0.4 || S.t <= 0) { S.s = 'rest'; S.t = (4 + rng() * 8) * (1.3 - 0.6 * this.bold); if (this.vel.y < -0.05) this.landK = 1;
        if (S.after && !this.hunt && !this.task && Math.hypot(S.after.x - this.pos.x, S.after.z - this.pos.z) > 0.6) { S.s = 'crawl'; S.t = 14; S.mode = S.after.mode; this.target.set(S.after.x, floor, S.after.z); } else S.after = null; }      // down again: on with it, from this side
    }
    // a fish that hangs about within reach while it sits (resting, watching, lying flat or standing as a plant) gets something thrown at it
    this.throwCool = Math.max(0, this.throwCool - dt);
    if (S.s === 'rest' || S.s === 'watch' || S.s === 'kelp' || S.s === 'flat') { let near = null; for (const o of others) if (o !== this && !o.dead && !o.visitor && o.species.move !== 'jet' && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 2.2 && Math.abs(o.pos.y - this.pos.y) < 3.2) { near = o; break; } this.nearFor = near ? this.nearFor + dt : 0;
      if (near && this.nearFor > (near.fid === this.rival ? 0.5 : 1.5) && this.throwCool <= (near.fid === this.rival ? 60 : 0) && this.lead !== false && this.bold > 0.35 && this.sleepK < 0.2 && rng() < dt * 1.6) { this.throwCool = 90 + rng() * 120; this.nearFor = 0; this.throwAt(near, rng); } } else this.nearFor = 0;
    this.sq = Math.max(0, this.sq - dt * 2.4); this.separate(others, 3);
    { const px = this.px ?? this.pos.x, pz = this.pz ?? this.pos.z; this.pos.addScaledVector(this.vel, dt); this.resolve(others); { const fl2 = 0.55 + this.sandBelow(); if (this.pos.y < fl2) { this.pos.y = fl2; if (this.vel.y < 0) this.vel.y = 0; } }
      this.realSp = (this.realSp ?? 0) + (Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-3) - (this.realSp ?? 0)) * Math.min(1, dt * 6); this.px = this.pos.x; this.pz = this.pos.z; }      // how fast it is really getting along the floor
    const sp = this.face(dt, S.s === 'jet' ? 3 : 1.6);
    if (this.glassNear > 0.05) { let dh = -this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 3) * Math.max(0.3, this.glassNear); this.pitch *= Math.exp(-dt * 3); }
    const wantPitch = S.s === 'jet' ? Math.max(-0.9, Math.min(0.9, Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z) || 1))) : S.s === 'dash' ? 0.42 : S.s === 'jelly' ? -1.3 : 0; this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3); this.roll += (-Math.PI / 2 * this.glassNear - this.roll) * Math.min(1, dt * 3);
    this.phase += dt * (S.s === 'dash' ? 6.5 : S.s === 'crawl' ? 1.4 + 3.6 * Math.min(1, (this.realSp ?? 0) / 0.3) : S.s === 'jet' ? 2.5 : S.s === 'rest' ? 1.4 : S.s === 'work' ? 3.2 : 2.0);      // crawling, the arms walk as fast as the body actually moves: held up, they slow to a feel
    this.flush = Math.max(0, this.flush - dt * 0.35);
    { const spd = this.vel.length(); this.glideK += ((S.s === 'jet' ? Math.max(0, Math.min(1, (spd - 0.5) / 1.5)) : 0) - this.glideK) * Math.min(1, dt * 3); this.cruiseK += ((((S.s === 'jet' || S.s === 'drift') && spd < 1.2 && this.pos.y > floor + 0.5) ? 1 - spd / 1.2 : 0) - this.cruiseK) * Math.min(1, dt * 2);
      this.landK = Math.max(0, this.landK - dt * 1.2); this.dashK += ((S.s === 'dash' ? 1 : 0) - this.dashK) * Math.min(1, dt * 3.5);
      { const a = S.s; this.flatK += ((a === 'flat' || a === 'bury' ? 1 : 0) - this.flatK) * Math.min(1, dt * 1.5); this.lionK += ((a === 'lion' ? 1 : 0) - this.lionK) * Math.min(1, dt * 1.5); this.snakeK += ((a === 'snake' ? 1 : 0) - this.snakeK) * Math.min(1, dt * 1.5); this.jellyK += ((a === 'jelly' ? 1 : 0) - this.jellyK) * Math.min(1, dt * 1.2); this.kelpK += ((a === 'kelp' ? 1 : 0) - this.kelpK) * Math.min(1, dt * 1.2); this.puffK += ((a === 'jelly' || a === 'lion' ? 1 : 0) - this.puffK) * Math.min(1, dt * 1.5); if (a === 'snake') this.sink += (1 - this.sink) * Math.min(1, dt * 1.2); else if (a !== 'bury') this.sink += (0 - this.sink) * Math.min(1, dt * 3); }
      this.mimicK = (this.mimicK ?? 0) + ((this.follow && (S.s === 'jet' || S.s === 'drift') ? 1 : 0) - (this.mimicK ?? 0)) * Math.min(1, dt * 1.2);      // tagging along behind a fish, it takes on that fish's colours
      { const sk = Math.min(1, this.sink * 3), cands = [['sole', this.flatK * (1 - sk)], ['lion', this.lionK], ['snake', this.snakeK], ['jelly', this.jellyK], ['kelp', this.kelpK], ['fish', this.mimicK]]; let best = null, bk = 0.05;
        for (const [k, w] of cands) if (w > bk) { bk = w; best = k; }
        if (best) {
          let src = null; if (best === 'fish') { src = this.follow; if (!src) { let bd = 4; for (const o of others) if (o !== this && !o.dead && !o.visitor && o.species.move !== 'jet') { const d = o.pos.distanceTo(this.pos); if (d < bd) { bd = d; src = o; } } } }
          else if (best === 'kelp') { let bd = 2.5; for (const q of this.getSpots?.() ?? []) if (PLANTS.has(q.type)) { const d = Math.hypot(q.x - this.pos.x, q.z - this.pos.z); if (d < bd) { bd = d; src = q.type; } } }
          const key = best + ':' + (src?.fid ?? src ?? '');
          if (key !== this.costumeKey && ((this.costumeK ?? 0) < 0.12 || !this.costumeTex) && (best !== 'fish' || src)) { this.costumeKey = key; this.costume = best; this.costumeTex = this.buildCostume(best, src); this.costumeBump = COSTUME_BUMP[best] ?? 0; }
        }
        const on = best && this.costumeKey?.startsWith(best + ':') ? Math.min(1, bk) : 0; this.costumeK = (this.costumeK ?? 0) + (on - (this.costumeK ?? 0)) * Math.min(1, dt * 1.4); }
      { const S2 = this.st, rivalNear = this.rival && others.some((o) => o.fid === this.rival && !o.dead && o.pos.distanceTo(this.pos) < 2.6), sq = Math.max(this.mw.annoyed, this.mw.hunting * 0.8, rivalNear ? 0.7 : 0, (this.sulk ?? 0) > 0.5 ? 0.45 : 0), wd = Math.max(this.mw.scared, this.flush > 0.45 ? 0.6 : 0, this.gazeT > 0 ? 0.35 : 0, S2.s === 'ponder' ? 0.3 : 0);
        this.squintK = (this.squintK ?? 0) + (sq - (this.squintK ?? 0)) * Math.min(1, dt * 4); this.wideK = (this.wideK ?? 0) + (wd - (this.wideK ?? 0)) * Math.min(1, dt * 5);      // narrowed at a rival or in a temper, wide when startled, thrilled or curious
        this.inhaleK = Math.max(0, (this.inhaleK ?? 0) + ((S2.s === 'jet' && S2.pulse <= 0 && S2.n > 0 && (S2.wind ?? 0) > 0 ? 1 : 0) - (this.inhaleK ?? 0)) * Math.min(1, dt * 6));
        this.gazeT = Math.max(0, (this.gazeT ?? 0) - dt); this.gazeCool = (this.gazeCool ?? 8) - dt;
        if (S2.s === 'rest' && !S2.mode && this.gazeCool <= 0 && this.sleepK < 0.2 && this.lead !== false && rng() < dt * (0.12 + 0.25 * (this.audience ?? 0))) { this.gazeT = 1.6 + rng() * 2.2; this.gazeCool = 14 + rng() * 22; if (!this.act) { this.actText = 'Looking right at you.'; this.actFlash = this.gazeT; } }      // now and then, especially when someone it knows is there, it turns its eyes on you
      }
      if (this.actFlash > 0) { this.actFlash -= dt; if (this.actFlash <= 0 && !this.act) this.actText = null; }
      this.climbK = (this.climbK ?? 0) + ((S.s === 'work' && S.mode === 'inspect' && PLANTS.has(this.inspect?.type) ? 1 : 0) - (this.climbK ?? 0)) * Math.min(1, dt * 0.8);      // holding a plant's stem, it pulls itself up it a little
      this.lift = 0.32 * this.dashK + (this.gait?.lift ?? 0) * this.crawlK - 0.5 * this.sink + 0.45 * this.climbK + 0.07 * ((this.bold - 0.5) * (this.shy ? 0 : 1) - (this.shy ? 0.35 : 0)) * this.restK * (1 - this.flatK) * (1 - Math.min(1, this.sink * 2));
      // the mantle is rigged too: it tips back when it jets, slumps a little at rest, rises on a dash, bobs with each step, and the head turns a touch toward what it is looking at
      const tall = (this.bold - 0.5) * (this.shy ? 0 : 1) - (this.shy ? 0.35 : 0), leanT = 0.16 * this.glideK - 0.05 * this.restK - 0.14 * tall * this.restK * (1 - this.flatK) + 0.1 * this.dashK + 0.04 * Math.sin(this.tt * 0.7) + 0.95 * this.flatK * (1 - Math.min(1, this.sink * 2)) + 0.5 * this.snakeK; this.lean = (this.lean ?? 0) + (leanT - (this.lean ?? 0)) * Math.min(1, dt * 3);
      this.yaw = (this.yaw ?? 0) + (this.lookX * 0.2 - (this.yaw ?? 0)) * Math.min(1, dt * 4); this.bob = Math.sin(this.phase * 0.15 * Math.PI * 4) * 0.45 * this.crawlK * (this.gait?.bob ?? 1); }
    // where he is looking: the crab, the jar, your finger, or a fish nearby; his pupils slide toward it (and drift back to centre when nothing interests him)
    this.lookT -= dt; if (this.lookT <= 0) {
      this.lookT = 0.15; const ch = Math.cos(this.heading), sh = Math.sin(this.heading); let tx = null, tz = 0;
      const L = S.s === 'ponder' && this.intent ? this.intent : this.gazeT > 0 ? { x: 0, y: 4.6, z: 30 } : this.watchFish && !this.watchFish.dead ? this.watchFish.pos : this.follow && !this.follow.dead ? this.follow.pos : this.hunt ? { x: this.hunt.x, y: 0.2, z: this.hunt.z } : this.jarAt ? { x: this.jarAt.x, y: 0.8, z: this.jarAt.z } : this.glassAt && performance.now() < this.glassAt.until ? { x: this.glassAt.x, y: this.glassAt.y, z: 3 } : null;
      let T = L; if (!T) { let bd = 3 + 3.5 * (this.mind?.soc ?? 0.5); for (const o of others) if (o !== this && !o.dead && !o.visitor) { const d = o.pos.distanceTo(this.pos); if (d < bd) { bd = d; T = o.pos; } } }
      if (T) { const dx = T.x - this.pos.x, dz = T.z - this.pos.z, dy = (T.y ?? this.pos.y) - this.pos.y, dd = Math.hypot(dx, dy, dz) || 1; tx = (dx * ch - dz * sh) / dd; tz = dy / dd; }
      this.lookGoal = tx == null ? [0, 0] : [Math.max(-1, Math.min(1, tx)) * 1.3, Math.max(-1, Math.min(1, tz)) * 0.6];
    }
    if (this.lookGoal) { this.lookX += (this.lookGoal[0] - this.lookX) * Math.min(1, dt * 5); this.lookY += (this.lookGoal[1] - this.lookY) * Math.min(1, dt * 5); }
    // sleep: at night, after resting a while, he closes his eyes to slits, goes slow and pale, and his skin flickers with dreams; any fright or poke wakes him
    this.wakeT = Math.max(0, this.wakeT - dt); const sleeping = this.isNight && S.s === 'rest' && this.restFor > 20 && this.wakeT <= 0 && !this.pale;
    this.sleepK += ((sleeping ? 1 : 0) - this.sleepK) * Math.min(1, dt * (sleeping ? 0.5 : 2.5)); if (sleeping && S.t <= 0.5) S.t = 6;
    this.blinkNext -= dt; if (this.blinkNext <= 0 && S.s !== 'jet') { this.blinkK = 1; this.blinkNext = 4 + rng() * 7; } this.blinkK = Math.max(0, this.blinkK - dt * 5);
    // each arm has a mind of its own: now and then one probes the floor beside it, or reaches out toward a fish swimming past, while the rest of him sits still
    { const calm = (S.s === 'rest' || (S.s === 'work' && S.mode === 'inspect')) && this.restK > 0.5 && !this.pale, sc = this.scale || 0.06, ch = Math.cos(this.heading), sh = Math.sin(this.heading);
      this.minds.forEach((m, i) => {
        m.next -= dt; if (m.until > 0 && (calm || m.fast)) { m.until -= dt; m.k += (1 - m.k) * Math.min(1, dt * (m.fast ? 14 : 3)); } else { m.until = 0; m.fast = false; m.k += (0 - m.k) * Math.min(1, dt * 2.2); } if (!calm || m.until > 0 || m.next > 0) return;
        const a = this.rig.arms[i], r = rng(); let tgt = null;
        if (r > 0.72) for (const o of others) { if (o === this || o.dead) continue; const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, dy = o.pos.y - this.pos.y; if (Math.hypot(dx, dz) < 2.4 && Math.abs(dy) < 2.6) { tgt = [(dx * ch - dz * sh) / sc, dy / sc, (dx * sh + dz * ch) / sc]; break; } }
        if (!tgt && r > 0.18) { const ang = a.th + (rng() - 0.5) * 0.7, dd = 11 + rng() * 14; tgt = [3 + Math.cos(ang) * dd, -8.4, Math.sin(ang) * dd]; }
        if (tgt) { m.x = tgt[0]; m.y = tgt[1]; m.z = tgt[2]; m.until = 1.6 + rng() * 2.4; m.next = m.until + 2 + rng() * 5; } else m.next = 2 + rng() * 4;
      }); }
    // mood: pale and startled, dark and annoyed, rippling with dark clouds while hunting, a dark bar across the eye for someone it knows
    if (!(S.s === 'work' && S.mode === 'hunt')) this.chewK = 0;
    this.scareT = Math.max(0, this.scareT - dt); this.annoyT = Math.max(0, this.annoyT - dt); this.pokeT -= dt; if (this.pokeT <= 0) this.pokes = 0;
    { const mt = { scared: this.scareT > 0 ? 1 : 0, annoyed: this.annoyT > 0 ? 1 : 0, hunting: this.hunt || (S.s === 'jet' && this.seeking) ? 1 : 0, fond: (S.s === 'work' && S.mode === 'greet') || S.s === 'glass' || this.fondFocus ? 1 : 0 };
      for (const k in mt) this.mw[k] += (mt[k] - this.mw[k]) * Math.min(1, dt * (k === 'scared' ? 6 : 1.6)); }
    // camouflage has a reason: it blends in with what it is touching or sitting on. When it settles down against an object (a rock, a plant, a pillar, hiding in it) or on the sand,
    // it decides whether to bother (more often when shy or tucked into something, less often on open sand); it never does it while moving, working or greeting.
    this.camoSense = (this.camoSense ?? 0) - dt; if (this.camoSense <= 0) { this.camoSense = 0.25; this.ground = S.s === 'rest' || S.s === 'flat' || S.s === 'bury' || S.s === 'kelp' || (S.s === 'work' && S.mode === 'inspect') ? Fish3D.groundAt?.(this.pos.x, this.pos.z) ?? null : null; }
    const gnd = this.ground, ctx = gnd ? gnd.ctx : null;
    if (ctx !== this.camoCtx) { this.camoCtx = ctx; this.ctxT = 0; if (ctx) { const onObject = gnd.kind === 'decor'; this.camoWill = rng() < (this.shy || (this.sulk ?? 0) > 0.5 ? 0.95 : onObject ? 0.8 : 0.5); this.camoDelay = 1.2 + rng() * 2.6; } else this.camoWill = false; }   // a new place: choose whether to blend in here
    this.ctxT = (this.ctxT ?? 0) + dt;
    const hiding = S.s === 'work' && S.mode === 'inspect' && this.inspectBlend && gnd?.kind === 'decor';             // sometimes it settles beside the new thing and takes on its look
    const camoT = ((S.s === 'rest' || S.s === 'flat' || S.s === 'bury') && !this.flush && this.camoWill && this.ctxT > this.camoDelay && gnd) || hiding ? 0.94 : 0;
    this.camoK += Math.max(-dt * 0.7, Math.min(dt * 0.4, camoT - this.camoK)); this.camoT0 += dt;
    { const ck = this.costumeK ?? 0, bt = (this.camoK / 0.94) * (gnd?.kind === 'decor' ? 1 : 0.6) * (1 - ck) + (this.costumeBump ?? 0) * ck; this.bump += (bt - this.bump) * Math.min(1, dt * 2); }       // the skin roughens as it blends in      // a slow, steady fade: about 2.3 seconds in, 1.4 out, eased when drawn
    if (this.camoT0 > 0.05 && this.camoK > 0.03) { const g = this.ground; if (g && g.key !== this.camoKey) { this.camoKey = g.key; this.camoSpec = g; this.camoPrev = this.camoK > 0.1 ? this.camoTex : null; this.camoMix = this.camoPrev ? 0 : 1; this.camoMixT = performance.now(); this.camoTex = null; this.camoApplied = -1; } }
    const moodMoved = ['scared', 'annoyed', 'hunting', 'fond'].some((k) => Math.abs(this.mw[k] - this.mwA[k]) > 0.02 || (k === 'hunting' && this.mw.hunting > 0.03));
    if (this.camoT0 > (this.sleepK > 0.05 ? 0.3 : 0.05) && !this.pale && (this.sleepK > 0.02 || this.sleepWas || Math.abs((this.costumeK ?? 0) - (this.costumeApplied ?? 0)) > 0.01 || Math.abs(this.camoK - this.camoApplied) > 0.012 || this.flush > 0 || this.flushApplied || this.camoMix < 1 || moodMoved || (this.camoT0 > 0.25 && this.camoK < 0.3))) { this.camoT0 = 0; this.sleepWas = this.sleepK > 0.02; this.applyCamo(); }
    { const tw = this.tuckWant ?? 0; this.tuckWant = 0; this.tuckK = (this.tuckK ?? 0) + (tw - (this.tuckK ?? 0)) * Math.min(1, dt * (tw ? 0.8 : 2.5)); const k = 1 - this.tuckK; this.group.scale.setScalar(k); this.lift -= 0.6 * (1 - k); }
    { const ls = Math.max(0, sandUnder(this.pos.x, this.pos.z, Math.min(0.45, this.radius * 0.25)) - sandH(this.pos.x, this.pos.z)); this.liftSand = (this.liftSand ?? 0) + (ls - (this.liftSand ?? 0)) * Math.min(1, dt * 6); }      // drawn lifted clear of the sand beside it, so its head and mantle never sink into a slope or the face of a bank
    this.group.position.copy(this.pos); this.group.position.y += this.lift + this.liftSand; this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > (1 / 20) * Fish3D.poseScale * (S.s === 'rest' && !this.glassNear && this.mw.scared < 0.1 ? 1.35 : 1)) { this.accum = 0; this.setPose(this.phase); }
  }
  update(dt, rng, others) {
    if (this.dead) return this.deadUpdate(dt);
    { const T = this.target, gh = sandH(T.x, T.z); if (T.y < gh + Math.min(Math.max(T.y, 0.35), 1.0)) T.y = gh + Math.min(Math.max(T.y, 0.35), 1.0); }      // wherever it is heading, it is in the water above the sand there: over a bank a low swimmer swims as low above that sand as it would above the floor
    if (this.species.move === 'hover') return this.hoverUpdate(dt, rng, others);
    if (this.species.move === 'jet') return this.jetUpdate(dt, rng, others);
    if (this.openWater && !this.seeking && !this.weak && !this.script?.length) { const fl = Math.min(Fish3D.topY - 1, 6.3 + 0.55 * (this.target.z - 1.2)); if (this.target.y < fl) this.target.y = fl; }      // an open-water swimmer keeps to the upper half of the screen (the halfway line sits lower in the water further back); food still brings it down
    this.retarget -= dt;
    if (!this.seeking && (this.retarget <= 0 || (this.pos.distanceTo(this.target) < 0.5 && !this.lureCalm))) this.pick(rng);
    const desired = this.target.clone().sub(this.pos); const d = desired.length() || 1;
    this.idle = (this.idle ?? 0) - dt; this.fleeT = (this.fleeT ?? 0) - dt; this.dartT = (this.dartT ?? 0) - dt;
    desired.multiplyScalar(this.speed * (this.tmul ?? 1) * (this.idle > 0 ? 0.3 : 1) * (this.fleeT > 0 ? 1.6 : this.dartT > 0 ? 1.55 : this.lureCalm ? 0.45 : 1) * (this.mul ?? 1) * (this.vigor ?? 1) * (this.foodMul ?? 1) * (this.seeking ? Math.min(1, 0.45 + d * 0.35) : d < 2 ? 0.6 + d * 0.2 : 1) / d);
    // schooling: separation / alignment / cohesion among same-species mates
    if (this.species.school) {
      const c = new THREE.Vector3(), al = new THREE.Vector3(), sep = new THREE.Vector3(); let cnt = 0;
      for (const o of others) if (o !== this && o.id === this.id) { cnt++; c.add(o.pos); al.add(o.vel); const df = this.pos.clone().sub(o.pos), dl = df.length(); if (dl < 1.4) sep.add(df.multiplyScalar(1 / (dl * dl + 0.05))); }
      if (cnt) { c.multiplyScalar(1 / cnt).sub(this.pos).multiplyScalar(0.12); al.multiplyScalar(1 / cnt).multiplyScalar(0.25); desired.add(c).add(al).add(sep.multiplyScalar(1.3)); }
    }
    // personal space: never pile up on top of another fish (different species included)
    for (const o of others) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x, dy = this.pos.y - o.pos.y, dz = (this.pos.z - o.pos.z) * 1.6, dd = Math.hypot(dx, dy, dz), min = (this.radius + o.radius) * (o.id === this.id ? 0.7 : 1.0);
      if (dd < min && dd > 1e-3) desired.x += dx / dd * (min - dd) / min * this.speed * 3.2, desired.y += dy / dd * (min - dd) / min * this.speed * 3.2, desired.z += dz / dd * (min - dd) / min * this.speed * 2.2;
    }
    // decorations are solid: look ahead along the body and steer away from voxels in the way
    const W = Fish3D.world, R = this.radius, cp = Math.cos(this.pitch), fx = cp * Math.cos(this.heading), fy = Math.sin(this.pitch), fz = -cp * Math.sin(this.heading);
    if (W.push) {
      _o.set(0, 0, 0); let near = 0;
      for (const k of [0.5, 1.1, 1.8]) { _p1.set(this.pos.x + fx * R * k, this.pos.y + fy * R * k, this.pos.z + fz * R * k); near += W.push(_p1, this.cr + 0.3 + 0.25 * k, _o); }
      if (near) {
        const m = _o.length();
        if (m > 1e-4) {
          _o.multiplyScalar(1 / m);                                             // surface normal, pointing out of the obstacle
          const into = desired.dot(_o);
          if (into < 0) desired.addScaledVector(_o, -into * 1.0);              // slide along the surface instead of pushing into it
          desired.addScaledVector(_o, this.speed * 0.5);                       // and ease away
        }
        this.blocked = (this.blocked ?? 0) + dt;
        if (this.blocked > 0.9 && this.cool <= 0) { this.retarget = 0; this.cool = 2.5; this.blocked = 0; }   // not getting anywhere: choose somewhere else
      } else this.blocked = Math.max(0, (this.blocked ?? 0) - dt);
      this.cool -= dt;
    }
    this.vel.lerp(desired, Math.min(1, dt * 1.5));
    const vmax = this.speed * 1.4 * (this.tmul ?? 1) * (this.fleeT > 0 ? 1.6 : this.dartT > 0 ? 1.5 : 1); if (this.vel.length() > vmax) this.vel.setLength(vmax);
    this.pos.addScaledVector(this.vel, dt);
    this.resolve(others);
    const sp = this.vel.length();
    if (sp > 0.25) {
      const wantYaw = Math.atan2(-this.vel.z, this.vel.x);
      let dy = wantYaw - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.heading += dy * Math.min(1, dt * 2.2);
      const wantPitch = Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z));
      this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3);
      this.roll += ((this.invert ? Math.PI : 0) - dy * 0.5 - this.roll) * Math.min(1, dt * 4);
    }
    if (this.invert || Math.abs(this.roll) > 1.2) this.roll += ((this.invert ? Math.PI : 0) - this.roll) * Math.min(1, dt * 2.5);
    this.phase += dt * (3.0 + sp * 5.5);
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, 0);
    this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt;
    if (this.accum > 1 / 30) { this.accum = 0; this.setPose(this.phase); }
  }
}
