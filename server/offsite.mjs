// Keeps a copy of the whole database somewhere that survives a redeploy, for hosts whose own disk is wiped (Render's free plan, for one).
// Any S3-compatible bucket works: Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3. Off unless S3_ENDPOINT, S3_BUCKET, S3_KEY and S3_SECRET are set.
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

// How often a changed database is sent out. Every copy is the whole database going out over the host's metered bandwidth (a free Render plan
// has 5 GB a month), and a tank changes every few minutes even with nobody playing, so the copy goes at most every 3 hours, plus at once when
// the server stops or redeploys (nothing is lost then), and soon after something big (a tank made or joined, an octopus chosen), at most every 30 minutes.
export const BACKUP_GAP = 3 * 3600e3, URGENT_GAP = 30 * 60e3, DATED_GAP = 20 * 3600e3;
// With a kept base copy (see "Only what changed" below), what goes out is usually just what changed since the base, a few kilobytes a tank, so it
// can go every hour. A whole new base goes when the changes have grown to a third of the base's size, or every three days.
export const DELTA_GAP = 3600e3, BASE_MAX_AGE = 3 * 864e5, BASE_RATIO = 1 / 3;
const gz = (b) => zlib.gzipSync(b), gunzipMaybe = (b) => (b && b.length > 2 && b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b);      // (copies sent before compression are read as they are)
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'), hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

// AWS Signature Version 4 (checked against Amazon's published example in the tests)
export function signV4({ method, host, path, query = '', headers, payloadHash, amzDate, region, accessKey, secret, service = 's3' }) {
  const all = { host, ...headers }, names = Object.keys(all).map((k) => k.toLowerCase()).sort(), low = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [method, path.split('/').map(enc).join('/'), query, names.map((n) => `${n}:${low[n]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const day = amzDate.slice(0, 8), scope = `${day}/${region}/${service}/aws4_request`, toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac('AWS4' + secret, day), region), service), 'aws4_request');
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${crypto.createHmac('sha256', key).update(toSign).digest('hex')}`;
}

export function makeOffsite({ endpoint, bucket, accessKey, secret, region = 'auto', object = 'ourtank.db' }, fetchImpl = fetch) {
  const url = new URL(endpoint);
  const call = async (method, body = null, name = object) => {
    const path = `/${bucket}/${name}`, amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), payloadHash = sha(body ?? ''), headers = { 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const authorization = signV4({ method, host: url.host, path, headers, payloadHash, amzDate, region, accessKey, secret });
    return fetchImpl(url.origin + path.split('/').map(enc).join('/'), { method, headers: { ...headers, authorization }, body, signal: AbortSignal.timeout(20000) });
  };
  return {
    describe: `${url.host}/${bucket}/${object}`, minGapMs: BACKUP_GAP,
    object,
    async put(buf, name) { const r = await call('PUT', gz(buf), name); if (!r.ok) throw new Error('offsite upload failed: HTTP ' + r.status); return r.headers?.get?.('etag') ?? null; },
    // what is there now (its ETag), or null when nothing is: lets a server notice that someone else sent a newer copy
    async stamp(name) { const r = await call('HEAD', null, name); if (r.status === 404) return null; if (!r.ok) throw new Error('offsite lookup failed: HTTP ' + r.status); return r.headers?.get?.('etag') ?? null; },
    async get(name) { const r = await call('GET', null, name); if (r.status === 404) return null; if (!r.ok) throw new Error('offsite download failed: HTTP ' + r.status); return gunzipMaybe(Buffer.from(await r.arrayBuffer())); },
  };
}

// The same kind of copy kept in a private GitHub repository (one file, compressed), for people who already have GitHub and would rather not open a bucket account.
export function makeGithubOffsite({ token, repo, branch = 'main', object = 'ourtank.db', apiBase = 'https://api.github.com' }, fetchImpl = fetch) {
  const api = (name) => `${apiBase}/repos/${repo}/contents/${name.split('/').map(enc).join('/')}`, file = (name) => name + '.gz';
  const hdr = (accept) => ({ authorization: `Bearer ${token}`, accept, 'user-agent': 'our-tank-backup', 'x-github-api-version': '2022-11-28' });
  return {
    object, describe: `github.com/${repo}`, minGapMs: BACKUP_GAP,
    async put(buf, name = object) {
      let sha; const cur = await fetchImpl(`${api(file(name))}?ref=${branch}`, { headers: hdr('application/vnd.github+json'), signal: AbortSignal.timeout(20000) });
      if (cur.ok) sha = (await cur.json()).sha; else if (cur.status !== 404) throw new Error('offsite lookup failed: HTTP ' + cur.status);
      const r = await fetchImpl(api(file(name)), { method: 'PUT', headers: { ...hdr('application/vnd.github+json'), 'content-type': 'application/json' }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ message: 'tank backup', branch, content: zlib.gzipSync(buf).toString('base64'), ...(sha ? { sha } : {}) }) });
      if (!r.ok) throw new Error('offsite upload failed: HTTP ' + r.status);
      try { return (await r.json())?.content?.sha ?? null; } catch { return null; }
    },
    async stamp(name = object) {
      const r = await fetchImpl(`${api(file(name))}?ref=${branch}`, { headers: hdr('application/vnd.github+json'), signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null; if (!r.ok) throw new Error('offsite lookup failed: HTTP ' + r.status); return (await r.json()).sha ?? null;
    },
    async get(name = object) {
      const r = await fetchImpl(`${api(file(name))}?ref=${branch}`, { headers: hdr('application/vnd.github.raw+json'), signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null; if (!r.ok) throw new Error('offsite download failed: HTTP ' + r.status);
      return zlib.gunzipSync(Buffer.from(await r.arrayBuffer()));
    },
  };
}

export function offsiteFromEnv(env = process.env) {
  if (env.GITHUB_BACKUP_TOKEN && env.GITHUB_BACKUP_REPO) return makeGithubOffsite({ token: env.GITHUB_BACKUP_TOKEN, repo: env.GITHUB_BACKUP_REPO, branch: env.GITHUB_BACKUP_BRANCH || 'main', apiBase: env.GITHUB_API || 'https://api.github.com', object: env.S3_OBJECT || 'ourtank.db' });
  const { S3_ENDPOINT: endpoint, S3_BUCKET: bucket, S3_KEY: accessKey, S3_SECRET: secret } = env;
  return endpoint && bucket && accessKey && secret ? makeOffsite({ endpoint, bucket, accessKey, secret, region: env.S3_REGION || 'auto', object: env.S3_OBJECT || 'ourtank.db' }) : null;
}

// A database file with no players in it (or no file at all) is a fresh start: the copy, if there is one, is better.
export function isEmptyDb(file) {
  if (!fs.existsSync(file)) return true;
  try { const d = new DatabaseSync(file, { readOnly: true }); try { return d.prepare('SELECT COUNT(*) n FROM users').get().n === 0; } finally { d.close(); } } catch { return true; }
}
const dated = (off, day) => off.object.replace(/\.db$/, '') + '-' + day + '.db';
const deltaName = (off) => off.object + '.delta';
// what is out there now: the base copy and the changes on top of it (each one's ETag, or null when it is not there)
export const stampAll = async (off) => `${await off.stamp()}|${await off.stamp(deltaName(off))}`;

// ---- Only what changed ----
// A whole database copy carries every tank, every photo and every journal line, though in a few hours only a handful of tanks change. So a
// base copy goes out now and then, and in between only the rows that differ from it (one JSON file, compressed): restoring puts the base back
// and then those rows. Rows are matched by the table's primary key (by position where a table has none, and then the whole table is sent if it
// changed). The changes carry a fingerprint of the whole database they describe, and a restore checks it before trusting them.
const BLOB = '$b', cell = (v) => (v instanceof Uint8Array ? { [BLOB]: Buffer.from(v).toString('base64') } : typeof v === 'bigint' ? Number(v) : v);
const uncell = (v) => (v && typeof v === 'object' && BLOB in v ? Buffer.from(v[BLOB], 'base64') : v), q = (n) => '"' + n.replace(/"/g, '""') + '"';
export function readDb(file) {
  const d = new DatabaseSync(file, { readOnly: true });
  try {
    const schema = d.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all().map((r) => `${r.type} ${r.name} ${r.sql}`).join('\n'), tables = {};
    for (const { name } of d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
      const info = d.prepare(`PRAGMA table_info(${q(name)})`).all(), cols = info.map((c) => c.name), pk = info.filter((c) => c.pk).sort((a, b) => a.pk - b.pk).map((c) => cols.indexOf(c.name)), rows = new Map(); let i = 0;
      for (const r of d.prepare(`SELECT * FROM ${q(name)}${pk.length ? '' : ' ORDER BY rowid'}`).all()) { const v = cols.map((c) => cell(r[c])); rows.set(pk.length ? JSON.stringify(pk.map((k) => v[k])) : String(i++), JSON.stringify(v)); }
      tables[name] = { cols, pk, rows };
    }
    return { schema, tables };
  } finally { d.close(); }
}
// the whole database's fingerprint: the same rows give the same one, however the file is laid out
export function hashDb(x) {
  const h = crypto.createHash('sha256').update(x.schema);
  for (const name of Object.keys(x.tables).sort()) { const t = x.tables[name]; h.update('\0' + name); for (const k of t.pk.length ? [...t.rows.keys()].sort() : t.rows.keys()) h.update('\n' + k + '\t' + t.rows.get(k)); }
  return h.digest('hex');
}
// the rows of `next` that differ from `base`; null when the tables themselves changed (a new column, a new table), which needs a whole new base
export function diffDb(base, next) {
  if (base.schema !== next.schema) return null;
  const out = {};
  for (const [name, n] of Object.entries(next.tables)) {
    const b = base.tables[name];
    if (!n.pk.length) { const a = [...b.rows.values()], c = [...n.rows.values()]; if (a.length !== c.length || a.some((s, i) => s !== c[i])) out[name] = { all: c.map((s) => JSON.parse(s)) }; continue; }
    const put = [], del = [];
    for (const [k, s] of n.rows) if (b.rows.get(k) !== s) put.push(JSON.parse(s));
    for (const k of b.rows.keys()) if (!n.rows.has(k)) del.push(JSON.parse(k));
    if (put.length || del.length) out[name] = { put, del };
  }
  return out;
}
export function applyDelta(file, delta) {
  const d = new DatabaseSync(file);
  try {
    d.exec('BEGIN');
    for (const [name, ch] of Object.entries(delta.tables)) {
      const info = d.prepare(`PRAGMA table_info(${q(name)})`).all(), cols = info.map((c) => c.name), pk = info.filter((c) => c.pk).sort((a, b) => a.pk - b.pk).map((c) => c.name);
      const ins = d.prepare(`INSERT OR REPLACE INTO ${q(name)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
      if (ch.all) { d.exec(`DELETE FROM ${q(name)}`); for (const r of ch.all) ins.run(...r.map(uncell)); continue; }
      const del = d.prepare(`DELETE FROM ${q(name)} WHERE ${pk.map((c) => q(c) + '=?').join(' AND ')}`);
      for (const k of ch.del) del.run(...k.map(uncell));
      for (const r of ch.put) ins.run(...r.map(uncell));
    }
    d.exec('COMMIT');
  } catch (e) { try { d.exec('ROLLBACK'); } catch { /* not started */ } throw e; } finally { d.close(); }
}
// the base copy kept on this server's disk (what the changes are measured against), and what is known about it
const readMeta = (baseFile) => { try { return baseFile && fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile + '.json', 'utf8')) : null; } catch { return null; } };
const keepBase = (baseFile, buf, meta) => { if (!baseFile) return; fs.writeFileSync(baseFile, buf); fs.writeFileSync(baseFile + '.json', JSON.stringify(meta)); };
const dropBase = (baseFile) => { if (baseFile) for (const x of ['', '.json']) fs.rmSync(baseFile + x, { force: true }); };
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
// Puts the newest copy that actually has players in it back. A network error is thrown (so the caller knows it could not look), "nothing there" is not.
// baseFile: where to keep the base copy, so the next copies sent can be just the changes on top of it.
export async function restoreIfEmpty(off, file, log = console.log, { baseFile = null } = {}) {
  if (!isEmptyDb(file)) return false;
  const now = Date.now(), names = [off.object, ...Array.from({ length: 8 }, (_, i) => dated(off, dayStr(now - i * 864e5)))];      // (a dated copy is made with each base, so every few days)
  for (const name of names) {
    const buf = await off.get(name); if (!buf || buf.length < 100) continue;
    const tmp = file + '.restore.tmp'; fs.writeFileSync(tmp, buf);
    if (isEmptyDb(tmp)) { fs.rmSync(tmp, { force: true }); log(`offsite backup: ${name} has no players in it, trying an older one`); continue; }
    let note = '';
    if (name === off.object) {
      const raw = await off.get(deltaName(off)); let delta = null; try { delta = raw ? JSON.parse(raw.toString('utf8')) : null; } catch { log('offsite backup: the changes file could not be read; using the base copy alone'); }
      if (delta?.base === sha(buf)) {
        try { applyDelta(tmp, delta); if (hashDb(readDb(tmp)) !== delta.hash) throw new Error('the result does not match its fingerprint'); note = `, plus the changes up to ${new Date(delta.at).toISOString()}`; }
        catch (e) { log('offsite backup: the changes could not be applied (' + e.message + '); using the base copy alone'); fs.writeFileSync(tmp, buf); }
      } else if (delta) log('offsite backup: the changes file belongs to another base copy; using the base copy alone');
      try { keepBase(baseFile, buf, { sha: sha(buf), size: gz(buf).length, at: delta?.base === sha(buf) ? delta.baseAt ?? now : now, main: await off.stamp() }); } catch { dropBase(baseFile); }
    } else dropBase(baseFile);      // (a dated copy is not the base the changes out there are measured against: the next copy sent is a whole one)
    for (const x of ['', '-wal', '-shm']) fs.rmSync(file + x, { force: true });
    fs.renameSync(tmp, file); log(`offsite backup: restored ${buf.length} bytes from ${off.describe} (${name}${note})`); return true;
  }
  log('offsite backup: nothing to restore yet'); return false;
}
// Uploads when something changed since last time; the caller makes the consistent snapshot file.
// expect: what this server believes the copy out there is (what it restored, or what it last sent). If the copy changed behind its back,
// another server wrote it (on a redeploy the old server sends its last copy after the new one has started), so this one is the stale one:
// it never overwrites that copy, it calls onStale so the newer copy can be loaded. holdUntil: no ordinary uploads before then (the handover).
// baseFile: keep a base copy and send only the changes on top of it (see "Only what changed"); without one, every copy is whole.
export function makeUploader(off, snapshot, log = console.log, { expect, holdUntil = 0, onStale = null, baseFile = null } = {}) {
  let last = '', at = 0, err = '', lastDated = 0, blocked = false, stale = false, sent = { full: 0, delta: 0, bytes: 0 };
  const checks = expect !== undefined && typeof off.stamp === 'function', stampNow = () => (baseFile ? stampAll(off) : off.stamp());
  const fresh = async () => {
    if (!checks) return true;
    const cur = await stampNow(); if (cur === expect) return true;
    stale = true; log('offsite backup: a newer copy was sent by another server; this one will not overwrite it'); try { onStale?.(cur); } catch (e) { log('offsite backup: reload failed: ' + e.message); }
    return !stale;
  };
  return {
    block() { blocked = true; },
    adopt(cur) { expect = cur; stale = false; },      // carry on over whatever is there now
    // during the handover: has the copy out there changed since this server started?
    async check() { if (blocked || stale) return false; try { return !(await fresh()); } catch (e) { err = String(e.message); return false; } },
    // force: now, whatever (the server is stopping). urgent: something worth keeping just happened, so skip the usual gap, but still not during the handover
    async run(force = false, urgent = false) {
      if (blocked || stale) return false;
      if (!force && Date.now() < holdUntil) return false;
      if (!force && !urgent && off.minGapMs && Date.now() - at < (baseFile ? Math.min(DELTA_GAP, off.minGapMs) : off.minGapMs)) return false;
      if (urgent && !force && Date.now() - at < URGENT_GAP) return false;      // but not more than once every 30 minutes
      try {
        const file = snapshot(); if (!file) return false;
        if (isEmptyDb(file)) { log('offsite backup: the database has no players, not sending it over a good copy'); return false; }      // an empty server must never replace a real tank
        const buf = fs.readFileSync(file), next = baseFile ? readDb(file) : null, h = next ? hashDb(next) : sha(buf); if (h === last) return false;
        if (!(await fresh())) return false;
        const meta = readMeta(baseFile);
        if (meta && Date.now() - meta.at < BASE_MAX_AGE && meta.main === await off.stamp()) {      // the base out there is still this server's base: send only what changed since
          const tables = diffDb(readDb(baseFile), next), body = tables && Buffer.from(JSON.stringify({ v: 1, base: meta.sha, baseAt: meta.at, hash: h, at: Date.now(), tables }));
          const size = body && gz(body).length;
          if (body && size < meta.size * BASE_RATIO) {
            await off.put(body, deltaName(off)); last = h; at = Date.now(); err = ''; sent = { ...sent, delta: sent.delta + 1, bytes: sent.bytes + size };
            if (checks) expect = await stampNow();
            log(`offsite backup: uploaded the changes since the base copy (${size} bytes compressed; the whole copy is ${meta.size})`); return true;
          }
        }
        const got = await off.put(buf); last = h; at = Date.now(); err = ''; const size = gz(buf).length; sent = { ...sent, full: sent.full + 1, bytes: sent.bytes + size };
        if (baseFile) { try { keepBase(baseFile, buf, { sha: sha(buf), size, at, main: await off.stamp() }); } catch (e) { dropBase(baseFile); log('offsite backup: could not keep the base copy: ' + e.message); } }
        if (checks) expect = baseFile ? await stampAll(off) : got ?? await off.stamp();
        if (at - lastDated > DATED_GAP) { await off.put(buf, dated(off, dayStr(at))); lastDated = at; }                                  // a dated copy of each whole copy (at most one a day) is kept too
        log(`offsite backup: uploaded ${buf.length} bytes`); return true;
      } catch (e) { err = String(e.message); log('offsite backup failed: ' + err); return false; }
    },
    get status() { return { at, err, blocked, stale, holding: Date.now() < holdUntil, sent }; },
  };
}
