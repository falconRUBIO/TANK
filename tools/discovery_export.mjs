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
