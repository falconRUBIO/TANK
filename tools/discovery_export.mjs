// Daily Discovery: a reviewable export of the whole bank, as Markdown (to read) and CSV (to sort and annotate in a spreadsheet).
// node tools/discovery_export.mjs   →   TAKO_TANK_DISCOVERY_QUESTIONS.md, TAKO_TANK_DISCOVERY_QUESTIONS.csv
import fs from 'node:fs';
import { CATEGORIES } from '../server/discovery/validate.mjs';
const bank = JSON.parse(fs.readFileSync('server/discovery/bank.json', 'utf8')), L = 'ABC';
const md = [`# Tako Tank Daily Discovery: question bank export`, '', `${bank.length} questions. Status counts: ${Object.entries(bank.reduce((m, q) => ((m[q.status] = (m[q.status] ?? 0) + 1), m), {})).map(([k, v]) => `${v} ${k}`).join(', ')}. Only **verified** questions can be shown to players.`, '',
  'Each entry: the question, the three choices (the correct one in bold), the explanation, the source, and its checking status. `risk` is what the researcher flagged for the checker; the research note says what the search showed (it is not a quote).', ''];
for (const c of CATEGORIES) { const list = bank.filter((q) => q.category === c); if (!list.length) continue; md.push(`## ${c} (${list.length})`, '');
  for (const q of list) md.push(`### ${q.id} · ${q.difficulty}${q.behavior ? ` · Field Guide: ${q.behavior}` : ''} · ${q.status}${q.verifiedAt ? ` (${q.verifiedAt})` : ''}`, '', `**${q.q}**`, '', ...q.choices.map((x, i) => `- ${L[i]}. ${i === q.answer ? `**${x}** ✓` : x}`), '', q.explain, '',
    `Source: [${q.source?.publisher ?? q.source?.url}](${q.source?.url})${q.source2?.url ? ` · second source: [${q.source2.publisher ?? q.source2.url}](${q.source2.url})` : ''}`, '', `Fact id: \`${q.fact}\` · risk: ${q.risk ?? 'none'}${q.evidence ? `\n\nEvidence (checked on the page): "${q.evidence}"` : ''}`, '', `<sub>Research note: ${String(q.searchNote ?? '').replace(/\n/g, ' ')}</sub>`, ''); }
fs.writeFileSync('TAKO_TANK_DISCOVERY_QUESTIONS.md', md.join('\n'));
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync('TAKO_TANK_DISCOVERY_QUESTIONS.csv', [['id', 'category', 'difficulty', 'status', 'verified_at', 'question', 'choice_a', 'choice_b', 'choice_c', 'correct', 'explanation', 'source_url', 'source_publisher', 'source2_url', 'behavior', 'fact', 'risk', 'evidence'].join(','),
  ...bank.map((q) => [q.id, q.category, q.difficulty, q.status, q.verifiedAt, q.q, ...q.choices, L[q.answer], q.explain, q.source?.url, q.source?.publisher, q.source2?.url, q.behavior, q.fact, q.risk, q.evidence].map(cell).join(','))].join('\n') + '\n');
console.log(`exported ${bank.length} questions`);

// A sample for a person's quality check: every category and difficulty represented (fixed seed, so the same sample comes out each time), then
// every question that needs a person anyway (disputed, surprising, a precise number, conflicting sources). Tick or note each one.
import { needsHuman } from '../server/discovery/validate.mjs';
{
  const N = +((process.argv.find((a) => a.startsWith('--sample=')) ?? '--sample=60').split('=')[1]), live = bank.filter((q) => q.status !== 'rejected');
  const h = (s) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; return x; };
  const groups = new Map(); for (const q of live) { const k = `${q.category}|${q.difficulty}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q); }
  const sample = []; let round = 0;
  while (sample.length < N && round < 20) { for (const L of groups.values()) { const s = L.slice().sort((a, b) => h(a.id + 'qc') - h(b.id + 'qc'))[round]; if (s && sample.length < N) sample.push(s); } round++; }
  const flagged = live.filter((q) => needsHuman(q) && !sample.includes(q)), row = (q) => [`### ${q.id} · ${q.category} · ${q.difficulty} · ${q.status}${needsHuman(q) ? ' · needs a person' : ''}`, '', `**${q.q}**`, '', ...q.choices.map((x, i) => `- ${L[i]}. ${i === q.answer ? `**${x}** ✓` : x}`), '', q.explain, '', `Source: ${q.source?.url}${q.risk && q.risk !== 'none' ? ` · flagged: ${q.risk}` : ''}${q.prereview?.why ? ` · reviewer note: ${q.prereview.why}` : ''}`, '', '- [ ] Correct and fair   - [ ] Needs a change   - [ ] Exclude   Note: ', ''];
  fs.writeFileSync('TAKO_TANK_DISCOVERY_QC_SAMPLE.md', ['# Daily Discovery: sample for a human quality check', '', `These are DRAFTS: none has been checked against its source page yet (see TAKO_TANK_TRIVIA_VERIFICATION.md). Part 1 is ${sample.length} questions spread across every category and difficulty. Part 2 is every question that needs a person's approval anyway (${flagged.length}): disputed science, surprising claims, precise numbers or conflicting sources. A flagged question cannot go live without that approval.`, '', '## Part 1: spread sample', '', ...sample.flatMap(row), '## Part 2: questions that need a person', '', ...flagged.flatMap(row)].join('\n'));
  console.log(`QC sample: ${sample.length} spread + ${flagged.length} that need a person`);
}
