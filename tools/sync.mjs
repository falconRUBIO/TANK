// Two phones in one tank: do they see the same fish? PORT=8124 DB=/tmp/sync.db DEV=1 node server/server.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import * as R from '../web/src/game/rules.js';
const base = 'http://localhost:8124';
const api = async (path, body, token) => (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })).json();
const av = { skin: '#e8b890', hair: '#5a3ad0', hat: null };
const A = await api('/api/users', { name: 'Ana', avatar: av }), B = await api('/api/users', { name: 'Ben', avatar: av });
// a busy tank: ten fish of different kinds, including the octopus and a seahorse, plus decorations
const now = Date.now(), world = R.newWorld(now, 3, { empty: true }); world.flags.tut = 5; world.level = 8; world.shells = 500;
['clownfish', 'octopus', 'seahorse', 'neon', 'guppy', 'betta', 'angelfish', 'cory', 'platy', 'blue'].forEach((sp, i) => world.fish.push(R.ensureFish({ id: 'f' + (i + 1), name: 'F' + (i + 1), species: sp, seed: 3 + i, born: now - 9e8, stage: 'adult', traits: ['Curious', 'Social'], happy: 0.8, health: 1, appetite: 0.05, owner: null })));
const bk = { app: 'our-tank', tank: { name: 'Sync' }, world };
await api('/api/profile', { name: 'Ana', avatar: av }, A.token);
const tank = await api('/api/import', bk, A.token); await api('/api/join', { code: tank.code }, B.token);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const open = async (u) => { const ctx = await b.newContext({ viewport: { width: 390, height: 760 } }); await ctx.addInitScript((s) => localStorage.setItem('ourtank.session', JSON.stringify(s)), { token: u.token, userId: u.userId }); const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message)); await p.goto(base + '/?q=1&dev=1'); await p.waitForFunction(() => window.__game?.state && window.__fishes, null, { timeout: 180000 }); return p; };
const pa = await open(A); await new Promise((r) => setTimeout(r, 1500)); const pb = await open(B);
await new Promise((r) => setTimeout(r, 8000));
console.log('director A:', await pa.evaluate(() => window.__game.director), ' director B:', await pb.evaluate(() => window.__game.director));
const snap = (p) => p.evaluate(() => window.__fishes.list.map((f) => ({ id: f.fid, x: f.pos.x, y: f.pos.y, z: f.pos.z, sp: f.species.id })));
for (let i = 0; i < 5; i++) {
  const [sa, sb] = await Promise.all([snap(pa), snap(pb)]); let worst = 0;
  for (const f of sa) { const g = sb.find((o) => o.id === f.id); if (g) worst = Math.max(worst, Math.hypot(f.x - g.x, f.y - g.y, f.z - g.z)); }
  const oct = sa.find((f) => f.sp === 'octopus'), octB = sb.find((f) => f.id === oct?.id); console.log(`  octopus: A (${oct?.x.toFixed(2)}, ${oct?.y.toFixed(2)}) B (${octB?.x.toFixed(2)}, ${octB?.y.toFixed(2)})`);
  console.log(`sample ${i}: ${sa.length} / ${sb.length} fish, biggest difference ${worst.toFixed(2)} tank units`); await new Promise((r) => setTimeout(r, 3000));
}
const hash = (p) => p.evaluate(() => { const s = JSON.stringify(window.__game.state, Object.keys(window.__game.state).sort()); let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h + ' (' + s.length + ' chars)'; });
console.log('whole tank state, A:', await hash(pa), ' B:', await hash(pb));
await b.close();
