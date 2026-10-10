// HTML chrome: header, bottom-sheet tabs (Care / Shop / Crew: friends, journal, collection, settings), shop, modals, toasts.
import { skyOf } from './game/sky.js';
import { CRAB_PRICE, driftBlame, giftReady } from './game/rules.js';
import { SOCIAL, THEMES, themesOf, adoptAdvice, harmonyOf, canPuzzle, PUZZLE_COST, SPECIES_DEF, DECOR_DEF, DAILY_REWARD, AIL_TIRED, AIL_WARN, LEVEL_AT, WISHES, COLLECTION_SIZE, fishPrice, dailyFish, isFree, FLOORS, BACKDROPS, scoreOf, capacity, stageOf, nextStage, comfortOf, readyToTrim, growthOf, WANT_REWARD, FOODS, tankMood, dayTicks, PERFECT_DAY_REWARD, STYLE_PRICE, styleOwned } from './game/rules.js';
import { REASONS } from './game/game.js';
import { decorThumb, fishThumb } from './w3/thumbs.js';
import { sfx, setSound, soundOn, setMusic, musicOn } from './audio.js';
import { OCTO_COLORS } from './species.js';
import { hasOcto, hasFishOnly, canFeedOcto, octoHunger } from './game/rules.js';

export { drawAvatar } from './people.js';
import { drawAvatar, soloLook } from './people.js';
import { lookEditor } from './lookeditor.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (ts) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
const CATS = ['NEW', 'PLANTS', 'ROCKS', 'WOOD', 'STRUCTURES', 'SPECIAL', 'FISH', 'FLOOR', 'BACKDROP'];
const SWATCH = { floor: { sand: 'linear-gradient(#ecdcb0,#d6bf8a)', pearl: 'linear-gradient(#f2eaf8,#cfc4e6)', gravel: 'linear-gradient(#a49c8c,#6e685c)', black: 'linear-gradient(#3a3a4a,#1c1c26)', coral: 'linear-gradient(#f6b0be,#e2788e)' }, backdrop: { candy: 'linear-gradient(#f6b8c8,#c9b6f0,#9fd0f2)', lagoon: 'linear-gradient(#7fd8d0,#5fb8d8,#6a9ae0)', sunset: 'linear-gradient(#ffc79a,#ff9eb4,#c08ae0)', mint: 'linear-gradient(#b8f0c8,#8adcc8,#9ac8f0)' } };

export function initUI({ game, social, cb }) {
  const sheet = document.getElementById('sheet'), toastEl = document.getElementById('toast'), $ = (id) => document.getElementById(id);
  let tab = 'tank', sub = 'friends', tt, cat = 'NEW', selected = null, rearrange = false;
  // Toasts wait their turn: each one is read for a moment before the next, repeats are dropped, and a long backlog moves faster (newest kept).
  const tq = []; let showing = 0;
  const cardUp = () => ['settle', 'reunion', 'coach'].some((id) => $(id)?.classList.contains('on'));
  const nextToast = () => { if (cardUp() && tq.length) { showing = 1; toastEl.classList.remove('on'); clearTimeout(tt); tt = setTimeout(nextToast, 700); return; } const n = tq.shift(); if (!n) { showing = 0; toastEl.classList.remove('on'); return; } showing = 1; toastEl.textContent = n.m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(nextToast, tq.length > 1 ? Math.min(n.ms, 1300) : n.ms); };
  const toast = (m, ms = 2400) => { notice(m, { kind: 'toast' }); if (tq.some((x) => x.m === m) || (showing && toastEl.textContent === m && toastEl.classList.contains('on'))) return; tq.push({ m, ms }); while (tq.length > 4) tq.splice(1, 1); if (!showing) nextToast(); };
  const clearToasts = () => { tq.length = 0; showing = 0; clearTimeout(tt); toastEl.classList.remove('on'); };
  const S = () => game.state;
  // ── notices: every hint, message and card is kept on this phone, newest first, with a bell that counts the new ones ──
  const NK = 'ourtank.notices', RK = 'ourtank.noticesRead';
  let notices = (() => { try { return JSON.parse(localStorage.getItem(NK) || '[]').filter((n) => !n.gift && !/small gift is waiting/.test(n.text)); } catch { return []; } })(), readAt = +(localStorage.getItem(RK) || 0);
  const noticeSave = () => { try { localStorage.setItem(NK, JSON.stringify(notices.slice(0, 80))); } catch { /* storage unavailable */ } };
  const notice = (text, { tab = '', gift = false, kind = 'note' } = {}) => {
    if (!text || notices.slice(0, 40).some((n) => n.text === text && Date.now() - n.ts < 3 * 864e5)) return;      // the same message is kept once, not again every time the app opens
    notices.unshift({ ts: Date.now(), text, tab, gift, kind }); notices = notices.slice(0, 80); noticeSave(); bell();
  };
  const unread = () => notices.filter((n) => n.ts > readAt).length;
  const bell = () => { const b = $('bell'); if (!b) return; const n = unread(); b.classList.toggle('new', n > 0); b.querySelector('i').textContent = n > 9 ? '9+' : n ? String(n) : ''; };
  const noticesHtml = () => {
    if (!notices.length) return '<p class="dim">Nothing yet. Hints, messages and moments in the tank will be kept here.</p>';
    const day = (ts) => { const d = Math.floor(ts / 864e5), t = Math.floor(Date.now() / 864e5); return d === t ? 'Today' : d === t - 1 ? 'Yesterday' : new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
    let last = '', out = '';
    for (const n of notices) { const d = day(n.ts); if (d !== last) { last = d; out += `<h4>${d}</h4>`; } out += `<button class="je nt ${n.ts > readAt ? 'new' : ''} ${n.tab || n.gift ? 'go' : ''}" data-nt="${notices.indexOf(n)}"><small>${new Date(n.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small><span>${esc(n.text)}</span></button>`; }
    return out;
  };
  // the game opens up gradually: a new tank shows only feeding, fish and a few decorations; food choices, themes, comfort, the daily checklist, floors and postcards appear once the tank has grown a little
  const adv = () => { const s = S(); return !!s && (s.level >= 2 || s.fish.length >= 2); };
  const eta = (ms) => { if (ms <= 0) return 'any moment now'; const m = Math.max(1, Math.ceil(ms / 60e3)); return m >= 2880 ? Math.round(m / 1440) + ' days' : m >= 90 ? Math.round(m / 60) + 'h' : m + ' min'; };
  const tile = (icon, label, act, sub = '', cls = '') => `<button class="tile ${cls}" data-act="${act}"><span>${icon}</span>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
  const inH = (h) => (h < 1 ? 'within the hour' : h < 24 ? `in about ${Math.round(h)}h` : `in about ${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'}`);
  // each care tile says whether it is needed now, and if not, roughly when it will be, so nobody taps it for nothing
  const careState = () => { const s = S(), me = game.you?.userId, oc = s.fish.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a))[0], fish = hasFishOnly(s);
    const fNeed = (oc && octoHunger(oc) > 0.25) || (fish && s.hunger > 0.25), fH = Math.min(oc ? (0.25 - octoHunger(oc)) * 8 : 99, fish ? (0.25 - s.hunger) * 5 : 99);
    return { feed: fNeed ? ['Hungry · feed now', 'due'] : [`Full · hungry ${inH(Math.max(0, fH))}`, 'later'], glass: s.glass > 0.3 ? [`${s.glass > 0.6 ? 'Algae' : 'A little algae'} · wipe now`, 'due'] : [`Clear · wipe ${inH((0.3 - s.glass) * 30)}`, 'later'], water: s.water < 0.7 ? [`${s.water < 0.5 ? 'Dirty' : 'Cloudy'} · change now`, 'due'] : [`Clean · change ${inH((s.water - 0.7) * 48)}`, 'later'] }; };

  // ── header ──
  function updateHeader() {
    const s = S(); if (!s) return;
    $('shells').textContent = '🐚 ' + s.shells; $('day').textContent = 'DAY ' + String(game.day).padStart(3, '0');
    const score = scoreOf(s), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, pct = b ? Math.round(((score - a) / (b - a)) * 100) : 100;
    $('lvl').textContent = 'LV ' + lv; $('lvbar').style.width = Math.max(4, Math.min(100, pct)) + '%'; $('lvbar').parentElement.title = b ? `${score}/${b} to level ${lv + 1}` : 'Max level';
    const g = goalText(); if ($('goal').textContent !== g.text) { $('goal').textContent = g.text; $('goal').dataset.tab = g.tab || ''; $('goal').dataset.gift = g.gift ? '1' : ''; if (g.text) { notice(g.text, { tab: g.tab || '', gift: !!g.gift, kind: 'hint' }); $('goal').classList.add('on'); clearTimeout($('goal')._t); $('goal')._t = setTimeout(() => $('goal').classList.remove('on'), 9000); } }
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('dot', n.dataset.tab === g.tab && g.tab !== 'tank'));
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
    for (const f of s.fish.filter((x) => x.species === 'octopus' && !x.dead)) { const v = 1 - octoHunger(f), mine = canFeedOcto(f, me, game.shared); rows.push(row('🐙', esc(f.name), v, lvl(v, 0.6, 0.3, ['Full', 'Peckish', 'Hungry']), mine ? (v < 0.6 ? 'Drop a crab from Feed' : 'Empties in about 8 hours. Only you feed it.') : `Only ${esc(f.ownerName ?? 'its caretaker')} can feed it`)); }
    if (hasFishOnly(s)) { const v = 1 - s.hunger; rows.push(row('🐟', 'The fish', v, lvl(v, 0.6, 0.3, ['Full', 'Peckish', 'Hungry']), v < 0.6 ? 'Feed them flakes from Feed' : 'Get hungry in about 5 hours')); }
    rows.push(row('💧', 'Water', s.water, lvl(s.water, 0.7, 0.5, ['Clean', 'Cloudy', 'Dirty']), s.water < 0.7 ? 'Time for a water change' : 'Turns cloudy over a couple of days'));
    rows.push(row('🪟', 'Glass', 1 - s.glass, lvl(1 - s.glass, 0.7, 0.45, ['Clear', 'A little algae', 'Algae']), 1 - s.glass < 0.7 ? 'Give it a wipe' : 'Algae builds up over about a day'));
    const n = s.fish.length + (s.orders ?? []).reduce((a, o) => a + (SPECIES_DEF[o.species]?.count ?? 1), 0), cap = capacity(s.level);
    return `<div class="meters">${rows.join('')}</div><p class="room">🐠 <b>${n} of ${cap}</b> places in the tank are taken${n < cap ? ` · room for ${cap - n} more` : ' · level up to make room'}</p>`;
  };
  const slotsHtml = () => {
    const s = game.members; if (!s) return '';
    return [1, 2, 3, 4].map((n) => { const m = s.find((x) => x.slot === n); return m
      ? `<div class="slot${m.id === game.you.userId ? ' me' : ''}"><canvas class="av big" data-slot="${n}"></canvas><b>${esc(m.name)}${m.id === game.you.userId ? ' (you)' : ''}</b><small>${game.online.includes(m.id) ? '● Online' : '○ Away'}</small>${m.id === game.you.userId ? '<button class="nudge" data-edit-me>Edit look</button>' : `<button class="nudge" data-nudge="${m.id}">Nudge</button><button class="nudge" data-bottle="${m.id}">Bottle</button>`}</div>`
      : `<div class="slot empty" data-invite><span>+</span><b>Invite</b><small>Slot ${n}</small></div>`; }).join('');
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
  function shopCards() {
    const s = S(), out = [], showAll = cat === 'NEW', fishCat = cat === 'FISH';
    if (showAll || fishCat) for (const [id, d] of Object.entries(SPECIES_DEF).filter(([, x]) => !x.visitor)) out.push({ kind: 'fish', id, label: d.label, price: fishPrice(id), deal: id === dailyFish(), level: d.level, blurb: d.blurb + (d.count > 1 ? '' : ''), count: d.count, cat: 'FISH' });
    if (!fishCat && cat !== 'FLOOR' && cat !== 'BACKDROP') for (const [id, d] of Object.entries(DECOR_DEF)) if (showAll || d.cat === cat) out.push({ kind: 'decor', id, label: d.label, price: d.price, level: d.level, blurb: d.blurb, cat: d.cat });
    for (const [kind, names] of [['floor', FLOORS], ['backdrop', BACKDROPS]]) if (showAll || cat === kind.toUpperCase()) for (const [id, label] of Object.entries(names)) { const own = styleOwned(s, kind, id), cur = (s.style ?? {})[kind] === id; out.push({ kind, id, label: kind === 'floor' ? label + ' floor' : label + ' backdrop', price: STYLE_PRICE[kind][id], own, cur, level: 1, blurb: kind === 'floor' ? 'Changes the sand and the stones on the bottom of the tank.' : 'Changes the colours of the far water.', cat: kind.toUpperCase() }); }
    if (showAll) { const keep = out.filter((c) => isNew(s, c)); out.length = 0; out.push(...keep.sort((a, b) => a.price - b.price)); if (!out.length) return `<p class="dim newnone">Nothing new right now. Each time the tank levels up, the fish and decorations it unlocks wait here until you have them.</p>`; }      // NEW: only what the last level-up unlocked and you do not have yet
    return out.map((c) => {
      if (c.kind === 'floor' || c.kind === 'backdrop') { const key = c.kind + ':' + c.id; return `<button class="card ${selected === key ? 'sel' : ''}" data-k="${key}"><div class="sw" style="background:${SWATCH[c.kind][c.id]}"></div><b>${esc(c.label)}</b><span class="pr">${c.cur ? 'IN USE' : c.own || !c.price ? 'OWNED' : '🐚 ' + c.price}</span></button>`; }
      const lock = s.level < c.level, key = c.kind + ':' + c.id, free = c.kind === 'decor' && isFree(s, c.id);
      return `<button class="card ${selected === key ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="${key}"><img alt="" data-thumb="${key}">${!lock && isNew(S(), c) ? '<em class="newtag">NEW</em>' : ''}<b>${esc(c.label)}</b><span class="pr">${lock ? 'Lv ' + c.level : free ? 'FREE' : '🐚 ' + c.price}${c.deal && !lock ? ' <em>−25%</em>' : ''}</span></button>`;
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
  const bookHtml = () => {
    const s = S(), cell = (kind, id, label) => { const got = s.seen[kind].includes(id); return `<div class="bk ${got ? '' : 'nope'}"><img alt="" data-thumb="${kind === 'fish' ? 'fish' : 'decor'}:${id}"><b>${got ? esc(label) : '???'}</b></div>`; };
    return `<div class="bkhead"><b>${s.seen.fish.length + s.seen.decor.length} / ${COLLECTION_SIZE()}</b><small>Every 5 finds earns 3 shells</small></div><h4>Fish</h4><div class="bkg">${Object.entries(SPECIES_DEF).map(([id, d]) => cell('fish', id, d.label)).join('')}</div><h4>Decorations</h4><div class="bkg">${Object.entries(DECOR_DEF).map(([id, d]) => cell('decor', id, d.label)).join('')}</div>`;
  };
  const memorialHtml = () => { const m = S().memorial ?? []; return m.length ? `<h4>Remembered</h4><div class="mem">${m.map((x, i) => [x, i]).reverse().map(([x, i]) => `<button data-mem="${i}">${esc(x.name)} · ${esc(SPECIES_DEF[x.species]?.label ?? x.species)}</button>`).join('')}</div>` : ''; };
  const journalHtml = () => `${memorialHtml()}<form class="send note"><input maxlength="90" placeholder="Add a note to the journal" autocomplete="off"><button>Add</button></form><div class="jl">${game.journal.slice().reverse().map((e) => `<div class="je"><small>DAY ${String(e.day).padStart(3, '0')}</small><span>${esc(e.text)}</span></div>`).join('')}</div>`;
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
  const todayHtml = () => {
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
    return `${lvRow()}<div class="moodchip ${m.key}"><b>${m.label}</b> · ${esc(m.note)}</div>${(() => { const sk = skyOf(Date.now()); return sk.event ? `<div class="moodchip sky"><b>${esc(sk.event.label)}</b> · ${esc(sk.event.text)}</div>` : ''; })()}${s.fish.length > 1 ? (() => { const hm = harmonyOf(s); return `<div class="moodchip harm ${hm.key}"><b>Harmony: ${hm.label}</b> · ${esc(hm.note)}</div>`; })() : ''}${careCard}${g.gift || !g.text ? '' : `<button class="wish daily" data-open="${g.tab || 'tank'}"><small>WORTH DOING NOW</small><span>${esc(g.text)}</span>${g.tab && g.tab !== 'tank' ? '<b>Go ›</b>' : ''}</button>`}
      ${S().want ? wantHtml() : dailyHtml()}${first.length ? `<div class="orders"><small>COMING UP</small>${first.map(row).join('')}</div>` : ''}
      ${rest.length ? fold('more', `<span>${rest.length} more coming up</span>`, `<div class="orders flat">${rest.map(row).join('')}</div>`) : ''}${comfortHtml()}
      `;
  };
  const EARN = [['Feed hungry fish', '+1 each'], ['Wipe the glass', '+1 (a pearl every 5th: +3)'], ['Change cloudy water', '+2'], ['Say hello to a rare visitor', '+4'], ['Collect a find in the tank', '+1 to +4'], ["Today's request", '+3, +5 or +8 (a fish\'s own: +4)'], ['A fish grows up', '+1, +2'], ['A fish reaches 14 / 30 days', '+5 / +8'], ['Two fish become friends', '+3'], ['A fish finds its favourite spot', '+2'], ['The first egg hatches', '+5'], ['Open a friend\'s bottle', '+2'], ['Every 5 things in the collection book', '+3'], ['Tank level up', '+4 and more']];
  let feedOpen = false;
  // what this caretaker can feed right now: a crab for their own octopus (the hungriest first), flakes and the rest for the fish
  const feedDrawer = () => {
    const s = S(), me = game.you?.userId, octos = s.fish.filter((f) => canFeedOcto(f, me, game.shared)).sort((a, b) => octoHunger(b) - octoHunger(a)), fish = hasFishOnly(s) || !hasOcto(s), sh = s.shells, cur = game.feedFood;
    const rows = [];
    if (octos.length) rows.push(`<button class="fd ${cur === 'crab' ? 'on' : ''}" data-feed="crab"><span>🦀</span><b>Crab</b><small>for ${esc(octos[0].name)} · fed ${Math.round((1 - octoHunger(octos[0])) * 100)}%</small><i>free</i></button>`);
    if (fish) for (const [k, d] of Object.entries(FOODS)) if (!d.octo) rows.push(`<button class="fd ${cur === k ? 'on' : ''}" data-feed="${k}" ${sh < d.price ? 'disabled' : ''}><span>${k === 'flakes' ? '🫧' : k === 'pellets' ? '🟤' : '🍤'}</span><b>${d.label}</b><small>${k === 'flakes' ? 'for the fish' : k === 'pellets' ? 'shy and calm fish love these' : 'a greedy fish\'s favourite'}${s.hunger < 0.08 ? ' · full for now' : ''}</small><i>${d.price ? d.price + ' 🐚' : 'free'}</i></button>`);
    if (!rows.length) { const o = s.fish.find((f) => f.species === 'octopus' && !f.dead); rows.push(`<p class="dim">${o ? `Only ${esc(o.ownerName ?? 'its caretaker')} can feed ${esc(o.name)}.` : 'Nothing to feed yet.'}</p>`); }
    return `<div class="drawer">${rows.join('')}<small class="dim">Pick one, then tap the water to drop it.</small></div>`;
  };
  const foodRow = () => { if (!adv()) return ''; const cur = game.feedFood ?? 'flakes', sh = S().shells; return `<div class="foodrow"><small>FOOD</small>${Object.entries(FOODS).filter(([, d]) => (d.octo ? hasOcto(S()) : hasFishOnly(S()) || !hasOcto(S()))).map(([k, d]) => `<button data-food="${k}" class="${k === cur ? 'on' : ''} ${sh < d.price ? 'no' : ''}">${d.label}${d.price ? ` · ${d.price} 🐚` : ''}</button>`).join('')}</div>`; };
  const views = {
    care: () => `<h3>Care</h3><div class="grid2 acts">${(() => { const k = careState(); return tile('🫙', 'Feed', 'feeddrawer', feedOpen ? 'choose below' : k.feed[0], k.feed[1]); })()}${feedOpen ? feedDrawer() : ''}${(() => { const k = careState(); return tile('🧽', 'Clean glass', 'clean', k.glass[0], k.glass[1]) + tile('💧', 'Change water', 'water', k.water[0], k.water[1]); })()}${readyToTrim(S(), Date.now()).length ? tile('✂️', 'Trim plants', 'trim', `${readyToTrim(S(), Date.now()).length} ready`) : ''}${(() => { const o = S().fish.find((f) => canPuzzle(f) && canFeedOcto(f, game.you?.userId, game.shared)) ?? S().fish.find((f) => canPuzzle(f)); if (!o) { const b = S().fish.find((f) => f.species === 'octopus' && !f.dead); return b ? tile('🧩', 'Puzzle jar', 'puzzle', `when ${esc(b.name)} grows up`) : ''; } const busy = !!o.puzzle, rest = o.puzzleAt != null && Date.now() - o.puzzleAt < 3 * 3600e3; return tile('🧩', 'Puzzle jar', 'puzzle', busy ? `${esc(o.name)} is working` : rest ? `${esc(o.name)} is resting` : `for ${esc(o.name)} · ${PUZZLE_COST} 🐚`); })()}${(() => { const o = S().fish.find((f) => f.species === 'octopus' && !f.dead && canFeedOcto(f, game.you?.userId, game.shared)); if (!o) return ''; const rest = o.crabAt != null && Date.now() - o.crabAt < 2 * 3600e3; return tile('🦀', 'Crab treat', 'crab', rest ? `${esc(o.name)} is full` : `for ${esc(o.name)} · ${CRAB_PRICE} 🐚`); })()}${adv() ? tile('📷', 'Postcard', 'photo') : ''}</div><h4>Tank status</h4>${meters()}<h4>Today</h4>${todayHtml()}`,
    notices: () => `<h3>Notices</h3><div class="jl nts">${noticesHtml()}</div>`,
    decorate: () => `<h3>Shop</h3><div class="shophead"><div class="cats">${[...CATS, 'THEMES'].filter((c) => adv() || (c !== 'FLOOR' && c !== 'BACKDROP')).map((c) => `<button class="cat ${c === cat ? 'on' : ''}" data-cat="${c}">${c}${c === 'NEW' && newCount() ? ` <i class="nc">${newCount()}</i>` : ''}</button>`).join('')}</div></div>
      ${cat === 'THEMES' ? themesPage() : `<div class="cards">${shopCards()}</div>`}${shopDetail()}<div class="shopfoot"><button class="lnk ${rearrange ? 'on' : ''}" id="rearr">${rearrange ? 'Tap a decoration to move it · Done' : 'Rearrange or sell decorations'}</button></div>`,
    friends: () => {
      const seg = `<div class="seg">${[['friends', 'Friends'], ['journal', 'Journal'], ['book', 'Collection'], ['settings', 'Settings']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div>`;
      if (sub === 'settings') return views.settings().replace('<h3>Settings</h3>', '<h3>Settings</h3>' + seg);
      if (sub === 'journal') return `<h3>Journal</h3>${seg}${journalHtml()}`;
      if (sub === 'book') return `<h3>Collection</h3>${seg}${bookHtml()}`;
      if (sub === 'look') return lookHtml();
      if (!game.shared) return `<h3>Friends</h3>${seg}<div class="slots"><div class="slot me"><canvas class="av big" data-slot="me"></canvas><b>You</b><small>● Online</small><button class="nudge" data-edit-me>Edit look</button></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 2</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 3</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 4</small></div></div>
        <p class="dim">You are playing on your own. Open the game on the server to start a shared tank; three friends can then join with its six-character code.</p>`;
      const wish = WISHES[S().wishIdx];
      const me = game.you.userId, myName = game.members?.find((x) => x.id === me)?.name ?? '', youify = (txt) => (myName ? txt.replace(new RegExp('^' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), 'You').replace(new RegExp(' and ' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), ' and you') : txt);
      const THANKABLE = ['feed', 'glass', 'water', 'decor', 'fish', 'visitor', 'bottle', 'gift'];
      const act = game.activity.slice().reverse().slice(0, 12).map((a) => { const can = a.userId && a.userId !== me && THANKABLE.includes(a.type) && Date.now() - a.ts < 24 * 3600e3 && !game.thanked?.has(a.id); return `<div class="act"><span>${esc(youify(a.text))}</span>${can ? `<button class="heart" data-thank="${a.id}" data-to="${a.userId}" aria-label="Say thanks">♡</button>` : `<small>${ago(a.ts)}</small>`}</div>`; }).join('') || '<p class="dim">Nothing yet.</p>';
      const msgs = game.messages.slice(-20).map((m) => `<div class="msg ${m.userId === game.you.userId ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
      return `<h3>Friends</h3>${seg}<div class="slots">${slotsHtml()}</div>
        <div class="code"><small>TANK CODE</small><b>${esc(game.code)}</b><div class="row"><button data-code="copy">Copy</button><button data-code="share">Invite friends</button><button data-code="regen" title="Invalidate the old code">New code</button></div></div>
        ${wish ? `<div class="wish"><small>THE TANK'S WISH</small><span>${esc(wish.text)}</span><b>+${wish.reward} 🐚</b></div>` : ''}<h4>Recent activity</h4>${act}<h4>Messages</h4><div class="chat">${msgs || '<p class="dim">Say hello.</p>'}</div>
        <form class="send"><input maxlength="140" placeholder="Send a message" autocomplete="off"><button>Send</button></form>`;
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
      <h4>Your tank</h4><div class="group">
        ${game.state.fish.some((f) => f.species === 'octopus') ? `<label class="row2"><span>Octopus moves things</span><button class="tog ${game.state.flags?.noRearrange ? '' : 'on'}" id="rearr">${game.state.flags?.noRearrange ? 'Off' : 'On'}</button></label>` : ''}
        ${game.shared ? `<div class="row2"><span>Tank</span><b>${esc(game.tankName)}</b></div>
        <div class="row2"><span>Tank storage</span><b id="stor">checking…</b></div>
        <div class="row2"><span>Copy on this phone</span><b id="phc">…</b></div>
        <label class="row2"><span>Recovery key</span><button class="tog" id="rkey">Show</button></label>
        <label class="row2"><span>Backup</span><span><button class="tog" id="bkup">Download</button> <button class="tog" id="bkcopy">Copy as text</button></span></label>
        <label class="row2"><span>Leave this tank</span><button class="tog warn" id="leave">Leave</button></label>` : `<label class="row2"><span>Start over</span><button class="tog warn" id="reset">Reset tank</button></label>`}
      </div>
      ${new URLSearchParams(location.search).has('dev') ? `<h4>Developer</h4><div class="group"><div class="row2"><span>Test tools</span><span><button class="tog" id="dshell">+50 shells</button> <button class="tog" id="dday">Skip a day</button></span></div></div>` : ''}
      ${game.shared ? `<h4>Your data</h4><div class="group"><label class="row2"><span>Delete my data</span><button class="tog warn" id="delme">Delete</button></label></div>` : ''}
      <p class="dim foot">OUR TANK · four friends, one tank. No ads, no purchases, no streaks. <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a></p></div>`,
  };
  function thumbs() { sheet.querySelectorAll('img[data-thumb]').forEach((im, i) => setTimeout(() => { const [k, id] = im.dataset.thumb.split(':'); if (!im.isConnected) return; im.src = k === 'fish' ? fishThumb(id) : decorThumb(id); }, i * 16)); }
  function paint() {
    sheet.querySelectorAll('canvas.big').forEach((c) => { if (c.dataset.slot === 'me') drawAvatar(c, soloLook()); else { const m = game.members?.find((x) => x.slot === +c.dataset.slot); if (m) drawAvatar(c, m.avatar); } });
    sheet.querySelectorAll('[data-edit-me]').forEach((b) => (b.onclick = () => { sfx('tap'); sub = 'look'; open('friends', true); sheet.scrollTop = 0; }));
    if (sub === 'look' && tab === 'friends' && sheet.querySelector('.ap') && !sheet.querySelector('.ap.pe')) bindLook();
    sheet.querySelectorAll('[data-invite]').forEach((e) => (e.onclick = () => social.invite()));
    sheet.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => ({ copy: () => social.copy(), share: () => social.share(), regen: () => social.regen() }[b.dataset.code]())));
    const f = sheet.querySelector('form.send'); if (f) f.onsubmit = (e) => { e.preventDefault(); const i = f.querySelector('input'); if (i.value.trim()) { social.chat(i.value); i.value = ''; } };
    const nf = sheet.querySelector('form.note'); if (nf) nf.onsubmit = (e) => { e.preventDefault(); const i = nf.querySelector('input'); if (i.value.trim()) { cb.note(i.value); i.value = ''; } };
    const ch = sheet.querySelector('.chat'); if (ch) ch.scrollTop = ch.scrollHeight;
    if (tab === 'notices') { readAt = Date.now(); try { localStorage.setItem(RK, String(readAt)); } catch { /* storage unavailable */ } bell(); sheet.querySelectorAll('[data-nt]').forEach((b) => (b.onclick = () => { const n = notices[+b.dataset.nt]; if (!n) return; sfx('tap'); if (n.gift) { open('tank'); cb.gift(); } else if (n.tab) open(n.tab); })); }
    sheet.querySelectorAll('[data-feed]').forEach((b) => (b.onclick = () => { game.feedFood = b.dataset.feed; feedOpen = false; sfx('tap'); open('tank'); cb.act('feed'); }));
    sheet.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { sfx('tap'); const a = b.dataset.act; if (a === 'feeddrawer') { feedOpen = !feedOpen; open('care', true); return; } if (a === 'fish') { open('tank'); cb.meetFish(); } else if (a === 'book') { game.track('book_opened'); open('journal'); } else if (a === 'photo') { open('tank'); cb.photo(); } else { open('tank'); cb.act(a); } }));
    sheet.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; selected = null; sfx('tap'); open('decorate', true); }));
    { const on = sheet.querySelector('.cats .cat.on'), row = on?.parentElement; if (on && row) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2); }      // keep the chosen shelf in view in the row
    sheet.querySelectorAll('.card').forEach((b) => (b.onclick = async () => {
      const [kind, id] = b.dataset.k.split(':'), s = S(); sfx('tap');
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
    sheet.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => { sub = b.dataset.sub; sfx('tap'); open('friends', true); }));
    sheet.querySelectorAll('[data-thank]').forEach((b) => (b.onclick = async () => { b.disabled = true; const r = await game.thank(b.dataset.to, +b.dataset.thank); if (r.ok) { sfx('tap'); b.textContent = '♥'; b.classList.add('on'); } else { toast(REASONS[r.reason] ?? 'Could not send that.'); b.disabled = false; } }));
    sheet.querySelectorAll('[data-bottle]').forEach((b) => (b.onclick = async () => {
      const note = await dialog({ title: 'MESSAGE IN A BOTTLE', text: 'It drops into the tank for them to find. Costs 2 shells.', input: { max: 40, placeholder: 'Write something kind' }, ok: 'Send', cancel: 'Cancel' }); if (!note) return;
      const r = await game.dispatch({ t: 'bottle', to: b.dataset.bottle, note }); if (r.ok) { sfx('tap'); toast('Bottle sent'); } else toast(REASONS[r.reason] ?? 'Could not send that.');
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
    cb.onTab(t); if (t === 'friends') flag('friends', false); if (!quiet && t === 'friends' && sub === 'journal') game.track('journal_opened');
    if (t === 'tank') { sheet.classList.remove('on'); feedOpen = false; return; } if (t !== 'care') feedOpen = false;
    sheet.innerHTML = `<button class="x">×</button>` + views[t](); sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank'); sheet.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => open(b.dataset.open); });
    sheet.querySelectorAll('details.fold').forEach((d) => d.addEventListener('toggle', () => { d.open ? game.folds.add(d.dataset.fold) : game.folds.delete(d.dataset.fold); }));
    sheet.querySelectorAll('.foodrow [data-food]').forEach((b) => { b.onclick = () => { const k = b.dataset.food; if (S().shells < FOODS[k].price) { toast('Not enough shells for that food'); return; } game.feedFood = k; sfx('tap'); sheet.querySelectorAll('.foodrow [data-food]').forEach((x) => x.classList.toggle('on', x.dataset.food === k)); }; }); paint();
  }
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
  const modalFree = () => new Promise((res) => { const w = () => (modal.classList.contains('on') ? setTimeout(w, 300) : res()); w(); });
  function celebrate({ title, amount = 0, what = 'shells', why = '', ok = 'Claim', icon = '🐚' }) {
    return modalFree().then(() => new Promise((res) => {
      const bits = Array.from({ length: 18 }, (_, i) => `<i style="--a:${(i / 18) * 360}deg;--d:${70 + (i % 3) * 26}px;--t:${0.9 + (i % 4) * 0.12}s">${i % 3 ? '✦' : '🐚'}</i>`).join('');
      modal.innerHTML = `<div class="box party"><div class="burst">${bits}</div><div class="big-ic">${icon}</div><h2>${esc(title)}</h2>${amount ? `<div class="amt">+${amount} <small>${esc(what)}</small></div>` : ''}${why ? `<p>${esc(why)}</p>` : ''}<button class="big gold" id="mok">${esc(ok)}</button></div>`;
      modal.classList.add('on', 'party'); sfx('arrive');
      $('mok').onclick = () => { modal.classList.remove('on', 'party'); res(true); };
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
    return new Promise((res) => {
      modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}<div class="chooser">${options.map((o, i) => `<button class="big ${i ? 'alt' : ''}" data-i="${i}">${esc(o.label)}</button>`).join('')}</div>${cancel ? `<button class="lnk" id="mno">${esc(cancel)}</button>` : ''}</div>`;
      modal.classList.add('on'); const done = (v) => { modal.classList.remove('on'); res(v); };
      modal.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => done(options[+b.dataset.i].value); }); const no = $('mno'); if (no) no.onclick = () => done(undefined);
    });
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
  function showCoach({ title, text, button = null, onButton = null, skip = null }) {
    coach.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p><div class="crow">${button ? `<button class="big sm" id="cbtn">${esc(button)}</button>` : ''}${skip ? `<button class="lnk" id="cskip">Skip tips</button>` : ''}</div>`;
    coach.classList.add('on'); if (button) $('cbtn').onclick = () => onButton?.(); if (skip) $('cskip').onclick = skip;
  }
  const hideCoach = () => coach.classList.remove('on');
  const flag = (tabName, on) => document.querySelectorAll('nav [data-tab]').forEach((n) => { if (n.dataset.tab === tabName) n.classList.toggle('dot2', on && tab !== tabName); });
  const pulse = (tabName) => document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('pulse', n.dataset.tab === tabName));

  // a quiet message that lives in the tank (not a popup that has to be dismissed): it fades in, waits a few seconds, and fades out; a tap clears it early
  const shelf = (id, html, ms, onLink, tries = 0) => { if ($('coach')?.classList.contains('on') && tries < 40) { setTimeout(() => shelf(id, html, ms, onLink, tries + 1), 800); return; }      // a tip on screen goes first; the card waits its turn
    const el = $(id); clearTimeout(el._t); for (const o of ['settle', 'reunion']) if (o !== id) $(o).classList.remove('on'); toastEl.classList.remove('on'); el.innerHTML = html; el.classList.add('on'); const off = () => el.classList.remove('on'); el.onclick = (e) => { if (e.target.closest('.lk')) { off(); onLink?.(); } else off(); }; el._t = setTimeout(off, ms); };
  const reunion = (lines, onPostcard) => { for (const l of lines) notice(l, { kind: 'card' }); return shelf('reunion', `<b>WELCOME BACK</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="lk">Send a postcard of the tank</button>`, 11000, onPostcard); };
  const settle = (lines) => { $('settle').classList.add('top'); for (const l of lines) notice(l, { kind: 'card' }); shelf('settle', `<b>COMING UP</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}`, 12000); };
  const place = () => $('settle').classList.add('top');        // never sit on top of an open menu: use the top of the screen then
  const chapter = (c) => { place(); notice(`Chapter: ${c.title}. ${c.text}`, { kind: 'card' }); shelf('settle', `<b>CHAPTER</b><p><strong>${esc(c.title)}</strong></p><p>${esc(c.text)}</p>`, 9000); };
  const farewell = (name) => { place(); notice(`${name} has passed away.`, { kind: 'card' }); shelf('settle', `<b>REST WELL</b><p>${esc(name)} has passed away.</p><p>The others stay close.</p>`, 9000); };
  return { celebrate, clearToasts, chapter, farewell, reunion, settle, choose, pickFish, toast, open, showBook: () => open('book'), flag, refresh, updateHeader, dialog, showCoach, hideCoach, pulse, setMembers, get tab() { return tab; }, get selected() { return selected; }, get rearrange() { return rearrange; }, set rearrange(v) { rearrange = v; }, select: (k) => { selected = k; }, REASONS };
}
