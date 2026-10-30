// What a season looks like in the water: for Halloween, two carved pumpkins on the front sand that glow after dark. Built like every other
// decoration (chunky voxels, baked light), solid to the fish, never in the game's decor list: they come with the date and go with it.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';
import { placeGroup, stampItem, disposeItem } from './items.js';

const U = 0.07;
// a jack-o'-lantern: a ribbed orange sphere, a green stem, and a cut face that reads from the front (toward the glass, +z)
function buildPumpkin(seed = 1, lit = true) {
  const v = new Vox(U), R = 7, H = 6, skin = [236, 118, 32], dark = [178, 78, 20], face = lit ? [255, 214, 110] : [40, 20, 10];
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
// candidate spots on the front sand, used only where no real decoration stands
const SPOTS = [[-2.5, 1.9], [2.4, 2.0], [0.3, 2.3], [-1.1, 2.1], [1.3, 2.2]];      /* (on the front sand, but clear of the glass and the bar at the foot of the screen) */

export class SeasonDress {
  constructor(scene, solids) { this.scene = scene; this.solids = solids; this.items = []; this.id = null; this.phase = 'day'; }
  // decorMgr: the placed decorations, to keep clear of
  apply(season, decorMgr) {
    const id = season?.decor === 'pumpkins' ? season.id : null; if (id === this.id) return; this.clear(); this.id = id; if (!id) return;
    const taken = [...(decorMgr?.items?.values() ?? [])].map((it) => it.at), free = SPOTS.filter(([x, z]) => !taken.some((a) => Math.hypot(a.x - x, a.z - z) < 1.5)).slice(0, 2);
    free.forEach(([x, z], i) => { const it = buildPumpkin(i + 1, true), ry = (i ? -1 : 1) * 0.35; placeGroup(it, x, z, ry); stampItem(it, this.solids, x, z, ry, 1); it.at = { x, z, ry }; this.scene.add(it.group); this.items.push(it); });
    this.setPhase(this.phase);
  }
  clear() { for (const it of this.items) { stampItem(it, this.solids, it.at.x, it.at.z, it.at.ry, -1); this.scene.remove(it.group); disposeItem(it); } this.items = []; this.id = null; }
  // the candle inside: bright at night, a flicker in the evening, nothing by day
  setPhase(p) { this.phase = p; const k = p === 'night' ? 1 : p === 'evening' ? 0.55 : 0; for (const it of this.items) if (it.light) it.light.intensity = 2.2 * k; }
  update(t) { for (const it of this.items) if (it.light && it.light.intensity > 0) it.light.intensity = (this.phase === 'night' ? 2.2 : 1.2) * (0.85 + 0.15 * Math.sin(t * 7 + it.at.x) * Math.sin(t * 3.1)); }
  spots() { return this.items.map((it) => ({ id: 'season:' + it.at.x, type: 'pumpkin', x: it.at.x, z: it.at.z, ry: it.at.ry, h: 0.9, y: it.group.position.y })); }
}
