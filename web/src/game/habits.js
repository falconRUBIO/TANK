// Habits: a few plain sentences about what an animal really does, read from its own record (the fish log the lead phone keeps on the server,
// plus what has happened since the last report). Nothing here is made up: a line appears only once the counts behind it are real and large
// enough to mean something, and every number in it is a count of things that happened. The same rules serve every species; some only
// apply where the data exists (holdfasts for a seahorse, for instance).
//
// facts: { name, species, hitch: { decorId: [secondsHeld, visits] }, fav, meals, strikes, greets, links, inspects, places, lv: { area: ticks } }
// label(id): the name of the decoration with that id in the tank now, or null if it is gone
const AREA = { top: 'near the surface', mid: 'in mid-water', low: 'near the bottom', front: 'on the front sand', middle: 'on the middle bank', rear: 'up on the high back bank' };
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

export function habitLines(facts, label = () => null) {
  const F = facts ?? {}, name = F.name || 'It', out = [], H = F.hitch ?? {};
  // where it holds on: its favourite, and whether it keeps to places it knows or likes to try new ones
  const held = Object.entries(H).map(([id, h]) => ({ id, secs: +h?.[0] || 0, visits: +h?.[1] || 0, name: label(id) })).filter((h) => h.name);
  const total = held.reduce((a, h) => a + h.secs, 0), top = held.slice().sort((a, b) => b.secs - a.secs)[0];
  const fav = F.fav && held.find((h) => h.id === F.fav);
  if (fav && fav.visits >= 3) out.push({ k: 'fav', icon: '🌿', text: `${name} has gone back to the same ${fav.name.toLowerCase()} ${times(fav.visits - 1)}.` });
  if (total >= 600 && top && held.length >= 2) {
    const share = top.secs / total;
    if (share >= 0.55) out.push({ k: 'familiar', icon: '🏡', text: `${name} prefers familiar places to rest: ${Math.round(share * 100)}% of its time holding on has been on the ${top.name.toLowerCase()}.` });
    else if (held.length >= 5 && share < 0.35) out.push({ k: 'roams', icon: '🧭', text: `${name} likes to try new places to hold on. It has held on to ${held.length} different ones.` });
  }
  // what it does
  if ((F.inspects ?? 0) >= 3) out.push({ k: 'curious', icon: '🔎', text: `${name} often goes to look at new decorations: ${F.inspects} so far.` });
  if ((F.strikes ?? 0) >= 3) out.push({ k: 'strikes', icon: '🍤', text: (F.meals ?? 0) >= 5 && F.strikes / F.meals >= 0.5 ? `${name} catches most of its food from its stem without letting go: ${F.strikes} of ${F.meals} meals.` : `${name} has caught ${F.strikes} shrimp from its stem without letting go.` });
  const g = F.greets ?? 0, l = F.links ?? 0;
  if (g >= 2 || l >= 2) out.push({ k: 'social', icon: '💞', text: g >= 2 && l >= 2 ? `${name} has greeted other seahorses ${times(g)} and held tails ${times(l)}.` : g >= 2 ? `${name} has greeted other seahorses ${times(g)}.` : `${name} has held tails with another seahorse ${times(l)}.` });
  // where it spends its time, and how far it ranges (any animal)
  const lv = Object.entries(F.lv ?? {}), lvTot = lv.reduce((a, [, v]) => a + v, 0), [area, at] = lv.sort((a, b) => b[1] - a[1])[0] ?? [];
  if (lvTot >= 600 && AREA[area] && at / lvTot >= 0.6) out.push({ k: 'area', icon: '📍', text: `${name} spends most of its time ${AREA[area]}.` });
  if (!held.length && (F.places ?? 0) >= 5) out.push({ k: 'places', icon: '🗺️', text: `${name} has visited ${F.places} different decorations.` });
  return out.slice(0, 5);
}
