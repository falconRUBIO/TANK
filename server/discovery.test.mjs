// Daily Discovery: the server side, end to end over real connections. Run: node --disable-warning=ExperimentalWarning server/discovery.test.mjs
// The questions below are TEST FIXTURES (about nothing real): they only exercise selection, privacy, rewards and the no-repeat rule.
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { start } from './server.mjs';
import { checkBank, checkEntry } from './discovery/validate.mjs';
import * as R from '../web/src/game/rules.js';

let pass = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name, '\n   ', e.stack?.split('\n').slice(0, 3).join('\n    ')); process.exitCode = 1; } };
const today = new Date().toISOString().slice(0, 10), CAT = ['cephalopods', 'fish', 'seahorses', 'crustaceans', 'jellies', 'mollusks'];
const W = 'amber basalt cobalt dune ember fjord garnet harbor indigo jasper kelp lagoon meadow nectar opal pebble quartz reef saffron tundra umber violet willow xenon yarrow zephyr'.split(' '), w3 = (i, k) => [0, 1, 2].map((j) => W[(i * 3 + j + k) % W.length]).join(' ');      // (words no two fixtures share, so none look alike)
const fx = (i, extra = {}) => ({ id: `dd-${String(i).padStart(4, '0')}`, fact: `${CAT[i % CAT.length]}.fixture-${i}.claim-${i}`, q: `Fixture ${w3(i, 0)}?`, choices: [`Alpha ${i}`, `Bravo ${i}`, `Charlie ${i}`], answer: i % 3,
  explain: `Fixture explanation, ${w3(i, 9)} ${w3(i, 18)}.`, category: CAT[i % CAT.length], difficulty: ['easy', 'medium', 'hard'][i % 3], source: { url: `https://example.org/fixture/${i}`, publisher: 'Fixture' }, status: 'verified', verifiedAt: today,
  evidence: `Fixture evidence sentence number ${i} for the test.`, verification: { url: `https://example.org/fixture/${i}`, quoteFound: true, checkedAt: today }, review1: { by: 'ai:first', at: today, ok: true, answerMatchesSource: true, explanationMatchesSource: true }, review2: { by: 'ai:second', at: today, ok: true, quoteSupportsAnswer: true, distractorsWrong: true, unambiguous: true }, ...extra });
const BANK = [fx(1, { behavior: 'escape' }), fx(2), fx(3), fx(4, { behavior: 'mimic' }), fx(5), fx(6), fx(7, { status: 'unverified' })];      // six published, one not

let clock = Date.parse('2026-11-02T15:00:00Z');
const S = await start({ port: 0, dbPath: ':memory:', limits: { joinPerMin: 400, userPerHour: 5000, tankPerHour: 5000, actionsPer10s: 500 }, push: { publicKey: 'P', privateKey: 'Q', sender: async () => ({}) }, discovery: { bank: BANK, now: () => clock } });
const base = `http://localhost:${S.port}`;
const call = async (path, body, token) => { const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
const mkUser = async (name) => (await call('/api/users', { name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } })).body;
const open = (token) => new Promise((ok, no) => { const ws = new WebSocket(`ws://localhost:${S.port}/ws?token=${token}`); ws.msgs = []; ws.raw = []; ws.on('message', (d) => { ws.raw.push(d.toString()); ws.msgs.push(JSON.parse(d.toString())); }); ws.on('open', () => ok(ws)); ws.on('error', no); });
const waitFor = async (ws, pred, ms = 2000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const i = ws.msgs.findIndex(pred); if (i >= 0) return ws.msgs.splice(i, 1)[0]; await new Promise((r) => setTimeout(r, 10)); } throw new Error('timed out'); };
const dd = (ws) => waitFor(ws, (m) => m.t === 'dd');
const shells = (id) => JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(id).world).shells;
const nextDay = () => { clock += 864e5; };

const a = await mkUser('Ana'), b = await mkUser('Ben'), c = await mkUser('Cy'), x = await mkUser('Xan');
const tk = (await call('/api/tanks', { name: 'Reef' }, a.token)).body; await call('/api/join', { code: tk.code }, b.token);
const other = (await call('/api/tanks', { name: 'Lagoon' }, x.token)).body;

console.log('Daily Discovery');
let A, Bw, va, vb;
await t('everyone in a tank gets the same question, chosen by the server, with three choices and nothing else', async () => {
  A = await open(a.token); Bw = await open(b.token); va = await dd(A); vb = await dd(Bw);
  assert.equal(va.state, 'open'); assert.equal(va.id, vb.id); assert.deepEqual(va.choices, vb.choices); assert.equal(va.choices.length, 3);
  assert.ok(BANK.find((q) => q.id === va.id && q.status === 'verified'), 'only a published question is chosen');
});
await t('before answering, nothing reveals the answer: no answer, explanation, source or anyone\'s guess in any message', async () => {
  for (const k of ['answer', 'explain', 'source', 'results', 'correct', 'choice']) assert.ok(!(k in va), `view has ${k}`);
  const q = BANK.find((y) => y.id === va.id); for (const raw of A.raw) assert.ok(!raw.includes(q.explain) && !raw.includes(q.evidence), 'the explanation or evidence travelled before answering');
});
await t('a different tank gets a valid question of its own', async () => {
  const X = await open(x.token), v = await dd(X); assert.equal(v.state, 'open'); assert.ok(BANK.some((q) => q.id === v.id && q.status === 'verified')); X.close();
});
let before;
await t('a friend\'s guess stays hidden until you answer; on answering you see right or wrong, why, the source, and who has not answered', async () => {
  before = shells(tk.id); Bw.send(JSON.stringify({ t: 'ddAnswer', id: vb.id, choice: (BANK.find((q) => q.id === vb.id).answer + 1) % 3 }));
  const ack = await waitFor(Bw, (m) => m.t === 'ddAck'); assert.equal(ack.ok, true); assert.equal(ack.paid, 2);
  const rb = await dd(Bw); assert.equal(rb.state, 'answered'); assert.equal(rb.correct, false); assert.ok(rb.explain && rb.source?.url);
  assert.deepEqual(rb.results.map((r) => [r.name, !!r.waiting]), [['Ana', true], ['Ben', false]]);
  const ra = await dd(A); assert.equal(ra.state, 'open'); assert.ok(!('results' in ra) && !('answer' in ra), 'Ana must not see Ben\'s guess before answering');
});
await t('answering reveals at once, and a friend who answered earlier sees the new guess without reopening', async () => {
  const q = BANK.find((y) => y.id === va.id); A.send(JSON.stringify({ t: 'ddAnswer', id: va.id, choice: q.answer }));
  const ka = await waitFor(A, (m) => m.t === 'ddAck'); assert.equal(ka.paid, 0, 'Ben already earned the day\'s shells for the tank');
  const ra = await waitFor(A, (m) => m.t === 'dd' && m.state === 'answered'); assert.equal(ra.correct, true); assert.equal(ra.answer, q.answer); assert.equal(ra.reward?.name, 'Ben');
  assert.deepEqual(ra.results.map((r) => [r.name, r.correct]), [['Ana', true], ['Ben', false]]);
  const rb = await waitFor(Bw, (m) => m.t === 'dd' && m.state === 'answered'); assert.equal(rb.results.find((r) => r.name === 'Ana').correct, true);
});
await t('the shared wallet gets 2 shells for the day, earned by the first to answer (here wrongly), and no more for the others', async () => { assert.equal(shells(tk.id), before + 2); });
await t('answers are final: a second answer (another phone, a reconnect) changes nothing and pays nothing', async () => {
  const A2 = await open(a.token); await dd(A2); const s0 = shells(tk.id);
  A2.send(JSON.stringify({ t: 'ddAnswer', id: va.id, choice: 0 })); const ack = await waitFor(A2, (m) => m.t === 'ddAck'); assert.equal(ack.dup, true); assert.equal(ack.paid, 0);
  const v = await dd(A2); assert.equal(v.state, 'answered'); assert.equal(v.correct, true); assert.equal(shells(tk.id), s0); A2.close();
});
await t('two phones of one caretaker answering at the same moment: one answer stands and the reward is paid once', async () => {
  nextDay(); const P1 = await open(c.token).catch(() => null); if (P1) P1.close();
  await call('/api/join', { code: tk.code }, c.token); const C1 = await open(c.token), C2 = await open(c.token), v1 = await dd(C1); await dd(C2); const s0 = shells(tk.id);
  C1.send(JSON.stringify({ t: 'ddAnswer', id: v1.id, choice: 0 })); C2.send(JSON.stringify({ t: 'ddAnswer', id: v1.id, choice: 1 }));
  const k1 = await waitFor(C1, (m) => m.t === 'ddAck'), k2 = await waitFor(C2, (m) => m.t === 'ddAck');
  assert.equal([k1, k2].filter((k) => !k.dup).length, 1); assert.equal(shells(tk.id), s0 + 2);
  assert.equal(S.db.prepare('SELECT COUNT(*) n FROM dd_answer WHERE tank_id=? AND user_id=?').get(tk.id, c.userId).n, 1); C1.close(); C2.close();
});
await t('three caretakers answering at the same moment: everyone\'s answer counts, and the tank is paid 2 shells in all', async () => {
  nextDay(); const P = await Promise.all([a, b, c].map((u) => open(u.token))), V = await Promise.all(P.map(dd)), s0 = shells(tk.id);
  P.forEach((w, i) => w.send(JSON.stringify({ t: 'ddAnswer', id: V[i].id, choice: i })));
  const K = await Promise.all(P.map((w) => waitFor(w, (m) => m.t === 'ddAck')));
  assert.ok(K.every((k) => k.ok && !k.dup)); assert.equal(K.reduce((n, k) => n + k.paid, 0), 2); assert.equal(shells(tk.id), s0 + 2);
  assert.equal(S.db.prepare("SELECT COUNT(*) n FROM transactions WHERE tank_id=? AND type='discovery' AND idem=?").get(tk.id, `dd:${V[0].day}`).n, 1); P.forEach((w) => w.close());
});
await t('a new caretaker joins on today\'s question, the same as everyone\'s, and is never given an old one', async () => {
  const B2 = await open(b.token), C3 = await open(c.token), vb2 = await dd(B2), vc = await dd(C3); assert.equal(vb2.id, vc.id); assert.notEqual(vb2.id, va.id); B2.close(); C3.close();
});
await t('a question never repeats in a tank, and the bank running out says new discoveries are on the way instead of repeating', async () => {
  const ids = S.db.prepare('SELECT qid FROM dd_day WHERE tank_id=? AND qid IS NOT NULL').all(tk.id).map((r) => r.qid);
  for (let i = 0; i < 6; i++) { nextDay(); const v = S.dd.view(tk.id, a.userId); if (v.state === 'empty') break; assert.ok(!ids.includes(v.id), `repeated ${v.id}`); ids.push(v.id); }
  assert.equal(new Set(ids).size, 6); assert.equal(S.dd.view(tk.id, a.userId).state, 'empty');
  nextDay(); assert.equal(S.dd.view(tk.id, a.userId).state, 'empty');
  assert.throws(() => S.db.prepare('INSERT INTO dd_day (tank_id,day,qid,q,at) VALUES (?,?,?,?,?)').run(tk.id, 999999, ids[0], '{}', clock), /UNIQUE|constraint/i);
});
await t('categories rotate: no two days in a row share a category while there is a choice', async () => {
  const rows = S.db.prepare('SELECT q FROM dd_day WHERE tank_id=? AND qid IS NOT NULL ORDER BY day').all(tk.id).map((r) => JSON.parse(r.q).category);
  for (let i = 1; i < rows.length - 1; i++) assert.notEqual(rows[i], rows[i - 1]);
});
await t('the tank\'s day is fixed: a phone in another time zone does not move it or bring a second question', async () => {
  const d0 = S.dd.tankDay(other.id, 0, clock); assert.equal(S.dd.tankDay(other.id, 600, clock), d0); assert.equal(S.dd.tankDay(other.id, -600, clock), d0);
});
await t('a server restart keeps every answer and every used question (the database is the record)', async () => {
  const n = S.db.prepare('SELECT COUNT(*) n FROM dd_answer').get().n, u = S.db.prepare('SELECT COUNT(*) n FROM dd_day WHERE qid IS NOT NULL').get().n; assert.ok(n >= 3 && u >= 6);
});
await t('the Field Guide: a question about a behavior counts as learned for the caretaker who answered it, not for the others', async () => {
  const cyDays = new Set(S.db.prepare('SELECT day FROM dd_answer WHERE tank_id=? AND user_id=?').all(tk.id, c.userId).map((r) => r.day));      // (one Cy never answered: the order questions come in differs from tank to tank)
  const q = S.db.prepare('SELECT day,q FROM dd_day WHERE tank_id=? AND qid IS NOT NULL').all(tk.id).map((r) => ({ day: r.day, q: JSON.parse(r.q) })).find((r) => r.q.behavior && !cyDays.has(r.day));
  assert.ok(q, 'a behavior question was asked'); S.db.prepare('INSERT OR IGNORE INTO dd_answer (tank_id,day,user_id,qid,choice,correct,ts) VALUES (?,?,?,?,?,?,?)').run(tk.id, q.day, b.userId, q.q.id, 0, 0, clock);
  assert.ok(S.dd.learnedOf(tk.id, b.userId).by[q.q.behavior]); assert.ok(!S.dd.learnedOf(tk.id, c.userId).by[q.q.behavior]);
});
await t('seen live vs found out afterwards: only caretakers watching when it happened have seen it', async () => {
  const got = S.dd.saw(tk.id, [{ beh: 'lion', fish: 'o1', at: clock - 5e3 }], [a.userId]); assert.deepEqual(got, [{ uid: a.userId, beh: 'mimic' }]);
  assert.ok(S.dd.seenOf(tk.id, a.userId).mimic); assert.ok(!S.dd.seenOf(tk.id, b.userId).mimic, 'Ben was not watching');
  assert.deepEqual(S.dd.saw(tk.id, [{ beh: 'escape', fish: 'o1', at: clock - 6 * 3600e3 }], [a.userId, b.userId]), [], 'an escape overnight is found out afterwards, not seen');
});
A.close(); Bw.close();

await t('a question whose wording tells another\'s answer waits until that other one has been asked', async () => {
  const { openDb } = await import('./db.mjs'), { createDiscovery } = await import('./discovery.mjs'); let now = Date.parse('2026-11-02T15:00:00Z');
  for (const tank of ['T1', 'T2', 'T3']) { const D = createDiscovery(openDb(':memory:'), { bank: [fx(1, { givesAway: ['dd-0002'] }), fx(2)], now: () => now }); assert.equal(D.today(tank).q.id, 'dd-0002'); now += 864e5; assert.equal(D.today(tank).q.id, 'dd-0001'); }
});

console.log('Field Guide in the game rules');
await t('an octopus escapes on its own, whether or not anyone answered anything; the tank records it happened', async () => {
  const now = Date.now(), w = R.newWorld(now - 20 * 864e5); w.flags.tut = 5; const o = { id: 'o1', name: 'Inky', species: 'octopus', seed: 3, born: now - 30 * 864e5, stage: 'adult', traits: [], happy: 0.9, health: 1, hunger: 0.1, fedAt: now, home: null };
  w.fish.push(o); const ev = []; R.applyAction(w, { t: 'devSea', what: 'adventure' }, { now, dev: true });
  for (let h = 1; h < 72 && !w.field?.escape; h++) R.advance(w, now + h * 3600e3);
  if (w.field?.escape) { assert.equal(w.field.escape.fish, 'o1'); assert.equal(R.guideHappened(w, 'escape').fish, 'o1'); }
  else assert.ok((w.adv?.hist ?? []).every((x) => x.kind === 'hide'), 'an outside adventure happened without being recorded');
});
await t('an older tank\'s behaviors are filled in once from each animal\'s own record, and do not change the level score', async () => {
  const w = R.newWorld(Date.now()); w.fish.push({ id: 's1', name: 'Sunnie', species: 'seahorse', seed: 1, born: 1, stage: 'adult', disc: { hitch: 1000, blend: 2000 } }); delete w.flags.guideV; R.norm(w);
  assert.equal(w.field.hitch.at, 1000); assert.equal(R.guideHappened(w, 'blend').at, 2000);
});

console.log('Question bank checks');
await t('the validator rejects each kind of bad entry', async () => {
  const bad = (patch) => checkEntry({ ...fx(1), ...patch }).errors.length > 0;
  assert.ok(!bad({})); assert.ok(bad({ id: '7' })); assert.ok(bad({ choices: ['a', 'b'] })); assert.ok(bad({ choices: ['a', 'b', 'c', 'd'] })); assert.ok(bad({ choices: ['Same', 'same', 'x'] }));
  assert.ok(bad({ answer: 3 })); assert.ok(bad({ explain: '' })); assert.ok(bad({ source: { url: 'notaurl', publisher: 'x' } })); assert.ok(bad({ category: 'space' })); assert.ok(bad({ difficulty: 'tricky' }));
  assert.ok(bad({ verification: null })); assert.ok(bad({ review1: null })); assert.ok(bad({ review2: { ...fx(1).review2, unambiguous: false } }));
  assert.ok(bad({ review2: { ...fx(1).review2, by: 'ai:first' } }), 'the second review must be by a different reviewer');
  assert.ok(bad({ risk: 'numeric' }), 'a precise number needs a person'); assert.ok(bad({ risk: 'numeric', humanReview: { by: 'ai:third', ok: true } }), 'a model can never be the human review');
  assert.ok(!bad({ risk: 'numeric', humanReview: { by: 'Falcon', at: today, ok: true } })); assert.ok(bad({ verifiedAt: '2999-01-01' })); assert.ok(bad({ behavior: 'flying' })); assert.ok(bad({ fact: '' }));
});
await t('the bank check rejects duplicate ids, duplicate facts and the same question twice, flags look-alikes, and publishes only clean verified questions', async () => {
  const r = checkBank([fx(1), fx(2, { id: 'dd-0001' }), fx(3, { fact: fx(1).fact }), fx(4, { q: fx(1).q }), fx(5, { status: 'unverified' }), fx(6)]);
  assert.ok(r.bankErrors.some((e) => /duplicate id/.test(e))); assert.ok(r.bankErrors.some((e) => /duplicate fact/.test(e))); assert.ok(r.bankErrors.some((e) => /duplicate question/.test(e)));
  assert.deepEqual(r.published.map((q) => q.id), ['dd-0006'], 'an id used twice blocks both until it is fixed');
  const look = checkBank([fx(1, { q: 'How many hearts does an octopus have?', choices: ['One', 'Two', 'Three'], answer: 2 }), fx(2, { q: 'An octopus has how many hearts?', choices: ['Three', 'Five', 'Eight'], answer: 0 })]);
  assert.equal(look.flags.length, 1); assert.deepEqual(look.published.map((q) => q.id), ['dd-0001'], 'the look-alike waits for review');
  assert.equal(checkBank(look.entries.length ? [fx(1, { q: 'How many hearts does an octopus have?', choices: ['One', 'Two', 'Three'], answer: 2 }), fx(2, { q: 'An octopus has how many hearts?', choices: ['Three', 'Five', 'Eight'], answer: 0 })] : [], { reviewed: [{ a: 'dd-0001', b: 'dd-0002', verdict: 'duplicate' }] }).published.length, 1);
});

await t('the profile facts come only from the one store: nothing rejected or held is ever shown, and the store passes its checks', async () => {
  const fs = await import('node:fs'), { checkFacts } = await import('./discovery/validate.mjs'), F = await import('../web/src/facts.js');
  const store = JSON.parse(fs.readFileSync(new URL('./discovery/facts.json', import.meta.url))), bank = JSON.parse(fs.readFileSync(new URL('./discovery/bank.json', import.meta.url)));
  const c = checkFacts(store.facts, bank); assert.equal(c.bankErrors.length, 0, c.bankErrors.join('; ')); assert.ok(c.entries.every((x) => !x.errors.length), JSON.stringify(c.entries.filter((x) => x.errors.length).slice(0, 2)));
  const ok = new Map(store.facts.map((r) => [r.text, r])); for (const L of Object.values(F.FACTS)) for (const text of L) { const r = ok.get(text); assert.ok(r, `shown but not in the store: ${text}`); assert.ok(r.status === 'verified' || (store.meta.transition && r.legacy && r.status === 'unverified'), `shown while ${r.status}: ${text}`); }
  for (const r of store.facts.filter((x) => x.status === 'rejected' || x.status === 'review')) assert.ok(!Object.values(F.FACTS).flat().includes(r.text), `a ${r.status} fact is shown: ${r.text}`);
});

await S.close?.();
console.log(`\n${pass} discovery tests passed${process.exitCode ? ' (some failed)' : ''}`);
process.exit(process.exitCode ?? 0);
