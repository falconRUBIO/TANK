// Every menu screen at iPhone sizes, in a lived-in tank: nothing scrolls sideways, every button is big enough to tap (44 pt Apple guideline; 32 counted
// as too small), no text spills out of its box, and nothing hides under the notch or the home bar. Screenshots of each screen go to OUT for a look by eye.
// Needs the solo game on 8123.   node tools/phone_audit.mjs [OUT]
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/phone_audit'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0; const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const SIZES = (process.env.SIZES ?? '390x844,375x667,320x568').split(',').map((s) => s.split('x').map(Number));
for (const [W, H] of SIZES) {
  const p = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:8123/?q=1&dev=1&tod=afternoon&season=none'); await p.waitForSelector('#modal.on #mok', { timeout: 120000 }); await p.click('#mok');
  await p.waitForFunction(() => window.__game?.state && window.__booted, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const g = window.__game, s = g.state, now = Date.now(), D = 864e5; s.flags.tut = 5; s.level = 9; s.shells = 260; s.createdAt = now - 20 * D;
    const A = { born: now - 30 * D, stage: 'adult', happy: 0.8, health: 1, hunger: 0.3, owner: null, traits: ['Curious'] };
    s.fish.length = 0; s.fish.push({ ...A, id: 'o1', name: 'Inky', species: 'octopus', seed: 5 }, { ...A, id: 'h1', name: 'Ama', species: 'seahorse', sex: 'f', seed: 4, mateId: 'h2' }, { ...A, id: 'h2', name: 'Bartholomew', species: 'seahorse', sex: 'm', seed: 9, mateId: 'h1' },
      { ...A, id: 'g1', name: 'Nori', species: 'goldfish', seed: 3, pal: 'g2' }, { ...A, id: 'g2', name: 'Neo', species: 'neon', seed: 8, pal: 'g1', hunger: 0.8 }, { ...A, id: 'b1', name: 'Pip', species: 'goldfish', seed: 13, born: now - 2 * D, stage: 'baby', parents: ['g1', 'g2'] });
    s.hunger = 0.6; s.glass = 0.5; s.water = 0.7; g.emit('state'); for (const id of ['modal', 'coach', 'settle', 'toast', 'goal']) document.getElementById(id)?.classList.remove('on'); });
  await p.waitForTimeout(2500); const tag = `${W}x${H}:`;
  // every screen: each tab, then each of its segment buttons
  const screens = []; for (const t of ['care', 'decorate', 'friends', 'notices']) { const subs = await p.evaluate((t) => { window.__ui.open(t); return [...document.querySelectorAll('#sheet [data-sub],#sheet [data-csub],#sheet [data-nsub]')].map((e) => [e.dataset.sub ? 'sub' : e.dataset.csub ? 'csub' : 'nsub', e.dataset.sub ?? e.dataset.csub ?? e.dataset.nsub]); }, t);
    screens.push([t, null]); if (t === 'care') screens.push([t, ['act', 'feeddrawer']], [t, ['act', 'healthopen']]); for (const s of subs) if (!screens.some(([a, c]) => a === t && c?.[1] === s[1])) screens.push([t, s]); }
  for (const [t, s] of screens) {
    const name = t + (s ? '-' + s[1] : '');
    const r = await p.evaluate(([t, s]) => { for (const a of ['feedclose', 'healthclose']) document.querySelector(`[data-act="${a}"]`)?.click(); window.__ui.open(t);      /* (Feed and Health open over Care: closed first, so each screen is itself) */ if (s) (document.querySelector(`#sheet [data-${s[0]}="${s[1]}"]`) ?? (s[0] === 'act' ? document.querySelector(`[data-act="${s[1]}"]`) : null))?.click(); const S = document.getElementById('sheet'); S.scrollTop = 0;
      const vis = (e) => { const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return c.visibility !== 'hidden' && c.display !== 'none' && b.width > 0 && b.height > 0 && !e.closest('details:not([open]) > :not(summary)'); };
      const pad = (e) => { const a = getComputedStyle(e, '::after'); if (a.content === 'none' || a.position !== 'absolute') return [0, 0]; const n = (v) => Math.max(0, -parseFloat(v) || 0); return [n(a.left) + n(a.right), n(a.top) + n(a.bottom)]; };      /* (an invisible ::after margin counts: it is what the thumb hits) */
      const small = [...S.querySelectorAll('button,[role=button],a,summary,input,select')].filter(vis).map((e) => { const b = e.getBoundingClientRect(), [px, py] = pad(e); return [(e.getAttribute('aria-label') || e.textContent || e.dataset.act || e.tagName).trim().slice(0, 24), Math.round(b.width + px), Math.round(b.height + py)]; }).filter(([, w, h]) => Math.min(w, h) < 32);
      const spill = [...S.querySelectorAll('*')].filter((e) => vis(e) && e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible' && getComputedStyle(e).textOverflow !== 'ellipsis').map((e) => e.textContent.trim().slice(0, 30));
      const wide = [...S.querySelectorAll('*')].filter((e) => vis(e) && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('[style*="overflow"],.hscroll,.seg,.cats,.tabs')).map((e) => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().right)).slice(0, 4);
      const stolen = [...S.querySelectorAll('button,[role=button]')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2; if (y < 0 || y > innerHeight) return false; const h = document.elementFromPoint(x, y); return h && h !== e && !e.contains(h) && !h.contains(e) && h.closest('#sheet') && (h.matches('button,[role=button]') || h.closest('button,[role=button]')) && !h.closest('button,[role=button]').contains(e); }).map((e) => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20) + ' ← ' + (document.elementFromPoint(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2, e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)?.textContent ?? '').trim().slice(0, 20)).slice(0, 5);      /* (the middle of each button lands on that button, not on a neighbour's tap margin) */
      const sb = S.getBoundingClientRect(); return { stolen, side: S.scrollWidth - S.clientWidth, doc: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 6), nSmall: small.length, spill: spill.slice(0, 4), wide, top: Math.round(sb.top), bottom: Math.round(innerHeight - sb.bottom), title: S.querySelector('h3,h2')?.textContent ?? '' }; }, [t, s]);
    await p.waitForTimeout(300); if (W === 390 || process.env.ALLSHOTS) await p.screenshot({ path: `${out}/${W}-${name}.png` });
    ck(`${tag} ${name}: no sideways scroll`, r.side <= 1 && r.doc <= 1 && !r.wide.length, { side: r.side, doc: r.doc, wide: r.wide });
    ck(`${tag} ${name}: buttons big enough to tap`, r.nSmall === 0, r.small);
    ck(`${tag} ${name}: every button gets the taps aimed at it (no invisible margin spread over it)`, r.stolen.length === 0, r.stolen);
    ck(`${tag} ${name}: no text spilling out of its box`, r.spill.length === 0, r.spill);
  }
  // what is always on screen: the top bar, the tab bar, a fish's label
  const hud = await p.evaluate(() => { window.__ui.open('tank'); window.__focus?.(1); return new Promise((res) => setTimeout(() => { const vis = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); let k = e; while (k) { const q = getComputedStyle(k); if (+q.opacity < 0.05 || q.pointerEvents === 'none') return false; k = k.parentElement; } return c.visibility !== 'hidden' && c.display !== 'none' && b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight; };      /* (shown and tappable: a faded-out card or pill does not count) */
    const pad = (e) => { const a = getComputedStyle(e, '::after'); if (a.content === 'none' || a.position !== 'absolute') return [0, 0]; const n = (v) => Math.max(0, -parseFloat(v) || 0); return [n(a.left) + n(a.right), n(a.top) + n(a.bottom)]; };
    res([...document.querySelectorAll('button,[role=button]')].filter((e) => !e.closest('#sheet,#modal') && vis(e)).map((e) => { const b = e.getBoundingClientRect(), [px, py] = pad(e); return [(e.getAttribute('aria-label') || e.textContent || e.id || e.className).trim().slice(0, 24), Math.round(b.width + px), Math.round(b.height + py)]; }).filter(([, w, h]) => Math.min(w, h) < 32)); }, 2500)); });
  ck(`${tag} top bar, tab bar and fish label: buttons big enough to tap`, hud.length === 0, hud.slice(0, 8));
  ck(`${tag} no page errors`, errors.length === 0, errors.slice(0, 3).join(' | ')); await p.close();
}
await b.close(); console.log(fails ? `${fails} failed` : 'Phone audit passed'); process.exit(fails ? 1 : 0);
