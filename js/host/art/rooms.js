// The seven interiors, built from hand-drawn fixtures (fixtures.js) on style-specific
// walls and floors. Each baker paints `g` (behind the keeper) and `f` (counters and
// props the keeper stands behind) and registers live things in L. Positions the live
// layer relies on (counters, chairs, beds, racks) are kept per room.
import { TOWN, lakeNorm } from '../../game/world.js';
import { ditherPattern, disc } from '../gfx.js';
import { M, at, onFloor, shelf, books, picture, table, counter, rug, rect, hline, vline, fillTile, scale, mix, hash, text } from './fixtures.js';
import { pm } from './px.js';
import { MAPS } from './kit-a.js';

const G0 = TOWN.ground, H = 360;
const outline = (g, x, y, w, h, c) => { hline(g, x, y, w, c); hline(g, x, y + h - 1, w, c); vline(g, x, y, h, c); vline(g, x + w - 1, y, h, c); };
const ellipse2 = (g, x, y, rx, ry) => { for (let dy = -ry; dy <= ry; dy++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); g.fillRect(Math.round(x - half), Math.round(y + dy), half * 2 + 1, 1); } };

/* ---------------------------------------------------------- materials --- */
const TILE_WALL = pm('tilewall', `
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
TTTTTTTtTTTTTTTt
tttttttttttttttt
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
TTTtTTTTTTTtTTTT
tttttttttttttttt`);
const TG = pm('tongue', `
lBBBBBd
lBBBBBd
lBBBBBd
lBBBBBd`);
const LOGW = pm('logwall', `
llllllllllllllll
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
dddddddddddddddd
kkkkkkkkkkkkkkkk
llllllllllllllll
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
dddddddddddddddd
kkkkkkkkkkkkkkkk`);
const BRICK = pm('brick', `
BBBBBBBmBBBBBBBm
BBBBBBBmBBBBBBBm
BBBBBBBmBBBBBBBm
mmmmmmmmmmmmmmmm
BBBmBBBBBBBmBBBB
BBBmBBBBBBBmBBBB
BBBmBBBBBBBmBBBB
mmmmmmmmmmmmmmmm`);
const FLOOR_BOARD = pm('floorboard', `
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBbBBBBBBBBBBBBBBBBBBBBBBBBBbBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
dddddddddddddddddddddddddddddddddddddddd
bBBBBBBBBBBBBBBBBBBBBBbBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
dddddddddddddddddddddddddddddddddddddddd`);
const FLAGS = pm('flagfloor', `
FFFFFFFFFFFFFFFFFFFjFFFFFFFFFFFFFFFFFFFj
FfFFFFFFFFFFFFFFFFFjFFFFFFFFfFFFFFFFFFFj
FFFFFFFFFFfFFFFFFFFjFFFFFFFFFFFFFFFFFFFj
FFFFFFFFFFFFFFFFFFFjFFFFfFFFFFFFFFFFFFFj
jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj
FFFFFFFFFjFFFFFFFFFFFFFFFFFFFjFFFFFFFFFF
FFFfFFFFFjFFFFFFFFFFFFfFFFFFFjFFFFFFFFFF
FFFFFFFFFjFFFFFFFFFFFFFFFFFFFjFFFFFFFfFF
FFFFFFFFFjFFFfFFFFFFFFFFFFFFFjFFFFFFFFFF
jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj`);
const STENCIL = pm('stencil', `
................................
.....aa.........................
....aaaa........................
.....aa....gg...................
......g...gaag..................
......g....gg...................
................................
................................
........................aa......
.......................aaaa.....
........................aa......
.........................g......
................................
................................
................................
................................
................................
................................
.............aa.................
............aaaa................
.............aa.................
..............g.................
................................
................................`);
const ROSES = pm('roses', `
................................
....rr..........................
...rRrr.........................
...rrrr.........................
....gg..........................
....g...........................
................................
..........................rr....
.........................rRrr...
.........................rrrr...
..........................gg....
..........................g.....
................................
................................
................................
................................
................gg..............
...............rRrr.............
...............rrrr.............
................gg..............
................g...............
................................
................................
................................
................................
................................
................................
................................`);
const DIAMOND = pm('diamondp', `
........................
......a.................
.....aaa................
....aaaaa...............
.....aaa................
......a.................
........................
........................
........................
........................
..................a.....
.................aaa....
................aaaaa...
.................aaa....
..................a.....
........................
........................
........................
........................
........................`);

/** Style palettes for interiors. */
const STY = {
  storybook: {
    wood: '#8a6a44', woodD: '#5a4030', woodL: '#a88a5c', iron: '#3a3a3c', trim: '#e8e2d2', glass: '#0a0c12',
    ceil: '#d8d0bc', ceilBeam: '#6a5438', floor: '#7a5a3a', floorB: '#6a4a30', skirt: '#8a6a44',
    upholstery: '#6a4a4a', cushion: '#c46a5a', quilt: ['#8a3a3a', '#d8c48a'], pillow: '#e8e2d2', rug: ['#5a6a8a', '#c9a86a'],
    shade: '#d8c48a', lampIron: '#3a3a3c', stove: '#23262e', brass: '#e8b04a',
  },
  harbour: {
    wood: '#5a4a34', woodD: '#3e3226', woodL: '#7a6a4c', iron: '#2d3038', trim: '#c9c3b4', glass: '#0a0c12',
    ceil: '#3a3634', ceilBeam: '#2a2622', floor: '#5a5248', floorB: '#4a443c', skirt: '#3e3a34',
    upholstery: '#4a5a5a', cushion: '#8a4a3a', quilt: ['#3a4a5a', '#8a8a80'], pillow: '#d8d0bc', rug: ['#3a4a4a', '#8a7a5c'],
    shade: '#8a8a70', lampIron: '#2d3038', stove: '#1e2026', brass: '#b8863a',
  },
  north: {
    wood: '#8a6242', woodD: '#5a4030', woodL: '#b88a5a', iron: '#2d3038', trim: '#f0ece4', glass: '#0a0c12',
    ceil: '#6a4a32', ceilBeam: '#4a3324', floor: '#9a7048', floorB: '#7a563a', skirt: '#6a4a32',
    upholstery: '#8a2e2e', cushion: '#e8e2d2', quilt: ['#8a2e2e', '#e8e2d2'], pillow: '#f0ece4', rug: ['#e8e2d2', '#8a2e2e'],
    shade: '#e8e2d2', lampIron: '#2d3038', stove: '#3a3a3c', brass: '#e8b04a',
  },
};
const P = st => STY[st] || STY.storybook;

/* ------------------------------------------------------------- shell --- */
function ceiling(g, st, w, ceil, dark = false) {
  const S = P(st);
  if (st === 'north') { fillTile(g, 0, 0, w, ceil, LOGW, { l: '#7a5a40', L: '#6a4a32', d: '#4a3324', k: '#3a2a1c' }, 0, 0); }
  else {
    const base = dark ? '#3a322c' : S.ceil;
    rect(g, 0, 0, w, ceil, base);
    if (st === 'harbour' || dark) { for (let yy = 5; yy < ceil; yy += 6) hline(g, 0, yy, w, scale(base, 0.72)); }
    else for (let yy = 0; yy < ceil; yy += 2) for (let xx = 0; xx < w; xx += 2) if (hash(xx, yy, 21) < 0.04) rect(g, xx, yy, 2, 1, scale(base, 0.93));
    // joists
    for (let jx = 18; jx < w; jx += 36) { rect(g, jx, 0, 6, ceil - 4, S.ceilBeam); vline(g, jx, 0, ceil - 4, mix(S.ceilBeam, '#ffffff', 0.25)); vline(g, jx + 5, 0, ceil - 4, scale(S.ceilBeam, 0.6)); }
  }
  // cornice
  rect(g, 0, ceil - 4, w, 4, S.ceilBeam); hline(g, 0, ceil - 4, w, mix(S.ceilBeam, '#ffffff', 0.3)); hline(g, 0, ceil - 1, w, scale(S.ceilBeam, 0.5));
}
function beams(g, st, w, ceil, n = 3) {
  const col = P(st).ceilBeam;
  for (let i = 0; i < n; i++) { const x = Math.round((i + 0.5) * w / n); rect(g, x - 5, 0, 10, ceil - 2, col); vline(g, x - 5, 0, ceil - 2, mix(col, '#ffffff', 0.3)); vline(g, x + 4, 0, ceil - 2, scale(col, 0.6)); }
}
function skirting(g, st, w, y) { const col = P(st).skirt; rect(g, 0, y - 6, w, 6, col); hline(g, 0, y - 6, w, mix(col, '#ffffff', 0.3)); hline(g, 0, y - 1, w, scale(col, 0.6)); }
function floorBoards(g, st, w, tint) {
  const col = tint || P(st).floor;
  fillTile(g, 0, G0, w, H - G0, FLOOR_BOARD, { B: col, b: mix(col, '#ffffff', 0.15), d: scale(col, 0.55) }, 0, G0);
  hline(g, 0, G0, w, mix(col, '#ffffff', 0.3));
}
function floorFlags(g, w, col = '#5b5d5c') { fillTile(g, 0, G0, w, H - G0, FLAGS, { F: col, f: mix(col, '#ffffff', 0.1), j: scale(col, 0.6) }, 0, G0); hline(g, 0, G0, w, mix(col, '#ffffff', 0.25)); }
function floorConcrete(g, w, col = '#4a4c4d') {
  rect(g, 0, G0, w, H - G0, col);
  for (let yy = G0; yy < H; yy += 2) for (let xx = 0; xx < w; xx += 2) { const n = hash(xx, yy, 11); if (n < 0.06) rect(g, xx, yy, 2, 1, scale(col, 0.85)); else if (n > 0.97) rect(g, xx, yy, 1, 1, scale(col, 1.15)); }
  hline(g, 0, G0, w, scale(col, 1.3));
  for (const [x, y, r] of [[150, 322, 14], [330, 340, 10], [520, 330, 12]]) { g.fillStyle = ditherPattern(g, scale(col, 0.6), 0.5); ellipse2(g, x, y, r, 3); }
  g.fillStyle = ditherPattern(g, '#a08a5c', 0.35); ellipse2(g, 230, 318, 60, 8); ellipse2(g, 260, 330, 40, 6);
}
/** Wall treatments by style: kind 'paper' (motif), 'boards', 'tiles', 'logs', 'brick', 'tar'. */
function wall(g, st, x, y, w, h, kind, col, motif) {
  if (st === 'north' && kind !== 'tiles' && kind !== 'tar') { const c = col || '#8a6242'; fillTile(g, x, y, w, h, LOGW, { l: mix(c, '#ffffff', 0.22), L: c, d: scale(c, 0.66), k: scale(c, 0.42) }, 0, y); return; }
  if (kind === 'tiles') { fillTile(g, x, y, w, h, TILE_WALL, { T: col || '#d9d6c8', t: scale(col || '#d9d6c8', 0.8) }, 0, y); return; }
  if (kind === 'brick') { fillTile(g, x, y, w, h, BRICK, { B: col, m: scale(col, 0.78) }, 0, y); return; }
  if (kind === 'tar' || kind === 'boards' || st === 'harbour') { const c = col || '#8a6a44'; fillTile(g, x, y, w, h, TG, { l: mix(c, '#ffffff', 0.12), B: c, d: scale(c, 0.7) }, 0, y); if (kind === 'tar') for (let i = 0; i < 12; i++) rect(g, x + Math.floor(hash(i, 3) * w), y + 4 + Math.floor(hash(3, i) * (h - 10)), 1, 3 + Math.floor(hash(i, i) * 6), '#1a1a1c'); return; }
  // paper: a base colour with a repeating motif, a picture rail and a dado
  rect(g, x, y, w, h, col);
  const map = motif === 'rose' ? ROSES : motif === 'diamond' ? DIAMOND : STENCIL;
  const acc = motif === 'rose' ? { r: '#c46a6a', R: '#e08a8a', g: '#6f8a5a' } : { a: scale(col, 0.82), g: '#6f8a5a' };
  fillTile(g, x, y + 6, w, h - 40, map, acc, 0, y + 6);
  rect(g, x, y + 4, w, 2, scale(col, 0.7)); rect(g, x, y + h - 34, w, 3, scale(col, 0.75)); hline(g, x, y + h - 34, w, mix(col, '#ffffff', 0.2));
  fillTile(g, x, y + h - 31, w, 31, TG, { l: mix(col, '#ffffff', 0.2), B: scale(col, 0.92), d: scale(col, 0.72) }, 0, y + h - 31);
}
function frontDoor(g, L, st, x, y) {
  const S = P(st), door = st === 'harbour' ? '#4a4744' : st === 'north' ? '#8a2e2e' : '#5c4030';
  at(g, M.door, { K: st === 'north' ? S.trim : '#1a1712', D: door, d: scale(door, 0.72), G: S.glass, g: S.glass, y: S.brass }, x, y - 40);
  L.windows.push({ x: x + 2, y: y - 39, w: 30, h: 2, small: true }); L.windows.push({ x: x + 10, y: y - 33, w: 7, h: 3, small: true }); L.windows.push({ x: x + 18, y: y - 33, w: 7, h: 3, small: true });
  rect(g, x - 2, G0, 38, 3, st === 'north' ? '#8a2e2e' : '#5a4a34'); hline(g, x - 2, G0, 38, mix(st === 'north' ? '#8a2e2e' : '#5a4a34', '#ffffff', 0.3));
}
function windowFrame(g, L, st, x, y, w, h, { curtains = null, plant = false, lace = false, frost = false } = {}) {
  const S = P(st), trim = S.trim;
  rect(g, x - 4, y - 4, w + 8, h + 8, st === 'north' ? trim : '#1a1712'); rect(g, x - 3, y - 3, w + 6, h + 6, trim); rect(g, x - 1, y - 1, w + 2, h + 2, scale(trim, 0.7));
  rect(g, x, y, w, h, '#0a0c12');
  if (st === 'north') { for (let i = 0; i < 4; i++) rect(g, x - 5 - i, y - 8 + i, 1, 1, trim); for (let i = 0; i < 4; i++) rect(g, x + w + 4 + i, y - 8 + i, 1, 1, trim); rect(g, x - 2, y - 9, w + 4, 2, trim); }
  L.windows.push({ x, y, w, h, bar: true, lace, frost });
  rect(g, x - 6, y + h + 3, w + 12, 3, scale(trim, 0.85)); hline(g, x - 6, y + h + 3, w + 12, mix(trim, '#ffffff', 0.3));
  if (curtains) L.curtains.push({ x, y, w, h, col: curtains });
  if (plant) onFloor(g, M.plant, { G: '#4a7a3a', g: '#5e9a4e', R: '#a05a3a', r: '#7a4030' }, x + w - 12, y + h + 3);
}
function hangingLamp(g, L, st, x, y, ceil, r = 74, on = 'always', shade) {
  const S = P(st); vline(g, x, ceil, y - ceil - 8, '#1a1712');
  at(g, M.hanglamp, { I: S.lampIron, S: shade || S.shade, s: scale(shade || S.shade, 0.7), G: '#5a5248' }, x - 10, y - 13);
  L.lamps.push({ x: x + 0.5, y: y + 2, r, color: '#ffc46a', kind: 'hang', on, w: 23 });
}
function pendant(g, L, x, ceil, drop = 22, on = 'always') {
  vline(g, x, ceil, drop, '#1a1712'); at(g, M.pendant, { I: '#2d3038', G: '#5a5248' }, x - 4, ceil + drop);
  L.lamps.push({ x: x + 0.5, y: ceil + drop + 5, r: 84, color: '#ffe6b0', kind: 'cage', on, w: 7 });
}
function tableLamp(g, L, st, x, y, r = 52, on = 'dim') {
  const S = P(st); at(g, M.tablelamp, { S: S.shade, s: scale(S.shade, 0.75), O: S.wood, o: S.woodD }, x - 7, y - 13);
  L.lamps.push({ x: x + 0.5, y: y - 9, r, color: '#ffd28a', kind: 'table', on, w: 11, shade: S.shade });
}
function candle(g, L, x, y, on = 'dim') { at(g, M.candle, { Y: '#ffd05a', W: '#f0e8d0', I: '#8a8a80' }, x - 2, y - 7); L.lamps.push({ x: x + 0.5, y: y - 8, r: 24, color: '#ffc46a', kind: 'candle', on, w: 1 }); }
function stovePotbelly(g, L, st, x, y, ceil) {
  const S = P(st); at(g, M.potbelly, { I: S.stove, i: mix(S.stove, '#ffffff', 0.2), K: '#0a0806', F: '#120e0a' }, x, y - 37);
  rect(g, x + 10, ceil, 4, y - 37 - ceil, S.stove); vline(g, x + 10, ceil, y - 37 - ceil, mix(S.stove, '#ffffff', 0.2));
  L.fires.push({ x: x + 12, y: y - 15, w: 9, h: 5, r: 50 });
  at(g, M.kettle, { I: '#8a8a80', i: '#a0a09c' }, x + 20, y - 46); L.steam.push({ x: x + 27, y: y - 48 });
}
function stoveRange(g, L, st, x, y, ceil) {
  const S = P(st); at(g, M.range, { I: S.stove, i: mix(S.stove, '#ffffff', 0.25), K: '#0a0806', F: '#120e0a', y: S.brass }, x, y - 30);
  rect(g, x + 28, ceil, 2, y - 30 - ceil, S.stove);
  L.fires.push({ x: x + 9, y: y - 16, w: 9, h: 6, r: 46 });
  at(g, M.kettle, { I: '#8a8a80', i: '#a0a09c' }, x + 6, y - 39); L.steam.push({ x: x + 13, y: y - 41 });
  at(g, M.teapot, { I: '#7a4a3a', i: '#9a6a5a' }, x + 24, y - 38);
}
function fireplace(g, L, st, x, y, w = 56) {
  const stone = st === 'north' ? '#7a7a76' : '#6e6258';
  rect(g, x - 8, y - 50, w + 16, 6, scale(stone, 0.9)); hline(g, x - 8, y - 50, w + 16, mix(stone, '#ffffff', 0.3));
  fillTile(g, x - 8, y - 44, w + 16, 44, MAPS.STONE_TILE, { S: stone, s: scale(stone, 0.7), L: mix(stone, '#ffffff', 0.15) }, x - 8, y - 44);
  rect(g, x + 6, y - 36, w - 12, 36, '#0a0806'); rect(g, x + 8, y - 34, w - 16, 34, '#120e0a');
  rect(g, x + 12, y - 7, w - 24, 4, '#3a2a1c'); rect(g, x + 16, y - 11, w - 32, 4, '#4a3624'); rect(g, x + 14, y - 3, w - 28, 2, '#2d3038');
  L.fires.push({ x: x + w / 2, y: y - 17, w: w - 30, h: 16, r: 100, big: true });
  rect(g, x - 2, y, w + 4, 2, '#5a5754');
}
function clockOn(g, L, st, x, y) { const S = P(st); at(g, M.clock, { O: S.wood, W: '#f4efe2', k: '#1a1712', y: S.brass }, x - 9, y - 6); L.clocks.push({ x, y, r: 6 }); }
function coatRack(g, st, x, y) {
  const S = P(st); rect(g, x, y - 48, 3, 48, S.woodD); rect(g, x - 5, y - 2, 13, 2, S.woodD); rect(g, x - 6, y - 47, 15, 3, S.woodD);
  const coat = st === 'harbour' ? '#c8a03a' : st === 'north' ? '#2e5a3e' : '#3d6b5a';
  rect(g, x - 10, y - 44, 10, 26, coat); rect(g, x - 11, y - 45, 12, 4, coat); rect(g, x - 8, y - 40, 2, 18, scale(coat, 0.8));
  rect(g, x + 5, y - 47, 9, 4, '#5a4a34'); rect(g, x + 2, y - 43, 14, 2, '#5a4a34');
}
function jars(g, x, y, n, seed) { for (let i = 0; i < n; i++) { const col = ['#c9a86a', '#8a3a3a', '#a8b890', '#d8c48a', '#6a4a7a', '#3a6a6a'][(hash(seed, i) * 6) | 0]; at(g, M.jar, { l: '#b8a070', J: col, j: mix(col, '#ffffff', 0.4) }, x + i * 9, y - 7); } }
function crate(g, st, x, y) { onFloor(g, MAPS.CRATE, { O: P(st).wood, o: P(st).woodD, l: P(st).woodL, 0: P(st).woodD }, x, y); }
function barrel(g, st, x, y) { onFloor(g, MAPS.BARREL, { O: st === 'harbour' ? '#4a4a48' : '#6a4a30', o: '#3e2c20', l: '#8a6a44', I: '#2d3038' }, x, y); }

/* ------------------------------------------------------------- rooms --- */
export function bakeFishmonger(g, f, L, season, st) {
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil, st === 'harbour');
  if (st === 'harbour') wall(g, st, 0, ceil, w, G0 - ceil, 'brick', '#c8c4b8');
  else if (st === 'north') wall(g, st, 0, ceil, w, G0 - ceil, 'logs', '#d8d0bc');
  else wall(g, st, 0, ceil, w, G0 - ceil, 'tiles', '#d9d6c8');
  // a band of blue tiles at counter height
  rect(g, 0, G0 - 50, w, 7, st === 'harbour' ? '#3a4a5a' : '#3d6b8a'); for (let x = 0; x < w; x += 8) { rect(g, x + 1, G0 - 48, 3, 1, '#8fb4cc'); rect(g, x + 3, G0 - 47, 3, 1, '#8fb4cc'); }
  skirting(g, st, w, G0);
  floorFlags(g, w, st === 'north' ? '#8a7a68' : '#5b5d5c');
  g.fillStyle = ditherPattern(g, '#7d8a94', 0.4); ellipse2(g, 150, 326, 30, 4); ellipse2(g, 300, 342, 46, 5);
  hangingLamp(g, L, st, 240, 226, ceil, 74, 'always', '#2e5a3e'); hangingLamp(g, L, st, 400, 226, ceil, 74, 'always', '#2e5a3e');
  frontDoor(g, L, st, 20, G0);
  windowFrame(g, L, st, 84, 220, 40, 26, { frost: st === 'north' });
  jars(g, 88, 251, 1, 3); disc(g, 106, 247, 2, '#e8d04a'); disc(g, 111, 247, 2, '#e8d04a');
  // a rail of dried fish, a net, a lantern
  rect(g, 150, 212, 330, 2, S.iron);
  for (const hx of [166, 184, 204, 222]) at(g, M.driedfish, { I: '#8a8a80', F: hash(hx, 1) < 0.5 ? '#a89a7c' : '#8a7a5c', f: '#c9b28a' }, hx - 3, 214);
  at(g, M.netwall, { R: '#c9b28a', Y: '#e0685a' }, 244, 216);
  rect(g, 300, 214, 1, 5, S.iron); rect(g, 297, 219, 7, 9, S.iron); rect(g, 298, 220, 5, 7, '#e8b04a'); L.lamps.push({ x: 300.5, y: 223, r: 34, color: '#ffb257', kind: 'lantern', on: 'always', w: 5, glass: [298, 220, 5, 7] });
  // chalkboard (live text), a clock and a poster of the lake
  rect(g, 318, 208, 124, 56, S.woodD); rect(g, 320, 210, 120, 52, '#233a2e'); L.board = { x: 320, y: 210, w: 120, h: 52 };
  clockOn(g, L, st, 474, 222);
  picture(g, 462, 244, 30, 18, 'lake', S.woodD);
  // ice crate, salt barrels, crates (the cat sleeps up there), boots, bucket and mop
  onFloor(g, M.icecrate, { N: '#e6ebef', n: '#f4f8fa', O: '#8a8a80', l: '#a8a8a0', o: '#6a6a60' }, 148, G0); text(g, 'ICE', 159, G0 - 8, { color: '#2d3038', align: 'center', shadow: false });
  barrel(g, st, 438, G0); barrel(g, st, 452, G0 + 0);
  crate(g, st, 470, G0); crate(g, st, 486, G0); crate(g, st, 478, G0 - 10);
  onFloor(g, M.boots, { B: '#3d5468', b: '#2a3a48' }, 56, G0); onFloor(g, M.bucket, { I: '#8a8a80', i: '#b8b8b0' }, 76, G0);
  rect(g, 88, G0 - 36, 2, 36, S.wood); rect(g, 85, G0 - 4, 8, 4, '#c9c3b4');
  // front: marble counter with the ice slab, scales, register and the chopping board
  counter(f, 200, G0, 220, st === 'harbour' ? '#a8acab' : '#c9cbc6', S.woodD);
  L.slab = { x: 206, y: G0 - 18, w: 160 };
  rect(f, 202, G0 - 19, 170, 3, '#e6ebef'); rect(f, 206, G0 - 20, 160, 1, '#f4f8fa'); f.fillStyle = ditherPattern(f, '#b8d0e0', 0.4); f.fillRect(202, G0 - 18, 170, 2);
  rect(f, 204, G0 - 22, 6, 3, '#4a7a3a'); rect(f, 206, G0 - 24, 3, 2, '#5a8a44');
  at(f, M.scales, { y: S.brass, Y: mix(S.brass, '#ffffff', 0.3) }, 374, G0 - 31);
  at(f, M.register, { I: '#2d3038', i: '#4a4d56', W: '#e8e2d2', k: '#1a1712', y: S.brass }, 400, G0 - 30);
  rect(f, 300, G0 - 19, 26, 2, '#c9a86a'); rect(f, 300, G0 - 19, 26, 1, '#e0c080');
}

export function bakeTackle(g, f, L, season, st) {
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil, true); beams(g, st, w, ceil, 3);
  wall(g, st, 0, ceil, w, G0 - ceil, 'boards', st === 'harbour' ? '#5a6a4a' : st === 'north' ? '#7a563a' : '#8a6a44');
  skirting(g, st, w, G0);
  floorBoards(g, st, w);
  rug(g, 250, 306, 110, 30, S.rug[0], S.rug[1], st);
  frontDoor(g, L, st, 20, G0);
  coatRack(g, st, 58, G0); clockOn(g, L, st, 62, 218);
  // rod rack; the rods are live because they depend on what you own
  rect(g, 76, 220, 124, G0 - 4 - 220, S.woodD); outline(g, 76, 220, 124, G0 - 4 - 220, scale(S.woodD, 0.7)); rect(g, 76, 224, 124, 3, S.wood); rect(g, 76, G0 - 24, 124, 3, S.wood);
  for (let i = 0; i < 4; i++) { const rx = 92 + i * 30; rect(g, rx - 3, 224, 7, 3, scale(S.woodD, 0.7)); rect(g, rx - 3, G0 - 24, 7, 3, scale(S.woodD, 0.7)); }
  L.rack = { x: 92, step: 30, top: 230, bottom: G0 - 26, tag: G0 - 18 };
  text(g, 'RODS', 138, 210, { color: '#e8b04a', align: 'center', shadow: '#2a1a10' });
  windowFrame(g, L, st, 220, 208, 56, 24, { curtains: st === 'harbour' ? '#5a6a5a' : '#7a3a3a', frost: st === 'north' });
  shelf(g, 212, 250, 92, S.woodD); L.spools = { x: 218, y: 250, step: 22 };
  shelf(g, 212, 270, 92, S.woodD); jars(g, 216, 270, 2, 5); rect(g, 234, 260, 14, 10, '#3d6b5a'); rect(g, 235, 261, 12, 3, '#e8e2d2'); rect(g, 252, 263, 10, 7, '#8a3a3a'); rect(g, 266, 261, 8, 9, '#c9b28a'); rect(g, 278, 265, 20, 5, '#2d3038'); rect(g, 279, 266, 18, 1, '#5a5d66');
  rect(g, 340, 206, 92, 28, S.woodD); outline(g, 340, 206, 92, 28, S.wood); rect(g, 344, 210, 84, 20, scale(S.woodD, 0.8)); L.trophy = { x: 386, y: 218 };
  text(g, 'BAIT', 388, 236, { color: '#e8b04a', align: 'center', shadow: '#2a1a10' });
  rect(g, 324, 244, 128, 42, '#c9b28a'); for (let y = 248; y < 286; y += 5) for (let x = 328; x < 452; x += 5) rect(g, x, y, 1, 1, '#8a7a5c'); L.pegs = { x: 336, y: 246, step: 30 };
  rect(g, 462, 208, 44, 44, '#d8c8a0'); outline(g, 462, 208, 44, 44, '#8a7a5a');
  for (let y = 0; y < 34; y++) for (let x = 0; x < 40; x++) if (lakeNorm(x * 16, y * 10.6) < 1) rect(g, 464 + x, 212 + y, 1, 1, lakeNorm(x * 16, y * 10.6) < 0.5 ? '#3e6f90' : '#5f8fb0');
  rect(g, 474, 238, 2, 2, '#e0685a'); text(g, 'LAKE', 484, 245, { color: '#5a4a34', align: 'center', shadow: false });
  rect(g, 464, 258, 40, 28, '#e8e2d2'); rect(g, 464, 258, 40, 8, '#8a3a3a'); L.calendar = { x: 484, y: 259 };
  stovePotbelly(g, L, st, 464, G0, ceil); onFloor(g, MAPS.CRATE, { O: S.wood, o: S.woodD, l: S.woodL, 0: S.woodD }, 494, G0);
  rect(g, 210, G0 - 16, 16, 16, '#8a8a80'); rect(g, 211, G0 - 16, 1, 16, '#b8b8b0'); rect(g, 209, G0 - 17, 18, 1, '#6a6a60'); rect(g, 208, G0 - 28, 20, 10, '#e8e2d2'); text(g, 'FREE', 218, G0 - 27, { color: '#3a2a1c', align: 'center', shadow: false });
  hangingLamp(g, L, st, 150, 226, ceil, 74, 'always', '#8a3a3a'); hangingLamp(g, L, st, 400, 228, ceil, 74, 'always', '#8a3a3a');
  // front: the glass counter with reels and fly boxes inside; vise and magnifier on top
  rect(f, 236, G0 - 16, 148, 16, S.woodD); rect(f, 240, G0 - 14, 140, 11, '#2c3f50'); rect(f, 240, G0 - 14, 140, 2, '#4c6a86'); outline(f, 239, G0 - 15, 142, 13, S.brass);
  for (let i = 0; i < 5; i++) { const rx = 248 + i * 26; disc(f, rx + 4, G0 - 8, 3, '#8a8a80'); disc(f, rx + 4, G0 - 8, 1, '#3a3a3c'); rect(f, rx + 12, G0 - 10, 9, 5, i % 2 ? '#8a3a3a' : '#3d6b5a'); rect(f, rx + 13, G0 - 9, 7, 1, '#e8e2d2'); }
  rect(f, 232, G0 - 19, 156, 3, '#c9b28a'); hline(f, 232, G0 - 19, 156, '#e0c890'); hline(f, 232, G0 - 17, 156, '#8a6a44');
  rect(f, 296, G0 - 27, 3, 8, '#2d3038'); rect(f, 292, G0 - 29, 12, 2, '#3a3a3c'); rect(f, 302, G0 - 31, 4, 3, '#5a5d66');
  rect(f, 330, G0 - 21, 2, 2, '#2d3038'); rect(f, 331, G0 - 36, 1, 15, '#3a3a3c'); rect(f, 326, G0 - 38, 12, 3, '#2d3038'); L.lamps.push({ x: 332, y: G0 - 33, r: 34, color: '#ffe6b0', kind: 'mag', on: 'always', w: 10, glass: [327, G0 - 35, 10, 1] });
  rect(f, 350, G0 - 24, 14, 5, '#8a3a3a'); for (let i = 0; i < 3; i++) rect(f, 352 + i * 4, G0 - 23, 2, 2, ['#e8b04a', '#7fe0c3', '#ff8c66'][i]);
  rect(f, 254, G0 - 26, 1, 7, '#e0685a'); rect(f, 256, G0 - 28, 1, 9, '#7fe0c3'); rect(f, 258, G0 - 25, 1, 6, '#e8b04a');
}

export function bakeBoatyard(g, f, L, season, st) {
  const w = 600, ceil = 186, S = P(st);
  rect(g, 0, 0, w, ceil, '#232628'); for (let x = 0; x < w; x += 12) vline(g, x, 0, ceil, '#1c1f21');
  beams(g, st, w, ceil, 4); rect(g, 0, ceil - 5, w, 5, '#4a4240'); hline(g, 0, ceil - 5, w, '#5c5452');
  wall(g, st, 0, ceil, w, G0 - ceil, st === 'harbour' ? 'tar' : 'boards', st === 'harbour' ? '#2a2a2e' : st === 'north' ? '#4a3a2c' : '#5d6260');
  skirting(g, st, w, G0);
  floorConcrete(g, w, st === 'north' ? '#6a6a68' : '#4a4c4d');
  frontDoor(g, L, st, 20, G0);
  at(g, M.chart, { P: '#5a4a34', p: '#c9b28a', b: '#8ab4c8', k: '#c84a3a' }, 62, 204);
  L.storage = { x: 64, y: G0 };
  at(g, M.ropecoil, { R: '#c9b28a', r: '#a08a5c' }, 146, 210); at(g, M.ropecoil, { R: '#a89a7c', r: '#8a7a5c' }, 168, 214);
  at(g, M.lifering, { W: '#e8e2d2', R: '#e0685a' }, 292, 206);
  at(g, M.oars, { O: '#8a6a44' }, 208, 206);
  // pegboard of tools over the workbench
  rect(g, 346, 204, 100, 50, '#c9b28a'); for (let y = 208; y < 254; y += 5) for (let x = 350; x < 446; x += 5) rect(g, x, y, 1, 1, '#8a7a5c');
  rect(g, 356, 212, 2, 24, '#5a4030'); rect(g, 352, 210, 10, 5, '#3a3a3c');
  rect(g, 372, 210, 3, 28, '#8a8a80'); for (let i = 0; i < 6; i++) rect(g, 375, 212 + i * 4, 1, 2, '#8a8a80'); rect(g, 370, 208, 7, 4, '#5a4030');
  rect(g, 390, 214, 16, 3, '#3a3a3c'); rect(g, 396, 217, 3, 16, '#3a3a3c');
  rect(g, 416, 210, 4, 22, '#5a4030'); rect(g, 414, 230, 8, 4, '#8a8a80');
  rect(g, 430, 212, 10, 10, '#3a3a3c'); disc(g, 435, 217, 3, '#8a8a80');
  rect(g, 352, 242, 30, 7, '#2d3038'); rect(g, 353, 243, 28, 2, '#5a5d66');
  // engine stand (live engines)
  rect(g, 452, G0 - 40, 84, 3, '#3a3d3c'); rect(g, 452, G0 - 3, 84, 3, '#3a3d3c'); rect(g, 454, G0 - 44, 3, 44, '#2d3038'); rect(g, 531, G0 - 44, 3, 44, '#2d3038'); L.engines = { x: 462, y1: G0 - 40, y2: G0 - 3 };
  text(g, 'ENGINES', 494, 200, { color: '#e8b04a', align: 'center', shadow: '#1a1a1c' });
  // big sliding door open onto the lake
  rect(g, 540, 200, 56, G0 - 200 + 4, '#1a1712'); L.windows.push({ x: 544, y: 204, w: 50, h: G0 - 204, big: true, water: 20 });
  rect(g, 532, 196, 68, 5, '#3a3d3c'); rect(g, 596, 200, 4, G0 - 200, '#4a4744'); rect(g, 536, 200, 6, G0 - 200, '#4a4744');
  pendant(g, L, 240, ceil, 22); pendant(g, L, 420, ceil, 20);
  // front: trestles (the hull is live), the workbench, an anchor and chain, sawdust
  for (const tx of [176, 300]) onFloor(f, M.trestle, { O: '#6a5438', l: '#8a7458', o: '#4a3a2a' }, tx - 14, G0);
  rect(f, 346, G0 - 20, 96, 5, '#8a6a44'); hline(f, 346, G0 - 20, 96, '#a88a5c'); rect(f, 348, G0 - 15, 6, 15, '#5a4a34'); rect(f, 434, G0 - 15, 6, 15, '#5a4a34'); rect(f, 348, G0 - 7, 92, 2, '#6a5438');
  rect(f, 352, G0 - 28, 12, 8, '#2d3038'); rect(f, 349, G0 - 26, 6, 3, '#3a3d46'); rect(f, 366, G0 - 25, 4, 4, '#3a3d46');
  for (let i = 0; i < 3; i++) { rect(f, 384 + i * 12, G0 - 29, 9, 9, ['#e0685a', '#3d6b8a', '#e8e2d2'][i]); rect(f, 385 + i * 12, G0 - 30, 7, 2, '#8a8a80'); }
  rect(f, 424, G0 - 31, 16, 11, '#5a4030'); rect(f, 426, G0 - 29, 8, 6, '#c9b28a'); rect(f, 436, G0 - 29, 2, 2, '#e8b04a'); rect(f, 426, G0 - 22, 12, 1, '#3a2a1c');
  crate(f, st, 360, G0);
  onFloor(f, MAPS.ANCHOR, { I: '#5a5d66' }, 122, G0);
  for (let i = 0; i < 8; i++) rect(f, 100 + i * 4, G0 - 3 + (i % 2), 3, 2, '#5a5d66');
  f.fillStyle = ditherPattern(f, '#c0a870', 0.5); ellipse2(f, 240, G0 + 4, 50, 3);
}

export function bakeHouse1(g, f, L, season, st) {   // Marla: roses, a rocking chair, the stove, a quilted bed
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil); beams(g, st, w, ceil, 2);
  wall(g, st, 0, ceil, w, G0 - ceil, 'paper', st === 'harbour' ? '#8a9aa0' : st === 'north' ? '#9a7048' : '#d6c2a8', 'rose');
  skirting(g, st, w, G0);
  floorBoards(g, st, w);
  rug(g, 200, 304, 150, 34, S.rug[0], S.rug[1], st);
  frontDoor(g, L, st, 20, G0);
  windowFrame(g, L, st, 78, 218, 44, 28, { curtains: st === 'harbour' ? '#8a8a70' : '#e8d8c8', plant: true, lace: st === 'storybook', frost: st === 'north' });
  onFloor(g, M.dresser, { O: S.wood, l: S.woodL, o: S.woodD, W: '#e8e2d2', B: '#6a9ab8', y: S.brass }, 154, G0);
  picture(g, 232, 212, 18, 18, 'portrait'); picture(g, 258, 210, 26, 16, 'boat'); picture(g, 292, 214, 18, 14, 'lake'); clockOn(g, L, st, 338, 224);
  onFloor(g, M.catbasket, { O: '#c9a86a', o: '#8a6a44' }, 224, G0);
  stoveRange(g, L, st, 380, G0, ceil);
  shelf(g, 372, 246, 52, S.woodD); jars(g, 374, 246, 5, 1);
  at(g, M.pans, { C: '#b87a4a', c: '#d89a6a', I: S.iron }, 328, 240);
  onFloor(g, M.bed, { O: S.wood, l: S.woodL, o: S.woodD, P: S.pillow, p: scale(S.pillow, 0.8), W: '#f4efe2', Q: S.quilt[0], q: S.quilt[1] }, 436, G0);
  rect(g, 418, G0 - 22, 20, 3, S.woodD); rect(g, 420, G0 - 19, 3, 19, S.woodD); rect(g, 433, G0 - 19, 3, 19, S.woodD); tableLamp(g, L, st, 428, G0 - 22, 56);
  table(g, 296, G0, 30, S.woodD, 14); rect(g, 302, G0 - 18, 6, 4, '#e8e2d2'); rect(g, 308, G0 - 17, 2, 2, '#e8e2d2'); candle(g, L, 318, G0 - 14);
  L.chair = { x: 262, y: G0 };
  hangingLamp(g, L, st, 300, 226, ceil, 66, 'dim');
}

export function bakeHouse2(g, f, L, season, st) {   // the Okafors: books, a desk, a radio, a chart of the world
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil);
  wall(g, st, 0, ceil, w, G0 - ceil, 'paper', st === 'harbour' ? '#6a7a86' : st === 'north' ? '#7a563a' : '#8fa0ac', 'diamond');
  skirting(g, st, w, G0);
  floorBoards(g, st, w, st === 'storybook' ? '#5a4a3a' : undefined);
  rug(g, 170, 308, 140, 30, S.rug[1], S.rug[0], st);
  frontDoor(g, L, st, 20, G0);
  rect(g, 60, 208, 100, G0 - 208, S.woodD); for (let i = 0; i < 4; i++) { const sy = 228 + i * 20; shelf(g, 62, sy, 96, S.wood); books(g, 64, sy, 20 + (i * 3) % 5, i + 7); }
  rect(g, 60, 208, 3, G0 - 208, scale(S.woodD, 0.7)); rect(g, 157, 208, 3, G0 - 208, scale(S.woodD, 0.7)); rect(g, 60, 206, 100, 3, S.wood);
  at(g, M.chart, { P: S.woodD, p: '#d8c8a0', b: '#a8b890', k: '#c84a3a' }, 180, 212); coatRack(g, st, 168, G0); onFloor(g, M.plant, { G: '#4a7a3a', g: '#5e9a4e', R: '#a05a3a', r: '#7a4030' }, 186, G0);
  windowFrame(g, L, st, 270, 214, 64, 30, { curtains: st === 'harbour' ? '#5a6a5a' : '#c46a5a', frost: st === 'north' });
  clockOn(g, L, st, 356, 222);
  onFloor(g, M.sofa, { C: S.upholstery, c: mix(S.upholstery, '#ffffff', 0.15), L: S.cushion, O: S.woodD, o: scale(S.woodD, 0.7) }, 386, G0);
  rect(g, 462, G0 - 22, 30, 3, S.woodD); rect(g, 464, G0 - 19, 3, 19, S.woodD); rect(g, 487, G0 - 19, 3, 19, S.woodD);
  at(g, M.radio, { I: '#8a8a80', O: S.woodD, l: S.woodL, W: '#c9b28a', k: '#3a2a1c', y: S.brass, Y: '#ffe08a' }, 466, G0 - 33); L.lamps.push({ x: 484, y: G0 - 31, r: 16, color: '#ffd28a', kind: 'radio', on: 'always', w: 6, glass: [480, G0 - 29, 5, 3] });
  at(g, M.bottleship, { G: 'rgba(180,210,230,0.55)', W: '#e8e2d2', O: '#5a4030' }, 358, G0 - 40); rect(g, 358, G0 - 30, 26, 30, S.woodD); rect(g, 360, G0 - 16, 22, 12, scale(S.woodD, 0.8));
  rect(g, 500, G0 - 28, 2, 28, '#3a3a3c'); rect(g, 496, G0 - 2, 10, 2, '#3a3a3c'); disc(g, 501, G0 - 34, 6, '#3e6f90'); rect(g, 498, G0 - 36, 3, 2, '#5a8a44'); rect(g, 502, G0 - 32, 4, 3, '#5a8a44');
  // front: the desk. Tunde sits behind it.
  rect(f, 236, G0 - 16, 80, 3, S.wood); hline(f, 236, G0 - 16, 80, S.woodL); rect(f, 238, G0 - 13, 76, 13, S.woodD); rect(f, 242, G0 - 10, 30, 5, scale(S.woodD, 0.8)); rect(f, 280, G0 - 10, 30, 5, scale(S.woodD, 0.8)); rect(f, 244, G0 - 8, 4, 1, S.brass); rect(f, 282, G0 - 8, 4, 1, S.brass);
  rect(f, 296, G0 - 19, 8, 3, '#2d3038'); rect(f, 290, G0 - 21, 2, 5, S.brass);
  rect(f, 303, G0 - 18, 7, 2, '#2d3038'); rect(f, 306, G0 - 28, 1, 10, '#3a3a3c'); rect(f, 300, G0 - 29, 6, 1, '#3a3a3c'); rect(f, 296, G0 - 30, 6, 3, '#2e5a3e'); L.lamps.push({ x: 298, y: G0 - 26, r: 44, color: '#ffe0a0', kind: 'desk', on: 'dim', w: 6 });
  L.desk = { x: 276, y: G0 };
  hangingLamp(g, L, st, 300, 226, ceil, 66, 'dim', '#e8e2d2');
}

export function bakeHouse3(g, f, L, season, st) {   // Bram: dark planks, the hearth, nets, the big pike
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil, true); beams(g, st, w, ceil, 3);
  wall(g, st, 0, ceil, w, G0 - ceil, 'boards', st === 'harbour' ? '#4a4a4a' : st === 'north' ? '#6a4a32' : '#5a4634');
  skirting(g, st, w, G0);
  floorBoards(g, st, w, st === 'north' ? undefined : '#4e3826');
  rug(g, 180, 310, 120, 28, S.rug[1], S.rug[0], st);
  frontDoor(g, L, st, 20, G0);
  onFloor(g, M.boots, { B: '#4a3324', b: '#3a2a1c' }, 58, G0); rect(g, 80, G0 - 46, 3, 46, '#3a2a1c'); rect(g, 74, G0 - 48, 16, 3, '#3a2a1c'); rect(g, 70, G0 - 44, 10, 24, '#c9b28a'); rect(g, 68, G0 - 45, 14, 4, '#c9b28a');
  at(g, M.netwall, { R: '#a89a7c', Y: '#e0685a' }, 92, 214); at(g, M.ropecoil, { R: '#c9b28a', r: '#a08a5c' }, 150, 222);
  windowFrame(g, L, st, 176, 218, 52, 28, { curtains: '#5a6a5a', frost: st === 'north' });
  fireplace(g, L, st, 320, G0, 64);
  if (st === 'north') at(g, M.antlers, { O: '#c8c2b8', W: '#5a4030' }, 342, G0 - 76);
  rect(g, 320, G0 - 74, 64, 18, '#2d3038'); rect(g, 322, G0 - 73, 60, 16, '#8a7a5c'); rect(g, 328, G0 - 68, 48, 8, '#7d9c5b'); rect(g, 328, G0 - 68, 48, 2, '#5e7a44'); rect(g, 366, G0 - 71, 10, 5, '#7d9c5b'); rect(g, 372, G0 - 73, 5, 3, '#5e7a44'); rect(g, 324, G0 - 66, 8, 4, '#7d9c5b'); rect(g, 326, G0 - 65, 2, 1, '#e8e2d2'); for (let i = 0; i < 5; i++) rect(g, 334 + i * 8, G0 - 62, 3, 1, '#c9d8a0');
  rect(g, 308, G0 - 58, 10, 8, '#a8c8a0'); rect(g, 309, G0 - 55, 8, 3, '#5c4030'); rect(g, 312, G0 - 57, 2, 2, '#e8e2d2'); rect(g, 318, G0 - 59, 2, 3, '#a08a5c');
  rect(g, 388, G0 - 66, 5, 12, '#8a8a80'); rect(g, 389, G0 - 64, 3, 8, '#e8e2d2'); L.barometer = { x: 390, y: G0 - 60 };
  rect(g, 300, G0 - 80, 100, 3, S.wood); rect(g, 300, G0 - 80, 10, 3, S.woodL);
  picture(g, 424, 214, 40, 24, 'ship', S.woodD); clockOn(g, L, st, 488, 224);
  rect(g, 438, G0 - 56, 1, 8, '#3a3a3c'); rect(g, 435, G0 - 48, 7, 7, '#e8b04a'); rect(g, 436, G0 - 47, 5, 5, '#fff2c0'); L.lamps.push({ x: 438.5, y: G0 - 45, r: 50, color: '#ffb257', kind: 'lantern', on: 'dim', w: 5, glass: [436, G0 - 47, 5, 5] });
  onFloor(g, M.bed, { O: S.wood, l: S.woodL, o: S.woodD, P: '#d8d0bc', p: '#b8b0a0', W: '#e8e2d2', Q: '#3d6b5a', q: '#c9b28a' }, 446, G0);
  L.chair = { x: 264, y: G0 }; onFloor(g, M.armchair, { C: S.upholstery, c: mix(S.upholstery, '#ffffff', 0.15), L: S.cushion, O: S.woodD, o: scale(S.woodD, 0.7) }, 244, G0);
  table(g, 206, G0, 28, '#4e3826', 14); rect(g, 212, G0 - 18, 8, 4, '#c9b28a'); rect(g, 220, G0 - 17, 4, 2, '#3a2a1c');
  hangingLamp(g, L, st, 300, 228, ceil, 56, 'dim', '#5a4a34');
}

export function bakeHouse4(g, f, L, season, st) {   // the Reyes home: warm paper, crayon art, toys, a bunk bed
  const w = 512, ceil = 190, S = P(st);
  ceiling(g, st, w, ceil);
  wall(g, st, 0, ceil, w, G0 - ceil, 'paper', st === 'harbour' ? '#a8a080' : st === 'north' ? '#a07048' : '#e0c48a', 'stencil');
  skirting(g, st, w, G0);
  floorBoards(g, st, w, st === 'storybook' ? '#8a6a44' : undefined);
  rug(g, 150, 306, 120, 32, st === 'north' ? S.rug[0] : '#5a8a44', '#e8e2d2', st);
  frontDoor(g, L, st, 20, G0);
  rect(g, 60, 212, 110, 1, '#8a8a80'); for (let i = 0; i < 5; i++) { rect(g, 66 + i * 22, 213, 6, 8, ['#e0685a', '#7fe0c3', '#e8b04a', '#5a6a8a', '#e8e2d2'][i]); rect(g, 66 + i * 22, 210, 1, 3, '#c9b28a'); rect(g, 71 + i * 22, 210, 1, 3, '#c9b28a'); }
  picture(g, 70, 230, 22, 16, 'crayon', '#c9b28a'); picture(g, 100, 234, 26, 16, 'crayon', '#c9b28a'); picture(g, 134, 228, 20, 18, 'crayon', '#c9b28a');
  windowFrame(g, L, st, 176, 214, 66, 30, { curtains: '#7fe0c3', frost: st === 'north' });
  clockOn(g, L, st, 278, 224);
  stoveRange(g, L, st, 300, G0, ceil); shelf(g, 296, 250, 44, S.woodL); jars(g, 300, 250, 4, 9);
  onFloor(g, M.chair, { O: S.wood, l: S.woodL, o: S.woodD }, 350, G0);
  onFloor(g, M.bunk, { O: S.wood, o: S.woodD, Q: '#5a6a8a', q: '#8a9ab8', P: '#e0685a', p: '#f08a7a', W: '#e8e2d2' }, 400, G0);
  onFloor(g, M.blocks, { B: '#5a6a8a', b: '#8a9ab8', R: '#e0685a', r: '#f08a7a', Y: '#e8b04a', y: '#f2c14e' }, 214, G0);
  onFloor(g, M.toyboat, { W: '#e8e2d2', R: '#e0685a', r: '#b84a3a' }, 246, G0);
  shelf(g, 462, G0 - 66, 24, S.woodL); tableLamp(g, L, st, 474, G0 - 66, 50, 'dim'); L.nightlight = { x: 410, y: G0 - 22 };
  rect(g, 408, G0 - 26, 4, 4, '#c9b28a'); rect(g, 409, G0 - 28, 2, 2, '#f2c14e');
  // front: the kitchen table with the sewing machine; Elena sits behind it
  table(f, 130, G0, 96, S.woodL, 14); at(f, M.sewing, { I: '#2d3038', i: '#4a4d56', W: '#e8e2d2' }, 148, G0 - 26); rect(f, 190, G0 - 18, 12, 4, '#7fe0c3'); rect(f, 204, G0 - 17, 8, 3, '#e0685a');
  L.table = { x: 168, y: G0 };
  hangingLamp(g, L, st, 250, 226, ceil, 66, 'dim', '#e8e2d2');
}

export const BAKERS = { fishmonger: bakeFishmonger, tackle: bakeTackle, boatyard: bakeBoatyard, house1: bakeHouse1, house2: bakeHouse2, house3: bakeHouse3, house4: bakeHouse4 };
