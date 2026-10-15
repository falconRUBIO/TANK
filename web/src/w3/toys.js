// Toys in the tank, from the Toy box: a ball tossed in at the surface, a stream of bubbles from the sand, and a spot of light you drag across the floor.
// Each moves the way the real thing would in water (the ball sinks slowly, bounces softly and rolls; bubbles wobble up and grow; the light
// is a soft caustic glow on the sand), and each animal plays with it its own way: fish chase and nose things, an octopus stalks, bats and
// pounces, a seahorse snaps at small drifting things and watches the rest with its eyes. When a go ends, who joined in is reported (onDone).
import * as THREE from 'three';
import { sandH } from './terrain.js';
import { Fish3D } from './fish3d.js';

const p0x = (L) => L.at.x;
const kindOf = (f) => (f.sk === 'octopus' ? 'octopus' : f.sk === 'seahorse' ? 'seahorse' : 'fish');
const free = (f) => !f.dead && !f.visitor && !f.nursery && !f.sleepy && !f.weak;
const X = 4.4, ZB = -1.8, ZF = 2.5;

function ballMesh() {      // a faceted beach ball: six colored panels round it, white caps
  const g = new THREE.IcosahedronGeometry(0.38, 2).toNonIndexed(), pos = g.attributes.position, col = [], C = [0xff5a5a, 0xffd23f, 0x3fb6ff, 0xffffff, 0x5fd38a, 0xff8fd0].map((c) => new THREE.Color(c)), cap = new THREE.Color(0xfff8ea);
  for (let i = 0; i < pos.count; i += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += pos.getX(i + k); y += pos.getY(i + k); z += pos.getZ(i + k); }
    const c = Math.abs(y / 3) > 0.24 ? cap : C[Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 6) % 6]; for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, emissive: 0x161616 }));
}
const bubbleTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), f = g.createRadialGradient(24, 22, 3, 32, 32, 30);
  f.addColorStop(0, 'rgba(255,255,255,.35)'); f.addColorStop(0.75, 'rgba(210,240,255,.08)'); f.addColorStop(1, 'rgba(220,245,255,.45)'); g.fillStyle = f; g.beginPath(); g.arc(32, 32, 29, 0, 6.3); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.stroke(); g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.arc(32, 32, 21, 3.6, 4.5); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const beamTex = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'), v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(200,250,255,0)'); v.addColorStop(1, 'rgba(200,250,255,.55)');
  g.fillStyle = v; g.fillRect(0, 0, 32, 128); const h = g.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();      // a soft shaft of light coming down from above, like a torch shone into the tank
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), f = g.createRadialGradient(64, 64, 2, 64, 64, 62);      // a bright, cool core with a soft darker rim, so it reads on pale sand too
  f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(0.22, 'rgba(225,255,255,.95)'); f.addColorStop(0.4, 'rgba(90,220,255,1)'); f.addColorStop(0.6, 'rgba(20,130,185,.7)'); f.addColorStop(0.8, 'rgba(6,45,70,.4)'); f.addColorStop(1, 'rgba(10,60,80,0)');
  g.fillStyle = f; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export class Toys {
  constructor(scene, fishes) { this.scene = scene; this.fishes = fishes; this.ball = null; this.fount = null; this.bubbles = []; this.light = null; this.armed = null; this.onDone = null; this.onSound = null; }
  get active() { return !!(this.ball || this.fount || this.light); }
  // where a ray meets the sand (walked along it, so banks and slopes are right)
  sandHit(ray) { const p = new THREE.Vector3(); for (let s = 0; s < 60; s += 0.08) { ray.at(s, p); if (p.y <= sandH(p.x, p.z) + 0.02 && Math.abs(p.x) < X + 0.4 && p.z > ZB - 0.5 && p.z < ZF + 0.6) return p; } return null; }
  done(kind, who) { this.onDone?.(kind, [...who]); }

  // ── the ball: tossed in from the surface over where you tapped ──
  toss(x, z = 0.6) {
    if (this.ball) this.ballEnd(true);
    const m = ballMesh(); m.position.set(Math.max(-X, Math.min(X, x)), Fish3D.topY + 0.6, z); this.scene.add(m);
    this.ball = { m, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, -2.2, 0), life: 45, who: new Set(), cool: new Map(), splashed: false };
    this.onSound?.('splash');
  }
  ballEnd(now = false) { const B = this.ball; if (!B) return; if (now) { this.scene.remove(B.m); B.m.geometry.dispose(); this.done('ball', B.who); this.ball = null; } else B.leaving = B.leaving ?? 0; }
  stepBall(dt) {
    const B = this.ball, p = B.m.position, v = B.v, r = 0.38; B.life -= dt;
    if (B.life <= 0 && B.leaving == null) B.leaving = 0;
    if (B.leaving != null) { B.leaving += dt; v.y += (1.6 - v.y) * Math.min(1, dt * 2); B.m.material.opacity = Math.max(0, 1 - Math.max(0, B.leaving - 1.6) / 0.8); if (B.leaving > 2.4 || p.y > Fish3D.topY + 1) return this.ballEnd(true); }      // played out: it floats back up and away
    else { v.y -= 0.9 * dt; }      // in water a ball sinks slowly (a little heavier than water)
    v.multiplyScalar(Math.exp(-0.9 * dt)); p.addScaledVector(v, dt);
    if (!B.splashed && p.y < Fish3D.topY) { B.splashed = true; this.fishes.burst?.(p.clone()); }
    const floor = sandH(p.x, p.z) + r; if (p.y < floor) { p.y = floor; if (v.y < -0.25) { v.y = -v.y * 0.38; this.onSound?.('bonk'); } else v.y = 0; v.x *= Math.exp(-1.6 * dt); v.z *= Math.exp(-1.6 * dt);      // a soft bounce, then it rolls and settles
      const dx = sandH(p.x + 0.2, p.z) - sandH(p.x - 0.2, p.z), dz = sandH(p.x, p.z + 0.2) - sandH(p.x, p.z - 0.2); v.x -= dx * 3 * dt; v.z -= dz * 3 * dt; }      // and rolls down a slope
    if (Math.abs(p.x) > X) { p.x = Math.sign(p.x) * X; v.x = -v.x * 0.5; } if (p.z < ZB || p.z > ZF) { p.z = Math.max(ZB, Math.min(ZF, p.z)); v.z = -v.z * 0.5; } if (p.y > Fish3D.topY + 0.8 && B.leaving == null) { p.y = Fish3D.topY + 0.8; v.y = Math.min(0, v.y); }
    B.m.rotation.z -= v.x * dt / r; B.m.rotation.x += v.z * dt / r;      // it rolls the way it moves
    if (B.leaving != null) return;
    const now = performance.now();
    for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(p), cd = (B.cool.get(f) ?? 0) > now;
      if (k === 'fish' && d < 5) {      // fish come over and nose it along
        f.target.set(p.x - Math.sign(v.x || 1) * 0.3, Math.max(p.y, sandH(p.x, p.z) + 0.5), p.z); f.retarget = Math.max(f.retarget ?? 0, 0.7);
        if (d < r + (f.radius ?? 0.5) * 0.45 && !cd) { const push = p.clone().sub(f.pos).setY(0.15).normalize(); v.addScaledVector(push, 1.4 + f.vel.length() * 0.6); v.y += 0.6; B.cool.set(f, now + 600); B.who.add(f.fid); this.onSound?.('bonk'); }
      } else if (k === 'octopus' && d < 6) {      // an octopus goes over and bats it with an arm
        if ((!f.inspect || f.inspect.toy) && !cd && d > 1.0) f.inspect = { x: p.x, z: p.z, toy: true };      // (it keeps after the ball as it rolls)
        if (d < 1.5 && !cd && p.y < sandH(p.x, p.z) + 1.3) { const away = p.clone().sub(f.pos).setY(0).normalize(); v.addScaledVector(away, 1.8); v.y += 2.6 + Math.random(); B.cool.set(f, now + 2600); B.who.add(f.fid); if (f.inspect?.toy) f.inspect = null; f.flush = Math.max(f.flush ?? 0, 0.4); this.fishes.burst?.(p.clone()); this.onSound?.('bonk'); }
      } else if (k === 'seahorse' && d < 4) { f.glance = p.clone(); f.glanceT = 1.5; if (d < 2.5) B.who.add(f.fid); }      // a seahorse just watches it go by
    }
  }

  // ── bubbles: a stream rises from the sand where you tapped, for a while ──
  blow(at) { this.fount = { at: at.clone(), t: 9, acc: 0, who: new Set() }; this.onSound?.('bubble'); }
  stepBubbles(dt) {
    const F = this.fount;
    if (F) { F.t -= dt; F.acc += dt; while (F.t > 0 && F.acc > 0.13 && this.bubbles.length < 70) { F.acc -= 0.13; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false })); const r = 0.07 + Math.random() * 0.1;
        s.position.set(F.at.x + (Math.random() - 0.5) * 0.25, F.at.y + 0.1, F.at.z + (Math.random() - 0.5) * 0.25); s.scale.setScalar(r * 2); this.scene.add(s); this.bubbles.push({ s, r, vy: 0.7 + Math.random() * 0.5, ph: Math.random() * 6 }); }
      if (F.t <= 0 && !this.bubbles.length) { this.done('bubbles', F.who); this.fount = null; } }
    const pop = (b, i) => { this.scene.remove(b.s); b.s.material.dispose(); this.bubbles.splice(i, 1); };
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const b = this.bubbles[i], p = b.s.position; b.ph += dt * 6; b.vy = Math.min(1.8, b.vy + dt * 0.4); p.y += b.vy * dt; p.x += Math.sin(b.ph) * 0.25 * dt; b.r *= 1 + dt * 0.05; b.s.scale.setScalar(b.r * 2);      // they wobble as they rise, and grow a little nearer the top
      if (p.y > Fish3D.topY + 0.4) { pop(b, i); continue; }
      for (const f of this.fishes.list) { if (!free(f)) continue; const k = kindOf(f), d = f.pos.distanceTo(p);
        if (k === 'fish' && d < 3 && Math.random() < dt * 2) { f.target.copy(p).y += 0.4; f.retarget = Math.max(f.retarget ?? 0, 0.5); }      // fish dart after them
        if (k === 'seahorse' && d < 1.8) { f.glance = p.clone(); f.glanceT = 0.8; }
        const reach = k === 'octopus' ? 1.2 : k === 'seahorse' ? 0.75 : 0.35 + (f.radius ?? 0.4) * 0.35;
        if (d < reach && (k !== 'seahorse' || Math.random() < 0.5)) { if (k === 'seahorse') f.snicks = (f.snicks ?? 0) + 1; this.fount?.who.add(f.fid); this.onSound?.('pop'); pop(b, i); break; }      // popped: nosed by a fish, snapped by a seahorse, poked by an arm
      } }
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
      else if (k === 'octopus' && d < 7) {      // it stalks the spot, then pounces when it holds still close by
        if (d > 1.1 && (!f.inspect || f.inspect.toy)) f.inspect = { x: p.x, z: p.z, toy: true };
        if (d < 1.4 && L.want.distanceTo(L.at) < 0.05 && (L.pounce.get(f) ?? 0) < now) { L.pounce.set(f, now + 2200); f.vel.x += (p.x - f.pos.x) * 2.2; f.vel.z += (p.z - f.pos.z) * 2.2; f.vel.y += 1.6; f.flush = Math.max(f.flush ?? 0, 0.6); L.who.add(f.fid); this.onSound?.('pounce'); }
      } }
  }

  update(dt, t) { if (this.ball) this.stepBall(dt); if (this.fount || this.bubbles.length) this.stepBubbles(dt); if (this.light) this.stepLight(dt, t); }
}
