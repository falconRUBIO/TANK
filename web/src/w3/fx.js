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
          float along = pow(1.0 - vUv.y, 1.25) * smoothstep(0.0, 0.04, vUv.y);
          float shimmer = 0.55 + 0.45*n(vec2(vUv.x*6.0 + uTime*0.15, vUv.y*2.5 - uTime*0.2));
          float a = edge*along*shimmer*uI;
          // steps the alpha into a few bands for a posterised, retro-lit look
          a = floor(a*9.0+0.5)/9.0;
          gl_FragColor = vec4(uCol*a, a);
        }`,
    });
    this.items = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.BufferGeometry();
      const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false; m.renderOrder = 5;
      this.group.add(m);
      this.items.push({ m, x: -5.5 + Math.random() * 11, z: -3.5 + Math.random() * 5, w: 0.45 + Math.random() * 1.0, ph: Math.random() * 6 });
    }
    this.dir = new THREE.Vector3(-0.28, -1, -0.12).normalize();
  }
  setDir(d) { this.dir.copy(d).normalize(); this.rebuild(); }
  rebuild() {
    const D = this.dir, L = 19, R = new THREE.Vector3(1, 0, 0);
    for (const it of this.items) {
      const top = new THREE.Vector3(it.x - D.x * 0, 16.2, it.z), bot = top.clone().addScaledVector(D, L / Math.abs(D.y));
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
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.55, depthWrite: false }), n);
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
