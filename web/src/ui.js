// HTML chrome: header, bottom-sheet tabs (Care / Decorate / Friends / Journal / Settings), shop, modals, toasts.
import { SPECIES_DEF, DECOR_DEF, DAILY_REWARD, AIL_TIRED, AIL_WARN, LEVEL_AT, WISHES, COLLECTION_SIZE, fishPrice, dailyFish, isFree, FLOORS, BACKDROPS, scoreOf, capacity, stageOf, nextStage, comfortOf, readyToTrim, growthOf, WANT_REWARD } from './game/rules.js';
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
  let tab = 'tank', book = false, tt, cat = 'ALL', selected = null, rearrange = false;
  const toast = (m, ms = 2400) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), ms); };
  const S = () => game.state;
  const eta = (ms) => { if (ms <= 0) return 'any moment now'; const m = Math.max(1, Math.ceil(ms / 60e3)); return m >= 2880 ? Math.round(m / 1440) + ' days' : m >= 90 ? Math.round(m / 60) + 'h' : m + ' min'; };
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
    const fl = (s.floaters ?? [])[0]; if (fl) return { text: `${fl.name} has passed away. Tap to lay them to rest.`, tab: '' };
    const weak = s.fish.find((f) => (f.ail ?? 0) >= AIL_WARN); if (weak) return { text: `${weak.name} is in a critical state. Feed the tank and freshen the water.`, tab: 'care' };
    if (s.visitor) return { text: `A rare visitor! Tap the ${SPECIES_DEF[s.visitor.species].label} to say hello.`, tab: '' };
    if ((s.bottles ?? []).some((b) => b.to === game.you?.userId)) return { text: 'A bottle washed in for you. Tap it.', tab: '' };
    if (s.drift) return { text: 'Something washed in. Tap it in the tank.', tab: '' };
    if (!s.decor.length && !s.orders.length) return { text: 'Empty tank. Open Decorate to add a plant.', tab: 'decorate' };
    if (s.hunger > 0.5) return { text: 'The fish are getting hungry. Feed them.', tab: 'care' };
    if (s.glass > 0.45) return { text: 'Algae on the glass. Give it a wipe.', tab: 'care' };
    if (s.water < 0.6) return { text: 'The water could use a change.', tab: 'care' };
    if (s.want) return { text: s.want.text, tab: '' };
    const o = (s.orders ?? []).slice().sort((x, y) => x.arrivesAt - y.arrivesAt)[0];
    if (o) return { text: `${o.name || SPECIES_DEF[o.species].label} arrives in ${eta(o.arrivesAt - Date.now())}`, tab: '' };
    const eg = (s.eggs ?? [])[0]; if (eg) return { text: `An egg is about to hatch in ${eta(eg.hatchAt - Date.now())}`, tab: '' };
    const cheapest = Math.min(...Object.values(DECOR_DEF).filter((d) => d.level <= s.level).map((d) => d.price));
    const owned = new Set([...s.fish.map((f) => f.species), ...(s.orders ?? []).map((o) => o.species)]), room = s.fish.length + (s.orders ?? []).length;
    const fish = Object.entries(SPECIES_DEF).filter(([k, d]) => !d.visitor && !owned.has(k) && d.level <= s.level && room + d.count <= capacity(s.level)).sort((x, y) => x[1].price - y[1].price)[0];
    if (fish && s.shells >= fishPrice(fish[0])) return { text: `You can adopt a new kind of fish: ${fish[1].label.toLowerCase()}!`, tab: 'decorate' };
    if (s.shells >= cheapest) return { text: 'You have shells to spend on decorations.', tab: 'decorate' };
    const dw = s.daily; if (dw && !dw.done) return { text: `Today's wish (+${dw.reward ?? 3}): ${dw.text}${dw.need > 1 ? ` (${dw.have}/${dw.need})` : ''}`, tab: '' };
    const w = WISHES[s.wishIdx]; if (w) return { text: `Tank wish: ${w.text}`, tab: '' };
    const b = LEVEL_AT[s.level]; return { text: b ? `Earn shells by caring · ${scoreOf(s)}/${b} to level ${s.level + 1}` : 'Everything is calm. Enjoy your tank.', tab: '' };
  }
  $('goal').onclick = () => { const t = $('goal').dataset.tab; if (t) open(t); };

  // ── sheets ──
  const meters = () => { const s = S(); const bar = (l, v) => `<div class="nb"><span>${l}</span><i><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></b></i></div>`; return `<div class="needs wide">${bar('Fed', 1 - s.hunger)}${bar('Water', s.water)}${bar('Glass', 1 - s.glass)}${bar('Fish', Math.min(1, s.fish.length / capacity(s.level)))}</div>`; };
  const slotsHtml = () => {
    const s = game.members; if (!s) return '';
    return [1, 2, 3].map((n) => { const m = s.find((x) => x.slot === n); return m
      ? `<div class="slot"><canvas class="av big" data-slot="${n}"></canvas><b>${esc(m.name)}${m.id === game.you.userId ? ' (you)' : ''}</b><small>${game.online.includes(m.id) ? '● Online' : '○ Away'}</small>${m.id === game.you.userId ? '' : `<button class="nudge" data-nudge="${m.id}">Nudge</button><button class="nudge" data-bottle="${m.id}">Bottle</button>`}</div>`
      : `<div class="slot empty" data-invite><span>+</span><b>Invite</b><small>Slot ${n}</small></div>`; }).join('');
  };
  function shopCards() {
    const s = S(), out = [], showAll = cat === 'ALL', fishCat = cat === 'FISH';
    if (showAll || fishCat) for (const [id, d] of Object.entries(SPECIES_DEF).filter(([, x]) => !x.visitor)) out.push({ kind: 'fish', id, label: d.label, price: fishPrice(id), deal: id === dailyFish(), level: d.level, blurb: d.blurb + (d.count > 1 ? '' : ''), count: d.count, cat: 'FISH' });
    if (!fishCat) for (const [id, d] of Object.entries(DECOR_DEF)) if (showAll || d.cat === cat) out.push({ kind: 'decor', id, label: d.label, price: d.price, level: d.level, blurb: d.blurb, cat: d.cat });
    return out.map((c) => {
      const lock = s.level < c.level, key = c.kind + ':' + c.id, free = c.kind === 'decor' && isFree(s, c.id);
      return `<button class="card ${selected === key ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="${key}"><img alt="" data-thumb="${key}"><b>${esc(c.label)}</b><span class="pr">${lock ? 'Lv ' + c.level : free ? 'FREE' : '🐚 ' + c.price}${c.deal && !lock ? ' <em>−25%</em>' : ''}</span></button>`;
    }).join('');
  }
  function shopDetail() {
    const s = S(); if (!selected) return `<div class="detail dim">Pick something to see what it does.</div>`;
    const [kind, id] = selected.split(':'), d = kind === 'fish' ? SPECIES_DEF[id] : DECOR_DEF[id]; if (!d) return '';
    const free = kind === 'decor' && isFree(s, id), priceNow = kind === 'fish' ? fishPrice(id) : d.price;
    let note = '', can = true;
    if (s.level < d.level) { note = `Unlocks at tank level ${d.level}`; can = false; }
    else if (!free && s.shells < priceNow) { note = `${priceNow - s.shells} more shell${priceNow - s.shells === 1 ? '' : 's'} needed`; can = false; }
    else if (kind === 'fish' && s.fish.length + d.count > capacity(s.level)) { note = 'No room yet. Level up to grow the tank.'; can = false; }
    return `<div class="detail"><div><h4>${esc(d.label)}</h4><p>${esc(d.blurb)}${kind === 'fish' && d.count > 1 ? ` Comes as a school of ${d.count}.` : ''}</p>${note ? `<small class="note">${esc(note)}</small>` : ''}</div>
      <button class="big gold" id="buy" ${can ? '' : 'disabled'}>${kind === 'fish' ? 'ADOPT' : 'PLACE'} · ${free ? 'FREE' : '🐚 ' + priceNow}</button></div>`;
  }
  const growLine = () => {
    const soon = S().fish.map((f) => ({ f, n: nextStage(f) })).filter((x) => x.n).sort((a, b) => a.n.ms - b.n.ms)[0];
    return soon ? `<p class="grow">🌱 ${esc(soon.f.name)} grows up in ${esc(soon.n.label)}</p>` : '';
  };
  const lvRow = () => { const s = S(), lv = s.level, a = LEVEL_AT[lv - 1], b = LEVEL_AT[lv] ?? null, sc = scoreOf(s), pct = b ? Math.round(((sc - a) / (b - a)) * 100) : 100; return `<div class="lvrow"><b>LEVEL ${lv}</b><i><b style="width:${Math.max(4, Math.min(100, pct))}%"></b></i><span>Day ${game.day}</span></div>`; };
  const ordersHtml = () => { const o = S().orders ?? [], e = S().eggs ?? []; return o.length || e.length ? `<div class="orders"><small>ON THE WAY</small>${o.map((x) => `<div><span>📦 ${esc(x.name || SPECIES_DEF[x.species].label)}</span><b>${eta(x.arrivesAt - Date.now())}</b></div>`).join('')}${e.map((x) => `<div><span>🥚 Egg</span><b>${eta(x.hatchAt - Date.now())}</b></div>`).join('')}</div>` : ''; };
  const dailyHtml = () => { const d = S().daily; if (!d) return ''; return `<div class="wish daily ${d.done ? 'done' : ''}"><small>TODAY'S WISH · OPTIONAL</small><span>${esc(d.text)}${d.need > 1 && !d.done ? ` (${d.have}/${d.need})` : ''}</span><b>${d.done ? 'Done' : `+${d.reward ?? DAILY_REWARD} 🐚`}</b></div>`; };
  const wishHtml = () => { const s = S(), w = WISHES[s.wishIdx]; return w ? `<div class="wish"><small>THE TANK'S WISH</small><span>${esc(w.text)}</span><b>+${w.reward} 🐚</b></div>` : `<div class="wish"><small>THE TANK'S WISH</small><span>Every wish has come true.</span></div>`; };
  const bookHtml = () => {
    const s = S(), cell = (kind, id, label) => { const got = s.seen[kind].includes(id); return `<div class="bk ${got ? '' : 'nope'}"><img alt="" data-thumb="${kind === 'fish' ? 'fish' : 'decor'}:${id}"><b>${got ? esc(label) : '???'}</b></div>`; };
    return `<div class="bkhead"><b>${s.seen.fish.length + s.seen.decor.length} / ${COLLECTION_SIZE()}</b><small>Every 5 finds earns 3 shells</small></div><h4>Fish</h4><div class="bkg">${Object.entries(SPECIES_DEF).map(([id, d]) => cell('fish', id, d.label)).join('')}</div><h4>Decorations</h4><div class="bkg">${Object.entries(DECOR_DEF).map(([id, d]) => cell('decor', id, d.label)).join('')}</div>`;
  };
  const memorialHtml = () => { const m = S().memorial ?? []; return m.length ? `<h4>Remembered</h4><div class="mem">${m.map((x, i) => [x, i]).reverse().map(([x, i]) => `<button data-mem="${i}">${esc(x.name)} · ${esc(SPECIES_DEF[x.species]?.label ?? x.species)}</button>`).join('')}</div>` : ''; };
  const journalHtml = () => `${memorialHtml()}<form class="send note"><input maxlength="90" placeholder="Add a note to the journal" autocomplete="off"><button>Add</button></form><div class="jl">${game.journal.slice().reverse().map((e) => `<div class="je"><small>DAY ${String(e.day).padStart(3, '0')}</small><span>${esc(e.text)}</span></div>`).join('')}</div>`;
  const styleHtml = () => { const st = S().style ?? { floor: 'sand', backdrop: 'candy' }, row = (label, key, opts) => `<div class="sty"><small>${label}</small><div>${Object.entries(opts).map(([k, v]) => `<button class="chipb ${st[key] === k ? 'on' : ''}" data-style="${key}:${k}">${v}</button>`).join('')}</div></div>`; return `<div class="styles">${row('FLOOR', 'floor', FLOORS)}${row('BACKDROP', 'backdrop', BACKDROPS)}</div>`; };
  // A check-in page: the one thing worth doing now, what is coming up, and how shells are earned.
  const wantHtml = () => { const w = S().want; if (!w) return ''; return `<div class="wish"><small>${esc((S().fish.find((f) => f.id === w.fish)?.name ?? 'A FISH').toUpperCase())} HAS A WISH · +${WANT_REWARD} 🐚</small><span>${esc(w.text)}</span></div>`; };
  const comfortHtml = () => { const s = S(); if (!s.fish.length) return ''; const all = s.fish.map((f) => ({ f, c: comfortOf(s, f) })), avg = Math.round(all.reduce((n, x) => n + x.c.score, 0) / all.length), worst = all.slice().sort((a, b) => a.c.score - b.c.score)[0];
    return `<div class="orders"><small>TANK COMFORT</small><div><span>${avg >= 80 ? 'Cosy' : avg >= 55 ? 'Comfortable' : 'Could be better'}</span><b>${avg}%</b></div>${worst.c.tips[0] ? `<div><span class="dim">${esc(worst.c.tips[0])}</span></div>` : ''}</div>`; };
  const projectHtml = () => { const s = S(), goal = Object.entries(DECOR_DEF).filter(([k, d]) => d.price >= 100 && d.level <= s.level + 1 && !s.decor.some((x) => x.type === k)).sort((a, b) => a[1].price - b[1].price)[0]; if (!goal) return '';
    const [k, d] = goal, pct = Math.min(100, Math.round((s.shells / d.price) * 100)), locked = d.level > s.level; return `<div class="wish"><small>SHARED PROJECT</small><span>${esc(d.label)}: ${locked ? 'unlocks at level ' + d.level : `${s.shells} of ${d.price} 🐚 saved`}</span><div class="pj"><i style="width:${locked ? 0 : pct}%"></i></div></div>`; };
  const todayHtml = () => {
    const s = S(), now = Date.now(), g = goalText(), up = [];
    for (const o of (s.orders ?? []).slice().sort((x, y) => x.arrivesAt - y.arrivesAt)) up.push([`📦 ${esc(o.name || SPECIES_DEF[o.species].label)} arrives`, eta(o.arrivesAt - now)]);
    for (const e of (s.eggs ?? [])) up.push(['🥚 An egg hatches', eta(e.hatchAt - now)]);
    const grow = s.fish.map((f) => ({ f, n: nextStage(f, now) })).filter((x) => x.n).sort((a, b) => a.n.ms - b.n.ms)[0]; if (grow) up.push([`🌱 ${esc(grow.f.name)} grows up`, eta(grow.n.ms)]);
    const age = s.fish.map((f) => ({ f, d: (now - f.born) / 864e5 })).filter((x) => x.d < 30).map((x) => ({ ...x, to: x.d < 14 ? 14 : 30 })).sort((a, b) => (a.to - a.d) - (b.to - b.d))[0]; if (age) up.push([`🎂 ${esc(age.f.name)} turns ${age.to} days`, eta((age.to - age.d) * 864e5)]);
    const ready = readyToTrim(s, now).length; if (ready) up.push([`🌿 ${ready} plant${ready > 1 ? 's' : ''} ready to trim`, `+${ready}`]);
    const sc = scoreOf(s), nx = LEVEL_AT[s.level]; if (nx) up.push([`⭐ Level ${s.level + 1}`, `${sc}/${nx}`]);
    const wish = WISHES[s.wishIdx]; if (wish) up.push([`✨ Tank wish: ${esc(wish.text)}`, `+${wish.reward}`]);
    const earn = [['Feed hungry fish', '+1 each'], ['Wipe the glass', '+1 (a pearl every 5th: +3)'], ['Change cloudy water', '+2'], ['Say hello to a rare visitor', '+4'], ['Collect things that wash in', '+1 to +4'], ["Today's wish", '+3, +5 or +8'], ['A fish grows up', '+1, +2'], ['A fish reaches 14 / 30 days', '+5 / +8'], ['Two fish become friends', '+3'], ['A fish finds its favourite spot', '+2'], ['The first egg hatches', '+5'], ['Open a friend\'s bottle', '+2'], ['Every 5 things in the collection book', '+3'], ['Tank level up', '+4 and more']];
    return `<h3>Today</h3><button class="wish daily" data-open="${g.tab || 'tank'}"><small>WORTH DOING NOW</small><span>${esc(g.text)}</span>${g.tab && g.tab !== 'tank' ? '<b>Go ›</b>' : ''}</button>
      ${wantHtml()}${comfortHtml()}${projectHtml()}${dailyHtml()}${up.length ? `<div class="orders"><small>COMING UP</small>${up.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>` : ''}
      <div class="orders"><small>HOW SHELLS ARE EARNED</small>${earn.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
      <p class="dim">Fish bring the most. Looking after them, watching them, and letting them grow up pays more than rushing around.</p>`;
  };
  const views = {
    today: todayHtml,
    care: () => `<h3>Care</h3>${lvRow()}${meters()}${growLine()}${dailyHtml()}${ordersHtml()}<div class="grid2">${tile('🫙', 'Feed', 'feed', 'Tap the water to drop food')}${tile('🧽', 'Clean Glass', 'clean', 'Swipe away algae')}${tile('💧', 'Water Change', 'water')}${tile('🐟', 'Meet the fish', 'fish', `${S().fish.length} in the tank`)}${readyToTrim(S(), Date.now()).length ? tile('✂️', 'Trim plants', 'trim', `${readyToTrim(S(), Date.now()).length} ready · +1 each`) : ''}${tile('📷', 'Photo', 'photo', 'Save a picture of the tank')}${tile('📖', 'Collection', 'book', `${S().seen.fish.length + S().seen.decor.length}/${COLLECTION_SIZE()} found`)}</div>${wishHtml()}`,
    decorate: () => `<h3>Decorate</h3>${styleHtml()}<div class="shophead"><div class="cats">${CATS.map((c) => `<button class="cat ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div></div>
      <div class="cards">${shopCards()}</div>${shopDetail()}<div class="shopfoot"><button class="lnk ${rearrange ? 'on' : ''}" id="rearr">${rearrange ? 'Tap a decoration to move it · Done' : 'Rearrange or sell decorations'}</button></div>`,
    friends: () => {
      if (!game.shared) return `<h3>Friends</h3><div class="slots"><div class="slot"><canvas class="av big" data-slot="me"></canvas><b>You</b><small>● Online</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 2</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 3</small></div></div>
        <p class="dim">You are playing solo. Host the game online and two friends can join with a six-character code to care for the same tank.</p>`;
      const wish = WISHES[S().wishIdx];
      const me = game.you.userId, myName = game.members?.find((x) => x.id === me)?.name ?? '', youify = (txt) => (myName ? txt.replace(new RegExp('^' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), 'You').replace(new RegExp(' and ' + myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), ' and you') : txt);
      const THANKABLE = ['feed', 'glass', 'water', 'decor', 'fish', 'visitor', 'bottle', 'gift'];
      const act = game.activity.slice().reverse().slice(0, 12).map((a) => { const can = a.userId && a.userId !== me && THANKABLE.includes(a.type) && Date.now() - a.ts < 24 * 3600e3 && !game.thanked?.has(a.id); return `<div class="act"><span>${esc(youify(a.text))}</span>${can ? `<button class="heart" data-thank="${a.id}" data-to="${a.userId}" aria-label="Say thanks">♡</button>` : `<small>${ago(a.ts)}</small>`}</div>`; }).join('') || '<p class="dim">Nothing yet.</p>';
      const msgs = game.messages.slice(-20).map((m) => `<div class="msg ${m.userId === game.you.userId ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
      return `<h3>Friends</h3><div class="slots">${slotsHtml()}</div>
        <div class="code"><small>TANK CODE</small><b>${esc(game.code)}</b><div class="row"><button data-code="copy">Copy</button><button data-code="share">Invite friends</button><button data-code="regen" title="Invalidate the old code">New code</button></div></div>
        ${wish ? `<div class="wish"><small>THE TANK'S WISH</small><span>${esc(wish.text)}</span><b>+${wish.reward} 🐚</b></div>` : ''}<h4>Recent activity</h4>${act}<h4>Messages</h4><div class="chat">${msgs || '<p class="dim">Say hello.</p>'}</div>
        <form class="send"><input maxlength="140" placeholder="Send a message" autocomplete="off"><button>Send</button></form>`;
    },
    journal: () => `<h3>${book ? 'Collection' : 'Journal'}</h3><div class="seg"><button class="${book ? '' : 'on'}" data-book="0">Journal</button><button class="${book ? 'on' : ''}" data-book="1">Collection</button></div>${book ? bookHtml() : journalHtml()}`,
    settings: () => `<h3>Settings</h3><div class="set">
      <label class="row2"><span>Sound</span><button class="tog ${soundOn() ? 'on' : ''}" id="snd">${soundOn() ? 'On' : 'Off'}</button></label>
      <label class="row2"><span>Graphics</span><button class="tog" id="gfx">${['Low', 'Medium', 'High'][cb.quality()]}</button></label>
      ${game.shared ? `<label class="row2"><span>Notifications</span><button class="tog" id="pushbtn">…</button></label>` : ''}
      ${game.shared ? '' : '<label class="row2"><span>Replay the tips</span><button class="tog" id="tutr">Replay</button></label>'}
      ${game.shared ? `<div class="row2"><span>Tank</span><b>${esc(game.tankName)}</b></div><label class="row2"><span>Recovery key</span><button class="tog" id="rkey">Show</button></label><label class="row2"><span>Leave this tank</span><button class="tog warn" id="leave">Leave</button></label>` : `<label class="row2"><span>Start over</span><button class="tog warn" id="reset">Reset tank</button></label>`}
      ${new URLSearchParams(location.search).has('dev') ? `<h4>Developer</h4><div class="row2"><span>Test tools</span><span><button class="tog" id="dshell">+50 shells</button> <button class="tog" id="dday">Skip a day</button></span></div>` : ''}
      <p class="dim">OUR TANK · three friends, one tank. No ads, no purchases, no streaks.</p></div>`,
  };
  function thumbs() { sheet.querySelectorAll('img[data-thumb]').forEach((im, i) => setTimeout(() => { const [k, id] = im.dataset.thumb.split(':'); if (!im.isConnected) return; im.src = k === 'fish' ? fishThumb(id) : decorThumb(id); }, i * 16)); }
  function paint() {
    sheet.querySelectorAll('canvas.big').forEach((c) => { if (c.dataset.slot === 'me') drawAvatar(c, { skin: '#b06a42', hair: '#222', hat: '#56703a' }); else { const m = game.members?.find((x) => x.slot === +c.dataset.slot); if (m) drawAvatar(c, m.avatar); } });
    sheet.querySelectorAll('[data-invite]').forEach((e) => (e.onclick = () => social.invite()));
    sheet.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => ({ copy: () => social.copy(), share: () => social.share(), regen: () => social.regen() }[b.dataset.code]())));
    const f = sheet.querySelector('form.send'); if (f) f.onsubmit = (e) => { e.preventDefault(); const i = f.querySelector('input'); if (i.value.trim()) { social.chat(i.value); i.value = ''; } };
    const nf = sheet.querySelector('form.note'); if (nf) nf.onsubmit = (e) => { e.preventDefault(); const i = nf.querySelector('input'); if (i.value.trim()) { cb.note(i.value); i.value = ''; } };
    const ch = sheet.querySelector('.chat'); if (ch) ch.scrollTop = ch.scrollHeight;
    sheet.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { sfx('tap'); const a = b.dataset.act; if (a === 'fish') { open('tank'); cb.meetFish(); } else if (a === 'book') { book = true; game.track('book_opened'); open('journal'); } else if (a === 'photo') { open('tank'); cb.photo(); } else { open('tank'); cb.act(a); } }));
    sheet.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; selected = null; sfx('tap'); open('decorate', true); }));
    sheet.querySelectorAll('.card').forEach((b) => (b.onclick = () => { selected = b.dataset.k; sfx('tap'); const y = sheet.scrollTop; open('decorate', true); sheet.scrollTop = y; }));
    const buy = $('buy'); if (buy) buy.onclick = () => { const [kind, id] = selected.split(':'); if (kind === 'fish') cb.adopt(id); else cb.startPlace(id); };
    const rr = $('rearr'); if (rr) rr.onclick = () => { rearrange = !rearrange; cb.rearrange(rearrange); if (rearrange) open('tank'); else open('decorate', true); };
    const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    bind('snd', () => { setSound(!soundOn()); open('settings', true); }); bind('gfx', () => { cb.cycleQuality(); open('settings', true); });
    const pb = $('pushbtn'); if (pb) {
      const label = { on: 'On', off: 'Off', blocked: 'Blocked in browser settings', install: 'Add to Home Screen first', unsupported: 'Not supported here', unavailable: 'Not set up on this server' };
      const paint2 = (st) => { pb.textContent = label[st] ?? st; pb.classList.toggle('on', st === 'on'); pb.dataset.st = st; pb.disabled = !['on', 'off'].includes(st); };
      cb.pushState().then(paint2).catch(() => paint2('unsupported'));
      pb.onclick = async () => { const st = pb.dataset.st; if (st !== 'on' && st !== 'off') return; pb.disabled = true; try { paint2(await cb.pushToggle(st === 'off')); } catch (e) { toast('Could not change notifications'); paint2(st); } };
    }
    bind('rkey', () => cb.recoveryKey()); bind('leave', () => cb.leaveTank()); bind('tutr', () => { open('tank'); cb.replayTutorial(); }); bind('reset', (ev) => { if (ev.target.dataset.sure) game.reset(); else { ev.target.dataset.sure = 1; ev.target.textContent = 'Tap again to erase'; } });
    bind('dshell', () => game.dispatch({ t: 'dev', what: 'shells' }, { dev: true }).then(() => open('settings', true))); bind('dday', () => game.dispatch({ t: 'dev', what: 'day' }, { dev: true }).then(() => toast('A day passes…')));
    sheet.querySelectorAll('[data-style]').forEach((b) => (b.onclick = async () => { const [k, v] = b.dataset.style.split(':'); sfx('tap'); const y = sheet.scrollTop; await game.dispatch({ t: 'style', [k]: v }); open('decorate', true); sheet.scrollTop = y; }));
    sheet.querySelectorAll('[data-mem]').forEach((b) => (b.onclick = () => {
      const x = (S().memorial ?? [])[+b.dataset.mem]; if (!x) return; const d = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      dialog({ title: x.name.toUpperCase(), text: `${SPECIES_DEF[x.species]?.label ?? x.species}${x.traits?.length ? ' · ' + x.traits.join(', ') : ''}`, lines: [`Arrived ${d(x.born)}`, `Passed away ${d(x.died)}`, `Original caretaker: ${x.ownerName ?? 'unknown'}`, ...(x.parents?.length ? [`Parents: ${x.parents.map((q) => q.name).join(' & ')}`] : []), ...(x.gen ? [`Generation ${x.gen}`] : []), x.rested ? `Laid to rest by ${x.rested.by}` : 'Still floating in the tank', ...(x.milestones ?? [])], ok: 'Close' });
    }));
    sheet.querySelectorAll('[data-book]').forEach((b) => (b.onclick = () => { book = b.dataset.book === '1'; sfx('tap'); open('journal', true); }));
    sheet.querySelectorAll('[data-thank]').forEach((b) => (b.onclick = async () => { b.disabled = true; const r = await game.thank(b.dataset.to, +b.dataset.thank); if (r.ok) { sfx('tap'); b.textContent = '♥'; b.classList.add('on'); } else { toast(REASONS[r.reason] ?? 'Could not send that.'); b.disabled = false; } }));
    sheet.querySelectorAll('[data-bottle]').forEach((b) => (b.onclick = async () => {
      const note = await dialog({ title: 'MESSAGE IN A BOTTLE', text: 'It washes into the tank for them to find. Costs 2 shells.', input: { max: 40, placeholder: 'Write something kind' }, ok: 'Send', cancel: 'Cancel' }); if (!note) return;
      const r = await game.dispatch({ t: 'bottle', to: b.dataset.bottle, note }); if (r.ok) { sfx('tap'); toast('Bottle sent'); } else toast(REASONS[r.reason] ?? 'Could not send that.');
    }));
    sheet.querySelectorAll('[data-nudge]').forEach((b) => (b.onclick = async () => { b.disabled = true; const r = await game.nudge(b.dataset.nudge); if (r.ok) { toast('Nudge sent'); b.textContent = 'Sent'; } else { toast(REASONS[r.reason] ?? 'Could not send that.'); b.disabled = false; } }));
    if (tab === 'decorate' || (tab === 'journal' && book)) thumbs();
  }
  function open(t, quiet = false) {
    tab = t; if (!quiet) sfx('open');
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === t));
    cb.onTab(t); if (t === 'friends') flag('friends', false); if (!quiet && t === 'journal') game.track('journal_opened');
    if (t === 'tank') { sheet.classList.remove('on'); return; }
    sheet.innerHTML = `<button class="x">×</button>` + views[t](); sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank'); sheet.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => open(b.dataset.open); }); paint();
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
  function refresh() { setMembers(); updateHeader(); if (['friends', 'journal', 'care', 'today'].includes(tab)) { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } else if (tab === 'decorate') { const y = sheet.scrollTop; open(tab, true); sheet.scrollTop = y; } }

  // ── modal: a small in-page dialog (no browser prompts) ──
  const modal = $('modal');
  function dialog({ title, text = '', lines = null, input = null, ok = 'OK', cancel = null, danger = false }) {
    return new Promise((res) => {
      modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${lines ? `<ul class="away">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${input ? `<input id="mi" maxlength="${input.max ?? 14}" value="${esc(input.value ?? '')}" placeholder="${esc(input.placeholder ?? '')}" autocomplete="off">` : ''}<div class="err" id="me"></div>
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
  const flag = (tabName, on) => document.querySelectorAll('nav [data-tab]').forEach((n) => { if (n.dataset.tab === tabName) n.classList.toggle('dot2', on && tab !== tabName); });
  const pulse = (tabName) => document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('pulse', n.dataset.tab === tabName));

  return { toast, open, showBook: () => { book = true; open('journal'); }, flag, refresh, updateHeader, dialog, showCoach, hideCoach, pulse, setMembers, get tab() { return tab; }, get selected() { return selected; }, get rearrange() { return rearrange; }, set rearrange(v) { rearrange = v; }, select: (k) => { selected = k; }, REASONS };
}
