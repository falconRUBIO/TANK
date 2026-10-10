// OUR TANK server: REST (identity, create/join) + WebSocket (shared live tank) + static client.
import http from 'node:http';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db.mjs';
import * as L from './logic.mjs';
import * as R from '../web/src/game/rules.js';
import { makePush, vapidFor } from './push.mjs';
import { offsiteFromEnv, restoreIfEmpty, makeUploader } from './offsite.mjs';
import { makeAnalytics, CLIENT_EVENTS } from './analytics.mjs';

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

let offsiteInfo = () => null;      // set when the server is started from the command line with a bucket
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function dashboardHtml(st) {
  const dataSince = st.meta?.dataSince ?? '', dbPathShown = st.meta?.db ?? '';
  const row = (k, v) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`, p = st.players, tk = st.tanks;
  const series = (a) => a.length ? a.slice(-14).map((d) => `${d.day.slice(5)}: ${d.n}`).join(' · ') : 'no data yet';
  const ret = (r) => (r.pct == null ? 'not enough data' : `${r.pct}% (${r.returned} of ${r.eligible})`);
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OUR TANK developer view</title>
<style>body{font:14px -apple-system,system-ui,sans-serif;background:#0a1220;color:#dbe8f7;margin:0;padding:20px;max-width:760px;margin-inline:auto}h1{font-size:18px;letter-spacing:.1em}h2{font-size:12px;letter-spacing:.14em;color:#7e93ad;margin:26px 0 8px}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #1d2c44}td:last-child{text-align:right;font-variant-numeric:tabular-nums}p{color:#7e93ad;font-size:12px}</style>
<h1>OUR TANK · developer view</h1><p>Data since: ${esc(dataSince)} · database file: ${esc(dbPathShown)} · Notifications: ${esc(st.meta?.push ?? '')} · Time-step errors: ${esc((st.meta?.stuck ?? []).join(', ') || 'none')} · Tanks with a fish on order: ${esc(st.meta?.orders ?? 0)} · Offsite copy: ${esc(st.meta?.offsite ? (st.meta.offsite.on ? 'on' + (st.meta.offsite.at ? ', last sent ' + new Date(st.meta.offsite.at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : ', first copy not sent yet') + (st.meta.offsite.err ? ' (last error: ' + st.meta.offsite.err + ')' : '') : 'off') : 'off')} (if "data since" keeps resetting to the last deploy, the disk is not attached)</p><p>Last ${st.window.days} days from ${esc(st.window.from)} · ${st.window.events} events · random ids only, no names or message text.</p>
<h2>PLAYERS (individual)</h2><table>${row('Distinct players', p.distinctPlayers)}${row('Sessions', p.sessions)}${row('Average session', p.avgSessionSeconds + ' s')}${row('Visits per player per active day', p.visitsPerPlayerPerActiveDay)}${row('Median hours between visits', p.medianHoursBetweenVisits)}${row('Actions per session', p.actionsPerSession)}${row('Sessions with care', p.sessionsWithCarePct + '%')}${row('Sessions with fish interaction', p.sessionsWithFishInteractionPct + '%')}${row('Sessions with decoration', p.sessionsWithDecorationPct + '%')}${row('Sessions with social interaction', p.sessionsWithSocialPct + '%')}${row('Retention, day 1', ret(p.retention.day1))}${row('Retention, day 7', ret(p.retention.day7))}${row('Retention, day 30', ret(p.retention.day30))}</table>
<p>Daily active players: ${esc(series(p.dailyActive))}</p>
<h2>TANKS (shared)</h2><table>${row('Tanks in total', tk.tanksTotal)}${row('Avg active caretakers per tank per day', tk.avgActiveCaretakersPerTankDay)}${row('Tank-days with 2+ players', tk.tankDaysWithTwoOrMorePlayersPct + '%')}${row('Discoveries unlocked', tk.discoveries)}${row('Daily wishes completed', tk.dailyWishesCompleted)}${row('Friend interactions', tk.friendInteractions)}${row('Fish deaths', tk.fishDeaths)}${row('Level distribution', Object.entries(tk.levelDistribution).map(([l, n]) => `L${l}: ${n}`).join(' · ') || 'none')}</table>
<p>Active tanks per day: ${esc(series(tk.activeTanksPerDay))}</p>
<h2>MOST USED</h2><table>${st.interactions.mostUsed.map(([k, v]) => row(k, v)).join('') || row('none yet', '')}</table>
<h2>LEAST USED</h2><table>${st.interactions.leastUsed.map(([k, v]) => row(k, v)).join('')}</table>`;
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
  const db = openDb(dbPath), lim = new Limiter(), an = makeAnalytics(db); an.prune();
  const push = makePush(db, pushOpts ?? vapidFor(db));
  const cfg = { joinPerMin: 12, userPerHour: 30, tankPerHour: 8, recoverPerHour: 10, actionsPer10s: 30, ...limits };
  const rooms = new Map();                        // tankId -> Set<ws>
  const online = (tankId) => [...new Set([...(rooms.get(tankId) ?? [])].map((w) => w.userId))];
  // One phone per tank is the director: its fish positions and memories are what everyone sees. The one that has been connected longest; when it leaves, the next takes over.
  // the parts of a tank that people notice change; a tank whose key changed between checks is sent to everyone again
  const stateKeys = new Map();
  const stateKey = (w) => [w.shells, w.level, (w.fish ?? []).map((f) => f.id + f.stage).join(), (w.decor ?? []).length, w.drift?.id, (w.bottles ?? []).length, (w.orders ?? []).length, (w.eggs ?? []).length, w.visitor?.species, JSON.stringify(w.flags ?? {}), w.wishIdx, (w.floaters ?? []).length, JSON.stringify(w.style ?? {})].join('|');
  const directorOf = (tankId) => [...(rooms.get(tankId) ?? [])].sort((a, b) => (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0) || a.joinedAt - b.joinedAt)[0];
  const roles = (tankId) => { const d = directorOf(tankId); for (const w of rooms.get(tankId) ?? []) send(w, { t: 'role', director: w === d }); };
  const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const broadcast = (tankId, o) => { for (const w of rooms.get(tankId) ?? []) send(w, o); };
  const ip = (req) => req.socket.remoteAddress ?? '?';

  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const readBody = (req, limit = 8192) => new Promise((ok, no) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > limit) { no(new L.GameError('TOO_BIG', 'Request too large.', 413)); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { no(new L.GameError('BAD_JSON', 'Invalid JSON.')); } }); });
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
      if (req.method === 'POST' && p === '/api/claim') {
        if (!lim.hit('c:' + ip(req), cfg.recoverPerHour, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many attempts. Try again later.', 429);
        const b = await readBody(req);
        const r = L.claimSeat(db, b.code, b.slot, (tid, uid) => online(tid).includes(uid));
        const t = L.tankOf(db, r.userId); if (t) broadcast(t.id, { t: 'members', members: L.listMembers(db, t.id) });
        return json(res, 200, r);
      }
      const user = authed(req);
      if (!user) throw new L.GameError('UNAUTHORIZED', 'Sign in required.', 401);
      if (req.method === 'GET' && p === '/api/storage') {
        // is this tank safe from the server losing its disk? an offsite copy that has been sent, or a disk that is kept, means yes
        const o = offsiteInfo(), disk = dbPath !== ':memory:' && (dbPath.startsWith('/data/') || (!process.env.RENDER && !process.env.FLY_APP_NAME));
        const level = o?.on && o.at && !o.err ? 'safe' : o?.on ? 'waiting' : disk ? 'safe' : 'risk';
        return json(res, 200, { level, offsite: !!o?.on, disk, lastCopy: o?.at || null, error: o?.err || null });
      }
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
        const r = L.joinTank(db, user, b.code); if (!r.already) an.record(user.id, r.id, 'friend_joined');
        if (!r.already) { const snap = L.listMembers(db, r.id); broadcast(r.id, { t: 'members', members: snap }); }
        return json(res, 200, r);
      }
      if (req.method === 'POST' && p === '/api/push/test') {
        if (!push.enabled) throw new L.GameError('PUSH_OFF', 'Notifications are not set up on this server.', 400);
        if (!lim.hit('pt:' + user.id, 6, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many tests. Try again later.', 429);
        const sent = await push.notify(user.id, 'This is a test. Your tank can reach you here.', { force: true });
        return json(res, 200, { sent });
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
      if (req.method === 'GET' && p === '/api/export') { if (!lim.hit('x:' + user.id, 20, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429); res.setHeader?.('Content-Disposition', 'attachment; filename="our-tank-backup.json"'); return json(res, 200, L.exportTank(db, user)); }
      if (req.method === 'POST' && p === '/api/import') { if (!lim.hit('i:' + user.id, 5, 3600e3)) throw new L.GameError('RATE_LIMIT', 'Too many requests.', 429); return json(res, 200, L.importTank(db, user, await readBody(req, 600000))); }
      if (req.method === 'DELETE' && p === '/api/me') { const t = L.tankOf(db, user.id); const r = L.deleteUser(db, user); if (t) { for (const w of [...(rooms.get(t.id) ?? [])]) if (w.userId === user.id) w.close(); if (!r.tankGone) broadcast(t.id, { t: 'members', members: L.listMembers(db, t.id) }); } return json(res, 200, { ok: true }); }
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
    if (url.pathname === '/admin' || url.pathname === '/admin/stats') {
      const key = process.env.ADMIN_KEY ?? ''; const given = url.searchParams.get('key') ?? '';
      if (!key || given.length !== key.length || !timingSafeEqual(Buffer.from(given), Buffer.from(key))) { res.writeHead(404); return res.end('Not found'); }
      const st = an.stats(Date.now(), +url.searchParams.get('days') || 30);
      if (url.pathname === '/admin/stats') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(st, null, 1)); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); const first = db.prepare('SELECT MIN(created_at) f FROM users').get().f; return res.end(dashboardHtml({ ...st, meta: { dataSince: first ? new Date(first).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'no players yet', db: dbPath, stuck: R.timeStepErrors(), orders: db.prepare("SELECT COUNT(*) n FROM tanks WHERE world LIKE '%\"orders\":[{%'").get().n, offsite: offsiteInfo(), push: push.enabled ? `on, ${db.prepare('SELECT COUNT(*) n FROM push_subs').get().n} phone(s) subscribed` : 'off' } }));
    }
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
    ws.joinedAt = Date.now(); ws.cid = Math.random().toString(36).slice(2); rooms.get(tank.id).add(ws); L.touch(db, ws.userId);
    ws.sessionAt = Date.now(); ws.visSince = ws.sessionAt; an.record(ws.userId, tank.id, 'session_started');
    send(ws, { t: 'snapshot', ...L.snapshot(db, ws.user, online(tank.id)) });
    // catching the tank up for the newcomer can change it (growth, a reward): everyone already here must see the same tank
    { const cur = L.publicTank(L.loadWorld(db, tank.id).w); stateKeys.set(tank.id, stateKey(cur)); for (const o of rooms.get(tank.id)) if (o !== ws) send(o, { t: 'state', tank: cur }); }
    broadcast(tank.id, { t: 'presence', online: online(tank.id) }); roles(tank.id);
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      try {
        if (m.t === 'ping') return send(ws, { t: 'pong' });
        if (m.t === 'vis') { const h = !!m.hidden; if (ws.hidden !== h) { ws.hidden = h; roles(ws.tankId); } return; }
        if (m.t === 'snap') {
          if (ws !== directorOf(ws.tankId) || !Array.isArray(m.fish) || m.fish.length > 40 || !lim.hit('sn:' + ws.cid, 14, 1e3)) return;
          const n = (v, lim = 60) => (Number.isFinite(+v) ? Math.max(-lim, Math.min(lim, +v)) : 0), fish = m.fish.map((f) => ({ i: String(f.i).slice(0, 24), x: n(f.x), y: n(f.y), z: n(f.z), h: n(f.h, 7), p: n(f.p, 4), r: n(f.r, 4) }));
          for (const o of rooms.get(ws.tankId) ?? []) if (o !== ws) send(o, { t: 'snap', fish });
          return;
        }
        if (m.t === 'fx') {
          const kind = m.kind === 'water' || m.kind === 'sight' ? m.kind : null; if (!kind || !lim.hit('fx:' + ws.userId + kind, kind === 'water' ? 1 : 4, kind === 'water' ? 20e3 : 60e3)) return;
          if (kind === 'sight' && ws !== directorOf(ws.tankId)) return;
          const n = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : 0), out = { t: 'fx', kind, by: ws.userId };
          if (kind === 'sight') Object.assign(out, { what: String(m.what ?? '').slice(0, 20), dir: m.dir < 0 ? -1 : 1, y0: n(m.y0, -5, 25), z: n(m.z, -20, 5) });
          for (const o of rooms.get(ws.tankId) ?? []) if (o !== ws) send(o, out);
          return;
        }
        if (m.t === 'nudge') {
          const to = String(m.to ?? ''), mine = L.tankOf(db, ws.userId), theirs = to && L.tankOf(db, to);
          if (!mine || !theirs || mine.id !== theirs.id || to === ws.userId) return send(ws, { t: 'nudged', ok: false, reason: 'NOT_A_FRIEND' });
          if (!lim.hit(`n:${ws.userId}:${to}`, 1, 2 * 3600e3)) return send(ws, { t: 'nudged', ok: false, reason: 'TOO_SOON' });
          const { w } = L.loadWorld(db, mine.id); const why = w.hunger > 0.5 ? 'feed' : w.glass > 0.5 ? 'glass' : w.water < 0.6 ? 'water' : null;
          if (!why) { lim.h.delete(`n:${ws.userId}:${to}`); return send(ws, { t: 'nudged', ok: false, reason: 'NOTHING_NEEDED' }); }
          const there = [...(rooms.get(mine.id) ?? [])].filter((o) => o.userId === to);
          for (const o of there) send(o, { t: 'nudge', from: ws.user.name, why });
          an.record(ws.userId, mine.id, 'nudge_sent');
          if (!there.length) push.notify(to, `${ws.user.name} says ${({ feed: 'the fish are hungry', glass: 'the glass needs a wipe', water: 'the water needs changing' })[why]}`, { cap: 2 }).catch(() => {});
          return send(ws, { t: 'nudged', ok: true });
        }
        if (m.t === 'thank') {
          const to = String(m.to ?? ''), mine = L.tankOf(db, ws.userId), theirs = to && L.tankOf(db, to), ref = Number(m.ref) || 0;
          if (!mine || !theirs || mine.id !== theirs.id || to === ws.userId) return send(ws, { t: 'thanked', ok: false, reason: 'NOT_A_FRIEND', ref });
          const row = db.prepare('SELECT id,user_id,type,ts FROM activity WHERE id=? AND tank_id=?').get(ref, mine.id), PHRASE = { feed: 'feeding the fish', glass: 'cleaning the glass', water: 'changing the water', decor: 'decorating the tank', fish: 'looking after the fish', visitor: 'greeting a visitor', bottle: 'sending a bottle', gift: 'finding a gift' };
          if (!row || row.user_id !== to || !PHRASE[row.type] || Date.now() - row.ts > 24 * 3600e3) return send(ws, { t: 'thanked', ok: false, reason: 'NOTHING_TO_THANK', ref });
          if (db.prepare('SELECT 1 FROM thanks WHERE activity_id=? AND from_user=?').get(ref, ws.userId)) return send(ws, { t: 'thanked', ok: false, reason: 'ALREADY', ref });
          if (!lim.hit(`th:${ws.userId}:${to}`, 1, 10 * 60e3) || !lim.hit('th:' + ws.userId, 8, 3600e3)) return send(ws, { t: 'thanked', ok: false, reason: 'TOO_SOON', ref });
          db.prepare('INSERT INTO thanks (activity_id,from_user,ts) VALUES (?,?,?)').run(ref, ws.userId, Date.now());
          const toName = L.listMembers(db, mine.id).find((x) => x.id === to)?.name ?? 'a friend', act = L.addActivity(db, mine.id, ws.userId, 'thanks', `${ws.user.name} thanked ${toName}.`);
          an.record(ws.userId, mine.id, 'friend_thanked'); send(ws, { t: 'thanked', ok: true, ref });
          broadcast(mine.id, { t: 'event', activity: act });
          for (const o of rooms.get(mine.id) ?? []) if (o.userId === to) send(o, { t: 'thanks', from: ws.user.name, text: `${ws.user.name} appreciated you ${PHRASE[row.type]}.` });
          return;
        }
        if (m.t === 'track') {
          if (!CLIENT_EVENTS.has(m.e) || !lim.hit('tr:' + ws.userId, 60, 60e3)) return;
          const now = Date.now(); if (m.e === 'hidden') { if (ws.visSince) { ws.visMs = (ws.visMs ?? 0) + now - ws.visSince; ws.visSince = null; } return; } if (m.e === 'visible') { ws.visSince ??= now; return; }
          return an.record(ws.userId, ws.tankId, m.e);
        }
        if (m.t === 'chat') {
          if (!lim.hit('c:' + ws.userId, 6, 10e3)) return send(ws, { t: 'error', code: 'RATE_LIMIT' });
          const { tankId, msg } = L.addMessage(db, ws.user, m.text);
          return broadcast(tankId, { t: 'chat', msg });
        }
        if (L.ACTIONS.has(m.t)) {
          if (!lim.hit('a:' + ws.userId, cfg.actionsPer10s, 10e3)) return send(ws, { t: 'ack', idem: m.idem, ok: false, reason: 'RATE_LIMIT' });
          const { t: type, idem, ...rest } = m;
          if (type === 'observe' && !lim.hit('ob:' + ws.userId, 24, 60e3)) return send(ws, { t: 'ack', idem, ok: false, reason: 'RATE_LIMIT' });
          const r = L.act(db, ws.user, { t: type, ...rest }, { idem, dev: !!process.env.DEV, analytics: an });
          send(ws, { t: 'ack', idem, ok: r.ok, reason: r.reason, dup: !!r.dup, applied: r.applied !== false, delta: r.delta ?? 0, ids: r.ids, id: r.id, n: r.n, learned: r.learned, wait: r.wait });
          if (r.ok && !r.dup && type === 'observe' && r.applied === false && !r.events.length) return;      // nothing changed: say nothing to anyone
          if (r.ok && !r.dup) {
            if (type === 'feed' && r.applied !== false) broadcast(ws.tankId, { t: 'feed', by: ws.userId, x: Number.isFinite(m.x) ? Math.max(-4, Math.min(4, m.x)) : 0, food: r.food ?? 'flakes' });
            broadcast(ws.tankId, { t: 'state', tank: L.publicTank(r.world), by: ws.userId });
            for (const e of r.events) broadcast(ws.tankId, { t: 'event', ...e });
            if (type === 'bottle' && !r.dup && m.to && !online(ws.tankId).includes(m.to)) push.notify(String(m.to), `${ws.user.name} sent you a bottle`, { cap: 2 }).catch(() => {});
          } else if (!r.ok) send(ws, { t: 'state', tank: L.publicTank(r.world) });
        }
      } catch (e) { if (e instanceof L.GameError) send(ws, { t: 'error', code: e.code, message: e.message }); else console.error(e); }
    });
    ws.on('close', () => { const nowT = Date.now(); if (ws.visSince) ws.visMs = (ws.visMs ?? 0) + nowT - ws.visSince; if (ws.sessionAt) an.record(ws.userId, ws.tankId, 'session_ended', Math.round((ws.visMs ?? 0) / 1000), nowT); const r = rooms.get(ws.tankId); r?.delete(ws); try { L.touch(db, ws.userId); } catch { /* server shutting down */ } if (r && !r.size) rooms.delete(ws.tankId); else { broadcast(ws.tankId, { t: 'presence', online: online(ws.tankId) }); roles(ws.tankId); } });
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
        const r = L.tickTank(db, id, now); an.fromTick(id, r.events, now); const hit = r.events.find((e) => e.warn) ?? r.events.find((e) => e.visitor) ?? r.events.find((e) => e.puzzle) ?? r.events.find((e) => e.arrival) ?? r.events.find((e) => e.milestone || e.grew) ?? r.events.find((e) => e.found);
        if (!hit) continue;
        for (const m of L.listMembers(db, id)) await push.notify(m.id, hit.visitor ? 'A rare visitor is in your tank' : (hit.toast ?? 'Something is waiting in your tank'), { now });
      } catch (e) { console.error('push sweep failed', e); }
    }
  };
  const pushTimer = setInterval(() => pushSweep().catch(() => {}), +(process.env.PUSH_SWEEP_MS || 300000)); pushTimer.unref();
  // while people are connected, time passes for their tank: growth, moods and discoveries are announced to everyone
  const tick = setInterval(() => {
    for (const [tankId, set] of rooms) {
      if (!set.size) continue;
      try {
        const r = L.tickTank(db, tankId); an.fromTick(tankId, r.events);
        const pub = L.publicTank(r.world), key = stateKey(pub), changed = stateKeys.has(tankId) && stateKeys.get(tankId) !== key; stateKeys.set(tankId, key);
        if (r.events.length || changed) { broadcast(tankId, { t: 'state', tank: pub }); for (const e of r.events) broadcast(tankId, { t: 'event', ...e }); }
      } catch (e) { console.error('tick failed', e); }
    }
  }, +(process.env.TICK_MS || 30000)); tick.unref();
  return new Promise((ok) => server.listen(port, () => ok({
    port: server.address().port, db, backup, push, pushSweep,
    close: () => new Promise((done) => { clearInterval(sweep); clearInterval(pushTimer); clearInterval(backups); clearTimeout(firstBackup); clearInterval(tick); for (const c of wss.clients) c.terminate(); wss.close(); server.close(() => { db.close(); done(); }); }),
  })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // If a bucket is set, the whole database is copied there every few minutes and just before the server stops, and put back when the server starts with nothing.
  const off = offsiteFromEnv();
  if (off) { try { await restoreIfEmpty(off, path.resolve(process.env.DB || 'ourtank.db')); } catch (e) { console.error('offsite restore failed:', e.message); } }
  const s = await start({ port: +process.env.PORT || 8080, dbPath: process.env.DB || 'ourtank.db' });
  let uploader = null;
  if (off) { uploader = makeUploader(off, () => { s.backup(); const f = path.resolve(process.env.DB || 'ourtank.db') + '.backup'; return fs.existsSync(f) ? f : null; }); setTimeout(() => uploader.run(), 20e3).unref(); setInterval(() => uploader.run(), 5 * 60e3).unref(); console.log('offsite backup: on, ' + off.describe); }
  else if (process.env.RENDER) console.warn('No offsite backup is set (S3_ENDPOINT, S3_BUCKET, S3_KEY, S3_SECRET). Without a persistent disk or an offsite copy, every redeploy erases all tanks.');
  offsiteInfo = () => (uploader ? { on: true, ...uploader.status } : { on: false });
  console.log(`OUR TANK listening on http://localhost:${s.port}`);
  const dbFile = path.resolve(process.env.DB || 'ourtank.db'), users = s.db.prepare('SELECT COUNT(*) n, MIN(created_at) first FROM users').get();
  console.log(`database: ${dbFile} (${users.n} players${users.first ? ', oldest from ' + new Date(users.first).toISOString() : ', empty'})`);
  if (process.env.RENDER && !dbFile.startsWith('/data/')) console.warn('WARNING: the database is not on the persistent disk (/data). Tanks and recovery keys will be lost on every deploy or restart. Set DB=/data/ourtank.db and attach a disk mounted at /data.');
  else if (process.env.RENDER && !fs.existsSync('/data/.persist-check')) { try { fs.writeFileSync('/data/.persist-check', String(Date.now())); } catch { console.warn('WARNING: /data is not writable; is the disk attached?'); } }
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { console.log('shutting down'); try { s.backup(); if (uploader) await Promise.race([uploader.run(), new Promise((r) => setTimeout(r, 9000))]); await s.close(); } finally { process.exit(0); } });
}
