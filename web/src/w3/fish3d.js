// Real 3D voxel fish: the species voxel models become instanced cubes that are lit,
// shadowed and animated (tail bend, fin flutter) in the scene, steered in 3D.
import * as THREE from 'three';
import { buildModel } from '../voxel.js';
import { genesOf } from '../game/genes.js';
import { patch } from './env.js';

const VOX = 0.052, GLOBAL = 1.05;
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

export class Fish3D {
  static world = { push: null };
  static poseScale = 1;                     // 1 at full quality; larger on slower phones, so the rig is posed less often
  static topY = 13.2;                       // the highest a fish may go: below the status bar and the phone's safe area, so nothing swims out of view
  static groundAt = null;                   // set by the scene: what the ground looks like at x,z, as { key, cols, scale }            // decoration colliders, set by the scene
  constructor(species, seed, opts = {}) {
    this.species = species; this.id = species.id;
    const model = buildModel(species.make(seed));
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
    { let sy = 0, n = 0; for (const v of this.vox) { if (v.tag === 'eye') { sy += v.y; n++; } v.pap = species.move === 'jet' && h3(v.x * 3, v.y * 5 + 1, v.z * 7) > 0.7; } this.eyeY = n ? sy / n : 0; } this.camoK = 0; this.camoApplied = 0; this.camoMix = 1; this.flush = 0; this.restFor = 0; this.camoT0 = 0; this.rp = [0, 0, 0]; }
    this.setPose(0, true);
    this.group = new THREE.Group(); this.group.add(this.mesh);
    // state
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(1, 0, 0); this.target = new THREE.Vector3();
    this.phase = Math.random() * 6; this.retarget = 0; this.heading = 0; this.pitch = 0; this.roll = 0;
    this.speed = opts.speed ?? 1; this.band = opts.band ?? { x: [-3.6, 3.6], y: [2, 13], z: [0.4, 1.9] };
    this.name = opts.name ?? species.label; this.profile = opts.profile; this.radius = (species.length ?? 50) * (species.vox ?? VOX) * GLOBAL * (opts.scale ?? 1) * 0.55; this.accum = 0; this.cool = 0; this.baseScale = (opts.scale ?? 1) * (this.size ?? 1); this.cr = Math.max(0.2, this.radius * 0.3);
  }
  // growth: baby -> juvenile -> adult changes the fish's size
  setGrowth(k) { this.growth = k; this.scale = k * (this.species.vox ?? VOX) * GLOBAL * (this.baseScale ?? 1); this.radius = (this.species.length ?? 50) * (this.species.vox ?? VOX) * GLOBAL * k * (this.baseScale ?? 1) * 0.55; this.cr = Math.max(0.2, this.radius * 0.3); this.setPose(this.phase, true); }
  // write per-voxel transforms for a tail phase
  setPose(phase, all = false) {
    const b = this.sp.bend, s = this.scale, arr = this.mesh.instanceMatrix.array, jet = this.species.move === 'jet';
    const list = all ? null : this.mobile;
    const n = all ? this.vox.length : list.length;
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
          const S = this.rs; S.rest = this.restK; S.crawl = this.crawlK; S.sq = this.sq; S.ph = phase; S.work = this.workK; S.greet = this.greetK; S.glass = this.glassNear; S.stride = this.stride; S.glide = this.glideK; S.cruise = this.cruiseK; S.land = this.landK; S.dash = this.dashK; this.rig.pose(this.rig.arms[v.arm], v.at, S, this.rp);
          const k = 1 - 0.2 * this.sq; x = this.rp[0] + v.off[0] * k; y = this.rp[1] + v.off[1] * k; z = this.rp[2] + v.off[2] * k;
        }
        else if (v.tag === 'arm') { z *= 1 + 0.75 * this.restK + 0.35 * this.crawlK - 0.62 * this.sq; y = y * (1 - 0.42 * this.restK - 0.2 * this.crawlK - 0.3 * this.sq) - 1.2 * this.restK; if (this.crawlK) y += Math.sin(phase * 1.3 + z * 0.5) * 0.9 * this.crawlK * (v.wave || 0); }
        else { const k = 1 - 0.15 * this.sq + (0.025 + 0.02 * this.restK) * Math.sin((this.tt ?? 0) * (1.8 - 0.9 * this.sleepK));      // he breathes, slower when asleep
           x = this.mcx + (x - this.mcx) * (1 + 0.06 * this.sq + 0.13 * this.glideK); y = this.mcy + (y - this.mcy) * k * (1 - 0.1 * this.restK) * (1 - 0.05 * this.glideK); z *= k * (1 - 0.05 * this.glideK); if (v.pap && this.bump > 0.03) { const bb = this.bump * 1.3; x += v.nx * bb; y += v.ny * bb; z += v.nz * bb; } }
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
    if (W.push && !this.homing) for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const off of [-0.8, -0.4, 0, 0.4, 0.8]) {                        // samples down the length of the body
        _p1.set(this.pos.x + fx * R * off, this.pos.y + fy * R * off, this.pos.z + fz * R * off); _o.set(0, 0, 0);
        const n = W.push(_p1, this.cr, _o);
        if (n) { const m = _o.length() || 1, step = Math.min(0.25, 0.04 * n + 0.04); this.pos.addScaledVector(_o, step / m); moved = true; }
      }
      if (!moved) break;
    }
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
  // catching a crab: the nearest arm reaches out, closes on it, carries it under the head to the beak, and it is eaten. The arm tip is steered toward each stage's target,
  // and the crab rides on the real tip of the arm.
  updateGrab(dt, S) {
    const h = this.hunt, sc = this.scale || 0.06, ch = Math.cos(this.heading), sh = Math.sin(this.heading), rig = this.rig; if (!h || !rig) return;
    const dx = h.x - this.pos.x, dz = h.z - this.pos.z, C = [(dx * ch - dz * sh) / sc, (0.2 - this.pos.y) / sc, (dx * sh + dz * ch) / sc], M = [4, -6.6, 0];
    let G = this.rs.grab; if (!G) {
      const ang = Math.atan2(C[2], C[0] - 3); let best = 0, bd = 9; rig.arms.forEach((a, i) => { const d = Math.abs(Math.atan2(Math.sin(a.th - ang), Math.cos(a.th - ang))); if (d < bd) { bd = d; best = i; } });
      const p0 = rig.pose(rig.arms[best], 1, { rest: 1, crawl: 0, sq: 0, ph: 0 }, [0, 0, 0]); G = this.rs.grab = { arm: best, n1: (best + 1) % 8, n2: (best + 7) % 8, p: [...p0], p0: [...p0], w: 0, t: 0 };
    }
    if (h.y > 0.25) { G.t = 0; G.w = 0; return; }                                                            // wait for the crab to land
    G.t += dt; const t = G.t, e = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };
    let T; if (t < 1.1) { const q = e(t / 1.1); T = [G.p0[0] + (C[0] - G.p0[0]) * q, G.p0[1] + (C[1] - G.p0[1]) * q + Math.sin(q * Math.PI) * 3, G.p0[2] + (C[2] - G.p0[2]) * q]; }
    else if (t < 1.5) T = C; else if (t < 2.8) { const q = e((t - 1.5) / 1.3); T = [C[0] + (M[0] - C[0]) * q, C[1] + (M[1] - C[1]) * q + Math.sin(q * Math.PI) * 4, C[2] + (M[2] - C[2]) * q]; } else T = M;
    G.w = Math.min(1, t / 0.3) * (t > 3.3 ? Math.max(0, 1 - (t - 3.3) / 0.35) : 1);
    const S0 = this.rs, tip = rig.pose(rig.arms[G.arm], 1, S0, this.rp); G.p[0] += (T[0] - tip[0]) * Math.min(1, dt * 6); G.p[1] += (T[1] - tip[1]) * Math.min(1, dt * 6); G.p[2] += (T[2] - tip[2]) * Math.min(1, dt * 6);
    if (t > 1.3 && h.mesh) {                                                                                 // the crab is in the arm's grip
      h.y = 0.2; h.held = true; const x = tip[0] * sc, z = tip[2] * sc; h.mesh.position.set(this.pos.x + x * ch + z * sh, this.pos.y + tip[1] * sc + 0.05, this.pos.z - x * sh + z * ch); h.mesh.rotation.z = Math.min(0.7, (t - 1.3) * 0.6);
      if (t > 2.8) h.mesh.scale.setScalar(Math.max(0.01, 1.7 * (1 - (t - 2.8) / 0.5)));
    }
    if (t >= 3.65) { S.t = 0; }
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
    else { const R = (this.rs.jr ?? 12) * 0.92, a = Math.PI + G.a0 + Math.sin(G.t * 1.7) * 0.8; T = [(this.rs.jx ?? 14) + Math.cos(a) * R * 0.8, (1.25 - this.pos.y) / sc, (this.rs.jz ?? 0) + Math.sin(a) * R * 0.8]; G.w = Math.min(1, G.t / 0.8); }
    const tip = rig.pose(rig.arms[G.arm], 1, this.rs, this.rp), k = Math.min(1, dt * 6); for (let i = 0; i < 3; i++) G.p[i] += (T[i] - tip[i]) * k;
    if (kind === 'carry' && this.carryMesh) { this.carryMesh.visible = true; this.carryMesh.position.set(tip[0] * sc, tip[1] * sc, tip[2] * sc); }       // the shell sits in the arm
  }
  // being poked: a few taps in a row and he gets annoyed (dark skin, a squirt); something sudden makes him startle, pale, and jet away
  poke() { this.wakeT = 6; this.pokes++; this.pokeT = 12; if (this.pokes >= 4) { this.pokes = 0; this.annoyT = 8; this.fearHere(); return true; } return false; }
  // where it settles at its den: inside the mouth of a coconut or pot it moved into, between the rocks of a shelter it built, or just in front of anything else
  denGoal(rng) { const d = this.den; return d.home ? [d.x, d.z + (d.kind === 'pot' ? 0.5 : 0.45)] : d.kind === 'rocks' ? [d.x, d.z] : [d.x + (rng() - 0.5) * 0.6, d.z + 0.85]; }
  goDen(S, rng, t = 12) { S.mode = 'den'; S.s = 'crawl'; S.t = t; const [x, z] = this.denGoal(rng); this.target.set(x, 0.55, z); }
  startTask(T) { const S = (this.st ||= { s: 'rest', t: 1, n: 0, pulse: 0 }); this.task = T; S.mode = 'tgo'; S.s = 'crawl'; S.t = 20 + 12 * Math.hypot(T.ax - this.pos.x, T.az - this.pos.z); this.target.set(T.ax, 0.55, T.az); }
  fearHere() { (this.fears ||= []).push({ x: this.pos.x, z: this.pos.z, t: performance.now() }); if (this.fears.length > 4) this.fears.shift(); }
  startle(from) {
    this.fearHere(); this.scareT = 2.6; this.wakeT = 8; if (this.onInk) this.onInk(this.pos); const S = this.st; if (S && (S.s === 'rest' || S.s === 'crawl') && !this.seeking) { S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 4; S.mode = null; const b = this.band; this.target.set(Math.max(-3.5, Math.min(3.5, this.pos.x + (from && from.x > this.pos.x ? -2.4 : 2.4))), Math.min(6, this.pos.y + 2.2), this.pos.z); this.sq = 1; }
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
    if (want && S.mode !== want && S.s !== 'jet' && !this.seeking) { S.mode = want; S.s = 'crawl'; S.t = 16; const p = want === 'jar' ? this.jarAt : want === 'hunt' ? this.hunt : this.inspect; this.target.set(p.x - (want === 'jar' ? 0.55 : want === 'hunt' ? 0.45 : 0.7), floor, p.z + (want === 'jar' ? 0.7 : want === 'hunt' ? 0.35 : 0.9)); }
    if (!want && (S.mode === 'jar' || S.mode === 'hunt' || S.mode === 'inspect')) { if (S.mode === 'jar' && S.s === 'work') { this.flush = 1; S.s = 'jet'; S.n = 1; S.pulse = 0; S.t = 5; this.target.set(this.pos.x + (this.pos.x > 0 ? -1 : 1) * 1.5, this.pos.y + 2.5, this.pos.z); } else if (S.s === 'work' || S.s === 'crawl') { S.s = 'rest'; S.t = 3; } S.mode = null; }
    if (S.mode === 'jar' && this.jarAt) { const sc = this.scale || 0.06, dx = this.jarAt.x - this.pos.x, dz = this.jarAt.z - this.pos.z, ch = Math.cos(this.heading), sh = Math.sin(this.heading); this.rs.jx = (dx * ch - dz * sh) / sc; this.rs.jz = (dx * sh + dz * ch) / sc; this.rs.jr = 0.58 / sc; } else this.rs.jr = 0;
    if (S.s !== 'work') { this.workK += (0 - this.workK) * Math.min(1, dt * 3); this.greetK += (0 - this.greetK) * Math.min(1, dt * 3); }
    if (S.s === 'rest') this.restFor += dt; else { this.restFor = 0; this.homing = false; }
    const gl = this.glassAt && performance.now() < this.glassAt.until ? this.glassAt : null;                               // a finger held on the glass: the octopus comes to press its arms against it
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
      if (S.mode === 'greet') this.greetK += (1 - this.greetK) * Math.min(1, dt * 2); else this.workK += ((S.mode === 'inspect' ? 0.65 : 1) - this.workK) * Math.min(1, dt * 2);
      if (jar) { let dy = Math.atan2(-(jar.z - this.pos.z), jar.x - this.pos.x) - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 2.2); }
      else if (S.mode === 'greet') { let dy = Math.atan2(-1, 0) * -1 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.6); }          // faces the glass
      if (S.mode === 'hunt' && S.t <= 0 && this.hunt) { this.onEat?.(this.hunt); this.hunt = null; this.flush = 1; }
      if (S.mode !== 'jar' && S.t <= 0) { if (S.mode === 'inspect') this.inspect = null; S.mode = null; S.s = 'rest'; S.t = 4 + rng() * 5; }
    } else if (S.s === 'glass') {
      /* handled above */
    } else if (S.s === 'rest') {
      this.vel.multiplyScalar(Math.exp(-3 * dt)); this.restK += (1 - this.restK) * Math.min(1, dt * 1.5); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      if (!onFloor) this.vel.y -= 0.5 * dt;
      this.homing = false;
      if (this.den?.home) { const [hx, hz] = this.denGoal(rng); if (Math.hypot(this.pos.x - hx, this.pos.z - hz) < 0.9) { let dy = Math.PI / 2 - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 1.2); this.homing = true; this.tuckWant = this.den.kind === 'pot' ? 0.44 : 0.34; this.pos.x += (hx - this.pos.x) * Math.min(1, dt * 1.5); this.pos.z += (hz - this.pos.z) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-6 * dt)); } }       // in its shell or pot it faces the room and squeezes itself in; soft-bodied, it is not pushed out by the walls
      const M = { ...(this.mind ?? { cur: 0.5, soc: 0.5, tidy: 0.5 }) }, sk = this.sulk ?? 0, bo = this.bored ?? 0, au = this.audience ?? 0; M.cur = Math.min(1, M.cur * (1 - sk) + 0.5 * bo); M.soc = M.soc * (1 - 0.5 * sk) + 0.25 * au;
      if (onFloor && S.t > 6 && this.den == null) { const q = (this.fav ||= { x: this.pos.x, z: this.pos.z, n: 0 }); q.n = Math.min(40, q.n + dt); const w = Math.min(0.02, dt * 0.01); if (this.restFor > 8) { q.x += (this.pos.x - q.x) * w; q.z += (this.pos.z - q.z) * w; this.favDirty = true; } }
      const near = S.t <= 0 && others.some((o) => o !== this && !o.dead && !o.visitor && o.pos.distanceTo(this.pos) < 1.5);
      if (S.t <= 0 && this.isNight && this.den && !S.mode && Math.hypot(this.pos.x - this.den.x, this.pos.z - this.den.z) > 1.4 && rng() < 0.7) this.goDen(S, rng);     // it turns in at its den for the night
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && !this.den && this.fav && this.fav.n > 12 && Math.hypot(this.pos.x - this.fav.x, this.pos.z - this.fav.z) > 1.2 && rng() < 0.2) { S.s = 'crawl'; S.t = 8; this.target.set(this.fav.x, floor, this.fav.z); }     // no den yet: it goes back to its favourite spot
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.16 * M.cur) { const sp = this.getSpots?.() ?? [], fv = this.likes && rng() < 0.55 ? sp.find((x) => x.id === Object.entries(this.likes).sort((a, b) => b[1] - a[1])[0]?.[0]) : null, q = fv ?? (sp.length ? sp[(rng() * sp.length) | 0] : null); if (q) this.inspect = { x: q.x, z: q.z, id: q.id }; }                       // curious ones go and look at things on their own, and keep going back to a favourite
      else if (S.t <= 0 && !this.shy && !this.inspect && !S.mode && rng() < 0.12 * M.soc) { const fs = others.filter((o) => o !== this && !o.dead && !o.visitor); if (fs.length) { const o = fs[(rng() * fs.length) | 0]; this.inspect = { x: o.pos.x, z: o.pos.z }; } }       // sociable ones go to see the other fish
      else if (near && M.soc < 0.4 && this.den && rng() < 0.5) this.goDen(S, rng, 10);     // a loner leaves when it gets crowded
      else if (S.t <= 0 && (this.bondMe >= 3 || (au >= 1 && this.bondMe >= 1)) && !this.shy && rng() < 0.12 + 0.35 * M.soc + (this.mind?.type === 'showoff' ? 0.25 * au : 0)) { S.mode = 'greet'; S.s = 'crawl'; S.t = 10; this.target.set((rng() - 0.5) * 3, floor, 2.4); }
      else if (S.t <= 0 && this.den && this.hoard > 0 && !this.shy && rng() < 0.05 + 0.3 * (this.mind?.tidy ?? 0.4)) { S.mode = 'carry1'; S.s = 'crawl'; S.t = 12; const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), floor, b.z[0] + rng() * (b.z[1] - b.z[0])); }     // fetch a shell for the collection
      else if (S.t <= 0 && this.den && rng() < (this.shy ? 0.55 : 0.28) + 0.4 * sk + (this.mind?.type === 'homebody' ? 0.15 : 0)) this.goDen(S, rng);           // home to the den
      else if (S.t <= 0 && this.shy && rng() < 0.6) { S.s = 'crawl'; S.t = 6; const spots = this.getSpots?.() ?? [], s2 = spots.length ? spots[(rng() * spots.length) | 0] : null; this.target.set(s2 ? s2.x : -3 + rng() * 6, floor, s2 ? s2.z - 0.6 : -1.5); S.t = 5; }
      else if (S.t <= 0 && !this.shy && rng() < (0.07 + 0.1 * this.bold + 0.12 * bo) * (1 - 0.8 * sk)) { S.s = 'dash'; S.t = 4; const b = this.band; this.target.set(Math.max(b.x[0], Math.min(b.x[1], this.pos.x + (rng() < 0.5 ? -1 : 1) * (2 + rng() * 2))), floor, b.z[0] + rng() * (b.z[1] - b.z[0])); }
      else if (S.t <= 0) { if (rng() < 0.5) { S.s = 'crawl'; S.t = 3 + rng() * 4; const spots = this.getSpots?.() ?? [], b = this.band, s = spots.length && rng() < 0.6 ? spots[(rng() * spots.length) | 0] : null; this.target.set(s ? s.x + (rng() - 0.5) * 1.2 : b.x[0] + rng() * (b.x[1] - b.x[0]), floor, s ? s.z + 0.8 : b.z[0] + rng() * (b.z[1] - b.z[0])); } else { S.s = 'jet'; S.n = 2 + ((rng() * 2) | 0); S.t = 9; S.pulse = 0; const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), 3 + rng() * 6, b.z[0] + rng() * (b.z[1] - b.z[0])); } }
    } else if (S.s === 'crawl') {
      if (this.fears?.length && !S.fearChecked) { S.fearChecked = true; const nowt = performance.now(); this.fears = this.fears.filter((q) => nowt - q.t < 3e5); this.fearNear = false; for (const q of this.fears) if (Math.hypot(this.target.x - q.x, this.target.z - q.z) < 1.8 && S.mode !== 'den' && !(S.mode ?? '').startsWith('t')) { this.fearNear = true; const ax = this.target.x - q.x || 1, b = this.band; this.target.x = Math.max(b.x[0], Math.min(b.x[1], q.x + Math.sign(ax) * 2.4)); } }
      this.restK += (0.25 - this.restK) * Math.min(1, dt * 2); this.crawlK += (1 - this.crawlK) * Math.min(1, dt * 2);
      const to = this.target.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = to.length() || 1; to.multiplyScalar((0.5 * this.speed * mul) / d); this.vel.lerp(to, Math.min(1, dt * 1.6));
      if (S.t <= 0 || d < 0.35 || ((S.mode === 'den' || S.mode === 'tsettle') && this.den?.home && d < 0.9)) { S.fearChecked = false;
        if (S.mode === 'den') { S.mode = null; S.s = 'rest'; S.t = 10 + rng() * 12; }
        else if (S.mode === 'tgo') { if (this.onTask?.(this, 'grab')) { const T = this.task; S.mode = 'thaul'; S.t = 25 + 16 * Math.hypot(T.gx - T.ax, T.gz - T.az); this.target.set(T.gx - T.ux * T.hold, floor, T.gz - T.uz * T.hold); } else { S.mode = null; S.s = 'rest'; S.t = 6; } }
        else if (S.mode === 'thaul') { const T = this.task, kind = T?.kind; if (this.onTask?.(this, 'drop') && kind === 'home') { S.mode = 'tsettle'; S.t = 14; this.target.set(T.gx, floor, T.gz + (T.type === 'pot' ? 0.5 : 0.45)); } else { S.mode = null; S.s = 'rest'; S.t = 10 + rng() * 8; this.flush = 0.5; } }
        else if (S.mode === 'tsettle') { this.onTask?.(this, 'home'); S.mode = null; S.s = 'rest'; S.t = 14 + rng() * 10; }
        else if (S.mode === 'carry1') { S.mode = 'carry2'; if (this.carryMesh) this.carryMesh.visible = true; S.t = 14; this.target.set(this.den.x + (rng() - 0.5) * 0.7, floor, this.den.z + 0.95); }
        else if (S.mode === 'carry2') { S.mode = null; if (this.carryMesh) this.carryMesh.visible = false; this.onDrop?.(this.pos); S.s = 'rest'; S.t = 6 + rng() * 8; }
        else if (S.mode && d < 1.2) { S.s = 'work'; S.t = S.mode === 'greet' ? 6 : S.mode === 'inspect' ? 7 : S.mode === 'hunt' ? 1e9 : 1e9; if (S.mode === 'inspect') { this.inspectBlend = rng() < 0.45; const id = this.inspect?.id; if (id) { (this.likes ||= {})[id] = (this.likes[id] ?? 0) + 1; this.favDirty = true; } } }
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
      { const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z; this.aimErr = 0; if (Math.hypot(tx, tz) > 0.12) { let dh = Math.atan2(-tz, tx) - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += Math.max(-dt * 3.4, Math.min(dt * 3.4, dh)); this.aimErr = Math.abs(dh); } }
      if (S.pulse <= 0 && S.n > 0 && this.aimErr < 0.55) {
        S.n--; S.pulse = (1.5 + rng() * 0.7) * (1.15 - 0.3 * this.bold); const vy = Math.max(-0.3, Math.min(0.8, (this.target.y - this.pos.y) * 0.35 + 0.25)), dir = _p2.set(Math.cos(this.heading), vy, -Math.sin(this.heading)).normalize();
        this.vel.addScaledVector(dir, 2.6 * this.speed * Math.max(0.5, mul) * (0.9 + 0.25 * this.bold)); this.sq = 1; this.onPush?.(this.pos, dir);
      }
      this.vel.multiplyScalar(Math.exp(-1.25 * dt)); if (!this.seeking) this.vel.y -= 0.12 * dt;
      if (this.seeking) { const to = this.target.clone().sub(this.pos); if (to.length() > 0.2) this.vel.addScaledVector(to.normalize(), 0.8 * dt * this.speed); }
      if (S.n <= 0 && S.pulse <= -0.6 && !this.seeking) { S.s = 'drift'; S.t = 6; }
    } else {                                                                  // drift: arms trail and it sinks back toward the bottom
      this.restK += (0.2 - this.restK) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-1.0 * dt)); this.vel.y -= 0.35 * dt;
      if (this.pos.y < floor + 0.4 || S.t <= 0) { S.s = 'rest'; S.t = (4 + rng() * 8) * (1.3 - 0.6 * this.bold); if (this.vel.y < -0.05) this.landK = 1; }
    }
    this.sq = Math.max(0, this.sq - dt * 2.4); this.separate(others, 3);
    this.pos.addScaledVector(this.vel, dt); this.resolve(others); if (this.pos.y < floor) { this.pos.y = floor; if (this.vel.y < 0) this.vel.y = 0; }
    const sp = this.face(dt, S.s === 'jet' ? 3 : 1.6);
    if (this.glassNear > 0.05) { let dh = -this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); this.heading += dh * Math.min(1, dt * 3) * Math.max(0.3, this.glassNear); this.pitch *= Math.exp(-dt * 3); }
    const wantPitch = S.s === 'jet' ? Math.max(-0.9, Math.min(0.9, Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z) || 1))) : S.s === 'dash' ? 0.42 : 0; this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3); this.roll += (-Math.PI / 2 * this.glassNear - this.roll) * Math.min(1, dt * 3);
    this.phase += dt * (S.s === 'dash' ? 6.5 : S.s === 'crawl' ? 5 : S.s === 'jet' ? 2.5 : S.s === 'rest' ? 1.4 : S.s === 'work' ? 3.2 : 2.0);
    this.flush = Math.max(0, this.flush - dt * 0.35);
    { const spd = this.vel.length(); this.glideK += ((S.s === 'jet' ? Math.max(0, Math.min(1, (spd - 0.5) / 1.5)) : 0) - this.glideK) * Math.min(1, dt * 3); this.cruiseK += ((((S.s === 'jet' || S.s === 'drift') && spd < 1.2 && this.pos.y > floor + 0.5) ? 1 - spd / 1.2 : 0) - this.cruiseK) * Math.min(1, dt * 2);
      this.landK = Math.max(0, this.landK - dt * 1.2); this.dashK += ((S.s === 'dash' ? 1 : 0) - this.dashK) * Math.min(1, dt * 3.5); this.lift = 0.32 * this.dashK; }
    // where he is looking: the crab, the jar, your finger, or a fish nearby; his pupils slide toward it (and drift back to centre when nothing interests him)
    this.lookT -= dt; if (this.lookT <= 0) {
      this.lookT = 0.15; const ch = Math.cos(this.heading), sh = Math.sin(this.heading); let tx = null, tz = 0;
      const L = this.hunt ? { x: this.hunt.x, y: 0.2, z: this.hunt.z } : this.jarAt ? { x: this.jarAt.x, y: 0.8, z: this.jarAt.z } : this.glassAt && performance.now() < this.glassAt.until ? { x: this.glassAt.x, y: this.glassAt.y, z: 3 } : null;
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
    this.scareT = Math.max(0, this.scareT - dt); this.annoyT = Math.max(0, this.annoyT - dt); this.pokeT -= dt; if (this.pokeT <= 0) this.pokes = 0;
    { const mt = { scared: this.scareT > 0 ? 1 : 0, annoyed: this.annoyT > 0 ? 1 : 0, hunting: this.hunt || (S.s === 'jet' && this.seeking) ? 1 : 0, fond: (S.s === 'work' && S.mode === 'greet') || S.s === 'glass' || this.fondFocus ? 1 : 0 };
      for (const k in mt) this.mw[k] += (mt[k] - this.mw[k]) * Math.min(1, dt * (k === 'scared' ? 6 : 1.6)); }
    // camouflage has a reason: it blends in with what it is touching or sitting on. When it settles down against an object (a rock, a plant, a pillar, hiding in it) or on the sand,
    // it decides whether to bother (more often when shy or tucked into something, less often on open sand); it never does it while moving, working or greeting.
    this.camoSense = (this.camoSense ?? 0) - dt; if (this.camoSense <= 0) { this.camoSense = 0.25; this.ground = S.s === 'rest' || (S.s === 'work' && S.mode === 'inspect') ? Fish3D.groundAt?.(this.pos.x, this.pos.z) ?? null : null; }
    const gnd = this.ground, ctx = gnd ? gnd.ctx : null;
    if (ctx !== this.camoCtx) { this.camoCtx = ctx; this.ctxT = 0; if (ctx) { const onObject = gnd.kind === 'decor'; this.camoWill = rng() < (this.shy || (this.sulk ?? 0) > 0.5 ? 0.95 : onObject ? 0.8 : 0.5); this.camoDelay = 1.2 + rng() * 2.6; } else this.camoWill = false; }   // a new place: choose whether to blend in here
    this.ctxT = (this.ctxT ?? 0) + dt;
    const hiding = S.s === 'work' && S.mode === 'inspect' && this.inspectBlend && gnd?.kind === 'decor';             // sometimes it settles beside the new thing and takes on its look
    const camoT = (S.s === 'rest' && !this.flush && this.camoWill && this.ctxT > this.camoDelay && gnd) || hiding ? 0.94 : 0;
    this.camoK += Math.max(-dt * 0.7, Math.min(dt * 0.4, camoT - this.camoK)); this.camoT0 += dt;
    { const bt = (this.camoK / 0.94) * (gnd?.kind === 'decor' ? 1 : 0.6); this.bump += (bt - this.bump) * Math.min(1, dt * 2); }       // the skin roughens as it blends in      // a slow, steady fade: about 2.3 seconds in, 1.4 out, eased when drawn
    if (this.camoT0 > 0.05 && this.camoK > 0.03) { const g = this.ground; if (g && g.key !== this.camoKey) { this.camoKey = g.key; this.camoSpec = g; this.camoPrev = this.camoK > 0.1 ? this.camoTex : null; this.camoMix = this.camoPrev ? 0 : 1; this.camoMixT = performance.now(); this.camoTex = null; this.camoApplied = -1; } }
    const moodMoved = ['scared', 'annoyed', 'hunting', 'fond'].some((k) => Math.abs(this.mw[k] - this.mwA[k]) > 0.02 || (k === 'hunting' && this.mw.hunting > 0.03));
    if (this.camoT0 > (this.sleepK > 0.05 ? 0.3 : 0.05) && !this.pale && (this.sleepK > 0.02 || this.sleepWas || Math.abs(this.camoK - this.camoApplied) > 0.012 || this.flush > 0 || this.flushApplied || this.camoMix < 1 || moodMoved)) { this.camoT0 = 0; this.sleepWas = this.sleepK > 0.02; this.applyCamo(); }
    { const tw = this.tuckWant ?? 0; this.tuckWant = 0; this.tuckK = (this.tuckK ?? 0) + (tw - (this.tuckK ?? 0)) * Math.min(1, dt * (tw ? 0.8 : 2.5)); const k = 1 - this.tuckK; this.group.scale.setScalar(k); this.lift -= 0.6 * (1 - k); }
    this.group.position.copy(this.pos); this.group.position.y += this.lift; this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > (1 / 20) * Fish3D.poseScale * (S.s === 'rest' && !this.glassNear && this.mw.scared < 0.1 ? 1.35 : 1)) { this.accum = 0; this.setPose(this.phase); }
  }
  update(dt, rng, others) {
    if (this.dead) return this.deadUpdate(dt);
    if (this.species.move === 'hover') return this.hoverUpdate(dt, rng, others);
    if (this.species.move === 'jet') return this.jetUpdate(dt, rng, others);
    this.retarget -= dt;
    if (!this.seeking && (this.retarget <= 0 || this.pos.distanceTo(this.target) < 0.5)) this.pick(rng);
    const desired = this.target.clone().sub(this.pos); const d = desired.length() || 1;
    this.idle = (this.idle ?? 0) - dt; this.fleeT = (this.fleeT ?? 0) - dt;
    desired.multiplyScalar(this.speed * (this.tmul ?? 1) * (this.idle > 0 ? 0.3 : 1) * (this.fleeT > 0 ? 1.6 : 1) * (this.mul ?? 1) * (this.vigor ?? 1) * (this.foodMul ?? 1) * (this.seeking ? Math.min(1, 0.45 + d * 0.35) : d < 2 ? 0.6 + d * 0.2 : 1) / d);
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
    const vmax = this.speed * 1.4 * (this.tmul ?? 1) * (this.fleeT > 0 ? 1.6 : 1); if (this.vel.length() > vmax) this.vel.setLength(vmax);
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
