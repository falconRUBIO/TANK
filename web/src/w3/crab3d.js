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
import { CRAB_TYPES, CRAB_FEAR, crabNeed, shellFit, shellSz, shellLabel, crabTypeOf } from '../game/crabs.js';

const U = 0.034;      // finer than the decorations' cubes: a crab is small, and its legs and claws want the detail
const COL = {
  blueleg: { body: [104, 92, 64], body2: [142, 122, 84], leg: [58, 104, 188], band: [228, 236, 242], stalk: [234, 142, 62], eye: [18, 18, 22], claw: [66, 116, 196], tip: [236, 236, 228], ab: [196, 170, 140] },
  scarlet: { body: [196, 38, 34], body2: [226, 72, 52], leg: [204, 42, 38], band: [222, 66, 50], stalk: [246, 212, 64], eye: [16, 16, 20], claw: [208, 46, 40], tip: [252, 222, 120], ab: [214, 150, 130] },
  halloween: { body: [212, 90, 40], body2: [238, 122, 56], leg: [226, 94, 40], band: [44, 22, 46], stalk: [232, 112, 52], eye: [14, 12, 16], claw: [222, 88, 40], tip: [244, 222, 200], ab: [220, 160, 120] },
};
const stub = (id, label) => ({ id, label: label ?? id, move: 'crab', length: 14, vox: 0.052, make: () => ({ bounds: { x: [0, 0], y: [0, 0], z: [0, 0] }, sample: () => ({ tag: 'body', c: [0, 0, 0] }), center: [0, 0] }) });
const mesh = (v) => { topLit(v); return v.mesh(); };
const line = (v, a, b, c, w = 0) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))); for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t), z = Math.round(a[2] + (b[2] - a[2]) * t); v.set(x, y, z, typeof c === 'function' ? c(t) : c); if (w) v.set(x, y + 1, z, typeof c === 'function' ? c(t) : c); } };
// a thick limb through a few points: a little ball of voxels at each step
const tube = (v, pts, r, c) => { let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); seg.push(d); L += d; } let acc = 0;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(seg[i - 1] * 2)); for (let k = 0; k <= n; k++) { const t = k / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], col = typeof c === 'function' ? c((acc + seg[i - 1] * t) / L) : c, R = Math.ceil(r);
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) if (x * x + y * y + z * z <= r * r + 0.3) v.set(Math.round(p[0] + x), Math.round(p[1] + y), Math.round(p[2] + z), col); } acc += seg[i - 1]; } };
const big = new Set(['octopus', 'turtle', 'hawksbill', 'loggerhead', 'kemps', 'puffer', 'angelfish', 'tang']);

export class Crab3D extends Fish3D {
  constructor(id, seed, opts = {}) {
    super(stub(id, opts.label), seed, opts);
    this.mesh.visible = false; this.crab = true; this.sk = id; this.rng = mulberry32(seed * 977 + 13);
    const C = COL[id] ?? COL.blueleg, r = mulberry32(seed * 31 + 5);
    this.root = new THREE.Group(); this.group.add(this.root);
    this.shellG = new THREE.Group(); this.root.add(this.shellG);
    this.bodyG = new THREE.Group(); this.root.add(this.bodyG);
    // the body: a domed front shield, darker on top and speckled, the soft curled abdomen behind it (seen only out of the shell)
    { const v = new Vox(U); v.ellipsoid(0, 0, 0, 4.6, 3.1, 3.8, (i, j, k) => { const n = fbm(i * 0.45 + seed, j * 0.45, k * 0.45); return n > 0.74 ? mix(C.body, [250, 240, 220], 0.35) : mix(C.body, C.body2, n * 0.6 + (j < -1 ? 0.45 : 0)); }, seed, 0.12); v.ellipsoid(4.2, 0.4, 0, 1.4, 1, 1.2, () => C.body2, seed + 1, 0.1); this.bodyG.add(mesh(v)); }
    { const v = new Vox(U); for (let i = 0; i < 10; i++) { const a = i / 9, cx = -3 - a * 7, cy = 1.5 - a * a * 5; v.ellipsoid(cx, cy, 0, 3 - a * 1.4, 2.9 - a, 3 - a * 1.4, () => mix(C.ab, [240, 222, 204], 0.15 + 0.25 * a), seed + i, 0.1); } this.abd = mesh(v); this.abd.visible = false; this.bodyG.add(this.abd); }
    // two claws, rigged: a shoulder that swings the arm, a wrist that turns the hand, and a moving finger hinged against the fixed one, so it can
    // really open and pinch (a hermit's left claw is the bigger one)
    this.claws = [1, -1].map((side) => { const k = side < 0 ? 1.25 : 1, arm = new THREE.Group(), wrist = new THREE.Group(), fing = new THREE.Group();
      { const v = new Vox(U); tube(v, [[0, 0, 0], [2.5, 1.2, side * 1.2], [5, 0.6, side * 1.4]], 1.1, C.claw); arm.add(mesh(v)); }
      { const v = new Vox(U); v.ellipsoid(2.4 * k, 0, 0, 2.8 * k, 2.1 * k, 1.8 * k, (i, j) => mix(C.claw, C.tip, Math.max(0, (j + 1) / 4) * 0.4), seed + side, 0.08); tube(v, [[4.6 * k, -0.9, 0], [7 * k, -1.3, -side * 0.2]], 0.75, (t) => (t > 0.65 ? [40, 30, 28] : C.tip)); wrist.add(mesh(v)); }
      { const v = new Vox(U); tube(v, [[0, 0, 0], [2.4 * k, -0.7, -side * 0.2]], 0.75, (t) => (t > 0.6 ? [40, 30, 28] : C.tip)); fing.add(mesh(v)); fing.position.set(4.4 * k * U, 1.1 * U, 0); wrist.add(fing); }
      wrist.position.set(5 * U, 0.6 * U, side * 1.4 * U); arm.add(wrist); arm.position.set(3.2 * U, -1.2 * U, side * 2.2 * U); arm.userData = { side, wrist, fing, open: 0, twitch: 2 + r() * 5 }; this.bodyG.add(arm); return arm; });
    // walking legs, rigged at the hip and the knee: up and over with each step, the knee folding as the foot lifts, the foot set down again
    this.legs = []; for (const side of [1, -1]) for (let i = 0; i < 3; i++) { const hip = new THREE.Group(), knee = new THREE.Group(), x0 = 1.2 - i * 2.2, sh = i === 2 ? 0.55 : 1, band = (t) => (t > 0.9 ? [36, 30, 30] : Math.floor(t * 7) % 2 ? C.band : C.leg);
      const K = [1.2 * sh, 3.6 * sh, side * 4 * sh], M = [2.6 * sh, -1.6 * sh, side * 7.5 * sh], F = [3.2 * sh, -4.6 * sh, side * 8.6 * sh];
      { const v = new Vox(U); tube(v, [[0, 0, 0], K], 0.85, (t) => band(t * 0.35)); hip.add(mesh(v)); }
      { const v = new Vox(U); tube(v, [[0, 0, 0], [M[0] - K[0], M[1] - K[1], M[2] - K[2]], [F[0] - K[0], F[1] - K[1], F[2] - K[2]]], 0.8, (t) => band(0.35 + t * 0.65)); knee.add(mesh(v)); knee.position.set(K[0] * U, K[1] * U, K[2] * U); hip.add(knee); }
      hip.position.set(x0 * U, -1.2 * U, side * 3 * U); hip.userData = { side, i, knee, ph: i * 2.1 + (side > 0 ? 0 : Math.PI) }; this.bodyG.add(hip); this.legs.push(hip); }
    // eyestalks, each with its eye on a joint of its own so it can blink (a quick squint) and look about; antennae that flick
    this.eyes = [1, -1].map((side) => { const g = new THREE.Group(), eye = new THREE.Group(); { const v = new Vox(U); tube(v, [[0, 0, 0], [0.6, 5, side * 0.4]], 0.6, C.stalk); g.add(mesh(v)); }
      { const v = new Vox(U); v.ellipsoid(0, 0, 0, 1.5, 1.5, 1.5, () => C.eye, seed, 0); v.set(1, 1, side, [240, 240, 244]); eye.add(mesh(v)); eye.position.set(0.8 * U, 6.5 * U, side * 0.5 * U); g.add(eye); }
      g.position.set(3.8 * U, 1.8 * U, side * 1.2 * U); g.rotation.x = side * 0.2; g.userData = { side, eye }; this.bodyG.add(g); return g; });
    this.ants = [1, -1].map((side) => { const g = new THREE.Group(), v = new Vox(U); line(v, [0, 0, 0], [7, 6, side * 3], C.stalk); line(v, [7, 6, side * 3], [14, 5, side * 7], [214, 186, 156]); g.add(mesh(v)); g.position.set(4.6 * U, 0.8 * U, side * 0.7 * U); this.bodyG.add(g); return g; });
    this.blinkT = 2 + r() * 4; this.blink = 0; this.happyT = 0; this.grazeK = 0; this.flickT = 3 + r() * 4;
    this.ph = r() * 9; this.cs = { s: 'idle', t: 1 + r() * 2 }; this.retK = 0; this.outK = 0; this.moveK = 0; this.climbY = 0; this.pitchK = 0; this.clawUp = 0; this.tapK = 0; this.eatK = 0; this.digK = 0; this.buriedK = 0; this.wig = 0;
    this.inspected = new Set(); this.dwell = {}; this.met = {}; this.memT = 60 + r() * 60; this.doing = null; this.temps = []; this.radius = 0.3;
  }
  wary(o) { return Math.min(1.4, (CRAB_FEAR[o.sk ?? o.species?.id] ?? 0.1) * (0.6 + this.ctype.hide + (this.postMolt() ? 0.4 : 0)) + ((this.fear ?? {})[o.fid] ?? 0)); }
  postMolt() { const m = this.rec?.crab?.moltAt; return !!m && Date.now() - m < 6 * 3600e3; }      // (just molted, its new shell-skin is soft: more careful for a few hours)
  get ctype() { return CRAB_TYPES[crabTypeOf(this.rec)] ?? CRAB_TYPES.explorer; }
  get need() { return this.rec ? crabNeed(this.rec, Date.now()) : 0.9; }
  setGrowth(k) { this.growth = k; const n = this.need; this.bodyG?.scale.setScalar(n); this.radius = 0.3 * n + 0.1; }
  // the shell it wears, built to match the tank's record (and rebuilt when that changes)
  wear(t, sz) { if (this.shellKey === t + ':' + sz) return; this.shellKey = t + ':' + sz; this.shellG.clear(); const m = shellVox(t, sz, this.seed).mesh(); m.rotation.y = Math.PI; this.shellG.add(m); this.dims = shellDims(sz, t); this.bodyG.position.set(0.02, this.dims.r * 0.55, 0); }
  pick() { this.cs = { s: 'idle', t: 0.5 }; }
  setPose() {}
  react() {      // a tap: each answers in its own way, and never mid-move
    if (['swap', 'molt', 'climb', 'descend'].includes(this.cs.s)) return;
    const T = this.ctype; if (T.hide > 0.55) { this.cs = { s: 'retract', t: 1.6, who: null }; } else if (T.bold > 0.7) this.clawUp = 1.2; else { this.lookAt = this.pos.clone().add(new THREE.Vector3(0, 0.4, 3)); this.lookT = 1.8; this.backT = 0.3; this.blink = 0.14; }      // a blink and a look up at you, and a little step back
  }
  // a toy in the tank (w3/toys.js): a crab knows it is there. A timid one tucks in when it lands close; the curious ones walk over and look,
  // a bold one raises a claw at it; the rest just turn an eye. Never mid-move, never off food or a shell. Returns true when it goes to it.
  toy(p, name, landed = false) {
    const S = this.cs, T = this.ctype, now = performance.now(), d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    if (landed && d < 1.3 && T.hide > 0.55 && !['swap', 'molt', 'climb', 'descend', 'retract', 'perch'].includes(S.s)) { this.cs = { s: 'retract', t: 2 + this.rng() * 2, who: null, toy: name }; this.toyCool = now + 8e3; return false; }      // a timid one: in it goes, whatever it was at
    if (!['idle', 'walk', 'graze', 'rest', 'dig', 'watch'].includes(S.s) || S.why === 'food' || S.why === 'shell' || S.why === 'clear' || (this.toyCool ?? 0) > now) return false;
    if (S.s === 'watch' && S.toy) { S.o.pos = p; return d < 0.9; }      // (already on it: keep its eye on the thing as it moves)
    this.lookAt = p.clone ? p.clone() : p; this.lookT = 1.2;
    const keen = (T.bold + T.collect + (T.roam - 1) * 0.5) * 0.5;
    if (d < 3.2 && this.rng() < keen) { const a = Math.atan2(this.pos.z - p.z, this.pos.x - p.x), o = { pos: p, name }; this.cs = { s: 'walk', to: { x: p.x + Math.cos(a) * 0.55, z: p.z + Math.sin(a) * 0.55 }, then: { s: 'watch', t: 3 + this.rng() * 4, o, toy: true }, why: 'toy' }; if (T.bold > 0.7) this.clawUp = 0.8; this.toyCool = now + 15e3; return true; }
    this.toyCool = now + 6e3; return false;      // it looked, and went on with what it was doing
  }
  // playing: it comes after the spot under your finger, across the sand and round things in the way (a timid one hangs back a little)
  chase(at) {
    if (['swap', 'molt', 'climb', 'descend', 'perch', 'eat'].includes(this.cs.s)) return;
    const back = this.ctype.hide > 0.55 ? 0.6 : 0.25, a = Math.atan2(this.pos.z - at.z, this.pos.x - at.x), x = Math.max(-4, Math.min(4, at.x + Math.cos(a) * back)), z = Math.max(-2.3, Math.min(3.5, at.z + Math.sin(a) * back));
    if (this.cs.s === 'watch' && this.cs.o?.name === 'your finger') { this.cs.o.pos.copy(at); this.cs.t = Math.max(this.cs.t, 4); if (Math.hypot(at.x - this.pos.x, at.z - this.pos.z) < back + 0.3) return; }      // there, watching the finger: it stays with it while you play, and comes on again when the finger moves off
    if (this.cs.s === 'walk' && this.cs.why === 'finger') { const T = this.cs.to; if (Math.hypot(T.x - x, T.z - z) > 0.4) this.cs.replan = Math.min(this.cs.replan ?? 0, 0.3); T.x = x; T.z = z; this.cs.t = 3; return; }
    this.cs = { s: 'walk', to: { x, z }, then: { s: 'watch', t: 4, o: { pos: at.clone(), name: 'your finger' } }, why: 'finger', t: 3 }; this.lookAt = at.clone(); this.lookT = 1;
  }
  sayDoing() { return this.doing; }
  // ── deciding what to do next, from its temperament and what is really around it ──
  decide(others) {
    const T = this.ctype, r = this.rng, W = this.W, rec = this.rec, C = rec?.crab ?? {};
    if (C.moltAt && Date.now() - C.moltAt < 15 * 60e3) { this.cs = { s: 'molt', t: 60 }; return; }
    const empties = W?.empties?.() ?? [], spots = W?.spots?.() ?? [], flakes = (W?.flakes?.() ?? []).filter((f) => !f.eaten && f.pos.y <= sandH(f.pos.x, f.pos.z) + 0.25);
    const falling = (W?.flakes?.() ?? []).filter((f) => !f.eaten && f.pos.y > sandH(f.pos.x, f.pos.z) + 0.25 && Math.hypot(f.pos.x - this.pos.x, f.pos.z - this.pos.z) < 3);
    if (!flakes.length && falling.length && r() < 0.85) { this.cs = { s: 'alert', t: 0.8 + r() * 0.8, food: falling[0] }; return; }      // it smells food coming down: antennae up, a look, then off to where it lands
    const food = flakes.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
    if (food && food.pos.distanceTo(this.pos) < 3 && r() < 0.8) { this.cs = { s: 'walk', to: { x: food.pos.x, z: food.pos.z }, then: { s: 'eat', t: 2.5 + r() * 2, food }, why: 'food' }; return; }
    const tight = shellFit(C.shell?.sz ?? 1, this.need) === 'small', recent = Date.now() - (C.swapAt ?? 0) < 3 * 3600e3;
    const cand = empties.filter((d) => !this.inspected.has(d.id) && !this.W.claimedBy?.(d.id, this)).sort((a, b) => Math.hypot(a.x - this.pos.x, a.z - this.pos.z) - Math.hypot(b.x - this.pos.x, b.z - this.pos.z));
    const night = !!this.isNight, crabsHere = others.filter((o) => o.crab && o !== this && !o.dead), queued = crabsHere.find((o) => o.cs?.s === 'queue' && tight && shellFit(shellSz(o.cs.d), this.need) !== 'small'), fits = this.W?.empties?.().some((e) => shellFit(shellSz(e), this.need) === 'fits');
    const rapT = tight && !fits && crabsHere.find((o) => o.pos.distanceTo(this.pos) < 2.5 && shellFit(o.rec?.crab?.shell?.sz ?? 0, this.need) === 'fits' && (this.rapCool ?? 0) < Date.now());
    if (queued && r() < 0.6) { this.cs = { s: 'walk', to: this.frontOf(queued.cs.d, 0.9 + r() * 0.4), then: { s: 'queue', t: 40 + r() * 60, d: queued.cs.d }, why: 'shell' }; return; }      // it joins the line
    if (rapT && r() < 0.25) { this.rapCool = Date.now() + 10 * 60e3; this.cs = { s: 'rap', t: 12, o: rapT }; return; }
    const W8 = { gather: crabsHere.length && !night ? 0.7 : 0, shell: cand.length ? (tight ? 6 : recent ? 0.15 : 0.5 * (0.5 + T.collect + 0.3 * T.pick)) : 0, wander: 1.2 * T.roam, fav: C.fav && spots.some((s) => s.id === C.fav) ? 1.2 * (0.4 + T.hide) * (T.roam < 0.8 ? 2 : 1) : 0, climb: spots.some((s) => this.W.climbable?.(s)) ? 0.9 * T.climb * (this.sk === 'halloween' ? 2 : 1) : 0,
      follow: others.some((o) => o.crab && o !== this && o.cs?.s === 'walk' && o.pos.distanceTo(this.pos) < 1.8) ? 0.35 : 0, dig: 0.18 * (0.5 + T.collect), visit: 0.35 * T.bold, rest: 0.6 };
    W8.graze = 1.8 * (night ? 1.2 : 0.7);      // most of a real hermit crab's life: picking over rock and sand for algae and scraps, claw to mouth, again and again
    if (night) { W8.wander *= 1.7; W8.dig *= 1.5; W8.rest *= 0.5; W8.shell *= 1.3; } else { W8.rest *= 2; W8.wander *= 0.55; W8.climb *= 0.6; W8.dig *= 0.6; }      // hermit crabs are about most at night (and dusk and dawn); by day they rest up, often together
    if (this.postMolt()) { W8.visit = 0; W8.climb *= 0.3; W8.fav *= 2; }
    let sum = 0; for (const k in W8) sum += W8[k]; let x = r() * sum, pick = 'rest'; for (const k in W8) { x -= W8[k]; if (x <= 0) { pick = k; break; } }
    if (pick === 'shell') { const d = cand[0]; this.cs = { s: 'walk', to: this.frontOf(d, 0.55), then: { s: 'inspect', t: 0, d }, why: 'shell' }; return; }
    if (pick === 'fav') { const sp = spots.find((s) => s.id === C.fav), a = r() * 6.28; this.cs = { s: 'walk', to: { x: sp.x + Math.cos(a) * 0.7, z: sp.z + Math.sin(a) * 0.6 }, then: { s: 'rest', t: 15 + r() * 30, fav: sp }, why: 'fav' }; return; }
    if (pick === 'climb') { const opts = spots.filter((s) => this.W.climbable(s)), sp = opts[Math.floor(r() * opts.length)], a = Math.atan2(this.pos.z - sp.z, this.pos.x - sp.x), b0 = { x: sp.x + Math.cos(a) * (0.45 + sp.h * 0.25), z: sp.z + Math.sin(a) * (0.45 + sp.h * 0.25) }, base = this.clearAt(b0.x, b0.z) ? b0 : this.nearClear(b0.x, b0.z) ?? b0;      /* (the foot of the climb on clear sand: a cave's overhang is not) */ this.cs = { s: 'walk', to: base, then: { s: 'climb', t: 0, sp, base }, why: null }; return; }
    if (pick === 'follow') { const o = others.find((q) => q.crab && q !== this && q.cs?.s === 'walk' && q.pos.distanceTo(this.pos) < 1.8); if (o) { this.cs = { s: 'follow', t: 8 + r() * 8, o }; return; } }
    if (pick === 'gather') { const o = crabsHere.sort((a, b) => ((this.rec?.crab?.met?.[b.fid] ?? 0) - (this.rec?.crab?.met?.[a.fid] ?? 0)) || a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0], a = r() * 6.28; this.cs = { s: 'walk', to: { x: o.pos.x + Math.cos(a) * 0.55, z: o.pos.z + Math.sin(a) * 0.55 }, then: { s: 'rest', t: 40 + r() * 60 }, why: 'gather', o }; return; }      // by day it goes and rests with the crab it knows best
    if (pick === 'graze') { const rocks = spots.filter((q) => this.W?.cat?.(q) === 'ROCKS' && !this.W?.avoid?.(q.x, q.z, this)), on = rocks.length && r() < 0.6 ? rocks[Math.floor(r() * rocks.length)] : null, a = r() * 6.28; this.cs = on ? { s: 'walk', to: { x: on.x + Math.cos(a) * 0.6, z: on.z + Math.sin(a) * 0.5 }, then: { s: 'graze', t: 15 + r() * 30, on }, why: null } : { s: 'graze', t: 12 + r() * 25, on: null }; return; }
    if (pick === 'dig') { this.cs = { s: 'dig', t: 4 + r() * 4 }; return; }
    if (pick === 'visit') { const o = others.filter((q) => !q.crab && !q.dead && !q.visitor && q.group?.visible !== false && q.pos.y < sandH(q.pos.x, q.pos.z) + 1.4 && q.pos.distanceTo(this.pos) < 4).sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0]; if (o) { const a = Math.atan2(this.pos.z - o.pos.z, this.pos.x - o.pos.x); this.cs = { s: 'walk', to: { x: o.pos.x + Math.cos(a) * 1.1, z: o.pos.z + Math.sin(a) * 1.1 }, then: { s: 'watch', t: 3 + r() * 3, o }, why: null }; return; } }
    if (pick === 'rest') { this.cs = { s: 'idle', t: (night ? 3 : 8) + r() * (night ? 6 : 14) }; return; }      // (by day it sits a good while between outings)
    const R = 1 + 2.4 * T.roam; let to = null; for (let k = 0; k < 8 && !to; k++) { const p = { x: Math.max(-3.9, Math.min(3.9, this.pos.x + (r() - 0.5) * 2 * R)), z: Math.max(-2.8, Math.min(3.5, this.pos.z + (r() - 0.5) * 2 * R)) }; if (!this.W?.avoid?.(p.x, p.z, this)) to = p; }
    this.cs = { s: 'walk', to: to ?? { x: this.pos.x, z: this.pos.z }, then: { s: 'idle', t: 1 + r() * 3 }, why: null };
  }
  frontOf(d, k) { const a = (d.ry ?? 0) + 0.5, p = { x: d.x + Math.cos(a) * k, z: d.z - Math.sin(a) * k }; return this.clearAt(p.x, p.z) ? p : this.nearClear(p.x, p.z) ?? p; }      // in front of a lying shell's opening (on clear sand: a shell may lie against a rock)
  nearClear(x, z) { for (let r = 0.2; r <= 2; r += 0.2) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, q = { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r }; if (Math.abs(q.x) < 4.3 && q.z > -2.4 && q.z < 3.6 && this.clearAt(q.x, q.z)) return q; } return null; }      // the nearest clear sand to a point
  // ── each frame ──
  update(dt, rng, others) {
    const px = this.pos.x, pz = this.pos.z, wasClear = this.clearAt(px, pz); try { this.update0(dt, rng, others); } finally { if (wasClear && !['climb', 'perch', 'descend', 'molt'].includes(this.cs?.s) && !this.clearAt(this.pos.x, this.pos.z)) { this.pos.x = px; this.pos.z = pz; } }      // whatever it was doing (circling a shell, backing off, being nudged), it is never moved from clear sand into a decoration
  }
  update0(dt, rng, others) {
    if (this.puppet) return this.puppet(dt);
    this.h0 = this.heading;      // (where it faced at the start of the frame: its turning is given weight at the end of pose())
    const rec = this.rec, C = rec?.crab;
    if (C?.shell && this.cs.s !== 'swap') { if (this.shellKey && this.shellKey !== C.shell.t + ':' + C.shell.sz && !this.mirrorT) this.mirrorT = 2.4; if (!this.mirrorT || this.mirrorT < 1.2) this.wear(C.shell.t, C.shell.sz); }      // another phone saw it move house: it settles into the new shell here too
    if (this.mirrorT) { this.mirrorT = Math.max(0, this.mirrorT - dt); this.doing = 'settling into a new shell'; this.outK = Math.sin(Math.PI * (1 - this.mirrorT / 2.4)) * 0.8; this.abd.visible = this.outK > 0.3; if (!this.mirrorT) { this.outK = 0; this.abd.visible = false; } }      // (seen from another phone: out of the old shell and into the new, where it stands)
    if (this.dead) { this.retK = Math.min(1, this.retK + dt); this.pose(dt); return; }
    this.ph += dt; const T = this.ctype, S = this.cs; S.t = (S.t ?? 0) - dt; this.lookT = Math.max(0, (this.lookT ?? 0) - dt); this.clawUp = Math.max(0, this.clawUp - dt); this.backT = Math.max(0, (this.backT ?? 0) - dt);
    // fear: how wary it is of each animal comes from what that kind is to a crab (CRAB_FEAR: an octopus or a puffer most of all), its own temperament,
    // whether it has just molted (soft, and it knows it), and what that very animal has done to it lately (each fright adds, and fades again)
    const fear = (this.fear ??= {}); for (const k in fear) { fear[k] = Math.max(0, fear[k] - dt * 0.004); if (!fear[k]) delete fear[k]; }
    if (!['swap', 'molt', 'retract', 'climb', 'descend', 'rap'].includes(S.s) && S.why !== 'clear' && (this.cool ?? 0) <= 0) { let th = null, tw = 0;
      for (const o of others) { if (o === this || o.dead || o.crab || o.group?.visible === false || o.pos.y > this.pos.y + 1.2 || (this.used?.[o.fid] ?? 0) > Date.now()) continue; const w = this.wary(o), d = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z); if (w > 0.12 && d < 0.35 + 1.1 * w && w > tw) { th = o; tw = w; } }
      if (th && tw > 0.45) { this.cs = { s: 'retract', t: 2 + 5 * Math.min(1, tw) * (0.5 + T.hide) + this.rng() * 2, who: th }; this.cool = 6; fear[th.fid] = Math.min(0.8, (fear[th.fid] ?? 0) + 0.25); this.W?.note?.(this, 'startle', th); }      // in it goes
      else if (th && S.s !== 'eat' && S.s !== 'queue') { const a = Math.atan2(this.pos.z - th.pos.z, this.pos.x - th.pos.x); this.cs = { s: 'walk', to: { x: this.pos.x + Math.cos(a) * 1.1, z: this.pos.z + Math.sin(a) * 1.1 }, then: { s: 'idle', t: 1 }, why: 'clear', who: th }; this.cool = 5; } }      // only wary: it steps out of the way
    this.cool = (this.cool ?? 0) - dt;
    if (this.cs.s !== 'graze') this.grazeK = 0; if (this.cs.s !== 'eat') { this.eatK = 0; if (this.morsel) { this.morsel.parent?.remove(this.morsel); this.morsel = null; } }      // (interrupted: claws and morsel put away)
    let move = 0; this.doing = null;
    switch (this.cs.s) {
      case 'idle': if (!this.clearAt(this.pos.x, this.pos.z)) { const out = this.plan({ x: this.pos.x, z: this.pos.z }); if (out?.length) { this.cs = { s: 'walk', to: out[out.length - 1], then: { s: 'idle', t: 1 }, why: null }; break; } }      /* (come down or out of a shell inside something: it walks out first) */
        if (this.cs.t <= 0) this.decide(others); if (this.atFav()) this.doing = 'back at its favorite spot'; break;
      case 'walk': { const to = this.cs.to, d = Math.hypot(to.x - this.pos.x, to.z - this.pos.z), W8 = this.cs; if (!W8.way || W8.wayTo !== to || (W8.replan ?? 0) <= 0) { W8.way = this.plan(to) ?? [to]; W8.wayTo = to; W8.replan = 6; } W8.replan -= dt;      // (planned round the decorations; planned again now and then, as things move)
        while (W8.way.length > 1 && Math.hypot(W8.way[0].x - this.pos.x, W8.way[0].z - this.pos.z) < 0.18) W8.way.shift();
        if (W8.way.length > 1 && (W8.chk = (W8.chk ?? 0) - dt) <= 0) { W8.chk = 0.5; if (!this.clearAt(W8.way[0].x, W8.way[0].z)) W8.replan = 0; }      // something put down on its way: it notices within half a second and plans again if (W8.way.cut && W8.way.length === 1 && Math.hypot(W8.way[0].x - this.pos.x, W8.way[0].z - this.pos.z) < 0.18) { W8.walkT = 99; }      /* (as near as the sand allows: that will do) */
        move = this.step(W8.way.length > 1 || W8.way.cut ? W8.way[0] : to, dt, others); if (this.cs.why === 'shell') this.doing = 'going to look at a shell'; else if (this.cs.why === 'food') this.doing = 'going for a bit of food'; else if (this.cs.why === 'finger') this.doing = this.ctype.hide > 0.55 ? 'following your finger, carefully' : 'following your finger'; else if (this.cs.why === 'toy') this.doing = `going to look at ${this.cs.then?.o?.name ?? 'the toy'}`; else if (!this.cs.why && d > 1.2) this.doing = this.ctype.roam > 1.3 ? 'exploring the tank' : 'out for a walk'; if (this.cs.why === 'fav') this.doing = 'heading back to its favorite spot'; if (this.cs.why === 'clear') this.doing = `keeping clear of ${this.cs.who?.name ?? 'a bigger animal'}${this.cs.home ? `'s ${this.cs.home}` : ''}`; if (this.cs.why === 'gather') this.doing = `going to join ${this.cs.o?.name ?? 'the other crabs'}`;
        if (d < (this.cs.then?.s === 'climb' ? 0.5 : 0.12) || (this.cs.walkT = (this.cs.walkT ?? 0) + dt) > 25) {      /* (at the foot of a rock it is close enough: the rock itself stops it) */ const n = this.cs.then ?? { s: 'idle', t: 1 }; this.cs = { ...n, t: n.t ?? 1 }; } break; }
      case 'eat': { this.eatK = 1; if (!this.morsel) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), new THREE.MeshStandardMaterial({ color: 0x9c6a34, roughness: 0.8 })); m.position.set(7.2 * U, -0.4 * U, 0); this.claws[0].userData.wrist.add(m); this.morsel = m; } this.doing = this.guardFrom && (this.guardT = (this.guardT ?? 0) - dt) > 0 ? `guarding its food from ${this.guardFrom}` : 'eating'; if (this.guardT > 0) this.clawUp = Math.max(this.clawUp, 0.2); const f = this.cs.food; if (f && !f.eaten && f.pos.distanceTo(this.pos) < 0.5 && this.cs.t < 1) { f.eaten = true; this.W?.ate?.(this); } if (this.cs.t <= 0) { this.eatK = 0; this.morsel?.parent?.remove(this.morsel); this.morsel = null; this.cs = { s: 'idle', t: 1 }; } break; }
      case 'rest': { const pals = others.filter((o) => o.crab && o !== this && !o.dead && o.pos.distanceTo(this.pos) < 0.9).map((o) => o.name); this.doing = pals.length ? `resting with ${pals.slice(0, 2).join(' and ')}` : this.cs.fav ? 'back at its favorite spot' : null; for (const o of others) if (o.crab && o !== this && o.pos.distanceTo(this.pos) < 0.9) this.met[o.fid] = (this.met[o.fid] ?? 0) + dt / 20; } this.dwell[this.cs.fav?.id] = (this.dwell[this.cs.fav?.id] ?? 0) + dt; if (this.cs.t <= 0) this.cs = { s: 'idle', t: 0.5 }; break;
      case 'retract': { const w = this.cs.who; this.doing = this.tapBy && this.tapBy === w ? `tucked in while ${w.name} taps its shell` : w?.crab ? 'holding on to its shell' : w ? `hiding from ${w.name ?? 'a big fish'}` : this.cs.toy ? `tucked in: ${this.cs.toy} landed close` : 'tucked in its shell'; this.cs.inT = (this.cs.inT ?? 0) + dt; if (w && this.cs.inT < 12 && Math.hypot(w.pos.x - this.pos.x, w.pos.z - this.pos.z) < 0.9 + T.hide) this.cs.t = Math.max(this.cs.t, 1.2); if (this.cs.t <= 0) { if (w) (this.used ??= {})[w.fid] = Date.now() + 25e3; this.cs = { s: 'emerge', t: 1.2 + 2 * T.hide }; } break; }      // (never more than a dozen seconds in: it peeks out, and gets used to that one)
      case 'emerge': this.doing = 'peeking out of its shell'; if (this.cs.t <= 0) this.cs = { s: 'idle', t: 0.5 }; break;
      case 'follow': { const o = this.cs.o; if (!o || o.dead || o.cs?.s === 'retract') { this.cs = { s: 'idle', t: 1 }; break; } const back = { x: o.pos.x - Math.cos(o.heading) * 0.5, z: o.pos.z + Math.sin(o.heading) * 0.5 }; if (Math.hypot(back.x - this.pos.x, back.z - this.pos.z) > 0.25) move = this.step(back, dt, others); this.doing = `following ${o.name}`; this.W?.note?.(this, 'met', o); if (this.cs.t <= 0) this.cs = { s: 'idle', t: 2 }; break; }
      case 'dig': this.digK = 1; this.doing = 'digging in the sand'; if (this.cs.t <= 0) { this.digK = 0; this.W?.puff?.(this.pos); this.cs = { s: 'idle', t: 1 }; } break;
      case 'watch': { const o = this.cs.o; if (o) { this.lookAt = o.pos; this.lookT = 0.3; this.doing = this.cs.toy ? (this.ctype.bold > 0.7 ? `poking at ${o.name}` : `looking over ${o.name}`) : `watching ${o.name}`; if (this.cs.toy && this.ctype.bold > 0.7) this.clawUp = Math.max(this.clawUp, 0.5); this.heading += (Math.atan2(-(o.pos.z - this.pos.z), o.pos.x - this.pos.x) - this.heading) * Math.min(1, dt * 2); } if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }
      case 'molt': this.doing = 'buried in the sand, molting'; this.buriedK = Math.min(1, this.buriedK + dt * 0.5); if (!(this.rec?.crab?.moltAt && Date.now() - this.rec.crab.moltAt < 15 * 60e3)) { this.buriedK = Math.max(0, this.buriedK - dt); if (this.buriedK <= 0) this.cs = { s: 'idle', t: 1 }; } break;
      case 'climb': { const sp = this.cs.sp, top = this.W?.decorTop?.(sp.x, sp.z, sp.id) ?? (sp.y + sp.h), k = Math.min(1, (this.cs.k = (this.cs.k ?? 0) + dt / 3)); this.doing = `climbing the ${this.W?.label?.(sp) ?? 'rock'}`;
        this.pos.x = this.cs.base.x + (sp.x - this.cs.base.x) * k * 0.85; this.pos.z = this.cs.base.z + (sp.z - this.cs.base.z) * k * 0.85; this.climbY = Math.max(0, (top - sandH(this.pos.x, this.pos.z)) * Math.min(1, k * 1.25)); this.pitchK = k < 0.85 ? 0.7 : 0.7 * (1 - (k - 0.85) / 0.15); move = 1;
        this.heading += (Math.atan2(-(sp.z - this.cs.base.z), sp.x - this.cs.base.x) - this.heading) * Math.min(1, dt * 3);
        if (k >= 1) this.cs = { s: 'perch', t: 10 + this.rng() * 30 * (0.5 + T.climb), sp, base: this.cs.base }; break; }
      case 'perch': { const sp = this.cs.sp; this.doing = `up on the ${this.W?.label?.(sp) ?? 'rock'}`; this.pitchK = 0; this.dwell[sp.id] = (this.dwell[sp.id] ?? 0) + dt; this.climbY = Math.max(0, (this.W?.decorTop?.(sp.x, sp.z, sp.id) ?? (sp.y + sp.h)) - sandH(this.pos.x, this.pos.z)); if (this.cs.t <= 0) this.cs = { s: 'descend', t: 0, sp, base: this.cs.base, from: { x: this.pos.x, z: this.pos.z }, y0: this.climbY }; break; }
      case 'descend': { const k = Math.min(1, (this.cs.k = (this.cs.k ?? 0) + dt / 2.6)); this.doing = 'climbing down'; this.pos.x = this.cs.from.x + (this.cs.base.x - this.cs.from.x) * k; this.pos.z = this.cs.from.z + (this.cs.base.z - this.cs.from.z) * k; this.climbY = this.cs.y0 * (1 - k); this.pitchK = -0.5 * Math.sin(k * Math.PI); move = 1; this.heading += (Math.atan2(-(this.cs.base.z - this.cs.from.z), this.cs.base.x - this.cs.from.x) - this.heading) * Math.min(1, dt * 3); if (k >= 1) { this.climbY = 0; this.cs = { s: 'idle', t: 1 }; } break; }
      case 'inspect': this.inspectTick(dt, others); move = this.cs.move ?? 0; break;
      case 'tryon': this.tryonTick(dt); break;
      case 'graze': { this.grazeK = 1; const on = this.cs.on; this.doing = on ? `picking over the ${this.W?.label?.(on) ?? 'rock'}` : 'picking through the sand';      // a slow shuffle, claw after claw to the mouth
        this.cs.dir ??= this.rng() * 6.28; this.cs.dir += (this.rng() - 0.5) * dt * 1.5; const tx = this.pos.x + Math.cos(this.cs.dir) * 0.4, tz = this.pos.z - Math.sin(this.cs.dir) * 0.4; if (Math.sin(this.ph * 0.9) > 0.4) move = this.step({ x: tx, z: tz }, dt, others, 0.18) * 0.5;
        if (this.cs.t <= 0) { this.grazeK = 0; this.cs = { s: 'idle', t: 1 }; } break; }
      case 'alert': { this.doing = 'smelled food'; const f = this.cs.food; if (f) { this.lookAt = f.pos; this.lookT = 0.3; this.heading += (Math.atan2(-(f.pos.z - this.pos.z), f.pos.x - this.pos.x) - this.heading) * Math.min(1, dt * 3); } this.flick = 0.3; if (this.cs.t <= 0) { const at = f ? { x: f.pos.x, z: f.pos.z } : { x: this.pos.x, z: this.pos.z }; this.cs = { s: 'walk', to: at, then: { s: 'eat', t: 3 + this.rng() * 3, food: f }, why: 'food' }; } break; }
      case 'queue': { const d = this.cs.d; this.doing = `waiting by the ${shellLabel(d.type)}`; this.lookAt = new THREE.Vector3(d.x, this.pos.y, d.z); this.lookT = 0.3;      // a vacancy chain: crabs wait by a shell that is too big, for whoever it fits to move in and leave theirs
        if ((this.cs.chk = (this.cs.chk ?? 0) - dt) <= 0) { this.cs.chk = 1; const C = this.rec?.crab ?? {}, need = this.need, near = (this.W?.empties?.() ?? []).filter((e) => Math.hypot(e.x - this.pos.x, e.z - this.pos.z) < 3.5 && shellFit(shellSz(e), need) === 'fits' && shellSz(e) > (C.shell?.sz ?? 0) + 0.04 && !this.W.claimedBy?.(e.id, this));
          if (near.length && this.W?.isLead?.()) { const e = near[0]; this.inspected.add('x'); this.cs = { s: 'walk', to: this.frontOf(e, 0.55), then: { s: 'inspect', t: 0, d: e, quick: true }, why: 'shell' }; break; } }
        if (!(this.W?.empties?.() ?? []).some((e) => e.id === d.id)) { this.cs.gone = (this.cs.gone ?? 8) - dt; this.doing = 'watching for the shell it left'; if (this.cs.gone <= 0) this.cs = { s: 'idle', t: 1 }; } else if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }      // (someone moved in: it waits a moment longer, for the shell that crab leaves)
      case 'rap': { const o = this.cs.o; if (!o || o.dead) { this.cs = { s: 'idle', t: 1 }; break; } const dd = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z);      // shell rapping: it knocks its shell against another's, sizing it up; the other holds on inside, and it gives up (nobody loses a shell here)
        if (dd > 0.5 && !this.cs.at) { move = this.step({ x: o.pos.x, z: o.pos.z }, dt, others); this.doing = `going to size up ${o.name}'s shell`; if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }
        this.cs.at ??= 3.5; this.cs.at -= dt; this.wig = 1; this.tapK = 1; this.doing = `sizing up ${o.name}'s shell`; if (o.cs?.s !== 'retract' && o.cs?.s !== 'swap') o.cs = { s: 'retract', t: 3, who: this };
        if (this.cs.at <= 0) { this.wig = 0; this.tapK = 0; this.W?.note?.(this, 'met', o); this.reject({ x: o.pos.x, z: o.pos.z }); } break; }
      case 'backoff': { this.doing = 'letting another crab look first'; move = this.step(this.cs.to, dt, others, 0.8); if (this.cs.t <= 0) this.cs = { s: 'idle', t: 1 }; break; }
      case 'swap': this.swapTick(dt); move = this.cs.move ?? 0; break;
      default: this.cs = { s: 'idle', t: 1 };
    }
    if (this.backT > 0) { this.pos.x -= Math.cos(this.heading) * dt * 0.35; this.pos.z += Math.sin(this.heading) * dt * 0.35; move = 0.6; }
    this.moveK += (move - this.moveK) * Math.min(1, dt * 6);
    this.pos.x = Math.max(-4.1, Math.min(4.1, this.pos.x)); this.pos.z = Math.max(-3.2, Math.min(3.8, this.pos.z));
    if (!['climb', 'perch', 'descend'].includes(this.cs.s)) this.climbY = Math.max(0, this.climbY - dt * 2);
    this.pos.y = sandH(this.pos.x, this.pos.z) + this.climbY - 0.12 * this.buriedK * (this.dims?.h ?? 0.2) * 3;
    { const m = this.rec?.crab?.moltAt, fresh = m && Date.now() - m < 2 * 3600e3 && Date.now() - m > 15 * 60e3; if (fresh && !this.ghost && this.W?.addGhost) this.ghost = this.W.addGhost(this); if (!fresh && this.ghost) { this.ghost.parent?.remove(this.ghost); this.ghost = null; } }      // after molting, its old skin lies on the sand a while (keepers often take it for a dead crab)
    if (this.mirrorT) this.doing = 'settling into a new shell';
    this.memTick(dt, others);
    this.pose(dt);
  }
  atFav() { const f = this.rec?.crab?.fav, sp = f && (this.W?.spots?.() ?? []).find((s) => s.id === f); return !!sp && Math.hypot(sp.x - this.pos.x, sp.z - this.pos.z) < 1.1; }
  // walking: legs going, a little sideways the way crabs do, round other crabs and big animals and decorations
  clearAt(x, z) { const Wd = Fish3D.world; if (!Wd?.at) return true; const y = sandH(x, z) + 0.22; return ![[0, 0], [0.13, 0], [-0.13, 0], [0, 0.13], [0, -0.13], [0.26, 0], [-0.26, 0], [0, 0.26], [0, -0.26], [0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]].some(([a, b]) => Wd.at(x + a, y, z + b)); }      // (a body's width round it: it may stray a little off its way and still never touch)      // nothing solid round it at body height
  // a way across the sand that keeps clear of every decoration: A* over a 0.2 grid of clear-sand cells (rocks, the pot, the cave are walls).
  // From inside something it first leads out to the nearest clear cell; to somewhere blocked it goes to the nearest clear cell beside it.
  plan(to) {
    const t0 = performance.now(); this.planN = (this.planN ?? 0) + 1; try { return this.plan0(to); } finally { const ms = performance.now() - t0; this.planMs = (this.planMs ?? 0) + ms; this.planMax = Math.max(this.planMax ?? 0, ms); }      // (counted and timed: tools/crab_audit.mjs)
  }
  plan0(to) {
    const G = 0.2, X0 = -4.2, Z0 = -2.4, NX = 43, NZ = 31, id = (i, k) => k * NX + i, cx = (x) => Math.max(0, Math.min(NX - 1, Math.round((x - X0) / G))), cz = (z) => Math.max(0, Math.min(NZ - 1, Math.round((z - Z0) / G)));
    const ok = new Uint8Array(NX * NZ); for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) ok[id(i, k)] = this.clearAt(X0 + i * G, Z0 + k * G) ? 1 : 2;
    const near = (i0, k0) => { if (ok[id(i0, k0)] === 1) return [i0, k0]; for (let r = 1; r < 14; r++) for (let di = -r; di <= r; di++) for (const dk of [-r, r]) for (const [i, k] of [[i0 + di, k0 + dk], [i0 + dk, k0 + di]]) if (i >= 0 && k >= 0 && i < NX && k < NZ && ok[id(i, k)] === 1) return [i, k]; return null; };
    const s0 = [cx(this.pos.x), cz(this.pos.z)], S = s0, T = near(cx(to.x), cz(to.z)); if (!S || !T) return null;
    const g = new Float32Array(NX * NZ).fill(1e9), from = new Int32Array(NX * NZ).fill(-1), open = [[0, id(...S)]], tid = id(...T); g[id(...S)] = 0;
    while (open.length) { let bi = 0; for (let q = 1; q < open.length; q++) if (open[q][0] < open[bi][0]) bi = q; const [, c] = open.splice(bi, 1)[0]; if (c === tid) break; const ci = c % NX, ck = (c / NX) | 0;
      for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) { if (!di && !dk) continue; const i = ci + di, k = ck + dk; if (i < 0 || k < 0 || i >= NX || k >= NZ) continue; const n = id(i, k); if (di && dk && (ok[id(ci + di, ck)] !== 1 || ok[id(ci, ck + dk)] !== 1)) continue;
        const ng = g[c] + (di && dk ? 1.414 : 1) * (ok[n] === 1 ? 1 : 2000);      /* (solid is not impossible, just very dear: from a pocket inside something, it finds the shortest way out) */ if (ng < g[n]) { g[n] = ng; from[n] = c; open.push([ng + Math.hypot(i - T[0], k - T[1]), n]); } } }
    if (from[tid] < 0 && tid !== id(...S)) return null;
    const pts = []; for (let c = tid; c >= 0; c = from[c]) pts.unshift({ x: X0 + (c % NX) * G, z: Z0 + ((c / NX) | 0) * G });
    const way = pts;      // (every cell kept: a straight line between far-apart points would cut the corners of things)
    if (this.clearAt(this.pos.x, this.pos.z)) { const b = way.findIndex((q) => ok[id(Math.round((q.x - X0) / G), Math.round((q.z - Z0) / G))] !== 1); if (b >= 0) { way.length = b; way.cut = true; this.planCut = (this.planCut ?? 0) + 1; return way.length ? way : null; } }      // starting from clear sand it never goes through anything: walled off, it goes as far as the sand allows (solid is only crossed to get out of something)
    if (way.length > 1 && !this.clearAt(way[0].x, way[0].z) && this.clearAt(this.pos.x, this.pos.z)) way.shift();      // (its own grid cell can sit just inside something it is standing beside: it starts from where it really is)
    if (way.length && this.clearAt(to.x, to.z)) way[way.length - 1] = { x: to.x, z: to.z };      // (and ends exactly where it was going)
    return way;
  }
  step(to, dt, others, mul = 1) {
    const dx = to.x - this.pos.x, dz = to.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 0.02) return 0;
    const playing = this.cs?.why === 'finger'; if (playing) { mul *= 1.5; this.pauseT = 0; this.burstT = 1; }      // after your finger: eager, no stopping to look about
    const paused = (this.pauseT ?? 0) > 0; if (paused) this.pauseT -= dt; else if ((this.burstT = (this.burstT ?? 1) - dt) <= 0) { this.burstT = 0.8 + this.rng() * 2.2 * this.ctype.roam; this.pauseT = 0.2 + this.rng() * (0.5 + this.ctype.hide); this.flick = 0.3; }      // crabs walk in bursts: a few steps, a stop (antennae busy), a few more
    this.spK = (this.spK ?? 0) + ((paused ? 0 : 1) - (this.spK ?? 0)) * Math.min(1, dt * 10); if (paused && this.spK < 0.05) return 0;      // each burst of steps starts and stops over a tenth of a second or so, not between one frame and the next
    const heavy = Math.max(0.6, Math.min(1, (this.need / Math.max(0.5, this.rec?.crab?.shell?.sz ?? 1)) * 1.12));      // a roomy shell is a heavy one to drag
    const sp = (this.species?.id === 'blueleg' ? 0.36 : this.sk === 'halloween' ? 0.3 : 0.26) * mul * (this.vigor ?? 1) * (0.7 + 0.3 * this.ctype.roam) * (1 - this.retK);
    let vx = dx / d, vz = dz / d;
    for (const o of others) { if (o === this || o.dead) continue; const ex = this.pos.x - o.pos.x, ez = this.pos.z - o.pos.z, e = Math.hypot(ex, ez), min = o.crab ? 0.42 : big.has(o.sk) && o.pos.y < this.pos.y + 1.2 ? 0.9 : 0; if (e < min && e > 1e-3) { vx += (ex / e) * (min - e) / min * 1.5; vz += (ez / e) * (min - e) / min * 1.5; } }
    const Wd = Fish3D.world; if (Wd?.push && !(this.cs?.way?.length > 1)) {      /* (on a planned way it is already clear of things: no nudging off it in a narrow gap) */ const p = new THREE.Vector3(this.pos.x + vx * 0.25, this.pos.y + 0.15, this.pos.z + vz * 0.25), o = new THREE.Vector3(); if (Wd.push(p, 0.18, o) && o.length() > 1e-4) { o.normalize(); const into = vx * o.x + vz * o.z; if (into < 0) { vx -= o.x * into * 1.2; vz -= o.z * into * 1.2; } vx += o.x * 0.4; vz += o.z * 0.4; } }
    const m = Math.hypot(vx, vz) || 1; vx /= m; vz /= m; const s = Math.min(sp * heavy, d * 2) * this.spK;
    { const nx = this.pos.x + vx * s * dt, nz = this.pos.z + vz * s * dt; const w0 = this.cs?.way?.[0]; if (this.clearAt(nx, nz) || (!this.clearAt(this.pos.x, this.pos.z) && (!w0 || Math.hypot(w0.x - nx, w0.z - nz) < Math.hypot(w0.x - this.pos.x, w0.z - this.pos.z)))) { this.pos.x = nx; this.pos.z = nz; }      /* (inside something, only steps along its way out) */ else { const sx = this.pos.x + vx * s * dt, sz = this.pos.z; if (this.clearAt(sx, this.pos.z)) this.pos.x = sx; else if (this.clearAt(this.pos.x, nz)) this.pos.z = nz; } }      // never a step from clear sand into something, whatever it is doing (it slides along the edge instead); from inside something it may step out
    const want = Math.atan2(-vz, vx) + (this.sk === 'blueleg' ? 0.35 : 0.2) * Math.sin(this.ph * 0.4); let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 4);
    return s / sp;
  }
  // looking a shell over: round it once, a tap of the claws at the opening, then the verdict
  inspectTick(dt, others) {
    const S = this.cs, d = S.d, T = this.ctype; this.doing = 'inspecting a shell'; S.k = (S.k ?? 0) + dt;
    if (!(this.W?.empties?.() ?? []).some((e) => e.id === d.id)) { this.cs = { s: 'idle', t: 1 }; return; }      // someone else has moved in
    const rival = others.find((o) => o.crab && o !== this && o.cs?.s === 'inspect' && o.cs.d?.id === d.id);
    if (rival && (rival.ctype.bold > T.bold || (rival.ctype.bold === T.bold && rival.seed > this.seed))) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x); this.cs = { s: 'backoff', t: 2.5, to: { x: d.x + Math.cos(a) * 1.4, z: d.z + Math.sin(a) * 1.4 } }; this.W?.note?.(this, 'met', rival); return; }      // the curious neighbor: the shyer one backs off
    const circle = S.quick ? 0.4 : 3 + 2 * (T.pick - 1) * 0.5;
    if (S.k < circle) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x) + dt * 1.6, r = 0.55; S.move = this.step({ x: d.x + Math.cos(a) * r, z: d.z + Math.sin(a) * r }, dt, others) || 0.6; return; }
    S.move = 0; this.tapK = 1; this.W?.wobble?.(d.id, Math.sin(this.ph * 7) * 0.12); this.heading += (Math.atan2(-(d.z - this.pos.z), d.x - this.pos.x) - this.heading) * Math.min(1, dt * 4);
    if (S.k < circle + 2) return;
    this.tapK = 0; this.inspected.add(d.id); const fit = shellFit(shellSz(d), this.need), C = this.rec?.crab ?? {}, tight = shellFit(C.shell?.sz ?? 1, this.need) === 'small';
    if (fit === 'big' && this.rng() < 0.7) { this.cs = { s: 'tryon', t: 0, d }; return; }
    if (fit === 'big' && (tight || others.some((o) => o.crab && o !== this && o.cs?.s === 'queue'))) { this.cs = { s: 'queue', t: 40 + this.rng() * 80, d }; return; }      // it waits by it: a bigger crab may come for it and leave a shell that fits
    if (fit !== 'fits') { this.reject(d); return; }
    const better = shellSz(d) > (C.shell?.sz ?? 0) + 0.04, picky = this.inspected.size >= Math.round(T.pick) || tight, rested = Date.now() - (C.swapAt ?? 0) > 3 * 3600e3 || tight;
    if (better && (S.quick || (picky && rested && (tight || this.rng() < 0.55 + 0.3 * T.collect))) && this.W?.isLead?.())      /* (it waited in line for this one: it takes it) */ { this.cs = { s: 'swap', ph: 'align', k: 0, d }; return; }
    this.reject(d);
  }
  reject(d) { const a = Math.atan2(this.pos.z - d.z, this.pos.x - d.x) + (this.rng() - 0.5); this.cs = { s: 'walk', to: { x: d.x + Math.cos(a) * 1.6, z: d.z + Math.sin(a) * 1.6 }, then: { s: 'idle', t: 2 }, why: null, rejected: true }; this.W?.note?.(this, 'reject', d); }
  // the wrong-sized shell: it backs up to it, half in, finds it far too big, and walks off
  tryonTick(dt) {
    const S = this.cs, d = S.d; S.k = (S.k ?? 0) + dt; this.doing = 'trying on a new home';
    if (S.k < 1.2) { const p = this.frontOf(d, 0.25); this.pos.x += (p.x - this.pos.x) * Math.min(1, dt * 3); this.pos.z += (p.z - this.pos.z) * Math.min(1, dt * 3); this.outK = Math.min(0.5, S.k / 1.2 * 0.5); return; }
    if (S.k < 2.6) { this.wig = 1; return; }
    this.outK = Math.max(0, this.outK - dt * 2); this.wig = 0; if (S.k > 3.2) { this.doing = null; if (this.rng() < (this.W?.crabs?.() > 1 ? 0.6 : 0.25)) this.cs = { s: 'queue', t: 40 + this.rng() * 80, d }; else this.reject(d); }
  }
  // moving house: line up opening to opening, slip out (the soft abdomen shows), across, and in; the old shell stays where it was
  swapTick(dt) {
    const S = this.cs, d = S.d; S.k += dt; S.move = 0; this.doing = S.ph === 'settle' ? 'settling into its new shell' : 'moving into a new shell';
    if (S.ph === 'align') { const p = this.frontOf(d, 0.45 + (this.dims?.len ?? 0.4) * 0.5); S.move = this.step(p, dt, []) || 0.3; const want = Math.atan2(-(d.z - this.pos.z), d.x - this.pos.x) + Math.PI; let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 3);
      if (S.k > 1.6) { S.ph = 'claim'; S.k = 0; S.claimAt = Date.now(); this.W.claim(d, this).then((ok) => { if (this.cs !== S) return; if (!ok) { this.cs = { s: 'walk', to: this.frontOf(d, 1.5), then: { s: 'idle', t: 2 }, why: null }; return; } S.ph = 'out'; S.k = 0; S.oldAt = { x: this.pos.x, z: this.pos.z, h: this.heading }; S.old = this.W.leaveShell(this); }); } return; }
    if (S.ph === 'claim') { if (Date.now() - S.claimAt > 8000) this.cs = { s: 'idle', t: 2 }; return; }      // (no answer from the tank in eight real seconds: it gives up for now)      // (no answer from the tank: it gives up for now)
    if (S.ph === 'out') { this.outK = Math.min(1, S.k / 0.9); this.shellG.visible = false; this.abd.visible = true; const a = this.heading + Math.PI, p = { x: S.oldAt.x + Math.cos(a) * 0.35 * this.outK, z: S.oldAt.z - Math.sin(a) * 0.35 * this.outK }; this.pos.x = p.x; this.pos.z = p.z; this.heading = S.oldAt.h + Math.PI * Math.min(1, S.k / 0.9); if (S.k > 1.0) { S.ph = 'hop'; S.k = 0; S.from = { x: this.pos.x, z: this.pos.z }; } return; }
    if (S.ph === 'hop') { const p = this.frontOf(d, 0.05), k = Math.min(1, S.k / 0.7); this.pos.x = S.from.x + (p.x - S.from.x) * k; this.pos.z = S.from.z + (p.z - S.from.z) * k; S.move = 1.4; const want = (d.ry ?? 0) + 0.5 + Math.PI; let dy = want - this.heading; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.heading += dy * Math.min(1, dt * 8);
      if (k >= 1) { S.ph = 'in'; S.k = 0; this.wear(d.type, shellSz(d)); this.shellG.visible = true; this.W.tookShell(this, d); } return; }
    if (S.ph === 'in') { this.outK = Math.max(0, 1 - S.k / 0.6); this.pos.x += (d.x - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (d.z - this.pos.z) * Math.min(1, dt * 4); if (S.k > 0.7) { this.abd.visible = false; S.ph = 'settle'; S.k = 0; } return; }
    if (S.ph === 'settle') { this.wig = S.k < 1.2 ? 1 : 0; if (S.k > 2) { this.wig = 0; this.happyT = 1.6; this.inspected.clear(); const a = this.heading; this.cs = { s: 'walk', to: { x: this.pos.x + Math.cos(a) * 1.2, z: this.pos.z - Math.sin(a) * 1.2 }, then: { s: 'idle', t: 3 }, why: null }; } }
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
    const n = this.need, r = this.retK, o = this.outK, len = this.dims?.len ?? 0.4, t = this.ph, mk = this.moveK;
    this.bodyG.position.x = 0.02 - r * len * 0.35 / Math.max(0.5, n) + o * 0.12; this.bodyG.scale.setScalar(n * (1 - 0.55 * r)); this.bodyG.visible = r < 0.97;
    // legs: a stepping gait (each foot lifts and swings forward, then pushes back on the ground); folded in when it tucks into its shell
    for (const g of this.legs) { const u = g.userData, w = t * 8.5 + u.ph, lift = Math.max(0, Math.sin(w)) * mk, sweep = Math.cos(w) * mk, idle = (1 - mk) * Math.sin(t * 0.8 + u.i + u.side) * 0.05;
      g.rotation.y = u.side * (sweep * 0.42 + idle); g.rotation.x = u.side * (-lift * 0.45 + r * 0.9); u.knee.rotation.x = u.side * (lift * 0.6 + r * 1.3); }
    // claws: what they are doing now sets the reach of the arm, the turn of the wrist and how far the finger opens
    const sp = this.cs.s, eating = this.eatK > 0, tapping = this.tapK > 0, digging = this.digK > 0, waving = this.clawUp > 0 || this.happyT > 0;
    for (const g of this.claws) { const u = g.userData, s = u.side; let az = -0.25, ay = s * 0.5, wz = 0, open = 0;
      if ((u.twitch -= dt) <= 0) { u.twitch = 3 + this.rng() * 6; u.snap = 0.35; } if (u.snap > 0) { u.snap -= dt; open = Math.sin((u.snap / 0.35) * Math.PI) * 0.5; }      // now and then a little pinch at nothing
      if (eating && s > 0) { const c = (t * 0.7) % 1; az = c < 0.4 ? -0.7 : c < 0.55 ? -0.7 : -0.7 + (c - 0.55) / 0.45 * 1.1; open = c < 0.35 ? 0.7 : 0; wz = c > 0.55 ? 0.6 : 0; }      // reach down, open, pinch a morsel, bring it up to the mouth
      else if (eating) { az = -0.4; open = 0.2 * Math.max(0, Math.sin(t * 5)); }
      if (this.grazeK && !eating) { const c = ((t * 1.1) + (s > 0 ? 0 : 0.5)) % 1; az = c < 0.45 ? -0.95 : -0.95 + (c - 0.45) / 0.55 * 1.05; open = c < 0.25 ? 0.5 : 0; wz = c > 0.5 ? 0.5 : 0; }      // grazing: each claw in turn down to pick, then up to the mouth
      if (tapping) { az = -0.45 + Math.max(0, Math.sin(t * 9 + s)) * 0.3; ay = s * 0.2; open = 0.3 + 0.3 * Math.sin(t * 9 + s); }      // feeling the shell's opening
      if (digging) { az = -0.9 + Math.sin(t * 7 + (s > 0 ? 0 : Math.PI)) * 0.4; open = 0.5; wz = 0.3; }      // scooping sand, one claw then the other
      if (waving) { az = 0.7 + Math.sin(t * 8 + s) * 0.25; open = 0.55 + 0.25 * Math.sin(t * 8); }      // claws up: a bold one's hello, and a happy one in its new home
      if (sp === 'retract') { az = -0.2; ay = s * 1.1; open = 0; }      // folded across the opening like a door
      u.open += (open - u.open) * Math.min(1, dt * 14); g.rotation.z += (az - g.rotation.z) * Math.min(1, dt * 10); g.rotation.y += (ay - g.rotation.y) * Math.min(1, dt * 8); u.wrist.rotation.z += (wz - u.wrist.rotation.z) * Math.min(1, dt * 10); u.fing.rotation.z = u.open; }
    // eyes: they follow what it is looking at, blink now and then, and perk up when it is curious, droop when it is tucked in
    if ((this.blinkT -= dt) <= 0) { this.blinkT = 2.5 + this.rng() * 4; this.blink = 0.14; } this.blink = Math.max(0, this.blink - dt);
    const look = this.lookT > 0 && this.lookAt ? Math.atan2(-(this.lookAt.z - this.pos.z), this.lookAt.x - this.pos.x) - this.heading : Math.sin(t * 0.9 + this.seed) * 0.4, perk = sp === 'inspect' || sp === 'watch' || this.lookT > 0 ? -0.15 : 0;
    for (const g of this.eyes) { const s = g.userData.side; g.rotation.y = Math.max(-0.9, Math.min(0.9, look + s * 0.08)); g.rotation.z = perk + Math.sin(t * 1.3 + s) * 0.08 + r * 0.6; g.rotation.x = s * (0.2 + Math.sin(t * 0.7 + s * 2) * 0.05); g.userData.eye.scale.y = this.blink > 0 ? 0.2 : 1; }
    if ((this.flickT -= dt) <= 0) { this.flickT = 2 + this.rng() * 4; this.flick = 0.4; } this.flick = Math.max(0, (this.flick ?? 0) - dt);
    for (const g of this.ants) g.rotation.y = Math.sin(t * 2.2 + g.position.z * 50) * 0.3 + (this.flick > 0 ? Math.sin(this.flick * 20) * 0.35 : 0);
    // the whole crab: a wiggle settling into a shell, a little hop of joy just after, a lean as it climbs
    const sway = mk * Math.sin(t * 8.5) * 0.05 * Math.max(1, (this.rec?.crab?.shell?.sz ?? 1) / this.need); this.shellG.rotation.x = sway; this.shellG.rotation.z = mk * Math.abs(Math.sin(t * 8.5)) * 0.03;      // the shell rocks with each step, more if it is roomy
    this.happyT = Math.max(0, this.happyT - dt); const wig = this.wig ? Math.sin(t * 22) * 0.12 : 0, hop = this.happyT > 0 ? Math.abs(Math.sin(t * 11)) * 0.035 * Math.min(1, this.happyT) : 0, bob = mk * Math.abs(Math.sin(t * 8.5)) * 0.008;
    this.root.rotation.set(wig, 0, this.pitchK); this.root.position.y = 0.01 + hop + bob;
    // a crab wheels round quickly, but not in a frame: its turning eases up to speed and is capped
    { const h0 = this.h0 ?? this.heading; let dh = this.heading - h0; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); const want = dh / Math.max(dt, 1e-3), cap = 3.6; this.hvel = (this.hvel ?? 0) + (Math.max(-cap, Math.min(cap, want)) - (this.hvel ?? 0)) * Math.min(1, dt * 8); if (Math.abs(this.hvel) * dt > Math.abs(dh) && Math.sign(this.hvel) === Math.sign(dh)) this.hvel = want; this.heading = h0 + this.hvel * dt; }
    this.group.position.copy(this.pos); this.group.quaternion.setFromEuler(new THREE.Euler(0, this.heading, 0, 'YZX'));
  }
  disposeTemps() { for (const m of this.temps) m.parent?.remove(m); this.temps = []; }
}
export { shellLabel };
