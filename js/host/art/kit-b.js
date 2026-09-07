// Town kit B, "moody harbour": painted clapboard in faded colours, slate and corrugated
// iron, sash windows, plank doors with iron straps, painted wall signs, bollards and
// chains, lobster pots, nets and buoys, wet flagstones. Cool and weathered.
import { pm } from './px.js';
import { rect, hline, vline, fillTile, roofSlope, gable, eaveShadow, scale, mix } from './kit.js';
import { sprite, text, textWidth, hash } from '../gfx.js';
import { MAPS } from './kit-a.js';
import { TOWN } from '../../game/world.js';

const rep = (row, n) => Array(n).fill(row).join('\n');

/* ------------------------------------------------------------ palette --- */
const PAINT = ['#6a7a86', '#8a4e3a', '#9a8a60', '#3e5048', '#a8a498'];
const TRIM = '#ddd6c4', TRIM_D = '#b8b0a0';
const GLASS = '#4c6a86', GLASS_L = '#7a98b0';
const DOORS = ['#3a4a5a', '#5a3a2a', '#2e4a3e', '#6a6a60', '#4a3a4a'];
const IRON = '#2d3038', IRON_L = '#4a4e58', RUST = '#8a4a2a', BRASS = '#b8863a';
const SLATE = '#3e4650', SLATE_L = '#5a6470', SLATE_D = '#2c323a';
const STONE = '#6a6a66', STONE_D = '#4e4e4c', STONE_L = '#8a8a86';
const TAR = '#26262a', TAR_L = '#36363c';

/* --------------------------------------------------------------- maps --- */
const CLAP = pm('clap', `
llllllll
BBBBBBBB
BBBBBBBB
dddddddd`);
const TARBOARD = pm('tarboard', `
TtTTTTTt
TtTTTTTt
TtTTTTTt
TtTTTTTt
TtTTTTTt
TtTTTTTt
TtTTTlTt
TtTTTTTt`);
const SLATE_TILE = pm('slate', `
dddddddd
SSSdSSSd
SSSdSSSd
SSSdSSSd
dddddddd
SdSSSdSS
SdSSSdSS
SdSSSdSS`);
const IRON_ROOF = pm('ironroof', `
LSSdLSSd
LSSdLSSd`);
const STONE_TILE = pm('stoneB', `
SSSSSsSSSSSS
SSSSSsSSSSSS
dddddddddddd
SSsSSSSSSSsS
SSsSSSSSSSsS
dddddddddddd`);
const WINDOW = pm('windowB', `
.WWWWWWWWWWWWWW.
.WGGGGGGWGGGGGW.
.WGgGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WWWWWWWWWWWWWW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WGGGGGGWGGGGGW.
.WWWWWWWWWWWWWW.
SSSSSSSSSSSSSSSS
ssssssssssssssss
...r........r...
...r.........r..
....r........r..`);
const WINDOW_GLASS = { x: 2, y: 1, w: 12, h: 11 };
const BOARDS = pm('boardsB', `
................
.PpPPPPPPPPPpPP.
.PPPPPPpPPPPPPP.
................
................
.PPPpPPPPPPPPPP.
.PPPPPPPPpPPPPP.
................
................
.PpPPPPPPPPPpPP.
.PPPPPPPpPPPPPP.
................`);
const DOOR = pm('doorB', `
..KKKKKKKKKKKKKKKK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDKKKKKKKKKDdK..
..KDdDKGGGKGGGKDdK..
..KDdDKGgGKGGGKDdK..
..KDdDKKKKKKKKKDdK..
..KDdDKGGGKGGGKDdK..
..KDdDKGGGKGGGKDdK..
..KDdDKKKKKKKKKDdK..
..KDdDDdDDdDDdDDdK..
..KIIIIIIIdDDdDDdK..
..KDdDDdDDdDDdDDdK..
${rep('..KDdDDdDDdDDdDDdK..', 6)}
..KDdDDdDDdDDdyyDK..
..KDdDDdDDdDDdDDdK..
${rep('..KDdDDdDDdDDdDDdK..', 6)}
..KIIIIIIIdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
..KDdDDdDDdDDdDDdK..
.SSSSSSSSSSSSSSSSSS.
ssssssssssssssssssss`);
const DOOR_GLASS = { x: 7, y: 7, w: 7, h: 5 };
const CHIMNEY = pm('chimneyB', `
.PP..PP.
.PP..PP.
.pp..pp.
BBBBBBBB
.BbBBbB.
.BBBBBB.
.bBBbBB.
.BBBBBB.
.BbBBbB.
.BBBBBB.
.bBBbBB.
.BBBBBB.
.BbBBbB.
.BBBBBB.
.bBBbBB.
.BBBBBB.
.BbBBbB.
.BBBBBB.`);
const DORMER = pm('dormerB', `
.........SS.........
........SSSS........
.......SSSSSS.......
......SSSSSSSS......
.....SSSSSSSSSS.....
....SSSSSSSSSSSS....
...SSSSSSSSSSSSSS...
..SSSSSSSSSSSSSSSS..
..dddddddddddddddd..
.....PPWWWWWWPP.....
.....PPWGGGGWPP.....
.....PPWGgGGWPP.....
.....PPWWWWWWPP.....
.....PPWGGGGWPP.....
.....PPWGGGGWPP.....
.....PPWWWWWWPP.....
.....PPPPPPPPPP.....`);
const LAMP_HEAD = pm('lampB', `
.....II.....
...IIIIII...
..IIIIIIII..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IGGGGGGI..
..IIIIIIII..
.IIIIIIIIII.
.....II.....
.....II.....`);
const LAMP_FOOT = pm('lampfootB', `
....IIII....
....IIII....
...IIIIII...
..IIIIIIII..`);
const LANTERN = pm('lanternB', `
IIIII..
....I..
..IIIII
..IGGGI
..IGGGI
..IGGGI
..IIIII
...III.`);
const BOLLARD = pm('bollard', `
.IIII.
IIIIII
IIIIII
.IIII.
.IIII.
.IlII.
.IlII.
.IlII.
.IIII.
IIIIII`);
const LOBSTER_POT = pm('pot', `
..OOOOOOOO..
.O.O.O.O.O.O
O.O.O.O.O.O.
.O.O.O.O.O.O
O.O.O.O.O.O.
OOOOOOOOOOOO
OoOoOoOoOoOo
oooooooooooo`);
const BUOY = pm('buoy', `
...I...
..RRR..
.RRRRR.
.WWWWW.
.RRRRR.
..RRR..
...R...`);
const DRUM = pm('drum', `
.IIIIIIII.
IIIIIIIIII
IlIIIIrIII
IlIIIIrIII
IIIIIIIIII
IlIIIIrrII
IlIIIIIrII
IlIIIIIrII
IIIIIIIIII
IlIIIIIIII
IlIIIIIIII
IIIIIIIIII
.iiiiiiii.`);
const ROPE = pm('rope', `
..RRRRRRRR..
.RrRRRRRRrR.
RrRRRRRRRRrR
RRrRRRRRRrRR
.RRrrRRrrRR.
..RRRRRRRR..`);
const CRATE_FISH = pm('cratefish', `
OOOOOOOOOOOOOO
OwFFwFFwFFwFFO
OlOOOOOOOOOOoO
OlOOOOOOOOOOoO
OllllllllllloO
OlOOOOOOOOOOoO
OoooooooooooOO`);
const PINE_TUFT = pm('tuft', `
.......GGG..........
....GGGGGGGGG.......
..GGGGgGGGGGGGGG....
GGGGGGGGGGgGGGGGGGG.
.GGgGGGGGGGGGGGGGGGG
...GGGGGGgGGGGGGGGG.
......GGGGGGGGGGG...
.........GGGGG......`);
const PINE_TOP = pm('pinetop', `
....GG....
...GGGG...
..GGGGGG..
.GGGgGGGG.
GGGGGGGGGG`);
const TRUNK = pm('trunkB', `
...OOo..
...OOo..
..OOOo..
..OOOo..
..OOOo..
.OOOOo..
.OOOOo..
.OOOOOo.
.OOOOOo.
OOOOOOo.
OOOOOOoo
oooooooo`);
const PUMP = pm('pump', `
......IIIIIII.
.....II.......
....IIII......
....IIII......
....IIII......
....IIII......
....IIII..I...
....IIII..I...
....IIII..I...
....IIII..I...
....IIII......
...IIIIII.....
SSSSSSSSSSSSSS
SsSSSSSSSsSSSS
SSSSSSSSSSSSSS
SsSSSSSSSsSSSS
ssssssssssssss`);
const WEATHERVANE = pm('vane', `
....I....
....I....
..IIIII..
.I..I....
IIIIIIII.
....I....
....I....
....I....
....I....`);
const FLAG = pm('flag', `
FFFFFFFFFFFj
FfFFFFFFFFFj
FFFFFFFFFfFj
jjjjjjjjjjjj
FFFFFjFFFFFF
FFFFFjFFfFFF
FfFFFjFFFFFF
jjjjjjjjjjjj`);
const BUNT = MAPS.BUNTING;

/* ----------------------------------------------------------- palettes --- */
const P = {
  clap: tone => ({ B: PAINT[tone % PAINT.length], l: mix(PAINT[tone % PAINT.length], '#ffffff', 0.12), d: scale(PAINT[tone % PAINT.length], 0.66) }),
  tar: { T: TAR, t: '#1c1c20', l: TAR_L },
  slate: { S: SLATE, d: SLATE_D },
  iron: { L: '#5a6470', S: '#4a525c', d: '#343a44' },
  stone: { S: STONE, s: STONE_D, d: STONE_D },
  window: (rust = true) => ({ W: TRIM, G: GLASS, g: GLASS_L, S: '#8a8a80', s: '#5a5a56', r: rust ? 'rgba(120,70,40,0.6)' : 'rgba(0,0,0,0)' }),
  boards: { P: '#5a4a34', p: '#4a3a2a' },
  door: door => ({ K: '#1a1a1c', D: door, d: scale(door, 0.7), G: GLASS, g: GLASS_L, I: IRON_L, y: BRASS, S: '#5a5a56', s: '#3e3e3c' }),
  chimney: { B: '#4a4242', b: '#3a3434', P: '#6a5a50', p: '#4a3e38' },
  dormer: { S: SLATE, d: SLATE_D, P: PAINT[4], W: TRIM, G: GLASS, g: GLASS_L },
  lamp: { I: IRON, G: '#5a5248', l: IRON_L },
  lantern: { I: IRON, G: '#5a5248' },
  wood: { O: '#5a4a34', o: '#3e3226', l: '#7a6a4c', I: IRON, 0: '#3e3226', w: '#e8f2f4', F: '#8ab4c8' },
  pot: { O: '#8a7a5c', o: '#5a4a34' },
  buoy: { I: IRON, R: '#b8503a', W: '#d8d0bc' },
  drum: { I: '#4a4e58', l: '#5c6068', r: RUST, i: '#343840' },
  rope: { R: '#a08a5c', r: '#7a6a44' },
  tuft: { G: '#3a5a4a', g: '#2c4438' },
  trunk: { O: '#3d3129', o: '#2a221c' },
  pump: { I: IRON, S: STONE, s: STONE_D },
  flag: { F: '#4e4c4a', f: '#5c5a58', j: '#3a3937' },
  icon: { I: IRON_L, B: '#8ab4c8', E: '#1a1712', O: '#c9b28a', R: '#e0685a' },
};

/* ------------------------------------------------------------- parts --- */
/** Painted clapboard with corner boards, a stone plinth, weathering and rust runs. */
function wall(g, x, y, w, h, tone, opts = {}) {
  const G0 = opts.ground, pal = opts.shed ? P.tar : P.clap(tone);
  fillTile(g, x, y, w, h, opts.shed ? TARBOARD : CLAP, pal, x, y);
  // paint worn through in patches
  if (!opts.shed) for (let i = 0; i < w / 6; i++) { const px = x + 3 + Math.floor(hash(x, i) * (w - 8)), py = y + 6 + Math.floor(hash(i, x) * (h - 24)); rect(g, px, py, 2 + Math.floor(hash(px, py) * 4), 1, mix(pal.B, '#ffffff', 0.18)); }
  // rust runs from the nail lines
  for (let i = 0; i < w / 14; i++) { const px = x + 4 + Math.floor(hash(i, tone, 9) * (w - 8)), py = y + Math.floor(hash(i, tone, 10) * h * 0.5); for (let k = 0; k < 6 + Math.floor(hash(i, 11) * 8); k++) rect(g, px, py + k, 1, 1, `rgba(120,70,40,${0.4 - k * 0.035})`); }
  // corner boards and a fascia line under the eaves
  const trim = opts.shed ? TAR_L : mix(pal.B, '#ffffff', 0.25);
  rect(g, x, y, 3, h, trim); rect(g, x + w - 3, y, 3, h, scale(trim, 0.8));
  if (opts.floors > 1) { const fy = y + Math.floor((h - 10) / 2); rect(g, x, fy, w, 2, scale(pal.B, 0.55)); }
  // plinth of tarred boards over stone
  fillTile(g, x, G0 - 10, w, 10, STONE_TILE, P.stone, x, G0 - 10); hline(g, x, G0 - 10, w, STONE_L);
}

/** Slate roof (corrugated iron on sheds): slope, lead ridge, gutter and downpipe. */
function roof(g, x, y, w, kind = 'hip', pitch = 16, snow = false, iron = false) {
  const s = roofSlope(g, { x, y, w, pitch, overhang: 6, ridge: null, rows: iron ? IRON_ROOF : SLATE_TILE, pal: iron ? P.iron : P.slate, ox: x });
  rect(g, s.x - 1, s.y - 1, s.w + 2, 2, IRON_L); hline(g, s.x, s.y - 2, s.w, '#6a7480');
  // gutter along the eaves and the downpipe down the right-hand corner
  rect(g, s.eaveL, s.bottom + 1, s.eaveW, 2, IRON); hline(g, s.eaveL, s.bottom + 1, s.eaveW, IRON_L);
  rect(g, x + w - 6, s.bottom + 3, 2, TOWN.ground - s.bottom - 3, IRON); vline(g, x + w - 6, s.bottom + 3, TOWN.ground - s.bottom - 3, IRON_L); rect(g, x + w - 7, s.bottom + 1, 4, 2, IRON_L);
  eaveShadow(g, x, s.bottom + 3, w, 4);
  for (let i = 0; i < 3; i++) { const rx = x + 8 + Math.floor(hash(x, i) * (w - 16)); for (let k = 0; k < 5; k++) rect(g, rx, s.bottom - 5 + k, 2, 1, `rgba(150,80,40,${0.35 - k * 0.06})`); }
  if (snow) { rect(g, s.x - 2, s.y - 4, s.w + 4, 3, '#eef2f6'); rect(g, s.eaveL, s.bottom - 1, s.eaveW, 2, '#eef2f6'); }
  return s;
}

function chimney(g, x, y) { g.drawImage(sprite(CHIMNEY, P.chimney), x, y - 18); return { x: x + 2, y: y - 18 }; }
function dormer(g, cx, y) { g.drawImage(sprite(DORMER, P.dormer), cx - 10, y - 17); return { x: cx - 2, y: y - 7, w: 4, h: 5, seed: cx }; }

function windowAt(g, x, y, door, opts = {}) {
  g.drawImage(sprite(WINDOW, P.window(!opts.noRust)), x - 8, y);
  if (opts.boarded) g.drawImage(sprite(BOARDS, P.boards), x - 8, y);
  return { x: x - 8 + WINDOW_GLASS.x, y: y + WINDOW_GLASS.y, w: WINDOW_GLASS.w, h: WINDOW_GLASS.h, seed: x * 3 + y, boarded: !!opts.boarded };
}
function doorAt(g, cx, ground, door) {
  const top = ground - DOOR.length + 1;
  g.drawImage(sprite(DOOR, P.door(door)), cx - 10, top);
  return { x: cx - 10 + DOOR_GLASS.x, y: top + DOOR_GLASS.y, w: DOOR_GLASS.w, h: DOOR_GLASS.h, door: true, seed: cx };
}
function lanternAt(g, x, y) {
  g.drawImage(sprite(LANTERN, P.lantern), x - 4, y - 4);
  return { x: x, y: y + 1, r: 36, wall: true, glass: [x - 1, y - 1, 3, 3] };
}
function shopWindow(g, x, y, w, h, door, kind) {
  rect(g, x - 2, y - 2, w + 4, h + 4, '#1a1a1c'); rect(g, x - 1, y - 1, w + 2, h + 2, TRIM_D);
  rect(g, x, y, w, h, GLASS); rect(g, x, y, w, 2, GLASS_L); rect(g, x + 1, y + 2, 1, h - 4, GLASS_L);
  rect(g, x + (w >> 1), y, 1, h, TRIM); rect(g, x, y + (h >> 1) - 1, w, 1, TRIM);
  // a small tarred porch roof over the window
  rect(g, x - 5, y - 8, w + 10, 6, TAR); hline(g, x - 5, y - 8, w + 10, TAR_L); hline(g, x - 5, y - 3, w + 10, '#111114');
  for (let xx = x - 5; xx < x + w + 5; xx += 4) rect(g, xx, y - 7, 1, 4, TAR_L);
  eaveShadow(g, x - 2, y - 2, w + 4, 2);
  if (kind === 'fish') { rect(g, x + 2, y + h - 8, w - 4, 6, '#e8f2f4'); rect(g, x + 2, y + h - 8, w - 4, 1, '#ffffff'); for (let i = 0; i < Math.floor((w - 6) / 12); i++) g.drawImage(sprite(MAPS.FISH_ICON, { B: i % 2 ? '#8ab4c8' : '#a8b8a0', E: '#1a1712' }), x + 3 + i * 12, y + h - 13); }
  if (kind === 'rod') { for (let i = 0; i < Math.floor((w - 8) / 9); i++) { rect(g, x + 5 + i * 9, y + 4, 1, h - 10, i % 2 ? '#c9b28a' : '#8a6a48'); rect(g, x + 4 + i * 9, y + 10 + (i % 3) * 3, 3, 2, '#b8503a'); } rect(g, x + 3, y + h - 6, w - 6, 2, '#3e3226'); }
  return { x, y, w, h, shop: true, seed: x };
}
/** A painted board fixed to the wall, lettering faded, bolts in the corners. */
function sign(g, cx, y, label, icon) {
  const w = textWidth(label) + 26;
  rect(g, cx - w / 2 - 1, y - 9, w + 2, 17, '#1a1a1c'); rect(g, cx - w / 2, y - 8, w, 15, '#c9b28a');
  for (let k = 0; k < w; k += 7) vline(g, cx - w / 2 + k, y - 8, 15, '#b8a078');
  hline(g, cx - w / 2, y - 8, w, '#ddd0a8');
  for (const [bx, by] of [[cx - w / 2 + 1, y - 7], [cx + w / 2 - 2, y - 7], [cx - w / 2 + 1, y + 5], [cx + w / 2 - 2, y + 5]]) rect(g, bx, by, 1, 1, RUST);
  text(g, label, cx + 8, y - 4, { color: '#2a1a10', align: 'center', shadow: false });
  const ic = icon === 'fish' ? MAPS.FISH_ICON : icon === 'rod' ? MAPS.ROD_ICON : MAPS.ANCHOR;
  g.drawImage(sprite(ic, P.icon), cx - w / 2 + 3, y - 6);
}
function lampPost(g, x, ground) {
  g.drawImage(sprite(LAMP_FOOT, P.lamp), x - 6, ground - 4);
  rect(g, x - 1, ground - 46, 2, 42, IRON); vline(g, x - 1, ground - 46, 42, IRON_L);
  g.drawImage(sprite(LAMP_HEAD, P.lamp), x - 6, ground - 58);
  return { x, y: ground - 52, r: 60, glass: [x - 3, ground - 55, 6, 5] };
}
/** A windswept pine: a leaning trunk, tiers of needles pushed to one side by the wind. */
function tree(g, x, ground) {
  g.drawImage(sprite(TRUNK, P.trunk), x - 4, ground - 12);
  for (let i = 0; i < 40; i++) rect(g, x - 1 + Math.round(i / 14), ground - 12 - i, 3, 1, i % 7 === 3 ? '#2a221c' : '#3d3129');
  for (let i = 0; i < 4; i++) { const ty = ground - 26 - i * 9, tx = x + 1 + Math.round((26 + i * 9) / 14); rect(g, tx - 6 + i, ty + 4, 12 - i * 2, 1, '#2a221c'); g.drawImage(sprite(PINE_TUFT, P.tuft), tx - 8 + i * 2, ty - 2); }
  g.drawImage(sprite(PINE_TOP, P.tuft), x + 1, ground - 62);
  return [];
}
/** A cast-iron pump on a stone trough stands in for the well. */
function well(g, cx, ground) {
  g.drawImage(sprite(PUMP, P.pump), cx - 7, ground - 17);
  rect(g, cx - 9, ground - 1, 18, 1, STONE_D);
}
function stall(g, cx, ground, tint) {
  rect(g, cx - 22, ground - 20, 44, 3, '#5a4a34'); hline(g, cx - 22, ground - 20, 44, '#7a6a4c');
  for (const px of [cx - 20, cx + 17]) rect(g, px, ground - 17, 3, 17, '#3e3226');
  g.drawImage(sprite(CRATE_FISH, P.wood), cx - 20, ground - 27); g.drawImage(sprite(CRATE_FISH, P.wood), cx + 2, ground - 27);
  g.drawImage(sprite(MAPS.CRATE, P.wood), cx - 6, ground - 37);
  for (const px of [cx - 25, cx + 22]) { rect(g, px, ground - 50, 3, 30, '#3e3226'); vline(g, px, ground - 50, 30, '#5a4a34'); }
  for (let i = 0; i < 7; i++) rect(g, cx - 29, ground - 56 + i, 58, 1, i === 0 ? scale(tint, 0.6) : i % 3 === 2 ? scale(tint, 0.85) : tint);
  for (let xx = cx - 29; xx < cx + 29; xx += 8) rect(g, xx + 3, ground - 49, 2, 3, '#a08a5c');
}
function fence(g, x, ground, w) { for (let xx = x; xx < x + w; xx += 16) g.drawImage(sprite(MAPS.FENCE, P.wood), xx, ground - 9); }
function bench(g, x, ground) { g.drawImage(sprite(MAPS.BENCH, P.wood), x, ground - 9); }
function board(g, x, ground) { g.drawImage(sprite(MAPS.BOARD, { O: '#5a4a34', o: '#3e3226', P: '#c9b28a', W: '#ddd6c4', k: '#5a5a56' }), x, ground - 24); }
function barrel(g, x, ground) { g.drawImage(sprite(DRUM, P.drum), x, ground - 13); }
function crate(g, x, ground) { g.drawImage(sprite(MAPS.CRATE, P.wood), x, ground - 10); }
function planter(g, x, ground) { g.drawImage(sprite(LOBSTER_POT, P.pot), x, ground - 8); g.drawImage(sprite(BUOY, P.buoy), x + 11, ground - 7); }
function post(g, x, ground) { g.drawImage(sprite(BOLLARD, P.lamp), x, ground - 10); }
function dinghy(g, x, ground) { g.drawImage(sprite(MAPS.DINGHY, { O: '#2a2e3a', W: '#8a9aa8', w: '#6a7a86', o: '#1c1c20' }), x, ground - 7); }
function pot(g, x, ground) { g.drawImage(sprite(LOBSTER_POT, P.pot), x, ground - 8); }
function hull(g, x, y) { g.drawImage(sprite(MAPS.HULL, { W: '#d8d0bc', w: '#a8a098', B: '#3a4a5a', b: '#4e6070', K: '#1a1a1c' }), x, y); }
function buntingAt() {}
function numberPlate(g, x, y, num) { rect(g, x - 5, y - 2, 11, 11, '#1a1a1c'); rect(g, x - 4, y - 1, 9, 9, '#c9b28a'); text(g, String(num), x + 1, y, { color: '#2a1a10', align: 'center', shadow: false }); }

/** A clapboard gable with a round vent, slate edges and white bargeboards. */
function gableRoof(g, x, y, w, gh, snow) {
  const cx = x + (w >> 1), pal = P.clap(4);
  for (let i = 0; i < gh; i++) { const t = i / (gh - 1), width = Math.max(2, Math.round((w + 4) * t)), left = Math.round(cx - width / 2), yy = y - gh + i; fillTile(g, left, yy, width, 1, CLAP, pal, x, y - gh); }
  for (let i = 0; i < gh + 3; i++) { const t = i / (gh + 2), half = Math.round(((w + 12) / 2) * t); rect(g, cx - half - 2, y - gh - 3 + i, 3, 1, SLATE); rect(g, cx + half - 1, y - gh - 3 + i, 3, 1, SLATE); rect(g, cx - half - 1, y - gh - 2 + i, 2, 1, TRIM); rect(g, cx + half - 1, y - gh - 2 + i, 2, 1, TRIM); }
  rect(g, cx - 1, y - gh - 6, 2, 4, IRON_L);
  rect(g, x, y - 2, w, 2, scale(pal.B, 0.55)); eaveShadow(g, x, y, w, 2);
  const vy = y - Math.round(gh * 0.45);
  rect(g, cx - 4, vy - 3, 8, 7, TRIM); rect(g, cx - 3, vy - 2, 6, 5, GLASS); rect(g, cx - 5, vy - 1, 10, 3, TRIM); rect(g, cx - 4, vy, 8, 1, GLASS);
  if (snow) for (let i = 0; i < gh + 3; i++) { const t = i / (gh + 2), half = Math.round(((w + 12) / 2) * t); rect(g, cx - half - 3, y - gh - 5 + i, 3, 1, '#eef2f6'); rect(g, cx + half, y - gh - 5 + i, 3, 1, '#eef2f6'); }
}
function slidingDoors(g, x, ground, w, h, out) {
  const door = '#8a3a2a', y = ground - h;
  rect(g, x - 3, y - 6, w + 6, h + 6, '#1a1a1c');
  rect(g, x + 22, y, 24, h, '#101418'); hull(g, x + 20, ground - 32); rect(g, x + 24, ground - 22, 16, 2, '#3e3226');
  out.windows.push({ x: x + 22, y: y + 6, w: 24, h: 30, shop: true, seed: x, dim: true });
  fillTile(g, x, y, 22, h, MAPS.PLANK, { D: door, d: scale(door, 0.7) }, x, y); fillTile(g, x + 46, y, w - 46, h, MAPS.PLANK, { D: door, d: scale(door, 0.7) }, x + 46, y);
  rect(g, x, y + 28, 22, 2, scale(door, 0.5)); rect(g, x + 46, y + 28, w - 46, 2, scale(door, 0.5));
  rect(g, x - 4, y - 8, w + 8, 3, IRON); for (let k = 0; k < w + 8; k += 6) rect(g, x - 4 + k, y - 7, 2, 2, IRON_L);
  rect(g, x + 4, y - 4, 3, 4, IRON); rect(g, x + 52, y - 4, 3, 4, IRON);
  for (let k = 0; k < 5; k++) rect(g, x + 8 + k * 3, y + 10 + k, 1, 1, RUST);
}
function chapelWall(g, x, y, w, h, ground) {
  fillTile(g, x, y, w, h, STONE_TILE, P.stone, x, y); hline(g, x, y, w, STONE_L);
  for (const bx of [x + 4, x + w - 10]) { rect(g, bx, y + 30, 6, h - 30, STONE_D); rect(g, bx + 1, y + 30, 4, h - 30, STONE); rect(g, bx - 1, y + 28, 8, 3, STONE_L); }
  for (let i = 0; i < 6; i++) { const mx = x + 6 + Math.floor(hash(x, i, 3) * (w - 12)), my = y + h - 30 + Math.floor(hash(i, x) * 20); rect(g, mx, my, 3, 2, '#5a6a4a'); }
}
function roseWindow(g, cx, y) { g.drawImage(sprite(MAPS.ROSE, { S: STONE_D, G: GLASS, W: TRIM_D }), cx - 10, y - 10); return { x: cx - 8, y: y - 8, w: 16, h: 16, shop: true, round: true, seed: cx }; }
/** A bell-cote on the ridge with a weathervane, not a spire. */
function tower(g, cx, y, out, snow) {
  const tx = cx - 9, ty = y - 16;
  fillTile(g, tx, ty, 18, 22, STONE_TILE, P.stone, tx, ty); rect(g, tx, ty, 1, 22, STONE_L); rect(g, tx + 17, ty, 1, 22, STONE_D);
  rect(g, tx + 5, ty + 4, 8, 12, '#1a1a1c'); rect(g, tx + 6, ty + 2, 6, 2, '#1a1a1c'); g.drawImage(sprite(MAPS.BELL, { y: BRASS, o: '#8a6a3a' }), tx + 4, ty + 6);
  gable(g, tx - 2, ty, 22, 8, SLATE_TILE, P.slate); rect(g, tx - 2, ty - 1, 22, 2, IRON_L);
  g.drawImage(sprite(WEATHERVANE, { I: IRON_L }), cx - 4, ty - 17);
  out.clock = null;
  if (snow) rect(g, tx - 2, ty - 10, 22, 2, '#eef2f6');
}
function squareWall(g, x0, x1, ground, snow) {
  fillTile(g, x0, ground - 16, x1 - x0, 16, STONE_TILE, P.stone, x0, ground - 16); rect(g, x0 - 1, ground - 18, x1 - x0 + 2, 2, STONE_L);
  // bollards with a chain slung between them
  for (let xx = x0 + 12; xx < x1; xx += 30) g.drawImage(sprite(BOLLARD, P.lamp), xx, ground - 28);
  for (let xx = x0 + 18; xx < x1 - 30; xx += 30) for (let k = 0; k < 24; k += 2) rect(g, xx + k, ground - 26 + Math.round(Math.sin(k / 23 * Math.PI) * 5), 2, 1, k % 4 ? IRON_L : IRON);
  if (snow) rect(g, x0 - 1, ground - 19, x1 - x0 + 2, 2, '#eef2f6');
}
function paving(g, x, y, w, h) {
  fillTile(g, x, y, w, h, FLAG, P.flag, 0, y);
  rect(g, x, y + 30, w, 1, '#3a3937'); rect(g, x, y + 34, w, 1, '#3a3937');
}
function snowGround(g, x, y, w, h) { rect(g, x, y, w, 3, '#dfe5ea'); for (let yy = y + 10; yy < y + h; yy += 2) for (let xx = x + (yy % 4 ? 0 : 2); xx < x + w; xx += 4) if (hash(xx, yy) < 0.5) rect(g, xx, yy, 2, 1, '#dfe5ea'); }
/** Nets drying on a rail, a rope coil and drums along the quay. */
function quayExtras(g, ground, out) {
  rect(g, 96, ground - 42, 1, 26, '#3e3226'); rect(g, 114, ground - 42, 1, 26, '#3e3226'); rect(g, 96, ground - 42, 19, 1, '#3e3226');
  for (let yy = ground - 40; yy < ground - 22; yy += 3) for (let xx = 97; xx < 114; xx += 3) rect(g, xx + (((yy - ground) / 3 | 0) % 2 ? 1 : 0), yy, 1, 1, '#8a7a5c');
  g.drawImage(sprite(ROPE, P.rope), 8, ground - 22); g.drawImage(sprite(BUOY, P.buoy), 74, ground - 24);
}
/** The boatyard name is painted straight onto the tarred boards. */
function extras(g, ground, out, snow) {
  for (let k = 0; k < 6; k++) rect(g, 236 + k * 5, ground - 82, 1, 1, RUST);
}

export const KIT_B = {
  name: 'harbour', doors: DOORS, beam: TAR, trim: TRIM, glass: GLASS, stone: STONE, iron: IRON,
  ground: { cobble: '#4e4c4a', cobble2: '#3a3937', kerb: '#5c5a58' },
  wall, roof: (g, x, y, w, kind, pitch, snow) => roof(g, x, y, w, kind, pitch, snow, false), chimney, dormer, windowAt: (g, x, y, door) => windowAt(g, x, y, door, { boarded: y < TOWN.ground - 60 && hash(x, y) < 0.15 }), doorAt, lanternAt, shopWindow, sign, lampPost, tree, well, stall,
  fence, bench, board, barrel, crate, planter, post, dinghy, pot, hull, buntingAt,
  numberPlate, gableRoof, slidingDoors, chapelWall, roseWindow, chapelDoor: '#3a2a22', tower, squareWall, paving, snowGround, quayExtras, extras,
  shedRoof: (g, x, y, w, pitch, snow) => roof(g, x, y, w, 'hip', pitch, snow, true),
  stallTints: ['#3a4a5a', '#5a6a4a'], stoneLight: STONE_L, stoneDark: STONE_D,
  roofPattern: SLATE_TILE, roofPal: P.slate, stoneTile: STONE_TILE, stonePal: P.stone,
  bunting: null,
  windowW: 16, windowH: 18, doorH: DOOR.length,
  curtain: seed => ['#8a6a44', '#5a6a7a', '#6a5a5a', '#7a7a6a'][Math.floor(hash(seed, 9) * 4)],
};
