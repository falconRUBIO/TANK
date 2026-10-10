// What a caretaker can look like. Shared by the game and the server (which checks every look it stores against these lists).
export const SKINS = ['#ffdcc4', '#f3c9a2', '#e2ad80', '#c98d5e', '#a96c45', '#8a5536', '#6b4029', '#4b2c1d'];
export const HAIR_COLORS = ['#26232e', '#4a2f20', '#7c4b2a', '#b0612f', '#e3b65a', '#f1dfa8', '#d9d9e2', '#4f6fe0', '#ec6fa9', '#2fae9a'];
export const PALETTE = ['#e2574c', '#ff8a5c', '#f2c14e', '#7cc96a', '#2fae9a', '#4fb8e8', '#3a6ad8', '#8a5ad0', '#ef7fae', '#f2efe8', '#6a7080', '#2a2d3a'];
export const HAIR_STYLES = [['short', 'Short'], ['buzz', 'Buzz'], ['long', 'Long'], ['curly', 'Curly'], ['bun', 'Bun'], ['spiky', 'Spiky']];
export const HAT_STYLES = [['none', 'None'], ['beanie', 'Beanie'], ['cap', 'Cap'], ['bucket', 'Bucket'], ['captain', 'Captain'], ['snorkel', 'Snorkel'], ['flower', 'Flower'], ['phones', 'Headphones']];
export const TOP_STYLES = [['tee', 'Tee'], ['stripes', 'Sailor'], ['hoodie', 'Hoodie'], ['wetsuit', 'Wetsuit'], ['aloha', 'Aloha'], ['overalls', 'Overalls']];
export const EXTRAS = [['none', 'None'], ['glasses', 'Glasses'], ['shades', 'Shades'], ['freckles', 'Freckles'], ['blush', 'Blush']];
const HEX = /^#[0-9a-fA-F]{6}$/, ids = (l) => l.map(([k]) => k);
const pick = (v, list, d) => (list.includes(v) ? v : d);
// Every look, old or new, comes out complete. Older looks only had skin, hair and a hat colour (drawn as a beanie).
export function normAvatar(a) {
  const o = a && typeof a === 'object' ? a : {};
  const hat = HEX.test(o.hat) ? o.hat.toLowerCase() : null;
  return {
    skin: HEX.test(o.skin) ? o.skin.toLowerCase() : '#c98d5e', hair: HEX.test(o.hair) ? o.hair.toLowerCase() : '#26232e',
    hairStyle: pick(o.hairStyle, ids(HAIR_STYLES), 'short'),
    hatStyle: pick(o.hatStyle, ids(HAT_STYLES), hat ? 'beanie' : 'none'), hat: hat ?? '#e2574c',
    topStyle: pick(o.topStyle, ids(TOP_STYLES), 'tee'), top: HEX.test(o.top) ? o.top.toLowerCase() : '#2fae9a',
    extra: pick(o.extra, ids(EXTRAS), 'none'),
  };
}
export function randomAvatar(r = Math.random) {
  const p = (l) => l[Math.floor(r() * l.length)], k = (l) => p(l)[0];
  return normAvatar({ skin: p(SKINS), hair: p(HAIR_COLORS.slice(0, 7)), hairStyle: k(HAIR_STYLES), hatStyle: r() < 0.45 ? 'none' : k(HAT_STYLES.slice(1)), hat: p(PALETTE), topStyle: k(TOP_STYLES), top: p(PALETTE), extra: r() < 0.6 ? 'none' : k(EXTRAS.slice(1)) });
}
