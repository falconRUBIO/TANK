// What a season looks like in the water: for Halloween, two carved pumpkins on the front sand that glow after dark. Built like every other
// decoration (chunky voxels, baked light), solid to the fish, never in the game's decor list: they come with the date and go with it.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';
import { placeGroup, stampItem, disposeItem } from './items.js';
import { DECOR_DEF } from '../game/rules.js';
import { PLANTS } from './grips.js';
import { dress, undress, costumeFor } from './costume.js';

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
  const moon = disc(2.3, 0xfff1bc, 1, -7.3), halo1 = disc(3.1, 0xffe9a8, 0.13, -7.4), halo2 = disc(4.2, 0xffe9a8, 0.06, -7.5); moon.position.y = halo1.position.y = halo2.position.y = 8.0;
  const craters = new THREE.Group(); for (const [x, y, r] of [[-0.8, 0.6, 0.5], [0.7, -0.4, 0.38], [-0.3, -1.1, 0.28], [1.1, 0.9, 0.22]]) { const c = disc(r, 0xcbb98a, 0.22, -7.25); c.position.set(x, 8.0 + y, 0.01); craters.add(c); }
  g.add(halo2, halo1, moon, craters); g.moon = moon; g.halos = [halo1, halo2, ...craters.children];
  // the hill and what stands on it (local: the hill's foot is y = 0)
  const H = new THREE.Group(); H.position.set(0, 5.2, 0.02);
  const poly = (pts, col = SIL, op = 0.96) => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); const m = flat(sh, col, op, -7.1); H.add(m); return m; };
  { const sh = new THREE.Shape(); sh.moveTo(-5.2, -0.5); for (let x = -5.2; x <= 5.2; x += 0.4) sh.lineTo(x, Math.max(0, 1.05 * Math.cos((x / 5.2) * Math.PI * 0.5) ** 0.8 - 0.05 + 0.06 * Math.sin(x * 3.1))); sh.lineTo(5.2, -0.5); sh.closePath(); H.add(flat(sh, SIL, 0.96, -7.1)); }      // the hill
  poly([[0.6, 0.5], [3.3, 0.5], [3.3, 2.5], [0.6, 2.5]]); poly([[0.3, 2.45], [1.95, 3.75], [3.55, 2.45]]);                                                    // the house and its roof
  poly([[3.2, 0.5], [4.15, 0.5], [4.15, 3.5], [3.2, 3.5]]); poly([[3.0, 3.45], [3.68, 4.95], [4.35, 3.45]]);                                                 // the tower and its steeple
  poly([[0.95, 2.8], [1.35, 2.8], [1.35, 3.6], [0.95, 3.6]]); poly([[0.4, 3.6], [1.9, 3.6], [1.9, 3.72], [0.4, 3.72]]);                                        // the chimney, the ridge
  poly([[1.75, 0.5], [2.25, 0.5], [2.25, 1.3], [1.75, 1.3]], 0x030308, 1);                                                                                    // the door
  const win = (x, y, w, h) => { const m = poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 0xffb04a, 0.95); m.renderOrder = -7.05; return m; };
  g.windows = [win(1.0, 1.45, 0.34, 0.45), win(2.35, 1.45, 0.34, 0.45), win(3.5, 2.7, 0.3, 0.42), win(1.0, 0.75, 0.34, 0.3)];
  for (const [x, w, h, lean] of [[-1.9, 0.42, 0.55, 0.12], [-1.15, 0.34, 0.42, -0.08]]) { const m = poly([[x, 0.08], [x + w, 0.08], [x + w, h - w * 0.5], [x + w * 0.5, h + 0.05], [x, h - w * 0.5]]); m.rotation.z = lean; m.position.y = 0.4 * Math.cos((x / 5.2) * Math.PI * 0.5); }      // two gravestones
  for (let i = 0; i < 7; i++) { const x = 0.95 - i * 0.37 - 1.5, lean = (i % 3 - 1) * 0.1, y0 = 1.05 * Math.cos((x / 5.2) * Math.PI * 0.5) ** 0.8 - 0.08; const m = poly([[x, y0], [x + 0.1, y0], [x + 0.1, y0 + 0.5], [x + 0.05, y0 + 0.6], [x, y0 + 0.5]]); m.rotation.z = lean; }      // a crooked fence
  // a bare tree, its branches reaching toward the moon: a trunk and twigs as thin slabs
  const limb = (x0, y0, ang, len, w, depth) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: SIL, transparent: true, opacity: 0.96, depthWrite: false, fog: false })); m.renderOrder = -7.1;
    m.position.set(x0 + Math.cos(ang) * len / 2, y0 + Math.sin(ang) * len / 2, 0); m.rotation.z = ang - Math.PI / 2; H.add(m); const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    if (depth > 0) { limb(x1, y1, ang + 0.45 + 0.1 * depth, len * 0.62, w * 0.6, depth - 1); limb(x1, y1, ang - 0.5 + 0.08 * depth, len * 0.58, w * 0.6, depth - 1); if (depth > 1) limb(x1, y1, ang + 0.05, len * 0.5, w * 0.55, depth - 2); } };
  limb(-3.1, 0.85, Math.PI / 2 + 0.12, 1.5, 0.32, 3);
  g.add(H); g.hill = H;
  // bats: three small ones that cross the moon now and then after dark, each flapping to its own beat
  const bat = () => { const b = new THREE.Group(), wing = (side) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(side * 0.16, 0.12); sh.lineTo(side * 0.42, 0.06); sh.lineTo(side * 0.34, -0.06); sh.lineTo(side * 0.22, -0.02); sh.lineTo(side * 0.1, -0.1); sh.closePath(); const m = flat(sh, SIL, 0.98, -7.0); b.add(m); return m; };
    const body = disc(0.075, SIL, 0.98, -7.0); body.scale.y = 1.4; b.add(body); b.wings = [wing(1), wing(-1)]; b.visible = false; g.add(b); return b; };
  g.bats = [bat(), bat(), bat()]; g.batsOn = false; g.batWait = 20;
  g.position.z = -12; return g;
}

// ── the player's own decorations, turned for the holiday (nothing added, nothing moved: the same voxels, repainted, so every den, hiding place,
// climb and seahorse hold works exactly as before). The coconut is a jack-o'-lantern an octopus can live in, the clay pot a witch's cauldron,
// the rocks and the coralline ball skulls, the cave a crypt, and every plant a bleached, bony skeleton of itself ──
const lin1 = (x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }, LIN = (c) => [lin1(c[0]), lin1(c[1]), lin1(c[2])];
const SKINS = new Set(['coconut', 'pot', 'rock', 'boulder', 'cave', 'moss']);
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
  if (it.hwSkin) return; const type = it.type; if (!SKINS.has(type) && !PLANTS.has(type)) return; it.hwSkin = true; it.hwExtra = [];
  it.group.traverse((o) => { if (o.isInstancedMesh) skinMesh(o, type, it); });
  if (type === 'coconut') { const v = new Vox(0.068); for (let j = 0; j <= 3; j++) v.set(j >= 2 ? 1 : 0, j, 0, [84, 118, 42]); v.set(2, 3, 0, [84, 118, 42]); const m = v.mesh(); m.position.set(0, 0.068 * 13 + 0.6, -0.3); it.group.add(m); it.hwExtra.push(m);      // a stem on top
    if (lights.n < 3) { const l = new THREE.PointLight(0xffa040, 0, 3.2, 2); l.position.set(0, 0.5, 0.5); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; lights.n++; } }
  if (type === 'pot' && lights.n < 3) { const l = new THREE.PointLight(0x5cff9a, 0, 2.6, 2); l.position.set(0, 1.0, 1.1); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; it.hwGreen = true; lights.n++; }
  if (type === 'cave' && lights.n < 3) { const l = new THREE.PointLight(0x5cff9a, 0, 2.2, 2); l.position.set(0, 0.5, 0.2); it.group.add(l); it.hwExtra.push(l); it.hwLight = l; it.hwGreen = true; lights.n++; }
}
function unskinItem(it) { if (!it.hwSkin) return; it.hwSkin = false; it.group.traverse((o) => { if (o.isInstancedMesh && o.userData.hw0) { o.instanceColor.array.set(o.userData.hw0); o.instanceColor.needsUpdate = true; delete o.userData.hw0; } }); for (const m of it.hwExtra ?? []) { it.group.remove(m); m.geometry?.dispose?.(); } it.hwExtra = []; it.hwLight = null; }
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
    this.ghostly = season.id === 'halloween'; this.ghostWait = 6; this.decor = decorMgr ?? null; this.animals = this.animals ?? []; this.lights = { n: 0 };
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
  dressAnimals(list) { if (!list) return; this.animals = list; const used = new Set(); const sorted = [...list].sort((a, b) => String(a.fid ?? a.name).localeCompare(String(b.fid ?? b.name)));      /* (the same order on every phone) */
    for (const f of sorted) if (f.hw?.kind) used.add(f.hw.kind);
    for (const f of sorted) { if (!f.vox || !f.mesh) continue; if (!f.hw) { try { const hw = dress(f, costumeFor(f, used)); if (hw) used.add(hw.kind); } catch (e) { f.hw = { kind: null, parts: [], label: null }; console.warn('costume', e); } } else f.hw.place?.(); } }
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
    if (this.ghostly) { this.dressAnimals(animals); if ((this.plantT = (this.plantT ?? 0) + dt) > 1) { this.plantT = 0; this.dressDecor(); }
      if (this.decor?.items) for (const it of this.decor.items.values()) if (it.hwLight && !it.hwGreen) it.hwLight.intensity = 1.8 * (0.25 + 0.75 * (this.phase === 'night' ? 1 : this.phase === 'evening' ? 0.55 : 0)) * (0.85 + 0.15 * Math.sin(t * 6.3 + it.at.x * 3) * Math.sin(t * 2.7)); }
    if (this.sky) { const S = this.sky, dark = this.phase === 'night' || this.phase === 'evening'; for (const w of S.windows) w.material.opacity = (dark ? 0.95 : 0.15) * (0.82 + 0.18 * Math.sin(t * 9 + w.position.x * 7) * Math.sin(t * 2.3));      // candlelight in the windows
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
