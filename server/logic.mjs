// Game rules. The server is authoritative for membership, shells, and tank condition.
import crypto from 'node:crypto';
import { tx } from './db.mjs';
import * as R from '../web/src/game/rules.js';

export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // 31 chars, no 0/O/1/I/L
export const MAX_MEMBERS = 3;
const HR = 1 / (5 * 3600), WR = 1 / (48 * 3600), GR = 1 / (30 * 3600);   // per second
export class GameError extends Error { constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; } }

export const normalizeCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanAvatar(a) {
  const o = a && typeof a === 'object' ? a : {};
  return { skin: HEX.test(o.skin) ? o.skin : '#b06a42', hair: HEX.test(o.hair) ? o.hair : '#222222', hat: HEX.test(o.hat) ? o.hat : null };
}
export function randomCode() { let s = ''; for (let i = 0; i < 6; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)]; return s; }

// ── identity ──
const fmtKey = (k) => k.match(/.{4}/g).join('-');
const keyHash = (k) => sha('rk:' + String(k ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
function makeKey() { let s = ''; for (let i = 0; i < 16; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)]; return fmtKey(s); }
export function createUser(db, { name, avatar }) {
  const n = clean(name, 16); if (n.length < 1) throw new GameError('BAD_NAME', 'Please choose a name.');
  const token = crypto.randomBytes(32).toString('hex'), id = crypto.randomUUID();
  const recoveryKey = makeKey();
  db.prepare('INSERT INTO users (id,name,avatar,token_hash,created_at,recovery_hash) VALUES (?,?,?,?,?,?)').run(id, n, JSON.stringify(cleanAvatar(avatar)), sha(token), Date.now(), keyHash(recoveryKey));
  return { userId: id, token, recoveryKey };
}
// A new recovery key replaces the old one (used when an older account never had one, or the key was lost).
export function newRecoveryKey(db, user) { const k = makeKey(); db.prepare('UPDATE users SET recovery_hash=? WHERE id=?').run(keyHash(k), user.id); return k; }
// Signing in with a recovery key issues a fresh token and retires the old one, so a lost phone can be locked out.
export function recover(db, key) {
  const u = db.prepare('SELECT id FROM users WHERE recovery_hash=?').get(keyHash(key));
  if (!u) throw new GameError('BAD_KEY', 'That recovery key was not recognised.', 404);
  const token = crypto.randomBytes(32).toString('hex'); db.prepare('UPDATE users SET token_hash=? WHERE id=?').run(sha(token), u.id);
  return { userId: u.id, token };
}
export function leaveTank(db, user) {
  return tx(db, () => {
    const t = tankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
    db.prepare('DELETE FROM members WHERE user_id=?').run(user.id); addJournal(db, t.id, `${user.name} left the tank.`, user.id);
    return { ok: true, tankId: t.id };
  });
}
export function authUser(db, token) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const u = db.prepare('SELECT id,name,avatar FROM users WHERE token_hash=?').get(sha(token));
  return u ? { id: u.id, name: u.name, avatar: JSON.parse(u.avatar) } : null;
}
export function updateProfile(db, user, { name, avatar }) {
  const n = clean(name, 16); if (n.length < 1) throw new GameError('BAD_NAME', 'Please choose a name.');
  db.prepare('UPDATE users SET name=?, avatar=? WHERE id=?').run(n, JSON.stringify(cleanAvatar(avatar)), user.id);
  return { id: user.id, name: n, avatar: cleanAvatar(avatar) };
}
export function tankOf(db, userId) {
  return db.prepare('SELECT t.* , m.slot FROM members m JOIN tanks t ON t.id=m.tank_id WHERE m.user_id=?').get(userId) ?? null;
}

// ── tanks & invitations ──
export function createTank(db, user, name) {
  if (tankOf(db, user.id)) throw new GameError('ALREADY_IN_TANK', 'You already belong to a tank.', 409);
  const now = Date.now(), id = crypto.randomUUID(), tn = clean(name, 24) || 'Our Tank';
  return tx(db, () => {
    for (let i = 0; i < 40; i++) {
      const code = randomCode();
      try { db.prepare('INSERT INTO tanks (id,name,code,created_at,sim_ts,world) VALUES (?,?,?,?,?,?)').run(id, tn, code, now, now, JSON.stringify((() => { const w = R.newWorld(now, crypto.randomInt(1000)); w.fish[0].owner = user.id; w.fish[0].ownerName = user.name; w.flags.firsts = { [user.id]: true }; return w; })())); } catch (e) { if (/UNIQUE/.test(String(e.message))) continue; throw e; }
      db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,1,?,?)').run(id, user.id, now, now);
      addJournal(db, id, 'Our tank began.', user.id, now);
      return { id, code, name: tn, slot: 1 };
    }
    throw new GameError('CODE_EXHAUSTED', 'Could not allocate a code.', 503);
  });
}
const members = (db, tankId) => db.prepare('SELECT u.id,u.name,u.avatar,m.slot,m.last_seen FROM members m JOIN users u ON u.id=m.user_id WHERE m.tank_id=? ORDER BY m.slot').all(tankId).map((r) => ({ id: r.id, name: r.name, avatar: JSON.parse(r.avatar), slot: r.slot, lastSeen: r.last_seen }));
export const listMembers = members;

export function previewJoin(db, code) {
  const t = db.prepare('SELECT id,name FROM tanks WHERE code=?').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'Check the code and try again.', 404);
  const m = members(db, t.id);
  return { name: t.name, members: m.map(({ name, avatar, slot }) => ({ name, avatar, slot })), full: m.length >= MAX_MEMBERS };
}
export function joinTank(db, user, code) {
  const t = db.prepare('SELECT id,name FROM tanks WHERE code=?').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'Check the code and try again.', 404);
  return tx(db, () => {
    const mine = db.prepare('SELECT tank_id,slot FROM members WHERE user_id=?').get(user.id);
    if (mine) { if (mine.tank_id === t.id) return { id: t.id, slot: mine.slot, already: true }; throw new GameError('ALREADY_IN_TANK', 'You already belong to another tank.', 409); }
    const used = new Set(db.prepare('SELECT slot FROM members WHERE tank_id=?').all(t.id).map((r) => r.slot));
    const slot = [1, 2, 3].find((s) => !used.has(s));
    if (!slot) throw new GameError('FULL', 'This aquarium already has three caretakers.', 409);
    const now = Date.now();
    db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,?,?,?)').run(t.id, user.id, slot, now, now);
    addJournal(db, t.id, `${user.name} joined the tank.`, user.id, now);
    return { id: t.id, slot, already: false };
  });
}
export function regenerateCode(db, user) {
  const t = tankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  return tx(db, () => {
    for (let i = 0; i < 40; i++) { const code = randomCode(); try { db.prepare('UPDATE tanks SET code=? WHERE id=?').run(code, t.id); return code; } catch (e) { if (!/UNIQUE/.test(String(e.message))) throw e; } }
    throw new GameError('CODE_EXHAUSTED', 'Could not allocate a code.', 503);
  });
}

// ── tank state. The whole game state is one JSON document (rules.js), saved with a few mirrored columns ──
export function loadWorld(db, tankId) {
  const row = db.prepare('SELECT * FROM tanks WHERE id=?').get(tankId);
  let w = row.world ? JSON.parse(row.world) : null;
  if (!w) { w = R.newWorld(row.created_at); Object.assign(w, { shells: row.shells, hunger: row.hunger, water: row.water, glass: row.glass, level: row.level, simTs: row.sim_ts }); }
  return { row, w };
}
export function saveWorld(db, tankId, w) {
  db.prepare('UPDATE tanks SET world=?, shells=?, hunger=?, water=?, glass=?, level=?, sim_ts=? WHERE id=?').run(JSON.stringify(w), w.shells, w.hunger, w.water, w.glass, w.level, w.simTs, tankId);
}
export const dayOf = (w, now = Date.now()) => Math.floor((now - w.createdAt) / 864e5) + 1;
export function addJournal(db, tankId, text, userId = null, now = Date.now()) {
  const t = db.prepare('SELECT created_at FROM tanks WHERE id=?').get(tankId);
  const day = Math.floor((now - (t?.created_at ?? now)) / 864e5) + 1;
  const r = db.prepare('INSERT INTO journal (tank_id,day,text,user_id,ts) VALUES (?,?,?,?,?)').run(tankId, day, text, userId, now);
  return { id: Number(r.lastInsertRowid), day, text, userId, ts: now };
}
export function addActivity(db, tankId, userId, type, text, now = Date.now()) {
  const r = db.prepare('INSERT INTO activity (tank_id,user_id,type,text,ts) VALUES (?,?,?,?,?)').run(tankId, userId, type, text, now);
  return { id: Number(r.lastInsertRowid), userId, type, text, ts: now };
}
// Time passing for a tank nobody is acting on. Returns the events worth announcing (already saved to the journal).
export function tickTank(db, tankId, now = Date.now()) {
  return tx(db, () => {
    const { w } = loadWorld(db, tankId), out = [];
    for (const e of R.advance(w, now)) {
      if (e.journal) out.push({ journal: addJournal(db, tankId, e.journal, null, now), toast: e.toast, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, noticed: e.noticed, arrival: e.arrival, wish: e.wish, visitor: e.visitor, warn: e.warn, died: e.died });
      else if (e.arrival || e.toast) out.push({ toast: e.toast, arrival: e.arrival });
      if (e.activity) out.push({ activity: addActivity(db, tankId, null, e.activity.type, e.activity.text, now) });
    }
    saveWorld(db, tankId, w); return { world: w, events: out };
  });
}
export const ACTIONS = new Set(['collect', 'pet', 'note', 'feed', 'water', 'glass', 'buyFish', 'nameFish', 'buyDecor', 'moveDecor', 'sellDecor', 'style', 'greet', 'bottle', 'openBottle', 'scoop', 'firstFish', 'observe', 'tut', 'dev']);
// Idempotent, atomic player action. Returns { ok, reason?, dup?, applied?, delta?, world, events[] } (events already persisted).
export function act(db, user, action, { idem, now = Date.now(), dev = false, analytics = null } = {}) {
  const t0 = tankOf(db, user.id); if (!t0) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  if (!ACTIONS.has(action?.t)) throw new GameError('BAD_ACTION', 'Unknown action.');
  const key = clean(idem, 64); if (!key) throw new GameError('BAD_IDEM', 'Missing idempotency key.');
  return tx(db, () => {
    const { w } = loadWorld(db, t0.id), out = [];
    const ins = db.prepare('INSERT OR IGNORE INTO transactions (tank_id,user_id,type,amount,ts,idem) VALUES (?,?,?,0,?,?)').run(t0.id, user.id, action.t, now, key);
    if (ins.changes === 0) { const ev = R.advance(w, now); saveWorld(db, t0.id, w); return { ok: true, dup: true, delta: 0, world: w, events: [] }; }
    const shellsBefore = w.shells, r = R.applyAction(w, action, { name: user.name, now, dev, uid: user.id, members: members(db, t0.id) });
    if (!r.ok) { db.prepare('DELETE FROM transactions WHERE tank_id=? AND user_id=? AND idem=?').run(t0.id, user.id, key); saveWorld(db, t0.id, w); return { ...r, world: w, events: [] }; }
    for (const e of r.events) {
      if (e.journal) out.push({ journal: addJournal(db, t0.id, e.journal, user.id, now), toast: e.toast, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, noticed: e.noticed, found: e.found, arrival: e.arrival, wish: e.wish, died: e.died, warn: e.warn });
      else if (e.toast || e.arrival || e.placed) out.push({ toast: e.toast, arrival: e.arrival, placed: e.placed, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, wish: e.wish, dailyDone: e.dailyDone });
      if (e.activity) out.push({ activity: addActivity(db, t0.id, e.activity.noUser ? null : user.id, e.activity.type, e.activity.text, now) });
    }
    saveWorld(db, t0.id, w);
    db.prepare('UPDATE transactions SET amount=? WHERE tank_id=? AND user_id=? AND idem=?').run(r.delta ?? 0, t0.id, user.id, key);
    analytics?.fromAction(user.id, t0.id, action, { ...r, events: r.events }, shellsBefore, w.shells, now);
    return { ...r, world: w, events: out };
  });
}
export function addMessage(db, user, text, now = Date.now()) {
  const t = tankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  const body = clean(text, 140); if (!body) throw new GameError('EMPTY', 'Empty message.');
  const r = db.prepare('INSERT INTO messages (tank_id,user_id,text,ts) VALUES (?,?,?,?)').run(t.id, user.id, body, now);
  return { tankId: t.id, msg: { id: Number(r.lastInsertRowid), userId: user.id, name: user.name, text: body, ts: now } };
}
export function touch(db, userId, now = Date.now()) { db.prepare('UPDATE members SET last_seen=? WHERE user_id=?').run(now, userId); }

export function snapshot(db, user, online = []) {
  const t0 = tankOf(db, user.id); if (!t0) return null;
  const { row, w } = loadWorld(db, t0.id);
  for (const e of R.advance(w)) { if (e.journal) addJournal(db, t0.id, e.journal, null); if (e.activity) addActivity(db, t0.id, null, e.activity.type, e.activity.text); }     // growth and discoveries that happened while nobody was looking
  saveWorld(db, t0.id, w);
  const names = Object.fromEntries(members(db, t0.id).map((m) => [m.id, m.name]));
  return {
    you: { userId: user.id, slot: t0.slot },
    tank: { id: row.id, name: row.name, code: row.code, ...w, day: dayOf(w) },
    members: members(db, t0.id), online,
    journal: db.prepare('SELECT id,day,text,user_id AS userId,ts FROM journal WHERE tank_id=? ORDER BY id DESC LIMIT 60').all(t0.id).reverse(),
    activity: db.prepare('SELECT id,user_id AS userId,type,text,ts FROM activity WHERE tank_id=? ORDER BY id DESC LIMIT 30').all(t0.id).reverse(),
    thanked: db.prepare('SELECT activity_id AS id FROM thanks WHERE from_user=?').all(user.id).map((r) => r.id),
    messages: db.prepare('SELECT id,user_id AS userId,text,ts FROM messages WHERE tank_id=? ORDER BY id DESC LIMIT 40').all(t0.id).reverse().map((m) => ({ ...m, name: names[m.userId] ?? '?' })),
  };
}
export const publicTank = (w) => ({ ...w, day: dayOf(w) });
