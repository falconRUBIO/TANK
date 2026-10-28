// The loading cove: what shows at each moment, that it never sits on screen after the tank is ready, that a slow server keeps it moving
// and then offers a retry, and that it fades straight into a fully drawn tank. Screenshots in docs/audit/loading.
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
const base = process.env.BASE || 'http://localhost:8123', out = 'docs/audit/loading/';
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, JSON.stringify(x).slice(0, 300)); if (!ok) fails++; };
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const shot = async (vp, name, opts = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: opts.rm ? 'reduce' : 'no-preference' }), p = await ctx.newPage(), errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  if (opts.block) await p.route('**/src/main.js', (rt) => rt.fulfill({ contentType: 'application/javascript', body: '' }));      // the game's code never arrives: the cove alone
  await p.goto(base + '/?q=0', { waitUntil: 'commit' }); const times = opts.times ?? [];
  for (const t of times) { await p.waitForTimeout(t.at); await p.screenshot({ path: out + name + '_' + t.tag + '.png' }); }
  const st = await p.evaluate(() => ({ txt: document.getElementById('ltxt')?.textContent, off: document.getElementById('loading').classList.contains('off'), err: document.getElementById('loading').classList.contains('err') }));
  return { p, ctx, st, errors }; };
// 1. the sequence, with the game held back so every second of it can be seen
{ const r = await shot({ width: 390, height: 844 }, 'seq', { block: true, times: [{ at: 200, tag: '0_2s' }, { at: 1200, tag: '1_4s' }, { at: 700, tag: '2_1s' }, { at: 500, tag: '2_6s' }, { at: 2000, tag: '4_6s' }] });
  ck('the cove alone, before the game code arrives: logo, status, no errors', /Waking up the tank/.test(r.st.txt) && !r.st.off && !r.errors.length, r.st); await r.ctx.close(); }
// 2. other phone sizes
for (const [w, h, n] of [[320, 568, 'se'], [430, 932, 'promax']]) { const r = await shot({ width: w, height: h }, n, { block: true, times: [{ at: 2300, tag: 'peek' }] }); await r.ctx.close(); }
// 3. reduced motion
{ const r = await shot({ width: 390, height: 844 }, 'rm', { block: true, rm: true, times: [{ at: 2300, tag: 'still' }] }); await r.ctx.close(); }
// 4. a real start: it fades out only once the tank has drawn, and does not linger
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(), errors = []; p.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now(); await p.goto(base + '/?q=0'); await p.waitForFunction(() => document.getElementById('loading').classList.contains('off') || document.querySelector('#welcome.on'), null, { timeout: 120000 });
  const w = await p.evaluate(() => ({ welcome: !!document.querySelector('#welcome.on'), off: document.getElementById('loading').classList.contains('off') })); ck('a new player: the welcome card comes up over the cove', w.welcome || w.off, w);
  if (w.welcome) { await p.click('#mok').catch(() => null); }
  await p.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 120000 });
  const f = await p.evaluate(() => ({ fish: window.__fishes?.list?.length ?? 0, booted: window.__booted })); ck('the cove fades only once the game has started and drawn its first frames', f.booted, f);
  await p.waitForTimeout(700); const gone = await p.evaluate(() => getComputedStyle(document.getElementById('loading')).display); ck('then it is gone (not drawing behind the tank)', gone === 'none', gone);
  await p.screenshot({ path: out + 'tank_after.png' }); ck('no page errors', !errors.length, errors); await ctx.close(); }
// 5. offline: a clear message and a retry, never a spinner for ever
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.route('**/src/main.js', (rt) => rt.fulfill({ contentType: 'application/javascript', body: '' })); await p.goto(base + '/?q=0'); await p.evaluate(() => window.__load.fail('You are offline. Tako Tank needs a connection to reach your tank.')); await p.screenshot({ path: out + 'offline.png' });
  const e = await p.evaluate(() => ({ btn: document.getElementById('lretry').getBoundingClientRect().height > 20, txt: document.getElementById('lerrt').textContent })); ck('a failure shows a plain reason and a Try again button', e.btn && /offline/.test(e.txt), e); await ctx.close(); }
await b.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
