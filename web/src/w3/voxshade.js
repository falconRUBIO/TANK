// The fish look, shared by every voxel object in the tank: smoothed normals blended into the hard cubes,
// baked ambient occlusion, a little self-lit warmth in the shade, and (for plants) wind sway by height.
import * as THREE from 'three';
export const fishBoost = { value: new THREE.Vector3(0.2, 0.17, 0.12) };
export const swayTime = { value: 0 };
// animals near the plants (x, y, z, reach): leaves bend away from them, so an octopus crawling through sea grass or a fish nosing a fan parts the leaves instead of passing through them
export const PUSH_N = 16;
export const plantPush = { value: Array.from({ length: PUSH_N }, () => new THREE.Vector4(0, -99, 0, 0)) };

export function voxShading(mat, { sway = false, boost = 1 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBoost = fishBoost; sh.uniforms.uTime = swayTime; sh.uniforms.uBoostK = { value: boost }; if (sway) sh.uniforms.uPush = plantPush;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aN; ${sway ? `attribute vec2 aSw; uniform float uTime; uniform vec4 uPush[${PUSH_N}];` : ''}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (dot(aN, aN) > 0.01) objectNormal = normalize(mix(objectNormal, aN, 0.82));`);
    if (sway) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      float swk = aSw.x * aSw.x; float swp = aSw.y;
        vec4 mv = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mv = instanceMatrix * mv;
        #endif
        mv.x += (sin(uTime * 1.1 + swp + swk * 2.0) * 0.16 + sin(uTime * 2.3 + swp * 2.0) * 0.03) * swk;
        mv.z += cos(uTime * 0.9 + swp) * 0.07 * swk;
        vec4 wp = modelMatrix * mv; float bendK = smoothstep(0.0, 0.35, aSw.x);
        for (int i = 0; i < ${PUSH_N}; i++) { vec4 q = uPush[i]; vec3 d = wp.xyz - q.xyz; float hd = length(d.xz); float rr = q.w * (1.0 - smoothstep(q.w * 0.8, q.w * 1.6, abs(d.y)));
          if (hd < rr) wp.xz += (hd > 0.001 ? d.xz / hd : vec2(1.0, 0.0)) * (rr - hd) * bendK; }
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBoost; uniform float uBoostK;')
      .replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uBoost * uBoostK;\n#include <opaque_fragment>');
  };
  return mat;
}
