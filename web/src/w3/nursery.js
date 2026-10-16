// The nursery: after a male gives birth, his brood grows up in the tank for five days. Three of the babies are tracked one by one (they swim as
// tiny seahorses of their own, see Fishes.sync); the rest of the brood is this light swarm: little voxel seahorses in one instanced mesh, each
// with a few numbers of its own. Newborns drift up near their father; as the days go by they explore, dart at food (they never eat it, so
// nothing in the care or the economy changes), and from the second day learn to hold on to plant stems. If a phone is watching when the
// birth happens, it sees it: the father lets go, straightens, his pouch contracts and the babies come out of it one by one.
import * as THREE from 'three';
import { sandH } from './terrain.js';

// a baby seahorse in profile, one voxel thick: [x forward, y up, color] (0 body, 1 belly, 2 eye)
const CELLS = [[1, 8, 0], [1, 7, 0], [2, 7, 2], [2, 6, 0], [3, 6, 0], [4, 6, 0], [1, 6, 0], [0, 5, 0], [1, 5, 1], [0, 4, 0], [1, 4, 1], [0, 3, 0], [1, 3, 1], [0, 2, 0], [0, 1, 0], [-1, 0, 0], [-1, -1, 0], [0, -2, 0], [1, -1, 0]];
const MAX = 12, CELL = 0.085, SWARM = 0.6;      /* (the rest of the brood are specks beside the three tracked babies: a flat little shape reads as a speck, not a cutout) */      // voxel size at birth (the tracked babies start at about the same height)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();

export class Nursery {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), (MAX + 3) * CELLS.length);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.fry = []; this.id = null; this.track = new Map(); this.going = null;
  }
  played(id) { try { return localStorage.getItem('birth:' + id) === '1'; } catch { return false; } }
  markPlayed(id) { try { localStorage.setItem('birth:' + id, '1'); } catch { /* a private window: it may play again, which is harmless */ } }
  // the brood this tank has now (from the tank record), and whether this phone should see it being born
  set(state, fishes) {
    const N = state?.nursery; if (!N) { this.depart(state); if (this.fry.length && !this.going) { this.fry = []; this.mesh.count = 0; } this.id = null; return; }
    if (this.id === N.id) return; this.id = N.id;
    const n = Math.max(0, Math.min(MAX, (N.n ?? 12) - 3)), dad = fishes.byId.get(N.father), fresh = Date.now() - N.born < 10 * 60e3 && !this.played(N.id);
    let h = 0; for (const ch of N.id) h = (h * 31 + ch.charCodeAt(0)) | 0; const rnd = () => ((h = (h * 1103515245 + 12345) | 0) >>> 8) / 16777216;
    const base = [[214, 168, 82], [236, 140, 40], [146, 96, 196], [178, 42, 46], [92, 76, 64]][Math.abs(N.pa?.seed ?? 3) % 5];
    this.fry = Array.from({ length: n }, (_, i) => {
      const at = dad ? dad.pos.clone() : new THREE.Vector3((rnd() - 0.5) * 5, 3 + rnd() * 3, 0.5 + rnd() * 1.5);
      const tint = base.map((v) => Math.max(0, Math.min(255, v + (rnd() - 0.5) * 50)));
      return { pos: at.clone().add(new THREE.Vector3((rnd() - 0.5) * (fresh ? 0.2 : 4), fresh ? -0.3 : rnd() * 2, (rnd() - 0.5) * (fresh ? 0.2 : 1.5))), vel: new THREE.Vector3(), head: rnd() * 6.28, ph: rnd() * 6.28, tgt: null, hold: 0, wait: fresh ? 1.2 + i * (5 / Math.max(1, n)) : 0, out: !fresh, bold: rnd(), col: [new THREE.Color(...tint.map((v) => v / 255)), new THREE.Color(...tint.map((v) => Math.min(255, v + 50) / 255)), new THREE.Color(0.05, 0.05, 0.08)] };
    });
    if (fresh) { this.markPlayed(N.id); if (dad) dad.birthT = 7.5; if (typeof window !== 'undefined') window.__sawBirth = N.id; }      // the birth itself, once on this phone
    this.mesh.count = n * CELLS.length;
    let j = 0; for (const f of this.fry) for (const c of CELLS) this.mesh.setColorAt(j++, f.col[c[2]]); if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  // a baby has been chosen: the others gather, swim up together and fade into the water. Every phone that was watching the nursery sees it
  // once (the choice is in the tank record with its time, so a phone that opens the game later, or reloads, does not see it again)
  depart(state) {
    const D = state?.lastDepart; if (!D || this.going || this.id !== D.nursery || Date.now() - D.at > 90e3 || this.played('left:' + D.nursery)) return;
    this.markPlayed('left:' + D.nursery);
    for (const id of D.left ?? []) { const k = this.track.get(id); if (k) this.fry.push({ pos: k.pos.clone(), vel: new THREE.Vector3(), head: k.head, ph: Math.random() * 6.28, out: true, big: k.size / CELL, col: k.col }); }
    if (!this.fry.length) return;
    const c = new THREE.Vector3(); for (const f of this.fry) c.add(f.pos); c.divideScalar(this.fry.length); c.y = Math.max(c.y, 3);
    this.going = { t: 0, c }; if (typeof window !== 'undefined') window.__departed = D.nursery;
    this.mesh.count = this.fry.length * CELLS.length; let j = 0; for (const f of this.fry) for (const q of CELLS) this.mesh.setColorAt(j++, f.col[q[2]]); if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  goingUpdate(dt, t) {
    const G = this.going; G.t += dt; let j = 0;
    for (const f of this.fry) {      // about a second and a half to gather, then up and away, fading as they go
      const goal = G.t < 1.5 ? _p.copy(G.c).add(_s.set(Math.sin(f.ph + t) * 0.4, Math.cos(f.ph * 2 + t) * 0.3, 0)) : _p.set(G.c.x + Math.sin(f.ph) * 0.6, 20, G.c.z);
      const to = _p.sub(f.pos), d = to.length() || 1; to.multiplyScalar((G.t < 1.5 ? 0.9 : 1.3) * Math.min(1, d) / d);
      f.vel.lerp(to, Math.min(1, dt * 2)); f.pos.addScaledVector(f.vel, dt); f.head += dt * 0.5;
      const size = CELL * (f.big ?? 2.07 * SWARM) * Math.max(0, 1 - Math.max(0, G.t - 2) / 2.5);
      _q.setFromAxisAngle(_up, f.head); _s.set(size, size, size);
      for (const c of CELLS) { _p.set(c[0] * size, c[1] * size, 0).applyQuaternion(_q).add(f.pos); _m.compose(_p, _q, _s); this.mesh.setMatrixAt(j++, _m); }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (G.t > 4.6) { this.going = null; this.fry = []; this.mesh.count = 0; }
  }
  update(dt, t, state, fishes) {
    if (this.going) return this.goingUpdate(dt, t);
    const N = state?.nursery; if (!N || !this.fry.length) return;
    for (const f of fishes.list) if (f.nursery && !f.dead) this.track.set(f.fid, { pos: f.pos.clone(), head: f.heading ?? 0, size: CELL * (1 + 1.07 * Math.max(0, Math.min(1, (Date.now() - N.born) / Math.max(1, N.readyAt - N.born)))), col: f.nurseryCol ?? (this.fry[0]?.col) });
    const nk = Math.max(0, Math.min(1, (Date.now() - N.born) / Math.max(1, N.readyAt - N.born))), size = CELL * SWARM * (1 + 1.07 * nk), dad = fishes.byId.get(N.father);
    const plants = (fishes.plantSpots?.length ? fishes.plantSpots : (fishes.spots?.() ?? []).filter((q) => ['grass', 'fern', 'sword', 'red', 'kelp', 'bamboo', 'anemone'].includes(q.type)));
    const food = fishes.flakes ?? [];
    let j = 0;
    for (const f of this.fry) {
      if (!f.out) {      // still in the pouch: it comes out when its turn comes, from the front of his belly
        f.wait -= dt; if (f.wait <= 0) { f.out = true; if (dad) { const fx = Math.cos(dad.heading), fz = -Math.sin(dad.heading); f.pos.set(dad.pos.x + fx * 0.25, dad.pos.y - 0.4, dad.pos.z + fz * 0.25); f.vel.set(fx * 0.3, 0.35, fz * 0.3); } }
        else { j += CELLS.length; for (let k = 0; k < CELLS.length; k++) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(j - CELLS.length + k, _m); } continue; }
      }
      // what it does: dart at food nearby, hold on to a stem once it has learnt to (from the second day), or drift and explore
      let goal = null, sp = 0.18 + 0.12 * nk;
      const near = food.find((c) => !c.eaten && c.pos.distanceTo(f.pos) < 1.4); if (near) { goal = near.pos; sp = 0.4; f.hold = 0; }
      else if (f.hold > 0) { f.hold -= dt; goal = f.tgt; sp = 0.12; }
      else if (nk > 0.3 && plants.length && (!f.tgt || f.pos.distanceTo(f.tgt) < 0.2)) { if (Math.random() < dt * (0.15 + 0.3 * f.bold)) { const q = plants[(Math.random() * plants.length) | 0], y = sandH(q.x, q.z) + 0.9 + Math.random() * 1.6; f.tgt = new THREE.Vector3(q.x + (Math.random() - 0.5) * 0.25, y, q.z + (Math.random() - 0.5) * 0.2); f.hold = 0; } }
      if (!goal && f.tgt) { goal = f.tgt; if (f.pos.distanceTo(f.tgt) < 0.15 && f.hold <= 0) f.hold = 15 + Math.random() * 40; }
      if (!goal) { goal = _p.set(f.pos.x + Math.sin(t * 0.3 + f.ph) * 0.8, (dad && nk < 0.1 ? dad.pos.y + 0.8 : f.pos.y) + Math.sin(t * 0.5 + f.ph) * 0.4, f.pos.z + Math.cos(t * 0.27 + f.ph) * 0.5); }
      const to = _p.copy(goal).sub(f.pos), d = to.length() || 1; to.multiplyScalar(sp * Math.min(1, d) / d);
      f.vel.lerp(to, Math.min(1, dt * 1.5)); f.pos.addScaledVector(f.vel, dt);
      f.pos.x = Math.max(-4.4, Math.min(4.4, f.pos.x)); f.pos.z = Math.max(-2, Math.min(2.6, f.pos.z)); f.pos.y = Math.max(sandH(f.pos.x, f.pos.z) + 0.35, Math.min(12, f.pos.y));
      if (Math.abs(f.vel.x) + Math.abs(f.vel.z) > 0.02) { const want = Math.atan2(-f.vel.z, f.vel.x); let dh = want - f.head; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); f.head += dh * Math.min(1, dt * 2); }
      const bob = Math.sin(t * 6 + f.ph) * 0.02 * size / CELL;
      _q.setFromAxisAngle(_up, f.head); _s.set(size, size, size);
      for (const c of CELLS) { _p.set(c[0] * size, c[1] * size + bob, 0).applyQuaternion(_q).add(f.pos); _m.compose(_p, _q, _s); this.mesh.setMatrixAt(j++, _m); }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
