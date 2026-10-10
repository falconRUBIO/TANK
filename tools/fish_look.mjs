// Every shop species, one at a time, side-on and close, for art review. OUT=dir node tools/fish_look.mjs [ids...]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/fishlook'; fs.mkdirSync(OUT, { recursive: true });
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['goldfish', 'neon', 'cory', 'blue', 'guppy', 'angelfish', 'platy', 'danio', 'betta', 'seahorse'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => setInterval(() => { const m = document.getElementById('modal'); if (m && m.classList.contains('on') && /^A GIFT FOR YOU|^LEVEL/.test(m.querySelector('h2')?.textContent || '')) document.getElementById('mok').click(); }, 500));
await p.goto('http://localhost:8123/?q=2&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state && window.__fishes?.list?.length, null, { timeout: 120000 }); await p.waitForTimeout(1200);
for (const id of IDS) {
  await p.evaluate(async (id) => {
    const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 8; s.fish.length = 0; s.decor.length = 0; s.giftDay = null; g.giftTried = Date.now();
    s.fish.push({ id: 'z_' + id, name: 'Z', species: id, seed: 5, born: Date.now() - 20 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.9, health: 1, appetite: 0 });
    g.emit('state'); await new Promise((r) => setTimeout(r, 1500)); for (const k of ['coach', 'goal', 'settle', 'toast', 'fishpill', 'card']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; }
    const f = window.__fishes.list.find((q) => q.fid === 'z_' + id); f.update = () => {}; f.pos.set(0, 6, 1.5); f.heading = 0; f.pitch = 0; f.roll = 0; f.vel.set(0, 0, 0); f.group.position.copy(f.pos); f.group.quaternion.set(0, 0, 0, 1); const d = Math.max(4.5, f.radius * 7.2); window.__cam = [0.2, 6.15, 1.5 + d, 0, 6, 1.5];
  }, id);
  await p.waitForTimeout(2600); await p.screenshot({ path: `${OUT}/${id}.png`, clip: { x: 0, y: 160, width: 390, height: 440 } });
}
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close();
