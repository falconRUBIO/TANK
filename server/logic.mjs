// Game rules. The server is authoritative for membership, shells, and tank condition.
import crypto from 'node:crypto';
import { tx } from './db.mjs';
import * as R from '../web/src/game/rules.js';
import { normAvatar } from '../web/src/game/avatar.js';
import { WORDS } from './words.mjs';

export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // 31 chars, no 0/O/1/I/L
export const MAX_MEMBERS = 4;
export class GameError extends Error { constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; } }

export const normalizeCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const HEX = /^#[0-9a-fA-F]{6}$/;
const cleanAvatar = (a) => normAvatar(a);
export function randomCode() { let s = ''; for (let i = 0; i < 6; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)]; return s; }

// ── identity ──
const keyHash = (k) => sha('rk:' + String(k ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
// four easy words, like coral-otter-lemon-kite (older keys were sixteen letters and numbers; they still work, since both are compared without case or dashes)
function makeKey() { return Array.from({ length: 4 }, () => WORDS[crypto.randomInt(WORDS.length)]).join('-'); }
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
// an octopus whose caretaker has gone stays in the tank and anyone left may feed it
function orphanOctopuses(db, tankId, userId) {
  const { w } = loadWorld(db, tankId); let changed = false;
  for (const f of w.fish ?? []) if (f.species === 'octopus' && f.owner === userId) { f.owner = null; changed = true; }
  if (changed) saveWorld(db, tankId, w);
}
export function leaveTank(db, user) {
  return tx(db, () => {
    const t = tankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
    db.prepare('DELETE FROM members WHERE user_id=?').run(user.id); addJournal(db, t.id, `${user.name} left the tank.`, user.id);
    orphanOctopuses(db, t.id, user.id);
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
export function createTank(db, user, name, startWorld = null, wantCode = null) {
  if (tankOf(db, user.id)) throw new GameError('ALREADY_IN_TANK', 'You already belong to a tank.', 409);
  const now = Date.now(), id = crypto.randomUUID(), tn = clean(name, 24) || 'Our Tank';
  return tx(db, () => {
    for (let i = 0; i < 40; i++) {
      const code = wantCode && i === 0 ? wantCode : randomCode();
      try { db.prepare('INSERT INTO tanks (id,name,code,created_at,sim_ts,world) VALUES (?,?,?,?,?,?)').run(id, tn, code, startWorld?.createdAt ?? now, now, JSON.stringify(startWorld ?? R.newWorld(now, crypto.randomInt(1000), { empty: true }))); } catch (e) { if (/UNIQUE/.test(String(e.message))) { if (wantCode && i === 0) throw new GameError('CODE_TAKEN', 'That tank already exists again.', 409); continue; } throw e; }
      db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,1,?,?)').run(id, user.id, now, now);
      addJournal(db, id, 'Our tank began.', user.id, now);
      return { id, code, name: tn, slot: 1 };
    }
    throw new GameError('CODE_EXHAUSTED', 'Could not allocate a code.', 503);
  });
}
// ── the developer's test aquarium ──
// Only people whose player id the server was given (DEV_USERS, a list kept in the server's environment, never in the app) can have one.
// It is an ordinary tank marked test, so it runs on exactly the same rules, sync and storage as every other; its people are in test_members,
// which leaves their real tank membership untouched, and no one can join it with the normal join (joinTank skips test tanks).
export const isDev = (user, list = process.env.DEV_USERS) => !!user?.id && String(list ?? '').split(/[\s,]+/).filter(Boolean).includes(user.id);
export function testTankOf(db, userId) {
  return db.prepare('SELECT t.* FROM test_members m JOIN tanks t ON t.id=m.tank_id WHERE m.user_id=? AND t.test=1').get(userId) ?? null;
}
// a fresh test world: grown-up enough to hold a family, with plants to hold on to, and nothing that belongs to anyone's real tank
export function testWorld(now = Date.now(), seq = 10) {
  const w = R.newWorld(now, 7, { empty: true }); Object.assign(w, { level: 8, shells: 200, hunger: 0.2, water: 1, glass: 0, seq });
  w.flags = { ...(w.flags ?? {}), tut: 5, firstFish: true };
  w.decor = [['kelp', -2.4, 1.9], ['grass', -0.7, 2.1], ['sword', 1.2, 2.0], ['fern', 2.6, 1.7], ['red', 0.3, 0.4]].map(([type, x, z], i) => ({ id: 'td' + i, type, x, z, ry: 0 }));
  return w;
}
export function openTestTank(db, user, now = Date.now()) {
  const have = testTankOf(db, user.id); if (have) return { id: have.id, code: have.code, name: have.name };
  const id = crypto.randomUUID();
  return tx(db, () => {
    for (let i = 0; i < 40; i++) {
      const code = randomCode();
      try { db.prepare('INSERT INTO tanks (id,name,code,created_at,sim_ts,world,test) VALUES (?,?,?,?,?,?,1)').run(id, 'TEST AQUARIUM', code, now, now, JSON.stringify(testWorld(now))); } catch (e) { if (/UNIQUE/.test(String(e.message))) continue; throw e; }
      db.prepare('DELETE FROM test_members WHERE user_id=?').run(user.id);
      db.prepare('INSERT INTO test_members (tank_id,user_id,joined_at) VALUES (?,?,?)').run(id, user.id, now);
      addJournal(db, id, 'A test aquarium for trying things out. Nothing here touches a real tank.', user.id, now);
      return { id, code, name: 'TEST AQUARIUM' };
    }
    throw new GameError('CODE_EXHAUSTED', 'Could not allocate a code.', 503);
  });
}
export function joinTestTank(db, user, code, now = Date.now()) {
  const t = db.prepare('SELECT id,code,name FROM tanks WHERE code=? AND test=1').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'No test aquarium has that code.', 404);
  return tx(db, () => {
    if (db.prepare('SELECT COUNT(*) n FROM test_members WHERE tank_id=? AND user_id<>?').get(t.id, user.id).n >= MAX_MEMBERS) throw new GameError('TANK_FULL', 'That test aquarium is full.', 409);
    db.prepare('DELETE FROM test_members WHERE user_id=?').run(user.id); db.prepare('INSERT INTO test_members (tank_id,user_id,joined_at) VALUES (?,?,?)').run(t.id, user.id, now);
    return { id: t.id, code: t.code, name: t.name };
  });
}
// back to a clean test aquarium: its animals, family, journal and history go; its id counter carries on, so nothing from before the reset
// (a late choice, a birth this phone already watched) can ever match anything after it
export function resetTestTank(db, user, now = Date.now()) {
  const t = testTankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You have no test aquarium.', 404);
  return tx(db, () => {
    const { w } = loadWorld(db, t.id), fresh = testWorld(now, (w.seq ?? 10) + 1000);
    for (const tb of ['journal', 'activity', 'messages', 'transactions']) db.prepare(`DELETE FROM ${tb} WHERE tank_id=?`).run(t.id);
    db.prepare('UPDATE tanks SET created_at=? WHERE id=?').run(now, t.id); saveWorld(db, t.id, fresh);
    addJournal(db, t.id, 'The test aquarium was reset.', user.id, now);
    return { id: t.id, world: fresh };
  });
}
// ── backups and deleting your data ──
// A backup is the tank's saved state as plain JSON: fish, decorations, shells and history. Nothing personal beyond the names the players chose.
export function exportTank(db, user) {
  const t = tankOf(db, user.id); if (!t) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  const { w } = loadWorld(db, t.id); const world = JSON.parse(JSON.stringify(w)); for (const f of [...(world.fish ?? []), ...(world.floaters ?? []), ...(world.memorial ?? [])]) { if ('owner' in f) f.owner = null; } world.bottles = []; world.care = {};
  const ids = new Set(members(db, t.id).map((m) => m.id)), scrub = (o) => { if (Array.isArray(o)) { o.forEach((x, i) => { if (typeof x === 'string' && ids.has(x)) o[i] = null; else scrub(x); }); } else if (o && typeof o === 'object') { for (const k of Object.keys(o)) { if (ids.has(k)) delete o[k]; else if (typeof o[k] === 'string' && ids.has(o[k])) o[k] = null; else scrub(o[k]); } } };
  scrub(world);
  const journal = db.prepare('SELECT day,text,ts FROM journal WHERE tank_id=? ORDER BY ts DESC LIMIT 300').all(t.id).reverse();
  return { app: 'our-tank', version: 1, exportedAt: Date.now(), tank: { name: t.name }, world, journal };
}
// Restoring makes a brand new tank for someone who has none, from a backup. Everything is validated and bounded, so a hand-edited file cannot break a tank.
export function importTank(db, user, data) {
  if (data?.app !== 'our-tank' || typeof data.world !== 'object' || !data.world) throw new GameError('BAD_BACKUP', 'That does not look like a tank backup.', 400);
  const w = data.world, num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d);
  if (!Array.isArray(w.fish) || w.fish.length > 60 || !Array.isArray(w.decor ?? []) || (w.decor ?? []).length > R.MAX_DECOR) throw new GameError('BAD_BACKUP', 'That backup is not valid.', 400);
  const now = Date.now(), copyTs = Number.isFinite(+w.simTs) ? +w.simTs : 0; const world = R.norm(JSON.parse(JSON.stringify(w)), now);
  world.shells = num(world.shells, 0, 1e6, 10); world.level = num(world.level, 1, 8, 1); const was = data.heal ? formerIds(data.was) : null;
  world.fish = world.fish.filter((f) => R.SPECIES_DEF[f?.species] && typeof f.id === 'string').map((f) => R.ensureFish({ ...f, owner: data.heal ? f.owner ?? null : null, name: String(f.name ?? 'Fish').slice(0, 14) }));
  if (was) remapUser(world, was, user.id);
  world.decor = (world.decor ?? []).filter((d) => R.DECOR_DEF[d?.type] && typeof d.id === 'string'); world.orders = keepOrders(w.orders, world, data.heal, user.id, now, was); world.eggs = (world.eggs ?? []).filter(() => false); world.bottles = []; world.drift = null; world.visitor = null; world.simTs = now;
  world.flags = { ...(world.flags ?? {}), firsts: { ...(data.heal ? world.flags?.firsts ?? {} : {}), [user.id]: true }, intro: world.flags?.intro ?? now };
  // a tank put back after the server lost its data keeps its old code, so the friends who still have it can walk straight back in
  const want = data.heal ? normalizeCode(data.code) : null, healCode = want && want.length === 6 && [...want].every((ch) => ALPHABET.includes(ch)) ? want : null;
  if (healCode) {
    // the code is already in use: a friend's phone put this tank back first. This phone must join that one, never start a second copy of the same tank
    const have = db.prepare('SELECT id FROM tanks WHERE code=?').get(healCode);
    if (have) { const e = new GameError('CODE_TAKEN', 'This tank is already back. Join it with the same code.', 409); if (mergeCopy(db, have.id, world, copyTs, user, now)) e.merged = have.id; throw e; }
    world.flags.healed = now; world.flags.healedFrom = copyTs;
  }
  const made = createTank(db, user, data.tank?.name, world, healCode); return { ...made, fish: world.fish.length };
}
// A second phone's copy of a tank that a friend's phone already put back: nothing only this copy knew is thrown away. Fish, decorations and orders it
// has and the tank lacks are added (unless the tank remembers that fish dying); for what both have, the copy saved later wins; shells and level never go
// down. The phone then joins the tank as usual, and its octopus and gifts are found under its old ids like any returning friend's.
function mergeCopy(db, tankId, copy, copyTs, user, now) {
  const { w } = loadWorld(db, tankId); if (!w.flags?.healed || now - w.flags.healed > 7 * 864e5) return false;
  const fresher = copyTs > (w.flags.healedFrom ?? 0), gone = new Set([...(w.memorial ?? []), ...(w.floaters ?? [])].map((f) => f?.id)); let n = 0, room = R.capacity(w.level) - w.fish.length;
  for (const f of copy.fish) { const i = w.fish.findIndex((g) => g.id === f.id); if (i >= 0) { if (fresher) { const g = w.fish[i]; w.fish[i] = { ...f, owner: g.owner ?? f.owner, ownerName: g.ownerName ?? f.ownerName, bond: g.bond ?? f.bond }; n++; } } else if (!gone.has(f.id) && room >= 1) { w.fish.push(f); room--; n++; } }      // whose a fish is, the tank already knows under the new accounts
  w.decor ??= []; for (const d of copy.decor) { const i = w.decor.findIndex((g) => g.id === d.id); if (i >= 0) { if (fresher) w.decor[i] = d; } else if (w.decor.length < R.MAX_DECOR) { w.decor.push(d); n++; } }
  w.orders ??= []; for (const o of copy.orders) if (!w.orders.some((q) => q.id === o.id) && !w.fish.some((f) => f.id === o.id)) { w.orders.push(o); n++; }
  if (copy.shells > w.shells) { w.shells = copy.shells; n++; } if (copy.level > w.level) { w.level = copy.level; n++; }
  for (const k of ['gift', 'firsts', 'daily', 'care']) if (copy.flags?.[k] && typeof copy.flags[k] === 'object') w.flags[k] = { ...copy.flags[k], ...(w.flags[k] ?? {}) };
  if (n) { R.norm(w, now); saveWorld(db, tankId, w); addJournal(db, tankId, `What ${user.name}'s phone remembered of the tank was folded in.`, user.id, now); }
  return n > 0;
}
// Everything about a player is removed. A tank with nobody left in it is removed too.
export function deleteUser(db, user) {
  return tx(db, () => {
    const t = tankOf(db, user.id); let tankGone = false;
    if (t) { db.prepare('DELETE FROM members WHERE user_id=?').run(user.id); orphanOctopuses(db, t.id, user.id); const left = db.prepare('SELECT COUNT(*) n FROM members WHERE tank_id=?').get(t.id).n; if (left === 0) { for (const tb of ['journal', 'activity', 'messages']) db.prepare(`DELETE FROM ${tb} WHERE tank_id=?`).run(t.id); db.prepare('DELETE FROM transactions WHERE tank_id=?').run(t.id); db.prepare('DELETE FROM tanks WHERE id=?').run(t.id); tankGone = true; } else addJournal(db, t.id, `${user.name} left the tank.`, user.id); }
    for (const tb of ['push_subs', 'push_log']) { try { db.prepare(`DELETE FROM ${tb} WHERE user_id=?`).run(user.id); } catch { /* table shape differs */ } }
    db.prepare('DELETE FROM test_members WHERE user_id=?').run(user.id);      // (a developer's seat in a test aquarium)
    try { db.prepare('DELETE FROM events WHERE user_id=?').run(user.id); } catch { /* none */ } try { db.prepare('DELETE FROM thanks WHERE from_user=?').run(user.id); } catch { /* none */ }
    db.prepare('DELETE FROM users WHERE id=?').run(user.id); return { ok: true, tankId: t?.id ?? null, tankGone };
  });
}
const realMembers = (db, tankId) => db.prepare('SELECT u.id,u.name,u.avatar,m.slot,m.last_seen FROM members m JOIN users u ON u.id=m.user_id WHERE m.tank_id=? ORDER BY m.slot').all(tankId).map((r) => ({ id: r.id, name: r.name, avatar: JSON.parse(r.avatar), slot: r.slot, lastSeen: r.last_seen }));
const testMembers = (db, tankId) => db.prepare('SELECT u.id,u.name,u.avatar,m.joined_at FROM test_members m JOIN users u ON u.id=m.user_id WHERE m.tank_id=? ORDER BY m.joined_at').all(tankId).slice(0, MAX_MEMBERS).map((r, i) => ({ id: r.id, name: r.name, avatar: JSON.parse(r.avatar), slot: i + 1, lastSeen: r.joined_at }));
const members = (db, tankId) => { const m = realMembers(db, tankId); return m.length ? m : testMembers(db, tankId); };
export const listMembers = members;

export function previewJoin(db, code) {
  const t = db.prepare('SELECT id,name FROM tanks WHERE code=? AND test=0').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'Check the code and try again.', 404);
  const m = members(db, t.id);
  return { name: t.name, members: m.map(({ name, avatar, slot }) => ({ name, avatar, slot })), full: m.length >= MAX_MEMBERS };
}
// A phone that lost its saved sign-in (crash, reinstall, cleared site data) can take its seat back with the tank code alone.
// Whoever holds the code could already ask for an empty seat, so this adds no new trust; the old token is retired.
export function claimSeat(db, code, slot, isOnline = () => false) {
  const t = db.prepare('SELECT id FROM tanks WHERE code=?').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'Check the code and try again.', 404);
  const m = db.prepare('SELECT user_id FROM members WHERE tank_id=? AND slot=?').get(t.id, Number(slot));
  if (!m) throw new GameError('NO_SEAT', 'That seat is empty.', 404);
  if (isOnline(t.id, m.user_id)) throw new GameError('SEAT_ACTIVE', 'That caretaker is in the tank right now. Ask them, or use a recovery key.', 409);
  const token = crypto.randomBytes(32).toString('hex'); db.prepare('UPDATE users SET token_hash=? WHERE id=?').run(sha(token), m.user_id);
  const u = db.prepare('SELECT name FROM users WHERE id=?').get(m.user_id); addJournal(db, t.id, `${u.name} signed back in.`, m.user_id);
  return { userId: m.user_id, token };
}
// When a tank is put back after the server lost its data, the people in it come back as new accounts. Everything the tank remembered about the old
// account (their own octopus, the bond fish have with them, today's gift and their first fish) is moved to the new one, so nothing is paid twice or lost.
// Fish already paid for and on their way are kept when a tank is put back (they used to be dropped, so the shells were spent and the fish never came).
// Each one is checked: a real species, room for it, and it arrives no later than a full wait from now (one that was due arrives straight away).
function keepOrders(list, world, heal, uid, now, was = []) {
  const out = []; let room = R.capacity(world.level) - world.fish.length;
  for (const o of Array.isArray(list) ? list.slice(0, 12) : []) {
    const d = R.SPECIES_DEF[o?.species]; if (!d || d.count > room) continue; room -= d.count;
    const at = Number.isFinite(+o.arrivesAt) ? +o.arrivesAt : now;
    out.push({ id: typeof o.id === 'string' ? o.id.slice(0, 24) : 'o' + now + out.length, species: o.species, name: clean(o.name, 14) || null, seed: Math.abs(Math.floor(+o.seed || now)) % 100000,
      by: clean(o.by, 16) || 'Someone', owner: heal && typeof o.owner === 'string' && !formerIds(was).includes(o.owner) ? o.owner : uid, ownerName: clean(o.ownerName, 16) || clean(o.by, 16) || 'Someone', giftFrom: o.giftFrom ? clean(o.giftFrom, 16) : null, ...(o.giftFrom ? { giftFromId: typeof o.giftFromId === 'string' ? o.giftFromId.slice(0, 64) : null, giftNote: o.giftNote ? clean(o.giftNote, 80) : null, surprise: !!o.surprise } : {}),
      at: Number.isFinite(+o.at) ? +o.at : now, arrivesAt: Math.max(now, Math.min(at, now + d.wait * 60e3)) });
  }
  return out;
}
// the ids this player had before (a phone that healed a lost tank got a new id each time); one or several
export const formerIds = (v) => (Array.isArray(v) ? v : [v]).filter((x) => typeof x === 'string' && x.length > 0 && x.length < 80).slice(0, 8);
export function remapUser(w, wasIn, now) {
  const list = formerIds(wasIn).filter((x) => x !== now); if (!w || !list.length || !now) return false; let n = 0;
  for (const was of list) n += remapOne(w, was, now) ? 1 : 0; return n > 0;
}
function remapOne(w, was, now) {
  let n = 0;
  const mv = (o) => { if (o && Object.prototype.hasOwnProperty.call(o, was)) { if (o[now] == null) o[now] = o[was]; delete o[was]; n++; } };
  mv(w.flags?.gift); mv(w.flags?.firsts); mv(w.flags?.daily); mv(w.flags?.care);
  for (const f of [...(w.fish ?? []), ...(w.floaters ?? []), ...(w.memorial ?? [])]) { if (f.owner === was) { f.owner = now; n++; } mv(f.bond); mv(f.petAt); }
  for (const o of w.orders ?? []) if (o.owner === was) { o.owner = now; n++; }
  for (const b of w.bottles ?? []) { if (b.to === was) b.to = now; if (b.from === was) b.from = now; }
  return n > 0;
}
export function joinTank(db, user, code, was = null) {
  const t = db.prepare('SELECT id,name FROM tanks WHERE code=? AND test=0').get(normalizeCode(code));
  if (!t) throw new GameError('NOT_FOUND', 'Check the code and try again.', 404);
  return tx(db, () => {
    const mine = db.prepare('SELECT tank_id,slot FROM members WHERE user_id=?').get(user.id);
    if (mine) { if (mine.tank_id === t.id) return { id: t.id, slot: mine.slot, already: true }; throw new GameError('ALREADY_IN_TANK', 'You already belong to another tank.', 409); }
    const used = new Set(db.prepare('SELECT slot FROM members WHERE tank_id=?').all(t.id).map((r) => r.slot));
    const slot = [1, 2, 3, 4].find((s) => !used.has(s));
    if (!slot) throw new GameError('FULL', 'This aquarium already has four caretakers.', 409);
    const now = Date.now();
    db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,?,?,?)').run(t.id, user.id, slot, now, now);
    const former = formerIds(was).filter((id) => !db.prepare('SELECT 1 FROM members WHERE tank_id=? AND user_id=?').get(t.id, id));      // what this player used to be called here, if the server once lost the tank
    if (former.length) { const { w } = loadWorld(db, t.id); if (w.flags?.healed && now - w.flags.healed < 7 * 864e5 && remapUser(w, former, user.id)) saveWorld(db, t.id, w); }      // a friend coming back into a tank that was put back
    addJournal(db, t.id, `${user.name} ${former.length ? 'is back in' : 'joined'} the tank.`, user.id, now);
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
// animals brought back from a backup, once each (server/returns.json): any that are not in the tank go back in, fed and well, and leave the memorial
export function applyReturns(db, list, now = Date.now()) {
  for (const r of list ?? []) {
    const t = db.prepare('SELECT id FROM tanks WHERE code=?').get(String(r.code ?? '')); if (!t) continue;
    const { w } = loadWorld(db, t.id); w.flags ||= {}; w.flags.returned ||= {}; if (w.flags.returned[r.key]) continue;
    const back = []; for (const f of r.fish ?? []) { if (w.fish.some((g) => g.id === f.id)) continue; w.fish.push({ ...f, fedAt: now, ail: 0, health: 1, happy: Math.max(0.75, f.happy ?? 0.75), dead: undefined }); back.push(f); }
    const ids = new Set(back.map((f) => f.id)); w.memorial = (w.memorial ?? []).filter((m) => !ids.has(m.id)); w.floaters = (w.floaters ?? []).filter((m) => !ids.has(m.id));
    w.flags.returned[r.key] = now; R.norm(w, now); saveWorld(db, t.id, w);
    if (back.length) addJournal(db, t.id, `${back.map((f) => f.name).join(' and ')} ${back.length === 1 ? 'is' : 'are'} back in the tank.`, null, now);
  }
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
      if (e.journal) out.push({ journal: addJournal(db, tankId, e.journal, null, now), toast: e.toast, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, surprise: e.surprise, teamGlow: e.teamGlow, noticed: e.noticed, arrival: e.arrival, wish: e.wish, visitor: e.visitor, warn: e.warn, died: e.died, milestone: e.milestone, puzzle: e.puzzle, crab: e.crab, together: e.together, theme: e.theme, wishDone: e.wishDone, perfectDay: e.perfectDay, tired: e.tired });
      else if (e.arrival || e.toast) out.push({ toast: e.toast, arrival: e.arrival, want: e.want });
      if (e.activity) out.push({ activity: addActivity(db, tankId, null, e.activity.type, e.activity.text, now) });
    }
    saveWorld(db, tankId, w); return { world: w, events: out };
  });
}
export const ACTIONS = new Set(['openGift', 'thankGift', 'octoTouch', 'octoMem', 'play', 'glassNote', 'editNote', 'moveNote', 'keepNote', 'readNote', 'peelNote', 'devSea', 'keepBaby', 'collect', 'pet', 'note', 'feed', 'water', 'glass', 'buyFish', 'nameFish', 'buyDecor', 'moveDecor', 'octoMove', 'tankPref', 'sellDecor', 'style', 'greet', 'bottle', 'openBottle', 'scoop', 'firstFish', 'observe', 'tut', 'trim', 'fishNote', 'train', 'puzzle', 'crab', 'chooseFirst', 'dailyGift', 'claimOcto', 'releaseOcto', 'sellFish', 'octoMemo', 'octoMoment', 'fishLog', 'dev']);
// Idempotent, atomic player action. Returns { ok, reason?, dup?, applied?, delta?, world, events[] } (events already persisted).
export function act(db, user, action, { idem, now = Date.now(), dev = false, analytics = null, tank = null } = {}) {
  const t0 = tank ?? tankOf(db, user.id), test = !!tank?.test;      // (tank: a developer's test aquarium, see testTankOf) if (!t0) throw new GameError('NO_TANK', 'You are not in a tank.', 404);
  if (!ACTIONS.has(action?.t)) throw new GameError('BAD_ACTION', 'Unknown action.');
  const key = clean(idem, 64); if (!key) throw new GameError('BAD_IDEM', 'Missing idempotency key.');
  return tx(db, () => {
    const { w } = loadWorld(db, t0.id), out = [];
    const ins = db.prepare('INSERT OR IGNORE INTO transactions (tank_id,user_id,type,amount,ts,idem) VALUES (?,?,?,0,?,?)').run(t0.id, user.id, action.t, now, key);
    if (ins.changes === 0) { const ev = R.advance(w, now); saveWorld(db, t0.id, w); return { ok: true, dup: true, delta: 0, world: w, events: [] }; }
    const shellsBefore = w.shells, r = R.applyAction(w, action, { name: user.name, now, dev, test, uid: user.id, members: members(db, t0.id) });
    if (!r.ok) { db.prepare('DELETE FROM transactions WHERE tank_id=? AND user_id=? AND idem=?').run(t0.id, user.id, key); saveWorld(db, t0.id, w); return { ...r, world: w, events: [] }; }
    for (const e of r.events) {
      if (e.journal) out.push({ journal: addJournal(db, t0.id, e.journal, user.id, now), toast: e.toast, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, surprise: e.surprise, teamGlow: e.teamGlow, noticed: e.noticed, found: e.found, arrival: e.arrival, wish: e.wish, died: e.died, warn: e.warn, milestone: e.milestone, puzzle: e.puzzle, crab: e.crab, together: e.together, theme: e.theme, wishDone: e.wishDone, perfectDay: e.perfectDay, tired: e.tired });
      else if (e.toast || e.arrival || e.placed) out.push({ toast: e.toast, arrival: e.arrival, placed: e.placed, levelUp: e.levelUp, grew: e.grew, discovery: e.discovery, surprise: e.surprise, teamGlow: e.teamGlow, wish: e.wish, dailyDone: e.dailyDone, want: e.want });
      if (e.activity) out.push({ activity: addActivity(db, t0.id, e.activity.noUser ? null : user.id, e.activity.type, e.activity.text, now) });
    }
    saveWorld(db, t0.id, w);
    db.prepare('UPDATE transactions SET amount=? WHERE tank_id=? AND user_id=? AND idem=?').run(r.delta ?? 0, t0.id, user.id, key);
    if (!test) analytics?.fromAction(user.id, t0.id, action, { ...r, events: r.events }, shellsBefore, w.shells, now);
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

export function snapshot(db, user, online = [], tank = null) {
  const t0 = tank ?? tankOf(db, user.id); if (!t0) return null;
  const { row, w } = loadWorld(db, t0.id);
  for (const e of R.advance(w)) { if (e.journal) addJournal(db, t0.id, e.journal, null); if (e.activity) addActivity(db, t0.id, null, e.activity.type, e.activity.text); }     // growth and discoveries that happened while nobody was looking
  saveWorld(db, t0.id, w);
  const names = Object.fromEntries(members(db, t0.id).map((m) => [m.id, m.name]));
  return {
    you: { userId: user.id, slot: t0.slot ?? members(db, t0.id).find((m) => m.id === user.id)?.slot ?? 1 }, ...(t0.test ? { test: true } : {}),
    tank: { id: row.id, name: row.name, code: row.code, ...w, day: dayOf(w) },
    members: members(db, t0.id), online,
    journal: db.prepare('SELECT id,day,text,user_id AS userId,ts FROM journal WHERE tank_id=? ORDER BY id DESC LIMIT 60').all(t0.id).reverse(),
    activity: db.prepare('SELECT id,user_id AS userId,type,text,ts FROM activity WHERE tank_id=? ORDER BY id DESC LIMIT 30').all(t0.id).reverse(),
    thanked: db.prepare('SELECT activity_id AS id FROM thanks WHERE from_user=?').all(user.id).map((r) => r.id),
    messages: db.prepare('SELECT id,user_id AS userId,text,ts FROM messages WHERE tank_id=? ORDER BY id DESC LIMIT 40').all(t0.id).reverse().map((m) => ({ ...m, name: names[m.userId] ?? '?' })),
  };
}
export const publicTank = (w) => ({ ...w, day: dayOf(w) });
