// The water-change scene, drawn over the 3D tank: a green hand net scoops each fish into a holding bowl, the dirty water
// drains through a siphon, clean water rises, and the net carries the fish home.
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
    try { probe.clearRect(0, 0, 5, 5); probe.drawImage(tank, Math.round(p[0] * tank.width / W) - 2, Math.round(p[1] * tank.height / H) - 2, 5, 5, 0, 0, 5, 5); const d = probe.getImageData(0, 0, 5, 5).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < 100; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const c = [r / 25, gg / 25, b / 25], m = (c[0] + c[1] + c[2]) / 3; return c.map((x) => clamp(m + (x - m) * 1.5 + 8, 30, 255)); } catch { return [255, 150, 60]; }
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

  // ── the green consumer net: white hoop and handle, ribbed grip, fine mesh bag
  function net(n, t, fishInBag) {
    const rx = 70, ry = rx * lerp(0.2, 0.62, n.open), depth = 118 * lerp(1, 0.86, n.open), sw = n.sway;
    g.save(); g.translate(n.x, n.y); g.rotate(n.tilt);
    // handle leaves the hoop on its right and climbs away off the screen
    g.save(); g.translate(rx - 3, 0); g.rotate(n.ang - n.tilt);
    const hl = 520, gh = g.createLinearGradient(0, -5, 0, 5); gh.addColorStop(0, '#fbfdf7'); gh.addColorStop(0.5, '#e6eadf'); gh.addColorStop(1, '#a9b1a3');
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(2, 3, hl, 10); g.fillStyle = gh; g.beginPath(); g.roundRect(0, -5, hl, 10, 5); g.fill();
    const gs = 150; g.fillStyle = '#1f3a2a'; g.beginPath(); g.roundRect(gs, -6.5, 150, 13, 6); g.fill();
    g.fillStyle = '#2f5a3e'; for (let i = 0; i < 18; i++) g.fillRect(gs + 6 + i * 8, -6.5, 3.4, 13);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(gs + 4, -5.5, 142, 2);
    g.fillStyle = '#f4f6ee'; g.beginPath(); g.roundRect(0, -6.5, 26, 13, 5); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 2, 26, 4);     // the collar where the hoop meets the handle
    g.restore();
    // inside of the bag, seen through the hoop
    const bot = [sw * 0.9, depth], bagPath = () => { g.beginPath(); g.moveTo(-rx, 0); g.bezierCurveTo(-rx * 1.02 + sw * 0.3, depth * 0.55, -rx * 0.4 + sw, depth * 1.04, bot[0], bot[1]); g.bezierCurveTo(rx * 0.4 + sw, depth * 1.04, rx * 1.02 + sw * 0.3, depth * 0.55, rx, 0); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI, true); g.closePath(); };
    const ig = g.createRadialGradient(0, 0, 4, 0, 0, rx); ig.addColorStop(0, 'rgba(12,70,36,.95)'); ig.addColorStop(1, 'rgba(24,110,56,.9)'); g.fillStyle = ig; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.3); g.fill();
    // the fish inside, then the mesh over them so they read as caught
    fishInBag.forEach((f) => fish2D(f.fish, f.dx + sw * 0.4, depth * 0.62 + f.dy, 0.72, t, f.flip, Math.sin(t * 8 + f.fish.ph) * 0.12));
    const bg = g.createLinearGradient(-rx, 0, rx, 0); bg.addColorStop(0, 'rgba(18,130,60,.62)'); bg.addColorStop(0.35, 'rgba(70,200,110,.5)'); bg.addColorStop(1, 'rgba(12,100,48,.7)');
    g.save(); bagPath(); g.fillStyle = bg; g.fill(); g.clip();
    g.strokeStyle = 'rgba(8,70,34,.6)'; g.lineWidth = 0.9; const sp = 8;
    for (let i = -24; i <= 24; i++) { g.beginPath(); g.moveTo(i * sp - 120, -4); g.lineTo(i * sp + 120 + sw, depth + 30); g.stroke(); g.beginPath(); g.moveTo(i * sp + 120, -4); g.lineTo(i * sp - 120 + sw, depth + 30); g.stroke(); }
    g.strokeStyle = 'rgba(190,255,205,.22)'; g.lineWidth = 0.8; for (let i = -24; i <= 24; i++) { g.beginPath(); g.moveTo(i * sp - 119, -3); g.lineTo(i * sp + 121 + sw, depth + 31); g.stroke(); }
    const sh = g.createLinearGradient(0, 0, 0, depth); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,30,10,.35)'); g.fillStyle = sh; g.fillRect(-rx - 10, 0, rx * 2 + 20, depth + 20);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(-rx * 0.55 + sw * 0.2, depth * 0.38, 7, depth * 0.3, 0.12, 0, 6.3); g.fill();
    g.restore();
    // the binding where mesh meets hoop, and the hoop itself
    g.strokeStyle = '#16632f'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 1, rx - 1, ry, 0, 0, Math.PI); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 11; g.beginPath(); g.ellipse(0, 1.5, rx + 1, ry + 1, 0, 0.2, Math.PI - 0.2); g.stroke();
    const hg = g.createLinearGradient(0, -ry, 0, ry); hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.5, '#e4e9dc'); hg.addColorStop(1, '#a8b0a0');
    g.strokeStyle = hg; g.lineWidth = 6.5; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, -0.8, rx - 1, ry - 1, 0, Math.PI * 1.08, Math.PI * 1.7); g.stroke();
    g.restore();
  }

  function bowl(x, y, items, t, a, wob) {
    const R = 84, Rh = 70; g.save(); g.globalAlpha = a; g.translate(x, y);
    const glass = g.createRadialGradient(-R * 0.35, -Rh * 0.4, 6, 0, 0, R * 1.1); glass.addColorStop(0, 'rgba(235,248,255,.34)'); glass.addColorStop(1, 'rgba(150,200,225,.16)');
    g.fillStyle = glass; g.beginPath(); g.ellipse(0, 0, R, Rh, 0, 0, 6.3); g.fill();
    // water in the bowl
    g.save(); g.beginPath(); g.ellipse(0, 0, R - 3, Rh - 3, 0, 0, 6.3); g.clip();
    const wy = -6, wg = g.createLinearGradient(0, wy, 0, Rh); wg.addColorStop(0, 'rgba(120,200,235,.62)'); wg.addColorStop(1, 'rgba(60,140,190,.72)'); g.fillStyle = wg;
    g.beginPath(); g.moveTo(-R, wy); for (let i = -R; i <= R; i += 6) g.lineTo(i, wy + Math.sin(i * 0.08 + t * 3) * (1.4 + wob * 4)); g.lineTo(R, Rh + 4); g.lineTo(-R, Rh + 4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(235,252,255,.8)'; g.lineWidth = 1.6; g.beginPath(); for (let i = -R; i <= R; i += 6) { const yy = wy + Math.sin(i * 0.08 + t * 3) * (1.4 + wob * 4); i === -R ? g.moveTo(i, yy) : g.lineTo(i, yy); } g.stroke();
    items.forEach((it) => fish2D(it.fish, it.x - x, it.y - y, it.sc, t, it.flip, it.tilt)); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, 0, R, Rh, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -Rh + 7, 34, 6, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R - 9, Math.PI * 1.1, Math.PI * 1.38); g.stroke();
    g.restore();
  }

  function siphon(t, flow, dirt) {
    const pts = [[W - 78, H - 92], [W - 84, H - 170], [W - 66, 380], [W - 34, 320], [W + 12, 306]];
    const p = new Path2D(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) p.lineTo(...pts[i]);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,30,40,.45)'; g.lineWidth = 17; g.stroke(p);
    g.strokeStyle = 'rgba(214,232,240,.55)'; g.lineWidth = 13; g.stroke(p);
    g.strokeStyle = `rgba(${lerp(120, 100, dirt) | 0},${lerp(150, 105, dirt) | 0},${lerp(165, 40, dirt) | 0},${0.8 * flow})`; g.lineWidth = 9; g.stroke(p);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pts[0][0] - 3, pts[0][1] - 6); g.lineTo(pts[1][0] - 3, pts[1][1]); g.stroke();
    g.fillStyle = '#2f353a'; g.beginPath(); g.roundRect(pts[0][0] - 16, pts[0][1] - 4, 32, 16, 4); g.fill(); g.fillStyle = '#4a525a'; g.fillRect(pts[0][0] - 14, pts[0][1] - 2, 28, 3);   // the weighted mouth on the sand
    for (let i = 0; i < 12; i++) { const k = ((t * 1.1 + i / 12) % 1) * (pts.length - 1), a = pts[k | 0], b = pts[Math.min(pts.length - 1, (k | 0) + 1)], f = k % 1; g.fillStyle = dirt > 0.35 ? `rgba(70,62,24,${0.75 * flow})` : `rgba(220,245,255,${0.7 * flow})`; g.beginPath(); g.arc(lerp(a[0], b[0], f), lerp(a[1], b[1], f), 3.2, 0, 6.3); g.fill(); }
  }

  // ── the timeline
  function plan() {
    const list = fishes.list.filter((f) => !f.dead && !f.visitor && f.group.visible !== false).slice(0, 6);
    return list.map((f, i) => { const at = px(f.pos); return { f, id: f.species.id, at, col: f.species.id === 'octopus' ? OCTO : colorAt(at), len: clamp(f.radius * 2 * pxPerUnit(f.pos), 40, 92), ph: i * 1.7, home: [at[0] + (rnd() - 0.5) * 24, at[1] + (rnd() - 0.5) * 24], slot: [0, 0] }; });
  }
  const BX = 124, BY = 150, CORNER = { x: W + 170, y: -140, tilt: 0.1, open: 0.5, ang: -0.55 };
  function build(fish, T0) {
    const wp = []; let t = T0; const add = (d, o) => { t += d; wp.push({ t, ...o }); return t; };
    wp.push({ t: T0, ...CORNER }); const S = [];
    fish.forEach((a, i) => {
      add(i ? 0.42 : 0.55, { x: a.at[0] + 95, y: a.at[1] - 74, tilt: -0.15, open: 0.55, ang: -0.55 });                    // swing in behind the fish
      S.push(add(0.34, { x: a.at[0] - 2, y: a.at[1] + 6, tilt: -0.28, open: 0.95, ang: -0.9 }));                         // sweep it up
    });
    const out = add(0.5, { x: BX + 20, y: BY - 128, tilt: -0.1, open: 0.5, ang: -0.55 });                                // lift out of the water and carry
    const tip = add(0.75, { x: BX + 4, y: BY - 38, tilt: -0.45, open: 0.8, ang: -0.95 });                                // over the bowl, tip
    const clear = add(0.5, { x: BX + 30, y: BY - 150, tilt: 0.05, open: 0.5, ang: -0.55 });
    const gone = add(0.55, CORNER);
    return { wp, S, out, tip, clear, gone };
  }
  function buildBack(fish, T0) {
    const wp = []; let t = T0; const add = (d, o) => { t += d; wp.push({ t, ...o }); return t; };
    wp.push({ t: T0, ...CORNER });
    add(0.55, { x: BX + 30, y: BY - 150, tilt: 0.0, open: 0.5, ang: -0.55 });
    const pick = add(0.6, { x: BX, y: BY + 8, tilt: -0.2, open: 0.9, ang: -0.9 });                                      // dip into the bowl
    add(0.4, { x: BX + 10, y: BY - 70, tilt: 0.0, open: 0.45, ang: -0.55 });
    add(0.7, { x: W * 0.5 + 20, y: H * 0.3, tilt: 0.0, open: 0.5, ang: -0.55 });                                          // carry across
    const rel = add(0.55, { x: W * 0.5 + 6, y: H * 0.38, tilt: -0.5, open: 0.8, ang: -1.0 });                           // lower in and tilt
    add(0.4, { x: W * 0.5 + 6, y: H * 0.38, tilt: -0.5, open: 0.8, ang: -1.0 });
    const gone = add(0.6, CORNER);
    return { wp, pick, rel, gone };
  }
  function netAt(wp, t) {
    if (t <= wp[0].t) return wp[0]; if (t >= wp[wp.length - 1].t) return wp[wp.length - 1];
    let i = 1; while (wp[i].t < t) i++; const a = wp[i - 1], b = wp[i], k = ease(seg(t, a.t, b.t));
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), tilt: lerp(a.tilt, b.tilt, k), open: lerp(a.open, b.open, k), ang: lerp(a.ang, b.ang, k) };
  }

  function start({ dirt0 = 1, dispatch, done }) {
    if (run) return false;
    const fish = plan(), n = fish.length, full = clamp(px(new THREE.Vector3(0, surfY(), 0))[1], 0, 90), low = H * 0.87;
    const T0 = 0.55, A = build(fish, T0), dr0 = A.out, drain = dr0 + 2.1, fill = drain + 2.3, B = buildBack(fish, drain + 0.15);
    fish.forEach((a, i) => { a.slot = [BX - 36 + ((i * 29) % 72), BY + 22 + (i % 2) * 14]; a.tScoop = A.S[i]; });
    run = { fish, n, full, low, t: 0, dirt0, dispatch, done, A, B, T: { dr0, drain, fill, end: B.gone + 0.05 }, dispatched: false, ok: true, level: 1, dirt: 0, sx: 0, lastX: 0, shown: new Set(), wet: 0, ring: 0 };
    return true;
  }

  // where each fish is and how it is drawn at time t
  function placeFish(r, t, netNow) {
    const { A, B } = r, bag = netNow ? [netNow.x + netNow.sway * 0.5, netNow.y + 70] : [0, 0], bowlItems = [], bagItems = [], flying = [];
    r.fish.forEach((a, i) => {
      const ts = a.tScoop - 0.2, tb = A.tip, tp = B.pick, tr = B.rel, k = (n0, a0, b0) => ease(seg(t, a0, b0));
      const inBag = { fish: a, dx: ((i % 3) - 1) * 20, dy: (i % 2) * 7 - 4, flip: i % 2 ? -1 : 1 };
      if (t < ts) { r.shown.delete(i); return; }
      r.shown.add(i);
      if (t < a.tScoop + 0.05) { const f = k(0, ts, a.tScoop + 0.05); flying.push([a, lerp(a.at[0], bag[0] + inBag.dx, f), lerp(a.at[1], bag[1] + 38, f), lerp(1, 0.72, f), 1]); }
      else if (t < tb) bagItems.push(inBag);
      else if (t < tb + 0.55) { const f = k(0, tb, tb + 0.55), x = lerp(bag[0] + inBag.dx, a.slot[0], f), y = lerp(bag[1] + 38, a.slot[1], f) - Math.sin(f * Math.PI) * 36; flying.push([a, x, y, 0.72, f < 0.7 ? 1 : -1, f * 3]); if (f > 0.99 && !a.landed) { a.landed = true; sfx('splash'); for (let j = 0; j < 8; j++) drops.push({ x: a.slot[0], y: BY - 8, vx: (rnd() - 0.5) * 80, vy: -60 - rnd() * 70, l: 0.6, s: 1.5 }); } }
      else if (t < tp) bowlItems.push({ fish: a, x: a.slot[0] + Math.sin(t * 1.3 + i * 2) * 26, y: a.slot[1] + Math.sin(t * 2.1 + i) * 6, sc: 0.72, flip: Math.cos(t * 1.3 + i * 2) > 0 ? 1 : -1, tilt: Math.sin(t * 2.1 + i) * 0.08 });
      else if (t < tp + 0.5) { const f = k(0, tp, tp + 0.5); flying.push([a, lerp(a.slot[0], bag[0] + inBag.dx, f), lerp(a.slot[1], bag[1] + 38, f) - Math.sin(f * Math.PI) * 20, 0.72, 1, 0]); }
      else if (t < tr) bagItems.push(inBag);
      else if (t < tr + 0.65) { const f = k(0, tr, tr + 0.65); flying.push([a, lerp(bag[0] + inBag.dx, a.home[0], f), lerp(bag[1] + 38, a.home[1], f) - Math.sin(f * Math.PI) * 14, lerp(0.72, 1, f), 1, 0]); }
      else r.shown.delete(i);
    });
    return { bowlItems, bagItems, flying };
  }

  function frame(dt) {
    if (!run) return false;
    const r = run, T = r.T; r.t += dt; const t = r.t;
    g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, W, H);
    const drain = ease(seg(t, T.dr0, T.drain)), fill = ease(seg(t, T.drain, T.fill));
    r.level = 1 - drain * 0.87 + fill * 0.87;
    r.dirt = r.dirt0 * soft(seg(t, 0, 0.7)) * (1 - soft(seg(t, T.drain + 0.2, T.fill - 0.1)));
    const wl = lerp(r.low, r.full, r.level), flow = Math.abs(Math.sin(Math.PI * clamp(r.level)));                  // choppier while the level moves
    const surfaceY = (x) => wl + Math.sin(x * 0.05 + t * 2.4) * (1.4 + 3.2 * flow) + Math.sin(x * 0.11 - t * 1.9) * (0.8 + 1.8 * flow);
    // the empty glass above the water
    if (wl > r.full + 1) {
      const a = soft(seg(wl - r.full, 0, 50)); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); for (let x = W; x >= 0; x -= 6) g.lineTo(x, surfaceY(x)); g.closePath();
      const ag = g.createLinearGradient(0, 0, 0, wl); ag.addColorStop(0, `rgba(238,244,240,${0.5 * a})`); ag.addColorStop(1, `rgba(214,230,226,${0.62 * a})`); g.fillStyle = ag; g.fill();
      g.fillStyle = `rgba(255,255,255,${0.2 * a})`; g.fillRect(14, 0, 5, wl); g.fillRect(W - 20, 0, 3, wl);                                           // glass edges catch the light
    }
    // the water: dirt tints it brown-green and thicker toward the bottom
    g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, surfaceY(x)); g.lineTo(W, H); g.closePath();
    const wg = g.createLinearGradient(0, wl, 0, H); wg.addColorStop(0, `rgba(122,108,46,${0.5 * r.dirt})`); wg.addColorStop(1, `rgba(62,66,26,${0.66 * r.dirt})`); g.fillStyle = wg; g.fill();
    if (r.dirt < 0.9 && r.level > 0.2) { const cg = g.createLinearGradient(0, wl, 0, wl + 140); cg.addColorStop(0, `rgba(190,238,255,${0.34 * (1 - r.dirt)})`); cg.addColorStop(1, 'rgba(190,238,255,0)'); g.fillStyle = cg; g.fill(); }
    g.beginPath(); for (let x = 0; x <= W; x += 6) x ? g.lineTo(x, surfaceY(x)) : g.moveTo(x, surfaceY(x));
    g.strokeStyle = r.dirt > 0.3 ? `rgba(214,200,140,.9)` : 'rgba(225,248,255,.95)'; g.lineWidth = 2.4; g.stroke();
    if (r.dirt > 0.3) { g.fillStyle = 'rgba(190,176,110,.7)'; for (let x = (t * 14) % 22; x < W; x += 22) { g.beginPath(); g.ellipse(x, surfaceY(x) - 1, 6, 1.6, 0, 0, 6.3); g.fill(); } }
    // debris swirling toward the siphon while it drains
    const pull = drain * (1 - fill);
    for (const d of debris) {
      const y0 = lerp(wl + 6, H - 6, d.y); if (r.dirt < 0.03 || y0 < wl + 4) continue;
      const tx = W - 80, ty = H - 100, dx = (tx - d.x) * pull * 0.5, dy = (ty - y0) * pull * 0.35;
      g.fillStyle = rgb(d.c, 0.85 * r.dirt); g.beginPath(); g.arc(d.x + Math.sin(t * 0.8 + d.ph) * 8 + dx, y0 + Math.cos(t * 0.6 + d.ph) * 6 + dy, d.r, 0, 6.3); g.fill();
    }
    if (pull > 0.1) for (let i = 0; i < 4; i++) puffs.push({ x: W - 100 + rnd() * 60, y: H - 96 + rnd() * 24, r: 6 + rnd() * 8, l: 1 });
    // fresh water: bubbles and sparkle while it rises
    if (fill > 0 && fill < 1) {
      for (let i = 0; i < 26; i++) { const x = (i * 71 + 13) % W, y = lerp(H, wl, ((t * 0.5 + i * 0.137) % 1)); g.strokeStyle = 'rgba(235,252,255,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(x + Math.sin(t * 3 + i) * 4, y, 1.5 + (i % 3), 0, 6.3); g.stroke(); }
      const sp = Math.sin(Math.PI * fill); for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(255,255,255,${0.7 * sp * rnd()})`; g.fillRect(rnd() * W, lerp(wl, H, rnd()), 2, 2); }
    }
    // siphon
    if (t > T.dr0 - 0.4 && t < T.drain + 0.6) siphon(t, soft(seg(t, T.dr0 - 0.4, T.dr0 + 0.2)) * (1 - soft(seg(t, T.drain, T.drain + 0.5))), r.dirt);
    // net: whichever of the two trips is under way
    let netNow = null;
    const tripA = t >= r.A.wp[0].t && t <= r.A.gone, tripB = t >= r.B.wp[0].t && t <= r.B.gone;
    if (tripA || tripB) { const n0 = netAt(tripA ? r.A.wp : r.B.wp, t); const vx = (n0.x - r.lastX) / Math.max(dt, 0.001); r.sx += (clamp(-vx * 0.06, -16, 16) - r.sx) * Math.min(1, dt * 6); r.lastX = n0.x; netNow = { ...n0, sway: r.sx + Math.sin(t * 5) * 1.5 }; }
    const { bowlItems, bagItems, flying } = placeFish(r, t, netNow);
    // bowl
    const bowlA = soft(seg(t, r.A.out - 0.5, r.A.out)) * (1 - soft(seg(t, r.B.rel - 0.2, r.B.rel + 0.2)));
    if (bowlA > 0.01) bowl(BX, BY, bowlItems, t, bowlA, soft(seg(t, r.A.tip, r.A.tip + 0.3)) * (1 - soft(seg(t, r.A.tip + 0.3, r.A.tip + 1.4))));
    // fish between places
    flying.forEach(([a, x, y, sc, flip, spin]) => fish2D(a, x, y, sc, t, flip, Math.sin(t * 10 + a.ph) * 0.15 + (spin ? spin * 0.05 : 0)));
    if (netNow) {
      net(netNow, t, bagItems);
      // drips fall from the wet mesh once it is clear of the water
      if (netNow.y + 90 > wl) r.wet = 1;
      if (r.wet > 0 && netNow.y + 100 < wl) { r.wet -= dt * 0.5; for (let i = 0; i < 2; i++) if (rnd() < 0.6) drops.push({ x: netNow.x + (rnd() - 0.5) * 80 + netNow.sway, y: netNow.y + 110, vx: (rnd() - 0.5) * 12, vy: 10, l: 1.4, s: 1.4 + rnd() * 1.2 }); }
    }
    r.wlNow = wl;
    // particles
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.l -= dt * 1.2; if (d.l <= 0 || d.y > surfaceY(d.x)) { if (d.y > surfaceY(d.x) && d.l > 0 && d.y < H - 60 && d.y > r.full + 20) puffs.push({ x: d.x, y: d.y, r: 3, l: 0.6, ring: 1 }); drops.splice(i, 1); continue; } g.fillStyle = 'rgba(200,235,250,.85)'; g.beginPath(); g.arc(d.x, d.y, d.s, 0, 6.3); g.fill(); }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.l -= dt * (p.ring ? 1.6 : 0.7); if (p.l <= 0) { puffs.splice(i, 1); continue; } if (p.ring) { g.strokeStyle = `rgba(235,252,255,${p.l})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(p.x, p.y, p.r + (1 - p.l) * 22, (p.r + (1 - p.l) * 22) * 0.3, 0, 0, 6.3); g.stroke(); } else { g.fillStyle = `rgba(130,112,60,${0.22 * p.l})`; g.beginPath(); g.arc(p.x, p.y, p.r * (2 - p.l), 0, 6.3); g.fill(); } }
    // the fish are out of the 3D tank from the moment they are scooped until the net sets them back
    r.fish.forEach((a, i) => { a.f.group.visible = !r.shown.has(i); });
    if (t > r.B.rel && !r.ringDone) { r.ringDone = true; r.fish.forEach((a) => { for (let j = 0; j < 3; j++) puffs.push({ x: a.home[0], y: a.home[1] + 6, r: 6 + j * 4, l: 1 - j * 0.15, ring: 1 }); }); sfx('splash'); }
    if (t >= T.end || (!r.ok && t > T.drain)) { finish(); return false; }
    // actually change the water once the new water is on its way in
    if (t >= T.drain && !r.dispatched) { r.dispatched = true; Promise.resolve(r.dispatch()).then((ok) => { if (ok === false) r.ok = false; }); }
    return true;
  }
  function finish() {
    if (!run) return; const r = run; run = null; drops.length = puffs.length = 0; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); r.fish.forEach((a) => { a.f.group.visible = true; });
    if (!r.dispatched) Promise.resolve(r.dispatch()); r.done?.(r.ok);
  }
  return { start, frame, get active() { return !!run; }, get t() { return run ? run.t : -1; }, finish };
}
