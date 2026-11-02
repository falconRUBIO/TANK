// The redesigned interface, in the real game, at iPhone sizes: a sheet pulled down by its top closes (a little pull springs back); the fish's own label
// says how hungry it is and feeds it on the spot, then says Full; Care's rows carry their meters (how fed, how clean); the Shop's savings sit in one
// slim line with the details a tap away; and nothing scrolls sideways on a small phone.   Needs the solo game on 8123.   node tools/redesign_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
for (const [W, H] of [[393, 852], [320, 640]]) {
  const p = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
  await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const g = window.__game, s = g.state; s.flags.tut = 5; s.level = 7; s.shells = 140; for (const sp of ['goldfish', 'neon']) await g.dispatch({ t: 'buyFish', species: sp, name: '' }).catch(() => {}); s.hunger = 0.5; s.glass = 0.4; s.water = 0.8; g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast']) document.getElementById(id)?.classList.remove('on'); });
  await p.waitForTimeout(2500); const tag = `${W}px:`;
  const ovf = await p.evaluate(() => ['care', 'decorate', 'friends', 'notices', 'settings'].map((t) => { window.__ui.open(t); const S = document.getElementById('sheet'); return [t, S.scrollWidth - S.clientWidth]; }).filter(([, d]) => d > 1));
  ck(`${tag} no sheet scrolls sideways`, ovf.length === 0, ovf);
  if (W === 320) { await p.close(); continue; }
  const care = await p.evaluate(() => { window.__ui.open('care'); const m = (act) => [...document.querySelectorAll(`#sheet .crow[data-act="${act}"] .vm em`)].map((e) => e.textContent); return { feed: m('feeddrawer'), up: [...document.querySelectorAll('#sheet .crow .vm em')].map((e) => e.textContent) }; });
  ck(`${tag} Care: the Feed row shows how fed, the upkeep row how clean`, care.feed.some((x) => /Fed\s*50%/.test(x)) && care.up.some((x) => /Water\s*80%/.test(x)) && care.up.some((x) => /Glass\s*60%/.test(x)), care);
  const box = await p.evaluate(() => { const r = document.getElementById('sheet').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 8, h: r.height }; });
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x, box.y + 30, { steps: 4 }); await p.waitForTimeout(400); await p.mouse.move(box.x, box.y + 40, { steps: 2 }); await p.mouse.up(); await p.waitForTimeout(700);
  ck(`${tag} a little pull on a sheet springs back`, await p.evaluate(() => document.getElementById('sheet').classList.contains('on') && !document.getElementById('sheet').style.transform));
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x, box.y + box.h * 0.5, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(900);
  ck(`${tag} pulled down past a third, it closes`, await p.evaluate(() => !document.getElementById('sheet').classList.contains('on')));
  const shop = await p.evaluate(() => { const s = window.__game.state; s.level = 7; window.__ui.open('decorate'); const f = document.querySelector('#sheet .tc-fund2'); return f ? { line: f.querySelector('.tc-fund b')?.textContent, bar: !!f.querySelector('.tc-bar i'), fold: !!f.querySelector('details.fundmore:not([open]) summary') } : null; });
  ck(`${tag} Shop: the savings are one line and a bar, the details folded a tap away`, !shop || (shop.bar && shop.fold && /Saving|adopt/.test(shop.line)), shop);
  await p.evaluate(() => { window.__ui.open('tank'); const F = window.__fishes; window.__focus(Math.max(0, F.list.findIndex((f) => f.sk === 'goldfish'))); }); await p.waitForTimeout(2500);
  const pill = await p.evaluate(() => ({ dot: document.querySelector('#fishpill .hdot')?.className, feed: !!document.querySelector('#fishpill [data-pfeed]'), h: window.__game.state.hunger }));
  ck(`${tag} the fish's label shows it is hungry and offers Feed`, /hungry/.test(pill.dot ?? '') && pill.feed, pill);
  await p.evaluate(() => document.querySelector('#fishpill [data-pfeed]')?.click()); await p.waitForTimeout(4500);
  const after = await p.evaluate(() => { const s = window.__game.state, nm = document.querySelector('#fishpill .pt b')?.textContent, r = s.fish.find((f) => f.name === nm); const own = r?.species === 'octopus' || r?.species === 'seahorse';
    return { who: nm, kind: r?.species, fedNow: Date.now() - (own ? r.fedAt ?? 0 : s.lastFed ?? 0) < 20000, full: !!document.querySelector('#fishpill .pfull'), dot: document.querySelector('#fishpill .hdot')?.className, sheet: document.getElementById('sheet').classList.contains('on') }; });      /* (whichever animal is in focus: an octopus gets its crab, the fish their flakes) */
  ck(`${tag} Feed from the label feeds that animal right there (no menu) and the label then says Full`, after.fedNow && after.full && /full/.test(after.dot ?? '') && !after.sheet, after);
  ck(`${tag} no page errors`, errors.length === 0, errors.slice(0, 3).join(' | ')); await p.close();
}
await b.close(); console.log(fails ? `${fails} failed` : 'Redesign checks passed'); process.exit(fails ? 1 : 0);
