// OUR TANK server: REST (identity, create/join) + WebSocket (shared live tank) + static client.
import http from 'node:http';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db.mjs';
import * as L from './logic.mjs';
import { makePush } from './push.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// static files are read once, compressed once, and answered with an ETag so a returning phone only re-downloads what changed
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest']);
const staticCache = new Map();
function sendStatic(req, res, file) {
  const st = fs.statSync(file), ext = path.extname(file); let e = staticCache.get(file);
  if (!e || e.mtime !== st.mtimeMs) {
    const raw = fs.readFileSync(file);
    e = { mtime: st.mtimeMs, raw, gz: COMPRESSIBLE.has(ext) && raw.length > 1024 ? zlib.gzipSync(raw, { level: 9 }) : null, etag: `"${raw.length.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"` };
    staticCache.set(file, e);
  }
  const head = { 'Content-Type': MIME[ext] ?? 'application/octet-stream', ETag: e.etag, 'Cache-Control': /\.(png|webmanifest)$/.test(file) ? 'public, max-age=86400' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === e.etag) { res.writeHead(304, head); return res.end(); }
  const gz = e.gz && /\bgzip\b/.test(req.headers['accept-encoding'] ?? ''), body = gz ? e.gz : e.raw;
  res.writeHead(200, { ...head, 'Content-Length': body.length, ...(gz ? { 'Content-Encoding': 'gzip' } : {}) }); res.end(req.method === 'HEAD' ? undefined : body);
}

// sliding-window rate limiter
class Limiter {
  constructor() { this.h = new Map(); }
  hit(key, max, windowMs) {
    const now = Date.now(), arr = (this.h.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { this.h.set(key, arr); return false; }
    arr.push(now); this.h.set(key, arr); return true;
  }
  sweep() { const now = Date.now(); for (const [k, a] of this.h) if (!a.length || now - a[a.length - 1] > 3600e3) this.h.delete(k); }
}

export function start({ port = 8080, dbPath = 'ourtank.db', staticDir = path.join(here, '..', 'web'), limits = {}, push: pushOpts = null } = {}) {
  const db = openDb(dbPath), lim = new Limiter();
  const push = makePush(db, pushOpts ?? { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE, subject: process.env.VAPID_SUBJECT });
  const cfg = { joinPerMin: 12, userPerHour: 30, tankPerHour: 8, recoverPerHour: 10, ...limits };
  const rooms = new Map();                        // tankId -> Set<ws>
  const online = (tankId) => [...new Set([...(rooms.get(tankId) ?? [])].map((w) => w.userId))];
  const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const broadcast = (tankId, o) => { for (const w of rooms.get(tankId) ?? []) send(w, o); };
  const ip = (req) => req.socket.remoteAddress ?? '?';

  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const readBody = (req) => new Promise((ok, no) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 8192) { no(new L.GameError('TOO_BIG', 'Request too large.', 413)); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { no(new L.GameError('BAD_JSON', 'Invalid JSON.')); } }); });
  const authed = (req) => L.authUser(db, (req.headers.authorization ?? '').replace(/^Bearer /, ''));

  async function api(req, res, url) {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return res.end(); }
    const p = url.pathname;
    try {
      if (req.method === 'POST' && p === '/api/users') {
        if (!lim.hit('u:' + ip(req), cfg.userPerHour, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429);
        return json(res, 200, L.createUser(db, await readBody(req)));
      }
      if (req.method === 'POST' && p === '/api/recover') {
        if (!lim.hit('r:' + ip(req), cfg.recoverPerHour, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many attempts. Try again later.', 429);
        return json(res, 200, L.recover(db, (await readBody(req)).key));
      }
      const user = authed(req);
      if (!user) throw new L.GameError('UNAUTHORIZED', 'Sign in required.', 401);
      if (req.method === 'GET' && p === '/api/me') { const t = L.tankOf(db, user.id); return json(res, 200, { user, tank: t ? { id: t.id, name: t.name, code: t.code, slot: t.slot } : null }); }
      if (req.method === 'POST' && p === '/api/profile') {
        if (!lim.hit('p:' + user.id, 20, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429);
        const u = L.updateProfile(db, user, await readBody(req)); const t = L.tankOf(db, user.id);
        if (t) broadcast(t.id, { t: 'members', members: L.listMembers(db, t.id) });
        return json(res, 200, u);
      }
      if (req.method === 'POST' && p === '/api/tanks') {
        if (!lim.hit('t:' + user.id, cfg.tankPerHour, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429);
        const b = await readBody(req); return json(res, 200, L.createTank(db, user, b.name));
      }
      if (req.method === 'POST' && (p === '/api/join/preview' || p === '/api/join')) {
        // an invitation code only grants the right to ask for a seat; it is rate-limited per IP and per user
        if (!lim.hit('j:' + ip(req), cfg.joinPerMin, 60e3) || !lim.hit('ju:' + user.id, cfg.joinPerMin, 60e3)) throw new L.GameError('RATE_LIMIT', 'Too many attempts. Wait a moment.', 429);
        const b = await readBody(req);
        if (p.endsWith('preview')) return json(res, 200, L.previewJoin(db, b.code));
        const r = L.joinTank(db, user, b.code);
        if (!r.already) { const snap = L.listMembers(db, r.id); broadcast(r.id, { t: 'members', members: snap }); }
        return json(res, 200, r);
      }
      if (req.method === 'GET' && p === '/api/push/key') return json(res, 200, { enabled: push.enabled, key: push.key });
      if (req.method === 'POST' && p === '/api/push/subscribe') {
        if (!push.enabled) throw new L.GameError('PUSH_OFF', 'Notifications are not set up on this server.', 400);
        if (!lim.hit('ps:' + user.id, 10, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429);
        const b = await readBody(req); if (!push.subscribe(user.id, b.subscription, b.offset)) throw new L.GameError('BAD_SUB', 'That subscription was not valid.', 400);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && p === '/api/push/unsubscribe') { push.unsubscribe(user.id, (await readBody(req)).endpoint); return json(res, 200, { ok: true }); }
      if (req.method === 'POST' && p === '/api/recovery') return json(res, 200, { key: L.newRecoveryKey(db, user) });
      if (req.method === 'POST' && p === '/api/tanks/leave') {
        const t = L.tankOf(db, user.id); const r = L.leaveTank(db, user);
        for (const w of [...(rooms.get(r.tankId) ?? [])]) if (w.userId === user.id) { w.close(); } broadcast(r.tankId, { t: 'members', members: L.listMembers(db, r.tankId) }); return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && p === '/api/tanks/code') return json(res, 200, { code: L.regenerateCode(db, user) });
      throw new L.GameError('NOT_FOUND', 'No such endpoint.', 404);
    } catch (e) {
      if (e instanceof L.GameError) return json(res, e.status, { error: e.code, message: e.message });
      console.error(e); return json(res, 500, { error: 'SERVER', message: 'Something went wrong.' });
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') { try { db.prepare('SELECT 1').get(); res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); } catch { res.writeHead(500); return res.end('db'); } }
    if (url.pathname.startsWith('/api/')) return api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (/^\/join\/[A-Za-z0-9]{0,8}$/.test(rel) || rel === '/') rel = '/index.html';      // invitation links open the app
    const file = path.normalize(path.join(staticDir, rel));
    if (!(file === staticDir || file.startsWith(staticDir + path.sep)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    return sendStatic(req, res, file);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws') return socket.destroy();
    const user = L.authUser(db, url.searchParams.get('token'));
    if (!user || !L.tankOf(db, user.id)) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, (ws) => { ws.user = user; ws.userId = user.id; wss.emit('connection', ws, req); });
  });
  wss.on('connection', (ws) => {
    const tank = L.tankOf(db, ws.userId); ws.tankId = tank.id;
    if (!rooms.has(tank.id)) rooms.set(tank.id, new Set());
    rooms.get(tank.id).add(ws); L.touch(db, ws.userId);
    send(ws, { t: 'snapshot', ...L.snapshot(db, ws.user, online(tank.id)) });
    broadcast(tank.id, { t: 'presence', online: online(tank.id) });
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      try {
        if (m.t === 'ping') return send(ws, { t: 'pong' });
        if (m.t === 'nudge') {
          const to = String(m.to ?? ''), mine = L.tankOf(db, ws.userId), theirs = to && L.tankOf(db, to);
          if (!mine || !theirs || mine.id !== theirs.id || to === ws.userId) return send(ws, { t: 'nudged', ok: false, reason: 'NOT_A_FRIEND' });
          if (!lim.hit(`n:${ws.userId}:${to}`, 1, 2 * 3600e3)) return send(ws, { t: 'nudged', ok: false, reason: 'TOO_SOON' });
          const { w } = L.loadWorld(db, mine.id); const why = w.hunger > 0.5 ? 'feed' : w.glass > 0.5 ? 'glass' : w.water < 0.6 ? 'water' : null;
          if (!why) { lim.h.delete(`n:${ws.userId}:${to}`); return send(ws, { t: 'nudged', ok: false, reason: 'NOTHING_NEEDED' }); }
          const there = [...(rooms.get(mine.id) ?? [])].filter((o) => o.userId === to);
          for (const o of there) send(o, { t: 'nudge', from: ws.user.name, why });
          if (!there.length) push.notify(to, `${ws.user.name} says ${({ feed: 'the fish are hungry', glass: 'the glass needs a wipe', water: 'the water needs changing' })[why]}`).catch(() => {});
          return send(ws, { t: 'nudged', ok: true });
        }
        if (m.t === 'chat') {
          if (!lim.hit('c:' + ws.userId, 6, 10e3)) return send(ws, { t: 'error', code: 'RATE_LIMIT' });
          const { tankId, msg } = L.addMessage(db, ws.user, m.text);
          return broadcast(tankId, { t: 'chat', msg });
        }
        if (L.ACTIONS.has(m.t)) {
          if (!lim.hit('a:' + ws.userId, 30, 10e3)) return send(ws, { t: 'ack', idem: m.idem, ok: false, reason: 'RATE_LIMIT' });
          const { t: type, idem, ...rest } = m;
          const r = L.act(db, ws.user, { t: type, ...rest }, { idem, dev: !!process.env.DEV });
          send(ws, { t: 'ack', idem, ok: r.ok, reason: r.reason, dup: !!r.dup, applied: r.applied !== false, delta: r.delta ?? 0, ids: r.ids, id: r.id });
          if (r.ok && !r.dup) {
            if (type === 'feed' && r.applied !== false) broadcast(ws.tankId, { t: 'feed', by: ws.userId, x: Number.isFinite(m.x) ? Math.max(-4, Math.min(4, m.x)) : 0 });
            broadcast(ws.tankId, { t: 'state', tank: L.publicTank(r.world), by: ws.userId });
            for (const e of r.events) broadcast(ws.tankId, { t: 'event', ...e });
            if (type === 'bottle' && !r.dup && m.to && !online(ws.tankId).includes(m.to)) push.notify(String(m.to), `${ws.user.name} sent you a bottle`).catch(() => {});
          } else if (!r.ok) send(ws, { t: 'state', tank: L.publicTank(r.world) });
        }
      } catch (e) { if (e instanceof L.GameError) send(ws, { t: 'error', code: e.code, message: e.message }); else console.error(e); }
    });
    ws.on('close', () => { const r = rooms.get(ws.tankId); r?.delete(ws); try { L.touch(db, ws.userId); } catch { /* server shutting down */ } if (r && !r.size) rooms.delete(ws.tankId); else broadcast(ws.tankId, { t: 'presence', online: online(ws.tankId) }); });
  });
  const sweep = setInterval(() => lim.sweep(), 600e3); sweep.unref();
  // a rolling copy of the whole database next to it, so a bad deploy or a corrupted write is never the end of anyone's tank
  const backup = () => { if (dbPath === ':memory:') return; const tmp = dbPath + '.backup.tmp'; try { fs.rmSync(tmp, { force: true }); db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`); fs.renameSync(tmp, dbPath + '.backup'); } catch (e) { console.error('backup failed', e.message); } };
  const firstBackup = setTimeout(backup, 60e3), backups = setInterval(backup, 6 * 3600e3); firstBackup.unref(); backups.unref();
  // tanks nobody has open still move on: tell the people who opted in when something worth seeing happens (visitor, arrival, hatch)
  const pushSweep = async (now = Date.now()) => {
    if (!push.enabled) return;
    const tanks = db.prepare('SELECT DISTINCT m.tank_id id FROM members m JOIN push_subs p ON p.user_id = m.user_id').all();
    for (const { id } of tanks) {
      if ((rooms.get(id)?.size ?? 0) > 0) continue;                       // someone is watching live; they already see it
      try {
        const r = L.tickTank(db, id, now), hit = r.events.find((e) => e.warn) ?? r.events.find((e) => e.visitor) ?? r.events.find((e) => e.arrival);
        if (!hit) continue;
        for (const m of L.listMembers(db, id)) await push.notify(m.id, hit.visitor ? 'A rare visitor is in your tank' : (hit.toast ?? 'Something happened in your tank'), { now });
      } catch (e) { console.error('push sweep failed', e); }
    }
  };
  const pushTimer = setInterval(() => pushSweep().catch(() => {}), +(process.env.PUSH_SWEEP_MS || 300000)); pushTimer.unref();
  // while people are connected, time passes for their tank: growth, moods and discoveries are announced to everyone
  const tick = setInterval(() => {
    for (const [tankId, set] of rooms) {
      if (!set.size) continue;
      try {
        const r = L.tickTank(db, tankId);
        if (r.events.length) { broadcast(tankId, { t: 'state', tank: L.publicTank(r.world) }); for (const e of r.events) broadcast(tankId, { t: 'event', ...e }); }
      } catch (e) { console.error('tick failed', e); }
    }
  }, +(process.env.TICK_MS || 30000)); tick.unref();
  return new Promise((ok) => server.listen(port, () => ok({
    port: server.address().port, db, backup, push, pushSweep,
    close: () => new Promise((done) => { clearInterval(sweep); clearInterval(pushTimer); clearInterval(backups); clearTimeout(firstBackup); clearInterval(tick); for (const c of wss.clients) c.terminate(); wss.close(); server.close(() => { db.close(); done(); }); }),
  })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await start({ port: +process.env.PORT || 8080, dbPath: process.env.DB || 'ourtank.db' });
  console.log(`OUR TANK listening on http://localhost:${s.port}`);
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { console.log('shutting down'); try { s.backup(); await s.close(); } finally { process.exit(0); } });
}
