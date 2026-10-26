// Daily Discovery: the only way a question becomes verified. It fetches each question's source page and checks, word for word, that the quoted
// evidence is really on it. A question is verified only when (1) its evidence quote is found on its source page today, and (2) a reviewer has
// recorded that the quote settles the answer and rules out the other two choices (review.ok). Nothing here trusts a model's say-so: the page
// is fetched, and the words are either there or they are not.
//
//   node tools/discovery_verify.mjs --candidates [id|category ...]   fetch the pages of questions with no evidence yet and write, for each, the
//                                                                    sentences most likely to settle it (server/discovery/worksheet.json), for a
//                                                                    reviewer to copy the exact supporting sentence into `evidence`
//   node tools/discovery_verify.mjs --check [id|category ...]        fetch and check every question that has evidence; mark it verified (with
//                                                                    today's date) or unverified, and say why
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { normText, words } from '../server/discovery/validate.mjs';

const BANK = 'server/discovery/bank.json', SHEET = 'server/discovery/worksheet.json', CACHE = path.join(os.tmpdir(), 'tako-discovery-pages');
fs.mkdirSync(CACHE, { recursive: true });
const args = process.argv.slice(2), mode = args.includes('--check') ? 'check' : args.includes('--candidates') ? 'candidates' : null, pick = args.filter((a) => !a.startsWith('--'));
if (!mode) { console.log('usage: --candidates | --check [id|category ...]'); process.exit(2); }
const bank = JSON.parse(fs.readFileSync(BANK, 'utf8')), today = new Date().toISOString().slice(0, 10);
const chosen = bank.filter((q) => q.status !== 'rejected' && (!pick.length || pick.includes(q.id) || pick.includes(q.category)));

// a page as text: scripts, styles and tags out, entities decoded, spaces collapsed (cached for the run's day, so a re-run does not hammer a site)
function page(url) {
  const f = path.join(CACHE, crypto.createHash('sha256').update(url + today).digest('hex').slice(0, 24) + '.txt');
  if (fs.existsSync(f)) return { text: fs.readFileSync(f, 'utf8') };
  try {
    const html = execFileSync('curl', ['-sSL', '--max-time', '25', '--retry', '1', '-A', 'Mozilla/5.0 (TakoTank source check)', url], { encoding: 'utf8', maxBuffer: 30e6, stdio: ['ignore', 'pipe', 'pipe'] });
    const text = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|h\d|div|td|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, '-').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&[a-z]+;/gi, ' ')
      .replace(/[ \t\r]+/g, ' ').replace(/\n\s*/g, '\n').trim();
    if (text.length < 200) return { error: 'page came back nearly empty (blocked, or rendered by script)' };
    fs.writeFileSync(f, text); return { text };
  } catch (e) { return { error: String(e.stderr || e.message).split('\n')[0].slice(0, 160) }; }
}
const found = (quote, text) => { const q = normText(quote); return q.length >= 20 && normText(text).includes(q); };

if (mode === 'candidates') {
  const sheet = fs.existsSync(SHEET) ? JSON.parse(fs.readFileSync(SHEET, 'utf8')) : {}; let ok = 0, bad = 0;
  for (const q of chosen.filter((x) => !x.evidence)) {
    const P = page(q.source.url); if (P.error) { sheet[q.id] = { url: q.source.url, error: P.error, at: today }; bad++; continue; }
    const want = words(`${q.q} ${q.choices[q.answer]} ${q.explain}`), sents = P.text.split(/(?<=[.!?])\s+|\n/).map((x) => x.trim()).filter((x) => x.length > 30 && x.length < 400);
    const scored = sents.map((x) => { const w = words(x); let n = 0; for (const t of w) if (want.has(t)) n++; return [n / Math.sqrt(w.size + 1), x]; }).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([, x]) => x);
    sheet[q.id] = { url: q.source.url, q: q.q, answer: q.choices[q.answer], wrong: q.choices.filter((_, i) => i !== q.answer), explain: q.explain, candidates: scored, at: today }; ok++;
  }
  fs.writeFileSync(SHEET, JSON.stringify(sheet, null, 1) + '\n'); console.log(`pages read: ${ok}; could not read: ${bad} (see ${SHEET})`);
}
if (mode === 'check') {
  let v = 0, u = 0, e = 0;
  for (const q of chosen.filter((x) => x.evidence)) {
    const P = page(q.source.url);
    if (P.error) { q.verification = { url: q.source.url, quoteFound: false, checkedAt: today, error: P.error }; if (q.status === 'verified') q.status = 'unverified'; e++; continue; }      // (a page that cannot be read today does not stay verified on old evidence)
    const hit = found(q.evidence, P.text) || (q.source2?.url && q.evidence2 && found(q.evidence2, page(q.source2.url).text ?? ''));
    q.verification = { url: q.source.url, quoteFound: !!found(q.evidence, P.text), checkedAt: today, sha: crypto.createHash('sha256').update(P.text).digest('hex').slice(0, 16) };
    if (q.verification.quoteFound && q.review?.ok === true) { q.status = 'verified'; q.verifiedAt = today; v++; } else { if (q.status === 'verified') q.status = 'unverified'; u++; if (!hit) q.verification.note = 'the quoted words are not on the page'; }
  }
  fs.writeFileSync(BANK, JSON.stringify(bank, null, 1) + '\n'); console.log(`verified: ${v}; not verified: ${u}; page could not be read: ${e}`);
}
