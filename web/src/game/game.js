// One game object for the UI and the scene. Solo play runs the shared rules in the browser and saves to
// localStorage; shared tanks send the same actions to the server, which runs the same rules.
import * as R from './rules.js';

const KEY = 'ourtank.world2';
const clone = (o) => JSON.parse(JSON.stringify(o));

export class Game {
  constructor() { this.state = null; this.journal = []; this.activity = []; this.members = null; this.messages = []; this.online = []; this.you = null; this.code = null; this.tankName = 'Our Tank'; this.mode = 'local'; this.h = {}; this.waiting = new Map(); this.connected = true; }
  on(evt, fn) { (this.h[evt] ||= []).push(fn); return this; }
  emit(evt, ...a) { for (const fn of this.h[evt] || []) { try { fn(...a); } catch (e) { console.error(e); } } }
  get day() { return Math.floor((Date.now() - this.state.createdAt) / 864e5) + 1; }
  get shared() { return this.mode === 'net'; }
  get isTutOwner() { return !this.shared || (this.members?.find((m) => m.id === this.you?.userId)?.slot ?? 1) === 1; }

  // ── solo ──
  startLocal() {
    this.mode = 'local';
    let sv = null; try { sv = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* corrupt or blocked storage */ }
    if (sv?.state) { this.state = sv.state; this.journal = sv.journal || []; this.activity = sv.activity || []; }
    else { this.state = R.newWorld(Date.now(), (Math.random() * 1000) | 0, { empty: true }); this.journal = []; this.addJournal('Our tank began.'); }
    const before = this.state.shells; const ev = R.advance(this.state, Date.now()); this.consume(ev, 'You');
    if (this.state.shells !== before) this.emit('shells');
    this.tick = setInterval(() => { const e = R.advance(this.state, Date.now()); this.consume(e, 'You'); this.emit('tick'); }, 1000);
    addEventListener('pagehide', () => this.save()); setInterval(() => this.save(), 5000);
    this.emit('state');
  }
  save() { if (this.mode !== 'local') return; try { localStorage.setItem(KEY, JSON.stringify({ state: this.state, journal: this.journal.slice(-80), activity: this.activity.slice(-20) })); } catch { /* storage unavailable */ } }
  reset() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); }
  addJournal(text) { const e = { day: this.day, text, ts: Date.now() }; this.journal.push(e); this.emit('journal', e); return e; }
  consume(events, name) {
    for (const e of events) {
      if (e.journal) this.addJournal(e.journal);
      if (e.activity) { this.activity.push({ ...e.activity, text: e.activity.text, ts: Date.now(), userId: 'me' }); }
      if (e.toast) this.emit('toast', e.toast);
      if (e.noticed) this.emit('noticed', e.noticed);
      if (e.levelUp) this.emit('levelup', e.levelUp);
      if (e.puzzle) this.emit('puzzle', e.puzzle); if (e.grew) this.emit('grew', e.grew); if (e.discovery) this.emit('discovery', e.discovery);
      if (e.arrival) this.emit('arrival', e.arrival);
      if (e.placed) this.emit('placed', e.placed);
    }
  }

  // ── shared ──
  attachNet(live, { user, tank }) {
    this.mode = 'net'; this.live = live; this.you = { userId: user.id }; this.code = tank.code; this.tankName = tank.name;
    // Shared tanks are decided by the server, but the screen still has to move: countdowns tick every second, and a phone that slept (or missed
    // something due) asks for a fresh copy instead of staring at "1 min" forever.
    const tries = {}; let lastSync = Date.now(); const resync = () => { if (Date.now() - lastSync < 8000) return; lastSync = Date.now(); live.resync(); };
    this.tick = setInterval(() => {
      this.emit('tick'); const s = this.state; if (!s || document.hidden) return;
      const due = Math.min(...(s.orders ?? []).map((o) => o.arrivesAt), ...(s.eggs ?? []).map((e) => e.hatchAt), Infinity);
      if (due < Date.now() - 4000 && (tries[due] = (tries[due] ?? 0) + (Date.now() - lastSync >= 8000 ? 1 : 0)) <= 3) resync();      // a phone clock far ahead of the server must not reconnect forever
    }, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resync(); }); addEventListener('pageshow', resync); addEventListener('online', resync);
  }
  onNet(m) {
    if (m.t === 'snapshot') {
      const { id, name, code, ...w } = m.tank; this.state = w; this.tankName = name; this.code = code; this.you = m.you; this.members = m.members; this.online = m.online; this.activity = m.activity; this.messages = m.messages; this.thanked = new Set(m.thanked ?? []);
      this.journal = m.journal.map((e) => ({ day: e.day, text: e.text, ts: e.ts, userId: e.userId })); this.emit('state'); this.emit('members');
    } else if (!this.state) return;
    else if (m.t === 'state') { const { day, ...w } = m.tank; this.state = w; this.emit('state'); }
    else if (m.t === 'feed') { if (m.by !== this.you.userId) this.emit('remoteFeed', m.x, m.by, m.food); }
    else if (m.t === 'event') {
      if (m.journal) { this.journal.push({ day: m.journal.day, text: m.journal.text, ts: m.journal.ts, userId: m.journal.userId }); this.emit('journal'); }
      if (m.activity) { this.activity.push(m.activity); this.emit('remoteActivity', m.activity); }
      const mine = (m.journal?.userId ?? m.activity?.userId) === this.you.userId;
      if (m.toast && (mine || m.grew || m.discovery)) this.emit('toast', m.toast); if (m.levelUp) this.emit('levelup', m.levelUp); if (m.puzzle) this.emit('puzzle', m.puzzle); if (m.grew) this.emit('grew', m.grew); if (m.discovery) this.emit('discovery', m.discovery);
      if (m.arrival) this.emit('arrival', m.arrival); if (m.placed) this.emit('placed', m.placed);
    } else if (m.t === 'presence') { this.online = m.online; this.emit('members'); }
    else if (m.t === 'members') { this.members = m.members; this.emit('members'); }
    else if (m.t === 'chat') { this.messages.push(m.msg); this.emit('chat', m.msg); }
    else if (m.t === 'nudge') this.emit('nudged', m.from, m.why);
    else if (m.t === 'thanks') this.emit('thanks', m.text);
    else if (m.t === 'thanked') { const w = this.thankWait?.get(m.ref); this.thankWait?.delete(m.ref); if (m.ok) this.thanked?.add(m.ref); w?.(m); }
    else if (m.t === 'nudged') { const w = this.nudgeWait; this.nudgeWait = null; w?.(m); }
    else if (m.t === 'ack') { const w = this.waiting.get(m.idem); if (w) { this.waiting.delete(m.idem); w(m); } }
  }

  nudge(to) {
    if (!this.live?.connected) return Promise.resolve({ ok: false, reason: 'OFFLINE' });
    return new Promise((res) => { const t = setTimeout(() => { this.nudgeWait = null; res({ ok: false, reason: 'TIMEOUT' }); }, 6000); this.nudgeWait = (m) => { clearTimeout(t); res(m); }; this.live.send({ t: 'nudge', to }); });
  }

  thank(to, ref) {
    if (!this.live?.connected) return Promise.resolve({ ok: false, reason: 'OFFLINE' });
    return new Promise((res) => { const t = setTimeout(() => { this.thankWait?.delete(ref); res({ ok: false, reason: 'TIMEOUT' }); }, 6000); (this.thankWait ||= new Map()).set(ref, (m) => { clearTimeout(t); res(m); }); this.live.send({ t: 'thank', to, ref }); });
  }
  // what the watching phone has noticed (the server checks it, so duplicates and nonsense are harmless)
  observe(o) { return this.dispatch({ t: 'observe', ...o }).catch(() => null); }
  track(e) { try { if (this.mode === 'net' && this.live?.connected) this.live.send({ t: 'track', e }); } catch { /* ignore */ } }

  // ── actions ──
  async dispatch(action, opts = {}) {
    if (this.mode === 'local') {
      const s = this.state, snapshot = clone(s);
      const r = R.applyAction(s, action, { name: 'You', solo: true, dev: !!opts.dev || new URLSearchParams(location.search).has('dev') });
      if (!r.ok) { this.state = snapshot; return r; }
      this.consume(r.events, 'You'); this.emit('state'); this.save(); return r;
    }
    if (!this.live?.connected) return { ok: false, reason: 'OFFLINE' };
    const idem = this.live.action(action.t, (({ t, ...rest }) => rest)(action));
    return new Promise((res) => { const t = setTimeout(() => { this.waiting.delete(idem); res({ ok: false, reason: 'TIMEOUT' }); }, 8000); this.waiting.set(idem, (m) => { clearTimeout(t); res(m); }); });
  }
}
export const REASONS = { NOT_ENOUGH_SHELLS: 'Not enough shells yet.', LEVEL_TOO_LOW: 'Reach a higher tank level to unlock this.', TANK_FULL: 'The tank has no room for more fish yet. Level up to grow it.', OUT_OF_BOUNDS: 'Place it on the sand inside the tank.', TANK_CROWDED: 'The tank is full of decorations.', OFFLINE: 'You are offline. Try again in a moment.', TIMEOUT: 'That took too long. Try again.', FORBIDDEN: 'Not allowed.', BAD_NAME: 'Please type a name.', RATE_LIMIT: 'Slow down a little.', TOO_SOON: 'Not yet. Give it a little while.', ALREADY: 'You already thanked them for that.', NOTHING_TO_THANK: 'That was a while ago.', NOTHING_NEEDED: 'The tank is fine right now, nothing to nudge about.', NOT_A_FRIEND: 'They are not in this tank.' };
