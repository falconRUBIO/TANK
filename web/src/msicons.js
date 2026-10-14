// Milestone icons drawn in the tank's own pixel style (12×12), one per step of a fish's life. Each row is a string; a letter is a colour from the palette, '.' is empty.
const P = { o: '#3b2a1e', w: '#fff8ea', c: '#ffd9a8', y: '#ffcf4a', Y: '#f2a93b', g: '#5fcf7a', G: '#2f9e57', b: '#7cc7ff', B: '#3d8fe0', p: '#ff8fb1', P: '#e0476b', r: '#ff7a59', s: '#e9c79a', S: '#c99a62', k: '#24323f', v: '#c9a7ff' };
const ART = {
  hatched: ['....oooo....', '...owwwwo...', '..owwccwwo..', '..owcwwwwo..', '.owwwwwcwwo.', '.owwcwwwwwo.', '.owwwwwwcwo.', '.owwwwwwwwo.', '..owwwcwwo..', '..owwwwwwo..', '...owwwwo...', '....oooo....'],
  home: ['............', '.....SS.....', '....SssS....', '...SssssS...', '..SsSssSsS..', '.SssSssSssS.', '.SssSssSssS.', '.SsSsssSsSS.', '..SssssssS..', '...SSSSSS...', '............', '............'],
  friend: ['............', '............', '.rr.....bb..', 'rrrr...bbbb.', 'rrkrr.rrkbbb', 'rrrrr.bbbbbb', 'rrrr.p.bbbb.', '.rr..PP.bb..', '.....pp.....', '............', '............', '............'],
  spot: ['......G.....', '...G..gG....', '...gG.g..G..', '....g.gG.g..', '..G.gGg..g..', '..gG.gg.gG..', '...g.gg.g...', '...ggggggg..', '..sssssssss.', '.sSsssSsssS.', '.ssssssssss.', '............'],
  trust: ['............', '..PP...PP...', '.PppP.PppP..', '.PpppPpppP..', '.PpwppppppP.', '.PpppppppP..', '..PppppppP..', '...PpppppP..', '....PpppP...', '.....PpP....', '......P.....', '............'],
  trick: ['.....y......', '.....y......', '....yYy.....', '.yyYYwYYyy..', '....yYy.....', '.....y...b..', '.....y..bwb.', '.........b..', '..v.........', '.vwv........', '..v.........', '............'],
  grown: ['......y.....', '.....yYy....', '......y.....', '............', '..rrrr...rr.', '.rrwrrrr.rr.', 'rrkwrrrrrrr.', 'rrrwrrrrrrr.', '.rrwrrrr.rr.', '..rrrr...rr.', '............', '............'],
  parent: ['............', '.rrr........', 'rrkrr.......', 'rrrrrr......', '.rrr....bb..', '........bkb.', '..rr....bbb.', '.rkrr.......', '.rrrr.......', '..rr........', '............', '............'],
  feed: ['..yy..y.....', '..Yy.yY..y..', '.....y..yY..', '..y.........', '..Yy..yy....', '......Yy..y.', '...b.......b', '..bwb..b...b', '..bb..bwb.bb', '.bbbbbbbbbbb', '.BBBBBBBBBBB', '............'],
  water: ['.....b......', '.....b......', '....bwb.....', '....bwb.....', '...bwbbb....', '..bwbbbbb...', '..bwbbbbb...', '..bbbbbbB...', '..bbbbbBB...', '...bbbBB....', '....BBB.....', '............'],
  glass: ['bbbbbbbbbbbb', 'b..........b', 'b.w....y...b', 'b.ww..yYy..b', 'b..w...y...b', 'b...w......b', 'b....w..w..b', 'b.y...w.ww.b', 'byYy.......b', 'b.y........b', 'b..........b', 'bbbbbbbbbbbb'],
  note: ['............', '..yyyyyyyy..', '..YYYYYYYY..', '..yyyyyyyy..', '..ykkkkkky..', '..yyyyyyyy..', '..ykkkkyyy..', '..yyyyyyyy..', '..ykkkyyyY..', '..yyyyyyYY..', '..yyyyyyY...', '............'],
  gift: ['....P..P....', '...PpPPpP...', '....PPPP....', '.ppppPPpppp.', '.ppppPPpppp.', '.PPPPPPPPPP.', '..pppPPppp..', '..pppPPppp..', '..pppPPppp..', '..pppPPppp..', '..PPPPPPPP..', '............'],
  trim: ['.k.......k..', 'kwk.....kwk.', '.kwk...kwk..', '..kwk.kwk...', '...kwkwk....', '....kwk.....', '...kwkwk....', '..kk...kk...', '.k..k.k..k..', '.k..k.k..k..', '..kk...kk...', '............'],
  puzzle: ['....SSSS....', '...SssssS...', '..bbbbbbbb..', '..b......b..', '..b.rr...b..', '..b.rkr..b..', '..b.rrr..b..', '..b..r.r.b..', '..b......b..', '..bbbbbbbb..', '............', '............'],
  visitor: ['.....y......', '....yYy.....', '.yyyYwYyyy..', '..yYwwwYy...', '...yYwYy....', '..yYy.yYy...', '..yy...yy...', '............', '...g..g.....', '..gGggGg....', '...gggg.....', '............'],
  bottle: ['.....SS.....', '.....bb.....', '....bwbb....', '...bwwbbb...', '...bwwbbb...', '...bwsssb...', '...bwsSsb...', '...bwsssb...', '...bwbbbb...', '...bbbbbb...', '....BBBB....', '............'],
  wish: ['.....y......', '.....y......', '....yYy.....', 'yyyyYwYyyyy.', '.yyYwwwYyy..', '..yYwwwYy...', '..yYYwYYy...', '.yYy...yYy..', '.yy.....yy..', '............', '............', '............'],
  rock: ['............', '............', '............', '....kkkk....', '...kSSSSk...', '..kSssSSSk..', '.kSsssgSSSk.', '.kSssgggSSk.', 'kSSsssSSSSSk', 'kSSSSSSSSSSk', '.kkkkkkkkkk.', '............'],
  coconut: ['............', '............', '....oooo....', '..ooSSSSoo..', '.oSSsSSsSSo.', '.oSSSSSSSSo.', 'oSSkSSSkSSSo', 'oSSSSSSSSSSo', 'owwwwwwwwwwo', 'wwccccccccww', '............', '............'],
  bubbles: ['.......bb...', '......bwbb..', '......bbbb..', '.......bb...', '..bb........', '.bwbb...b...', '.bbbb..bwb..', '..bb....b...', '.....bb.....', '....bwbb....', '....bbbb....', '.....bb.....'],
  camera: ['............', '............', '...kkk......', '.kkkkkkkkkk.', '.kSSSkkSSSk.', '.kSSkbbkSSk.', '.kSkbwbbkSk.', '.kSkbbbbkSk.', '.kSSkbbkSSk.', '.kSSSkkSSSk.', '.kkkkkkkkkk.', '............'],
  hand: ['............', '...c.c.c....', '..cc.c.c.c..', '..cc.c.c.c..', '..cc.c.c.c..', '..ccccccccc.', 'cccccccccc..', '.cccccccccc.', '..ccccccccc.', '...cccccccc.', '....cccccc..', '............'],
  crab: ['............', 'r.r......r.r', 'rrr......rrr', '.r..rrrr..r.', '..rrrrrrrr..', '.rrkrrrrkrr.', 'rrrrrrrrrrrr', '.rrrrrrrrrr.', '..r.r..r.r..', '.r..r..r..r.', '............', '............'],
  shrimp: ['............', '....rr......', '...rwrr.....', '..rrrrrr....', '..r..rrrr...', '.......rrr..', '........rr..', '.......rrr..', '.....rrrr...', '...rrrr.....', '..rr.r......', '............'],
  pellets: ['............', '............', '..SS....S...', '.SSSS..SSS..', '..SS....S...', '.....SS.....', '....SSSS.SS.', '.....SS.SSSS', '..S......SS.', '.SSS..SS....', '..S..SSSS...', '......SS....'],
  cake: ['............', '.....y......', '.....p......', '.....w......', '..wwwwwwww..', '..pPpPpPpP..', '..wwwwwwww..', '..cccccccc..', '..ccrcccrc..', '..cccccccc..', '.SSSSSSSSSS.', '............'],
};
const cache = new Map();
export const iconKeys = () => Object.keys(ART);
export function msIcon(key, on = true, size = 26) {
  const k = key + (on ? 1 : 0) + ':' + size; if (cache.has(k)) return cache.get(k);
  const art = ART[key] ?? ART.hatched; let r = '';
  art.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; const c = on ? P[ch] : ch === 'o' || ch === 'k' ? '#55667a' : '#8796a8'; r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`; }));
  const svg = `<svg viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`; cache.set(k, svg); return svg;
}
