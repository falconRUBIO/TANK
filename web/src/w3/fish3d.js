// Real 3D voxel fish: the species voxel models become instanced cubes that are lit,
// shadowed and animated (tail bend, fin flutter) in the scene, steered in 3D.
import * as THREE from 'three';
import { buildModel } from '../voxel.js';
import { genesOf } from '../game/genes.js';
import { patch } from './env.js';

const VOX = 0.052, GLOBAL = 1.05;
// the octopus's repertoire when nothing much is going on: impressions of other creatures, games and ways of walking, each with the thought it shows on its card
const PLANTS = new Set(['grass', 'fern', 'sword', 'red', 'kelp', 'bamboo', 'anemone']);
const ACT_TEXT = { flat: 'Flat as a sole, sliding over the sand.', bury: 'Dug into the sand, just its eyes showing.', lion: 'Spines out: pretending to be a lionfish.', snake: 'Two arms out, rippling like a sea snake.', jelly: 'Puffed up and drifting like a jellyfish.', kelp: 'Arms up, swaying like the plant beside it.', tour: 'Out for a swim round the tank.' };
const GAITS = { stroll: { stride: 1, lift: 0, sp: 1, bob: 1 }, creep: { stride: 0.6, lift: 0, sp: 0.6, bob: 0.5 }, stilt: { stride: 1.35, lift: 0.22, sp: 1.15, bob: 1.6 }, bounce: { stride: 1.1, lift: 0.08, sp: 0.95, bob: 2.2 } };
const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0 });
// Soft lighting on hard voxels: blend each cube's face normal with the smoothed body normal,
// so light rolls across the form like a rounded 3D shape while the silhouette stays blocky.
import { fishBoost, voxShading } from './voxshade.js';
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
    this.species = species; this.id = species.id;
    const model = buildModel(species.make(seed, opts.look ?? null));
    const key = (x, y, z) => `${x},${y},${z}`;
    const occ = new Set(model.list.map((v) => key(v.x, v.y, v.z)));
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
    this.vox.forEach((v, i) => { if (species.move === 'jet' || (this.sp.bend && v.x + this.cx < this.sp.bend.pivot) || v.flap || v.wave) this.mobile.push(i); });
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
  setGrowth(k) { this.growth = k; this.scale = k * (this.species.vox ?? VOX) * GLOBAL * (this.baseScale ?? 1); this.radius = (this.species.length ?? 50) * (this.species.vox ?? VOX) * GLOBAL * k * (this.baseScale ?? 1) * 0.55; this.cr = Math.max(0.2, this.radius * (this.species.move === 'jet' ? 0.25 : 0.3)); this.setPose(this.phase, true); }
  // write per-voxel transforms for a tail phase
  setPose(phase, all = false) {
    const b = this.sp.bend, s = this.scale, arr = this.mesh.instanceMatrix.array, jet = this.species.move === 'jet';
    const list = all ? null : this.mobile;
    const n = all ? this.vox.length : list.length;
    // an octopus arm is posed once per station along its centre line, not once per voxel: a few thousand voxels share a few hundred stations
    let pc = null, pcs = null, stamp = 0, poseAt = null;
    if (jet && this.rig) {
      pc = this.pc ||= new Float32Array(8 * 1024 * 3); pcs = this.pcs ||= new Int32Array(8 * 1024); stamp = this.pstamp = (this.pstamp | 0) + 1; const rig = this.rig, rp = this.rp, S = this.rs;
      S.rest = this.restK; S.crawl = this.crawlK; S.sq = this.sq; S.ph = phase; S.work = this.workK; S.greet = this.greetK; S.glass = this.glassNear; S.stride = this.stride * (this.gait?.stride ?? 1); S.glide = this.glideK; S.cruise = this.cruiseK; S.land = this.landK; S.dash = this.dashK;
      S.flat = this.flatK; S.lion = this.lionK; S.snake = this.snakeK; S.jelly = this.jellyK; S.kelp = this.kelpK;
      poseAt = (arm, at) => { const key = arm * 1024 + Math.round(at * 990), k3 = key * 3; if (pcs[key] !== stamp) { rig.pose(rig.arms[arm], at, S, rp); pc[k3] = rp[0]; pc[k3 + 1] = rp[1]; pc[k3 + 2] = rp[2]; pcs[key] = stamp; } else { rp[0] = pc[k3]; rp[1] = pc[k3 + 1]; rp[2] = pc[k3 + 2]; } };
    }
    for (let j = 0; j < n; j++) {
      const i = all ? j : list[j], v = this.vox[i];
      let x = v.x, y = v.y, z = v.z;
      if (b) {
        const piv = b.pivot - this.cx;
        if (x < piv) { const d = piv - x, t = Math.min(1, d / b.len), th = b.amp * Math.sin(phase) * Math.pow(t, 1.15); x = piv - d * Math.cos(th); z += d * Math.sin(th); y += b.bob * Math.sin(phase + 1.3) * t; }
      }
      if (v.flap) z += Math.sign(v.z || 1) * v.flap * (0.55 + 0.45 * Math.sin(phase * 2 + x * 0.25));
      if (v.wave) z += v.wave * Math.sin(phase + x * 0.45);
      if (jet && v.pupil) { x += this.lookX; y += this.lookY; }
      if (jet && v.tag === 'eye') { const lid = Math.max(this.sleepK * 0.92, this.blinkK); if (lid > 0.02) y = this.eyeY + (y - this.eyeY) * (1 - 0.88 * lid); }
      if (jet) {                                                           // octopus: arms spread flat at rest and stream back tight in a jet, the mantle squeezes with each pulse
        if (v.arm >= 0 && this.rig) {                                      // a rigged arm: its centre line is posed for the current state and the voxel keeps its offset from it
          poseAt(v.arm, v.at);
          const k = 1 - 0.2 * this.sq; x = this.rp[0] + v.off[0] * k; y = this.rp[1] + v.off[1] * k; z = this.rp[2] + v.off[2] * k;
        }
        else if (v.web && this.rig) {                                      // webbing between two arms: it hangs between the two centre lines at the same point along each
          const w = v.web; poseAt(w.a, w.at); const ax = this.rp[0], ay = this.rp[1], az = this.rp[2]; poseAt(w.b, w.at);
          const gather = 1 - this.restK * 0.85 - this.crawlK * 0.3, sag = w.sag * (1 + 0.6 * Math.max(0, gather));
          x = ax + (this.rp[0] - ax) * w.u; y = ay + (this.rp[1] - ay) * w.u - sag; z = az + (this.rp[2] - az) * w.u;
        }
        else if (v.tag === 'arm') { z *= 1 + 0.75 * this.restK + 0.35 * this.crawlK - 0.62 * this.sq; y = y * (1 - 0.42 * this.restK - 0.2 * this.crawlK - 0.3 * this.sq) - 1.2 * this.restK; if (this.crawlK) y += Math.sin(phase * 1.3 + z * 0.5) * 0.9 * this.crawlK * (v.wave || 0); }
        else { const k = 1 - 0.15 * this.sq + (0.025 + 0.02 * this.restK) * Math.sin((this.tt ?? 0) * (1.8 - 0.9 * this.sleepK));      // he breathes, slower when asleep
           const fK = (this.flatK ?? 0) + 0.6 * (this.snakeK ?? 0), pK = this.puffK ?? 0; x = this.mcx + (x - this.mcx) * (1 + 0.06 * this.sq + 0.13 * this.glideK + 0.3 * fK + 0.22 * pK); y = this.mcy + (y - this.mcy) * k * (1 - 0.1 * this.restK) * (1 - 0.05 * this.glideK) * (1 - 0.5 * fK + 0.22 * pK); z *= k * (1 - 0.05 * this.glideK) * (1 + 0.3 * fK + 0.22 * pK);      // flat as a sole, or puffed up like a jellyfish if (v.pap && this.bump > 0.03) { const bb = this.bump * 1.3; x += v.nx * bb; y += v.ny * bb; z += v.nz * bb; }
           if (this.lean) { const dx = x, dy = y + 2, cl = Math.cos(this.lean), sl = Math.sin(this.lean); x = dx * cl - dy * sl; y = -2 + dx * sl + dy * cl; }                 // tips about the neck
           if (this.yaw && v.tag !== 'mantle') { const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), dx = x; x = dx * cy - z * sy; z = dx * sy + z * cy; }                 // the head turns
           if (v.tag === 'web' || v.tag === 'beak') { const j = 1 - this.restK - 0.6 * this.crawlK; if (j > 0) { x -= 1.4 * j; y += 1.6 * j; z *= 1 - 0.12 * j; } if (this.chewK > 0.01) { const ch = this.chewK * Math.sin(this.tt * 16); if (v.tag === 'beak') { y += ch * 0.8; z += Math.sign(v.z || 1) * ch * 0.7; } else if (!v.web && v.y < -5) y += ch * 0.4; } }      // chewing: the beak works and the lips move with it      // jetting, the mouth and the web draw up into the head behind the streaming arms
           y += this.bob ?? 0; }
      }
      const o = i * 16;
      arr[o] = s; arr[o + 5] = s; arr[o + 10] = s; arr[o + 15] = 1;
      arr[o + 12] = x * s; arr[o + 13] = y * s; arr[o + 14] = z * s;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  // hard constraints: never end a frame inside a decoration or another fish
  resolve(others) {
    const W = Fish3D.world, R = this.radius, cp = Math.cos(this.pitch), fx = cp * Math.cos(this.heading), fy = Math.sin(this.pitch), fz = -cp * Math.sin(this.heading);
    // a fish is solid down its length; an octopus only in its mantle and head (its arms wrap round things, they do not hold it off them), and one frame can only ever nudge it, never throw it
    const jet = this.species.move === 'jet', offs = jet ? [-0.3, 0, 0.3] : [-0.8, -0.4, 0, 0.4, 0.8]; if (jet) _p2.copy(this.pos);
    if (W.push && !this.homing) for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const off of offs) {                                               // samples down the length of the body
        _p1.set(this.pos.x + fx * R * off, this.pos.y + fy * R * off, this.pos.z + fz * R * off); _o.set(0, 0, 0);
        const n = W.push(_p1, this.cr, _o) + (jet && W.soft && (this.pos.y < 1.3 || this.st?.s === 'drift') ? W.soft.push(_p1, this.cr * 0.8, _o) : 0);      // plants are soft: only the octopus, crawling through the floor clutter or coming down to land, is kept off their stems; jetting, it passes over the leaves like a fish
        if (n) { if (_o.lengthSq() < 1e-6) _o.set(fx, 0, fz); const m = _o.length() || 1, step = Math.min(0.25, 0.04 * n + 0.04); this.pos.addScaledVector(_o, step / m); moved = true; }
      }
      if (!moved) break;
    }
    if (jet) { const L = this.pos.distanceTo(_p2); if (L > 0.08) this.pos.lerpVectors(_p2, this.pos, 0.08 / L); if (this.pos.y < 1.3 && this.pos.z < 0.12) this.pos.z = 0.12; }      // and on the floor it is never pushed back behind the scenery
    for (const o of others) {                                               // fish are solid too
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x, dy = this.pos.y - o.pos.y, dz = (this.pos.z - o.pos.z) * 1.5, dd = Math.hypot(dx, dy, dz), min = Math.max(0.5, 0.42 * (this.radius + o.radius));
      if (dd < min * 0.92 && dd > 1e-3) { const k = (min * 0.92 - dd) / dd * 0.5; this.pos.x += dx * k; this.pos.y += dy * k; this.pos.z += dz * k / 1.5; }
    }
    this.pos.x = Math.max(-4.7, Math.min(4.7, this.pos.x)); this.pos.y = Math.max(0.35, Math.min(Fish3D.topY - Math.min(1.6, this.radius * 0.55), this.pos.y)); this.pos.z = Math.max(-3.8, Math.min(3.4, this.pos.z));
  }
  mouth() { return new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading)).multiplyScalar(this.radius * 0.62).add(this.pos); }
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
    const dx = h.x - this.pos.x, dz = h.z - this.pos.z, C = [(dx * ch - dz * sh) / sc, (0.2 - this.pos.y) / sc, (dx * sh + dz * ch) / sc];
    const H = [22, 4, 0], MD = [7.5, -8.6, 0], D = [23, -6.5, 5];               // H: held up in front of the eyes. MD: just under the beak. D: where the empty shell is left
    const parts = h.mesh?.userData?.parts ?? [], P0 = 3.4, STEP = 0.95, TB = P0 + parts.length * STEP, END = TB + 2.0;
    let G = this.rs.grab; if (!G) {
      const ang = Math.atan2(C[2], C[0] - 3); let best = 0, bd = 9; rig.arms.forEach((a, i) => { const d = Math.abs(Math.atan2(Math.sin(a.th - ang), Math.cos(a.th - ang))); if (d < bd) { bd = d; best = i; } });
      const p0 = rig.pose(rig.arms[best], 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0]); G = this.rs.grab = { arm: best, n1: (best + 1) % 8, n2: (best + 7) % 8, p: [...p0], p0: [...p0], w: 0, t: 0, pk: null };
      // now and then it inks the crab first: decided from where the crab is, so every phone in the tank agrees
      if (!h.inked && (h.forceInk || Math.abs(Math.sin(Math.round(h.x * 10) * 12.9898 + Math.round(h.z * 10) * 78.233) * 43758.5453) % 1 < 0.35)) { G.ink = true; G.t = -1.1; }
    }
    if (h.y > 0.25) { G.t = G.ink && !h.inked ? -1.1 : 0; G.w = 0; return; }                                                            // wait for the crab to land
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
      const rest = 0.13 + 0.2 * (1 - Math.cos(h.mesh.rotation.z)) * (h.mesh.scale.x / 0.95);                  // resting height: upside down, the dome is underneath, so it sits higher
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
  freeSpot(x, z) { const W = Fish3D.world; if (!W.push) return true; _p2.set(x, 0.55, z); _o.set(0, 0, 0); return !(W.push(_p2, this.cr + 0.1, _o) + (W.soft ? W.soft.push(_p2, this.cr * 0.7, _o) : 0)); }
  clearWay(x, z) { const n = Math.ceil(Math.hypot(x - this.pos.x, z - this.pos.z) / 0.3); for (let i = 1; i <= n; i++) { const t = i / n; if (!this.freeSpot(this.pos.x + (x - this.pos.x) * t, this.pos.z + (z - this.pos.z) * t)) return false; } return true; }
  // where to crawl: the spot it had in mind if it is free, else somewhere near it that is, preferring one it can see a clear way to
  crawlGoal(x, z, rng, spread = 1.2) {
    const b = this.band, zlo = Math.max(b.z[0], 0.3), zhi = Math.min(b.z[1], 2.5), cl = (px, pz) => [Math.max(b.x[0], Math.min(b.x[1], px)), Math.max(zlo, Math.min(zhi, pz))];
    let best = null; for (let k = 0; k < 10; k++) { const [px, pz] = k === 0 ? cl(x, z) : cl(x + (rng() - 0.5) * 2 * spread * (1 + k * 0.15), z + (rng() - 0.5) * 2 * spread); if (!this.freeSpot(px, pz) || this.failed?.some((q) => Math.hypot(q.x - px, q.z - pz) < 0.9)) continue; if (this.clearWay(px, pz)) return [px, pz]; best ||= [px, pz]; }
    return best ?? cl(x, z);
  }
  // crawling has got it nowhere: it jets over whatever is in the way, toward where it wanted to go, and remembers the spot as a hard one to reach on foot
  hop(S, rng) {
    const gx = this.target.x, gz = this.target.z, again = S.after && Math.hypot(S.after.x - gx, S.after.z - gz) < 0.5 ? S.after.n + 1 : 1;
    if (again > 2) { (this.failed ||= []).push({ x: gx, z: gz }); if (this.failed.length > 6) this.failed.shift(); S.after = null; } else S.after = { x: gx, z: gz, mode: S.mode, n: again };      // twice over the top and still not there: that spot is not for walking to
    let lx = Math.max(-3.8, Math.min(3.8, gx)), lz = Math.max(0.3, Math.min(2.4, gz));
    for (let k = 0; k < 8 && !this.freeSpot(lx, lz); k++) { lx = Math.max(-3.8, Math.min(3.8, gx + (rng() - 0.5) * 2.4)); lz = Math.max(0.3, Math.min(2.4, gz + (rng() - 0.5) * 2)); }      // it comes down on open sand, not in a plant
    S.detour = null; S.prog = null; S.sideBias = 0; S.backT = 0; S.mode = null; S.s = 'jet'; S.n = Math.hypot(lx - this.pos.x, lz - this.pos.z) > 2.5 ? 2 : 1; S.t = 9; S.pulse = 0;
    this.target.set(lx, 1.9 + rng() * 0.6, lz); this.flush = Math.max(this.flush, 0.2);
  }
  // nothing much going on: now and then it does something worth watching. What it picks depends on what is about (a fish to follow or watch,
  // a plant to stand beside, sand to dig into), on its nature (the bold ones show off more), and it happens less at night
  pickAct(S, rng, others, M, want = null) {
    const fish = others.filter((o) => o !== this && !o.dead && !o.visitor && o.species.move !== 'jet' && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 4.5 && o.pos.y < 8);
    const plant = (this.getSpots?.() ?? []).find((q) => PLANTS.has(q.type) && Math.hypot(q.x - this.pos.x, q.z - this.pos.z) < 1.7);
    const onSand = this.ground ? this.ground.kind !== 'decor' : true, bold = this.bold, cur = M.cur ?? 0.5, soc = M.soc ?? 0.5, floor = 0.55, night = this.isNight ? 0.3 : 1;
    const opts = [['flat', 0.08 * (0.6 + cur)], ['bury', onSand && this.restFor > 5 ? 0.06 : 0], ['lion', 0.05 * (0.5 + bold)], ['snake', 0.05], ['jelly', 0.05], ['kelp', plant ? 0.1 : 0], ['follow', fish.length ? 0.1 * (0.5 + soc) : 0], ['watch', fish.length ? 0.1 : 0], ['tour', 0.07 * (0.5 + bold)]];
    let r = rng() / night, act = want; if (!act) for (const [k, w] of opts) { if (r < w) { act = k; break; } r -= w; }
    if (!act || (want && !opts.some(([k, w]) => k === want && w > 0))) return false;
    S.mode = null; S.n = 0; S.pulse = 0; S.detour = null; S.prog = null; S.tour = null; S.popped = false; S.digs = 0; this.act = act; this.actText = ACT_TEXT[act] ?? null;
    if (act === 'follow') { const o = fish[(rng() * fish.length) | 0]; this.follow = o; this.actText = `Tagging along behind ${o.name}.`; S.s = 'jet'; S.n = 1; S.t = 10 + rng() * 5; this.target.copy(o.pos); return true; }
    if (act === 'watch') { const o = fish.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0]; this.watchFish = o; this.actText = `Watching ${o.name}.`; S.s = 'watch'; S.t = 5 + rng() * 4; return true; }
    if (act === 'tour') { const b = this.band, ys = 3 + rng() * 4; S.tour = [[-2.8 + rng(), ys, 1.2 + rng()], [2.8 - rng(), Math.min(Fish3D.topY - 2.5, ys + 1.5), 1.4 + rng()], [(rng() - 0.5) * 3, 2 + rng() * 2, b.z[0] + rng() * (b.z[1] - b.z[0])]]; if (rng() < 0.5) S.tour.reverse(); const f0 = S.tour.shift(); this.target.set(f0[0], f0[1], f0[2]); S.s = 'jet'; S.n = 2; S.t = 24; return true; }
    S.s = act; S.t = act === 'bury' ? 14 + rng() * 14 : act === 'flat' ? 9 + rng() * 6 : act === 'kelp' ? 10 + rng() * 6 : 7 + rng() * 5; S.t0 = S.t;
    if (act === 'flat') { const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), floor, Math.max(0.4, Math.min(2.4, this.pos.z + (rng() - 0.5) * 1.5))); }
    if (act === 'lion' || act === 'jelly') this.target.set(Math.max(-3, Math.min(3, this.pos.x + (rng() - 0.5) * 2)), 3.5, Math.max(0.6, Math.min(2.2, this.pos.z)));
    if (act === 'kelp') this.target.set(this.pos.x, floor, this.pos.z);
    return true;
  }
  endAct(S, rng, next = 'rest') { this.act = null; this.actText = null; this.watchFish = null; this.follow = null; S.tour = null; S.popped = false; S.digs = 0; if (next === 'drift') { S.s = 'drift'; S.t = 6; } else { S.s = 'rest'; S.t = 4 + rng() * 6; } }
  // a fish has hung about too close for too long: it flings a puff of silt at it with the arms on that side, and the fish clears off
  throwAt(o, rng) {
    this.sq = Math.max(this.sq, 0.7); this.flush = Math.max(this.flush, 0.4); this.annoyT = 2; const d = _p2.copy(o.pos).sub(this.pos); d.y = Math.max(0, d.y); d.normalize();
    this.onThrow?.(this.pos.clone(), d.clone()); o.fleeT = 1.4; o.target.set(Math.max(-4, Math.min(4, o.pos.x + d.x * 2.5)), Math.min(12, o.pos.y + 1), Math.max(0.3, Math.min(2.4, o.pos.z + d.z * 1.5))); o.retarget = 2;
    const sc = this.scale || 0.06, ch = Math.cos(this.heading), sh = Math.sin(this.heading), dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, dy = o.pos.y - this.pos.y, lx = (dx * ch - dz * sh) / sc, lz = (dx * sh + dz * ch) / sc, ang = Math.atan2(lz, lx - 3);
    this.minds.forEach((m, i) => { const a = this.rig?.arms[i]; if (!a) return; const df = Math.abs(Math.atan2(Math.sin(a.th - ang), Math.cos(a.th - ang))); if (df < 0.9) { m.x = lx; m.y = dy / sc; m.z = lz; m.until = 1.1; m.next = 4 + rng() * 3; } });
    this.actText = `Threw silt at ${o.name}.`; this.actFlash = 4;
  }
  denGoal(rng) { const d = this.den; return d.home ? [d.x, d.z + (d.kind === 'pot' ? 0.5 : -0.25)] :      // in a coconut it sits well inside the hollow (the cut face is at the shell's centre line), its arms spilling out of the mouth
     d.kind === 'rocks' ? [d.x, d.z] : [d.x + (rng() - 0.5) * 0.6, d.z + 0.85]; }
  // going home: first to the open side of the shell or pot (its mouth faces the front), then straight in through it. Never through the wall.
  goDen(S, rng, t = 12) { S.mode = 'den'; S.s = 'crawl'; S.t = t; const [x, z] = this.denGoal(rng); if (this.den.home && Math.hypot(this.pos.x - x, this.pos.z - z) > 1.1) { S.mode = 'denfront'; S.t = t; this.target.set(x, 0.55, z + 1.25); } else this.target.set(x, 0.55, z); }
  startTask(T) { const S = (this.st ||= { s: 'rest', t: 1, n: 0, pulse: 0 }); this.task = T; S.mode = 'tgo'; S.s = 'crawl'; S.t = 20 + 12 * Math.hypot(T.ax - this.pos.x, T.az - this.pos.z); this.target.set(T.ax, 0.55, T.az); }
  fearHere() { (this.fears ||= []).push({ x: this.pos.x, z: this.pos.z, t: performance.now() }); if (this.fears.length > 4) this.fears.shift(); }
  startle(from) {
    this.fearHere(); this.scareT = 2.6; this.wakeT = 8; if (this.onInk && Math.random() < 0.3 + 0.4 * (1 - this.bold)) this.onInk(this.pos); const S = this.st; if (S && (S.s === 'rest' || S.s === 'crawl') && !this.seeking) { S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 4; S.mode = null; const b = this.band; this.target.set(Math.max(-3.5, Math.min(3.5, this.pos.x + (from && from.x > this.pos.x ? -2.4 : 2.4))), Math.min(6, this.pos.y + 2.2), this.pos.z); this.sq = 1; }
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
  camoEase(k) { return k * k * (3 - 2 * k); }
  applyCamo() {
    const a = this.mesh.instanceColor.array, b = this.baseCol, f = this.flush, raw = this.camoK, k = this.camoEase(Math.max(0, Math.min(1, raw / 0.94))) * 0.94; this.camoApplied = raw; this.flushApplied = f > 0;
    if (this.camoMix < 1) this.camoMix = Math.min(1, (performance.now() - (this.camoMixT ?? 0)) / 1400);                    // moving to a different ground while camouflaged: the pattern cross-fades, it does not jump
    const pv = this.camoMix < 1 ? this.camoPrev : null, mx = this.camoEase(this.camoMix ?? 1);
    if (k > 0.02 && !this.camoTex && this.camoSpec) this.buildCamo(this.camoSpec); const tex = k > 0.02 ? this.camoTex : null;
    const mw = this.mw, tnow = this.tt ?? 0, eb = mw.fond;
    for (const kk in this.mwA) this.mwA[kk] = mw[kk];
    for (let i = 0; i < this.vox.length; i++) {
      const o = i * 3, v = this.vox[i];
      if (v.tag === 'beak') { a[o] = b[o] * 1.1; a[o + 1] = b[o + 1] * 1.1; a[o + 2] = b[o + 2] * 1.1; continue; }
      if (v.tag === 'eye') { const bar = eb > 0.01 && Math.abs(v.y - this.eyeY) <= 1.2 ? 1 - 0.92 * eb : 1; a[o] = b[o] * bar; a[o + 1] = b[o + 1] * bar; a[o + 2] = b[o + 2] * bar; continue; }       // someone it knows: a dark bar across the eye
      let tr = tex ? tex[o] : b[o], tg = tex ? tex[o + 1] : b[o + 1], tb = tex ? tex[o + 2] : b[o + 2]; if (pv && tex) { tr = pv[o] + (tr - pv[o]) * mx; tg = pv[o + 1] + (tg - pv[o + 1]) * mx; tb = pv[o + 2] + (tb - pv[o + 2]) * mx; }
      const lift = 1 + 0.4 * f; let R = (b[o] + (tr - b[o]) * k) * lift * (1 + 0.18 * f), G = (b[o + 1] + (tg - b[o + 1]) * k) * (1 + 0.15 * f), B = (b[o + 2] + (tb - b[o + 2]) * k) * (1 + 0.1 * f) * (1 - 0.18 * f);   // excited: bright and warm
      if (mw.scared > 0.01) { const q = 0.7 * mw.scared; R += (0.93 - R) * q; G += (0.91 - G) * q; B += (0.95 - B) * q; }                       // startled: drained to a pale white
      if (this.sleepK > 0.05) { const sk = this.sleepK, dr = 1 - 0.18 * sk + 0.22 * sk * Math.max(0, Math.sin(tnow * 1.1 + v.x * 0.35 + v.z * 0.3 + Math.sin(tnow * 0.4) * 2)); R *= dr; G *= dr * 0.97; B *= dr * 1.04; }                  // asleep: a little darker and paler, with slow ripples of colour like a dream
      if (mw.annoyed > 0.01) { const q = 1 - 0.45 * mw.annoyed; R = R * q + 0.05 * mw.annoyed; G *= q; B = B * q + 0.1 * mw.annoyed; }                  // annoyed: dark and purplish
      if (mw.hunting > 0.01) { const q = 1 + (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(tnow * 3.4 + v.x * 0.3 - v.y * 0.12)) - 1) * mw.hunting; R *= q; G *= q; B *= q; }   // hunting: dark clouds ripple along the body
      if (v.tag === 'mantle' || v.tag === 'head') { const sh = Math.max(0, Math.sin(v.x * 0.16 + v.y * 0.27 + v.nz * 1.4 + tnow * 0.55)) ** 6 * 0.11 * (1 - this.sleepK) * (1 - k); R += (0.78 - R) * sh; G += (0.96 - G) * sh; B += (1 - B) * sh; }       // a faint iridescent sheen drifting over the skin, gone when it is camouflaged
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
    const G = this.greet;
    if (G) {                                                                         // the morning greeting: two partners meet at a plant and circle each other, glowing, then part
      G.t -= dt; G.ang += dt * 0.85 * G.side; const wantX = G.cx + Math.cos(G.ang) * G.r, wantZ = G.cz + Math.sin(G.ang) * G.r * 0.7, wantY = G.y + Math.sin(t * 1.4 + G.side) * 0.12;
      this.pos.x += (wantX - this.pos.x) * Math.min(1, dt * 1.6); this.pos.y += (wantY - this.pos.y) * Math.min(1, dt * 1.6); this.pos.z += (wantZ - this.pos.z) * Math.min(1, dt * 1.6);
      let dy = Math.atan2(-(G.cz - this.pos.z), G.cx - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 2.5); this.vel.multiplyScalar(Math.exp(-3 * dt));
      this.glowK += ((G.t > 1.2 ? 1 : 0) - this.glowK) * Math.min(1, dt * 1.2);
      if (G.t <= 0) { this.greet = null; this.idle = 4 + rng() * 4; this.retarget = 6; this.pickHover(rng); }
    } else this.glowK += (0 - this.glowK) * Math.min(1, dt * 1.2);
    if (Math.abs(this.glowK - (this.glowApplied ?? 0)) > 0.03) { this.glowApplied = this.glowK; this.applyGlow(); }
    if (G) { this.pitch += (Math.sin(t * 0.8 + this.phase) * 0.04 - this.pitch) * Math.min(1, dt * 2); this.phase += dt * 14; this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(0, this.heading, this.pitch, 'YZX')); this.accum += dt; if (this.accum > 1 / 24) { this.accum = 0; this.setPose(this.phase); } return; }
    if (!this.seeking && ((this.retarget <= 0 && this.idle <= 0) || (this.pos.distanceTo(this.target) < 0.3 && this.idle <= 0))) this.pickHover(rng);
    const to = this.target.clone().sub(this.pos), d = to.length() || 1, holding = this.idle > 0 && !this.seeking;
    const base = this.speed * (this.tmul ?? 1) * (this.mul ?? 1) * (this.vigor ?? 1) * (this.foodMul ?? 1) * (this.seeking ? 1.15 : 0.5) * (holding ? 0.06 : 1);
    to.multiplyScalar((base / d) * Math.min(1, d)); to.y += Math.sin(t * 1.3 + this.phase) * (holding ? 0.03 : 0.1);
    this.vel.lerp(to, Math.min(1, dt * 0.9)); this.separate(others); const vmax = this.speed * 0.75 * (this.mul ?? 1); if (this.vel.length() > vmax) this.vel.setLength(vmax);
    this.pos.addScaledVector(this.vel, dt); this.resolve(others);
    const sp = this.face(dt, 0.9);
    this.pitch += ((-this.vel.y * 0.12) + Math.sin(t * 0.8 + this.phase) * 0.04 - this.pitch) * Math.min(1, dt * 2); this.roll += (Math.sin(t * 0.6 + this.phase) * 0.03 - this.roll) * Math.min(1, dt * 2);
    this.phase += dt * (12 + sp * 4);                                    // the dorsal fin flutters fast even when hardly moving
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > 1 / 24) { this.accum = 0; this.setPose(this.phase); }
  }
  pickHover(rng) {
    const spots = this.getSpots?.() ?? [], b = this.band;
    if (spots.length && rng() < 0.6) { const s = spots[(rng() * spots.length) | 0]; this.target.set(s.x + (rng() - 0.5) * 0.5, 1.1 + s.h * (0.3 + rng() * 0.4), s.z + 0.55); this.idle = 7 + rng() * 9; this.retarget = this.idle + 3; return; }   // hold on and rest
    this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); this.idle = 1.5 + rng() * 3; this.retarget = 4 + rng() * 4;
    for (let k = 0; k < 8 && Fish3D.world.push; k++) { _o.set(0, 0, 0); if (!Fish3D.world.push(this.target, this.radius * 0.5 + 0.4, _o)) break; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); }
  }
  // Octopus: rests on the bottom with its arms spread flat, crawls along it, and now and then jets through the water in pulses (mantle squeezes, arms stream back) before drifting down again.
  jetUpdate(dt, rng, others) {
    this.tt = (this.tt ?? 0) + dt; const mul = (this.mul ?? 1) * (this.vigor ?? 1) * (this.tmul ?? 1); const S = (this.st ||= { s: 'rest', t: 1 + rng() * 3, n: 0, pulse: 0 }); S.t -= dt;
    const floor = 0.55, onFloor = this.pos.y < floor + 0.5;
    if (this.task && (S.s === 'jet' || S.s === 'dash' || S.s === 'glass' || this.seeking || this.hunt || this.jarAt || this.scareT > 0 || (performance.now() - this.task.t0 > 240000))) { this.onTask?.(this, 'abort'); this.task = null; if (S.mode === 'tgo' || S.mode === 'thaul' || S.mode === 'tsettle') S.mode = null; }
    if (this.seeking && S.s !== 'jet') { S.s = 'jet'; S.n = 2; S.t = 6; S.pulse = 0; }
    // its mind: a puzzle jar to work on, something new to inspect, or someone it knows to greet at the glass
    if (this.carryMesh && S.mode !== 'carry2') this.carryMesh.visible = false;
    const want = this.task ? null : this.jarAt ? 'jar' : this.hunt ? 'hunt' : this.inspect ? 'inspect' : null;
    if (want && S.mode !== want && S.s !== 'jet' && !this.seeking) { S.mode = want; S.s = 'crawl'; S.t = 16; const p = want === 'jar' ? this.jarAt : want === 'hunt' ? this.hunt : this.inspect; const ax = Math.max(-3.6, Math.min(3.6, p.x - (want === 'jar' ? 0.3 : want === 'hunt' ? 0.4 : 0.7))), az = Math.max(0.3, Math.min(2.4, p.z - (want === 'jar' ? 1.4 : want === 'hunt' ? 1.0 : -0.9))); if (want === 'inspect') { const [gx, gz] = this.crawlGoal(ax, az, rng, 0.7); this.target.set(gx, floor, gz); } else this.target.set(ax, floor, az); }       // it settles behind the jar or the crab, facing the glass, and sits back so the arms do the reaching where you can see them
    if (!want && (S.mode === 'jar' || S.mode === 'hunt' || S.mode === 'inspect')) { if (S.mode === 'jar' && S.s === 'work') { this.flush = 1; S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 5; this.target.set(this.pos.x + (this.pos.x > 0 ? -1 : 1) * 1.5, this.pos.y + 2.5, this.pos.z); } else if (S.s === 'work' || S.s === 'crawl') { S.s = 'rest'; S.t = 3; } S.mode = null; }
    if (S.mode === 'jar' && this.jarAt) { const sc = this.scale || 0.06, dx = this.jarAt.x - this.pos.x, dz = this.jarAt.z - this.pos.z, ch = Math.cos(this.heading), sh = Math.sin(this.heading); this.rs.jx = (dx * ch - dz * sh) / sc; this.rs.jz = (dx * sh + dz * ch) / sc; this.rs.jr = 0.58 / sc; } else this.rs.jr = 0;
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
      if (S.mode === 'greet') this.greetK += (1 - this.greetK) * Math.min(1, dt * 2); else this.workK += ((S.mode === 'inspect' ? 0.65 : S.mode === 'hunt' && (this.rs.grab?.t ?? 0) > 1.8 ? 0.3 : 1) - this.workK) * Math.min(1, dt * 2);      // eating, the other arms settle and only the working arms move
      if (jar) { let dy = Math.atan2(-(jar.z - this.pos.z), jar.x - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 2.2); }
      else if (S.mode === 'greet') { let dy = Math.atan2(-1, 0) * -1 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.6); }          // faces the glass
      if (S.mode === 'hunt' && S.t <= 0 && this.hunt) { this.onEat?.(this.hunt); this.hunt = null; this.flush = 1; }
      if (S.mode !== 'jar' && S.t <= 0) { if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 4 + rng() * 5; }
    } else if (S.s === 'glass') {
      /* handled above */
    } else if (S.s === 'rest') {
      S.prog = null; S.detour = null; this.vel.multiplyScalar(Math.exp(-3 * dt)); this.restK += (1 - this.restK) * Math.min(1, dt * 1.5); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      if (!onFloor) this.vel.y -= 0.5 * dt;
      this.homing = false;
      if (this.den?.home) { const [hx, hz] = this.denGoal(rng); if (Math.hypot(this.pos.x - hx, this.pos.z - hz) < 0.9) { let dy = Math.PI / 2 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.2); this.homing = true; this.tuckWant = this.den.kind === 'pot' ? 0.44 : 0.3; this.pos.x += (hx - this.pos.x) * Math.min(1, dt * 1.5); this.pos.z += (hz - this.pos.z) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-6 * dt)); } }       // in its shell or pot it faces the room and squeezes itself in; soft-bodied, it is not pushed out by the walls
      const M = { ...(this.mind ?? { cur: 0.5, soc: 0.5, tidy: 0.5 }) }, sk = this.sulk ?? 0, bo = this.bored ?? 0, au = this.audience ?? 0; M.cur = Math.min(1, M.cur * (1 - sk) + 0.5 * bo); M.soc = M.soc * (1 - 0.5 * sk) + 0.25 * au;
      if (onFloor && S.t > 6 && this.den == null) { const q = (this.fav ||= { x: this.pos.x, z: this.pos.z, n: 0 }); q.n = Math.min(40, q.n + dt); const w = Math.min(0.02, dt * 0.01); if (this.restFor > 8) { q.x += (this.pos.x - q.x) * w; q.z += (this.pos.z - q.z) * w; this.favDirty = true; } }
      const near = S.t <= 0 && others.some((o) => o !== this && !o.dead && !o.visitor && o.pos.distanceTo(this.pos) < 1.5);
      S.gaitSet = false; this.throwCool = Math.max(0, this.throwCool - dt);
      { let near = null; for (const o of others) if (o !== this && !o.dead && !o.visitor && o.species.move !== 'jet' && o.pos.distanceTo(this.pos) < 2.2) { near = o; break; } this.nearFor = near ? this.nearFor + dt : 0;
        if (near && this.nearFor > 1.4 && this.throwCool <= 0 && !this.homing && this.bold > 0.35 && this.sleepK < 0.2 && rng() < dt * 0.5) { this.throwCool = 30 + rng() * 30; this.nearFor = 0; this.throwAt(near, rng); } }
      if (S.t <= 0 && this.isNight && this.den && !S.mode && Math.hypot(this.pos.x - this.den.x, this.pos.z - this.den.z) > 1.4 && rng() < 0.7) this.goDen(S, rng);     // it turns in at its den for the night
      else if (S.t <= 0 && !S.mode && !this.inspect && !this.glassAt && !this.homing && (this.tuckK ?? 0) < 0.1 && this.sleepK < 0.2 && this.pickAct(S, rng, others, M)) { /* an impression, a game or a look round: pickAct set it up */ }
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && !this.den && this.fav && this.fav.n > 12 && Math.hypot(this.pos.x - this.fav.x, this.pos.z - this.fav.z) > 1.2 && rng() < 0.2) { S.s = 'crawl'; S.t = 8; const [gx, gz] = this.crawlGoal(this.fav.x, this.fav.z, rng, 0.8); this.target.set(gx, floor, gz); }     // no den yet: it goes back to its favourite spot
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.16 * M.cur) { const sp = this.getSpots?.() ?? [], fv = this.likes && rng() < 0.55 ? sp.find((x) => x.id === Object.entries(this.likes).sort((a, b) => b[1] - a[1])[0]?.[0]) : null, q = fv ?? (sp.length ? sp[(rng() * sp.length) | 0] : null); if (q) this.inspect = { x: q.x, z: q.z, id: q.id }; }                       // curious ones go and look at things on their own, and keep going back to a favourite
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.12 * M.soc) { const fs = others.filter((o) => o !== this && !o.dead && !o.visitor); if (fs.length) { const o = fs[(rng() * fs.length) | 0]; this.inspect = { x: o.pos.x, z: o.pos.z }; } }       // sociable ones go to see the other fish
      else if (near && M.soc < 0.4 && this.den && rng() < 0.5) this.goDen(S, rng, 10);     // a loner leaves when it gets crowded
      else if (S.t <= 0 && (this.bondMe >= 3 || (au >= 1 && this.bondMe >= 1)) && !this.shy && rng() < 0.12 + 0.35 * M.soc + (this.mind?.type === 'showoff' ? 0.25 * au : 0)) { S.mode = 'greet'; S.s = 'crawl'; S.t = 10; const [gx, gz] = this.crawlGoal((rng() - 0.5) * 3, 2.4, rng, 1.0); this.target.set(gx, floor, gz); }
      else if (S.t <= 0 && this.den && this.hoard > 0 && !this.shy && rng() < 0.05 + 0.3 * (this.mind?.tidy ?? 0.4)) { S.mode = 'carry1'; S.s = 'crawl'; S.t = 12; const b = this.band, [gx, gz] = this.crawlGoal(b.x[0] + rng() * (b.x[1] - b.x[0]), b.z[0] + rng() * (b.z[1] - b.z[0]), rng); this.target.set(gx, floor, gz); }     // fetch a shell for the collection
      else if (S.t <= 0 && this.den && rng() < (this.shy ? 0.55 : 0.28) + 0.4 * sk + (this.mind?.type === 'homebody' ? 0.15 : 0)) this.goDen(S, rng);           // home to the den
      else if (S.t <= 0 && this.shy && rng() < 0.6) { S.s = 'crawl'; S.t = 6; const spots = this.getSpots?.() ?? [], s2 = spots.length ? spots[(rng() * spots.length) | 0] : null; const [gx, gz] = this.crawlGoal(s2 ? s2.x : -3 + rng() * 6, s2 ? s2.z - 0.6 : 0.3, rng); this.target.set(gx, floor, gz); S.t = 5; }
      else if (S.t <= 0 && !this.shy && rng() < (0.07 + 0.1 * this.bold + 0.12 * bo) * (1 - 0.8 * sk)) { S.s = 'dash'; S.t = 4; const b = this.band, [gx, gz] = this.crawlGoal(this.pos.x + (rng() < 0.5 ? -1 : 1) * (2 + rng() * 2), b.z[0] + rng() * (b.z[1] - b.z[0]), rng); this.target.set(gx, floor, gz); }
      else if (S.t <= 0 && !this.shy && !this.glassAt && rng() < 0.05 + 0.1 * this.bold + 0.08 * bo) { this.glassAt = { x: (rng() - 0.5) * 5, y: 2.2 + rng() * 5, until: performance.now() + 7000 + rng() * 6000 }; }      // the bold ones jet up to the glass on their own and hang there, arms pressed to it
      else if (S.t <= 0) { if (rng() < 0.4) { S.s = 'crawl'; S.t = 3 + rng() * 4; const spots = this.getSpots?.() ?? [], b = this.band, s = spots.length && rng() < 0.6 ? spots[(rng() * spots.length) | 0] : null; const [gx, gz] = this.crawlGoal(s ? s.x + (rng() - 0.5) * 1.2 : b.x[0] + rng() * (b.x[1] - b.x[0]), s ? s.z + 0.8 : b.z[0] + rng() * (b.z[1] - b.z[0]), rng); this.target.set(gx, floor, gz); } else { S.s = 'jet'; S.n = 2 + ((rng() * 2) | 0); S.t = 9; S.pulse = 0; const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), 3 + rng() * 6, b.z[0] + rng() * (b.z[1] - b.z[0])); } }
    } else if (S.s === 'crawl') {
      if (this.fears?.length && !S.fearChecked) { S.fearChecked = true; const nowt = performance.now(); this.fears = this.fears.filter((q) => nowt - q.t < 3e5); this.fearNear = false; for (const q of this.fears) if (Math.hypot(this.target.x - q.x, this.target.z - q.z) < 1.8 && S.mode !== 'den' && !(S.mode ?? '').startsWith('t')) { this.fearNear = true; const ax = this.target.x - q.x || 1, b = this.band; this.target.x = Math.max(b.x[0], Math.min(b.x[1], q.x + Math.sign(ax) * 2.4)); } }
      this.restK += (0.25 - this.restK) * Math.min(1, dt * 2); this.crawlK += (1 - this.crawlK) * Math.min(1, dt * 2);
      if (!S.gaitSet) { S.gaitSet = true; const r = rng(); this.gait = S.mode && S.mode[0] === 't' ? GAITS.stroll : r < 0.45 ? GAITS.stroll : r < 0.65 ? GAITS.creep : r < 0.83 ? GAITS.stilt : GAITS.bounce; }      // a stroll, a creep, up on stilts or a bouncing walk
      if (S.detour) S.detour.left -= dt; const det = S.detour && S.detour.left > 0 ? S.detour : null, goal = det ? _g.set(det.x, floor, det.z) : this.target;      // a detour is a sidestep around something in the way
      const to = goal.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = to.length() || 1, sp = 0.5 * this.speed * mul * (S.mode === 'hunt' ? (this.hunt?.run?.burst > 0 ? 2.1 : 1.5) : (this.gait?.sp ?? 1)); to.multiplyScalar(sp / d);
      // going in through the mouth of its den the walls are allowed to brush it; anywhere else it feels for what is ahead and slides along it rather than pushing into it
      this.homing = (S.mode === 'den' || S.mode === 'tsettle') && !!this.den?.home && d < 1.5;
      const W = Fish3D.world; let side = 0, sliding = false;
      if (W.push && !this.homing && d > this.cr + 0.7) {
        // whiskers: it feels ahead and round to both sides, and takes the cheapest way on: open sand first, then through soft plants, never into rock or shell or off the open floor.
        // The side it picks it keeps to, so it does not dither in front of something; straight on is free again, it lets the choice go
        const ux = to.x / (sp || 1), uz = to.z / (sp || 1), reach = Math.min(this.cr + 0.55, d - 0.1), soft = W.soft;      // it feels no further than where it is going
        const feel = (a) => { const c = Math.cos(a), sn = Math.sin(a), wx = ux * c - uz * sn, wz = ux * sn + uz * c; _p1.set(this.pos.x + wx * reach, this.pos.y + 0.15, this.pos.z + wz * reach);
          if ((_p1.z < 0.15 && _p1.z < this.pos.z - 0.05) || (_p1.z > 3.15 && _p1.z > this.pos.z + 0.05) || (Math.abs(_p1.x) > 4.6 && Math.abs(_p1.x) > Math.abs(this.pos.x) + 0.05)) return 1;      // the edges of the open sand are walls too
          _o.set(0, 0, 0); if (W.push(_p1, this.cr * 0.9, _o)) return 1; _o.set(0, 0, 0); return soft && soft.push(_p1, this.cr * 0.7, _o) ? 0.9 : 0; };
        const ahead = feel(0);
        if (ahead > 0) {
          let best = 0, bestCost = 1e9; const bias = S.sideBias ?? 0, dbg = window.__dbgWh ? [] : null;
          for (const a of [0, 0.75, -0.75, 1.45, -1.45, 2.4, -2.4]) { const cost = (a === 0 ? ahead : feel(a)) + 0.1 * Math.abs(a) + (bias && Math.sign(a) === -bias ? 0.35 : 0); if (dbg) dbg.push(+cost.toFixed(2)); if (cost < bestCost) { bestCost = cost; best = a; } }
          if (best !== 0) { S.sideBias = Math.sign(best); const c = Math.cos(best), sn = Math.sin(best), pull = Math.abs(best) > 2 ? 0 : 0.5; let wx = ux * c - uz * sn + ux * pull, wz = ux * sn + uz * c + uz * pull; const wm = Math.hypot(wx, wz) || 1; wx /= wm; wz /= wm; to.x = wx * sp * 0.85; to.z = wz * sp * 0.85; sliding = true; side = S.sideBias; }
          if (bestCost >= 1) { to.x = 0; to.z = 0; sliding = true; S.backT = (S.backT ?? 0) + dt * 2; }      // nothing passable anywhere: it stops pushing
          if (Math.abs(best) > 2) S.backT = (S.backT ?? 0) + dt; else if (bestCost < 1) S.backT = Math.max(0, (S.backT ?? 0) - dt * 0.5);
          if (S.backT > 1.2 && (!S.mode || S.mode === 'inspect' || S.mode === 'greet' || S.mode === 'carry1')) this.hop(S, rng);      // boxed in on foot: over the top instead
          if (dbg) S.wh = [best, ...dbg];
        } else { S.sideBias = 0; S.wh = null; } }
      this.vel.lerp(to, Math.min(1, dt * (S.mode === 'hunt' ? 2.6 : 1.6)));      // after a running crab it goes flat out
      if (this.pos.z < 0.15 && this.vel.z < 0) this.vel.z = 0; if (this.pos.z > 3.1 && this.vel.z > 0) this.vel.z = 0;      // the crawl stays on the open sand, never behind the scenery or into the glass
      // the watchdog: if it has barely moved for a couple of seconds, it is being held up by something. Sidestep once or twice; if that fails, give it up rather than push forever
      const dist = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z); if (S.prog && S.mode !== 'hunt' && Math.hypot(S.prog.tx - this.target.x, S.prog.tz - this.target.z) > 0.4) S.prog = null;      // a new goal is a fresh start (a running crab is not a new goal)
      const pr = (S.prog ||= { d: dist, t: 0, n: 0, v: 0, tx: this.target.x, tz: this.target.z, x: this.pos.x, z: this.pos.z }); pr.t += dt; pr.v += Math.hypot(this.vel.x, this.vel.z) * dt; if (sliding) pr.slid = true;
      if (pr.t > 2.5) {
        // what counts as progress: nearer its goal; after a crab, nearer the crab, and nothing is held against it while the crab is running
        const hd = S.mode === 'hunt' && this.hunt ? Math.hypot(this.hunt.x - this.pos.x, this.hunt.z - this.pos.z) : null;
        let gained = hd != null ? (this.hunt.run?.burst > 0 ? 1e9 : (pr.hd ?? hd) - hd) : pr.d - dist; const tried = pr.v;
        if ((sliding || pr.slid) && (pr.slidN = (pr.slidN ?? 0) + 1) <= 2) gained = Math.max(gained, Math.hypot(this.pos.x - pr.x, this.pos.z - pr.z)); else if (!(sliding || pr.slid)) pr.slidN = 0;      // working its way round something: getting about counts for a few seconds, then it has to be getting somewhere
        pr.hd = hd; pr.d = dist; pr.t = 0; pr.v = 0; pr.x = this.pos.x; pr.z = this.pos.z; pr.slid = false;
        if (gained > 0.3 * Math.max(tried, 0.05)) pr.n = 0; else if (!this.homing && d > 0.5) { pr.n++;      // barely moving while trying to crawl counts as held up too
          if (pr.n >= 3 && (!S.mode || S.mode === 'inspect' || S.mode === 'greet' || S.mode === 'carry1')) this.hop(S, rng);
          else if (pr.n >= 3) { pr.n = 0; S.detour = null; (this.failed ||= []).push({ x: this.target.x, z: this.target.z }); if (this.failed.length > 6) this.failed.shift(); if (S.mode === 'hunt') this.hunt = null; if (S.mode === 'tgo' || S.mode === 'thaul') this.onTask?.(this, 'abort'); if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 3 + rng() * 4; this.flush = Math.max(this.flush, 0.3); }
          else if (!sliding) { const L = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) || 1, px = -(this.target.z - this.pos.z) / L, pz = (this.target.x - this.pos.x) / L, sd = side || (rng() < 0.5 ? -1 : 1); S.detour = { x: Math.max(-3.5, Math.min(3.5, this.pos.x + px * sd * 1.5)), z: Math.max(0.2, Math.min(2.3, this.pos.z + pz * sd * 1.5)), left: 2.2 }; } } }
      if (S.mode === 'hunt' && this.hunt) { const h = this.hunt; this.target.set(Math.max(-3.6, Math.min(3.6, h.x - 0.4)), floor, Math.max(0.3, h.z - 1.0)); if (h.run?.burst > 0) S.t = Math.max(S.t, 5); }      // the crab is moving: keep aiming behind it, and do not give up while it runs
      if (S.t <= 0 && S.after && d > 0.6) { (this.failed ||= []).push({ x: S.after.x, z: S.after.z }); if (this.failed.length > 6) this.failed.shift(); S.after = null; }      // over the top and still not there in time: that spot is given up, and remembered
      if (S.t <= 0 || d < 0.35 || (S.mode === 'hunt' && d < 1.5) || ((S.mode === 'den' || S.mode === 'tsettle') && this.den?.home && d < 0.9)) { S.fearChecked = false;
        if (S.mode === 'den') { S.mode = null; S.s = 'rest'; S.t = 10 + rng() * 12; }
        else if (S.mode === 'denfront') { S.mode = 'den'; S.s = 'crawl'; S.t = 8; const [hx, hz] = this.denGoal(rng); this.target.set(hx, 0.55, hz); }      // at the mouth: now in
        else if (S.mode === 'tgo') { if (this.onTask?.(this, 'grab')) { const T = this.task; S.mode = 'thaul'; S.t = 25 + 16 * Math.hypot(T.gx - T.ax, T.gz - T.az); this.target.set(T.gx - T.ux * T.hold, floor, T.gz - T.uz * T.hold); } else { S.mode = null; S.s = 'rest'; S.t = 6; } }
        else if (S.mode === 'thaul') { const T = this.task, kind = T?.kind; if (this.onTask?.(this, 'drop') && kind === 'home') { S.mode = 'tsettle'; S.t = 14; this.target.set(T.gx, floor, T.gz + (T.type === 'pot' ? 0.5 : -0.25)); } else { S.mode = null; S.s = 'rest'; S.t = 10 + rng() * 8; this.flush = 0.5; } }
        else if (S.mode === 'tsettle') { this.onTask?.(this, 'home'); S.mode = null; S.s = 'rest'; S.t = 14 + rng() * 10; }
        else if (S.mode === 'carry1') { S.mode = 'carry2'; if (this.carryMesh) this.carryMesh.visible = true; S.t = 14; this.target.set(this.den.x + (rng() - 0.5) * 0.7, floor, this.den.z + 0.95); }
        else if (S.mode === 'carry2') { S.mode = null; if (this.carryMesh) this.carryMesh.visible = false; this.onDrop?.(this.pos); S.s = 'rest'; S.t = 6 + rng() * 8; }
        else if (S.mode && d < (S.mode === 'hunt' ? 1.6 : 1.3)) { S.s = 'work'; S.t = S.mode === 'greet' ? 6 : S.mode === 'inspect' ? 7 : S.mode === 'hunt' ? 1e9 : 1e9; if (S.mode === 'inspect') { this.inspectBlend = rng() < 0.45; const id = this.inspect?.id; if (id) { (this.likes ||= {})[id] = (this.likes[id] ?? 0) + 1; this.favDirty = true; } } }
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
      if (this.follow) { const o = this.follow; if (o.dead || S.t <= 0 || o.pos.distanceTo(this.pos) > 8) { this.follow = null; S.n = 0; this.actText = null; this.act = null; } else { const vl = Math.hypot(o.vel.x, o.vel.z), fx = vl > 0.05 ? o.vel.x / vl : Math.cos(o.heading), fz = vl > 0.05 ? o.vel.z / vl : -Math.sin(o.heading); this.target.set(o.pos.x - fx * 1.3, Math.max(1.2, Math.min(Fish3D.topY - 1.5, o.pos.y - 0.2)), Math.max(0.3, Math.min(2.6, o.pos.z - fz * 1.3))); if (S.pulse <= 0 && S.n <= 0 && this.target.distanceTo(this.pos) > 1.2) S.n = 1; } }      // tagging along behind a fish: a body length back, another pulse whenever it falls behind
      if (S.tour) { if (this.pos.distanceTo(this.target) < 1.0 || (S.n <= 0 && S.pulse <= -0.3)) { const nx = S.tour.shift(); if (nx) { this.target.set(nx[0], nx[1], nx[2]); S.n = 2; S.pulse = 0; } else { S.tour = null; this.act = null; this.actText = null; } } }
      { const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z; this.aimErr = 0; if (Math.hypot(tx, tz) > 0.12) { let dh = Math.atan2(-tz, tx) - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += Math.max(-dt * 3.4, Math.min(dt * 3.4, dh)); this.aimErr = Math.abs(dh); } }
      if (S.pulse <= 0 && S.n > 0 && this.aimErr < 0.55) {
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
      if (d < 0.4 && S.t > 2) { const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), floor, Math.max(0.4, Math.min(2.4, this.pos.z + (rng() - 0.5) * 1.5))); }
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
      _p2.set(lx * 0.14, (floor - this.pos.y) * 2, lz * 0.14); this.vel.lerp(_p2, Math.min(1, dt * 1.5)); if ((this.pos.x > 3.6 && this.vel.x > 0) || (this.pos.x < -3.6 && this.vel.x < 0)) this.vel.x = 0; if ((this.pos.z > 2.6 && this.vel.z > 0) || (this.pos.z < 0.4 && this.vel.z < 0)) this.vel.z = 0;
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
    this.sq = Math.max(0, this.sq - dt * 2.4); this.separate(others, 3);
    { const px = this.px ?? this.pos.x, pz = this.pz ?? this.pos.z; this.pos.addScaledVector(this.vel, dt); this.resolve(others); if (this.pos.y < floor) { this.pos.y = floor; if (this.vel.y < 0) this.vel.y = 0; }
      this.realSp = (this.realSp ?? 0) + (Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-3) - (this.realSp ?? 0)) * Math.min(1, dt * 6); this.px = this.pos.x; this.pz = this.pos.z; }      // how fast it is really getting along the floor
    const sp = this.face(dt, S.s === 'jet' ? 3 : 1.6);
    if (this.glassNear > 0.05) { let dh = -this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 3) * Math.max(0.3, this.glassNear); this.pitch *= Math.exp(-dt * 3); }
    const wantPitch = S.s === 'jet' ? Math.max(-0.9, Math.min(0.9, Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z) || 1))) : S.s === 'dash' ? 0.42 : S.s === 'jelly' ? -1.3 : 0; this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3); this.roll += (-Math.PI / 2 * this.glassNear - this.roll) * Math.min(1, dt * 3);
    this.phase += dt * (S.s === 'dash' ? 6.5 : S.s === 'crawl' ? 1.4 + 3.6 * Math.min(1, (this.realSp ?? 0) / 0.3) : S.s === 'jet' ? 2.5 : S.s === 'rest' ? 1.4 : S.s === 'work' ? 3.2 : 2.0);      // crawling, the arms walk as fast as the body actually moves: held up, they slow to a feel
    this.flush = Math.max(0, this.flush - dt * 0.35);
    { const spd = this.vel.length(); this.glideK += ((S.s === 'jet' ? Math.max(0, Math.min(1, (spd - 0.5) / 1.5)) : 0) - this.glideK) * Math.min(1, dt * 3); this.cruiseK += ((((S.s === 'jet' || S.s === 'drift') && spd < 1.2 && this.pos.y > floor + 0.5) ? 1 - spd / 1.2 : 0) - this.cruiseK) * Math.min(1, dt * 2);
      this.landK = Math.max(0, this.landK - dt * 1.2); this.dashK += ((S.s === 'dash' ? 1 : 0) - this.dashK) * Math.min(1, dt * 3.5);
      { const a = S.s; this.flatK += ((a === 'flat' || a === 'bury' ? 1 : 0) - this.flatK) * Math.min(1, dt * 1.5); this.lionK += ((a === 'lion' ? 1 : 0) - this.lionK) * Math.min(1, dt * 1.5); this.snakeK += ((a === 'snake' ? 1 : 0) - this.snakeK) * Math.min(1, dt * 1.5); this.jellyK += ((a === 'jelly' ? 1 : 0) - this.jellyK) * Math.min(1, dt * 1.2); this.kelpK += ((a === 'kelp' ? 1 : 0) - this.kelpK) * Math.min(1, dt * 1.2); this.puffK += ((a === 'jelly' || a === 'lion' ? 1 : 0) - this.puffK) * Math.min(1, dt * 1.5); if (a !== 'bury') this.sink += (0 - this.sink) * Math.min(1, dt * 3); }
      if (this.actFlash > 0) { this.actFlash -= dt; if (this.actFlash <= 0 && !this.act) this.actText = null; }
      this.lift = 0.32 * this.dashK + (this.gait?.lift ?? 0) * this.crawlK - 0.5 * this.sink;
      // the mantle is rigged too: it tips back when it jets, slumps a little at rest, rises on a dash, bobs with each step, and the head turns a touch toward what it is looking at
      const leanT = 0.16 * this.glideK - 0.05 * this.restK + 0.1 * this.dashK + 0.04 * Math.sin(this.tt * 0.7); this.lean = (this.lean ?? 0) + (leanT - (this.lean ?? 0)) * Math.min(1, dt * 3);
      this.yaw = (this.yaw ?? 0) + (this.lookX * 0.2 - (this.yaw ?? 0)) * Math.min(1, dt * 4); this.bob = Math.sin(this.phase * 0.15 * Math.PI * 4) * 0.45 * this.crawlK * (this.gait?.bob ?? 1); }
    // where he is looking: the crab, the jar, your finger, or a fish nearby; his pupils slide toward it (and drift back to centre when nothing interests him)
    this.lookT -= dt; if (this.lookT <= 0) {
      this.lookT = 0.15; const ch = Math.cos(this.heading), sh = Math.sin(this.heading); let tx = null, tz = 0;
      const L = this.watchFish && !this.watchFish.dead ? this.watchFish.pos : this.follow && !this.follow.dead ? this.follow.pos : this.hunt ? { x: this.hunt.x, y: 0.2, z: this.hunt.z } : this.jarAt ? { x: this.jarAt.x, y: 0.8, z: this.jarAt.z } : this.glassAt && performance.now() < this.glassAt.until ? { x: this.glassAt.x, y: this.glassAt.y, z: 3 } : null;
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
        m.next -= dt; if (m.until > 0 && calm) { m.until -= dt; m.k += (1 - m.k) * Math.min(1, dt * 3); } else { m.until = 0; m.k += (0 - m.k) * Math.min(1, dt * 2.2); } if (!calm || m.until > 0 || m.next > 0) return;
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
    { const bt = (this.camoK / 0.94) * (gnd?.kind === 'decor' ? 1 : 0.6); this.bump += (bt - this.bump) * Math.min(1, dt * 2); }       // the skin roughens as it blends in      // a slow, steady fade: about 2.3 seconds in, 1.4 out, eased when drawn
    if (this.camoT0 > 0.05 && this.camoK > 0.03) { const g = this.ground; if (g && g.key !== this.camoKey) { this.camoKey = g.key; this.camoSpec = g; this.camoPrev = this.camoK > 0.1 ? this.camoTex : null; this.camoMix = this.camoPrev ? 0 : 1; this.camoMixT = performance.now(); this.camoTex = null; this.camoApplied = -1; } }
    const moodMoved = ['scared', 'annoyed', 'hunting', 'fond'].some((k) => Math.abs(this.mw[k] - this.mwA[k]) > 0.02 || (k === 'hunting' && this.mw.hunting > 0.03));
    if (this.camoT0 > (this.sleepK > 0.05 ? 0.3 : 0.05) && !this.pale && (this.sleepK > 0.02 || this.sleepWas || Math.abs(this.camoK - this.camoApplied) > 0.012 || this.flush > 0 || this.flushApplied || this.camoMix < 1 || moodMoved || (this.camoT0 > 0.25 && this.camoK < 0.3))) { this.camoT0 = 0; this.sleepWas = this.sleepK > 0.02; this.applyCamo(); }
    { const tw = this.tuckWant ?? 0; this.tuckWant = 0; this.tuckK = (this.tuckK ?? 0) + (tw - (this.tuckK ?? 0)) * Math.min(1, dt * (tw ? 0.8 : 2.5)); const k = 1 - this.tuckK; this.group.scale.setScalar(k); this.lift -= 0.6 * (1 - k); }
    this.group.position.copy(this.pos); this.group.position.y += this.lift; this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > (1 / 20) * Fish3D.poseScale * (S.s === 'rest' && !this.glassNear && this.mw.scared < 0.1 ? 1.35 : 1)) { this.accum = 0; this.setPose(this.phase); }
  }
  update(dt, rng, others) {
    if (this.dead) return this.deadUpdate(dt);
    if (this.species.move === 'hover') return this.hoverUpdate(dt, rng, others);
    if (this.species.move === 'jet') return this.jetUpdate(dt, rng, others);
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
