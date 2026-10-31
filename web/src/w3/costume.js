// Halloween costumes for every animal in the tank: a hat, a nose, a cape, a broom or a pair of wings fastened to its body (voxels, like the
// body), and for most a paint job over its own colors (bandages, bones, a ghost's pallor, a racing silk, a pumpkin's ribs). Each animal keeps
// its own shape and its own shading under the costume: it still reads as that fish, in a witch's hat. The octopus is a pumpkin every Halloween,
// seahorses mostly run as racehorses. Pure cosmetics: nothing here changes a collider, a behavior or a shared record, and undress() puts
// everything back exactly as it was.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';

const BLACK = [26, 20, 36], PURPLE = [122, 54, 176], GOLD = [240, 196, 80], RED = [196, 34, 40], BONE = [236, 230, 212], WRAP = [224, 212, 186], GREEN = [118, 176, 84], WHITE = [246, 246, 250], PINK = [240, 150, 180], NAVY = [36, 46, 100], STRAW = [196, 160, 80];
export const COSTUMES = {
  witch: { label: 'a witch, broom and all' }, wizard: { label: 'a wizard' }, pirate: { label: 'a pirate' }, vampire: { label: 'a vampire' }, mummy: { label: 'a mummy' }, skeleton: { label: 'a skeleton' },
  ghost: { label: 'a ghost' }, devil: { label: 'a little devil, pitchfork and all' }, cat: { label: 'a black cat' }, frank: { label: "Frankenstein's monster" }, bat: { label: 'a bat' }, pumpkin: { label: 'a jack-o’-lantern' },
  firefighter: { label: 'a firefighter' }, police: { label: 'a police officer' }, racehorse: { label: 'a racehorse' },
};
const FISH_SET = ['witch', 'vampire', 'pirate', 'skeleton', 'ghost', 'mummy', 'devil', 'cat', 'frank', 'wizard', 'bat', 'firefighter', 'police'];
const SEA_SET = ['racehorse', 'witch', 'racehorse', 'ghost', 'police', 'racehorse', 'skeleton', 'firefighter'];
const CRAB_SET = ['witch', 'pirate', 'wizard', 'devil', 'police', 'firefighter'], TURTLE_SET = ['pirate', 'witch', 'mummy', 'skeleton', 'wizard', 'firefighter', 'police'], FRY_SET = ['mummy', 'skeleton', 'ghost'];
const FREE = new Set(['racehorse', 'pumpkin']);      // worn by as many as like: the rest go round the tank one each before any repeats
const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
// which costume an animal wears: the same on every phone (from its seed and name), the octopus always a pumpkin, a seahorse mostly a racehorse,
// a crab or a turtle from the sets that fit a body with a shell, a nursery baby a paint-only costume (its head is still changing shape).
// `used` is what the rest of the tank already wears, so no two fish dress alike while there are costumes to go round
export function costumeFor(f, used = null) {
  if (f.species?.move === 'jet') return 'pumpkin';
  const set = f.crab ? CRAB_SET : TURTLES.has(f.species?.id) ? TURTLE_SET : (f.cute ?? 0) > 0.3 || f.nursery ? FRY_SET : f.sp?.tail ? SEA_SET : FISH_SET;
  const h = Math.abs((f.seed | 0) * 2654435761 + (f.name?.length ?? 0) * 97 + (f.name?.charCodeAt(0) ?? 0)) >>> 0, n = set.length;
  for (let t = 0; t < n; t++) { const kind = set[(h + t) % n]; if (!used || FREE.has(kind) || !used.has(kind)) return kind; }
  return set[h % n];
}

// ── where things go on a body (model voxel coordinates, +x forward) ──
function anchors(f) {
  const V = f.vox; let ex = 0, ey = 0, n = 0; for (const v of V) if (v.tag === 'eye' || v.em) { ex += v.x; ey += v.y; n++; }
  let x1 = -1e9, x0 = 1e9, y0 = 1e9, y1 = -1e9; for (const v of V) { x1 = Math.max(x1, v.x); x0 = Math.min(x0, v.x); if (v.tag !== 'pouch' && v.tag !== 'tail') { y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } }
  const E = n ? { x: ex / n, y: ey / n } : { x: x1 - 3, y: 0 };
  let top = -1e9, topX = E.x, nose = -1e9, w = 0, bot = 1e9, shellTop = -1e9, shellX = 0, shellN = 0, mTop = -1e9, mX = 0, mN = 0, wMax = 0;
  for (const v of V) { if (v.tag === 'pouch') continue; wMax = Math.max(wMax, Math.abs(v.z));
    if (Math.abs(v.x - E.x) <= 2.2 && Math.abs(v.z) <= 2.5) { if (v.y > top) { top = v.y; topX = v.x; } w = Math.max(w, Math.abs(v.z)); }
    if (Math.abs(v.y - E.y) <= 2.5 && Math.abs(v.z) <= 1.5 && v.x > nose) nose = v.x;
    if (v.x > E.x - 1.5 && v.y < bot) bot = v.y;
    if (v.tag !== 'head' && v.tag !== 'eye' && !v.em && v.y > shellTop - 0.5) { if (v.y > shellTop) { shellTop = v.y; shellX = 0; shellN = 0; } shellX += v.x; shellN++; }
    if (v.arm === undefined || (v.arm < 0 && !v.web)) { if (v.y > mTop - 0.5) { if (v.y > mTop) { mTop = v.y; mX = 0; mN = 0; } mX += v.x; mN++; } } }
  const cols = new Map(); for (const v of V) if (v.tag !== 'pouch') { const key = Math.round(v.x) + ',' + Math.round(v.z); cols.set(key, Math.max(cols.get(key) ?? -1e9, v.y)); }
  const colTop = (x, z) => cols.get(Math.round(x) + ',' + Math.round(z)) ?? -1e9;      // the top of the body above a point of the floor plan (or nothing there)
  const bots = new Map(); for (const v of V) if (v.tag !== 'pouch') { const key = Math.round(v.x) + ',' + Math.round(v.z); bots.set(key, Math.min(bots.get(key) ?? 1e9, v.y)); }
  const colBot = (x, z) => bots.get(Math.round(x) + ',' + Math.round(z)) ?? 1e9;      // and its underside
  return { E, top, topX, nose, w: Math.max(1.2, w), wMax, bot, x0, x1, y0, y1, len: x1 - x0, mid: (y0 + y1) / 2, hh: Math.max(3, top - bot), colTop, colBot, shell: { x: shellN ? shellX / shellN : 0, y: shellTop }, mantle: { x: mN ? mX / mN : 0, y: mTop } };
}

// ── the pieces: each a Vox in the fish's own voxel units, its origin where it sits on the body ──
function hatVox(kind, seed = 1) {
  const v = new Vox(1);
  if (kind === 'witch' || kind === 'wizard') {
    const col = kind === 'witch' ? BLACK : [40, 48, 140], band = kind === 'witch' ? PURPLE : [226, 180, 60];
    for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 10.5) v.set(i, 0, k, mix(col, [60, 50, 80], 0.2));                // the brim
    for (let j = 1; j <= 8; j++) { const r = 2.6 - j * 0.3, bend = kind === 'witch' ? Math.max(0, j - 4) * 0.45 : 0;                                  // the cone, a witch's bent at the tip
      for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if ((i + bend) ** 2 + k * k <= r * r + 0.3) v.set(i, j, k, j <= 2 ? band : kind === 'wizard' && hash(i, j, k, seed) > 0.8 ? GOLD : mix(col, [0, 0, 0], 0.15 * (j / 8))); }
    if (kind === 'witch') { v.set(3, 1, 0, GOLD); v.set(3, 2, 0, GOLD); }                                                                            // the buckle, at the front
  } else if (kind === 'pirate') {      // a black tricorn: a wide brim turned up on three sides with gold trim, a domed crown, a white skull and crossbones at the front
    for (let i = -4; i <= 4; i++) for (let k = -4; k <= 4; k++) { const d = Math.hypot(i, k); if (d > 4.4) continue; const rim = d > 3.3, up = rim && (i > 1.5 || Math.abs(k) > 2.4); v.set(i, 0, k, rim ? mix(BLACK, GOLD, 0.35) : BLACK); if (up) { v.set(i, 1, k, BLACK); v.set(i, 2, k, GOLD); } }
    for (let j = 1; j <= 4; j++) { const r = 2.8 - j * 0.35; for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= r * r + 0.3) v.set(i, j, k, j === 4 ? [50, 44, 60] : BLACK); }
    v.set(3, 2, 0, WHITE); v.set(3, 3, 0, WHITE); v.set(3, 3, 1, WHITE); v.set(3, 3, -1, WHITE); v.set(3, 1, 1, WHITE); v.set(3, 1, -1, WHITE);      // the skull and the crossed bones below it
  } else if (kind === 'devil') {
    for (const side of [-1, 1]) for (let j = 0; j <= 3; j++) { const r = 1.1 - j * 0.25; for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) if (i * i + k * k <= r * r + 0.2) v.set(i, j, Math.round(side * (1.7 + j * 0.35)) + k, j === 3 ? [240, 90, 70] : RED); }      // two horns, curving out
  } else if (kind === 'cat') {
    for (const side of [-1, 1]) for (let j = 0; j <= 3; j++) for (let k = -2 + j; k <= 2 - j; k++) v.set(0, j, Math.round(side * 2) + k, Math.abs(k) <= 2 - j - 1 && j < 2 ? PINK : BLACK);      // two pointed ears, pink inside
  } else if (kind === 'frank') {
    for (let i = -3; i <= 2; i++) for (let k = -3; k <= 3; k++) if (Math.abs(k) <= 3 - Math.max(0, -i - 2) * 0.5) v.set(i, 0, k, BLACK), v.set(i, 1, k, i === -3 ? BLACK : [36, 30, 44]);      // the flat black hair
  } else if (kind === 'bat') {      // two pointed bat ears, standing up from the head
    for (const side of [-1, 1]) for (let j = 0; j <= 3; j++) { const w = j < 2 ? 1 : 0; for (let k = -w; k <= w; k++) v.set(0, j, Math.round(side * 1.9) + k, k === 0 && j < 2 ? [150, 70, 140] : BLACK); }
  } else if (kind === 'hair') {
    for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 9.5) v.set(i, 0, k, hash(i, 0, k, 2) > 0.7 ? [50, 46, 66] : BLACK); v.set(3, 0, 0, BLACK); v.set(4, -1, 0, BLACK);      // slicked back, a widow's peak at the front
  } else if (kind === 'firefighter') {      // a red fire helmet: a long brim curling down at the back, a raised crest ridge over the crown, a gold front shield
    for (let j = 0; j <= 4; j++) for (let i = -6; i <= 4; i++) for (let k = -4; k <= 4; k++) { const back = i < -2 ? (-i - 2) * 0.9 : 0, r = 3.6 - j * 0.85 + (j === 0 ? 0.6 : 0) + (j === 0 ? back : back * 0.3); if (i * i * 0.55 + k * k > r * r) continue; if (j === 0 && Math.abs(k) < 2.8 && i > -2 && i < 3) continue; v.set(i, j, k, j === 0 ? [140, 20, 24] : [214, 36, 40]); }
    for (let i = -3; i <= 1; i++) v.set(i, 4, 0, [200, 60, 50]); v.set(-1, 5, 0, [200, 60, 50]); v.set(0, 5, 0, [200, 60, 50]);      // a low crest ridge along the crown
    v.set(4, 1, 0, GOLD); v.set(4, 2, 0, GOLD); v.set(4, 2, 0, BLACK); v.set(4, 3, 0, GOLD);      // the front shield, a dark number plate in its middle
  } else if (kind === 'police') {
    for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (i * i + k * k <= 10) v.set(i, 1, k, NAVY), v.set(i, 2, k, i * i + k * k <= 6 ? NAVY : mix(NAVY, [20, 24, 50], 0.5));      // the cap, a flat crown
    for (let i = 3; i <= 5; i++) for (let k = -2; k <= 2; k++) if (Math.abs(k) <= 2 - (i - 3) * 0.5) v.set(i, 0, k, [20, 18, 28]);                      // the visor
    v.set(3, 2, 0, GOLD); v.set(3, 3, 0, GOLD);                                                                                                       // the badge
  }
  return v;
}
const box = (w, h, d, col) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: new THREE.Color(col[0] / 255, col[1] / 255, col[2] / 255), roughness: 0.7 }));
const DIGITS = ['###,#.#,#.#,#.#,###', '.#.,##.,.#.,.#.,###', '###,..#,###,#..,###', '###,..#,###,..#,###', '#.#,#.#,###,..#,..#', '###,#..,###,..#,###', '###,#..,###,#.#,###', '###,..#,..#,..#,..#', '###,#.#,###,#.#,###', '###,#.#,###,..#,###'].map((d) => d.split(','));
const SILKS = [[200, 30, 40], [30, 90, 200], [30, 150, 70], [240, 190, 40], [150, 50, 190], [240, 120, 30]];

// ── the paint jobs: a new set of base colors, the body's own light and shade kept under them ──
const lin = (c) => c.map((x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
function paint(kind, f, A) {
  const b = f.baseCol, n = f.vox.length, out = Float32Array.from(b); let ls = 0; for (let i = 0; i < n; i++) ls += b[i * 3] * 0.3 + b[i * 3 + 1] * 0.59 + b[i * 3 + 2] * 0.11; const lavg = ls / n;
  const E = A.E, mid = A.mid, silk = SILKS[(f.seed | 0) % SILKS.length], num = DIGITS[1 + ((f.seed | 0) % 9)], bandY = A.y0 + (A.y1 - A.y0) * 0.42, bandH = Math.max(3, (A.y1 - A.y0) * 0.17);
  let bx = 0, bn = 0; for (const v of f.vox) if (v.tag !== 'tail' && Math.abs(v.y - bandY) <= bandH) { bx += v.x; bn++; } bx = bn ? bx / bn : E.x;      // the saddle cloth's middle
  for (let i = 0; i < n; i++) {
    const v = f.vox[i], o = i * 3; if (kind === 'pumpkin' && v.tag === 'eye' && !v.pupil) { const L = lin([255, 236, 140]); out[o] = L[0]; out[o + 1] = L[1]; out[o + 2] = L[2]; continue; }      /* (the lantern's eyes are the octopus's own, lit) */
    if (v.tag === 'eye' || v.em || v.tag === 'beak' || v.tag === 'pouch') continue;
    const q = hash(v.x, v.y, v.z, 7), l = b[o] * 0.3 + b[o + 1] * 0.59 + b[o + 2] * 0.11, sh = Math.max(0.55, Math.min(1.25, 0.9 + 0.7 * (l - lavg))), behind = v.x < E.x - 3.2; let c = null, keep = 0;
    if (kind === 'mummy') { const ph = v.x * 1.15 + v.y * 0.4 + Math.abs(v.z) * 0.15, seam = Math.abs(Math.sin(ph)) < 0.1, near = Math.hypot(v.x - E.x, v.y - E.y) <= 2.2; c = near ? [150, 140, 128] : seam ? [206, 196, 178] : mix([246, 242, 232], [228, 220, 204], q * 0.7); keep = 0; }      // wrapped head to tail in white and off-white gauze, a faint seam where each wrap crosses the next, the eyes in a shaded slit
    else if (kind === 'skeleton') { const spine = Math.abs(v.y - mid) <= 0.9 && behind, rib = behind && ((Math.round(v.x - E.x) % 3) + 3) % 3 === 0 && v.y > mid - 5 && v.y < mid + 2.5 && Math.abs(v.z) >= 0.5; c = !behind || spine || rib ? mix(BONE, [200, 192, 170], q * 0.4) : [26, 22, 36]; }
    else if (kind === 'ghost') { const hole = Math.hypot(v.x - E.x, v.y - E.y) <= 1.9 && Math.abs(v.z) > 0.8, mouth = Math.hypot(v.x - (E.x + 0.6), v.y - (E.y - 3.2)) <= 1.2 && Math.abs(v.z) > 0.8; c = hole || mouth ? [18, 16, 28] : mix(WHITE, [214, 220, 240], q * 0.5); keep = hole || mouth ? 0 : 0.12; }      // the sheet, with two eye holes and a round surprised mouth cut in each side
    else if (kind === 'frank') { if (!behind) { const scar = Math.abs(v.z) > 0.8 && Math.abs(v.y - (E.y - 2.2)) <= 0.5 && v.x > E.x - 3 && v.x < E.x + 0.5, stitch = Math.abs(v.z) > 0.8 && Math.round(v.x - E.x) % 2 === 0 && Math.abs(v.y - (E.y - 2.2)) <= 1.4 && v.x > E.x - 3 && v.x < E.x + 0.5; c = scar || stitch ? [26, 24, 36] : GREEN; keep = scar || stitch ? 0 : 0.25; } else { c = [40, 42, 64]; keep = 0.08; } }      // a green face with a stitched scar, a dark square jacket
    else if (kind === 'vampire') { if (!behind) { c = [222, 216, 232]; keep = 0.25; } else { const shirt = v.y < mid + 0.5 && v.y > mid - 4.5 && v.x > E.x - 8 && Math.abs(v.z) > 0.8, tie = Math.abs(v.y - (mid + 0.5)) <= 0.6 && v.x > E.x - 4.5 && Math.abs(v.z) > 0.8; c = tie ? RED : shirt ? WHITE : [30, 28, 42]; keep = tie ? 0 : shirt ? 0.1 : 0.08; } }      /* (a dark paint needs almost none of the fish left in it: in linear light a fifth of a bright fish outshines a black suit) */      // a pale face, a black suit with a white shirt front and a red bow tie
    else if (kind === 'pirate') { if (behind && !TURTLES.has(f.species?.id)) {      /* (a turtle keeps its shell: the tricorn is enough) */ const stripe = ((Math.round(v.y - mid) % 3) + 3) % 3 === 0; c = stripe ? [200, 34, 40] : WHITE; keep = 0.08; } }      // a red-and-white striped shirt
    else if (kind === 'bat') { c = [34, 24, 48]; keep = 0.1; }                                                                                          // a bat is dark all over
    else if (kind === 'cat') { c = [24, 20, 30]; keep = 0.12; }                                                                                       // all in black
    else if (kind === 'devil') { c = [190, 30, 36]; keep = 0.45; }                                                                                    // all in red
    else if (kind === 'firefighter') { if (behind) { const m = ((Math.round(v.x - E.x) % 6) + 6) % 6, stripe = m <= 1, band = Math.abs(v.y - (mid - 1)) <= 0.6; c = band ? [30, 28, 34] : stripe ? [236, 236, 244] : [240, 180, 30]; keep = 0.05; } }      // a yellow turnout coat with wide reflective stripes and a black belt      // a yellow turnout coat with reflective stripes
    else if (kind === 'police') { if (behind) { c = NAVY; keep = 0.05; } }                                                                            // navy blues
    else if (kind === 'racehorse') {
      if (v.tag === 'tail') { c = null; }
      else if (v.y > E.y - 6) { c = Math.abs(v.z) <= 0.5 && (v.nx ?? 0) > 0.4 ? WHITE : silk; keep = 0.2; }                                           // the hood in the stable's silk, a white blaze down the face
      else if (Math.abs(v.y - bandY) <= bandH) { c = WHITE; keep = 0.1; const dx = Math.round(v.x - bx) + 1, dy = Math.round(bandY + 2 - v.y); if (Math.abs(v.nz ?? 0) > 0.4 && dx >= 0 && dx <= 2 && dy >= 0 && dy <= 4 && num[dy][dx] === '#') c = [20, 18, 28]; }      // the saddle cloth, numbered on both sides
    } else if (kind === 'pumpkin') {
      const onArm = v.arm >= 0 || !!v.web; if (onArm) { c = [70, 130, 50]; keep = 0.45; }                                                               // the arms, a tangle of green vine
      else { const cx = f.mcx ?? 0, cy = f.mcy ?? 0, px = v.x - cx, py = v.y - cy, ang = Math.atan2(v.z, py), rib = 0.5 + 0.5 * Math.cos(ang * 8); c = mix([236, 118, 32], [172, 74, 18], 0.2 + 0.6 * rib);
        const side = Math.abs(v.nz ?? 0) > 0.35, nose = Math.abs(px) <= 0.9 && py >= -0.9 && py <= 0.6, grin = py <= -1.8 && py >= -4.4 && Math.abs(px) <= 5 && (py > -3 || Math.round(px + 10) % 2 === 0);
        if (side && (nose || grin)) c = [255, 232, 140]; } }      /* (a nose and a toothy grin cut in each side of the mantle; the eyes are its own) */
    if (!c) continue; const L = lin(c); out[o] = L[0] * sh * (1 - keep) + b[o] * keep; out[o + 1] = L[1] * sh * (1 - keep) + b[o + 1] * keep; out[o + 2] = L[2] * sh * (1 - keep) + b[o + 2] * keep;
  }
  return out;
}
const PAINTED = new Set(['mummy', 'skeleton', 'ghost', 'frank', 'pumpkin', 'cat', 'devil', 'firefighter', 'police', 'racehorse', 'vampire', 'pirate', 'bat']);
const HATS = { witch: 'witch', wizard: 'wizard', pirate: 'pirate', devil: 'devil', cat: 'cat', frank: 'frank', vampire: 'hair', firefighter: 'firefighter', police: 'police', bat: 'bat' };

// ── on and off ──
export function dress(f, kind = costumeFor(f)) {
  if (f.hw || !f.vox || !f.mesh) return null;
  const A = anchors(f), g = new THREE.Group(), parts = [], hw = { kind, label: COSTUMES[kind]?.label ?? kind, group: g, s: f.scale, parts, base0: null };
  const put = (v, x, y, z, k = 1, ry = 0) => { const m = v.mesh(); m.position.set(x, y, z); m.scale.setScalar(k); m.rotation.y = ry; g.add(m); parts.push(m); return m; };
  const putBox = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); parts.push(m); return m; };
  const turtle = TURTLES.has(f.species?.id), octo = f.species?.move === 'jet', crab = !!f.crab, sea = !!f.sp?.tail;
  const k = turtle ? 1.1 : Math.max(0.9, Math.min(2.0, A.hh * 0.105)),      /* (a brim about three fifths of the head's height: a hat, not a tent) */ hatAt = turtle ? { x: A.shell.x, y: A.shell.y + 0.6 } : octo ? { x: A.mantle.x, y: A.mantle.y - 0.5 } : { x: A.topX, y: A.top + 0.3 };      // a hat in proportion to the head it sits on
  if (crab) {      // a crab's hat sits on its front shield, behind the eyestalks (its own fine voxels: the crab's frame is in meters)
    const U = 0.034, v = hatVox(HATS[kind] ?? kind), m = v.mesh(); m.scale.setScalar(U * 0.5); m.position.set(0.3 * U, 3.0 * U, 0); f.bodyG.add(m); parts.push(m); hw.group = m; f.hw = hw; return hw;
  }
  if (!octo && (f.cute ?? 0) <= 0.3 && !f.nursery) {
    if (HATS[kind] && (!turtle || kind !== 'cat')) put(hatVox(HATS[kind], f.seed), hatAt.x, hatAt.y + (kind === 'vampire' ? -0.3 : 0), 0, k * (kind === 'firefighter' ? 1.15 : 1));
    if (kind === 'witch') { putBox(box(1.2 * k, 1.0 * k, 1.0 * k, [120, 168, 80]), A.nose + 0.6 * k, A.E.y - 0.5 * k, 0);                               // a warty green nose
      if (!turtle) { const L = A.len * 0.95, hy = A.bot - 0.7 * k; putBox(box(L, 0.32 * k, 0.32 * k, [150, 110, 60]), A.x1 - L / 2 + 0.5 * k, hy, 0);      // and a broom under it, ridden along the body
        const v = new Vox(1); for (let i = 0; i <= 5; i++) { const r = 1 + i * 0.45; for (let j = -3; j <= 3; j++) for (let z = -3; z <= 3; z++) if (Math.abs(j) + Math.abs(z) <= r) v.set(-i, j, z, i === 0 ? [110, 70, 40] : hash(i, j, z, 3) > 0.5 ? STRAW : [160, 124, 56]); } put(v, A.x1 - L + 0.5 * k, hy, 0, k * 0.55); } }      // the bristles, bound at the back end
    if (kind === 'pirate' && !turtle) { putBox(box(0.5, 1.3 * k, 1.3 * k, BLACK), A.E.x, A.E.y, A.w + 0.45); for (let i = 0; i < 4; i++) putBox(box(0.5, 0.3 * k, 0.7 * k, BLACK), A.E.x, A.E.y + (0.7 + i * 0.42) * k, A.w + 0.2 - i * 0.3 * k); }      // an eye patch and its strap (not on a turtle: its head turns on its own)
    if (kind === 'vampire') { const v = new Vox(1), L = Math.max(6, Math.round(A.len * 0.42)), c0 = -Math.max(3, Math.round(A.hh * 0.45)); let w0 = 0;      /* (the collar at the neck, behind the head) */      // a cape draped over its back from the collar, falling down both sides, red at the hem
      for (let i = c0; i >= c0 - L; i--) { const x = Math.round(A.topX) + i, w = 1 + Math.round((c0 - i) * 0.4) + 1; let any = false; for (let z = -w; z <= w; z++) { const t = A.colTop(x, z); if (t < -1e8) continue; const edge = Math.abs(z) === w || A.colTop(x, z + Math.sign(z || 1)) < -1e8 || i === c0 - L; v.set(i, Math.round(t - A.top) + 1, z, edge ? RED : hash(x, 0, z, 3) > 0.85 ? [50, 30, 60] : BLACK); any = true; if (i === c0) w0 = Math.max(w0, Math.abs(z)); } if (!any && i < c0 - 1) break; }
      { const y0 = Math.round((A.colTop(Math.round(A.topX) + c0, 0) > -1e8 ? A.colTop(Math.round(A.topX) + c0, 0) : A.top) - A.top) + 1; for (let z = -(w0 + 1); z <= w0 + 1; z++) { const H = Math.round(1.6 * k + 1.2 * k * (1 - Math.abs(z) / (w0 + 1.5))); for (let j = 0; j <= H; j++) { v.set(c0, y0 + j, z, j === H || Math.abs(z) === w0 + 1 ? RED : BLACK); if (j > 0) v.set(c0 + 1, y0 + j, z, RED); } } } put(v, A.topX, A.top, 0);      // a tall Dracula collar fanning up behind the head, scarlet on the inside
      for (const z of [-0.6 * k, 0.6 * k]) { putBox(box(0.4 * k, 0.9 * k, 0.4 * k, WHITE), A.nose - 0.8 * k, A.bot - 0.25 * k, z); putBox(box(0.25 * k, 0.5 * k, 0.25 * k, [170, 20, 30]), A.nose - 0.8 * k, A.bot - 0.9 * k, z); } }      // fangs, and a drop of blood on each
    if (kind === 'bat') { const L = Math.max(5, Math.round(A.len * 0.4)), Hh = Math.max(4, Math.round(A.hh * 0.8)), bx = Math.round(A.topX - A.len * 0.2), base = Math.max(A.colTop(bx, 0), A.colTop(bx, 1), A.colTop(bx, -1)), zs = Math.round(A.wMax * 0.5) + 1, v = new Vox(1), MEM = [118, 62, 156];      // two wings a bit under half its length, swept back along its sides: black finger bones through a lighter violet membrane, two deep scallops along the trailing edge
      for (const side of [-1, 1]) for (let i = 0; i >= -L; i--) { const u = -i / L, topJ = Math.round(Hh * Math.sin(Math.PI * Math.min(1, u * 0.7 + 0.22))), botJ = Math.round(Hh * 0.35 * Math.abs(Math.sin(u * Math.PI * 2))), bone = i === 0 || i === -L || ((-i) % 3 === 0); for (let j = Math.min(botJ, topJ); j <= topJ; j++) v.set(i, j, side * zs, j === topJ || j === Math.min(botJ, topJ) || bone ? BLACK : MEM); }
      put(v, bx, (base > -1e8 ? base : A.top - 2) + 0.4, 0, 1);
      for (const z of [-0.5 * k, 0.5 * k]) putBox(box(0.35 * k, 0.8 * k, 0.35 * k, WHITE), A.nose - 0.8 * k, A.bot - 0.2 * k, z); }      // two little fangs
    if (kind === 'cat') { for (const side of [-1, 1]) for (let i = 0; i < 3; i++) putBox(box(0.22 * k, 0.16 * k, 2.4 * k, WHITE), A.nose - (0.5 + i * 0.3) * k, A.E.y - (1.2 - i * 0.4) * k, side * 1.5 * k);      // whiskers
      if (!sea) { const v = new Vox(1); for (let q = 0; q <= 7; q++) { v.set(-q, Math.round(q * q * 0.1), 0, BLACK); if (q > 5) v.set(-q, Math.round(q * q * 0.1) + 1, 0, BLACK); } put(v, A.x0 + 0.5, A.mid, 0, k * 0.7); } }      // a long black tail curling up behind
    if (kind === 'wizard') { const v = new Vox(1); for (let j = 0; j >= -4; j--) { const w = 1.5 + 0.35 * j; for (let z = -2; z <= 2; z++) for (let i = -1; i <= 1; i++) if (Math.abs(z) <= w && Math.abs(i) <= w * 0.6) v.set(i, j, z, hash(i, j, z, 4) > 0.6 ? [226, 226, 232] : WHITE); } put(v, A.nose - 1.2 * k, A.bot + 0.2, 0, k * 0.55); }      // a long white beard
    if (kind === 'pirate' && !turtle) { const v = new Vox(1); v.fill(-1, 0, -1, 1, 2, 1, [40, 160, 70]); v.fill(0, 3, -1, 1, 4, 1, [210, 40, 40]); v.set(2, 3, 0, GOLD); v.set(1, 4, 1, BLACK); v.set(1, 4, -1, BLACK); v.set(-2, 1, 0, [40, 120, 200]); v.set(-3, 0, 0, [40, 120, 200]); put(v, A.topX - A.len * 0.3, A.colTop(Math.round(A.topX - A.len * 0.3), 0) + 0.5, 0, k * 0.5); }      // a little parrot riding on its back
    if (kind === 'mummy') { const v = new Vox(1); for (let q = 0; q <= 7; q++) v.set(-q, -Math.round(q * q * 0.06), 0, WRAP); put(v, A.x0 + 0.5, A.mid - 1, 0, k * 0.7);      // a loose end trailing behind
      for (let n = 0; n < 4; n++) { const x = Math.round(A.x0 + A.len * (0.2 + n * 0.2)), z = (n % 2 ? 1 : -1) * Math.min(1, Math.round(A.wMax * 0.3)), y = A.colBot(x, z); if (y > 1e8) continue; const v2 = new Vox(1), len = 3 + (n % 3); for (let q = 0; q <= len; q++) v2.set(-Math.round(q * 0.35), -q, 0, hash(n, q, 0, 2) > 0.5 ? WRAP : [240, 236, 226]); put(v2, x, y - 0.5, z, 1); }      // bandage ends hanging loose off its underside, swept back a little
      { const v3 = new Vox(1); for (let q = 0; q <= 4; q++) v3.set(-q, Math.round(q * 0.5) + 1, 0, WRAP); put(v3, A.topX - 1, A.top, 0, 1); } }      // and one waving off the top of its head
    if (kind === 'firefighter' && !turtle) { const H = A.hh * 1.6, z = A.wMax * 0.6 + 0.8 * k; putBox(box(0.3 * k, H, 0.3 * k, [120, 70, 40]), A.E.x - 2 * k, A.mid + H * 0.1, z);      // a fire axe held at its side: a wooden handle, a red head with a silver edge
      const v = new Vox(1); for (let i = -2; i <= 1; i++) for (let j = 0; j <= 2; j++) v.set(i, j, 0, i === -2 ? [220, 220, 230] : RED); v.set(2, 1, 0, RED); put(v, A.E.x - 2 * k, A.mid + H * 0.6, z, k * 0.5); }
    if (kind === 'devil' && !sea) { const v = new Vox(1); for (let q = 0; q <= 6; q++) v.set(-q, Math.round(q * q * 0.1), 0, RED); for (const [i, j] of [[-7, 4], [-8, 5], [-7, 5], [-8, 4], [-6, 5]]) v.set(i, j, 0, RED); put(v, A.x0 + 0.5, A.mid, 0, k * 0.7); }      // a pointed devil's tail
    if (kind === 'frank') for (const side of [-1, 1]) putBox(box(0.9 * k, 0.9 * k, 1.3 * k, [150, 150, 160]), A.E.x - 0.8 * k, A.E.y - 0.8 * k, side * (A.w + 0.5 * k));          // two bolts
    if (kind === 'devil' && !turtle) { const H = A.hh * 1.9, z = A.wMax * 0.6 + 0.8 * k; putBox(box(0.3 * k, H, 0.3 * k, [60, 30, 30]), A.E.x - 1.5 * k, A.mid + H * 0.15, z);      // a pitchfork held at its side
      const v = new Vox(1); for (let i = -2; i <= 2; i += 2) for (let j = 1; j <= 3; j++) v.set(i, j, 0, j === 3 ? [220, 70, 60] : RED); for (let i = -2; i <= 2; i++) v.set(i, 0, 0, RED); put(v, A.E.x - 1.5 * k, A.mid + H * 0.65, z, k * 0.45); }
    if (kind === 'police') for (const side of [-1, 1]) putBox(box(0.5 * k, 0.6 * k, 0.4, GOLD), A.E.x - 3.5 * k, A.E.y - 0.5 * k, side * (A.wMax * 0.5 + 0.3));          // a badge on each side
    if (kind === 'racehorse') for (const side of [-1, 1]) putBox(box(1.0 * k, 1.3 * k, 0.6 * k, SILKS[(f.seed | 0) % SILKS.length]), A.E.x + 0.3 * k, A.E.y, side * (A.w + 0.35));      // blinkers beside the eyes
  }
  if (octo) { const v = new Vox(1); for (let j = 0; j <= 3; j++) v.set(j >= 2 ? 1 : 0, j, 0, [84, 118, 42]); v.set(2, 3, 0, [84, 118, 42]); v.set(-1, 0, 1, [110, 150, 60]); v.set(0, 0, -1, [110, 150, 60]); put(v, hatAt.x, hatAt.y, 0, 1.6); }      // a stem on the mantle, and two leaves
  if (PAINTED.has(kind)) { hw.base0 = f.baseCol; f.baseCol = paint(kind, f, A); repaint(f); }
  for (const m of parts) { m.position.multiplyScalar(f.scale); m.scale.multiplyScalar(f.scale); }
  hw.place = () => { const q = f.scale / hw.s; if (Math.abs(q - 1) < 1e-6) return; for (const m of parts) { m.position.multiplyScalar(q); m.scale.multiplyScalar(q); } hw.s = f.scale; };
  f.mesh.add(g); f.hw = hw; return hw;
}
// the body's colors are redrawn from baseCol by the fish's own passes: ask for them again
function repaint(f) { const p = f.pale ?? 0; f.pale = -1; f.setPale(p); f.tintApplied = -1; f.camoApplied = -1; f.costumeApplied = -1; }
export function undress(f) {
  const hw = f.hw; if (!hw) return; f.hw = null;
  if (hw.base0) { f.baseCol = hw.base0; repaint(f); }
  for (const m of hw.parts) { m.parent?.remove(m); m.geometry?.dispose?.(); if (m.material && !m.isInstancedMesh) m.material.dispose?.(); }
  hw.group?.parent?.remove(hw.group);
}
