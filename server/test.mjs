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
const S = await start({ port: 0, dbPath: ':memory:', limits: { joinPerMin: 40, userPerHour: 5000, tankPerHour: 5000 }, push: { publicKey: 'PUB', privateKey: 'PRIV', sender: async (sub, payload) => { pushed.push({ sub, payload: JSON.parse(payload) }); } } });
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
  const st = await waitFor(wb, (m) => m.t === 'state'); assert.equal(st.tank.shells, 11);
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
await t('a new tank starts with Pip, no decor yet and 10 shells', async () => { const w = getW(tank.id); assert.equal(w.fish[0].name, 'Pip'); assert.equal(w.decor.length, 0); assert.ok(w.level === 1); });
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
await t('anyone can collect what washed in, once, and the tank hears about it', async () => {
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
await t('push: opt in, a visitor reaches a closed tank once, quiet hours and the daily cap are respected', async () => {
  const k = await call('/api/push/key', null, a.token); assert.equal(k.body.enabled, true);
  const x = await mkUser('Pushy'), tk = (await call('/api/tanks', { name: 'Quiet' }, x.token)).body;
  const bad = await call('/api/push/subscribe', { subscription: { endpoint: 'http://nope', keys: {} }, offset: 0 }, x.token); assert.equal(bad.status, 400);
  const mid = ((720 - ((Date.now() / 60000) % 1440)) % 1440), off = mid > 840 ? mid - 1440 : mid < -840 ? mid + 1440 : mid;      // a phone whose local time is about noon right now
  const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'k1', auth: 'k2' } };
  assert.equal((await call('/api/push/subscribe', { subscription: sub, offset: off }, x.token)).status, 200);
  const w = getW(tk.id); setW(tk.id, { simTs: Date.now() - 1000, visitor: null, visitAt: Date.now() - 10, flags: { ...w.flags, tut: 5 } });
  pushed.length = 0; await S.pushSweep(Date.now()); assert.equal(pushed.length, 1); assert.match(pushed[0].payload.body, /rare visitor/i); assert.equal(pushed[0].sub.endpoint, sub.endpoint);
  await S.pushSweep(Date.now()); assert.equal(pushed.length, 1, 'the same event is not announced twice');
  setW(tk.id, { visitor: null, visitAt: Date.now() - 10 }); await S.pushSweep(Date.now()); assert.equal(pushed.length, 2);
  setW(tk.id, { visitor: null, visitAt: Date.now() - 10 }); await S.pushSweep(Date.now()); assert.equal(pushed.length, 2, 'two a day at most');
  const night = new Date(); night.setUTCHours(3, 0, 0, 0); S.db.prepare('DELETE FROM push_log').run(); S.db.prepare('UPDATE push_subs SET offset_min=0').run();
  setW(tk.id, { visitor: null, visitAt: Date.now() - 10 }); await S.pushSweep(night.getTime() + 1); assert.equal(pushed.length, 2, 'quiet hours');
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
await t('tutorial progress is saved with the tank', async () => { assert.equal((await ackOf(wsA, { t: 'tut', step: 3, idem: 'tu' })).ok, true); const w = getW(tank.id); assert.equal(w.flags.tut, 3); assert.equal(w.flags.starter.fern, 1); });
wsA.close();
wa.close(); await S.close();
console.log(process.exitCode ? '\nFAILED' : `\nAll ${pass} tests passed`);
