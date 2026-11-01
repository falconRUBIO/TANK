import assert from 'node:assert/strict';
import { seasonOf, SEASONS, seasonUntil } from './seasons.js';
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };
const at = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
ok('Halloween runs from midnight on October 30 to midnight on November 1, local time', () => {
  assert.equal(seasonOf(at(2026, 10, 29, 23, 59)), null);
  assert.equal(seasonOf(at(2026, 10, 30, 0, 0))?.id, 'halloween');
  assert.equal(seasonOf(at(2026, 10, 31, 23, 59))?.id, 'halloween');
  assert.equal(seasonOf(at(2026, 11, 1, 0, 0)), null); });
ok('New Year crosses the year: December 31 and January 1, then plain again', () => {
  assert.equal(seasonOf(at(2026, 12, 31, 12))?.id, 'newyear'); assert.equal(seasonOf(at(2027, 1, 1, 23, 59))?.id, 'newyear'); assert.equal(seasonOf(at(2027, 1, 2, 0, 0)), null); });
ok('an ordinary day has no season, and every season has what the scene and the menus need', () => {
  assert.equal(seasonOf(at(2026, 3, 14)), null);
  for (const S of SEASONS) { assert.ok(S.id && S.label && S.icon && S.text && S.glow && S.night && S.day, S.id); assert.ok(S.from.length === 2 && S.to.length === 2); }
  assert.match(seasonUntil(seasonOf(at(2026, 10, 30))), /October 31|31/); });
ok('Halloween comes back every year on its own: the same three days in 2027, 2030 and 2035, and a kept costume is filed under that year', () => {
  for (const y of [2027, 2030, 2035]) { assert.equal(seasonOf(at(y, 10, 29, 23, 59)), null, `${y} not yet`); const S = seasonOf(at(y, 10, 30, 9)); assert.equal(S?.id, 'halloween', `${y} on`); assert.equal(seasonOf(at(y, 10, 31, 23, 59))?.id, 'halloween'); assert.equal(seasonOf(at(y, 11, 1, 0, 0)), null, `${y} over`); assert.equal(new Date(S.from).getFullYear(), y, 'the costume tag year is this year, so every animal gets a fresh costume'); } });
ok('a leap year changes nothing: Halloween 2028 runs the same days', () => { assert.equal(seasonOf(at(2028, 10, 30, 0, 0))?.id, 'halloween'); assert.equal(seasonOf(at(2028, 11, 1, 0, 0)), null); });
console.log(`All ${n} season tests passed`);
