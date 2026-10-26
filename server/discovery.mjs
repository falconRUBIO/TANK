// Daily Discovery: one marine-life question a day for everyone in a tank, chosen by the server, answered privately, revealed on answering.
//
// Tables (db.mjs): dd_tank (the tank's fixed day boundary), dd_day (the question of each tank-day, a copy of it as it was asked, and a UNIQUE
// index on (tank, question) so no tank is ever asked the same question twice, by construction), dd_answer (one row per caretaker per day:
// the primary key makes answers final and a second submit harmless), dd_seen (the Field Guide behaviors each caretaker saw happen live).
// The bank is a JSON file read from disk and checked by validate.mjs; only verified questions that pass every check are ever chosen, and a new
// file is picked up without restarting the server (or updating any phone).
import fs from 'node:fs';
import { tx } from './db.mjs';
import { checkBank } from './discovery/validate.mjs';
import { GUIDE, guideOfPage } from '../web/src/game/rules.js';

export const DD_REWARD = 2;            // shells for the tank's shared wallet, once a day per TANK: the first caretaker to answer (right or wrong) earns it for everyone
export const LIVE_MS = 120e3;          // a behavior counts as seen by whoever had the tank open within this long of it happening
const DAY = 864e5;

export function createDiscovery(db, { bankPath = null, bank = null, reviewedPath = null, now: clock = () => Date.now(), log = () => {} } = {}) {
  let B = { published: [], byId: new Map(), stamp: null, checked: 0 };
  // the bank: read again when the file changes (looked at no more than once a minute); what fails a check is left out and logged
  const load = (force = false) => {
    if (bank) { if (!B.stamp) { const r = checkBank(bank, { reviewed: [] }); B = { published: r.published, byId: new Map(r.published.map((q) => [q.id, q])), stamp: 'fixed', checked: 0, report: r }; } return B; }
    if (!bankPath) return B;
    const t = clock(); if (!force && t - B.checked < 60e3) return B; B.checked = t;
    let st; try { st = fs.statSync(bankPath); } catch { return B; }
    const stamp = `${st.mtimeMs}:${st.size}`; if (stamp === B.stamp && !force) return B;
    try {
      const list = JSON.parse(fs.readFileSync(bankPath, 'utf8')), reviewed = reviewedPath && fs.existsSync(reviewedPath) ? JSON.parse(fs.readFileSync(reviewedPath, 'utf8')) : [];
      const r = checkBank(list, { reviewed }); B = { published: r.published, byId: new Map(r.published.map((q) => [q.id, q])), stamp, checked: t, report: r };
      log(`discovery bank: ${list.length} questions, ${r.published.length} published`);
    } catch (e) { log(`discovery bank not loaded: ${e.message}`); B.stamp = stamp; }
    return B;
  };

  // the tank's calendar day, from a zone fixed the first time the tank is asked anything: a phone in another zone, or a clock change, cannot move it
  const tankDay = (tankId, tzGuess, t) => {
    let row = db.prepare('SELECT tz_min FROM dd_tank WHERE tank_id=?').get(tankId);
    if (!row) { const tz = Math.max(-840, Math.min(840, Math.round(+tzGuess) || 0)); db.prepare('INSERT OR IGNORE INTO dd_tank (tank_id,tz_min,since) VALUES (?,?,?)').run(tankId, tz, t); row = db.prepare('SELECT tz_min FROM dd_tank WHERE tank_id=?').get(tankId); }
    return Math.floor((t + row.tz_min * 60e3) / DAY);
  };

  // choosing a question: never one this tank has had; a different category from the last few days and a change of difficulty, and not the
  // same animal as recently; among the equally good, an order of its own for each tank (so tanks are not all on the same question)
  const choose = (tankId, day) => {
    const B = load(), P = B.published; if (!P.length) return null;
    const used = new Set(db.prepare('SELECT qid FROM dd_day WHERE tank_id=? AND qid IS NOT NULL').all(tankId).map((r) => r.qid));
    const recent = db.prepare('SELECT q FROM dd_day WHERE tank_id=? AND qid IS NOT NULL ORDER BY day DESC LIMIT 10').all(tankId).map((r) => JSON.parse(r.q));
    const subj = (q) => String(q.fact).split('.').slice(0, 2).join('.'), h = (s) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; return x; };
    let best = null, bestScore = Infinity;
    for (const q of P) { if (used.has(q.id)) continue;
      let sc = 0; for (const g of q.givesAway ?? []) if (!used.has(g) && B.byId.has(g)) sc += 8;      // (its wording tells another question's answer: ask that one first)
      recent.forEach((r, i) => { if (i < 3 && r.category === q.category) sc += 10 - i * 3; if (i < 2 && r.difficulty === q.difficulty) sc += 2; if (subj(r) === subj(q)) sc += 6; if (i < 4 && q.behavior && r.behavior === q.behavior) sc += 4; });
      sc += (h(`${tankId}:${day}:${q.id}`) % 1000) / 1000;
      if (sc < bestScore) { best = q; bestScore = sc; } }
    return best;
  };

  // today's question for a tank, chosen once (under the write lock, so two phones opening at the same moment get the same one)
  const today = (tankId, { tz = 0 } = {}) => tx(db, () => {
    const t = clock(), day = tankDay(tankId, tz, t);
    let row = db.prepare('SELECT day,qid,q FROM dd_day WHERE tank_id=? AND day=?').get(tankId, day);
    if (row?.qid) return { day, q: JSON.parse(row.q) };
    const q = choose(tankId, day); if (!q) return { day, q: null };
    const copy = { id: q.id, fact: q.fact, q: q.q, choices: q.choices, answer: q.answer, explain: q.explain, category: q.category, difficulty: q.difficulty, behavior: q.behavior ?? null, source: q.source, verifiedAt: q.verifiedAt };
    if (row) db.prepare('UPDATE dd_day SET qid=?,q=?,at=? WHERE tank_id=? AND day=? AND qid IS NULL').run(q.id, JSON.stringify(copy), t, tankId, day);
    else db.prepare('INSERT INTO dd_day (tank_id,day,qid,q,at) VALUES (?,?,?,?,?)').run(tankId, day, q.id, JSON.stringify(copy), t);
    return { day, q: copy };
  });

  const names = (tankId) => db.prepare('SELECT u.id,u.name,u.avatar FROM members m JOIN users u ON u.id=m.user_id WHERE m.tank_id=? ORDER BY m.slot').all(tankId);

  // what one caretaker may see. Before they answer: the question and its three choices, nothing else (not the answer, not anyone's guess).
  // After: the answer, why, the source, and every caretaker's guess, with "has not answered" for the rest.
  const view = (tankId, userId, opts = {}) => {
    const { day, q } = today(tankId, opts);
    const learned = learnedOf(tankId, userId), seen = seenOf(tankId, userId);
    if (!q) return { t: 'dd', day, state: 'empty', learned, seen };
    const mine = db.prepare('SELECT choice,correct,ts FROM dd_answer WHERE tank_id=? AND day=? AND user_id=?').get(tankId, day, userId);
    const base = { t: 'dd', day, id: q.id, q: q.q, choices: q.choices, category: q.category, difficulty: q.difficulty, learned, seen };
    if (!mine) return { ...base, state: 'open' };
    const A = new Map(db.prepare('SELECT user_id,choice,correct FROM dd_answer WHERE tank_id=? AND day=?').all(tankId, day).map((r) => [r.user_id, r])), paidBy = db.prepare('SELECT paid_by FROM dd_day WHERE tank_id=? AND day=?').get(tankId, day)?.paid_by ?? null;
    return { ...base, state: 'answered', reward: paidBy ? { by: paidBy, name: names(tankId).find((m) => m.id === paidBy)?.name ?? null, shells: DD_REWARD } : null, choice: mine.choice, correct: !!mine.correct, answer: q.answer, explain: q.explain, source: q.source, behavior: q.behavior,
      results: names(tankId).map((m) => ({ id: m.id, name: m.name, ...(A.has(m.id) ? { choice: A.get(m.id).choice, correct: !!A.get(m.id).correct } : { waiting: true }) })) };
  };

  // an answer: final, once. The day's one reward goes into the shared wallet in the same transaction as the first answer: dd_day.paid_by is set
  // only while it is empty, so however many caretakers, phones or retries, the tank is paid 2 shells for the day and no more.
  const answer = (tankId, userId, { id, choice } = {}, { pay } = {}) => tx(db, () => {
    const t = clock(), day = tankDay(tankId, 0, t), row = db.prepare('SELECT qid,q FROM dd_day WHERE tank_id=? AND day=?').get(tankId, day);
    if (!row?.qid) return { ok: false, reason: 'NO_QUESTION' };
    if (String(id ?? '') !== row.qid) return { ok: false, reason: 'DAY_OVER' };      // the phone still shows yesterday's question
    const c = Number(choice); if (!Number.isInteger(c) || c < 0 || c > 2) return { ok: false, reason: 'BAD_CHOICE' };
    const q = JSON.parse(row.q), right = c === q.answer;
    const ins = db.prepare('INSERT OR IGNORE INTO dd_answer (tank_id,day,user_id,qid,choice,correct,ts) VALUES (?,?,?,?,?,?,?)').run(tankId, day, userId, row.qid, c, right ? 1 : 0, t);
    if (!ins.changes) return { ok: true, dup: true, paid: 0 };      // answered already (another phone, a reconnect): the first answer stands
    const paid = db.prepare('UPDATE dd_day SET paid_by=?, paid_at=? WHERE tank_id=? AND day=? AND paid_by IS NULL').run(userId, t, tankId, day).changes ? DD_REWARD : 0;
    if (paid) db.prepare("INSERT OR IGNORE INTO transactions (tank_id,user_id,type,amount,ts,idem) VALUES (?,?,'discovery',?,?,?)").run(tankId, userId, DD_REWARD, t, `dd:${day}`);      // (the ledger line, as for every other shell)
    if (paid && pay) pay(paid);
    return { ok: true, dup: false, paid, correct: right };
  });

  // the Field Guide, per caretaker: the behaviors they have learned about (from questions they answered) and seen happen in front of them
  const learnedOf = (tankId, userId) => { const out = {}; let n = 0;
    for (const r of db.prepare('SELECT a.ts,d.q FROM dd_answer a JOIN dd_day d ON d.tank_id=a.tank_id AND d.day=a.day WHERE a.tank_id=? AND a.user_id=? ORDER BY a.ts').all(tankId, userId)) { n++; const q = JSON.parse(r.q); if (q.behavior && GUIDE[q.behavior] && !out[q.behavior]) out[q.behavior] = { at: r.ts, id: q.id, q: q.q, fact: q.choices[q.answer], explain: q.explain, source: q.source }; }
    return { n, by: out }; };
  const seenOf = (tankId, userId) => Object.fromEntries(db.prepare('SELECT beh,ts,fish,page FROM dd_seen WHERE tank_id=? AND user_id=?').all(tankId, userId).map((r) => [r.beh, { at: r.ts, fish: r.fish, page: r.page }]));
  // events from the game (witness: { beh: page, fish, at }) with the caretakers whose tank was open and in front of them right then
  const saw = (tankId, events, watching) => { const t = clock(), got = [];
    for (const e of events ?? []) { if (!e?.beh) continue; const k = guideOfPage(e.beh), at = Number(e.at) || t; if (!k || t - at > LIVE_MS || at - t > 5e3) continue;
      for (const uid of watching) if (db.prepare('INSERT OR IGNORE INTO dd_seen (tank_id,user_id,beh,ts,fish,page) VALUES (?,?,?,?,?,?)').run(tankId, uid, k, at, e.fish ?? null, e.beh).changes) got.push({ uid, beh: k }); }
    return got; };

  return { load, today, view, answer, saw, learnedOf, seenOf, tankDay, bank: () => load() };
}
