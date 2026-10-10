// Atmosphere: god-ray shafts, water surface, marine snow, bubbles.
import * as THREE from 'three';

export class Shafts {
  constructor(count = 26) {
    this.group = new THREE.Group();
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(1, 0.9, 0.65) }, uI: { value: 0.5 } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `precision highp float; varying vec2 vUv; varying vec3 vW; uniform float uTime, uI; uniform vec3 uCol;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          float edge = smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x);
          float along = pow(1.0 - vUv.y, 0.7) * smoothstep(0.0, 0.04, vUv.y);
          float shimmer = 0.55 + 0.45*n(vec2(vUv.x*6.0 + uTime*0.15, vUv.y*2.5 - uTime*0.2));
          float a = edge*along*shimmer*uI;
          // steps the alpha into a few bands for a posterised, retro-lit look
          a = floor(a*14.0+0.5)/14.0;
          gl_FragColor = vec4(uCol*a, a);
        }`,
    });
    this.items = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.BufferGeometry();
      const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false; m.renderOrder = 5;
      this.group.add(m);
      this.items.push({ m, x: -1.5 + Math.random() * 8, z: -3.5 + Math.random() * 5, w: 0.3 + Math.random() * 0.7, ph: Math.random() * 6 });
    }
    this.dir = new THREE.Vector3(-0.34, -1, -0.1).normalize();
  }
  setDir(d) { this.dir.copy(d).normalize(); this.rebuild(); }
  rebuild() {
    const D = this.dir, L = 26, R = new THREE.Vector3(1, 0, 0);
    for (const it of this.items) {
      const top = new THREE.Vector3(it.x - D.x * 0, 19, it.z), bot = top.clone().addScaledVector(D, L / Math.abs(D.y));
      const w0 = it.w * 0.5, w1 = it.w * 1.7;
      const p = [top.clone().addScaledVector(R, -w0), top.clone().addScaledVector(R, w0), bot.clone().addScaledVector(R, -w1), bot.clone().addScaledVector(R, w1)];
      const g = it.m.geometry;
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap((v) => v.toArray()), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      g.setIndex([0, 1, 2, 1, 3, 2]); g.computeBoundingSphere();
    }
  }
  update(t) { this.mat.uniforms.uTime.value = t; this.items.forEach((it) => { it.m.position.x = Math.sin(t * 0.12 + it.ph) * 0.25; }); }
}

export function waterSurface() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(1, 0.9, 0.7) }, uI: { value: 0.6 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float; varying vec3 vW; uniform float uTime, uI; uniform vec3 uCol;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p = vW.xz*vec2(1.6,1.0);
        float r = n(p*2.0+vec2(uTime*.35,uTime*.2))*0.6 + n(p*5.0-vec2(uTime*.5,0.))*0.4;
        float a = smoothstep(0.52,0.9,r); a = floor(a*5.0+0.5)/5.0;
        float fade = smoothstep(-26.0, -2.0, vW.z); gl_FragColor = vec4(uCol*(0.18+a*0.9)*uI*fade, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat);
  m.rotation.x = Math.PI / 2; m.position.set(0, 16.1, -8); m.renderOrder = 4; return { mesh: m, mat };
}

export class Snow {
  constructor(n = 340) {
    const g = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3); this.s = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.p[i * 3] = (Math.random() - 0.5) * 11; this.p[i * 3 + 1] = Math.random() * 16; this.p[i * 3 + 2] = -4 + Math.random() * 7; this.s[i] = 0.1 + Math.random() * 0.3; }
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.055, color: 0xcfe8f5, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
    this.pts.frustumCulled = false; this.n = n;
  }
  update(dt, t) { for (let i = 0; i < this.n; i++) { this.p[i * 3 + 1] -= this.s[i] * dt * 0.5; this.p[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.05; if (this.p[i * 3 + 1] < 0) this.p[i * 3 + 1] = 16; } this.pts.geometry.attributes.position.needsUpdate = true; }
}

export class Bubbles {
  constructor(x, z, n = 26) {
    this.x = x; this.z = z; this.n = n;
    this.mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.22, 4, 8), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.75, depthWrite: false }), n);
    this.mesh.frustumCulled = false;
    this.b = Array.from({ length: n }, () => ({ y: Math.random() * 15, s: 0.8 + Math.random() * 1.1, r: 0.03 + Math.random() * 0.07, ph: Math.random() * 6 }));
    this.m = new THREE.Matrix4();
  }
  update(dt, t) {
    this.b.forEach((b, i) => {
      b.y += b.s * dt; if (b.y > 15.8) { b.y = 0.2; b.s = 0.8 + Math.random() * 1.1; }
      this.m.makeScale(b.r, b.r, b.r); this.m.setPosition(this.x + Math.sin(t * 2 + b.ph) * 0.12 * (b.y * 0.15), b.y, this.z + Math.cos(t * 1.7 + b.ph) * 0.06);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Evening and night: slow glowing plankton drift through the tank. Purely ambient; it fades in at dusk and out at dawn.
export class Glow {
  constructor(n = 46) {
    this.n = n; this.level = 0; this.want = 0;
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0x9fffe8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), n);
    this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 7;
    this.p = Array.from({ length: n }, () => ({ x: -4.2 + Math.random() * 8.4, y: 0.8 + Math.random() * 12, z: -1.2 + Math.random() * 3.6, ph: Math.random() * 6, sp: 0.15 + Math.random() * 0.3, r: 0.035 + Math.random() * 0.05 }));
    this.m = new THREE.Matrix4();
  }
  setPhase(phase) { this.ph = phase; this.refresh(); }
  setSky(key) { this.sky = key; this.mesh.material.color.set(key === 'spawn' ? 0xffa6d8 : 0x9fffe8); this.boost = key === 'darkmoon' ? 1.8 : key === 'spawn' ? 1.35 : 1; this.refresh(); }     // a new moon makes the plankton blaze; spawning night turns them pink
  refresh() { const base = this.ph === 'night' ? 1 : this.ph === 'evening' ? 0.6 : 0; this.want = this.sky === 'spawn' && base > 0 ? Math.max(base, 0.85) : base; }
  update(dt, t) {
    this.level += (this.want - this.level) * Math.min(1, dt * 0.6); this.mesh.visible = this.level > 0.02; if (!this.mesh.visible) return;
    this.mesh.material.opacity = Math.min(1, 0.85 * this.level * (this.boost ?? 1));
    this.p.forEach((q, i) => {
      q.y += Math.sin(t * q.sp + q.ph) * 0.12 * dt + q.sp * 0.1 * dt; if (q.y > 13.5) q.y = 0.8; const s = q.r * (this.boost ?? 1) * (0.7 + 0.5 * Math.sin(t * 1.3 + q.ph));
      this.m.makeScale(s, s, s); this.m.setPosition(q.x + Math.sin(t * 0.4 + q.ph) * 0.5, q.y, q.z + Math.cos(t * 0.3 + q.ph) * 0.3); this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Memories of the open sea. The fish are in a tank, so nothing real can swim past: these are the saltwater fish remembering (or dreaming of) the ocean.
// They drift through the far water as pale, ghostly shapes, once, slowly, and fade out; the next is minutes away, and they come more often at dusk. Nothing is paid or logged.
const flat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, fog: true, ...o });
function buildWhale() {                          // a whale shark: huge, slow and gentle, readable from the side
  const root = new THREE.Group(), body = new THREE.Group(), m = flat(0x3b5d7a), belly = flat(0xcfdde6), spot = new THREE.MeshBasicMaterial({ color: 0xeaf4fa, fog: true });
  const trunk = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), m); trunk.scale.set(3.3, 0.85, 0.95); body.add(trunk);
  const under = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), belly); under.scale.set(3.28, 0.84, 0.94); under.position.y = -0.03; body.add(under);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), m); head.scale.set(1.1, 0.5, 1.15); head.position.set(3.0, -0.15, 0); body.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 3), flat(0x0b1620)); eye.position.set(3.35, 0.0, 0.62); body.add(eye); const eye2 = eye.clone(); eye2.position.z = -0.62; body.add(eye2);
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 4), m); dorsal.position.set(0.7, 1.0, 0); dorsal.rotation.z = 0.35; body.add(dorsal);
  for (const z of [1, -1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5, 4), m); f.position.set(1.7, -0.55, z * 0.9); f.rotation.set(z * 1.1, 0, 1.15); body.add(f); }
  const tail = new THREE.Group(); tail.position.set(-3.1, 0, 0); body.add(tail);
  const up = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.9, 4), m); up.position.set(-0.55, 0.65, 0); up.rotation.z = 0.7; tail.add(up);
  const lo = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 4), m); lo.position.set(-0.4, -0.5, 0); lo.rotation.z = 2.5; tail.add(lo);
  const peduncle = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.3, 5), m); peduncle.rotation.z = Math.PI / 2; peduncle.position.set(-0.3, 0, 0); tail.add(peduncle);
  for (let i = 0; i < 26; i++) for (const z of [1, -1]) { const x = -2.6 + (i * 0.215) % 5.2 + ((i * 7) % 3) * 0.05, y = 0.2 + ((i * 5) % 6) * 0.1, d = Math.sqrt(Math.max(0.05, 1 - (x / 3.3) ** 2 - (y / 0.85) ** 2)) * 0.95; const sp = new THREE.Mesh(new THREE.CircleGeometry(0.075 + (i % 3) * 0.02, 5), spot); sp.position.set(x, y - 0.1, z * d * 1.01); sp.rotation.y = z > 0 ? 0 : Math.PI; body.add(sp); }
  root.add(body); body.scale.setScalar(0.72);
  return { root, speed: 1.3, y: [6, 10], rise: 0, yaw: (d) => (d > 0 ? 0 : Math.PI), roll: () => 0, update(t) { tail.rotation.y = Math.sin(t * 1.4) * 0.35; body.rotation.y = Math.sin(t * 1.4 - 0.6) * 0.05; body.rotation.z = Math.sin(t * 0.5) * 0.03; } };
}
function buildJelly() {
  const root = new THREE.Group(), glowy = new THREE.MeshBasicMaterial({ color: 0xff9ad0, transparent: true, opacity: 0.55, fog: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), glowy); root.add(bell);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe4f2, transparent: true, opacity: 0.7, fog: true, depthWrite: false })); core.position.y = 0.12; core.scale.y = 0.6; root.add(core);
  const tents = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 1.5, 3), glowy); t.position.set(Math.cos(a) * 0.38, -0.8, Math.sin(a) * 0.38); root.add(t); tents.push(t); }
  return { root, speed: 0.55, y: [4, 11], rise: 0.35, yaw: () => 0, roll: () => 0, update(t) { const p = Math.sin(t * 1.9); bell.scale.set(1 + p * 0.1, 1 - p * 0.14, 1 + p * 0.1); tents.forEach((q, i) => { q.rotation.z = Math.sin(t * 2.2 + i) * 0.14; q.scale.y = 1 + p * 0.1; }); } };
}
function buildTurtle() {
  const root = new THREE.Group(), shell = flat(0x5d7a4a), skin = flat(0x93a86a), pat = flat(0x3f5a36);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 7, 5), shell); body.scale.set(1.15, 0.5, 1.4); root.add(body);
  const ridge = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), pat); ridge.scale.set(1.1, 0.45, 1.4); ridge.position.y = 0.38; root.add(ridge);
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), skin); head.scale.set(0.9, 0.8, 1.2); head.position.set(0, 0.05, 1.55); root.add(head);
  const fl = []; for (const [x, z, s] of [[-1, 0.7, 1], [1, 0.7, 1], [-1, -0.8, 0.6], [1, -0.8, 0.6]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 0.07, 0.5 * s), skin); f.geometry.translate(x * 0.65 * s, 0, 0); f.position.set(x * 0.8, -0.1, z); root.add(f); fl.push([f, x]); }
  return { root, speed: 0.75, y: [3, 8], rise: 0.0, yaw: (d) => d * Math.PI / 2, roll: () => 0, update(t) { fl.forEach(([f, x], i) => { f.rotation.z = x * Math.sin(t * 1.3 + (i > 1 ? 0.8 : 0)) * 0.5; }); root.rotation.z = Math.sin(t * 0.6) * 0.05; } };
}
function buildShoal() {
  const root = new THREE.Group(), n = 26, geo = new THREE.ConeGeometry(0.11, 0.5, 4); geo.rotateZ(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xdfeef8, fog: true }), n); mesh.frustumCulled = false; root.add(mesh);
  const q = Array.from({ length: n }, (_, i) => ({ dx: (Math.random() - 0.5) * 3.6, dy: (Math.random() - 0.5) * 1.6, dz: (Math.random() - 0.5) * 1.4, ph: Math.random() * 6 + i })), m = new THREE.Matrix4();
  return { root, speed: 2.4, y: [4, 11], rise: 0, yaw: (d) => (d > 0 ? 0 : Math.PI), roll: () => 0, update(t) { q.forEach((p, i) => { m.makeRotationZ(Math.sin(t * 6 + p.ph) * 0.12); m.setPosition(p.dx + Math.sin(t * 0.9 + p.ph) * 0.5, p.dy + Math.cos(t * 1.1 + p.ph) * 0.35, p.dz); mesh.setMatrixAt(i, m); }); mesh.instanceMatrix.needsUpdate = true; } };
}
const SIGHTS = { whale: [buildWhale, 2], jelly: [buildJelly, 4], turtle: [buildTurtle, 2], shoal: [buildShoal, 4] };
export class Sightings {
  constructor(scene) { this.scene = scene; this.cur = null; this.wait = 70 + Math.random() * 120; this.enabled = false; this.last = null; }
  spawn(kind, o = {}) {
    if (this.cur) return false;
    const names = Object.keys(SIGHTS); kind ||= (() => { const pool = names.filter((k) => k !== this.last).flatMap((k) => Array(SIGHTS[k][1]).fill(k)); return pool[(Math.random() * pool.length) | 0]; })();
    const s = SIGHTS[kind][0](); s.kind = kind; this.last = kind; const dir = o.dir ?? (Math.random() < 0.5 ? -1 : 1);
    s.dir = dir; s.x = -dir * 13; s.y0 = o.y0 ?? s.y[0] + Math.random() * (s.y[1] - s.y[0]); s.z = o.z ?? -7.5 - Math.random() * 3; s.look = { dir, y0: s.y0, z: s.z }; s.age = 0; s.root.rotation.y = s.yaw(dir); s.root.rotation.z = s.roll(dir);
    this.ghostify(s); s.root.position.set(s.x, s.y0, s.z); this.scene.add(s.root); this.hide?.push(s.root); this.cur = s; return true;
  }
  ghostify(s) {                                   // pale, see-through and a little blue: a remembered thing, not a real one
    const tint = new THREE.Color(0xbfe4ff); s.mats = [];
    s.root.traverse((o) => { if (!o.isMesh) return; const m = o.material.clone(); if (m.color) m.color.lerp(tint, 0.55); m.transparent = true; m.depthWrite = false; m.fog = false; m.userData.base = m.blending === THREE.AdditiveBlending ? 0.4 : 0.42; m.opacity = 0; o.material = m; s.mats.push(m); });
  }
  clear() { const s = this.cur; if (!s) return; this.scene.remove(s.root); const hi = this.hide?.indexOf(s.root) ?? -1; if (hi >= 0) this.hide.splice(hi, 1); s.root.traverse((o) => { o.geometry?.dispose?.(); }); this.cur = null; }
  update(dt, t, phase) {
    if (!this.cur) { if (!this.enabled) return; this.wait -= dt * (this.dusk ? 1.8 : 1); if (this.wait <= 0) { this.spawn(); this.onSpawn?.(this.cur?.kind); this.wait = 200 + Math.random() * 280; } return; }
    const s = this.cur; s.age += dt; s.update(t); const fade = Math.min(1, s.age / 3.5, Math.max(0, (13.5 - Math.abs(s.root.position.x)) / 4)), sh = 0.88 + 0.12 * Math.sin(t * 1.1); for (const m of s.mats) m.opacity = m.userData.base * fade * sh;
    if (s.kind === 'jelly') { s.root.position.x += s.dir * s.speed * dt * 0.6; s.root.position.y += s.rise * dt * 0.5; } else s.root.position.x += s.dir * s.speed * dt;
    s.root.position.y += Math.sin(t * 0.5) * 0.004;
    if (Math.abs(s.root.position.x) > 14.5 || s.age > 90 || s.root.position.y > 15) { this.scene.remove(s.root); const hi = this.hide?.indexOf(s.root) ?? -1; if (hi >= 0) this.hide.splice(hi, 1); s.root.traverse((o) => { o.geometry?.dispose?.(); }); this.cur = null; }
  }
}

// Rain on the surface: thin streaks fall from the top of the water and fade. Purely a mood; the curious fish rise to look.
export class Rain {
  constructor(n = 70) {
    this.n = n; this.on = false; this.level = 0;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.6, 0.022), new THREE.MeshBasicMaterial({ color: 0xd6ecff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), n);
    this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 7;
    this.p = Array.from({ length: n }, () => ({ x: -5 + Math.random() * 10, y: 11 + Math.random() * 5, z: -2 + Math.random() * 5, v: 9 + Math.random() * 6 })); this.m = new THREE.Matrix4();
  }
  update(dt) {
    this.level += ((this.on ? 1 : 0) - this.level) * Math.min(1, dt * 0.8); this.mesh.visible = this.level > 0.02; if (!this.mesh.visible) return; this.mesh.material.opacity = 0.5 * this.level;
    this.p.forEach((q, i) => { q.y -= q.v * dt; if (q.y < 9.2) { q.y = 15.8; q.x = -5 + Math.random() * 10; q.z = -2 + Math.random() * 5; } this.m.setPosition(q.x, q.y, q.z); this.mesh.setMatrixAt(i, this.m); });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
