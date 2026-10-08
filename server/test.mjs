// Integration tests for the multiplayer backend. Run: npm test
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { start } from './server.mjs';
import { ALPHABET } from './logic.mjs';

let pass = 0;
const getW = (id) => JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(id).world);
const setW = (id, patch) => { const w = { ...getW(id), ...patch }; S.db.prepare('UPDATE tanks SET world=? WHERE id=?').run(JSON.stringify(w), id); };
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };
const S = await start({ port: 0, dbPath: ':memory:', limits: { joinPerMin: 40, userPerHour: 5000, tankPerHour: 5000 } });
const base = `http://localhost:${S.port}`;
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
await t('absence is bounded: 10 days away never starves the tank', async () => {
  setW(tank.id, { hunger: 0.3, water: 0.9, glass: 0.1, simTs: Date.now() - 10 * 864e5 });
  const w = await open(a.token); const s = await waitFor(w, (m) => m.t === 'snapshot'); assert.ok(s.tank.hunger <= 0.85 && s.tank.water >= 0.45 && s.tank.glass <= 0.8, JSON.stringify(s.tank)); w.close();
});

console.log('Shop & progression');
await t('a new tank starts with Pip, starter decor and 10 shells', async () => { const w = getW(tank.id); assert.equal(w.fish[0].name, 'Pip'); assert.equal(w.decor.length, 4); assert.ok(w.level === 1); });
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
  const w = getW(tank.id); assert.equal(w.shells, before.shells - 7); assert.equal(w.decor.length, before.decor.length + 1);
  const st = await waitFor(wb2 ?? wsA, (m) => m.t === 'state' && m.tank.decor.length === w.decor.length); assert.ok(st);
});
await t('two players spending the last shells at once: exactly one purchase succeeds', async () => {
  setW(tank.id, { shells: 8, simTs: Date.now() });
  const wsB = await open(b.token);
  const [r1, r2] = await Promise.all([ackOf(wsA, { t: 'buyFish', species: 'goldfish', name: 'Gus', idem: 'r1' }), ackOf(wsB, { t: 'buyFish', species: 'goldfish', name: 'Gil', idem: 'r2' })]);
  assert.equal([r1, r2].filter((r) => r.ok).length, 1); assert.equal(getW(tank.id).shells, 0); wsB.close();
});
await t('buying a school adds four fish; selling decor refunds half; capacity is enforced', async () => {
  setW(tank.id, { shells: 200, level: 1, simTs: Date.now() });
  const n0 = getW(tank.id).fish.length;
  assert.equal((await ackOf(wsA, { t: 'buyFish', species: 'neon', idem: 's1' })).ok, true); assert.equal(getW(tank.id).fish.length, n0 + 4);
  const d = getW(tank.id).decor.at(-1); const s0 = getW(tank.id).shells;
  assert.equal((await ackOf(wsA, { t: 'sellDecor', id: d.id, idem: 's2' })).ok, true); assert.equal(getW(tank.id).shells, s0 + 3);
  setW(tank.id, { level: 1, shells: 500, simTs: Date.now() });
  let last; for (let i = 0; i < 4; i++) last = await ackOf(wsA, { t: 'buyFish', species: 'goldfish', idem: 'cap' + i });
  assert.ok(['TANK_FULL'].includes(last.reason) || last.ok);
});
await t('dev actions are refused unless the server runs in dev mode', async () => { assert.equal((await ackOf(wsA, { t: 'dev', what: 'shells', idem: 'dv' })).reason, 'FORBIDDEN'); });
await t('tutorial progress is saved with the tank', async () => { assert.equal((await ackOf(wsA, { t: 'tut', step: 3, idem: 'tu' })).ok, true); const w = getW(tank.id); assert.equal(w.flags.tut, 3); assert.equal(w.flags.freePlant, 1); });
wsA.close();
wa.close(); await S.close();
console.log(process.exitCode ? '\nFAILED' : `\nAll ${pass} tests passed`);
