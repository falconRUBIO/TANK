// HTML chrome: pixel avatars, bottom-sheet tabs (Care / Decorate / Friends / Journal), toasts.
const SKIN = ['#8a5a3a', '#e8b890', '#b06a42'];
function avatar(c, { skin, hair, hat, eye = '#1a1a22' }) {
  const g = c.getContext('2d'); c.width = c.height = 16; g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r(0, 0, 16, 16, '#1c2b40'); r(3, 11, 10, 5, '#2e5a3a');             // shirt
  r(4, 4, 8, 8, skin); r(5, 12, 6, 1, skin);                           // face
  if (hat) { r(3, 2, 10, 3, hat); r(2, 4, 12, 1, hat); } else { r(3, 2, 10, 3, hair); r(3, 4, 2, 5, hair); r(11, 4, 2, 5, hair); }
  r(6, 7, 1, 2, eye); r(9, 7, 1, 2, eye); r(7, 10, 2, 1, '#6a2a22');   // eyes + mouth
}
export function initUI({ onFeed, journal, shells, status }) {
  const A = [{ skin: SKIN[0], hair: '#222', hat: '#56703a' }, { skin: SKIN[1], hair: '#5a3ad0', hat: null }, { skin: SKIN[2], hair: '#222', hat: '#c0362c' }];
  document.querySelectorAll('canvas.av').forEach((c, i) => avatar(c, A[i]));
  const sheet = document.getElementById('sheet'), toastEl = document.getElementById('toast');
  let tab = 'tank', tt;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2400); };
  const tile = (icon, label, act) => `<button class="tile" data-act="${act}"><span>${icon}</span>${label}</button>`;
  const views = {
    care: () => `<h3>Care</h3><div class="grid2">${tile('🫙', 'Feed', 'feed')}${tile('🧽', 'Clean', 'soon')}${tile('💧', 'Water Change', 'soon')}${tile('➕', 'Health', 'soon')}</div>`,
    decorate: () => `<h3>Decorate</h3><div class="grid3">${['Sunken Ruins', 'Tall Grass', 'Driftwood', 'Treasure Chest', 'Skull', 'Red Plant', 'Stone Lantern', 'Torii Gate'].map((n) => tile('◆', n, 'soon')).join('')}</div><p class="dim">Placement and Shell purchases come with the shared-tank backend.</p>`,
    friends: () => `<h3>Friends</h3><div class="slots"><div class="slot"><canvas class="av big"></canvas><b>You</b><small>● Online</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 2</small></div><div class="slot empty"><span>+</span><b>Invite</b><small>Slot 3</small></div></div><p class="dim">Three caretakers share one tank. Invite codes and live sync arrive with the multiplayer backend.</p>`,
    journal: () => `<h3>Journal</h3><div class="jl">${journal().map((e) => `<div class="je"><small>DAY ${String(e.day).padStart(3, '0')}</small><span>${e.text}</span></div>`).join('')}</div>`,
  };
  function open(t) {
    tab = t;
    document.querySelectorAll('nav [data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === t));
    if (t === 'tank') { sheet.classList.remove('on'); return; }
    sheet.innerHTML = `<button class="x">×</button>` + views[t]();
    sheet.classList.add('on');
    sheet.querySelector('.x').onclick = () => open('tank');
    sheet.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { if (b.dataset.act === 'feed') { open('tank'); onFeed(); } else toast('Coming soon'); });
    const big = sheet.querySelector('canvas.big'); if (big) avatar(big, A[0]);
  }
  document.querySelectorAll('nav [data-tab]').forEach((n) => n.addEventListener('click', () => open(n.dataset.tab === tab ? 'tank' : n.dataset.tab)));
  return { toast, open, setShells: (n) => { document.getElementById('shells').textContent = '🐚 ' + n; } };
}
