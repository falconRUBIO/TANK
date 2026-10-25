// Spontaneous moments between the animals, the kind you catch now and then watching a real reef tank: a damselfish runs another fish off its
// patch and nips its fin, two anthias race round the tank, one fish bolts and the fright spreads through the rest (the shoal flashes apart, the
// seahorses tuck their tails, the octopus blanches, a crab pulls into its shell), the octopus lashes an arm at a fish that came too close, a
// turtle snaps, two hermit crabs face off with their claws up, two seahorses spar with flicks of the head.
// One at a time, every half minute or so (less often at night), chosen from who is in the tank and near each other, never the same animal
// twice in a row. Each borrows the animals for a few seconds (their speed and turn, their target) and gives them back as they were.
import * as THREE from 'three';
import { sandH } from './terrain.js';
import { Fish3D } from './fish3d.js';
import { SOCIAL } from '../game/rules.js';

const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
const kindOf = (f) => (f.crab ? 'crab' : f.sk === 'octopus' || f.species?.move === 'jet' ? 'octopus' : f.sp?.tail ? 'seahorse' : TURTLES.has(f.sk) ? 'turtle' : 'fish');
const DOMINANT = new Set(['guppy', 'angelfish', 'danio', 'goldfish', 'blue', 'tang', 'puffer']);      // damselfish, angelfish, anthias, clownfish, gramma, tang, puffer: the ones that chase
const PLAYFUL = new Set(['neon', 'danio', 'guppy', 'goldfish', 'tang', 'platy']);                        // the ones seen racing their own kind
const _d = new THREE.Vector3();
const clampAim = (v) => { v.x = Math.max(-4, Math.min(4, v.x)); v.z = Math.max(-1.8, Math.min(2.4, v.z)); v.y = Math.max(sandH(v.x, v.z) + 0.8, Math.min(Fish3D.topY - 0.6, v.y)); return v; };

export class Encounters {
  constructor(fishes) { this.F = fishes; this.wait = 8 + Math.random() * 10; this.active = []; this.log = []; this.last = new Set(); }
  get now() { return performance.now(); }
  free(f) { return f && !f.dead && !f.visitor && !f.puppet && !f.away && !f.nursery && !f.weak && !f.sleepy && !f.seeking && !f.enc && !f.guarding && !f.brood && !f.clean && !f.script?.length && f.leadOf?.() !== false && (f.encCool ?? 0) < this.now && !(kindOf(f) === 'seahorse' && f.link) && !(f.crab && ['swap', 'molt', 'climb', 'descend', 'eat'].includes(f.cs?.s)); }
  inView(f) { return Math.abs(f.pos.x) < 3.9 && f.pos.z > -1.6; }
  // the animals it may use, and pairs of them near enough to meet
  pairs(test, maxD = 4.5) { const L = this.F.list.filter((f) => this.free(f) && this.inView(f)), out = []; for (const a of L) for (const b of L) if (a !== b && a.pos.distanceTo(b.pos) < maxD && test(a, b)) out.push([a, b]); return out; }
  pick(arr) { return arr.length ? arr[(Math.random() * arr.length) | 0] : null; }
  tick(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) { const e = this.active[i]; e.t += dt; let done = false; try { done = e.step(dt) === true; } catch (er) { done = true; console.warn('encounter', er); } if (done || e.t > (e.max ?? 8)) { this.finish(e); this.active.splice(i, 1); } }
    if (window.__encOff || (window.__quietUntil && Date.now() < window.__quietUntil)) return;
    if ((this.wait -= dt) > 0 || this.active.length) return;
    const night = !!this.F.night; this.wait = (12 + Math.random() * 24) * (night ? 2.2 : 1) * (window.__encRate ?? 1);
    this.start(null, night);
  }
  // start one: a given kind (tools), or one chosen by weight among those possible now
  start(kind = null, night = false) {
    const make = {
      chase: () => { const P = this.pairs((a, b) => kindOf(a) === 'fish' && kindOf(b) === 'fish' && DOMINANT.has(a.sk) && ((SOCIAL[b.sk]?.size ?? 1) <= (SOCIAL[a.sk]?.size ?? 1)) && (a.sk !== b.sk || a.sk === 'danio' || a.sk === 'blue' || a.sk === 'goldfish')); const p = this.pick(P); return p && this.chase(p[0], p[1], { nips: 1 + (Math.random() < 0.4 ? 1 : 0), dur: 2.4 + Math.random() * 1.6, kind: 'chase' }); },
      nip: () => { const P = this.pairs((a, b) => kindOf(a) === 'fish' && kindOf(b) === 'fish' && (DOMINANT.has(a.sk) || (a.profile?.traits ?? a.rec?.traits ?? []).includes('Brave')), 3.2); const p = this.pick(P); return p && this.chase(p[0], p[1], { nips: 1, dur: 2.2, kind: 'nip', quick: true }); },
      play: () => { const P = this.pairs((a, b) => kindOf(a) === 'fish' && a.sk === b.sk && PLAYFUL.has(a.sk) && a.fid < b.fid); const p = this.pick(P); return p && this.play(p[0], p[1]); },
      spook: () => { const L = this.F.list.filter((f) => this.free(f) && this.inView(f) && kindOf(f) === 'fish'); const b = this.pick(L); return b && this.F.list.filter((o) => o !== b && !o.dead && o.pos.distanceTo(b.pos) < 4.2).length >= 1 && this.spook(b); },
      swat: () => { const P = this.pairs((a, b) => kindOf(a) === 'octopus' && kindOf(b) === 'fish' && Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 2.6 && Math.abs(a.pos.y - b.pos.y) < 2.4, 3.6); const p = this.pick(P); return p && this.swat(p[0], p[1]); },
      snap: () => { const P = this.pairs((a, b) => kindOf(a) === 'turtle' && kindOf(b) === 'fish', 3.4); const p = this.pick(P); return p && this.snap(p[0], p[1]); },
      claws: () => { const P = this.pairs((a, b) => a.crab && b.crab && a.fid < b.fid, 2.4); const p = this.pick(P); return p && this.claws(p[0], p[1]); },
      pester: () => { const P = this.pairs((a, b) => kindOf(a) === 'fish' && b.crab && (DOMINANT.has(a.sk) || a.sk === 'cory'), 4); const p = this.pick(P); return p && this.pester(p[0], p[1]); },
      spar: () => { const P = this.pairs((a, b) => kindOf(a) === 'seahorse' && kindOf(b) === 'seahorse' && a.fid < b.fid, 3.0); const p = this.pick(P); return p && this.spar(p[0], p[1]); },
    };
    const W = night ? { spook: 3, swat: 2, claws: 1.5, pester: 0.5, snap: 0.5, chase: 0.6, nip: 0.4, play: 0.3, spar: 0.3 } : { chase: 3, nip: 2.2, play: 2, spook: 2.4, swat: 2, snap: 1.2, claws: 1.5, pester: 1, spar: 1 };
    if (kind) return make[kind]?.() || null;
    const order = Object.keys(W).filter((k) => !this.last.has(k)); for (let n = 0; n < 6 && order.length; n++) { let tot = 0; for (const k of order) tot += W[k]; let r = Math.random() * tot, k = order[0]; for (const q of order) { r -= W[q]; if (r <= 0) { k = q; break; } } const e = make[k](); if (e) { this.last = new Set([k]); return e; } order.splice(order.indexOf(k), 1); }
    return null;
  }
  begin(kind, who, e) { e.kind = kind; e.t = 0; e.who = who; for (const f of who) { f.enc = e; f.encSave = { thought: f.thought }; } this.active.push(e); this.log.push({ kind, who: who.map((f) => f.name ?? f.sk), at: this.now }); if (this.log.length > 60) this.log.shift(); (this.onEncounter ?? (() => {}))(kind, who); return e; }
  finish(e) { for (const f of e.who) { if (f.enc === e) f.enc = null; f.encMul = 1; f.encSnap = undefined; f.encCool = this.now + 25e3 + Math.random() * 20e3; if (f.retarget != null && kindOf(f) !== 'crab') f.retarget = Math.min(f.retarget, 0.2); } e.end?.(); }
  // a fish fleeing: every so often a new heading away from the threat, jinking to one side or the other
  flee(v, from, e, dt, spread = 1.0, dist = 2.6) { e.jk = (e.jk ?? 0) - dt; if (e.jk > 0 && e.aim) { v.target.copy(e.aim); return; } e.jk = 0.32 + Math.random() * 0.25;
    _d.subVectors(v.pos, from); _d.y *= 0.4; if (_d.lengthSq() < 1e-4) _d.set(1, 0, 0); _d.normalize(); const a = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.75) * spread, c = Math.cos(a), s = Math.sin(a), x = _d.x * c - _d.z * s; _d.z = _d.x * s + _d.z * c; _d.x = x;
    if (Math.abs(v.pos.x + _d.x * dist) > 3.8) _d.x = -_d.x * 0.6; if (v.pos.z + _d.z * dist > 2.3 || v.pos.z + _d.z * dist < -1.7) _d.z = -_d.z * 0.6;      // the glass or the back: it turns along it
    e.aim = clampAim(new THREE.Vector3(v.pos.x + _d.x * dist, v.pos.y + _d.y * dist + (Math.random() - 0.5) * 1.2, v.pos.z + _d.z * dist)); v.target.copy(e.aim); }
  // ── chase (and the quick nip): the chaser runs the other down, the other jinks away; a nip, a puff of scales and bubbles, and it bolts ──
  chase(p, v, o) {
    const e = this.begin(o.kind, [p, v], { max: o.dur + 1.5, nips: 0, want: o.nips });
    p.encMul = o.quick ? 3.0 : 2.3; p.encSnap = o.quick ? 7 : 5; v.encMul = o.quick ? 0.8 : 2.5; v.encSnap = 6;      /* (a nip: it closes fast on a fish going about its business; a chase: the other runs from the start) */ p.idle = 0; v.idle = 0; p.settle = null; v.settle = null;
    p.thought = o.quick ? `Darted in and nipped at ${v.name}.` : `Chasing ${v.name} off.`; v.thought = o.quick ? `Nipped by ${p.name}.` : `Being chased off by ${p.name}.`;
    e.step = (dt) => {
      if (p.dead || v.dead) return true; const d = p.pos.distanceTo(v.pos), reach = ((p.radius ?? 0.6) + (v.radius ?? 0.6)) * 0.62; e.cool = (e.cool ?? 0) - dt;
      if (e.t < o.dur && e.nips < e.want) { p.target.set(v.pos.x + v.vel.x * 0.35, v.pos.y + v.vel.y * 0.2, v.pos.z + v.vel.z * 0.35); clampAim(p.target); p.retarget = 0.4; p.idle = 0; }
      else { if (!e.off) { e.off = true; p.encMul = 1.3; p.retarget = 0; } }      // done: it turns back to its patch
      if (!o.quick || e.nips > 0) { this.flee(v, p.pos, e, dt); v.retarget = 0.4; v.idle = 0; v.fleeT = 0.5; } else if (o.quick) { v.encMul = 0.8; }      // a nip comes out of nowhere: the other carries on until it is bitten, then bolts
      if (e.nips < e.want && d < reach * (o.quick ? 1.2 : 1) && e.cool <= 0) { e.nips++; v.encMul = 2.6; e.cool = 0.9; v.flickT = 0.35; v.dartT = 0.9; _d.subVectors(v.pos, p.pos).normalize(); v.vel.addScaledVector(_d, 1.6); this.F.burst?.(v.pos.clone().addScaledVector(_d, -(v.radius ?? 0.5) * 0.5)); e.jk = 0; e.nipAt = e.t; v.nipped = (v.nipped ?? 0) + 1; p.nips = (p.nips ?? 0) + 1; }
      return e.t > o.dur + (e.nips ? 0.8 : 0.4);
    };
    e.end = () => { v.fleeT = Math.max(v.fleeT ?? 0, 0.8); };
    return e;
  }
  // ── play: two of a kind race each other round the tank, swapping who chases half way ──
  play(a, b) {
    const e = this.begin('play', [a, b], { max: 7 }), dur = 4 + Math.random() * 2, side = Math.random() < 0.5 ? 1 : -1;
    for (const f of [a, b]) { f.encMul = 2.1; f.encSnap = 5; f.idle = 0; f.settle = null; }
    a.thought = `Racing ${b.name} round the tank.`; b.thought = `Racing ${a.name} round the tank.`;
    e.step = (dt) => { const [P, V] = e.t < dur / 2 ? [a, b] : [b, a]; if (P.dead || V.dead) return true;
      P.target.set(V.pos.x + V.vel.x * 0.3, V.pos.y, V.pos.z + V.vel.z * 0.3); clampAim(P.target); P.retarget = 0.4;
      const ang = Math.atan2(V.pos.z - 0.4, V.pos.x) + side * 0.9; V.target.set(Math.cos(ang) * 3.2, V.pos.y + Math.sin(e.t * 2.1) * 0.6, 0.4 + Math.sin(ang) * 1.6); clampAim(V.target); V.retarget = 0.4;      // round the middle of the tank, in a loop
      return e.t > dur; };
    return e;
  }
  // ── a fright: one fish bolts, and the scare spreads through whoever is near, the nearest first ──
  spook(b) {
    const near = this.F.list.filter((o) => o !== b && !o.dead && !o.visitor && !o.puppet && !o.away && o.leadOf?.() !== false && o.pos.distanceTo(b.pos) < 4.2 && !o.enc).sort((x, y) => x.pos.distanceTo(b.pos) - y.pos.distanceTo(b.pos));
    const e = this.begin('spook', [b], { max: 4 }), from = b.pos.clone(), q = near.map((o) => ({ o, at: 0.08 + o.pos.distanceTo(from) * 0.07, done: false }));
    b.encMul = 2.8; b.encSnap = 9; b.idle = 0; b.settle = null; b.thought = 'Bolted at something.'; b.flickT = 0.4; this.F.burst?.(b.pos.clone());
    { const fx = Math.cos(b.heading ?? 0), fz = -Math.sin(b.heading ?? 0); e.aim = clampAim(new THREE.Vector3(b.pos.x - fx * 2.6 + (Math.random() - 0.5), b.pos.y + (Math.random() - 0.3), b.pos.z - fz * 2.6)); }      // it turns on its tail and shoots off
    e.step = (dt) => {
      if (e.t < 0.9) { b.target.copy(e.aim); b.retarget = 0.4; b.fleeT = 0.5; } else if (!e.calm) { e.calm = true; b.encMul = 1.2; }
      for (const r of q) { if (r.done || e.t < r.at) continue; r.done = true; const o = r.o, k = kindOf(o), d = o.pos.distanceTo(from);
        if (o.enc) continue; o.spooked = (o.spooked ?? 0) + 1;
        if (k === 'fish') { if (!this.free(o) && !(o.restK || o.settle)) continue; o.enc = e; e.who.push(o); o.encMul = 2.6; o.encSnap = 8; o.idle = 0; o.settle = null; o.restK = 0; o.flickT = 0.3; const me = { jk: 0 }; this.flee(o, from, me, 0, 0.7, 2.4); o.retarget = 1.0; o.fleeT = 1.0; o.thought = `Startled when ${b.name} bolted.`; }
        else if (k === 'seahorse') { o.tuckT = 1.8; o.glance = from.clone(); o.glanceT = 1.6; if (o.holdfast?.on) { o.gripK = 1; o.curlK = 1; o.thought = 'Holding on tight, startled.'; } else { _d.subVectors(o.pos, from).setY(0).normalize(); o.vel.addScaledVector(_d, 0.5); o.thought = 'Startled.'; } }
        else if (k === 'octopus') { if (d < 2.6 && (o.startleCool ?? 0) <= 0 && Math.random() < 0.6) { o.startle?.(from, b); o.startleCool = 40; } else { o.scareT = Math.max(o.scareT ?? 0, 1.1); o.flush = Math.max(o.flush ?? 0, 0.2); } }      // a fright: it blanches (pale), and close by it may jet off in a puff of ink
        else if (k === 'crab') { if (d > 3) continue; if ((o.ctype?.hide ?? 0.5) > 0.4 && ['idle', 'walk', 'graze', 'rest', 'dig', 'watch'].includes(o.cs?.s)) o.cs = { s: 'retract', t: 1.5 + Math.random() * 2, who: b }; else { o.clawUp = 1.2; o.lookAt = from.clone(); o.lookT = 1.4; } }
        else if (k === 'turtle') { o.glance = from.clone(); o.encMul = 1.6; o.encSnap = 4; if (!e.who.includes(o)) { e.who.push(o); o.enc = e; } }
      }
      return e.t > 3.2;
    };
    return e;
  }
  // ── the octopus lashes an arm at a fish that came close; the fish bolts ──
  swat(o, f) {
    if (!o.whipArm?.(f.pos, 0.42)) return null; const e = this.begin('swat', [o, f], { max: 3 }); o.flush = Math.max(o.flush ?? 0, 0.5); o.thought = `Swiped an arm at ${f.name}.`; o.swats = (o.swats ?? 0) + 1;
    e.step = (dt) => { if (e.t > 0.2 && !e.went) { e.went = true; f.encMul = 2.7; f.encSnap = 8; f.idle = 0; f.flickT = 0.35; f.thought = `Swiped at by ${o.name}.`; this.F.burst?.(f.pos.clone()); }
      if (e.went) { this.flee(f, o.pos, e, dt, 0.8, 2.8); f.retarget = 0.4; f.fleeT = 0.5; } return e.t > 1.6; };
    return e;
  }
  // ── a turtle snaps at a fish; the fish shoots off ──
  snap(t, f) {
    const e = this.begin('snap', [t, f], { max: 3 }); t.encMul = 1.9; t.encSnap = 3; t.thought = `Snapped at ${f.name}.`;
    e.step = (dt) => { if (e.t < 0.7) { t.target.copy(f.pos); t.retarget = 0.4; } if (e.t > 0.35) { if (!e.went) { e.went = true; f.encMul = 2.6; f.encSnap = 8; f.flickT = 0.3; f.thought = `Snapped at by ${t.name}.`; } this.flee(f, t.pos, e, dt, 0.8, 2.8); f.retarget = 0.4; f.fleeT = 0.5; } return e.t > 1.8; };
    return e;
  }
  // ── two hermit crabs face off, claws up; the smaller backs away ──
  claws(a, b) {
    const e = this.begin('claws', [a, b], { max: 4 }); for (const [x, y] of [[a, b], [b, a]]) { x.clawUp = 2.2; x.lookAt = y.pos.clone(); x.lookT = 2.2; x.cs = { s: 'watch', t: 2.4, o: y }; x.doing = `facing off with ${y.name}, claws up`; }
    e.step = () => { if (e.t > 2.2 && !e.backed) { e.backed = true; const s = (a.need ?? 1) < (b.need ?? 1) ? a : b, o = s === a ? b : a, ang = Math.atan2(s.pos.z - o.pos.z, s.pos.x - o.pos.x); s.cs = { s: 'walk', to: { x: Math.max(-4, Math.min(4, s.pos.x + Math.cos(ang) * 1.4)), z: Math.max(-2.2, Math.min(2.4, s.pos.z + Math.sin(ang) * 1.4)) }, why: 'back' }; s.doing = `backing away from ${o.name}`; } return e.t > 3.2; };
    return e;
  }
  // ── a fish dives at a crab and nips at it; up comes a claw, and the fish shoots off ──
  pester(f, c) {
    const e = this.begin('pester', [f, c], { max: 5 }); f.encMul = 1.8; f.encSnap = 5; f.idle = 0; f.thought = `Pestering ${c.name}.`;
    e.step = (dt) => { if (!e.hit) { f.target.set(c.pos.x, sandH(c.pos.x, c.pos.z) + 0.55, c.pos.z + 0.2); f.retarget = 0.4; if (f.pos.distanceTo(c.pos) < (f.radius ?? 0.6) * 0.8 + 0.35 || e.t > 2.5) { e.hit = e.t; c.clawUp = 1.4; c.lookAt = f.pos.clone(); c.lookT = 1.2; c.doing = `snapping a claw at ${f.name}`; f.encMul = 2.6; f.encSnap = 8; f.flickT = 0.3; this.F.burst?.(f.pos.clone()); } }
      else { this.flee(f, c.pos, e, dt, 0.6, 2.6); e.aim && (e.aim.y = Math.max(e.aim.y, f.pos.y + 1.2)); f.retarget = 0.4; f.fleeT = 0.5; } return e.hit != null && e.t - e.hit > 1.2; };
    return e;
  }
  // ── two seahorses spar: they turn to each other and trade flicks of the head ──
  spar(a, b) {
    const e = this.begin('spar', [a, b], { max: 4 }); a.thought = `Sparring with ${b.name}.`; b.thought = `Sparring with ${a.name}.`; let n = 0;
    e.step = () => { for (const [x, y] of [[a, b], [b, a]]) { x.glance = y.pos.clone(); x.glanceT = 0.6; } if (e.t > 0.35 * (n + 1) && n < 6) { const x = n % 2 ? b : a; x.snickT = 0.32; n++; x.flicks = (x.flicks ?? 0) + 1; } return e.t > 2.6; };
    return e;
  }
}
