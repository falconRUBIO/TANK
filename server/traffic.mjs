// What the server sends out, by kind and by UTC day, for the developer view. The host meters every byte that leaves (Render's free plan: 5 GB a
// month, then the service stops), so this shows how much went where, and how the month is going.
// Two kinds of numbers:
//   on the wire: what the sockets actually wrote (after compression), split into live connections and ordinary requests;
//   by kind: what each kind of message weighed before compression (live messages) or as sent (app files, backups), so the wire total for
//   live connections can be shared out between tank updates, animal positions and photos.
// Days are kept in the database (kv 'traffic'), so a restart or redeploy does not lose the month; 62 days are kept.
const DAY = 864e5, dayOf = (t) => new Date(t).toISOString().slice(0, 10);
export const KIND_OF = { state: 'Tank updates', patch: 'Tank updates', snapshot: 'Tank updates', snap: 'Animal positions', photoData: 'Photos', photo: 'Photos' };

export function makeTraffic(db, now = Date.now) {
  let days = {}; try { days = JSON.parse(db.prepare("SELECT v FROM kv WHERE k='traffic'").get()?.v ?? '{}') ?? {}; } catch { days = {}; }
  const add = (key, n) => { if (!(n > 0)) return; const d = (days[dayOf(now())] ||= {}); d[key] = (d[key] ?? 0) + n; };
  const sockets = new Set();
  const count = (s) => { const w = s.bytesWritten ?? 0, n = w - (s.__counted ?? 0); s.__counted = w; add(s.__ws ? 'wire:live' : 'wire:http', n); };
  const save = () => {
    for (const s of sockets) count(s);
    const keep = dayOf(now() - 62 * DAY); for (const k of Object.keys(days)) if (k < keep) delete days[k];
    try { db.prepare("INSERT OR REPLACE INTO kv (k,v) VALUES ('traffic',?)").run(JSON.stringify(days)); } catch { /* the database is closing */ }
  };
  return {
    // a live message about to go out (its JSON)
    message(t, len) { add('raw:' + (KIND_OF[t] ?? 'Other live messages'), len); },
    // an app file or another kind sent as it is (backups)
    sent(kind, n) { add('raw:' + kind, n); },
    // every connection the server answers: its bytes on the wire are counted as they go (live ones are marked when they upgrade)
    socket(s) { sockets.add(s); s.on('close', () => { count(s); sockets.delete(s); }); },
    live(s) { count(s); s.__ws = true; },
    save,
    // the report: per day, the wire totals and the live share by kind; the month so far and where it is heading
    report(allowance = 5 * 1024 ** 3) {
      for (const s of sockets) count(s);
      const t = now(), month = dayOf(t).slice(0, 7), dim = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate(), dayN = +dayOf(t).slice(8, 10) - 1 + (t % DAY) / DAY;
      const row = (d) => {
        const live = d['wire:live'] ?? 0, http = d['wire:http'] ?? 0, raws = Object.entries(d).filter(([k]) => k.startsWith('raw:')).map(([k, v]) => [k.slice(4), v]);
        const liveRaw = raws.filter(([k]) => Object.values(KIND_OF).includes(k) || k === 'Other live messages').reduce((a, [, v]) => a + v, 0);
        const kinds = Object.fromEntries(raws.map(([k, v]) => [k, Object.values(KIND_OF).includes(k) || k === 'Other live messages' ? (liveRaw ? Math.round((live * v) / liveRaw) : 0) : v]));
        return { wire: live + http + (d['raw:Backups'] ?? 0), live, http, kinds };
      };
      const list = Object.keys(days).sort().reverse().map((k) => ({ day: k, ...row(days[k]) }));
      const sofar = list.filter((d) => d.day.startsWith(month)).reduce((a, d) => a + d.wire, 0);
      return { days: list.slice(0, 14), month, sofar, projected: dayN > 0.5 ? Math.round((sofar / dayN) * dim) : null, allowance };
    },
  };
}
