// Things that must survive on this phone are kept in two places (ordinary storage and IndexedDB), and the browser is asked not to throw them away.
const idb = (mode, fn) => new Promise((res) => {
  try {
    const r = indexedDB.open('ourtank', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => { try { const tx = r.result.transaction('kv', mode), out = fn(tx.objectStore('kv')); tx.oncomplete = () => { r.result.close(); res(out?.result); }; tx.onerror = () => res(undefined); } catch { res(undefined); } };
    r.onerror = () => res(undefined);
  } catch { res(undefined); }
});
export const idbPut = (k, v) => idb('readwrite', (s) => s.put(v, k));
export const idbGet = (k) => idb('readonly', (s) => s.get(k));
export const askToKeep = () => { try { navigator.storage?.persist?.(); } catch { /* not supported */ } };

// A tank backup you can paste anywhere (Notes, a message to yourself): "OURTANK1:" and the compressed backup as text.
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function backupToText(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'undefined') return 'OURTANK0:' + b64(raw);
  const out = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); return 'OURTANK1:' + b64(new Uint8Array(out));
}
export async function backupFromText(text) {
  const t = String(text ?? '').replace(/\s+/g, ''), m = t.match(/OURTANK([01]):([A-Za-z0-9+/=]+)/); if (!m) throw new Error('That does not look like a tank backup.');
  const u8 = unb64(m[2]); const raw = m[1] === '1' ? new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : u8;
  return JSON.parse(new TextDecoder().decode(raw));
}
