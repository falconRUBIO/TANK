// OUR TANK – 3D scene: PS1-style low-poly / voxel assets rendered at low resolution with
// modern lighting (shadow-mapped sun, projected caustics, god-ray shafts, bloom, grading).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SPECIES } from './species.js';
import { mulberry32 } from './color.js';
import { buildEnvironment, swayTime } from './w3/env.js';
import { Fish3D } from './w3/fish3d.js';
import { Shafts, waterSurface, Snow, Bubbles } from './w3/fx.js';
import { CausticMap } from './w3/textures.js';

const IW = 360, IH = 640;                 // internal resolution (nearest-upscaled by CSS)
const canvas = document.getElementById('tank');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(IW, IH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, IW / IH, 0.5, 120);
camera.position.set(0, 7.0, 30); camera.lookAt(0, 7.5, 0);
scene.fog = new THREE.Fog(0x2a6d99, 22, 62);

// gradient water backdrop
const bgMat = new THREE.ShaderMaterial({ fog: false, depthWrite: false, uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec2 vUv; uniform vec3 uTop,uBot; void main(){ gl_FragColor = vec4(mix(uBot,uTop,smoothstep(0.0,1.0,vUv.y)),1.); }' });
const bg = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), bgMat); bg.position.set(0, 8, -22); bg.renderOrder = -10; scene.add(bg);

const env = buildEnvironment(); scene.add(env.root);

// lights
const hemi = new THREE.HemisphereLight(0x6fb4e8, 0x1c4a52, 0.9); scene.add(hemi);
const amb = new THREE.AmbientLight(0x4a7090, 0.3); scene.add(amb);
const caustic = new CausticMap(96);
const sun = new THREE.SpotLight(0xffe0a6, 6, 0, 0.62, 0.7, 0);
sun.position.set(2.5, 26, 9); sun.target.position.set(-0.4, 0, -1.2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.camera.near = 8; sun.shadow.camera.far = 50;
sun.map = caustic.tex;
const fill = new THREE.DirectionalLight(0xffe6c8, 1.0); fill.position.set(-5, 9, 20); scene.add(fill);
const lamp = new THREE.PointLight(0xffa24a, 0, 12, 1.6); lamp.position.copy(env.lampPos); scene.add(lamp);

const shafts = new Shafts(); scene.add(shafts.group);
const surf = waterSurface(); scene.add(surf.mesh);
const snow = new Snow(); scene.add(snow.pts);
const bubbles = new Bubbles(0.9, -0.2); scene.add(bubbles.mesh);

// ── fish ──
const rng = mulberry32(11);
const fishes = [];
const add = (id, seed, o) => { const f = new Fish3D(SPECIES[id], seed, o); f.pos.set(o.start?.[0] ?? (rng() - 0.5) * 6, o.start?.[1] ?? 6, o.start?.[2] ?? 1); f.pick(rng); scene.add(f.group); fishes.push(f); return f; };
SPECIES.neon.school = true;
add('goldfish', 1, { speed: 1.0, band: { x: [-3.4, 3.6], y: [3, 12], z: [0.7, 2.0] }, start: [1, 7, 1.4] });
add('goldfish', 5, { speed: 0.9, scale: 0.78, band: { x: [-3.6, 3.6], y: [2, 11], z: [-3.2, -2.0] }, start: [-2, 5, -2.5] });
add('blue', 2, { speed: 0.9, band: { x: [-3.2, 3.4], y: [4, 13], z: [0.5, 1.9] }, start: [2, 11, 1.2] });
const angel = add('angelfish', 3, { speed: 0.7, band: { x: [-3.0, 3.6], y: [3, 10], z: [-3.2, -2.0] }, start: [3, 6, -2.6] });
for (let i = 0; i < 5; i++) add('neon', 4 + i, { speed: 1.3, band: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, start: [-1 + i * 0.25, 5 + (i % 2) * 0.3, 1.2 + (i % 3) * 0.2] });
add('cory', 9, { speed: 0.55, band: { x: [-3.4, 3.6], y: [0.35, 0.45], z: [0.6, 1.9] }, start: [0, 0.4, 1.4] });
// one swimmer explores the arch: through the opening, toward the camera and back
const arch = add('blue', 12, { speed: 0.8, scale: 0.9, band: { x: [-2, -1.9], y: [2.2, 2.6], z: [-3, 1.6] }, start: [env.archX, 2.4, -2.8] });
arch.pick = function () { this.target.set(env.archX + (rng() - 0.5) * 0.25, 2.3 + rng() * 0.4, this.pos.z < -0.5 ? 1.6 : -3.0); this.retarget = 12; };

// ── post: bloom -> tonemap -> PS1 15-bit dither + grade ──
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, samples: 4 }));
composer.setSize(IW, IH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(IW, IH), 0.55, 0.6, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(IW, IH) }, uDither: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uDither; uniform vec3 uTint;
    const mat4 B = mat4(0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
    float bayer(vec2 p){ int x = int(mod(p.x,4.)), y = int(mod(p.y,4.)); return B[y][x]/16.; }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.299,.587,.114));
      c = mix(c*vec3(.92,1.0,1.1), c*vec3(1.08,1.02,.93), smoothstep(.25,.8,l));  // cool shadows / warm highlights
      c = mix(vec3(l), c, 1.18) * uTint;
      vec2 d = vUv-.5; c *= mix(.5, 1., smoothstep(.95,.2, length(d*vec2(1.0,.85))));  // vignette
      // PS1-style 15-bit colour with ordered dither
      float levels = 31.;
      vec3 q = c*levels + (bayer(floor(vUv*uRes)) - .5)*uDither;
      c = floor(q+.5)/levels;
      gl_FragColor = vec4(c,1.);
    }`,
});
composer.addPass(grade);

// ── time of day ──
const TOD = {
  morning:   { sunCol: 0xcfe6ff, sunI: 9.5, sunPos: [-5, 26, 9], hemiSky: 0x9ccfe8, hemiGnd: 0x1b4a58, hemiI: 1.9, ambI: 0.7, fog: 0x2f7aa6, fogNear: 28, fogFar: 82, bgTop: 0x64b4dc, bgBot: 0x10405c, lampI: 0, shaft: 0.42, surf: 0.5, exposure: 0.95, bloom: 0.4, glow: 0.3, tint: 0xf4fbff },
  afternoon: { sunCol: 0xffeccb, sunI: 12, sunPos: [2.5, 26, 9], hemiSky: 0x8cc4e8, hemiGnd: 0x1c4a52, hemiI: 1.9, ambI: 0.7, fog: 0x2a6d99, fogNear: 28, fogFar: 80, bgTop: 0x58a8d6, bgBot: 0x0e3552, lampI: 0, shaft: 0.6, surf: 0.65, exposure: 0.95, bloom: 0.4, glow: 0.4, tint: 0xfffaf0 },
  evening:   { sunCol: 0xff8a4a, sunI: 10.5, sunPos: [9, 20, 7], hemiSky: 0xa07ab8, hemiGnd: 0x2a2038, hemiI: 1.6, ambI: 0.55, fog: 0x3f3a68, fogNear: 24, fogFar: 70, bgTop: 0x9a6aa8, bgBot: 0x1a1838, lampI: 22, shaft: 0.62, surf: 0.7, exposure: 0.95, bloom: 0.55, glow: 1.4, tint: 0xfff0f0 },
  night:     { sunCol: 0x6f8cff, sunI: 3.2, sunPos: [-3, 26, 8], hemiSky: 0x2c4a9a, hemiGnd: 0x0a1030, hemiI: 1.15, ambI: 0.5, fog: 0x07142e, fogNear: 20, fogFar: 58, bgTop: 0x0e2858, bgBot: 0x030814, lampI: 70, shaft: 0.22, surf: 0.25, exposure: 1.1, bloom: 1.0, glow: 3.2, tint: 0xeef2ff },
};
const cur = {}, ck = ['sunCol', 'hemiSky', 'hemiGnd', 'fog', 'bgTop', 'bgBot', 'tint'];
const qs = new URLSearchParams(location.search);
let target = TOD[qs.get('tod')] ? qs.get('tod') : 'afternoon';
for (const k of Object.keys(TOD.afternoon)) cur[k] = ck.includes(k) ? new THREE.Color(TOD[target][k]) : Array.isArray(TOD[target][k]) ? [...TOD[target][k]] : TOD[target][k];
export function setTod(n) { if (TOD[n]) { target = n; document.querySelectorAll('[data-tod]').forEach((b) => b.classList.toggle('on', b.dataset.tod === n)); const l = document.getElementById('todl'); if (l) l.textContent = n[0].toUpperCase() + n.slice(1); } }
window.__setTod = setTod;
document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => setTod(b.dataset.tod)));
setTod(target);
const tmpC = new THREE.Color();
function applyTod(dt) {
  const k = Math.min(1, dt * 2.0), T = TOD[target];
  for (const key of Object.keys(T)) {
    if (ck.includes(key)) cur[key].lerp(tmpC.set(T[key]), k);
    else if (Array.isArray(T[key])) cur[key] = cur[key].map((v, i) => v + (T[key][i] - v) * k);
    else cur[key] += (T[key] - cur[key]) * k;
  }
  sun.color.copy(cur.sunCol); sun.intensity = cur.sunI; sun.position.set(...cur.sunPos);
  hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd); hemi.intensity = cur.hemiI; amb.intensity = cur.ambI;
  scene.fog.color.copy(cur.fog); scene.fog.near = cur.fogNear; scene.fog.far = cur.fogFar;
  bgMat.uniforms.uTop.value.copy(cur.bgTop); bgMat.uniforms.uBot.value.copy(cur.bgBot);
  lamp.intensity = cur.lampI; env.glow.emissiveIntensity = cur.glow;
  shafts.mat.uniforms.uI.value = cur.shaft; shafts.mat.uniforms.uCol.value.copy(cur.sunCol).lerp(tmpC.set(0x88c8ff), 0.25);
  surf.mat.uniforms.uI.value = cur.surf; surf.mat.uniforms.uCol.value.copy(cur.sunCol);
  renderer.toneMappingExposure = cur.exposure; bloom.strength = cur.bloom;
  grade.uniforms.uTint.value.copy(cur.tint);
  const d = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize(); shafts.setDir(d);
}

let last = performance.now(), cTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  swayTime.value = t;
  cTick += dt; if (cTick > 0.05) { cTick = 0; caustic.update(t * 0.7); }
  applyTod(dt);
  if (window.__follow) { const f = window.__follow; camera.position.set(f.pos.x + 0.3, f.pos.y + 0.2, f.pos.z + 9.5); camera.lookAt(f.pos); }
  else { camera.position.x = Math.sin(t * 0.13) * 0.35; camera.position.y = 7.0 + Math.sin(t * 0.09) * 0.12; camera.lookAt(0, 7.5, 0); }
  fishes.forEach((f) => f.update(dt, rng, fishes));
  shafts.update(t); surf.mat.uniforms.uTime.value = t; snow.update(dt, t); bubbles.update(dt, t);
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__tank = { fishes, follow: (i) => { window.__follow = fishes[i]; }, scene, renderer, camera, sun, hemi, amb, fill, bloom, TOD };
