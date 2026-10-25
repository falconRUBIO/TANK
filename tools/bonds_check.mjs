// Two partnered octopuses and two companion seahorses: the octopuses find each other and touch arms (a few times, not all the time),
// and every card shows the bond with its numbers; the "why" line, family row and stats fit a phone screen. Needs the solo game on 8123.
// node tools/bonds_check.mjs OUTDIR
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');      // (CI points PW_MODULE at its own playwright)
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/bonds'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); const errors = []; let fails = 0;
p.on('pageerror', (e) => errors.push(e.message));
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, x); if (!ok) fails++; };
await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(2000);
await p.evaluate(() => { const g = window.__game, s = g.state, D = 864e5, now = Date.now(); s.flags.tut = 5; s.level = 8; s.fish.length = 0; const born = now - 40 * D;
  const mk = (id, name, species, sex, seed, x = {}) => ({ id, name, species, sex, seed, born, stage: 'adult', traits: ['Calm'], happy: 0.85, health: 1, ...x });
  s.fish.push(mk('o1', 'Inky', 'octopus', 'm', 3, { partner: 'o2', partneredAt: now - 5 * D }), mk('o2', 'Miso', 'octopus', 'm', 8, { partner: 'o1', partneredAt: now - 5 * D }),
    mk('h1', 'Sunny', 'seahorse', 'm', 4, { mate: 'h2', pairedAt: now - 3 * D, log: { greets: 7 } }), mk('h2', 'Pip', 'seahorse', 'm', 11, { mate: 'h1', pairedAt: now - 3 * D }),
    mk('h3', 'Coral', 'seahorse', 'f', 12, {}), mk('h4', 'Reef', 'seahorse', 'f', 13, {}));
  s.bonds = { 'h3|h4': 1.2 * D };
  s.decor.length = 0; s.decor.push({ id: 'p1', type: 'grass', x: -2.6, z: 2.3, ry: 0 }, { id: 'p2', type: 'fern', x: 1.2, z: 2.4, ry: 0 }, { id: 'c1', type: 'coconut', x: 2.4, z: 0.4, ry: 0 });
  g.emit('state'); document.querySelectorAll('#goal,#coach,#toast,#settle,#reunion').forEach((e) => (e.style.display = 'none')); });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const F = window.__fishes, a = F.byId.get('o1'), c = F.byId.get('o2'); let near = 0, touches = 0, n = 0, minD = 1e9, thoughts = new Set(); a.pos.x = -3; c.pos.x = 3;
  for (let i = 0; i < 6 * 60 * 20; i++) { F.update(0.05, (window.__t = (window.__t ?? 0) + 0.05)); F.list.forEach((x) => x.update(0.05, Math.random, F.list)); n++;
    const d = Math.hypot(a.pos.x - c.pos.x, a.pos.z - c.pos.z); minD = Math.min(minD, d); if (d < 2.4) near++; const tw = (a.twineT ?? 0) > 0; if (tw && !a._was) touches++; a._was = tw; if (a.rs.grab?.kind === 'twine' || c.rs.grab?.kind === 'twine') window.__twF = (window.__twF ?? 0) + 1; if (a.thought) thoughts.add(a.thought);
    if (i % 2000 === 0) await new Promise((q) => setTimeout(q, 0)); }
  return { twF: window.__twF ?? 0, near: Math.round(100 * near / n), minD: +minD.toFixed(2), touches, thoughts: [...thoughts].filter((t) => /Inky|Miso/.test(t)) };
});
console.log('  six minutes:', JSON.stringify(r));
ck('the partners find each other', r.near >= 8 && r.minD < 2.2, `${r.near}% close, nearest ${r.minD}`);
ck('they touch arms, but not all the time', r.touches >= 1 && r.touches <= 6, `${r.touches} touches`);
ck('close together, they twine an arm each (the pose, not just the thought)', r.twF > 0, `${r.twF} frames`);
ck('the card says so', r.thoughts.some((t) => /arms|close to|find/.test(t)), JSON.stringify(r.thoughts));
await p.evaluate(() => { const m = document.getElementById('modal'); m?.classList.remove('on', 'party'); }); await p.waitForTimeout(400);
for (const id of ['o1', 'h1', 'h3']) {
  await p.evaluate((id) => { window.__game.profTab = 'over'; window.__focus(window.__fishes.list.indexOf(window.__fishes.byId.get(id))); }, id); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('fishpill')?.click()); await p.waitForTimeout(900);
  const c = await p.evaluate(() => { const el = document.getElementById('card'); return { text: el?.innerText ?? '', wide: el ? el.scrollWidth > el.clientWidth + 1 : true }; });
  await p.screenshot({ path: `${out}/card_${id}.png`, timeout: 90000 }).catch((e) => console.log('  (screenshot skipped: ' + String(e.message).split('\n')[0] + ')'));      // (a picture for the eye, not a check: a slow headless frame must not fail the drill)
  const want = { o1: /Partner.*Miso/, h1: /Companion.*Pip.*(7|8|9) morning dances/, h3: /Getting to know.*Reef/ }[id];
  ck(`${id} card shows the bond`, want.test(c.text.replace(/\n/g, ' ')), (() => { const t = c.text.replace(/\n/g, ' | '), i = t.search(/Partner|Companion|Getting/); return i < 0 ? t.slice(0, 160) : t.slice(i, i + 160); })());
  ck(`${id} card fits the screen`, !c.wide);
  await p.evaluate(() => window.__focus(-1)); await p.waitForTimeout(300);
}
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close(); console.log(fails ? `${fails} failed` : 'Bond checks passed'); process.exit(fails ? 1 : 0);
