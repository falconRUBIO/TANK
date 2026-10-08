// The fish look, shared by every voxel object in the tank: smoothed normals blended into the hard cubes,
// baked ambient occlusion, a little self-lit warmth in the shade, and (for plants) wind sway by height.
import * as THREE from 'three';
export const fishBoost = { value: new THREE.Vector3(0.2, 0.17, 0.12) };
export const swayTime = { value: 0 };

export function voxShading(mat, { sway = false, boost = 1 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBoost = fishBoost; sh.uniforms.uTime = swayTime; sh.uniforms.uBoostK = { value: boost };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aN; ${sway ? 'attribute vec2 aSw; uniform float uTime;' : ''}`)
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
        vec4 mvPosition = modelViewMatrix * mv;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBoost; uniform float uBoostK;')
      .replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uBoost * uBoostK;\n#include <opaque_fragment>');
  };
  return mat;
}
