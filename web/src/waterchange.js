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
  const debris = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd(), r: 0.8 + rnd() * 1.8, ph: rnd() * 6.3, c: rnd() < 0.5 ? [118, 98, 44] : [78, 108, 44], k: rnd() * 0.55 }));
  let run = null; const drops = [], puffs = [], rivs = [], rings = [];
  // the siphon: its mouth down on the sand at the right, the hose going up and out over the rim
  const XI = W * 0.8, YI = H - 64, hoseAt = (u) => { const x0 = XI, y0 = YI, x1 = W * 0.86, y1 = -14, cx = W * 0.95, cy = H * 0.35; const a = 1 - u; return [a * a * x0 + 2 * a * u * cx + u * u * x1, a * a * y0 + 2 * a * u * cy + u * u * y1]; };
  const POUR = W * 0.24;      // where the fresh water pours in

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
    const outAll = n ? fish[n - 1].tGone : up0 + 0.3, dr0 = outAll + 0.45, drain = dr0 + 2.6, fill0 = drain + 0.45, fill = fill0 + 2.8;      // (the siphon is lowered in first, and takes its time; the fresh water pours in)
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
    r.dirt = r.dirt0 * soft(seg(t, 0, 0.7)) * (1 - soft(seg(t, T.fill0 - 0.1, T.fill0 + 0.7)));      // the fresh water is clean from the moment it comes in
    const wl = lerp(r.low, r.full, clamp(r.level)), flow = Math.abs(Math.sin(Math.PI * clamp(r.level)));
    const surfaceY = (x) => wl + Math.sin(x * 0.05 + t * 2.4) * (1.4 + 3.2 * flow) + Math.sin(x * 0.11 - t * 1.9) * (0.8 + 1.8 * flow);
    // the empty glass above the water
    if (wl > r.full + 1) {
      const a = soft(seg(wl - r.full, 0, 50)); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); for (let x = W; x >= 0; x -= 6) g.lineTo(x, Math.min(H, surfaceY(x))); g.closePath();
      const ag = g.createLinearGradient(0, 0, 0, Math.min(H, wl)); ag.addColorStop(0, `rgba(238,244,240,${0.5 * a})`); ag.addColorStop(1, `rgba(214,230,226,${0.62 * a})`); g.fillStyle = ag; g.fill();
      g.fillStyle = `rgba(255,255,255,${0.2 * a})`; g.fillRect(14, 0, 5, Math.min(H, wl)); g.fillRect(W - 20, 0, 3, Math.min(H, wl));
      // a soft film of grime is left on the glass where the dirty water stood: a faded tide line and a few smudges, no hard lines
      if (r.dirt0 > 0 && drain > 0 && r.level < 0.995) {
        const ga = r.dirt0 * (1 - fill), band = Math.max(0, wl - r.full);
        const fg = g.createLinearGradient(0, r.full, 0, r.full + band); fg.addColorStop(0, `rgba(112,100,48,${0.2 * ga})`); fg.addColorStop(0.35, `rgba(112,100,48,${0.08 * ga})`); fg.addColorStop(1, `rgba(112,100,48,${0.03 * ga})`); g.fillStyle = fg; g.fillRect(0, r.full, W, band);
        for (let i = 0; i < 6; i++) { const x = 40 + i * 64 + (i * 29) % 23, y = r.full + 30 + ((i * 53) % 90) * Math.min(1, band / 160), rr = 34 + (i * 17) % 26; if (y > wl) continue; const sg = g.createRadialGradient(x, y, 0, x, y, rr); sg.addColorStop(0, `rgba(112,100,48,${0.14 * ga})`); sg.addColorStop(1, 'rgba(112,100,48,0)'); g.fillStyle = sg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      }
    }
    if (r.level < 0.25) { const fa = soft(seg(0.25 - r.level, 0, 0.2)) * r.dirt0 * (1 - fill); const fg = g.createLinearGradient(0, H * 0.7, 0, H); fg.addColorStop(0, 'rgba(90,76,34,0)'); fg.addColorStop(1, `rgba(90,76,34,${0.4 * fa})`); g.fillStyle = fg; g.fillRect(0, H * 0.7, W, H * 0.3); g.fillStyle = `rgba(190,170,110,${0.18 * fa})`; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(60 + i * 70 + (i * 29) % 30, H - 60 - (i % 3) * 36, 34, 7, 0, 0, 6.3); g.fill(); } }
    // the water
    const hoseA = soft(seg(t, T.dr0 - 0.45, T.dr0)) * (1 - soft(seg(t, T.drain + 0.1, T.drain + 0.5))), hoseDown = ease(seg(t, T.dr0 - 0.45, T.dr0));
    if (wl < H) {
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, surfaceY(x)); g.lineTo(W, H); g.closePath();
      const wg = g.createLinearGradient(0, wl, 0, H); wg.addColorStop(0, `rgba(122,108,46,${0.5 * r.dirt})`); wg.addColorStop(1, `rgba(62,66,26,${0.66 * r.dirt})`); g.fillStyle = wg; g.fill();
      // fresh water: a little milky at first with fine bubbles (as tap water is), clearing to bright blue
      if (r.dirt < 0.9 && r.level > 0.06) { const milk = Math.sin(Math.PI * clamp(fill * 1.3)) * (1 - r.dirt), cg = g.createLinearGradient(0, wl, 0, H); cg.addColorStop(0, `rgba(196,240,255,${0.36 * (1 - r.dirt)})`); cg.addColorStop(0.35, `rgba(150,214,240,${0.12 * (1 - r.dirt)})`); cg.addColorStop(1, `rgba(120,190,230,${0.06 * (1 - r.dirt)})`); g.fillStyle = cg; g.fill();
        if (milk > 0.02) { g.fillStyle = `rgba(236,248,255,${0.16 * milk})`; g.fill(); for (let i = 0; i < 90; i++) { const x = (i * 53.7 + t * 9 * ((i % 3) - 1)) % W, y = lerp(wl + 4, H - 4, ((i * 0.618) % 1)) - ((t * (14 + (i % 7) * 4)) % 60); if (y < wl + 2) continue; g.fillStyle = `rgba(255,255,255,${0.5 * milk})`; g.fillRect((x + W) % W, y, 1.2, 1.2); } } }
      // the surface: a bright meniscus line with a darker underside, catching the light in moving glints
      g.beginPath(); for (let x = 0; x <= W; x += 6) x ? g.lineTo(x, surfaceY(x)) : g.moveTo(x, surfaceY(x));
      g.strokeStyle = r.dirt > 0.3 ? 'rgba(214,200,140,.9)' : 'rgba(232,250,255,.97)'; g.lineWidth = 2.4; g.stroke();
      g.save(); g.translate(0, 3); g.strokeStyle = r.dirt > 0.3 ? 'rgba(70,64,30,.35)' : 'rgba(40,110,150,.28)'; g.lineWidth = 3; g.stroke(); g.restore();
      for (let i = 0; i < 9; i++) { const x = (i * 47 + t * (20 + i * 3)) % W, y = surfaceY(x); g.fillStyle = `rgba(255,255,255,${(r.dirt > 0.3 ? 0.35 : 0.8) * (0.5 + 0.5 * Math.sin(t * 3 + i))})`; g.fillRect(x, y - 1.2, 7 + (i % 3) * 4, 1.4); }
      if (r.dirt > 0.3) { g.fillStyle = 'rgba(190,176,110,.7)'; for (let x = (t * 14) % 22; x < W; x += 22) { g.beginPath(); g.ellipse(x, surfaceY(x) - 1, 6, 1.6, 0, 0, 6.3); g.fill(); } }
      // debris: swirling while the water stands, then drawn in to the siphon's mouth as it drains
      for (const d of debris) {
        const y0 = lerp(wl + 6, H - 6, d.y); if (r.dirt < 0.03) continue; const s2 = soft(clamp((drain - d.k) / 0.45)); if (s2 >= 0.98) continue;
        const bx = d.x + Math.sin(t * 0.8 + d.ph) * 8, by = Math.max(wl + 4, y0 + Math.cos(t * 0.6 + d.ph) * 6), sw = s2 * s2, ang = sw * 5 + d.ph, rr = (1 - sw) * 18;
        const x = lerp(bx, XI + Math.cos(ang) * rr, sw), y = lerp(by, YI - 6 + Math.sin(ang) * rr * 0.35, sw); if (y < wl + 3) continue;
        g.fillStyle = rgb(d.c, 0.85 * r.dirt * (1 - s2 * s2)); g.beginPath(); g.arc(x, y, d.r * (1 - 0.5 * s2), 0, 6.3); g.fill();
      }
      // a slow swirl round the siphon's mouth while it pulls
      if (hoseA > 0.05 && drain > 0 && drain < 1) { g.strokeStyle = `rgba(150,130,70,${0.45 * hoseA * r.dirt})`; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const a0 = -t * 4 + i * 2.1; g.beginPath(); g.ellipse(XI, YI - 4, 10 + i * 9, 3 + i * 2.4, 0, a0, a0 + 2.2); g.stroke(); } }
      // fresh water pouring in: bubbles driven down under the stream and rising back, and rings spreading over the surface
      if (fill > 0 && fill < 1) {
        const pw = Math.sin(Math.PI * clamp(fill * 1.15)), sy = surfaceY(POUR);
        for (let i = 0; i < 46; i++) { const ph = (t * (0.9 + (i % 5) * 0.12) + i * 0.173) % 1, depth = 30 + (i % 9) * 14 * pw, down = ph < 0.4 ? ph / 0.4 : 1 - (ph - 0.4) / 0.6, x = POUR + Math.sin(i * 2.3 + t * 4) * (6 + 30 * (1 - down)) + (ph > 0.4 ? (i % 2 ? 1 : -1) * (ph - 0.4) * 40 : 0), y = sy + 6 + depth * down; if (y > H || y < sy + 2) continue; g.strokeStyle = `rgba(240,252,255,${0.7 * pw * (1 - ph * 0.5)})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 1 + (i % 3) * 0.9, 0, 6.3); g.stroke(); }
        if ((r.ringT = (r.ringT ?? 0) - dt) <= 0) { r.ringT = 0.28; rings.push({ x: POUR, r: 4, l: 1 }); }
        for (let i = 0; i < 26; i++) { const x = (i * 71 + 13) % W, y = lerp(H, wl, ((t * 0.5 + i * 0.137) % 1)); g.strokeStyle = 'rgba(235,252,255,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(x + Math.sin(t * 3 + i) * 4, y, 1.5 + (i % 3), 0, 6.3); g.stroke(); }
      }
      for (let i = rings.length - 1; i >= 0; i--) { const R = rings[i]; R.l -= dt * 0.9; R.r += dt * 120; if (R.l <= 0) { rings.splice(i, 1); continue; } g.strokeStyle = `rgba(245,253,255,${0.55 * R.l})`; g.lineWidth = 1.3; g.beginPath(); g.ellipse(R.x, surfaceY(R.x) + 1, R.r, R.r * 0.12, 0, 0, 6.3); g.stroke(); }
    }
    // the siphon hose: lowered in, murky water running up it while the tank drains, lifted out after
    if (hoseA > 0.01) {
      g.save(); g.globalAlpha = hoseA; g.translate(0, (1 - hoseDown) * -H * 0.6);
      g.beginPath(); for (let i = 0; i <= 24; i++) { const [x, y] = hoseAt(i / 24); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineCap = 'round';
      g.strokeStyle = 'rgba(40,60,66,.55)'; g.lineWidth = 19; g.stroke(); g.strokeStyle = 'rgba(214,230,234,.8)'; g.lineWidth = 16; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 9; g.stroke();      // a clear plastic hose: dark rim, pale wall
      if (drain > 0 && drain < 1) { g.strokeStyle = `rgba(110,96,42,${0.8 * Math.max(0.3, r.dirt)})`; g.lineWidth = 9; g.setLineDash([10, 7]); g.lineDashOffset = t * 90; g.stroke(); g.setLineDash([]); }      // dirty water running up the hose
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 24; i++) { const [x, y] = hoseAt(i / 24); i ? g.lineTo(x - 4, y) : g.moveTo(x - 4, y); } g.stroke();      // a highlight down its side
      g.fillStyle = 'rgba(60,70,74,.85)'; g.beginPath(); g.ellipse(XI, YI + 2, 10, 4, 0, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(230,240,240,.8)'; g.lineWidth = 1.5; g.stroke();      // its wide mouth
      g.restore();
    }
    // the glass above a falling waterline stays wet: drips and rivulets run down it and fade
    if (drain > 0 && drain < 1 && wl > r.full + 8 && Math.random() < dt * 9) rivs.push({ x: 8 + Math.random() * (W - 16), y: r.full + Math.random() * Math.max(10, wl - r.full - 10), len: 6 + Math.random() * 22, v: 12 + Math.random() * 30, l: 1 });
    for (let i = rivs.length - 1; i >= 0; i--) { const R = rivs[i]; R.y += R.v * dt; R.l -= dt * 0.45; if (R.l <= 0 || R.y > wl) { rivs.splice(i, 1); continue; } const rg = g.createLinearGradient(0, R.y - R.len, 0, R.y); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(1, `rgba(240,250,255,${0.6 * R.l})`); g.fillStyle = rg; g.fillRect(R.x, R.y - R.len, 1.6, R.len); g.fillStyle = `rgba(255,255,255,${0.8 * R.l})`; g.beginPath(); g.arc(R.x + 0.8, R.y, 1.6, 0, 6.3); g.fill(); }
    // the fresh water pouring in from above: a clear column, wobbling, with streaks running down it and foam where it lands
    if (fill > 0 && fill < 1.02) { const pa = soft(seg(t, T.fill0 - 0.25, T.fill0 + 0.15)) * (1 - soft(seg(t, T.fill - 0.35, T.fill + 0.1))); if (pa > 0.01) { const sy = surfaceY(POUR);
      g.save(); g.globalAlpha = pa; const pg = g.createLinearGradient(POUR - 9, 0, POUR + 9, 0); pg.addColorStop(0, 'rgba(200,240,255,.25)'); pg.addColorStop(0.5, 'rgba(235,250,255,.75)'); pg.addColorStop(1, 'rgba(200,240,255,.25)'); g.fillStyle = pg;
      g.beginPath(); g.moveTo(POUR - 7, 0); for (let y = 0; y <= sy; y += 10) g.lineTo(POUR - 6 - Math.sin(y * 0.08 + t * 9) * 1.5 - y * 0.008, y); for (let y = sy; y >= 0; y -= 10) g.lineTo(POUR + 6 + Math.sin(y * 0.07 + t * 8) * 1.5 + y * 0.008, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.setLineDash([7, 11]); g.lineDashOffset = -t * 160; g.beginPath(); g.moveTo(POUR - 2, 0); g.lineTo(POUR - 2, sy); g.moveTo(POUR + 3, 0); g.lineTo(POUR + 3, sy); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 9; i++) { const a = t * 6 + i * 0.7, fx = POUR + Math.cos(a) * (6 + (i % 3) * 5), fy = sy + Math.sin(a * 1.3) * 2; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(fx, fy, 5 + (i % 3) * 2, 2.2, 0, 0, 6.3); g.fill(); }      // foam churning where it lands
      g.restore(); } }
    { const sw = seg(t, T.fill - 0.9, T.fill + 0.3); if (sw > 0 && sw < 1) { const x = lerp(-80, W + 80, ease(sw)), gl = g.createLinearGradient(x - 70, 0, x + 70, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, `rgba(235,252,255,${0.32 * Math.sin(Math.PI * sw)})`); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x - 70, r.full, 140, H - r.full); } }
    // your fish: up to the surface, out of the top, and back in
    r.fish.forEach((a, i) => {
      const top = Math.max(r.full + 26, 96), face = a.x > a.at[0] ? 1 : -1;
      if (t < a.tUp) { r.shown.delete(i); return; }
      r.shown.add(i);
      if (t < a.tOut) { const k = ease(seg(t, a.tUp, a.tOut)); place3D(a, lerp(a.at[0], a.x, k) + Math.sin(k * 9 + a.ph) * 10 * (1 - k), lerp(a.at[1], top, k), 0.2 + 0.95 * Math.sin(k * Math.PI), face); }
      else if (t < a.tGone) { const k = seg(t, a.tOut, a.tGone); place3D(a, a.x + k * 26 * face, top - Math.sin(k * Math.PI * 0.5) * 170 - k * k * 60, 1.05 - k * 0.4, face); if (!a.leapt) { a.leapt = true; sfx('splash'); haptic(8); PUFF(a.x, top + 4, 2); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: top + 4, vx: (rnd() - 0.5) * 120, vy: -120 - rnd() * 90, l: 0.8, s: 1.6 }); } }
      else if (t < a.tDrop) { r.shown.add(i); a.f.group.visible = false; if (a.f.emote) { a.f.emote.visible = false; a.f.emote.material.opacity = 0; } }
      else if (t < a.tLand) { const k = seg(t, a.tDrop, a.tLand); place3D(a, a.x, lerp(-90, Math.max(r.full + 42, 104), k * k), -1.1, face); }
      else if (t < a.tHome) { if (!a.landed) { a.landed = true; sfx('splash'); haptic(8); PUFF(a.x, Math.max(r.full + 42, 104), 3); for (let j = 0; j < 8; j++) drops.push({ x: a.x, y: Math.max(r.full + 42, 104), vx: (rnd() - 0.5) * 110, vy: -90 - rnd() * 80, l: 0.7, s: 1.5 }); } const k = ease(seg(t, a.tLand, a.tHome)); place3D(a, lerp(a.x, a.home[0], k), lerp(Math.max(r.full + 42, 104), a.home[1], k), -0.5 * (1 - k), a.home[0] > a.x ? 1 : -1); }
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
    if (!run) return; const r = run; run = null; drops.length = puffs.length = rivs.length = rings.length = 0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); r.fish.forEach((a) => { a.f.group.visible = true; });
    if (!r.dispatched) Promise.resolve(r.dispatch()); r.done?.(r.ok);
  }
  return { start, frame, get active() { return !!run; }, get t() { return run ? run.t : -1; }, get level() { return run ? run.level : 1; }, finish };
}
