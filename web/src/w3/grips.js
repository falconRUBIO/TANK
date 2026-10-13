// Where a seahorse can really hold on. For each decoration this finds the places its tail can wrap round something real:
// a plant's stem or blade, or a thin post, branch or edge of a structure, one voxel thick, that runs on above and below the coil,
// with room round it for the coils and for the body leaning back. A decoration with no such place is not a hitching place at all.
// The search tests the whole posed seahorse (tail coiled, body leaning, turned a little either way, head flicked to strike) against
// the decorations' own voxels, so a seahorse never holds empty water or holds on through a leaf or a rock.
// It is done once for each placement of a decoration (its id, where it stands and how it is turned, and what stands near it),
// in small steps inside a per-frame time budget, and kept: moving, turning, adding or removing a decoration nearby starts a new search.
import { sandH } from './terrain.js';
import { SEAHORSE_GRIP_R, SEAHORSE_STEM, SEAHORSE_STEM_MAX, SEAHORSE_LEAN } from '../species.js';
const POST_LEANS = [SEAHORSE_LEAN, 0.55, 0.75], PLANT_LEANS = [SEAHORSE_LEAN];      // on a post it leans further back if it must, to keep its head clear of the post above the grip

export const PLANTS = new Set(['grass', 'fern', 'sword', 'red', 'kelp', 'bamboo', 'anemone']);
export const FACES = [0, Math.PI, 0.5, Math.PI - 0.5, -0.5, Math.PI + 0.5, 1, Math.PI - 1, -1, Math.PI + 1, 1.5, -1.5, 0.25, -0.25, Math.PI + 0.25, Math.PI - 0.25];      // the ways it may face on its stem, side-on to the glass first
const MAX_GRIPS = 6, MAX_CANDS = 40, C = 0.1;
const cellKey = (a, b, c) => ((a + 512) * 1024 + (b + 512)) * 1024 + (c + 512);
const CACHE = new Map(), QUEUE = [], FRAME = { t0: 0, defer: false, all: false };
export const gripStats = { searches: 0, tested: 0, workMs: 0, maxFrameMs: 0, frames: 0, worstUnitMs: 0, worstUnit: '', poseMs: 0, maxSearchFrameMs: 0 };

// the grip points of one decoration for a seahorse of this size: { status: 'pending' | 'ready', grips: [{ x, y, z, face, hf }] }
export function gripsFor(q, sh) {
  const sc = sh.scale || 0.03, sig = sh.decorSig?.(q.x, q.z, 1.8) ?? '', k = q.id + '|' + sc.toFixed(4) + '|' + sig;
  let e = CACHE.get(k);
  if (!e) {
    e = { k, q: { id: q.id, type: q.type, x: q.x, z: q.z, y: q.y ?? 0, h: q.h ?? 1 }, sh, status: 'pending', grips: [], i: 0, ctx: null };
    CACHE.set(k, e); QUEUE.push(e);
    if (CACHE.size > 300) for (const [kk, x] of CACHE) { if (x.status === 'ready') { CACHE.delete(kk); if (CACHE.size <= 240) break; } }
  }
  return e;
}
// do some of the waiting searches, for at most budgetMs this frame. A search goes in small steps (filing a few hundred voxels, looking over a few dozen
// of its own, or testing one way of facing on one stem), so no single step runs long, even on a big rock or the coconut.
export function gripWork(budgetMs = 1.5) {
  if (!QUEUE.length) return; const t0 = performance.now(); gripStats.frames++; FRAME.t0 = t0; FRAME.defer = false; FRAME.posed = false;
  while (QUEUE.length && !FRAME.defer && performance.now() - t0 < budgetMs) {
    const e = QUEUE[0];
    if (e.status !== 'pending' || CACHE.get(e.k) !== e) { QUEUE.shift(); continue; }
    const u0 = performance.now(), posing = !!e.sh.hasHeldPose && !e.sh.hasHeldPose(SEAHORSE_STEM, SEAHORSE_LEAN), ph = e.ctx?.phase ?? (posing ? 'pose' : 'begin'); advance(e); const um = performance.now() - u0; if (ph === 'pose' || FRAME.posed) { FRAME.posed = true; gripStats.poseMs = Math.max(gripStats.poseMs, um); } else if (um > gripStats.worstUnitMs) { gripStats.worstUnitMs = um; gripStats.worstUnit = ph + ':' + e.q.type; }
  }
  const ms = performance.now() - t0; gripStats.workMs += ms; gripStats.maxFrameMs = Math.max(gripStats.maxFrameMs, ms); if (!FRAME.posed) gripStats.maxSearchFrameMs = Math.max(gripStats.maxSearchFrameMs, ms);      // (frames that posed a seahorse, a one-off for each, are counted apart)
}
// for tests and tools: the whole search at once
export function gripsNow(q, sh) { const e = gripsFor(q, sh); FRAME.all = true; while (e.status === 'pending') advance(e); FRAME.all = false; return e; }
export function clearGrips() { CACHE.clear(); QUEUE.length = 0; }
export const gripQueue = () => QUEUE.length;

function finish(e) { e.status = 'ready'; e.ctx = null; gripStats.searches++; }
// one small step of a search
function advance(e) {
  if (!e.ctx) { const ok = begin(e); if (ok === false) finish(e); return; }
  const ctx = e.ctx;
  if (ctx.phase === 'file') { fileSome(ctx, 300); if (ctx.i >= ctx.vox.length) { ctx.phase = 'look'; ctx.i = 0; } return; }
  if (ctx.phase === 'look') { lookSome(ctx, 10); if (ctx.i >= ctx.own.length) { order(e); ctx.phase = 'test'; ctx.i = 0; ctx.li = 0; ctx.fi = 0; } return; }
  step(e); if (ctx.i >= ctx.cands.length || e.grips.length >= MAX_GRIPS) finish(e);
}

// getting ready, one costly thing per step: the seahorse posed as it holds on, then the voxels of each decoration near here (null: not ready yet)
function begin(e) {
  if (e.sh.hasHeldPose && !e.sh.hasHeldPose(SEAHORSE_STEM, SEAHORSE_LEAN)) { if (!FRAME.all && performance.now() - FRAME.t0 > 0.3) { FRAME.defer = true; return null; } e.sh.heldPoseData?.(); return null; }
  if (e.sh.decorVoxWarm && !e.sh.decorVoxWarm(e.q.x, e.q.z, 1.8)) return null;
  const P = e.sh.heldPoseData?.(); if (!P) return false;
  const q = e.q, sc = P.sc, vox = e.sh.decorVox?.(q.x, q.z, 1.8) ?? [];
  const own = vox.filter((v) => v[4] === q.id); if (!own.length) return false;
  const base = q.y, top = Math.max(...own.map((v) => v[1]));
  e.ctx = { phase: 'file', i: 0, vox, own, H: new Map(), hv: sc * 0.45, sc, plant: PLANTS.has(q.type), rigid: q.type === 'bamboo', q, base, ht: Math.max(0.3, top - base), cands: [], seen: new Set(), P, Rout: SEAHORSE_GRIP_R * sc + 0.09 };
  return true;
}
// every voxel filed under each cell its box (grown by half one of the seahorse's voxels) touches, so a point needs one look-up
function fileSome(ctx, n) {
  const { H, hv, vox } = ctx;
  for (const end = Math.min(vox.length, ctx.i + n); ctx.i < end; ctx.i++) { const v = vox[ctx.i], m = v[3] + hv;
    for (let a = Math.floor((v[0] - m) / C); a <= Math.floor((v[0] + m) / C); a++) for (let b = Math.floor((v[1] - m) / C); b <= Math.floor((v[1] + m) / C); b++) for (let c = Math.floor((v[2] - m) / C); c <= Math.floor((v[2] + m) / C); c++) { const k = cellKey(a, b, c); (H.get(k) ?? H.set(k, []).get(k)).push(v); } }
}
function near(ctx, v, rh, rv) { const out = [], r = Math.ceil((rh + 0.05) / C), cx = Math.floor(v[0] / C), cy = Math.floor(v[1] / C), cz = Math.floor(v[2] / C), seen = new Set();
  for (let a = -r; a <= r; a++) for (let b = -1; b <= 1; b++) for (let c = -r; c <= r; c++) { const L = ctx.H.get(cellKey(cx + a, cy + b, cz + c)); if (L) for (const w of L) if (w !== v && !seen.has(w) && Math.abs(w[1] - v[1]) < rv && Math.hypot(w[0] - v[0], w[2] - v[2]) < rh) { seen.add(w); out.push(w); } }
  return out; }
// the axis of the coil must be inside the thing: a column of its voxels running on above and below where the tail wraps
function column(ctx, x, y, z, r, h) { const id = ctx.q.id, ns = near(ctx, [x, y, z, h], r + 0.01, h * 2.6); return ns.some((w) => w[4] === id && w[1] > y + h * 0.5) && ns.some((w) => w[4] === id && w[1] < y - h * 0.5); }
// look over some of its own voxels for places a tail could go round
function lookSome(ctx, n) {
  const { own, q, base, ht, sc, plant, seen } = ctx;
  for (const end = Math.min(own.length, ctx.i + n); ctx.i < end; ctx.i++) { const v = own[ctx.i];
    if (plant) { if (Math.hypot(v[0] - q.x, v[2] - q.z) < 0.8 && v[1] > base + ht * 0.28 && v[1] < base + ht * 0.8 && column(ctx, v[0], v[1], v[2], 0.02, v[3])) ctx.cands.push([v[0], v[1], v[2], v[3], SEAHORSE_STEM]); continue; }      // a stem or blade (its leaves are pressed aside, see the plant shader)
    // a post, a branch or a rail: at this height a small cluster of its voxels (its cross-section) with open water all round for the coils.
    // The coil is sized to it: thicker posts get fewer, wider turns, up to what the tail can still wrap.
    if (v[1] < base + Math.max(0.25, ht * 0.15) || v[1] > base + ht * 0.9) continue;
    const lay = near(ctx, v, 0.36, v[3] * 1.1), inner = [v, ...lay.filter((w) => w[4] === q.id && Math.hypot(w[0] - v[0], w[2] - v[2]) < 0.15)];
    const cx = inner.reduce((a, w) => a + w[0], 0) / inner.length, cz = inner.reduce((a, w) => a + w[2], 0) / inner.length, r = Math.max(...inner.map((w) => Math.hypot(w[0] - cx, w[2] - cz) + w[3]));
    const need = (r * 1.42) / sc + 1.1, stem = Math.max(SEAHORSE_STEM, Math.ceil(need * 4) / 4); if (need > SEAHORSE_STEM_MAX) continue;      // the inside of the coil clears the post's corners by as much as a plant stem's; too thick for its tail to go round, and it is not a grip
    const key = Math.round(cx / 0.04) + ',' + Math.round(v[1] / 0.05) + ',' + Math.round(cz / 0.04); if (seen.has(key)) continue; seen.add(key);
    if (lay.some((w) => !inner.includes(w) && Math.hypot(w[0] - cx, w[2] - cz) < r + 0.2)) continue;      // something else close round it at this height: no room for the coils
    if (!column(ctx, cx, v[1], cz, r, v[3])) continue;
    ctx.cands.push([cx, v[1], cz, v[3], stem]);
  }
}
// spread through the height, in an order of its own for this decoration, at most MAX_CANDS
function order(e) {
  const ctx = e.ctx; let cands = ctx.cands;
  cands.sort((a, b) => a[1] - b[1]); if (cands.length > MAX_CANDS) { const st = cands.length / MAX_CANDS; cands = Array.from({ length: MAX_CANDS }, (_, i) => cands[Math.floor(i * st)]); }
  let s = 0; for (const ch of e.q.id) s = (s * 31 + ch.charCodeAt(0)) | 0; for (let i = cands.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) | 0; const j = ((s >>> 8) % (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  ctx.cands = cands; ctx.vox = ctx.own = null; ctx.seen = null;
}

// how many of its voxels would be inside a decoration (or the sand) with the stem at (sx, yy, sz) and the seahorse facing `face`
function clashes(ctx, P, sx, yy, sz, face, limit) {
  const { H, hv, plant, Rout } = ctx, sc = P.sc, gl = P.gripLocal; let bad = 0;
  for (const [dh, p, pts] of P.poses) {
    const gx = gl[0] * Math.cos(p) - gl[1] * Math.sin(p), gy = gl[0] * Math.sin(p) + gl[1] * Math.cos(p), ch = Math.cos(face + dh), sh = Math.sin(face + dh), px = sx - ch * gx * sc, py = yy - gy * sc, pz = sz + sh * gx * sc;
    for (let i = 0; i < pts.length; i += 3) {
      const lx = pts[i], ly = pts[i + 1], lz = pts[i + 2], wx = px + lx * ch + lz * sh, wy = py + ly, wz = pz - lx * sh + lz * ch;
      gripStats.tested++;
      if (wy < sandH(wx, wz) + 0.02) { if (++bad > limit) return bad; continue; }
      const L = H.get(cellKey(Math.floor(wx / C), Math.floor(wy / C), Math.floor(wz / C))); if (!L) continue;
      for (const v of L) {
        if (plant && !ctx.rigid && Math.abs(v[1] - yy) < 0.22) { const hd = Math.hypot(v[0] - sx, v[2] - sz); if (hd > 0.06 && hd < Rout) continue; }      // a leaf pressed aside by the tail (bamboo's stalks are rigid: never pressed aside)
        const m = v[3] + hv; if (Math.abs(v[0] - wx) < m && Math.abs(v[1] - wy) < m && Math.abs(v[2] - wz) < m) { if (++bad > limit) return bad; break; }
      }
    }
  }
  return bad;
}

// one way of facing on one candidate stem (the first with no clash at all becomes a grip, and the search moves to the next stem)
function step(e) {
  const ctx = e.ctx, v = ctx.cands[ctx.i]; if (!v) { ctx.i++; return; }
  const next = () => { ctx.i++; ctx.li = 0; ctx.fi = 0; };
  if (ctx.li === 0 && ctx.fi === 0 && e.grips.some((g) => Math.hypot(g.x - v[0], g.z - v[2]) < 0.1 && Math.abs(g.y - v[1]) < 0.25)) return next();      // keep the grips on one decoration apart
  const leans = ctx.plant ? PLANT_LEANS : POST_LEANS, lean = leans[ctx.li];
  const fresh = !(v[4] === SEAHORSE_STEM && lean === SEAHORSE_LEAN) && !e.sh.hasHeldPose?.(v[4], lean);
  if (fresh && !FRAME.all && performance.now() - FRAME.t0 > 0.3) { FRAME.defer = true; return; }      // posing it for a new stem takes a few ms: that waits for the start of a frame, on its own
  const P = v[4] === SEAHORSE_STEM && lean === SEAHORSE_LEAN ? ctx.P : e.sh.heldPoseData?.(v[4], lean); if (!P) return next(); if (fresh) return;      // the seahorse as it would hold a stem this thick, leaning this far back
  const face = FACES[ctx.fi];
  if (clashes(ctx, P, v[0], v[1], v[2], face, 0) === 0) { e.grips.push({ x: v[0], y: v[1], z: v[2], face, stem: v[4], lean, hf: Math.min(1, Math.max(0, (v[1] - ctx.base) / ctx.ht)) }); return next(); }
  if (++ctx.fi >= FACES.length) { ctx.fi = 0; if (++ctx.li >= leans.length) next(); }
}
