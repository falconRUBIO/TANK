// The water-change scene, drawn over the 3D tank: the fish swim up and out of the top, the dirty water drains away,
// clean water rises, and the fish are dropped back in.
import * as THREE from 'three';

const W = 405, H = 720, RES = 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), seg = (t, a, b) => clamp((t - a) / (b - a));
const soft = (t) => t * t * (3 - 2 * t);
const rgb = (c, a = 1, k = 1) => `rgba(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0},${a})`;
const OCTO = [212, 84, 44];

export function makeWaterChange({ canvas, camera, fishes, surfY, sfx, tank }) {
  canvas.width = W * RES; canvas.height = H * RES; const g = canvas.getContext('2d');
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); probe.canvas.width = probe.canvas.height = 5;
  const v = new THREE.Vector3();
  const px = (p) => { v.copy(p).project(camera); return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H]; };
  const pxPerUnit = (p) => H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(p));
  let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const debris = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd(), r: 0.8 + rnd() * 1.8, ph: rnd() * 6.3, c: rnd() < 0.5 ? [118, 98, 44] : [78, 108, 44] }));
  let run = null; const drops = [], puffs = [];

  // the colour of a fish, read from what is on screen right now
  function colorAt(p) {
    try {
      const N = 13; probe.canvas.width = probe.canvas.height = N; probe.drawImage(tank, Math.round(p[0] * tank.width / W) - 6, Math.round(p[1] * tank.height / H) - 6, N, N, 0, 0, N, N);
      const d = probe.getImageData(0, 0, N, N).data, px2 = [];
      for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); px2.push([mx - mn, d[i], d[i + 1], d[i + 2]]); }
      px2.sort((a, b) => b[0] - a[0]); const top = px2.slice(0, 14); let r = 0, gg = 0, b = 0; for (const q of top) { r += q[1]; gg += q[2]; b += q[3]; }
      const c = [r / top.length, gg / top.length, b / top.length], m = (c[0] + c[1] + c[2]) / 3; return c.map((x) => clamp(m + (x - m) * 1.35 + 6, 30, 255));
    } catch { return [255, 150, 60]; }
  }

  // ── the fish, drawn flat and soft while it is out of the 3D tank
  function fish2D(f, x, y, sc, t, flip = 1, tilt = 0) {
    const L = f.len * sc, c = f.col, wag = Math.sin(t * 14 + f.ph) * 0.35;
    g.save(); g.translate(x, y); g.rotate(tilt); g.scale(flip, 1);
    if (f.id === 'octopus') {
      const R = L * 0.34; g.fillStyle = rgb(c, 1, 0.9);
      for (let i = 0; i < 6; i++) { const a = -0.5 + i * 0.36 + Math.sin(t * 6 + i) * 0.15; g.beginPath(); g.moveTo(-R * 0.7 + i * R * 0.28, R * 0.3); g.quadraticCurveTo(-R * 0.7 + i * R * 0.28 + Math.sin(a) * R, R * 1.2, -R * 0.9 + i * R * 0.34 + Math.sin(t * 7 + i) * R * 0.35, R * 2); g.lineWidth = R * 0.3; g.lineCap = 'round'; g.strokeStyle = rgb(c, 1, 0.85); g.stroke(); }
      const gr = g.createRadialGradient(-R * 0.3, -R * 0.4, 1, 0, 0, R * 1.2); gr.addColorStop(0, rgb(c, 1, 1.3)); gr.addColorStop(1, rgb(c, 1, 0.8)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -R * 0.1, R, R * 1.1, 0, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-R * 0.35, 0, R * 0.2, 0, 6.3); g.arc(R * 0.35, 0, R * 0.2, 0, 6.3); g.fill(); g.fillStyle = '#111'; g.fillRect(-R * 0.4, -R * 0.05, R * 0.12, R * 0.2); g.fillRect(R * 0.3, -R * 0.05, R * 0.12, R * 0.2);
    } else {
      const bh = L * 0.3;
      g.fillStyle = rgb(c, 1, 0.8); g.beginPath(); g.moveTo(L * 0.34, 0); g.lineTo(L * 0.62, -bh * 0.9 + wag * L * 0.12); g.lineTo(L * 0.58, wag * L * 0.12); g.lineTo(L * 0.62, bh * 0.9 + wag * L * 0.12); g.closePath(); g.fill();          // tail
      g.beginPath(); g.moveTo(-L * 0.1, -bh * 0.8); g.quadraticCurveTo(L * 0.05, -bh * 1.6, L * 0.25, -bh * 0.7); g.closePath(); g.fill();                                                                              // dorsal fin
      const gr = g.createLinearGradient(0, -bh, 0, bh); gr.addColorStop(0, rgb(c, 1, 1.15)); gr.addColorStop(0.55, rgb(c, 1, 1)); gr.addColorStop(1, rgb(c, 1, 1.35)); g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, 0, L * 0.4, bh, 0, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-L * 0.04, -bh * 0.35, L * 0.28, bh * 0.22, 0, 0, 6.3); g.fill();
      g.strokeStyle = rgb(c, 0.5, 0.6); g.lineWidth = 1; g.beginPath(); g.arc(-L * 0.18, 0, bh * 0.7, -0.9, 0.9); g.stroke();                                                                                     // gill
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-L * 0.27, -bh * 0.15, bh * 0.2, 0, 6.3); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(-L * 0.28, -bh * 0.15, bh * 0.11, 0, 6.3); g.fill();
    }
    g.restore();
  }

  const PUFF = (x, y, n = 3) => { for (let j = 0; j < n; j++) puffs.push({ x, y, r: 6 + j * 5, l: 1 - j * 0.15, ring: 1 }); };
  function plan() {
    const list = fishes.list.filter((f) => !f.dead && !f.visitor && f.group.visible !== false).slice(0, 8);
    return list.map((f, i) => { const at = px(f.pos); return { f, id: f.species.id, at, col: f.species.id === 'octopus' ? OCTO : colorAt(at), len: clamp(f.radius * 2 * pxPerUnit(f.pos), 40, 92), ph: i * 1.7, home: at, x: 40 + ((i * 97 + 53) % (W - 80)) }; });
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
      // a grimy tide line and streaks stay on the glass where the dirty water was
      if (r.dirt0 > 0 && drain > 0 && r.level < 0.995) { g.fillStyle = `rgba(110,98,46,${0.34 * r.dirt0 * (1 - fill)})`; g.fillRect(0, r.full, W, 3); for (let i = 0; i < 9; i++) g.fillRect(24 + i * 44 + (i * 13) % 17, r.full, 2, Math.max(0, wl - r.full) * (0.4 + ((i * 37) % 60) / 100)); }
    }
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
    // the fish, drawn while they are out of the 3D tank
    r.fish.forEach((a, i) => {
      const wag = Math.sin(t * 12 + a.ph) * 0.12;
      if (t < a.tUp) { r.shown.delete(i); return; }
      r.shown.add(i);
      if (t < a.tOut) { const k = ease(seg(t, a.tUp, a.tOut)), x = lerp(a.at[0], a.x, k) + Math.sin(k * 9 + a.ph) * 10 * (1 - k), y = lerp(a.at[1], r.full + 26, k); fish2D(a, x, y, 1, t, a.x > a.at[0] ? 1 : -1, -0.9 * Math.sin(k * Math.PI) * 0.7 + wag); }          // swims up to the surface
      else if (t < a.tGone) { const k = seg(t, a.tOut, a.tGone), x = a.x + k * 20, y = r.full + 26 - Math.sin(k * Math.PI * 0.5) * 120 - k * k * 80; fish2D(a, x, y, 1, t, 1, -1.1 + k * 0.4); if (!a.leapt) { a.leapt = true; sfx('splash'); PUFF(a.x, r.full + 28, 2); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: r.full + 28, vx: (rnd() - 0.5) * 120, vy: -120 - rnd() * 90, l: 0.8, s: 1.6 }); } }
      else if (t < a.tDrop) return;
      else if (t < a.tLand) { const k = seg(t, a.tDrop, a.tLand), x = a.x, y = lerp(-70, r.full + 28, k * k); fish2D(a, x, y, 1, t, 1, 1.2 - k * 0.3); }                                                    // dropped back in from the top
      else if (t < a.tHome) { if (!a.landed) { a.landed = true; sfx('splash'); PUFF(a.x, r.full + 30, 3); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: r.full + 30, vx: (rnd() - 0.5) * 110, vy: -90 - rnd() * 80, l: 0.7, s: 1.5 }); } const k = ease(seg(t, a.tLand, a.tHome)); fish2D(a, lerp(a.x, a.home[0], k), lerp(r.full + 30, a.home[1], k), 1, t, a.home[0] > a.x ? 1 : -1, wag); }
      else r.shown.delete(i);
    });
    // water thrown up by the fish
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.l -= dt * 1.2; if (d.l <= 0 || d.y > H) { drops.splice(i, 1); continue; } g.fillStyle = 'rgba(200,235,250,.85)'; g.beginPath(); g.arc(d.x, d.y, d.s, 0, 6.3); g.fill(); }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.l -= dt * 1.6; if (p.l <= 0) { puffs.splice(i, 1); continue; } g.strokeStyle = `rgba(235,252,255,${p.l})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(p.x, p.y, p.r + (1 - p.l) * 22, (p.r + (1 - p.l) * 22) * 0.3, 0, 0, 6.3); g.stroke(); }
    r.fish.forEach((a, i) => { a.f.group.visible = !r.shown.has(i); });
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
