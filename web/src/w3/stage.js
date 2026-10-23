// The stage: renderer, camera, lights, fx, post-processing and time-of-day lighting. No game logic in here.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { buildEnvironment } from './env.js';
import { Fish3D } from './fish3d.js';
import { lanternGlow } from './items.js';
import { Shafts, Beams, waterSurface, Snow, Bubbles } from './fx.js';
import { CausticMap } from './textures.js';

export const stage = { murk: 0, quality: 2, lantern: 0, moonlit: 0, settle: 0, settleK: 0, dim: 0, dimK: 0 };      // dim: the tank's lights turned down (while the light spot toy is on)
export const IW = 405, IH = 720;                 // internal resolution (nearest-upscaled by CSS)
export const canvas = document.getElementById('tank');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(IW, IH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.info.autoReset = false;      // count draw calls across every post-processing pass
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(30, IW / IH, 0.5, 120);
export const CAM_Z = 31;                               // a little further back than it was, so a full tank does not feel crammed
export const CAM_Y = 19, LOOK_Y = 5;                // up a little and looking down, so the tops of the sand banks catch the eye as well as their faces
camera.position.set(0, CAM_Y, CAM_Z); camera.lookAt(0, LOOK_Y, 0);
scene.fog = new THREE.Fog(0x2a6d99, 22, 62);

// gradient water backdrop
const bgMat = new THREE.ShaderMaterial({ fog: false, depthWrite: false, uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  // bright near the surface, the water's own color through the middle, and deepening to dark where it meets the sand: depth, not a wall
  fragmentShader: 'varying vec2 vUv; uniform vec3 uTop,uBot; void main(){ vec3 deep = uBot * 0.42; vec3 c = vUv.y < 0.42 ? mix(deep, uBot, smoothstep(0.0, 0.42, vUv.y)) : mix(uBot, uTop, smoothstep(0.42, 1.0, vUv.y)); gl_FragColor = vec4(c, 1.); }' });
export const bg = new THREE.Mesh(new THREE.PlaneGeometry(90, 32), bgMat); bg.position.set(0, 8, -22); bg.renderOrder = -10; scene.add(bg);

export const env = buildEnvironment(); scene.add(env.root);
Fish3D.world = env.colliders;                 // decorations are solid for the fish

// lights
export const hemi = new THREE.HemisphereLight(0x6fb4e8, 0x1c4a52, 0.9); scene.add(hemi);
export const amb = new THREE.AmbientLight(0x4a7090, 0.3); scene.add(amb);
export const caustic = new CausticMap(96);
export const sun = new THREE.SpotLight(0xffe0a6, 6, 0, 0.62, 0.7, 0);
sun.position.set(-6, 24, 12); sun.target.position.set(0.2, 2, -1.2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.camera.near = 8; sun.shadow.camera.far = 50;
sun.map = caustic.tex;
export const fill = new THREE.DirectionalLight(0xffe6c8, 1.25); fill.position.set(-5, 9, 20); scene.add(fill);
export const rim = new THREE.DirectionalLight(0x6fc8ff, 1.2); rim.position.set(8, 7, -12); scene.add(rim);
export const lamp = new THREE.PointLight(0xffa24a, 0, 16, 1.5); lamp.position.set(0, -20, 0); scene.add(lamp);

// lantern glow: a soft halo around the lamp and a warm pool of light spilling onto the sand
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,200,120,1)'); gr.addColorStop(0.25, 'rgba(255,150,60,.55)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const glowMat = () => new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
export const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), glowMat()); halo.position.set(0, -20, 0); halo.renderOrder = 6; scene.add(halo);
export const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), glowMat()); pool.rotation.x = -Math.PI / 2; pool.position.set(0, -20, 0); pool.renderOrder = 3; scene.add(pool);
export const shafts = new Shafts(); shafts.rebuild();   // god-ray streaks removed from the scene (too much); class kept for later
export const beams = new Beams(6); scene.add(beams.group);      // broad, slow sunbeams from the surface
export const surf = waterSurface(); scene.add(surf.mesh);
export const snow = new Snow(); scene.add(snow.pts); { const m = snow.pts.material; if (m) { if (m.size) m.size *= 0.7; if (m.opacity != null) m.opacity *= 0.75; } }      // marine snow: small and soft, never a sparkle
export const motes = new Snow(110); scene.add(motes.pts); { const m = motes.pts.material; m.size = 0.085; m.color.set(0xfff0c8); m.opacity = 0.3; m.blending = THREE.AdditiveBlending; for (let i = 0; i < motes.n; i++) motes.s[i] *= 0.25; }      // light motes: warm specks that catch the light, drifting slowly
export const bubbles = new Bubbles(-3.6, 0.5, 18), bubbles2 = new Bubbles(3.3, -0.8, 16); scene.add(bubbles.mesh, bubbles2.mesh);

// ── post: bloom -> tonemap -> PS1 15-bit dither + grade ──
export const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, samples: 4 }));
composer.setSize(IW, IH);
composer.addPass(new RenderPass(scene, camera));
// A safety net: a pixel that is not a number (some phone GPUs make one where a desktop makes zero) would be smeared over the whole
// screen by the blur and the bloom, and the tank goes black. This pass turns any such pixel into plain black before that can happen.
const scrub = () => new ShaderPass({ uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); bool bad = !(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || !(c.a == c.a) || abs(c.r) > 6.0e4 || abs(c.g) > 6.0e4 || abs(c.b) > 6.0e4;
      gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, vec4(0.0), vec4(64.0)); }` });
composer.addPass(scrub());
// depth of field: sharp fish, soft painterly background (and a strong portrait blur when zoomed on a fish)
export const bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.00016, maxblur: 0.0032 })      // (a touch of depth, never mush: the far ruins and plants stay readable);
export const hideForDepth = [halo, pool, shafts.group, beams.group, surf.mesh, snow.pts, bubbles.mesh, bubbles2.mesh, bg];
const bokehRender = bokeh.render.bind(bokeh);
bokeh.render = (...a) => { const was = hideForDepth.map((o) => o.visible); hideForDepth.forEach((o) => (o.visible = false)); bokehRender(...a); hideForDepth.forEach((o, i) => (o.visible = was[i])); };   // put back what was visible, never force things on
composer.addPass(bokeh); composer.addPass(scrub());
export const bloom = new UnrealBloomPass(new THREE.Vector2(IW, IH), 0.3, 0.5, 0.95); composer.addPass(bloom);
composer.addPass(new OutputPass());
export const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(IW, IH) }, uDither: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uPool: { value: 0.5 }, uWarm: { value: 1 }, uT: { value: 0 }, uSat: { value: 1.2 }, uVib: { value: 0.3 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uDither; uniform vec3 uTint; uniform float uPool, uWarm, uT, uSat, uVib;
    const mat4 B = mat4(0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
    float bayer(vec2 p){ int x = int(mod(p.x,4.)), y = int(mod(p.y,4.)); return B[y][x]/16.; }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.299,.587,.114));
      c = mix(c*vec3(.92,1.0,1.1), c*vec3(1.08,1.02,.93), smoothstep(.25,.8,l));  // cool shadows / warm highlights
      float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
      c = mix(vec3(l), c, uSat + uVib * (1. - clamp((mx - mn) / max(mx, .001), 0., 1.))) * uTint;      // saturation, plus vibrance: dull colors lifted most, bright ones left alone
      // depth: bright, clearer water near the surface fading to deep, cool darkness below
      float dep = smoothstep(.0, 1., vUv.y);
      c *= mix(vec3(.82,.92,1.02), vec3(1.05,1.04,1.0), dep);
      // warm foreground / cool distance: the color of the pixels carries the light, like the reference
      float cool = smoothstep(.3, .95, vUv.y*.75 + vUv.x*.35);
      c *= mix(mix(vec3(1.0), vec3(1.06,1.02,.9), uWarm), vec3(.92,1.0,1.1), cool);
      // sparkling, blocky surface light along the top edge
      vec2 g = floor(vUv * vec2(96., 170.));
      float top = smoothstep(.93, 1., vUv.y);
      float w = sin(g.x*.55 + uT*1.3 + sin(g.y*.9 + uT*.7)*2.2) * .5 + .5;
      float sp = step(.72, fract(sin(dot(g, vec2(12.9,78.2)) + floor(uT*2.)) * 43758.5));
      c += top * (pow(w, 3.) * .5 + sp * .35) * mix(vec3(.7,.9,1.), vec3(1.,.9,.6), uWarm*.6) * uPool * 0.28;
      vec2 d = vUv-vec2(.5,.38);
      float pool = smoothstep(.85,.05, length(d*vec2(1.25,.8)));                      // soft pool of light around the action
      c *= mix(1. - uPool*.5, 1.03, pool);
      c *= mix(.74, 1., smoothstep(1.1,.3, length((vUv-.5)*vec2(1.0,.9))));          // vignette
      c = (c - .5) * 1.07 + .5;                                                         // a little more contrast: the voxels read as solid things, not pastel
      // PS1-style 15-bit color with ordered dither
      float levels = 31.;
      vec3 q = c*levels + (bayer(floor(vUv*uRes)) - .5)*uDither;
      c = floor(q+.5)/levels;
      gl_FragColor = vec4(c,1.);
    }`,
});
composer.addPass(grade);

// ── time of day ──
export const TOD = {
  morning:   { sat: 1.18, vib: 0.32, sunCol: 0xf2f0d0, sunI: 10.45, sunPos: [-9, 24, 10], hemiSky: 0x98b8b0, hemiGnd: 0x5a4c34, hemiI: 1.25, ambI: 0.4, rimCol: 0x8ad8ff, rimI: 0.8, fog: 0x1e7896, fogNear: 28, fogFar: 66, bgTop: 0x60c6c8, bgBot: 0x0d5878, lampI: 0, shaft: 0.24, surf: 0.4, exposure: 1.03, bloom: 0.12, glow: 0.3, tint: 0xf4fbff, pool: 0.2, warm: 0.6 },
  afternoon: { sat: 1.22, vib: 0.35, sunCol: 0xffe8a4, sunI: 11.0, sunPos: [-6, 24, 12], hemiSky: 0xb0c8a8, hemiGnd: 0x6a5a38, hemiI: 1.5, ambI: 0.46, rimCol: 0x78ceff, rimI: 0.85, fog: 0x1a7398, fogNear: 28, fogFar: 66, bgTop: 0x58c0cc, bgBot: 0x0a4e70, lampI: 0, shaft: 0.26, surf: 0.47, exposure: 1.1, bloom: 0.12, glow: 0.4, tint: 0xfff8ec, pool: 0.2, warm: 1.0 },
  evening:   { sat: 1.02, vib: 0.28, sunCol: 0xffb07a, sunI: 12.1, sunPos: [11, 9, 10], hemiSky: 0xd0a0b0, hemiGnd: 0x58404a, hemiI: 1.0, ambI: 0.32, rimCol: 0xffa0a0, rimI: 0.7, fog: 0x4c4a7e, fogNear: 22, fogFar: 62, bgTop: 0xe9a66e, bgBot: 0x2c3c78, lampI: 50, shaft: 0.2, surf: 0.4, exposure: 1.04, bloom: 0.3, glow: 1.4, tint: 0xfff2e4, pool: 0.2, warm: 1.2 },
  night:     { sat: 1.12, vib: 0.28, sunCol: 0x8aa4ff, sunI: 4.95, sunPos: [-4, 26, 9], hemiSky: 0x2c4690, hemiGnd: 0x0c1230, hemiI: 0.8, ambI: 0.24, rimCol: 0x4a78ff, rimI: 0.6, fog: 0x1a2868, fogNear: 18, fogFar: 54, bgTop: 0x4a5cc0, bgBot: 0x182060, lampI: 130, shaft: 0.16, surf: 0.15, exposure: 1.12, bloom: 0.39, glow: 3.0, tint: 0xeef2ff, pool: 0.15, warm: 0.2 },
};
export const cur = {}, ck = ['sunCol', 'hemiSky', 'hemiGnd', 'fog', 'bgTop', 'bgBot', 'tint', 'rimCol'];
export const qs = new URLSearchParams(location.search);
export const LITE = qs.has('lite');
let target = TOD[qs.get('tod')] ? qs.get('tod') : 'afternoon';
for (const k of Object.keys(TOD.afternoon)) cur[k] = ck.includes(k) ? new THREE.Color(TOD[target][k]) : Array.isArray(TOD[target][k]) ? [...TOD[target][k]] : TOD[target][k];
export function setTod(n) { if (TOD[n]) { target = n; document.querySelectorAll('[data-tod]').forEach((b) => b.classList.toggle('on', b.dataset.tod === n)); const l = document.getElementById('todl'); if (l) l.textContent = n[0].toUpperCase() + n.slice(1); } }
window.__setTod = setTod;
document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => setTod(b.dataset.tod)));
setTod(target);
const tmpC = new THREE.Color(), murkCol = new THREE.Color(0x4f5a2a);
export function applyTod(dt) {
  const k = Math.min(1, dt * 2.0), T = TOD[target];
  for (const key of Object.keys(T)) {
    if (ck.includes(key)) cur[key].lerp(tmpC.set(T[key]), k);
    else if (Array.isArray(T[key])) cur[key] = cur[key].map((v, i) => v + (T[key][i] - v) * k);
    else cur[key] += (T[key] - cur[key]) * k;
  }
  env.setLight(0.3 + 0.7 * Math.max(0, Math.min(1, (cur.hemiI - 0.8) / 0.7)));
  sun.color.copy(cur.sunCol); sun.intensity = cur.sunI; sun.position.set(...cur.sunPos);
  if (target === 'night' && stage.moonlit) { sun.intensity *= 1 + 0.7 * stage.moonlit; sun.color.lerp(tmpC.set(0xcfe0ff), 0.45 * stage.moonlit); }       // a full moon lights the night water silver
  hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd); hemi.intensity = cur.hemiI * (target === 'night' ? 1 + 0.4 * stage.moonlit : 1); amb.intensity = cur.ambI;
  const murk = stage.murk; scene.fog.color.copy(cur.fog).lerp(murkCol, murk * 0.55); scene.fog.near = cur.fogNear - murk * 9; scene.fog.far = cur.fogFar - murk * 14;
  bgMat.uniforms.uTop.value.copy(cur.bgTop); bgMat.uniforms.uBot.value.copy(cur.bgBot);
  rim.color.copy(cur.rimCol); rim.intensity = cur.rimI * 1.35;      // (a brighter edge: every voxel thing stands off the water) grade.uniforms.uPool.value = cur.pool; grade.uniforms.uWarm.value = cur.warm; grade.uniforms.uSat.value = cur.sat; grade.uniforms.uVib.value = cur.vib; caustic.tex.offset.x += dt * 0.012; caustic.tex.offset.y += dt * 0.006;      /* (the caustics drift slowly, like light through moving water) */ lamp.intensity = cur.lampI * stage.lantern; { const lg = Math.min(1, cur.lampI / 70) * stage.lantern; halo.material.opacity = lg * 0.55 + (cur.lampI > 1 ? 0.1 : 0) * stage.lantern; pool.material.opacity = lg * 0.85; } lanternGlow.emissiveIntensity = cur.glow;
  shafts.mat.uniforms.uI.value = cur.shaft; shafts.mat.uniforms.uCol.value.copy(cur.sunCol).lerp(tmpC.set(0x88c8ff), 0.25);
  beams.mat.uniforms.uI.value = cur.shaft * 3.0; beams.mat.uniforms.uCol.value.copy(cur.sunCol).lerp(tmpC.set(0xfff4d0), 0.4);
  surf.mat.uniforms.uI.value = cur.surf; surf.mat.uniforms.uCol.value.copy(cur.sunCol);
  stage.settleK += (stage.settle - stage.settleK) * Math.min(1, dt * 0.6); stage.dimK += (stage.dim - stage.dimK) * Math.min(1, dt * 1.6); renderer.toneMappingExposure = cur.exposure * (1 - 0.14 * stage.settleK) * (1 - 0.3 * stage.dimK); bloom.strength = cur.bloom;
  if (stage.dimK > 0.001) { shafts.mat.uniforms.uI.value *= 1 - stage.dimK; beams.mat.uniforms.uI.value *= 1 - stage.dimK; surf.mat.uniforms.uI.value *= 1 - 0.7 * stage.dimK; }      // lights down: the sun's shafts fade, the spot stays bright
  grade.uniforms.uTint.value.copy(cur.tint);

}

// quality: auto-drops depth of field / resolution if the device can't hold ~30fps (?q=2 pins full quality)
let slow = 0; const born = performance.now(); stage.quality = qs.get('q') ? +qs.get('q') : 2;
export function setQuality(q) {
  stage.quality = q; bokeh.enabled = q >= 2; Fish3D.poseScale = [2.2, 1.5, 1][Math.max(0, Math.min(2, q))];
  const w = q >= 1 ? IW : 360, h = q >= 1 ? IH : 640;
  renderer.setSize(w, h, false); composer.setSize(w, h); grade.uniforms.uRes.value.set(w, h);
}
export function watchPerf(dt) { if (qs.get('q') || performance.now() - born < 4000) return; slow = dt > 0.036 ? slow + 1 : Math.max(0, slow - 2); if (slow > 90 && stage.quality > 0) { slow = 0; setQuality(stage.quality - 1); } }
