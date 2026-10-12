// An animal's profile: the five personality bars, a title and a line about it, how well the tank knows it, its favourites and what it has been seen doing.
// Everything here is read from things the game already keeps (traits, an octopus's temperament, its seed, its journal), so the card says what the animal really does.
import { octoMind, behavioursFor, seenBehaviour, DISCOVERIES } from './game/rules.js';

const hash = (seed, n) => { let x = ((seed | 0) + 1) * 2654435761 + n * 40503; x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13; return ((x >>> 0) % 1000) / 1000; };
const clamp = (v) => Math.max(0.06, Math.min(0.96, v));

// the five bars, each with its own colour, as in the profile drawings
export const TRAIT_BARS = [
  { k: 'cur', label: 'Curiosity', col: '#5fe0f0' },
  { k: 'soc', label: 'Sociability', col: '#b48cff' },
  { k: 'bold', label: 'Boldness', col: '#ffc94d' },
  { k: 'act', label: 'Activity', col: '#7ee08a' },
  { k: 'adapt', label: 'Adaptability', col: '#ff8f7a' },
];
// what each bar means at its low, middle and high end; a seahorse and an octopus have their own words where they live differently
const WORDS = {
  cur: [['Uninterested', 'Keeps to what it knows.'], ['Curious', 'Has a look at new things in its own time.'], ['Very curious', 'Goes over to inspect anything new in the tank.']],
  soc: [['Independent', 'Happy with its own company.'], ['Friendly', 'Likes company now and then.'], ['Very social', 'Likes to stay close to others.']],
  bold: [['Cautious', 'Keeps near cover and takes a while to trust.'], ['Steady', 'Comes out when things are calm.'], ['Bold', 'Swims out front, right up to the glass.']],
  act: [['Low', 'Takes things slowly and rests a lot.'], ['Moderate', 'Busy in bursts, then rests.'], ['High', 'Always on the move.']],
  adapt: [['Sensitive', 'Notices every change in the tank.'], ['Adaptable', 'Settles after a change.'], ['Easygoing', 'Nothing much bothers it.']],
};
const OWN = {
  seahorse: { act: [['Low', 'Spends most of its time holding on and watching.'], ['Moderate', 'Holds on for a while, then drifts to a new stem.'], ['High', 'Moves from holdfast to holdfast more than most seahorses.']], cur: [['Uninterested', 'Sticks to the same few stems.'], ['Curious', 'Watches new things from a safe holdfast.'], ['Very curious', 'Swivels its eyes at everything that drifts past.']] },
  octopus: { act: [['Low', 'Likes long rests in its den.'], ['Moderate', 'Explores, then tucks itself away.'], ['High', 'Always crawling, climbing or poking at something.']], adapt: [['Sensitive', 'Likes its things where it left them.'], ['Adaptable', 'Copes with a rearranged tank.'], ['Easygoing', 'Moves house without a fuss.']] },
};
export function personaOf(f) {
  if (!f) return null; const s = f.seed ?? 0, j = (v, n) => clamp(v + (hash(s, n) - 0.5) * 0.24);
  if (f.species === 'octopus') { const m = octoMind(f); return { cur: m.cur, soc: m.soc, bold: m.bold, act: j(0.35 + m.cur * 0.25 + m.bold * 0.2, 6), adapt: j(0.85 - m.tidy * 0.5, 7) }; }
  const tr = f.traits ?? [], h = (x) => (tr.includes(x) ? 1 : 0);
  const p = { cur: 0.45 + h('Curious') * 0.33 - h('Lazy') * 0.08, soc: 0.45 + h('Social') * 0.33 - h('Shy') * 0.14, bold: 0.47 + h('Brave') * 0.33 - h('Shy') * 0.28, act: 0.5 + h('Playful') * 0.3 - h('Lazy') * 0.28 - h('Calm') * 0.1 + h('Greedy') * 0.05, adapt: 0.5 + h('Calm') * 0.3 - h('Shy') * 0.1 + h('Brave') * 0.06 };
  if (f.species === 'seahorse') { p.act -= 0.16; p.cur += 0.05; }
  return { cur: j(p.cur, 2), soc: j(p.soc, 3), bold: j(p.bold, 4), act: j(p.act, 5), adapt: j(p.adapt, 6) };
}
export function traitWords(f, k, v) { const w = OWN[f?.species]?.[k] ?? WORDS[k]; return w[v < 0.38 ? 0 : v < 0.68 ? 1 : 2]; }

// a title and a line for the top of the profile, from its strongest and weakest sides
export function summaryOf(f, P) {
  const name = f.name ?? 'It';
  if (f.species === 'octopus') { const m = octoMind(f); return { title: m.label, line: m.line }; }
  const sea = f.species === 'seahorse';
  const title = P.act < 0.4 && P.cur > 0.5 ? 'The Quiet Observer' : P.bold > 0.68 && P.cur > 0.6 ? 'The Adventurer' : P.soc > 0.68 ? 'The Friendly One' : P.bold < 0.32 ? 'The Gentle Hider' : P.act > 0.68 ? 'The Busy One' : P.cur > 0.66 ? 'The Explorer' : P.adapt > 0.68 ? 'The Easygoing One' : 'The Steady One';
  const say = { cur: ['keeps to familiar places', 'notices most of what goes on', 'checks out anything new'], soc: ['likes its own company', 'enjoys a little company', 'loves being near the others'], bold: ['stays close to cover', 'comes out when it is calm', 'is first to the glass'], act: [sea ? 'likes to hold on and watch the water' : 'takes life slowly', 'keeps a steady pace', 'is always on the move'], adapt: ['notices every change', 'settles in after a change', 'takes things as they come'] };
  const band = (v) => (v < 0.38 ? 0 : v < 0.68 ? 1 : 2), ks = Object.keys(say).sort((a, b) => Math.abs(P[b] - 0.5) - Math.abs(P[a] - 0.5));
  return { title, line: `${name} ${say[ks[0]][band(P[ks[0]])]} and ${say[ks[1]][band(P[ks[1]])]}.` };
}

// how well the tank knows it: time together, things seen and play all count
export const FAMILIAR = ['New Arrival', 'Settling In', 'Familiar', 'Comfortable', 'Well Established'];
const FAM_AT = [0, 2, 5, 9, 15];
export function familiarityOf(f, now = Date.now()) {
  const days = Math.max(0, (now - (f.born ?? now)) / 864e5), seen = behavioursFor(f).filter((k) => seenBehaviour(f, k)).length, bond = Object.values(f.bond ?? {}).reduce((n, x) => n + x, 0);
  const score = days + seen * 0.6 + Math.min(4, bond / 8); let i = 0; while (i < FAM_AT.length - 1 && score >= FAM_AT[i + 1]) i++;
  return { i, label: FAMILIAR[i], next: FAMILIAR[i + 1] ?? null, k: i >= FAM_AT.length - 1 ? 1 : (score - FAM_AT[i]) / (FAM_AT[i + 1] - FAM_AT[i]) };
}
// what it has been seen doing and what it might still show you
export function behaviourList(f) { return behavioursFor(f).map((k) => ({ k, label: DISCOVERIES[k]?.label ?? k, seen: seenBehaviour(f, k) })); }

// the basics that never change: what it is, its proper name and how big it grows
export const SPECIES_INFO = {
  goldfish: { sci: 'Amphiprion ocellaris', size: '8–11 cm' },
  neon: { sci: 'Chromis viridis', size: '8–10 cm' },
  cory: { sci: 'Gobiodon okinawae', size: '3–4 cm' },
  blue: { sci: 'Gramma loreto', size: '7–8 cm' },
  guppy: { sci: 'Chrysiptera cyanea', size: '7–8 cm' },
  angelfish: { sci: 'Pomacanthus imperator', size: '30–40 cm' },
  platy: { sci: 'Pterapogon kauderni', size: '7–8 cm' },
  danio: { sci: 'Pseudanthias squamipinnis', size: '10–15 cm' },
  betta: { sci: 'Synchiropus splendidus', size: '6–7 cm' },
  seahorse: { sci: 'Hippocampus kuda', size: '14–17 cm' },
  octopus: { sci: 'Octopus vulgaris', size: '60–90 cm with arms' },
};
