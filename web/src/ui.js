// HTML chrome: pixel avatars, bottom-sheet tabs (Care / Decorate / Friends / Journal), toasts.
export const SKINS = ['#f1c8a0', '#d9a273', '#b06a42', '#8a5a3a', '#5a3a28'];
export const HAIRS = ['#222222', '#5a3ad0', '#a0522d', '#d8a830', '#c0362c', '#2f8f6a'];
export const HATS = [null, '#56703a', '#c0362c', '#3a5ad0', '#d8a830', '#222222'];
export function drawAvatar(c, { skin = '#b06a42', hair = '#222222', hat = null, eye = '#1a1a22' } = {}) {
  const g = c.getContext('2d'); c.width = c.height = 16; g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r(0, 0, 16, 16, '#1c2b40'); r(3, 11, 10, 5, '#2e5a3a');
  r(4, 4, 8, 8, skin); r(5, 12, 6, 1, skin);
  if (hat) { r(3, 2, 10, 3, hat); r(2, 4, 12, 1, hat); } else { r(3, 2, 10, 3, hair); r(3, 4, 2, 5, hair); r(11, 4, 2, 5, hair); }
  r(6, 7, 1, 2, eye); r(9, 7, 1, 2, eye); r(7, 10, 2, 1, '#6a2a22');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (ts) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };

export function initUI({ onAct, journal, social, onTab }) {
  // social: { get(): {online, you, members, tank, activity, messages}|null, chat(text), regen(), invite() }
  const sheet = document.getElementById('sheet'), toastEl = document.getElementById('toast');
  let tab = 'tank', tt;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2400); };
  const tile = (icon, label, act) => `<button class="tile" data-act="${act}"><span>${icon}</span>${label}</button>`;
  const slotsHtml = () => {
    const s = social.get(); if (!s) return '';
    return [1, 2, 3].map((n) => { const m = s.members.find((x) => x.slot === n); return m
      ? `<div class="slot"><canvas class="av big" data-slot="${n}"></canvas><b>${esc(m.name)}${m.id === s.you.userId ? ' (you)' : ''}</b><small>${s.online.includes(m.id) ? '● Online' : '○ Away'}</small></div>`
      : `<div class="slot empty" data-invite><span>+</span><b>Invite</b><small>Slot ${n}</small></div>`; }).join('');
  };
  const views = {
    care: () => `<h3>Care</h3><div class="grid2">${tile('🫙', 'Feed', 'feed')}${tile('🧽', 'Clean Glass', 'clean')}${tile('💧', 'Water Change', 'water')}${tile('➕', 'Health', 'health')}</div>`,
    decorate: () => `<h3>Decorate</h3><div class="grid3">${['Sunken Ruins', 'Tall Grass', 'Driftwood', 'Treasure Chest', 'Skull', 'Red Plant', 'Stone Lantern', 'Torii Gate'].map((n) => tile('◆', n, 'soon')).join('')}</div><p class="dim">Placement and Shell purchases are the next feature.</p>`,
    friends: () => {
      const s = social.get();
      if (!s) return `<h3>Friends</h3><p class="dim">Playing offline. Run the server to share a tank with two friends.</p>`;
      const act = s.activity.slice().reverse().slice(0, 6).map((a) => `<div class="act"><span>${esc(a.text)}</span><small>${ago(a.ts)}</small></div>`).join('') || '<p class="dim">Nothing yet.</p>';
      const msgs = s.messages.slice(-20).map((m) => `<div class="msg ${m.userId === s.you.userId ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
      return `<h3>Friends</h3><div class="slots">${slotsHtml()}</div>
        <div class="code"><small>TANK CODE</small><b>${esc(s.tank.code)}</b><div class="row"><button data-code="copy">Copy</button><button data-code="share">Invite friends</button><button data-code="regen" title="Invalidate the old code">New code</button></div></div>
        <h4>Recent activity</h4>${act}<h4>Messages</h4><div class="chat">${msgs || '<p class="dim">Say hello.</p>'}</div>
        <form class="send"><input maxlength="140" placeholder="Send a message" autocomplete="off"><button>Send</button></form>`;
    },
    journal: () => `<h3>Journal</h3><div class="jl">${journal().map((e) => `<div class="je"><small>DAY ${String(e.day).padStart(3, '0')}</small><span>${esc(e.text)}</span></div>`).join('')}</div>`,
  };
  function paint() {
    const s = social.get();
    sheet.querySelectorAll('canvas.big').forEach((c) => { const m = s?.members.find((x) => x.slot === +c.dataset.slot); if (m) drawAvatar(c, m.avatar); });
    sheet.querySelectorAll('[data-invite]').forEach((e) => (e.onclick = () => { social.invite(); }));
    sheet.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => ({ copy: () => social.copy(), share: () => social.share(), regen: () => social.regen() }[b.dataset.code]())));
    const f = sheet.querySelector('form.send');
    if (f) f.onsubmit = (e) => { e.preventDefault(); const i = f.querySelector('input'); if (i.value.trim()) { social.chat(i.value); i.value = ''; } };
    const ch = sheet.querySelector('.chat'); if (ch) ch.scrollTop = ch.scrollHeight;
  }
  function open(t) {
    tab = t; onTab?.(t);
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === t));
    if (t === 'tank') { sheet.classList.remove('on'); return; }
    sheet.innerHTML = `<button class="x">×</button>` + views[t]();
    sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank');
    sheet.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { if (b.dataset.act === 'soon') toast('Coming soon'); else { open('tank'); onAct(b.dataset.act); } }));
    paint();
  }
  document.querySelectorAll('nav [data-tab]').forEach((n) => n.addEventListener('click', () => open(n.dataset.tab === tab ? 'tank' : n.dataset.tab)));
  // header portraits: filled slots show the caretaker, empty slots show + (tap to invite)
  function setMembers() {
    const s = social.get(), box = document.getElementById('avs'); if (!box) return;
    box.innerHTML = '';
    const solo = { avatar: { skin: '#b06a42', hair: '#222222', hat: '#56703a' } };
    for (let n = 1; n <= 3; n++) {
      const m = s ? s.members.find((x) => x.slot === n) : (n === 1 ? solo : null), d = document.createElement('div'); d.className = 'av' + (m ? '' : ' empty');
      if (m) { const c = document.createElement('canvas'); c.className = 'av'; drawAvatar(c, m.avatar); d.append(c); const i = document.createElement('i'); if (s && !s.online.includes(m.id)) i.className = 'off'; d.append(i); d.onclick = () => open('friends'); }
      else { d.textContent = '+'; d.onclick = () => social.invite(); }
      box.append(d);
    }
  }
  setMembers();
  return { toast, open, setShells: (n) => { document.getElementById('shells').textContent = '🐚 ' + n; }, setMembers, refresh: () => { setMembers(); if (tab === 'friends' || tab === 'journal') { const y = sheet.scrollTop; open(tab); sheet.scrollTop = y; } } };
}
