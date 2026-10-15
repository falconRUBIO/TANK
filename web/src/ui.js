// HTML chrome: header, bottom-sheet tabs (Care / Shop / Crew: friends, journal, collection, settings), shop, modals, toasts.
import { skyOf } from './game/sky.js';
import { CRAB_PRICE, driftBlame, giftReady, sexOf, forecast, tankNeeds, LIFESPAN } from './game/rules.js';
import { msIcon } from './msicons.js';
import { FACTS } from './facts.js';
import { SOCIAL, THEMES, themesOf, adoptAdvice, harmonyOf, canPuzzle, PUZZLE_COST, SPECIES_DEF, DECOR_DEF, DAILY_REWARD, AIL_TIRED, AIL_WARN, LEVEL_AT, WISHES, COLLECTION_SIZE, fishPrice, dailyFish, isFree, FLOORS, BACKDROPS, scoreOf, capacity, stageOf, nextStage, comfortOf, readyToTrim, growthOf, WANT_REWARD, FOODS, tankMood, dayTicks, PERFECT_DAY_REWARD, STYLE_PRICE, styleOwned } from './game/rules.js';
import { REASONS } from './game/game.js';
import { decorThumb, fishThumb } from './w3/thumbs.js';
import { sfx, haptic, setSound, soundOn, setMusic, musicOn } from './audio.js';
import { OCTO_COLORS } from './species.js';
import { ownFood, canFeedOwn, ownHunger, hasOcto, hasFishOnly, canFeedOcto, octoHunger, dueIn, favFoodOf, hasSeahorse, OCTO_DUE, OHR, HR, WATER_PAY, GLASS_PAY, PEARL_PAY, sellValue, canSell } from './game/rules.js';
// how long until something is due, in plain words: "in about 5 hours", "tomorrow", "in about 2 days"
const inTime = (ms) => { const h = ms / 3600e3; return h < 1 ? 'within the hour' : h < 20 ? `in about ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}` : h < 36 ? 'in about a day' : `in about ${Math.round(h / 24)} days`; };

export { drawAvatar } from './people.js';
import { drawAvatar, soloLook } from './people.js';
import { lookEditor } from './lookeditor.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (ts) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
const CATS = ['NEW', 'PLANTS', 'ROCKS', 'WOOD', 'STRUCTURES', 'SPECIAL', 'FISH', 'FLOOR', 'BACKDROP'];
const SWATCH = { floor: { sand: 'linear-gradient(#ecdcb0,#d6bf8a)', pearl: 'linear-gradient(#f2eaf8,#cfc4e6)', gravel: 'linear-gradient(#a49c8c,#6e685c)', black: 'linear-gradient(#3a3a4a,#1c1c26)', coral: 'linear-gradient(#f6b0be,#e2788e)' }, backdrop: { candy: 'linear-gradient(#f6b8c8,#c9b6f0,#9fd0f2)', lagoon: 'linear-gradient(#7fd8d0,#5fb8d8,#6a9ae0)', sunset: 'linear-gradient(#ffc79a,#ff9eb4,#c08ae0)', mint: 'linear-gradient(#b8f0c8,#8adcc8,#9ac8f0)' } };

export function initUI({ game, social, cb }) {
  const sheet = document.getElementById('sheet'), toastEl = document.getElementById('toast'), $ = (id) => document.getElementById(id);
  let tab = 'tank', sub = 'friends', tt, cat = 'NEW', selected = null, rearrange = false, composeMode = 'msg', crewDraft = '', bottleTo = null, careSub = 'care';
  // Toasts wait their turn: each one is read for a moment before the next, repeats are dropped, and a long backlog moves faster (newest kept).
  const tq = []; let showing = 0;
  const cardUp = () => ['settle', 'reunion', 'coach'].some((id) => $(id)?.classList.contains('on'));
  // hush: for a few seconds nothing pops up (a new octopus dropping in gets the screen to itself); whatever comes meanwhile waits its turn
  let hushUntil = 0, hushT = 0, coachLater = null;
  const hushed = () => performance.now() < hushUntil;
  const hush = (ms) => {
    hushUntil = Math.max(hushUntil, performance.now() + ms); if (toastEl.classList.contains('on') && toastEl.textContent) tq.unshift({ m: toastEl.textContent, ms: 2400 });      // the one on screen comes back after the quiet
    toastEl.classList.remove('on'); clearTimeout(tt); showing = tq.length ? 1 : 0;
    const coachEl = $('coach'); if (coachEl?.classList.contains('on') && coachEl._args) { coachLater = coachEl._args; coachEl.classList.remove('on'); }
    clearTimeout(hushT); hushT = setTimeout(() => { if (coachLater) { const a = coachLater; coachLater = null; showCoach(a); } if (tq.length) nextToast(); else showing = 0; }, hushUntil - performance.now() + 50);
  };
  const nextToast = () => { if (hushed()) { showing = 1; clearTimeout(tt); tt = setTimeout(nextToast, hushUntil - performance.now() + 60); return; } if (cardUp() && tq.length) { showing = 1; toastEl.classList.remove('on'); clearTimeout(tt); tt = setTimeout(nextToast, 700); return; } const n = tq.shift(); if (!n) { showing = 0; toastEl.classList.remove('on'); return; } showing = 1; toastEl.textContent = n.m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(nextToast, tq.length > 1 ? Math.min(n.ms, 1300) : n.ms); };
  const toast = (m, ms = 2400) => { notice(m, { kind: 'toast' }); if (tq.some((x) => x.m === m) || (showing && toastEl.textContent === m && toastEl.classList.contains('on'))) return; tq.push({ m, ms }); while (tq.length > 4) tq.splice(1, 1); if (!showing) nextToast(); };
  const clearToasts = () => { tq.length = 0; showing = 0; clearTimeout(tt); toastEl.classList.remove('on'); };
  const S = () => game.state;
  // ── notices: every hint, message and card is kept on this phone, newest first, with a bell that counts the new ones ──
  const NK = 'ourtank.notices', RK = 'ourtank.noticesRead';
  let notices = (() => { try { return JSON.parse(localStorage.getItem(NK) || '[]').filter((n) => !n.gift && !/small gift is waiting/.test(n.text)); } catch { return []; } })(), readAt = +(localStorage.getItem(RK) || 0);
  const noticeSave = () => { try { localStorage.setItem(NK, JSON.stringify(notices.slice(0, 80))); } catch { /* storage unavailable */ } };
  // one line of news is kept once. A countdown ("arrives in 47 min", "wipe in about 9h") is the same notice ticking, so it is updated in place, quietly, rather than added again every minute
  const noticeKey = (text) => (/\b\d+\s*(min|h|hours?|minutes?|days?)\b/.test(text) ? text.replace(/\d+/g, '#') : text);      // only a countdown ticks; 'level 3' and 'level 4' are two different moments
  const notice = (text, { tab = '', gift = false, kind = 'note' } = {}) => {
    if (!text || /already collected|isn't hungry yet|is full for now|not yet|Not at this stage/i.test(text)) return; const now = Date.now(), key = noticeKey(text);      // (a reply to a tap is not news)
    const same = notices.slice(0, 40).find((n) => n.text === text && now - n.ts < 3 * 864e5); if (same) return;
    const ticking = notices.slice(0, 40).find((n) => (n.key ?? noticeKey(n.text)) === key && key !== text && now - n.ts < 3 * 864e5);
    if (ticking) { ticking.text = text; ticking.tab = tab; ticking.gift = gift; ticking.kind = kind; noticeSave(); refreshNotices(); return; }
    notices.unshift({ ts: now, text, tab, gift, kind, key }); notices = notices.slice(0, 80); noticeSave(); bell();
  };
  let refreshNotices = () => {};
  const unread = () => notices.filter((n) => n.ts > readAt).length;
  const bell = () => { const b = $('bell'); if (!b) return; const n = unread(); b.classList.toggle('new', n > 0); b.querySelector('i').textContent = n > 9 ? '9+' : n ? String(n) : ''; };
  const noticesHtml = () => {
    if (!notices.length) return '<p class="dim">Nothing yet. Hints, messages and moments in the tank will be kept here.</p>';
    const day = (ts) => { const d = Math.floor(ts / 864e5), t = Math.floor(Date.now() / 864e5); return d === t ? 'Today' : d === t - 1 ? 'Yesterday' : new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
    let last = '', out = '';
    const pic = (t) => /hatch|egg/i.test(t) ? 'hatched' : /passed away|rest/i.test(t) ? 'trust' : /grew|grown|adult|elder/i.test(t) ? 'grown' : /friend/i.test(t) ? 'friend' : /visit/i.test(t) ? 'visitor' : /trick|puzzle|jar/i.test(t) ? 'trick' : /crab/i.test(t) ? 'crab' : /hungry|fed|feed/i.test(t) ? 'feed' : /water/i.test(t) ? 'water' : /glass/i.test(t) ? 'glass' : /note/i.test(t) ? 'note' : /gift|shell|bottle/i.test(t) ? 'gift' : /plant|shop|decor/i.test(t) ? 'spot' : /chapter|wish|level/i.test(t) ? 'wish' : 'wish';
    for (const n of notices) { const d = day(n.ts); if (d !== last) { out += `${last ? '</div>' : ''}<h4>${d}</h4><div class="ntcard">`; last = d; } out += `<button class="nt2 ${n.ts > readAt ? 'new' : ''} ${n.tab || n.gift ? 'go' : ''}" data-nt="${notices.indexOf(n)}"><span class="jic">${msIcon(pic(n.text), true, 22)}</span><span class="ntx">${esc(n.text)}</span><small>${new Date(n.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></button>`; }
    return out + (last ? '</div>' : '');      // each day one grouped card: a picture, the news, the time
  };
  // the game opens up gradually: a new tank shows only feeding, fish and a few decorations; food choices, themes, comfort, the daily checklist, floors and postcards appear once the tank has grown a little
  const adv = () => { const s = S(); return !!s && (s.level >= 2 || s.fish.length >= 2); };
  const eta = (ms) => { if (ms <= 0) return 'any moment now'; const m = Math.max(1, Math.ceil(ms / 60e3)); return m >= 2880 ? Math.round(m / 1440) + ' days' : m >= 90 ? Math.round(m / 60) + 'h' : m + ' min'; };
  const PIX = { '🫙': 'feed', '🧽': 'glass', '💧': 'water', '✂️': 'trim', '🥚': 'hatched', '🧩': 'puzzle', '📷': 'camera', '🪨': 'rock', '🌿': 'spot', '🥥': 'coconut', '🫧': 'bubbles', '🌱': 'spot', '🪴': 'spot', '🦀': 'crab', '🦐': 'shrimp', '🍤': 'shrimp', '🟤': 'pellets', '🎁': 'gift', '📦': 'gift', '📝': 'note', '✏️': 'note', '🍾': 'bottle', '👋': 'hand', '🎂': 'cake', '🍽️': 'feed', '🐙': 'grown', '✨': 'trick', '🌙': 'wish' };
  const pix = (e, n = 24) => (PIX[e] ? msIcon(PIX[e], true, n) : e);      // the emoji the menus used, drawn in the tank's own pixel style
  const tile = (icon, label, act, sub = '', cls = '') => `<button class="tile ${cls}" data-act="${act}"><span>${pix(icon, 26)}</span>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
  const inH = (h) => (h < 1 ? 'within the hour' : h < 24 ? `in about ${Math.round(h)}h` : `in about ${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'}`);
  // the one thing that matters most right now, in a sentence at the top of Care (tap it to do it); when all is done, what the octopus is up to
  const careHead = () => { const s = S(), me = game.you?.userId, mine = s.fish.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a)), oc = mine[0];
    { const H = feedModel().hungry, g = H[0]; if (g) { const meal = H.filter((x) => x.kind !== 'octo' && x.kind !== 'sea').map((x) => x.who), who = (g.kind === 'octo' || g.kind === 'sea') ? g.who : names(meal), them = (g.kind === 'octo' || g.kind === 'sea') || (meal.length === 1 && !/^the /.test(meal[0])) ? ((g.kind === 'octo' || g.kind === 'sea') ? g.who : meal[0]) : 'them', k = quickFood(g);      // one tap: the right food, straight to the water
      return [`${who.charAt(0).toUpperCase() + who.slice(1)} ${(g.kind === 'octo' || g.kind === 'sea') || (meal.length === 1 && !/^the /.test(meal[0])) ? 'is' : 'are'} hungry. <b>Feed ${them} ${k === 'crab' ? 'a crab' : FOODS[k].label.toLowerCase()} ›</b>`, 'feednow', `data-food="${k}"${g.id ? ` data-for="${esc(g.id)}"` : ''}`]; } }
    if (s.water < 0.5) return ['The water is dirty. Change it.', 'water'];
    if (s.glass > 0.6) return ['There is algae on the glass. Give it a wipe.', 'clean'];
    if (s.water < 0.7) return ['The water is getting cloudy. A change would help.', 'water'];
    if (s.glass > 0.3) return ['A little algae on the glass.', 'clean'];
    const any = oc ?? s.fish.find((f) => f.species === 'octopus' && !f.dead), th = any ? cb.octoThought?.(any.id) : null;
    return [`All looked after.${th ? ` ${esc(any.name)}: ${esc(th.charAt(0).toLowerCase() + th.slice(1))}` : ' Enjoy the tank.'}`, null]; };
  // each care tile says whether it is needed now, and if not, roughly when it will be, so nobody taps it for nothing
  const careState = () => { const s = S(), me = game.you?.userId, ocs = s.fish.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a)), oc = ocs[0], fish = hasFishOnly(s);
    // due times come from the rules, the same ones the meters and the reminders use
    const ocDue = (f) => dueIn(s, 'crab', f) <= 0, fishDue = fish && dueIn(s, 'meal') <= 0, fNeed = ocs.some(ocDue) || fishDue, fH = Math.min(...ocs.map((f) => dueIn(s, 'crab', f) / 3600e3), fish ? dueIn(s, 'meal') / 3600e3 : 99, 99);
    // who is hungry, by name: your octopuses that are, and the fish if they are
    const who = [...ocs.filter(ocDue).map((f) => esc(f.name)), ...(fishDue ? ['the fish'] : [])], list = who.length > 1 ? who.slice(0, -1).join(', ') + ' and ' + who.at(-1) : who[0] ?? '';
    const verb = who.length === 1 && who[0] !== 'the fish' ? 'is' : 'are', hungryTxt = list ? `${list.charAt(0).toUpperCase() + list.slice(1)} ${verb} hungry · feed now` : 'Hungry · feed now';
    if (!oc && !fish) return { feed: ['Nothing to feed yet', 'later'], glass: s.glass > 0.3 ? [`${s.glass > 0.6 ? 'Algae' : 'A little algae'} · wipe now`, 'due'] : [`Clear · wipe ${inH(dueIn(s, 'glass') / 3600e3)}`, 'later'], water: s.water < 0.7 ? [`${s.water < 0.5 ? 'Dirty' : 'Cloudy'} · change now`, 'due'] : [`Clean · change ${inH(dueIn(s, 'water') / 3600e3)}`, 'later'] };
    return { feed: fNeed ? [hungryTxt, 'due'] : [`Full · hungry ${inH(Math.max(0, fH))}`, 'later'], glass: s.glass > 0.3 ? [`${s.glass > 0.6 ? 'Algae' : 'A little algae'} · wipe now`, 'due'] : [`Clear · wipe ${inH(dueIn(s, 'glass') / 3600e3)}`, 'later'], water: s.water < 0.7 ? [`${s.water < 0.5 ? 'Dirty' : 'Cloudy'} · change now`, 'due'] : [`Clean · change ${inH(dueIn(s, 'water') / 3600e3)}`, 'later'] }; };

  // ── header ──
  function updateHeader() {
    const s = S(); if (!s) return;
    $('shells').textContent = '🐚 ' + s.shells; $('day').textContent = 'DAY ' + String(game.day).padStart(3, '0');
    const score = scoreOf(s), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, pct = b ? Math.round(((score - a) / (b - a)) * 100) : 100;
    $('lvl').textContent = 'LV ' + lv; $('lvbar').style.width = Math.max(4, Math.min(100, pct)) + '%'; $('lvbar').parentElement.title = b ? `${score}/${b} to level ${lv + 1}` : 'Max level';
    const g = goalText(); if ($('goal').textContent !== g.text) { $('goal').textContent = g.text; $('goal').dataset.tab = g.tab || ''; $('goal').dataset.gift = g.gift ? '1' : ''; if (g.text) { notice(g.text, { tab: g.tab || '', gift: !!g.gift, kind: 'hint' }); $('goal').classList.add('on'); clearTimeout($('goal')._t); $('goal')._t = setTimeout(() => $('goal').classList.remove('on'), 9000); } }
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('dot', n.dataset.tab === g.tab && g.tab !== 'tank'));
    { const me = game.you?.userId, due = s.hunger > 0.55 || s.water < 0.5 || s.glass < 0.45 || s.fish.some((f) => !f.dead && ownFood(f) && canFeedOwn(f, me, game.shared) && ownHunger(f) > 0.6) || (s.eggs ?? []).some((e) => e.hatchAt - Date.now() < 6 * 3600e3); flag('care', due); }      // a dot on Care when something needs you
  }
  function goalText() {
    const s = S(); if (!s) return { text: '' };
    if ((s.flags.tut ?? 0) < 5 && game.isTutOwner) return { text: 'Follow the tips to get started', tab: '' };
    const fl = (s.floaters ?? [])[0]; if (fl) return { text: `${fl.name} has passed away. Tap to lay them to rest.`, tab: '' };
    const weak = s.fish.find((f) => (f.ail ?? 0) >= AIL_WARN); if (weak) return { text: weak.species === 'octopus' ? `${weak.name} is in a critical state. ${canFeedOcto(weak, game.you?.userId, game.shared) ? 'Drop it a crab' : `Only ${weak.ownerName ?? 'its caretaker'} can feed it`}, and freshen the water.` : `${weak.name} is in a critical state. Feed the tank and freshen the water.`, tab: 'care' };
    if (s.visitor) return { text: `A rare visitor! Tap the ${SPECIES_DEF[s.visitor.species].label} to say hello.`, tab: '' };
    if ((s.bottles ?? []).some((b) => b.to === game.you?.userId)) return { text: 'A bottle turned up for you. Tap it.', tab: '' };
    if (s.drift) return { text: `${driftBlame(s.drift)} Tap it in the tank.`, tab: '' };
        { const me = game.you?.userId, oc = s.fish.filter((f) => canFeedOcto(f, me, game.shared) && octoHunger(f) > 0.5).sort((a, b) => octoHunger(b) - octoHunger(a))[0]; if (oc) return { text: `${oc.name} is hungry. Drop it a crab from Care.`, tab: 'care' }; }
    if (s.hunger > 0.5 && hasFishOnly(s)) return { text: 'The fish are getting hungry. Feed them.', tab: 'care' };
    if (Object.values(s.flags.starter ?? {}).some((n) => n > 0) && !s.decor.length) return { text: 'A free plant is waiting in the Shop.', tab: 'decorate' };
    if (s.glass > 0.45) return { text: 'Algae on the glass. Give it a wipe.', tab: 'care' };
    if (s.water < 0.6) return { text: 'The water could use a change.', tab: 'care' };
    if (s.want) return { text: s.want.text, tab: '' };
    const o = (s.orders ?? []).slice().sort((x, y) => x.arrivesAt - y.arrivesAt)[0];
    if (o) return { text: `${o.name || SPECIES_DEF[o.species].label} arrives in ${eta(o.arrivesAt - game.now())}`, tab: '' };
    const eg = (s.eggs ?? [])[0]; if (eg) return { text: `An egg is about to hatch in ${eta(eg.hatchAt - game.now())}`, tab: '' };
    const cheapest = Math.min(...Object.values(DECOR_DEF).filter((d) => d.level <= s.level).map((d) => d.price));
    const owned = new Set([...s.fish.map((f) => f.species), ...(s.orders ?? []).map((o) => o.species)]), room = s.fish.length + (s.orders ?? []).length;
    const fish = Object.entries(SPECIES_DEF).filter(([k, d]) => !d.visitor && !owned.has(k) && d.level <= s.level && room + d.count <= capacity(s.level)).sort((x, y) => x[1].price - y[1].price)[0];
    if (fish && s.shells >= fishPrice(fish[0])) return { text: `You can adopt a new kind of fish: ${fish[1].label.toLowerCase()}!`, tab: 'decorate' };
    if (s.shells >= cheapest) return { text: 'You have shells to spend on decorations.', tab: 'decorate' };
    if (s.want) return { text: `${s.fish.find((f) => f.id === s.want.fish)?.name ?? 'A fish'} has a request: ${s.want.text}`, tab: 'care' };
    const dw = s.daily; if (dw && !dw.done) return { text: `Today's request (+${dw.reward ?? 3}): ${dw.text}${dw.need > 1 ? ` (${dw.have}/${dw.need})` : ''}`, tab: '' };
    const w = WISHES[s.wishIdx]; if (w) return { text: `Tank wish: ${w.text}`, tab: '' };
    const b = LEVEL_AT[s.level]; return { text: b ? `Earn shells by caring · ${scoreOf(s)}/${b} to level ${s.level + 1}` : 'Everything is calm. Enjoy your tank.', tab: '' };
  }
  $('goal').onclick = () => { if ($('goal').dataset.gift) { cb.gift(); return; } const t = $('goal').dataset.tab; if (t) open(t); };

  // ── sheets ──
  // the tank at a glance: one row per thing to look after, with a word for how it is, a coloured bar, and a line saying what to do and how quickly it changes
  const meters = () => {
    const s = S(), me = game.you?.userId, row = (icon, name, v, [word, lv], hint) => `<div class="meter ${lv}"><span class="mi">${icon}</span><div class="mb"><div class="mt"><b>${name}</b><em>${word}</em></div><i><b style="width:${Math.round(Math.max(0.02, Math.min(1, v)) * 100)}%"></b></i>${hint ? `<small>${hint}</small>` : ''}</div></div>`;
    const lvl = (v, a, b, words) => (v >= a ? [words[0], 'ok'] : v >= b ? [words[1], 'mid'] : [words[2], 'low']), rows = [];
    for (const f of s.fish.filter((x) => x.species === 'octopus' && !x.dead)) { const v = 1 - octoHunger(f), mine = canFeedOcto(f, me, game.shared); rows.push(row('🐙', esc(f.name), v, lvl(v, 0.6, 0.3, ['Full', 'Peckish', 'Hungry']), mine ? (dueIn(s, 'crab', f) <= 0 ? 'Drop a crab from Feed' : `Ready for a crab ${inTime(dueIn(s, 'crab', f))}. Only you feed it.`) : `Only ${esc(f.ownerName ?? 'its caretaker')} can feed it`)); }
    for (const f of s.fish.filter((x) => x.species === 'seahorse' && !x.dead)) { const v = 1 - ownHunger(f), mine = canFeedOwn(f, me, game.shared); rows.push(row('🦐', esc(f.name), v, lvl(v, 0.6, 0.3, ['Full', 'Peckish', 'Hungry']), mine ? (dueIn(s, 'mysis', f) <= 0 ? 'Give it mysis shrimp from Feed' : `Ready for shrimp ${inTime(dueIn(s, 'mysis', f))}. Only you feed it.`) : `Only ${esc(f.ownerName ?? 'its caretaker')} can feed it`)); }
    if (hasFishOnly(s)) { const v = 1 - s.hunger; rows.push(row('🐟', 'The fish', v, lvl(v, 0.7, 0.4, ['Full', 'Peckish', 'Hungry']), dueIn(s, 'meal') <= 0 ? 'Feed them flakes from Feed' : `Next meal ${inTime(dueIn(s, 'meal'))}`)); }
    rows.push(row('💧', 'Water', s.water, lvl(s.water, 0.7, 0.5, ['Clean', 'Cloudy', 'Dirty']), s.water < 0.7 ? `Time for a water change (+${WATER_PAY} shells)` : `Due for a change ${inTime(dueIn(s, 'water'))}`));
    rows.push(row('🪟', 'Glass', 1 - s.glass, lvl(1 - s.glass, 0.7, 0.45, ['Clear', 'A little algae', 'Algae']), 1 - s.glass < 0.7 ? `Give it a wipe (+${GLASS_PAY} shells)` : `Due for a wipe ${inTime(dueIn(s, 'glass'))}`));
    const n = s.fish.length + (s.orders ?? []).reduce((a, o) => a + (SPECIES_DEF[o.species]?.count ?? 1), 0), cap = capacity(s.level);
    return `<div class="meters">${rows.join('')}</div><p class="room">🐠 <b>${n} of ${cap}</b> places in the tank are taken${n < cap ? ` · room for ${cap - n} more` : ' · level up to make room'}</p>`;
  };
  const slotsHtml = () => {
    const s = game.members; if (!s) return '';
    // the people first, then one invite card for however many seats are free, not a row of identical ones
    const free = [1, 2, 3, 4].filter((n) => !s.some((x) => x.slot === n)).length;
    return [1, 2, 3, 4].map((n) => { const m = s.find((x) => x.slot === n); return m
      ? `<div class="slot${m.id === game.you.userId ? ' me' : ''}"><span class="avw ${game.online.includes(m.id) ? 'live' : ''}"><canvas class="av big" data-slot="${n}"></canvas></span><b>${esc(m.name)}${m.id === game.you.userId ? ' (you)' : ''}</b><small>${game.online.includes(m.id) ? 'Here now' : 'Away'}</small>${m.id === game.you.userId ? '<button class="nudge" data-edit-me>Edit look</button>' : `<span class="sbtns"><button class="nudge" data-nudge="${m.id}" aria-label="Nudge">${msIcon('hand', true, 18)}</button><button class="nudge" data-bottle="${m.id}" aria-label="Send a bottle">${msIcon('bottle', true, 18)}</button></span>`}</div>`
      : ''; }).join('') + (free ? `<div class="slot empty" data-invite><span class="avw add">+</span><b>Invite</b><small>${free === 1 ? '1 seat free' : `${free} seats free`}</small></div>` : '');
  };
  // your look, edited from the Crew tab with the same editor as the first screen
  let draft = null;
  const myself = () => (game.shared ? game.members?.find((x) => x.id === game.you.userId) : null);
  const lookHtml = () => { const me = myself(); return `<h3>Your look</h3><div class="ap"></div>${game.shared ? `<label class="lk-name"><span>Your name</span><input id="lkname" maxlength="16" autocomplete="off" value="${esc(me?.name ?? '')}"></label>` : ''}<div class="err" id="lkerr"></div><button class="big" id="lksave">Save</button><button class="lnk" id="lkback">Cancel</button>`; };
  function bindLook() {
    draft = { ...(game.shared ? myself()?.avatar ?? {} : soloLook()) }; lookEditor(sheet.querySelector('.ap'), draft);
    $('lkback').onclick = () => { sub = 'friends'; open('friends', true); };
    $('lksave').onclick = async () => {
      const name = $('lkname') ? $('lkname').value.trim() : null; if ($('lkname') && !name) { $('lkerr').textContent = 'Please choose a name.'; return; }
      $('lksave').disabled = true;
      try { await cb.saveLook({ avatar: { ...draft }, name }); sfx('tap'); toast('Looking good'); sub = 'friends'; setMembers(); open('friends', true); }
      catch (e) { $('lkerr').textContent = e.message || 'That did not save. Try again.'; $('lksave').disabled = false; }
    };
  }
  // what counts as new: unlocked by the tank's latest level-up (never at level 1, where everything is new) and not yet in the tank
  const isNew = (s, c) => (c.kind === 'fish' || c.kind === 'decor') && s.level > 1 && c.level === s.level && !(c.kind === 'fish' ? s.fish.some((f) => f.species === c.id) || (s.orders ?? []).some((o) => o.species === c.id) : s.decor.some((d) => d.type === c.id));
  const newCount = () => { const s = S(); if (!s || s.level < 2) return 0; return Object.entries(SPECIES_DEF).filter(([id, d]) => !d.visitor && isNew(s, { kind: 'fish', id, level: d.level })).length + Object.entries(DECOR_DEF).filter(([id, d]) => isNew(s, { kind: 'decor', id, level: d.level })).length; };
  // ── notes on the glass ── little sticky notes the crew leave each other; one each, gone after three days
  const NOTE_BG = { butter: '#ffeaa6', blush: '#ffd3de', mint: '#cff3dc', sky: '#d3e7ff', lilac: '#e6d9ff' };
  function noteCard(n, big = false) {
    const me = game.you?.userId, mine = n.by === me, unread = !mine && !(n.read ?? []).includes(me), tilt = ((n.id.charCodeAt(n.id.length - 1) % 5) - 2) * 1.4;
    return `<div class="gnote ${big ? 'big' : ''} ${unread ? 'unread' : ''}" style="--nb:${NOTE_BG[n.color] ?? NOTE_BG.butter};--tilt:${tilt}deg" ${big ? '' : `role="button" tabindex="0" data-act="noteopen" data-id="${n.id}"`}>
      <i class="tape"></i><em class="dd">${n.doodle}</em><p>${esc(n.text)}</p><footer><span>— ${mine ? 'you' : esc(n.name)}</span><small>${ago(n.at)}${(n.hearts ?? []).length ? ` · ♥ ${n.hearts.length}` : ''}</small></footer>${unread && !big ? '<b class="dot"></b>' : ''}</div>`;
  }
  function notesHtml() {
    const ns = (S().notes ?? []).slice().sort((a, b) => b.at - a.at), mineHas = ns.some((n) => n.by === game.you?.userId);
    return `<h4>Notes on the glass</h4><div class="gnotes">${ns.map((n) => noteCard(n)).join('')}<button class="gnote add" data-act="notenew"><em class="dd">✏️</em><p>${mineHas ? 'Write a new note' : 'Leave a note'}</p><footer><span>for the crew</span></footer></button></div>`;
  }
  // write a note: a sticky you type on, a colour and a little doodle, then stick it on the glass
  function noteComposer(reply = null, edit = null, start = '') {
    return new Promise((done) => {
      let color = edit?.color ?? 'butter', doodle = edit?.doodle ?? '🐙'; const el = document.createElement('div'); el.className = 'notecomp';
      const paint = () => { el.querySelector('.gnote').style.setProperty('--nb', NOTE_BG[color]); el.querySelector('.dd').textContent = doodle; el.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', b.dataset.c === color)); el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', b.dataset.d === doodle)); };
      el.innerHTML = `<div class="ncw"><div class="gnote big edit" style="--tilt:-1.5deg"><i class="tape"></i><em class="dd"></em><textarea maxlength="120" placeholder="${reply ? `Write back to ${esc(reply)}…` : 'Write something sweet…'}"></textarea><footer><span>— you</span><small class="left">120</small></footer></div>
        <div class="ncrow">${Object.keys(NOTE_BG).map((c) => `<button class="sw" data-c="${c}" style="background:${NOTE_BG[c]}" aria-label="${c}"></button>`).join('')}</div>
        <div class="ncrow">${['🐙', '🐠', '🐟', '🌿', '💛', '⭐', '🫧', '🦀'].map((d) => `<button class="dz" data-d="${d}">${d}</button>`).join('')}</div>
        <div class="ncbtn"><button class="cancel">Not now</button><button class="stick">${edit ? 'Save the note' : 'Stick it on the glass'}</button></div></div>`;
      document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); paint();
      const ta = el.querySelector('textarea'), left = el.querySelector('.left'), stick = el.querySelector('.stick'); if (edit) ta.value = edit.text; else if (start) ta.value = start; ta.oninput = () => { left.textContent = 120 - ta.value.length; stick.disabled = !ta.value.trim(); }; ta.oninput(); setTimeout(() => ta.focus(), 250);
      el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { color = b.dataset.c; sfx('tap'); paint(); })); el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { doodle = b.dataset.d; sfx('tap'); paint(); }));
      const close = (v) => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); done(v); };
      el.querySelector('.cancel').onclick = () => close(null); stick.onclick = () => close({ text: ta.value.trim(), color, doodle }); el.onclick = (e) => { if (e.target === el) close(null); };
    });
  }
  async function editNote(n) { const v = await noteComposer(null, n); if (!v) return; const r = await game.dispatch({ t: 'editNote', id: n.id, ...v }); if (r.ok) { sfx('place'); toast('Note updated.'); } }
  async function writeNote(reply = null, start = '') { const v = await noteComposer(reply, null, start); if (!v) return; const r = await game.dispatch({ t: 'glassNote', ...v }); if (!r.ok) return; sfx('stick'); toast('Your note is on the glass.'); refresh(); }
  // read a note: it comes off the glass big, with a heart and a way to write back
  function readNote(id) {
    const n = [...(S().notes ?? []), ...(S().noteLog ?? [])].find((x) => x.id === id); if (!n) return; const mine = n.by === game.you?.userId, el = document.createElement('div'); el.className = 'notecomp read';
    el.innerHTML = `<div class="ncw">${noteCard(n, true)}<div class="ncbtn">${mine ? '<button class="peel">Peel it off</button><button class="cancel">Close</button>' : `<button class="heart">♡ Love it</button><button class="reply">Write back</button>`}</div></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); sfx('tap');
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); refresh(); cb.notesChanged?.(); };
    if (!mine && !(n.read ?? []).includes(game.you?.userId)) game.dispatch({ t: 'readNote', id }).then(() => cb.notesChanged?.());
    el.onclick = (e) => { if (e.target === el) close(); }; el.querySelector('.cancel')?.addEventListener('click', close);
    el.querySelector('.peel')?.addEventListener('click', async () => { await game.dispatch({ t: 'peelNote', id }); close(); });
    el.querySelector('.heart')?.addEventListener('click', async (e) => { e.target.textContent = '♥ Loved'; e.target.disabled = true; sfx('coin'); await game.dispatch({ t: 'readNote', id, heart: true }); setTimeout(close, 700); });
    el.querySelector('.reply')?.addEventListener('click', () => { close(); setTimeout(() => writeNote(n.name), 300); });
  }
  // a note's own card, like a fish has: the note big, a heart, write back, take it down; and the earlier notes underneath
  function noteBoard(id) {
    const me = game.you?.userId, all = [...(S().notes ?? []), ...(S().noteLog ?? [])], n = all.find((x) => x.id === id); if (!n) return; const mine = n.by === me, loved = (n.hearts ?? []).length > 0;
    const old = (S().noteLog ?? []).filter((x) => x.id !== id).slice(0, 8), el = document.createElement('div'); el.className = 'notesheet';
    el.innerHTML = `<div class="nsw"><button class="grab" aria-label="Close"></button><div class="nsn">${noteCard(n, true)}</div>
      <div class="nsact">${mine ? '<button class="edit"><i>✎</i><span>Edit</span></button><button class="down"><i>✕</i><span>Peel it off</span></button>' : `<button class="heart ${loved && (n.hearts ?? []).includes(game.members?.find((x) => x.id === me)?.name) ? 'on' : ''}"><i>♡</i><span>Love it</span></button><button class="reply"><i>✎</i><span>Write back</span></button><button class="keep"><i>📌</i><span>Peel &amp; keep</span></button>`}</div>
      ${mine ? '<p class="nshint">Press and drag it on the glass to move it</p>' : ''}
      <p class="nsmeta">${mine ? (loved ? `♥ ${n.hearts.join(' and ')} loved it` : (n.read ?? []).length ? 'Read by the crew' : 'Not read yet') : `From ${esc(n.name)} · ${ago(n.at)}`}</p>
      ${(() => { const k = (S().kept?.[me] ?? []).filter((x) => x.id !== id); return k.length ? `<h4>Notes you kept</h4><div class="nsold">${k.slice(0, 8).map((o) => `<div class="nso" style="--nb:${NOTE_BG[o.color] ?? NOTE_BG.butter}"><em>${o.doodle}</em><span>${esc(o.text)}</span><small>${esc(o.name)} · ${ago(o.at)}</small></div>`).join('')}</div>` : ''; })()}
      ${old.length ? `<h4>Earlier notes</h4><div class="nsold">${old.map((o) => `<div class="nso" style="--nb:${NOTE_BG[o.color] ?? NOTE_BG.butter}"><em>${o.doodle}</em><span>${esc(o.text)}</span><small>${o.by === me ? 'you' : esc(o.name)} · ${ago(o.at)}</small></div>`).join('')}</div>` : ''}</div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    if (!mine && !(n.read ?? []).includes(me)) game.dispatch({ t: 'readNote', id });
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); };
    el.onclick = (e) => { if (e.target === el) close(); }; el.querySelector('.grab').onclick = close;
    el.querySelector('.heart')?.addEventListener('click', async (e) => { const b = e.currentTarget; b.classList.add('on'); b.querySelector('i').textContent = '♥'; b.querySelector('span').textContent = 'Loved'; b.disabled = true; sfx('love'); await game.dispatch({ t: 'readNote', id, heart: true }); });
    el.querySelectorAll('.reply').forEach((b) => b.addEventListener('click', () => { close(); setTimeout(() => writeNote(b.classList.contains('new') ? null : n.name), 320); }));
    el.querySelector('.edit')?.addEventListener('click', () => { close(); setTimeout(() => editNote(n), 320); });
    el.querySelector('.down')?.addEventListener('click', async () => { close(); sfx('peel'); await game.dispatch({ t: 'peelNote', id }); });
    el.querySelector('.keep')?.addEventListener('click', async () => { close(); sfx('peel'); const r = await game.dispatch({ t: 'keepNote', id }); if (r.ok) toast(`Kept ${n.name}'s note. Tap any note to see the ones you kept.`, 2600); });
  }
  let heldAt = 0;      // when a shop card was last held for a preview (the shop redraws, so this lives here rather than on the card)
  function shopPreview(key) {
    const [kind, id] = key.split(':'); if (kind !== 'fish' && kind !== 'decor') return; const d = kind === 'fish' ? SPECIES_DEF[id] : DECOR_DEF[id]; if (!d) return; sfx('tap');
    const L = kind === 'fish' ? LIFESPAN[id] : null, facts = kind === 'fish' ? FACTS[id] ?? [] : [], fact = facts.length ? facts[Math.floor(Date.now() / 864e5) % facts.length] : null, lovers = kind === 'decor' ? tankNeeds(S()).filter((n) => n.types.includes(id)) : [];
    const lock = S().level < d.level, price = kind === 'fish' ? fishPrice(id) : d.price, el = document.createElement('div'); el.className = 'notesheet deco';
    el.innerHTML = `<div class="nsw"><button class="grab" aria-label="Close"></button><div class="dch"><img class="pvimg" alt="" data-thumb="${key}"><h3>${esc(d.label)}</h3><p>${esc(d.blurb ?? '')}${kind === 'fish' && d.count > 1 ? ` Comes as a school of ${d.count}.` : ''}</p>
      ${L ? `<p class="pvl">Lives about ${Math.round(L / 30.4)} months in the tank</p>` : ''}${lovers.length ? `<p class="dlove">♥ ${esc(lovers.map((n) => n.name).join(' and '))} would love this</p>` : ''}${fact ? `<div class="pvf"><small>DID YOU KNOW?</small><p>${esc(fact)}</p></div>` : ''}</div>
      <div class="nsact"><button class="close"><span>Close</span></button><button class="buy" ${lock ? 'disabled' : ''}><span>${lock ? `Unlocks at level ${d.level}` : kind === 'decor' && isFree(S(), id) ? 'Place it · Free' : `${kind === 'fish' ? 'Adopt' : 'Buy'} · 🐚 ${price}`}</span></button></div></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); { const im = el.querySelector('.pvimg'); im.src = kind === 'fish' ? fishThumb(id) : decorThumb(id); }
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); };
    el.onclick = (e) => { if (e.target === el) close(); }; el.querySelector('.grab').onclick = close; el.querySelector('.close').onclick = close;
    const t0 = Date.now(); el.addEventListener('click', (e) => { if (Date.now() - t0 < 500) { e.stopPropagation(); e.preventDefault(); } }, true);      // (the finger lifting from the hold is not a tap on what just opened under it)
    el.querySelector('.buy').onclick = () => { close(); heldAt = 0; const c = sheet.querySelector(`.card[data-k="${key}"]`); if (c) c.click(); };
  }
  function shopCards() {
    const s = S(), out = [], showAll = cat === 'NEW', fishCat = cat === 'FISH';
    if (showAll || fishCat) for (const [id, d] of Object.entries(SPECIES_DEF).filter(([, x]) => !x.visitor)) out.push({ kind: 'fish', id, label: d.label, price: fishPrice(id), deal: id === dailyFish(), level: d.level, blurb: d.blurb + (d.count > 1 ? '' : ''), count: d.count, cat: 'FISH' });
    if (!fishCat && cat !== 'FLOOR' && cat !== 'BACKDROP') for (const [id, d] of Object.entries(DECOR_DEF)) if (showAll || d.cat === cat) out.push({ kind: 'decor', id, label: d.label, price: d.price, level: d.level, blurb: d.blurb, cat: d.cat });
    for (const [kind, names] of [['floor', FLOORS], ['backdrop', BACKDROPS]]) if (showAll || cat === kind.toUpperCase()) for (const [id, label] of Object.entries(names)) { const own = styleOwned(s, kind, id), cur = (s.style ?? {})[kind] === id; out.push({ kind, id, label: kind === 'floor' ? label + ' floor' : label + ' backdrop', price: STYLE_PRICE[kind][id], own, cur, level: 1, blurb: kind === 'floor' ? 'Changes the sand and the stones on the bottom of the tank.' : 'Changes the colours of the far water.', cat: kind.toUpperCase() }); }
    if (showAll) { const keep = out.filter((c) => isNew(s, c)); out.length = 0; out.push(...keep.sort((a, b) => a.price - b.price)); if (!out.length) return `<p class="dim newnone">Nothing new right now. Each time the tank levels up, the fish and decorations it unlocks wait here until you have them.</p>`; }      // NEW: only what the last level-up unlocked and you do not have yet
    return out.map((c) => {
      if (c.kind === 'floor' || c.kind === 'backdrop') { const key = c.kind + ':' + c.id; return `<button class="card ${selected === key ? 'sel' : ''}" data-k="${key}"><div class="sw" style="background:${SWATCH[c.kind][c.id]}"></div><b>${esc(c.label)}</b><span class="pr">${c.cur ? 'IN USE' : c.own || !c.price ? 'OWNED' : '🐚 ' + c.price}</span></button>`; }
      const lock = s.level < c.level, key = c.kind + ':' + c.id, free = c.kind === 'decor' && isFree(s, c.id);
      return `<button class="card ${selected === key ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="${key}"><img alt="" data-thumb="${key}">${!lock && isNew(S(), c) ? '<em class="newtag">NEW</em>' : ''}${(() => { const n = c.kind === 'decor' && tankNeeds(S()).find((x) => x.types.includes(c.id)); return n ? `<em class="wanttag">♥ ${esc(n.key === 'plants' ? 'Fish' : n.name)}</em>` : ''; })()}<b>${esc(c.label)}</b><span class="pr">${lock ? 'Lv ' + c.level : free ? 'FREE' : '🐚 ' + c.price}${c.deal && !lock ? ' <em>−25%</em>' : ''}</span></button>`;
    }).join('');
  }
  function shopDetail() {
    return '';                                   // a tap on a card acts straight away; there is no detail card any more
    const s = S(); if (!selected) return '';
    { const [k0, id0] = selected.split(':'); if (k0 === 'floor' || k0 === 'backdrop') { const label = (k0 === 'floor' ? FLOORS : BACKDROPS)[id0], own = styleOwned(s, k0, id0), price = STYLE_PRICE[k0][id0], cur = (s.style ?? {})[k0] === id0, can = !cur && (own || !price || s.shells >= price);
      return `<div class="detail"><div><h4>${esc(label)} ${k0}</h4><p>${k0 === 'floor' ? 'Changes the sand and the stones on the bottom of the tank.' : 'Changes the colours of the far water.'}</p>${!own && price && s.shells < price ? `<small class="note">${price - s.shells} more shells needed</small>` : ''}</div><button class="big gold" id="buy" ${can ? '' : 'disabled'}>${cur ? 'IN USE' : own || !price ? 'USE' : 'BUY · 🐚 ' + price}</button></div>`; } }
    const [kind, id] = selected.split(':'), d = kind === 'fish' ? SPECIES_DEF[id] : DECOR_DEF[id]; if (!d) return '';
    const free = kind === 'decor' && isFree(s, id), priceNow = kind === 'fish' ? fishPrice(id) : d.price;
    let note = '', can = true;
    if (s.level < d.level) { note = `Unlocks at tank level ${d.level}`; can = false; }
    else if (!free && s.shells < priceNow) { note = `${priceNow - s.shells} more shell${priceNow - s.shells === 1 ? '' : 's'} needed`; can = false; }
    else if (kind === 'fish' && s.fish.length + d.count > capacity(s.level)) { note = 'No room yet. Level up to grow the tank.'; can = false; }
    return `<div class="detail"><div><h4>${esc(d.label)}</h4><p>${esc(d.blurb)}${kind === 'fish' && d.count > 1 ? ` Comes as a school of ${d.count}.` : ''}</p>${kind === 'fish' && SOCIAL[id] ? `<small class="nat"><b>${esc(SOCIAL[id].kind)}.</b> ${esc(SOCIAL[id].line)}</small>` : ''}${kind === 'fish' && !note && adoptAdvice(s, id) ? `<small class="note">${esc(adoptAdvice(s, id))}</small>` : ''}${note ? `<small class="note">${esc(note)}</small>` : ''}</div>
      <button class="big gold" id="buy" ${can ? '' : 'disabled'}>${kind === 'fish' ? 'ADOPT' : 'PLACE'} · ${free ? 'FREE' : '🐚 ' + priceNow}</button></div>`;
  }
  const growLine = () => {
    const soon = S().fish.map((f) => ({ f, n: nextStage(f) })).filter((x) => x.n).sort((a, b) => a.n.ms - b.n.ms)[0];
    return soon ? `<p class="grow">🌱 ${esc(soon.f.name)} grows up in ${esc(soon.n.label)}</p>` : '';
  };
  const lvRow = () => { const s = S(), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, sc = scoreOf(s), pct = b ? Math.round(((sc - a) / (b - a)) * 100) : 100; return `<div class="lvrow"><b>LEVEL ${lv}</b><i><b style="width:${Math.max(4, Math.min(100, pct))}%"></b></i><span>Day ${game.day}</span></div>`; };
  const ordersHtml = () => { const o = S().orders ?? [], e = S().eggs ?? []; return o.length || e.length ? `<div class="orders"><small>ON THE WAY</small>${o.map((x) => `<div><span>📦 ${esc(x.name || SPECIES_DEF[x.species].label)}</span><b>${eta(x.arrivesAt - game.now())}</b></div>`).join('')}${e.map((x) => `<div><span>🥚 Egg</span><b>${eta(x.hatchAt - game.now())}</b></div>`).join('')}</div>` : ''; };
  const dailyHtml = () => { const d = S().daily; if (!d) return ''; return `<div class="wish daily ${d.done ? 'done' : ''}"><small>TODAY'S REQUEST · OPTIONAL</small><span>${esc(d.text)}${d.need > 1 && !d.done ? ` (${d.have}/${d.need})` : ''}</span><b>${d.done ? 'Done' : `+${d.reward ?? DAILY_REWARD} 🐚`}</b></div>`; };
  const wishHtml = () => { const s = S(), w = WISHES[s.wishIdx]; return w ? `<div class="wish"><small>THE TANK'S WISH</small><span>${esc(w.text)}</span><b>+${w.reward} 🐚</b></div>` : `<div class="wish"><small>THE TANK'S WISH</small><span>Every wish has come true.</span></div>`; };
  // the fish living in the tank now, your own octopus first; tap one to sell it to a new home
  const members = () => (game.shared ? game.members ?? [] : null);
  const inTankHtml = () => {
    const s = S(), me = game.you?.userId, fish = s.fish.filter((f) => !f.dead), rank = (f) => (f.species === 'octopus' ? 0 : 2) + (f.owner === me ? 0 : 1);
    if (!fish.length) return '';
    const row = (f) => { const d = SPECIES_DEF[f.species], mine = canSell(f, me, members()), who = f.owner && f.owner !== me && game.shared ? `${esc(f.ownerName ?? 'a friend')}'s` : f.owner === me && game.shared ? 'yours' : '';
      return `<button class="itf" data-sellfish="${f.id}"><img alt="" data-thumb="fish:${f.species}"><span><b>${esc(f.name)}</b><small>${esc(d?.label ?? f.species)}${f.species === 'seahorse' ? (sexOf(f) === 'm' ? ' ♂ male' : ' ♀ female') : ''} · ${esc(stageOf(f))}${who ? ' · ' + who : ''}</small></span><em class="${mine ? '' : 'off'}">${mine ? (f.preg ? 'Expecting' : 'Sell') : 'Theirs'}</em></button>`; };
    return `<h4>In the tank · ${fish.length}</h4><div class="intank">${fish.sort((a, b) => rank(a) - rank(b)).map(row).join('')}</div>`;
  };
  const bookHtml = () => {
    const s = S(), bred = (id) => [...s.fish, ...(s.memorial ?? [])].filter((f) => f.species === id && (f.parents ?? []).length).length;
    const cell = (kind, id, label) => { const got = s.seen[kind].includes(id), L = kind === 'fish' ? LIFESPAN[id] : null, nf = kind === 'fish' ? (FACTS[id] ?? []).length : 0, b = kind === 'fish' ? bred(id) : 0;      // a little field guide: how long it lives, how many facts, how many hatched here
      return `<div class="bk ${got ? '' : 'nope'}"><img alt="" data-thumb="${kind === 'fish' ? 'fish' : 'decor'}:${id}"><b>${got ? esc(label) : '???'}</b>${got && L ? `<small>~${Math.round(L / 30.4)} mo${nf ? ` · ${nf} facts` : ''}${b ? ` · ${b} born here` : ''}</small>` : ''}</div>`; };
    return `<div class="bkhead"><b>${s.seen.fish.length + s.seen.decor.length} / ${COLLECTION_SIZE()}</b><small>Every 5 finds earns 3 shells</small></div><h4>Fish</h4><div class="bkg">${Object.entries(SPECIES_DEF).map(([id, d]) => cell('fish', id, d.label)).join('')}</div><h4>Decorations</h4><div class="bkg">${Object.entries(DECOR_DEF).map(([id, d]) => cell('decor', id, d.label)).join('')}</div>`;
  };
  const memorialHtml = () => { const m = S().memorial ?? []; return m.length ? `<h4>Remembered</h4><div class="mem">${m.map((x, i) => [x, i]).reverse().map(([x, i]) => `<button data-mem="${i}">${esc(x.name)} · ${esc(SPECIES_DEF[x.species]?.label ?? x.species)}</button>`).join('')}</div>` : ''; };
  const journalHtml = () => `${memorialHtml()}<form class="send note"><input maxlength="90" placeholder="Add a note to the journal" autocomplete="off"><button>Add</button></form>${(() => {      // the journal, a day at a time, each line with a little picture of what happened
    const pic = (t) => /hatch|egg/i.test(t) ? 'hatched' : /passed away|laid .* to rest/i.test(t) ? 'trust' : /babies|born|nursery/i.test(t) ? 'parent' : /grew|grown|adult|growing up|elder/i.test(t) ? 'grown' : /friend|together|tails/i.test(t) ? 'friend' : /visit/i.test(t) ? 'visitor' : /learned|trick|puzzle|jar|worked out/i.test(t) ? 'trick' : /crab/i.test(t) ? 'crab' : /fed|feed/i.test(t) ? 'feed' : /water/i.test(t) ? 'water' : /note/i.test(t) ? 'note' : /bottle|gift|shell/i.test(t) ? 'gift' : /plant|rock|decor|shell|coconut|placed|added/i.test(t) ? 'spot' : 'wish';
    const days = []; for (const e of game.journal.slice().reverse()) { const k = e.day; let d = days.at(-1); if (!d || d.k !== k) days.push((d = { k, ts: e.ts, rows: [] })); d.rows.push(e); }
    return days.length ? days.map((d) => `<div class="jday"><h5>Day ${d.k}${d.ts ? ` · ${new Date(d.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</h5><div class="jcard">${d.rows.map((e) => `<div class="je2"><span class="jic">${msIcon(pic(e.text), true, 22)}</span><span>${esc(e.text)}</span></div>`).join('')}</div></div>`).join('') : '<p class="dim">The journal fills up as things happen in the tank.</p>'; })()}`;
  // reef themes, as their own shelf at the end of the shop's row: each one, how close the tank is, and the pieces that make it
  const themesPage = () => { const s = S(), ths = themesOf(s), n = ths.filter((x) => x.active).length;
    return `<p class="dim themelead">Pieces that belong together make the fish happier and draw a rare visitor of their own. ${n} of ${ths.length} complete.</p><div class="thlist">${ths.map((th) => { const types = THEMES[th.key]?.types ?? [], haveT = new Set(s.decor.map((d) => d.type));
      return `<div class="th ${th.active ? 'on' : ''}"><div class="tht"><b>${esc(th.label)}</b><em>${th.active ? 'Complete ✓' : `${th.have} of ${th.need}`}</em></div><i><b style="width:${Math.round((th.have / th.need) * 100)}%"></b></i><small>${esc(th.blurb)}</small><div class="thp">${types.map((ty) => `<span class="${haveT.has(ty) ? 'got' : ''}">${esc(DECOR_DEF[ty]?.label ?? ty)}</span>`).join('')}</div></div>`; }).join('')}</div>`; };
  const themesHtml = () => { if (S().decor.length < 3) return ''; const ths = themesOf(S()), n = ths.filter((x) => x.active).length; return fold('themes', `<span>REEF THEMES · ${n} of ${ths.length}</span>`, `<div class="themes"><div>${ths.map((th) => `<span class="theme ${th.active ? 'on' : ''}" title="${esc(th.blurb)}">${esc(th.label)} <b>${th.have}/${th.need}</b></span>`).join('')}</div><p class="dim">Pieces that belong together make the fish happier and draw their own rare visitor.</p></div>`); };
  const styleHtml = () => { const st = S().style ?? { floor: 'sand', backdrop: 'candy' }, row = (label, key, opts) => `<div class="sty"><small>${label}</small><div>${Object.entries(opts).map(([k, v]) => `<button class="chipb ${st[key] === k ? 'on' : ''}" data-style="${key}:${k}">${v}${styleOwned(S(), key, k) ? '' : ` · ${STYLE_PRICE[key][k]} 🐚`}</button>`).join('')}</div></div>`; return `<div class="styles">${row('FLOOR', 'floor', FLOORS)}${row('BACKDROP', 'backdrop', BACKDROPS)}</div>`; };
  // A check-in page: the one thing worth doing now, what is coming up, and how shells are earned.
  // Collapsible sections remember whether they are open, so a refresh does not snap them shut.
  game.folds ||= new Set();
  const fold = (id, summary, body) => `<details class="fold" data-fold="${id}" ${game.folds.has(id) ? 'open' : ''}><summary>${summary}</summary><div>${body}</div></details>`;
  const wantHtml = () => { const w = S().want; if (!w) return ''; return `<div class="wish"><small>TODAY'S REQUEST · ${esc((S().fish.find((f) => f.id === w.fish)?.name ?? 'A FISH').toUpperCase())}</small><span>${esc(w.text)}</span><b>+${WANT_REWARD} 🐚</b></div>`; };
  const comfortHtml = () => { const s = S(); if (!s.fish.length || !adv()) return ''; const all = s.fish.map((f) => ({ f, c: comfortOf(s, f) })), avg = Math.round(all.reduce((n, x) => n + x.c.score, 0) / all.length), tips = [...new Set(all.sort((a, b) => a.c.score - b.c.score).flatMap((x) => x.c.tips))].slice(0, 3);
    return fold('tank', `<span>TANK · ${avg >= 80 ? 'Cosy' : avg >= 55 ? 'Comfortable' : 'Could be better'} ${avg}%</span>`, `${tips.map((t) => `<p class="dim">${esc(t)}</p>`).join('') || '<p class="dim">Everyone is comfortable.</p>'}${projectHtml()}`); };
  const projectHtml = () => { const s = S(), goal = Object.entries(DECOR_DEF).filter(([k, d]) => d.price >= 100 && d.level <= s.level + 1 && !s.decor.some((x) => x.type === k)).sort((a, b) => a[1].price - b[1].price)[0]; if (!goal) return '';
    const [k, d] = goal, pct = Math.min(100, Math.round((s.shells / d.price) * 100)), locked = d.level > s.level; return `<p class="dim">Saving for the ${esc(d.label)}: ${locked ? 'unlocks at level ' + d.level : `${s.shells} of ${d.price} 🐚`}</p><div class="pj"><i style="width:${locked ? 0 : pct}%"></i></div>`; };
  const todayHtml = (busy = false) => {
    const s = S(), now = game.now(), g = goalText(), up = [];
    for (const o of (s.orders ?? []).slice().sort((x, y) => x.arrivesAt - y.arrivesAt)) up.push([`📦 ${esc(o.name || SPECIES_DEF[o.species].label)} arrives`, eta(o.arrivesAt - now)]);
    for (const e of (s.eggs ?? [])) up.push(['🥚 An egg hatches', eta(e.hatchAt - now)]);
    const grow = s.fish.map((f) => ({ f, n: nextStage(f, now) })).filter((x) => x.n).sort((a, b) => a.n.ms - b.n.ms)[0]; if (grow) up.push([`🌱 ${esc(grow.f.name)} grows up`, eta(grow.n.ms)]);
    const age = s.fish.map((f) => ({ f, d: (now - f.born) / 864e5 })).filter((x) => x.d < 30).map((x) => ({ ...x, to: x.d < 14 ? 14 : 30 })).sort((a, b) => (a.to - a.d) - (b.to - b.d))[0]; if (age) up.push([`🎂 ${esc(age.f.name)} turns ${age.to} days`, eta((age.to - age.d) * 864e5)]);
    const ready = readyToTrim(s, now).length; if (ready) up.push([`🌿 ${ready} plant${ready > 1 ? 's' : ''} ready to trim`, `+${ready}`]);
    const sc = scoreOf(s), nx = LEVEL_AT[s.level]; if (nx) up.push([`⭐ Level ${s.level + 1}`, `${sc}/${nx}`]);
    const wish = WISHES[s.wishIdx]; if (wish) up.push([`✨ Tank wish: ${esc(wish.text)}`, `+${wish.reward}`]);
    const row = ([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`, first = up.slice(0, 3), rest = up.slice(3);
    const k = dayTicks(s, now), m = tankMood(s, now), n = [k.care, k.wish, k.bond].filter(Boolean).length, tick = (v) => (v ? '✓' : '○');
    const careCard = s.fish.length && adv() ? `<div class="orders daycare ${k.paid ? 'done' : ''}"><small>TODAY'S CARE · ${n} OF 3${k.paid ? ' · PERFECT DAY' : ''}</small><div><span>${tick(k.care)} Tank looked after</span><b>${k.care ? '' : 'feed · water · glass'}</b></div><div><span>${tick(k.wish)} Today's request</span><b></b></div><div><span>${tick(k.bond)} A fish got attention</span><b>${k.bond ? '' : 'play · teach · pet'}</b></div>${k.paid ? '' : `<div class="dim"><span>All three: +${PERFECT_DAY_REWARD} 🐚. Missing a day costs nothing.</span></div>`}</div>` : '';
    return `${lvRow()}${busy && m.label === 'Could use a hand' ? '' : `<div class="moodchip ${m.key}"><b>${m.label}</b> · ${esc(m.note)}</div>`}${(() => { const sk = skyOf(Date.now()); return sk.event ? `<div class="moodchip sky"><b>${esc(sk.event.label)}</b> · ${esc(sk.event.text)}</div>` : ''; })()}${s.fish.length > 1 ? (() => { const hm = harmonyOf(s); return `<div class="moodchip harm ${hm.key}"><b>Harmony: ${hm.label}</b> · ${esc(hm.note)}</div>`; })() : ''}${careCard}${g.gift || !g.text || g.tab === 'care' ? '' : `<button class="wish daily" data-open="${g.tab || 'tank'}"><small>WORTH DOING NOW</small><span>${esc(g.text)}</span>${g.tab && g.tab !== 'tank' ? '<b>Go ›</b>' : ''}</button>`}
      ${S().want ? wantHtml() : dailyHtml()}${first.length ? `<div class="orders"><small>COMING UP</small>${first.map(row).join('')}</div>` : ''}
      ${rest.length ? fold('more', `<span>${rest.length} more coming up</span>`, `<div class="orders flat">${rest.map(row).join('')}</div>`) : ''}${comfortHtml()}
      `;
  };
  const EARN = [['Feed hungry fish or a hungry octopus', '+1 each'], ['Wipe the glass, every few days', `+${GLASS_PAY} (a pearl every 5th: +${PEARL_PAY})`], ['Change cloudy water, every few days', `+${WATER_PAY}`], ['Say hello to a rare visitor', '+4'], ['Collect a find in the tank', '+1 to +4'], ["Today's request", '+3, +5 or +8 (a fish\'s own: +4)'], ['A fish grows up', '+1, +2'], ['A fish reaches 14 / 30 days', '+5 / +8'], ['Two fish become friends', '+3'], ['A fish finds its favourite spot', '+2'], ['The first egg hatches', '+5'], ['Open a friend\'s bottle', '+2'], ['Every 5 things in the collection book', '+3'], ['Tank level up', '+4 and more']];
  let feedOpen = null;      // null: the food list opens by itself when someone is hungry; tapping Feed opens or closes it by hand
  // ── Feeding ── one model of who this caretaker can feed, used by the headline, the Feed button and the drawer, so they always agree.
  // A group is one octopus (its own hunger, a crab each), the seahorses or the fish (the two share one mealtime). For each: how full it is,
  // whether it can eat now, whether a free food would earn a shell (only when it is properly hungry), its foods and whose favourite each is,
  // and, in a shared tank, who fed it last. The thresholds are the rules' own: a meal can be given from 8% hunger and pays from 25%.
  const ICON = { flakes: msIcon('feed', true, 22), pellets: msIcon('pellets', true, 22), treats: msIcon('shrimp', true, 22), mysis: msIcon('shrimp', true, 22), crab: msIcon('crab', true, 22) };      // (the tank's own pixel pictures)
  const names = (xs) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : xs.join(' and '));
  const soon = (sec) => { const h = sec / 3600; return h < 0.75 ? 'in a few minutes' : h < 1.5 ? 'in about an hour' : `in about ${Math.round(h)} hours`; };
  const feedModel = () => {
    const s = S(), me = game.you?.userId, live = s.fish.filter((f) => !f.dead), groups = [];
    const state = (h, due, rate) => ({ h, eat: h >= 0.08, pays: h > 0.25, word: h < 0.08 ? 'Full' : h > 0.25 ? 'Hungry' : 'Peckish', cls: h < 0.08 ? 'full' : h > 0.25 ? 'hungry' : 'ok', pct: Math.round(100 * Math.max(0, 1 - Math.min(1, h / due))), canIn: h < 0.08 ? (0.08 - h) / rate : 0 });
    const fedLine = (fb) => (game.shared && fb && Date.now() - fb.at < 12 * 3600e3 ? `${fb.uid === me ? 'You' : esc(fb.name ?? 'Someone')} fed them ${ago(fb.at)}` : '');
    for (const o of live.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a)))
      groups.push({ id: o.id, kind: 'octo', thumb: fishThumb('octopus', o.pal ?? null), title: esc(o.name), who: esc(o.name), sub: 'Octopus · eats crabs', ...state(octoHunger(o), OCTO_DUE, OHR), foods: [{ k: 'crab', fav: '' }], note: 'The crab drops onto the sand for it to hunt.', fed: fedLine(o.fedBy) });
    for (const h of live.filter((f) => f.species === 'seahorse' && canFeedOwn(f, me, game.shared)).sort((a, b) => ownHunger(b) - ownHunger(a)))      // each seahorse has its own hunger too, and its own caretaker
      groups.push({ id: h.id, kind: 'sea', thumb: fishThumb('seahorse'), title: esc(h.name), who: esc(h.name), sub: `Seahorse · ${sexOf(h) === 'm' ? (h.preg ? '♂ male · expecting' : '♂ male') : '♀ female'} · eats tiny shrimp`, ...state(ownHunger(h), OCTO_DUE, OHR), foods: [{ k: 'mysis', fav: 'its favourite' }], note: '', fed: fedLine(h.fedBy) });
    const fish = live.filter((f) => f.species !== 'octopus' && f.species !== 'seahorse'), meal = state(s.hunger ?? 0, 0.3, HR), fed = fedLine(s.fedBy);
    if (fish.length) { const fav = (k) => names(fish.filter((f) => favFoodOf(f) === k).map((f) => esc(f.name))); groups.push({ id: null, kind: 'fish', thumb: fishThumb(fish[0].species), title: fish.length === 1 ? esc(fish[0].name) : 'The fish', who: fish.length === 1 ? esc(fish[0].name) : 'the fish', sub: fish.length === 1 ? (SPECIES_DEF[fish[0].species]?.label ?? 'Fish') : esc(names(fish.map((f) => f.name))), ...meal, foods: ['flakes', 'pellets', 'treats'].map((k) => ({ k, fav: fav(k) })), note: '', fed }); }
    const others = live.filter((f) => (f.species === 'octopus' || f.species === 'seahorse') && !canFeedOwn(f, me, game.shared));
    return { groups, others, hungry: groups.filter((g) => g.pays), canEat: groups.filter((g) => g.eat) };
  };
  // the one food to give straight from the headline: a crab for a hungry octopus, mysis if only seahorses are hungry, otherwise flakes
  const quickFood = (g) => (g.kind === 'octo' ? 'crab' : g.kind === 'sea' ? 'mysis' : 'flakes');
  const feedDrawer = () => {
    const M = feedModel(), cur = game.feedFood, sh = S().shells;
    if (!M.groups.length) return `<div class="drawer"><p class="fnote">${M.others.length ? `Only ${esc(M.others[0].ownerName ?? 'its caretaker')} can feed ${esc(M.others[0].name)}.` : 'Nothing to feed yet.'}</p></div>`;
    const chip = (g, k) => { const d = FOODS[k]; return d.price ? `<i class="cost">${d.price} 🐚</i>` : g.pays ? '<i class="earn">free +1 🐚</i>' : '<i>free</i>'; };
    const food = (g, f) => { const d = FOODS[f.k], poor = sh < d.price; return `<button class="fd ${cur === f.k ? 'on' : ''}" data-feed="${f.k}"${g.id ? ` data-for="${esc(g.id)}"` : ''} ${poor ? 'disabled' : ''}><span>${ICON[f.k]}</span><b>${d.label}</b>${f.fav ? `<small>♥ ${f.fav}</small>` : ''}${poor ? '<small class="poor">not enough shells</small>' : chip(g, f.k)}</button>`; };
    const out = M.groups.map((g) => `<section class="fg ${g.eat ? '' : 'isfull'}"><div class="fgh"><img alt="" src="${g.thumb}"><div><b>${g.title}</b><small>${g.sub}</small></div><em class="${g.cls}">${g.word}</em><div class="fh ${g.cls}" role="img" aria-label="${g.pct}% full"><i style="width:${Math.max(4, g.pct)}%"></i></div><span class="fpct">${g.pct}% full</span></div>
      ${g.eat ? `<div class="fds">${g.foods.map((f) => food(g, f)).join('')}</div>` : `<p class="fwait">Full for now · can eat again ${soon(g.canIn)}</p>`}${g.eat && g.note ? `<p class="fnote">${g.note}</p>` : ''}${g.fed ? `<p class="fnote fby">${g.fed}</p>` : ''}</section>`);
    for (const [who, os] of Object.entries(M.others.reduce((g, o) => { (g[o.ownerName ?? 'their caretaker'] ||= []).push(o); return g; }, {}))) out.push(`<p class="fnote">${esc(os.map((o) => o.name).join(' and '))} ${os.length === 1 ? 'is' : 'are'} fed by ${esc(who)}.</p>`);
    return `<div class="drawer">${out.join('')}${M.canEat.length ? `<p class="fhow">Pick a food, then tap the water. Each feed is up to 3 drops.${M.hungry.length ? ' A hungry animal fed for free earns 1 🐚.' : ''}</p>` : ''}</div>`;
  };
  const foodRow = () => { if (!adv()) return ''; const cur = game.feedFood ?? 'flakes', sh = S().shells; return `<div class="foodrow"><small>FOOD</small>${Object.entries(FOODS).filter(([, d]) => (d.octo ? hasOcto(S()) : d.sea ? hasSeahorse(S()) : hasFishOnly(S()) || !hasOcto(S()))).map(([k, d]) => `<button data-food="${k}" class="${k === cur ? 'on' : ''} ${sh < d.price ? 'no' : ''}">${d.label}${d.price ? ` · ${d.price} 🐚` : ''}</button>`).join('')}</div>`; };
  let devInfo = null; const devFast = () => { try { return localStorage.getItem('ourtank.devfast') === '1'; } catch { return false; } };
  const devLoad = async () => { if (!game.dev) return; try { devInfo = await cb.devInfo(); } catch (e) { devInfo = { tank: null }; } if (tab === 'friends' && sub === 'devtools') { const y = sheet.scrollTop; open('friends', true); sheet.scrollTop = y; } };
  const views = {
    // Care, the way a well-made iPhone app would lay it out: one line that says how things are; the chores that need you now, each with its
    // one button; the rest as quiet rows saying when they will be due; the extras apart; then the tank's state and the day.
    care: () => {
      const s = S(), M = feedModel(), k = careState(), feedOn = feedOpen ?? M.hungry.length > 0, H = M.hungry[0];
      const feedSub = !M.groups.length ? k.feed[0] : M.hungry.length === 1 ? `${H.who.charAt(0).toUpperCase() + H.who.slice(1)} ${/^the /.test(H.who) ? 'are' : 'is'} hungry` : M.hungry.length ? `${M.hungry.length} are hungry` : M.canEat.length ? 'Can eat a little' : `All full · next meal ${soon(Math.min(...M.groups.map((g) => g.canIn)))}`;
      const quick = H ? ` data-food="${quickFood(H)}"${H.id ? ` data-for="${esc(H.id)}"` : ''}` : '';
      const chores = [...(s.fish.some((f) => !f.dead) ? [] : [null]).filter(Boolean), { act: 'feeddrawer', icon: '🫙', title: 'Feed', sub: feedSub, due: M.hungry.length > 0, btn: 'Feed', quick: !!H, feed: true },
        { act: 'clean', icon: '🧽', title: 'Clean the glass', sub: k.glass[0].replace(/ · wipe now$/, ''), due: k.glass[1] === 'due', btn: 'Wipe' },
        { act: 'water', icon: '💧', title: 'Change the water', sub: k.water[0].replace(/ · change now$/, ''), due: k.water[1] === 'due', btn: 'Change' }];
      for (const e of s.eggs ?? []) { const left = Math.max(0, e.hatchAt - Date.now()), h = Math.round(left / 36e5), c = e.cared?.length ?? 0, nm = (id, sn) => s.fish.find((f) => f.id === id)?.name ?? sn?.name;      // an egg waiting to hatch: how long, and how it is being looked after
        chores.push({ act: 'egg', icon: '🥚', title: `${nm(e.a, e.pa) && nm(e.b, e.pb) ? `${esc(nm(e.a, e.pa))} & ${esc(nm(e.b, e.pb))}'s egg` : 'An egg'}`, sub: `hatches ${left < 36e5 ? 'any minute' : h < 24 ? `in ${h} h` : (() => { const d = Math.round(h / 12) / 2; return `in ${d} day${d === 1 ? '' : 's'}`; })()} · ${c >= 2 ? 'will hatch strong ✓' : `looked after ${c} of 2 days`}`, due: false }); }
      const trim = readyToTrim(s, Date.now()).length; if (trim) chores.push({ act: 'trim', icon: '✂️', title: 'Trim the plants', sub: `${trim} ready · +${trim} 🐚`, due: true, btn: 'Trim' });
      const row = (c) => `<div class="crow ${c.due ? 'due' : ''}" role="button" tabindex="0" data-act="${c.due || c.feed ? c.act : 'notyet'}" data-say="${esc(c.sub)}"><span class="ci">${pix(c.icon)}</span><span class="ct"><b>${c.title}</b><small>${c.sub}</small></span>${c.due ? `<button class="cbtn" data-act="${c.quick ? 'feednow' : c.act}"${c.quick ? quick : ''}>${c.btn}</button>` : `<i class="chev">${c.feed ? (feedOn ? '⌃' : '⌄') : '›'}</i>`}</div>${c.feed && feedOn ? feedDrawer() : ''}`;
      if (!s.fish.some((f) => !f.dead)) chores.shift();      // (nothing to feed: no Feed row)
      const due = chores.filter((c) => c.due), later = chores.filter((c) => !c.due), head = careHead();
      // a small status line under the title; when something is waiting, the jobs themselves come straight after it
      const hero = due.length ? `<p class="cstat due"><i></i>${due.length === 1 ? '1 job ready' : `${due.length} jobs ready`} · each earns 🐚</p>`
        : `<p class="cstat"><i></i>All looked after · ${esc(head[0].replace(/^All looked after\.\s*/, '') || 'enjoy the tank.')}</p>`;
      const extras = `${(() => { const o = S().fish.find((f) => canPuzzle(f) && canFeedOcto(f, game.you?.userId, game.shared)) ?? S().fish.find((f) => canPuzzle(f)); if (!o) { const b = S().fish.find((f) => f.species === 'octopus' && !f.dead); return b ? tile('🧩', 'Puzzle jar', 'puzzle', `when ${esc(b.name)} grows up`) : ''; } const busy = !!o.puzzle, rest = o.puzzleAt != null && Date.now() - o.puzzleAt < 3 * 3600e3; return tile('🧩', 'Puzzle jar', 'puzzle', busy ? `${esc(o.name)} is working` : rest ? `${esc(o.name)} is tired of puzzles · next one in ${eta(3 * 3600e3 - (Date.now() - o.puzzleAt))}` : `for ${esc(o.name)} · ${PUZZLE_COST} 🐚`); })()}${adv() ? tile('📷', 'Postcard', 'photo', 'a picture of the tank') : ''}`;
      const wishes = tankNeeds(s).map((n) => `<div class="tap wishrow" role="button" data-act="needshop" data-cat="${DECOR_DEF[n.types[0]]?.cat ?? 'PLANTS'}"><i>${msIcon({ hide: 'rock', stem: 'spot', shell: 'coconut', bubbles: 'bubbles', plants: 'spot' }[n.key] ?? 'spot', true, 22)}</i><span>${esc(n.text)}</span><b>Shop ›</b></div>`).join('');      // what the animals would like, in the same short list as what is coming
      const ahead = forecast(s, Date.now(), 2), coming = ahead.length || wishes ? `<div class="soon"><h5>Today</h5>${wishes}${ahead.map((x) => `<div${/surprise/.test(x.text) ? ' class="tap" role="button" data-act="feeddrawer"' : ''}><i>${x.fish ? `<img alt="" class="fthumb" src="${fishThumb(x.species, x.pal ?? null)}">` : pix(x.icon, 22)}</i><span>${esc(x.text)}</span><b>${x.when}</b></div>`).join('')}</div>` : '';      // what to look forward to: the next two things, soonest first
      // two tabs: Care (what the animals need: the jobs, what is coming, the checklist) and Play (the fun things: puzzles, postcards, what they would love to have)
      const seg = `<div class="seg two">${[['care', 'Care'], ['play', 'Play']].map(([k, l]) => `<button class="${careSub === k ? 'on' : ''}" data-csub="${k}">${l}${k === 'care' && due.length ? ` <i class="nc">${due.length}</i>` : ''}</button>`).join('')}</div>`;
      if (careSub === 'play') return `<h3>${esc(game.tankName ?? 'Your tank')}</h3>${seg}${wishes ? `<h4>They would love</h4><div class="soon">${wishes}</div>` : ''}${extras.replace('PUZZLE', '').trim() ? `<h4>Things to do together</h4><div class="grid2 acts mini">${extras}</div>` : ''}<p class="dim sm playsoon">More toys are on the way: balls to toss in, bubbles to blow.</p>`;
      const comingCare = ahead.length ? `<div class="soon"><h5>Coming up</h5>${ahead.map((x) => `<div${/surprise/.test(x.text) ? ' class="tap" role="button" data-act="feeddrawer"' : ''}><i>${x.fish ? `<img alt="" class="fthumb" src="${fishThumb(x.species, x.pal ?? null)}">` : pix(x.icon, 22)}</i><span>${esc(x.text)}</span><b>${x.when}</b></div>`).join('')}</div>` : '';
      return `<h3>${esc(game.tankName ?? 'Your tank')}</h3>${seg}${hero}${due.length ? `<h4>Needs you</h4><div class="cgroup">${due.map(row).join('')}</div>` : ''}${comingCare}${later.length ? `<h4>Later</h4><div class="cgroup quiet">${later.map(row).join('')}</div>` : ''}
        <h4>Daily checklist</h4>${todayHtml(due.length > 0)}${fold('tankstatus', `<span>Animals, water and glass</span>`, meters())}`;
    },
    notices: () => `<h3>Notices</h3><div class="jl nts">${noticesHtml()}</div>`,
    decorate: () => `<h3>Shop</h3><div class="shophead"><div class="cats">${[...CATS, 'THEMES'].filter((c) => adv() || (c !== 'FLOOR' && c !== 'BACKDROP')).map((c) => `<button class="cat ${c === cat ? 'on' : ''}" data-cat="${c}">${c}${c === 'NEW' && newCount() ? ` <i class="nc">${newCount()}</i>` : ''}</button>`).join('')}</div></div>
      ${cat === 'THEMES' ? themesPage() : `<div class="cards">${shopCards()}</div>`}${shopDetail()}<div class="shopfoot"><button class="lnk ${rearrange ? 'on' : ''}" id="rearr">${rearrange ? 'Tap a decoration to move or take it out · Done' : 'Move or take out decorations'}</button></div>`,
    friends: () => {
      const seg = `<div class="seg">${[['friends', 'Friends'], ['journal', 'Journal'], ['book', 'Collection'], ['settings', 'Settings']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div>`;
      if (sub === 'settings') return `<div class="crew">${views.settings().replace('<h3>Settings</h3>', '<h3>Settings</h3>' + seg)}</div>`;
      if (sub === 'journal') return `<div class="crew"><h3>Journal</h3>${seg}<div class="jl nts">${noticesHtml()}</div>${journalHtml()}</div>`;      // what happened lately (the old notices) on top, then the whole story
      if (sub === 'book') return `<div class="crew"><h3>Collection</h3>${seg}${inTankHtml()}${bookHtml()}</div>`;
      if (sub === 'look') return lookHtml();
      if (sub === 'devtools') return views.devtools();
      if (!game.shared) return `<div class="crew"><h3>Crew</h3><p class="crewsub">Just you for now</p>${seg}<div class="crewbox"><div class="slots"><div class="slot me"><span class="avw live"><canvas class="av big" data-slot="me"></canvas></span><b>You</b><small>Here now</small><button class="nudge" data-edit-me>Edit look</button></div><div class="slot empty"><span class="avw add">+</span><b>Invite</b><small>3 seats free</small></div></div>
        <button class="pcmini" data-act="photo"><span>${msIcon('postcard', true, 26)}</span><b>Send a postcard</b><small>of the tank right now</small><i class="chev">›</i></button></div>
        <p class="dim crewsolo">Share your tank and up to three friends can look after it with you: notes on the glass, caring together, gifts and bottles.</p></div>`;
      const wish = WISHES[S().wishIdx];
      const me = game.you.userId, myName = game.members?.find((x) => x.id === me)?.name ?? '', youify = (txt) => (myName ? txt.replace(new RegExp('^' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), 'You').replace(new RegExp(' and ' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), ' and you') : txt);
      const THANKABLE = ['feed', 'glass', 'water', 'decor', 'fish', 'visitor', 'bottle', 'gift'];
      // the crew feed: what everyone said and did, in one list, newest first, under Today / Yesterday / the day's name; a heart to thank a friend for something they did today
      const ICON = { feed: '🍽️', glass: '🧽', water: '💧', decor: '🪴', fish: '🐟', visitor: '✨', bottle: '🍾', gift: '🎁', wish: '⭐', note: '📝', trim: '✂️', puzzle: '🧩' };
      const dayName = (ts) => { const a = new Date(ts), b = new Date(), d = Math.round((new Date(b.toDateString()) - new Date(a.toDateString())) / 864e5); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : a.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }); };
      const items = [...game.activity.map((a) => ({ k: 'act', ...a })), ...game.messages.map((m) => ({ k: 'msg', ...m }))].filter((x) => Number.isFinite(x.ts)).sort((a, b) => b.ts - a.ts).slice(0, 40);
      let lastDay = null; const feed = items.map((it) => { const day = dayName(it.ts), head = day !== lastDay ? `<div class="fday">${day}</div>` : ''; lastDay = day;
        if (it.k === 'msg') { const mine = it.userId === me; return `${head}<div class="fmsg ${mine ? 'me' : ''}"><b>${mine ? 'You' : esc(it.name)}</b><p>${esc(it.text)}</p><small>${ago(it.ts)}</small></div>`; }
        const can = it.userId && it.userId !== me && THANKABLE.includes(it.type) && Date.now() - it.ts < 24 * 3600e3 && !game.thanked?.has(it.id);
        // a notification row: who (their avatar), what they did, when, and a little picture of it
        const mine = it.userId === me, who = mine ? 'You' : game.members?.find((x) => x.id === it.userId)?.name ?? '', raw = String(it.text ?? ''), body = who && raw.startsWith(who) ? raw.slice(who.length).trim() : mine && myName && raw.startsWith(myName) ? raw.slice(myName.length).trim() : raw;
        const hue = [...String(it.userId ?? 'tank')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7), ini = (mine ? myName || 'You' : who) ? (mine ? myName || 'You' : who)[0].toUpperCase() : '';
        const pic = { feed: 'feed', water: 'water', glass: 'glass', decor: 'spot', trim: 'trim', fish: 'grown', note: 'note', gift: 'gift', visitor: 'visitor', bottle: 'bottle', wish: 'wish', puzzle: 'puzzle', grow: 'grown' }[it.type] ?? 'wish';
        return `${head}<div class="fact ${mine ? 'mine' : ''}">${who ? `<span class="fav" style="--h:${hue}">${ini}</span>` : '<span class="fav tank">🐠</span>'}<span class="tx">${who ? `<b>${esc(who)}</b> ` : ''}${esc(who ? body.replace(/^\w/, (c) => c.toLowerCase()) : youify(raw))} <small>${ago(it.ts)}</small></span><span class="fic">${msIcon(pic, true, 30)}</span>${can ? `<button class="heart" data-thank="${it.id}" data-to="${it.userId}" aria-label="Say thanks">♡</button>` : ''}</div>`; }).join('');
      const on = (game.online ?? []).length, all = (game.members ?? []).length;
      return `<div class="crew"><h3>Crew</h3><p class="crewsub">${esc(game.tankName ?? 'Your tank')} · ${on > 1 ? `${on} here now` : all > 1 ? `${all} caretakers` : 'Invite friends to share it'}</p>${seg}<div class="crewbox"><div class="slots">${slotsHtml()}</div><button class="pcmini" data-act="photo"><span>${msIcon('postcard', true, 26)}</span><b>Send a postcard</b><small>of the tank right now</small><i class="chev">›</i></button></div>
        <h4>Activity</h4><div class="compose ${composeMode}"><div class="cmode" role="tablist"><button type="button" data-mode="msg" class="${composeMode === 'msg' ? 'on' : ''}">Message</button><button type="button" data-mode="note" class="${composeMode === 'note' ? 'on' : ''}">${msIcon('note', true, 16)} Note</button><button type="button" data-mode="bottle" class="${composeMode === 'bottle' ? 'on' : ''}">${msIcon('bottle', true, 16)} Bottle</button></div>
        ${composeMode === 'bottle' ? (() => { const others = (game.members ?? []).filter((x) => x.id !== me); if (!others.some((x) => x.id === bottleTo)) bottleTo = others[0]?.id ?? null; return others.length > 1 ? `<div class="bto">${others.map((x) => `<button type="button" data-bto="${x.id}" class="${x.id === bottleTo ? 'on' : ''}">${esc(x.name)}</button>`).join('')}</div>` : ''; })() : ''}
        <form class="send feedsend"><input maxlength="${composeMode === 'note' ? 120 : composeMode === 'bottle' ? 80 : 140}" placeholder="${composeMode === 'note' ? 'A post-it for their glass…' : composeMode === 'bottle' ? `A secret for ${esc(game.members?.find((x) => x.id === bottleTo)?.name ?? 'a friend')}…` : 'Message the crew'}" autocomplete="off" value="${esc(crewDraft)}"><button aria-label="Send">${composeMode === 'note' ? msIcon('note', true, 18) : composeMode === 'bottle' ? msIcon('bottle', true, 18) : '↑'}</button></form>
        <small class="chint">${composeMode === 'note' ? 'Sticks on everyone’s glass. You will see when they have read it.' : composeMode === 'bottle' ? 'Only they can read it. It washes up in their tank · 2 🐚' : 'Shows here, in the crew’s activity.'}</small></div>
        <div class="feed">${feed || '<p class="dim">Nothing yet. Say hello to the crew.</p>'}</div>
        ${wish ? `<div class="wish"><small>THE TANK'S WISH</small><span>${esc(wish.text)}</span><b>+${wish.reward} 🐚</b></div>` : ''}</div>`;
    },
    settings: () => `<h3>Settings</h3><div class="set">
      <h4>Sound and look</h4><div class="group">
        <label class="row2"><span>Sound</span><button class="tog ${soundOn() ? 'on' : ''}" id="snd">${soundOn() ? 'On' : 'Off'}</button></label>
        <label class="row2"><span>Music</span><button class="tog ${musicOn() ? 'on' : ''}" id="mus">${musicOn() ? 'On' : 'Off'}</button></label>
        <label class="row2"><span>Graphics</span><button class="tog" id="gfx">${['Low', 'Medium', 'High'][cb.quality()]}</button></label>
      </div>
      ${game.shared ? `<h4>Notifications</h4><div class="group">
        <label class="row2"><span>Notifications</span><button class="tog" id="pushbtn">…</button></label>
        <label class="row2" id="pushtestrow" hidden><span>Check that they arrive</span><button class="tog" id="pushtest">Send a test</button></label>
      </div>` : `<h4>Help</h4><div class="group"><label class="row2"><span>Replay the tips</span><button class="tog" id="tutr">Replay</button></label></div>`}
      ${game.test ? `<h4>Test aquarium</h4><div class="group"><div class="row2"><span>You are in</span><b>TEST AQUARIUM</b></div><label class="row2"><span>Back to your own tank</span><button class="tog" id="devleave">Leave test</button></label></div>` : `<h4>Your tank</h4><div class="group">
        ${game.state.fish.some((f) => f.species === 'octopus') ? `<label class="row2"><span>Octopus moves things</span><button class="tog ${game.state.flags?.noRearrange ? '' : 'on'}" id="rearr">${game.state.flags?.noRearrange ? 'Off' : 'On'}</button></label>` : ''}
        ${game.shared ? `<div class="row2"><span>Tank</span><b>${esc(game.tankName)}</b></div>
        <div class="row2"><span>Tank code</span><b class="tcode">${esc(game.code ?? '')}</b></div>
        <label class="row2"><span>Invite friends</span><span><button class="tog" data-code="copy">Copy code</button> <button class="tog" data-code="share">Share</button></span></label>
        <label class="row2"><span>Change the code<small>The old one stops working</small></span><button class="tog" data-code="regen">New code</button></label>
        <div class="row2"><span>Tank storage</span><b id="stor">checking…</b></div>
        <div class="row2"><span>Copy on this phone</span><b id="phc">…</b></div>
        <label class="row2"><span>Recovery key</span><button class="tog" id="rkey">Show</button></label>
        <label class="row2"><span>Backup</span><span><button class="tog" id="bkup">Download</button> <button class="tog" id="bkcopy">Copy as text</button></span></label>
        <label class="row2"><span>Leave this tank</span><button class="tog warn" id="leave">Leave</button></label>` : `<label class="row2"><span>Start over</span><button class="tog warn" id="reset">Reset tank</button></label>`}
      </div>`}
      ${new URLSearchParams(location.search).has('dev') ? `<h4>Developer</h4><div class="group"><div class="row2"><span>Test tools</span><span><button class="tog" id="dshell">+50 shells</button> <button class="tog" id="dday">Skip a day</button></span></div></div>` : ''}
      ${game.dev ? `<h4>Developer</h4><div class="group"><label class="row2"><span>Developer Tools</span><button class="tog" id="devtools">Open ›</button></label></div>` : ''}
      ${game.shared && !game.test ? `<h4>Your data</h4><div class="group"><label class="row2"><span>Player ID<small>${esc(game.you?.userId ?? '')}</small></span><button class="tog" id="myid">Copy</button></label><label class="row2"><span>Delete my data</span><button class="tog warn" id="delme">Delete</button></label></div>` : ''}
      <p class="dim foot">OUR TANK · four friends, one tank. No ads, no purchases, no streaks. <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a> · build 13 Oct (seahorse families 2)</p></div>`,
  };
  // ── Developer Tools (only for the player ids the server lists; every step is checked again there) ──
  views.devtools = () => {
    const D = devInfo, on = devFast(), st = D?.stage ?? {}, stg = st.stage ?? 'none', can = (ok) => (D?.tank && ok ? '' : 'disabled');
    const stageTxt = !D ? 'Loading…' : !D.tank ? 'No test aquarium yet' : ({ none: 'No seahorse pair yet', paired: `Paired: ${st.male} and ${st.female}`, pregnant: `Pregnancy · ${st.male} · day ${st.pregDay} of ${st.pregDays}`, nursery: `Nursery · day ${st.nurseryDay} of 5 · fed ${st.fed} time${st.fed === 1 ? '' : 's'}`, ready: `Nursery · ready to choose · fed ${st.fed} time${st.fed === 1 ? '' : 's'}` })[stg];
    const row = (label, op, ok, note = '') => `<label class="row2"><span>${label}${note ? `<small>${note}</small>` : ''}</span><button class="tog" data-dev="${op}" ${can(ok)}>${op === 'pair' ? 'Create' : 'Go'}</button></label>`;
    const days = st.pregDay ?? 0, nd = st.nurseryDay ?? 0;
    return `<h3>Developer Tools</h3><div class="set">
      <h4>Seahorse lifecycle test</h4><div class="group">
        <label class="row2"><span>Fast lifecycle test<small>Manual steps on a separate test aquarium</small></span><button class="tog ${on ? 'on' : ''}" id="devfast">${on ? 'On' : 'Off'}</button></label>
      </div>
      ${on ? `<h4>Test aquarium</h4><div class="group">
        <div class="row2"><span>Current stage</span><b>${esc(stageTxt)}</b></div>
        ${D?.tank ? `<div class="row2"><span>Test code<small>${esc((D.people ?? []).join(', ') || 'Nobody yet')}</small></span><b class="tcode">${esc(D.tank.code)}</b></div>` : ''}
        <label class="row2"><span>${game.test ? 'You are in the test aquarium' : 'Watch it happen'}</span><button class="tog" id="${game.test ? 'devleave' : 'deventer'}">${game.test ? 'Back to my tank' : 'Enter test aquarium'}</button></label>
        <label class="row2"><span>Join another phone's test<small>Enter its test code</small></span><button class="tog" id="devjoin">Join</button></label>
      </div>
      <h4>Pregnancy</h4><div class="group">
        ${stg === 'none' ? row('Create test pair', 'pair', true, 'Two adult seahorses, paired by the game') : ''}
        ${row('Start pregnancy', 'pregnant', stg === 'paired')}
        ${row('Advance to day 3', 'preg3', stg === 'pregnant' && days < 3)}
        ${row('Advance to day 6', 'preg6', stg === 'pregnant' && days < 6 && (st.pregDays ?? 0) >= 6)}
        ${row('Trigger birth', 'birth', stg === 'pregnant')}
      </div>
      <h4>Nursery</h4><div class="group">
        ${row('Advance to day 2', 'nurs2', stg === 'nursery' && nd < 2)}
        ${row('Advance to day 4', 'nurs4', stg === 'nursery' && nd < 4)}
        ${row('Ready to choose', 'ready', stg === 'nursery')}
      </div>
      <h4>Test management</h4><div class="group">
        <label class="row2"><span>Run full demo<small>Steps through to THEY'RE READY, then stops for your choice</small></span><button class="tog" id="devdemo" ${can(stg !== 'ready')}>${cb.devDemoOn?.() ? 'Stop' : 'Run'}</button></label>
        <label class="row2"><span>Reset test aquarium</span><button class="tog warn" id="devreset" ${can(true)}>Reset</button></label>
      </div>` : ''}
      <p class="dim foot"><button class="lnk" id="devback">‹ Settings</button></p></div>`;
  };
  function thumbs() { sheet.querySelectorAll('img[data-thumb]').forEach((im, i) => setTimeout(() => { const [k, id] = im.dataset.thumb.split(':'); if (!im.isConnected) return; im.src = k === 'fish' ? fishThumb(id) : decorThumb(id); }, i * 16)); }
  function paint() {
    sheet.querySelectorAll('canvas.big').forEach((c) => { if (c.dataset.slot === 'me') drawAvatar(c, soloLook()); else { const m = game.members?.find((x) => x.slot === +c.dataset.slot); if (m) drawAvatar(c, m.avatar); } });
    sheet.querySelectorAll('[data-edit-me]').forEach((b) => (b.onclick = () => { sfx('tap'); sub = 'look'; open('friends', true); sheet.scrollTop = 0; }));
    if (sub === 'look' && tab === 'friends' && sheet.querySelector('.ap') && !sheet.querySelector('.ap.pe')) bindLook();
    sheet.querySelectorAll('[data-invite]').forEach((e) => (e.onclick = () => social.invite()));
    sheet.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => ({ copy: () => social.copy(), share: () => social.share(), regen: () => social.regen() }[b.dataset.code]())));
    const f = sheet.querySelector('form.send'); if (f) f.onsubmit = (e) => { e.preventDefault(); const i = f.querySelector('input'), v = i.value.trim(); crewDraft = ''; if (composeMode === 'note') { i.value = ''; writeNote(null, v); return; } if (composeMode === 'bottle') { if (bottleTo) { i.value = ''; sendBottle(bottleTo, v); } return; } if (v) { social.chat(v); i.value = ''; } }; { const i = f?.querySelector('input'); if (i) i.oninput = () => { crewDraft = i.value; }; }      // (what you are typing survives the list updating under it)      // a note opens the post-it (colour and doodle) with the words already on it
    sheet.querySelectorAll('[data-bto]').forEach((b) => (b.onclick = () => { bottleTo = b.dataset.bto; sfx('tap'); refresh(); }));
    sheet.querySelectorAll('.cmode [data-mode]').forEach((b) => (b.onclick = () => { if (composeMode === b.dataset.mode) return; composeMode = b.dataset.mode; sfx('tap'); refresh(); sheet.querySelector('form.send input')?.focus(); }));
    const nf = sheet.querySelector('form.note'); if (nf) nf.onsubmit = (e) => { e.preventDefault(); const i = nf.querySelector('input'); if (i.value.trim()) { cb.note(i.value); i.value = ''; } };
    const ch = sheet.querySelector('.chat'); if (ch) ch.scrollTop = ch.scrollHeight;
    if (tab === 'friends' && sub === 'journal') { readAt = Date.now(); try { localStorage.setItem(RK, String(readAt)); } catch { /* storage unavailable */ } sheet.querySelectorAll('[data-nt]').forEach((b) => (b.onclick = () => { const n = notices[+b.dataset.nt]; if (!n) return; sfx('tap'); if (n.gift) { open('tank'); cb.gift(); } else if (n.tab) open(n.tab); })); }
    if (tab === 'notices') { readAt = Date.now(); try { localStorage.setItem(RK, String(readAt)); } catch { /* storage unavailable */ } bell(); sheet.querySelectorAll('[data-nt]').forEach((b) => (b.onclick = () => { const n = notices[+b.dataset.nt]; if (!n) return; sfx('tap'); if (n.gift) { open('tank'); cb.gift(); } else if (n.tab) open(n.tab); })); }
    sheet.querySelectorAll('[data-feed]').forEach((b) => (b.onclick = () => { game.feedFood = b.dataset.feed; game.feedFor = b.dataset.for ?? null; feedOpen = null; sfx('tap'); open('tank'); cb.act('feedgo'); }));
    sheet.querySelectorAll('[data-act]').forEach((b) => (b.onclick = (e) => { e?.stopPropagation?.(); sfx('tap'); const a = b.dataset.act; if (a === 'notenew') { writeNote(); return; } if (a === 'noteopen') { readNote(b.dataset.id); return; } if (a === 'needshop') { cat = b.dataset.cat || 'PLANTS'; open('decorate'); return; } if (a === 'notyet') { toast(b.dataset.say.replace(/^\w/, (x) => x.toUpperCase())); return; } if (a === 'feeddrawer') { feedOpen = !(feedOpen ?? feedModel().hungry.length > 0); open('care', true); return; } if (a === 'feednow') { game.feedFood = b.dataset.food; game.feedFor = b.dataset.for ?? null; feedOpen = null; open('tank'); cb.act('feedgo'); return; } if (a === 'fish') { open('tank'); cb.meetFish(); } else if (a === 'book') { game.track('book_opened'); open('journal'); } else if (a === 'photo') { open('tank'); cb.photo(); } else { open('tank'); cb.act(a); } }));
    sheet.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; selected = null; sfx('tap'); open('decorate', true); }));
    { const on = sheet.querySelector('.cats .cat.on'), row = on?.parentElement; if (on && row) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2); }      // keep the chosen shelf in view in the row
    sheet.querySelectorAll('.card').forEach((b) => { let ht = null; b.onpointerdown = () => { ht = setTimeout(() => { ht = 'held'; heldAt = Date.now(); shopPreview(b.dataset.k); }, 450); }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => { if (ht && ht !== 'held') clearTimeout(ht); setTimeout(() => (ht = null), 60); }; b.oncontextmenu = (e) => e.preventDefault(); b.__held = () => ht === 'held'; });      // press and hold: a closer look first
    sheet.querySelectorAll('.card').forEach((b) => (b.onclick = async () => {
      if (Date.now() - heldAt < 900) return; const [kind, id] = b.dataset.k.split(':'), s = S(); sfx('tap');
      if (kind === 'floor' || kind === 'backdrop') { const own = styleOwned(s, kind, id), price = STYLE_PRICE[kind][id]; if ((s.style ?? {})[kind] === id) { toast('Already in use'); return; } if (!own && price && s.shells < price) { toast(`${price - s.shells} more shell${price - s.shells === 1 ? '' : 's'} needed`); return; } const y = sheet.scrollTop, r = await game.dispatch({ t: 'style', [kind]: id }); if (!r.ok) toast(REASONS[r.reason] ?? 'Could not change that'); else if (r.delta < 0) toast(`Unlocked! ${r.delta} shells`); open('decorate', true); sheet.scrollTop = y; return; }
      const d = kind === 'fish' ? SPECIES_DEF[id] : DECOR_DEF[id]; if (!d) return; const price = kind === 'fish' ? fishPrice(id) : d.price, free = kind === 'decor' && isFree(s, id);
      if (s.level < d.level) { toast(`${d.label} unlocks at tank level ${d.level}`); return; }
      if (!free && s.shells < price) { toast(`${d.label}: ${price - s.shells} more shell${price - s.shells === 1 ? '' : 's'} needed`); return; }
      if (kind === 'fish') { if (s.fish.length + d.count > capacity(s.level)) { toast('No room for more fish yet. Level up to grow the tank.'); return; } cb.adopt(id); return; }
      cb.startPlace(id);
    }));
    const buy = $('buy'); if (buy) buy.onclick = async () => { const [kind, id] = selected.split(':'); if (kind === 'fish') cb.adopt(id); else if (kind === 'floor' || kind === 'backdrop') { sfx('tap'); const y = sheet.scrollTop, r = await game.dispatch({ t: 'style', [kind]: id }); if (!r.ok) toast(REASONS[r.reason] ?? 'Could not change that'); else if (r.delta < 0) toast(`Unlocked! ${r.delta} shells`); open('decorate', true); sheet.scrollTop = y; } else cb.startPlace(id); };
    const rr = $('rearr'); if (rr) rr.onclick = () => { rearrange = !rearrange; cb.rearrange(rearrange); if (rearrange) open('tank'); else open('decorate', true); };
    const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    bind('myid', () => { navigator.clipboard?.writeText(game.you?.userId ?? '').then(() => toast('Player ID copied'), () => toast(game.you?.userId ?? '')); });
    bind('devtools', () => { sub = 'devtools'; devInfo = null; open('friends', true); devLoad(); }); bind('devback', () => { sub = 'settings'; open('friends', true); });
    bind('devfast', () => { const on = !devFast(); try { localStorage.setItem('ourtank.devfast', on ? '1' : '0'); } catch { /* ignore */ } if (!on && game.test) return cb.devLeave(); open('friends', true); if (on) devLoad(); });
    bind('deventer', () => cb.devEnter()); bind('devleave', () => cb.devLeave()); bind('devjoin', () => cb.devJoin().then(devLoad));
    bind('devreset', () => cb.devReset().then(devLoad)); bind('devdemo', () => { cb.devDemo(devLoad); devLoad(); });
    sheet.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = async () => { b.disabled = true; await cb.devStep(b.dataset.dev); devLoad(); }));
    bind('rearr', async () => { await game.dispatch({ t: 'tankPref', rearrange: !!game.state.flags?.noRearrange }); open('friends', true); }); bind('snd', () => { setSound(!soundOn()); open('friends', true); }); bind('mus', () => { setMusic(!musicOn()); open('friends', true); }); bind('gfx', () => { cb.cycleQuality(); open('friends', true); });
    const phc = $('phc'); if (phc) phc.textContent = game.copyAt ? 'Saved ' + (Date.now() - game.copyAt < 120000 ? 'just now' : new Date(game.copyAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })) : 'Saving…';
    const stor = $('stor'); if (stor) cb.storage().then((r) => { stor.textContent = r.level === 'safe' ? 'Protected ✓' : r.level === 'waiting' ? 'Starting up…' : 'Not protected: it can vanish when the server restarts'; stor.style.color = r.level === 'risk' ? '#ff9a8a' : r.level === 'safe' ? '#8fe0a8' : ''; }).catch(() => { stor.textContent = 'Unknown'; });
    const pb = $('pushbtn'); if (pb) {
      const label = { on: 'On', off: 'Off', blocked: 'Blocked in browser settings', install: 'How to turn on', unsupported: 'Not supported here', unavailable: 'Not set up on this server' };
      const paint2 = (st) => { pb.textContent = label[st] ?? st; pb.classList.toggle('on', st === 'on'); pb.dataset.st = st; pb.disabled = !['on', 'off', 'install'].includes(st); const tr = $('pushtestrow'); if (tr) tr.hidden = st !== 'on'; };
      cb.pushState().then(paint2).catch(() => paint2('unsupported'));
      pb.onclick = async () => { const st = pb.dataset.st; if (st === 'install') { dialog({ title: 'NOTIFICATIONS ON IPHONE', text: 'They only work from the app icon on your home screen. In Safari tap Share, then Add to Home Screen, then open Our Tank from that new icon (remove an older icon first) and turn them on here.', ok: 'Got it' }); return; } if (st !== 'on' && st !== 'off') return; pb.disabled = true; try { paint2(await cb.pushToggle(st === 'off')); } catch (e) { toast('Could not change notifications'); paint2(st); } };
    }
    bind('pushtest', async () => { const b = $('pushtest'); b.disabled = true; try { const r = await cb.pushTest(); toast(r.sent ? 'Sent. It should arrive in a moment.' : 'Nothing was sent. Turn notifications off and on again.'); } catch (e) { toast(e.message || 'Could not send a test'); } b.disabled = false; });
    bind('bkcopy', () => cb.backupText());
    bind('rkey', () => cb.recoveryKey()); bind('bkup', () => cb.backup()); bind('delme', () => cb.deleteMe()); bind('leave', () => cb.leaveTank()); bind('tutr', () => { open('tank'); cb.replayTutorial(); }); bind('reset', (ev) => { if (ev.target.dataset.sure) game.reset(); else { ev.target.dataset.sure = 1; ev.target.textContent = 'Tap again to erase'; } });
    bind('dshell', () => game.dispatch({ t: 'dev', what: 'shells' }, { dev: true }).then(() => open('friends', true))); bind('dday', () => game.dispatch({ t: 'dev', what: 'day' }, { dev: true }).then(() => toast('A day passes…')));
    sheet.querySelectorAll('[data-style]').forEach((b) => (b.onclick = async () => { const [k, v] = b.dataset.style.split(':'); sfx('tap'); const y = sheet.scrollTop; const r = await game.dispatch({ t: 'style', [k]: v }); if (!r.ok) toast(REASONS[r.reason] ?? 'Could not change that'); else if (r.delta < 0) toast(`Unlocked! ${r.delta} shells`); open('decorate', true); sheet.scrollTop = y; }));
    sheet.querySelectorAll('[data-mem]').forEach((b) => (b.onclick = () => {
      const x = (S().memorial ?? [])[+b.dataset.mem]; if (!x) return; const d = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      dialog({ title: x.name.toUpperCase(), text: `${SPECIES_DEF[x.species]?.label ?? x.species}${x.traits?.length ? ' · ' + x.traits.join(', ') : ''}`, lines: [`Arrived ${d(x.born)}`, `Passed away ${d(x.died)}`, `Original caretaker: ${x.ownerName ?? 'unknown'}`, ...(x.parents?.length ? [`Parents: ${x.parents.map((q) => q.name).join(' & ')}`] : []), ...(x.gen ? [`Generation ${x.gen}`] : []), x.rested ? `Laid to rest by ${x.rested.by}` : 'Still floating in the tank', ...(x.milestones ?? [])], ok: 'Close' });
    }));
    sheet.querySelectorAll('[data-sellfish]').forEach((b) => (b.onclick = async () => {
      const s = S(), f = s.fish.find((x) => x.id === b.dataset.sellfish); if (!f) return; sfx('tap'); const d = SPECIES_DEF[f.species], pay = sellValue(f), alive = s.fish.filter((x) => !x.dead).length;
      if (!canSell(f, game.you?.userId, members())) { dialog({ title: f.name.toUpperCase(), text: `${d?.label ?? f.species} · looked after by ${f.ownerName ?? 'a friend'}.`, lines: [`Only ${f.ownerName ?? 'its caretaker'}, or the tank's first caretaker, can sell ${f.name}.`], ok: 'OK' }); return; }
      if (f.preg) { dialog({ title: f.name.toUpperCase(), text: `${f.name} is expecting babies, so he stays until they are born.`, ok: 'OK' }); return; }
      if (alive <= 1) { dialog({ title: f.name.toUpperCase(), text: `${f.name} is the only fish in the tank, so it stays. Bring in another fish first.`, ok: 'OK' }); return; }
      const yes = await dialog({ title: `SELL ${f.name.toUpperCase()}?`, text: `${f.name} the ${(d?.label ?? f.species).toLowerCase()} goes to a new home and leaves the tank for good.`, lines: [...(game.shared && f.owner && f.owner !== game.you?.userId && (game.members ?? []).some((m) => m.id === f.owner) ? [`${f.name} is ${f.ownerName ?? 'a friend'}'s. As the tank's first caretaker you can still sell it, for example if they have stopped playing.`] : []), pay ? `You get ${pay} shells, half of what ${f.name} cost.` : `${f.name} came free, so it fetches no shells.`], ok: pay ? `Sell for ${pay} 🐚` : 'Sell', cancel: 'Keep', danger: true });
      if (!yes) return; const y = sheet.scrollTop, r = await game.dispatch({ t: 'sellFish', id: f.id });
      if (!r.ok) toast(r.reason === 'LAST_FISH' ? 'It is the last fish in the tank, so it stays.' : r.reason === 'NOT_YOURS' ? 'Only its caretaker can sell it.' : r.reason === 'EXPECTING' ? 'He is expecting babies, so he stays.' : REASONS[r.reason] ?? 'Could not sell that.'); open('friends', true); sheet.scrollTop = y;
    }));
    sheet.querySelectorAll('[data-csub]').forEach((b) => (b.onclick = () => { careSub = b.dataset.csub; sfx('tap'); open('care', true); sheet.scrollTop = 0; }));
    sheet.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => { sub = b.dataset.sub; sfx('tap'); open('friends', true); sheet.scrollTop = 0; }));
    sheet.querySelectorAll('[data-thank]').forEach((b) => (b.onclick = async () => { b.disabled = true; const r = await game.thank(b.dataset.to, +b.dataset.thank); if (r.ok) { sfx('tap'); b.textContent = '♥'; b.classList.add('on'); } else { toast(REASONS[r.reason] ?? 'Could not send that.'); b.disabled = false; } }));
    sheet.querySelectorAll('[data-bottle]').forEach((b) => (b.onclick = async () => {
      await sendBottle(b.dataset.bottle);
    }));
    sheet.querySelectorAll('[data-nudge]').forEach((b) => (b.onclick = async () => { b.disabled = true; const r = await game.nudge(b.dataset.nudge); if (r.ok) { toast('Nudge sent'); b.textContent = 'Sent'; } else { toast(REASONS[r.reason] ?? 'Could not send that.'); b.disabled = false; } }));
    if (tab === 'decorate' || (tab === 'friends' && sub === 'book')) thumbs();
  }
  // the glass lens under the chosen tab slides to it
  function placeLens() { const nav = document.querySelector('nav'), lens = nav?.querySelector('.lens'), on = nav?.querySelector('div.on'); if (!lens || !on) return; lens.style.width = on.offsetWidth + 'px'; lens.style.transform = `translateX(${on.offsetLeft}px)`; lens.classList.add('on'); }
  addEventListener('resize', () => placeLens()); setTimeout(placeLens, 60); document.fonts?.ready?.then(() => placeLens());
  // one sheet, one page: pull anywhere on a menu to close it. Scrolling works as usual; once the list is at its top, pulling further down drags the
  // whole sheet with the finger, and letting go past a short distance closes it (a short pull springs back). A tap on the handle closes too.
  { let d = null; const boxes = () => [...document.querySelectorAll('#sheet.on, #card.on')];
    const begin = (box, y) => { d = { box, y, dy: 0, moved: false, pulling: false }; };
    const move = (y, ev) => {
      if (!d) return; const box = d.box, dy = y - d.y;
      if (!d.pulling) { if (dy > 4 && box.scrollTop <= 0) { d.pulling = true; d.y = y - 4; } else if (dy < -4 || box.scrollTop > 0) { d = null; return; } else return; }     // at the top and pulling down: the sheet comes with the finger
      ev?.cancelable && ev.preventDefault(); d.dy = Math.max(0, y - d.y); d.moved = d.dy > 6;
      box.classList.add('drag'); box.style.setProperty('--pull', d.dy + 'px');
    };
    const end = () => {
      if (!d) return; const { box, dy, moved } = d; d = null; box.classList.remove('drag'); box.style.removeProperty('--pull');
      if (dy > 72) { sfx('open'); (box.querySelector('.x') ?? box.querySelector('.grab'))?.click(); } else if (moved) { box._drag = true; setTimeout(() => { box._drag = false; }, 60); }
    };
    document.addEventListener('touchstart', (e) => { const box = e.target.closest?.('#sheet.on, #card.on'); if (box && !e.target.closest('input,textarea,select')) begin(box, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (d) move(e.touches[0].clientY, e); }, { passive: false });
    document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
    document.addEventListener('mousedown', (e) => { const box = e.target.closest?.('#sheet.on, #card.on'); if (box && e.button === 0 && !e.target.closest('input,textarea,select,button:not(.x):not(.grab)')) begin(box, e.clientY); });
    document.addEventListener('mousemove', (e) => { if (d) move(e.clientY, e); }); document.addEventListener('mouseup', end);
    // a pull must not also count as a tap on whatever the finger started on
    document.addEventListener('click', (e) => { const box = e.target.closest?.('#sheet, #card'); if (box && box._drag) { e.stopImmediatePropagation(); e.preventDefault(); box._drag = false; } }, true);
    boxes();
  }
  function open(t, quiet = false) {
    if (t !== 'friends' && sub === 'look') sub = 'friends';                    // the look editor is only ever open while you are on it
    if (t === 'today') t = 'care'; if (t === 'journal') { t = 'friends'; sub = 'journal'; } if (t === 'book') { t = 'friends'; sub = 'book'; } if (t === 'settings') { t = 'friends'; sub = 'settings'; }
    if (t === 'decorate' && tab !== 'decorate' && !quiet) { if (newCount()) cat = 'NEW'; else if (cat === 'NEW') cat = 'FISH'; }
    tab = t; if (!quiet) sfx('open'); $('goal').style.visibility = t === 'tank' ? '' : 'hidden';        // the hint belongs to the open tank; with a menu up it only covers the list
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === t));
    placeLens();
    { const FIRST = { care: 'Everything that needs you, and what is coming. Each job earns shells.', decorate: 'Fish and decorations. Press and hold one for a closer look before you buy.', friends: 'Your crew: postcards, notes on the glass, and what everyone has been doing.', notices: 'Everything that has happened in the tank, newest first.' }, k = 'ourtank.first.' + t;
      let seen = true; try { seen = !!localStorage.getItem(k); } catch { /* ignore */ } if (!seen && FIRST[t] && !quiet) { try { localStorage.setItem(k, '1'); } catch { /* ignore */ } setTimeout(() => toast(FIRST[t], 4200), 450); } }      // the first time you open a tab, one line about what it is for
    cb.onTab(t); if (t === 'friends') flag('friends', false); if (t === 'care') flag('care', false); if (!quiet && t === 'friends' && sub === 'journal') game.track('journal_opened');
    if (t === 'tank') { sheet.classList.remove('on'); feedOpen = null; return; } if (t !== 'care') feedOpen = null;
    sheet.innerHTML = `<button class="x">×</button>` + views[t](); sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank'); sheet.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => open(b.dataset.open); });
    sheet.querySelectorAll('details.fold').forEach((d) => d.addEventListener('toggle', () => { d.open ? game.folds.add(d.dataset.fold) : game.folds.delete(d.dataset.fold); }));
    sheet.querySelectorAll('.foodrow [data-food]').forEach((b) => { b.onclick = () => { const k = b.dataset.food; if (S().shells < FOODS[k].price) { toast('Not enough shells for that food'); return; } game.feedFood = k; sfx('tap'); sheet.querySelectorAll('.foodrow [data-food]').forEach((x) => x.classList.toggle('on', x.dataset.food === k)); }; }); paint();
  }
  refreshNotices = () => { if (tab !== 'notices') return; const y = sheet.scrollTop; open('notices', true); sheet.scrollTop = y; };      // the inbox is open while a countdown ticks: redraw it in place
  document.querySelectorAll('nav [data-tab]').forEach((n) => n.addEventListener('click', () => { if ($('card').classList.contains('on')) { cb.closeCard?.(); return; } open(n.dataset.tab === tab ? 'tank' : n.dataset.tab); }));      // with a fish's card open, the bar first closes it, never piles a sheet on top
  $('pill').onclick = (e) => { if (e.target.closest('#conn')) return; sfx('tap'); dialog({ title: 'HOW SHELLS ARE EARNED', text: 'Looking after your fish, and watching them grow, pays the most.', lines: EARN.map(([a, b]) => `${a}: ${b}`), ok: 'Got it' }); };
  $('gear').onclick = () => open('settings');
  $('bell').onclick = () => open(tab === 'notices' ? 'tank' : 'notices'); bell();

  // header portraits
  function setMembers() {
    const box = $('avs'); if (!box) return; box.innerHTML = '';
    for (let n = 1; n <= 4; n++) {
      const m = game.shared ? game.members?.find((x) => x.slot === n) : (n === 1 ? { avatar: soloLook(), id: 'me' } : null), d = document.createElement('div'); d.className = 'av' + (m ? '' : ' empty');
      if (m) { const c = document.createElement('canvas'); c.className = 'av'; drawAvatar(c, m.avatar); d.append(c); const i = document.createElement('i'); if (game.shared && !game.online.includes(m.id)) i.className = 'off'; d.append(i); d.onclick = () => open('friends'); }
      else { d.textContent = '+'; d.onclick = () => open('friends'); }
      box.append(d);
    }
  }
  function refresh() { setMembers(); updateHeader(); if (tab === 'friends' && sub === 'look') return; if (['friends', 'journal', 'care', 'today'].includes(tab)) { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } else if (tab === 'decorate') { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } }

  // ── modal: a small in-page dialog (no browser prompts) ──
  const modal = $('modal');
  // a reward worth a moment: a card in the middle of the screen that says what it is and why, with a burst of shells, and one button to claim it
  // one pop-up at a time: a new one waits until the one on screen is closed, so nothing is ever replaced half-way
  let modalShut = 0; new MutationObserver(() => { if (!modal.classList.contains('on')) modalShut = performance.now(); }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  // ... and a breath between two in a row, so the second is seen as a new thing rather than the first changing under your finger
  const modalFree = () => new Promise((res) => { const w = () => (modal.classList.contains('on') ? setTimeout(w, 300) : performance.now() - modalShut < 450 ? setTimeout(w, 460 - (performance.now() - modalShut)) : res()); w(); });
  function celebrate({ title, amount = 0, what = 'shells', why = '', ok = 'Claim', icon = '🐚' }) {
    return modalFree().then(() => new Promise((res) => {
      const bits = Array.from({ length: 18 }, (_, i) => `<i style="--a:${(i / 18) * 360}deg;--d:${70 + (i % 3) * 26}px;--t:${0.9 + (i % 4) * 0.12}s">${i % 3 ? '✦' : '🐚'}</i>`).join('');
      modal.innerHTML = `<div class="box party"><div class="burst">${bits}</div><div class="big-ic">${icon}</div><h2>${esc(title)}</h2>${amount ? `<div class="amt">+${amount} <small>${esc(what)}</small></div>` : ''}${why ? `<p>${esc(why)}</p>` : ''}<button class="big gold" id="mok">${esc(ok)}</button></div>`;
      modal.classList.add('on', 'party'); sfx('arrive');
      $('mok').onclick = () => { modal.classList.remove('on', 'party'); res(true); };
    }));
  }
  // an animal close to dying: said plainly, with the things that will save it as buttons
  function sick({ name, species, pal = null, why, acts }) {
    return modalFree().then(() => new Promise((res) => {
      modal.innerHTML = `<div class="box party mourn sick"><div class="mpic"><img alt="" src="${fishThumb(species, pal)}"><span>⚠️</span></div><h2>${esc(name.toUpperCase())} IS VERY SICK</h2>
        <p>${esc(why)} Without help it could die within a day or two.</p>${acts.map((x, i) => `<button class="big ${i ? 'alt' : 'gold'}" data-i="${i}">${esc(x.label)}</button>`).join('')}<button class="lnk" id="mno">Later</button></div>`;
      modal.classList.add('on', 'party'); sfx('tap');
      const done = (v) => { modal.classList.remove('on', 'party'); res(v); };
      modal.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => done(acts[+b.dataset.i].value); }); $('mno').onclick = () => done(null);
    }));
  }
  // a death, said plainly in the middle of the screen: who it was, how long it lived here, why, and the one thing to do now
  function mourn({ name, species, pal = null, days, who = null, canRest = false, oldAge = false, life = null }) {
    return modalFree().then(() => new Promise((res) => {
      const label = (SPECIES_DEF[species]?.label ?? species).toLowerCase();
      modal.innerHTML = `<div class="box party mourn"><div class="mpic"><img alt="" src="${fishThumb(species, pal)}"><span>🕊️</span></div><h2>${esc(name.toUpperCase())} HAS PASSED AWAY</h2>
        <div class="amt">${days} <small>day${days === 1 ? '' : 's'} in your tank</small></div>
        <p>${oldAge ? `Your ${esc(label)} passed away peacefully of old age. A long, full life${who ? `, looked after by ${esc(who)}` : ''}.` : `Your ${esc(label)} went too long without food and clean water.${who ? ` ${esc(who)} looked after it.` : ''}`} The others are staying close.</p>${life ? `<p class="life">${esc(life)}</p>` : ''}
        ${canRest ? '<button class="big gold" id="mok">Lay to rest</button><button class="lnk" id="mno">Later</button>' : '<button class="big gold" id="mok">Remember them</button>'}</div>`;
      modal.classList.add('on', 'party'); sfx('tap');
      const done = (v) => { modal.classList.remove('on', 'party'); res(v); };
      $('mok').onclick = () => done(canRest ? 'rest' : true); const no = $('mno'); if (no) no.onclick = () => done(null);
    }));
  }
  function dialog({ title, text = '', lines = null, input = null, ok = 'OK', cancel = null, danger = false }) {
    return modalFree().then(() => new Promise((res) => {
      modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${lines ? `<ul class="away">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${input ? `<input id="mi" maxlength="${input.max ?? 14}" value="${esc(input.value ?? '')}" placeholder="${esc(input.placeholder ?? '')}" autocomplete="off">` : ''}<div class="err" id="me"></div>
        <button class="big ${danger ? 'warn' : ''}" id="mok">${esc(ok)}</button>${cancel ? `<button class="lnk" id="mno">${esc(cancel)}</button>` : ''}</div>`;
      modal.classList.add('on'); const inp = $('mi'); if (inp) { inp.focus(); inp.select(); }
      const done = (v) => { modal.classList.remove('on'); res(v); };
      $('mok').onclick = () => { if (input) { const v = inp.value.trim(); if (!v) { $('me').textContent = 'Please type a name.'; return; } done(v); } else done(true); };
      if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') $('mok').click(); };
      const no = $('mno'); if (no) no.onclick = () => done(null);
    }));
  }
  // a small chooser: one tap on one of a few options (or Not now)
  function choose({ title, text = '', options, cancel = 'Not now' }) {
    return modalFree().then(() => new Promise((res) => {
      modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}<div class="chooser">${options.map((o, i) => `<button class="big ${i ? 'alt' : ''}" data-i="${i}">${esc(o.label)}</button>`).join('')}</div>${cancel ? `<button class="lnk" id="mno">${esc(cancel)}</button>` : ''}</div>`;
      modal.classList.add('on'); const done = (v) => { modal.classList.remove('on'); res(v); };
      modal.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => done(options[+b.dataset.i].value); }); const no = $('mno'); if (no) no.onclick = () => done(undefined);
    }));
  }
  // The opening of a tank: choose the free first fish, then name it, all in one card. The first one is preselected so it can be accepted straight away.
  function pickFish({ title, text, species, name }) {
    return new Promise((res) => {
      // one species to choose from means it is the octopus: the choice is its colour
      let cur = species[0], pal = (Math.random() * OCTO_COLORS.length) | 0; const colours = species.length === 1 && species[0] === 'octopus';
      const row = colours ? OCTO_COLORS.map((c, i) => `<button class="pk pc ${i === pal ? 'on' : ''}" data-pal="${i}"><img alt="" src="${fishThumb('octopus', i)}"><b>${esc(c.label)}</b></button>`).join('') : species.map((k) => `<button class="pk ${k === cur ? 'on' : ''}" data-k="${k}"><img alt="" src="${fishThumb(k)}"><b>${esc(SPECIES_DEF[k].label)}</b><small>${esc(SPECIES_DEF[k].blurb)}</small></button>`).join('');
      modal.innerHTML = `<div class="box pick"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="pickrow ${colours ? 'pcs' : ''}">${row}</div><p class="pkdesc" id="pkd"></p><input id="mi" maxlength="14" value="${esc(name)}" placeholder="${colours ? 'Name your octopus' : 'Name your fish'}"><div id="me" class="err"></div><button class="big" id="mok">Bring it home</button></div>`; const describe = () => { const S2 = SOCIAL[cur]; $('pkd').innerHTML = S2 ? `<b>${esc(S2.kind)}.</b> ${esc(S2.nature)}<br><small>${esc(S2.line)}</small>` : ''; }; describe();
      modal.classList.add('on'); const inp = $('mi');
      modal.querySelectorAll('.pk').forEach((b) => { b.onclick = () => { if (b.dataset.pal != null) pal = +b.dataset.pal; else cur = b.dataset.k; modal.querySelectorAll('.pk').forEach((x) => x.classList.toggle('on', x === b)); describe(); sfx('tap'); }; });
      $('mok').onclick = () => { const v = inp.value.trim(); if (!v) { $('me').textContent = 'Please type a name.'; return; } modal.classList.remove('on'); res({ species: cur, name: v, pal: colours ? pal : undefined }); };
      inp.onkeydown = (e) => { if (e.key === 'Enter') $('mok').click(); };
    });
  }
  // coach card for the tutorial
  const coach = $('coach');
  function showCoach(args) {
    const { title, text, button = null, onButton = null, skip = null } = args; coach._args = args; if (hushed()) { coachLater = args; coach.classList.remove('on'); return; }
    coach.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p><div class="crow">${button ? `<button class="big sm" id="cbtn">${esc(button)}</button>` : ''}${skip ? `<button class="lnk" id="cskip">Skip tips</button>` : ''}</div>`;
    coach.classList.add('on'); if (button) $('cbtn').onclick = () => onButton?.(); if (skip) $('cskip').onclick = skip;
  }
  const hideCoach = () => { coachLater = null; coach.classList.remove('on'); };
  const flag = (tabName, on) => document.querySelectorAll('nav [data-tab]').forEach((n) => { if (n.dataset.tab === tabName) n.classList.toggle('dot2', on && tab !== tabName); });
  const pulse = (tabName) => document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('pulse', n.dataset.tab === tabName));

  // a quiet message that lives in the tank (not a popup that has to be dismissed): it fades in, waits a few seconds, and fades out; a tap clears it early
  const shelf = (id, html, ms, onLink, tries = 0) => { if (($('coach')?.classList.contains('on') || hushed()) && tries < 40) { setTimeout(() => shelf(id, html, ms, onLink, tries + 1), 800); return; }      // a tip on screen goes first; the card waits its turn
    const el = $(id); clearTimeout(el._t); for (const o of ['settle', 'reunion']) if (o !== id) $(o).classList.remove('on'); toastEl.classList.remove('on'); el.innerHTML = html; el.classList.add('on'); const off = () => el.classList.remove('on'); el.onclick = (e) => { if (e.target.closest('.lk')) { off(); onLink?.(); } else off(); }; el._t = setTimeout(off, ms); };
  const reunion = (lines, onPostcard) => { for (const l of lines) notice(l, { kind: 'card' }); return shelf('reunion', `<b>WELCOME BACK</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="lk">Send a postcard of the tank</button>`, 11000, onPostcard); };
  const settle = (lines) => { $('settle').classList.add('top'); for (const l of lines) notice(l, { kind: 'card' }); shelf('settle', `<b>COMING UP</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}`, 12000); };
  const place = () => $('settle').classList.add('top');        // never sit on top of an open menu: use the top of the screen then
  const chapter = (c) => { place(); notice(`Chapter: ${c.title}. ${c.text}`, { kind: 'card' }); shelf('settle', `<p class="chap"><b>${esc(c.title)}</b> · ${esc(c.text)}</p>`, 4500); };      // a slim line, gone in a few seconds: the tank stays in view
  const surprise = (text) => { place(); clearToasts(); notice(text, { kind: 'card' }); shelf('settle', `<b>✨ TODAY'S SURPRISE</b><p>${esc(text)}</p>`, 8000); };
  const together = (text) => { place(); clearToasts(); notice(text, { kind: 'card' }); shelf('settle', `<b>💛 TOGETHER</b><p>${esc(text)}</p>`, 8000); };
  const recap = (lines, next) => { place(); shelf('settle', `<b>🌙 TODAY IN THE TANK</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}${next ? `<p class="nx">Next: ${esc(next)}</p>` : ''}`, 12000); };
  const farewell = (name) => { place(); notice(`${name} has passed away.`, { kind: 'card' }); shelf('settle', `<b>REST WELL</b><p>${esc(name)} has passed away.</p><p>The others stay close.</p>`, 9000); };
  // ── message in a bottle ── the letter, unrolled on parchment; and writing one, with the bottle tossed in at the end
  function bottleLetter({ from, note, at, pay }) {
    return modalFree().then(() => new Promise((res) => {
      modal.innerHTML = `<div class="box bletter"><div class="bpic">${msIcon('bottle', true, 54)}</div><div class="scroll"><small>A message in a bottle</small><p class="hand">${esc(note)}</p><footer>— ${esc(from)}${at ? ` · sent ${ago(at)}` : ''}</footer></div>
        ${pay ? `<p class="bpay">+${pay} 🐚 for finding it</p>` : ''}<button class="big gold" id="mok">Write back</button><button class="lnk" id="mno">Let it float away</button></div>`;
      modal.classList.add('on'); const done = (v) => { modal.classList.remove('on'); modalShut = performance.now(); res(v); };
      $('mok').onclick = () => { sfx('tap'); done(true); }; $('mno').onclick = () => done(false);
    }));
  }
  async function sendBottle(to, start = '') {
    const m = game.members?.find((x) => x.id === to); if (!m) return false;
    const v = await new Promise((res) => modalFree().then(() => {
      modal.innerHTML = `<div class="box bletter write"><div class="bpic">${msIcon('bottle', true, 54)}</div><div class="scroll"><small>To ${esc(m.name)}</small><textarea id="bt" class="hand" maxlength="80" placeholder="Write something kind…">${esc(start)}</textarea><footer><span id="bl">80</span> left</footer></div>
        <p class="bpay">It washes up in ${esc(m.name)}’s tank · 2 🐚</p><button class="big gold" id="mok">Toss it in</button><button class="lnk" id="mno">Not now</button></div>`;
      modal.classList.add('on'); const ta = $('bt'), ok = $('mok'), upd = () => { $('bl').textContent = 80 - ta.value.length; ok.disabled = !ta.value.trim(); }; ta.oninput = upd; upd(); setTimeout(() => ta.focus(), 200);
      const done = (x) => { modal.classList.remove('on'); modalShut = performance.now(); res(x); }; ok.onclick = () => done(ta.value.trim()); $('mno').onclick = () => done(null);
    }));
    if (!v) return false; const r = await game.dispatch({ t: 'bottle', to, note: v }); if (!r.ok) { toast(REASONS[r.reason] ?? 'Could not send that.'); return false; }
    sfx('bubble'); haptic(12); const fly = document.createElement('div'); fly.className = 'btoss'; fly.innerHTML = msIcon('bottle', true, 44); document.body.appendChild(fly); setTimeout(() => fly.remove(), 2400);      // tossed in: it plops into the water and bobs off
    toast(`Your bottle is drifting to ${m.name}.`, 2800); refresh(); return true;
  }
  return { bottleLetter, sendBottle, noteBoard, readNote, writeNote, recap, surprise, together, sick, mourn, hush, celebrate, clearToasts, chapter, farewell, reunion, settle, choose, pickFish, toast, open, showBook: () => open('book'), flag, refresh, updateHeader, dialog, showCoach, hideCoach, pulse, setMembers, get tab() { return tab; }, get selected() { return selected; }, get rearrange() { return rearrange; }, set rearrange(v) { rearrange = v; }, select: (k) => { selected = k; }, REASONS };
}
