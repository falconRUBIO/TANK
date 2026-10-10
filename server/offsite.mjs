// Keeps a copy of the whole database somewhere that survives a redeploy, for hosts whose own disk is wiped (Render's free plan, for one).
// Any S3-compatible bucket works: Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3. Off unless S3_ENDPOINT, S3_BUCKET, S3_KEY and S3_SECRET are set.
import crypto from 'node:crypto';
import fs from 'node:fs';
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
    async put(buf, name) { const r = await call('PUT', buf, name); if (!r.ok) throw new Error('offsite upload failed: HTTP ' + r.status); },
    async get(name) { const r = await call('GET', null, name); if (r.status === 404) return null; if (!r.ok) throw new Error('offsite download failed: HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); },
  };
}

export function offsiteFromEnv(env = process.env) {
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
export function makeUploader(off, snapshot, log = console.log) {
  let last = '', at = 0, err = '', lastDated = 0, blocked = false;
  return {
    block() { blocked = true; },
    async run() {
      if (blocked) return false;
      try {
        const file = snapshot(); if (!file) return false;
        if (isEmptyDb(file)) { log('offsite backup: the database has no players, not sending it over a good copy'); return false; }      // an empty server must never replace a real tank
        const buf = fs.readFileSync(file), h = sha(buf); if (h === last) return false;
        await off.put(buf); last = h; at = Date.now(); err = '';
        if (at - lastDated > 3600e3) { await off.put(buf, dated(off, dayStr(at))); lastDated = at; }                                  // one dated copy a day is always there too, overwritten hourly
        log(`offsite backup: uploaded ${buf.length} bytes`); return true;
      } catch (e) { err = String(e.message); log('offsite backup failed: ' + err); return false; }
    },
    get status() { return { at, err, blocked }; },
  };
}
