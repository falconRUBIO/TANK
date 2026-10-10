// The look editor: a turning portrait in a glass porthole, a row of tabs (Skin, Hair, Hat, Top, Extra), style tiles drawn from the real model, and colour swatches.
// Used when you first make your person and again from the Crew tab. Edits `look` in place and calls onChange after each change.
import { personSprite, drawAvatar } from './people.js';
import { SKINS, HAIR_COLORS, PALETTE, HAIR_STYLES, HAT_STYLES, TOP_STYLES, EXTRAS, normAvatar, randomAvatar } from './game/avatar.js';

const TABS = [
  { k: 'skin', label: 'Skin', colors: ['skin', SKINS] },
  { k: 'hair', label: 'Hair', styles: ['hairStyle', HAIR_STYLES], colors: ['hair', HAIR_COLORS], crop: 'head' },
  { k: 'hat', label: 'Hat', styles: ['hatStyle', HAT_STYLES], colors: ['hat', PALETTE], crop: 'head' },
  { k: 'top', label: 'Top', styles: ['topStyle', TOP_STYLES], colors: ['top', PALETTE], crop: 'body' },
  { k: 'extra', label: 'Extra', styles: ['extra', EXTRAS], crop: 'face' },
];
const CROP = { head: [0.12, 0, 0.76, 0.56], face: [0.2, 0.14, 0.6, 0.36], body: [0, 0.42, 1, 0.58] };
function tileArt(c, look, crop) {
  const f = personSprite(look), [x, y, w, h] = CROP[crop] ?? [0, 0, 1, 1], sx = Math.round(f.width * x), sy = Math.round(f.height * y), sw = Math.round(f.width * w), sh = Math.round(f.height * h), s = Math.max(sw, sh);
  c.width = c.height = s; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, s, s); g.drawImage(f, sx, sy, sw, sh, (s - sw) / 2, (s - sh) / 2, sw, sh);
}

export function lookEditor(host, look, onChange = () => {}) {
  Object.assign(look, normAvatar(look));
  host.classList.add('pe');
  host.innerHTML = `<div class="pe-stage"><canvas class="pe-pv" aria-label="Your person"></canvas><button type="button" class="pe-dice" aria-label="Surprise me">🎲</button></div><small class="pe-hint">Drag to turn · 🎲 for a surprise</small>
    <div class="pe-tabs" role="tablist">${TABS.map((t, i) => `<button type="button" role="tab" data-t="${t.k}" class="${i === 0 ? 'on' : ''}">${t.label}</button>`).join('')}</div>
    <div class="pe-panel"><div class="pe-styles"></div><div class="pe-cols"></div></div>`;
  const pv = host.querySelector('.pe-pv'), styles = host.querySelector('.pe-styles'), cols = host.querySelector('.pe-cols');
  let tab = TABS[0], turn = 15, job = 0;                        // turn: which of the sixteen angles (15 is the slight three-quarter view used everywhere)
  const paint = () => drawAvatar(pv, look, { yaw: (turn / 16) * Math.PI * 2 });
  const changed = () => { paint(); onChange(look); };
  function panel() {
    const my = ++job;
    styles.innerHTML = ''; cols.innerHTML = ''; styles.hidden = !tab.styles; cols.hidden = !tab.colors || (tab.k === 'hat' && look.hatStyle === 'none');
    if (tab.styles) {
      const [key, list] = tab.styles;
      list.forEach(([id, label], i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pe-tile' + (look[key] === id ? ' on' : ''); b.innerHTML = `<canvas></canvas><b>${label}</b>`;
        b.onclick = () => { look[key] = id; styles.querySelectorAll('.pe-tile').forEach((x) => x.classList.toggle('on', x === b)); if (tab.k === 'hat') cols.hidden = id === 'none'; changed(); };
        styles.append(b);
        setTimeout(() => { if (my === job) tileArt(b.querySelector('canvas'), { ...look, [key]: id }, tab.crop); }, 30 + i * 24);     // drawn one by one so the screen never stalls
      });
      styles.querySelector('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }
    if (tab.colors) {
      const [key, list] = tab.colors;
      for (const col of list) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pe-sw' + (look[key] === col ? ' on' : ''); b.style.background = col; b.setAttribute('aria-label', col);
        b.onclick = () => { look[key] = col; cols.querySelectorAll('.pe-sw').forEach((x) => x.classList.toggle('on', x === b)); changed(); if (tab.styles) refreshTiles(); };
        cols.append(b);
      }
    }
  }
  // after a colour change the tiles are redrawn in the new colour
  function refreshTiles() { const my = ++job, [key, list] = tab.styles; styles.querySelectorAll('.pe-tile canvas').forEach((c, i) => setTimeout(() => { if (my === job) tileArt(c, { ...look, [key]: list[i][0] }, tab.crop); }, 20 + i * 24)); }
  host.querySelectorAll('.pe-tabs button').forEach((b) => (b.onclick = () => { tab = TABS.find((t) => t.k === b.dataset.t); host.querySelectorAll('.pe-tabs button').forEach((x) => x.classList.toggle('on', x === b)); panel(); }));
  host.querySelector('.pe-dice').onclick = () => { Object.assign(look, randomAvatar()); turn = 15; changed(); panel(); host.querySelector('.pe-stage').animate?.([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' }); };
  // drag (or swipe) across the porthole to turn the person around
  const stage = host.querySelector('.pe-stage'); let dragX = null, base = turn;
  stage.addEventListener('pointerdown', (e) => { if (e.target.closest('.pe-dice')) return; dragX = e.clientX; base = turn; stage.setPointerCapture?.(e.pointerId); });
  stage.addEventListener('pointermove', (e) => { if (dragX == null) return; const t = (((base + Math.round((e.clientX - dragX) / 14)) % 16) + 16) % 16; if (t !== turn) { turn = t; paint(); } });
  const up = () => { dragX = null; }; stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  paint(); panel();
  return { get look() { return { ...look }; }, set(l) { Object.assign(look, normAvatar(l)); changed(); panel(); } };
}
