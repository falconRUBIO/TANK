// Ties each profile fact to the Daily Discovery questions that test the same thing (word overlap, then listed for a person to confirm), so the
// two never say different things: a linked pair is checked together, and a change to one is a reason to look at the other.
// node tools/facts_link.mjs   (writes `questions: [ids]` on each record in server/discovery/facts.json and prints the pairs)
import fs from 'node:fs';
import { words } from '../server/discovery/validate.mjs';
const P = 'server/discovery/facts.json', store = JSON.parse(fs.readFileSync(P, 'utf8')), bank = JSON.parse(fs.readFileSync('server/discovery/bank.json', 'utf8')).filter((q) => q.status !== 'rejected');
const J = (A, B) => { let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };      // (overlap of the smaller set: a short fact inside a longer question still counts)
const Q = bank.map((q) => ({ q, w: words(`${q.q} ${q.choices[q.answer]} ${q.explain}`) })); let pairs = 0;
for (const r of store.facts) { if (r.status === 'rejected') continue; const w = words(r.text ?? r.real ?? ''); if (w.size < 3) continue;
  const hit = Q.map((x) => [x.q, J(w, x.w)]).filter(([, s]) => s >= 0.6).sort((a, b) => b[1] - a[1]).slice(0, 3);
  r.questions = hit.map(([q]) => q.id); if (!r.questions.length) delete r.questions; else { pairs += hit.length; for (const [q, s] of hit) console.log(`${r.id} ~ ${q.id} (${s.toFixed(2)}): ${r.text ?? r.real} || ${q.q} => ${q.choices[q.answer]}`); } }
fs.writeFileSync(P, JSON.stringify(store, null, 1) + '\n'); console.log(`${pairs} links`);
