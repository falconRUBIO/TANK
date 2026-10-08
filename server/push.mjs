// Web Push for the few things worth a nudge: a rare visitor arrived, a fish or egg arrived, a friend nudged you or sent a bottle.
// Opt-in per phone, at most two a day per person, and never between 22:00 and 08:00 their time. Off unless VAPID keys are set.
import webpush from 'web-push';

export function makePush(db, { publicKey, privateKey, subject, sender } = {}) {
  const enabled = !!(sender || (publicKey && privateKey));
  if (!sender && enabled) webpush.setVapidDetails(subject || 'mailto:admin@example.com', publicKey, privateKey);
  const deliver = sender ?? ((sub, payload) => webpush.sendNotification(sub, payload, { TTL: 6 * 3600 }));
  const localHour = (now, offset) => Math.floor((((now / 60000 + offset) % 1440) + 1440) % 1440 / 60);
  return {
    enabled, key: enabled ? publicKey ?? null : null,
    subscribe(userId, sub, offset = 0) {
      const ep = String(sub?.endpoint ?? ''), p = String(sub?.keys?.p256dh ?? ''), a = String(sub?.keys?.auth ?? '');
      if (!/^https:\/\/.{8,480}$/.test(ep) || !p || !a || p.length > 200 || a.length > 100) return false;
      db.prepare('INSERT OR REPLACE INTO push_subs (endpoint,user_id,p256dh,auth,offset_min,created_at) VALUES (?,?,?,?,?,?)').run(ep, userId, p, a, Math.max(-840, Math.min(840, Math.round(+offset) || 0)), Date.now());
      return true;
    },
    unsubscribe(userId, endpoint) { db.prepare('DELETE FROM push_subs WHERE user_id=? AND endpoint=?').run(userId, String(endpoint ?? '')); },
    hasSubs(userId) { return !!db.prepare('SELECT 1 FROM push_subs WHERE user_id=?').get(userId); },
    // returns true when something was actually sent
    async notify(userId, body, { now = Date.now(), url = '/' } = {}) {
      if (!enabled) return false;
      const subs = db.prepare('SELECT * FROM push_subs WHERE user_id=?').all(userId); if (!subs.length) return false;
      const h = localHour(now, subs[0].offset_min); if (h < 8 || h >= 22) return false;
      if (db.prepare('SELECT COUNT(*) n FROM push_log WHERE user_id=? AND ts>?').get(userId, now - 24 * 3600e3).n >= 2) return false;
      let sent = false;
      for (const s of subs) {
        try { await deliver({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: 'OUR TANK', body: String(body).slice(0, 120), url })); sent = true; }
        catch (e) { if (e?.statusCode === 404 || e?.statusCode === 410) db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(s.endpoint); }
      }
      if (sent) { db.prepare('INSERT INTO push_log (user_id,ts) VALUES (?,?)').run(userId, now); db.prepare('DELETE FROM push_log WHERE ts<?').run(now - 3 * 24 * 3600e3); }
      return sent;
    },
  };
}
