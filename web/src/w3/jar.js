// The puzzle jar: a screw-top glass jar with a crab inside, set on the sand for the octopus to work open. Built from simple lit shapes.
import * as THREE from 'three';
import { Vox, topLit, hash } from './decor.js';

const glass = new THREE.MeshStandardMaterial({ color: 0xbfe2f2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
const brass = new THREE.MeshStandardMaterial({ color: 0xb5823f, roughness: 0.5, metalness: 0.4, flatShading: true });
const shell = new THREE.MeshStandardMaterial({ color: 0xe0503a, roughness: 0.7, flatShading: true });
const eyeM = new THREE.MeshBasicMaterial({ color: 0x14141c });

// A proper little crab, built from the same chunky voxels as everything else: a domed red-orange shell with darker spots and a pale belly, two big raised claws with open pincers,
// eight jointed legs, and two eyes on stalks. It is a group so the claws can snap and the legs scuttle (crab.userData.tick).
export function buildCrab(kind = 'crab') {
  if (kind === 'spider') return buildSpider();      // (the two Halloween days: the octopus's prey is a spider, built on the same plan so it is hunted and eaten the same way)
  const U = 0.045, g = new THREE.Group(), pick = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], sp = false;
  const shellHi = [238, 96, 58], shellLo = [196, 56, 40], dark = [140, 36, 34], belly = [250, 214, 190], tip = [252, 226, 206];
  const body = new Vox(U);
  body.ellipsoid(0, 5, 0, 9, 4.4, 6.6, (i, j, k) => (j < 3.4 ? belly : hash(i, j, k, 4) > 0.86 ? dark : pick(shellLo, shellHi, Math.max(0, Math.min(1, (j - 3) / 5)))), 5, 0.12);
  for (const sx of [-1, 1]) { body.fill(sx * 3 - 1, 9, 5, sx * 3, 11, 5, [236, 190, 170]); body.fill(sx * 3 - 1, 12, 5, sx * 3, 13, 6, [18, 14, 20]); body.set(sx * 3 - (sx > 0 ? 0 : 1), 13, 6, [255, 255, 255]); }       // eyes on stalks
  body.fill(-1, 3, 6, 1, 4, 7, [90, 30, 30]);                                                               // mouth
  topLit(body); const bm = body.mesh(); g.add(bm);
  const lm = new THREE.Group(), legMeshes = [], leg = (sx, n) => { const legs = new Vox(U); const z = -4 + n * 2.6, kx = sx * (11 + (n === 1 || n === 2 ? 1.5 : 0)), a = [sx * 8, 4, z], k = [kx, 8 - n * 0.3, z + 0.6], f = [sx * (15 + n * 0.5), 0, z + 1.6]; for (const [p, q] of [[a, k], [k, f]]) for (let t = 0; t <= 1.001; t += 0.07) { const x = Math.round(p[0] + (q[0] - p[0]) * t), y = Math.round(p[1] + (q[1] - p[1]) * t), zz = Math.round(p[2] + (q[2] - p[2]) * t); legs.set(x, y, zz, t < 0.2 ? shellLo : [184, 52, 38]); if (t > 0.9 && q === f) legs.set(x, y, zz, tip); } legs.set(Math.round(k[0]), Math.round(k[1]), Math.round(k[2]), shellHi);  const m = legs.mesh(); m.userData.p0 = m.position.clone(); lm.add(m); legMeshes.push(m); };
  for (let n = 0; n < 4; n++) for (const sx of [-1, 1]) leg(sx, n);      // each leg is its own piece, so an octopus can pull them off one at a time
  g.add(lm);
  const claws = [-1, 1].map((sx) => {                                                                       // each claw: an arm, a palm and two pincers (one fixed, one that snaps)
    const arm = new Vox(U), fix = new Vox(U), mov = new Vox(U), pivot = new THREE.Group(), hinge = new THREE.Group();
    for (let t = 0; t <= 1.001; t += 0.08) { const x = Math.round(sx * (7 + t * 3)), y = Math.round(5 + t * 4), z = Math.round(4 + t * 4); arm.fill(x - 1, y - 1, z - 1, x, y, z, t < 0.5 ? shellLo : shellHi); }
    arm.ellipsoid(sx * 10.5, 9.5, 11, 3.2, 2.6, 3.4, (i, j, k) => (hash(i, j, k, 6) > 0.9 ? dark : shellHi), 8, 0.1);
    fix.ellipsoid(sx * 10.5 - sx * 1.2, 9.5, 14.6, 1.6, 1.4, 3.2, (i, j, k) => (k > 16 ? tip : shellHi), 9, 0.08);
    mov.ellipsoid(0, 0, 3, 1.4, 1.3, 3.2, (i, j, k) => (k > 4 ? tip : shellHi), 10, 0.08);
    const am = arm.mesh(), fm = fix.mesh(), mm = mov.mesh(); pivot.add(am, fm); hinge.position.set(sx * 10.5 + sx * 1.2 * U / U * 0 + sx * 1.0 * 1, 0, 0); hinge.position.set((sx * 10.5 + sx * 1.2) * U, 9.5 * U + 0.0, 11.6 * U); mm.position.set(0, 0, 0); hinge.add(mm); pivot.add(hinge); g.add(pivot); return { pivot, hinge, sx };
  });
  g.userData.parts = [...legMeshes, ...claws.map((c) => { c.pivot.userData.p0 = c.pivot.position.clone(); return c.pivot; })]; g.userData.body = bm;      // eaten in this order: legs, then claws, then the shell
  g.scale.setScalar(0.9); g.userData.tick = (t, scare = 0) => {
    const f = 1 + scare * 2.4;
    claws.forEach((c, i) => { c.hinge.rotation.x = -(0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.2 * f + i * 1.9))) * (1 + scare * 0.5); c.hinge.rotation.y = -c.sx * 0.12; c.pivot.rotation.x = -0.08 * Math.sin(t * 2.1 * f + i); });
    lm.position.x = Math.sin(t * 9 * f) * 0.006 * (1 + scare * 2); lm.rotation.y = Math.sin(t * 7 * f) * 0.03 * (1 + scare); bm.position.y = Math.sin(t * 3) * 0.004;
  };
  return g;
}

// A spider, on the crab's plan (a body, eight legs that come off one by one, two front pieces, a tick), facing +z like the crab: a big round black
// abdomen with fine hairs and a red hourglass on its back, a smaller head in front with eight red eyes and two pale fangs, eight long thin legs
// that bend up high at the knee and reach far out, pale at the joints, two short pedipalps that twitch, spinnerets behind, and a silk thread
// it comes down on (shown by the manager while it sinks).
export function buildSpider() {
  const U = 0.045, g = new THREE.Group(), K = [24, 20, 30], K2 = [42, 36, 50], K3 = [62, 54, 72], JOINT = [118, 108, 130], RED = [224, 32, 44], RED2 = [255, 118, 118];
  const body = new Vox(U);
  body.ellipsoid(0, 7, -6, 6.2, 5.8, 6.8, (i, j, k) => { const dk = k + 6, glass = j >= 9.5 && Math.abs(dk) <= 3.2 && Math.abs(i) <= 0.4 + Math.abs(dk) * 0.75 && Math.abs(i) <= 2.6; return glass ? (Math.abs(i) < 0.5 && Math.abs(dk) < 0.7 ? RED2 : RED) : hash(i, j, k, 4) > 0.9 ? K3 : hash(i, j, k, 3) > 0.7 ? K2 : K; }, 5, 0.1);      // the abdomen, the hourglass on its back
  body.ellipsoid(0, 5.5, 3, 4.4, 3.4, 4.6, (i, j, k) => (hash(i, j, k, 6) > 0.82 ? K2 : K), 7, 0.08);      // the head
  { const hair = new Vox(U); hair.ellipsoid(0, 7, -6, 7.3, 6.9, 7.9, (i, j, k) => K3, 5, 0.04); for (const q of hair.m.values()) if (!body.has(q.i, q.j, q.k) && hash(q.i, q.j, q.k, 21) > 0.86 && q.j > 3) body.set(q.i, q.j, q.k, hash(q.i, q.j, q.k, 22) > 0.5 ? K3 : [84, 74, 96]); }      // bristles standing off the abdomen, a sparse fuzz of single voxels
  { const hair = new Vox(U); hair.ellipsoid(0, 5.5, 3, 5.4, 4.4, 5.6, (i, j, k) => K3, 7, 0.04); for (const q of hair.m.values()) if (!body.has(q.i, q.j, q.k) && hash(q.i, q.j, q.k, 23) > 0.9 && q.j > 4 && q.k < 6) body.set(q.i, q.j, q.k, K3); }      // and a few on the head
  for (const [dx, dy, big] of [[-1, 7, 1], [1, 7, 1], [-2.6, 6.6, 1], [2.6, 6.6, 1], [-1.6, 8.4, 0], [1.6, 8.4, 0], [-3.4, 7.9, 0], [3.4, 7.9, 0]]) { const z = 7 - (big ? 0 : 1), x = Math.round(dx), y = Math.round(dy);      // eight eyes: four large domes in a row that stand out from the face, each with a glint, four small ones above
    if (big) { for (const [ex, ey, ez] of [[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 1, 1], [0, -1, 1], [1, 0, 1], [-1, 0, 1]]) body.set(x + ex, y + ey, z + ez, ez === 2 ? RED2 : RED); body.set(x + (dx < 0 ? -1 : 1) * 0, y + 1, z + 2, [255, 226, 230]); } else { body.set(x, y, z, [200, 40, 50]); body.set(x, y, z + 1, RED); } }
  body.fill(-1, 2, 7, 1, 2, 7, [12, 10, 16]);      // the dark mouth between the fangs
  for (const sx of [-1, 1]) { body.set(sx * 2, 3, 7, K2); body.set(sx * 2, 3, 8, K2); body.set(sx * 2, 2, 8, K2); body.set(sx * 2, 1, 8, [170, 160, 186]); body.set(sx * 1, 0, 8, [214, 204, 224]); body.set(sx * 2, 0, 8, [196, 186, 206]); }      // fangs curving down and in to pale points
  for (const [sx, sy] of [[0, 6.5], [-1.4, 5.2], [1.4, 5.2]]) { body.set(Math.round(sx), Math.round(sy), -13, K2); body.set(Math.round(sx), Math.round(sy), -14, K3); }      // three spinnerets
  const bm = body.mesh(); g.add(bm);
  const lm = new THREE.Group(), legMeshes = [];
  const leg = (sx, n) => { const legs = new Vox(U), ang = [0.75, 0.28, -0.28, -0.8][n], zh = 4.5 - n * 1.7, long = n === 0 || n === 3, hip = [sx * 3.4, 5.5, zh], kr = (long ? 12.5 : 11), knee = [sx * kr * Math.cos(ang), 13.5 - Math.abs(n - 1.5) * 0.5, zh + Math.sin(ang) * kr], rr = long ? 19 : 17.5, foot = [sx * rr * Math.cos(ang), 0, zh + Math.sin(ang) * rr];
    for (const [p, q, seg] of [[hip, knee, 0], [knee, foot, 1]]) for (let t = 0; t <= 1.001; t += 0.045) { const x = Math.round(p[0] + (q[0] - p[0]) * t), y = Math.round(p[1] + (q[1] - p[1]) * t), z = Math.round(p[2] + (q[2] - p[2]) * t);
      const c = seg === 0 && t > 0.88 ? JOINT : seg === 1 && t > 0.9 ? JOINT : seg === 1 && Math.abs(t - 0.58) < 0.05 ? K3 : (seg + t) % 0.5 < 0.12 ? K2 : K; legs.set(x, y, z, c); if (seg === 0 && t < 0.5) legs.set(x, y + 1, z, K2);
      if (seg === 1 && t > 0.1 && t < 0.85 && hash(x, y, z, 31) > 0.72) legs.set(x + (hash(x, y, z, 32) > 0.5 ? sx : 0), y + 1, z + (hash(x, y, z, 33) > 0.5 ? 1 : 0), K3); }      // the femur thicker near the body, pale bands at the knee, the tarsus joint and the foot; fine hairs standing off the shin
    { const kx = Math.round(knee[0]), ky = Math.round(knee[1]), kz = Math.round(knee[2]); for (const [dx, dy, dz] of [[0, 1, 0], [sx, 0, 0], [0, 0, 1], [0, 0, -1]]) legs.set(kx + dx, ky + dy, kz + dz, JOINT); }      // a knob at the knee
    { const fx = Math.round(foot[0]), fz = Math.round(foot[2]); legs.set(fx + sx, 0, fz, [196, 186, 206]); legs.set(fx, 0, fz + (foot[2] >= zh ? 1 : -1), [196, 186, 206]); }      // two tiny claws at the foot
    const m = legs.mesh(); m.userData.p0 = m.position.clone(); lm.add(m); legMeshes.push(m); };
  for (let n = 0; n < 4; n++) for (const sx of [-1, 1]) leg(sx, n);
  g.add(lm);
  const palps = [-1, 1].map((sx) => {      // two short pedipalps reaching forward from under the face, each on a hinge so it can twitch
    const palp = new Vox(U), pivot = new THREE.Group(), hinge = new THREE.Group(); for (let t = 0; t <= 1.001; t += 0.1) { const x = Math.round(sx * (0.5 + t * 3)), y = Math.round(t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2.4), z = Math.round(t * 6); palp.set(x, y, z, t > 0.85 ? JOINT : t > 0.4 && t < 0.55 ? K3 : K2); if (t > 0.9) { palp.set(x + sx, y, z, K3); palp.set(x, y + 1, z, K3); } }
    const pm = palp.mesh(); hinge.add(pm); hinge.position.set(sx * 2 * U, 3.5 * U, 6.5 * U); pivot.add(hinge); g.add(pivot); return { pivot, hinge, sx }; });
  g.userData.parts = [...legMeshes, ...palps.map((c) => { c.pivot.userData.p0 = c.pivot.position.clone(); return c.pivot; })]; g.userData.body = bm;      // eaten in this order: legs, then the pedipalps, then the body
  const thread = new THREE.Mesh(new THREE.BoxGeometry(0.35 * U, 44 * U, 0.35 * U), new THREE.MeshBasicMaterial({ color: 0xf2f2fa, transparent: true, opacity: 0.7 })); thread.position.set(0, (13 + 22) * U, -6 * U); for (const dy of [-14, 2, 15]) { const drop = new THREE.Mesh(new THREE.BoxGeometry(1.0 * U, 1.0 * U, 1.0 * U), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); drop.position.set(0, dy * U, 0); thread.add(drop); } thread.visible = false; g.add(thread); g.userData.thread = thread;      // the silk it comes down on, three beads of dew along it
  g.scale.setScalar(0.9); g.userData.tick = (t, scare = 0) => {
    const f = 1 + scare * 2.4;
    palps.forEach((c, i) => { c.hinge.rotation.x = -(0.1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4.2 * f + i * 2.1))) * (1 + scare * 0.5); c.hinge.rotation.y = -c.sx * 0.1 * Math.sin(t * 3 * f + i); });
    lm.position.x = Math.sin(t * 9 * f) * 0.006 * (1 + scare * 2); lm.rotation.y = Math.sin(t * 7 * f) * 0.03 * (1 + scare); bm.position.y = Math.sin(t * 3) * 0.004 + (scare > 0.9 ? 0.01 : 0);
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
export function updateJar(j, dt, t, working, twist = null) {
  if (j.state === 'closed') { j.crab.userData.tick?.(t, working ? 1 : 0); j.crab.position.x = Math.sin(t * 1.3) * 0.1; j.crab.rotation.y = Math.sin(t * 0.9) * 0.5; j.body.rotation.z = working ? Math.sin(t * 17) * 0.035 : 0; j.lid.rotation.y = twist != null ? -twist * 1.1 : working ? Math.sin(t * 5) * 0.2 : 0; return; }       // the lid turns with the arm gripping it
  j.t += dt; const k = j.t;
  j.lid.position.y = 1.14 + Math.min(1.4, k * 3.2) - Math.max(0, k - 0.5) * 0.2; j.lid.position.x = Math.min(0.9, k * 1.6); j.lid.rotation.z = -Math.min(1.4, k * 3);
  j.crab.position.y = 0.2 + Math.min(1.3, Math.max(0, k - 0.2) * 1.4); j.crab.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.35) * 2.2));
  j.body.rotation.z = 0;
}
