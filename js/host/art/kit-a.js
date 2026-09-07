// Town kit A, "cosy storybook": whitewashed plaster between oak beams, a jettied upper
// floor, pantile roofs, arched windows with painted shutters and flower boxes, oak doors
// in stone surrounds, hanging signs, striped awnings, lanterns, a lantern tree.
import { pm } from './px.js';
import { rect, hline, vline, fillTile, roofSlope, gable, eaveShadow, scale, mix } from './kit.js';
import { sprite, text, textWidth, hash } from '../gfx.js';

const rep = (row, n) => Array(n).fill(row).join('\n');

/* ------------------------------------------------------------ palette --- */
const PLASTER = ['#f2e8d4', '#ece0c6', '#f6efe0', '#e6d8bc'];
const BEAM = '#5a3e2a', BEAM_L = '#7a5a3c', BEAM_D = '#3e2a1c';
const STONE = '#a89a80', STONE_D = '#867a64', STONE_L = '#c4b89e';
const TRIM = '#f8f4ec', GLASS = '#8fc4e0', GLASS_L = '#c8e6f4';
const DOORS = ['#c84a3a', '#3a7a9a', '#5a8a3a', '#e0a63a', '#7a4a9a'];
const IRON = '#3a3a3c', IRON_L = '#5c5c60', BRASS = '#e8b04a';
const TILE = '#c0663c', TILE_L = '#dc8a5a', TILE_D = '#8e4a2c', TILE_J = '#7a3e24';

/* --------------------------------------------------------------- maps --- */
const PLASTER_TILE = pm('plaster', `
PPPPPPPP
PPPpPPPP
PPPPPPPq
PPPPPPPP
PpPPPPPP
PPPPPqPP
PPPPPPPP
PPPPPPPp`);
const BRACE = pm('brace', `
BB......
BBB.....
.BBB....
..BBB...
...BBB..
....BBB.
.....BBB
......BB`);
const STONE_TILE = pm('stoneA', `
SSSSSsSSSSSS
SSSSSsSSSSSS
LLLLLLLLLLLL
SSsSSSSSSSsS
SSsSSSSSSSsS
LLLLLLLLLLLL`);
const ROOF_TILE = pm('pantile', `
LLLLLLLL
TTTjTTTj
ddTjddTj
LLLLLLLL
TjTTTjTT
djddTjdd`);
const WINDOW = pm('windowA', `
.........WWWWWW.........
........WWWWWWWW........
.......WWggGGGGWW.......
......WWgGGGGGGGWW......
.DDDD.WGGGGWWGGGGW.DDDD.
.DdDD.WGGGGWWGGGGW.DDdD.
.DDDD.WWWWWWWWWWWW.DDDD.
.DdDD.WGGGGWWGGGGW.DDdD.
.DDDD.WGGGGWWGGGGW.DDDD.
.DdDD.WGGGGWWGGGGW.DDdD.
.DDDD.WGGGGWWGGGGW.DDDD.
.DdDD.WGGGGWWGGGGW.DDdD.
.dddd.WWWWWWWWWWWW.dddd.
.....WWWWWWWWWWWWWW.....
....FfFFyFFfFFyFFfFF....
....FFFFFFFFFFFFFFFF....
....OOOOOOOOOOOOOOOO....
....OoOOoOOoOOoOOoOO....
....oooooooooooooooo....`);
const WINDOW_GLASS = { x: 7, y: 2, w: 10, h: 10 };   // inside the map, for the night glow
const DOOR = pm('doorA', `
......SSSSSSSS......
....SSSSSSSSSSSS....
...SSSOOOOOOOOSSS...
..SSOOOOOOOOOOOOSS..
..SOoOOoOOoOOoOOOS..
..SOoOOoOOoOOoOOOS..
..SOoOOKKKKKKoOOOS..
..SOoOOKGGGGKoOOOS..
..SOoOOKGgGGKoOOOS..
..SOoOOKGGGGKoOOOS..
..SOoOOKKKKKKoOOOS..
..SOoOOoOOoOOoOOOS..
..SIIIIoOOoOOoOOOS..
..SOoOOoOOoOOoOOOS..
${rep('..SOoOOoOOoOOoOOOS..', 8)}
..SOoOOoOOoOOoyyOS..
..SOoOOoOOoOOoOOOS..
${rep('..SOoOOoOOoOOoOOOS..', 6)}
..SIIIIoOOoOOoOOOS..
..SOoOOoOOoOOoOOOS..
..SOoOOoOOoOOoOOOS..
..SOoOOoOOoOOoOOOS..
.LLLLLLLLLLLLLLLLLL.
LssssssssssssssssssL`);
const DOOR_GLASS = { x: 8, y: 7, w: 4, h: 3 };
const CHIMNEY = pm('chimneyA', `
.RRRRRR.
.RrRRrR.
.RRRRRR.
BBBBBBBB
.RrRRrR.
.RRRRRR.
.rRRrRR.
.RRRRRR.
.RrRRrR.
.RRRRRR.
.rRRrRR.
.RRRRRR.
.RrRRrR.
.RRRRRR.
.rRRrRR.
.RRRRRR.
.RrRRrR.
.RRRRRR.`);
const DORMER = pm('dormerA', `
.........TT.........
........LTTL........
.......TTTTTT.......
......LTTTTTTL......
.....TTTTTTTTTT.....
....LTTTTTTTTTTL....
...TTTTTTTTTTTTTT...
..LTTTTTTTTTTTTTTL..
..jjjjjjjjjjjjjjjj..
.....PPWWWWWWPP.....
.....PPWGGGGWPP.....
.....PPWGgGGWPP.....
.....PPWWWWWWPP.....
.....PPWGGGGWPP.....
.....PPWGGGGWPP.....
.....PPWWWWWWPP.....
.....PPPPPPPPPP.....`);
const LAMP_HEAD = pm('lampA', `
....IIII....
...IIIIII...
..IIIIIIII..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IIIIIIII..
...IIIIII...
.....II.....
.....II.....`);
const LAMP_FOOT = pm('lampfootA', `
.....II.....
....IIII....
...IIIIII...
..IIIIIIII..`);
const LANTERN = pm('lanternA', `
..I..
.III.
.IGI.
.IGI.
.III.`);
const BARREL = pm('barrelA', `
.OOOOOOOO.
IIIIIIIIII
OlOOOOOoOO
OlOOOOOoOO
IIIIIIIIII
OlOOOOOoOO
OlOOOOOoOO
OlOOOOOoOO
IIIIIIIIII
OlOOOOOoOO
OlOOOOOoOO
IIIIIIIIII
.oooooooo.`);
const CRATE = pm('crateA', `
OOOOOOOOOO
OlllllllOO
OlOOOOOOoO
OlOOOOOOoO
OlOOOOOOoO
OllllllloO
OlOOOOOOoO
OlOOOOOOoO
OlOOOOOOoO
Ooooooooo0`);
const PLANTER = pm('planterA', `
..F..F..F..F..F.
.FfFFyFFfFFyFFfF
.FFFFFFFFFFFFFFF
RRRRRRRRRRRRRRRR
.RrRRRRRRRRRRrR.
.RrRRRRRRRRRRrR.
.RrRRRRRRRRRRrR.
.RrRRRRRRRRRRrR.
.rrrrrrrrrrrrrr.`);
const BENCH = pm('benchA', `
.OOOOOOOOOOOOOOOOOOOOOO.
.OllOOOOOOOOOOOOOOOOllO.
..II..................II
..II..................II
.OOOOOOOOOOOOOOOOOOOOOO.
.oooooooooooooooooooooo.
..II..................II
..II..................II
..II..................II`);
const BOARD = pm('boardA', `
..OOOOOOOOOOOOOOOOOOOOOO..
.OooooooooooooooooooooooO.
.OoPPPPPPPPPPPPPPPPPPPPoO.
.OoPWWWWWWWPPWWWWWWWWWPoO.
.OoPWkWkWWWPPWWkWkWkWWPoO.
.OoPWWWWWWWPPWWWWWWWWWPoO.
.OoPWkWkWkWPPWkWWWkWWWPoO.
.OoPWWWWWWWPPWWWWWWWWWPoO.
.OoPPPPPPPPPPPPPPPPPPPPoO.
.OoPPWWWWWWWWWWWWWWPPPPoO.
.OoPPWkWkWkWkWkWkWWPPPPoO.
.OoPPWWWWWWWWWWWWWWPPPPoO.
.OoPPPPPPPPPPPPPPPPPPPPoO.
.OooooooooooooooooooooooO.
..OOOOOOOOOOOOOOOOOOOOOO..
...........OOOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........
...........OoOO...........`);
const BASKET = pm('basketA', `
..fyfyfy..
.ffyffyff.
OOOOOOOOOO
OoOOoOOoOO
OOoOOoOOoO
oooooooooo`);
const FENCE = pm('fenceA', `
.OO..OO..OO..OO.
OOOOOOOOOOOOOOOO
.OO..OO..OO..OO.
.OO..OO..OO..OO.
.OO..OO..OO..OO.
OOOOOOOOOOOOOOOO
.OO..OO..OO..OO.
.OO..OO..OO..OO.
.oo..oo..oo..oo.`);
const POST = pm('postA', `
.OOOOO.
OOoOOOO
.OoOOO.
.OoOOO.
.OoOOO.
.OoOOO.
.OoOOO.
.OoOOO.
.OoOOO.
.OoOOO.
.ooooo.`);
const DINGHY = pm('dinghyA', `
O..........................O
OO........................OO
.OOOOOOOOOOOOOOOOOOOOOOOOOO.
.OWWWWWWWWWWWWWWWWWWWWWWWWO.
..OwwwwwwwwwwwwwwwwwwwwwwO..
...OOOOOOOOOOOOOOOOOOOOOO...
....oooooooooooooooooooo....`);
const POT = pm('potA', `
.OOOOOO.
OoOoOoOO
OOoOoOoO
OoOoOoOO
OOoOoOoO
OoOoOoOO
.oooooo.`);
const HULL = pm('hullA', `
...........KKKKK...........
........BBBBBBBBBBB........
.....BBBbBBBBBBBBBbBBB.....
...BBBBBBBBBBBBBBBBBBBBB...
..BBBBbBBBBBBBBBBBBBbBBBB..
.BBBBBBBBBBBBBBBBBBBBBBBBB.
.WWWWWWWWWWWWWWWWWWWWWWWWW.
..wwwwwwwwwwwwwwwwwwwwwww..`);
const ANCHOR = pm('anchorA', `
.....II.....
....I..I....
.....II.....
......I.....
..IIIIIII...
......I.....
......I.....
.I....I....I
.II...I...II
..III.I.III.`);
const FISH_ICON = pm('fishA', `
...........
.....BBBB..
..BBBBBBBB.
.BEBBBBBBBB
..BBBBBBBB.
.....BBBB..
...........`);
const ROD_ICON = pm('rodA', `
O..........
.O.........
..O........
...O.......
....O......
.....O..R..
......O.R..
.......OR..
........R..
.......RRR.`);
const BUNTING = pm('buntingA', `
IIIIII
.CCCC.
.CCCC.
..CC..`);
const LEAF = pm('leafA', `
GGLLGGGGGgGG
GLLLGGGGggGG
GGLGGGLGGGGG
GGGGGLLLGGgG
GgGGGGLGGGGG
GggGGGGGGLLG
GGGGGLGGGLLG
GGGGLLLGGGGG
LGGGGLGGgGGG
LLGGGGGGggGG
GLGGgGGGGGGL
GGGGggGGGGGG`);
const TRUNK = pm('trunkA', `
.OOOoOOO.
.OOOoOOOO
.OOOoOOO.
.OOooOOO.
..OOoOO..
..OOoOO..
..OOoOO..
..OOoOO..
..OOoOO..
..OoOOO..
..OoOOO..
..OoOOO..
..OoOOO..
..OoOOO..
..OoOOO..
.OOoOOOO.
OOOoOOOOO
.oooooooo`);

const COBBLE = pm('cobbleA', `
CccCCCcC
cGGcGGGc
CccCCCcC
GGcGGGcG
GGcGGGcG`);
const ROSE = pm('roseA', `
.......SSSSSS.......
.....SSSSSSSSSS.....
....SSSGGGGGGSSS....
...SSGGGGWWGGGGSS...
..SSGGGGGWWGGGGGSS..
..SGGGGGGWWGGGGGGS..
.SSGGWGGGWWGGGWGGSS.
.SGGGGWGGWWGGWGGGGS.
.SGGGGGWGWWGWGGGGGS.
.SGWWWWWWWWWWWWWWGS.
.SGWWWWWWWWWWWWWWGS.
.SGGGGGWGWWGWGGGGGS.
.SGGGGWGGWWGGWGGGGS.
.SSGGWGGGWWGGGWGGSS.
..SGGGGGGWWGGGGGGS..
..SSGGGGGWWGGGGGSS..
...SSGGGGWWGGGGSS...
....SSSGGGGGGSSS....
.....SSSSSSSSSS.....
.......SSSSSS.......`);
const CLOCK = pm('clockA', `
...WWWWWW...
..WWWWWWWW..
.WWWWkWWWWW.
.WWWWWWWWWW.
WWWWWWWWWWWW
WWkWWWkWWkWW
WWWWWWWkWWWW
.WWWWWWWWWW.
.WWWWkWWWWW.
..WWWWWWWW..
...WWWWWW...`);
const BELL = pm('bellA', `
....yy....
...yyyy...
...yyyy...
..yyyyyy..
..yyyyyy..
..yyyyyy..
.yyyyyyyy.
yyyyyyyyyy
....oo....`);
const CROSS = pm('crossA', `
..I..
.III.
..I..
..I..
..I..
..I..`);
const PLANK = pm('plankA', `
DdDDDdDD
DdDDDdDD
DdDDDdDD
DdDDDdDD`);


/* ----------------------------------------------------------- palettes --- */
const P = {
  wall: (tone) => ({ P: PLASTER[tone % 4], p: scale(PLASTER[tone % 4], 0.93), q: '#ffffff' }),
  brace: { B: BEAM },
  stone: { S: STONE, s: STONE_D, L: STONE_L },
  roof: { L: TILE_L, T: TILE, j: TILE_J, d: TILE_D },
  window: (door) => ({ W: TRIM, G: GLASS, g: GLASS_L, D: door, d: scale(door, 0.7), F: '#4a7a3a', f: '#e0685a', y: '#f2c14e', O: '#8a6a44', o: '#5a4030' }),
  door: { S: STONE, O: '#8a5a3a', o: '#6a4028', K: '#2a2018', G: GLASS, g: GLASS_L, I: IRON, y: BRASS, L: STONE_L, s: STONE_D },
  chimney: { R: '#9a5a48', r: '#7a4436', B: STONE_D },
  dormer: { T: TILE, L: TILE_L, j: TILE_J, P: PLASTER[2], W: TRIM, G: GLASS, g: GLASS_L },
  lamp: { I: IRON, G: '#5a5248' },
  lantern: { I: IRON, G: '#5a5248' },
  wood: { O: '#8a6a44', o: '#5a4030', l: '#a88a5c', I: IRON, 0: '#5a4030' },
  planter: { F: '#4a7a3a', f: '#e0685a', y: '#f2c14e', R: '#a05a3a', r: '#7a4030' },
  board: { O: '#8a6a44', o: '#5a4030', P: '#f4e6c0', W: '#e8e2d2', k: '#6a6050' },
  basket: { O: '#c9a86a', o: '#a08850', f: '#e0685a', y: '#f2c14e' },
  dinghy: { O: '#5a3e2a', W: '#e8e2d2', w: '#c8c2b2', o: '#3e2a1c' },
  hull: { W: '#e8e2d2', w: '#c8c2b2', B: '#3d6b8a', b: '#5a8ab0', K: '#2d3038' },
  icon: { I: IRON_L, B: '#8ab4c8', E: '#1a1712', O: '#c9b28a', R: '#e0685a' },
  leaf: { L: '#6da05a', G: '#4a8448', g: '#33623a' },
  trunk: { O: '#6a4a30', o: '#4a3020' },
};

/* ------------------------------------------------------------- parts --- */
/** Plaster with a timber frame: posts, a rail at each floor, braces in the corners, a stone plinth. */
function wall(g, x, y, w, h, tone, opts = {}) {
  const G0 = opts.ground;
  fillTile(g, x, y, w, h, PLASTER_TILE, P.wall(tone), x, y);
  const floors = opts.floors || 1, fh = Math.floor((h - 12) / floors);
  // rails
  for (let f = 0; f <= floors; f++) { const ry = y + h - 12 - f * fh; if (ry >= y) { rect(g, x, ry, w, 3, BEAM); hline(g, x, ry, w, BEAM_L); } }
  hline(g, x, y, w, BEAM);
  // posts: at the ends and every ~20 px; braces beside the corner posts on each floor
  const n = Math.max(1, Math.round((w - 3) / 22)), step = (w - 3) / n;
  for (let i = 0; i <= n; i++) { const px = Math.round(x + i * step); rect(g, px, y, 3, h - 12, BEAM); vline(g, px, y, h - 12, BEAM_L); }
  const brace = sprite(BRACE, P.brace), braceF = sprite(BRACE, P.brace, true);
  for (let f = 0; f < floors; f++) {
    const ry = y + h - 12 - f * fh;
    g.drawImage(braceF, x + 3, ry - 11); g.drawImage(brace, x + w - 11, ry - 11);
  }
  // jetty: the upper floor oversails the ground floor on a row of joist ends
  if (floors > 1 && opts.jetty !== false) { const jy = y + h - 12 - fh; rect(g, x - 3, jy + 3, w + 6, 3, BEAM_D); for (let jx = x - 1; jx < x + w; jx += 6) rect(g, jx, jy + 2, 3, 4, BEAM_L); eaveShadow(g, x, jy + 6, w, 3); }
  // stone plinth
  fillTile(g, x, G0 - 12, w, 12, STONE_TILE, P.stone, x, G0 - 12);
  hline(g, x, G0 - 12, w, STONE_L);
}

/** Pantile roof: a slope narrow at the ridge, a fascia board, ridge tiles, a shadow on the wall. */
function roof(g, x, y, w, kind = 'hip', pitch = 16, snow = false) {
  const s = roofSlope(g, { x, y, w, pitch, overhang: 7, ridge: kind === 'gable' ? 2 : null, rows: ROOF_TILE, pal: P.roof, ox: x });
  // ridge tiles
  rect(g, s.x - 1, s.y - 1, s.w + 2, 2, TILE_D); hline(g, s.x, s.y - 2, s.w, TILE_L);
  // fascia and the shadow it throws
  rect(g, s.eaveL, s.bottom + 1, s.eaveW, 2, BEAM); hline(g, s.eaveL, s.bottom + 1, s.eaveW, BEAM_L);
  eaveShadow(g, x, s.bottom + 3, w, 4);
  if (snow) { rect(g, s.x - 2, s.y - 4, s.w + 4, 3, '#eef2f6'); rect(g, s.eaveL, s.bottom - 1, s.eaveW, 2, '#eef2f6'); }
  return s;
}

function chimney(g, x, y) { g.drawImage(sprite(CHIMNEY, P.chimney), x, y - 18); return { x: x + 4, y: y - 18 }; }
function dormer(g, cx, y) { g.drawImage(sprite(DORMER, P.dormer), cx - 10, y - 17); return { x: cx - 2, y: y - 7, w: 4, h: 5, seed: cx }; }

/** An arched window with shutters in the door colour and a flower box. Returns the glass rect. */
function windowAt(g, x, y, door) {
  g.drawImage(sprite(WINDOW, P.window(door)), x - 12, y);
  return { x: x - 12 + WINDOW_GLASS.x, y: y + WINDOW_GLASS.y, w: WINDOW_GLASS.w, h: WINDOW_GLASS.h, arch: true, seed: x * 3 + y };
}
/** An oak door in a stone arch, centred on cx with its step on ground. Returns the glass rect. */
function doorAt(g, cx, ground) {
  const top = ground - DOOR.length + 1;
  g.drawImage(sprite(DOOR, P.door), cx - 10, top);
  return { x: cx - 10 + DOOR_GLASS.x, y: top + DOOR_GLASS.y, w: DOOR_GLASS.w, h: DOOR_GLASS.h, door: true, seed: cx };
}
/** A wall lantern on a bracket; returns the lamp entry. */
function lanternAt(g, x, y) {
  rect(g, x - 3, y - 1, 4, 1, IRON); g.drawImage(sprite(LANTERN, P.lantern), x - 2, y);
  return { x: x, y: y + 2, r: 34, wall: true, glass: [x - 1, y + 2, 1, 2] };
}
/** A big shop window with a striped awning above it. Returns the glass rect. */
function shopWindow(g, x, y, w, h, door, kind) {
  rect(g, x - 2, y - 2, w + 4, h + 4, BEAM); rect(g, x - 1, y - 1, w + 2, h + 2, TRIM);
  rect(g, x, y, w, h, GLASS); rect(g, x, y, w, 2, GLASS_L); rect(g, x + 1, y + 2, 1, h - 4, GLASS_L);
  rect(g, x + (w >> 1), y, 1, h, TRIM); rect(g, x, y + (h >> 1) - 1, w, 1, TRIM);
  // awning: stripes in the door colour, a scalloped valance below
  const light = mix(door, '#ffffff', 0.55);
  for (let i = 0; i < 6; i++) rect(g, x - 5, y - 12 + i, w + 10, 1, i === 0 ? scale(door, 0.7) : door);
  for (let xx = x - 5; xx < x + w + 5; xx += 6) rect(g, xx, y - 11, 3, 5, light);
  for (let xx = x - 5; xx < x + w + 5; xx += 4) { rect(g, xx, y - 6, 4, 1, door); rect(g, xx + 1, y - 5, 2, 1, door); }
  eaveShadow(g, x - 2, y - 4, w + 4, 2);
  // goods on show
  if (kind === 'fish') { rect(g, x + 2, y + h - 8, w - 4, 6, '#e8f2f4'); rect(g, x + 2, y + h - 8, w - 4, 1, '#ffffff'); for (let i = 0; i < Math.floor((w - 6) / 12); i++) g.drawImage(sprite(FISH_ICON, { B: i % 2 ? '#8ab4c8' : '#d8b86a', E: '#1a1712' }), x + 3 + i * 12, y + h - 13); }
  if (kind === 'rod') { for (let i = 0; i < Math.floor((w - 8) / 9); i++) { rect(g, x + 5 + i * 9, y + 4, 1, h - 10, i % 2 ? '#c9b28a' : '#8a6a48'); rect(g, x + 4 + i * 9, y + 10 + (i % 3) * 3, 3, 2, '#e0685a'); } rect(g, x + 3, y + h - 6, w - 6, 2, '#5a4030'); }
  return { x, y, w, h, shop: true, seed: x };
}
/** A hanging sign: iron bracket, oak board, painted name and icon. */
function sign(g, cx, y, label, icon) {
  const w = textWidth(label) + 26;
  rect(g, cx - w / 2 - 4, y - 14, w + 4, 2, IRON); rect(g, cx - w / 2 - 4, y - 14, 2, 10, IRON);
  for (const rx of [cx - w / 2 + 2, cx + w / 2 - 3]) rect(g, rx, y - 12, 1, 3, IRON);
  rect(g, cx - w / 2 - 1, y - 9, w + 2, 17, '#5a3e2a'); rect(g, cx - w / 2, y - 8, w, 15, '#f4e6c0'); hline(g, cx - w / 2, y - 8, w, '#fff8e0');
  rect(g, cx - w / 2 + 1, y - 7, w - 2, 1, mix('#f4e6c0', door0, 0.3));
  text(g, label, cx + 8, y - 4, { color: '#5a3e2a', align: 'center', shadow: false });
  const ic = icon === 'fish' ? FISH_ICON : icon === 'rod' ? ROD_ICON : ANCHOR;
  g.drawImage(sprite(ic, P.icon), cx - w / 2 + 3, y - 6);
}
const door0 = DOORS[0];

function lampPost(g, x, ground) {
  g.drawImage(sprite(LAMP_FOOT, P.lamp), x - 6, ground - 4);
  rect(g, x - 1, ground - 46, 2, 42, IRON); vline(g, x - 1, ground - 46, 42, IRON_L);
  g.drawImage(sprite(LAMP_HEAD, P.lamp), x - 6, ground - 56);
  return { x, y: ground - 50, r: 64, glass: [x - 3, ground - 53, 6, 4] };
}

function tree(g, x, ground, opts = {}) {
  g.drawImage(sprite(TRUNK, P.trunk), x - 4, ground - 18);
  rect(g, x - 2, ground - 40, 4, 24, '#6a4a30'); vline(g, x - 1, ground - 40, 24, '#4a3020');
  const leaf = P.leaf, blobs = [[0, -56, 26, 20], [-14, -66, 16, 13], [14, -62, 15, 12], [-4, -76, 12, 9], [8, -46, 12, 8]];
  for (const [dx, dy, rx, ry] of blobs) {
    g.save(); g.beginPath(); g.ellipse(x + dx, ground + dy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    fillTile(g, x + dx - rx, ground + dy - ry, rx * 2, ry * 2, LEAF, leaf, x, ground);
    g.restore();
  }
  // a darker underside and a lit crown
  for (const [dx, dy, rx, ry] of [[0, -48, 22, 6], [14, -54, 10, 5]]) { g.save(); g.beginPath(); g.ellipse(x + dx, ground + dy, rx, ry, 0, 0, Math.PI * 2); g.clip(); fillTile(g, x + dx - rx, ground + dy - ry, rx * 2, ry * 2, LEAF, { L: '#4a8448', G: '#33623a', g: '#254a2c' }, x + 1, ground); g.restore(); }
  for (const [dx, dy, rx, ry] of [[-8, -78, 8, 4], [2, -70, 6, 3]]) { g.save(); g.beginPath(); g.ellipse(x + dx, ground + dy, rx, ry, 0, 0, Math.PI * 2); g.clip(); fillTile(g, x + dx - rx, ground + dy - ry, rx * 2, ry * 2, LEAF, { L: '#9ccc7a', G: '#7ab868', g: '#5e9a4e' }, x + 2, ground); g.restore(); }
  const lamps = [];
  if (opts.lanterns) for (let k = 0; k < 6; k++) { const lx = x - 22 + k * 9, ly = ground - 52 + (k % 2) * 5; rect(g, lx, ly - 3, 1, 3, IRON); g.drawImage(sprite(LANTERN, { I: IRON, G: '#e8b04a' }), lx - 2, ly); lamps.push({ x: lx, y: ly + 2, r: 22, wall: true, tree: true, glass: [lx - 1, ly + 2, 1, 2] }); }
  return lamps;
}

function well(g, cx, ground) {
  // stone ring, oak posts, a tiled hood, windlass and bucket
  fillTile(g, cx - 14, ground - 14, 28, 14, STONE_TILE, P.stone, cx - 14, ground - 14);
  rect(g, cx - 15, ground - 15, 30, 2, STONE_L); rect(g, cx - 10, ground - 13, 20, 3, '#1a1a1c');
  for (const px of [cx - 12, cx + 9]) { rect(g, px, ground - 44, 3, 30, '#6a4a30'); vline(g, px, ground - 44, 30, '#8a6a44'); }
  rect(g, cx - 13, ground - 34, 26, 2, '#6a4a30'); rect(g, cx - 2, ground - 34, 4, 2, IRON);
  const s = roofSlope(g, { x: cx - 12, y: ground - 44, w: 24, pitch: 9, overhang: 5, ridge: 4, rows: ROOF_TILE, pal: P.roof, ox: cx });
  rect(g, s.x, s.y - 1, s.w, 1, TILE_D);
  rect(g, cx, ground - 32, 1, 11, '#c9b28a'); rect(g, cx - 3, ground - 21, 6, 5, '#7a7a76'); hline(g, cx - 3, ground - 21, 6, '#a0a09c');
}

function stall(g, cx, ground, tint) {
  // trestle table with baskets, canvas awning with a scalloped valance
  rect(g, cx - 22, ground - 20, 44, 3, '#8a6a44'); hline(g, cx - 22, ground - 20, 44, '#a88a5c');
  for (const px of [cx - 20, cx + 17]) rect(g, px, ground - 17, 3, 17, '#5a4030');
  rect(g, cx - 18, ground - 12, 36, 1, '#5a4030');
  for (let i = 0; i < 3; i++) g.drawImage(sprite(BASKET, P.basket), cx - 17 + i * 12, ground - 26);
  for (const px of [cx - 25, cx + 22]) { rect(g, px, ground - 50, 3, 30, '#5a4030'); vline(g, px, ground - 50, 30, '#8a6a44'); }
  const light = '#f4efe2';
  for (let i = 0; i < 7; i++) rect(g, cx - 29, ground - 56 + i, 58, 1, i === 0 ? scale(tint, 0.7) : tint);
  for (let xx = cx - 29; xx < cx + 29; xx += 6) rect(g, xx, ground - 55, 3, 6, light);
  for (let xx = cx - 29; xx < cx + 29; xx += 4) { rect(g, xx, ground - 49, 4, 1, tint); rect(g, xx + 1, ground - 48, 2, 1, tint); }
}

function fence(g, x, ground, w) { for (let xx = x; xx < x + w; xx += 16) g.drawImage(sprite(FENCE, P.wood), xx, ground - 9); }
function bench(g, x, ground) { g.drawImage(sprite(BENCH, P.wood), x, ground - 9); }
function board(g, x, ground) { g.drawImage(sprite(BOARD, P.board), x, ground - 24); }
function barrel(g, x, ground) { g.drawImage(sprite(BARREL, P.wood), x, ground - 13); }
function crate(g, x, ground) { g.drawImage(sprite(CRATE, P.wood), x, ground - 10); }
function planter(g, x, ground) { g.drawImage(sprite(PLANTER, P.planter), x, ground - 9); }
function post(g, x, ground) { g.drawImage(sprite(POST, P.wood), x, ground - 11); }
function dinghy(g, x, ground) { g.drawImage(sprite(DINGHY, P.dinghy), x, ground - 7); }
function pot(g, x, ground) { g.drawImage(sprite(POT, P.wood), x, ground - 7); }
function hull(g, x, y) { g.drawImage(sprite(HULL, P.hull), x, y); }
function buntingAt(g, x, y, col) { g.drawImage(sprite(BUNTING, { I: IRON, C: col }), x, y); }


/** A number plate by the door. */
function numberPlate(g, x, y, num) { rect(g, x - 5, y - 2, 11, 11, BEAM); rect(g, x - 4, y - 1, 9, 9, TRIM); text(g, String(num), x + 1, y, { color: BEAM, align: 'center', shadow: false }); }

/** A gable-fronted house: the wall rises into a triangle framed by bargeboards; a little attic window. */
function gableRoof(g, x, y, w, gh, snow) {
  const cx = x + (w >> 1);
  // the plaster triangle with a centre post and braces
  for (let i = 0; i < gh; i++) { const t = i / (gh - 1), width = Math.max(2, Math.round((w + 6) * t)), left = Math.round(cx - width / 2), yy = y - gh + i; fillTile(g, left, yy, width, 1, PLASTER_TILE, P.wall(2), x, y); }
  rect(g, cx - 1, y - gh + 6, 3, gh - 6, BEAM); vline(g, cx - 1, y - gh + 6, gh - 6, BEAM_L);
  rect(g, x + 2, y - 3, w - 4, 3, BEAM); hline(g, x + 2, y - 3, w - 4, BEAM_L);
  for (let i = 0; i < Math.round(gh * 0.6); i++) { rect(g, cx - 10 - i, y - 6 - i, 1, 1, BEAM); rect(g, cx + 10 + i, y - 6 - i, 1, 1, BEAM); }
  // bargeboards down both slopes, and a tile edge showing above them
  for (let i = 0; i < gh + 3; i++) { const t = i / (gh + 2), half = Math.round(((w + 14) / 2) * t); rect(g, cx - half - 2, y - gh - 3 + i, 3, 1, i % 4 === 0 ? TILE_L : TILE); rect(g, cx + half - 1, y - gh - 3 + i, 3, 1, i % 4 === 0 ? TILE_L : TILE); rect(g, cx - half - 1, y - gh - 2 + i, 2, 1, BEAM_D); rect(g, cx + half - 1, y - gh - 2 + i, 2, 1, BEAM_D); }
  rect(g, cx - 2, y - gh - 5, 4, 3, TILE_D); rect(g, cx - 1, y - gh - 7, 2, 2, BRASS);
  eaveShadow(g, x, y, w, 2);
  if (snow) { for (let i = 0; i < gh + 3; i += 1) { const t = i / (gh + 2), half = Math.round(((w + 14) / 2) * t); rect(g, cx - half - 3, y - gh - 5 + i, 3, 1, '#eef2f6'); rect(g, cx + half, y - gh - 5 + i, 3, 1, '#eef2f6'); } }
  // attic window
  rect(g, cx - 5, y - Math.round(gh * 0.5) - 1, 10, 9, TRIM); rect(g, cx - 4, y - Math.round(gh * 0.5), 8, 7, GLASS); rect(g, cx - 4, y - Math.round(gh * 0.5), 8, 1, GLASS_L); rect(g, cx, y - Math.round(gh * 0.5), 1, 7, TRIM);
}

/** The boatyard's tall sliding doors, one rolled open to show a hull in the dark. */
function slidingDoors(g, x, ground, w, h, out) {
  const door = DOORS[0], y = ground - h;
  rect(g, x - 3, y - 6, w + 6, h + 6, BEAM); rect(g, x - 2, y - 5, w + 4, h + 5, BEAM_D);
  rect(g, x + 22, y, 24, h, '#141820'); hull(g, x + 20, ground - 30); rect(g, x + 24, ground - 20, 16, 2, '#5a4030');
  out.windows.push({ x: x + 22, y: y + 6, w: 24, h: 30, shop: true, seed: x, dim: true });
  fillTile(g, x, y, 22, h, PLANK, { D: door, d: scale(door, 0.72) }, x, y); fillTile(g, x + 46, y, w - 46, h, PLANK, { D: door, d: scale(door, 0.72) }, x + 46, y);
  rect(g, x, y + 24, 22, 2, scale(door, 0.6)); rect(g, x + 46, y + 24, w - 46, 2, scale(door, 0.6));
  rect(g, x - 4, y - 8, w + 8, 3, IRON); for (let k = 0; k < w + 8; k += 6) rect(g, x - 4 + k, y - 7, 2, 2, IRON_L);
  rect(g, x + 4, y - 4, 3, 4, IRON); rect(g, x + 52, y - 4, 3, 4, IRON);
}

/** A stone chapel wall with buttresses. */
function chapelWall(g, x, y, w, h, ground) {
  fillTile(g, x, y, w, h, STONE_TILE, P.stone, x, y); hline(g, x, y, w, STONE_L);
  for (const bx of [x + 4, x + w - 10]) { rect(g, bx, y + 30, 6, h - 30, STONE_D); rect(g, bx + 1, y + 30, 4, h - 30, STONE); rect(g, bx - 1, y + 28, 8, 3, STONE_L); }
}
function roseWindow(g, cx, y) { g.drawImage(sprite(ROSE, { S: STONE_D, G: GLASS, W: TRIM }), cx - 10, y - 10); return { x: cx - 8, y: y - 8, w: 16, h: 16, shop: true, round: true, seed: cx }; }
function tower(g, cx, y, out, snow) {
  const tx = cx - 12, ty = y - 40;
  fillTile(g, tx, ty, 24, 46, STONE_TILE, P.stone, tx, ty); rect(g, tx, ty, 1, 46, STONE_L); rect(g, tx + 23, ty, 1, 46, STONE_D);
  g.drawImage(sprite(CLOCK, { W: '#f4efe2', k: '#2a2018' }), cx - 6, ty + 5); out.clock = { x: cx, y: ty + 10 };
  rect(g, tx + 7, ty + 20, 10, 14, '#1a1a1c'); rect(g, tx + 8, ty + 18, 8, 2, '#1a1a1c'); g.drawImage(sprite(BELL, { y: BRASS, o: '#8a6a3a' }), tx + 7, ty + 23);
  rect(g, tx - 2, ty + 46, 28, 2, STONE_D);
  gable(g, tx - 3, ty, 30, 18, ROOF_TILE, P.roof);
  rect(g, tx - 3, ty - 1, 30, 2, BEAM); g.drawImage(sprite(CROSS, { I: IRON_L }), cx - 2, ty - 24);
  if (snow) for (let i = 0; i < 18; i += 2) { const half = Math.round(15 * i / 17); rect(g, cx - half - 2, ty - 18 + i, 2, 1, '#eef2f6'); rect(g, cx + half, ty - 18 + i, 2, 1, '#eef2f6'); }
}
function squareWall(g, x0, x1, ground, snow) {
  fillTile(g, x0, ground - 20, x1 - x0, 20, STONE_TILE, P.stone, x0, ground - 20); rect(g, x0 - 1, ground - 22, x1 - x0 + 2, 2, STONE_L);
  for (let xx = x0 + 8; xx < x1 - 6; xx += 12) { rect(g, xx, ground - 27, 6, 5, '#4a7a3a'); rect(g, xx + 1, ground - 29, 2, 2, ['#e0685a', '#f2c14e', '#c86a9a'][(xx / 12 | 0) % 3]); rect(g, xx + 4, ground - 28, 2, 2, '#5e9a4e'); }
  if (snow) rect(g, x0 - 1, ground - 23, x1 - x0 + 2, 2, '#eef2f6');
}
function paving(g, x, y, w, h) {
  fillTile(g, x, y, w, h, COBBLE, { C: '#c8b898', c: '#98886a', G: '#b8a888' }, 0, y);
  rect(g, x, y + 30, w, 1, '#a09070'); rect(g, x, y + 34, w, 1, '#a09070');
}
function snowGround(g, x, y, w, h) { rect(g, x, y, w, 3, '#dfe5ea'); for (let yy = y + 10; yy < y + h; yy += 2) for (let xx = x + (yy % 4 ? 0 : 2); xx < x + w; xx += 4) if (hash(xx, yy) < 0.6) rect(g, xx, yy, 2, 1, '#dfe5ea'); }

export const KIT_A = {
  name: 'storybook', doors: DOORS, beam: BEAM, trim: TRIM, glass: GLASS, stone: STONE, iron: IRON,
  ground: { cobble: '#b8a888', cobble2: '#a09070', kerb: '#c8bca0' },
  wall, roof, chimney, dormer, windowAt, doorAt, lanternAt, shopWindow, sign, lampPost, tree, well, stall,
  fence, bench, board, barrel, crate, planter, post, dinghy, pot, hull, buntingAt,
  numberPlate, gableRoof, slidingDoors, chapelWall, roseWindow, chapelDoor: DOORS[4], tower, squareWall, paving, snowGround,
  stallTints: [DOORS[3], DOORS[1]], stoneLight: STONE_L, stoneDark: STONE_D,
  roofPattern: ROOF_TILE, roofPal: P.roof, stoneTile: STONE_TILE, stonePal: P.stone, plasterTile: PLASTER_TILE, wallPal: P.wall,
  bunting: ['#e0685a', '#f2c14e', '#7fe0c3', '#8fb4e0'],
  windowW: 24, windowH: 19, doorH: DOOR.length,
  curtain: seed => ['#c86a5a', '#7a9ac8', '#e8c26a', '#8fb48a'][Math.floor(hash(seed, 9) * 4)],
};

// Maps the other kits borrow (with their own palettes)
export const MAPS = { BARREL, CRATE, BENCH, BOARD, FENCE, POST, DINGHY, POT, BASKET, LANTERN, BUNTING, BRACE, ANCHOR, FISH_ICON, ROD_ICON, CLOCK, BELL, CROSS, HULL, STONE_TILE, COBBLE, ROSE, LEAF, TRUNK, PLANK };
