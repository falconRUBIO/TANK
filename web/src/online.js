// Client networking + onboarding (create / join a tank). Falls back to offline play if no server answers.
import { drawAvatar } from './people.js';
import { lookEditor } from './lookeditor.js';
import { randomAvatar } from './game/avatar.js';
import { idbPut, idbGet, backupFromText } from './keep.js';

const KEY = 'ourtank.session';
const qs = new URLSearchParams(location.search);
export const base = qs.get('api') || (location.protocol.startsWith('http') ? location.origin : '');
// The sign-in is kept in two places (storage and a long-lived cookie) so losing one does not lose the tank.
const ck = () => { try { const m = document.cookie.match(/(?:^|; )ourtank_s=([^;]+)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch { return null; } };
const load = () => { let a = null; try { a = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* none */ } return a?.token ? a : ck(); };
const store = (o) => {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* storage unavailable */ }
  idbPut('ourtank.session', { token: o.token, userId: o.userId, recoveryKey: o.recoveryKey, named: o.named });
  try { document.cookie = 'ourtank_s=' + encodeURIComponent(JSON.stringify({ token: o.token, userId: o.userId, recoveryKey: o.recoveryKey, named: o.named })) + '; max-age=31536000; path=/; samesite=lax' + (location.protocol === 'https:' ? '; secure' : ''); } catch { /* cookies unavailable */ }
};
let session = load(); if (session?.token) store(session);

export async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(session?.token ? { authorization: 'Bearer ' + session.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('json')) throw Object.assign(new Error('no server'), { offline: true });
  const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.message || j.error), { code: j.error, status: r.status });
  return j;
}
export async function serverAvailable() { try { await api('/api/me'); return true; } catch (e) { return !e.offline && !!e.status; } }

// ── realtime ──
export class Live {
  constructor(onMsg, onStatus) {
    this.onMsg = onMsg; this.onStatus = onStatus; this.pending = new Map(); this.retry = 0; this.lastMsg = Date.now(); this.open();
    // a connection can look open and be dead (a phone that changed network, a sleeping tab): ask now and then, and start over if nothing answers
    setInterval(() => { if (document.hidden || !this.connected) return; const at = Date.now(); this.send({ t: 'ping' }); setTimeout(() => { if (this.lastMsg < at && this.ws.readyState === 1 && !document.hidden) this.resync(); }, 9000); }, 20000);
  }
  open() {
    this.closed = false;
    const url = (base || location.origin).replace(/^http/, 'ws') + '/ws';
    const ws = (this.ws = new WebSocket(url, ['ourtank.' + session.token]));
    ws.onopen = () => { this.retry = 0; this.onStatus(true); for (const m of this.pending.values()) ws.send(JSON.stringify(m)); };      // replay un-acked, idempotent actions
    ws.onmessage = (e) => { this.lastMsg = Date.now(); const m = JSON.parse(e.data); if (m.t === 'ack') this.pending.delete(m.idem); this.onMsg(m); };
    ws.onclose = () => {
      this.onStatus(false);
      if (!this.closed) { if (this.retry >= 2 && !this.checking) { this.checking = true; api('/api/me').then(() => { this.checking = false; }).catch((e) => { this.checking = false; if (e.status === 401) location.reload(); }); } setTimeout(() => this.open(), Math.min(8000, 800 * 2 ** this.retry++)); }       // signed out because the server lost its data: start over, which restores the tank
    };
    ws.onerror = () => ws.close();
  }
  // A phone that was asleep can hold a dead connection that still looks open. Start a fresh one; the server answers with the current tank.
  resync() { const old = this.ws; old.onclose = null; try { old.close(); } catch { /* already closed */ } this.onStatus(false); this.retry = 0; this.open(); }
  action(t, extra = {}) { const m = { t, idem: crypto.randomUUID().slice(0, 18), ...extra }; this.pending.set(m.idem, m); if (this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); return m.idem; }
  send(m) { if (this.ws.readyState === 1) { this.ws.send(JSON.stringify(m)); return true; } return false; }
  chat(text) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'chat', text })); }
  get connected() { return this.ws.readyState === 1; }
}

// ── onboarding ──
const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const CODE = /^[A-Za-z0-9]{6}$/;
export function runOnboarding() {
  return new Promise(async (resolve) => {
    const root = document.getElementById('welcome');
    const done = (r) => { if (r?.mode === 'net' && r.user?.id) rememberId(r.user.id); root.classList.remove('on'); setTimeout(() => (root.innerHTML = ''), 400); resolve(r); };      // who this phone is in its tank is remembered for good, for the day the server forgets
    const link = (code) => `${location.origin}/join/${code}`;
    const shareText = (code) => `Come help take care of our fish! Join my aquarium in OUR TANK. Code: ${code}`;
    const screen = (html) => { root.innerHTML = ''; const s = $(`<div class="scr">${html}</div>`); root.append(s); root.classList.add('on'); return s; };
    const avatar = randomAvatar();

    // returning player with a saved identity (also looked for in the second place it is kept)
    if (!session?.token) { const kept = await idbGet('ourtank.session'); if (kept?.token) { session = kept; store(session); } }
    if (session?.token) {
      try { const me = await api('/api/me'); if (me.tank) return done({ mode: 'net', user: me.user, tank: me.tank }); }
      catch (e) {
        if (e.offline) return done({ mode: 'local' });
        if (e.status === 401) { const healed = await healTank().catch(() => null); if (healed) return done({ mode: 'net', user: healed.user, tank: healed.tank, healed: true }); }
        session = null;
      }
    } else if (!(await serverAvailable())) return done({ mode: 'local' });

    const ensureUser = async (name) => { if (session?.token) return; const r = await api('/api/users', { name: name || 'Guest', avatar }); session = { token: r.token, userId: r.userId, recoveryKey: r.recoveryKey }; store(session); };
    const welcome = () => {
      const s = screen(`<div class="logo">🐠</div><h1>WELCOME TO<br>OUR TANK</h1><p>A little world to share.</p>
        <button class="big" data-a="create">CREATE A TANK</button><button class="big alt" data-a="join">JOIN A TANK</button><button class="lnk" data-a="solo">Play offline</button><button class="lnk" data-a="recover">I have a recovery key</button><button class="lnk" data-a="restore">Restore a backup file</button><button class="lnk" data-a="paste">Restore from pasted backup text</button>`);
      s.querySelector('[data-a=paste]').onclick = () => pasteScreen();
      s.querySelector('[data-a=restore]').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'application/json,.json'; f.onchange = async () => { try { const data = JSON.parse(await f.files[0].text()); profile('restore', null, data); } catch { welcome(); } }; f.click(); };
      s.querySelector('[data-a=recover]').onclick = () => recoverScreen();
      s.querySelector('[data-a=create]').onclick = () => profile('create'); s.querySelector('[data-a=join]').onclick = () => joinScreen();
      s.querySelector('[data-a=solo]').onclick = () => done({ mode: 'local' });
    };
    const profile = (kind, joinCode, backup = null) => {
      const s = screen(`<h2>${kind === 'create' ? 'MAKE YOUR PERSON' : kind === 'restore' ? 'RESTORE YOUR TANK' : 'WHO ARE YOU?'}</h2><p class="sub">This is how your crew will see you. You can change it later in Crew.</p>
        <div class="ap"></div><label>Your name<input id="nm" maxlength="16" placeholder="What should your friends call you?" autocomplete="off"></label>
        ${kind === 'create' ? '<label>Tank name<input id="tn" maxlength="24" value="Our Tank" autocomplete="off"></label>' : ''}
        <div class="err" id="er"></div><button class="big" id="go">${kind === 'create' ? 'CREATE' : kind === 'restore' ? 'RESTORE' : 'JOIN THE TANK'}</button><button class="lnk" id="bk">Back</button>`);
      lookEditor(s.querySelector('.ap'), avatar);
      s.querySelector('#bk').onclick = welcome;
      s.querySelector('#go').onclick = async () => {
        const name = s.querySelector('#nm').value.trim(), er = s.querySelector('#er'); if (!name) { er.textContent = 'Please choose a name.'; return; }
        try {
          if (session?.token) await api('/api/profile', { name, avatar }); else await ensureUser(name);
          if (session && !session.named) { await api('/api/profile', { name, avatar }); session.named = true; store(session); }
          if (kind === 'restore') { const t = await api('/api/import', backup); codeScreen(t); }
          else if (kind === 'create') { const t = await api('/api/tanks', { name: s.querySelector('#tn').value }); codeScreen(t); }
          else { const r = await api('/api/join', { code: joinCode, was: formerIds().filter((x) => x !== session?.userId) }); const me = await api('/api/me'); done({ mode: 'net', user: me.user, tank: me.tank, joined: r }); }
        } catch (e) { if (e.code === 'FULL') fullScreen(joinCode, lastPreview); else if (e.code === 'NOT_FOUND') joinScreen('notfound'); else er.textContent = e.message; }
      };
    };
    const pasteScreen = (err = '') => {
      const s = screen(`<h2>PASTE YOUR BACKUP</h2><p>Paste the backup text you copied from Settings. It starts with OURTANK.</p><textarea id="bt" rows="5" style="width:100%;box-sizing:border-box;border-radius:14px;padding:10px;background:#0c1626;color:#dbe8f7;border:1px solid #2a3b55;font:12px ui-monospace,Menlo,monospace" placeholder="OURTANK1:..."></textarea>
        <div class="err" id="er">${err}</div><button class="big" id="go">RESTORE</button><button class="lnk" id="bk">Back</button>`);
      s.querySelector('#bk').onclick = welcome;
      s.querySelector('#go').onclick = async () => { try { const data = await backupFromText(s.querySelector('#bt').value); profile('restore', null, data); } catch (e) { s.querySelector('#er').textContent = e.message || 'That did not work.'; } };
    };
    const recoverScreen = (err = '') => {
      const s = screen(`<h2>WELCOME BACK</h2><p>Type your recovery key: the four words you saved when you started (an older key of letters and numbers works too).</p><input id="rk" class="rk" maxlength="60" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="word word word word">
        <div class="err" id="er">${err}</div><button class="big" id="go">SIGN IN</button><button class="lnk" id="bk">Back</button>`);
      s.querySelector('#bk').onclick = welcome;
      s.querySelector('#go').onclick = async () => {
        const er = s.querySelector('#er'); er.textContent = '';
        try {
          const r = await api('/api/recover', { key: s.querySelector('#rk').value }); session = { token: r.token, userId: r.userId, recoveryKey: s.querySelector('#rk').value.trim().replace(/\s+/g, '-') }; store(session);
          const me = await api('/api/me'); if (me.tank) done({ mode: 'net', user: me.user, tank: me.tank }); else welcome();
        } catch (e) {
          // the server no longer knows this key (it lost its data) but this phone still has a copy of the tank: put it back
          if (e.code === 'BAD_KEY') { const h = await healTank().catch(() => null); if (h) return done({ mode: 'net', user: h.user, tank: h.tank, healed: true }); }
          er.textContent = e.message;
        }
      };
    };
    const codeScreen = (t) => {
      const s = screen(`<h2>YOUR TANK CODE</h2><div class="codebig">${t.code}</div><p>Share it with up to three friends. They can join in seconds.</p>
        <div class="rkbox" id="rk"><small>YOUR RECOVERY KEY · tap to copy</small><b>${session?.recoveryKey ?? ''}</b><span>Four words that sign you back in on a new phone. Keep them somewhere safe.</span></div><button class="big" id="cp">COPY CODE</button><button class="big alt" id="sh">INVITE FRIENDS</button><button class="lnk" id="en">Enter the tank →</button>`);
      s.querySelector('#rk').onclick = async () => { const k = session?.recoveryKey; if (!k) return; const sm = s.querySelector('#rk small'); try { await navigator.clipboard.writeText(k); sm.textContent = 'KEY COPIED ✓ · keep it somewhere safe'; } catch { sm.textContent = 'SELECT THE KEY AND COPY IT'; } };
      s.querySelector('#cp').onclick = async (e) => { try { await navigator.clipboard.writeText(t.code); e.target.textContent = 'COPIED ✓'; } catch { e.target.textContent = t.code; } };
      s.querySelector('#sh').onclick = async () => { const data = { title: 'OUR TANK', text: shareText(t.code), url: link(t.code) }; try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.text + ' ' + data.url); s.querySelector('#sh').textContent = 'INVITE COPIED ✓'; } } catch { /* share cancelled */ } };
      s.querySelector('#en').onclick = async () => { const me = await api('/api/me'); done({ mode: 'net', user: me.user, tank: me.tank }); };
    };
    let lastPreview = [];
    const fullScreen = (code, members = []) => {
      const s = screen(`<h2>THIS TANK IS FULL</h2><p>This aquarium already has four caretakers.${code ? ' Are you one of them?' : ''}</p>${code ? '<button class="big" id="me">I\'M ALREADY IN THIS TANK</button>' : ''}<button class="big alt" id="bk">BACK</button>`);
      s.querySelector('#bk').onclick = welcome; if (code) s.querySelector('#me').onclick = () => claimScreen(code, members);
    };
    // Lost the saved sign-in (crash, reinstall)? Pick which caretaker you are and take the seat back with the tank code.
    const claimScreen = (code, members, err = '') => {
      const s = screen(`<h2>WHO ARE YOU?</h2><p>Pick yourself to get back into the tank.</p><div class="claim"></div><div class="err" id="er">${err}</div><button class="lnk" id="rk">Use a recovery key instead</button><button class="lnk" id="bk">Back</button>`);
      const host = s.querySelector('.claim');
      members.forEach((m) => { const b = document.createElement('button'); b.className = 'big alt'; const c = document.createElement('canvas'); drawAvatar(c, m.avatar); b.append(c, Object.assign(document.createElement('span'), { textContent: ' ' + m.name }));
        b.onclick = async () => { try { const r = await api('/api/claim', { code, slot: m.slot }); session = { token: r.token, userId: r.userId }; store(session); const me = await api('/api/me'); try { session.recoveryKey = (await api('/api/recovery', {})).key; store(session); } catch { /* optional */ } done({ mode: 'net', user: me.user, tank: me.tank }); } catch (e) { claimScreen(code, members, e.message); } };
        host.append(b); });
      s.querySelector('#rk').onclick = () => recoverScreen(); s.querySelector('#bk').onclick = welcome;
    };
    const joinScreen = (err, prefill = '') => {
      const s = screen(`<h2>JOIN YOUR FRIENDS</h2><p>Enter your six-character code.</p><input id="cd" class="codein" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="······" value="${prefill}">
        <div class="err" id="er">${err === 'notfound' ? 'TANK NOT FOUND — Check the code and try again.' : ''}</div><div id="pv"></div><button class="big" id="go" disabled>FIND TANK</button><button class="lnk" id="bk">Back</button>`);
      const inp = s.querySelector('#cd'), go = s.querySelector('#go');
      inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); go.disabled = !CODE.test(inp.value); };
      inp.oninput(); s.querySelector('#bk').onclick = welcome; inp.focus();
      go.onclick = async () => {
        const er = s.querySelector('#er'); er.textContent = '';
        try {
          await ensureUser('Guest');
          const p = await api('/api/join/preview', { code: inp.value });
          lastPreview = p.members; if (p.full) return fullScreen(inp.value, p.members);
          const pv = s.querySelector('#pv'); pv.innerHTML = `<div class="pvt"><b>${p.name.replace(/[<>&]/g, '')}</b><div class="mem"></div></div>`;
          p.members.forEach((m) => { const c = document.createElement('canvas'); drawAvatar(c, m.avatar); c.title = m.name; pv.querySelector('.mem').append(c, Object.assign(document.createElement('span'), { textContent: m.name })); });
          go.textContent = 'JOIN THIS TANK'; go.onclick = () => profile('join', inp.value);
          if (prefill) { s.querySelector('h2').textContent = "YOU'RE INVITED"; const names = p.members.map((m) => m.name.replace(/[<>&]/g, '')).join(' and '); s.querySelector('p').textContent = `${names} ${p.members.length > 1 ? 'are' : 'is'} waiting in ${p.name.replace(/[<>&]/g, '')}.`; s.querySelector('#cd').style.opacity = '0.55'; }
          if (!pv.querySelector('.again')) pv.append(Object.assign(document.createElement('button'), { className: 'lnk again', textContent: "I'm already in this tank", onclick: () => claimScreen(inp.value, p.members) }));
        } catch (e) { er.textContent = e.code === 'NOT_FOUND' ? 'TANK NOT FOUND — Check the code and try again.' : e.message; }
      };
      if (prefill.length === 6) go.click();
    };
    const m = location.pathname.match(/^\/join\/([A-Za-z0-9]{6})$/);
    if (m) joinScreen('', m[1].toUpperCase()); else welcome();
  });
}
// The server forgot us (its data was lost). If this phone kept a copy of the tank, make a new account with the same name and put the tank back under its old code;
// if a friend's phone got there first, just join it. Either way nobody has to type anything.
// every id this phone has had in its tank: the server gives a healed tank's player a new one, and the old ones are how its octopus and gifts are found again
const WAS = 'ourtank.was';
export const formerIds = () => { try { const l = JSON.parse(localStorage.getItem(WAS) || '[]'); return Array.isArray(l) ? l.filter((x) => typeof x === 'string').slice(-8) : []; } catch { return []; } };
const rememberId = (id) => { if (!id) return; const l = formerIds().filter((x) => x !== id); l.push(id); try { localStorage.setItem(WAS, JSON.stringify(l.slice(-8))); } catch { /* storage unavailable */ } idbPut(WAS, l.slice(-8)); };
async function healTank() {
  let c = null; try { c = JSON.parse(localStorage.getItem('ourtank.cache') || 'null'); } catch { /* none */ }
  if (!c?.world) c = await idbGet('ourtank.cache');
  if (!c?.code || !c.world || !c.user) return null;
  rememberId(c.userId); if (session?.userId) rememberId(session.userId); const was = [...new Set([c.userId, session?.userId, ...formerIds()])].filter(Boolean);      // every id this phone has had: the server finds its octopus and gifts under any of them
  const r = await api('/api/users', { name: c.user.name || 'Guest', avatar: c.user.avatar });
  session = { token: r.token, userId: r.userId, recoveryKey: r.recoveryKey, named: true }; store(session);
  try { await api('/api/import', { app: 'our-tank', tank: { name: c.name }, world: c.world, code: c.code, heal: true, was }); }
  catch (e) { if (e.code === 'CODE_TAKEN') await api('/api/join', { code: c.code, was }); else throw e; }      // a friend's phone put it back first: this phone joins that one, and gets its own octopus and gifts back
  const me = await api('/api/me'); if (!me.tank) return null;
  try { localStorage.setItem('ourtank.cache', JSON.stringify({ ...c, userId: r.userId })); } catch { /* ignore */ }
  return me;
}
export const getSession = () => session;
// a fresh key of four words replaces the old one (the old one stops working)
export async function newRecoveryKey() { const r = await api('/api/recovery', {}); session = { ...session, recoveryKey: r.key }; store(session); return r.key; }
export async function ensureRecoveryKey() { if (session?.recoveryKey) return session.recoveryKey; const r = await api('/api/recovery', {}); session = { ...session, recoveryKey: r.key }; store(session); return r.key; }
export async function leaveTankNow() { await api('/api/tanks/leave', {}); try { localStorage.removeItem('ourtank.seen.' + session.userId); } catch { /* ignore */ } }

// ── notifications (opt in; the server only sends a couple a day) ──
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
export async function pushState() {
  const ios = /iphone|ipad/i.test(navigator.userAgent), standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return ios && !standalone ? 'install' : 'unsupported';
  try { if (!(await api('/api/push/key')).enabled) return 'unavailable'; } catch { return 'unavailable'; }
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}
export const pushTest = () => api('/api/push/test', {});
export async function pushToggle(on) {
  const reg = await navigator.serviceWorker.ready;
  if (!on) { const sub = await reg.pushManager.getSubscription(); if (sub) { await api('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } return 'off'; }
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked';
  const { key } = await api('/api/push/key'); const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  await api('/api/push/subscribe', { subscription: sub.toJSON(), offset: -new Date().getTimezoneOffset() }); return 'on';
}
