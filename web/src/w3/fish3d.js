// Real 3D voxel fish: the species voxel models become instanced cubes that are lit,
// shadowed and animated (tail bend, fin flutter) in the scene, steered in 3D.
import * as THREE from 'three';
import { buildModel } from '../voxel.js';
import { patch } from './env.js';

const VOX = 0.052, GLOBAL = 1.05;
const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0 });
// Soft lighting on hard voxels: blend each cube's face normal with the smoothed body normal,
// so light rolls across the form like a rounded 3D shape while the silhouette stays blocky.
export const fishBoost = { value: new THREE.Vector3(0.2, 0.17, 0.12) };
mat.onBeforeCompile = (sh) => {
  sh.uniforms.uBoost = fishBoost;
  // a little self-lit warmth in the shade so oranges and creams stay clean instead of going muddy
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBoost;')
    .replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uBoost;\n#include <opaque_fragment>');
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aN;')
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      if (dot(aN, aN) > 0.01) objectNormal = normalize(mix(objectNormal, aN, 0.82));`);
};
const dummy = new THREE.Matrix4();
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
const col = new THREE.Color();

export class Fish3D {
  static world = { boxes: [], spheres: [] };            // decoration colliders, set by the scene
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
      const k = jr(i), glow = v.em > 1 ? 1.2 : v.em ? 1.0 : 1;
      col.setRGB(Math.min(1, v.c[0] / 255 * k) * glow, Math.min(1, v.c[1] / 255 * k) * glow, Math.min(1, v.c[2] / 255 * k) * glow, THREE.SRGBColorSpace);
      this.mesh.setColorAt(i, col);
    });
    // baked ambient occlusion from neighbour density + smooth normals for the shader
    const nrm = new Float32Array(n * 3);
    this.vox.forEach((v, i) => {
      let c = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy || dz) && occ.has(key(v.x + dx, v.y + dy, v.z + dz))) c++;
      const ao = Math.max(0, Math.min(0.28, (c / 26 - 0.42) * 1.4));
      this.mesh.getColorAt(i, col); col.multiplyScalar(1 - ao); this.mesh.setColorAt(i, col);
      if (!v.thin) { nrm[i * 3] = v.nx; nrm[i * 3 + 1] = v.ny; nrm[i * 3 + 2] = v.nz; }
    });
    this.mesh.geometry.setAttribute('aN', new THREE.InstancedBufferAttribute(nrm, 3));
    this.mobile = [];
    this.vox.forEach((v, i) => { if ((this.sp.bend && v.x + this.cx < this.sp.bend.pivot) || v.flap || v.wave) this.mobile.push(i); });
    this.setPose(0, true);
    this.group = new THREE.Group(); this.group.add(this.mesh);
    // state
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(1, 0, 0); this.target = new THREE.Vector3();
    this.phase = Math.random() * 6; this.retarget = 0; this.heading = 0; this.pitch = 0; this.roll = 0;
    this.speed = opts.speed ?? 1; this.band = opts.band ?? { x: [-3.6, 3.6], y: [2, 13], z: [0.4, 1.9] };
    this.name = opts.name ?? species.label; this.profile = opts.profile; this.radius = (species.length ?? 50) * (species.vox ?? VOX) * GLOBAL * (opts.scale ?? 1) * 0.55; this.accum = 0; this.cr = Math.min(0.55, this.radius * 0.26);
  }
  // write per-voxel transforms for a tail phase
  setPose(phase, all = false) {
    const b = this.sp.bend, s = this.scale, arr = this.mesh.instanceMatrix.array;
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
      const o = i * 16;
      arr[o] = s; arr[o + 5] = s; arr[o + 10] = s; arr[o + 15] = 1;
      arr[o + 12] = x * s; arr[o + 13] = y * s; arr[o + 14] = z * s;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  // hard constraints: never end a frame inside a decoration or another fish
  resolve(others) {
    const W = Fish3D.world, half = this.radius * 0.42, fx = Math.cos(this.heading), fz = -Math.sin(this.heading), r = this.cr;
    for (let pass = 0; pass < 2; pass++) for (const off of [0, half, -half]) {
      const px = this.pos.x + fx * off, py = this.pos.y, pz = this.pos.z + fz * off;
      for (const b of W.boxes) {
        const cx = Math.max(b.min[0], Math.min(px, b.max[0])), cy = Math.max(b.min[1], Math.min(py, b.max[1])), cz = Math.max(b.min[2], Math.min(pz, b.max[2]));
        let dx = px - cx, dy = py - cy, dz = pz - cz, dd = Math.hypot(dx, dy, dz);
        if (dd >= r) continue;
        if (dd < 1e-4) { // centre is inside the box: leave through the nearest face
          const ex = [px - b.min[0], b.max[0] - px, py - b.min[1], b.max[1] - py, pz - b.min[2], b.max[2] - pz]; const m = Math.min(...ex), i = ex.indexOf(m);
          this.pos.x += (i === 0 ? -1 : i === 1 ? 1 : 0) * (m + r); this.pos.y += (i === 2 ? -1 : i === 3 ? 1 : 0) * (m + r); this.pos.z += (i === 4 ? -1 : i === 5 ? 1 : 0) * (m + r); continue;
        }
        const k = (r - dd) / dd; this.pos.x += dx * k; this.pos.y += dy * k; this.pos.z += dz * k;
      }
      for (const sph of W.spheres) {
        const dx = px - sph.x, dy = py - sph.y, dz = pz - sph.z, dd = Math.hypot(dx, dy, dz) || 1e-3, lim = sph.r + r;
        if (dd >= lim) continue; const k = (lim - dd) / dd; this.pos.x += dx * k; this.pos.y += dy * k; this.pos.z += dz * k;
      }
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
    this.retarget = 3 + rng() * 5;
  }
  update(dt, rng, others) {
    this.retarget -= dt;
    if (!this.seeking && (this.retarget <= 0 || this.pos.distanceTo(this.target) < 0.5)) this.pick(rng);
    const desired = this.target.clone().sub(this.pos); const d = desired.length() || 1;
    desired.multiplyScalar(this.speed * (this.mul ?? 1) * (this.foodMul ?? 1) * (d < 1.5 ? 0.35 + d / 2.3 : 1) / d);
    // schooling: separation / alignment / cohesion among same-species mates
    if (this.species.school) {
      const c = new THREE.Vector3(), al = new THREE.Vector3(), sep = new THREE.Vector3(); let cnt = 0;
      for (const o of others) if (o !== this && o.id === this.id) { cnt++; c.add(o.pos); al.add(o.vel); const df = this.pos.clone().sub(o.pos), dl = df.length(); if (dl < 0.9) sep.add(df.multiplyScalar(1 / (dl * dl + 0.05))); }
      if (cnt) { c.multiplyScalar(1 / cnt).sub(this.pos).multiplyScalar(0.3); al.multiplyScalar(1 / cnt).multiplyScalar(0.5); desired.add(c).add(al).add(sep.multiplyScalar(1.1)); }
    }
    // personal space: never pile up on top of another fish (different species included)
    for (const o of others) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x, dy = this.pos.y - o.pos.y, dz = (this.pos.z - o.pos.z) * 1.6, dd = Math.hypot(dx, dy, dz), min = (this.radius + o.radius) * 0.6;
      if (dd < min && dd > 1e-3) desired.x += dx / dd * (min - dd) / min * this.speed * 2.4, desired.y += dy / dd * (min - dd) / min * this.speed * 2.4, desired.z += dz / dd * (min - dd) / min * this.speed * 1.6;
    }
    // decorations are solid: steer around them, then push out of anything we still touch
    const W = Fish3D.world, half = this.radius * 0.42, fx = Math.cos(this.heading), fz = -Math.sin(this.heading);
    const probes = [this.pos, _p1.set(this.pos.x + fx * half, this.pos.y, this.pos.z + fz * half), _p2.set(this.pos.x - fx * half, this.pos.y, this.pos.z - fz * half)];
    const margin = this.cr + 0.4;
    for (const p of probes) {
      for (const b of W.boxes) {
        const cx = Math.max(b.min[0], Math.min(p.x, b.max[0])), cy = Math.max(b.min[1], Math.min(p.y, b.max[1])), cz = Math.max(b.min[2], Math.min(p.z, b.max[2]));
        let dx = p.x - cx, dy = p.y - cy, dz = p.z - cz, dd = Math.hypot(dx, dy, dz);
        if (dd >= margin) continue;
        if (dd < 1e-4) { dx = p.x - (b.min[0] + b.max[0]) / 2; dy = 0.4; dz = p.z - (b.min[2] + b.max[2]) / 2; dd = Math.hypot(dx, dy, dz) || 1; }
        const k = (margin - dd) / margin * this.speed * 3.4; desired.x += dx / dd * k; desired.y += dy / dd * k; desired.z += dz / dd * k;
      }
      for (const sph of W.spheres) {
        const dx = p.x - sph.x, dy = p.y - sph.y, dz = p.z - sph.z, dd = Math.hypot(dx, dy, dz) || 1e-3, lim = sph.r + margin;
        if (dd >= lim) continue;
        const k = (lim - dd) / lim * this.speed * 3.4; desired.x += dx / dd * k; desired.y += dy / dd * k; desired.z += dz / dd * k;
      }
    }
    this.vel.lerp(desired, Math.min(1, dt * 1.5));
    if (this.vel.length() > this.speed * 1.4) this.vel.setLength(this.speed * 1.4);
    this.pos.addScaledVector(this.vel, dt);
    this.resolve(others);
    const sp = this.vel.length();
    if (sp > 0.05) {
      const wantYaw = Math.atan2(-this.vel.z, this.vel.x);
      let dy = wantYaw - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.heading += dy * Math.min(1, dt * 3.2);
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
