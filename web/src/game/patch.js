// What changed in the shared tank since the last copy a phone got, so the server sends only that instead of the whole tank (about 100 KB in a
// tank a few weeks old, where an action usually changes a few numbers). Objects are compared key by key all the way down; arrays are sent whole
// when they differ, except the animals (t.fish), which are matched by id so one hungry fish does not resend the other twenty-eight.
// A patch is { k: value } for a changed or new key, { k: { [D]: 1 } } for a removed one, and { k: { [P]: {...} } } to go into an object.
const D = '$del', P = '$in', F = '$fish';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

function diffObj(a, b) {
  let out = null; const put = (k, v) => ((out ||= {})[k] = v);
  for (const k of Object.keys(b)) { const x = a[k], y = b[k]; if (x === undefined) { if (y !== undefined) put(k, y); continue; } if (same(x, y)) continue; if (isObj(x) && isObj(y)) { const d = diffObj(x, y); if (d) put(k, { [P]: d }); } else put(k, y); }
  for (const k of Object.keys(a)) if (b[k] === undefined && a[k] !== undefined) put(k, { [D]: 1 });
  return out;
}
// prev and next are the whole tank (the public copy the server sends); null when nothing changed
export function diffTank(prev, next) {
  const { fish: fa = [], ...ra } = prev ?? {}, { fish: fb = [], ...rb } = next ?? {}, d = diffObj(ra, rb) ?? {};
  const byId = new Map(fa.map((f) => [f.id, f])), ch = {}; let any = false;
  for (const f of fb) { const o = byId.get(f.id); if (!o) { ch[f.id] = f; any = true; continue; } const x = diffObj(o, f); if (x) { ch[f.id] = { [P]: x }; any = true; } }
  const order = fb.map((f) => f.id), sameOrder = order.length === fa.length && order.every((id, i) => fa[i].id === id);
  if (any || !sameOrder) d[F] = { order, ch };
  return Object.keys(d).length ? d : null;
}
function applyObj(a, d) {
  const out = { ...a };
  for (const [k, v] of Object.entries(d)) { if (isObj(v) && v[D] === 1 && Object.keys(v).length === 1) delete out[k]; else if (isObj(v) && v[P] && Object.keys(v).length === 1) out[k] = applyObj(isObj(a[k]) ? a[k] : {}, v[P]); else out[k] = v; }
  return out;
}
// a new tank from the old one and a patch (the old one is not changed; untouched parts are shared)
export function applyTank(prev, d) {
  const { [F]: fp, ...rest } = d ?? {}, out = applyObj(prev ?? {}, rest);
  if (fp) { const byId = new Map((prev?.fish ?? []).map((f) => [f.id, f])); out.fish = fp.order.map((id) => { const c = fp.ch[id]; return c === undefined ? byId.get(id) : isObj(c) && c[P] && Object.keys(c).length === 1 ? applyObj(byId.get(id) ?? {}, c[P]) : c; }).filter(Boolean); }
  return out;
}
