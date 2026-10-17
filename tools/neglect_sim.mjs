// What an absence does to each kind of animal, on the real rules: a well-kept tank, then nobody visits for the given time
// (the server keeps time moving), then care resumes for two days. Read-only: it changes nothing. node tools/neglect_sim.mjs
import * as R from '../web/src/game/rules.js';
const H = 3600e3, D = 864e5, kinds = ['goldfish', 'neon', 'cory', 'guppy', 'betta', 'seahorse', 'octopus'];
const absences = [['24 h', 24 * H], ['48 h', 48 * H], ['72 h', 72 * H], ['7 days', 7 * D], ['14 days', 14 * D]];
for (const mortality of [true]) for (const [lbl, gap] of absences) {
  const t = R.newWorld(0, 3, { empty: true }); R.norm(t, 0); t.flags.tut = 5; t.flags.mortality = mortality; t.createdAt = -40 * D; t.level = 8; t.fish.length = 0;
  kinds.forEach((k, i) => t.fish.push({ id: 'a' + i, name: k, species: k, seed: 40 + i, born: -20 * D, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, hunger: 0, owner: 'me', ownerName: 'Me', fedAt: 0 }));
  t.hunger = 0; t.water = 1; t.glass = 0; t.simTs = 0; R.advance(t, 1000);
  const evs = []; for (let x = 30 * 60e3; x <= gap; x += 30 * 60e3) evs.push(...R.advance(t, x));      // the server ticking while everyone is away
  const at = (k) => { const f = t.fish.find((q) => q.species === k); return f ? `${(f.ail / 86400).toFixed(1)}d ail, health ${f.health.toFixed(2)}, happy ${f.happy.toFixed(2)}` : 'DIED'; };
  const said = { tired: evs.filter((e) => e.tired).length, warn: evs.filter((e) => e.warn).length, died: evs.filter((e) => e.died).map((e) => t.memorial.find((m) => m.id === e.died)?.species) };
  console.log(`\n## Away ${lbl} (mortality ${mortality ? 'on' : 'off'}): tank hunger ${t.hunger.toFixed(2)}, water ${t.water.toFixed(2)}, glass ${t.glass.toFixed(2)}; tired notices ${said.tired}, critical ${said.warn}, died: ${said.died.join(', ') || 'none'}`);
  for (const k of kinds) console.log(`  ${k.padEnd(9)} ${at(k)}`);
  // back: feed everyone, change the water, wipe; then two days of normal care (fed twice a day)
  const back = (now) => { R.applyAction(t, { t: 'water' }, { now, uid: 'me', name: 'Me', solo: true }); R.applyAction(t, { t: 'glass' }, { now, uid: 'me', name: 'Me', solo: true }); for (let i = 0; i < 3; i++) R.applyAction(t, { t: 'feed' }, { now, uid: 'me', name: 'Me', solo: true }); for (const f of t.fish) if (R.ownFood(f)) R.applyAction(t, { t: 'feed', food: R.ownFood(f), fish: f.id }, { now, uid: 'me', name: 'Me', solo: true }); };
  let now = gap + H; back(now); for (let h = 1; h <= 48; h++) { now = gap + H + h * H; R.advance(t, now); if (h % 12 === 0) back(now); }
  console.log(`  two days after care resumes: ${kinds.map((k) => { const f = t.fish.find((q) => q.species === k); return f ? `${k} ${f.health.toFixed(2)}` : `${k} gone`; }).join(', ')}`);
}
