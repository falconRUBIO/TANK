// Halloween costumes for every animal in the tank: a hat, a nose, a cape or a pair of wings fastened to its body (voxels, like the body), and for
// some a paint job over its own colors (bandages, bones, a ghost's pallor, a pumpkin's ribs). Each animal keeps its own shape and its own
// shading under the costume: it still reads as that fish, in a witch's hat. The octopus is a pumpkin, every Halloween. Pure cosmetics: nothing
// here changes a collider, a behavior or a shared record, and undress() puts everything back exactly as it was.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';

const BLACK = [26, 20, 36], PURPLE = [122, 54, 176], GOLD = [240, 196, 80], RED = [196, 34, 40], BONE = [236, 230, 212], WRAP = [224, 212, 186], GREEN = [118, 176, 84], WHITE = [246, 246, 250], PINK = [240, 150, 180];
export const COSTUMES = {
  witch: { label: 'a witch' }, wizard: { label: 'a wizard' }, pirate: { label: 'a pirate' }, vampire: { label: 'a vampire' }, mummy: { label: 'a mummy' }, skeleton: { label: 'a skeleton' },
  ghost: { label: 'a ghost' }, devil: { label: 'a little devil' }, cat: { label: 'a black cat' }, frank: { label: "Frankenstein's monster" }, bat: { label: 'a bat' }, pumpkin: { label: 'a jack-o’-lantern' },
};
const FISH_SET = ['witch', 'mummy', 'vampire', 'pirate', 'skeleton', 'ghost', 'devil', 'frank', 'cat', 'wizard', 'bat'];
const CRAB_SET = ['witch', 'pirate', 'wizard', 'devil'], TURTLE_SET = ['pirate', 'witch', 'mummy', 'skeleton', 'wizard'], FRY_SET = ['mummy', 'skeleton', 'ghost'];
const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
// which costume an animal wears: the same on every phone (from its seed and name), the octopus always a pumpkin, a crab or a turtle from the
// sets that fit a body with a shell, a nursery baby a paint-only costume (its head is still changing shape)
export function costumeFor(f) {
  if (f.species?.move === 'jet') return 'pumpkin';
  const set = f.crab ? CRAB_SET : TURTLES.has(f.species?.id) ? TURTLE_SET : (f.cute ?? 0) > 0.3 || f.nursery ? FRY_SET : FISH_SET;
  const h = Math.abs((f.seed | 0) * 2654435761 + (f.name?.length ?? 0) * 97 + (f.name?.charCodeAt(0) ?? 0)) >>> 0;
  return set[h % set.length];
}

// ── where things go on a body (model voxel coordinates, +x forward) ──
function anchors(f) {
  const V = f.vox; let ex = 0, ey = 0, n = 0; for (const v of V) if (v.tag === 'eye' || v.em) { ex += v.x; ey += v.y; n++; }
  let x1 = -1e9; for (const v of V) x1 = Math.max(x1, v.x);
  const E = n ? { x: ex / n, y: ey / n } : { x: x1 - 3, y: 0 };
  let top = -1e9, topX = E.x, nose = -1e9, w = 0, bot = 1e9, shellTop = -1e9, shellX = 0, shellN = 0, mTop = -1e9, mX = 0, mN = 0;
  for (const v of V) { if (v.tag === 'pouch') continue;
    if (Math.abs(v.x - E.x) <= 2.2 && Math.abs(v.z) <= 2.5) { if (v.y > top) { top = v.y; topX = v.x; } w = Math.max(w, Math.abs(v.z)); }
    if (Math.abs(v.y - E.y) <= 2.5 && Math.abs(v.z) <= 1.5 && v.x > nose) nose = v.x;
    if (v.x > E.x - 1.5 && v.y < bot) bot = v.y;
    if (v.tag !== 'head' && v.tag !== 'eye' && !v.em && v.y > shellTop - 0.5) { if (v.y > shellTop) { shellTop = v.y; shellX = 0; shellN = 0; } shellX += v.x; shellN++; }
    if (v.arm === undefined || (v.arm < 0 && !v.web)) { if (v.y > mTop - 0.5) { if (v.y > mTop) { mTop = v.y; mX = 0; mN = 0; } mX += v.x; mN++; } } }
  let x0 = 1e9; for (const v of V) x0 = Math.min(x0, v.x);
  const cols = new Map(); for (const v of V) if (v.tag !== 'pouch') { const key = Math.round(v.x) + ',' + Math.round(v.z); cols.set(key, Math.max(cols.get(key) ?? -1e9, v.y)); }
  const colTop = (x, z) => cols.get(Math.round(x) + ',' + Math.round(z)) ?? -1e9;      // the top of the body above a point of the floor plan (or nothing there)
  return { E, top, topX, nose, w: Math.max(1.2, w), bot, len: x1 - x0, hh: Math.max(3, top - bot), colTop, shell: { x: shellN ? shellX / shellN : 0, y: shellTop }, mantle: { x: mN ? mX / mN : 0, y: mTop } };
}

// ── the pieces: each a Vox in the fish's own voxel units, its origin where it sits on the body ──
function hatVox(kind, seed = 1) {
  const v = new Vox(1);
  if (kind === 'witch' || kind === 'wizard') {
    const col = kind === 'witch' ? BLACK : [40, 48, 140], band = kind === 'witch' ? PURPLE : [226, 180, 60];
    for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 10.5) v.set(i, 0, k, mix(col, [60, 50, 80], 0.2));                // the brim
    for (let j = 1; j <= 8; j++) { const r = 2.6 - j * 0.3, bend = kind === 'witch' ? Math.max(0, j - 4) * 0.45 : 0;                                  // the cone, a witch's bent at the tip
      for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if ((i + bend) ** 2 + k * k <= r * r + 0.3) v.set(i, j, k, j <= 2 ? band : kind === 'wizard' && hash(i, j, k, seed) > 0.8 ? GOLD : mix(col, [0, 0, 0], 0.15 * (j / 8))); }
    if (kind === 'witch') { v.set(3, 1, 0, GOLD); v.set(3, 2, 0, GOLD); }                                                                            // the buckle, at the front
  } else if (kind === 'pirate') {
    for (let j = 0; j <= 2; j++) for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= (3.2 - j * 0.9) ** 2) v.set(i, j, k, hash(i, j, k, seed) > 0.8 ? WHITE : RED);      // a red bandana with white dots
    for (let q = 0; q <= 3; q++) { v.set(-3 - q, 1 - Math.floor(q / 2), 1, RED); v.set(-3 - q, 0 - Math.floor(q / 2), -1, RED); }                      // its two tails, knotted at the back
  } else if (kind === 'devil') {
    for (const side of [-1, 1]) for (let j = 0; j <= 3; j++) { const r = 1.1 - j * 0.25; for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) if (i * i + k * k <= r * r + 0.2) v.set(i, j, Math.round(side * (1.7 + j * 0.35)) + k, j === 3 ? [240, 90, 70] : RED); }      // two horns, curving out
  } else if (kind === 'cat') {
    for (const side of [-1, 1]) for (let j = 0; j <= 3; j++) for (let k = -2 + j; k <= 2 - j; k++) v.set(0, j, Math.round(side * 2) + k, Math.abs(k) <= 2 - j - 1 && j < 2 ? PINK : BLACK);      // two pointed ears, pink inside
  } else if (kind === 'frank') {
    for (let i = -3; i <= 2; i++) for (let k = -3; k <= 3; k++) if (Math.abs(k) <= 3 - Math.max(0, -i - 2) * 0.5) v.set(i, 0, k, BLACK), v.set(i, 1, k, i === -3 ? BLACK : [36, 30, 44]);      // the flat black hair
  }
  return v;
}
const box = (w, h, d, col) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: new THREE.Color(col[0] / 255, col[1] / 255, col[2] / 255), roughness: 0.7 }));

// ── the paint jobs: a new set of base colors, the body's own light and shade kept under them ──
const lin = (c) => c.map((x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
function paint(kind, f, A) {
  const b = f.baseCol, n = f.vox.length, out = Float32Array.from(b); let ls = 0; for (let i = 0; i < n; i++) ls += b[i * 3] * 0.3 + b[i * 3 + 1] * 0.59 + b[i * 3 + 2] * 0.11; const lavg = ls / n;
  const E = A.E, mid = (() => { let y0 = 1e9, y1 = -1e9; for (const v of f.vox) if (v.tag !== 'pouch') { y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return (y0 + y1) / 2; })();
  for (let i = 0; i < n; i++) {
    const v = f.vox[i], o = i * 3; if (v.tag === 'eye' || v.em || v.tag === 'beak' || v.tag === 'pouch') continue;
    const q = hash(v.x, v.y, v.z, 7), l = b[o] * 0.3 + b[o + 1] * 0.59 + b[o + 2] * 0.11, sh = Math.max(0.55, Math.min(1.25, 0.9 + 0.7 * (l - lavg))); let c = null, keep = 0;
    if (kind === 'mummy') { const band = Math.sin((v.x * 0.9 + v.y * 0.55 + Math.abs(v.z) * 0.3) * 1.05) > -0.45; c = band ? mix(WRAP, [196, 182, 156], q * 0.5) : [40, 34, 44]; if (!band) keep = 0.35; }      // bandages, the body showing dark between them
    else if (kind === 'skeleton') { const skull = v.x > E.x - 3.2, spine = Math.abs(v.y - mid) <= 0.9 && v.x < E.x - 3.2, rib = v.x < E.x - 3.2 && ((Math.round(v.x - E.x) % 3) + 3) % 3 === 0 && v.y > mid - 5 && v.y < mid + 2.5 && Math.abs(v.z) >= 0.5; c = skull || spine || rib ? mix(BONE, [200, 192, 170], q * 0.4) : [26, 22, 36]; }
    else if (kind === 'ghost') { c = mix(WHITE, [214, 220, 240], q * 0.5); keep = 0.12; }
    else if (kind === 'frank') { if (v.x > E.x - 3.5) { c = GREEN; keep = 0.45; } }                                                                 // a green face
    else if (kind === 'pumpkin') {
      const onArm = v.arm >= 0 || !!v.web; if (onArm) { c = [70, 130, 50]; keep = 0.45; }                                                               // the arms, a tangle of green vine
      else { const cx = f.mcx ?? 0, cy = f.mcy ?? 0, px = v.x - cx, py = v.y - cy, ang = Math.atan2(v.z, py), rib = 0.5 + 0.5 * Math.cos(ang * 8); c = mix([236, 118, 32], [172, 74, 18], 0.2 + 0.6 * rib);
        const side = Math.abs(v.nz ?? 0) > 0.35, eye = Math.abs(Math.abs(px) - 3) <= (py - 0.4) * 0.9 && py >= 0.4 && py <= 4.2, nose = Math.abs(px) <= 0.9 && py >= -0.9 && py <= 0.6, grin = py <= -1.8 && py >= -4.4 && Math.abs(px) <= 5 && (py > -3 || Math.round(px + 10) % 2 === 0);
        if (side && (eye || nose || grin)) c = [255, 232, 140]; } }
    if (!c) continue; const L = lin(c); out[o] = L[0] * sh * (1 - keep) + b[o] * keep; out[o + 1] = L[1] * sh * (1 - keep) + b[o + 1] * keep; out[o + 2] = L[2] * sh * (1 - keep) + b[o + 2] * keep;
  }
  return out;
}
const PAINTED = new Set(['mummy', 'skeleton', 'ghost', 'frank', 'pumpkin']);

// ── on and off ──
export function dress(f, kind = costumeFor(f)) {
  if (f.hw || !f.vox || !f.mesh) return null;
  const A = anchors(f), g = new THREE.Group(), parts = [], hw = { kind, label: COSTUMES[kind]?.label ?? kind, group: g, s: f.scale, parts, base0: null };
  const put = (v, x, y, z, k = 1, ry = 0) => { const m = v.mesh(); m.position.set(x, y, z); m.scale.setScalar(k); m.rotation.y = ry; g.add(m); parts.push(m); return m; };
  const putBox = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); parts.push(m); return m; };
  const turtle = TURTLES.has(f.species?.id), octo = f.species?.move === 'jet', crab = !!f.crab;
  const k = turtle ? 1.6 : Math.max(1.3, Math.min(3.2, A.hh * 0.17)), hatAt = turtle ? { x: A.shell.x, y: A.shell.y + 0.6 } : octo ? { x: A.mantle.x, y: A.mantle.y - 0.5 } : { x: A.topX, y: A.top + 0.3 }, hatK = k;      // a hat as big as the head it sits on: a brim about two thirds of the head's height
  if (crab) {      // a crab's hat sits on its front shield, behind the eyestalks (its own fine voxels: the crab's frame is in meters)
    const U = 0.034, v = hatVox(kind === 'devil' ? 'devil' : kind), m = v.mesh(); m.scale.setScalar(U * 0.75); m.position.set(0.3 * U, 3.0 * U, 0); f.bodyG.add(m); parts.push(m); hw.group = m; f.hw = hw; return hw;
  }
  if (!octo && (f.cute ?? 0) <= 0.3 && !f.nursery) {
    if (['witch', 'wizard', 'pirate', 'devil', 'cat', 'frank'].includes(kind)) put(hatVox(kind, f.seed), hatAt.x, hatAt.y, 0, hatK);
    if (kind === 'witch') putBox(box(1.2 * k, 1.0 * k, 1.0 * k, [120, 168, 80]), A.nose + 0.6 * k, A.E.y - 0.5 * k, 0);                                // a warty green nose
    if (kind === 'pirate' && !turtle) { putBox(box(0.5, 1.3 * k, 1.3 * k, BLACK), A.E.x, A.E.y, A.w + 0.45);      /* (not on a turtle: its head turns on its own, and a patch would float) */ for (let i = 0; i < 4; i++) putBox(box(0.5, 0.3 * k, 0.7 * k, BLACK), A.E.x, A.E.y + (0.7 + i * 0.42) * k, A.w + 0.2 - i * 0.3 * k); }      // an eye patch and its strap
    if (kind === 'vampire') { const v = new Vox(1), L = Math.max(6, Math.round(A.len * 0.42)); let w0 = 0;      // a cape draped over its back from the collar, falling down both sides, red at the hem
      for (let i = -2; i >= -L; i--) { const x = Math.round(A.topX) + i, w = 1 + Math.round(-i * 0.4) + 1;      /* (it starts behind the head and widens toward the tail) */ let any = false; for (let z = -w; z <= w; z++) { const t = A.colTop(x, z); if (t < -1e8) continue; const edge = Math.abs(z) === w || A.colTop(x, z + Math.sign(z || 1)) < -1e8 || i === -L; v.set(i, Math.round(t - A.top) + 1, z, edge ? RED : hash(x, 0, z, 3) > 0.85 ? [50, 30, 60] : BLACK); any = true; if (i === -2) w0 = Math.max(w0, Math.abs(z)); } if (!any && i < -3) break; }
      for (const z of [-(w0 + 1), w0 + 1]) for (let j = 0; j <= Math.round(1.5 * k); j++) v.set(-2, j, z, j >= Math.round(1.5 * k) - 1 ? RED : BLACK); put(v, A.topX, A.top, 0);      // a high collar standing up beside the head
      for (const z of [-0.6 * k, 0.6 * k]) putBox(box(0.4 * k, 0.9 * k, 0.4 * k, WHITE), A.nose - 0.8 * k, A.bot - 0.25 * k, z); }                      // fangs
    if (kind === 'bat') { const v = new Vox(1), bx = Math.round(A.topX - A.len * 0.3), base = Math.max(A.colTop(bx, 0), A.colTop(bx, 1), A.colTop(bx, -1));      // two wings standing up off its back, a third of the way down
      for (const side of [-1, 1]) for (let q = 1; q <= 8; q++) { const h = q < 3 ? 2.5 + q : 7 - Math.abs(((q - 3) % 3) - 1) * 1.4; for (let j = 0; j <= Math.round(h); j++) v.set(-Math.round(q * 0.25), j, side * q, j === Math.round(h) || q === 8 || j === 0 ? BLACK : mix(BLACK, PURPLE, 0.5)); } put(v, bx, (base > -1e8 ? base : A.top - 2) + 0.5, 0, k * 0.8); }
    if (kind === 'cat') for (const side of [-1, 1]) for (let i = 0; i < 3; i++) putBox(box(0.22 * k, 0.16 * k, 2.4 * k, WHITE), A.nose - (0.5 + i * 0.3) * k, A.E.y - (1.2 - i * 0.4) * k, side * 1.5 * k);      // whiskers
    if (kind === 'frank') for (const side of [-1, 1]) putBox(box(0.9 * k, 0.9 * k, 1.3 * k, [150, 150, 160]), A.E.x - 0.8 * k, A.E.y - 0.8 * k, side * (A.w + 0.5 * k));          // two bolts
  }
  if (octo) { const v = new Vox(1); for (let j = 0; j <= 3; j++) v.set(j >= 2 ? 1 : 0, j, 0, [84, 118, 42]); v.set(2, 3, 0, [84, 118, 42]); v.set(-1, 0, 1, [110, 150, 60]); v.set(0, 0, -1, [110, 150, 60]); put(v, hatAt.x, hatAt.y, 0, 2.4); }      // a stem on the mantle, and two leaves
  if (turtle && ['mummy', 'skeleton'].includes(kind)) { /* paint only: the shell is the costume */ }
  if (PAINTED.has(kind)) { hw.base0 = f.baseCol; f.baseCol = paint(kind, f, A); repaint(f); }
  g.scale.setScalar(f.scale); g.position.set(0, 0, 0); for (const m of parts) { m.position.multiplyScalar(f.scale); m.scale.multiplyScalar(f.scale); } g.scale.setScalar(1);
  hw.place = () => { const k = f.scale / hw.s; if (Math.abs(k - 1) < 1e-6) return; for (const m of parts) { m.position.multiplyScalar(k); m.scale.multiplyScalar(k); } hw.s = f.scale; };
  f.mesh.add(g); f.hw = hw; return hw;
}
// the body's colors are redrawn from baseCol by the fish's own passes: ask for them again
function repaint(f) { const p = f.pale ?? 0; f.pale = -1; f.setPale(p); f.tintApplied = -1; f.camoApplied = -1; f.costumeApplied = -1; }
export function undress(f) {
  const hw = f.hw; if (!hw) return; f.hw = null;
  if (hw.base0) { f.baseCol = hw.base0; repaint(f); }
  for (const m of hw.parts) { m.parent?.remove(m); m.geometry?.dispose?.(); if (m.material && !m.isInstancedMesh) m.material.dispose?.(); }
  hw.group?.parent?.remove(hw.group);
}
