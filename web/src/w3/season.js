// What a season looks like in the water: for Halloween, two carved pumpkins on the front sand that glow after dark. Built like every other
// decoration (chunky voxels, baked light), solid to the fish, never in the game's decor list: they come with the date and go with it.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';
import { placeGroup, stampItem, disposeItem } from './items.js';

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
  const group = new THREE.Group(), m = v.mesh(); m.position.set(0, 0.04, 0); group.add(m); group.scale.setScalar(1.45);      /* (a pumpkin, not a tangerine: about the size of a coconut shell) */
  const it = { group, parts: [{ v, x: 0, y: 0.04, z: 0, ry: 0 }], lamp: new THREE.Vector3(0, H * U, R * U + 0.2), type: 'pumpkin', foot: 0.42 };
  if (lit) { const light = new THREE.PointLight(0xffa040, 0, 4.5, 2); light.position.set(0, H * U, R * U + 0.3); group.add(light); it.light = light; }
  return it;
}
// a sun-bleached skull on the sand, eye sockets lit green from inside
function buildSkull(seed = 3) {
  const v = new Vox(U), bone = [214, 206, 180], shade = [150, 142, 118];
  v.ellipsoid(0, 7, 0, 5.2, 4.6, 5.0, (i, j, k) => mix(bone, shade, 0.2 + 0.5 * hash(i, j, k, seed)), seed, 0.1);      // the dome
  for (let i = -3; i <= 3; i++) for (let j = 1; j <= 3; j++) for (let k = 1; k <= 5; k++) v.set(i, j, k, mix(bone, shade, 0.35));      // the jaw, forward
  for (let i = -3; i <= 3; i++) if (i % 2 !== 0) v.set(i, 0, 5, [238, 234, 214]);                                                   // teeth
  const hole = (ci) => { for (let i = ci - 1; i <= ci + 1; i++) for (let j = 6; j <= 8; j++) for (let k = 2; k <= 6; k++) v.m.delete(i + ',' + j + ',' + k); };
  hole(-2); hole(2); for (let j = 3; j <= 4; j++) v.m.delete('0,' + j + ',5');                                                        // eye sockets, a nose
  const group = new THREE.Group(), m = v.mesh(); m.position.set(0, 0.04, 0); group.add(m);
  const eye = new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.95 }), geo = new THREE.BoxGeometry(U * 2.2, U * 2.2, U * 2.2), eyes = [];
  for (const x of [-2, 2]) { const e = new THREE.Mesh(geo, eye); e.position.set(x * U, 7 * U + 0.04, 3 * U); group.add(e); eyes.push(e); }
  const light = new THREE.PointLight(0x7dff6a, 0, 2.6, 2); light.position.set(0, 7 * U, 5 * U); group.add(light);
  group.scale.setScalar(1.75); group.rotation.y = 0.2;
  return { group, parts: [{ v, x: 0, y: 0.04, z: 0, ry: 0 }], lamp: null, type: 'skull', foot: 0.46, light, eyes, eyeMat: eye };
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
// candidate spots on the front sand, used only where no real decoration stands
const SPOTS = [[-2.5, 1.9], [2.4, 2.0], [0.5, 2.3], [-1.0, 0.3], [1.4, 0.4], [-1.2, 2.2], [1.3, 2.2]];      /* two big lanterns at the front corners, the skull between them, the small lantern back on the terrace */      /* (on the front sand, but clear of the glass and the bar at the foot of the screen) */

export class SeasonDress {
  constructor(scene, solids) { this.scene = scene; this.solids = solids; this.items = []; this.id = null; this.phase = 'day'; }
  // decorMgr: the placed decorations, to keep clear of
  apply(season, decorMgr) {
    const id = season?.decor === 'pumpkins' ? season.id : null; if (id === this.id) return; this.clear(); this.id = id; if (!id) return;
    const taken = [...(decorMgr?.items?.values() ?? [])].map((it) => it.at), free = SPOTS.filter(([x, z]) => !taken.some((a) => Math.hypot(a.x - x, a.z - z) < 1.5)).slice(0, 4);
    const props = [() => buildPumpkin(1, true), () => buildPumpkin(2, true), () => buildSkull(3), () => { const it = buildPumpkin(4, false); it.group.scale.setScalar(1.05); return it; }];      /* (the small one is carved but unlit: three lights at most, for phones) */      /* two big lanterns, the skull, a small lantern */
    free.forEach(([x, z], i) => { const it = props[i](), ry = (i % 2 ? -1 : 1) * 0.35; for (const p of it.parts) p.soft = true;      /* (soft, like a plant's stem: fish and the octopus go round them, and a crab keeps its lanes across the sand; they are here two days, not a wall) */ placeGroup(it, x, z, ry); stampItem(it, this.solids, x, z, ry, 1); it.at = { x, z, ry }; this.scene.add(it.group); this.items.push(it); });
    this.ghostly = season.id === 'halloween'; this.ghostWait = 6; this.setPhase(this.phase);
  }
  clear() { for (const it of this.items) { stampItem(it, this.solids, it.at.x, it.at.z, it.at.ry, -1); this.scene.remove(it.group); disposeItem(it); } this.items = []; this.id = null; this.ghostly = false; for (const g of this.ghosts ?? []) this.scene.remove(g.group); this.ghosts = []; }
  // the candle inside: bright at night, a flicker in the evening, nothing by day
  setPhase(p) { this.phase = p; const k = p === 'night' ? 1 : p === 'evening' ? 0.55 : 0; for (const it of this.items) { if (it.light) it.light.intensity = (it.type === 'skull' ? 0.9 : 2.2) * k; if (it.eyeMat) it.eyeMat.opacity = 0.35 + 0.6 * k; } }
  update(dt, t) {
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
