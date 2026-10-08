// How many shells a day can pure care earn? A player who only cares (no spending) at different visit spacings, 30 days, through the real rules.
import * as R from '../web/src/game/rules.js';
const DAY = 864e5, H = 3600e3;
for (const [label, gapH] of [['once a day', 24], ['every 8 hours', 8], ['every 3 hours', 3], ['every hour', 1], ['every 15 minutes', 0.25]]) {
  const t = R.newWorld(0, 3); R.norm(t, 0); t.flags.tut = 5; let earned = 0, now = 0; const by = { feed: 0, water: 0, glass: 0, gift: 0, other: 0 };
  for (let k = 0; now < 30 * DAY; k++) {
    now = k * gapH * H + 60e3; const act = (a) => { const b = t.shells, r = R.applyAction(t, a, { now, name: 'Sim', uid: 'sim' }); return t.shells - b; };
    if (t.drift) by.gift += act({ t: 'collect', id: t.drift.id });
    for (let i = 0; i < 4; i++) by.feed += act({ t: 'feed' }); by.water += act({ t: 'water' }); for (let i = 0; i < 3; i++) by.glass += act({ t: 'glass' });
  }
  const total = t.shells - 10; console.log(label.padEnd(18), 'shells/day:', (total / 30).toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v / 30).toFixed(1)]))), 'fish alive', t.fish.length);
}
