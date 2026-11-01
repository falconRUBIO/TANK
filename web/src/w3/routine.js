// The tank's day, the way a kept aquarium's really goes. Lights on: nobody wakes at once; each animal comes round in its own time, stretches and rises
// (the lazy and the old last). In the hour before a mealtime the fish have learned (rules feedLearn: food-anticipatory activity, as kept goldfish show)
// they gather under the spot the food usually falls. Toward lights-out the day fish wind down and drift to where they sleep, while the cory and the
// octopus come into their own. Lights out: each settles at its own bedtime, colors fading as a sleeping fish's do (a neon tetra all but loses its stripe,
// a tang goes blotchy and pale), a betta lies over on its side on a leaf. The night animals keep the dark: the cory roots along the sand.
import { feedClock, clockNow } from '../game/rules.js';

const TURTLES = new Set(['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback']);
export const NIGHT_ACTIVE = new Set(['cory']);      // (the octopus keeps its own hours: Fish3D, nightOwl)
const NIGHT_PALE = { neon: 0.55, tang: 0.45, betta: 0.36, angelfish: 0.3, blue: 0.3, danio: 0.28, guppy: 0.26, platy: 0.26, goldfish: 0.22, puffer: 0.3, neongoby: 0.3, turtle: 0.12, hawksbill: 0.12, loggerhead: 0.12, kemps: 0.12, leatherback: 0.12 };
const WAKE_SAY = ['Waking up. A long stretch, fins spread wide.', 'Coming round slowly. The light is on.', 'Awake, and rising from where it slept.', 'A yawn and a shake, and the day begins.'];
const BED_SAY = ['Settling down for the night.', 'Drifting off, very still.', 'Asleep, colors faded for the night.'];
const h01 = (seed, n) => ((((seed ?? 1) * 2654435761 + n * 40503) >>> 0) % 1000) / 1000;
// a day animal: sleeps at night (the octopus, crabs, nursery fry and the night foragers keep their own hours)
export const dayFish = (f) => !f.dead && !f.visitor && !f.crab && !f.nursery && f.species?.move !== 'jet' && f.sk !== 'seahorse' && !NIGHT_ACTIVE.has(f.sk);
let feedX = 0; try { const v = +localStorage.getItem('ourtank.feedx'); if (Number.isFinite(v)) feedX = v; } catch { /* storage unavailable */ }
export function noteFeedX(x) { if (!Number.isFinite(x)) return; feedX = feedX * 0.6 + x * 0.4; try { localStorage.setItem('ourtank.feedx', feedX.toFixed(2)); } catch { /* storage unavailable */ } }      // where this phone usually drops the food

export class Routine {
  constructor(F) { this.F = F; this.t = 0; this.expect = null; this.dusk = false; }
  hour() { return typeof window !== 'undefined' && Number.isFinite(window.__routineHour) ? window.__routineHour : clockNow(); }
  // how long after the lights change this one takes to follow: its own nature first, then a little chance
  delayFor(f, toNight) {
    const tr = f.rec?.traits ?? f.profile?.traits ?? [], has = (x) => tr.includes(x), base = toNight ? 4 + h01(f.seed, 3) * 40 : 2 + h01(f.seed, 4) * 22;
    if (!dayFish(f)) return toNight ? 1 + h01(f.seed, 5) * 6 : 1 + h01(f.seed, 6) * 8;      // (the night ones simply go about their business)
    const k = toNight ? (has('Playful') ? 1.5 : 1) * (has('Lazy') ? 0.6 : 1) * (f.old ? 0.6 : 1) : (has('Lazy') ? 1.7 : 1) * (f.old ? 1.5 : 1) * (has('Brave') || has('Playful') ? 0.6 : 1) * ((f.growth ?? 1) < 0.7 ? 0.7 : 1);
    return base * k;
  }
  flip(f) {
    const F = this.F; f.isNight = !!F.night; f.switchIn = 0; if (!f.dead) f.tmul = F.mulFor(f);
    if (!dayFish(f) || f.dead) return;
    if (!F.night) {      // waking: a stretch (head up, every fin spread, a shiver of the tail), then up and about
      f.sleepy = false; f.poseK = 1; f.posePitch = 0.32; f.poseRoll = 0; f.fanK = 1; f.flickT = 0.5; f.wokeAt = performance.now(); f.thought = WAKE_SAY[(f.seed ?? 0) % WAKE_SAY.length];
      f.target.set(f.pos.x + (h01(f.seed, 7) - 0.5) * 1.4, Math.min(8, f.pos.y + 1.4 + h01(f.seed, 8) * 2), f.pos.z + 0.4); f.retarget = 3;
      setTimeout(() => { if (f.wokeAt && performance.now() - f.wokeAt > 1500) { f.poseK = 0; f.posePitch = null; f.fanK = 0; } }, 1700);
    } else { f.thought = BED_SAY[(f.seed ?? 0) % BED_SAY.length]; }
  }
  tick(dt) {
    const F = this.F; this.t += dt;
    for (const f of F.list) { if (f.rtSeen == null) { f.rtSeen = true; if (!(f.switchIn > 0)) { f.isNight = !!F.night; if (!f.dead) f.tmul = F.mulFor(f); } } if (f.switchIn > 0 && (f.switchIn -= dt) <= 0) this.flip(f); }
    if ((this.slow = (this.slow ?? 0) - dt) > 0) return; this.slow = 1;
    const h = this.hour(), S = F.state, wasDusk = this.dusk; this.dusk = !F.night && h >= 20.25 && h < 21;      // (the last three quarters of an hour before the lights go out)
    if (this.dusk !== wasDusk) for (const f of F.list) if (!f.dead) f.tmul = F.mulFor(f);      // (the day fish slow as it gets late)
    // breakfast is coming: the fish know the hour (up to 45 minutes before a usual mealtime, a quarter of an hour after), if they are hungry and nobody has fed them since
    { const times = S ? feedClock(S) : [], due = times.find((m) => { const d = ((m - h + 36) % 24) - 12; return d <= 0.75 && d >= -0.25; });
      this.expect = !F.night && due != null && (S?.hunger ?? 0) > 0.15 && Date.now() - (S?.lastFed ?? 0) > 2 * 3600e3 ? { x: Math.max(-3.5, Math.min(3.5, feedX)), at: due } : null; }
    for (const f of F.list) {
      if (!dayFish(f)) continue;
      const asleep = !!f.isNight && !(f.fleeT > 0) && !f.weak; f.sleepy = asleep;      // (still asleep until its own moment to wake; awake until its own bedtime)
      const want = asleep ? (NIGHT_PALE[f.sk] ?? 0.24) : 0, cur = f.nightPale ?? 0, nx = cur + Math.max(-0.12, Math.min(0.05, want - cur));      // (the color drains slowly as it sleeps, and comes back quicker at the light)
      f.nightPale = Math.abs(nx - want) < 0.01 ? want : nx; const q = Math.round(f.nightPale * 25) / 25; if (q !== f.nightQ) { f.nightQ = q; f.setPale(Math.max(f.paleBase ?? 0, q)); }
      if (asleep && !f.enc) { f.poseK = 0.6; f.posePitch = -0.1; f.poseRoll = f.sk === 'betta' ? (f.pos.y < 1.7 ? 0.6 : 0.15) : 0; }      // asleep: hanging still, head a touch low (a betta lies over on its side, once it is down on a leaf or the sand)
      else if (f.poseK && !f.enc && (f.posePitch === -0.1)) { f.poseK = 0; f.posePitch = null; f.poseRoll = null; }
    }
  }
  // the routine's say in where a fish goes next (FishMgr.wrapPick asks first); null: the fish's own whims
  pick(f, r) {
    const F = this.F, T = (x, y, z, rt, th) => ({ x, y, z, rt, th });
    if (NIGHT_ACTIVE.has(f.sk) && (F.night || this.dusk) && r() < 0.7) return T(-3.6 + r() * 7.2, 0.85, -0.8 + r() * 3, 2.5 + r() * 2, F.night ? 'Out foraging in the dark, nose in the sand.' : 'Dusk: its time of day. Rooting along the sand.');      // the cory's hours
    if (!dayFish(f) || f.sk === 'seahorse' || TURTLES.has(f.sk)) return null;
    if (f.isNight && !F.night) return T(f.pos.x + (r() - 0.5) * 0.4, f.pos.y, f.pos.z, 3, 'Still asleep. The light is on, but it is not ready yet.');      // (lights on, not up yet)
    if (!f.isNight && F.night && f.switchIn > 0) { const p = f.palId && F.byId.get(f.palId); return p && !p.dead ? T(p.pos.x + (r() - 0.5) * 0.7, p.pos.y, p.pos.z + 0.3, 5, 'Finding its place for the night, by its friend.') : null; }
    if (this.expect && !f.isNight && r() < 0.62) { const E = this.expect, low = f.sk === 'cory' || f.sk === 'neongoby'; return T(E.x + (r() - 0.5) * 1.9, low ? 0.9 : 9.6 + r() * 1.4, 1.4 + r() * 1.1, 1.8 + r() * 1.6, `Waiting by the surface: it is nearly ${E.at < 11 ? 'breakfast' : E.at < 16 ? 'lunch' : 'supper'} time.`); }
    if (this.dusk && r() < 0.45) { const spots = F.spots?.() ?? [], sp = spots.find((x) => x.id === f.spotId) ?? spots[(f.seed ?? 0) % Math.max(1, spots.length)]; if (sp) return T(sp.x + (r() - 0.5) * 0.9, 0.9 + (sp.h ?? 1) * 0.4, sp.z + 0.8, 6 + r() * 4, 'Winding down. Staying close to where it sleeps.'); }
    return null;
  }
}
