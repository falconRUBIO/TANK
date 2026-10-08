// Game rules. The server is authoritative for membership, shells, and tank condition.
import crypto from 'node:crypto';
import { tx } from './db.mjs';

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
export function createUser(db, { name, avatar }) {
  const n = clean(name, 16); if (n.length < 1) throw new GameError('BAD_NAME', 'Please choose a name.');
  const token = crypto.randomBytes(32).toString('hex'), id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id,name,avatar,token_hash,created_at) VALUES (?,?,?,?,?)').run(id, n, JSON.stringify(cleanAvatar(avatar)), sha(token), Date.now());
  return { userId: id, token };
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
      try { db.prepare('INSERT INTO tanks (id,name,code,created_at,sim_ts) VALUES (?,?,?,?,?)').run(id, tn, code, now, now); } catch (e) { if (/UNIQUE/.test(String(e.message))) continue; throw e; }
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

// ── simulation (lazy: advanced whenever anyone touches the tank; bounded so absence never punishes) ──
export function advance(db, tankId, now = Date.now()) {
  const t = db.prepare('SELECT * FROM tanks WHERE id=?').get(tankId);
  const dt = Math.max(0, (now - t.sim_ts) / 1000);
  if (dt < 1) return t;
  let h = t.hunger + dt * HR; if (h > 0.85) h = Math.max(t.hunger, 0.85);
  let w = t.water - dt * WR; if (w < 0.45) w = Math.min(t.water, 0.45);
  let g = t.glass + dt * GR; if (g > 0.8) g = Math.max(t.glass, 0.8);
  db.prepare('UPDATE tanks SET hunger=?,water=?,glass=?,sim_ts=? WHERE id=?').run(h, w, g, now, tankId);
  return { ...t, hunger: h, water: w, glass: g, sim_ts: now };
}
export const dayOf = (t, now = Date.now()) => Math.floor((now - t.created_at) / 864e5) + 1;
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

// Idempotent, atomic action. Returns { ok, dup?, fed?, delta, tank, events[] }.
export function act(db, user, type, { idem, now = Date.now() } = {}) {
  const t0 = tankOf(db, user.id); if (!t0) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  const key = clean(idem, 64); if (!key) throw new GameError('BAD_IDEM', 'Missing idempotency key.');
  return tx(db, () => {
    const events = [];
    const ins = db.prepare('INSERT OR IGNORE INTO transactions (tank_id,user_id,type,amount,ts,idem) VALUES (?,?,?,0,?,?)').run(t0.id, user.id, type, now, key);
    if (ins.changes === 0) return { ok: true, dup: true, delta: 0, tank: advance(db, t0.id, now), events };
    let t = advance(db, t0.id, now), delta = 0, fed = true;
    if (type === 'feed') {
      if (t.hunger < 0.08) fed = false;
      else {
        delta = t.hunger > 0.25 ? 1 : 0;
        t = { ...t, hunger: Math.max(0, t.hunger - 0.3), water: Math.max(0.3, t.water - 0.015), shells: t.shells + delta };
        const recent = db.prepare("SELECT 1 FROM activity WHERE tank_id=? AND type='feed' AND ts>?").get(t.id, now - 6 * 3600 * 1000);
        if (!recent) events.push({ journal: addJournal(db, t.id, `${user.name} fed the fish.`, user.id, now) });
        events.push({ activity: addActivity(db, t.id, user.id, 'feed', `${user.name} fed the fish.`, now) });
      }
    } else if (type === 'water') {
      if (t.water >= 0.7) fed = false;
      else { delta = 2; t = { ...t, water: 1, shells: t.shells + 2 }; events.push({ journal: addJournal(db, t.id, `${user.name} changed the water.`, user.id, now) }, { activity: addActivity(db, t.id, user.id, 'water', `${user.name} changed the water.`, now) }); }
    } else if (type === 'glass') {
      if (t.glass <= 0.12) fed = false;
      else { delta = 1; t = { ...t, glass: 0, shells: t.shells + 1 }; events.push({ activity: addActivity(db, t.id, user.id, 'glass', `${user.name} cleaned the glass.`, now) }); }
    } else throw new GameError('BAD_ACTION', 'Unknown action.');
    db.prepare('UPDATE tanks SET hunger=?,water=?,glass=?,shells=? WHERE id=?').run(t.hunger, t.water, t.glass, t.shells, t.id);
    db.prepare('UPDATE transactions SET amount=? WHERE tank_id=? AND user_id=? AND idem=?').run(delta, t.id, user.id, key);
    return { ok: true, fed, delta, tank: t, events };
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
  const t = advance(db, t0.id);
  const names = Object.fromEntries(members(db, t.id).map((m) => [m.id, m.name]));
  return {
    you: { userId: user.id, slot: t0.slot },
    tank: { id: t.id, name: t.name, code: t.code, level: t.level, shells: t.shells, hunger: t.hunger, water: t.water, glass: t.glass, day: dayOf(t), createdAt: t.created_at },
    members: members(db, t.id), online,
    journal: db.prepare('SELECT id,day,text,user_id AS userId,ts FROM journal WHERE tank_id=? ORDER BY id DESC LIMIT 40').all(t.id).reverse(),
    activity: db.prepare('SELECT id,user_id AS userId,type,text,ts FROM activity WHERE tank_id=? ORDER BY id DESC LIMIT 20').all(t.id).reverse(),
    messages: db.prepare('SELECT id,user_id AS userId,text,ts FROM messages WHERE tank_id=? ORDER BY id DESC LIMIT 40').all(t.id).reverse().map((m) => ({ ...m, name: names[m.userId] ?? '?' })),
  };
}
export const publicTank = (t) => ({ shells: t.shells, hunger: t.hunger, water: t.water, glass: t.glass, level: t.level });
