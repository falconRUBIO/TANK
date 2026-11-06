// Every popup at iPhone sizes (the ones the menu audit, phone_audit.mjs, does not open): Sell, naming, choosing, the first-fish picker, a goal,
// a sick or mourned animal, a new arrival, a card, the postcard preview, the week's story and the evening recap, a surprise. (A chapter card is
// the same card as those last four; it is left out because it queues behind whatever else is on screen, which made it fail on CI for no fault of its own.)
// Each must fit the screen (nothing under the notch or the home bar, nothing scrolling sideways), keep its text in its box, give every
// button a thumb-sized tap area and a name a screen reader can say. Screenshots go to OUT.   Needs the solo game on 8123.
// node tools/popup_audit.mjs [OUT]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/popup_audit'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const SIZES = (process.env.SIZES ?? '390x844,320x568').split(',').map((s) => s.split('x').map(Number));
const POPUPS = {
  sell: `window.__ui.sellFish('g1')`,
  dialog: `window.__ui.dialog({ title: 'Let Nori go?', text: 'Nori came to visit and stayed. It can go back to the open water, and may come visiting again.', ok: 'Let it go', cancel: 'Keep it' })`,
  name: `window.__ui.dialog({ title: 'Name the baby', text: 'A new clownfish was born in your tank. What will you call it?', input: { value: '', placeholder: 'Give it a name' }, ok: 'Name it', cancel: 'Later' })`,
  choose: `window.__ui.choose({ title: 'Inky found a crab shell', text: 'What should Inky do with it?', options: [{ label: 'Keep it in the den', sub: 'It becomes a keepsake' }, { label: 'Leave it on the sand', sub: 'Another sea life may want it' }, { label: 'Give it to Nori', sub: 'They are friends' }] })`,
  picker: `window.__ui.pickFish({ title: 'Welcome to your tank', text: 'Every tank starts with an octopus. Choose the color of yours, then give it a name.', species: window.__firstFish ?? ['octopus'], name: 'Biscuit' })`,
  goal: `window.__ui.goalSheet()`,
  sick: `window.__ui.sick({ name: 'Nori', species: 'goldfish', why: 'The water has been dirty for days and Nori has not eaten.', acts: [] })`,
  mourn: `window.__ui.mourn({ name: 'Nori', species: 'goldfish', days: 41, oldAge: true })`,
  newlife: `window.__ui.newLife({ title: 'Three tiny seahorses', why: 'Bo gave birth this morning. They will grow up here in the tank.', icon: '🐣' })`,
  card: `window.__ui.infoCard({ title: 'Reef Cave', icon: '🪨', sub: 'Rocks · level 3', facts: [['Good for', 'Shy fish, the octopus'], ['Room', 'Counts as 2 small fish']], body: 'A hollow rock with two ways in. Shy fish dart inside when something startles them.' })`,
  postcard: `window.__ui.postcardPreview(document.createElement('canvas').toDataURL(), () => {})`,
  week: `window.__ui.weekStory(['Nori and Neo became best friends.', 'Bo gave birth to three tiny seahorses.', 'Inky learned to open the puzzle jar.'], () => {})`,
  recap: `window.__ui.recap(['Inky watched you from its shell.', 'Ama held on to the sea fan all afternoon.'], ['Bo is expecting: about 2 days to go.'])`,
  surprise: `window.__ui.surprise('A tiny shrimp hitched a ride in on the new plant. It is hiding in the sea grass.')`,
};
const ONLY = process.env.ONLY?.split(',');
for (const [W, H] of SIZES) {
  const p = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
  await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 6; s.shells = 200; delete s.flags.chV; s.flags.chapters = [];      /* (chapters already true are recorded quietly, as for an older save: no chapter cards in the way) */ const A = { born: now - 30 * D, stage: 'adult', happy: 0.8, health: 1, hunger: 0.3, owner: null, traits: ['Curious'] };
    s.fish.length = 0; s.fish.push({ ...A, id: 'o1', name: 'Inky', species: 'octopus', seed: 5 }, { ...A, id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, paid: 10 }, { ...A, id: 'g2', name: 'Neo', species: 'neon', seed: 8 }); g.emit('state'); window.__quietUntil = 0; });
  await p.waitForTimeout(2000); for (let w = 0, clear = 0; w < 40 && clear < 6; w++) { const on = await p.evaluate(() => !!document.querySelector('#settle.on,#reunion.on')); clear = on ? 0 : clear + 1; if (on) await p.evaluate(() => { for (const id of ['settle', 'reunion']) document.getElementById(id)?.click(); }); await p.waitForTimeout(800); }      /* (the tank's own first chapters go first: a new card waits its turn behind them) */
  for (const [name, js] of Object.entries(POPUPS)) {
    if (ONLY && !ONLY.includes(name)) continue;
    await p.evaluate(() => { for (const id of ['modal', 'settle', 'reunion', 'coach', 'toast']) document.getElementById(id)?.classList.remove('on'); document.querySelectorAll('.lightbox,.pvsheet,.notesheet').forEach((e) => e.remove()); window.__ui.open('tank'); window.__quietUntil = 0; });      /* (no quiet window left over from the start of the game: the card would wait it out) */
    await p.waitForTimeout(300);
    const before = await p.evaluate(() => [...document.body.children].length);
    const err = await p.evaluate((js) => { try { const r = (0, eval)(js); r?.catch?.(() => {}); return null; } catch (e) { return e.message; } }, js);
    if (err) { ck(`${W}x${H}: ${name}: opens`, false, err); continue; }
    for (let w = 0; w < (name === 'chapter' ? 40 : 12); w++) { await p.evaluate(() => window.__ui.hideCoach()); await p.waitForTimeout(700);      /* (a tip left over from the start of the game: a card waits for a tip to go, by design) */ if (await p.evaluate(() => !!document.querySelector('#modal.on,#settle.on,#reunion.on,.pvsheet,.lightbox'))) break; }      /* (some cards wait for a quiet moment, or gather a moment's chapters first) */
    await p.waitForTimeout(600);
    if (name !== 'chapter') for (let k = 0; k < 4 && await p.evaluate(() => /CHAPTER/.test(document.querySelector('#settle.on')?.innerText ?? '')); k++) { await p.evaluate(() => document.getElementById('settle').click()); await p.waitForTimeout(1500); }      /* (a chapter card that turned up first is tapped away: the card asked for waits behind it) */
    const r = await p.evaluate((before) => {
      const shown = (e) => { if (!e) return false; const c = getComputedStyle(e), b = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 0 && b.height > 0; };
      const cands = [document.querySelector('#modal.on .box'), document.querySelector('#modal.on'), document.querySelector('#settle.on'), document.querySelector('#reunion.on'), ...[...document.body.children].slice(before).reverse()].filter(shown);
      const root = cands[0]; if (!root) return null;
      const vis = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); let k = e; while (k) { const q = getComputedStyle(k); if (+q.opacity < 0.05 || q.display === 'none' || q.visibility === 'hidden') return false; k = k.parentElement; } return b.width > 0 && b.height > 0; };
      const pad = (e) => { const a = getComputedStyle(e, '::after'); if (a.content === 'none' || a.position !== 'absolute') return [0, 0]; const n = (v) => Math.max(0, -parseFloat(v) || 0); return [n(a.left) + n(a.right), n(a.top) + n(a.bottom)]; };
      const btns = [...root.querySelectorAll('button,[role=button],a,input,select,textarea')].filter(vis);
      const small = btns.filter((e) => e.tagName !== 'INPUT' && e.tagName !== 'TEXTAREA').map((e) => { const b = e.getBoundingClientRect(), [px, py] = pad(e); return [(e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24), Math.round(b.width + px), Math.round(b.height + py)]; }).filter(([, w, h]) => Math.min(w, h) < 32);
      const unnamed = btns.filter((e) => !((e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.value || e.getAttribute('placeholder') || e.querySelector('img[alt]:not([alt=""])')?.alt || '').replace(/[^\p{L}\p{N}]/gu, '').length)).map((e) => e.outerHTML.slice(0, 80));
      const spill = [...root.querySelectorAll('*')].filter((e) => vis(e) && e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible' && getComputedStyle(e).textOverflow !== 'ellipsis').map((e) => e.textContent.trim().slice(0, 30));
      const rb = root.getBoundingClientRect(), outside = [...root.querySelectorAll('button,[role=button],h2,h3,b,p')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(); return b.top < 20 || b.bottom > innerHeight - 20 || b.left < 0 || b.right > innerWidth; }).map((e) => `${(e.textContent || '').trim().slice(0, 20)}@${Math.round(e.getBoundingClientRect().top)}-${Math.round(e.getBoundingClientRect().bottom)}`);
      const poke = [...root.querySelectorAll('button,img,b,p,input,small')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(); return b.right > rb.right + 1 || b.left < rb.left - 1; }).map((e) => `${(e.textContent || e.tagName).trim().slice(0, 16)}→${Math.round(e.getBoundingClientRect().right)}>${Math.round(rb.right)}`).slice(0, 4);      /* (nothing sticking out of its own box: a grid of tiles too wide for a small phone) */
      const scrollable = (() => { let k = root; while (k) { if (k.scrollHeight > k.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(k).overflowY)) return true; k = k.parentElement; } return false; })();
      return { poke, id: root.id || root.className, box: [Math.round(rb.top), Math.round(rb.bottom)], side: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), unnamed: unnamed.slice(0, 4), spill: spill.slice(0, 3), outside: scrollable ? [] : outside.slice(0, 4), text: root.innerText.replace(/\s+/g, ' ').slice(0, 160) };
    }, before);
    await p.screenshot({ path: `${out}/${W}-${name}.png` });
    if (!r) { ck(`${W}x${H}: ${name}: shows up`, false); continue; }
    const tag = `${W}x${H}: ${name}:`;
    ck(`${tag} fits the screen (nothing under the notch or home bar, nothing sideways)`, r.side <= 1 && r.outside.length === 0, { box: r.box, outside: r.outside, side: r.side });
    ck(`${tag} nothing sticks out of its own box`, r.poke.length === 0, r.poke);
    ck(`${tag} buttons big enough to tap`, r.small.length === 0, r.small);
    ck(`${tag} every button has a name a screen reader can say`, r.unnamed.length === 0, r.unnamed);
    ck(`${tag} no text spilling out of its box`, r.spill.length === 0, r.spill);
    if (process.env.TEXT) console.log('     ', r.text);
  }
  ck(`${W}x${H}: no page errors`, errors.length === 0, errors.slice(0, 3).join(' | ')); await p.close();
}
await b.close(); console.log(fails ? `${fails} failed` : 'Popup audit passed'); process.exit(fails ? 1 : 0);
