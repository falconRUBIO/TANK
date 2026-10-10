// Checks the living-together behaviour in the real scene: a bully chases a timid fish, an octopus makes small fish keep away, the card and shop explain who gets along. node tools/social.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.env.BASE || 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
let fails = 0; const ck = (n, ok, d = '') => { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (d ? ' ' + d : '')); if (!ok) fails++; };
await p.addInitScript(() => setInterval(() => { const m = document.getElementById('modal'); if (m && m.classList.contains('on') && /^A GIFT FOR YOU|^LEVEL/.test(m.querySelector('h2')?.textContent || '')) document.getElementById('mok').click(); }, 500));
await p.goto(base + '/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 });
ck('the opening picker describes each fish, not just its name', await p.evaluate(() => /\w/.test(document.getElementById('pkd')?.textContent ?? '') && document.getElementById('pkd').textContent.length > 40), await p.evaluate(() => document.getElementById('pkd')?.textContent.slice(0, 80)));
await p.click('#mok'); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const mk = (id, sp, name) => ({ id, name, species: sp, seed: 5, born: Date.now() - 5 * 864e5, stage: 'adult', traits: ['Calm'], happy: 0.8, health: 1, appetite: 0.05, owner: 'me', ownerName: 'You' });
await p.evaluate((fish) => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 6; s.shells = 300; s.fish.length = 0; s.fish.push(...fish); g.emit('state'); }, [mk('a1', 'guppy', 'Dot'), mk('a2', 'blue', 'Gem'), mk('a3', 'octopus', 'Inky'), mk('a4', 'neon', 'Nia')]);
await p.waitForTimeout(3000);
const r = await p.evaluate(() => { const F = window.__fishes, L = F.list, by = (id) => L.find((f) => f.fid === id), dot = by('a1'), gem = by('a2'), ink = by('a3'), nia = by('a4');
  dot.pos.set(0, 5, 1); gem.pos.set(0.6, 5, 1); nia.pos.set(-1.6, 1, 1); ink.pos.set(-2.4, 0.6, 1); ink.st = { s: 'crawl', t: 5, n: 0, pulse: 0 }; dot.chaseCool = 0; F.stT = 0;
  for (let i = 0; i < 6; i++) { F.stT = 0; F.socialTick(0.6); if (gem.fleeT > 0) break; }
  return { gemFlee: gem.fleeT > 0, dotChase: dot.fleeT > 0, niaFlee: nia.fleeT > 0 }; });
ck('a damselfish chases a timid gramma, which flees', r.gemFlee && r.dotChase, JSON.stringify(r));
ck('a crawling octopus makes a small fish keep its distance', r.niaFlee);
await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForTimeout(600); await p.click('[data-cat=FISH]'); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__game.state.shells = Math.max(window.__game.state.shells, 200); const c = [...document.querySelectorAll('.card')].find((x) => /Damselfish/i.test(x.textContent)); c?.click(); }); await p.waitForTimeout(800);
const det = (await p.textContent('#modal.on').catch(() => '')) || ''; await p.evaluate(() => document.getElementById('mno')?.click()); ck('the shop explains temperament and warns about clashes', /Aggressive/.test(det) && /bully|bullies/i.test(det), det.slice(0, 140));
await p.click('nav [data-tab=decorate]', { force: true }); await p.waitForTimeout(300);
await p.evaluate(() => window.__focus?.(1)); await p.waitForTimeout(900);
const card = await p.textContent('#card'); ck('a bullied fish says so on its card', /bullies Gem/i.test(card), card.replace(/\s+/g, ' ').slice(0, 160));
await p.click('nav [data-tab=care]', { force: true }); await p.waitForTimeout(700);
ck('the tank reports its harmony', /Harmony/.test(await p.textContent('#sheet')));
console.log(errors.length ? 'page errors: ' + errors.join('; ') : 'No page errors'); await b.close(); console.log(fails ? 'FAILED' : 'Social checks passed'); process.exit(fails ? 1 : 0);
