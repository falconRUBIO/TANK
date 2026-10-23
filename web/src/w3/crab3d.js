// A hermit crab: a small voxel crab (walking legs, two claws, eyestalks, antennae) living in a shell it found (shells.js). It walks the sand and
// climbs the rocks, looks over empty shells and now and then moves house, pulls into its shell when something big comes near, follows another
// crab for a while, digs, eats what settles on the sand, and keeps going back to its favorite spot. Everything it does is in `doing` while it is
// doing it, so a tap can say so. It is a Fish3D so every system in the tank can hold it like any animal; its body and its walk are its own.
// The phone running the animals decides: a shell swap is claimed with the tank (crabShell) at the moment it leaves its old shell; the other phones
// see the result arrive and show the crab settling into its new shell.
import * as THREE from 'three';
import { Fish3D } from './fish3d.js';
import { Vox, topLit } from './decor.js';
import { mulberry32, fbm, mix } from '../color.js';
import { sandH } from './terrain.js';
import { shellVox, shellDims } from './shells.js';
import { CRAB_TYPES, crabNeed, shellFit, shellSz, shellLabel, crabTypeOf } from '../game/crabs.js';

const U = 0.048;
const COL = {
  blueleg: { body: [104, 92, 64], body2: [142, 122, 84], leg: [58, 104, 188], band: [228, 236, 242], stalk: [234, 142, 62], eye: [18, 18, 22], claw: [66, 116, 196], tip: [236, 236, 228], ab: [196, 170, 140] },
  scarlet: { body: [196, 38, 34], body2: [226, 72, 52], leg: [204, 42, 38], band: [222, 66, 50], stalk: [246, 212, 64], eye: [16, 16, 20], claw: [208, 46, 40], tip: [252, 222, 120], ab: [214, 150, 130] },
  halloween: { body: [212, 90, 40], body2: [238, 122, 56], leg: [226, 94, 40], band: [44, 22, 46], stalk: [232, 112, 52], eye: [14, 12, 16], claw: [222, 88, 40], tip: [244, 222, 200], ab: [220, 160, 120] },
};
const stub = (id, label) => ({ id, label: label ?? id, move: 'crab', length: 14, vox: 0.052, make: () => ({ bounds: { x: [0, 0], y: [0, 0], z: [0, 0] }, sample: () => ({ tag: 'body', c: [0, 0, 0] }), center: [0, 0] }) });
const mesh = (v) => { topLit(v); return v.mesh(); };
const line = (v, a, b, c, w = 0) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))); for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t), z = Math.round(a[2] + (b[2] - a[2]) * t); v.set(x, y, z, typeof c === 'function' ? c(t) : c); if (w) v.set(x, y + 1, z, typeof c === 'function' ? c(t) : c); } };
const big = new Set(['octopus', 'turtle', 'hawksbill', 'loggerhead', 'kemps', 'puffer', 'angelfish', 'tang']);

export class Crab3D extends Fish3D {
  constructor(id, seed, opts = {}) {
    super(stub(id, opts.label), seed, opts);
    this.mesh.visible = false; this.crab = true; this.sk = id; this.rng = mulberry32(seed * 977 + 13);
    const C = COL[id] ?? COL.blueleg, r = mulberry32(seed * 31 + 5);
    this.root = new THREE.Group(); this.group.add(this.root);
    this.shellG = new THREE.Group(); this.root.add(this.shellG);
    this.bodyG = new THREE.Group(); this.root.add(this.bodyG);
    // the body: a rounded front shield, the soft curled abdomen behind it (seen only out of the shell)
    { const v = new Vox(U); v.ellipsoid(0, 0, 0, 3.6, 2.6, 3.2, (i, j, k) => mix(C.body, C.body2, fbm(i * 0.4 + seed, j * 0.4, k * 0.4) * 0.8 + (j > 1 ? 0.2 : 0)), seed, 0.15); this.bodyG.add(mesh(v)); }
    { const v = new Vox(U); for (let i = 0; i < 9; i++) { const a = i / 8, cx = -2 - a * 5, cy = 1.2 - a * a * 3.5; v.ellipsoid(cx, cy, 0, 2.2 - a, 2.2 - a * 0.8, 2.2 - a, () => mix(C.ab, [240, 220, 200], 0.2 + 0.2 * a), seed + i, 0.1); } this.abd = mesh(v); this.abd.visible = false; this.bodyG.add(this.abd); }
    // two claws on short arms, hinged at the body (a hermit's left claw is a little bigger)
    this.claws = [1, -1].map((side) => { const g = new THREE.Group(), v = new Vox(U), big = side < 0 ? 1.15 : 1; line(v, [0, 0, 0], [3, -1, 0], C.claw); v.ellipsoid(5, -1, 0, 2.6 * big, 1.6 * big, 1.5 * big, (i) => (i > 6 ? C.tip : C.claw), seed + side, 0.1); line(v, [6, -2, 0], [8, -2, 0], C.tip); const m = mesh(v); g.add(m); g.position.set(2.6 * U, -0.6 * U, side * 2.2 * U); g.userData.side = side; this.bodyG.add(g); return g; });
    // four walking legs a side (two long pairs forward, two short tucked back into the shell), banded
    this.legs = []; for (const side of [1, -1]) for (let i = 0; i < 4; i++) { const g = new THREE.Group(), v = new Vox(U), len = i < 2 ? 7 : 3.5, band = (t) => (Math.floor(t * 6) % 2 ? C.band : C.leg);
      line(v, [0, 0, 0], [len * 0.35, 1.5, side * len * 0.5], band, 1); line(v, [len * 0.35, 1.5, side * len * 0.5], [len * 0.55, -3.2, side * len * 0.95], (t) => band(0.5 + t * 0.5), 1); const m = mesh(v); g.add(m);
      g.position.set((1.6 - i * 1.1) * U, -1 * U, side * 2.4 * U); g.userData = { side, i, ph: (i % 2) * Math.PI + (side > 0 ? 0 : Math.PI / 2) }; this.bodyG.add(g); this.legs.push(g); }
    // eyestalks with dark eyes, and two long antennae
    this.eyes = [1, -1].map((side) => { const g = new THREE.Group(), v = new Vox(U); line(v, [0, 0, 0], [0, 4, 0], C.stalk); v.set(0, 5, 0, C.eye); v.set(1, 5, 0, C.eye); v.set(0, 6, 0, C.eye); const m = mesh(v); g.add(m); g.position.set(3 * U, 1.6 * U, side * 1 * U); g.rotation.x = side * 0.25; this.bodyG.add(g); return g; });
    this.ants = [1, -1].map((side) => { const g = new THREE.Group(), v = new Vox(U); line(v, [0, 0, 0], [6, 5, side * 3], C.stalk); line(v, [6, 5, side * 3], [11, 4, side * 6], [210, 180, 150]); const m = mesh(v); g.add(m); g.position.set(3.4 * U, 0.6 * U, side * 0.6 * U); this.bodyG.add(g); return g; });
    this.ph = r() * 9; this.cs = { s: 'idle', t: 1 + r() * 2 }; this.retK = 0; this.outK = 0; this.moveK = 0; this.climbY = 0; this.pitchK = 0; this.clawUp = 0; this.tapK = 0; this.eatK = 0; this.digK = 0; this.buriedK = 0; this.wig = 0;
    this.inspected = new Set(); this.dwell = {}; this.met = {}; this.memT = 60 + r() * 60; this.doing = null; this.temps = []; this.radius = 0.3;
  }
  get ctype() { return CRAB_TYPES[crabTypeOf(this.rec)] ?? CRAB_TYPES.explorer; }
  get need() { return this.rec ? crabNeed(this.rec, Date.now()) : 0.9; }
  setGrowth(k) { this.growth = k; const n = this.need; this.bodyG?.scale.setScalar(n); this.radius = 0.3 * n + 0.1; }
  // the shell it wears, built to match the tank's record (and rebuilt when that changes)
  wear(t, sz) { if (this.shellKey === t + ':' + sz) return; this.shellKey = t + ':' + sz; this.shellG.clear(); const m = shellVox(t, sz, this.seed).mesh(); m.rotation.y = Math.PI; this.shellG.add(m); this.dims = shellDims(sz, t); this.bodyG.position.set(0.02, this.dims.r * 0.55, 0); }
  pick() { this.cs = { s: 'idle', t: 0.5 }; }
  setPose() {}
  react() {      // a tap: each answers in its own way, and never mid-move
    if (['swap', 'molt', 'climb', 'descend'].includes(this.cs.s)) return;
    const T = this.ctype; if (T.hide > 0.55) { this.cs = { s: 'retract', t: 1.6, who: null }; } else if (T.bold > 0.7) this.clawUp = 1.2; else { this.lookAt = this.pos.clone().add(new THREE.Vector3(0, 0.4, 3)); this.lookT = 1.5; this.backT = 0.4; }
  }
  sayDoing() { return this.doing; }
  // ── deciding what to do next, from its temperament and what is really around it ──
  decide(others) {
    const T = this.ctype, r = this.rng, W = this.W, rec = this.rec, C = rec?.crab ?? {};
    if (C.moltAt && Date.now() - C.moltAt < 15 * 60e3) { this.cs = { s: 'molt', t: 60 }; return; }
    const empties = W?.empties?.() ?? [], spots = W?.spots?.() ?? [], flakes = (W?.flakes?.() ?? []).filter((f) => !f.eaten && f.pos.y <= sandH(f.pos.x, f.pos.z) + 0.25);
    const food = flakes.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
    if (food && food.pos.distanceTo(this.pos) < 3 && r() < 0.8) { this.cs = { s: 'walk', to: { x: food.pos.x, z: food.pos.z }, then: { s: 'eat', t: 2.5 + r() * 2, food }, why: null }; return; }
    const tight = shellFit(C.shell?.sz ?? 1, this.need) === 'small', recent = Date.now() - (C.swapAt ?? 0) < 3 * 3600e3;
    const cand = empties.filter((d) => !this.inspected.has(d.id) && !this.W.claimedBy?.(d.id, this)).sort((a, b) => Math.hypot(a.x - this.pos.x, a.z - this.pos.z) - Math.hypot(b.x - this.pos.x, b.z - this.pos.z));
    const W8 = { shell: cand.length ? (tight ? 6 : recent ? 0.15 : 0.5 * (0.5 + T.collect + 0.3 * T.pick)) : 0, wander: 1.2 * T.roam, fav: C.fav && spots.some((s) => s.id === C.fav) ? 1.2 * (0.4 + T.hide) * (T.roam < 0.8 ? 2 : 1) : 0, climb: spots.some((s) => this.W.climbable?.(s)) ? 0.9 * T.climb * (this.sk === 'halloween' ? 2 : 1) : 0,
      follow: others.some((o) => o.crab && o !== this && o.cs?.s === 'walk' && o.pos.distanceTo(this.pos) < 1.8) ? 0.35 : 0, dig: 0.18 * (0.5 + T.collect), visit: 0.35 * T.bold, rest: 0.6 };
    let sum = 0; for (const k in W8) sum += W8[k]; let x = r() * sum, pick = 'rest'; for (const k in W8) { x -= W8[k]; if (x <= 0) { pick = k; break; } }
    if (pick === 'shell') { const d = cand[0]; this.cs = { s: 'walk', to: this.frontOf(d, 0.55), then: { s: 'inspect', t: 0, d }, why: 'shell' }; return; }
    if (pick === 'fav') { const sp = spots.find((s) => s.id === C.fav), a = r() * 6.28; this.cs = { s: 'walk', to: { x: sp.x + Math.cos(a) * 0.7, z: sp.z + Math.sin(a) * 0.6 }, then: { s: 'rest', t: 15 + r() * 30, fav: sp }, why: 'fav' }; return; }
    if (pick === 'climb') { const opts = spots.filter((s) => this.W.climbable(s)), sp = opts[Math.floor(r() * opts.length)], a = Math.atan2(this.pos.z - sp.z, this.pos.x - sp.x), base = { x: sp.x + Math.cos(a) * (0.45 + sp.h * 0.25), z: sp.z + Math.sin(a) * (0.45 + sp.h * 0.25) }; this.cs = { s: 'walk', to: base, then: { s: 'climb', t: 0, sp, base }, why: null }; return; }
    if (pick === 'follow') { const o = others.find((q) => q.crab && q !== this && q.cs?.s === 'walk' && q.pos.distanceTo(this.pos) < 1.8); if (o) { this.cs = { s: 'follow', t: 8 + r() * 8, o }; return; } }
    if (pick === 'dig') { this.cs = { s: 'dig', t: 4 + r() * 4 }; return; }
    if (pick === 'visit') { const o = others.filter((q) => !q.crab && !q.dead && !q.visitor && q.group?.visible !== false && q.pos.y < sandH(q.pos.x, q.pos.z) + 1.4 && q.pos.distanceTo(this.pos) < 4).sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0]; if (o) { const a = Math.atan2(this.pos.z - o.pos.z, this.pos.x - o.pos.x); this.cs = { s: 'walk', to: { x: o.pos.x + Math.cos(a) * 1.1, z: o.pos.z + Math.sin(a) * 1.1 }, then: { s: 'watch', t: 3 + r() * 3, o }, why: null }; return; } }
    if (pick === 'rest') { this.cs = { s: 'idle', t: 3 + r() * 6 }; return; }
    const R = 1 + 2.4 * T.roam; let to = null; for (let k = 0; k < 8 && !to; k++) { const p = { x: Math.max(-3.9, Math.min(3.9, this.pos.x + (r() - 0.5) * 2 * R)), z: Math.max(-2.8, Math.min(3.5, this.pos.z + (r() - 0.5) * 2 * R)) }; if (!this.W?.avoid?.(p.x, p.z, this)) to = p; }
    this.cs = { s: 'walk', to: to ?? { x: this.pos.x, z: this.pos.z }, then: { s: 'idle', t: 1 + r() * 3 }, why: null };
  }
  frontOf(d, k) { const a = (d.ry ?? 0) + 0.5; return { x: d.x + Math.cos(a) * k, z: d.z - Math.sin(a) * k }; }      // in front of a lying shell's opening
  // ── each frame ──
  update(dt, rng, others) {
    if (this.puppet) return this.puppet(dt);
    const rec = this.rec, C = rec?.crab;
    if (C?.shell && this.cs.s !== 'swap') { if (this.shellKey && this.shellKey !== C.shell.t + ':' + C.shell.sz && !this.mirrorT) this.mirrorT = 2.4; if (!this.mirrorT || this.mirrorT < 1.2) this.wear(C.shell.t, C.shell.sz); }      // another phone saw it move house: it settles into the new shell here too
    if (this.mirrorT) { this.mirrorT = Math.max(0, this.mirrorT - dt); this.doing = 'settling into a new shell'; }
    if (this.dead) { this.retK = Math.min(1, this.retK + dt); this.pose(dt); return; }
    this.ph += dt; const T = this.ctype, S = this.cs; S.t = (S.t ?? 0) - dt; this.lookT = Math.max(0, (this.lookT ?? 0) - dt); this.clawUp = Math.max(0, this.clawUp - dt); this.backT = Math.max(0, (this.backT ?? 0) - dt);
    // something big close by: in it goes (a timid one sooner and for longer); never mid-swap or under the sand
    if (!['swap', 'molt', 'retract', 'climb', 'descend'].includes(S.s)) { const used = (this.used ??= {}), th = others.find((o) => o !== this && !o.dead && !o.crab && o.group?.visible !== false && !(used[o.fid] > Date.now()) && (big.has(o.sk ?? o.species?.id) ? Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 0.7 + 0.9 * T.hide : T.hide > 0.7 && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 0.55) && o.pos.y < this.pos.y + 1.2);      // a big animal close by, or (for a timid one) a fish right on top of it; one that keeps hanging about it gets used to, for a while
      if (th && (this.cool ?? 0) <= 0) { this.cs = { s: 'retract', t: 2 + 4 * T.hide + this.rng() * 2, who: th }; this.cool = 6; this.W?.note?.(this, 'startle', th); } }
    this.cool = (this.cool ?? 0) - dt;
    let move = 0; this.doing = null;
    switch (this.cs.s) {
      case 'idle': if (this.cs.t <= 0) this.decide(others); if (this.atFav()) this.doing = 'back at its favorite spot'; break;
      case 'walk': { const to = this.cs.to, d = Math.hypot(to.x - this.pos.x, to.z - this.pos.z); move = this.step(to, dt, others); if (this.cs.why === 'shell') this.doing = 'going to look at a shell'; if (this.cs.why === 'fav') this.doing = 'heading back to its favorite spot';
        if (d < (this.cs.then?.s === 'climb' ? 0.5 : 0.12) || (this.cs.walkT = (this.cs.walkT ?? 0) + dt) > 25) {      /* (at the foot of a rock it is close enough: the rock itself stops it) */ const n = this.cs.then ?? { s: 'idle', t: 1 }; this.cs = { ...n, t: n.t ?? 1 }; } break; }
      case 'eat': { this.eatK = 1; this.doing = 'eating'; const f = this.cs.food; if (f && !f.eaten && f.pos.distanceTo(this.pos) < 0.5 && this.cs.t < 1) { f.eaten = true; this.W?.ate?.(this); } if (this.cs.t <= 0) { this.eatK = 0; this.cs = { s: 'idle', t: 1 }; } break; }
      case 'rest': this.doing = this.cs.fav ? 'back at its favorite spot' : null; this.dwell[this.cs.fav?.id] = (this.dwell[this.cs.fav?.id] ?? 0) + dt; if (this.cs.t <= 0) this.cs = { s: 'idle', t: 0.5 }; break;
      case 'retract': { const w = this.cs.who; this.doing = w ? `hiding from ${w.name ?? 'a big fish'}` : 'tucked in its shell'; this.cs.inT = (this.cs.inT ?? 0) + dt; if (w && this.cs.inT < 12 && Math.hypot(w.pos.x - this.pos.x, w.pos.z - this.pos.z) < 0.9 + T.hide) this.cs.t = Math.max(this.cs.t, 1.2); if (this.cs.t <= 0) { if (w) (this.used ??= {})[w.fid] = Date.now() + 25e3; this.cs = { s: 'emerge', t: 1.2 + 2 * T.hide }; } break; }      // (never more than a dozen seconds in: it peeks out, and gets used to that one)
      case 'emerge': this.doing = 'peeking out of its shell'; if (this.cs.t <= 0) this.cs = { s: 'idle', t: 0.5 }; break;
      case 'follow': { const o = this.cs.o; if (!o || o.dead || o.cs?.s === 'retract') { this.cs = { s: 'idle', t: 1 }; break; } const back = { x: o.pos.x - Math.cos(o.heading) * 0.5, z: o.pos.z + Math.sin(o.heading) * 0.5 }; if (Math.hypot(back.x - this.pos.x, back.z - this.pos.z) > 0.25) move = this.step(back, dt, others); this.doing = `following ${o.name}`; this.W?.note?.(this, 'met', o); if (this.cs.t <= 0) this.cs = { s: 'idle', t: 2 }; break; }
      case 'dig': this.digK = 1; this.doing = 'digging in the sand'; if (this.cs.t <= 0) { this.digK = 0; this.W?.puff?.(this.pos); this.cs = { s: 'idle', t: 1 }; } break;
      case 'watch': { const o = this.cs.o; if (o) { this.lookAt = o.pos; this.lookT = 0.3; this.doing = `watching ${o.name}`; this.heading += (Math.atan2(-(o.pos.z - this.pos.z), o.pos.x - this.pos.x) - this.heading) * Math.min(1, dt * 2); } if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }
      case 'molt': this.doing = 'buried in the sand, molting'; this.buriedK = Math.min(1, this.buriedK + dt * 0.5); if (!(this.rec?.crab?.moltAt && Date.now() - this.rec.crab.moltAt < 15 * 60e3)) { this.buriedK = Math.max(0, this.buriedK - dt); if (this.buriedK <= 0) this.cs = { s: 'idle', t: 1 }; } break;
      case 'climb': { const sp = this.cs.sp, top = this.W?.decorTop?.(sp.x, sp.z, sp.id) ?? (sp.y + sp.h), k = Math.min(1, (this.cs.k = (this.cs.k ?? 0) + dt / 3)); this.doing = `climbing the ${this.W?.label?.(sp) ?? 'rock'}`;
        this.pos.x = this.cs.base.x + (sp.x - this.cs.base.x) * k * 0.85; this.pos.z = this.cs.base.z + (sp.z - this.cs.base.z) * k * 0.85; this.climbY = Math.max(0, (top - sandH(this.pos.x, this.pos.z)) * Math.min(1, k * 1.25)); this.pitchK = k < 0.85 ? 0.7 : 0.7 * (1 - (k - 0.85) / 0.15); move = 1;
        this.heading += (Math.atan2(-(sp.z - this.cs.base.z), sp.x - this.cs.base.x) - this.heading) * Math.min(1, dt * 3);
        if (k >= 1) this.cs = { s: 'perch', t: 10 + this.rng() * 30 * (0.5 + T.climb), sp, base: this.cs.base }; break; }
      case 'perch': { const sp = this.cs.sp; this.doing = `up on the ${this.W?.label?.(sp) ?? 'rock'}`; this.pitchK = 0; this.dwell[sp.id] = (this.dwell[sp.id] ?? 0) + dt; this.climbY = Math.max(0, (this.W?.decorTop?.(sp.x, sp.z, sp.id) ?? (sp.y + sp.h)) - sandH(this.pos.x, this.pos.z)); if (this.cs.t <= 0) this.cs = { s: 'descend', t: 0, sp, base: this.cs.base, from: { x: this.pos.x, z: this.pos.z }, y0: this.climbY }; break; }
      case 'descend': { const k = Math.min(1, (this.cs.k = (this.cs.k ?? 0) + dt / 2.6)); this.doing = 'climbing down'; this.pos.x = this.cs.from.x + (this.cs.base.x - this.cs.from.x) * k; this.pos.z = this.cs.from.z + (this.cs.base.z - this.cs.from.z) * k; this.climbY = this.cs.y0 * (1 - k); this.pitchK = -0.5 * Math.sin(k * Math.PI); move = 1; this.heading += (Math.atan2(-(this.cs.base.z - this.cs.from.z), this.cs.base.x - this.cs.from.x) - this.heading) * Math.min(1, dt * 3); if (k >= 1) { this.climbY = 0; this.cs = { s: 'idle', t: 1 }; } break; }
      case 'inspect': this.inspectTick(dt, others); move = this.cs.move ?? 0; break;
      case 'tryon': this.tryonTick(dt); break;
      case 'backoff': { this.doing = 'letting another crab look first'; move = this.step(this.cs.to, dt, others, 0.8); if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }
      case 'swap': this.swapTick(dt); move = this.cs.move ?? 0; break;
      default: this.cs = { s: 'idle', t: 1 };
    }
    if (this.backT > 0) { this.pos.x -= Math.cos(this.heading) * dt * 0.35; this.pos.z += Math.sin(this.heading) * dt * 0.35; move = 0.6; }
    this.moveK += (move - this.moveK) * Math.min(1, dt * 6);
    this.pos.x = Math.max(-4.1, Math.min(4.1, this.pos.x)); this.pos.z = Math.max(-3.2, Math.min(3.8, this.pos.z));
    if (!['climb', 'perch', 'descend'].includes(this.cs.s)) this.climbY = Math.max(0, this.climbY - dt * 2);
    this.pos.y = sandH(this.pos.x, this.pos.z) + this.climbY - 0.12 * this.buriedK * (this.dims?.h ?? 0.2) * 3;
    this.memTick(dt, others);
    this.pose(dt);
  }
  atFav() { const f = this.rec?.crab?.fav, sp = f && (this.W?.spots?.() ?? []).find((s) => s.id === f); return !!sp && Math.hypot(sp.x - this.pos.x, sp.z - this.pos.z) < 1.1; }
  // walking: legs going, a little sideways the way crabs do, round other crabs and big animals and decorations
  step(to, dt, others, mul = 1) {
    const dx = to.x - this.pos.x, dz = to.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 0.02) return 0;
    const sp = (this.species?.id === 'blueleg' ? 0.36 : this.sk === 'halloween' ? 0.3 : 0.26) * mul * (this.vigor ?? 1) * (0.7 + 0.3 * this.ctype.roam) * (1 - this.retK);
    let vx = dx / d, vz = dz / d;
    for (const o of others) { if (o === this || o.dead) continue; const ex = this.pos.x - o.pos.x, ez = this.pos.z - o.pos.z, e = Math.hypot(ex, ez), min = o.crab ? 0.42 : big.has(o.sk) && o.pos.y < this.pos.y + 1.2 ? 0.9 : 0; if (e < min && e > 1e-3) { vx += (ex / e) * (min - e) / min * 1.5; vz += (ez / e) * (min - e) / min * 1.5; } }
    const Wd = Fish3D.world; if (Wd?.push) { const p = new THREE.Vector3(this.pos.x + vx * 0.25, this.pos.y + 0.15, this.pos.z + vz * 0.25), o = new THREE.Vector3(); if (Wd.push(p, 0.18, o) && o.length() > 1e-4) { o.normalize(); const into = vx * o.x + vz * o.z; if (into < 0) { vx -= o.x * into * 1.2; vz -= o.z * into * 1.2; } vx += o.x * 0.4; vz += o.z * 0.4; } }
    const m = Math.hypot(vx, vz) || 1; vx /= m; vz /= m; const s = Math.min(sp, d * 2);
    this.pos.x += vx * s * dt; this.pos.z += vz * s * dt;
    const want = Math.atan2(-vz, vx) + (this.sk === 'blueleg' ? 0.35 : 0.2) * Math.sin(this.ph * 0.4); let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 4);
    return s / sp;
  }
  // looking a shell over: round it once, a tap of the claws at the opening, then the verdict
  inspectTick(dt, others) {
    const S = this.cs, d = S.d, T = this.ctype; this.doing = 'inspecting a shell'; S.k = (S.k ?? 0) + dt;
    if (!(this.W?.empties?.() ?? []).some((e) => e.id === d.id)) { this.cs = { s: 'idle', t: 1 }; return; }      // someone else has moved in
    const rival = others.find((o) => o.crab && o !== this && o.cs?.s === 'inspect' && o.cs.d?.id === d.id);
    if (rival && (rival.ctype.bold > T.bold || (rival.ctype.bold === T.bold && rival.seed > this.seed))) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x); this.cs = { s: 'backoff', t: 2.5, to: { x: d.x + Math.cos(a) * 1.4, z: d.z + Math.sin(a) * 1.4 } }; this.W?.note?.(this, 'met', rival); return; }      // the curious neighbor: the shyer one backs off
    const circle = 3 + 2 * (T.pick - 1) * 0.5;
    if (S.k < circle) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x) + dt * 1.6, r = 0.55; S.move = this.step({ x: d.x + Math.cos(a) * r, z: d.z + Math.sin(a) * r }, dt, others) || 0.6; return; }
    S.move = 0; this.tapK = 1; this.heading += (Math.atan2(-(d.z - this.pos.z), d.x - this.pos.x) - this.heading) * Math.min(1, dt * 4);
    if (S.k < circle + 2) return;
    this.tapK = 0; this.inspected.add(d.id); const fit = shellFit(shellSz(d), this.need), C = this.rec?.crab ?? {}, tight = shellFit(C.shell?.sz ?? 1, this.need) === 'small';
    if (fit === 'big' && this.rng() < 0.7) { this.cs = { s: 'tryon', t: 0, d }; return; }
    if (fit !== 'fits') { this.reject(d); return; }
    const better = shellSz(d) > (C.shell?.sz ?? 0) + 0.04, picky = this.inspected.size >= Math.round(T.pick) || tight, rested = Date.now() - (C.swapAt ?? 0) > 3 * 3600e3 || tight;
    if (better && picky && rested && (tight || this.rng() < 0.55 + 0.3 * T.collect) && this.W?.isLead?.()) { this.cs = { s: 'swap', ph: 'align', k: 0, d }; return; }
    this.reject(d);
  }
  reject(d) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x) + (this.rng() - 0.5); this.cs = { s: 'walk', to: { x: d.x + Math.cos(a) * 1.6, z: d.z + Math.sin(a) * 1.6 }, then: { s: 'idle', t: 2 }, why: null, rejected: true }; this.W?.note?.(this, 'reject', d); }
  // the wrong-sized shell: it backs up to it, half in, finds it far too big, and walks off
  tryonTick(dt) {
    const S = this.cs, d = S.d; S.k = (S.k ?? 0) + dt; this.doing = 'trying on a new home';
    if (S.k < 1.2) { const p = this.frontOf(d, 0.25); this.pos.x += (p.x - this.pos.x) * Math.min(1, dt * 3); this.pos.z += (p.z - this.pos.z) * Math.min(1, dt * 3); this.outK = Math.min(0.5, S.k / 1.2 * 0.5); return; }
    if (S.k < 2.6) { this.wig = 1; return; }
    this.outK = Math.max(0, this.outK - dt * 2); this.wig = 0; if (S.k > 3.2) { this.doing = null; this.reject(d); }
  }
  // moving house: line up opening to opening, slip out (the soft abdomen shows), across, and in; the old shell stays where it was
  swapTick(dt) {
    const S = this.cs, d = S.d; S.k += dt; S.move = 0; this.doing = S.ph === 'settle' ? 'settling into its new shell' : 'moving into a new shell';
    if (S.ph === 'align') { const p = this.frontOf(d, 0.45 + (this.dims?.len ?? 0.4) * 0.5); S.move = this.step(p, dt, []) || 0.3; const want = Math.atan2(-(d.z - this.pos.z), d.x - this.pos.x) + Math.PI; let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 3);
      if (S.k > 1.6) { S.ph = 'claim'; S.k = 0; this.W.claim(d, this).then((ok) => { if (this.cs !== S) return; if (!ok) { this.cs = { s: 'walk', to: this.frontOf(d, 1.5), then: { s: 'idle', t: 2 }, why: null }; return; } S.ph = 'out'; S.k = 0; S.oldAt = { x: this.pos.x, z: this.pos.z, h: this.heading }; S.old = this.W.leaveShell(this); }); } return; }
    if (S.ph === 'claim') { if (S.k > 6) this.cs = { s: 'idle', t: 2 }; return; }      // (no answer from the tank: it gives up for now)
    if (S.ph === 'out') { this.outK = Math.min(1, S.k / 0.9); this.shellG.visible = false; this.abd.visible = true; const a = this.heading + Math.PI, p = { x: S.oldAt.x + Math.cos(a) * 0.35 * this.outK, z: S.oldAt.z - Math.sin(a) * 0.35 * this.outK }; this.pos.x = p.x; this.pos.z = p.z; this.heading = S.oldAt.h + Math.PI * Math.min(1, S.k / 0.9); if (S.k > 1.0) { S.ph = 'hop'; S.k = 0; S.from = { x: this.pos.x, z: this.pos.z }; } return; }
    if (S.ph === 'hop') { const p = this.frontOf(d, 0.05), k = Math.min(1, S.k / 0.7); this.pos.x = S.from.x + (p.x - S.from.x) * k; this.pos.z = S.from.z + (p.z - S.from.z) * k; S.move = 1.4; const want = (d.ry ?? 0) + 0.5 + Math.PI; let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 8);
      if (k >= 1) { S.ph = 'in'; S.k = 0; this.wear(d.type, shellSz(d)); this.shellG.visible = true; this.W.tookShell(this, d); } return; }
    if (S.ph === 'in') { this.outK = Math.max(0, 1 - S.k / 0.6); this.pos.x += (d.x - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (d.z - this.pos.z) * Math.min(1, dt * 4); if (S.k > 0.7) { this.abd.visible = false; S.ph = 'settle'; S.k = 0; } return; }
    if (S.ph === 'settle') { this.wig = S.k < 1.2 ? 1 : 0; if (S.k > 2) { this.wig = 0; this.inspected.clear(); const a = this.heading; this.cs = { s: 'walk', to: { x: this.pos.x + Math.cos(a) * 1.2, z: this.pos.z - Math.sin(a) * 1.2 }, then: { s: 'idle', t: 3 }, why: null }; } }
  }
  // what it remembers: where it dwells longest (its favorite spot), where it roams, who it keeps meeting. The phone running the animals tells the tank now and then
  memTick(dt, others) {
    for (const o of others) if (o.crab && o !== this && o.pos.distanceTo(this.pos) < 0.7) this.met[o.fid] = (this.met[o.fid] ?? 0) + dt / 10;
    this.areaT = this.areaT ?? {}; const ar = this.pos.y - sandH(this.pos.x, this.pos.z) > 0.3 ? 'high' : this.pos.x < -1.5 ? 'left' : this.pos.x > 1.5 ? 'right' : this.pos.z > 1.5 ? 'front' : this.pos.z < -1 ? 'back' : 'middle'; this.areaT[ar] = (this.areaT[ar] ?? 0) + dt;
    if ((this.memT -= dt) > 0 || !this.W?.isLead?.()) return; this.memT = 150;
    const fav = Object.entries(this.dwell).filter(([k]) => k !== 'undefined').sort((a, b) => b[1] - a[1])[0], area = Object.entries(this.areaT).sort((a, b) => b[1] - a[1])[0]?.[0];
    const met = Object.fromEntries(Object.entries(this.met).filter(([, n]) => n >= 1).map(([k, n]) => [k, Math.round(n)])); this.met = {};
    this.W.remember?.(this, { fav: fav && fav[1] > 40 ? fav[0] : null, area, met });
  }
  // the body, every frame: legs walking, claws and eyes busy, in and out of the shell
  pose(dt) {
    const want = this.cs.s === 'retract' || this.dead ? 1 : this.cs.s === 'emerge' ? Math.max(0, this.cs.t / (1.2 + 2 * this.ctype.hide)) * 0.9 : this.cs.s === 'molt' ? 1 : 0;
    this.retK += (want - this.retK) * Math.min(1, dt * (want > this.retK ? 9 : 1.6));      // in fast, out slowly
    const n = this.need, r = this.retK, o = this.outK, len = this.dims?.len ?? 0.4;
    this.bodyG.position.x = 0.02 - r * len * 0.35 / Math.max(0.5, n) + o * 0.12; this.bodyG.scale.setScalar(n * (1 - 0.55 * r)); this.bodyG.visible = r < 0.97;
    const t = this.ph, mk = this.moveK;
    for (const g of this.legs) { const u = g.userData, w = t * 9 + u.ph; g.rotation.y = u.side * (0.15 + Math.sin(w) * 0.45 * mk); g.rotation.x = u.side * (-0.1 + Math.max(0, Math.cos(w)) * 0.35 * mk) + u.side * r * 0.9; }
    const tap = this.tapK ? Math.sin(t * 10) * 0.35 : 0, eat = this.eatK ? Math.sin(t * 6) * 0.5 : 0, dig = this.digK ? Math.sin(t * 8) * 0.6 : 0, up = this.clawUp > 0 ? 0.9 : 0;
    for (const g of this.claws) { const s = g.userData.side; g.rotation.z = -0.3 + tap + (s > 0 ? eat : -eat * 0.4) + dig * (s > 0 ? 1 : -1) * 0.5 + up; g.rotation.y = s * (0.5 - (this.tapK ? 0.35 : 0) + Math.sin(t * 0.7 + s) * 0.08); }
    const look = this.lookT > 0 && this.lookAt ? Math.atan2(-(this.lookAt.z - this.pos.z), this.lookAt.x - this.pos.x) - this.heading : Math.sin(t * 0.9 + this.seed) * 0.4;
    for (const g of this.eyes) { g.rotation.y = Math.max(-0.8, Math.min(0.8, look)); g.rotation.z = Math.sin(t * 1.3 + g.position.z * 40) * 0.12; }
    for (const g of this.ants) g.rotation.y = Math.sin(t * 2.2 + g.position.z * 50) * 0.35;
    const wig = this.wig ? Math.sin(t * 22) * 0.12 : 0;
    this.root.rotation.set(wig, 0, this.pitchK); this.root.position.y = 0.01;
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(0, this.heading, 0, 'YZX'));
  }
  disposeTemps() { for (const m of this.temps) m.parent?.remove(m); this.temps = []; }
}
export { shellLabel };
