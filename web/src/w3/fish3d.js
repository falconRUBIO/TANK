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

export class Fish3D {
  static world = { push: null };            // decoration colliders, set by the scene
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
      if (!v.thin) { nrm[i * 3] = v.nx; nrm[i * 3 + 1] = v.ny; nrm[i * 3 + 2] = v.nz; if (species.move === 'jet' && v.arm < 0 && v.ny < 0) { const ny = v.ny * 0.3, m = Math.hypot(v.nx, ny, v.nz) || 1; nrm[i * 3] = v.nx / m; nrm[i * 3 + 1] = ny / m; nrm[i * 3 + 2] = v.nz / m; }   // the underside is not left in the dark when the arms are away
      if (v.arm >= 0) { const a = 0.5, nx = v.nx * a, ny = v.ny * a + 0.5, nz = v.nz * a, m = Math.hypot(nx, ny, nz) || 1; nrm[i * 3] = nx / m; nrm[i * 3 + 1] = ny / m; nrm[i * 3 + 2] = nz / m; } }   // arms move, so light them from above in every pose
    });
    this.mesh.geometry.setAttribute('aN', new THREE.InstancedBufferAttribute(nrm, 3));
    this.baseCol = Float32Array.from(this.mesh.instanceColor.array);
    this.mobile = [];
    this.vox.forEach((v, i) => { if (species.move === 'jet' || (this.sp.bend && v.x + this.cx < this.sp.bend.pivot) || v.flap || v.wave) this.mobile.push(i); });
    this.sq = 0; this.restK = 0; this.crawlK = 0; { const mc = this.sp.mantleC ?? [3, 7]; this.mcx = mc[0] - this.cx; this.mcy = mc[1] - (this.sp.center?.[1] ?? 0); this.rig = this.sp.rig ?? null; this.rs = { rest: 0, crawl: 0, sq: 0, ph: 0 }; this.rp = [0, 0, 0]; }
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
      if (jet) {                                                           // octopus: arms spread flat at rest and stream back tight in a jet, the mantle squeezes with each pulse
        if (v.arm >= 0 && this.rig) {                                      // a rigged arm: its centre line is posed for the current state and the voxel keeps its offset from it
          const S = this.rs; S.rest = this.restK; S.crawl = this.crawlK; S.sq = this.sq; S.ph = phase; this.rig.pose(this.rig.arms[v.arm], v.at, S, this.rp);
          const k = 1 - 0.2 * this.sq; x = this.rp[0] + v.off[0] * k; y = this.rp[1] + v.off[1] * k; z = this.rp[2] + v.off[2] * k;
        }
        else if (v.tag === 'arm') { z *= 1 + 0.75 * this.restK + 0.35 * this.crawlK - 0.62 * this.sq; y = y * (1 - 0.42 * this.restK - 0.2 * this.crawlK - 0.3 * this.sq) - 1.2 * this.restK; if (this.crawlK) y += Math.sin(phase * 1.3 + z * 0.5) * 0.9 * this.crawlK * (v.wave || 0); }
        else { const k = 1 - 0.15 * this.sq + 0.025 * Math.sin((this.tt ?? 0) * 1.8); x = this.mcx + (x - this.mcx) * (1 + 0.06 * this.sq); y = this.mcy + (y - this.mcy) * k * (1 - 0.1 * this.restK); z *= k; }
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
    if (W.push) for (let pass = 0; pass < 4; pass++) {
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
    this.pos.x = Math.max(-4.7, Math.min(4.7, this.pos.x)); this.pos.y = Math.max(0.35, Math.min(15.2, this.pos.y)); this.pos.z = Math.max(-3.8, Math.min(3.4, this.pos.z));
  }
  mouth() { return new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading)).multiplyScalar(this.radius * 0.62).add(this.pos); }
  pick(rng) {
    const b = this.band;
    this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0]));
    for (let tries = 0; tries < 10 && Fish3D.world.push; tries++) { _o.set(0, 0, 0); if (!Fish3D.world.push(this.target, this.radius * 0.5 + 0.4, _o)) break; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), b.y[0] + rng() * (b.y[1] - b.y[0]), b.z[0] + rng() * (b.z[1] - b.z[0])); }
    this.retarget = 3 + rng() * 5;
  }
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
    if (!this.seeking && ((this.retarget <= 0 && this.idle <= 0) || this.pos.distanceTo(this.target) < 0.3)) this.pickHover(rng);
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
    if (this.seeking && S.s !== 'jet') { S.s = 'jet'; S.n = 2; S.t = 6; S.pulse = 0; }
    if (S.s === 'rest') {
      this.vel.multiplyScalar(Math.exp(-3 * dt)); this.restK += (1 - this.restK) * Math.min(1, dt * 1.5); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 2);
      if (!onFloor) this.vel.y -= 0.5 * dt;
      if (S.t <= 0) { if (rng() < 0.5) { S.s = 'crawl'; S.t = 3 + rng() * 4; const spots = this.getSpots?.() ?? [], b = this.band, s = spots.length && rng() < 0.6 ? spots[(rng() * spots.length) | 0] : null; this.target.set(s ? s.x + (rng() - 0.5) * 1.2 : b.x[0] + rng() * (b.x[1] - b.x[0]), floor, s ? s.z + 0.8 : b.z[0] + rng() * (b.z[1] - b.z[0])); } else { S.s = 'jet'; S.n = 2 + ((rng() * 2) | 0); S.t = 9; S.pulse = 0; const b = this.band; this.target.set(b.x[0] + rng() * (b.x[1] - b.x[0]), 3 + rng() * 6, b.z[0] + rng() * (b.z[1] - b.z[0])); } }
    } else if (S.s === 'crawl') {
      this.restK += (0.25 - this.restK) * Math.min(1, dt * 2); this.crawlK += (1 - this.crawlK) * Math.min(1, dt * 2);
      const to = this.target.clone().sub(this.pos); to.y = (floor - this.pos.y) * 2; const d = to.length() || 1; to.multiplyScalar((0.5 * this.speed * mul) / d); this.vel.lerp(to, Math.min(1, dt * 1.6));
      if (S.t <= 0 || d < 0.35) { S.s = 'rest'; S.t = 4 + rng() * 8; }
    } else if (S.s === 'jet') {
      this.restK += (0 - this.restK) * Math.min(1, dt * 4); this.crawlK += (0 - this.crawlK) * Math.min(1, dt * 4);
      S.pulse -= dt;
      if (S.pulse <= 0 && S.n > 0) { S.n--; S.pulse = 1.5 + rng() * 0.7; const dir = this.target.clone().sub(this.pos); dir.y += 0.6; dir.normalize(); this.vel.addScaledVector(dir, 2.6 * this.speed * Math.max(0.5, mul)); this.sq = 1; }
      this.vel.multiplyScalar(Math.exp(-1.25 * dt)); if (!this.seeking) this.vel.y -= 0.12 * dt;
      if (this.seeking) { const to = this.target.clone().sub(this.pos); if (to.length() > 0.2) this.vel.addScaledVector(to.normalize(), 0.8 * dt * this.speed); }
      if (S.n <= 0 && S.pulse <= -0.6 && !this.seeking) { S.s = 'drift'; S.t = 6; }
    } else {                                                                  // drift: arms trail and it sinks back toward the bottom
      this.restK += (0.2 - this.restK) * Math.min(1, dt * 1.5); this.vel.multiplyScalar(Math.exp(-1.0 * dt)); this.vel.y -= 0.35 * dt;
      if (this.pos.y < floor + 0.4 || S.t <= 0) { S.s = 'rest'; S.t = 4 + rng() * 8; }
    }
    this.sq = Math.max(0, this.sq - dt * 2.4); this.separate(others, 3);
    this.pos.addScaledVector(this.vel, dt); this.resolve(others); if (this.pos.y < floor) { this.pos.y = floor; if (this.vel.y < 0) this.vel.y = 0; }
    const sp = this.face(dt, S.s === 'jet' ? 3 : 1.6);
    const wantPitch = S.s === 'jet' ? Math.max(-0.9, Math.min(0.9, Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z) || 1))) : 0; this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3); this.roll += (0 - this.roll) * Math.min(1, dt * 3);
    this.phase += dt * (S.s === 'crawl' ? 5 : S.s === 'jet' ? 2.5 : S.s === 'rest' ? 1.4 : 2.0);
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt; if (this.accum > 1 / 20) { this.accum = 0; this.setPose(this.phase); }
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
      this.roll += (-dy * 0.5 - this.roll) * Math.min(1, dt * 4);
    }
    this.phase += dt * (3.0 + sp * 5.5);
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, 0);
    this.group.quaternion.setFromEuler(new THREE.Euler(this.roll, this.heading, this.pitch, 'YZX'));
    this.accum += dt;
    if (this.accum > 1 / 30) { this.accum = 0; this.setPose(this.phase); }
  }
}
