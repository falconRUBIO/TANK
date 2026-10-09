// The water-change scene: a green hand net lifts the fish into a holding bowl, the dirty water drains through a siphon,
// clean water is poured back in, and the fish are netted home. Drawn as a pixel overlay on top of the 3D tank.
import * as THREE from 'three';

const W = 405, H = 720;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), seg = (t, a, b) => clamp((t - a) / (b - a));
const PAL = ['#ff8a2a', '#ffd23a', '#ff5a7a', '#5ad0ff', '#9ad04a', '#c08aff'];
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function makeWaterChange({ canvas, camera, fishes, surfY, sfx }) {
  canvas.width = W; canvas.height = H; const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
  const v = new THREE.Vector3();
  const px = (p) => { v.copy(p).project(camera); return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H]; };
  let run = null; const rnd = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const debris = Array.from({ length: 150 }, () => ({ x: rnd() * W, y: rnd(), s: 1 + (rnd() * 2 | 0), v: 4 + rnd() * 10, c: rnd() < 0.5 ? '#6b5a2a' : '#4d6a2a' }));

  const rect = (x, y, w, h, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); g.globalAlpha = 1; };
  // the green consumer aquarium net: white frame and handle, fine green mesh bag, a black grip
  function net(x, y, ang, fill = [], t = 0) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const rx = 40, ry = 13, depth = 58, sway = Math.sin(t * 5) * 2;
    g.fillStyle = '#e9ece4'; g.save(); g.translate(rx - 2, -2); g.rotate(-0.0); g.fillRect(0, -3, 190, 6); g.fillStyle = '#2b2f2a'; for (let i = 0; i < 4; i++) g.fillRect(70 + i * 9, -3.5, 5, 7); g.fillStyle = '#cfd4c8'; g.fillRect(186, -4, 10, 8); g.restore();
    g.fillStyle = '#1f9a4a'; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(-rx, 0); g.quadraticCurveTo(-rx * 0.9 + sway, depth * 1.1, sway, depth); g.quadraticCurveTo(rx * 0.9 + sway, depth * 1.1, rx, 0); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI, true); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(10,70,30,.55)'; g.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * rx / 3.2, ry * Math.sqrt(Math.max(0, 1 - (i / 3.2) ** 2)) * 0.9); g.lineTo(i * rx / 6 + sway, depth); g.stroke(); }
    for (let j = 1; j <= 4; j++) { const k = j / 5, yy = lerp(ry * 0.5, depth - 4, k), w = rx * (1 - k * 0.85); g.beginPath(); g.moveTo(-w, yy); g.quadraticCurveTo(sway * k, yy + 6, w, yy); g.stroke(); }
    fill.forEach((f, i) => fishPix(f, -14 + i * 14 + Math.sin(t * 7 + i) * 2, depth - 22 - (i % 2) * 8, 0.8));
    g.strokeStyle = '#f4f6ee'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, rx + 1.5, ry + 1.5, 0, 0, 6.3); g.stroke();
    g.restore();
  }
  function fishPix(f, x, y, s = 1, flip = 1) {
    g.save(); g.translate(x, y); g.scale(s * flip, s);
    if (f.id === 'octopus') { rect(-8, -8, 16, 12, f.col); for (let i = 0; i < 4; i++) rect(-8 + i * 5, 4, 3, 7, f.col); rect(-4, -4, 2, 2, '#fff'); rect(2, -4, 2, 2, '#fff'); }
    else { rect(-9, -4, 15, 8, f.col); rect(6, -6, 5, 12, f.col, 0.9); rect(-4, -8, 8, 4, f.col, 0.85); rect(-7, -2, 2, 2, '#111'); rect(-1, -3, 2, 6, 'rgba(255,255,255,.35)'); }
    g.restore();
  }
  function bowl(x, y, level, fish, t, a) {
    g.globalAlpha = a; g.fillStyle = 'rgba(190,225,240,.28)'; g.beginPath(); g.ellipse(x, y + 18, 56, 44, 0, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(90,170,215,.55)'; g.beginPath(); g.ellipse(x, y + 26, 52, 34, 0, 0.0, Math.PI); g.ellipse(x, y + 22, 52, 7, 0, Math.PI, 0, true); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + 18, 56, 44, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x, y - 6, 28, 5, 0, 0, 6.3); g.stroke();
    g.globalAlpha = a; fish.forEach((f, i) => fishPix(f, x - 22 + ((i * 23 + t * 22 * (i % 2 ? -1 : 1)) % 44 + 44) % 44 + 0, y + 28 + Math.sin(t * 3 + i * 2) * 7, 0.7, i % 2 ? -1 : 1));
    g.globalAlpha = 1;
  }
  function bucket(x, y, ang) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = '#3a8ee0'; g.beginPath(); g.moveTo(-24, -26); g.lineTo(24, -26); g.lineTo(18, 28); g.lineTo(-18, 28); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-18, -22, 6, 46); g.fillStyle = '#2a6cb4'; g.fillRect(-26, -30, 52, 6);
    g.strokeStyle = '#cfd6dc'; g.lineWidth = 2; g.beginPath(); g.arc(0, -30, 20, Math.PI, 0); g.stroke(); g.restore();
  }
  function siphon(t, flow, dirt) {
    const pts = [[W - 70, H - 80], [W - 76, H - 140], [W - 60, 360], [W - 30, 300], [W + 8, 292]];
    const path = new Path2D(); path.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) path.lineTo(...pts[i]);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(30,40,50,.5)'; g.lineWidth = 11; g.stroke(path);
    g.strokeStyle = 'rgba(205,225,235,.55)'; g.lineWidth = 8; g.stroke(path);
    g.strokeStyle = `rgba(${lerp(130, 90, dirt) | 0},${lerp(150, 100, dirt) | 0},${lerp(160, 40, dirt) | 0},${0.55 * flow})`; g.lineWidth = 5; g.stroke(path);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pts[0][0] - 2, pts[0][1]); g.lineTo(pts[1][0] - 2, pts[1][1]); g.stroke();
    rect(pts[0][0] - 9, pts[0][1] - 4, 18, 12, '#3a3f44');                              // the weighted mouth that sits on the sand
    for (let i = 0; i < 10; i++) { const k = ((t * 0.9 + i / 10) % 1) * (pts.length - 1), a = pts[k | 0], b = pts[Math.min(pts.length - 1, (k | 0) + 1)], f = k % 1; rect(lerp(a[0], b[0], f) - 2, lerp(a[1], b[1], f) - 2, 4, 4, dirt > 0.4 ? '#5d5524' : '#bfe6f5', flow); }
    if (flow > 0.3) for (let i = 0; i < 5; i++) rect(W - 12 + rnd() * 10, 296 + ((t * 120 + i * 40) % 140), 3, 5, '#6b5f2a', 0.7 * flow);   // the stream leaving the screen
  }

  // walk a net through waypoints; each leg takes its own time
  function path(pts, durs, tt) {
    if (tt < 0) return null; let acc = 0;
    for (let i = 0; i < durs.length; i++) { if (tt < acc + durs[i]) { const f = (tt - acc) / durs[i], k = ease(f), a = pts[i], b = pts[i + 1]; return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), leg: i, f }; } acc += durs[i]; }
    return null;
  }
  function plan() {
    const list = fishes.list.filter((f) => !f.dead && !f.visitor && f.group.visible !== false);
    return list.slice(0, 8).map((f, i) => ({ f, id: f.id, col: f.id === 'octopus' ? '#d4552a' : PAL[hash(f.id + i) % PAL.length], at: px(f.pos) }));
  }

  function start({ dirt0 = 1, dispatch, done, reduced = false }) {
    if (run) return false;
    const fish = plan(), full = clamp(px(new THREE.Vector3(0, surfY(), 0))[1], 0, 80), low = H * 0.86;
    const SC = 0.55 * fish.length + 2.35, T = { dirty: 0.8, scoop: 0.8 + SC, drain: 0.8 + SC + 2.4, fill: 0.8 + SC + 2.4 + 2.6 };
    T.back = T.fill + 0.2; T.end = T.back + 2.5 + 0.6;
    run = { fish, full, low, t: 0, T, dirt0, dispatch, done, dispatched: false, ok: true, level: 1, dirt: 0, home: fish.map(() => false), hidden: new Set() };
    return true;
  }

  function frame(dt) {
    if (!run) return false;
    const r = run, T = r.T; r.t += dt; const t = r.t;
    g.clearRect(0, 0, W, H);
    // water level and how dirty it is
    const drain = ease(seg(t, T.scoop, T.drain)), fill = ease(seg(t, T.drain, T.fill));
    r.level = 1 - drain * 0.86 + fill * 0.86;
    r.dirt = r.dirt0 * ease(seg(t, 0, T.dirty)) * (1 - ease(seg(t, T.drain + 0.5, T.fill + 0.4)));
    const wl = lerp(r.low, r.full, r.level) + Math.sin(t * 3) * 1.2;
    // air above the waterline: the empty glass
    if (wl > r.full + 1) { rect(0, 0, W, wl, '#dfe9e6', 0.5 * ease(seg(wl - r.full, 0, 40))); for (let y = 20; y < wl; y += 34) rect(0, y, W, 1, '#fff', 0.15); }
    // dirty water tint, rising in murk
    rect(0, wl, W, H - wl, '#5c5a22', 0.5 * r.dirt); rect(0, wl, W, H - wl, '#3f4a1c', 0.22 * r.dirt);
    // bright meniscus (foamy and brown when dirty)
    rect(0, wl - 1, W, 3, r.dirt > 0.3 ? '#a89a4c' : '#cdf2ff', 0.85); if (r.dirt > 0.3) for (let x = (t * 8) % 14; x < W; x += 14) rect(x, wl - 3, 5, 2, '#d8cf9a', 0.7);
    // debris and sand cloud, pulled toward the siphon while draining
    const pull = drain * (1 - fill);
    for (const d of debris) {
      const y = lerp(wl, H, d.y), a = r.dirt * 0.9; if (a < 0.03 || y < wl) continue;
      d.x += Math.sin(t + d.y * 9) * 0.2 - pull * (d.x - (W - 80)) * 0.012 * 6 * dt * 10 * 0.1; if (d.x < 0 || d.x > W) d.x = rnd() * W;
      rect(d.x, y + Math.sin(t * d.v * 0.1 + d.y * 20) * 3 + pull * (d.y * 12), d.s, d.s, d.c, a);
    }
    if (pull > 0.05) for (let i = 0; i < 24; i++) rect(W - 140 + rnd() * 130, H - 90 + rnd() * 70, 3, 3, '#8a7a4a', 0.35 * pull * r.dirt);
    // siphon
    if (t > T.scoop - 0.3 && t < T.drain + 0.5) siphon(t, ease(seg(t, T.scoop - 0.3, T.scoop + 0.3)) * (1 - seg(t, T.drain, T.drain + 0.5)), r.dirt);
    // bowl of fish
    const inBowl = r.fish.filter((_, i) => r.hidden.has(i) && !r.home[i] && (r.dipped || t > T.scoop) && t < T.back + 0.8);
    const bowlA = ease(seg(t, T.dirty + 0.3, T.dirty + 0.8)) * (1 - ease(seg(t, T.back + 0.9, T.back + 1.3)));
    const bx = 112, by = 130; if (bowlA > 0.01) bowl(bx, by, 1, inBowl, t, bowlA);
    // net choreography: out of the corner, through each fish, over to the bowl, dip, and away
    const n = r.fish.length, hold = [bx + 6, by - 8], corner = [W + 90, -40];
    if (t >= T.dirty - 0.1 && t < T.scoop + 0.5) {
      const pts = [corner, ...r.fish.map((a) => [a.at[0], a.at[1] - 4]), hold, hold, corner], durs = [...r.fish.map(() => 0.55), 0.5, 1.0, 0.45, 0.5];
      if (!n) durs.splice(0, durs.length, 0.5, 0.5, 0.5);
      const w = path(pts, durs, t - (T.dirty - 0.1)); if (w) {
        for (let i = 0; i < n; i++) if (w.leg > i && !r.hidden.has(i)) { r.hidden.add(i); sfx('splash'); }
        const loaded = w.leg <= n ? r.fish.slice(0, Math.max(0, Math.min(n, w.leg))) : w.leg === n + 1 ? r.fish : [];
        net(w.x, w.y + (w.leg === n + 1 ? Math.sin(w.f * Math.PI) * 14 : 0), -0.6, loaded.filter((_, i) => !r.dipped || i < 0), t);
        if (w.leg === n + 2 && !r.dipped) { r.dipped = true; sfx('splash'); }
      }
    }
    // clean water poured from the bucket
    if (t >= T.drain - 0.2 && t < T.fill + 0.3) {
      const a = ease(seg(t, T.drain - 0.2, T.drain + 0.3)) * (1 - ease(seg(t, T.fill - 0.1, T.fill + 0.3))), bxp = 252, byp = 36;
      bucket(bxp, byp, -0.9 * a);
      if (a > 0.1) { rect(bxp - 34, byp + 18, 5, wl - byp - 18, '#bfe9ff', 0.85 * a); rect(bxp - 33, byp + 18, 2, wl - byp - 18, '#fff', 0.8 * a); for (let i = 0; i < 14; i++) rect(bxp - 40 + rnd() * 18, wl - 4 - rnd() * 14, 2, 2, '#e8fbff', 0.8 * a); }
      if (t > T.drain + 0.05 && !r.dispatched) { r.dispatched = true; sfx('splash'); Promise.resolve(r.dispatch()).then((ok) => { if (ok === false) r.ok = false; }); }
    }
    // fresh water sparkle as it clears
    const clear = seg(t, T.drain + 1.2, T.fill + 0.4); if (clear > 0 && clear < 1) for (let i = 0; i < 18; i++) { const x = rnd() * W, y = lerp(wl, H, rnd()); rect(x, y, 2, 2, '#fff', 0.7 * Math.sin(clear * Math.PI) * rnd()); }
    // return: the net takes them from the bowl and tips them back into the clean water
    if (t >= T.back) {
      const centre = [W * 0.5, H * 0.42], hold = [bx + 6, by - 8], pts = [[-90, -40], hold, hold, centre, centre, [W + 90, -40]], durs = [0.45, 0.35, 0.8, 0.3, 0.6];
      const w = path(pts, durs, t - T.back);
      if (w) {
        const loaded = w.leg >= 2 && w.leg <= 3 ? r.fish : [];
        if (w.leg === 2 && !r.fell) r.fell = true;
        net(w.x, w.y, -0.6, loaded, t);
        if (w.leg >= 4 && n) { r.fish.forEach((a, i) => { if (!r.home[i]) { r.home[i] = true; r.hidden.delete(i); } }); if (!r.splashed) { r.splashed = true; sfx('splash'); } const s2 = seg(t - T.back, 2.0, 2.5); for (let i = 0; i < 16; i++) { const an = i / 16 * 6.3; rect(centre[0] + Math.cos(an) * 70 * s2, centre[1] + Math.sin(an) * 42 * s2, 3, 3, '#e8fbff', 1 - s2); } }
      }
    }
    // fish stay out of the 3D tank while they are in the net or the bowl
    r.fish.forEach((a, i) => { a.f.group.visible = !r.hidden.has(i) || r.home[i]; });
    if (t >= T.end || (!r.ok && t > T.drain)) { finish(); return false; }
    return true;
  }
  function finish() {
    if (!run) return; const r = run; run = null; g.clearRect(0, 0, W, H); r.fish.forEach((a) => { a.f.group.visible = true; });
    if (!r.dispatched) Promise.resolve(r.dispatch()); r.done?.(r.ok);
  }
  return { start, frame, get active() { return !!run; }, get t() { return run ? run.t : -1; }, finish };
}
