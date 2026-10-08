// Placed decorations: keeps the scene in step with the game's decor list, runs placement previews,
// and feeds the fish collision grid.
import * as THREE from 'three';
import { buildItem, stampItem, itemOverlaps, placeGroup, disposeItem } from './items.js';
import { BOUNDS } from '../game/rules.js';

const PICK = { grass: [0.8, 1.6], fern: [1.0, 1.8], sword: [0.8, 1.2], red: [0.8, 1.4], rock: [0.7, 0.4], boulder: [1.2, 0.8], starfish: [0.5, 0.1], wood: [1.8, 1.2], pillar: [0.7, 1.6], lantern: [0.7, 1.2], chest: [0.7, 0.5], torii: [1.8, 1.6] };
const seedOf = (id) => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };

export class DecorMgr {
  constructor(scene, solids) {
    this.scene = scene; this.solids = solids; this.items = new Map(); this.preview = null;
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0x66e08a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false; this.marker.renderOrder = 8; scene.add(this.marker);
  }
  sync(list) {
    const seen = new Set();
    for (const d of list) {
      seen.add(d.id); const have = this.items.get(d.id);
      if (this.preview?.id === d.id) continue;                       // being moved right now
      if (!have) { const it = buildItem(d.type, seedOf(d.id)); it.id = d.id; it.at = { x: d.x, z: d.z, ry: d.ry }; placeGroup(it, d.x, d.z, d.ry); stampItem(it, this.solids, d.x, d.z, d.ry, 1); this.scene.add(it.group); this.items.set(d.id, it); }
      else if (have.at.x !== d.x || have.at.z !== d.z || have.at.ry !== d.ry) { stampItem(have, this.solids, have.at.x, have.at.z, have.at.ry, -1); have.at = { x: d.x, z: d.z, ry: d.ry }; placeGroup(have, d.x, d.z, d.ry); stampItem(have, this.solids, d.x, d.z, d.ry, 1); }
    }
    for (const [id, it] of [...this.items]) if (!seen.has(id) && this.preview?.id !== id) { stampItem(it, this.solids, it.at.x, it.at.z, it.at.ry, -1); this.scene.remove(it.group); disposeItem(it); this.items.delete(id); }
  }
  // world position of the first lantern, for the lamp light
  lamp() { for (const it of this.items.values()) if (it.lamp && it !== this.preview?.item) { const p = it.lamp.clone(); p.applyMatrix4(it.group.matrixWorld.identity().compose(it.group.position, new THREE.Quaternion().setFromEuler(it.group.rotation), new THREE.Vector3(1, 1, 1))); return p; } return null; }

  // ── placement ──
  start({ type, id = null, x = 0, z = 1.4, ry = 0 }) {
    this.cancel(true);
    let item;
    if (id && this.items.get(id)) { item = this.items.get(id); stampItem(item, this.solids, item.at.x, item.at.z, item.at.ry, -1); }   // lift it off the sand
    else { item = buildItem(type, (Math.random() * 99999) | 0); this.scene.add(item.group); }
    this.preview = { type, id, item, x, z, ry, orig: id ? { ...item.at } : null, valid: true };
    this.move(x, z); this.marker.visible = true; return this.preview;
  }
  move(x, z) {
    const p = this.preview; if (!p) return;
    p.x = Math.max(BOUNDS.x[0], Math.min(BOUNDS.x[1], x)); p.z = Math.max(BOUNDS.z[0], Math.min(BOUNDS.z[1], z)); this.refresh();
  }
  rotate() { const p = this.preview; if (!p) return; p.ry += Math.PI / 4; this.refresh(); }
  refresh() {
    const p = this.preview; placeGroup(p.item, p.x, p.z, p.ry);
    p.valid = itemOverlaps(p.item, this.solids, p.x, p.z, p.ry) === 0;
    this.marker.position.set(p.x, 0.12, p.z); this.marker.material.color.setHex(p.valid ? 0x66e08a : 0xf0634a);
    this.marker.scale.setScalar(Math.max(0.8, (PICK[p.type]?.[0] ?? 1)));
  }
  tick(t) { const p = this.preview; if (p) { p.item.group.position.y = 0.12 + Math.sin(t * 4) * 0.05; } }
  // returns the final placement, leaving the item to be created/updated by sync() when the game state changes
  commit() {
    const p = this.preview; if (!p || !p.valid) return null;
    const out = { type: p.type, id: p.id, x: p.x, z: p.z, ry: p.ry };
    this.endPreview(false); return out;
  }
  cancel(silent = false) {
    const p = this.preview; if (!p) return;
    if (p.id) { placeGroup(p.item, p.orig.x, p.orig.z, p.orig.ry); stampItem(p.item, this.solids, p.orig.x, p.orig.z, p.orig.ry, 1); }
    this.endPreview(true);
  }
  endPreview(restored) {
    const p = this.preview; this.preview = null; this.marker.visible = false;
    if (!p.id) { this.scene.remove(p.item.group); disposeItem(p.item); }
    else if (!restored) { p.item.at = { x: p.x, z: p.z, ry: p.ry }; stampItem(p.item, this.solids, p.x, p.z, p.ry, 1); p.item.group.position.y = 0; }
    else p.item.group.position.y = 0;
  }
  // nearest placed item along a picking ray (for rearranging)
  pick(ray) {
    let best = null, bd = 1e9;
    for (const [id, it] of this.items) { const [r, h] = PICK[it.type] ?? [0.8, 1]; const c = new THREE.Vector3(it.at.x, h / 2, it.at.z), d = ray.distanceToPoint(c); if (d < Math.max(r * 0.7, h * 0.5) && d < bd) { bd = d; best = id; } }
    return best;
  }
}
