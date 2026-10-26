// One-time: turn the profile-fact audit (server/discovery/review/profile_facts_audit.json) of the three old lists (facts.js FACTS and
// TRAIT_FACTS, main.js SPECIES_FACTS, rules.js EGG_CARE) into the one store, server/discovery/facts.json. Removed facts are kept as rejected
// records (with why), merged ones fold their animals into the fact they repeat, and every fix keeps the old wording in `corrections`.
import fs from 'node:fs';
const SRC = process.argv[2], audit = JSON.parse(fs.readFileSync('server/discovery/review/profile_facts_audit.json', 'utf8')), orig = new Map(JSON.parse(fs.readFileSync(SRC, 'utf8')).map((x) => [x.id, x])), today = new Date().toISOString().slice(0, 10);
const CAT = (sp) => (sp === 'octopus' ? 'cephalopods' : sp === 'seahorse' ? 'seahorses' : ['turtle', 'hawksbill', 'loggerhead', 'kemps', 'leatherback'].includes(sp) ? 'sea-turtles' : 'fish');
const SUBJ = { octopus: 'coconut-octopus', seahorse: 'seahorse', turtle: 'green-turtle', hawksbill: 'hawksbill', loggerhead: 'loggerhead', kemps: 'kemps-ridley', leatherback: 'leatherback', goldfish: 'clownfish', neon: 'blue-chromis', cory: 'watchman-goby', blue: 'royal-gramma', guppy: 'damselfish', angelfish: 'angelfish', platy: 'cardinalfish', danio: 'anthias', betta: 'mandarin-dragonet', neongoby: 'neon-goby', tang: 'blue-tang', puffer: 'valentini-puffer' };
const STOP = new Set('a an the of to and or in on its it is are can by for with as at from that this their they his her when into more most some like'.split(' '));
const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).slice(0, 4).join('-');
const A = new Map(audit.map((x) => [x.id, x])), root = (id, n = 0) => { const x = A.get(id); return x?.verdict === 'merge' && x.mergeInto && n < 9 ? root(x.mergeInto, n + 1) : id; };
const recs = new Map(), used = new Set(); let next = 1;
for (const x of audit) { if (x.verdict === 'merge') continue; const o = orig.get(x.id), kind = o.from.includes('TRAIT') ? 'trait' : o.from.includes('EGG_CARE') ? 'eggcare' : 'profile';
  let fact = `${CAT(o.species)}.${SUBJ[o.species] ?? o.species}.${kind === 'trait' ? 'trait-' + o.trait.toLowerCase() : slug(x.text ?? o.text)}`; while (used.has(fact)) fact += '-2'; used.add(fact);
  const r = { id: `pf-${String(next++).padStart(4, '0')}`, fact, kind, species: [o.species], ...(kind === 'trait' ? { trait: o.trait, game: x.game ?? null, real: x.real ?? null } : { text: x.verdict === 'remove' ? o.text : (x.text ?? o.text) }),
    source: x.source?.url ? x.source : null, source2: null, risk: x.risk ?? 'none', status: x.verdict === 'remove' ? 'rejected' : (kind === 'trait' && !x.real) || x.source?.url ? 'unverified' : 'review', verifiedAt: null, evidence: null, verification: null,
    legacy: true, was: [{ from: o.from, species: o.species, text: o.text }], prereview: { verdict: x.verdict, why: x.why ?? '', by: 'profile-fact audit (search summaries only; not verification)', at: today }, searchNote: x.searchNote ?? '' };
  if (x.verdict === 'fix') r.corrections = [{ from: o.text, to: kind === 'trait' ? [r.game, r.real].filter(Boolean).join(' ') : r.text, why: x.why ?? '', at: today }];
  if (r.status === 'review') r.prereview.source = 'no reputable page found yet';
  recs.set(x.id, r); }
for (const x of audit) { if (x.verdict !== 'merge') continue; const r = recs.get(root(x.id)), o = orig.get(x.id); if (!r) continue; r.was.push({ from: o.from, species: o.species, text: o.text, merged: x.why ?? '' }); if (!r.species.includes(o.species)) r.species.push(o.species); }
const facts = [...recs.values()];
fs.writeFileSync('server/discovery/facts.json', JSON.stringify({ meta: { transition: true, note: 'transition: until source pages can be fetched, profiles keep showing the audited facts that were already in the game (kept or corrected, with a candidate source). Verified facts always show; rejected or held ones never do. Set transition to false to show verified facts only.' }, facts }, null, 1) + '\n');
const c = facts.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {}); console.log(facts.length, c);
