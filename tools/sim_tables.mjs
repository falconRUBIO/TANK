// Turns docs/sim/after.json (node tools/loop_sim.mjs --json) into docs/sim/tables.md, beside docs/sim/baseline.json for before → after.
import fs from 'node:fs';
const o = JSON.parse(fs.readFileSync('docs/sim/after.json')), b = JSON.parse(fs.readFileSync('docs/sim/baseline.json')), out = [], p = (x) => out.push(x);
const K = ['first fish bought', 'first Field Guide page', 'first mystery', 'first decision', 'first pairing', 'first hatching', 'first raised temperament', 'first adult raised', 'first octopus adventure', 'first rare color', 'first goal done', 'second generation adult', 'level 2', 'level 4', 'level 6', 'level 8'];
p('## Milestones (median day; runs that reached it within 120 days when fewer than all)\n'); p('| household | ' + K.join(' | ') + ' |'); p('|' + ' --- |'.repeat(K.length + 1));
for (const r of o) p('| ' + r.crew + '× ' + r.profile + ' | ' + K.map((k) => { const m = r.milestones[k]; return (m.median ?? '—') + (m.hit.split('/')[0] === m.hit.split('/')[1] ? '' : ' (' + m.hit + ')'); }).join(' | ') + ' |');
p('\n## Snapshots (medians)\n'); p('| household | day | level | shells earned | spent | earned/day | bank | decor owned/open | Field Guide pages | goals done | decisions | mysteries | neglect warnings | deaths | toasts/day |'); p('|' + ' --- |'.repeat(15));
for (const r of o) for (const d of [7, 30, 60, 120]) { const x = r.snaps[d]; if (x) p(`| ${r.crew}× ${r.profile} | ${d} | ${x.level} | ${x.earned} | ${x.spent} | ${x.perDayEarned} | ${x.shells} | ${x.decor} | ${x.field} | ${x.goals} | ${x.decisions} | ${x.mysteries} | ${x.neglect} | ${x.deaths} | ${(x.toasts / d).toFixed(1)} |`); }
p('\n## Level days, baseline → now\n'); p('| household | level 4 | level 6 | level 8 |'); p('| --- | --- | --- | --- |');
for (const r of o) { const q = b.find((x) => x.crew === r.crew && x.profile === r.profile), f = (k) => `${q?.milestones[k].median ?? '—'} → ${r.milestones[k].median ?? '—'}`; p(`| ${r.crew}× ${r.profile} | ${f('level 4')} | ${f('level 6')} | ${f('level 8')} |`); }
p('\n## Centerpieces bought within 120 days (day, per seed)\n'); for (const r of o) p(`- ${r.crew}× ${r.profile}: ` + ['arch', 'bridge', 'crystal', 'spire'].map((k) => k + ' ' + (r.snaps[120]?.centerpieces ?? []).map((c) => c[k] ?? '–').join('/')).join(' · '));
p('\n## Goal in progress at day 120 (per seed)\n'); for (const r of o) p(`- ${r.crew}× ${r.profile}: ${(r.snaps[120]?.stuck ?? []).join(' ; ')}`);
fs.writeFileSync('docs/sim/tables.md', out.join('\n') + '\n'); console.log('wrote docs/sim/tables.md');
