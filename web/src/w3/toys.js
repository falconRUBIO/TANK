// Toys in the tank, from the Toy box: a ball tossed in at the surface, a stream of bubbles from the sand, and a spot of light you drag across the floor.
// Each moves the way the real thing would in water (the ball sinks slowly, bounces softly and rolls; bubbles wobble up and grow; the light
// is a soft caustic glow on the sand), and each animal plays with it its own way: fish chase and nose things, an octopus stalks, bats and
// pounces, a seahorse snaps at small drifting things and watches the rest with its eyes. When a go ends, who joined in is reported (onDone).
import * as THREE from 'three';
import { sandH } from './terrain.js';
import { Fish3D } from './fish3d.js';

const p0x = (L) => L.at.x;
const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
const kindOf = (f) => (f.crab ? 'crab' : f.sk === 'octopus' ? 'octopus' : f.sk === 'seahorse' ? 'seahorse' : TURTLES.has(f.sk) ? 'turtle' : 'fish');      // every kind knows a toy is there, and each takes to it its own way
const free = (f) => !f.dead && !f.visitor && !f.nursery && !f.sleepy && !f.weak;
const X = 4.4, ZB = -1.8, ZF = 2.5;

function ballMesh() {      // a faceted beach ball: six colored panels round it, white caps
  const g = new THREE.IcosahedronGeometry(0.38, 2).toNonIndexed(), pos = g.attributes.position, col = [], C = [0xff5a5a, 0xffd23f, 0x3fb6ff, 0xffffff, 0x5fd38a, 0xff8fd0].map((c) => new THREE.Color(c)), cap = new THREE.Color(0xfff8ea);
  for (let i = 0; i < pos.count; i += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += pos.getX(i + k); y += pos.getY(i + k); z += pos.getZ(i + k); }
    const c = Math.abs(y / 3) > 0.24 ? cap : C[Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 6) % 6]; for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, transparent: true, shininess: 70, specular: 0x666666, emissive: 0x121212 }));      // glossy vinyl: a bright highlight rolls round it as it turns
}
const bubbleTex = (() => { const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), m = N / 2, R = N / 2 - 3;      // a real bubble: almost clear in the middle, a thin bright rim with a little rainbow in it, a window of light top-left and a small glint bottom-right
  const body = g.createRadialGradient(m, m, R * 0.55, m, m, R); body.addColorStop(0, 'rgba(255,255,255,0.02)'); body.addColorStop(0.8, 'rgba(200,240,255,0.10)'); body.addColorStop(0.93, 'rgba(235,250,255,0.55)'); body.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = body; g.beginPath(); g.arc(m, m, R, 0, 6.3); g.fill();
  const iri = g.createLinearGradient(0, 0, N, N); for (const [k, col] of [[0, 'rgba(255,170,220,.55)'], [0.35, 'rgba(160,230,255,.45)'], [0.65, 'rgba(190,255,200,.45)'], [1, 'rgba(255,220,150,.55)']]) iri.addColorStop(k, col);
  g.strokeStyle = iri; g.lineWidth = 3; g.beginPath(); g.arc(m, m, R - 2.5, 0, 6.3); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(m - R * 0.38, m - R * 0.42, R * 0.2, R * 0.11, -0.7, 0, 6.3); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(m + R * 0.42, m + R * 0.45, R * 0.07, 0, 6.3); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(235,250,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 26, 0, 6.3); g.stroke();
  for (let k = 0; k < 6; k++) { const a = k * 1.05; g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30, 2.2, 0, 6.3); g.fill(); }      // a pop: a ring and a few droplets flung out
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const beamTex = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'), v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(200,250,255,0)'); v.addColorStop(1, 'rgba(200,250,255,.55)');
  g.fillStyle = v; g.fillRect(0, 0, 32, 128); const h = g.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();      // a soft shaft of light coming down from above, like a torch shone into the tank
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), f = g.createRadialGradient(64, 64, 2, 64, 64, 62);      // a bright, cool core with a soft darker rim, so it reads on pale sand too
  f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(0.22, 'rgba(225,255,255,.95)'); f.addColorStop(0.4, 'rgba(90,220,255,1)'); f.addColorStop(0.6, 'rgba(20,130,185,.7)'); f.addColorStop(0.8, 'rgba(6,45,70,.4)'); f.addColorStop(1, 'rgba(10,60,80,0)');
  g.fillStyle = f; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export class Toys {
  constructor(scene, fishes) { this.scene = scene; this.fishes = fishes; this.ball = null; this.fount = null; this.bubbles = []; this.light = null; this.armed = null; this.onDone = null; this.onSound = null; }
  get active() { return !!(this.ball || this.fount || this.light || this.cube || this.hoop); }
  // where a ray meets the sand (walked along it, so banks and slopes are right)
  sandHit(ray) { const p = new THREE.Vector3(); for (let s = 0; s < 60; s += 0.08) { ray.at(s, p); if (p.y <= sandH(p.x, p.z) + 0.02 && Math.abs(p.x) < X + 0.4 && p.z > ZB - 0.5 && p.z < ZF + 0.6) return p; } return null; }
  done(kind, who) { this.onDone?.(kind, [...who]); }

  // ── the ball: tossed in from the surface over where you tapped ──
  toss(x, z = 0.6) {
    if (this.ball) this.ballEnd(true);
    const m = ballMesh(); m.position.set(Math.max(-X, Math.min(X, x)), Fish3D.topY + 0.6, z); this.scene.add(m);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x0a1a20, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); sh.rotation.x = -Math.PI / 2; this.scene.add(sh);      // its soft shadow on the sand
    this.ball = { m, sh, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, -2.2, 0), life: 45, who: new Set(), cool: new Map(), splashed: false };
    this.onSound?.('splash');
  }
  ballEnd(now = false) { const B = this.ball; if (!B) return; if (now) { this.scene.remove(B.m); B.m.geometry.dispose(); this.scene.remove(B.sh); B.sh.geometry.dispose(); this.done('ball', B.who); this.ball = null; } else B.leaving = B.leaving ?? 0; }
  stepBall(dt) {
    const B = this.ball, p = B.m.position, v = B.v, r = 0.38; B.life -= dt;
    if (B.life <= 0 && B.leaving == null) B.leaving = 0;
    if (B.leaving != null) { B.leaving += dt; v.y += (1.6 - v.y) * Math.min(1, dt * 2); B.m.material.opacity = Math.max(0, 1 - Math.max(0, B.leaving - 1.6) / 0.8); if (B.leaving > 2.4 || p.y > Fish3D.topY + 1) return this.ballEnd(true); }      // played out: it floats back up and away
    else { v.y -= 0.9 * dt; }      // in water a ball sinks slowly (a little heavier than water)
    v.multiplyScalar(Math.exp(-0.9 * dt)); p.addScaledVector(v, dt);
    if (!B.splashed && p.y < Fish3D.topY) { B.splashed = true; this.fishes.burst?.(p.clone()); }
    const floor = sandH(p.x, p.z) + r; if (p.y < floor + 0.05) B.downT = (B.downT ?? 0) + dt; if (p.y < floor) { p.y = floor; if (v.y < -0.25) { v.y = -v.y * 0.38; this.onSound?.('bonk'); } else v.y = 0; v.x *= Math.exp(-1.6 * dt); v.z *= Math.exp(-1.6 * dt);      // a soft bounce, then it rolls and settles
      const dx = sandH(p.x + 0.2, p.z) - sandH(p.x - 0.2, p.z), dz = sandH(p.x, p.z + 0.2) - sandH(p.x, p.z - 0.2); v.x -= dx * 3 * dt; v.z -= dz * 3 * dt; }      // and rolls down a slope
    if (Math.abs(p.x) > X) { p.x = Math.sign(p.x) * X; v.x = -v.x * 0.5; } if (p.z < ZB || p.z > ZF) { p.z = Math.max(ZB, Math.min(ZF, p.z)); v.z = -v.z * 0.5; } if (p.y > Fish3D.topY + 0.8 && B.leaving == null) { p.y = Fish3D.topY + 0.8; v.y = Math.min(0, v.y); }
    B.m.rotation.z -= v.x * dt / r; B.m.rotation.x += v.z * dt / r;      // it rolls the way it moves
    { const gy = sandH(p.x, p.z), hgt = p.y - r - gy, k = Math.max(0, 1 - hgt / 4); B.sh.position.set(p.x, gy + 0.05, p.z); B.sh.scale.setScalar(0.6 + 0.5 * k); B.sh.material.opacity = 0.32 * k * k * (B.m.material.opacity ?? 1); }      // closer to the sand, the shadow sharpens and darkens
    if (B.leaving != null) return;
    const now = performance.now();
    for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(p), cd = (B.cool.get(f) ?? 0) > now;
      if (k === 'fish' && d < 5) {      // fish come over and nose it along
        f.target.set(p.x - Math.sign(v.x || 1) * 0.3, Math.max(p.y, sandH(p.x, p.z) + 0.5), p.z); f.retarget = Math.max(f.retarget ?? 0, 0.7);
        if (d < r + (f.radius ?? 0.5) * 0.45 && !cd) { const push = p.clone().sub(f.pos).setY(0.15).normalize(); v.addScaledVector(push, 1.4 + f.vel.length() * 0.6); v.y += 0.6; this.onBall?.(f); B.cool.set(f, now + 600); B.who.add(f.fid); this.onSound?.('bonk'); }
      } else if (k === 'octopus' && d < 6) {      // an octopus goes over and bats it with an arm
        if ((!f.inspect || f.inspect.toy) && !cd && d > 1.0) f.inspect = { x: p.x, z: p.z, toy: true };      // (it keeps after the ball as it rolls)
        if (d < 1.5 && !cd && p.y < sandH(p.x, p.z) + 1.3) { const away = p.clone().sub(f.pos).setY(0).normalize(); v.addScaledVector(away, 1.8); v.y += 2.6 + Math.random(); B.cool.set(f, now + 2600); B.who.add(f.fid); if (f.inspect?.toy) f.inspect = null; f.flush = Math.max(f.flush ?? 0, 0.4); this.fishes.burst?.(p.clone()); this.onSound?.('bonk'); }
      } else if (k === 'seahorse' && d < 4) { f.glance = p.clone(); f.glanceT = 1.5; if (d < 2.5) B.who.add(f.fid); }      // a seahorse just watches it go by
      else if (k === 'turtle' && d < 5) {      // a turtle swims over slowly and gives it a shove with its nose, or a bite to see what it is
        f.target.set(p.x - Math.sign(v.x || 1) * 0.4, Math.max(p.y, sandH(p.x, p.z) + 0.6), p.z); f.retarget = Math.max(f.retarget ?? 0, 0.8);
        if (d < r + (f.radius ?? 0.8) * 0.5 && !cd) { const push = p.clone().sub(f.pos).setY(0.1).normalize(); v.addScaledVector(push, 2.2); v.y += 0.4; B.cool.set(f, now + 1800); B.who.add(f.fid); this.onSound?.('bonk'); }
      } else if (k === 'crab' && d < 5 && p.y < sandH(p.x, p.z) + 1) {      // a crab on the sand: a timid one tucks in when it lands close, a curious one walks up and pokes it (it rocks a little)
        const landed = (B.downT ?? 0) < 1.5;      /* (it has only just come down) */  if (f.toy?.(p, 'the ball', landed) || f.cs?.toy) B.who.add(f.fid);
        if (d < r + 0.3 && !cd && f.cs?.toy) { const push = p.clone().sub(f.pos).setY(0).normalize(); v.addScaledVector(push, 0.35); B.cool.set(f, now + 1500); }
      }
    }
  }

  // ── bubbles: a stream rises from the sand where you tapped, for a while ──
  blow(at) {
    if (this.fount?.stone) { this.scene.remove(this.fount.stone); this.fount.stone.geometry.dispose(); }
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: 0x9aa7b0, flatShading: true, emissive: 0x101418 })); stone.scale.set(1.3, 0.7, 1.1); stone.position.set(at.x, at.y + 0.08, at.z); this.scene.add(stone);      // a little air stone where you tapped
    this.fount = { at: at.clone(), t: 10, acc: 0, who: new Set(), stone, puff: 0 }; this.onSound?.('bubble'); }
  stepBubbles(dt, t = 0) {
    const F = this.fount;
    if (F) { F.t -= dt; F.acc += dt; F.puff -= dt; const gap = F.puff > 0 ? 0.05 : 0.16; if (F.puff < -0.9 - Math.random()) F.puff = 0.35 + Math.random() * 0.3;      // the stone puffs: little bursts, then a trickle
      while (F.t > 0 && F.acc > gap && this.bubbles.length < 80) { F.acc -= gap; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, fog: false })); const r = 0.05 + Math.pow(Math.random(), 2) * 0.16;
        s.position.set(F.at.x + (Math.random() - 0.5) * 0.25, F.at.y + 0.1, F.at.z + (Math.random() - 0.5) * 0.25); s.scale.setScalar(r * 2); this.scene.add(s); this.bubbles.push({ s, r, vy: 0.5 + r * 4 + Math.random() * 0.3, ph: Math.random() * 6, wob: 4 + Math.random() * 4 }); }      // (big ones rise faster, as real bubbles do)
      if (F.t <= 0 && !this.bubbles.length) { this.done('bubbles', F.who); this.scene.remove(F.stone); F.stone.geometry.dispose(); this.fount = null; } }
    const pop = (b, i, burst = true) => { this.scene.remove(b.s); b.s.material.dispose(); this.bubbles.splice(i, 1); if (burst) { const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthWrite: false, fog: false })); r.position.copy(b.s.position); r.scale.setScalar(b.r * 2); this.scene.add(r); (this.rings ||= []).push({ r, t: 0, s0: b.r * 2 }); } };
    for (let i = (this.rings ?? []).length - 1; i >= 0; i--) { const q = this.rings[i]; q.t += dt; const k = q.t / 0.28; q.r.scale.setScalar(q.s0 * (1 + k * 1.6)); q.r.material.opacity = 1 - k; if (k >= 1) { this.scene.remove(q.r); q.r.material.dispose(); this.rings.splice(i, 1); } }      // (pops: a quick ring that flicks out and is gone)
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const b = this.bubbles[i], p = b.s.position; b.ph += dt * 6; b.vy = Math.min(1.8, b.vy + dt * 0.4); p.y += b.vy * dt; p.x += Math.sin(b.ph * 0.6) * 0.3 * dt; p.z += Math.cos(b.ph * 0.45) * 0.12 * dt; b.r *= 1 + dt * 0.04; const w = Math.sin(t * b.wob + b.ph) * 0.09; b.s.scale.set(b.r * 2 * (1 + w), b.r * 2 * (1 - w), 1);      // they wobble and squash as they rise, and grow a little nearer the top      // they wobble as they rise, and grow a little nearer the top
      if (p.y > Fish3D.topY + 0.4) { pop(b, i, false); continue; }
      for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(p);
        if (k === 'fish' && d < 3 && Math.random() < dt * 2) { f.target.copy(p).y += 0.4; f.retarget = Math.max(f.retarget ?? 0, 0.5); }      // fish dart after them
        if (k === 'seahorse' && d < 1.8) { f.glance = p.clone(); f.glanceT = 0.8; }
        if (k === 'turtle' && d < 2 && Math.random() < dt * 0.6) { f.target.copy(p); f.retarget = Math.max(f.retarget ?? 0, 0.8); }      // a turtle drifts up through them, snapping now and then
        if (k === 'crab') continue;      // (a crab watches the stream from the sand: below)
        const reach = k === 'octopus' ? 1.2 : k === 'seahorse' ? 0.75 : 0.35 + (f.radius ?? 0.4) * 0.35;
        if (d < reach && (k !== 'seahorse' || Math.random() < 0.5)) { if (k === 'seahorse') f.snicks = (f.snicks ?? 0) + 1; this.fount?.who.add(f.fid); this.onSound?.('pop'); pop(b, i); break; }      // popped: nosed by a fish, snapped by a seahorse, poked by an arm
      } }
    if (this.fount?.t > 0 && Math.random() < dt * 2) for (const f of this.fishes.list) if (free(f) && kindOf(f) === 'crab' && f.pos.distanceTo(this.fount.at) < 4 && f.toy?.(this.fount.at, 'the bubbles')) this.fount.who.add(f.fid);      // a crab comes to the air stone and watches it puff
    if (this.fount?.t > 0) for (const f of this.fishes.list) if (free(f) && kindOf(f) === 'octopus' && f.pos.distanceTo(this.fount.at) < 5 && !f.inspect && Math.random() < dt * 0.5) f.inspect = { x: this.fount.at.x, z: this.fount.at.z, toy: true };
  }

  // ── the light spot: a soft glow on the sand that follows your finger (a warm glow drawn over the sand, not added to it: bright sand would swallow it) ──
  lightOn(at) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.15, 36), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false, toneMapped: false, color: 0xffffff, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 })); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; this.scene.add(m); const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamTex, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0 })); beam.scale.set(1.6, 10, 1); this.scene.add(beam); this.onDim?.(1); this.light = { m, beam, at: at.clone(), want: at.clone(), on: true, who: new Set(), pounce: new Map() }; this.moveLight(at); }
  moveLight(at) { if (this.light && at) this.light.want.copy(at); }
  lightOff() { if (this.light) this.light.on = false; this.onDim?.(0); }
  stepLight(dt, t) {
    const L = this.light, m = L.m, now = performance.now(); L.at.lerp(L.want, Math.min(1, dt * 10)); m.position.set(L.at.x, Math.max(sandH(L.at.x, L.at.z), sandH(L.at.x + 0.5, L.at.z), sandH(L.at.x - 0.5, L.at.z), sandH(L.at.x, L.at.z + 0.5), sandH(L.at.x, L.at.z - 0.5)) + 0.12, L.at.z);
    m.material.opacity += ((L.on ? 0.95 + Math.sin(t * 7) * 0.05 : 0) - m.material.opacity) * Math.min(1, dt * 6); L.beam.position.set(p0x(L), m.position.y + 4.5, L.at.z); L.beam.material.opacity = m.material.opacity * 0.7; m.scale.setScalar(1 + Math.sin(t * 3.1) * 0.06);      // it shimmers a little, like light through water
    if (!L.on && m.material.opacity < 0.02) { this.scene.remove(m); this.scene.remove(L.beam); L.beam.material.dispose(); m.geometry.dispose(); this.done('light', L.who); this.light = null; return; }
    if (!L.on) return; const p = m.position;
    for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = Math.hypot(f.pos.x - p.x, f.pos.z - p.z);
      if (k === 'fish' && d < 6) { f.target.set(p.x + Math.sin(t * 2 + f.fid.length) * 0.35, p.y + 0.7 + Math.cos(t * 1.7 + (f.radius ?? 0)) * 0.3, p.z); f.retarget = Math.max(f.retarget ?? 0, 0.4); if (d < 0.9) L.who.add(f.fid); }      // they follow it, circling just above
      else if (k === 'seahorse' && d < 5) { f.glance = p.clone(); f.glanceT = 0.6; if (d < 3) L.who.add(f.fid); }
      else if (k === 'turtle' && d < 5) { if (Math.random() < dt) { f.target.set(p.x, p.y + 0.9, p.z); f.retarget = Math.max(f.retarget ?? 0, 0.8); } if (d < 1.2) L.who.add(f.fid); }      // a turtle cruises after it, lazily
      else if (k === 'crab' && d < 4) { if (f.toy?.(p, 'the light') || (f.cs?.toy && d < 1)) L.who.add(f.fid); }      // a crab turns its eyes to the bright spot; a bold one walks into it and reaches for it
      else if (k === 'octopus' && d < 7) {      // it stalks the spot, then pounces when it holds still close by
        if (d > 1.1 && (!f.inspect || f.inspect.toy)) f.inspect = { x: p.x, z: p.z, toy: true };
        if (d < 1.4 && L.want.distanceTo(L.at) < 0.05 && (L.pounce.get(f) ?? 0) < now) { L.pounce.set(f, now + 2200); f.vel.x += (p.x - f.pos.x) * 2.2; f.vel.z += (p.z - f.pos.z) * 2.2; f.vel.y += 1.6; f.flush = Math.max(f.flush ?? 0, 0.6); L.who.add(f.fid); this.onSound?.('pounce'); }
      } }
  }

  // ── the twist cube: a chunky puzzle cube dropped in from the top. It sinks to the sand; an octopus comes over, picks it up in its arms
  // and turns it over and over, twisting a face now and then, the way aquarium octopuses work at puzzle toys. Fish only nose it ──
  dropCube(x) {
    if (this.cube) this.cubeEnd();
    const g = new THREE.Group(), cols = [0xff5a4a, 0xffa53a, 0xfff2dc, 0xffd23f, 0x3fb6ff, 0x5fd38a], s = 0.15, slices = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const mats = [i > 0 ? cols[0] : 0x1a1a1a, i < 0 ? cols[1] : 0x1a1a1a, j > 0 ? cols[2] : 0x1a1a1a, j < 0 ? cols[3] : 0x1a1a1a, k > 0 ? cols[4] : 0x1a1a1a, k < 0 ? cols[5] : 0x1a1a1a].map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c === 0x1a1a1a ? 0 : 0x101010 }));
      const m = new THREE.Mesh(new THREE.BoxGeometry(s * 0.94, s * 0.94, s * 0.94), mats); m.position.set(i * s, j * s, k * s); slices[j + 1].add(m); }
    for (const sl of slices) g.add(sl); g.scale.setScalar(1.6);
    g.position.set(Math.max(-X, Math.min(X, x)), Fish3D.topY + 0.4, 0.8); this.scene.add(g); this.fishes.burst?.(g.position.clone());
    this.cube = { g, slices, vy: -1.4, life: 40, who: new Set(), held: null, twist: null, tw: 1.5 }; this.onSound?.('splash');
  }
  cubeEnd() { const C = this.cube; if (!C) return; this.scene.remove(C.g); C.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.forEach((m) => m.dispose()); } }); if (C.held) C.held.inspect = null; this.done('cube', C.who); this.cube = null; }
  stepCube(dt) {
    const C = this.cube, p = C.g.position; C.life -= dt; if (C.life <= 0) return this.cubeEnd();
    if (C.held && (C.held.dead || !free(C.held))) C.held = null;
    if (C.held) { const o = C.held; p.lerp(new THREE.Vector3(o.pos.x + Math.sin(C.life) * 0.2, o.pos.y + 0.55, o.pos.z + 0.35), Math.min(1, dt * 5)); C.g.rotation.x += dt * 0.9; C.g.rotation.y += dt * 1.3;      // held in the arms, turned over and over
      C.tw -= dt; if (!C.twist && C.tw <= 0) { C.twist = { sl: C.slices[Math.floor(Math.random() * 3)], a: 0 }; this.onSound?.('bonk'); }      // now and then a face is twisted round a quarter turn
      if (C.twist) { const d = Math.min(Math.PI / 2 - C.twist.a, dt * 5); C.twist.a += d; C.twist.sl.rotation.y += d; if (C.twist.a >= Math.PI / 2 - 1e-3) { C.twist = null; C.tw = 0.9 + Math.random() * 1.6; } }
      o.flush = Math.max(o.flush ?? 0, 0.25); return; }
    const floor = sandH(p.x, p.z) + 0.3; if (p.y > floor) { C.vy = Math.max(-1.6, C.vy - dt * 0.6); p.y = Math.max(floor, p.y + C.vy * dt); C.g.rotation.z += dt * 0.6; }
    for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(p);
      if (k === 'octopus' && d < 8) { if (!f.inspect || f.inspect.toy) f.inspect = { x: p.x, z: p.z, toy: true }; if (d < 1.3) { C.held = f; C.who.add(f.fid); f.inspect = null; this.onSound?.('pounce'); return; } }      // it goes over and gathers it up
      else if ((k === 'fish' || k === 'turtle') && d < 3) { f.target.set(p.x, p.y + 0.4, p.z + 0.3); f.retarget = Math.max(f.retarget ?? 0, 0.6); if (d < 1) C.who.add(f.fid); }
      else if (k === 'crab' && d < 4 && p.y < sandH(p.x, p.z) + 0.6) { if (f.toy?.(p, 'the cube', C.vy < -0.5) || (f.cs?.toy && d < 1)) C.who.add(f.fid); } }      // a crab climbs up to it and feels it over
  }

  // ── the hitching hoop: a ring that hangs on a line from the top and sways. Seahorses swim over, curl their tails round it and sway with it ──
  hangHoop(x) {
    if (this.hoop) this.hoopEnd();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 28), new THREE.MeshLambertMaterial({ color: 0xff8fb1, emissive: 0x2a0a14 }));
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshBasicMaterial({ color: 0xdfeff5, transparent: true, opacity: 0.6 }));
    const g = new THREE.Group(); g.add(ring); g.add(line); const top = Fish3D.topY + 0.3, y = 5.2, len = top - y - 0.42; line.scale.y = len; line.position.y = 0.42 + len / 2;
    g.position.set(Math.max(-X + 0.5, Math.min(X - 0.5, x)), y, 0.5); this.scene.add(g); this.hoop = { g, ring, life: 45, who: new Set(), ph: 0 }; this.onSound?.('splash');
  }
  hoopEnd() { const H = this.hoop; if (!H) return; this.scene.remove(H.g); H.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); this.done('hoop', H.who); this.hoop = null; }
  stepHoop(dt) {
    const H = this.hoop; H.life -= dt; H.ph += dt; if (H.life <= 0) return this.hoopEnd();
    H.g.rotation.z = Math.sin(H.ph * 0.9) * 0.18 + Math.sin(H.ph * 2.1) * 0.04;      // it sways in the current
    const at = new THREE.Vector3(0, -0.42, 0).applyEuler(H.g.rotation).add(H.g.position);      // the bottom of the ring, where a tail curls on
    for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(at);
      if (k === 'seahorse' && d < 7) { f.target.set(at.x, at.y + 0.5, at.z); f.retarget = Math.max(f.retarget ?? 0, 0.8); f.glance = H.g.position.clone(); f.glanceT = 0.5; if (d >= 1.3) { const want = new THREE.Vector3(at.x, at.y + 0.45, at.z), step = want.sub(f.pos); const k = Math.min(1, (dt * 0.7) / step.length()); f.pos.addScaledVector(step, k); f.vel.multiplyScalar(Math.exp(-dt * 2)); }      /* (a seahorse's own swimming keeps to its perches, so the hoop draws it over itself, at a seahorse's slow pace) */
        if (d < 1.3) { f.vel.multiplyScalar(Math.exp(-dt * 4)); f.pos.lerp(new THREE.Vector3(at.x, at.y + 0.45, at.z), Math.min(1, dt * 2)); if (!H.who.has(f.fid)) this.onSound?.('pop'); H.who.add(f.fid); } }      // swims over and hangs on
      else if (k === 'fish' && d < 2.5 && Math.random() < dt) { f.target.copy(H.g.position); f.retarget = Math.max(f.retarget ?? 0, 0.5); }      // fish swim through it now and then
      else if (k === 'octopus' && d < 4 && !f.inspect) f.inspect = { x: at.x, z: at.z, toy: true };
      else if (k === 'turtle' && d < 3 && Math.random() < dt * 0.4) { f.target.copy(H.g.position); f.retarget = Math.max(f.retarget ?? 0, 0.6); }
      else if (k === 'crab' && Math.random() < dt * 0.3) { f.lookAt = H.g.position.clone(); f.lookT = 1; } }      // (it hangs out of a crab's reach: it only looks up at it)
  }

  update(dt, t) { if (this.ball) this.stepBall(dt); if (this.cube) this.stepCube(dt); if (this.hoop) this.stepHoop(dt); if (this.fount || this.bubbles.length || this.rings?.length) this.stepBubbles(dt, t); if (this.light) this.stepLight(dt, t); }
}
