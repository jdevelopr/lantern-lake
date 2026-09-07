// Town kit C, "snowbound north": stacked-log houses with notched corners, white carved
// window and door frames, steep shingle roofs buried under snow with icicles at the
// eaves, stone chimneys always smoking, woodpiles, sleds, snow-laden spruces, a stave
// church, lanterns everywhere. Snow lies whatever the season.
import { pm } from './px.js';
import { rect, hline, vline, fillTile, roofSlope, gable, eaveShadow, icicles, scale, mix } from './kit.js';
import { sprite, text, textWidth, hash } from '../gfx.js';
import { MAPS } from './kit-a.js';
import { TOWN } from '../../game/world.js';

const rep = (row, n) => Array(n).fill(row).join('\n');

/* ------------------------------------------------------------ palette --- */
const LOGS = ['#8a6242', '#7a563a', '#a07048', '#6a4a32', '#b88a5a'];
const TRIM = '#f0ece4', TRIM_D = '#c8c2b8';
const GLASS = '#6a98b8', GLASS_L = '#a8cce0';
const DOORS = ['#8a2e2e', '#2e5a3e', '#2f3d6b', '#c8903a', '#3a2a1c'];
const IRON = '#2d3038', IRON_L = '#4a4e58', BRASS = '#e8b04a';
const SNOW = '#eef2f6', SNOW_D = '#c8d4de', SNOW_DD = '#a8b8c8', SNOW_L = '#ffffff';
const SHINGLE = '#5a4030', SHINGLE_L = '#7a5a40', SHINGLE_D = '#3e2c20';
const STONE = '#7a7a76', STONE_D = '#5a5a56', STONE_L = '#9a9a96';
const TAR = '#2e2622', TAR_L = '#3e342e';

/* --------------------------------------------------------------- maps --- */
const LOG = pm('log', `
llllllllllllllll
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
dddddddddddddddd
kkkkkkkkkkkkkkkk`);
const LOGEND = pm('logend', `
.dddd.
dLllLd
dlLLLd
dLLLLd
dLLLLd
.dddd.`);
const STAVE = pm('stave', `
TtTTTtTT
TtTTTtTT
TtTTTtTT
TtTTTtTT
TtTTlTTT
TtTTTtTT
TtTTTtTT
TtTTTtTT`);
const SHINGLE_TILE = pm('shingle', `
dddddddd
SSSdSSSd
LSSdLSSd
dddddddd
SdSSSdSS
LdSSLdSS`);
const STONE_TILE = pm('stoneC', `
SSSSSsSSSSSS
SSSSSsSSSSSS
dddddddddddd
SSsSSSSSSSsS
SSsSSSSSSSsS
dddddddddddd`);
const WINDOW = pm('windowC', `
.......WWWW.......
.....WWWWWWWW.....
..WWWWWWWWWWWWWW..
..WGGGGGGWGGGGGGW.
..WGgGGGGWGGGGGGW.
..WGGGGGGWGGGGGGW.
..WGGGGGGWGGGGGGW.
..WWWWWWWWWWWWWWW.
..WGGGGGGWGGGGGGW.
..WGGGGGGWGGGGGGW.
..WGGGGGGWGGGGGGW.
..WGGGGGGWGGGGGGW.
..WWWWWWWWWWWWWWW.
.NNNNNNNNNNNNNNNNN
.nnnnnnnnnnnnnnnnn
..OOOOOOOOOOOOOOO.`);
const WINDOW_GLASS = { x: 3, y: 3, w: 13, h: 9 };
const DOOR = pm('doorC', `
....NNNNNNNNNNNN....
...WWWWWWWWWWWWWW...
..WWWWWWWWWWWWWWWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDKKKKKKKKDdWW..
..WWDDKGGGKGGGDdWW..
..WWDDKGgGKGGGDdWW..
..WWDDKKKKKKKKDdWW..
..WWDDKGGGKGGGDdWW..
..WWDDKGGGKGGGDdWW..
..WWDDKKKKKKKKDdWW..
..WWDDdDDdDDdDDdWW..
..WWWWWWWWWWWWWWWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDdDDdDdDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDyyWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDdDDdDdDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWDDdDDdDDdDDdWW..
..WWWWWWWWWWWWWWWW..
.SSSSSSSSSSSSSSSSSS.
NNNNNNNNNNNNNNNNNNNN`);
const DOOR_GLASS = { x: 7, y: 6, w: 7, h: 5 };
const CHIMNEY = pm('chimneyC', `
NNNNNNNN
.SsSSsS.
.SSSSSS.
.sSSsSS.
.SSSSSS.
.SsSSsS.
.SSSSSS.
.sSSsSS.
.SSSSSS.
.SsSSsS.
.SSSSSS.
.sSSsSS.
.SSSSSS.
.SsSSsS.
.SSSSSS.
.sSSsSS.
.SSSSSS.
.SsSSsS.`);
const LAMP_HEAD = pm('lampC', `
....NNNN....
...NNNNNN...
...IIIIII...
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IIIIIIII..
....IIII....
.....OO.....
.....OO.....`);
const LANTERN = pm('lanternC', `
..N..
.III.
.IGI.
.IGI.
.III.`);
const WOODPILE = pm('woodpile', `
...OoO..OoO..OoO...
..OoOoOOoOoOOoOoO..
.OoOoOoOoOoOoOoOoO.
OoOOoOoOOoOoOOoOoOO
OOoOOoOOoOOoOOoOOoO
.OoOoOoOoOoOoOoOoO.
OoOOoOoOOoOoOOoOoOO
OOoOOoOOoOOoOOoOOoO
.OoOoOoOoOoOoOoOoO.
.oooooooooooooooooo`);
const SLED = pm('sled', `
.OOOOOOOOOOOOOOO....
.OoOOOOOOOOOOOoO....
.OO...........OO....
IIIIIIIIIIIIIIIIIII.
I.................I.
IIIIIIIIIIIIIIIIIIII`);
const SKIS = pm('skis', `
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
..OO.OO..
.OO...OO.
.OO...OO.
OO.....OO`);
const SNOWMAN = pm('snowman', `
.....OOOOOO.....
.....OoOOOO.....
......OOOO......
.....NNNNNN.....
....NNKNNKNN....
....NNNNyyNN....
....NNNNNNNN....
.....NNNNNN.....
....NNNNNNNN....
...NNNNNNNNNN...
..NNNNKNNNNNNN..
..NNNNNNNNNNNN..
..NNNNKNNNNNNN..
...NNNNNNNNNN...
..NNNNNNNNNNNN..
.NNNNNNNNNNNNNN.
NNNNNNNNNNNNNNNN
NNNNNNNNNNNNNNNN
.NNNNNNNNNNNNNN.
..nnnnnnnnnnnn..`);
const BRAZIER = pm('brazier', `
....yy....
...yYYy...
..yYYYYy..
..IYYYYI..
.IIIIIIII.
.I.I..I.I.
.I.I..I.I.
II.I..I.II`);
const SPRUCE_BIG = pm('sprucebig', `
..........NNNN..........
........NNNNNNNN........
......NNNNNNNNNNNN......
....NNNNNGGGGNNNNNNN....
..GGGGGGGGGGGGGGGGGGGG..
.GGgGGGGGGgGGGGGGGGgGGG.
GGGGGGGgGGGGGGGgGGGGGGGG
.GGGGGGGGGGGGgGGGGGGGGG.
...GGgGGGGGGGGGGGGGGG...
......GGGGGGGGGGGG......`);
const SPRUCE_MID = pm('sprucemid', `
.......NNNN.......
.....NNNNNNNN.....
...NNNNGGGNNNNN...
.GGGGGGGGGGGGGGGG.
GGgGGGGGgGGGGGgGGG
.GGGGGGGGGGGGGGGG.
...GGGGgGGGGGGG...
.....GGGGGGGG.....`);
const SPRUCE_TOP = pm('sprucetop', `
.....NN.....
....NNNN....
...NNNNNN...
..NNGGGGNN..
.GGGGGGGGGG.
GGgGGGGGgGGG
.GGGGGGGGGG.
...GGGGGG...`);
const STALL_GOODS = pm('goods', `
RRRRRRRRRRRR
rRrRrRrRrRrR
RRRRRRRRRRRR
BBBBBBBBBBBB
bBbBbBbBbBbB
BBBBBBBBBBBB`);
const SNOW_TILE = pm('snowtile', `
NNNNNNNNNNNN
NNNNNNNNsNNN
NNNsNNNNNNNN
NNNNNNNNNNNN
NNNNNNNNNNNN
NNNNNNsNNNNN
NsNNNNNNNNNN
NNNNNNNNNNNN`);
const DRAGON = pm('dragon', `
.OO.
OOO.
.OO.
.O..
.O..`);

/* ----------------------------------------------------------- palettes --- */
const P = {
  log: tone => { const c = LOGS[tone % LOGS.length]; return { L: c, l: mix(c, '#ffffff', 0.22), d: scale(c, 0.66), k: scale(c, 0.42) }; },
  logend: tone => { const c = LOGS[tone % LOGS.length]; return { L: scale(c, 0.9), l: mix(c, '#ffffff', 0.3), d: scale(c, 0.5) }; },
  stave: { T: TAR, t: '#1e1814', l: TAR_L },
  shingle: { S: SHINGLE, L: SHINGLE_L, d: SHINGLE_D },
  stone: { S: STONE, s: STONE_D, d: STONE_D },
  window: { W: TRIM, G: GLASS, g: GLASS_L, N: SNOW, n: SNOW_D, O: '#6a4a32' },
  door: door => ({ W: TRIM, D: door, d: scale(door, 0.7), K: '#2a2018', G: GLASS, g: GLASS_L, y: BRASS, S: STONE, N: SNOW }),
  chimney: { S: STONE, s: STONE_D, N: SNOW },
  lamp: { I: IRON, G: '#5a5248', N: SNOW, O: '#5a4030' },
  lantern: { I: IRON, G: '#5a5248', N: SNOW },
  wood: { O: '#8a6242', o: '#5a4030', l: '#a88a5c', I: IRON, 0: '#5a4030' },
  woodpile: { O: '#b88a5a', o: '#6a4a32' },
  sled: { O: '#8a2e2e', o: '#6a2222', I: IRON_L },
  skis: { O: '#c8903a' },
  snowman: { N: SNOW, n: SNOW_D, K: '#2a2018', y: '#e0683a', O: '#3a2a1c', o: '#5a4030' },
  brazier: { I: IRON, y: '#f2c14e', Y: '#ffe08a' },
  spruce: { G: '#2e5040', g: '#1e3a2c', N: SNOW },
  goods: { R: '#8a2e2e', r: '#e8e2d2', B: '#2f3d6b', b: '#c8903a' },
  snow: { N: SNOW, s: SNOW_D },
  icon: { I: IRON_L, B: '#8ab4c8', E: '#1a1712', O: '#c9b28a', R: '#e0685a' },
};

/* ------------------------------------------------------------- parts --- */
/** Stacked logs with notched corners, a stone footing, snow drifted against the base. */
function wall(g, x, y, w, h, tone, opts = {}) {
  const G0 = opts.ground;
  if (opts.shed) { fillTile(g, x, y, w, h, STAVE, P.stave, x, y); }
  else {
    fillTile(g, x, y, w, h, LOG, P.log(tone), x, y);
    // log ends stick out at the corners on alternate courses
    const end = sprite(LOGEND, P.logend(tone));
    for (let ly = y; ly < G0 - 10; ly += 12) { g.drawImage(end, x - 4, ly); g.drawImage(end, x + w - 2, ly + 6); }
  }
  fillTile(g, x, G0 - 10, w, 10, STONE_TILE, P.stone, x, G0 - 10); hline(g, x, G0 - 10, w, STONE_L);
  // snow drifted against the wall
  for (let xx = x; xx < x + w; xx += 3) { const dh = 3 + Math.round(hash(xx, 4) * 4); rect(g, xx, G0 - dh, 3, dh, SNOW); rect(g, xx, G0 - dh, 3, 1, SNOW_L); }
}

/** A steep shingle roof buried under snow, with icicles along the eaves. */
function roof(g, x, y, w, kind = 'hip', pitch = 16, snow = true) {
  pitch = Math.round(pitch * 1.4);
  const s = roofSlope(g, { x, y, w, pitch, overhang: 8, ridge: null, rows: SHINGLE_TILE, pal: P.shingle, ox: x });
  snowRoof(g, s, pitch);
  rect(g, s.eaveL, s.bottom + 1, s.eaveW, 2, SHINGLE_D); eaveShadow(g, x, s.bottom + 3, w, 4);
  icicles(g, s.eaveL, s.bottom + 3, s.eaveW, 5);
  return s;
}
function snowRoof(g, s, pitch) {
  // snow covers the upper part of the slope with a lumpy lower edge, and mounds on the ridge
  const depth = Math.round(pitch * 0.7);
  for (let i = 0; i < depth; i++) {
    const t = pitch === 1 ? 1 : i / (pitch - 1), inset = (s.eaveW - s.w) / 2 * (1 - t);
    const left = Math.round(s.eaveL + inset), width = Math.round(s.eaveW - inset * 2), yy = s.y + i;
    rect(g, left, yy, width, 1, i === 0 ? SNOW_L : SNOW);
  }
  for (let xx = s.eaveL; xx < s.eaveL + s.eaveW; xx += 4) { const t = (depth - 1) / (pitch - 1), inset = (s.eaveW - s.w) / 2 * (1 - t); if (xx > s.eaveL + inset - 2 && xx < s.eaveL + s.eaveW - inset) { const lump = hash(xx, s.y) < 0.5 ? 1 : 2; rect(g, xx, s.y + depth, 4, lump, SNOW); rect(g, xx, s.y + depth + lump, 4, 1, SNOW_D); } }
  rect(g, s.x - 3, s.y - 3, s.w + 6, 3, SNOW); rect(g, s.x - 2, s.y - 4, s.w + 4, 1, SNOW_L); rect(g, s.x - 3, s.y - 1, s.w + 6, 1, SNOW_D);
}

function chimney(g, x, y) { g.drawImage(sprite(CHIMNEY, P.chimney), x, y - 18); return { x: x + 4, y: y - 18 }; }
function dormer(g, cx, y) {
  gable(g, cx - 10, y + 9, 20, 9, SHINGLE_TILE, P.shingle);
  for (let i = 0; i < 6; i++) { const half = Math.round(10 * i / 8); rect(g, cx - half - 1, y + i, half * 2 + 2, 1, i === 0 ? SNOW_L : SNOW); }
  rect(g, cx - 5, y + 9, 10, 8, TRIM); rect(g, cx - 4, y + 10, 8, 6, GLASS); rect(g, cx, y + 10, 1, 6, TRIM); rect(g, cx - 4, y + 12, 8, 1, TRIM);
  return { x: cx - 4, y: y + 10, w: 8, h: 6, seed: cx };
}
function windowAt(g, x, y, door) {
  g.drawImage(sprite(WINDOW, P.window), x - 9, y);
  return { x: x - 9 + WINDOW_GLASS.x, y: y + WINDOW_GLASS.y, w: WINDOW_GLASS.w, h: WINDOW_GLASS.h, seed: x * 3 + y };
}
function doorAt(g, cx, ground, door) {
  const top = ground - DOOR.length + 1;
  g.drawImage(sprite(DOOR, P.door(door)), cx - 10, top);
  return { x: cx - 10 + DOOR_GLASS.x, y: top + DOOR_GLASS.y, w: DOOR_GLASS.w, h: DOOR_GLASS.h, door: true, seed: cx };
}
function lanternAt(g, x, y) {
  rect(g, x - 3, y - 1, 4, 1, IRON); g.drawImage(sprite(LANTERN, P.lantern), x - 2, y - 1);
  return { x: x, y: y + 2, r: 36, wall: true, glass: [x - 1, y + 1, 1, 2] };
}
function shopWindow(g, x, y, w, h, door, kind) {
  rect(g, x - 3, y - 3, w + 6, h + 6, TRIM); rect(g, x - 1, y - 1, w + 2, h + 2, '#6a4a32');
  rect(g, x, y, w, h, GLASS); rect(g, x, y, w, 2, GLASS_L); rect(g, x + 1, y + 2, 1, h - 4, GLASS_L);
  rect(g, x + (w >> 1), y, 1, h, TRIM); rect(g, x, y + (h >> 1) - 1, w, 1, TRIM);
  // a little snow-covered plank roof over the window, icicles under it
  rect(g, x - 6, y - 10, w + 12, 5, '#6a4a32'); hline(g, x - 6, y - 6, w + 12, SHINGLE_D);
  rect(g, x - 7, y - 13, w + 14, 4, SNOW); hline(g, x - 7, y - 13, w + 14, SNOW_L);
  icicles(g, x - 6, y - 5, w + 12, 6);
  rect(g, x - 3, y + h + 3, w + 6, 2, SNOW);
  if (kind === 'fish') { rect(g, x + 2, y + h - 8, w - 4, 6, '#e8f2f4'); rect(g, x + 2, y + h - 8, w - 4, 1, '#ffffff'); for (let i = 0; i < Math.floor((w - 6) / 12); i++) g.drawImage(sprite(MAPS.FISH_ICON, { B: i % 2 ? '#8ab4c8' : '#d8b86a', E: '#1a1712' }), x + 3 + i * 12, y + h - 13); }
  if (kind === 'rod') { for (let i = 0; i < Math.floor((w - 8) / 9); i++) { rect(g, x + 5 + i * 9, y + 4, 1, h - 10, i % 2 ? '#c9b28a' : '#8a6a48'); rect(g, x + 4 + i * 9, y + 10 + (i % 3) * 3, 3, 2, '#e0685a'); } rect(g, x + 3, y + h - 6, w - 6, 2, '#5a4030'); }
  return { x, y, w, h, shop: true, seed: x };
}
/** A hanging sign under a little snow cap. */
function sign(g, cx, y, label, icon) {
  const w = textWidth(label) + 26;
  rect(g, cx - w / 2 - 4, y - 14, w + 4, 2, IRON); rect(g, cx - w / 2 - 4, y - 14, 2, 10, IRON);
  for (const rx of [cx - w / 2 + 2, cx + w / 2 - 3]) rect(g, rx, y - 12, 1, 3, IRON);
  rect(g, cx - w / 2 - 1, y - 9, w + 2, 17, '#3a2a1c'); rect(g, cx - w / 2, y - 8, w, 15, '#5a4030'); hline(g, cx - w / 2, y - 8, w, '#7a5a40');
  rect(g, cx - w / 2 - 1, y - 11, w + 2, 2, SNOW); hline(g, cx - w / 2 - 1, y - 11, w + 2, SNOW_L);
  text(g, label, cx + 8, y - 4, { color: TRIM, align: 'center', shadow: false });
  const ic = icon === 'fish' ? MAPS.FISH_ICON : icon === 'rod' ? MAPS.ROD_ICON : MAPS.ANCHOR;
  g.drawImage(sprite(ic, P.icon), cx - w / 2 + 3, y - 6);
}
function lampPost(g, x, ground) {
  rect(g, x - 2, ground - 46, 4, 46, '#5a4030'); vline(g, x - 2, ground - 46, 46, '#7a5a40');
  rect(g, x - 4, ground - 3, 8, 3, SNOW);
  g.drawImage(sprite(LAMP_HEAD, P.lamp), x - 6, ground - 56);
  return { x, y: ground - 51, r: 60, glass: [x - 3, ground - 53, 6, 4] };
}
/** A spruce under snow: tiers of dark needles each with a white cap. */
function tree(g, x, ground, opts = {}) {
  rect(g, x - 2, ground - 22, 4, 22, '#3a2a1c'); vline(g, x - 1, ground - 22, 22, '#5a4030');
  rect(g, x - 8, ground - 3, 16, 3, SNOW);
  g.drawImage(sprite(SPRUCE_BIG, P.spruce), x - 12, ground - 30);
  g.drawImage(sprite(SPRUCE_BIG, P.spruce), x - 12, ground - 40);
  g.drawImage(sprite(SPRUCE_MID, P.spruce), x - 9, ground - 50);
  g.drawImage(sprite(SPRUCE_MID, P.spruce), x - 9, ground - 58);
  g.drawImage(sprite(SPRUCE_TOP, P.spruce), x - 6, ground - 68);
  g.drawImage(sprite(SPRUCE_TOP, P.spruce), x - 6, ground - 74);
  const lamps = [];
  if (opts.lanterns) for (let k = 0; k < 5; k++) { const lx = x - 12 + k * 6, ly = ground - 36 + (k % 2) * 10; rect(g, lx, ly - 2, 1, 2, IRON); g.drawImage(sprite(LANTERN, { I: IRON, G: '#e8b04a', N: SNOW }), lx - 2, ly); lamps.push({ x: lx, y: ly + 2, r: 20, wall: true, tree: true, glass: [lx - 1, ly + 1, 1, 2] }); }
  return lamps;
}
function well(g, cx, ground) {
  fillTile(g, cx - 14, ground - 14, 28, 14, STONE_TILE, P.stone, cx - 14, ground - 14);
  rect(g, cx - 15, ground - 17, 30, 3, SNOW); hline(g, cx - 15, ground - 17, 30, SNOW_L); rect(g, cx - 10, ground - 13, 20, 3, '#1a1a1c');
  for (const px of [cx - 12, cx + 9]) { rect(g, px, ground - 44, 3, 30, '#5a4030'); vline(g, px, ground - 44, 30, '#7a5a40'); }
  rect(g, cx - 13, ground - 34, 26, 2, '#5a4030'); rect(g, cx - 2, ground - 34, 4, 2, IRON);
  const s = roofSlope(g, { x: cx - 12, y: ground - 44, w: 24, pitch: 12, overhang: 6, ridge: 4, rows: SHINGLE_TILE, pal: P.shingle, ox: cx });
  snowRoof(g, s, 12); icicles(g, s.eaveL, s.bottom + 1, s.eaveW, 5);
  rect(g, cx, ground - 32, 1, 11, '#c9b28a'); rect(g, cx - 3, ground - 21, 6, 5, '#7a7a76'); hline(g, cx - 3, ground - 21, 6, SNOW);
}
function stall(g, cx, ground, tint) {
  rect(g, cx - 22, ground - 20, 44, 3, '#8a6242'); hline(g, cx - 22, ground - 20, 44, '#a88a5c');
  for (const px of [cx - 20, cx + 17]) rect(g, px, ground - 17, 3, 17, '#5a4030');
  g.drawImage(sprite(STALL_GOODS, P.goods), cx - 18, ground - 26); g.drawImage(sprite(STALL_GOODS, { R: tint, r: '#e8e2d2', B: '#2e5a3e', b: '#e8e2d2' }), cx + 4, ground - 26);
  for (const px of [cx - 25, cx + 22]) { rect(g, px, ground - 50, 3, 30, '#5a4030'); vline(g, px, ground - 50, 30, '#7a5a40'); }
  rect(g, cx - 29, ground - 54, 58, 5, '#6a4a32'); hline(g, cx - 29, ground - 50, 58, SHINGLE_D);
  rect(g, cx - 30, ground - 58, 60, 4, SNOW); hline(g, cx - 30, ground - 58, 60, SNOW_L); icicles(g, cx - 29, ground - 49, 58, 7);
}
function fence(g, x, ground, w) { for (let xx = x; xx < x + w; xx += 16) { g.drawImage(sprite(MAPS.FENCE, P.wood), xx, ground - 9); rect(g, xx, ground - 10, 16, 2, SNOW); } }
function bench(g, x, ground) { g.drawImage(sprite(MAPS.BENCH, P.wood), x, ground - 9); rect(g, x + 1, ground - 6, 22, 2, SNOW); rect(g, x + 1, ground - 10, 22, 1, SNOW); }
function board(g, x, ground) { g.drawImage(sprite(MAPS.BOARD, { O: '#8a6242', o: '#5a4030', P: '#f4e6c0', W: '#e8e2d2', k: '#6a6050' }), x, ground - 24); rect(g, x + 1, ground - 26, 24, 2, SNOW); }
function barrel(g, x, ground) { g.drawImage(sprite(WOODPILE, P.woodpile), x - 4, ground - 10); rect(g, x - 1, ground - 12, 14, 2, SNOW); }
function crate(g, x, ground) { g.drawImage(sprite(SLED, P.sled), x, ground - 6); }
function planter(g, x, ground) { g.drawImage(sprite(SNOWMAN, P.snowman), x, ground - 20); }
function post(g, x, ground) { g.drawImage(sprite(MAPS.POST, P.wood), x, ground - 11); rect(g, x, ground - 12, 7, 2, SNOW); }
function dinghy(g, x, ground) { g.drawImage(sprite(MAPS.DINGHY, { O: '#5a3e2a', W: '#8a2e2e', w: '#6a2222', o: '#3e2a1c' }), x, ground - 7); rect(g, x + 2, ground - 5, 24, 1, SNOW); }
function pot(g, x, ground) { g.drawImage(sprite(SKIS, P.skis), x, ground - 15); }
function hull(g, x, y) { g.drawImage(sprite(MAPS.HULL, { W: '#e8e2d2', w: '#c8c2b2', B: '#8a2e2e', b: '#a84a3a', K: '#2d3038' }), x, y); }
function buntingAt(g, x, y, col) { rect(g, x, y, 6, 1, IRON); rect(g, x + 2, y + 1, 2, 2, col); rect(g, x + 2, y + 1, 1, 1, '#ffffff'); }
function numberPlate(g, x, y, num) { rect(g, x - 5, y - 2, 11, 11, '#3a2a1c'); rect(g, x - 4, y - 1, 9, 9, TRIM); text(g, String(num), x + 1, y, { color: '#3a2a1c', align: 'center', shadow: false }); }

/** A log gable with white carved bargeboards, snow along them, and a dragon-head finial. */
function gableRoof(g, x, y, w, gh, snow) {
  const cx = x + (w >> 1);
  for (let i = 0; i < gh; i++) { const t = i / (gh - 1), width = Math.max(2, Math.round((w + 4) * t)), left = Math.round(cx - width / 2), yy = y - gh + i; fillTile(g, left, yy, width, 1, LOG, P.log(2), x, y - gh); }
  for (let i = 0; i < gh + 3; i++) { const t = i / (gh + 2), half = Math.round(((w + 14) / 2) * t); rect(g, cx - half - 3, y - gh - 3 + i, 3, 1, TRIM); rect(g, cx + half, y - gh - 3 + i, 3, 1, TRIM); rect(g, cx - half - 3, y - gh - 5 + i, 3, 2, SNOW); rect(g, cx + half, y - gh - 5 + i, 3, 2, SNOW); if (i % 6 === 3) { rect(g, cx - half - 2, y - gh - 1 + i, 1, 1, TRIM_D); rect(g, cx + half + 1, y - gh - 1 + i, 1, 1, TRIM_D); } }
  g.drawImage(sprite(DRAGON, { O: '#3a2a1c' }), cx - 2, y - gh - 10);
  rect(g, x, y - 2, w, 2, scale(LOGS[2], 0.55)); eaveShadow(g, x, y, w, 2);
  icicles(g, x + 4, y, w - 8, 7);
  const vy = y - Math.round(gh * 0.45);
  rect(g, cx - 5, vy - 3, 10, 9, TRIM); rect(g, cx - 4, vy - 2, 8, 7, GLASS); rect(g, cx, vy - 2, 1, 7, TRIM); rect(g, cx - 4, vy + 1, 8, 1, TRIM);
}
function slidingDoors(g, x, ground, w, h, out) {
  const door = TAR, y = ground - h;
  rect(g, x - 3, y - 6, w + 6, h + 6, TRIM);
  rect(g, x + 22, y, 24, h, '#141820'); hull(g, x + 20, ground - 32); rect(g, x + 24, ground - 22, 16, 2, '#5a4030');
  out.windows.push({ x: x + 22, y: y + 6, w: 24, h: 30, shop: true, seed: x, dim: true });
  fillTile(g, x, y, 22, h, MAPS.PLANK, { D: '#3e342e', d: '#2e2622' }, x, y); fillTile(g, x + 46, y, w - 46, h, MAPS.PLANK, { D: '#3e342e', d: '#2e2622' }, x + 46, y);
  rect(g, x, y + 28, 22, 2, '#2e2622'); rect(g, x + 46, y + 28, w - 46, 2, '#2e2622');
  rect(g, x - 4, y - 8, w + 8, 3, IRON); rect(g, x - 4, y - 11, w + 8, 3, SNOW);
  rect(g, x + 4, y - 4, 3, 4, IRON); rect(g, x + 52, y - 4, 3, 4, IRON);
}
/** The stave church: tarred vertical staves on a stone footing. */
function chapelWall(g, x, y, w, h, ground) {
  fillTile(g, x, y, w, h, STAVE, P.stave, x, y);
  rect(g, x, y, 3, h, TAR_L); rect(g, x + w - 3, y, 3, h, '#1e1814');
  fillTile(g, x, ground - 10, w, 10, STONE_TILE, P.stone, x, ground - 10); hline(g, x, ground - 10, w, STONE_L);
  for (let xx = x; xx < x + w; xx += 3) { const dh = 3 + Math.round(hash(xx, 4) * 4); rect(g, xx, ground - dh, 3, dh, SNOW); }
  // a covered walkway (svalgang) of little arches along the base
  rect(g, x - 2, ground - 44, w + 4, 3, TAR_L); rect(g, x - 3, ground - 47, w + 6, 3, SNOW);
  for (let xx = x + 4; xx < x + w - 6; xx += 10) { rect(g, xx, ground - 41, 2, 31, '#3e342e'); rect(g, xx + 2, ground - 41, 6, 4, '#1e1814'); }
}
function roseWindow(g, cx, y) { g.drawImage(sprite(MAPS.ROSE, { S: TRIM, G: GLASS, W: TRIM_D }), cx - 10, y - 18); return { x: cx - 8, y: y - 16, w: 16, h: 16, shop: true, round: true, seed: cx }; }
/** The upper tiers of the stave church: a smaller stave box, its own snowy roof, a spire and a cross. */
function tower(g, cx, y, out, snow) {
  const tx = cx - 14, ty = y - 22;
  fillTile(g, tx, ty, 28, 26, STAVE, P.stave, tx, ty); rect(g, tx, ty, 2, 26, TAR_L);
  rect(g, cx - 4, ty + 8, 8, 10, TRIM); rect(g, cx - 3, ty + 9, 6, 8, GLASS); rect(g, cx, ty + 9, 1, 8, TRIM);
  const s = roofSlope(g, { x: tx, y: ty, w: 28, pitch: 10, overhang: 5, ridge: 8, rows: SHINGLE_TILE, pal: P.shingle, ox: tx });
  snowRoof(g, s, 10); icicles(g, s.eaveL, s.bottom + 1, s.eaveW, 5);
  const sx = cx - 6, sy = s.y - 4;
  fillTile(g, sx, sy - 12, 12, 12, STAVE, P.stave, sx, sy - 12);
  gable(g, sx - 2, sy - 12, 16, 18, SHINGLE_TILE, P.shingle);
  for (let i = 0; i < 14; i++) { const half = Math.round(8 * i / 17); rect(g, cx - half - 1, sy - 30 + i, half * 2 + 2, 1, i === 0 ? SNOW_L : SNOW); }
  g.drawImage(sprite(MAPS.CROSS, { I: '#c8c2b8' }), cx - 2, sy - 37);
  for (const dx of [-16, 14]) g.drawImage(sprite(DRAGON, { O: '#1e1814' }), cx + dx, s.y - 6);
  out.clock = null;
}
function squareWall(g, x0, x1, ground, snow) {
  fillTile(g, x0, ground - 18, x1 - x0, 18, STONE_TILE, P.stone, x0, ground - 18);
  rect(g, x0 - 1, ground - 22, x1 - x0 + 2, 4, SNOW); hline(g, x0 - 1, ground - 22, x1 - x0 + 2, SNOW_L); hline(g, x0 - 1, ground - 19, x1 - x0 + 2, SNOW_D);
  icicles(g, x0, ground - 18, x1 - x0, 9);
  g.drawImage(sprite(BRAZIER, P.brazier), x1 - 60, ground - 30);
}
function paving(g, x, y, w, h) {
  fillTile(g, x, y, w, h, SNOW_TILE, P.snow, 0, y);
  // packed tracks and footprints
  rect(g, x, y + 30, w, 1, SNOW_DD); rect(g, x, y + 34, w, 1, SNOW_DD); rect(g, x, y + 31, w, 3, SNOW_D);
  for (let i = 0; i < 90; i++) { const fx = Math.floor(hash(i, 5) * w), fy = y + 6 + Math.floor(hash(5, i) * (h - 12)); rect(g, fx, fy, 2, 1, SNOW_D); rect(g, fx + 3, fy + 2, 2, 1, SNOW_D); }
}
function snowGround(g, x, y, w, h) {}
function quayExtras(g, ground, out) {
  // ice along the quay edge and a lantern on the post
  rect(g, 0, ground - 19, 118, 3, SNOW); hline(g, 0, ground - 19, 118, SNOW_L);
  icicles(g, 0, ground - 16, 118, 6);
}
function extras(g, ground, out, snow) {
  g.drawImage(sprite(SKIS, P.skis), 250, ground - 15);
  for (const lx of [560, 700]) { rect(g, lx, ground - 3, 12, 3, SNOW); }
}

export const KIT_C = {
  name: 'north', alwaysSnow: true, chapelH: 72, boatyardH: 84, doors: DOORS, beam: '#3a2a1c', trim: TRIM, glass: GLASS, stone: STONE, iron: IRON,
  ground: { cobble: '#dfe6ec', cobble2: '#c4ced8', kerb: '#c8d4de' },
  wall, roof, chimney, dormer, windowAt, doorAt, lanternAt, shopWindow, sign, lampPost, tree, well, stall,
  fence, bench, board, barrel, crate, planter, post, dinghy, pot, hull, buntingAt,
  numberPlate, gableRoof, slidingDoors, chapelWall, roseWindow, chapelDoor: DOORS[0], tower, squareWall, paving, snowGround, quayExtras, extras,
  stallTints: [DOORS[3], DOORS[0]], stoneLight: STONE_L, stoneDark: STONE_D,
  roofPattern: SHINGLE_TILE, roofPal: P.shingle, stoneTile: STONE_TILE, stonePal: P.stone,
  bunting: ['#f2c14e', '#e8e2d2', '#f2c14e', '#ffd27a'],
  windowW: 18, windowH: 16, doorH: DOOR.length,
  curtain: seed => ['#8a2e2e', '#2e5a3e', '#c8903a', '#5a3a6a'][Math.floor(hash(seed, 9) * 4)],
};
