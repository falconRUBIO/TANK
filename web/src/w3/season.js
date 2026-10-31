// What a season looks like in the water: for Halloween, two carved pumpkins on the front sand that glow after dark. Built like every other
// decoration (chunky voxels, baked light), solid to the fish, never in the game's decor list: they come with the date and go with it.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';
import { placeGroup, stampItem, disposeItem } from './items.js';
import { DECOR_DEF } from '../game/rules.js';
import { PLANTS } from './grips.js';
import { dress, undress, costumeFor, shellSkin, SHELL_KINDS } from './costume.js';

const U = 0.07;
// a jack-o'-lantern: a ribbed orange sphere, a green stem, and a cut face that reads from the front (toward the glass, +z)
function buildPumpkin(seed = 1, lit = true) {
  const v = new Vox(U), R = 7, H = 6, skin = [236, 118, 32], dark = [178, 78, 20], face = lit ? [255, 214, 110] : [255, 190, 90];
  for (let i = -R; i <= R; i++) for (let j = 0; j <= 2 * H; j++) for (let k = -R; k <= R; k++) {
    const y = (j - H) / H, rr = Math.sqrt(1 - Math.min(1, y * y)) * R * (1 - 0.05 * Math.abs(y)), rib = 1 - 0.09 * (0.5 + 0.5 * Math.cos(Math.atan2(k, i) * 8));      // (eight ribs round the middle)
    if (i * i + k * k > (rr * rib) ** 2) continue;
    const c = mix(skin, dark, 0.5 + 0.5 * Math.cos(Math.atan2(k, i) * 8) * 0.6 + (hash(i, j, k, seed) - 0.5) * 0.2);
    v.set(i, j, k, c);
  }
  // the face, cut into the front: two triangle eyes, a nose, a toothy grin (the cells are recolored, not removed, so the shape stays solid)
  const front = (i, j) => { for (let k = R; k >= 0; k--) if (v.has(i, j, k)) { v.set(i, j, k, face); for (let q = 1; q <= 2; q++) if (v.has(i, j, k - q)) v.set(i, j, k - q, face); return; } };
  for (let j = H + 1; j <= H + 3; j++) for (let i = -4; i <= -2; i++) if (Math.abs(i + 3) <= j - H - 1) front(i, j);       // left eye
  for (let j = H + 1; j <= H + 3; j++) for (let i = 2; i <= 4; i++) if (Math.abs(i - 3) <= j - H - 1) front(i, j);          // right eye
  front(0, H); front(-1, H - 1); front(0, H - 1); front(1, H - 1);                                                           // nose
  for (let i = -4; i <= 4; i++) { front(i, H - 3); if (i % 2 === 0) front(i, H - 2); if (Math.abs(i) <= 3 && i % 2 !== 0) front(i, H - 4); }      // the grin
  for (let j = 2 * H + 1; j <= 2 * H + 3; j++) v.set(0, j, 0, [84, 112, 40]); v.set(1, 2 * H + 3, 0, [84, 112, 40]);      // stem, bent a little
  const group = new THREE.Group(), m = v.mesh(); m.position.set(0, 0.04, 0); group.add(m); group.scale.setScalar(1.25);      /* (a pumpkin, not a tangerine) */
  const it = { group, parts: [{ v, x: 0, y: 0.04, z: 0, ry: 0 }], lamp: new THREE.Vector3(0, H * U, R * U + 0.2), type: 'pumpkin', foot: 0.42 };
  if (lit) { const light = new THREE.PointLight(0xffa040, 0, 4.5, 2); light.position.set(0, H * U, R * U + 0.3); group.add(light); it.light = light; }
  return it;
}
// a ghost (round, a little surprised) or a ghoul (taller, grinning, a shade of green): a sheet shape in soft, see-through cubes with a glow of
// its own, nothing the fish react to. It drifts the width of the tank once and fades away.
function buildGhost(kind, u = 0.085) {
  const cells = [], W = kind === 'ghoul' ? 4 : 5, Hh = kind === 'ghoul' ? 15 : 12, body = kind === 'ghoul' ? 0xd2ffe0 : 0xf0f4ff, dark = 0x1a1f3a;
  for (let j = 0; j <= Hh; j++) for (let i = -W; i <= W; i++) {
    const top = j > Hh - W ? (i * i + (j - (Hh - W)) ** 2 <= W * W + 1) : true, hem = j < 2 ? ((i + W + (j === 0 ? 1 : 0)) % 4 < 2) : true;      // a round head, a scalloped hem
    if (!top || !hem) continue; let c = body;
    if (j === Hh - 3 && (i === -2 || i === 2)) c = dark;                                                                                 // eyes
    if (kind === 'ghoul' ? (j === Hh - 6 && Math.abs(i) <= 2 && i % 2 === 0) || (j === Hh - 7 && Math.abs(i) <= 2 && i % 2 !== 0) : (j === Hh - 6 && i === 0)) c = dark;      // a grin, or an "o"
    cells.push([i, j, 0, c]);
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1, emissive: kind === 'ghoul' ? 0x3fbf7a : 0x6f8cff, emissiveIntensity: 0.55, depthWrite: false, fog: false }), geo = new THREE.BoxGeometry(u, u, u * 2.2);
  const im = new THREE.InstancedMesh(geo, mat, cells.length), mt = new THREE.Matrix4(), col = new THREE.Color();
  cells.forEach(([i, j, k, c], id) => { mt.makeTranslation(i * u, j * u, k * u); im.setMatrixAt(id, mt); im.setColorAt(id, col.set(c)); }); im.instanceColor.needsUpdate = true; im.renderOrder = 6;
  const group = new THREE.Group(); group.add(im); return { group, mat, kind, age: 0, life: 26 + Math.random() * 8 };
}

// ── the sky over the water: a full moon, and a haunted house on a hill against it, with a bare tree, a crooked fence and two gravestones.
// Flat shapes in the backdrop's own haze, behind the near kelp (it sways across the moon), well above the sand ──
const SIL = 0x0b0a16;
function buildSky() {
  const g = new THREE.Group(), flat = (shape, col, op = 1, ro = -7.2) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, fog: false })); m.renderOrder = ro; return m; };
  const disc = (r, col, op, ro) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r, 0, Math.PI * 2, false); return flat(sh, col, op, ro); };
  const MY = 8.2;      // the moon: big and warm, a thin bright rim, the dark seas of its face, a two-step halo
  const moon = disc(2.7, 0xfff1c4, 1, -7.3), rim = disc(2.8, 0xfff9e6, 0.55, -7.31), halo1 = disc(3.7, 0xffe9a8, 0.14, -7.4), halo2 = disc(5.2, 0xffe0a0, 0.06, -7.5); for (const m of [moon, rim, halo1, halo2]) m.position.y = MY;
  const craters = new THREE.Group(); for (const [x, y, r, op] of [[-1.2, 0.5, 0.95, 0.14], [0.8, -0.9, 0.8, 0.12], [-0.4, -1.4, 0.34, 0.26], [1.5, 1.0, 0.28, 0.26], [0.2, 1.7, 0.22, 0.24], [-1.7, -0.5, 0.2, 0.26], [1.0, 0.3, 0.16, 0.22]]) { const c = disc(r, 0xd2be8e, op, -7.25); c.position.set(x, MY + y, 0.01); craters.add(c); }
  g.add(halo2, halo1, moon, rim, craters); g.moon = moon; g.halos = [halo1, halo2, ...craters.children, rim];
  // clouds: long dark wisps of a few overlapping rounds, drifting slowly across the moon's face
  const cloud = (x, y, w, sp) => { const c = new THREE.Group(); for (let k = 0; k < 6; k++) { const d = disc(w * (0.12 + 0.1 * Math.sin(k * 2.1 + 1)), 0x171430, 0.8, -7.2); d.position.set(-w / 2 + (k / 5) * w, Math.sin(k * 1.7) * w * 0.05, 0); c.add(d); } c.position.set(x, y, 0.02); c.userData.sp = sp; c.userData.w = w; g.add(c); return c; };
  g.clouds = [cloud(-4, MY + 0.9, 4.2, 0.045), cloud(3, MY - 1.4, 3.4, 0.03), cloud(-1, MY + 2.4, 2.6, 0.06)];
  // the hill and what stands on it (local: the hill's foot is y = 0), with a lower hill behind for depth
  const H = new THREE.Group(); H.position.set(0, 5.2, 0.02);
  const poly = (pts, col = SIL, op = 0.96, ro = -7.1) => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); const m = flat(sh, col, op, ro); H.add(m); return m; };
  const hillY = (x) => Math.max(0, 1.25 * Math.cos((x / 5.4) * Math.PI * 0.5) ** 0.8 - 0.05 + 0.06 * Math.sin(x * 3.1));
  { const sh = new THREE.Shape(); sh.moveTo(-7, -0.5); for (let x = -7; x <= 7; x += 0.4) sh.lineTo(x, Math.max(0, 0.9 * Math.max(0, Math.cos(((x + 2.5) / 7) * Math.PI * 0.5)) ** 0.9 + 0.05 * Math.sin(x * 2.3) + 0.3)); sh.lineTo(7, -0.5); sh.closePath(); H.add(flat(sh, 0x16132c, 0.9, -7.15)); }      // the far hill
  { const sh = new THREE.Shape(); sh.moveTo(-5.4, -0.5); for (let x = -5.4; x <= 5.4; x += 0.3) sh.lineTo(x, hillY(x)); sh.lineTo(5.4, -0.5); sh.closePath(); H.add(flat(sh, SIL, 0.97, -7.1)); }      // the near hill
  // the house: a side wing, the main body with a porch, a steep gable with a dormer, a tall tower with a witch-hat roof and a weathervane
  poly([[-0.7, 0.5], [0.6, 0.5], [0.6, 1.9], [-0.7, 1.9]]); poly([[-0.95, 1.85], [-0.05, 2.65], [0.85, 1.85]]);                                              // the wing and its roof
  poly([[0.5, 0.5], [3.4, 0.5], [3.4, 2.7], [0.5, 2.7]]); poly([[0.2, 2.65], [1.95, 4.15], [3.7, 2.65]]);                                                  // the body and the steep gable
  poly([[1.55, 3.0], [2.35, 3.0], [2.35, 3.45], [1.95, 3.75], [1.55, 3.45]]);                                                                              // the dormer
  poly([[0.15, 1.45], [1.85, 1.45], [1.85, 1.62], [0.15, 1.62]]); for (const x of [0.25, 0.95, 1.65]) poly([[x, 0.5], [x + 0.09, 0.5], [x + 0.09, 1.45], [x, 1.45]]);      // the porch roof and its posts
  poly([[1.2, 0.3], [1.7, 0.3], [1.7, 0.5], [1.2, 0.5]]); poly([[1.3, 0.5], [1.6, 0.5], [1.6, 1.2], [1.3, 1.2]], 0x040310, 1);                              // steps and the door
  poly([[3.2, 0.5], [4.25, 0.5], [4.25, 3.9], [3.2, 3.9]]); poly([[2.85, 3.85], [3.72, 5.75], [4.6, 3.85]]);                                              // the tower and its witch-hat roof
  poly([[3.69, 5.7], [3.75, 5.7], [3.75, 6.25], [3.69, 6.25]]); poly([[3.5, 6.05], [3.95, 6.12], [3.5, 6.19]]); poly([[3.62, 6.0], [3.82, 6.0], [3.82, 6.03], [3.62, 6.03]]);      // the weathervane
  const chim1 = poly([[1.0, 2.95], [1.36, 2.95], [1.36, 3.75], [1.0, 3.75]]); chim1.rotation.z = 0.07; chim1.position.x = -0.1; poly([[3.95, 3.7], [4.2, 3.7], [4.2, 4.5], [3.95, 4.5]]);      // two chimneys, one leaning
  const win = (x, y, w, h, col = 0xffb04a) => { const m = poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, 0.95, -7.05); return m; };
  g.windows = [win(0.75, 1.75, 0.34, 0.45), win(2.45, 1.75, 0.34, 0.45), win(3.5, 3.0, 0.3, 0.42), win(3.5, 1.5, 0.3, 0.42), win(-0.35, 1.0, 0.3, 0.4, 0x9affb0), win(2.3, 0.75, 0.34, 0.45), win(1.8, 3.1, 0.3, 0.3)];      // lit windows: one a sickly green, the attic a small square
  for (const w of g.windows) w.userData.ph = Math.random() * 6;
  poly([[2.3, 0.75], [2.64, 0.75], [2.64, 1.2], [2.3, 1.2]], 0x050412, 1, -7.04); poly([[2.36, 0.78], [2.44, 0.95], [2.38, 1.02], [2.52, 1.17], [2.5, 1.17], [2.36, 1.03], [2.42, 0.96]], 0x8a8aa0, 0.6, -7.03);      // one window dark and cracked
  for (const [x, y] of [[0.68, 1.72], [1.12, 1.72], [2.82, 1.72]]) { const sh = poly([[x, y], [x + 0.07, y], [x + 0.07, y + 0.5], [x, y + 0.5]]); sh.rotation.z = (x > 2 ? -1 : 1) * 0.12; }      // shutters hanging askew
  // the graveyard: stones of a few shapes behind a crooked iron fence with a gate, and a path up to the door
  const stone = (x, kind, lean) => { const y0 = hillY(x) - 0.05; let m; if (kind === 'round') m = poly([[x, y0], [x + 0.36, y0], [x + 0.36, y0 + 0.4], [x + 0.3, y0 + 0.52], [x + 0.18, y0 + 0.58], [x + 0.06, y0 + 0.52], [x, y0 + 0.4]]); else if (kind === 'cross') { poly([[x + 0.12, y0], [x + 0.22, y0], [x + 0.22, y0 + 0.62], [x + 0.12, y0 + 0.62]]); m = poly([[x - 0.02, y0 + 0.4], [x + 0.36, y0 + 0.4], [x + 0.36, y0 + 0.5], [x - 0.02, y0 + 0.5]]); } else m = poly([[x, y0], [x + 0.3, y0], [x + 0.3, y0 + 0.45], [x, y0 + 0.45]]); if (m) m.rotation.z = lean; return m; };
  stone(-2.6, 'round', 0.1); stone(-2.0, 'cross', -0.06); stone(-1.5, 'slab', 0.16); stone(-0.95, 'round', -0.12); stone(4.7, 'slab', 0.14); stone(5.05, 'round', -0.08);
  for (let i = 0; i < 16; i++) { const x = -3.4 + i * 0.3; if (x > -1.75 && x < -1.25) continue; const y0 = hillY(x) - 0.08, lean = ((i * 7) % 5 - 2) * 0.05, m = poly([[x, y0], [x + 0.07, y0], [x + 0.07, y0 + 0.5], [x + 0.035, y0 + 0.6], [x, y0 + 0.5]]); m.rotation.z = lean; }      // iron railings, with a gap for the gate
  { const y0 = hillY(-1.5) - 0.05, gate = poly([[-1.72, y0], [-1.28, y0], [-1.28, y0 + 0.45], [-1.5, y0 + 0.55], [-1.72, y0 + 0.45]]); gate.rotation.z = 0.35; gate.position.y = 0.08; }      // the gate, hanging open
  { const sh = new THREE.Shape(); const pts = [[-1.5, hillY(-1.5) + 0.02], [-0.9, hillY(-0.9) + 0.1], [-0.2, hillY(-0.2) + 0.05], [0.6, 0.45], [1.3, 0.3]]; sh.moveTo(pts[0][0], pts[0][1] - 0.06); for (const [x, y] of pts) sh.lineTo(x, y + 0.04); for (const [x, y] of [...pts].reverse()) sh.lineTo(x, y - 0.06); sh.closePath(); H.add(flat(sh, 0x1c1934, 0.9, -7.09)); }      // the path
  // two dead trees, gnarled, their branches reaching for the moon; an owl on a branch of the near one
  const limb = (x0, y0, ang, len, w, depth) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: SIL, transparent: true, opacity: 0.97, depthWrite: false, fog: false })); m.renderOrder = -7.1;
    m.position.set(x0 + Math.cos(ang) * len / 2, y0 + Math.sin(ang) * len / 2, 0); m.rotation.z = ang - Math.PI / 2; H.add(m); const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    if (depth > 0) { limb(x1, y1, ang + 0.5 + 0.12 * depth, len * 0.64, w * 0.62, depth - 1); limb(x1, y1, ang - 0.55 + 0.1 * depth, len * 0.6, w * 0.62, depth - 1); if (depth > 1) limb(x1, y1, ang + 0.08 * (depth % 2 ? 1 : -1), len * 0.5, w * 0.55, depth - 2); } return [x1, y1]; };
  limb(-3.6, hillY(-3.6) - 0.05, Math.PI / 2 + 0.14, 1.6, 0.36, 4); limb(5.2, hillY(5.2) - 0.05, Math.PI / 2 - 0.2, 1.1, 0.26, 3);
  { const owl = new THREE.Group(); const body = disc(0.17, SIL, 0.98, -7.05); body.scale.y = 1.35; owl.add(body); for (const sx of [-1, 1]) { const ear = flat((() => { const sh = new THREE.Shape(); sh.moveTo(sx * 0.05, 0.16); sh.lineTo(sx * 0.16, 0.34); sh.lineTo(sx * 0.14, 0.14); sh.closePath(); return sh; })(), SIL, 0.98, -7.05); owl.add(ear); const eye = disc(0.03, 0xffd060, 0.95, -7.04); eye.position.set(sx * 0.06, 0.08, 0.01); owl.add(eye); } owl.position.set(-2.45, hillY(-2.45) + 2.35, 0.01); H.add(owl); g.owl = owl; }
  // ground fog along the hill's foot
  g.fog = []; for (const [x, w] of [[-3, 3.2], [0.8, 2.6], [3.6, 2.4]]) { const f = disc(1, 0x8e86c0, 0.11, -7.08); f.scale.set(w, 0.28, 1); f.position.set(x, 0.1 + hillY(x) * 0.5, 0.03); f.userData.x0 = x; f.userData.ph = Math.random() * 6; H.add(f); g.fog.push(f); }
  // smoke from the chimneys: little rounds that rise, drift and thin out, then start again
  g.smoke = []; for (const [cx, cy] of [[1.08, 3.75], [4.07, 4.5]]) for (let k = 0; k < 4; k++) { const d = disc(0.12 + k * 0.03, 0x3a3558, 0.5, -7.06); d.position.set(cx, cy, 0.02); d.userData = { cx, cy, k, ph: k / 4 }; H.add(d); g.smoke.push(d); }
  g.add(H); g.hill = H;
  // bats: five, three crossing the moon now and then after dark and two circling the tower, each flapping to its own beat
  const bat = () => { const b = new THREE.Group(), wing = (side) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(side * 0.16, 0.12); sh.lineTo(side * 0.42, 0.06); sh.lineTo(side * 0.34, -0.06); sh.lineTo(side * 0.22, -0.02); sh.lineTo(side * 0.1, -0.1); sh.closePath(); const m = flat(sh, SIL, 0.98, -7.0); b.add(m); return m; };
    const body = disc(0.075, SIL, 0.98, -7.0); body.scale.y = 1.4; b.add(body); b.wings = [wing(1), wing(-1)]; b.visible = false; g.add(b); return b; };
  g.bats = [bat(), bat(), bat()]; g.circlers = [bat(), bat()]; g.batsOn = false; g.batWait = 20;
  g.position.z = -12; return g;
}

// ── the player's own decorations, turned for the holiday (nothing added, nothing moved: the same voxels, repainted, so every den, hiding place,
// climb and seahorse hold works exactly as before). The coconut is a jack-o'-lantern an octopus can live in, the clay pot a witch's cauldron,
// the rocks and the coralline ball skulls, the cave a crypt, and every plant a bleached, bony skeleton of itself ──
const lin1 = (x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }, LIN = (c) => [lin1(c[0]), lin1(c[1]), lin1(c[2])];
const SKINS = new Set(['coconut', 'pot', 'rock', 'boulder', 'cave', 'moss']);

// the coconut shell as a jack-o'-lantern: a ribbed pumpkin squashed front-to-back to the shell's own depth, hollow inside and lit, its big round
// mouth exactly where the shell's opening is (so an octopus going in through the mouth is going in through the real door), two triangle eyes and
// a nose cut above it, jagged teeth round the mouth, a stem on top. The coconut's own voxels stay as the collider; only the look changes
function buildLanternShell(seed = 5) {
  const u = 0.068, v = new Vox(u), RI = 14, RJ = 15, RK = 7.5, CJ = 1, CK = -6, HOLE = 9.8, skin = [240, 126, 36], dark = [166, 70, 16], glow = [255, 222, 130], inner = [255, 170, 60];
  for (let i = -RI - 1; i <= RI + 1; i++) for (let j = -RJ + CJ - 1; j <= RJ + CJ + 1; j++) for (let k = CK - RK - 1; k <= 1; k++) {
    const dy = (j - CJ) / RJ, dz = (k - CK) / RK, rib = 1 - 0.07 * (0.5 + 0.5 * Math.cos(Math.atan2(j - CJ, i) * 9)), d = Math.sqrt((i / (RI * rib)) ** 2 + dy * dy + dz * dz);
    if (d > 1) continue;
    const front = k >= -2, mouth = Math.hypot(i, j) < HOLE && front;      // the round mouth: the shell's opening, kept clear
    if (mouth) continue;
    const inside = d < 0.78 && !(front && Math.hypot(i, j) < HOLE + 2.5);      // the hollow (lit from within)
    if (inside) { if (d < 0.7) continue; v.set(i, j, k, mix(inner, glow, hash(i, j, k, seed) * 0.4), 1.15); continue; }
    let c = mix(skin, dark, 0.2 + 0.6 * (0.5 + 0.5 * Math.cos(Math.atan2(j - CJ, i) * 9)) + (hash(i, j, k, seed) - 0.5) * 0.2);
    if (front) { const r = Math.hypot(i, j); if (r < HOLE + 1.6 && (Math.round(Math.atan2(j, i) * 4.5) % 2 === 0 || r < HOLE + 0.8)) c = glow;      // the mouth's lit rim, with teeth
      const eye = Math.abs(Math.abs(i) - 6) <= (j - 9.5) * 1.05 && j >= 9.5 && j <= 14.5, nose = Math.abs(i) <= (12.5 - j) * 0.9 && j >= 9.5 && j <= 12.5; if (eye || nose) c = [255, 240, 150]; }      // two big triangle eyes and a nose cut above the mouth, lit from inside
    v.set(i, j, k, c);
  }
  for (let j = RJ + CJ; j <= RJ + CJ + 3; j++) v.set(0, j, CK, [84, 118, 42]); v.set(1, RJ + CJ + 3, CK, [84, 118, 42]); v.set(-1, RJ + CJ, CK + 1, [110, 150, 60]); v.set(1, RJ + CJ, CK - 1, [110, 150, 60]);      // the stem and two leaves
  return v.mesh();
}
function skinMesh(im, type, it, extra) {
  if (im.userData.hw0 || !im.instanceColor) return; const a = im.instanceColor.array, u = im.geometry.parameters.width, mt = new THREE.Matrix4(), v = new THREE.Vector3(); im.userData.hw0 = Float32Array.from(a);
  const n = im.count; let R = [5.5, 3.6, 5]; if (type === 'boulder') R = [12, 7.8, 9]; if (type === 'moss') R = [5.4, 4.3, 5.1]; if (type === 'cave') R = [10.5, 8.5, 9];
  for (let id = 0; id < n; id++) {
    im.getMatrixAt(id, mt); v.setFromMatrixPosition(mt); const i = Math.round(v.x / u), j = Math.round(v.y / u), k = Math.round(v.z / u), o = id * 3, l0 = a[o] * 0.3 + a[o + 1] * 0.59 + a[o + 2] * 0.11, q = hash(i, j, k, 5); let c = null, keep = 0;
    if (type === 'coconut') { const d = Math.hypot(i, j, k), hole = 9.8;      // (the shell's own radii: see items.js)
      if (k >= 0 || d < hole + 1.6) c = d < hole + 1.6 && k < 0 ? mix([255, 214, 120], [255, 150, 40], Math.min(1, (-k - 2) / 9)) : [255, 226, 140];      // the cut rim and the hollow glow like a candle inside
      else if (d < hole + 2.7) c = [120, 54, 16];      // the shell between
      else { const ang = Math.atan2(j, i), rib = 0.5 + 0.5 * Math.cos(ang * 8); c = mix([238, 122, 34], [168, 70, 16], 0.2 + 0.6 * rib + (q - 0.5) * 0.2);
        const eye = j > 5 && Math.abs(Math.abs(i) - 5) <= (j - 6) * 0.8 && j <= 10 && k < -2 && k > -9; if (eye) c = [255, 232, 150]; }      // two triangle eyes cut in the top, over the opening
    } else if (type === 'pot') { const d = Math.hypot(j - 8, k), inside = i > -9 && i < 9 && d < 6.6; if (inside) c = mix([60, 200, 110], [20, 90, 50], Math.max(0, Math.min(1, (8 - i) / 14)) * 0.8); else c = i >= 9 ? [86, 86, 96] : mix([34, 32, 40], [62, 60, 70], q * 0.6 + (j > 12 ? 0.25 : 0)); }      // black iron, a green brew glowing in the mouth
    else if (type === 'rock' || type === 'boulder' || type === 'moss') { const [rx, ry] = R; c = mix([214, 206, 184], [160, 150, 128], q * 0.6); if (j > ry * 0.5 && l0 < 0.09 && q > 0.6) keep = 0.5;      // bone, a little of the old moss left on top
      if (k > 0) { const ex = rx * 0.42, ey = ry * 0.25, er = Math.max(1.1, rx * 0.22); if (Math.hypot(Math.abs(i) - ex, j - ey) <= er) c = [26, 22, 30]; else if (Math.abs(i) <= Math.max(0.6, (ry * -0.15 - j) * 0.6) && j < -ry * 0.15 && j > -ry * 0.5) c = [40, 34, 40]; else if (j <= -ry * 0.55 && j > -ry * 0.85 && Math.abs(i) < rx * 0.6) c = Math.round(i) % 2 === 0 ? [240, 236, 220] : [30, 26, 30]; } }      // eye sockets, a nose, a row of teeth on the front face
    else if (type === 'cave') { c = l0 < 0.05 ? mix([40, 110, 70], [20, 60, 40], q) : mix([74, 78, 96], [46, 48, 62], q * 0.7); }      // cold stone, a green glow in the dark inside
    else if (PLANTS.has(type)) { const p = Math.sqrt(l0); c = p < 0.3 ? mix([70, 62, 54], [110, 100, 88], q) : mix([196, 186, 168], [236, 230, 216], Math.min(1, (p - 0.3) / 0.5)); keep = 0.08; }      // bleached: dark at the root, bone toward the tips
    if (!c) continue; const L = LIN(c), sh = Math.max(0.6, Math.min(1.3, 0.85 + 2.2 * (l0 - 0.12)));
    for (let t = 0; t < 3; t++) a[o + t] = L[t] * sh * (1 - keep) + a[o + t] * keep;
  }
  im.instanceColor.needsUpdate = true;
}
function skinItem(it, lights) {
  if (it.hwSkin) return; const type = it.type, shell = type.startsWith('cshell_'); if (!SKINS.has(type) && !PLANTS.has(type) && !shell) return; it.hwSkin = true; it.hwExtra = [];
  if (shell) { const h = [...String(it.id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7), kind = SHELL_KINDS[h % SHELL_KINDS.length]; it.group.traverse((o) => { if (o.isInstancedMesh) shellSkin(o, kind); }); return; }      // an empty shell on the sand: a little hat or pumpkin or candy corn, the same way the crabs' shells are
  if (type === 'coconut') { it.hwHidden = []; it.group.traverse((o) => { if (o.isInstancedMesh && o.visible) { o.visible = false; it.hwHidden.push(o); } }); const m = buildLanternShell(5); m.position.set(0, 0.068 * 10, 0); it.group.add(m); it.hwExtra.push(m); }      // the shell's look gives way to a carved pumpkin (the collider is still the shell's)
  else it.group.traverse((o) => { if (o.isInstancedMesh) skinMesh(o, type, it); });
  if (type === 'coconut') {
    if (lights.n < 3) { const l = new THREE.PointLight(0xffa040, 0, 3.4, 2); l.position.set(0, 0.7, 0.1); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; lights.n++; } }
  if (type === 'pot' && lights.n < 3) { const l = new THREE.PointLight(0x5cff9a, 0, 2.6, 2); l.position.set(0, 1.0, 1.1); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; it.hwGreen = true; lights.n++; }
  if (type === 'cave' && lights.n < 3) { const l = new THREE.PointLight(0x5cff9a, 0, 2.2, 2); l.position.set(0, 0.5, 0.2); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; it.hwGreen = true; lights.n++; }
}
function unskinItem(it) { if (!it.hwSkin) return; it.hwSkin = false; for (const o of it.hwHidden ?? []) o.visible = true; it.hwHidden = null; it.group.traverse((o) => { if (o.isInstancedMesh && o.userData.hw0) { o.instanceColor.array.set(o.userData.hw0); o.instanceColor.needsUpdate = true; delete o.userData.hw0; delete o.userData.hwKind; } }); for (const m of it.hwExtra ?? []) { it.group.remove(m); m.geometry?.dispose?.(); } it.hwExtra = []; it.hwLight = null; }
// cobwebs strung from the tallest plants, with a spider on a thread under one
let webTex = null;
const cobwebTexture = () => { if (webTex) return webTex; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); g.stroke(); }
  for (let r = 10; r <= 60; r += 10) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4, a0 = (i - 0.5) * Math.PI / 4, rr = r * 0.9; if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.quadraticCurveTo(Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
  webTex = new THREE.CanvasTexture(c); return webTex; };
function buildCobweb(size) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: cobwebTexture(), transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.renderOrder = 5; return m; }
function buildSpider() { const v = new Vox(0.045), B = [20, 16, 24]; v.fill(-1, 0, -1, 1, 1, 1, B); v.set(2, 0, 0, B); v.set(2, 1, 0, [60, 20, 30]); for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { v.set(i - 1, 0, side * 2, B); v.set(i - 1, i % 2 ? -1 : 0, side * 3, B); v.set(i - 1, -1, side * 4, B); }
  const g = new THREE.Group(), m = v.mesh(); g.add(m); const th = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1, 0.012), new THREE.MeshBasicMaterial({ color: 0xf0f0ff, transparent: true, opacity: 0.6 })); th.position.y = 0.5; g.add(th); g.thread = th; return g; }
// candidate spots on the front sand, used only where no real decoration stands
const FALLBACK = [[-2.3, 1.9], [2.3, 2.0], [0.4, 2.2]];      /* a jack-o'-lantern on the front sand only when nothing in the tank can become one */

export class SeasonDress {
  constructor(scene, solids) { this.scene = scene; this.solids = solids; this.items = []; this.id = null; this.phase = 'day'; }
  // decorMgr: the placed decorations, to keep clear of
  apply(season, decorMgr) {
    const id = season?.decor === 'pumpkins' ? season.id : null; if (id === this.id) return; this.clear(); this.id = id; if (!id) return;
    this.ghostly = season.id === 'halloween'; this.ghostWait = 6; this.decor = decorMgr ?? null; this.animals = this.animals ?? []; this.lights = { n: 0 }; this.tag = `${season.id}-${new Date(season.from).getFullYear()}`;      /* (this holiday, this year: what a kept costume is filed under) */
    if (this.ghostly) { this.sky = buildSky(); this.scene.add(this.sky); this.dressDecor(); }      // the moon and the house; the decorations turned; the animals' costumes go on as update() meets them
    this.setPhase(this.phase);
  }
  // the player's decorations turn (and turn back): on the holiday's first frame, and again whenever one is put down during it. Nothing is added
  // unless there is nothing at all to turn into a jack-o'-lantern: then one small lit pumpkin stands on the front sand
  dressDecor() {
    const D = this.decor; if (!D?.items) return; const plants = []; let lanterns = 0; this.lights.n = [...D.items.values()].filter((it) => it.hwLight).length;      /* (three lights at most, for phones: counted afresh, since a lantern may have been sold) */
    for (const it of D.items.values()) { skinItem(it, this.lights); if (PLANTS.has(it.type)) plants.push(it); if (it.type === 'coconut' || it.type === 'pot') lanterns++; }
    if (!lanterns && !this.items.length) { const taken = [...D.items.values()].map((it) => it.at), spot = FALLBACK.find(([x, z]) => !taken.some((a) => Math.hypot(a.x - x, a.z - z) < 1.3)); if (spot) { const it = buildPumpkin(1, true), [x, z] = spot; for (const p of it.parts) p.soft = true; placeGroup(it, x, z, 0.3); stampItem(it, this.solids, x, z, 0.3, 1); it.at = { x, z, ry: 0.3 }; this.scene.add(it.group); this.items.push(it); this.setPhase(this.phase); } }
    else if (lanterns && this.items.length) { for (const it of this.items) { stampItem(it, this.solids, it.at.x, it.at.z, it.at.ry, -1); this.scene.remove(it.group); disposeItem(it); } this.items = []; }      // (a coconut or a pot arrived: the stand-in goes)
    this.webs ||= [];
    for (const w of [...this.webs]) if (w.it && (!D.items.has(w.it.id) || w.it.at.x !== w.at.x || w.it.at.z !== w.at.z)) { this.scene.remove(w); this.webs.splice(this.webs.indexOf(w), 1); if (w === this.spider) this.spider = null; }      // a webbed plant taken away, or moved, takes its web with it (a new one is strung next pass)
    if (this.webs.length) return; const tall = plants.map((it) => { const b = new THREE.Box3().setFromObject(it.group); return { it, b, h: b.max.y - b.min.y }; }).filter((p) => p.h > 0.7).sort((a, b) => b.h - a.h).slice(0, 2);
    tall.forEach((p, k) => { const w = Math.min(1.1, 0.55 + p.h * 0.3), web = buildCobweb(w); web.position.set((p.b.min.x + p.b.max.x) / 2 + 0.12, p.b.max.y - w * 0.3, (p.b.min.z + p.b.max.z) / 2 + 0.3); web.rotation.y = k ? -0.3 : 0.35; web.rotation.z = 0.15; web.it = p.it; web.at = { ...p.it.at }; this.scene.add(web); this.webs.push(web);
      if (k === 0) { const sp = buildSpider(); sp.position.set(web.position.x - 0.1, web.position.y - w * 0.5 - 0.45, web.position.z + 0.05); sp.top = sp.position.y; sp.it = p.it; sp.at = { ...p.it.at }; this.scene.add(sp); this.webs.push(sp); this.spider = sp; } });
  }
  // every animal in the tank wears a costume (costume.js), new arrivals included
  // every animal in the tank wears a costume (costume.js), new arrivals included. The pick is kept with the tank (main.js wires store.get/set to
  // the fish record and the shared 'costume' action), so every phone dresses an animal the same way and a reload keeps it; until the record
  // arrives a phone dresses from the same deterministic pick the lead phone will write. At least one seahorse always runs as a racehorse
  dressAnimals(list) { if (!list) return; this.animals = list; const used = new Set(), S = this.store, tag = this.tag, sorted = [...list].sort((a, b) => String(a.fid ?? a.name).localeCompare(String(b.fid ?? b.name)));      /* (the same order on every phone) */
    const stored = (f) => { const c = S?.get?.(f); return c && c.tag === tag ? c.kind : null; };
    for (const f of sorted) { const k = stored(f) ?? f.hw?.kind; if (k) used.add(k); }
    const grownSea = (f) => !!f.sp?.tail && !f.nursery && (f.cute ?? 0) <= 0.3 && !!f.vox && !!f.mesh;      /* (a grown seahorse: a nursery baby wears paint only and does not count) */
    let anyRace = sorted.some((f) => grownSea(f) && (stored(f) ?? f.hw?.kind) === 'racehorse'), budget = 2;      /* (two new costumes a frame: a full tank dresses over a second or so instead of stalling one frame at boot) */
    const OCTO = ['pumpkin', 'octoghost'], octoWant = new Map(); sorted.filter((f) => f.species?.move === 'jet' && f.vox && f.mesh).forEach((f, i) => octoWant.set(f, OCTO[i % OCTO.length]));      /* (two octopuses never dress alike: the first in order is the jack-o'-lantern, the next the ghost, whatever an older record says) */
    for (const [f, want] of octoWant) { const cur = stored(f) ?? f.hw?.kind; if (cur === want || budget <= 0) continue; if (f.hw) undress(f); try { dress(f, want); if (f.fid) S?.set?.(f, want, tag); budget--; } catch (e) { f.hw = { kind: null, parts: [], label: null }; } }
    if (!anyRace) { const first = sorted.find(grownSea); if (first) { if (first.hw && first.hw.kind !== 'racehorse') undress(first); if (!first.hw) { try { dress(first, 'racehorse'); if (first.fid) S?.set?.(first, 'racehorse', tag); anyRace = true; budget--; } catch (e) { first.hw = { kind: null, parts: [], label: null }; } } } }      // with seahorses in the tank one of them is always the racehorse, even if the one that was has left or the record says otherwise
    for (const f of sorted) { if (!f.vox || !f.mesh) continue;
      const rec = stored(f);
      if (f.hw) { if (rec && f.hw.kind && rec !== f.hw.kind && !(octoWant.get(f) === f.hw.kind) && !(f.hw.kind === 'racehorse' && grownSea(f) && !sorted.some((o) => o !== f && grownSea(o) && stored(o) === 'racehorse')) && budget-- > 0) { undress(f); try { dress(f, rec); } catch (e) { f.hw = { kind: null, parts: [], label: null }; } } else f.hw.place?.(); continue; }      // the tank's record wins over a provisional pick (except the one racehorse the tank must keep)
      if (budget-- <= 0) continue;
      let kind = rec; if (!kind) { kind = costumeFor(f, used); if (f.fid) S?.set?.(f, kind, tag); }
      try { const hw = dress(f, kind); if (hw) used.add(hw.kind); } catch (e) { f.hw = { kind: null, parts: [], label: null }; console.warn('costume', e); } } }
  clear() { for (const it of this.items) { stampItem(it, this.solids, it.at.x, it.at.z, it.at.ry, -1); this.scene.remove(it.group); disposeItem(it); } this.items = []; this.id = null; this.ghostly = false; for (const g of this.ghosts ?? []) this.scene.remove(g.group); this.ghosts = [];
    if (this.sky) { this.scene.remove(this.sky); this.sky.traverse((o) => { o.geometry?.dispose?.(); if (o.material && !Array.isArray(o.material)) o.material.dispose?.(); }); this.sky = null; }
    for (const w of this.webs ?? []) this.scene.remove(w); this.webs = []; this.spider = null;
    if (this.decor?.items) for (const it of this.decor.items.values()) unskinItem(it);
    for (const f of this.animals ?? []) if (f.hw) undress(f); }
  // the candle inside: bright at night, a flicker in the evening, nothing by day
  setPhase(p) { this.phase = p; const k = p === 'night' ? 1 : p === 'evening' ? 0.55 : 0; for (const it of this.items) { if (it.light) it.light.intensity = (it.type === 'skull' ? 0.9 : 2.2) * k; if (it.eyeMat) it.eyeMat.opacity = 0.35 + 0.6 * k; }
    if (this.decor?.items) for (const it of this.decor.items.values()) if (it.hwLight) it.hwLight.intensity = (it.hwGreen ? 0.8 : 1.8) * (0.25 + 0.75 * k);      /* (a candle in the lantern, a brew in the cauldron: low by day, bright after dark) */
    if (this.sky) { const S = this.sky; S.moon.material.opacity = 0.45 + 0.55 * k; S.halos.forEach((h, i) => (h.material.opacity = (i === 0 ? 0.13 : i === 1 ? 0.06 : 0.22) * (0.5 + 0.5 * k))); for (const w of S.windows) w.material.opacity = 0.15 + 0.8 * k; } }      // the moon pale by day, full and bright at night; the windows lit after dark
  update(dt, t, animals = null) {
    if (this.ghostly) { this.dressAnimals(animals); if (animals) for (const f of animals) f.hw?.tick?.(dt, t); const nD = this.decor?.items?.size ?? 0; if ((this.plantT = (this.plantT ?? 0) + dt) > 1 || nD !== this.lastN) { this.plantT = 0; this.lastN = nD; this.dressDecor(); }      /* (and at once when a decoration comes or goes: a stand-in pumpkin leaves the moment a coconut arrives) */
      if (this.decor?.items) for (const it of this.decor.items.values()) if (it.hwLight && !it.hwGreen) it.hwLight.intensity = 1.8 * (0.25 + 0.75 * (this.phase === 'night' ? 1 : this.phase === 'evening' ? 0.55 : 0)) * (0.85 + 0.15 * Math.sin(t * 6.3 + it.at.x * 3) * Math.sin(t * 2.7)); }
    if (this.sky) { const S = this.sky, dark = this.phase === 'night' || this.phase === 'evening'; for (const w of S.windows) w.material.opacity = (dark ? 0.95 : 0.15) * (0.82 + 0.18 * Math.sin(t * 9 + (w.userData.ph ?? 0)) * Math.sin(t * 2.3 + (w.userData.ph ?? 0)));      // candlelight in the windows
      for (const c of S.clouds) { c.position.x += c.userData.sp * dt; if (c.position.x > 9) c.position.x = -9; }      // the clouds drift across the moon
      for (const d of S.smoke) { const u = ((t * 0.09 + d.userData.ph) % 1 + 1) % 1; d.position.set(d.userData.cx + Math.sin(u * 5 + d.userData.k) * 0.18 + u * 0.5, d.userData.cy + u * 1.4, 0.02); const sc = 0.6 + u * 1.6; d.scale.set(sc, sc, 1); d.material.opacity = (dark ? 0.5 : 0.3) * (1 - u) * Math.min(1, u * 6); }      // smoke rising and thinning
      for (const f of S.fog) { f.position.x = f.userData.x0 + Math.sin(t * 0.07 + f.userData.ph) * 0.5; f.material.opacity = 0.09 + 0.04 * Math.sin(t * 0.11 + f.userData.ph); }      // ground fog breathing
      for (const [i, b] of S.circlers.entries()) { b.visible = dark; if (dark) { const a = t * (0.5 + i * 0.13) + i * 2.1, R = 1.0 + 0.3 * Math.sin(t * 0.3 + i); b.position.set(3.72 + Math.cos(a) * R, 5.2 + 5.4 + Math.sin(a * 2) * 0.35 + i * 0.4, 0.05); b.scale.x = Math.cos(a) > 0 ? -1 : 1; const fl = Math.sin(t * 15 + i * 1.7); b.wings[0].rotation.x = fl * 0.9; b.wings[1].rotation.x = fl * 0.9; } }      // two bats circling the tower after dark
      if (!S.batsOn && dark && (S.batWait -= dt) <= 0) { S.batsOn = true; S.batT = 0; S.batDir = Math.random() < 0.5 ? 1 : -1; S.batY = 6.8 + Math.random() * 3; for (const b of S.bats) b.visible = true; }
      if (S.batsOn) { S.batT += dt; const u = S.batT / 11; if (u >= 1) { S.batsOn = false; S.batWait = 35 + Math.random() * 50; for (const b of S.bats) b.visible = false; }
        else S.bats.forEach((b, i) => { const uu = u - i * 0.06, x = (-7 + 14 * uu) * S.batDir; b.position.set(x, S.batY + Math.sin(t * 2.1 + i * 2) * 0.35 + i * 0.6 - 0.6, 0.05); b.scale.x = S.batDir; const fl = Math.sin(t * 14 + i * 1.7); b.wings[0].rotation.x = fl * 0.9; b.wings[1].rotation.x = fl * 0.9; }); } }
    if (this.spider) { const sp = this.spider, y = sp.top - 0.12 + 0.12 * Math.sin(t * 0.7); sp.position.y = y; sp.thread.scale.y = Math.max(0.05, ((this.webs.find((w) => w.it === sp.it && w !== sp)?.position.y ?? y + 0.5) - y) / 1); sp.thread.position.y = sp.thread.scale.y / 2; sp.rotation.y = Math.sin(t * 0.4) * 0.5; }      // the spider lets itself down and climbs back, turning on its thread
    for (const it of this.items) if (it.light && it.light.intensity > 0) it.light.intensity = (it.type === 'skull' ? 0.9 : this.phase === 'night' ? 2.2 : 1.2) * (0.85 + 0.15 * Math.sin(t * 7 + it.at.x) * Math.sin(t * 3.1));
    // ghosts after dark: one at a time, now and then, drifting the width of the tank behind the fish and fading as it goes
    this.ghosts ||= [];
    const dark = this.phase === 'night' || this.phase === 'evening';
    if (this.ghostly && !this.ghosts.length && (this.ghostWait -= dt * (dark ? 1 : 0.4)) <= 0) this.spawnGhost();      /* (by day too, but rarer and fainter: Halloween is a whole day) */
    for (const g of [...this.ghosts]) { g.age += dt; const u = g.age / g.life, fade = Math.min(1, u * 6, (1 - u) * 6); g.mat.opacity = Math.max(0, (dark ? 0.62 : 0.4) * fade);
      g.group.position.set(g.x0 + (g.x1 - g.x0) * u, g.y + Math.sin(t * 1.1 + g.ph) * 0.35, g.z + Math.sin(t * 0.7 + g.ph) * 0.2); g.group.rotation.y = g.dir > 0 ? 0.35 : -0.35; g.group.rotation.z = Math.sin(t * 0.9 + g.ph) * 0.08;
      if (u >= 1) { this.scene.remove(g.group); g.group.traverse((o) => { if (o.isInstancedMesh) { o.geometry.dispose(); o.material.dispose(); } }); this.ghosts.splice(this.ghosts.indexOf(g), 1); this.ghostWait = 40 + Math.random() * 50; } }
  }
  spawnGhost(kind = Math.random() < 0.3 ? 'ghoul' : 'ghost') {
    const g = buildGhost(kind), dir = Math.random() < 0.5 ? 1 : -1; Object.assign(g, { dir, x0: -dir * 5.2, x1: dir * 5.2, y: 4.5 + Math.random() * 5, z: -1.6 + Math.random() * 1.4, ph: Math.random() * 6 });
    g.group.position.set(g.x0, g.y, g.z); this.scene.add(g.group); this.ghosts.push(g); return g;
  }
  spots() { return this.items.map((it) => ({ id: 'season:' + it.at.x, type: 'pumpkin', x: it.at.x, z: it.at.z, ry: it.at.ry, h: 0.9, y: it.group.position.y })); }
}
