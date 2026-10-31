// Halloween costumes for every animal in the tank: a hat, a nose, a cape, a broom or a pair of wings fastened to its body (voxels, like the
// body), and for most a paint job over its own colors (bandages, bones, a ghost's pallor, a racing silk, a pumpkin's ribs). Each animal keeps
// its own shape and its own shading under the costume: it still reads as that fish, in a witch's hat. The octopus is a pumpkin every Halloween,
// seahorses mostly run as racehorses. Pure cosmetics: nothing here changes a collider, a behavior or a shared record, and undress() puts
// everything back exactly as it was.
import * as THREE from 'three';
import { Vox, hash } from './decor.js';
import { mix } from '../color.js';

const BLACK = [26, 20, 36], PURPLE = [122, 54, 176], GOLD = [240, 196, 80], RED = [196, 34, 40], BONE = [236, 230, 212], WRAP = [224, 212, 186], GREEN = [118, 176, 84], WHITE = [246, 246, 250], PINK = [240, 150, 180], NAVY = [36, 46, 100], STRAW = [196, 160, 80];
export const COSTUMES = {      // label: for a sentence ("Dressed as …"); word: the title that goes in front of the animal's name while it wears it ("Cat Nori")
  witch: { label: 'a witch, broom and all', word: 'Witch' }, wizard: { label: 'a wizard', word: 'Wizard' }, pirate: { label: 'a pirate', word: 'Pirate' }, vampire: { label: 'a vampire', word: 'Vampire' }, mummy: { label: 'a mummy', word: 'Mummy' }, skeleton: { label: 'a skeleton', word: 'Skeleton' },
  ghost: { label: 'a ghost', word: 'Ghost' }, devil: { label: 'a little devil, pitchfork and all', word: 'Devil' }, cat: { label: 'a black cat', word: 'Cat' }, frank: { label: "Frankenstein's monster", word: 'Monster' }, bat: { label: 'a bat', word: 'Bat' }, pumpkin: { label: 'a jack-o’-lantern', word: 'Pumpkin' },
  firefighter: { label: 'a firefighter', word: 'Firefighter' }, police: { label: 'a police officer', word: 'Officer' }, racehorse: { label: 'a racehorse', word: 'Racehorse' },
  gnome: { label: 'a garden gnome', word: 'Gnome' }, candle: { label: 'a candle', word: 'Candle' }, candycorn: { label: 'a candy corn', word: 'Candy Corn' }, unicorn: { label: 'a unicorn', word: 'Unicorn' },
  octoghost: { label: 'a ghost, sheet and all', word: 'Ghost' },
};
// an animal's name while it is dressed: the costume's title in front ("Cat Nori", "Racehorse Pearl")
export const dressedName = (f, name = f?.name) => { const w = f?.hw?.kind ? COSTUMES[f.hw.kind]?.word : null; return w && name ? `${w} ${name}` : name; };
const FISH_SET = ['witch', 'vampire', 'pirate', 'skeleton', 'ghost', 'mummy', 'devil', 'cat', 'frank', 'wizard', 'bat', 'firefighter', 'police'];
const SEA_SET = ['racehorse', 'witch', 'racehorse', 'ghost', 'police', 'racehorse', 'skeleton', 'firefighter'];
export const SHELL_KINDS = ['wizard', 'gnome', 'pumpkin', 'witch', 'candle', 'candycorn', 'unicorn'];      // what a shell can be painted as: the crab's own shell is its costume, and the empty shells on the sand dress the same way
const CRAB_SET = SHELL_KINDS, TURTLE_SET = ['pirate', 'witch', 'mummy', 'skeleton', 'wizard', 'firefighter', 'police'], FRY_SET = ['mummy', 'skeleton', 'ghost'];
const FREE = new Set(['racehorse', 'pumpkin', 'octoghost']);      // worn by as many as like: the rest go round the tank one each before any repeats
const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
// which costume an animal wears: the same on every phone (from its seed and name), the octopus always a pumpkin, a seahorse mostly a racehorse,
// a crab or a turtle from the sets that fit a body with a shell, a nursery baby a paint-only costume (its head is still changing shape).
// `used` is what the rest of the tank already wears, so no two fish dress alike while there are costumes to go round
export function costumeFor(f, used = null) {
  if (f.species?.move === 'jet') return used?.has('pumpkin') && !used.has('octoghost') ? 'octoghost' : 'pumpkin';      // the first octopus is the jack-o'-lantern, a second one the ghost under a sheet, a third a lantern again
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
// the stable's silk for a seahorse: of the six, the one furthest from its own body color (a purple seahorse never gets purple silks), tie-broken by seed
function silkFor(f) { const b = f.baseCol, n = f.vox.length; let r = 0, g = 0, bl = 0, m = 0; for (let i = 0; i < n; i++) { const v = f.vox[i]; if (v.tag === 'eye' || v.em || v.tag === 'tail') continue; r += b[i * 3]; g += b[i * 3 + 1]; bl += b[i * 3 + 2]; m++; } if (!m) return SILKS[(f.seed | 0) % SILKS.length];
  const toS = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055) * 255, body = [toS(r / m), toS(g / m), toS(bl / m)]; let best = 0, bd = -1; SILKS.forEach((c, i) => { const d = Math.hypot(c[0] - body[0], (c[1] - body[1]) * 1.3, c[2] - body[2]) + ((f.seed | 0) % 6 === i ? 15 : 0); if (d > bd) { bd = d; best = i; } }); return SILKS[best]; }

// ── the paint jobs: a new set of base colors, the body's own light and shade kept under them ──
const lin = (c) => c.map((x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
function paint(kind, f, A) {
  const b = f.baseCol, n = f.vox.length, out = Float32Array.from(b); let ls = 0; for (let i = 0; i < n; i++) ls += b[i * 3] * 0.3 + b[i * 3 + 1] * 0.59 + b[i * 3 + 2] * 0.11; const lavg = ls / n;
  const E = A.E, mid = A.mid, silk = silkFor(f), num = DIGITS[1 + ((f.seed | 0) % 9)], bandY = A.y0 + (A.y1 - A.y0) * 0.42, bandH = Math.max(5.5, (A.y1 - A.y0) * 0.2);
  let bx = 0, bn = 0; for (const v of f.vox) if (v.tag !== 'tail' && Math.abs(v.y - bandY) <= bandH) { bx += v.x; bn++; } bx = bn ? bx / bn : E.x;      // the saddle cloth's middle
  const eyes = [[0, 0, 0, 0], [0, 0, 0, 0]]; for (const v of f.vox) if (v.tag === 'eye' || v.em) { const e = eyes[v.z >= 0 ? 0 : 1]; e[0] += v.x; e[1] += v.y; e[2] += v.z; e[3]++; } const EYE = eyes.map((e) => (e[3] ? { x: e[0] / e[3], y: e[1] / e[3], z: e[2] / e[3] } : null));      // each eye's center, for a face cut round the real eyes
  const nearEye = (v, r) => EYE.some((e) => e && Math.hypot(v.x - e.x, v.y - e.y, v.z - e.z) <= r);
  for (let i = 0; i < n; i++) {
    const v = f.vox[i], o = i * 3; if (kind === 'pumpkin' && v.tag === 'eye' && !v.pupil) { const L = lin([255, 236, 140]); out[o] = L[0]; out[o + 1] = L[1]; out[o + 2] = L[2]; continue; }      /* (the lantern's eyes are the octopus's own, lit) */
    if (kind === 'octoghost' && v.tag === 'eye') { const L = lin([16, 14, 24]); out[o] = L[0]; out[o + 1] = L[1]; out[o + 2] = L[2]; continue; }      /* (the ghost's eyes are the holes in its sheet: dark through and through) */
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
      else if (v.y > E.y - 6) { c = Math.round((v.y - E.y + 20) / 2) % 2 === 0 ? silk : WHITE; keep = 0.1; }                                           // a racing hood in hoops of the stable's silk and white, down over the whole head
      else if (Math.abs(v.y - bandY) <= bandH) { c = WHITE; keep = 0.1; const dx0 = Math.floor((v.x - bx + 3) / 2), dx = (v.nz ?? 0) > 0 ? dx0 : 2 - dx0, dy = Math.floor((bandY + 5 - v.y) / 2); if (Math.abs(v.nz ?? 0) > 0.4 && dx >= 0 && dx <= 2 && dy >= 0 && dy <= 4 && num[dy][dx] === '#') c = [20, 18, 28]; }      /* (mirrored on the far side, so it reads the right way round from either side of the tank) */      // the saddle cloth, its number two voxels to the stroke on both sides, big enough to read across the tank
    } else if (kind === 'pumpkin') {
      const onArm = v.arm >= 0 || !!v.web; if (onArm) { c = [70, 130, 50]; keep = 0.45; }                                                               // the arms, a tangle of green vine
      else { const cx = f.mcx ?? 0, cy = f.mcy ?? 0, ang = Math.atan2(v.z, v.y - cy), rib = 0.5 + 0.5 * Math.cos(ang * 8); c = mix([248, 134, 36], [152, 58, 10], 0.1 + 0.8 * rib * rib);      // deep ribs round the body
        const tri = EYE.some((e) => e && Math.abs(v.z - e.z) <= (v.y - e.y + 3.4) * 1.0 && v.y - e.y >= -3.4 && v.y - e.y <= 2.2 && Math.abs(v.x - e.x) <= 3.2), nose = Math.abs(v.z) <= (E.y - 2.2 - v.y) * 0.9 && v.y <= E.y - 2.2 && v.y >= E.y - 4.2 && v.x > E.x - 2.5 && (v.nx ?? 0) > 0.1, grin = ((v.nx ?? 0) > 0.1 || Math.abs(v.nz ?? 0) > 0.6) && v.x > E.x - 5 && Math.abs(v.z) <= 7 && v.y < E.y - 4.6 && v.y > E.y - 8.6 && (v.y > E.y - 6.4 || Math.round(v.z + 10) % 2 === 0);      // the face is where its face is: a big triangle cut round each of its own eyes, a nose between, a wide toothy grin under them, round to the sides
        if (tri || nose || grin) { c = [255, 236, 140]; keep = -1; } } }                                                                              // (keep -1: lit flat, no shading)
    else if (kind === 'octoghost') {
      const onArm = v.arm >= 0 || !!v.web, at = v.arm >= 0 ? v.at : v.web ? v.web.at * 0.4 : 0;      // a white sheet over the whole octopus, arms and all, the arm tips its trailing hem
      const hole = !onArm && nearEye(v, 3.2), mouth = !onArm && v.x > E.x - 3 && ((v.nx ?? 0) > 0.1 || Math.abs(v.nz ?? 0) > 0.6) && Math.hypot((v.y - (E.y - 5.2)) * 0.9, v.z) <= 1.9;      // the face is where its face is: two big eye holes cut round its own eyes, a round surprised mouth under them
      if (hole || mouth) { c = [16, 14, 24]; keep = 0; } else if (onArm && at > 0.86) { c = [206, 212, 230]; keep = 0.06; } else { c = mix(WHITE, [222, 226, 240], q * 0.5); keep = 0.05; } }
    if (!c) continue; const L = lin(c); if (keep < 0) { out[o] = L[0]; out[o + 1] = L[1]; out[o + 2] = L[2]; continue; } out[o] = L[0] * sh * (1 - keep) + b[o] * keep; out[o + 1] = L[1] * sh * (1 - keep) + b[o + 1] * keep; out[o + 2] = L[2] * sh * (1 - keep) + b[o + 2] * keep;
  }
  return out;
}
const PAINTED = new Set(['mummy', 'skeleton', 'ghost', 'frank', 'pumpkin', 'cat', 'devil', 'firefighter', 'police', 'racehorse', 'vampire', 'pirate', 'bat', 'octoghost']);
const HATS = { witch: 'witch', wizard: 'wizard', pirate: 'pirate', devil: 'devil', cat: 'cat', frank: 'frank', vampire: 'hair', firefighter: 'firefighter', police: 'police', bat: 'bat' };

// ── a shell as a hat (or a pumpkin, a skull, a candy corn): the shell's own voxels repainted along its coil, t = 0 at the opening (the brim)
// and 1 at the apex (the tip), its light and shade kept. Works on a crab's shell and on an empty one lying on the sand ──
export function shellSkin(im, kind) {
  if (!im?.instanceColor || im.userData.hwKind === kind) return; const a = im.instanceColor.array; if (!im.userData.hw0) im.userData.hw0 = Float32Array.from(a); else a.set(im.userData.hw0); im.userData.hwKind = kind;
  const u = im.geometry.parameters.width, mt = new THREE.Matrix4(), p = new THREE.Vector3(), n = im.count, P = []; let L = 1, R0 = 1;
  for (let id = 0; id < n; id++) { im.getMatrixAt(id, mt); p.setFromMatrixPosition(mt); P.push([p.x / u, p.y / u, p.z / u]); L = Math.max(L, p.x / u); }
  for (const [i, , k] of P) if (i < L * 0.2) R0 = Math.max(R0, Math.abs(k));
  for (let id = 0; id < n; id++) {
    const [i, j, k] = P[id], t = Math.max(0, Math.min(1, i / L)), cy = R0 * 1.35 * t ** 0.8, y = j - R0 - cy, ang = Math.atan2(y, k), side = Math.abs(k) > R0 * 0.55 * (1 - t), o = id * 3, l0 = a[o] * 0.3 + a[o + 1] * 0.59 + a[o + 2] * 0.11, q = hash(Math.round(i), Math.round(j), Math.round(k), 3); let c;
    if (kind === 'wizard') c = t < 0.1 ? [30, 34, 100] : t < 0.15 ? GOLD : q > 0.86 ? GOLD : [40, 48, 140];                                                  // deep blue, a gold band at the brim, yellow stars all over
    else if (kind === 'gnome') c = t < 0.14 ? [240, 232, 214] : t > 0.92 ? [230, 70, 70] : mix([204, 38, 40], [160, 24, 30], q * 0.3);                        // a red cone with a cream band at the brim
    else if (kind === 'pumpkin') c = t > 0.86 ? [84, 118, 42] : side && t > 0.3 && t < 0.5 && Math.abs(y) < R0 * 0.3 ? [255, 232, 140] : mix([236, 118, 32], [172, 74, 18], 0.2 + 0.6 * (0.5 + 0.5 * Math.cos(ang * 8)));      // ribbed orange, a green stem at the tip, a lit eye on each flank
    else if (kind === 'witch') c = t < 0.12 ? [50, 44, 64] : t < 0.24 ? (y > R0 * 0.45 && Math.abs(k) < 1.3 ? GOLD : PURPLE) : mix(BLACK, [0, 0, 0], 0.3 * t);      // black, a purple band with a gold buckle on top
    else if (kind === 'candle') { const drip = Math.round(ang * 2.5) % 2 === 0 && t < 0.45 && q > 0.35; c = t > 0.9 ? [255, 226, 110] : t > 0.8 ? [255, 140, 36] : t > 0.76 ? [40, 30, 30] : drip ? [252, 248, 236] : [238, 228, 204]; }      // a candle: cream wax with drips running down from the top, a dark wick, an orange flame with a yellow heart at the tip
    else if (kind === 'candycorn') c = t < 0.3 ? [250, 248, 236] : t < 0.65 ? [255, 150, 40] : [255, 222, 60];                                              // white, orange, yellow
    else { const band = ((t * 5 + ang / (Math.PI * 2)) % 1 + 1) % 1; c = t > 0.88 ? GOLD : band < 0.3 ? [244, 170, 210] : band < 0.5 ? [186, 160, 236] : mix([250, 248, 255], [226, 236, 250], q * 0.5); }      // a unicorn horn: pearly white with a pink and lilac stripe spiraling to a gold tip
    const Lc = lin(c), sh = Math.max(0.6, Math.min(1.3, 0.85 + 2.2 * (l0 - 0.12)));
    a[o] = Lc[0] * sh; a[o + 1] = Lc[1] * sh; a[o + 2] = Lc[2] * sh;
  }
  im.instanceColor.needsUpdate = true;
}
export function shellUnskin(im) { if (!im?.userData?.hw0) return; im.instanceColor.array.set(im.userData.hw0); im.instanceColor.needsUpdate = true; delete im.userData.hw0; delete im.userData.hwKind; }


// a jockey in the racing crouch, in cells a third of a body voxel across (x forward toward the seahorse's back, y up, z sideways; the back
// surface is x = 0 and the seat sits at y = 0): saddle pad and cantle with flaps and girth down the flanks, thighs forward along the flanks
// and shins down into tall black boots in stirrup irons, white seat and breeches, a silk jacket with a white hoop and collar leaning forward,
// a number cloth on the back, white sleeves to dark gloves on the reins, a tucked head with goggles and a strap, nose and mouth, a chin strap,
// a domed helmet in the stable's silk with a white stripe and peak, and a whip raised in the right hand. zl is the half-width of the body
// at the seat, in the same cells, so the legs lie against the flanks
function jockeyVox(silk, zl) {
  const v = new Vox(1), W = WHITE, K = BLACK, SK = [232, 190, 158], BR = [118, 76, 42], BR2 = [84, 52, 28], MT = [206, 206, 216], DK = [36, 32, 44], GL = [64, 78, 120];
  const cell = (x, y, z, c) => v.set(Math.round(x), Math.round(y), Math.round(z), c), fill = (x0, y0, z0, x1, y1, z1, c) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) cell(x, y, z, c); };
  const zw = Math.max(3, Math.min(6, zl - 2));
  fill(-7, 0, -zw, 0, 2, zw, BR); fill(-8, 3, -zw + 1, -6, 5, zw - 1, BR2);                                                                 // the saddle pad and its raised cantle
  for (const s of [-1, 1]) { const z = s * zl; fill(-4, -4, z - s, 2, 3, z, BR); fill(1, -6, z, 2, -4, z, BR2); }                              // saddle flaps and the girth down the flanks
  for (const s of [-1, 1]) for (const zz of [s * zl, s * (zl + 1)]) {
    for (let x = -4; x <= 9; x++) { const y0 = 6 + Math.round((x + 4) * 0.25); fill(x, y0, zz, x, y0 + 3, zz, W); }                                // the thigh, forward along the flank
    fill(9, 9, zz, 11, 13, zz, W); fill(10, 4, zz, 12, 9, zz, W);                                                                             // the knee, the shin
    fill(10, -4, zz, 12, 4, zz, K); fill(9, -4, zz, 9, -2, zz, K); fill(13, -4, zz, 13, -3, zz, K);                                             // a tall boot with heel and toe
    fill(10, -7, zz, 13, -7, zz, MT); for (const x of [10, 13]) { cell(x, -6, zz, MT); cell(x, -5, zz, MT); } }                                 // the stirrup iron
  fill(-10, 6, -4, -3, 10, 4, W);                                                                                                            // seat and breeches
  for (let y = 11; y <= 24; y++) { const x0 = Math.round(-10 + (y - 11) * 0.4), w = y > 20 ? 5 : 4; fill(x0, y, -w, x0 + 6, y, w, (y >= 16 && y <= 18) || y === 24 ? W : silk); }      // the jacket, leaning forward: a white hoop and collar
  fill(-11, 13, -2, -10, 16, 2, W); fill(-11, 14, 0, -10, 15, 0, DK);                                                                          // the number cloth on the back
  for (const s of [-1, 1]) for (let t = 0; t <= 8; t++) { const x = -4 + t * 0.65, y = 22 + t; for (const z of [s * 5, s * 6]) { cell(x, y, z, t >= 7 ? DK : W); cell(x, y + 1, z, t >= 7 ? DK : W); } }      // arms forward to the reins, white sleeves, dark gloves
  fill(-6, 25, -2, -3, 27, 2, SK); fill(-8, 27, -3, -1, 33, 3, SK); cell(-5, 30, -4, SK); cell(-5, 30, 4, SK);                                   // neck, head tucked low, ears
  for (const zz of [-3, -2, -1, 1, 2, 3]) { cell(0, 30, zz, GL); cell(0, 31, zz, GL); cell(-1, 30, zz, DK); cell(-1, 31, zz, DK); } cell(0, 31, 0, DK); cell(0, 30, 0, SK);      // goggles: two lenses and a bridge
  for (let x = -8; x <= -2; x++) { cell(x, 31, -4, DK); cell(x, 31, 4, DK); } fill(-9, 30, -3, -9, 31, 3, DK);                                   // the goggle strap round the back of the head
  cell(0, 29, 0, SK); cell(0, 28, 0, [150, 90, 80]);                                                                                           // nose and mouth
  for (let y = 28; y <= 32; y++) { cell(-3, y, -4, DK); cell(-3, y, 4, DK); } fill(-4, 26, -3, -2, 26, 3, DK);                                   // the chin strap
  for (const [y, x0, x1, w] of [[33, -9, 1, 4], [34, -9, 1, 4], [35, -8, 0, 4], [36, -8, 0, 3], [37, -7, -1, 3], [38, -6, -2, 2], [39, -5, -3, 1]]) for (let x = x0; x <= x1; x++) for (let z = -w; z <= w; z++) cell(x, y, z, z === 0 ? W : silk);      // the helmet, domed, a white stripe over the crown
  fill(1, 33, -3, 4, 33, 3, W); fill(4, 33, -2, 5, 33, 2, W);                                                                                  // the peak
  for (let t = 0; t <= 14; t++) cell(1 - t * 0.8, 30 + t * 0.7, 6, t >= 13 ? W : K); cell(-11, 41, 6, W);                                        // the whip, raised back from the right glove, a white popper at the end
  return v;
}

// ── on and off ──
export function dress(f, kind = costumeFor(f)) {
  if (f.hw || !f.vox || !f.mesh) return null;
  const A = anchors(f), g = new THREE.Group(), parts = [], hw = { kind, label: COSTUMES[kind]?.label ?? kind, group: g, s: f.scale, parts, base0: null };
  const put = (v, x, y, z, k = 1, ry = 0) => { const m = v.mesh(); m.position.set(x, y, z); m.scale.setScalar(k); m.rotation.y = ry; g.add(m); parts.push(m); return m; };
  const putBox = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); parts.push(m); return m; };
  const turtle = TURTLES.has(f.species?.id), octo = f.species?.move === 'jet', crab = !!f.crab, sea = !!f.sp?.tail;
  const k = turtle ? 1.1 : Math.max(0.9, Math.min(2.0, A.hh * 0.105)),      /* (a brim about three fifths of the head's height: a hat, not a tent) */ hatAt = turtle ? { x: A.shell.x, y: A.shell.y + 0.6 } : octo ? { x: A.mantle.x, y: A.mantle.y - 0.5 } : { x: A.topX, y: A.top + 0.3 };      // a hat in proportion to the head it sits on
  if (crab) {      // a crab's costume is the shell on its back, repainted as a hat, a pumpkin, a skull or a candy corn; a new shell it moves into is painted the same way
    hw.group = null; hw.shell = () => { const m = f.shellG?.children?.[0]; if (m && m !== hw.shellMesh) { if (hw.shellMesh) shellUnskin(hw.shellMesh); hw.shellMesh = m; shellSkin(m, kind); } }; hw.shell(); hw.place = hw.shell;
    const wrist = f.claws?.[1]?.userData?.wrist; if (wrist) { const U = 0.034, v = new Vox(1), OR = [240, 130, 40], DKo = [26, 20, 30];      // a trick-or-treat pail hung from its big claw: a little jack-o'-lantern bucket with a black handle, a face on the front, candy corn poking out of the top
      for (let j = 0; j <= 4; j++) { const r = 2.4 + j * 0.25; for (let i = -3; i <= 3; i++) for (let z = -3; z <= 3; z++) { const d = Math.hypot(i, z); if (d > r + 0.3 || (j > 0 && d < r - 0.9)) continue; v.set(i, j, z, OR); } }
      v.set(3, 3, -1, DKo); v.set(3, 3, 1, DKo); v.set(3, 1, 0, DKo); v.set(3, 1, -1, DKo); v.set(3, 1, 1, DKo); v.set(3, 2, -2, DKo); v.set(3, 2, 2, DKo);      // eyes and a grin, cut in the front
      for (let z = -3; z <= 3; z++) v.set(0, 5 + Math.round(2.2 * Math.sqrt(Math.max(0, 1 - (z / 3.2) ** 2))), z, DKo); v.set(0, 5, -3, DKo); v.set(0, 5, 3, DKo);      // the handle arching over the top
      v.set(-1, 4, 0, [255, 220, 60]); v.set(1, 4, 1, [250, 140, 40]); v.set(0, 5, -1, [250, 248, 236]);      // candy corn in the pail
      const m = v.mesh(); m.scale.setScalar(U * 0.55); m.position.set(6.5 * 1.25 * U, -3.2 * U, 0); m.rotation.z = 0.15; wrist.add(m); parts.push(m); }
    f.hw = hw; return hw;
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
    if (kind === 'bat') { const L = Math.max(5, Math.round(A.len * 0.42)), Hh = Math.max(4, Math.round(A.hh * 0.7)), sx = Math.round(A.E.x - 2.5), zs = Math.round(A.wMax * 0.5) + 1, v = new Vox(1), MEM = [118, 62, 156];      // two wings from the shoulders, just behind the head at mid-height on each side, sweeping back and up: black finger bones through a lighter violet membrane, two deep scallops along the trailing edge
      for (const side of [-1, 1]) for (let i = 0; i >= -L; i--) { const u = -i / L, lead = Math.round(Hh * Math.sin(Math.PI * Math.min(1, u * 0.7 + 0.22))), trail = Math.round(-1 + Hh * 0.35 * Math.abs(Math.sin(u * Math.PI * 2))), bone = i === 0 || i === -L || ((-i) % 3 === 0); for (let j = Math.min(trail, lead); j <= lead; j++) v.set(i, j, side * zs, j === lead || j === Math.min(trail, lead) || bone ? BLACK : MEM); }
      put(v, sx, A.mid, 0, 1);
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
    if (kind === 'racehorse') { const silk = silkFor(f), SKIN = [232, 190, 158]; for (const side of [-1, 1]) { putBox(box(1.0 * k, 1.3 * k, 0.6 * k, WHITE), A.E.x + 0.3 * k, A.E.y, side * (A.w + 0.35)); putBox(box(0.6 * k, 0.8 * k, 0.3 * k, silk), A.E.x + 0.3 * k, A.E.y, side * (A.w + 0.75)); }      // white blinker cups with a silk patch, beside the eyes
      const bandY = A.y0 + (A.y1 - A.y0) * 0.42, bandH = Math.max(5.5, (A.y1 - A.y0) * 0.2), seatY = bandY + bandH + 1; let backX = 1e9, wz = 1; for (const q of f.vox) if (q.tag !== 'tail' && Math.abs(q.y - seatY) <= 3) { backX = Math.min(backX, q.x); wz = Math.max(wz, Math.abs(q.z)); }      /* (the seat just above the numbered cloth, so the boots hang beside its top edge and never over the number) */      // the back of the trunk at the saddle, and how wide it is there
      if (backX < 1e8) { const J = Math.max(1.1, k * 1.05), u = J / 3, zl = Math.round(wz / u) + 2, v = jockeyVox(silk, zl);      // a jockey in cells a third of a body voxel across, in the racing crouch (see jockeyVox)
        put(v, backX, seatY, 0, u);
        const hx = backX + 1 * u, hy = seatY + 30 * u, dx = A.nose - 1.5 - hx, dy = A.E.y - 1 - hy, rein = box(Math.hypot(dx, dy), 0.25 * k, 0.25 * k, [250, 250, 255]); rein.rotation.z = Math.atan2(dy, dx); putBox(rein, hx + dx / 2, hy + dy / 2, 0); } }      // reins from the gloves to the bit
  }
  if (octo) {      // the face plates: pieces fixed at the octopus's own eyes (and under them), unlit so they read as cut-outs whatever the light and the pose
    const eyes = [[0, 0, 0, 0], [0, 0, 0, 0]]; for (const q of f.vox) if (q.tag === 'eye' || q.em) { const e = eyes[q.z >= 0 ? 0 : 1]; e[0] += q.x; e[1] += q.y; e[2] += q.z; e[3]++; }
    const EYE = eyes.map((e) => (e[3] ? { x: e[0] / e[3], y: e[1] / e[3], z: e[2] / e[3] } : null)), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.86, 0.45) }), dark = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.025, 0.05) });
    const plate = (v, x, y, z, mat) => { const m = v.mesh(); m.material = mat; m.position.set(x, y, z); g.add(m); parts.push(m); return m; };
    const outZ = (e) => { let z = Math.abs(e.z); for (const q of f.vox) if (!(q.arm >= 0) && !q.web && Math.abs(q.x - e.x) <= 3 && Math.abs(q.y - e.y) <= 3) z = Math.max(z, Math.abs(q.z)); return z; };      // the head's outermost skin beside an eye: a plate sits just outside it
    const frontX = (y) => { let x = -1e9; for (const q of f.vox) if (!(q.arm >= 0) && !q.web && Math.abs(q.y - y) <= 1.5 && Math.abs(q.z) <= 5) x = Math.max(x, q.x); return x > -1e8 ? x : A.nose; };      // the front of the head at a height
    if (kind === 'pumpkin') {
      for (const e of EYE) if (e) { const v = new Vox(1), side = Math.sign(e.z || 1); for (let r = 0; r <= 6; r++) { const hw = r * 0.85; for (let i = -Math.floor(hw); i <= Math.floor(hw); i++) if (Math.abs(i) >= hw - 1.2 || r >= 5) v.set(i, 6 - r, 0, [255, 220, 115]); } plate(v, e.x, e.y - 2.5, side * (outZ(e) + 0.9), glow); }      // a glowing triangle frame round each eye, the eye looking out of it
      { const v = new Vox(1); for (let k = -5; k <= 5; k++) { v.set(0, 2, k, [255, 220, 115]); if (k % 2 === 0) v.set(0, 1, k, [255, 220, 115]); v.set(0, 0, k, [255, 220, 115]); } for (let k = -4; k <= 4; k++) if (Math.abs(k) <= 2) v.set(0, 4, k, [255, 220, 115]); v.set(0, 5, 0, [255, 220, 115]);      // a wide toothy grin under the eyes, a little triangle nose above it
        plate(v, frontX(A.E.y - 5) + 0.9, A.E.y - 6.5, 0, glow); }
    } else if (kind === 'octoghost') {
      for (const e of EYE) if (e) { const v = new Vox(1), side = Math.sign(e.z || 1); for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (i * i + j * j <= 9.5) v.set(i, j, 0, [12, 10, 18]); plate(v, e.x, e.y + 0.4, side * (outZ(e) + 0.9), dark); }      // two big black eye holes, right where its eyes are
      { const v = new Vox(1); for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) if (j * j * 1.2 + k * k <= 4.8) v.set(0, j, k, [12, 10, 18]); plate(v, frontX(A.E.y - 4.5) + 0.9, A.E.y - 4.5, 0, dark); }      // a round surprised mouth under them
    }
  }
  if (octo && kind === 'pumpkin') { const v = new Vox(1), ST = [92, 124, 46], ST2 = [70, 98, 36], LF = [96, 160, 60];      // a thick stem on the mantle, a curling tendril and a broad leaf
    for (let j = 0; j <= 4; j++) for (let i = 0; i <= 1; i++) for (let z = 0; z <= 1; z++) v.set(i + (j >= 3 ? 1 : 0), j, z, (i + z) % 2 ? ST : ST2); v.set(3, 4, 0, ST); v.set(3, 4, 1, ST);
    for (const [i, j, z] of [[-1, 1, 2], [-2, 2, 3], [-3, 2, 3], [-4, 1, 2], [-4, 0, 1]]) v.set(i, j, z, ST);                                          // the tendril curling away
    for (let i = -1; i <= 3; i++) for (let z = -5; z <= -1; z++) if (Math.abs(i - 1) + Math.abs(z + 3) <= 3) v.set(i, 0, z, (i === 1 || z === -3) ? [70, 120, 44] : LF);      // the leaf, with a vein
    put(v, hatAt.x, hatAt.y, 0, 1.9); }
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
  if (hw.shellMesh) shellUnskin(hw.shellMesh);
  for (const m of hw.parts) { m.parent?.remove(m); m.geometry?.dispose?.(); if (m.material && !m.isInstancedMesh) m.material.dispose?.(); }
  hw.group?.parent?.remove(hw.group);
}
