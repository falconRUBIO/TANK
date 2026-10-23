// ── Hermit crabs ── three real marine hermit crabs and the empty shells they live in. Pure data and rules, shared by the phones and the server.
// A crab lives in a shell it found. As it grows the shell gets tight and it looks for a roomier one: a shell fits when it is at least the crab's
// size and not much bigger (a shell far too big is too heavy to drag about). The crab decides; a player only puts shells in the tank.

const DAY = 864e5;
export const CRAB_IDS = ['blueleg', 'scarlet', 'halloween'];
export const isCrab = (x) => CRAB_IDS.includes(typeof x === 'string' ? x : x?.species);

// how big each kind is (in shell sizes) as a young crab and fully grown
export const CRAB_SIZE = { blueleg: [0.66, 1.0], scarlet: [0.78, 1.18], halloween: [0.95, 1.45] };
// six temperaments, each showing in how it moves (fish3d's crab, w3/crab3d.js)
export const CRAB_TYPES = {
  explorer: { label: 'Explorer', line: 'Wanders far and climbs whatever it finds.', roam: 1.6, climb: 0.5, pick: 1, bold: 0.6, hide: 0.2, collect: 0.3 },
  homebody: { label: 'Homebody', line: 'Keeps to its favorite hiding place and comes back to it.', roam: 0.5, climb: 0.15, pick: 1, bold: 0.4, hide: 0.6, collect: 0.2 },
  picky: { label: 'Picky', line: 'Looks over every shell, often three or more, before it moves.', roam: 1, climb: 0.25, pick: 3, bold: 0.5, hide: 0.3, collect: 0.4 },
  bold: { label: 'Bold', line: 'Walks up to animals it does not know and takes a look.', roam: 1.2, climb: 0.3, pick: 1, bold: 1, hide: 0.1, collect: 0.3 },
  timid: { label: 'Timid', line: 'Pulls into its shell at the first shadow and peeks out slowly.', roam: 0.7, climb: 0.15, pick: 1.5, bold: 0.1, hide: 0.8, collect: 0.2 },
  collector: { label: 'Collector', line: 'Pokes at anything interesting, and empty shells most of all.', roam: 1.1, climb: 0.3, pick: 2, bold: 0.5, hide: 0.3, collect: 1 },
};
export const crabTypeOf = (f) => f?.crab?.type ?? Object.keys(CRAB_TYPES)[Math.abs(f?.seed ?? 0) % 6];

// the empty shells a player can put in the tank (each a decoration, cat SHELLS). sz is how roomy it is. No shell does anything but fit or not.
export const SHELLS = {
  cshell_ivory: { label: 'Ivory Spiral', price: 0, sz: 1.0, blurb: 'A classic cream spiral. Comes free with your first hermit crab, sized for it to grow into.', starter: true },
  cshell_rose: { label: 'Rose Stripe', price: 6, sz: 0.8, blurb: 'A small shell in soft pink stripes. Right for a young crab.' },
  cshell_moon: { label: 'Moon Shell', price: 10, sz: 1.05, blurb: 'A round, dark charcoal spiral.' },
  cshell_pearl: { label: 'Pearl Spiral', price: 16, sz: 1.15, blurb: 'A pearly cream spiral that catches the light.' },
  cshell_tiger: { label: 'Tiger Shell', price: 18, sz: 1.3, blurb: 'Natural brown and cream bands. Roomy: for a bigger crab.' },
  cshell_coral: { label: 'Coral Shell', price: 22, sz: 1.45, blurb: 'A warm orange, ridged shell. A big crab’s home.' },
  cshell_ancient: { label: 'Ancient Spiral', price: 0, sz: 1.6, blurb: 'A weathered old spiral, found in the sand by one of your crabs.', earned: true },
  cshell_plain: { label: 'Old Whelk Shell', price: 0, sz: 1.0, blurb: 'A plain shell a crab dug up when nothing in the tank fit it.', earned: true, hidden: true },
  cshell_worn: { label: 'Worn Turban', price: 0, sz: 0.7, blurb: 'The little shell a crab arrived in.', earned: true, hidden: true },
};
export const isShell = (type) => !!SHELLS[type];
export const shellLabel = (type) => SHELLS[type]?.label ?? 'shell';
export const shellSz = (d) => (Number.isFinite(d?.sz) ? d.sz : SHELLS[d?.type ?? d?.t]?.sz ?? 1);

// a crab's size now: young when it arrives, full size at ten days (the same clock as every other animal)
export function crabNeed(f, now = Date.now(), adultDays = 10) { const S = CRAB_SIZE[f.species] ?? [0.8, 1.1], k = Math.max(0, Math.min(1, (now - f.born) / (adultDays * DAY))); return S[0] + (S[1] - S[0]) * k; }
// how a shell suits it: 'fits', 'small' (too tight to move into, or outgrown), or 'big' (too heavy to drag about)
export function shellFit(sz, need) { return sz < need * 0.97 ? 'small' : sz > need * 1.38 ? 'big' : 'fits'; }
// its own shell is outgrown once it is snug
export const outgrown = (f, now = Date.now()) => shellFit(f.crab?.shell?.sz ?? 1, crabNeed(f, now)) === 'small';
// the best of the empty shells for it (roomiest that still fits: it moves less often that way), or null
export function bestShell(f, empties, now = Date.now()) {
  const need = crabNeed(f, now), mine = f.crab?.shell?.sz ?? 0;
  return empties.filter((d) => shellFit(shellSz(d), need) === 'fits' && shellSz(d) > mine + 0.04).sort((a, b) => shellSz(b) - shellSz(a))[0] ?? null;
}
export const crabInit = (f, now = Date.now()) => { f.crab ||= {}; const C = f.crab; C.type ||= crabTypeOf(f); if (!C.shell) { C.shell = { t: 'cshell_worn', sz: +(crabNeed(f, now) * 1.08).toFixed(2) }; C.hist = [{ t: 'cshell_worn', at: now, how: 'arrived' }]; } C.hist ||= []; C.met ||= {}; C.finds ||= []; return C; };
