// Daily Discovery release gate: checks every question in the bank and prints what is wrong, what looks alike, and what would be published.
// Exit code 1 if anything that is marked verified fails a check, or the bank has repeated ids, facts or questions.
// node tools/discovery_validate.mjs [--json]
import fs from 'node:fs';
import { checkBank, CATEGORIES } from '../server/discovery/validate.mjs';
const bank = JSON.parse(fs.readFileSync('server/discovery/bank.json', 'utf8')), reviewed = fs.existsSync('server/discovery/reviewed.json') ? JSON.parse(fs.readFileSync('server/discovery/reviewed.json', 'utf8')) : [];
const r = checkBank(bank, { reviewed }), byId = new Map(bank.map((q) => [q.id, q]));
const count = (k) => bank.reduce((m, q) => ((m[q[k] ?? 'none'] = (m[q[k] ?? 'none'] ?? 0) + 1), m), {});
const badVerified = r.entries.filter((e) => byId.get(e.id)?.status === 'verified' && e.errors.length);
const draftErr = r.entries.filter((e) => byId.get(e.id)?.status !== 'verified' && e.errors.some((x) => !/^(verifiedAt|evidence|verification|review):/.test(x)));
const out = { total: bank.length, published: r.published.length, status: count('status'), category: count('category'), difficulty: count('difficulty'), behavior: count('behavior'), bankErrors: r.bankErrors, lookAlikes: r.flags, verifiedWithErrors: badVerified, draftsWithErrors: draftErr.map((e) => ({ id: e.id, errors: e.errors.filter((x) => !/^(verifiedAt|evidence|verification|review):/.test(x)) })), warnings: r.entries.filter((e) => e.warnings.length).map((e) => ({ id: e.id, warnings: e.warnings })), missingCategories: CATEGORIES.filter((c) => !bank.some((q) => q.category === c)) };
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`Questions: ${out.total} · published (verified and clean): ${out.published}`);
  console.log('Status:', out.status); console.log('Category:', out.category); console.log('Difficulty:', out.difficulty); console.log('Behavior links:', out.behavior);
  console.log(`Bank errors: ${out.bankErrors.length}`); for (const e of out.bankErrors) console.log('  ', e);
  console.log(`Look-alike pairs needing review: ${out.lookAlikes.length}`); for (const f of out.lookAlikes) console.log(`   ${f.a} ~ ${f.b}: ${f.why} | ${byId.get(f.a).q} || ${byId.get(f.b).q}`);
  console.log(`Drafts with problems in the question itself: ${out.draftsWithErrors.length}`); for (const d of out.draftsWithErrors) console.log(`   ${d.id}: ${d.errors.join('; ')}`);
  console.log(`Wording warnings: ${out.warnings.length}`);
  console.log(`Verified but failing a check: ${out.verifiedWithErrors.length}`);
}
process.exit(out.verifiedWithErrors.length || out.bankErrors.length ? 1 : 0);
