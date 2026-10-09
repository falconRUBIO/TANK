// The sky above the tank, from the real date: the moon's phase and the odd rainy day. Pure and shared (the game rules and the scene both read it).
// Nothing here is required and nothing is a streak: it is only something to notice. Same answer for everyone on the same day.
const SYNODIC = 29.530588853, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
export const moonPhase = (ms) => { const d = (ms - NEW_MOON) / 864e5; return (((d % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC; };        // 0 new, 0.5 full
const NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
export const moonName = (ph) => NAMES[Math.floor(((ph + 1 / 16) % 1) * 8)];
const h32 = (n) => { let h = (n | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
export function skyOf(ms) {
  const ph = moonPhase(ms), day = Math.floor(ms / 864e5), near = (c, w) => Math.min(Math.abs(ph - c), 1 - Math.abs(ph - c)) <= w;
  let event = null;
  if (near(0.5, 0.034)) event = { key: 'fullmoon', label: 'Full moon', text: 'A full moon. The water glows silver tonight, and the tide brings pearls.' };
  else if (near(0, 0.034)) event = { key: 'darkmoon', label: 'New moon', text: 'A new moon. It is the darkest night, so the plankton glow their brightest.' };
  else if (near(0.595, 0.02)) event = { key: 'spawn', label: 'Spawning night', text: 'Coral spawning night. Pink clouds drift through the water after dark.' };
  else if (h32(day * 7 + 3) % 8 === 0) event = { key: 'rain', label: 'Rain', text: 'Rain at the surface today. The curious fish drift up to look.' };
  return { phase: ph, moon: moonName(ph), event };
}
