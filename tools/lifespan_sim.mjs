// How long animals live in the tank: runs many animals of each kind day by day through the same old-age rule the game uses (no waiting, just the arithmetic),
// for a well looked-after tank (happiness about 0.9) and a lightly looked-after one (about 0.6). node tools/lifespan_sim.mjs
import * as R from '../web/src/game/rules.js';
const N = 4000, label = (k) => R.SPECIES_DEF[k]?.label ?? (k === 'seahorse' ? 'Seahorse' : k === 'octopus' ? 'Coconut octopus' : k);
const hash32 = (n) => { let h = (n | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };      // (the same as in rules.js)
const idh = (id) => [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 3), roll = (day, i, p) => hash32(day * 7919 + idh('f' + i)) % 10000 < p * 10000;
const q = (a, k) => a[Math.floor(k * (a.length - 1))];
console.log('animal'.padEnd(20), 'elder at', '  lifespan', ' | well cared: median (10%–90%)', ' | lightly cared: median (10%–90%)');
for (const [k, L] of Object.entries(R.LIFESPAN)) {
  const out = {};
  for (const happy of [0.9, 0.6]) { const ages = [];
    for (let i = 0; i < N; i++) { const extra = L * 0.1 * Math.max(0, happy - 0.6) / 0.4; for (let day = 20000; day < 20000 + L * 3; day++) { const over = day - 20000 - (L + extra); if (over > 0 && roll(day, i + 1, Math.min(0.5, 0.03 + 0.02 * over / 7))) { ages.push(day - 20000); break; } } }
    ages.sort((a, b) => a - b); out[happy] = `${q(ages, 0.5)} d (${q(ages, 0.1)}–${q(ages, 0.9)})`; }
  const m = (d) => (d >= 60 ? `${(d / 30.4).toFixed(1)} mo` : `${d} d`);
  console.log(label(k).padEnd(20), m(Math.round(L * R.ELDER_AT)).padStart(8), m(L).padStart(10), ' |', out[0.9].padEnd(30), ' |', out[0.6]);
}
