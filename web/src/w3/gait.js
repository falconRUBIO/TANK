// How each kind really swims (the tank is a reef). Most reef fish do not wave their whole body to cruise: they row with their pectoral fins and keep
// the tail for a burst (labriform swimming: damselfish, chromis, anthias, gramma, tangs, angelfish; a clownfish's quick pectoral strokes give it its
// waddle). The small plankton pickers (chromis, anthias) swim in burst-and-coast: a few tail beats, then a glide, and when they hang in one place they
// pick at the water in little darts, as zebrafish and tetras are filmed doing (Soto & McHenry 2020). A puffer sculls along on its dorsal and anal fins
// with the tail folded, slow and exact, and can back away without turning (Li et al. 2018 on puffer fin kinematics). Gobies perch propped on the sand
// and move in short hops with a dead stop between. The mandarin dragonet potters over the rock in hops too, pecking at copepods every second or two.
// Cardinalfish hang almost motionless in the shade by day. Speeds and targets are the fish's own (Fish3D, FishMgr): this only shapes how it gets there.
const G = {
  goldfish: { k: 'row', bend: 0.35, fin: 2.4, waddle: 0.08 },      // clownfish
  guppy: { k: 'row', bend: 0.4, fin: 2.1 },      // damselfish
  blue: { k: 'row', bend: 0.35, fin: 2 },      // royal gramma
  angelfish: { k: 'row', bend: 0.45, fin: 1.4 },      // emperor angelfish: stately
  tang: { k: 'row', bend: 0.3, fin: 2.2 },
  platy: { k: 'row', bend: 0.2, fin: 1.6, still: true },      // cardinalfish: hangs in the shade
  neon: { k: 'pick', bend: 0.5, fin: 2 },      // blue chromis
  danio: { k: 'pick', bend: 0.55, fin: 2 },      // pink anthias
  puffer: { k: 'scull', bend: 0.1, fin: 2.8 },
  cory: { k: 'hop', bend: 0.9, fin: 1.4 },      // yellow goby
  neongoby: { k: 'hop', bend: 0.9, fin: 1.4 },
  betta: { k: 'potter', bend: 0.5, fin: 2.6 },      // mandarin dragonet
};
export const gaitOf = (sk) => G[sk] ?? null;
const free = (f) => !(f.fleeT > 0) && !(f.dartT > 0) && !f.enc && !f.script?.length && !f.weak && !f.nursery;
// each frame, after the fish has decided where it wants to go (desired: the velocity it wants): reshape that into its own way of moving
export function gaitTick(f, dt, desired, rng) {
  const g = G[f.sk]; f.noTurn = false; if (!g) { f.bendK = 1; f.finK = 1; f.tailRate = 1; return; }
  const sp = f.vel.length(), top = f.speed * (f.tmul ?? 1), fast = top > 0 ? sp / top : 0, hurry = !free(f) || f.seeking;
  // a burst uses the tail; cruising the body stays nearly straight and the pectorals do the work
  let bend = hurry || fast > 1.2 ? 1 : g.bend + (1 - g.bend) * Math.max(0, Math.min(1, (fast - 1) / 0.2)), fin = g.fin, tail = 1;      // (its everyday pace is a cruise: only beyond it does the tail take over)
  f.gaitT = (f.gaitT ?? rng() * 0.5) - dt;
  if (f.sleepy && !hurry) {      // asleep: no hops, no pecks, no darts. It rests where it settled, fins barely moving, level and still (a sleeping mandarin or goby lies on the sand; the others hang quietly)
    f.hopping = false; f.coast = false; f.peckT = 0; desired.multiplyScalar(0.25); f.vel.multiplyScalar(Math.exp(-4 * dt)); f.pitch += ((f.posePitch ?? 0) - f.pitch) * Math.min(1, dt * 2);
    f.bendK = (f.bendK ?? 1) + (0.05 - (f.bendK ?? 1)) * Math.min(1, dt * 4); f.finK = g.fin * 0.35; f.tailRate = (f.tailRate ?? 1) + (0.08 - (f.tailRate ?? 1)) * Math.min(1, dt * 4); f.finPh = (f.finPh ?? 0) + dt * 7 * f.finK * 0.6; return;
  }
  if (g.k === 'pick' && !hurry) {      // burst and coast; hanging in place, a pick at the water now and then
    const near = f.pos.distanceTo(f.target) < 0.9 || f.idle > 0;
    if (f.gaitT <= 0) { f.coast = !f.coast; f.gaitT = f.coast ? 0.35 + rng() * 0.5 : 0.25 + rng() * 0.3;
      if (!f.coast && near && rng() < 0.7) { const a = f.heading + (rng() - 0.5) * 1.2; f.vel.x += Math.cos(a) * 0.9; f.vel.z -= Math.sin(a) * 0.9; f.vel.y += (rng() - 0.3) * 0.5; f.flickT = 0.14; f.picks = (f.picks ?? 0) + 1; } }
    if (f.coast) { desired.copy(f.vel).multiplyScalar(0.92); bend = 0.06; tail = 0.15; } else { bend = Math.max(bend, 0.9); tail = 1.25; }
  } else if ((g.k === 'hop' || g.k === 'potter') && !hurry) {      // perched: still; then a short hop and a dead stop
    if (f.gaitT <= 0) { f.hopping = !f.hopping; f.gaitT = f.hopping ? (g.k === 'potter' ? 0.45 : 0.22) + rng() * 0.2 : (g.k === 'potter' ? 0.6 + rng() * 0.9 : 0.8 + rng() * 1.8);
      if (!f.hopping && g.k === 'potter') { f.peckT = 0.28; f.pecks = (f.pecks ?? 0) + 1; } if (f.hopping) f.hops = (f.hops ?? 0) + 1; }
    if (f.hopping) { desired.multiplyScalar(g.k === 'potter' ? 1.1 : 1.7); bend = 1; } else { desired.set(0, 0, 0); f.vel.multiplyScalar(Math.exp(-7 * dt)); bend = 0.04; tail = 0.1; fin = g.fin * 0.6; }
    if ((f.peckT = (f.peckT ?? 0) - dt) > 0) f.pitch += (-0.42 - f.pitch) * Math.min(1, dt * 12);      // the mandarin's peck: nose down to the rock and back
    else if (!f.hopping) f.pitch += (0 - f.pitch) * Math.min(1, dt * 5);      // (between hops it sits level on its fins)
  } else if (g.k === 'scull' && !hurry) {      // slow and exact on its fins; something just behind it, it backs off rather than turning round
    desired.multiplyScalar(0.75); tail = 0.3; const fx = Math.cos(f.heading), fz = -Math.sin(f.heading), dx = f.target.x - f.pos.x, dz = f.target.z - f.pos.z, dl = Math.hypot(dx, dz);
    if (dl < 1.4 && dl > 0.15 && (dx * fx + dz * fz) / dl < -0.5) { f.noTurn = true; desired.multiplyScalar(0.55); f.backs = (f.backs ?? 0) + dt; }
  } else if (g.still && !hurry && f.pos.distanceTo(f.target) < 1.2) { desired.multiplyScalar(0.4); bend = 0.08; tail = 0.25; }
  f.bendK = (f.bendK ?? 1) + (bend - (f.bendK ?? 1)) * Math.min(1, dt * 6); f.finK = fin; f.tailRate = (f.tailRate ?? 1) + (tail - (f.tailRate ?? 1)) * Math.min(1, dt * 8);
  f.finPh = (f.finPh ?? 0) + dt * 7 * fin * (0.6 + 0.4 * (1 - Math.min(1, fast)));      // the pectorals beat fastest holding station, as a hovering fish's do
  if (g.waddle && free(f)) f.roll += Math.sin(f.finPh) * g.waddle * (1 - f.bendK) * Math.min(1, dt * 10);      // the clownfish's waddle
}
// a school pulls together when danger is near (a tight ball is harder to pick one from), and loosens to feed when it is calm
export function shoalPull(f, others) { let thr = (f.fleeT ?? -9) > -3; if (!thr) for (const o of others) if (o.species?.move === 'jet' && !o.dead && Math.abs(o.pos.x - f.pos.x) < 3.5 && o.pos.distanceTo(f.pos) < 3.5) { thr = true; break; } f.shoalTight = thr; return thr ? 3.2 : 1; }
