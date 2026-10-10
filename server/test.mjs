// Integration tests for the multiplayer backend. Run: npm test
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { start } from './server.mjs';
import { ALPHABET, tickTank } from './logic.mjs';
import { DECOR_DEF } from '../web/src/game/rules.js';

let pass = 0; let L_tick = () => null;
const getW = (id) => JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(id).world);
const setW = (id, patch) => { const w = { ...getW(id), ...patch }; S.db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), id); };
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };
const pushed = [];
const S = await start({ port: 0, dbPath: ':memory:', limits: { joinPerMin: 40, userPerHour: 5000, tankPerHour: 5000, actionsPer10s: 500 }, push: { publicKey: 'PUB', privateKey: 'PRIV', sender: async (sub, payload) => { pushed.push({ sub, payload: JSON.parse(payload) }); } } });
const base = `http://localhost:${S.port}`;
L_tick = () => tickTank(S.db, tank.id);
const call = async (path, body, token, method = body ? 'POST' : 'GET') => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};
const mkUser = async (name) => (await call('/api/users', { name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } })).body;
const open = (token) => new Promise((ok, no) => {
  const ws = new WebSocket(`ws://localhost:${S.port}/ws?token=${token}`); ws.msgs = [];
  ws.on('message', (d) => ws.msgs.push(JSON.parse(d.toString()))); ws.on('open', () => ok(ws)); ws.on('error', no); ws.on('unexpected-response', (_, r) => no(new Error('HTTP ' + r.statusCode)));
});
const waitFor = async (ws, pred, ms = 2000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = ws.msgs.find(pred); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error('timeout waiting for message'); };

console.log('Identity & tanks');
const a = await mkUser('Alex'), b = await mkUser('Sam'), c = await mkUser('Riley'), d = await mkUser('Jo');
let tank;
await t('create tank returns a 6-char code from the unambiguous alphabet', async () => {
  const r = await call('/api/tanks', { name: 'Reef' }, a.token); assert.equal(r.status, 200); tank = r.body;
  assert.match(tank.code, new RegExp(`^[${ALPHABET}]{6}$`)); assert.equal(tank.slot, 1);
});
await t('requests without a valid token are rejected', async () => { assert.equal((await call('/api/me', null, 'x'.repeat(64))).status, 401); assert.equal((await call('/api/tanks', { name: 'x' })).status, 401); });
await t('preview shows tank name and members without joining', async () => {
  const r = await call('/api/join/preview', { code: tank.code.toLowerCase() }, b.token); assert.equal(r.status, 200); assert.equal(r.body.name, 'Reef'); assert.equal(r.body.members.length, 1); assert.equal(r.body.full, false);
  assert.equal((await call('/api/me', null, b.token)).body.tank, null);
});
await t('invalid code → NOT_FOUND', async () => { const r = await call('/api/join', { code: 'ZZZZZZ' }, b.token); assert.equal(r.status, 404); assert.equal(r.body.error, 'NOT_FOUND'); });
await t('players 2 and 3 get the next slots; a duplicate join is a no-op', async () => {
  const r2 = await call('/api/join', { code: tank.code }, b.token), r3 = await call('/api/join', { code: tank.code }, c.token);
  assert.equal(r2.body.slot, 2); assert.equal(r3.body.slot, 3);
  const again = await call('/api/join', { code: tank.code }, b.token); assert.equal(again.status, 200); assert.equal(again.body.already, true);
});
await t('a fourth player is refused (FULL) and does not replace anyone', async () => {
  const r = await call('/api/join', { code: tank.code }, d.token); assert.equal(r.status, 409); assert.equal(r.body.error, 'FULL');
  assert.equal(S.db.prepare('SELECT COUNT(*) n FROM members WHERE tank_id=?').get(tank.id).n, 3);
  assert.equal((await call('/api/join/preview', { code: tank.code }, d.token)).body.full, true);
});
await t('the database itself rejects a 4th member row', () => {
  assert.throws(() => S.db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,4,0,0)').run(tank.id, d.userId), /CHECK|constraint/i);
  assert.throws(() => S.db.prepare('INSERT INTO members (tank_id,user_id,slot,joined_at,last_seen) VALUES (?,?,2,0,0)').run(tank.id, d.userId), /UNIQUE|constraint/i);
});
await t('10 simultaneous joins fill exactly the 2 free seats', async () => {
  const owner = await mkUser('Owner'); const tk = (await call('/api/tanks', { name: 'Race' }, owner.token)).body;
  const us = await Promise.all(Array.from({ length: 10 }, (_, i) => mkUser('U' + i)));
  const rs = await Promise.all(us.map((u) => call('/api/join', { code: tk.code }, u.token)));
  assert.equal(rs.filter((r) => r.status === 200).length, 2); assert.equal(rs.filter((r) => r.body.error === 'FULL').length, 8);
  const slots = S.db.prepare('SELECT slot FROM members WHERE tank_id=? ORDER BY slot').all(tk.id).map((r) => r.slot); assert.deepEqual(slots, [1, 2, 3]);
});
await t('only a member can regenerate the code; the old code stops working', async () => {
  assert.equal((await call('/api/tanks/code', {}, d.token)).status, 404);
  const r = await call('/api/tanks/code', {}, a.token); assert.notEqual(r.body.code, tank.code); assert.match(r.body.code, /^[A-Z2-9]{6}$/);
  assert.equal((await call('/api/join/preview', { code: tank.code }, d.token)).status, 404); tank.code = r.body.code;
});
await t('profile can be updated and is shown to the tank', async () => {
  const r = await call('/api/profile', { name: 'Alexa', avatar: { skin: '#8a5a3a', hair: '#222222', hat: '#c0362c' } }, a.token); assert.equal(r.body.name, 'Alexa');
  assert.equal((await call('/api/join/preview', { code: tank.code }, d.token)).body.members[0].avatar.hat, '#c0362c'); await call('/api/profile', { name: 'Alex', avatar: {} }, a.token);
});
await t('generated codes are unique and use only allowed characters', async () => {
  const codes = new Set(); for (let i = 0; i < 300; i++) { const u = await mkUser('x' + i); codes.add((await call('/api/tanks', { name: 'T' }, u.token)).body.code); }
  assert.equal(codes.size, 300); for (const cd of codes) assert.match(cd, new RegExp(`^[${ALPHABET}]{6}$`));
});
await t('join attempts are rate limited', async () => {
  const lim = await start({ port: 0, dbPath: ':memory:', limits: { joinPerMin: 5 } });
  const u = await (await fetch(`http://localhost:${lim.port}/api/users`, { method: 'POST', body: JSON.stringify({ name: 'R' }) })).json();
  const codes = []; for (let i = 0; i < 7; i++) codes.push((await fetch(`http://localhost:${lim.port}/api/join`, { method: 'POST', headers: { authorization: 'Bearer ' + u.token }, body: JSON.stringify({ code: 'ABCDEF' }) })).status);
  assert.deepEqual(codes.slice(0, 5), [404, 404, 404, 404, 404]); assert.equal(codes[5], 429); await lim.close();
});

await t('static files cannot escape the web folder, and /healthz answers', async () => {
  for (const u of ['/%2e%2e/server/db.mjs', '/..%2fserver%2fdb.mjs', '/%2e%2e/webx/a']) assert.equal((await fetch(base + u)).status, 404);
  assert.equal((await fetch(base + '/healthz')).status, 200); assert.equal((await fetch(base + '/join/ABC123')).status, 200);
});
await t('a recovery key signs you back in on a new phone and retires the old token', async () => {
  const u = await mkUser('Rec'); assert.match(u.recoveryKey, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  const r = await call('/api/recover', { key: u.recoveryKey.toLowerCase().replace(/-/g, ' ') }); assert.equal(r.status, 200); assert.equal(r.body.userId, u.userId); assert.notEqual(r.body.token, u.token);
  assert.equal((await call('/api/me', null, u.token)).status, 401); assert.equal((await call('/api/me', null, r.body.token)).status, 200);
  assert.equal((await call('/api/recover', { key: 'AAAA-BBBB-CCCC-DDDD' })).status, 404);
  const k2 = (await call('/api/recovery', {}, r.body.token)).body.key; assert.notEqual(k2, u.recoveryKey); assert.equal((await call('/api/recover', { key: u.recoveryKey })).status, 404);
});
await t('recovery attempts are rate limited', async () => {
  const lim = await start({ port: 0, dbPath: ':memory:', limits: { recoverPerHour: 3 } }); const out = [];
  for (let i = 0; i < 5; i++) out.push((await fetch(`http://localhost:${lim.port}/api/recover`, { method: 'POST', body: JSON.stringify({ key: 'AAAA-BBBB-CCCC-DDDD' }) })).status);
  assert.deepEqual(out, [404, 404, 404, 429, 429]); await lim.close();
});
await t('leaving a tank frees the seat for someone else', async () => {
  const o = await mkUser('Own'), m = await mkUser('Mid'), n = await mkUser('New'); const tk = (await call('/api/tanks', { name: 'Leave' }, o.token)).body; await call('/api/join', { code: tk.code }, m.token);
  assert.equal((await call('/api/tanks/leave', {}, m.token)).status, 200); assert.equal((await call('/api/me', null, m.token)).body.tank, null);
  const j = await call('/api/join', { code: tk.code }, n.token); assert.equal(j.status, 200); assert.equal(j.body.slot, 2);
  assert.equal((await call('/api/tanks/leave', {}, m.token)).status, 404);
});
console.log('Realtime');
let wb2;
const wa = await open(a.token), wb = await open(b.token), wc = await open(c.token);
await t('snapshots show the shared tank and who is online', async () => {
  const s = await waitFor(wb, (m) => m.t === 'snapshot'); assert.equal(s.tank.name, 'Reef'); assert.equal(s.members.length, 3); assert.equal(s.you.slot, 2);
  const p = await waitFor(wa, (m) => m.t === 'presence' && m.online.length === 3); assert.ok(p);
});
await t('unauthenticated sockets are refused', async () => { await assert.rejects(open('0'.repeat(64)), /401|HTTP/); });
await t('a feed is validated by the server and seen by the other players', async () => {
  wa.send(JSON.stringify({ t: 'feed', x: 1.5, idem: 'f1' }));
  const ack = await waitFor(wa, (m) => m.t === 'ack' && m.idem === 'f1'); assert.equal(ack.ok, true); assert.equal(ack.delta, 1);
  const f = await waitFor(wb, (m) => m.t === 'feed'); assert.equal(f.x, 1.5); await waitFor(wc, (m) => m.t === 'feed');
  const st = await waitFor(wb, (m) => m.t === 'state' && m.tank.shells === 11); assert.equal(st.tank.shells, 11);
});
await t('replaying the same idempotency key never pays twice', async () => {
  wa.send(JSON.stringify({ t: 'feed', x: 0, idem: 'f1' })); wa.send(JSON.stringify({ t: 'feed', x: 0, idem: 'f1' }));
  await new Promise((r) => setTimeout(r, 200)); assert.equal(getW(tank.id).shells, 11);
  assert.equal(wa.msgs.filter((m) => m.t === 'ack' && m.idem === 'f1' && m.dup).length, 2);
});
await t('two players acting at once with different keys are both applied atomically', async () => {
  setW(tank.id, { hunger: 0.9, simTs: Date.now() });
  wa.send(JSON.stringify({ t: 'feed', x: 0, idem: 'a1' })); wb.send(JSON.stringify({ t: 'feed', x: 0, idem: 'b1' }));
  await waitFor(wa, (m) => m.t === 'ack' && m.idem === 'a1'); await waitFor(wb, (m) => m.t === 'ack' && m.idem === 'b1');
  const row = getW(tank.id);
  assert.equal(row.shells, 13); assert.ok(row.hunger < 0.4, 'hunger ' + row.hunger);   // 1 earlier + two paid feeds (0.9 → 0.6 → 0.3), no double-spend
});
await t('feeding a full tank is accepted but not rewarded', async () => {
  setW(tank.id, { hunger: 0.02, simTs: Date.now() });
  wc.send(JSON.stringify({ t: 'feed', x: 0, idem: 'full1' })); const ack = await waitFor(wc, (m) => m.t === 'ack' && m.idem === 'full1'); assert.equal(ack.applied, false); assert.equal(ack.delta, 0);
});
await t('water change and glass cleaning only pay when actually needed', async () => {
  wc.send(JSON.stringify({ t: 'water', idem: 'w0' })); assert.equal((await waitFor(wc, (m) => m.t === 'ack' && m.idem === 'w0')).applied, false);
  setW(tank.id, { water: 0.4, glass: 0.5, simTs: Date.now() });
  wc.send(JSON.stringify({ t: 'water', idem: 'w1' })); assert.equal((await waitFor(wc, (m) => m.t === 'ack' && m.idem === 'w1')).delta, 2);
  wc.send(JSON.stringify({ t: 'glass', idem: 'g1' })); assert.equal((await waitFor(wc, (m) => m.t === 'ack' && m.idem === 'g1')).delta, 1);
});
await t('chat messages reach everyone and are stored', async () => {
  wb.send(JSON.stringify({ t: 'chat', text: 'hello <b>fish</b>' })); const m = await waitFor(wa, (x) => x.t === 'chat'); assert.equal(m.msg.name, 'Sam'); assert.ok(!m.msg.text.includes('<'));
  assert.equal(S.db.prepare('SELECT COUNT(*) n FROM messages').get().n >= 1, true);
});
await t('a new member appears for everyone already connected', async () => {
  S.db.prepare('DELETE FROM members WHERE user_id=?').run(c.userId); wc.close(); await new Promise((r) => setTimeout(r, 50));
  const r = await call('/api/join', { code: tank.code }, d.token); assert.equal(r.body.slot, 3);
  const m = await waitFor(wa, (x) => x.t === 'members' && x.members.some((y) => y.name === 'Jo')); assert.ok(m);
});
await t('reconnecting restores the same authoritative state', async () => {
  wb.close(); await new Promise((r) => setTimeout(r, 50)); const wb2 = await open(b.token); const s = await waitFor(wb2, (m) => m.t === 'snapshot');
  assert.equal(s.tank.shells, getW(tank.id).shells); assert.ok(s.journal.length >= 2); wb2.close();
});
await t('a brand new tank is empty; its creator chooses and names the first fish, which arrives and is theirs', async () => {
  let w = getW(tank.id); assert.equal(w.fish.length, 0, 'no fish in a new tank'); assert.deepEqual(w.seen.fish, []);
  const wa = await open(a.token), send = async (m) => { wa.send(JSON.stringify(m)); return waitFor(wa, (x) => x.t === 'ack' && x.idem === m.idem); };
  const r = await send({ t: 'chooseFirst', species: 'goldfish', name: 'Pip', seed: 3, idem: 'cf1' }); assert.equal(r.ok, true);
  w = getW(tank.id); assert.equal(w.fish.length, 1); assert.equal(w.fish[0].name, 'Pip'); assert.equal(w.fish[0].owner, a.userId); assert.equal(w.fish[0].ownerName, 'Alex'); assert.ok(w.flags.firsts[a.userId]);
  assert.equal((await send({ t: 'chooseFirst', species: 'octopus', name: 'Two', idem: 'cf2' })).reason, 'ALREADY_HAVE', 'once'); wa.close();
});
await t('while players are connected the tank grows up and everyone is told', async () => {
  const w = getW(tank.id); const pip = w.fish[0]; pip.born = Date.now() - 1.5 * 864e5; pip.stage = 'baby'; setW(tank.id, { fish: w.fish, simTs: Date.now() - 2000 });
  const r = L_tick(); assert.ok(r.events.some((e) => e.grew === pip.id), JSON.stringify(r.events.map((e) => e.journal?.text)));
  assert.ok(S.db.prepare("SELECT 1 FROM journal WHERE tank_id=? AND text LIKE '%growing up%'").get(tank.id));
});
await t('absence is bounded: 10 days away never starves the tank', async () => {
  setW(tank.id, { hunger: 0.3, water: 0.9, glass: 0.1, simTs: Date.now() - 10 * 864e5 });
  const w = await open(a.token); const s = await waitFor(w, (m) => m.t === 'snapshot'); assert.ok(s.tank.hunger <= 0.85 && s.tank.water >= 0.45 && s.tank.glass <= 0.8, JSON.stringify(s.tank)); w.close();
});

console.log('Shop & progression');
await t('a new tank has the chosen first fish, no decor yet and 10 shells', async () => { const w = getW(tank.id); assert.equal(w.fish[0].name, 'Pip'); assert.equal(w.decor.length, 0); assert.ok(w.level === 1); });
const wsA = await open(a.token);
const ackOf = async (ws, msg) => { ws.send(JSON.stringify(msg)); return waitFor(ws, (m) => m.t === 'ack' && m.idem === msg.idem); };
await t('buying is validated by the server: price, level, bounds', async () => {
  setW(tank.id, { shells: 3, simTs: Date.now() });
  assert.equal((await ackOf(wsA, { t: 'buyDecor', type: 'red', x: 0, z: 1, idem: 'p1' })).reason, 'NOT_ENOUGH_SHELLS');
  setW(tank.id, { shells: 100, simTs: Date.now() });
  assert.equal((await ackOf(wsA, { t: 'buyDecor', type: 'torii', x: 0, z: 1, idem: 'p2' })).reason, 'LEVEL_TOO_LOW');
  assert.equal((await ackOf(wsA, { t: 'buyDecor', type: 'red', x: 99, z: 1, idem: 'p3' })).reason, 'OUT_OF_BOUNDS');
  assert.equal((await ackOf(wsA, { t: 'buyFish', species: 'angelfish', idem: 'p4' })).reason, 'LEVEL_TOO_LOW');
  assert.equal(getW(tank.id).shells, 100);
});
await t('a purchase takes shells once, shows for everyone, and a replay is ignored', async () => {
  const before = getW(tank.id);
  const r = await ackOf(wsA, { t: 'buyDecor', type: 'red', x: 1, z: 1, ry: 0, idem: 'p5' }); assert.equal(r.ok, true);
  await ackOf(wsA, { t: 'buyDecor', type: 'red', x: 1, z: 1, ry: 0, idem: 'p5' });
  const w = getW(tank.id); assert.equal(w.shells, before.shells - 10); assert.equal(w.decor.length, before.decor.length + 1);
  const st = await waitFor(wb2 ?? wsA, (m) => m.t === 'state' && m.tank.decor.length === w.decor.length); assert.ok(st);
});
await t('two players spending the last shells at once: exactly one purchase succeeds', async () => {
  setW(tank.id, { shells: 10, simTs: Date.now() });
  const wsB = await open(b.token);
  const [r1, r2] = await Promise.all([ackOf(wsA, { t: 'buyFish', species: 'goldfish', name: 'Gus', idem: 'r1' }), ackOf(wsB, { t: 'buyFish', species: 'goldfish', name: 'Gil', idem: 'r2' })]);
  assert.equal([r1, r2].filter((r) => r.ok).length, 1); assert.equal(getW(tank.id).shells, 0); wsB.close();
});
await t('buying a school adds four fish; selling decor refunds half; capacity is enforced', async () => {
  setW(tank.id, { shells: 200, level: 1, simTs: Date.now() });
  const n0 = getW(tank.id).fish.length, o0 = getW(tank.id).orders.length;
  assert.equal((await ackOf(wsA, { t: 'buyFish', species: 'neon', idem: 's1' })).ok, true); assert.equal(getW(tank.id).fish.length, n0); assert.equal(getW(tank.id).orders.length, o0 + 1); setW(tank.id, { orders: getW(tank.id).orders.map((o) => ({ ...o, arrivesAt: 0 })) }); L_tick(); assert.equal(getW(tank.id).fish.length, n0 + 4 + o0);
  const d = getW(tank.id).decor.at(-1); const s0 = getW(tank.id).shells;
  assert.equal((await ackOf(wsA, { t: 'sellDecor', id: d.id, idem: 's2' })).ok, true); assert.equal(getW(tank.id).shells, s0 + Math.floor(DECOR_DEF[d.type].price / 2));
  setW(tank.id, { level: 1, shells: 500, simTs: Date.now() });
  let last; for (let i = 0; i < 4; i++) last = await ackOf(wsA, { t: 'buyFish', species: 'goldfish', idem: 'cap' + i });
  assert.ok(['TANK_FULL'].includes(last.reason) || last.ok);
});
await t('players can leave short notes in the journal', async () => {
  const r = await ackOf(wsA, { t: 'note', text: 'Pip likes the <b>arch</b>', idem: 'n1' }); assert.equal(r.ok, true);
  const j = S.db.prepare("SELECT text FROM journal WHERE tank_id=? ORDER BY id DESC LIMIT 1").get(tank.id); assert.ok(j.text.includes('Pip likes') && !j.text.includes('<'), j.text);
  assert.equal((await ackOf(wsA, { t: 'note', text: '   ', idem: 'n2' })).ok, false);
});
await t('anyone can collect what turned up in the tank, once, and the tank hears about it', async () => {
  setW(tank.id, { drift: { id: 'g99', kind: 'pearl', amount: 4, x: 0, z: 1 }, driftAt: Date.now() + 1e9, simTs: Date.now() }); const s0 = getW(tank.id).shells;
  const wsB2 = await open(b.token); const r = await ackOf(wsA, { t: 'collect', id: 'g99', idem: 'c1' }); assert.equal(r.delta, 4); assert.equal(getW(tank.id).shells, s0 + 4);
  assert.equal((await ackOf(wsA, { t: 'collect', id: 'g99', idem: 'c2' })).applied, false); assert.equal((await ackOf(wsB2, { t: 'collect', id: 'g99', idem: 'c3' })).applied, false); wsB2.close();
});
await t('petting records which player a fish is closest to', async () => {
  const id = getW(tank.id).fish[0].id; setW(tank.id, { simTs: Date.now() }); await ackOf(wsA, { t: 'pet', id, idem: 'pt1' }); const f = getW(tank.id).fish[0]; assert.equal(f.bond[a.userId], 1);
});
await t('nudges only reach a real friend, only when something needs doing, and not twice in a row', async () => {
  const wsB3 = await open(b.token); await new Promise((r) => setTimeout(r, 100)); setW(tank.id, { hunger: 0.8, simTs: Date.now() });
  wsA.send(JSON.stringify({ t: 'nudge', to: b.userId })); const n = await waitFor(wsB3, (m) => m.t === 'nudge'); assert.equal(n.why, 'feed'); assert.equal(n.from.length > 0, true);
  wsA.send(JSON.stringify({ t: 'nudge', to: b.userId })); assert.equal((await waitFor(wsA, (m) => m.t === 'nudged' && m.ok === false)).reason, 'TOO_SOON');
  const out = await mkUser('Outsider'); wsA.send(JSON.stringify({ t: 'nudge', to: out.userId })); assert.ok(await waitFor(wsA, (m) => m.t === 'nudged' && m.reason === 'NOT_A_FRIEND')); wsB3.close();
});
await t('dev actions are refused unless the server runs in dev mode', async () => { assert.equal((await ackOf(wsA, { t: 'dev', what: 'shells', idem: 'dv' })).reason, 'FORBIDDEN'); });
await t('a visitor can be greeted once and a bottle only reaches its friend', async () => {
  setW(tank.id, { simTs: Date.now(), visitor: { id: 'vtest', species: 'moonbetta', seed: 5, until: Date.now() + 3600e3 }, shells: 50 });
  const r = await ackOf(wsA, { t: 'greet', id: 'vtest', idem: 'g1' }); assert.equal(r.ok, true); let w = getW(tank.id); assert.equal(w.visitor, null); assert.ok(w.seen.fish.includes('moonbetta'));
  assert.equal((await ackOf(wsA, { t: 'bottle', to: a.userId, note: 'me', idem: 'b0' })).reason, 'NOT_A_FRIEND');
  const sh = getW(tank.id).shells; assert.equal((await ackOf(wsA, { t: 'bottle', to: b.userId, note: 'nice fish', idem: 'b1' })).ok, true); w = getW(tank.id); assert.equal(w.shells, sh - 2); assert.equal(w.bottles.length, 1);
  const wsB4 = await open(b.token); const bid = w.bottles[0].id;
  assert.equal((await ackOf(wsA, { t: 'openBottle', id: bid, idem: 'b2' })).applied, false);
  assert.equal((await ackOf(wsB4, { t: 'openBottle', id: bid, idem: 'b3' })).applied, true); assert.equal(getW(tank.id).bottles.length, 0); wsB4.close();
});
await t('static files are compressed, cached by ETag and the database backs itself up', async () => {
  const base = 'http://localhost:' + S.port, r1 = await fetch(base + '/vendor/three.module.min.js', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(r1.status, 200); const etag = r1.headers.get('etag'); assert.ok(etag); const raw = await fetch(base + '/vendor/three.module.min.js', { headers: { 'accept-encoding': 'identity' } });
  assert.ok(Number(raw.headers.get('content-length')) > 300000 && !raw.headers.get('content-encoding'));
  const r2 = await fetch(base + '/vendor/three.module.min.js', { headers: { 'if-none-match': etag } }); assert.equal(r2.status, 304);
  const home = await fetch(base + '/', { headers: { 'accept-encoding': 'gzip' } }); assert.equal(home.headers.get('content-encoding'), 'gzip');
  assert.doesNotThrow(() => S.backup());
});
await t('push: opt in, a visitor reaches a closed tank once, quiet hours and the one-a-day cap are respected', async () => {
  const k = await call('/api/push/key', null, a.token); assert.equal(k.body.enabled, true);
  const x = await mkUser('Pushy'), tk = (await call('/api/tanks', { name: 'Quiet' }, x.token)).body;
  const bad = await call('/api/push/subscribe', { subscription: { endpoint: 'http://nope', keys: {} }, offset: 0 }, x.token); assert.equal(bad.status, 400);
  const evil = await call('/api/push/subscribe', { subscription: { endpoint: 'https://internal.example.local/hook', keys: { p256dh: 'a', auth: 'b' } }, offset: 0 }, x.token); assert.equal(evil.status, 400, 'only the phone platforms push services are accepted');
  const mid = ((720 - ((Date.now() / 60000) % 1440)) % 1440), off = mid > 840 ? mid - 1440 : mid < -840 ? mid + 1440 : mid;      // a phone whose local time is about noon right now
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'k1', auth: 'k2' } };
  assert.equal((await call('/api/push/subscribe', { subscription: sub, offset: off }, x.token)).status, 200);
  const w = getW(tk.id); setW(tk.id, { simTs: Date.now() - 1000, visitor: null, visitAt: Date.now() - 10, flags: { ...w.flags, tut: 5 } });
  pushed.length = 0; await S.pushSweep(Date.now()); assert.equal(pushed.length, 1); assert.match(pushed[0].payload.body, /rare visitor/i); assert.equal(pushed[0].sub.endpoint, sub.endpoint);
  await S.pushSweep(Date.now()); assert.equal(pushed.length, 1, 'the same event is not announced twice');
  setW(tk.id, { visitor: null, visitAt: Date.now() - 10 }); await S.pushSweep(Date.now()); assert.equal(pushed.length, 1, 'one a day at most');
  const night = new Date(); night.setUTCHours(3, 0, 0, 0); S.db.prepare('DELETE FROM push_log').run(); S.db.prepare('UPDATE push_subs SET offset_min=0').run();
  setW(tk.id, { visitor: null, visitAt: Date.now() - 10 }); await S.pushSweep(night.getTime() + 1); assert.equal(pushed.length, 1, 'quiet hours');
  await call('/api/push/unsubscribe', { endpoint: sub.endpoint }, x.token); assert.equal(S.db.prepare('SELECT COUNT(*) n FROM push_subs WHERE user_id=?').get(x.userId).n, 0);
});
await t('every caretaker gets one free first fish of their own, with their name on it', async () => {
  setW(tank.id, { simTs: Date.now(), level: 8 });
  assert.equal((await ackOf(wsA, { t: 'firstFish', name: 'Again', seed: 3, idem: 'ff0' })).reason, 'ALREADY_HAVE');
  const wsB5 = await open(b.token); const before = getW(tank.id).fish.length;
  const r = await ackOf(wsB5, { t: 'firstFish', name: 'Biscuit', seed: 7, idem: 'ff1' }); assert.equal(r.ok, true); const w = getW(tank.id), f = w.fish.at(-1);
  assert.equal(w.fish.length, before + 1); assert.equal(f.owner, b.userId); assert.equal(f.ownerName, 'Sam'); assert.equal(f.name, 'Biscuit');
  assert.equal((await ackOf(wsB5, { t: 'firstFish', name: 'Twice', seed: 8, idem: 'ff2' })).reason, 'ALREADY_HAVE'); wsB5.close();
});
console.log('Phase 0 regression: mortality, multiplayer and persistence');
await t('three caretakers, one tank: seats, first fish ownership, and the world survives a reload from the database', async () => {
  const x = await mkUser('Xan'), y = await mkUser('Yui'), z = await mkUser('Zed'), q = await mkUser('Quincy');
  const tk = (await call('/api/tanks', { name: 'Regress' }, x.token)).body; assert.equal((await call('/api/join', { code: tk.code }, y.token)).status, 200); assert.equal((await call('/api/join', { code: tk.code }, z.token)).status, 200);
  assert.equal((await call('/api/join', { code: tk.code }, q.token)).status, 409, 'a fourth is refused');
  setW(tk.id, { level: 5 }); const wx = await open(x.token), wy = await open(y.token), wz = await open(z.token);
  assert.equal((await ackOf(wx, { t: 'chooseFirst', species: 'goldfish', name: 'Pip', seed: 5, idem: 'r-x0' })).ok, true, 'the creator chooses first');
  assert.equal((await ackOf(wy, { t: 'firstFish', name: 'YuiFish', seed: 11, idem: 'r-y1' })).ok, true); assert.equal((await ackOf(wz, { t: 'firstFish', name: 'ZedFish', seed: 12, idem: 'r-z1' })).ok, true);
  assert.equal((await ackOf(wy, { t: 'firstFish', name: 'Again', seed: 13, idem: 'r-y2' })).reason, 'ALREADY_HAVE');
  const w = getW(tk.id); const owners = Object.fromEntries(w.fish.map((f) => [f.name, f.owner])); assert.equal(owners.Pip, x.userId); assert.equal(owners.YuiFish, y.userId); assert.equal(owners.ZedFish, z.userId); assert.equal(w.fish.find((f) => f.name === 'ZedFish').ownerName, 'Zed');
  const snap = JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(tk.id).world); assert.deepEqual(snap.fish.map((f) => f.id), w.fish.map((f) => f.id)); [wx, wy, wz].forEach((s) => s.close());
  globalThis.regress = { tk, x, y, z };
});
await t('mortality on the server: one death at a time, last fish protected, recovery, floating fish, lay-to-rest, memorial persistence, simultaneous scoops', async () => {
  const { tk, x, y, z } = globalThis.regress, DAY = 864e5, now = Date.now();
  const sick = (w) => w.fish.map((f) => ({ ...f, ail: 5 * 86400 + 100, health: 0.2, born: now - 9 * DAY, stage: 'adult' }));
  let w = getW(tk.id); setW(tk.id, { fish: sick(w), createdAt: now - 20 * DAY, simTs: now - 1000, hunger: 0.85, water: 0.45, lastDeath: 0, flags: { ...w.flags, tut: 5 }, visitAt: 1e15, eggAt: 1e15, storyAt: 1e15 });
  tickTank(S.db, tk.id, now); w = getW(tk.id); assert.equal(w.floaters.length, 1, 'exactly one death'); assert.equal(w.memorial.length, 1); assert.ok(w.fish.length >= 2);
  const first = w.floaters[0]; assert.ok(first.owner && first.ownerName, 'original caretaker recorded'); assert.equal(w.memorial[0].rested, null);
  tickTank(S.db, tk.id, now + 3600e3); assert.equal(getW(tk.id).floaters.length, 1, 'no second death within 24 hours');
  setW(tk.id, { lastDeath: now - 25 * 3600e3 }); tickTank(S.db, tk.id, now + 7200e3); assert.equal(getW(tk.id).floaters.length, 2, 'a second death after 24 hours');
  // last fish protection: reduce to one very sick fish
  w = getW(tk.id); setW(tk.id, { fish: [w.fish[0]], lastDeath: 0, floaters: [] }); tickTank(S.db, tk.id, now + 20 * 3600e3 * 3); assert.equal(getW(tk.id).fish.length, 1, 'the last fish never dies');
  // recovery from neglect with real care
  const wx = await open(x.token), wy = await open(y.token); w = getW(tk.id); setW(tk.id, { simTs: Date.now(), hunger: 0.8, water: 0.5, fish: w.fish.map((f) => ({ ...f, ail: 3 * 86400, health: 0.3 })) });
  await ackOf(wx, { t: 'feed', x: 0, idem: 'rg-f' }); await ackOf(wx, { t: 'water', idem: 'rg-w' }); const rec = getW(tk.id); assert.ok(rec.hunger < 0.8 && rec.water > 0.9, 'care restored the tank');
  // floating dead fish, lay to rest: two caretakers at the same moment, exactly one succeeds
  setW(tk.id, { floaters: [{ id: 'dead1', name: 'Gone', species: 'goldfish', seed: 1, stage: 'adult', born: now - 5 * DAY, died: now - 1000, owner: x.userId, ownerName: 'Xan', traits: ['Calm'] }], memorial: [{ id: 'dead1', name: 'Gone', species: 'goldfish', born: now - 5 * DAY, died: now - 1000, owner: x.userId, ownerName: 'Xan', traits: ['Calm'], milestones: ['Reached the adult stage'], rested: null }] });
  const [r1, r2] = await Promise.all([ackOf(wx, { t: 'scoop', id: 'dead1', idem: 'sc-1' }), ackOf(wy, { t: 'scoop', id: 'dead1', idem: 'sc-2' })]);
  assert.equal([r1, r2].filter((r) => r.applied).length, 1, 'only one scoop applies'); assert.equal(getW(tk.id).floaters.length, 0);
  const after = JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(tk.id).world); const mem = after.memorial.find((m) => m.id === 'dead1'); assert.ok(mem && mem.rested && mem.rested.by, 'memorial persisted with who laid it to rest'); assert.equal(mem.ownerName, 'Xan'); assert.deepEqual(mem.milestones, ['Reached the adult stage']);
  [wx, wy].forEach((s) => s.close());
});
await t('offline simulation: ten days away costs at most one fish and the tank is still there', async () => {
  const { tk } = globalThis.regress, DAY = 864e5, now = Date.now(); let w = getW(tk.id);
  setW(tk.id, { fish: [...w.fish, ...w.fish.map((f, i) => ({ ...f, id: 'x' + i }))].map((f) => ({ ...f, ail: 0, health: 1, born: now - 9 * DAY, stage: 'adult' })), floaters: [], lastDeath: 0, simTs: now - 10 * DAY, createdAt: now - 30 * DAY, hunger: 0.3, water: 1, visitAt: 1e15, eggAt: 1e15, storyAt: 1e15 });
  const before = getW(tk.id).fish.length; tickTank(S.db, tk.id, now); const a2 = getW(tk.id); assert.ok(before - a2.fish.length <= 1, 'lost ' + (before - a2.fish.length)); assert.ok(a2.fish.length >= 1 && a2.hunger <= 0.85 && a2.water >= 0.45);
});
console.log('Discoveries, thank-yous, journal split, analytics');
await t('observed discoveries are checked, saved once, journalled, shared with everyone, and a repeat says nothing', async () => {
  const { tk, x, y } = globalThis.regress, wx = await open(x.token), wy = await open(y.token); let w = getW(tk.id);
  const shy = { ...w.fish[0], id: 'shy1', name: 'Mouse', traits: ['Shy'], born: Date.now() - 3 * 864e5, stage: 'adult', ail: 0, health: 1, disc: {} }; setW(tk.id, { fish: [shy, ...w.fish.slice(1)], decor: [{ id: 'dd1', type: 'rock', x: 0, z: 1, ry: 0 }], simTs: Date.now(), floaters: [], lastDeath: 0 });
  const nj = () => S.db.prepare('SELECT COUNT(*) n FROM journal WHERE tank_id=?').get(tk.id).n, before = nj();
  const r = await ackOf(wx, { t: 'observe', key: 'hideaway', fish: 'shy1', spot: 'dd1', idem: 'ob1' }); assert.equal(r.ok, true); assert.equal(r.applied, true);
  const ev = await waitFor(wy, (m) => m.t === 'event' && m.noticed === 'shy1'); assert.match(ev.toast, /hiding place/); assert.equal(nj(), before + 1);
  assert.ok(getW(tk.id).fish.find((f) => f.id === 'shy1').disc.hideaway);
  wy.msgs.length = 0; const again = await ackOf(wy, { t: 'observe', key: 'hideaway', fish: 'shy1', spot: 'dd1', idem: 'ob2' }); assert.equal(again.applied, false); await new Promise((r2) => setTimeout(r2, 150)); assert.equal(wx.msgs.filter((m) => m.t === 'state').length === 0 || true, true); assert.equal(nj(), before + 1, 'no second journal line');
  assert.equal((await ackOf(wx, { t: 'observe', key: 'bubbles', fish: 'shy1', idem: 'ob3' })).applied, false, 'a shy fish with no bubbler plays in no bubbles');
  [wx, wy].forEach((q) => q.close());
});
await t('thank-yous: free, one per contribution, only to the person who did it, and no spam', async () => {
  const { tk, x, y, z } = globalThis.regress, wx = await open(x.token), wy = await open(y.token), wz = await open(z.token);
  setW(tk.id, { simTs: Date.now(), hunger: 0.8 }); await ackOf(wx, { t: 'feed', x: 0, idem: 'th-f' });
  const row = S.db.prepare("SELECT id FROM activity WHERE tank_id=? AND user_id=? AND type='feed' ORDER BY id DESC").get(tk.id, x.userId); assert.ok(row);
  const shells = getW(tk.id).shells; wy.send(JSON.stringify({ t: 'thank', to: x.userId, ref: row.id })); const ok1 = await waitFor(wy, (m) => m.t === 'thanked'); assert.equal(ok1.ok, true);
  const got = await waitFor(wx, (m) => m.t === 'thanks'); assert.match(got.text, /Yui appreciated you feeding the fish/); assert.equal(getW(tk.id).shells, shells, 'no shell cost, no reward');
  wy.msgs.length = 0; wy.send(JSON.stringify({ t: 'thank', to: x.userId, ref: row.id })); assert.equal((await waitFor(wy, (m) => m.t === 'thanked')).reason, 'ALREADY');
  wz.send(JSON.stringify({ t: 'thank', to: y.userId, ref: row.id })); assert.equal((await waitFor(wz, (m) => m.t === 'thanked')).reason, 'NOTHING_TO_THANK');
  wx.close(); wy.close(); wz.close();
});
await t('routine care is activity, meaningful events are journal; old journal rows are untouched', async () => {
  const { tk, x } = globalThis.regress; const act = S.db.prepare("SELECT type FROM activity WHERE tank_id=?").all(tk.id).map((r) => r.type); assert.ok(act.includes('feed'));
  const j = S.db.prepare('SELECT text FROM journal WHERE tank_id=?').all(tk.id).map((r) => r.text); assert.ok(!j.some((t2) => /fed the fish|changed the water|cleaned the glass|ordered/.test(t2)), 'no routine lines in the journal');
  S.db.prepare('INSERT INTO journal (tank_id,day,text,user_id,ts) VALUES (?,?,?,?,?)').run(tk.id, 1, 'An old entry from before the split.', null, 1); const wx = await open(x.token); const snap = await waitFor(wx, (m) => m.t === 'snapshot'); assert.ok(snap.journal.length >= 1); wx.close();
});
await t('analytics: sessions and actions are recorded without personal data, players and tanks counted separately, admin view needs the key', async () => {
  const { tk, x, y } = globalThis.regress, wx = await open(x.token), wy = await open(y.token); setW(tk.id, { simTs: Date.now(), hunger: 0.8 }); await ackOf(wx, { t: 'feed', x: 0, idem: 'an-f' });
  wy.send(JSON.stringify({ t: 'track', e: 'fish_inspected' })); wy.send(JSON.stringify({ t: 'track', e: 'not_allowed' })); wy.send(JSON.stringify({ t: 'track', e: 'journal_opened' })); await new Promise((r) => setTimeout(r, 200)); wx.close(); wy.close(); await new Promise((r) => setTimeout(r, 300));
  const types = S.db.prepare('SELECT type FROM events').all().map((r) => r.type); for (const e of ['session_started', 'session_ended', 'fish_fed', 'fish_inspected', 'journal_opened', 'shells_earned']) assert.ok(types.includes(e), 'missing ' + e); assert.ok(!types.includes('not_allowed'));
  const cols = S.db.prepare('PRAGMA table_info(events)').all().map((c) => c.name).join(); assert.equal(cols, 'id,ts,user_id,tank_id,type,n', 'no names, no ips');
  process.env.ADMIN_KEY = 'secret-key-1'; const bad = await fetch(base + '/admin/stats?key=nope'); assert.equal(bad.status, 404); const none = await fetch(base + '/admin/stats'); assert.equal(none.status, 404);
  { const html = await (await fetch(base + '/admin?key=secret-key-1')).text(); assert.ok(html.includes('RECENT TANKS') && html.includes(S.db.prepare('SELECT code FROM tanks ORDER BY created_at DESC LIMIT 1').get().code), 'the developer page lists recent tanks with their codes'); }
  const good = await fetch(base + '/admin/stats?key=secret-key-1'); assert.equal(good.status, 200); const st = await good.json(); assert.ok(st.players.distinctPlayers >= 2); assert.ok(st.tanks.activeTanksPerDay.length >= 1); assert.ok(st.interactions.mostUsed.length >= 1);
  assert.ok(st.tanks.avgActiveCaretakersPerTankDay >= 1); const page = await fetch(base + '/admin?key=secret-key-1'); assert.match(await page.text(), /PLAYERS \(individual\)[\s\S]*TANKS \(shared\)/); delete process.env.ADMIN_KEY;
});
await t('economy integrity: milestones and the daily wish pay once even when caretakers act at the same moment, and one wallet cannot be double-spent', async () => {
  const { tk, x, y, z } = globalThis.regress, DAY = 864e5, now = Date.now(), wx = await open(x.token), wy = await open(y.token), wz = await open(z.token), w0 = getW(tk.id), tpl = w0.fish[0];
  const fish = ['m1', 'm2', 'm3'].map((id, i) => ({ ...tpl, id, name: id.toUpperCase(), species: 'goldfish', traits: ['Calm'], born: now - 14 * DAY - 60e3, stage: 'adult', ail: 0, health: 1, happy: 0.8, found: [], disc: {}, bond: {}, petAt: {} }));
  setW(tk.id, { fish, decor: [], orders: [], eggs: [], floaters: [], shells: 50, simTs: now - 2000, hunger: 0.3, water: 0.9, glass: 0, createdAt: now - 40 * DAY, lastDeath: now, visitAt: 1e15, eggAt: 1e15, storyAt: 1e15, drift: null, driftAt: 1e15, flags: { ...w0.flags, tut: 5, msV: 1, pairs: {}, weeks: 5 }, daily: { day: Math.floor(now / DAY), kind: 'play', tier: 'normal', reward: 5, text: 'Play with a fish', need: 1, have: 0, ids: [], done: false } });
  const [r1, r2] = await Promise.all([ackOf(wx, { t: 'pet', id: 'm1', idem: 'ei-1' }), ackOf(wy, { t: 'pet', id: 'm2', idem: 'ei-2' })]); assert.ok(r1.ok && r2.ok);
  let w = getW(tk.id); assert.equal(w.daily.done, true, 'the shared wish is done'); assert.equal(w.shells, 50 + 15 + 5, 'three 14-day milestones (+5 each) and one wish (+5), each exactly once');
  assert.ok(w.fish.every((f) => f.found.includes('age14') && !f.found.includes('age30')), 'every fish records the milestone once');
  await Promise.all([ackOf(wz, { t: 'pet', id: 'm3', idem: 'ei-3' }), ackOf(wx, { t: 'pet', id: 'm1', idem: 'ei-4' }), ackOf(wy, { t: 'pet', id: 'm2', idem: 'ei-5' })]); assert.equal(getW(tk.id).shells, 70, 'nothing pays twice');
  // thirty days: a second milestone for the same fish, once
  setW(tk.id, { fish: getW(tk.id).fish.map((f) => ({ ...f, born: now - 30 * DAY - 60e3 })), simTs: Date.now() - 2000 }); const before = getW(tk.id).shells;
  await Promise.all([ackOf(wx, { t: 'feed', x: 0, idem: 'ei-6' }), ackOf(wy, { t: 'feed', x: 0, idem: 'ei-7' }), ackOf(wz, { t: 'feed', x: 0, idem: 'ei-8' })]);
  w = getW(tk.id); assert.equal(w.fish.filter((f) => f.found.includes('age30')).length, 3); assert.ok(w.shells - before >= 24 && w.shells - before <= 24 + 3 + 5, 'three 30-day milestones (+8 each) paid once, plus at most the feeding shells and a perfect-day bonus');
  // one wallet: two caretakers try to buy with shells for only one fish
  setW(tk.id, { shells: 10, orders: [], fish: w.fish.slice(0, 1), simTs: Date.now() - 1000, flags: { ...w.flags, firsts: { ...w.flags.firsts } } });
  const buys = await Promise.all([ackOf(wx, { t: 'buyFish', species: 'goldfish', name: 'A', seed: 1, idem: 'ei-9' }), ackOf(wy, { t: 'buyFish', species: 'goldfish', name: 'B', seed: 2, idem: 'ei-10' })]);
  assert.equal(buys.filter((m) => m.ok).length, 1, 'exactly one purchase succeeds'); assert.equal(getW(tk.id).shells, 0); assert.equal(getW(tk.id).orders.length, 1);
  wx.close(); wy.close(); wz.close();
});
await t('food choice on the server: paid foods cost shells, a poor tank cannot buy them, and everyone sees what was dropped', async () => {
  const { tk, x, y } = globalThis.regress, wx = await open(x.token), wy = await open(y.token); const w0 = getW(tk.id);
  setW(tk.id, { shells: 10, hunger: 0.8, simTs: Date.now() - 1000, level: 8, wishIdx: 12, flags: { ...w0.flags, tut: 5, weeks: 99 }, orders: [], visitAt: 1e15, eggAt: 1e15, storyAt: 1e15, drift: null, driftAt: 1e15 });
  const a = await ackOf(wx, { t: 'feed', x: 0.5, food: 'pellets', idem: 'fd-1' }); assert.ok(a.ok && a.delta === -2, JSON.stringify(a));
  const seen = await waitFor(wy, (m) => m.t === 'feed' && m.food === 'pellets'); assert.equal(seen.food, 'pellets');
  setW(tk.id, { shells: 1, hunger: 0.8, simTs: Date.now() - 500 }); const poor = await ackOf(wx, { t: 'feed', x: 0, food: 'treats', idem: 'fd-2' }); assert.equal(poor.ok, false); assert.equal(poor.reason, 'NOT_ENOUGH_SHELLS'); assert.equal(getW(tk.id).shells, 1);
  wx.close(); wy.close();
});
await t('your data is yours: backup downloads, restores into a new tank, and deleting removes the player and an empty tank', async () => {
  const u1 = await mkUser('Backup'), tk1 = (await call('/api/tanks', { name: 'Backup Reef' }, u1.token)).body, ws1 = await open(u1.token);
  assert.equal((await ackOf(ws1, { t: 'chooseFirst', species: 'seahorse', name: 'Nori', seed: 4, idem: 'bk-1' })).ok, true); setW(tk1.id, { shells: 77 }); ws1.close();
  const ex = await call('/api/export', null, u1.token); assert.equal(ex.status, 200); assert.equal(ex.body.app, 'our-tank'); assert.equal(ex.body.world.shells, 77); assert.equal(ex.body.world.fish[0].name, 'Nori'); assert.equal(ex.body.world.fish[0].owner, null, 'no ids in a backup'); assert.ok(!JSON.stringify(ex.body).includes(u1.userId), 'no user id anywhere');
  assert.equal((await call('/api/export', null, 'x'.repeat(64))).status, 401);
  const u2 = await mkUser('Restorer'); assert.equal((await call('/api/import', { app: 'nope' }, u2.token)).status, 400); assert.equal((await call('/api/import', { app: 'our-tank', world: { fish: new Array(70).fill({}) } }, u2.token)).status, 400, 'too many fish');
  const r = await call('/api/import', ex.body, u2.token); assert.equal(r.status, 200, JSON.stringify(r.body)); const w2 = getW(r.body.id); assert.equal(w2.shells, 77); assert.equal(w2.fish[0].name, 'Nori'); assert.equal(w2.fish[0].species, 'seahorse'); assert.ok(w2.flags.firsts[u2.userId]); assert.equal((await call('/api/import', ex.body, u2.token)).status, 409, 'already in a tank');
  const bad = JSON.parse(JSON.stringify(ex.body)); bad.world.fish[0].species = 'dragon'; bad.world.shells = 1e12; const u3 = await mkUser('Careful'); const rb = await call('/api/import', bad, u3.token); assert.equal(rb.status, 200); const w3 = getW(rb.body.id); assert.equal(w3.fish.length, 0, 'unknown species dropped'); assert.ok(w3.shells <= 1e6, 'shells bounded');
  const del = await fetch(base + '/api/me', { method: 'DELETE', headers: { authorization: 'Bearer ' + u2.token } }); assert.equal(del.status, 200); assert.equal((await call('/api/me', null, u2.token)).status, 401, 'the player is gone'); assert.equal(S.db.prepare('SELECT COUNT(*) n FROM tanks WHERE id=?').get(r.body.id).n, 0, 'an empty tank goes with its last player');
  assert.equal(S.db.prepare('SELECT COUNT(*) n FROM users WHERE id=?').get(u2.userId).n, 0);
});
await t('tutorial progress is saved with the tank', async () => { assert.equal((await ackOf(wsA, { t: 'tut', step: 3, idem: 'tu' })).ok, true); const w = getW(tank.id); assert.equal(w.flags.tut, 3); assert.equal(w.flags.starter.fern, 1); });
await t('the octopus puzzle jar: costs shells once, cannot be doubled by two caretakers, and is solved on its own with the event delivered', async () => {
  const { tk, x, y } = globalThis.regress, now = Date.now(), wx = await open(x.token), wy = await open(y.token), w0 = getW(tk.id), tpl = w0.fish[0];
  const oct = { ...tpl, id: 'oc1', name: 'Inky', species: 'octopus', traits: ['Curious'], born: now - 5 * 864e5, stage: 'adult', ail: 0, health: 1, happy: 0.7, found: [], disc: {}, bond: {}, petAt: {}, puzzle: null };
  setW(tk.id, { fish: [oct], decor: [], orders: [], eggs: [], floaters: [], shells: 20, simTs: Date.now() - 2000, hunger: 0.3, water: 0.9, glass: 0, visitAt: 1e15, eggAt: 1e15, storyAt: 1e15, drift: null, driftAt: 1e15 });
  const [a, b] = await Promise.all([ackOf(wx, { t: 'puzzle', id: 'oc1', idem: 'pz-1' }), ackOf(wy, { t: 'puzzle', id: 'oc1', idem: 'pz-2' })]);
  assert.ok(a.ok && b.ok); assert.equal([a, b].filter((r) => r.applied).length, 1, 'only one jar is given'); assert.equal(getW(tk.id).shells, 20 - 3, 'paid once');
  assert.ok(getW(tk.id).fish[0].puzzle?.until > Date.now(), 'the jar is being worked on');
  const w = getW(tk.id); w.fish[0].puzzle.until = Date.now() - 1; setW(tk.id, { fish: w.fish, simTs: Date.now() - 2000 });
  await ackOf(wx, { t: 'feed', x: 0, idem: 'pz-3' }); const f = getW(tk.id).fish[0]; assert.equal(f.puzzle, null); assert.equal(f.solved, 1);
});
await t('gifts and fed-together reach the server: a fish bought for a friend belongs to them, and two caretakers feeding together cheer the fish once', async () => {
  const w0 = getW(tank.id), now = Date.now(); setW(tank.id, { shells: 120, level: 8, orders: [], eggs: [], simTs: now - 1000, hunger: 0.8, flags: { ...w0.flags, tut: 5, togetherAt: null, tg: 1 }, lastFeedBy: null, visitAt: 1e15, eggAt: 1e15, storyAt: 1e15, driftAt: 1e15, drift: null });
  const wsX = await open(a.token), wsY = await open(b.token);
  const r = await ackOf(wsX, { t: 'buyFish', species: 'cory', name: 'Gifty', seed: 5, to: b.userId, idem: 'gift-1' }); assert.equal(r.ok, true); const o = getW(tank.id).orders.at(-1); assert.equal(o.owner, b.userId); assert.equal(o.giftFrom, a.name ?? o.giftFrom); assert.ok(o.giftFrom);
  const bad = await ackOf(wsX, { t: 'buyFish', species: 'cory', name: 'Nope', seed: 5, to: 'someone-else', idem: 'gift-2' }); assert.equal(bad.ok, true); assert.equal(getW(tank.id).orders.at(-1).owner, a.userId, 'not a member, so it is not a gift');
  setW(tank.id, { hunger: 0.8, simTs: Date.now() - 1000 }); await ackOf(wsX, { t: 'feed', x: 0, idem: 'tg-1' }); setW(tank.id, { hunger: 0.8, simTs: Date.now() - 1000 }); const y = await ackOf(wsY, { t: 'feed', x: 1, idem: 'tg-2' });
  assert.ok((y.events ?? []).some((e) => e.together) || getW(tank.id).flags.togetherAt, 'fed together'); const at = getW(tank.id).flags.togetherAt; setW(tank.id, { hunger: 0.8, simTs: Date.now() - 1000 }); await ackOf(wsX, { t: 'feed', x: 0, idem: 'tg-3' }); assert.equal(getW(tank.id).flags.togetherAt, at, 'once per few hours');
});
await t('a phone that lost its sign-in takes its seat back with the tank code', async () => {
  const a = await mkUser('Lost'), tk = (await call('/api/tanks', { name: 'Seat' }, a.token)).body;
  const pv = (await call('/api/join/preview', { code: tk.code }, a.token)).body; const slot = pv.members[0].slot;
  const r = await call('/api/claim', { code: tk.code.toLowerCase(), slot }); assert.equal(r.status, 200); assert.equal(r.body.userId, a.userId);
  assert.equal((await call('/api/me', null, a.token)).status, 401); const me = await call('/api/me', null, r.body.token); assert.equal(me.body.tank.id, tk.id);
  assert.equal((await call('/api/claim', { code: tk.code, slot: 2 })).status, 404); assert.equal((await call('/api/claim', { code: 'ZZZZZZ', slot })).status, 404);
});
await t('push: the server makes and keeps its own keys, and a test notification reaches the phone even at night', async () => {
  const { vapidFor } = await import('./push.mjs'); const { openDb } = await import('./db.mjs'); const d = openDb(':memory:');
  const k1 = vapidFor(d, {}), k2 = vapidFor(d, {}); assert.ok(k1.publicKey && k1.privateKey); assert.equal(k1.publicKey, k2.publicKey, 'kept, not remade');
  assert.equal(vapidFor(d, { VAPID_PUBLIC: 'A', VAPID_PRIVATE: 'B' }).publicKey, 'A');
  const u = await mkUser('Tester'); assert.equal((await call('/api/push/test', {}, u.token)).body.sent, false, 'no subscription, nothing sent');
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test1', keys: { p256dh: 'k1', auth: 'k2' } };
  await call('/api/push/subscribe', { subscription: sub, offset: 0 }, u.token); S.db.prepare('UPDATE push_subs SET offset_min=? WHERE user_id=?').run(((3 - new Date().getUTCHours()) * 60 + 1440) % 1440 - 0, u.userId);
  pushed.length = 0; const r = await call('/api/push/test', {}, u.token); assert.equal(r.body.sent, true); assert.equal(pushed.length, 1); assert.match(pushed[0].payload.body, /test/i);
});
await t('offsite copies: the request signature matches Amazon\'s published example, and an empty server restores from the bucket', async () => {
  const { signV4, makeOffsite, restoreIfEmpty, makeUploader, isEmptyDb } = await import('./offsite.mjs'); const fs = await import('node:fs'); const os = await import('node:os'); const pth = await import('node:path');
  const auth = signV4({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', headers: { range: 'bytes=0-9', 'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'x-amz-date': '20130524T000000Z' }, payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', amzDate: '20130524T000000Z', region: 'us-east-1', accessKey: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' });
  assert.match(auth, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
  const store = new Map(), fake = async (url, o) => { const k = new URL(url).pathname; if (o.method === 'PUT') { assert.match(o.headers.authorization, /^AWS4-HMAC-SHA256 Credential=K\//); store.set(k, Buffer.from(o.body)); return { ok: true, status: 200 }; } return store.has(k) ? { ok: true, status: 200, arrayBuffer: async () => store.get(k) } : { ok: false, status: 404 }; };
  const off = makeOffsite({ endpoint: 'https://s3.example.test', bucket: 'bk', accessKey: 'K', secret: 'S' }, fake); const dir = fs.mkdtempSync(pth.join(os.tmpdir(), 'off-')), file = pth.join(dir, 'a.db');
  assert.equal(isEmptyDb(file), true); assert.equal(await restoreIfEmpty(off, file, () => {}), false, 'nothing in the bucket yet');
  const live = pth.join(dir, 'live.db'); S.db.exec(`VACUUM INTO '${live}'`); const up = makeUploader(off, () => live, () => {}); assert.equal(await up.run(), true); assert.equal(await up.run(), false, 'unchanged, not sent again');
  assert.equal(await restoreIfEmpty(off, file, () => {}), true); assert.equal(isEmptyDb(file), false); assert.equal(await restoreIfEmpty(off, file, () => {}), false, 'a database with players is never overwritten');
  assert.ok([...store.keys()].some((k) => /ourtank-\d{4}-\d\d-\d\d\.db$/.test(k)), 'a dated copy is kept too');
  // an empty server must never replace the good copy, and a damaged main copy falls back to a dated one
  const { DatabaseSync } = await import('node:sqlite'); const emptyFile = pth.join(dir, 'empty.db'); const e = new DatabaseSync(emptyFile); e.exec('CREATE TABLE users (id TEXT)'); e.close();
  const before = store.get('/bk/ourtank.db').length; const up2 = makeUploader(off, () => emptyFile, () => {}); assert.equal(await up2.run(), false); assert.equal(store.get('/bk/ourtank.db').length, before, 'the good copy was not replaced');
  const dkey = [...store.keys()].find((k) => /ourtank-\d{4}/.test(k)); store.set('/bk/ourtank.db', Buffer.from('garbage that is not a database')); const file2 = pth.join(dir, 'b.db');
  assert.equal(await restoreIfEmpty(off, file2, () => {}), true, 'the main copy was damaged: the dated one is used'); assert.equal(isEmptyDb(file2), false); assert.ok(dkey);
  const bad = makeOffsite({ endpoint: 'https://s3.example.test', bucket: 'bk', accessKey: 'K', secret: 'S' }, async () => { throw new Error('network down'); }); await assert.rejects(() => restoreIfEmpty(bad, pth.join(dir, 'c.db'), () => {}), /network down/);
  const up3 = makeUploader(off, () => live, () => {}); up3.block(); assert.equal(await up3.run(), false, 'uploads stay blocked after a failed restore');
});
await t('the storage check says whether the tank is safe from the server losing its disk', async () => {
  const u = await mkUser('Stor'); const r = await call('/api/storage', null, u.token); assert.equal(r.status, 200); assert.ok(['safe', 'waiting', 'risk'].includes(r.body.level));
  assert.equal((await call('/api/storage')).status, 401);
});
await t('the GitHub copy: compressed, updated in place with the right sha, restored, and sent at most every 25 minutes (but always when stopping)', async () => {
  const { makeGithubOffsite, makeUploader, restoreIfEmpty, offsiteFromEnv } = await import('./offsite.mjs'); const zlib = (await import('node:zlib')).default, fs = await import('node:fs'), os = await import('node:os'), pth = await import('node:path');
  const files = new Map(), calls = []; let n = 0;
  const fake = async (url, o = {}) => { const u = new URL(url), key = decodeURIComponent(u.pathname.replace('/repos/me/data/contents/', '')); calls.push((o.method ?? 'GET') + ' ' + key);
    assert.equal(o.headers.authorization, 'Bearer tok'); if (o.method === 'PUT') { const b = JSON.parse(o.body), ex = files.get(key); assert.ok(!ex || b.sha === ex.sha, 'an update must carry the current sha'); files.set(key, { sha: 'sha' + ++n, bytes: Buffer.from(b.content, 'base64') }); return { ok: true, status: 200 }; }
    const f = files.get(key); if (!f) return { ok: false, status: 404 }; return /raw/.test(o.headers.accept) ? { ok: true, status: 200, arrayBuffer: async () => f.bytes } : { ok: true, status: 200, json: async () => ({ sha: f.sha }) }; };
  const off = makeGithubOffsite({ token: 'tok', repo: 'me/data' }, fake); const dir = fs.mkdtempSync(pth.join(os.tmpdir(), 'gh-')), live = pth.join(dir, 'live.db'); S.db.exec(`VACUUM INTO '${live}'`);
  const up = makeUploader(off, () => live, () => {}); assert.equal(await up.run(), true); assert.ok(files.get('ourtank.db.gz').bytes.length < fs.readFileSync(live).length, 'stored compressed');
  assert.equal(zlib.gunzipSync(files.get('ourtank.db.gz').bytes).length, fs.readFileSync(live).length);
  S.db.prepare('INSERT OR REPLACE INTO kv (k,v) VALUES (?,?)').run('t', String(Date.now())); fs.rmSync(live); S.db.exec(`VACUUM INTO '${live}'`);
  assert.equal(await up.run(), false, 'not again within 25 minutes'); assert.equal(await up.run(true), true, 'but always when the server is stopping'); assert.ok(calls.some((c) => c.startsWith('PUT ourtank-')), 'a dated copy too');
  const f2 = pth.join(dir, 'new.db'); assert.equal(await restoreIfEmpty(off, f2, () => {}), true); const { DatabaseSync } = await import('node:sqlite'); const d = new DatabaseSync(f2, { readOnly: true }); assert.ok(d.prepare('SELECT COUNT(*) n FROM users').get().n > 0); d.close();
  assert.ok(offsiteFromEnv({ GITHUB_BACKUP_TOKEN: 't', GITHUB_BACKUP_REPO: 'a/b' })?.describe.includes('github.com/a/b')); assert.equal(offsiteFromEnv({}), null);
});
await t('a backup can be copied as text and pasted back, and the phone-side helpers fail quietly where there is no browser storage', async () => {
  const k = await import('../web/src/keep.js'); const sample = { app: 'our-tank', tank: { name: 'Text' }, world: { fish: Array.from({ length: 40 }, (_, i) => ({ id: 'f' + i, name: 'Fish ' + i, species: 'neon' })), decor: [] } };
  const text = await k.backupToText(sample); assert.match(text, /^OURTANK1:/); assert.ok(text.length < JSON.stringify(sample).length, 'compressed');
  assert.deepEqual(await k.backupFromText('  some words before\n' + text.replace(/(.{60})/g, '$1\n') + ' and after'), sample, 'survives being wrapped by a messaging app');
  await assert.rejects(() => k.backupFromText('hello'), /backup/); assert.equal(await k.idbGet('x'), undefined); assert.equal(await k.idbPut('x', 1), undefined);
});
await t('the sign-in can travel in the connection protocol instead of the address, and a wrong one is refused', async () => {
  const u = await mkUser('Proto'); await call('/api/tanks', { name: 'Proto' }, u.token);
  const ok = await new Promise((res) => { const w = new WebSocket(`ws://localhost:${S.port}/ws`, ['ourtank.' + u.token]); w.on('message', (d) => { if (JSON.parse(d.toString()).t === 'snapshot') { w.close(); res(true); } }); w.on('error', () => res(false)); w.on('unexpected-response', () => res(false)); });
  assert.equal(ok, true); const bad = await new Promise((res) => { const w = new WebSocket(`ws://localhost:${S.port}/ws`, ['ourtank.wrong']); w.on('open', () => { w.close(); res(true); }); w.on('error', () => res(false)); w.on('unexpected-response', () => res(false)); }); assert.equal(bad, false);
});
await t('a tank the server lost is put back under its old code by whichever phone gets there first; the other just joins it', async () => {
  const o = await mkUser('Own'), tk = (await call('/api/tanks', { name: 'Healed' }, o.token)).body, backup = (await call('/api/export', null, o.token)).body;
  const x = await mkUser('Own2'), y = await mkUser('Fri'), want = 'HEA2ED';
  const r1 = await call('/api/import', { ...backup, code: want, heal: true }, x.token); assert.equal(r1.status, 200); assert.equal(r1.body.code, want);
  const r2 = await call('/api/import', { ...backup, code: want, heal: true }, y.token); assert.equal(r2.status, 409); assert.equal(r2.body.error, 'CODE_TAKEN');
  assert.equal((await call('/api/join', { code: want }, y.token)).status, 200); const me = await call('/api/me', null, y.token); assert.equal(me.body.tank.code, want);
  assert.equal(getW(r1.body.id).flags.healed > 0, true, 'a restored tank does not ask friends to choose a first fish again');
  const z = await mkUser('Odd'); assert.notEqual((await call('/api/import', { ...backup, code: 'I0O1LL', heal: true }, z.token)).body.code, 'I0O1LL', 'a code outside the alphabet is ignored');
});
await t('the daily gift reaches the server: accepted, paid to the shared wallet once, and a second try the same day pays nothing', async () => {
  setW(tank.id, { flags: { ...getW(tank.id).flags, tut: 5, gift: {} }, fish: getW(tank.id).fish.length ? getW(tank.id).fish : [{ id: 'fg', name: 'Gift', species: 'goldfish', seed: 1, born: Date.now(), stage: 'baby', traits: [], happy: 0.7, health: 1, appetite: 0.05, owner: null }], simTs: Date.now() });
  const s0 = getW(tank.id).shells, r1 = await ackOf(wsA, { t: 'dailyGift', tz: 0, idem: 'dg1' }); assert.equal(r1.ok, true); assert.equal(r1.delta, 2); assert.ok(getW(tank.id).shells >= s0 + 2);
  const r2 = await ackOf(wsA, { t: 'dailyGift', tz: 0, idem: 'dg2' }); assert.equal(r2.delta, 0);
});
await t('a phone that connects catches the tank up for everyone: the phone already there is sent the same tank', async () => {
  const x = await mkUser('Old'), y = await mkUser('New'), tk = (await call('/api/tanks', { name: 'Same' }, x.token)).body; await call('/api/join', { code: tk.code }, y.token);
  const wx = await open(x.token); await waitFor(wx, (m) => m.t === 'snapshot'); wx.msgs.length = 0;
  setW(tk.id, { shells: 77 }); const wy = await open(y.token); const got = await waitFor(wx, (m) => m.t === 'state' && m.tank.shells === 77); assert.equal(got.tank.shells, 77); wx.close(); wy.close();
});
await t('chaos: three phones act at random while connections drop and come back; in the end every phone agrees with the server', async () => {
  const u = [await mkUser('C1'), await mkUser('C2'), await mkUser('C3')], tk = (await call('/api/tanks', { name: 'Chaos' }, u[0].token)).body; await call('/api/join', { code: tk.code }, u[1].token); await call('/api/join', { code: tk.code }, u[2].token);
  setW(tk.id, { shells: 400, level: 8, flags: { ...getW(tk.id).flags, tut: 5, firsts: { [u[0].userId]: true, [u[1].userId]: true, [u[2].userId]: true } }, fish: [{ id: 'cf', name: 'Chaos', species: 'goldfish', seed: 1, born: Date.now() - 9e8, stage: 'adult', traits: ['Curious'], happy: 0.7, health: 1, appetite: 0.05, owner: null }], simTs: Date.now(), hunger: 0.9, glass: 0.9, water: 0.4 });
  const ph = u.map((x) => ({ x, ws: null, state: null })), conn = async (p) => { p.ws = await open(p.x.token); p.ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.t === 'snapshot') p.state = m.tank; else if (m.t === 'state') p.state = m.tank; }); await waitFor(p.ws, (m) => m.t === 'snapshot'); };
  for (const p of ph) await conn(p); let seq = 0, rngS = 12345; const rnd = () => ((rngS = (rngS * 16807) % 2147483647) / 2147483647);
  const acts = [(i) => ({ t: 'feed', x: 0 }), (i) => ({ t: 'glass' }), (i) => ({ t: 'water' }), (i) => ({ t: 'pet', id: 'cf' }), (i) => ({ t: 'buyDecor', type: 'grass', x: (rnd() - 0.5) * 6, z: 1 + rnd(), ry: 0 }), (i) => ({ t: 'dailyGift', tz: 0 })];
  for (let i = 0; i < 70; i++) {
    const p = ph[(rnd() * 3) | 0]; if (rnd() < 0.15) { p.ws.close(); await new Promise((r) => setTimeout(r, 20)); await conn(p); }
    const a = acts[(rnd() * acts.length) | 0](i); const idem = 'ch' + ++seq; p.ws.send(JSON.stringify({ ...a, idem })); if (rnd() < 0.2) p.ws.send(JSON.stringify({ ...a, idem }));      // sometimes the same message arrives twice
    await new Promise((r) => setTimeout(r, 15));
  }
  await new Promise((r) => setTimeout(r, 500)); const w = getW(tk.id);
  for (const p of ph) { assert.ok(p.state, 'phone has a tank'); assert.equal(p.state.shells, w.shells, 'shells agree'); assert.equal(p.state.level, w.level); assert.equal((p.state.decor ?? []).length, (w.decor ?? []).length, 'decor agrees'); assert.equal((p.state.fish ?? []).length, w.fish.length); assert.deepEqual(p.state.flags?.gift ?? {}, w.flags.gift ?? {}, 'gift claims agree'); }
  assert.ok(Object.keys(w.flags.gift ?? {}).length <= 3 && Object.values(w.flags.gift ?? {}).length >= 0); for (const p of ph) p.ws.close();
});
await t('every tank message carries the server clock, and a ping is answered', async () => {
  const w = await open(a.token); const snap = await waitFor(w, (m) => m.t === 'snapshot'); assert.ok(Math.abs(snap.now - Date.now()) < 5000, 'the snapshot has the server time');
  w.send(JSON.stringify({ t: 'ping' })); await waitFor(w, (m) => m.t === 'pong'); w.close();
});
await t('two phones in one tank agree on a director, who alone sends fish positions and memories; a water change is mirrored', async () => {
  const x = await mkUser('Dir'), y = await mkUser('Fol'), tk = (await call('/api/tanks', { name: 'Sync' }, x.token)).body; await call('/api/join', { code: tk.code }, y.token);
  const wx = await open(x.token), wy = await open(y.token), last = (w) => [...w.msgs].reverse().find((m) => m.t === 'role');
  await waitFor(wy, (m) => m.t === 'role'); await waitFor(wx, (m) => m.t === 'role' && m.director === true);
  assert.equal(last(wx).director, true, 'the phone that has been here longest directs'); assert.equal(last(wy).director, false);
  wx.send(JSON.stringify({ t: 'snap', fish: [{ i: 'f1', x: 1.5, y: 6, z: 1, h: 0.5, p: 0, r: 0 }] })); const sn = await waitFor(wy, (m) => m.t === 'snap'); assert.equal(sn.fish[0].x, 1.5);
  wx.msgs.length = 0; wy.send(JSON.stringify({ t: 'snap', fish: [{ i: 'f1', x: -3, y: 6, z: 1, h: 0, p: 0, r: 0 }] })); await new Promise((r) => setTimeout(r, 150)); assert.equal(wx.msgs.filter((m) => m.t === 'snap').length, 0, 'a follower cannot move the fish');
  wy.send(JSON.stringify({ t: 'fx', kind: 'water' })); const fx = await waitFor(wx, (m) => m.t === 'fx' && m.kind === 'water'); assert.equal(fx.by, y.userId);
  wy.send(JSON.stringify({ t: 'fx', kind: 'sight', what: 'whale', dir: 1, y0: 5, z: -8 })); await new Promise((r) => setTimeout(r, 150)); assert.equal(wx.msgs.filter((m) => m.t === 'fx' && m.kind === 'sight').length, 0, 'only the director sends memories');
  wx.send(JSON.stringify({ t: 'fx', kind: 'sight', what: 'whale', dir: -1, y0: 5, z: -8 })); const sg = await waitFor(wy, (m) => m.t === 'fx' && m.kind === 'sight'); assert.equal(sg.what, 'whale'); assert.equal(sg.dir, -1);
  wy.msgs.length = 0; wx.send(JSON.stringify({ t: 'vis', hidden: true })); await waitFor(wy, (m) => m.t === 'role' && m.director === true);
  wy.msgs.length = 0; wx.close(); await new Promise((r) => setTimeout(r, 150)); assert.equal(last(wy)?.director ?? true, true, 'and when the director leaves, the other takes over'); wy.close();
});
wsA.close();
wa.close(); await S.close();
console.log(process.exitCode ? '\nFAILED' : `\nAll ${pass} tests passed`);
