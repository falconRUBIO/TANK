// The fish look, shared by every voxel object in the tank: smoothed normals blended into the hard cubes,
// baked ambient occlusion, a little self-lit warmth in the shade, and (for plants) wind sway by height.
import * as THREE from 'three';
export const fishBoost = { value: new THREE.Vector3(0.2, 0.17, 0.12) };
export const swayTime = { value: 0 };
// the sun through the moving surface, on everything: the caustic map and its clock (stage sets them each frame), strength 0..1
export const causTex = { value: null }, causT = { value: 0 }, causK = { value: 0.5 };
// animals near the plants (x, y, z, reach): leaves bend away from them, so an octopus crawling through sea grass or a fish nosing a fan parts the leaves instead of passing through them
export const PUSH_N = 16;
export const plantPush = { value: Array.from({ length: PUSH_N }, () => new THREE.Vector4(0, -99, 0, 0)) };
// where seahorses are holding on (x, y, z of the grip, reach of the coils): that part of the plant is held still and the leaves are pressed out of the way of the tail
export const HOLD_N = 4;
export const plantHold = { value: Array.from({ length: HOLD_N }, () => new THREE.Vector4(0, -99, 0, 0)) };

export function voxShading(mat, { sway = false, boost = 1 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBoost = fishBoost; sh.uniforms.uTime = swayTime; sh.uniforms.uBoostK = { value: boost }; sh.uniforms.uCaus = causTex; sh.uniforms.uCausT = causT; sh.uniforms.uCausK = causK; if (sway) { sh.uniforms.uPush = plantPush; sh.uniforms.uHold = plantHold; }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aN; varying vec3 vWp;
      ${sway ? `attribute vec2 aSw; uniform float uTime; uniform vec4 uPush[${PUSH_N}]; uniform vec4 uHold[${HOLD_N}];` : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 wq = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wq = instanceMatrix * wq;
          #endif
          vWp = (modelMatrix * wq).xyz; }
        #ifdef USE_INSTANCING
        #else
        #endif`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (dot(aN, aN) > 0.01) objectNormal = normalize(mix(objectNormal, aN, 0.72));      // (a little more of the cube in each face: the voxels read)`);
    if (sway) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      float swk = aSw.x * aSw.x; float swp = aSw.y;
        vec4 mv = vec4(transformed, 1.0), cv = vec4(0.0, 0.0, 0.0, 1.0);
        #ifdef USE_INSTANCING
          mv = instanceMatrix * mv; cv = instanceMatrix * cv;
        #endif
        // a seahorse holding on keeps that part of the plant still
        vec4 cw0 = modelMatrix * cv; float steady = 1.0;
        vec2 press = vec2(0.0);
        for (int i = 0; i < ${HOLD_N}; i++) { vec4 q = uHold[i]; if (q.w <= 0.0) continue; vec3 d = cw0.xyz - q.xyz; steady = min(steady, smoothstep(0.3, 0.9, length(d)));
          float hd = length(d.xz); if (abs(d.y) < 0.22 && hd > 0.06 && hd < q.w) press += d.xz / hd * (q.w - hd); }      // a leaf in the way of the coils is pressed just clear of them; the stem itself stays
        vec2 sway = vec2((sin(uTime * 1.1 + swp + swk * 2.0) * 0.16 + sin(uTime * 2.3 + swp * 2.0) * 0.03) * swk, cos(uTime * 0.9 + swp) * 0.07 * swk) * steady;
        mv.xz += sway; cv.xz += sway;
        vec4 wp = modelMatrix * mv, cw = modelMatrix * cv; wp.xz += press; cw.xz += press; float bendK = smoothstep(0.0, 0.35, aSw.x);
        // the push is worked out once for the whole voxel, from its center, and the voxel moves as one: a leaf slides aside at its own size instead of stretching
        vec2 bend = vec2(0.0);
        for (int i = 0; i < ${PUSH_N}; i++) { vec4 q = uPush[i]; vec3 d = cw.xyz - q.xyz; float hd = length(d.xz); float rr = q.w * (1.0 - smoothstep(q.w * 0.8, q.w * 1.6, abs(d.y)));
          if (hd < rr) bend += (hd > 0.001 ? d.xz / hd : vec2(1.0, 0.0)) * q.w * 0.45 * (1.0 - smoothstep(0.0, rr, hd)) * bendK; }      // a gentle lean that fades smoothly with distance, so neighbouring voxels move almost together and a blade stays in one piece
        wp.xz += bend;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;`);      // (vWp for a swaying plant is set by worldpos_vertex above, from the unswayed voxel: near enough for light that drifts anyway)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBoost; uniform float uBoostK; uniform sampler2D uCaus; uniform float uCausT, uCausK; varying vec3 vWp; varying float vThin;')
      
      .replace('#include <opaque_fragment>', `outgoingLight += diffuseColor.rgb * uBoost * uBoostK;
        { float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0); outgoingLight *= 1.0 - 0.2 * fres; }      // the edges of each thing fall off into shade: round, solid, not a flat cut-out
        { vec2 cw = vWp.xz; float c1 = texture2D(uCaus, cw * 0.27 + vec2(uCausT * 0.012, uCausT * 0.006)).r, c2 = texture2D(uCaus, cw * 0.39 + vec2(-uCausT * 0.008, uCausT * 0.01) + 0.41).r;
          float cl = smoothstep(0.6, 0.95, c1) + 0.5 * smoothstep(0.64, 0.98, c2), up = clamp(normal.y * 0.7 + 0.3, 0.0, 1.0), depthK = clamp(vWp.y / 14.0, 0.25, 1.0);      // light from the surface plays over backs and tops, less so deep down
          outgoingLight += diffuseColor.rgb * vec3(1.0, 0.95, 0.8) * cl * uCausK * up * depthK; }
        #include <opaque_fragment>`);
  };
  return mat;
}
