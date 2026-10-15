// The nightly backup, checked: last night's copy is there, opens, and nothing has quietly gone missing since the night before.
// A tank that vanished, or an animal that was alive yesterday and is simply gone today (not passed away, not grown up and moved on), is a failure.
// node tools/backup_check.mjs [dir]      (default: ../ourtank-data; MAX_AGE_H=30)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import zlib from 'node:zlib'; import { DatabaseSync } from 'node:sqlite';
const dir = process.argv[2] || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../ourtank-data'), maxAge = +(process.env.MAX_AGE_H || 30);
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^ourtank-\d{4}-\d\d-\d\d\.db\.gz$/.test(f)).sort() : [];
ck('there are dated backups', files.length > 0, dir);
const open = (f) => { const tmp = path.join(os.tmpdir(), 'bk-' + process.pid + '-' + f.replace('.gz', '')); fs.writeFileSync(tmp, zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))); const db = new DatabaseSync(tmp, { readOnly: true });
  const tanks = new Map(); const said = {}; for (const r of db.prepare('SELECT t.code, j.text FROM journal j JOIN tanks t ON t.id = j.tank_id').all()) (said[r.code] ||= []).push(r.text);
  for (const r of db.prepare('SELECT code, world FROM tanks').all()) { let w; try { w = JSON.parse(r.world); } catch { w = null; } tanks.set(r.code, w); }
  const users = db.prepare('SELECT count(*) n FROM users').get().n; db.close(); fs.rmSync(tmp, { force: true }); return { tanks, users, said }; };
if (files.length) {
  const last = files.at(-1), day = Date.parse(last.slice(8, 18) + 'T00:00:00Z'), ageH = (Date.now() - day) / 36e5 - 24;      // a copy dated D is made during day D
  ck(`last night's backup is recent (${last})`, ageH < maxAge, `${Math.max(0, ageH).toFixed(0)} h past its day`);
  let now = null; try { now = open(last); } catch (e) { ck('it opens', false, e.message); }
  if (now) {
    ck('it opens and holds tanks', now.tanks.size > 0, `${now.tanks.size} tanks, ${now.users} players`);
    ck('every tank\'s world reads', [...now.tanks.values()].every(Boolean), [...now.tanks].filter(([, w]) => !w).map(([c]) => c).join(', '));
    if (files.length > 1) {
      const prev = open(files.at(-2)), gone = [...prev.tanks.keys()].filter((c) => !now.tanks.has(c)), lost = [];
      for (const [code, w] of prev.tanks) { const t = now.tanks.get(code); if (!w || !t) continue; const ids = new Set((t.fish ?? []).map((f) => f.id));
        for (const f of w.fish ?? []) if (!f.dead && !f.nursery && !ids.has(f.id) && !(now.said[code] ?? []).some((x) => x.includes(`${f.name} a new home`)))      /* (one found a new home is said so in the journal) */ lost.push(`${f.name} (${f.species}) in ${code}`); }
      ck(`no tank vanished since ${files.at(-2)}`, !gone.length, gone.join(', '));
      ck('no living animal vanished without a reason', !lost.length, lost.join(', '));
      const n = (m) => [...m.values()].reduce((a, w) => a + (w?.fish ?? []).filter((f) => !f.dead).length, 0);
      console.log(`  animals alive: ${n(prev.tanks)} → ${n(now.tanks)}; tanks: ${prev.tanks.size} → ${now.tanks.size}`);
    }
  }
}
console.log(fails ? `${fails} failed` : 'Backup checks passed'); process.exit(fails ? 1 : 0);
