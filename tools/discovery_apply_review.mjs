// Daily Discovery: apply a scientific review pass (server/discovery/review/batch*.json) to the bank. A reject retires the question for good, a
// review holds it back with the reviewer's reason, a fix rewrites it (the old wording is kept in `corrections`), and ok leaves it as it is.
// None of these makes a question verified: that only happens in tools/discovery_verify.mjs.  node tools/discovery_apply_review.mjs
import fs from 'node:fs';
const bank = JSON.parse(fs.readFileSync('server/discovery/bank.json', 'utf8')), byId = new Map(bank.map((q) => [q.id, q])), today = new Date().toISOString().slice(0, 10), n = { ok: 0, fix: 0, review: 0, reject: 0 };
for (const f of fs.readdirSync('server/discovery/review').filter((x) => /^batch\d+\.json$/.test(x))) {
  for (const r of JSON.parse(fs.readFileSync(`server/discovery/review/${f}`, 'utf8'))) {
    const q = byId.get(r.id); if (!q || q.prereview?.at) continue; n[r.verdict] = (n[r.verdict] ?? 0) + 1;
    q.prereview = { verdict: r.verdict, why: r.why ?? '', by: 'independent knowledge review (no source pages; not verification)', at: today, ...(r.dupOf ? { dupOf: r.dupOf } : {}) };
    if (r.verdict === 'reject') q.status = 'rejected';
    else if (r.verdict === 'review') q.status = 'review';
    else if (r.verdict === 'fix') { q.corrections ||= []; for (const [k, v] of Object.entries(r.fixed ?? {})) { if (['q', 'choices', 'answer', 'explain'].includes(k) && JSON.stringify(q[k]) !== JSON.stringify(v)) { q.corrections.push({ field: k, from: q[k], to: v, why: r.why ?? '', at: today }); q[k] = v; } } }
  }
}
// a source must be an https address the checker can fetch: an http one is held until a secure address for the same page is confirmed
for (const q of bank) { if (q.status === 'rejected') continue; if (!/^https:/.test(q.source?.url ?? '')) { q.status = 'review'; q.prereview = { ...(q.prereview ?? {}), source: 'source is not an https address: confirm a secure address for the same page' }; } if (q.source2 && !/^https:/.test(q.source2.url ?? '')) q.source2 = { ...q.source2, url: null, was: q.source2.url, note: 'not https: dropped until confirmed' }; }
fs.writeFileSync('server/discovery/bank.json', JSON.stringify(bank, null, 1) + '\n'); console.log(n);
