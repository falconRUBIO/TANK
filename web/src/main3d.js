// OUR TANK – 3D scene: PS1-style low-poly / voxel assets rendered at low resolution with
// modern lighting (shadow-mapped sun, projected caustics, god-ray shafts, bloom, grading).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { initUI } from './ui.js';
import { runOnboarding, Live, api, getSession } from './online.js';
import { SPECIES } from './species.js';
import { mulberry32 } from './color.js';
import { buildEnvironment, swayTime } from './w3/env.js';
import { Fish3D, fishBoost } from './w3/fish3d.js';
import { Shafts, waterSurface, Snow, Bubbles } from './w3/fx.js';
import { CausticMap } from './w3/textures.js';

const IW = 405, IH = 720;                 // internal resolution (nearest-upscaled by CSS)
const canvas = document.getElementById('tank');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(IW, IH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.info.autoReset = false;      // count draw calls across every post-processing pass
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, IW / IH, 0.5, 120);
camera.position.set(0, 7.4, 30); camera.lookAt(0, 8.0, 0);
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
sun.position.set(-6, 24, 12); sun.target.position.set(0.2, 2, -1.2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.camera.near = 8; sun.shadow.camera.far = 50;
sun.map = caustic.tex;
const fill = new THREE.DirectionalLight(0xffe6c8, 1.25); fill.position.set(-5, 9, 20); scene.add(fill);
const rim = new THREE.DirectionalLight(0x6fc8ff, 1.2); rim.position.set(8, 7, -12); scene.add(rim);
const lamp = new THREE.PointLight(0xffa24a, 0, 12, 1.6); lamp.position.copy(env.lampPos); scene.add(lamp);

const shafts = new Shafts(); shafts.rebuild();   // god-ray streaks removed from the scene (too much); class kept for later
const surf = waterSurface(); scene.add(surf.mesh);
const snow = new Snow(); scene.add(snow.pts);
const bubbles = new Bubbles(-3.6, 0.5, 18), bubbles2 = new Bubbles(3.3, -0.8, 16); scene.add(bubbles.mesh, bubbles2.mesh);

// ── fish ──
const rng = mulberry32(11);
const fishes = [];
const add = (id, seed, o) => { const f = new Fish3D(SPECIES[id], seed, o); f.pos.set(o.start?.[0] ?? (rng() - 0.5) * 6, o.start?.[1] ?? 6, o.start?.[2] ?? 1); f.pick(rng); scene.add(f.group); fishes.push(f); return f; };
SPECIES.neon.school = true;
add('goldfish', 1, { name: 'Pip', profile: { traits: ['Curious', 'Social', 'Brave'], age: 'Juvenile', spot: 'Stone Arch', food: 'Flakes', needs: [0.8, 0.92, 0.7, 1] }, speed: 1.0, band: { x: [-3.4, 3.6], y: [3, 12], z: [0.7, 2.0] }, start: [1, 7, 1.4] });
add('goldfish', 5, { name: 'Mango', profile: { traits: ['Playful', 'Greedy'], age: 'Baby', spot: 'Driftwood', food: 'Pellets', needs: [0.55, 0.95, 0.9, 1] }, speed: 0.9, scale: 0.78, band: { x: [-3.6, 3.6], y: [2, 11], z: [-3.2, -2.0] }, start: [-2, 5, -2.5] });
add('blue', 2, { name: 'Azure', profile: { traits: ['Shy', 'Lazy'], age: 'Adult', spot: 'Red Plants', food: 'Algae wafers', needs: [0.7, 0.8, 0.6, 1] }, speed: 0.9, band: { x: [-3.2, 3.4], y: [4, 13], z: [0.5, 1.9] }, start: [2, 11, 1.2] });
const angel = add('angelfish', 3, { name: 'Luna', profile: { traits: ['Calm', 'Curious'], age: 'Adult', spot: 'Tall Grass', food: 'Flakes', needs: [0.75, 0.88, 0.8, 1] }, speed: 0.7, band: { x: [-3.0, 3.6], y: [3, 10], z: [-3.2, -2.0] }, start: [3, 6, -2.6] });
for (let i = 0; i < 5; i++) add('neon', 4 + i, { name: 'Neon ' + (i + 1), profile: { traits: ['Social', 'Playful'], age: 'Adult', spot: 'Open water', food: 'Flakes', needs: [0.85, 0.9, 0.9, 1] }, speed: 1.3, band: { x: [-3.2, 3.4], y: [3, 9], z: [0.6, 1.9] }, start: [-1 + i * 0.25, 5 + (i % 2) * 0.3, 1.2 + (i % 3) * 0.2] });
add('cory', 9, { name: 'Dusty', profile: { traits: ['Shy', 'Lazy'], age: 'Juvenile', spot: 'Driftwood', food: 'Sinking food', needs: [0.6, 0.85, 0.4, 1] }, speed: 0.55, band: { x: [-3.4, 3.6], y: [0.35, 0.45], z: [0.6, 1.9] }, start: [0, 0.4, 1.4] });
// one swimmer explores the arch: through the opening, toward the camera and back
const arch = add('blue', 12, { name: 'Indigo', profile: { traits: ['Brave', 'Curious'], age: 'Juvenile', spot: 'Stone Arch', food: 'Flakes', needs: [0.8, 0.9, 0.75, 1] }, speed: 0.8, scale: 0.9, band: { x: [-2, -1.9], y: [2.2, 2.6], z: [-3, 1.6] }, start: [env.archX, 2.4, -2.8] });
arch.pick = function () { this.target.set(env.archX + (rng() - 0.5) * 0.25, 2.3 + rng() * 0.4, this.pos.z < -0.5 ? 1.6 : -3.0); this.retarget = 12; };

// ── personality: each trait changes where a fish chooses to swim next ──
const bubbleCol = new THREE.Vector3(-3.6, 0, 0.5);
fishes.forEach((f) => {
  if (f === arch) return;
  const base = f.pick.bind(f), tr = f.profile?.traits ?? [];
  f.pick = function (r) {
    base(r); const roll = r();
    if (tr.includes('Curious') && roll < 0.28) { this.target.set((r() - 0.5) * 6, 4 + r() * 6, 3.4); this.retarget = 4; }                       // swim up to the glass
    else if (tr.includes('Social') && roll < 0.35) { const o = fishes[(r() * fishes.length) | 0]; if (o !== this) { this.target.copy(o.pos).add(new THREE.Vector3((r() - 0.5) * 1.2, (r() - 0.5) * 0.8, 0.2)); this.retarget = 3; } }
    else if (tr.includes('Shy') && roll < 0.45) { this.target.set(-3.4 + r() * 7, 1 + r() * 3, -1.6 - r() * 1.2); this.retarget = 7; }                // tuck into the plants
    else if (tr.includes('Playful') && roll < 0.3) { this.target.set(bubbleCol.x + (r() - 0.5) * 0.6, 2 + r() * 8, 0.2 + r()); this.retarget = 3; }  // chase the bubbles
    if (tr.includes('Lazy')) this.retarget += 4;
  };
});
// ── feeding: flakes sink, fish react by personality, only hungry meals pay Shells ──
const flakes = { list: [], mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.04, 0.17), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x552200, emissiveIntensity: 0.6 }), 200) };
flakes.mesh.frustumCulled = false; flakes.mesh.count = 0; flakes.mesh.castShadow = true; scene.add(flakes.mesh);
const flakeCols = [0xff7a1a, 0xffb02a, 0xe8442a, 0x9ad04a].map((c) => new THREE.Color(c));
let hunger = 0.6, shells = 0, feedMode = false, eatenSinceReward = 0;
const journal = [{ day: 1, text: 'Our tank began.' }];
let dayStart = Date.now(); try { dayStart = +localStorage.getItem('ourtank.start') || Date.now(); localStorage.setItem('ourtank.start', dayStart); } catch (e) { /* storage unavailable */ }
const dayNo = () => Math.floor((Date.now() - dayStart) / 864e5) + 1;
document.getElementById('day').textContent = 'DAY ' + String(dayNo()).padStart(3, '0');
let water = 1, glass = 0, cleanMode = false, waterAnim = 0, lastReward = 0;
// ── persistence (localStorage; survives reloads, and the tank keeps living while you're away) ──
try {
  const sv = JSON.parse(localStorage.getItem('ourtank.save') || 'null');
  if (sv) {
    shells = sv.shells || 0; journal.splice(0, journal.length, ...(sv.journal || journal));
    const away = Math.min(8 * 3600, (Date.now() - (sv.at || Date.now())) / 1000);
    hunger = Math.min(0.85, (sv.hunger ?? 0.6) + away * 0.004); water = Math.max(0.45, (sv.water ?? 1) - away * 0.00008); glass = Math.min(0.8, (sv.glass ?? 0) + away * 0.0001);
    if (away > 600 && glass > 0.15) journal.push({ day: dayNo(), text: 'Algae crept onto the glass while you were away.' });
  }
} catch (e) { /* ignore corrupt save */ }
const save = () => { if (net) return; try { localStorage.setItem('ourtank.save', JSON.stringify({ shells, journal, hunger, water, glass, at: Date.now() })); } catch (e) { /* storage unavailable */ } };
setInterval(save, 4000); addEventListener('pagehide', save);
let net = null; const S = { data: null };
const meName = () => S.data?.members.find((m) => m.id === S.data.you.userId)?.name;
const nameOf = (id) => S.data?.members.find((m) => m.id === id)?.name ?? 'Someone';
const copyText = async (t, ok) => { try { await navigator.clipboard.writeText(t); ui.toast(ok); } catch { ui.toast(t); } };
const social = {
  get: () => S.data,
  chat: (t) => net?.chat(t),
  invite: () => ui.open('friends'),
  copy: () => copyText(S.data.tank.code, 'Code copied'),
  share: async () => { const c = S.data.tank.code, d = { title: 'OUR TANK', text: `Come help take care of our fish! Join my aquarium in OUR TANK. Code: ${c}`, url: `${location.origin}/join/${c}` }; try { if (navigator.share) await navigator.share(d); else copyText(d.text + ' ' + d.url, 'Invite copied'); } catch { /* cancelled */ } },
  regen: async () => { if (!confirm('Make a new code? The old one will stop working.')) return; try { S.data.tank.code = (await api('/api/tanks/code', {})).code; ui.refresh(); ui.toast('New code ready'); } catch (e) { ui.toast(e.message); } },
};
const ui = initUI({ journal: () => journal.slice().reverse(), social, onAct: (a) => {
  if (a === 'feed') { feedMode = true; cleanMode = false; ui.toast('Tap the water to drop flakes'); }
  else if (a === 'clean') { startClean(); }
  else if (a === 'water') {
    if (waterAnim > 0) return;
    if (net) { if (water >= 0.7) return ui.toast('The water is already fresh'); net.action('water'); waterAnim = 1; ui.toast('Changing the water…'); return; }
    waterAnim = 1; ui.toast('Changing the water…'); if (water < 0.7 && Date.now() - lastReward > 60000) { shells += 2; lastReward = Date.now(); ui.toast('Fresh water! +2 shells'); journal.push({ day: dayNo(), text: 'The water was changed.' }); }
  }
  else if (a === 'health') { ui.toast(`Water ${Math.round(water * 100)}% · Glass ${Math.round((1 - glass) * 100)}% · Fed ${Math.round((1 - hunger) * 100)}%`); }
  ui.setShells(shells);
} });
ui.setShells(shells);
// glass algae overlay you wipe with a finger
const gcv = document.getElementById('glass'), gg = gcv.getContext('2d'); gcv.width = 195; gcv.height = 346;
function addAlgae(n) { for (let i = 0; i < n; i++) { const edge = Math.random() < 0.6, x = edge ? (Math.random() < 0.5 ? Math.random() * 40 : 155 + Math.random() * 40) : Math.random() * 195, y = Math.pow(Math.random(), 0.6) * 346; gg.fillStyle = `rgba(${70 + Math.random() * 40},${130 + Math.random() * 40},${40 + Math.random() * 30},${0.12 + Math.random() * 0.2})`; gg.beginPath(); gg.arc(x, y, 1.2 + Math.random() * 4.5, 0, 6.3); gg.fill(); } }
addAlgae(Math.round(glass * 900));
function startClean() { cleanMode = true; feedMode = false; gcv.style.pointerEvents = 'auto'; ui.toast(glass > 0.12 ? 'Swipe the glass to wipe it clean' : 'The glass is already clean'); if (glass <= 0.12) { cleanMode = false; gcv.style.pointerEvents = 'none'; } }
let wiping = false;
const wipe = (e) => { const r = gcv.getBoundingClientRect(); gg.globalCompositeOperation = 'destination-out'; gg.beginPath(); gg.arc((e.clientX - r.left) / r.width * 195, (e.clientY - r.top) / r.height * 346, 16, 0, 6.3); gg.fill(); gg.globalCompositeOperation = 'source-over'; };
gcv.addEventListener('pointerdown', (e) => { wiping = true; wipe(e); }); gcv.addEventListener('pointermove', (e) => { if (wiping) wipe(e); });
addEventListener('pointerup', () => {
  if (!wiping) return; wiping = false;
  const d = gg.getImageData(0, 0, 195, 346).data; let left = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 14) left++;
  glass = Math.min(glass, left / (d.length / 16) * 6);
  if (glass < 0.06 && net) { net.action('glass'); glass = 0; cleanMode = false; gcv.style.pointerEvents = 'none'; gg.clearRect(0, 0, 195, 346); }
  else if (glass < 0.06) { const was = lastClean; glass = 0; cleanMode = false; gcv.style.pointerEvents = 'none'; gg.clearRect(0, 0, 195, 346); if (Date.now() - lastReward > 30000) { shells++; lastReward = Date.now(); ui.setShells(shells); ui.toast('Spotless! +1 shell'); journal.push({ day: dayNo(), text: 'The glass was cleaned.' }); } else ui.toast('Spotless'); }
});
let lastClean = 0;
const fedToday = new Set();
function dropFlakes(x, n = 7) { for (let i = 0; i < n && flakes.list.length < 190; i++) flakes.list.push({ pos: new THREE.Vector3(x + (rng() - 0.5) * 0.9, 15 + rng() * 0.5, 0.3 + rng() * 1.6), age: 0, ph: rng() * 6, c: flakeCols[(rng() * 4) | 0] }); }
const fm = new THREE.Matrix4();
function updateFlakes(dt, t) {
  for (const f of flakes.list) { f.age += dt; if (f.pos.y > 0.2) { f.pos.y -= 0.42 * dt; f.pos.x += Math.sin(t * 1.6 + f.ph) * 0.12 * dt; } }
  flakes.list = flakes.list.filter((f) => !f.eaten && f.age < 30);
  flakes.mesh.count = flakes.list.length;
  flakes.list.forEach((f, i) => { fm.makeRotationY(f.ph + t * 0.4); fm.setPosition(f.pos); flakes.mesh.setMatrixAt(i, fm); flakes.mesh.setColorAt(i, f.c); });
  flakes.mesh.instanceMatrix.needsUpdate = true; if (flakes.mesh.instanceColor) flakes.mesh.instanceColor.needsUpdate = true;
  if (!net) { hunger = Math.min(1, hunger + dt * 0.01); water = Math.max(0.3, water - dt * 0.00012); const g0 = glass; glass = Math.min(1, glass + dt * 0.00018); if (Math.floor(glass * 900) > Math.floor(g0 * 900)) addAlgae(1); }
  if (waterAnim > 0) { waterAnim = Math.max(0, waterAnim - dt * 0.5); water += (1 - water) * Math.min(1, dt * 2.5); }
  for (const f of fishes) {
    let best = null, bd = 8;
    const shy = f.profile?.traits.includes('Shy'), greedy = f.profile?.traits.includes('Greedy');
    if (net || hunger > 0.05) for (const fl of flakes.list) {
      if (fl.eaten || (f.id === 'cory' && fl.pos.y > 0.7) || (shy && fl.age < 1.8)) continue;
      const d = f.pos.distanceTo(fl.pos); if (d < bd) { bd = d; best = fl; }
    }
    f.seeking = !!best; f.foodMul = best ? (greedy ? 2.0 : 1.5) : 1;
    if (best) {
      f.target.copy(best.pos); f.retarget = 0.3;
      if (f.mouth().distanceTo(best.pos) < 0.32) {
        best.eaten = true;
        const paid = !net && hunger > 0.25; if (!net) { hunger = Math.max(0, hunger - 0.045); water = Math.max(0.3, water - 0.01); }
        if (paid && ++eatenSinceReward >= 4) { eatenSinceReward = 0; shells++; ui.setShells(shells); ui.toast('+1 shell'); }
        if (!net && !fedToday.has(f.name)) { fedToday.add(f.name); journal.push({ day: dayNo(), text: `${f.name} found the flakes.` }); }
      }
    }
  }
}

// ── post: bloom -> tonemap -> PS1 15-bit dither + grade ──
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, samples: 4 }));
composer.setSize(IW, IH);
composer.addPass(new RenderPass(scene, camera));
// depth of field: sharp fish, soft painterly background (and a strong portrait blur when zoomed on a fish)
const bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.00022, maxblur: 0.006 });
const hideForDepth = [shafts.group, surf.mesh, snow.pts, bubbles.mesh, bubbles2.mesh, bg, flakes.mesh];
const bokehRender = bokeh.render.bind(bokeh);
bokeh.render = (...a) => { hideForDepth.forEach((o) => (o.visible = false)); bokehRender(...a); hideForDepth.forEach((o) => (o.visible = true)); };
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(IW, IH), 0.3, 0.5, 0.95); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(IW, IH) }, uDither: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uPool: { value: 0.5 }, uWarm: { value: 1 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uDither; uniform vec3 uTint; uniform float uPool, uWarm, uT;
    const mat4 B = mat4(0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
    float bayer(vec2 p){ int x = int(mod(p.x,4.)), y = int(mod(p.y,4.)); return B[y][x]/16.; }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.299,.587,.114));
      c = mix(c*vec3(.92,1.0,1.1), c*vec3(1.08,1.02,.93), smoothstep(.25,.8,l));  // cool shadows / warm highlights
      c = mix(vec3(l), c, 1.2) * uTint;
      // warm foreground / cool distance: the colour of the pixels carries the light, like the reference
      float cool = smoothstep(.3, .95, vUv.y*.75 + vUv.x*.35);
      c *= mix(mix(vec3(1.0), vec3(1.06,1.02,.9), uWarm), vec3(.92,1.0,1.1), cool);
      // sparkling, blocky surface light along the top edge
      vec2 g = floor(vUv * vec2(96., 170.));
      float top = smoothstep(.87, 1., vUv.y);
      float w = sin(g.x*.55 + uT*1.3 + sin(g.y*.9 + uT*.7)*2.2) * .5 + .5;
      float sp = step(.72, fract(sin(dot(g, vec2(12.9,78.2)) + floor(uT*2.)) * 43758.5));
      c += top * (pow(w, 3.) * .5 + sp * .35) * mix(vec3(.7,.9,1.), vec3(1.,.9,.6), uWarm*.6) * uPool * 0.6;
      vec2 d = vUv-vec2(.5,.38);
      float pool = smoothstep(.85,.05, length(d*vec2(1.25,.8)));                      // soft pool of light around the action
      c *= mix(1. - uPool*.5, 1.03, pool);
      c *= mix(.78, 1., smoothstep(1.1,.3, length((vUv-.5)*vec2(1.0,.9))));          // vignette
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
  morning:   { sunCol: 0xf2f0d0, sunI: 9.5, sunPos: [-9, 24, 10], hemiSky: 0x98b8b0, hemiGnd: 0x5a4c34, hemiI: 1.25, ambI: 0.4, rimCol: 0x8ad8ff, rimI: 0.35, fog: 0x16506c, fogNear: 24, fogFar: 52, bgTop: 0x266c88, bgBot: 0x07222f, lampI: 0, shaft: 0.24, surf: 0.4, exposure: 1.03, bloom: 0.12, glow: 0.3, tint: 0xf4fbff, pool: 0.2, warm: 0.6 },
  afternoon: { sunCol: 0xffe8a4, sunI: 10, sunPos: [-6, 24, 12], hemiSky: 0xa8c096, hemiGnd: 0x6a5430, hemiI: 1.25, ambI: 0.4, rimCol: 0x78ceff, rimI: 0.35, fog: 0x123f60, fogNear: 24, fogFar: 52, bgTop: 0x1c5c7c, bgBot: 0x061f2c, lampI: 0, shaft: 0.26, surf: 0.47, exposure: 1.05, bloom: 0.12, glow: 0.4, tint: 0xfff8ec, pool: 0.2, warm: 1.0 },
  evening:   { sunCol: 0xff9050, sunI: 10, sunPos: [10, 17, 9], hemiSky: 0xb09ab0, hemiGnd: 0x5a4a38, hemiI: 0.95, ambI: 0.26, rimCol: 0xff6aa0, rimI: 0.5, fog: 0x2c3556, fogNear: 20, fogFar: 50, bgTop: 0x4a4f78, bgBot: 0x0e1426, lampI: 24, shaft: 0.4, surf: 0.4, exposure: 1.02, bloom: 0.23, glow: 1.4, tint: 0xfff0ec, pool: 0.23, warm: 1.2 },
  night:     { sunCol: 0x8aa4ff, sunI: 4.5, sunPos: [-4, 26, 9], hemiSky: 0x2c4690, hemiGnd: 0x0c1230, hemiI: 0.8, ambI: 0.24, rimCol: 0x4a78ff, rimI: 0.4, fog: 0x0a1630, fogNear: 16, fogFar: 46, bgTop: 0x12295a, bgBot: 0x03070f, lampI: 70, shaft: 0.16, surf: 0.15, exposure: 1.12, bloom: 0.39, glow: 3.0, tint: 0xeef2ff, pool: 0.15, warm: 0.2 },
};
const cur = {}, ck = ['sunCol', 'hemiSky', 'hemiGnd', 'fog', 'bgTop', 'bgBot', 'tint', 'rimCol'];
const qs = new URLSearchParams(location.search);
const LITE = qs.has('lite');
let target = TOD[qs.get('tod')] ? qs.get('tod') : 'afternoon';
for (const k of Object.keys(TOD.afternoon)) cur[k] = ck.includes(k) ? new THREE.Color(TOD[target][k]) : Array.isArray(TOD[target][k]) ? [...TOD[target][k]] : TOD[target][k];
export function setTod(n) { if (TOD[n]) { target = n; document.querySelectorAll('[data-tod]').forEach((b) => b.classList.toggle('on', b.dataset.tod === n)); const l = document.getElementById('todl'); if (l) l.textContent = n[0].toUpperCase() + n.slice(1); } }
window.__setTod = setTod;
document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => setTod(b.dataset.tod)));
setTod(target);
const tmpC = new THREE.Color(), murkCol = new THREE.Color(0x4f5a2a);
function applyTod(dt) {
  const k = Math.min(1, dt * 2.0), T = TOD[target];
  for (const key of Object.keys(T)) {
    if (ck.includes(key)) cur[key].lerp(tmpC.set(T[key]), k);
    else if (Array.isArray(T[key])) cur[key] = cur[key].map((v, i) => v + (T[key][i] - v) * k);
    else cur[key] += (T[key] - cur[key]) * k;
  }
  sun.color.copy(cur.sunCol); sun.intensity = cur.sunI; sun.position.set(...cur.sunPos);
  hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd); hemi.intensity = cur.hemiI; amb.intensity = cur.ambI;
  const murk = 1 - water; scene.fog.color.copy(cur.fog).lerp(murkCol, murk * 0.55); scene.fog.near = cur.fogNear - murk * 9; scene.fog.far = cur.fogFar - murk * 14;
  bgMat.uniforms.uTop.value.copy(cur.bgTop); bgMat.uniforms.uBot.value.copy(cur.bgBot);
  rim.color.copy(cur.rimCol); rim.intensity = cur.rimI; grade.uniforms.uPool.value = cur.pool; grade.uniforms.uWarm.value = cur.warm; lamp.intensity = cur.lampI; env.glow.emissiveIntensity = cur.glow;
  shafts.mat.uniforms.uI.value = cur.shaft; shafts.mat.uniforms.uCol.value.copy(cur.sunCol).lerp(tmpC.set(0x88c8ff), 0.25);
  surf.mat.uniforms.uI.value = cur.surf; surf.mat.uniforms.uCol.value.copy(cur.sunCol);
  renderer.toneMappingExposure = cur.exposure; bloom.strength = cur.bloom;
  grade.uniforms.uTint.value.copy(cur.tint);

}

// ── tap a fish: camera glides in, profile card slides up ──
const card = document.getElementById('card');
let focus = null; const look = new THREE.Vector3(0, 8.0, 0), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3();
const ray = new THREE.Raycaster();
function pick(ev) {
  const r = canvas.getBoundingClientRect(), sc = Math.max(r.width / IW, r.height / IH), dw = IW * sc, dh = IH * sc;
  const u = (ev.clientX - r.left - (r.width - dw) * 0.5) / dw, v = (ev.clientY - r.top - (r.height - dh) * 0.6) / dh;
  ray.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), camera);
  let best = null, bd = 1e9;
  for (const f of fishes) { const hit = ray.ray.distanceToPoint(f.pos); if (hit < f.radius * 0.9) { const d = f.pos.distanceTo(camera.position); if (d < bd) { bd = d; best = f; } } }
  return best;
}
function bar(label, v) { return `<div class="nb"><span>${label}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`; }
function showCard(f) {
  const p = f.profile || { traits: [], age: 'Adult', spot: '—', food: 'Flakes', needs: [0.8, 0.8, 0.8, 1] };
  card.innerHTML = `<button class="x" aria-label="Close">×</button><h2>${f.name}</h2><div class="sp">${f.species.label}</div>
    <div class="chips">${p.traits.map((t) => `<span>${t}</span>`).join('')}</div>
    <dl><dt>Age</dt><dd>${p.age}</dd><dt>Favorite spot</dt><dd>${p.spot}</dd><dt>Favorite food</dt><dd>${p.food}</dd></dl>
    <div class="needs">${bar('Hunger', p.needs[0])}${bar('Happy', p.needs[1])}${bar('Energy', p.needs[2])}${bar('Health', p.needs[3])}</div>`;
  card.classList.add('on'); card.querySelector('.x').onclick = () => setFocus(null);
}
function setFocus(f) {
  if (focus) focus.mul = 1;
  focus = f;
  if (f) { f.mul = 0.35; showCard(f); } else card.classList.remove('on');
}
canvas.addEventListener('pointerdown', (ev) => {
  if (feedMode) {
    const r = canvas.getBoundingClientRect(), sc = Math.max(r.width / IW, r.height / IH), dw = IW * sc, dh = IH * sc;
    const u = (ev.clientX - r.left - (r.width - dw) * 0.5) / dw, v = (ev.clientY - r.top - (r.height - dh) * 0.6) / dh;
    ray.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), camera);
    const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.8), hit)) { const fx = Math.max(-4, Math.min(4, hit.x)); if (net && hunger < 0.08) ui.toast('The fish are full'); else { dropFlakes(fx); net?.action('feed', { x: fx }); } }
    return;
  }
  const f = pick(ev); if (f) setFocus(f === focus ? null : f); else if (focus) setFocus(null); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setFocus(null); });
window.__focus = (i) => setFocus(fishes[i] ?? null);

let last = performance.now(), cTick = 0;
// ?fps=1 shows a live meter so frame rate can be checked on a real device
const meter = qs.has('fps') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 4px);z-index:30;font:11px ui-monospace,Menlo,monospace;color:#9f9;background:rgba(0,0,0,.6);padding:3px 6px;border-radius:6px;pointer-events:none;white-space:pre' }) : null;
let fpsN = 0, fpsT = 0, lastMeter = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  swayTime.value = t;
  cTick += dt; if (cTick > 0.05) { cTick = 0; caustic.update(t * 0.7); }
  applyTod(dt);
  if (focus) { const d = Math.max(6, focus.radius * 6.8); camGoal.set(focus.pos.x + 0.4, focus.pos.y + 0.1, focus.pos.z + d); lookGoal.set(focus.pos.x, focus.pos.y - d * 0.17, focus.pos.z); }
  else { camGoal.set(Math.sin(t * 0.13) * 0.35, 7.4 + Math.sin(t * 0.09) * 0.12, 30); lookGoal.set(0, 8.0, 0); }
  const fd = focus ? camera.position.distanceTo(focus.pos) : 30;
  bokeh.uniforms.focus.value += (fd - bokeh.uniforms.focus.value) * Math.min(1, dt * 4);
  bokeh.uniforms.aperture.value += ((focus ? 0.0007 : 0.00022) - bokeh.uniforms.aperture.value) * Math.min(1, dt * 3);
  bokeh.uniforms.maxblur.value += ((focus ? 0.016 : 0.006) - bokeh.uniforms.maxblur.value) * Math.min(1, dt * 3);
  fishBoost.value.set(0.26, 0.22, 0.16).multiplyScalar(0.3 + 0.7 * Math.min(1, cur.sunI / 12));
  if (window.__cam) { camGoal.set(...window.__cam.slice(0, 3)); lookGoal.set(...window.__cam.slice(3, 6)); }
  const kc = Math.min(1, dt * 3.2); camera.position.lerp(camGoal, kc); look.lerp(lookGoal, kc); camera.lookAt(look);
  updateFlakes(dt, t);
  fishes.forEach((f) => f.update(dt, rng, fishes));
  shafts.update(t); surf.mat.uniforms.uTime.value = t; grade.uniforms.uT.value = t; snow.update(dt, t); bubbles.update(dt, t); bubbles2.update(dt, t);
  watchPerf(dt);
  if (meter && (fpsN++, fpsT += (now - lastMeter) / 1000, lastMeter = now, fpsT) > 0.5) { meter.textContent = `${Math.round(fpsN / fpsT)} fps · q${quality}\n${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000) | 0}k tris`; fpsN = fpsT = 0; }
  if (LITE) { setTimeout(() => requestAnimationFrame(frame), 120); return; }   // ?lite=1: logic only, no drawing (used by the multi-browser tests)
  renderer.info.reset();
  composer.render();
  requestAnimationFrame(frame);
}
// ── multiplayer: server is authoritative; this client animates what it's told ──
const conn = document.getElementById('conn');
function applyTank(t) {
  if (t.shells != null) { shells = t.shells; ui.setShells(shells); }
  if (t.hunger != null) hunger = t.hunger;
  if (t.water != null) water = t.water;
  if (t.glass != null) { const was = glass; glass = t.glass; if (glass < 0.05 || Math.abs(glass - was) > 0.2) { gg.clearRect(0, 0, 195, 346); addAlgae(Math.round(glass * 900)); } }
  if (t.day) document.getElementById('day').textContent = 'DAY ' + String(t.day).padStart(3, '0');
}
function onNet(m) {
  const D = S.data;
  if (m.t === 'snapshot') { S.data = { you: m.you, tank: m.tank, members: m.members, online: m.online, activity: m.activity, messages: m.messages }; journal.splice(0, journal.length, ...m.journal.map((e) => ({ day: e.day, text: e.text }))); applyTank(m.tank); ui.refresh(); }
  else if (!D) return;
  else if (m.t === 'state') applyTank(m.tank);
  else if (m.t === 'feed') { if (m.by !== D.you.userId) { dropFlakes(m.x); ui.toast(`${nameOf(m.by)} fed the fish`); } }
  else if (m.t === 'event') { if (m.journal) journal.push({ day: m.journal.day, text: m.journal.text }); if (m.activity) { D.activity.push(m.activity); if (m.activity.userId !== D.you.userId && m.activity.type !== 'feed') ui.toast(m.activity.text); } ui.refresh(); }
  else if (m.t === 'presence') { D.online = m.online; ui.refresh(); }
  else if (m.t === 'members') { const before = D.members.length; D.members = m.members; if (m.members.length > before) ui.toast(`${m.members[m.members.length - 1].name} joined the tank`); ui.refresh(); }
  else if (m.t === 'chat') { D.messages.push(m.msg); if (m.msg.userId !== D.you.userId) ui.toast(`${m.msg.name}: ${m.msg.text}`); ui.refresh(); }
  else if (m.t === 'ack') { if (m.ok && m.delta > 0) ui.toast(`+${m.delta} shell${m.delta > 1 ? 's' : ''}`); else if (m.ok && m.applied === false) ui.toast('Nothing needed right now'); else if (!m.ok) ui.toast('Slow down a little'); }
}
runOnboarding().then((r) => { if (r.mode === 'net') net = new Live(onNet, (up) => { conn.classList.toggle('on', !up); }); });
// quality: auto-drops depth of field / resolution if the device can't hold ~30fps (?q=2 pins full quality)
let quality = qs.get('q') ? +qs.get('q') : 2, slow = 0, born = performance.now();
function setQuality(q) {
  quality = q; bokeh.enabled = q >= 2;
  const w = q >= 1 ? IW : 360, h = q >= 1 ? IH : 640;
  renderer.setSize(w, h, false); composer.setSize(w, h); grade.uniforms.uRes.value.set(w, h);
}
function watchPerf(dt) { if (qs.get('q') || performance.now() - born < 4000) return; slow = dt > 0.036 ? slow + 1 : Math.max(0, slow - 2); if (slow > 90 && quality > 0) { slow = 0; setQuality(quality - 1); } }
requestAnimationFrame(frame);
window.__tank = { fishes, bokeh, dropFlakes, setQuality, scene, renderer, camera, sun, hemi, amb, fill, bloom, TOD };
