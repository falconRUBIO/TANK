// WebGL2 lighting pass over the pixel-art scene.
//  pass 1  – light shafts through the ruins (screen-space occlusion march), cast shadows,
//            animated caustics, point lights (lantern), depth fog, surface shimmer
//  pass 2  – bloom, filmic tonemap, split-toned grade, vignette, dither
const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p*0.5+0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p,0.,1.); }`;

const FS_LIGHT = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uColor, uAux;
uniform vec2 uScene; uniform float uT;
uniform vec2 uSun; uniform vec3 uSunCol; uniform float uSunI, uBeamI, uCausI;
uniform vec3 uAmb, uFog; uniform float uFogI;
uniform vec2 uLamp; uniform vec3 uLampCol; uniform float uLampI;
uniform float uNight;

float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ return vn(p)*.55 + vn(p*2.03+7.1)*.3 + vn(p*4.1+3.7)*.15; }

float caustic(vec2 uv, float t){
  const float TAU = 6.28318530718;
  vec2 p = mod(uv*TAU, TAU) - 250.0; vec2 i = p; float c = 1.0; float inten = .005;
  for(int n=0;n<4;n++){ float tt = t*(1.0-(3.5/float(n+1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0);
}
float occAt(vec2 sp){ if(sp.y < 0.) return 0.; vec2 uv = clamp(sp/uScene, 0.001, 0.999); return texture(uAux, uv).r; }

void main(){
  vec2 sp = vUv * uScene;
  vec2 q = (floor(sp) + 0.5) / uScene;              // snap to the pixel-art grid
  vec4 cs = texture(uColor, q);
  vec4 ax = texture(uAux, q);
  float depth = ax.g;
  vec3 albedo = cs.rgb;

  // ── sun: direction + march for shadow / god rays ──
  vec2 toL = uSun - sp; float dL = length(toL); vec2 dir = toL / dL;
  float T = 1.0;                                     // direct light reaching this pixel
  float thick = 0.0; bool inside = ax.r > 0.5;       // distance travelled through our own object
  for (int i = 1; i <= 34; i++) {
    vec2 pp = sp + dir * (float(i) * 4.5 + 1.0);
    float oc = occAt(pp);
    if (inside) { if (oc > 0.5) { thick += 4.5; continue; } inside = false; }
    T *= 1.0 - oc * 0.55;
  }
  float selfAtt = mix(exp(-thick / 17.0), 1.0, 0.08);
  // volumetric shafts: same ray, but we want the pixel's own air column, so skip own occlusion
  float own = ax.r;
  float shaftT = T;
  float ang = atan(sp.x - uSun.x, sp.y - uSun.y);
  float stripes = fbm(vec2(ang * 17.0 + uT * 0.04, uT * 0.03)) ;
  stripes = smoothstep(0.32, 0.78, stripes);
  float stripes2 = smoothstep(0.4, 0.8, fbm(vec2(ang * 41.0 - uT * 0.07, 4.0)));
  float Tm = mix(0.42, 1.0, shaftT);
  float beam = Tm * (0.35 + 0.65 * stripes) * (0.75 + 0.25 * stripes2) * exp(-dL * 0.0042) * (1.0 - own * 0.9);
  beam *= smoothstep(0.0, 18.0, sp.y) * (1.0 - 0.5 * sp.y / uScene.y) * (0.3 + 0.7 * smoothstep(0.2, 0.62, depth));

  // ── caustics (quantised to 2px so they read as pixel art) ──
  vec2 cp = floor(sp / 2.0) * 2.0;
  float c1 = caustic(cp / vec2(86.0, 86.0) + vec2(0.0, 0.0), uT * 0.55);
  float c2 = caustic(cp / vec2(61.0, 61.0) + 0.37, uT * 0.4 + 9.0);
  float cau = clamp(c1 * 0.9 + c2 * 0.6, 0.0, 1.6);
  float cFall = exp(-sp.y / (uScene.y * 0.48));
  float recv = mix(1.0, 0.55, depth) ;

  // ── lighting the albedo ──
  float lightAmt = uSunI * T * selfAtt;
  float near = 1.0 - smoothstep(0.3, 0.7, depth);                // fish, foreground plants
  vec3 amb = mix(uAmb, vec3(dot(uAmb, vec3(0.33))) * vec3(1.25, 1.18, 1.1) + 0.06, 0.55 * near);
  vec3 lit = albedo * (amb + uSunCol * lightAmt * (0.35 + cau * 1.55 * cFall * uCausI * recv));
  float lum0 = dot(lit, vec3(0.299, 0.587, 0.114));
  lit = mix(vec3(lum0), lit, 1.0 + 0.45 * near);                  // keep fish colours rich
  // soft contact shading under occluders
  lit *= 1.0 - 0.25 * own * (1.0 - T);

  // lantern point light with shadow test
  vec2 dl = uLamp - sp; float dd = length(dl);
  float vis = 1.0;
  for (int i = 1; i <= 10; i++) { vec2 pp = sp + dl * (float(i) / 11.0); vis *= 1.0 - occAt(pp) * 0.22 * step(6.0, dd); }
  float fall = 1.0 / (1.0 + pow(dd / 68.0, 2.0));
  float flick = 1.0 + 0.06 * sin(uT * 9.0) + 0.04 * sin(uT * 14.3 + 1.0);
  vec3 lampL = uLampCol * uLampI * fall * vis * flick;
  lit += (albedo * 1.6 + 0.04) * lampL * (0.8 + 0.6 * cau * 0.5);
  lit += uLampCol * uLampI * 0.3 * exp(-dd / 15.0) * flick;     // halo hugging the lamp

  // emissive pixels (lantern window, bubbles)
  lit += albedo * ax.b * (1.4 + uNight * 2.2);

  // depth fog / atmospheric perspective
  float fogA = clamp(smoothstep(0.3, 1.0, depth) * 0.82 + 0.0, 0.0, 1.0) * uFogI;
  vec3 fogC = uFog * (0.55 + 0.45 * (1.0 - sp.y / uScene.y));
  vec3 col = mix(lit, fogC + uSunCol * beam * 0.05, fogA);

  // god rays (additive scatter)
  vec3 beamCol = mix(uSunCol, vec3(0.7, 0.9, 1.0), 0.25);
  col += beamCol * beam * uBeamI * (0.5 + 0.5 * (1.0 - depth * 0.4));
  // light dust
  float dust = pow(vn(sp * 0.9 + vec2(uT * 2.0, uT * 5.0)), 6.0) * beam * 1.2;
  col += beamCol * dust * uBeamI * 0.6;

  // surface shimmer
  float surf = 4.0 + sin(sp.x * 0.22 + uT * 1.4) * 1.2 + sin(sp.x * 0.09 - uT * 0.9) * 1.6;
  float sfN = fbm(vec2(sp.x * 0.08 + uT * 0.12, sp.y * 0.3));
  if (sp.y < surf) col = mix(col, uSunCol * (0.7 + 0.8 * sfN) * (0.35 + uSunI * 0.9) + uAmb * 0.4, 0.8);
  col += uSunCol * smoothstep(2.5, 0.0, abs(sp.y - surf)) * 0.45 * uSunI * (0.5 + sfN);
  col += uSunCol * cau * smoothstep(40.0, 0.0, sp.y) * 0.16 * uSunI * (1.0 - cs.a * 0.0);

  o = vec4(col, 1.0);
}`;

const FS_POST = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uPx; uniform float uBloom, uNight, uExposure; uniform vec3 uTint;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 base = texture(uTex, uv).rgb;
  vec3 bl = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 24; i++) {
    float a = float(i) * 2.39996, r = sqrt(float(i) + 0.5) * 3.2;
    vec3 s = texture(uTex, uv + vec2(cos(a), sin(a)) * r * uPx).rgb;
    float l = dot(s, vec3(0.299, 0.587, 0.114));
    float w = smoothstep(0.62, 1.25, l);
    bl += s * w; wsum += 1.0;
  }
  bl /= wsum;
  vec3 col = (base + bl * uBloom * 2.6) * uExposure;
  col = aces(col);
  // split tone: cool shadows, warm highlights
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col * vec3(0.90, 1.0, 1.12), col * vec3(1.07, 1.02, 0.93), smoothstep(0.3, 0.85, l));
  col = mix(vec3(l), col, 1.14) * uTint;
  vec2 d = vUv - 0.5; float vig = smoothstep(0.95, 0.25, length(d * vec2(1.05, 0.92)));
  col *= mix(0.55, 1.0, vig);
  col = pow(col, vec3(0.96));
  col += (h21(gl_FragCoord.xy) - 0.5) / 160.0;
  o = vec4(col, 1.0);
}`;

function sh(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function prog(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u };
}

export class Lighting {
  constructor(canvas, W, H, scale = 3) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl; this.W = W; this.H = H;
    canvas.width = W * scale; canvas.height = H * scale;
    this.ow = canvas.width; this.oh = canvas.height;
    this.pl = prog(gl, FS_LIGHT); this.pp = prog(gl, FS_POST);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = (filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    this.tColor = tex(gl.NEAREST); this.tAux = tex(gl.NEAREST);
    this.tLit = tex(gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, this.tLit);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.ow, this.oh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tLit, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  upload(t, canvas, unit) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }
  render(colorCanvas, auxCanvas, P, t) {
    const gl = this.gl;
    this.upload(this.tColor, colorCanvas, 0); this.upload(this.tAux, auxCanvas, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo); gl.viewport(0, 0, this.ow, this.oh);
    const { p, u } = this.pl; gl.useProgram(p);
    gl.uniform1i(u.uColor, 0); gl.uniform1i(u.uAux, 1);
    gl.uniform2f(u.uScene, this.W, this.H); gl.uniform1f(u.uT, t);
    gl.uniform2f(u.uSun, P.sun[0], P.sun[1]); gl.uniform3fv(u.uSunCol, P.sunCol);
    gl.uniform1f(u.uSunI, P.sunI); gl.uniform1f(u.uBeamI, P.beamI); gl.uniform1f(u.uCausI, P.causI);
    gl.uniform3fv(u.uAmb, P.amb); gl.uniform3fv(u.uFog, P.fog); gl.uniform1f(u.uFogI, P.fogI);
    gl.uniform2f(u.uLamp, P.lamp[0], P.lamp[1]); gl.uniform3fv(u.uLampCol, P.lampCol); gl.uniform1f(u.uLampI, P.lampI);
    gl.uniform1f(u.uNight, P.night);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.ow, this.oh);
    const q = this.pp; gl.useProgram(q.p);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tLit);
    gl.uniform1i(q.u.uTex, 2); gl.uniform2f(q.u.uPx, 1 / this.ow, 1 / this.oh);
    gl.uniform1f(q.u.uBloom, P.bloom); gl.uniform1f(q.u.uNight, P.night); gl.uniform1f(q.u.uExposure, P.exposure); gl.uniform3fv(q.u.uTint, P.tint);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
