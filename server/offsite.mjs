// Keeps a copy of the whole database somewhere that survives a redeploy, for hosts whose own disk is wiped (Render's free plan, for one).
// Any S3-compatible bucket works: Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3. Off unless S3_ENDPOINT, S3_BUCKET, S3_KEY and S3_SECRET are set.
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

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
    describe: `${url.host}/${bucket}/${object}`,
    object,
    async put(buf, name) { const r = await call('PUT', buf, name); if (!r.ok) throw new Error('offsite upload failed: HTTP ' + r.status); return r.headers?.get?.('etag') ?? null; },
    // what is there now (its ETag), or null when nothing is: lets a server notice that someone else sent a newer copy
    async stamp(name) { const r = await call('HEAD', null, name); if (r.status === 404) return null; if (!r.ok) throw new Error('offsite lookup failed: HTTP ' + r.status); return r.headers?.get?.('etag') ?? null; },
    async get(name) { const r = await call('GET', null, name); if (r.status === 404) return null; if (!r.ok) throw new Error('offsite download failed: HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); },
  };
}

// The same kind of copy kept in a private GitHub repository (one file, compressed), for people who already have GitHub and would rather not open a bucket account.
export function makeGithubOffsite({ token, repo, branch = 'main', object = 'ourtank.db', apiBase = 'https://api.github.com' }, fetchImpl = fetch) {
  const api = (name) => `${apiBase}/repos/${repo}/contents/${name.split('/').map(enc).join('/')}`, file = (name) => name + '.gz';
  const hdr = (accept) => ({ authorization: `Bearer ${token}`, accept, 'user-agent': 'our-tank-backup', 'x-github-api-version': '2022-11-28' });
  return {
    object, describe: `github.com/${repo}`, minGapMs: 25 * 60e3,
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
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
// Puts the newest copy that actually has players in it back. A network error is thrown (so the caller knows it could not look), "nothing there" is not.
export async function restoreIfEmpty(off, file, log = console.log) {
  if (!isEmptyDb(file)) return false;
  const now = Date.now(), names = [off.object, dated(off, dayStr(now)), dated(off, dayStr(now - 864e5)), dated(off, dayStr(now - 2 * 864e5))];
  for (const name of names) {
    const buf = await off.get(name); if (!buf || buf.length < 100) continue;
    const tmp = file + '.restore.tmp'; fs.writeFileSync(tmp, buf);
    if (isEmptyDb(tmp)) { fs.rmSync(tmp, { force: true }); log(`offsite backup: ${name} has no players in it, trying an older one`); continue; }
    for (const x of ['', '-wal', '-shm']) fs.rmSync(file + x, { force: true });
    fs.renameSync(tmp, file); log(`offsite backup: restored ${buf.length} bytes from ${off.describe} (${name})`); return true;
  }
  log('offsite backup: nothing to restore yet'); return false;
}
// Uploads when something changed since last time; the caller makes the consistent snapshot file.
// expect: what this server believes the copy out there is (what it restored, or what it last sent). If the copy changed behind its back,
// another server wrote it (on a redeploy the old server sends its last copy after the new one has started), so this one is the stale one:
// it never overwrites that copy, it calls onStale so the newer copy can be loaded. holdUntil: no ordinary uploads before then (the handover).
export function makeUploader(off, snapshot, log = console.log, { expect, holdUntil = 0, onStale = null } = {}) {
  let last = '', at = 0, err = '', lastDated = 0, blocked = false, stale = false;
  const checks = expect !== undefined && typeof off.stamp === 'function';
  const fresh = async () => {
    if (!checks) return true;
    const cur = await off.stamp(); if (cur === expect) return true;
    stale = true; log('offsite backup: a newer copy was sent by another server; this one will not overwrite it'); try { onStale?.(cur); } catch (e) { log('offsite backup: reload failed: ' + e.message); }
    return !stale;
  };
  return {
    block() { blocked = true; },
    adopt(cur) { expect = cur; stale = false; },      // carry on over whatever is there now
    // during the handover: has the copy out there changed since this server started?
    async check() { if (blocked || stale) return false; try { return !(await fresh()); } catch (e) { err = String(e.message); return false; } },
    async run(force = false) {
      if (blocked || stale) return false;
      if (!force && Date.now() < holdUntil) return false;
      if (!force && off.minGapMs && Date.now() - at < off.minGapMs) return false;
      try {
        const file = snapshot(); if (!file) return false;
        if (isEmptyDb(file)) { log('offsite backup: the database has no players, not sending it over a good copy'); return false; }      // an empty server must never replace a real tank
        const buf = fs.readFileSync(file), h = sha(buf); if (h === last) return false;
        if (!(await fresh())) return false;
        const got = await off.put(buf); last = h; at = Date.now(); err = '';
        if (checks) expect = got ?? await off.stamp();
        if (at - lastDated > 3600e3) { await off.put(buf, dated(off, dayStr(at))); lastDated = at; }                                  // one dated copy a day is always there too, overwritten hourly
        log(`offsite backup: uploaded ${buf.length} bytes`); return true;
      } catch (e) { err = String(e.message); log('offsite backup failed: ' + err); return false; }
    },
    get status() { return { at, err, blocked, stale, holding: Date.now() < holdUntil }; },
  };
}
