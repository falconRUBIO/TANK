// HTML chrome: header, bottom-sheet tabs (Care / Decorate / Friends / Journal / Settings), shop, modals, toasts.
import { SPECIES_DEF, DECOR_DEF, LEVEL_AT, scoreOf, capacity, stageOf } from './game/rules.js';
import { REASONS } from './game/game.js';
import { decorThumb, fishThumb } from './w3/thumbs.js';
import { sfx, setSound, soundOn } from './audio.js';

export const SKINS = ['#f1c8a0', '#d9a273', '#b06a42', '#8a5a3a', '#5a3a28'];
export const HAIRS = ['#222222', '#5a3ad0', '#a0522d', '#d8a830', '#c0362c', '#2f8f6a'];
export const HATS = [null, '#56703a', '#c0362c', '#3a5ad0', '#d8a830', '#222222'];
export function drawAvatar(c, { skin = '#b06a42', hair = '#222222', hat = null, eye = '#1a1a22' } = {}) {
  const g = c.getContext('2d'); c.width = c.height = 16; g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r(0, 0, 16, 16, '#1c2b40'); r(3, 11, 10, 5, '#2e5a3a'); r(4, 4, 8, 8, skin); r(5, 12, 6, 1, skin);
  if (hat) { r(3, 2, 10, 3, hat); r(2, 4, 12, 1, hat); } else { r(3, 2, 10, 3, hair); r(3, 4, 2, 5, hair); r(11, 4, 2, 5, hair); }
  r(6, 7, 1, 2, eye); r(9, 7, 1, 2, eye); r(7, 10, 2, 1, '#6a2a22');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (ts) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
const CATS = ['ALL', 'PLANTS', 'ROCKS', 'WOOD', 'STRUCTURES', 'SPECIAL', 'FISH'];

export function initUI({ game, social, cb }) {
  const sheet = document.getElementById('sheet'), toastEl = document.getElementById('toast'), $ = (id) => document.getElementById(id);
  let tab = 'tank', tt, cat = 'ALL', selected = null, rearrange = false;
  const toast = (m, ms = 2400) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), ms); };
  const S = () => game.state;
  const tile = (icon, label, act, sub = '') => `<button class="tile" data-act="${act}"><span>${icon}</span>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;

  // ── header ──
  function updateHeader() {
    const s = S(); if (!s) return;
    $('shells').textContent = '🐚 ' + s.shells; $('day').textContent = 'DAY ' + String(game.day).padStart(3, '0');
    const score = scoreOf(s), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, pct = b ? Math.round(((score - a) / (b - a)) * 100) : 100;
    $('lvl').textContent = 'LV ' + lv; $('lvbar').style.width = Math.max(4, Math.min(100, pct)) + '%'; $('lvbar').parentElement.title = b ? `${score}/${b} to level ${lv + 1}` : 'Max level';
    const g = goalText(); $('goal').textContent = g.text; $('goal').dataset.tab = g.tab || '';
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('dot', n.dataset.tab === g.tab && g.tab !== 'tank'));
  }
  function goalText() {
    const s = S(); if (!s) return { text: '' };
    if ((s.flags.tut ?? 0) < 5 && game.isTutOwner) return { text: 'Follow the tips to get started', tab: '' };
    if (s.hunger > 0.5) return { text: 'The fish are getting hungry. Feed them.', tab: 'care' };
    if (s.glass > 0.45) return { text: 'Algae on the glass. Give it a wipe.', tab: 'care' };
    if (s.water < 0.6) return { text: 'The water could use a change.', tab: 'care' };
    const cheapest = Math.min(...Object.values(DECOR_DEF).filter((d) => d.level <= s.level).map((d) => d.price));
    const fish = Object.entries(SPECIES_DEF).filter(([, d]) => d.level <= s.level && s.fish.length + d.count <= capacity(s.level)).sort((x, y) => x[1].price - y[1].price)[0];
    if (fish && s.shells >= fish[1].price) return { text: `You can adopt a ${fish[1].label.toLowerCase()}!`, tab: 'decorate' };
    if (s.shells >= cheapest) return { text: 'You have shells to spend on decorations.', tab: 'decorate' };
    const b = LEVEL_AT[s.level]; return { text: b ? `Earn shells by caring · ${scoreOf(s)}/${b} to level ${s.level + 1}` : 'Everything is calm. Enjoy your tank.', tab: '' };
  }
  $('goal').onclick = () => { const t = $('goal').dataset.tab; if (t) open(t); };

  // ── sheets ──
  const meters = () => { const s = S(); const bar = (l, v) => `<div class="nb"><span>${l}</span><i><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></b></i></div>`; return `<div class="needs wide">${bar('Fed', 1 - s.hunger)}${bar('Water', s.water)}${bar('Glass', 1 - s.glass)}${bar('Fish', Math.min(1, s.fish.length / capacity(s.level)))}</div>`; };
  const slotsHtml = () => {
    const s = game.members; if (!s) return '';
    return [1, 2, 3].map((n) => { const m = s.find((x) => x.slot === n); return m
      ? `<div class="slot"><canvas class="av big" data-slot="${n}"></canvas><b>${esc(m.name)}${m.id === game.you.userId ? ' (you)' : ''}</b><small>${game.online.includes(m.id) ? '● Online' : '○ Away'}</small></div>`
      : `<div class="slot empty" data-invite><span>+</span><b>Invite</b><small>Slot ${n}</small></div>`; }).join('');
  };
  function shopCards() {
    const s = S(), out = [], showAll = cat === 'ALL', fishCat = cat === 'FISH';
    if (showAll || fishCat) for (const [id, d] of Object.entries(SPECIES_DEF)) out.push({ kind: 'fish', id, label: d.label, price: d.price, level: d.level, blurb: d.blurb + (d.count > 1 ? '' : ''), count: d.count, cat: 'FISH' });
    if (!fishCat) for (const [id, d] of Object.entries(DECOR_DEF)) if (showAll || d.cat === cat) out.push({ kind: 'decor', id, label: d.label, price: d.price, level: d.level, blurb: d.blurb, cat: d.cat });
    return out.map((c) => {
      const lock = s.level < c.level, key = c.kind + ':' + c.id, free = c.kind === 'decor' && s.flags.freePlant > 0 && c.cat === 'PLANTS';
      return `<button class="card ${selected === key ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="${key}"><img alt="" data-thumb="${key}"><b>${esc(c.label)}</b><span class="pr">${lock ? 'Lv ' + c.level : free ? 'FREE' : '🐚 ' + c.price}</span></button>`;
    }).join('');
  }
  function shopDetail() {
    const s = S(); if (!selected) return `<div class="detail dim">Pick something to see what it does.</div>`;
    const [kind, id] = selected.split(':'), d = kind === 'fish' ? SPECIES_DEF[id] : DECOR_DEF[id]; if (!d) return '';
    const free = kind === 'decor' && s.flags.freePlant > 0 && d.cat === 'PLANTS';
    let note = '', can = true;
    if (s.level < d.level) { note = `Unlocks at tank level ${d.level}`; can = false; }
    else if (!free && s.shells < d.price) { note = `${d.price - s.shells} more shell${d.price - s.shells === 1 ? '' : 's'} needed`; can = false; }
    else if (kind === 'fish' && s.fish.length + d.count > capacity(s.level)) { note = 'No room yet. Level up to grow the tank.'; can = false; }
    return `<div class="detail"><div><h4>${esc(d.label)}</h4><p>${esc(d.blurb)}${kind === 'fish' && d.count > 1 ? ` Comes as a school of ${d.count}.` : ''}</p>${note ? `<small class="note">${esc(note)}</small>` : ''}</div>
      <button class="big gold" id="buy" ${can ? '' : 'disabled'}>${kind === 'fish' ? 'ADOPT' : 'PLACE'} · ${free ? 'FREE' : '🐚 ' + d.price}</button></div>`;
  }
  const views = {
    care: () => `<h3>Care</h3>${meters()}<div class="grid2">${tile('🫙', 'Feed', 'feed', 'Tap the water to drop food')}${tile('🧽', 'Clean Glass', 'clean', 'Swipe away algae')}${tile('💧', 'Water Change', 'water')}${tile('🐟', 'Meet the fish', 'fish', `${S().fish.length} in the tank`)}</div>`,
    decorate: () => `<h3>Decorate</h3><div class="shophead"><div class="cats">${CATS.map((c) => `<button class="cat ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div></div>
      <div class="cards">${shopCards()}</div>${shopDetail()}<div class="shopfoot"><button class="lnk ${rearrange ? 'on' : ''}" id="rearr">${rearrange ? 'Tap a decoration to move it · Done' : 'Rearrange or sell decorations'}</button></div>`,
    friends: () => {
      if (!game.shared) return `<h3>Friends</h3><div class="slots"><div class="slot"><canvas class="av big" data-slot="me"></canvas><b>You</b><small>● Online</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 2</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 3</small></div></div>
        <p class="dim">You are playing solo. Host the game online and two friends can join with a six-character code to care for the same tank.</p>`;
      const act = game.activity.slice().reverse().slice(0, 6).map((a) => `<div class="act"><span>${esc(a.text)}</span><small>${ago(a.ts)}</small></div>`).join('') || '<p class="dim">Nothing yet.</p>';
      const msgs = game.messages.slice(-20).map((m) => `<div class="msg ${m.userId === game.you.userId ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
      return `<h3>Friends</h3><div class="slots">${slotsHtml()}</div>
        <div class="code"><small>TANK CODE</small><b>${esc(game.code)}</b><div class="row"><button data-code="copy">Copy</button><button data-code="share">Invite friends</button><button data-code="regen" title="Invalidate the old code">New code</button></div></div>
        <h4>Recent activity</h4>${act}<h4>Messages</h4><div class="chat">${msgs || '<p class="dim">Say hello.</p>'}</div>
        <form class="send"><input maxlength="140" placeholder="Send a message" autocomplete="off"><button>Send</button></form>`;
    },
    journal: () => `<h3>Journal</h3><div class="jl">${game.journal.slice().reverse().map((e) => `<div class="je"><small>DAY ${String(e.day).padStart(3, '0')}</small><span>${esc(e.text)}</span></div>`).join('')}</div>`,
    settings: () => `<h3>Settings</h3><div class="set">
      <label class="row2"><span>Sound</span><button class="tog ${soundOn() ? 'on' : ''}" id="snd">${soundOn() ? 'On' : 'Off'}</button></label>
      <label class="row2"><span>Graphics</span><button class="tog" id="gfx">${['Low', 'Medium', 'High'][cb.quality()]}</button></label>
      ${game.shared ? '' : '<label class="row2"><span>Replay the tips</span><button class="tog" id="tutr">Replay</button></label>'}
      ${game.shared ? `<div class="row2"><span>Tank</span><b>${esc(game.tankName)}</b></div>` : `<label class="row2"><span>Start over</span><button class="tog warn" id="reset">Reset tank</button></label>`}
      ${new URLSearchParams(location.search).has('dev') ? `<h4>Developer</h4><div class="row2"><span>Test tools</span><span><button class="tog" id="dshell">+50 shells</button> <button class="tog" id="dday">Skip a day</button></span></div>` : ''}
      <p class="dim">OUR TANK · three friends, one tank. No ads, no purchases, no streaks.</p></div>`,
  };
  function thumbs() { sheet.querySelectorAll('img[data-thumb]').forEach((im, i) => setTimeout(() => { const [k, id] = im.dataset.thumb.split(':'); if (!im.isConnected) return; im.src = k === 'fish' ? fishThumb(id) : decorThumb(id); }, i * 16)); }
  function paint() {
    sheet.querySelectorAll('canvas.big').forEach((c) => { if (c.dataset.slot === 'me') drawAvatar(c, { skin: '#b06a42', hair: '#222', hat: '#56703a' }); else { const m = game.members?.find((x) => x.slot === +c.dataset.slot); if (m) drawAvatar(c, m.avatar); } });
    sheet.querySelectorAll('[data-invite]').forEach((e) => (e.onclick = () => social.invite()));
    sheet.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => ({ copy: () => social.copy(), share: () => social.share(), regen: () => social.regen() }[b.dataset.code]())));
    const f = sheet.querySelector('form.send'); if (f) f.onsubmit = (e) => { e.preventDefault(); const i = f.querySelector('input'); if (i.value.trim()) { social.chat(i.value); i.value = ''; } };
    const ch = sheet.querySelector('.chat'); if (ch) ch.scrollTop = ch.scrollHeight;
    sheet.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { sfx('tap'); const a = b.dataset.act; if (a === 'fish') { open('tank'); cb.meetFish(); } else { open('tank'); cb.act(a); } }));
    sheet.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; selected = null; sfx('tap'); open('decorate', true); }));
    sheet.querySelectorAll('.card').forEach((b) => (b.onclick = () => { selected = b.dataset.k; sfx('tap'); const y = sheet.scrollTop; open('decorate', true); sheet.scrollTop = y; }));
    const buy = $('buy'); if (buy) buy.onclick = () => { const [kind, id] = selected.split(':'); if (kind === 'fish') cb.adopt(id); else cb.startPlace(id); };
    const rr = $('rearr'); if (rr) rr.onclick = () => { rearrange = !rearrange; cb.rearrange(rearrange); if (rearrange) open('tank'); else open('decorate', true); };
    const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    bind('snd', () => { setSound(!soundOn()); open('settings', true); }); bind('gfx', () => { cb.cycleQuality(); open('settings', true); });
    bind('tutr', () => { open('tank'); cb.replayTutorial(); }); bind('reset', (ev) => { if (ev.target.dataset.sure) game.reset(); else { ev.target.dataset.sure = 1; ev.target.textContent = 'Tap again to erase'; } });
    bind('dshell', () => game.dispatch({ t: 'dev', what: 'shells' }, { dev: true }).then(() => open('settings', true))); bind('dday', () => game.dispatch({ t: 'dev', what: 'day' }, { dev: true }).then(() => toast('A day passes…')));
    if (tab === 'decorate') thumbs();
  }
  function open(t, quiet = false) {
    tab = t; if (!quiet) sfx('open');
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === t));
    cb.onTab(t);
    if (t === 'tank') { sheet.classList.remove('on'); return; }
    sheet.innerHTML = `<button class="x">×</button>` + views[t](); sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank'); paint();
  }
  document.querySelectorAll('nav [data-tab]').forEach((n) => n.addEventListener('click', () => open(n.dataset.tab === tab ? 'tank' : n.dataset.tab)));
  $('gear').onclick = () => open(tab === 'settings' ? 'tank' : 'settings');

  // header portraits
  function setMembers() {
    const box = $('avs'); if (!box) return; box.innerHTML = '';
    for (let n = 1; n <= 3; n++) {
      const m = game.shared ? game.members?.find((x) => x.slot === n) : (n === 1 ? { avatar: { skin: '#b06a42', hair: '#222222', hat: '#56703a' }, id: 'me' } : null), d = document.createElement('div'); d.className = 'av' + (m ? '' : ' empty');
      if (m) { const c = document.createElement('canvas'); c.className = 'av'; drawAvatar(c, m.avatar); d.append(c); const i = document.createElement('i'); if (game.shared && !game.online.includes(m.id)) i.className = 'off'; d.append(i); d.onclick = () => open('friends'); }
      else { d.textContent = '+'; d.onclick = () => open('friends'); }
      box.append(d);
    }
  }
  function refresh() { setMembers(); updateHeader(); if (['friends', 'journal', 'care'].includes(tab)) { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } else if (tab === 'decorate') { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } }

  // ── modal: a small in-page dialog (no browser prompts) ──
  const modal = $('modal');
  function dialog({ title, text = '', input = null, ok = 'OK', cancel = null, danger = false }) {
    return new Promise((res) => {
      modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${input ? `<input id="mi" maxlength="${input.max ?? 14}" value="${esc(input.value ?? '')}" placeholder="${esc(input.placeholder ?? '')}" autocomplete="off">` : ''}<div class="err" id="me"></div>
        <button class="big ${danger ? 'warn' : ''}" id="mok">${esc(ok)}</button>${cancel ? `<button class="lnk" id="mno">${esc(cancel)}</button>` : ''}</div>`;
      modal.classList.add('on'); const inp = $('mi'); if (inp) { inp.focus(); inp.select(); }
      const done = (v) => { modal.classList.remove('on'); res(v); };
      $('mok').onclick = () => { if (input) { const v = inp.value.trim(); if (!v) { $('me').textContent = 'Please type a name.'; return; } done(v); } else done(true); };
      if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') $('mok').click(); };
      const no = $('mno'); if (no) no.onclick = () => done(null);
    });
  }
  // coach card for the tutorial
  const coach = $('coach');
  function showCoach({ title, text, button = null, onButton = null, skip = null }) {
    coach.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p><div class="crow">${button ? `<button class="big sm" id="cbtn">${esc(button)}</button>` : ''}${skip ? `<button class="lnk" id="cskip">Skip tips</button>` : ''}</div>`;
    coach.classList.add('on'); if (button) $('cbtn').onclick = () => onButton?.(); if (skip) $('cskip').onclick = skip;
  }
  const hideCoach = () => coach.classList.remove('on');
  const pulse = (tabName) => document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('pulse', n.dataset.tab === tabName));

  return { toast, open, refresh, updateHeader, dialog, showCoach, hideCoach, pulse, setMembers, get tab() { return tab; }, get selected() { return selected; }, get rearrange() { return rearrange; }, set rearrange(v) { rearrange = v; }, select: (k) => { selected = k; }, REASONS };
}
