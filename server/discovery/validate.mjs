// Daily Discovery: the checks every question must pass before it can be shown to anyone. Used by the server when it loads the bank (only
// what passes is published) and by tools/discovery_validate.mjs (the release gate). Plain functions, no I/O.
import { GUIDE } from '../../web/src/game/rules.js';

export const CATEGORIES = ['cephalopods', 'fish', 'sharks-rays', 'marine-mammals', 'sea-turtles', 'crustaceans', 'seahorses', 'corals-reefs', 'jellies', 'mollusks', 'echinoderms', 'deep-sea', 'seabirds', 'kelp-plankton'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const STATUSES = ['verified', 'unverified', 'review', 'rejected'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// the text as a reader meets it: lower case, no punctuation, single spaces (for "is this the same question?")
export const normText = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('a an the of to in on at by for from with and or is are was were be been it its this that these those which what who whom how many much does do did can could has have had as than into about over under their they them there his her he she you your our we most more some any one two three when where why while also not no yes'.split(' '));
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '').replace(/(ing|ed)$/, '');
export const words = (s) => new Set(normText(s).split(' ').filter((w) => w && !STOP.has(w)).map(stem).filter((w) => w.length > 1));
const jaccard = (A, B) => { if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };

function urlOk(u) { try { const x = new URL(u); return x.protocol === 'https:' && /\./.test(x.hostname) && !/\s/.test(u); } catch { return false; } }
function dateOk(d, today) { if (!DATE.test(d ?? '')) return false; const t = Date.parse(d + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d && d <= today; }

// The two reviews every verified question needs (they must be by different reviewers), and the human review some need on top.
// First review: the source (as fetched) says what the answer says, and the explanation says only what the source supports.
// Second review: someone else reads the question, the three choices, the explanation and the evidence, and confirms the quote really settles
// the answer, both wrong choices are wrong, and nothing in the wording can be read two ways. A quote merely being on the page is not enough.
// A reviewer that is a model is named 'ai:...' and can never stand in for the human review.
export const needsHuman = (q) => ['numeric', 'surprising', 'disputed-check'].includes(q?.risk) || !!q?.conflict || q?.prereview?.verdict === 'review' || !!q?.review1?.flagHuman || !!q?.review2?.flagHuman;
export function reviewProblems(q) {
  const out = [], r1 = q?.review1, r2 = q?.review2, h = q?.humanReview, who = (r) => String(r?.by ?? '').trim();
  if (!r1 || r1.ok !== true || r1.answerMatchesSource !== true || r1.explanationMatchesSource !== true || !who(r1)) out.push('review1: the first review (answer and explanation against the source) is missing or not passed');
  if (!r2 || r2.ok !== true || r2.quoteSupportsAnswer !== true || r2.distractorsWrong !== true || r2.unambiguous !== true || !who(r2)) out.push('review2: the second review (quote settles the answer, wrong choices wrong, no ambiguity) is missing or not passed');
  if (r1 && r2 && who(r1) && who(r1) === who(r2)) out.push('review2: must be done by a different reviewer from review1');
  if (needsHuman(q) && (!h || h.ok !== true || !who(h) || /^ai[:\s]/i.test(who(h)))) out.push('humanReview: flagged (disputed, surprising, a precise number or conflicting sources) and needs a person\'s approval');
  return out;
}

// One entry on its own. errors: it cannot be published (or, for a draft, cannot be verified as it stands). warnings: a person should look.
export function checkEntry(q, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const e = [], w = [], str = (v, lo, hi) => typeof v === 'string' && v.trim().length >= lo && v.length <= hi;
  if (!/^dd-\d{4}$/.test(q?.id ?? '')) e.push('id: missing or not in the form dd-0001');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+){2,}$/.test(q?.fact ?? '')) e.push('fact: missing or not in the form category.subject.claim');
  if (!str(q?.q, 15, 220)) e.push('q: missing, too short or too long'); else if (!q.q.trim().endsWith('?')) e.push('q: should end with a question mark');
  if (!Array.isArray(q?.choices) || q.choices.length !== 3) e.push('choices: there must be exactly three');
  else { if (q.choices.some((c) => !str(c, 1, 90))) e.push('choices: each must be a non-empty string of at most 90 characters');
    if (new Set(q.choices.map(normText)).size !== 3) e.push('choices: two choices are the same'); }
  if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 2) e.push('answer: must be 0, 1 or 2');
  if (!str(q?.explain, 20, 320)) e.push('explain: missing, too short or too long');
  if (!CATEGORIES.includes(q?.category)) e.push('category: not one of the categories');
  else if (q.fact && !q.fact.startsWith(q.category + '.')) w.push('fact: does not start with its category');
  if (!DIFFICULTIES.includes(q?.difficulty)) e.push('difficulty: must be easy, medium or hard');
  if (!q?.source || !urlOk(q.source.url)) e.push('source.url: missing or not a valid https address');
  if (q?.source && !str(q.source.publisher, 2, 120)) e.push('source.publisher: missing');
  if (q?.source2 != null && !urlOk(q.source2.url)) e.push('source2.url: not a valid https address');
  if (!STATUSES.includes(q?.status)) e.push('status: must be verified, unverified, review or rejected');
  if (q?.behavior != null && !GUIDE[q.behavior]) e.push(`behavior: "${q.behavior}" is not a Field Guide behavior`);
  if (q?.status === 'verified') {      // verified: a page really fetched and holding the quoted words, then two separate reviews, and a person for anything flagged
    if (!dateOk(q.verifiedAt, today)) e.push('verifiedAt: a verified question needs the date it was checked (YYYY-MM-DD, not in the future)');
    if (!str(q.evidence, 20, 600)) e.push('evidence: a verified question needs the quoted words from its source');
    const v = q.verification;
    if (!v || v.quoteFound !== true || v.url !== q.source?.url || !dateOk(v.checkedAt, today)) e.push('verification: no record that the source page was fetched and holds the quote');
    for (const x of reviewProblems(q)) e.push(x);
  }
  if (Array.isArray(q?.choices) && Number.isInteger(q?.answer) && typeof q?.explain === 'string') {      // does the explanation agree with the answer it explains?
    const ex = words(q.explain), hit = (c) => [...words(c)].filter((w) => ex.has(w)).length, right = hit(q.choices[q.answer] ?? ''), wrong = Math.max(...q.choices.map((c, i) => (i === q.answer ? -1 : hit(c))));
    const nums = (x) => (String(x).match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/,/g, '')), an = nums(q.choices[q.answer]);
    if (wrong > right && wrong >= 2) w.push('consistency: the explanation has more in common with a wrong choice than with the answer');
    if (an.length && nums(q.explain).length && !an.some((n) => nums(q.explain).includes(n))) w.push('consistency: the answer\'s number does not appear in the explanation');
  }
  const text = `${q?.q ?? ''} ${q?.explain ?? ''}`;
  if (/\b(always|never|all species|every species|only)\b/i.test(text)) w.push('wording: uses an absolute word (always, never, only, all species); check the source says exactly that');
  if (/\b(all|none) of the above\b/i.test((q?.choices ?? []).join(' '))) e.push('choices: "all/none of the above" is not allowed');
  if (/\bnot\b|\bexcept\b/i.test(q?.q ?? '')) w.push('q: a negative question ("not", "except") is easy to misread');
  return { errors: e, warnings: w };
}

// The whole bank: every entry, then what only shows across entries (repeated ids, facts and questions, and pairs that look alike).
// reviewed: [{ a, b, verdict: 'distinct' | 'duplicate', note }] — pairs a person has already looked at.
export function checkBank(list, { reviewed = [], today } = {}) {
  const entries = Array.isArray(list) ? list : [], byId = new Map(), byFact = new Map(), byText = new Map(), out = new Map(), bankErrors = [];
  const add = (id, msg) => { const r = out.get(id); if (r) r.errors.push(msg); };
  for (const q of entries) { const r = checkEntry(q, { today }); out.set(q?.id, { id: q?.id, ...r });
    if (byId.has(q?.id)) { bankErrors.push(`duplicate id ${q?.id}`); add(q?.id, 'id: used twice'); } else byId.set(q?.id, q);
    if (q?.status !== 'rejected') {
      if (q?.fact && byFact.has(q.fact)) { bankErrors.push(`duplicate fact ${q.fact}: ${byFact.get(q.fact)} and ${q.id}`); add(q.id, `fact: already tested by ${byFact.get(q.fact)}`); } else if (q?.fact) byFact.set(q.fact, q.id);
      const k = normText(q?.q); if (k && byText.has(k)) { bankErrors.push(`duplicate question text: ${byText.get(k)} and ${q.id}`); add(q.id, `q: the same question as ${byText.get(k)}`); } else if (k) byText.set(k, q.id);
    } }
  // look-alikes: the question with its right answer, and the explanation, compared word for word (content words only)
  const live = entries.filter((q) => q?.status !== 'rejected' && q?.id), sig = live.map((q) => ({ q, a: words(`${q.q} ${q.choices?.[q.answer] ?? ''}`), x: words(q.explain), subj: String(q.fact ?? '').split('.').slice(0, 2).join('.') }));
  const seen = new Map(reviewed.map((r) => [[r.a, r.b].sort().join('|'), r])), flags = [];
  for (let i = 0; i < sig.length; i++) for (let j = i + 1; j < sig.length; j++) {
    const A = sig[i], B = sig[j], qa = jaccard(A.a, B.a), xa = jaccard(A.x, B.x), sameAns = normText(A.q.choices?.[A.q.answer]) === normText(B.q.choices?.[B.q.answer]);
    const why = qa >= 0.5 ? `questions alike (${qa.toFixed(2)})` : xa >= 0.55 ? `explanations alike (${xa.toFixed(2)})` : A.subj === B.subj && sameAns && qa >= 0.3 ? 'same subject and same answer' : null;
    if (!why) continue;
    const key = [A.q.id, B.q.id].sort().join('|'), r = seen.get(key), later = [A.q.id, B.q.id].sort()[1];
    if (r?.verdict === 'distinct') continue;
    if (r?.verdict === 'duplicate') { add(later, `duplicate of ${[A.q.id, B.q.id].sort()[0]} (reviewed)`); continue; }
    flags.push({ a: A.q.id, b: B.q.id, why }); add(later, `looks like ${[A.q.id, B.q.id].sort()[0]} (${why}): needs review`);
  }
  const published = entries.filter((q) => q?.status === 'verified' && out.get(q.id)?.errors.length === 0 && byId.get(q.id) === q);
  return { entries: [...out.values()], bankErrors, flags, published };
}

// ── The profile facts (server/discovery/facts.json): the same scientific standard as the questions, a shorter shape. One record per fact; the
// animal profiles, egg cards and trait notes all read from these records (tools/facts_build.mjs writes web/src/facts.js from them). ──
export const FACT_KINDS = ['profile', 'trait', 'eggcare'];
export function checkFactRecord(r, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const e = [], w = [], str = (v, lo, hi) => typeof v === 'string' && v.trim().length >= lo && v.length <= hi;
  if (!/^pf-\d{4}$/.test(r?.id ?? '')) e.push('id: missing or not in the form pf-0001');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+){2,}$/.test(r?.fact ?? '')) e.push('fact: missing or not in the form category.subject.claim');
  if (!FACT_KINDS.includes(r?.kind)) e.push('kind: must be profile, trait or eggcare');
  if (!Array.isArray(r?.species) || !r.species.length) e.push('species: which animals it is shown for');
  if (r?.kind === 'trait' ? !str(r?.game, 10, 220) || !r?.trait : !str(r?.text, 15, 260)) e.push(r?.kind === 'trait' ? 'trait: needs the trait and its in-game sentence' : 'text: missing, too short or too long');
  if (r?.status !== 'rejected' && (r?.kind !== 'trait' || r?.real) && !urlOk(r?.source?.url)) e.push('source.url: missing or not a valid https address');
  if (!STATUSES.includes(r?.status)) e.push('status: must be verified, unverified, review or rejected');
  if (r?.status === 'verified') {
    if (!dateOk(r.verifiedAt, today)) e.push('verifiedAt: needs the date it was checked');
    if (!str(r.evidence, 20, 600)) e.push('evidence: needs the quoted words from its source');
    const v = r.verification; if (!v || v.quoteFound !== true || v.url !== r.source?.url || !dateOk(v.checkedAt, today)) e.push('verification: no record that the source page was fetched and holds the quote');
    for (const x of reviewProblems({ ...r, q: r.text ?? r.real })) e.push(x);
  }
  if (/\b(always|never|only|first|biggest|largest|smallest|most)\b/i.test(`${r?.text ?? ''} ${r?.real ?? ''}`)) w.push('wording: an absolute or record word; check the source says exactly that');
  return { errors: e, warnings: w };
}
export function checkFacts(list, questions = [], opts = {}) {
  const out = [], seen = new Map(), qFacts = new Map(questions.map((q) => [q.fact, q])), bankErrors = [];
  for (const r of list ?? []) { const c = checkFactRecord(r, opts); out.push({ id: r?.id, ...c });
    if (seen.has(r?.id)) bankErrors.push(`duplicate id ${r?.id}`); seen.set(r?.id, r);
    const q = qFacts.get(r?.fact); if (q && r?.status !== 'rejected' && q.source?.url && r?.source?.url && q.source.url !== r.source.url && !r.source2) c.warnings.push(`the question ${q.id} tests the same fact from a different source: check they agree`); }
  const byFact = new Map(); for (const r of list ?? []) if (r?.status !== 'rejected') { if (byFact.has(r.fact) && !(r.kind === 'trait' || byFact.get(r.fact).kind === 'trait')) bankErrors.push(`duplicate fact ${r.fact}: ${byFact.get(r.fact).id} and ${r.id}`); byFact.set(r.fact, r); }
  return { entries: out, bankErrors };
}
