// The journal's photographer. A moment is not snapped from wherever the camera happens to be: it is staged in the real tank, like a nature
// photographer would. The animals of the moment are framed from their best side (a three-quarter profile, a little below eye level, never
// from behind the back wall or through the sand), anything that would block or crowd them is kept out of the shot, and the picture is
// developed on its own: a long lens with a shallow depth of field (the subject sharp, the tank behind melting into soft bokeh), a little
// bloom on the light, a warm grade, gentle vignette and a whisper of film grain. Everything happens off screen; the player sees nothing.
import { encodePhoto } from '../game/photos.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// the darkroom: warm highlights, cool shadows, a soft vignette and fine grain (the look of a print, not a screenshot)
const DEVELOP = {
  uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, warm: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float seed, warm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0);                          // (already tone mapped, in display colour)
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, c * vec3(0.92, 1.0, 1.06), (1.0 - smoothstep(0.0, 0.45, l)) * 0.5);   // cool, sea-blue shadows
      c = mix(c, c * vec3(1.08, 1.02, 0.92), smoothstep(0.35, 1.0, l) * 0.55 * warm);  // warm, sunlit highlights
      c = (c - 0.5) * 1.12 + 0.5 - 0.03;                                               // a touch of contrast, a little deeper
      c = mix(vec3(l), c, 1.08);                                                       // and colour
      vec2 q = vUv - 0.5; q.x *= 1.25; float v = smoothstep(0.85, 0.25, length(q)); c *= mix(0.62, 1.0, v);      // the vignette
      c += (h(vUv * 811.0) - 0.5) * 0.035;                                             // grain
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function makeStudio({ renderer, scene, hideForDepth = [], W = 640, H = 480 }) {
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 200);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setSize(W, H); composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.004, maxblur: 0.014 });
  const bokehRender = bokeh.render.bind(bokeh);
  bokeh.render = (...a) => { const was = hideForDepth.map((o) => o.visible); hideForDepth.forEach((o) => (o.visible = false)); bokehRender(...a); hideForDepth.forEach((o, i) => (o.visible = was[i])); };      // (the light shafts and haze do not count as depth)
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.2, 0.5, 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());      // tone mapped into display colour, as the tank itself is
  const develop = new ShaderPass(DEVELOP), print = new THREE.WebGLRenderTarget(W, H);      // developed onto an ordinary 8-bit print, so it can be read back
  const px = new Uint8Array(W * H * 4), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), im = g.createImageData(W, H);
  const out = document.createElement('canvas'); out.width = 400; out.height = 300; const og = out.getContext('2d');

  // shoot: the camera at `from`, looking at `at`, focused on it; returns a small jpeg (or null)
  function shoot({ from, at, focusDist, aperture = 0.004, warm = 1 }) {
    camera.position.copy(from); camera.lookAt(at); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    bokeh.uniforms.focus.value = focusDist ?? from.distanceTo(at); bokeh.uniforms.aperture.value = aperture; develop.uniforms.seed.value = Math.random() * 100; develop.uniforms.warm.value = warm;
    const prev = renderer.getRenderTarget(); composer.render(0.016); develop.render(renderer, print, composer.readBuffer, 0, false); renderer.setRenderTarget(prev);
    renderer.readRenderTargetPixels(print, 0, 0, W, H, px);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);      // (the picture comes out upside down)
    g.putImageData(im, 0, 0); og.drawImage(cv, 0, 0, 400, 300);      // drawn down a size: crisp, and small enough to keep
    return encodePhoto(out);      // (WebP where the phone can make it: about half the size of a JPEG that looks the same)
  }
  return { camera, shoot };
}

// Where to stand. The subjects' middle and size; candidate views around their best side (side-on to the way the first one faces, turned a
// little toward the front glass), a little below or level with them, never behind the back wall, under the sand or out past the side glass.
// `seen(cameraPos, target)` says how much of them a view really shows; the first good one wins (in order of how flattering it is).
export function planShot({ subjects, seen, clutter = () => 0, why = null, sizes = null, bounds = { x: 5.6, back: -3.2, front: 15, floor: 0.45, top: 13 } }) {
  const box = new THREE.Box3(); subjects.forEach((o) => box.expandByObject(o)); if (box.isEmpty()) return null;
  let c = box.getCenter(new THREE.Vector3()), z = box.getSize(new THREE.Vector3()), s = Math.max(z.y * 1.3, Math.hypot(z.x, z.z) * 1.05, 0.22);
  if (sizes) { const ps = subjects.map((o) => o.getWorldPosition(new THREE.Vector3())); c = ps.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ps.length); s = Math.max(0.12, ...sizes, ps.length > 1 ? ps[0].distanceTo(ps[1]) + Math.max(...sizes) : 0); }      // (the animals' own size, where known: a model's box can be far larger than the animal)
  const d = (s < 0.3 ? 0.45 : 0.9) + s * 3.3;      // a long lens: far enough for the background to fall away, close enough to fill the frame (a tiny one, fresh from the egg: in close)
  const fw = subjects[0].getWorldDirection(new THREE.Vector3()); let side = Math.atan2(fw.z, fw.x) + Math.PI / 2; if (Math.hypot(fw.x, fw.z) < 0.3) side = Math.PI / 2; if (Math.sin(side) < 0) side += Math.PI;      // side-on to the way it faces: of its two sides, the one toward the glass
  if (subjects.length > 1) { const a = new THREE.Vector3(), b = new THREE.Vector3(); subjects[0].getWorldPosition(a); subjects[1].getWorldPosition(b); const along = Math.atan2(b.x - a.x, b.z - a.z); side = along + Math.PI / 2; if (Math.sin(side) < 0) side += Math.PI; }      // two: side by side, both faces in the picture
  const tries = [];
  for (const yaw of [0.35, -0.35, 0.7, -0.7, 0, 1.05, -1.05]) for (const pitch of [0.12, -0.04, 0.3]) tries.push([side + yaw, pitch]);
  tries.push([Math.PI / 2, 0.15], [Math.PI / 2 + 0.5, 0.2], [Math.PI / 2 - 0.5, 0.2]);      // and, failing all of those, straight through the front glass
  // the cheap tests first (where the lens would be, which way it looks, what stands in front of it); then the costly one, how much of the
  // animals really shows, for at most a few of the best (a photo should never make the tank stutter)
  const clear = [], cluttered = [];
  for (const [yaw, pitch] of tries) {
    const at = (k) => new THREE.Vector3(c.x + Math.cos(yaw) * Math.cos(pitch) * d * k, c.y + Math.sin(pitch) * d * k, c.z + Math.sin(yaw) * Math.cos(pitch) * d * k), out = (q) => q.z < bounds.back || q.z > bounds.front || Math.abs(q.x) > bounds.x || q.y < bounds.floor || q.y > bounds.top;
    let v = at(1); for (const k of [0.85, 0.7, 0.55]) { if (!out(v)) break; v = at(k); }      // (two far apart need a long way back: where that is outside the tank, the lens comes in along the same line; how much of them still shows is tested below)
    if (out(v)) { why?.push('bounds'); continue; }
    const dv = v.distanceTo(c) || d, dx = (c.x - v.x) / dv, dz = (c.z - v.z) / dv; if (dz > -0.72 || Math.abs(c.x + dx * 9) > 6.5) { why?.push('angle'); continue; }      /* (mostly from the front: the tank is wide and shallow, so a side view shows a wall) */
    (clutter(v, c) > 0 ? cluttered : clear).push(v);      // (with something in front of the lens: only if there is no clean view at all)
  }
  let best = null;
  for (const v of [...clear.slice(0, 3), ...(clear.length ? [] : cluttered.slice(0, 2)), ...(clear.length ? cluttered.slice(0, 1) : [])].slice(0, 4)) {
    const f = seen ? seen(v, c) : 1; why?.push('seen ' + f.toFixed(2)); if (f > 0.85) return { from: v, at: c, focusDist: v.distanceTo(c), size: s };
    if (!best || f > best.f) best = { from: v, at: c, focusDist: v.distanceTo(c), size: s, f };
  }
  return best && best.f > 0.7 ? best : null;
}
