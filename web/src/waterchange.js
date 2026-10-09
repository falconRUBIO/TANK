// The water-change scene, drawn over the 3D tank: the fish swim up and out of the top, the dirty water drains away,
// clean water rises, and the fish are dropped back in.
import * as THREE from 'three';

const W = 405, H = 720, RES = 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), seg = (t, a, b) => clamp((t - a) / (b - a));
const soft = (t) => t * t * (3 - 2 * t);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function makeWaterChange({ canvas, camera, fishes, surfY, sfx, haptic = () => {} }) {
  canvas.width = W * RES; canvas.height = H * RES; const g = canvas.getContext('2d');
  const v = new THREE.Vector3();
  const px = (p) => { v.copy(p).project(camera); return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H]; };
  const pxPerUnit = (p) => H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(p));
  let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const debris = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd(), r: 0.8 + rnd() * 1.8, ph: rnd() * 6.3, c: rnd() < 0.5 ? [118, 98, 44] : [78, 108, 44] }));
  let run = null; const drops = [], puffs = [];

  const PUFF = (x, y, n = 3) => { for (let j = 0; j < n; j++) puffs.push({ x, y, r: 6 + j * 5, l: 1 - j * 0.15, ring: 1 }); };
  // your real fish are moved through the scene: a screen position is turned back into a spot in the tank at the fish's own depth
  const dir = new THREE.Vector3(), fwd = new THREE.Vector3(), eul = new THREE.Euler();
  function place3D(a, x, y, pitch, face) {
    v.set((x / W) * 2 - 1, 1 - (y / H) * 2, 0.5).unproject(camera); dir.copy(v).sub(camera.position).normalize(); camera.getWorldDirection(fwd);
    const f = a.f; f.pos.copy(camera.position).addScaledVector(dir, a.depth / Math.max(0.2, dir.dot(fwd)));
    f.heading = face > 0 ? 0 : Math.PI; f.pitch = pitch; f.roll = 0; f.group.visible = true;
    f.group.position.copy(f.pos); f.group.quaternion.setFromEuler(eul.set(0, f.heading, pitch, 'YZX'));
    if (f.emote) { f.emote.visible = false; f.emote.material.opacity = 0; }
  }
  function plan() {
    const list = fishes.list.filter((f) => !f.dead && !f.visitor && f.group.visible !== false).slice(0, 8);
    return list.map((f, i) => { camera.getWorldDirection(fwd); const at = px(f.pos), depth = f.pos.clone().sub(camera.position).dot(fwd); return { f, at, depth, ph: i * 1.7, home: at, x: 70 + ((i * 97 + 53) % (W - 140)) }; });
  }

  function start({ dirt0 = 1, dispatch, done }) {
    if (run) return false;
    const fish = plan(), n = fish.length, full = clamp(px(new THREE.Vector3(0, surfY(), 0))[1], 0, 90), low = H + 4;
    const up0 = 0.5;                                              // the fish start to rise while the water is still going murky
    fish.forEach((a, i) => { a.tUp = up0 + i * 0.14; a.tOut = a.tUp + 0.95; a.tGone = a.tOut + 0.4; });
    const outAll = n ? fish[n - 1].tGone : up0 + 0.3, dr0 = outAll + 0.15, drain = dr0 + 1.9, fill0 = drain + 0.35, fill = fill0 + 2.2;
    fish.forEach((a, i) => { a.tDrop = fill - 0.75 + i * 0.12; a.tLand = a.tDrop + 0.4; a.tHome = a.tLand + 0.55; });
    const end = (n ? fish[n - 1].tHome : fill) + 0.25;
    run = { fish, n, full, low, t: 0, dirt0, dispatch, done, T: { dr0, drain, fill0, fill, end }, dispatched: false, ok: true, level: 1, dirt: 0, shown: new Set() };
    return true;
  }

  function frame(dt) {
    if (!run) return false;
    const r = run, T = r.T; r.t += dt; const t = r.t;
    g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, W, H);
    const drain = ease(seg(t, T.dr0, T.drain)), fill = ease(seg(t, T.fill0, T.fill));
    r.level = 1 - drain + fill;
    r.dirt = r.dirt0 * soft(seg(t, 0, 0.7)) * (1 - soft(seg(t, T.fill0 + 0.2, T.fill - 0.2)));
    const wl = lerp(r.low, r.full, clamp(r.level)), flow = Math.abs(Math.sin(Math.PI * clamp(r.level)));
    const surfaceY = (x) => wl + Math.sin(x * 0.05 + t * 2.4) * (1.4 + 3.2 * flow) + Math.sin(x * 0.11 - t * 1.9) * (0.8 + 1.8 * flow);
    // the empty glass above the water
    if (wl > r.full + 1) {
      const a = soft(seg(wl - r.full, 0, 50)); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); for (let x = W; x >= 0; x -= 6) g.lineTo(x, Math.min(H, surfaceY(x))); g.closePath();
      const ag = g.createLinearGradient(0, 0, 0, Math.min(H, wl)); ag.addColorStop(0, `rgba(238,244,240,${0.5 * a})`); ag.addColorStop(1, `rgba(214,230,226,${0.62 * a})`); g.fillStyle = ag; g.fill();
      g.fillStyle = `rgba(255,255,255,${0.2 * a})`; g.fillRect(14, 0, 5, Math.min(H, wl)); g.fillRect(W - 20, 0, 3, Math.min(H, wl));
      // grime clings to the glass where the dirty water stood: a tide line, a thin film and a few slow drips that end in a bead
      if (r.dirt0 > 0 && drain > 0 && r.level < 0.995) {
        const ga = r.dirt0 * (1 - fill), band = Math.max(0, wl - r.full); g.fillStyle = `rgba(112,100,48,${0.09 * ga})`; g.fillRect(0, r.full, W, band); g.fillStyle = `rgba(110,98,46,${0.3 * ga})`; g.fillRect(0, r.full, W, 2.5);
        for (let i = 0; i < 12; i++) { const x = 18 + i * 33 + (i * 13) % 11, len = band * (0.35 + ((i * 37) % 55) / 100), y0 = r.full + 2; const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, `rgba(112,100,48,${0.28 * ga})`); gr.addColorStop(1, `rgba(112,100,48,${0.12 * ga})`); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 1.4, y0); g.lineTo(x + 1.4, y0); g.lineTo(x + 0.7, y0 + len); g.lineTo(x - 0.7, y0 + len); g.fill(); g.fillStyle = `rgba(112,100,48,${0.3 * ga})`; g.beginPath(); g.arc(x, y0 + len, 2.2, 0, 6.3); g.fill(); }
      }
    }
    if (r.level < 0.25) { const fa = soft(seg(0.25 - r.level, 0, 0.2)) * r.dirt0 * (1 - fill); const fg = g.createLinearGradient(0, H * 0.7, 0, H); fg.addColorStop(0, 'rgba(90,76,34,0)'); fg.addColorStop(1, `rgba(90,76,34,${0.4 * fa})`); g.fillStyle = fg; g.fillRect(0, H * 0.7, W, H * 0.3); g.fillStyle = `rgba(190,170,110,${0.18 * fa})`; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(60 + i * 70 + (i * 29) % 30, H - 60 - (i % 3) * 36, 34, 7, 0, 0, 6.3); g.fill(); } }
    // the water
    if (wl < H) {
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, surfaceY(x)); g.lineTo(W, H); g.closePath();
      const wg = g.createLinearGradient(0, wl, 0, H); wg.addColorStop(0, `rgba(122,108,46,${0.5 * r.dirt})`); wg.addColorStop(1, `rgba(62,66,26,${0.66 * r.dirt})`); g.fillStyle = wg; g.fill();
      if (r.dirt < 0.9 && r.level > 0.1) { const cg = g.createLinearGradient(0, wl, 0, wl + 140); cg.addColorStop(0, `rgba(190,238,255,${0.34 * (1 - r.dirt)})`); cg.addColorStop(1, 'rgba(190,238,255,0)'); g.fillStyle = cg; g.fill(); }
      g.beginPath(); for (let x = 0; x <= W; x += 6) x ? g.lineTo(x, surfaceY(x)) : g.moveTo(x, surfaceY(x));
      g.strokeStyle = r.dirt > 0.3 ? 'rgba(214,200,140,.9)' : 'rgba(225,248,255,.95)'; g.lineWidth = 2.4; g.stroke();
      if (r.dirt > 0.3) { g.fillStyle = 'rgba(190,176,110,.7)'; for (let x = (t * 14) % 22; x < W; x += 22) { g.beginPath(); g.ellipse(x, surfaceY(x) - 1, 6, 1.6, 0, 0, 6.3); g.fill(); } }
      // debris sinks and swirls as the level falls
      for (const d of debris) {
        const y0 = lerp(wl + 6, H - 6, d.y); if (r.dirt < 0.03 || y0 < wl + 4) continue;
        g.fillStyle = rgb(d.c, 0.85 * r.dirt); g.beginPath(); g.arc(d.x + Math.sin(t * 0.8 + d.ph) * 8, y0 + Math.cos(t * 0.6 + d.ph) * 6, d.r, 0, 6.3); g.fill();
      }
      if (fill > 0 && fill < 1) {
        for (let i = 0; i < 26; i++) { const x = (i * 71 + 13) % W, y = lerp(H, wl, ((t * 0.5 + i * 0.137) % 1)); g.strokeStyle = 'rgba(235,252,255,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(x + Math.sin(t * 3 + i) * 4, y, 1.5 + (i % 3), 0, 6.3); g.stroke(); }
        const sp = Math.sin(Math.PI * fill); for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(255,255,255,${0.7 * sp * rnd()})`; g.fillRect(rnd() * W, lerp(wl, H, rnd()), 2, 2); }
      }
    }
    { const sw = seg(t, T.fill - 0.9, T.fill + 0.3); if (sw > 0 && sw < 1) { const x = lerp(-80, W + 80, ease(sw)), gl = g.createLinearGradient(x - 70, 0, x + 70, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, `rgba(235,252,255,${0.32 * Math.sin(Math.PI * sw)})`); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x - 70, r.full, 140, H - r.full); } }
    // your fish: up to the surface, out of the top, and back in
    r.fish.forEach((a, i) => {
      const top = Math.max(r.full + 26, 96), face = a.x > a.at[0] ? 1 : -1;
      if (t < a.tUp) { r.shown.delete(i); return; }
      r.shown.add(i);
      if (t < a.tOut) { const k = ease(seg(t, a.tUp, a.tOut)); place3D(a, lerp(a.at[0], a.x, k) + Math.sin(k * 9 + a.ph) * 10 * (1 - k), lerp(a.at[1], top, k), 0.2 + 0.95 * Math.sin(k * Math.PI), face); }
      else if (t < a.tGone) { const k = seg(t, a.tOut, a.tGone); place3D(a, a.x + k * 26 * face, top - Math.sin(k * Math.PI * 0.5) * 170 - k * k * 60, 1.05 - k * 0.4, face); if (!a.leapt) { a.leapt = true; sfx('splash'); haptic(8); PUFF(a.x, top + 4, 2); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: top + 4, vx: (rnd() - 0.5) * 120, vy: -120 - rnd() * 90, l: 0.8, s: 1.6 }); } }
      else if (t < a.tDrop) { r.shown.add(i); a.f.group.visible = false; }
      else if (t < a.tLand) { const k = seg(t, a.tDrop, a.tLand); place3D(a, a.x, lerp(-90, r.full + 40, k * k), -1.1, face); }
      else if (t < a.tHome) { if (!a.landed) { a.landed = true; sfx('splash'); haptic(8); PUFF(a.x, r.full + 42, 3); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: r.full + 42, vx: (rnd() - 0.5) * 110, vy: -90 - rnd() * 80, l: 0.7, s: 1.5 }); } const k = ease(seg(t, a.tLand, a.tHome)); place3D(a, lerp(a.x, a.home[0], k), lerp(r.full + 42, a.home[1], k), -0.5 * (1 - k), a.home[0] > a.x ? 1 : -1); }
      else r.shown.delete(i);
    });
    // water thrown up by the fish
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.l -= dt * 1.2; if (d.l <= 0 || d.y > H) { drops.splice(i, 1); continue; } g.fillStyle = 'rgba(200,235,250,.85)'; g.beginPath(); g.arc(d.x, d.y, d.s, 0, 6.3); g.fill(); }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.l -= dt * 1.6; if (p.l <= 0) { puffs.splice(i, 1); continue; } g.strokeStyle = `rgba(235,252,255,${p.l})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(p.x, p.y, p.r + (1 - p.l) * 22, (p.r + (1 - p.l) * 22) * 0.3, 0, 0, 6.3); g.stroke(); }
    // the real change happens as the clean water starts to come in
    if (t >= T.fill0 && !r.dispatched) { r.dispatched = true; Promise.resolve(r.dispatch()).then((ok) => { if (ok === false) r.ok = false; }); }
    if (t >= T.end || (!r.ok && t > T.drain)) { finish(); return false; }
    return true;
  }
  function finish() {
    if (!run) return; const r = run; run = null; drops.length = puffs.length = 0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); r.fish.forEach((a) => { a.f.group.visible = true; });
    if (!r.dispatched) Promise.resolve(r.dispatch()); r.done?.(r.ok);
  }
  return { start, frame, get active() { return !!run; }, get t() { return run ? run.t : -1; }, finish };
}
