// Holidays and seasons, from the calendar alone. Nothing to buy and nothing to do: on the day (and the day before it) the tank dresses
// itself, and at midnight after the holiday it is plain again. Pure and shared, so the rules, the scene and the menus agree.
// A window runs from local midnight on `from` to local midnight on `to` (exclusive): Halloween is October 30 00:00 to November 1 00:00.
export const SEASONS = [
  { id: 'halloween', label: 'Halloween', icon: '🎃', from: [10, 30], to: [11, 1], glow: 0xffa040, night: 0x8a5cff, day: 0xffd7a8,
    text: 'Jack-o’-lanterns glow on the sand, a skull watches from the front, and ghosts drift through after dark. Until midnight on Halloween.', decor: 'pumpkins' },
  { id: 'yule', label: 'Winter holidays', icon: '❄️', from: [12, 24], to: [12, 27], glow: 0xdff4ff, night: 0x9fd0ff, day: 0xe8f4ff,
    text: 'A cold, clear light on the water, and the plankton glow frost-white after dark. Until the 27th.' },
  { id: 'newyear', label: 'New Year', icon: '🎆', from: [12, 31], to: [1, 2], glow: 0xffe08a, night: 0xffc96a, day: 0xfff0c8,
    text: 'Gold in the water for the turn of the year. Until midnight on New Year’s Day.' },
  { id: 'valentine', label: 'Valentine’s Day', icon: '💗', from: [2, 13], to: [2, 15], glow: 0xffa6d8, night: 0xff9ad0, day: 0xffe0ee,
    text: 'The plankton glow pink after dark, and the seahorse pairs dance a little longer. Until midnight on the 14th.' },
  { id: 'oceans', label: 'World Ocean Day', icon: '🌊', from: [6, 7], to: [6, 9], glow: 0x7fd3ff, night: 0x4fb0ff, day: 0xd6ecff,
    text: 'A deep blue day for the sea the animals came from. Until midnight on June 8.' },
];
const localMidnight = (y, m, d) => new Date(y, m - 1, d).getTime();
// the active season at a moment (local time), or null. A window that crosses New Year is checked against both years.
export function seasonOf(ms = Date.now()) {
  const d = new Date(ms), y = d.getFullYear();
  for (const S of SEASONS) for (const yy of [y - 1, y]) {
    const from = localMidnight(yy, S.from[0], S.from[1]), to = localMidnight(S.to[0] < S.from[0] ? yy + 1 : yy, S.to[0], S.to[1]);
    if (ms >= from && ms < to) return { ...S, from, to };
  }
  return null;
}
// when the current season ends, in words
export const seasonUntil = (S) => { const t = new Date(S.to - 1); return t.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); };
// a season by id, as if today were its first day (for a look at any of them from ?season=)
export const seasonById = (id) => { const S = SEASONS.find((x) => x.id === id); if (!S) return null; const y = new Date().getFullYear(); return { ...S, from: new Date(y, S.from[0] - 1, S.from[1]).getTime(), to: new Date(S.to[0] < S.from[0] ? y + 1 : y, S.to[0] - 1, S.to[1]).getTime() }; };
