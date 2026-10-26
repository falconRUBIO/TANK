// Daily Discovery on two phones: the card comes up by itself once a day, 'Not now' leaves it on Today, the answer stays private until you
// answer, the reveal shows everyone's guesses, and a friend's later answer appears on an open card by itself. The Field Guide shows learned
// and happened. Starts its own server with ONE TEST FIXTURE question (not real content). node tools/discovery_check.mjs
const { chromium } = await import(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs');
import { start } from '../server/server.mjs';
const today = new Date().toISOString().slice(0, 10), U = 'https://example.org/fixture/escape';
const BANK = [{ id: 'dd-9001', fact: 'cephalopods.fixture-octopus.squeeze', q: 'TEST FIXTURE: what limits the smallest gap an octopus can squeeze through?', choices: ['Its beak', 'Its eyes', 'Its suckers'], answer: 0,
  explain: 'TEST FIXTURE explanation: the hard beak is the one part that cannot squeeze.', category: 'cephalopods', difficulty: 'medium', behavior: 'escape', source: { url: U, publisher: 'Fixture Aquarium' }, status: 'verified', verifiedAt: today,
  evidence: 'Fixture evidence sentence for the browser drill.', verification: { url: U, quoteFound: true, checkedAt: today }, review1: { by: 'ai:first', at: today, ok: true, answerMatchesSource: true, explanationMatchesSource: true }, review2: { by: 'ai:second', at: today, ok: true, quoteSupportsAnswer: true, distractorsWrong: true, unambiguous: true } }];
const S = await start({ port: 0, dbPath: ':memory:', limits: { userPerHour: 500, tankPerHour: 500, joinPerMin: 500, actionsPer10s: 500 }, discovery: { bank: BANK } }), base = `http://localhost:${S.port}`;
const call = async (p, body, tok) => (await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined })).json();
const mk = async (name) => (await (await fetch(base + '/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, avatar: { skin: '#e8b890', hair: '#5a3ad0', hat: null } }) })).json());
const a = await mk('Ana'), b = await mk('Ben'), home = await call('/api/tanks', { name: 'Home' }, a.token); await call('/api/join', { code: home.code }, b.token);
{ const w = JSON.parse(S.db.prepare('SELECT world FROM tanks WHERE id=?').get(home.id).world), D = 864e5, now = Date.now(); w.flags = { ...w.flags, tut: 5, firsts: { [a.userId]: true, [b.userId]: true } }; w.level = 4;
  w.fish = [{ id: 'o1', name: 'Inky', species: 'octopus', seed: 5, born: now - 30 * D, stage: 'adult', traits: ['Curious'], happy: 0.8, health: 1, hunger: 0.2, owner: a.userId, ownerName: 'Ana' }];
  w.field = { escape: { at: now - 2 * D, fish: 'o1', name: 'Inky', text: 'Inky climbed out of the tank and went exploring.', v: 2 } };      // it happened two days ago, while nobody was watching
  S.db.prepare('UPDATE tanks SET world=?, sim_ts=? WHERE id=?').run(JSON.stringify(w), now, home.id); }
const br = await chromium.launch({ executablePath: process.env.PW_MODULE ? undefined : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); const errs = []; let fails = 0;
const ck = (n, ok, x = '') => { console.log(ok ? '  ✓' : '  ✗', n, typeof x === 'string' ? x : JSON.stringify(x)); if (!ok) fails++; };
const phone = async (u) => { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.addInitScript((s) => { localStorage.setItem('ourtank.session', JSON.stringify(s)); }, { token: u.token, userId: u.userId, named: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(base + '/?tod=afternoon'); await p.waitForFunction(() => window.__game?.state, null, { timeout: 120000 }); await p.waitForTimeout(1500); console.log('  phone', u.name ?? '', await p.evaluate(() => ({ mode: window.__game.mode, dd: window.__game.dd?.state ?? null }))); return p; };
const card = (p) => p.evaluate(() => { const c = document.querySelector('#modal.on .ddc'); return c ? { text: c.innerText.replace(/\s+/g, ' '), html: c.innerHTML, right: c.querySelector('.ddo.right')?.innerText ?? null, who: [...c.querySelectorAll('.ddwho li')].map((l) => l.innerText.replace(/\s+/g, ' ')) } : null; });
const until = async (p, fn, secs = 15) => { for (let i = 0; i < secs * 4; i++) { const v = await card(p); if (fn(v)) return v; await p.waitForTimeout(250); } return card(p); };
const OUT = process.env.OUT || '/tmp';

const A = await phone(a);
await A.evaluate(() => { window.__quietUntil = 0; });
let ca = await until(A, (v) => !!v, 25);
ck('the card comes up by itself on the first opening of the day, with the question and three choices', !!ca && /TEST FIXTURE: what limits/.test(ca.text) && (ca.html.match(/class="ddo[ "]/g) ?? []).length === 3, ca?.text);
ck('before answering, the page holds no answer, explanation or guesses', ca && !/TEST FIXTURE explanation/.test(ca.html) && !ca.right && !ca.who.length && !('answer' in (await A.evaluate(() => window.__game.dd))));
await A.screenshot({ path: `${OUT}/dd_open.png` });
await A.evaluate(() => document.getElementById('ddno').click()); await A.waitForTimeout(400);
ck("'Not now' puts it away", !(await card(A)));
await A.evaluate(() => window.__ui.open('notices')); await A.waitForTimeout(500);
const row = await A.evaluate(() => document.querySelector('#sheet [data-act="ddopen"]')?.innerText.replace(/\s+/g, ' ') ?? null);
ck('it waits on Today', /Daily Discovery/.test(row ?? '') && /waiting/.test(row ?? ''), row);
await A.reload(); await A.waitForFunction(() => window.__game?.dd, null, { timeout: 60000 }); await A.evaluate(() => { window.__quietUntil = 0; }); await A.waitForTimeout(5000);
ck('opening the app again the same day does not bring it up again', !(await card(A)));

const B = await phone(b); await B.evaluate(() => { window.__quietUntil = 0; });
let cb = await until(B, (v) => !!v, 25); ck("Ben's phone gets the same question", !!cb && /TEST FIXTURE: what limits/.test(cb.text));
const shells0 = await B.evaluate(() => window.__game.state.shells);
await B.evaluate(() => document.querySelector('#modal .ddc [data-dd="2"]').click());
cb = await until(B, (v) => v?.right); await B.waitForTimeout(600);
ck('Ben answers (wrongly): the reveal marks the right answer and his guess, and explains', cb?.right && /Not quite/.test(cb.text) && /TEST FIXTURE explanation/.test(cb.text) && /Source: Fixture Aquarium/.test(cb.text), cb?.text);
ck('it lists who has answered and who has not', cb?.who.some((w) => /^You C ✗/.test(w)) && cb.who.some((w) => /Ana Hasn.t answered/.test(w)), cb?.who);
ck('the tank box says what the game does and that it already happened here, while Ben was not watching', /In your tank/i.test(cb?.text ?? '') && /Inky climbed out of the tank/.test(cb?.text ?? '') && /weren.t watching at the time/.test(cb?.text ?? ''), cb?.text);
ck('Ben answered first: 2 shells went into the shared wallet', (await B.evaluate(() => window.__game.state.shells)) === shells0 + 2, await B.evaluate(() => window.__game.state.shells) - shells0);
await B.screenshot({ path: `${OUT}/dd_answered.png` });
const aBefore = await A.evaluate(() => window.__game.dd);
ck("Ana's phone still holds no answer and no guess after Ben answered", aBefore.state === 'open' && !('answer' in aBefore) && !('results' in aBefore), aBefore.state);

await A.evaluate(() => window.__ui.discovery()); await A.waitForTimeout(300);
await A.evaluate(() => document.querySelector('#modal .ddc [data-dd="0"]').click());
ca = await until(A, (v) => v?.right); await A.waitForTimeout(500);
ck("Ana answers right: she sees she got it, and Ben's guess", /You got it/.test(ca?.text ?? '') && ca.who.some((w) => /Ben C ✗/.test(w)), ca?.who);
ck("Ana's answer earns nothing more: the tank's 2 shells for the day were already paid, and her card says Ben earned them", (await B.evaluate(() => window.__game.state.shells)) === shells0 + 2 && /Ben earned today.s 2 shells/.test(ca?.text ?? ''), { shells: (await B.evaluate(() => window.__game.state.shells)) - shells0 });
cb = await until(B, (v) => v?.who.some((w) => /Ana A ✓/.test(w)));
ck("Ben's open card shows Ana's answer by itself", cb?.who.some((w) => /Ana A ✓/.test(w)), cb?.who);
await A.evaluate(() => document.getElementById('ddok').click());
await A.evaluate(() => { window.__ui.open('notices'); document.querySelector('#sheet [data-nsub="guide"]').click(); }); await A.waitForTimeout(600);
const fg = await A.evaluate(() => [...document.querySelectorAll('#sheet .fgrow')].map((r) => r.innerText.replace(/\s+/g, ' ')));
ck('the Field Guide: the escape is learned (from the answer) and happened (in the tank)', fg.some((r) => /The escape artist/.test(r) && /Learned/.test(r) && /Happened/.test(r)), fg.slice(0, 4));
await A.evaluate(() => document.querySelector('#sheet .fgrow[data-k="escape"]').scrollIntoView({ block: 'center' })); await A.waitForTimeout(300); await A.screenshot({ path: `${OUT}/dd_guide.png` });
await A.evaluate(() => document.querySelector('#sheet .fgrow[data-k="escape"]').click()); await A.waitForTimeout(400);
const fgd = await card(A); ck("its page: what was learned with its source, the game's version, and a way to Inky's story", /Learned/.test(fgd?.text ?? '') && /Source: Fixture Aquarium/.test(fgd?.text ?? '') && /Open Inky.s story/.test(fgd?.text ?? ''), fgd?.text);
await A.screenshot({ path: `${OUT}/dd_guide_page.png` });
ck('no page errors', !errs.length, errs.slice(0, 3));
await br.close(); console.log(fails ? `${fails} Daily Discovery checks failed` : 'Daily Discovery checks passed'); process.exit(fails ? 1 : 0);
