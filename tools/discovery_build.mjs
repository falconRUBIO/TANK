// Daily Discovery: gather the researchers' drafts (server/discovery/drafts/*.json) into the bank (server/discovery/bank.json). Every question keeps its
// permanent id once it has one (matched by its fact id), new ones get the next free number, and nothing already in the bank is lost: a question
// whose draft disappeared stays as it was. Drafts come in UNVERIFIED; only tools/discovery_verify.mjs can make a question verified.
// node tools/discovery_build.mjs
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('server/discovery'), bankPath = path.join(dir, 'bank.json'), drafts = path.join(dir, 'drafts');
const bank = fs.existsSync(bankPath) ? JSON.parse(fs.readFileSync(bankPath, 'utf8')) : [];
const byFact = new Map(bank.map((q) => [q.fact, q])); let next = Math.max(0, ...bank.map((q) => +String(q.id).slice(3) || 0)) + 1;
const order = ['cephalopods', 'seahorses', 'crustaceans', 'fish', 'sea-turtles', 'sharks-rays', 'marine-mammals', 'corals-reefs', 'jellies', 'mollusks', 'echinoderms', 'deep-sea', 'seabirds', 'kelp-plankton'];
let added = 0, kept = 0, skipped = [];
for (const cat of order) {
  const f = path.join(drafts, `${cat}.json`); if (!fs.existsSync(f)) continue;
  let list; try { list = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { skipped.push(`${cat}: not valid JSON (${e.message})`); continue; }
  for (const d of list) {
    if (!d?.fact) { skipped.push(`${cat}: an entry with no fact id`); continue; }
    const was = byFact.get(d.fact);
    if (was) { if (was.status === 'unverified' && !was.evidence) Object.assign(was, { q: d.q, choices: d.choices, answer: d.answer, explain: d.explain, difficulty: d.difficulty, behavior: d.behavior ?? null, source: d.source, source2: d.source2 ?? null, searchNote: d.searchNote ?? '', risk: d.risk ?? 'none' }); kept++; continue; }      // (a draft can still be rewritten until it has been checked)
    const q = { id: `dd-${String(next++).padStart(4, '0')}`, fact: d.fact, q: d.q, choices: d.choices, answer: d.answer, explain: d.explain, category: d.category ?? cat, difficulty: d.difficulty, behavior: d.behavior ?? null,
      source: d.source, source2: d.source2 ?? null, status: 'unverified', verifiedAt: null, evidence: null, verification: null, review: null, risk: d.risk ?? 'none', searchNote: d.searchNote ?? '' };
    bank.push(q); byFact.set(q.fact, q); added++;
  }
}
fs.writeFileSync(bankPath, JSON.stringify(bank, null, 1) + '\n');
console.log(`bank: ${bank.length} questions (${added} added, ${kept} already there)`); for (const s of skipped) console.log('  skipped:', s);
