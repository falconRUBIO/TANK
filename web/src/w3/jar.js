// The puzzle jar: a screw-top glass jar with a crab inside, set on the sand for the octopus to work open. Built from simple lit shapes.
import * as THREE from 'three';
import { Vox, topLit, hash } from './decor.js';

const glass = new THREE.MeshStandardMaterial({ color: 0xbfe2f2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
const brass = new THREE.MeshStandardMaterial({ color: 0xb5823f, roughness: 0.5, metalness: 0.4, flatShading: true });
const shell = new THREE.MeshStandardMaterial({ color: 0xe0503a, roughness: 0.7, flatShading: true });
const eyeM = new THREE.MeshBasicMaterial({ color: 0x14141c });

// A proper little crab, built from the same chunky voxels as everything else: a domed red-orange shell with darker spots and a pale belly, two big raised claws with open pincers,
// eight jointed legs, and two eyes on stalks. It is a group so the claws can snap and the legs scuttle (crab.userData.tick).
export function buildCrab() {
  const U = 0.045, g = new THREE.Group(), pick = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shellHi = [238, 96, 58], shellLo = [196, 56, 40], dark = [140, 36, 34], belly = [250, 214, 190], tip = [252, 226, 206];
  const body = new Vox(U);
  body.ellipsoid(0, 5, 0, 9, 4.4, 6.6, (i, j, k) => (j < 3.4 ? belly : hash(i, j, k, 4) > 0.86 ? dark : pick(shellLo, shellHi, Math.max(0, Math.min(1, (j - 3) / 5)))), 5, 0.12);
  for (const sx of [-1, 1]) { body.fill(sx * 3 - 1, 9, 5, sx * 3, 11, 5, [236, 190, 170]); body.fill(sx * 3 - 1, 12, 5, sx * 3, 13, 6, [18, 14, 20]); body.set(sx * 3 - (sx > 0 ? 0 : 1), 13, 6, [255, 255, 255]); }       // eyes on stalks
  body.fill(-1, 3, 6, 1, 4, 7, [90, 30, 30]);                                                               // mouth
  topLit(body); const bm = body.mesh(); g.add(bm);
  const legs = new Vox(U), leg = (sx, n) => { const z = -4 + n * 2.6, kx = sx * (11 + (n === 1 || n === 2 ? 1.5 : 0)), a = [sx * 8, 4, z], k = [kx, 8 - n * 0.3, z + 0.6], f = [sx * (15 + n * 0.5), 0, z + 1.6]; for (const [p, q] of [[a, k], [k, f]]) for (let t = 0; t <= 1.001; t += 0.07) { const x = Math.round(p[0] + (q[0] - p[0]) * t), y = Math.round(p[1] + (q[1] - p[1]) * t), zz = Math.round(p[2] + (q[2] - p[2]) * t); legs.set(x, y, zz, t < 0.2 ? shellLo : [184, 52, 38]); if (t > 0.9 && q === f) legs.set(x, y, zz, tip); } legs.set(Math.round(k[0]), Math.round(k[1]), Math.round(k[2]), shellHi); };
  for (const sx of [-1, 1]) for (let n = 0; n < 4; n++) leg(sx, n);
  const lm = legs.mesh(); g.add(lm);
  const claws = [-1, 1].map((sx) => {                                                                       // each claw: an arm, a palm and two pincers (one fixed, one that snaps)
    const arm = new Vox(U), fix = new Vox(U), mov = new Vox(U), pivot = new THREE.Group(), hinge = new THREE.Group();
    for (let t = 0; t <= 1.001; t += 0.08) { const x = Math.round(sx * (7 + t * 3)), y = Math.round(5 + t * 4), z = Math.round(4 + t * 4); arm.fill(x - 1, y - 1, z - 1, x, y, z, t < 0.5 ? shellLo : shellHi); }
    arm.ellipsoid(sx * 10.5, 9.5, 11, 3.2, 2.6, 3.4, (i, j, k) => (hash(i, j, k, 6) > 0.9 ? dark : shellHi), 8, 0.1);
    fix.ellipsoid(sx * 10.5 - sx * 1.2, 9.5, 14.6, 1.6, 1.4, 3.2, (i, j, k) => (k > 16 ? tip : shellHi), 9, 0.08);
    mov.ellipsoid(0, 0, 3, 1.4, 1.3, 3.2, (i, j, k) => (k > 4 ? tip : shellHi), 10, 0.08);
    const am = arm.mesh(), fm = fix.mesh(), mm = mov.mesh(); pivot.add(am, fm); hinge.position.set(sx * 10.5 + sx * 1.2 * U / U * 0 + sx * 1.0 * 1, 0, 0); hinge.position.set((sx * 10.5 + sx * 1.2) * U, 9.5 * U + 0.0, 11.6 * U); mm.position.set(0, 0, 0); hinge.add(mm); pivot.add(hinge); g.add(pivot); return { pivot, hinge, sx };
  });
  g.scale.setScalar(0.9); g.userData.tick = (t, scare = 0) => {
    const f = 1 + scare * 2.4;
    claws.forEach((c, i) => { c.hinge.rotation.x = -(0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.2 * f + i * 1.9))) * (1 + scare * 0.5); c.hinge.rotation.y = -c.sx * 0.12; c.pivot.rotation.x = -0.08 * Math.sin(t * 2.1 * f + i); });
    lm.position.x = Math.sin(t * 9 * f) * 0.006 * (1 + scare * 2); lm.rotation.y = Math.sin(t * 7 * f) * 0.03 * (1 + scare); bm.position.y = Math.sin(t * 3) * 0.004;
  };
  return g;
}
export function buildJar() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 10, 1, true), glass); jar.position.y = 0.55; body.add(jar);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 10), glass); base.position.y = 0.03; body.add(base);
  const lid = new THREE.Group(); lid.position.y = 1.14; root.add(lid);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.2, 10), brass); lid.add(cap);
  for (let i = 0; i < 10; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.06), brass); const a = (i / 10) * Math.PI * 2; rib.position.set(Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65); rib.rotation.y = -a; lid.add(rib); }
  const crab = buildCrab(); crab.position.y = 0.12; crab.scale.setScalar(0.62); root.add(crab);
  return { root, body, lid, crab, state: 'closed', t: 0 };
}
export function updateJar(j, dt, t, working) {
  if (j.state === 'closed') { j.crab.userData.tick?.(t, working ? 1 : 0); j.crab.position.x = Math.sin(t * 1.3) * 0.1; j.crab.rotation.y = Math.sin(t * 0.9) * 0.5; j.body.rotation.z = working ? Math.sin(t * 17) * 0.035 : 0; j.lid.rotation.y = working ? Math.sin(t * 5) * 0.2 : 0; return; }
  j.t += dt; const k = j.t;
  j.lid.position.y = 1.14 + Math.min(1.4, k * 3.2) - Math.max(0, k - 0.5) * 0.2; j.lid.position.x = Math.min(0.9, k * 1.6); j.lid.rotation.z = -Math.min(1.4, k * 3);
  j.crab.position.y = 0.2 + Math.min(1.3, Math.max(0, k - 0.2) * 1.4); j.crab.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.9) * 1.1));
  j.body.rotation.z = 0;
}
