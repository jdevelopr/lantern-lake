// Interiors: one side-on room per building, entered through its front door. Walls,
// floors and furniture are baked per (room, season) into an offscreen canvas; the
// window views, lamps, fires, clocks, keepers, gear on the walls and the fish on the
// slab are drawn per frame from live state. Same floor line as the street, so the
// town walker walks straight in.
import { TOWN, ROOMS, BUILDING_BY_ID, LAKE, lakeNorm, seasonOf, dayOfSeason } from '../game/world.js';
import { GEAR, FISH, FISH_BY_ID } from '../shared/catalog.js';
import { SEASON_NAMES } from '../shared/protocol.js';
import { mkCanvas, R, hash, mix, scale, disc, ellipse, ditherPattern, ditherRect, text, textWidth, sprite, clamp, lerp } from './gfx.js';
import { skyColors, drawWalker } from './town.js';
import { drawFigure, drawSeated, drawKid, drawSleeper, drawCat, drawDog, drawGull } from './figure.js';

const G0 = TOWN.ground, H = 360;
const bakes = new Map();   // room id -> { season, canvas, live }

/* ------------------------------------------------------------ helpers --- */
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(R(x), R(y), R(w), R(h)); };
const hline = (g, x, y, w, c) => rect(g, x, y, w, 1, c);
const vline = (g, x, y, h, c) => rect(g, x, y, 1, h, c);
const outline = (g, x, y, w, h, c) => { hline(g, x, y, w, c); hline(g, x, y + h - 1, w, c); vline(g, x, y, h, c); vline(g, x + w - 1, y, h, c); };
/** Sleeping hours: residents are in bed, lamps off. */
const asleep = minute => minute >= 22 * 60 || minute < 5.5 * 60;

/* ------------------------------------------------------------- walls --- */
function wallTiles(g, x, y, w, h, base = '#d9d6c8', grout = '#b3ae9e') {
  rect(g, x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 8) for (let xx = x; xx < x + w; xx += 8) {
    const n = hash(xx, yy, 5);
    if (n < 0.12) rect(g, xx, yy, 8, 8, scale(base, 0.94));
    else if (n > 0.93) rect(g, xx, yy, 8, 8, mix(base, '#ffffff', 0.4));
    hline(g, xx, yy + 7, 8, grout); vline(g, xx + 7, yy, 8, grout);
    if (hash(xx, yy, 6) < 0.3) rect(g, xx + 1, yy + 1, 2, 1, mix(base, '#ffffff', 0.5));
  }
}
function wallBoards(g, x, y, w, h, col = '#8a6a44', vertical = true, step = 7) {
  rect(g, x, y, w, h, col);
  if (vertical) for (let xx = x; xx < x + w; xx += step) {
    const k = 0.9 + hash(xx, 1) * 0.2;
    rect(g, xx, y, step - 1, h, scale(col, k));
    vline(g, xx + step - 1, y, h, scale(col, 0.62));
    for (let yy = y + (hash(xx, 3) * 30 | 0); yy < y + h; yy += 24 + (hash(xx, yy) * 30 | 0)) rect(g, xx + 1 + (hash(xx, yy, 2) * (step - 3) | 0), yy, 1, 3 + (hash(xx, yy, 4) * 4 | 0), scale(col, 0.72));
  } else for (let yy = y; yy < y + h; yy += step) {
    rect(g, x, yy, w, step - 1, scale(col, 0.9 + hash(yy, 1) * 0.2));
    hline(g, x, yy + step - 1, w, scale(col, 0.6));
    for (let xx = x + (hash(yy, 2) * 40 | 0); xx < x + w; xx += 30 + (hash(xx, yy) * 60 | 0)) hline(g, xx, yy + 1 + (hash(xx, yy, 3) * (step - 3) | 0), 4 + (hash(xx, yy, 5) * 8 | 0), scale(col, 0.76));
  }
}
function wallPaper(g, x, y, w, h, base, motif, accent) {
  rect(g, x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 12) for (let xx = x + ((yy - y) / 12 % 2 ? 8 : 0); xx < x + w; xx += 16) {
    if (motif === 'rose') { rect(g, xx + 1, yy + 2, 3, 3, accent); rect(g, xx + 2, yy + 1, 1, 1, accent); rect(g, xx, yy + 3, 1, 1, accent); rect(g, xx + 4, yy + 3, 1, 1, scale(accent, 0.8)); rect(g, xx + 2, yy + 5, 1, 2, '#6f8a5a'); rect(g, xx + 3, yy + 6, 2, 1, '#6f8a5a'); }
    else if (motif === 'diamond') { rect(g, xx + 2, yy + 3, 1, 1, accent); rect(g, xx + 1, yy + 4, 3, 1, accent); rect(g, xx + 2, yy + 5, 1, 1, accent); }
    else if (motif === 'stripe') { rect(g, xx, yy, 3, 12, accent); rect(g, xx + 6, yy, 1, 12, scale(accent, 1.1)); }
    else if (motif === 'stencil') { rect(g, xx + 1, yy + 4, 4, 1, accent); rect(g, xx + 2, yy + 3, 2, 3, accent); rect(g, xx + 3, yy + 2, 1, 1, accent); }
  }
}
function plaster(g, x, y, w, h, col) {
  rect(g, x, y, w, h, col);
  for (let yy = y; yy < y + h; yy += 2) for (let xx = x; xx < x + w; xx += 2) {
    const n = hash(xx, yy, 9);
    if (n < 0.05) rect(g, xx, yy, 2, 1, scale(col, 0.9)); else if (n > 0.96) rect(g, xx, yy, 1, 1, scale(col, 1.08));
  }
}
function ceiling(g, w, ceil, col = '#2d2621') {
  rect(g, 0, 0, w, ceil, col);
  for (let yy = 4; yy < ceil; yy += 9) hline(g, 0, yy, w, scale(col, 0.7));
  // cornice
  rect(g, 0, ceil - 4, w, 4, scale(col, 1.35)); hline(g, 0, ceil - 4, w, scale(col, 1.7)); hline(g, 0, ceil - 1, w, scale(col, 0.5));
}
function beams(g, w, ceil, n = 3, col = '#3a2c22') {
  for (let i = 0; i < n; i++) { const x = R((i + 0.5) * w / n); rect(g, x - 5, 0, 10, ceil - 2, col); vline(g, x - 5, 0, ceil - 2, scale(col, 1.4)); vline(g, x + 4, 0, ceil - 2, scale(col, 0.6)); }
}
function skirting(g, w, y, col) { rect(g, 0, y - 6, w, 6, col); hline(g, 0, y - 6, w, scale(col, 1.4)); hline(g, 0, y - 1, w, scale(col, 0.6)); }
function floorBoards(g, w, col = '#6a4a30') {
  rect(g, 0, G0, w, H - G0, col);
  for (let yy = G0; yy < H; yy += 7) {
    const row = (yy - G0) / 7 | 0;
    rect(g, 0, yy, w, 6, scale(col, 0.92 + hash(row, 1) * 0.16));
    hline(g, 0, yy + 6, w, scale(col, 0.55));
    for (let xx = (hash(row, 2) * 50 | 0); xx < w; xx += 40 + (hash(xx, row) * 60 | 0)) { vline(g, xx, yy, 6, scale(col, 0.6)); }
    for (let xx = (hash(row, 3) * 90 | 0); xx < w; xx += 60 + (hash(xx, row, 1) * 90 | 0)) { rect(g, xx, yy + 2, 2, 2, scale(col, 0.7)); rect(g, xx + 1, yy + 3, 1, 1, scale(col, 0.55)); }
  }
  hline(g, 0, G0, w, scale(col, 1.3));
}
function floorFlags(g, w, col = '#5b5d5c') {
  rect(g, 0, G0, w, H - G0, col);
  for (let yy = G0; yy < H; yy += 10) {
    const off = ((yy - G0) / 10 | 0) % 2 ? 10 : 0;
    for (let xx = -off; xx < w; xx += 20) {
      rect(g, xx, yy, 19, 9, scale(col, 0.9 + hash(xx, yy) * 0.2));
      if (hash(xx, yy, 1) < 0.2) rect(g, xx + 3, yy + 3, 4, 2, scale(col, 0.85));
    }
    hline(g, 0, yy + 9, w, scale(col, 0.6));
    for (let xx = -off + 19; xx < w; xx += 20) vline(g, xx, yy, 10, scale(col, 0.6));
  }
  hline(g, 0, G0, w, scale(col, 1.25));
}
function floorConcrete(g, w, col = '#4a4c4d') {
  rect(g, 0, G0, w, H - G0, col);
  for (let yy = G0; yy < H; yy += 2) for (let xx = 0; xx < w; xx += 2) { const n = hash(xx, yy, 11); if (n < 0.06) rect(g, xx, yy, 2, 1, scale(col, 0.85)); else if (n > 0.97) rect(g, xx, yy, 1, 1, scale(col, 1.15)); }
  hline(g, 0, G0, w, scale(col, 1.3));
  for (const [x, y, r] of [[150, 322, 14], [330, 340, 10], [520, 330, 12]]) { g.fillStyle = ditherPattern(g, scale(col, 0.6), 0.5); ellipse2(g, x, y, r, 3); }
  g.fillStyle = ditherPattern(g, '#a08a5c', 0.35); ellipse2(g, 230, 318, 60, 8); ellipse2(g, 260, 330, 40, 6);
}
function rug(g, x, y, w, h, a, b, fringe = true) {
  rect(g, x, y, w, h, a);
  for (let yy = y + 1; yy < y + h - 1; yy += 3) hline(g, x + 2, yy, w - 4, b);
  outline(g, x, y, w, h, scale(a, 0.7)); rect(g, x + 3, y + 3, w - 6, h - 6, 'rgba(0,0,0,0)');
  outline(g, x + 3, y + 3, w - 6, h - 6, b);
  if (fringe) for (let xx = x; xx < x + w; xx += 2) { vline(g, xx, y - 2, 2, '#d8d0bc'); vline(g, xx, y + h, 2, '#d8d0bc'); }
}
function ellipse2(g, x, y, rx, ry) { for (let dy = -ry; dy <= ry; dy++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); g.fillRect(R(x - half), R(y + dy), half * 2 + 1, 1); } }

/* ---------------------------------------------------------- fixtures --- */
// Scale: the walker is 18 px tall, so a counter is 10, a table 9, a door 36.
function door(g, L, x, y, h, col = '#4a3324', glass = true) {
  rect(g, x - 3, y - 3, 34, h + 3, '#1a1712');
  rect(g, x, y, 28, h, col);
  rect(g, x + 3, y + 4, 22, h * 0.42, scale(col, 1.15)); rect(g, x + 5, y + 6, 18, h * 0.42 - 4, scale(col, 0.85));
  rect(g, x + 3, y + h * 0.5 + 2, 22, h * 0.44, scale(col, 1.15)); rect(g, x + 5, y + h * 0.5 + 4, 18, h * 0.44 - 4, scale(col, 0.85));
  rect(g, x + 22, y + h * 0.52, 3, 2, '#e8b04a'); rect(g, x + 23, y + h * 0.52 - 1, 1, 1, '#fff2c0');
  if (glass) { rect(g, x + 6, y + 6, 16, 10, '#0a0c12'); L.windows.push({ x: x + 7, y: y + 7, w: 14, h: 8, small: true }); }
  rect(g, x - 3, y - 9, 34, 6, '#1a1712'); L.windows.push({ x: x, y: y - 8, w: 28, h: 4, small: true });
  rect(g, x - 4, G0, 36, 3, '#5a4a34'); hline(g, x - 4, G0, 36, '#7a6a4a');
}
function windowFrame(g, L, x, y, w, h, { trim = '#d8d0bc', curtains = null, sill = true, plant = false, lace = false } = {}) {
  rect(g, x - 3, y - 3, w + 6, h + 6, '#1a1712');
  rect(g, x - 2, y - 2, w + 4, h + 4, trim);
  rect(g, x, y, w, h, '#0a0c12');
  L.windows.push({ x, y, w, h, bar: true, lace });
  if (sill) { rect(g, x - 5, y + h + 2, w + 10, 3, scale(trim, 0.85)); hline(g, x - 5, y + h + 2, w + 10, scale(trim, 1.15)); }
  if (curtains) L.curtains.push({ x, y, w, h, col: curtains });
  if (plant) { const px = x + w - 8, py = y + h + 2; rect(g, px - 3, py - 6, 7, 6, '#a05a3a'); rect(g, px - 4, py - 7, 9, 2, '#b8683f'); rect(g, px - 2, py - 11, 2, 4, '#4a7a3a'); rect(g, px + 1, py - 13, 2, 6, '#5a8a44'); rect(g, px - 4, py - 10, 2, 2, '#4a7a3a'); rect(g, px + 3, py - 9, 2, 2, '#5a8a44'); }
}
function drawCurtains(ctx, c) {
  const { x, y, w, h, col } = c, cw = R(w * 0.26);
  for (const cx of [x - 2, x + w + 2 - cw]) {
    ctx.fillStyle = col; ctx.fillRect(cx, y - 3, cw, h + 5);
    ctx.fillStyle = scale(col, 0.75); for (let i = 2; i < cw; i += 4) ctx.fillRect(cx + i, y - 3, 1, h + 5);
    ctx.fillStyle = scale(col, 1.2); for (let i = 0; i < cw; i += 4) ctx.fillRect(cx + i, y - 3, 1, h + 5);
    ctx.fillStyle = '#c9b28a'; ctx.fillRect(cx - 1, y + (h >> 1), cw + 2, 2);
  }
  ctx.fillStyle = scale(col, 0.85); ctx.fillRect(x - 4, y - 5, w + 8, 3); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(x - 5, y - 6, w + 10, 1);
}
function hangingLamp(g, L, x, y, ceil, shade = '#2e5a3e', r = 74, on = 'always') {
  vline(g, x, ceil, y - ceil - 6, '#1a1712'); vline(g, x + 1, ceil, y - ceil - 6, '#3a3a3c');
  rect(g, x - 2, y - 7, 5, 2, '#2d3038');
  for (let i = 0; i < 5; i++) rect(g, x - 4 - i * 1.6, y - 5 + i, 9 + i * 3.2, 1, i % 2 ? shade : scale(shade, 1.2));
  rect(g, x - 11, y, 23, 1, scale(shade, 0.6));
  L.lamps.push({ x: x + 0.5, y: y + 3, r, color: '#ffc46a', kind: 'hang', on, w: 23 });
}
function tableLamp(g, L, x, y, shade = '#d8c48a', r = 52, on = 'dim') {
  rect(g, x - 3, y - 2, 7, 2, '#5a4a34'); rect(g, x - 1, y - 10, 3, 8, '#8a6a44');
  for (let i = 0; i < 6; i++) rect(g, x - 3 - i * 0.8, y - 17 + i, 7 + i * 1.6, 1, i % 2 ? shade : scale(shade, 1.1));
  L.lamps.push({ x: x + 0.5, y: y - 13, r, color: '#ffd28a', kind: 'table', on, w: 11, shade });
}
function deskLamp(g, L, x, y, on = 'dim', dir = 1) {
  rect(g, x - 3, y - 2, 7, 2, '#2d3038'); rect(g, x, y - 12, 1, 10, '#3a3a3c'); rect(g, x, y - 13, dir * 8, 1, '#3a3a3c');
  rect(g, x + dir * 5, y - 12, dir * 6, 3, '#2e5a3e'); rect(g, x + dir * 5, y - 9, dir * 6, 1, '#1f3f2c');
  L.lamps.push({ x: x + dir * 8, y: y - 8, r: 44, color: '#ffe0a0', kind: 'desk', on, w: 6 });
}
function cageLamp(g, L, x, ceil, drop = 22, on = 'always') {
  vline(g, x, ceil, drop, '#1a1712'); rect(g, x - 3, ceil + drop, 7, 3, '#2d3038');
  rect(g, x - 4, ceil + drop + 3, 9, 9, '#3a3a3c'); rect(g, x - 3, ceil + drop + 4, 7, 7, '#5a5248');
  for (let i = -3; i <= 3; i += 2) vline(g, x + i, ceil + drop + 3, 9, '#2d3038');
  L.lamps.push({ x: x + 0.5, y: ceil + drop + 8, r: 84, color: '#ffe6b0', kind: 'cage', on, w: 7 });
}
function candle(g, L, x, y, on = 'dim') { rect(g, x - 2, y - 1, 5, 1, '#8a8a80'); rect(g, x, y - 6, 1, 5, '#f0e8d0'); L.lamps.push({ x: x + 0.5, y: y - 8, r: 24, color: '#ffc46a', kind: 'candle', on, w: 1 }); }
function stove(g, L, x, y, kind, ceil) {
  if (kind === 'potbelly') {
    rect(g, x - 3, y - 3, 24, 3, '#1a1a1c'); rect(g, x - 1, y - 32, 20, 29, '#23262e'); rect(g, x, y - 31, 4, 27, '#3a3d46'); rect(g, x + 1, y - 36, 16, 4, '#2d3038');
    rect(g, x + 7, ceil, 5, y - 36 - ceil, '#23262e'); rect(g, x + 7, ceil, 1, y - 36 - ceil, '#3a3d46'); rect(g, x + 5, y - 39, 9, 3, '#3a3d46');
    rect(g, x + 4, y - 24, 10, 9, '#0a0806'); L.fires.push({ x: x + 9, y: y - 19, w: 8, h: 8, r: 50 });
    rect(g, x + 2, y - 9, 14, 1, '#3a3d46'); rect(g, x + 4, y - 26, 10, 1, '#4a4d56'); rect(g, x + 5, y - 13, 8, 2, '#3a3d46');
    rect(g, x + 16, y - 44, 11, 8, '#8a8a80'); rect(g, x + 17, y - 46, 9, 2, '#9a9a90'); rect(g, x + 20, y - 48, 3, 2, '#6a6a60'); rect(g, x + 27, y - 43, 3, 3, '#8a8a80'); rect(g, x + 14, y - 42, 2, 4, '#8a8a80');
    rect(g, x + 15, y - 36, 14, 2, '#3a3d46'); L.steam.push({ x: x + 28, y: y - 45 });
  } else {
    rect(g, x, y - 26, 40, 26, '#2a2c34'); rect(g, x + 1, y - 25, 38, 3, '#3d4048'); rect(g, x + 4, y - 20, 13, 12, '#0a0806'); L.fires.push({ x: x + 10, y: y - 15, w: 10, h: 9, r: 46 });
    rect(g, x + 21, y - 20, 16, 12, '#1a1c22'); rect(g, x + 23, y - 17, 12, 6, '#22242c'); rect(g, x + 22, y - 12, 14, 1, '#3d4048'); rect(g, x + 4, y - 6, 32, 1, '#3d4048');
    rect(g, x - 2, y - 28, 44, 2, '#3d4048'); rect(g, x + 30, y - 31, 5, 3, '#4a4d56'); rect(g, x + 31, ceil, 3, y - 31 - ceil, '#2a2c34');
    rect(g, x + 6, y - 37, 14, 9, '#7a4a3a'); rect(g, x + 5, y - 38, 16, 2, '#8a5a4a'); rect(g, x + 20, y - 35, 3, 2, '#7a4a3a'); L.steam.push({ x: x + 12, y: y - 39 });
  }
}
function fireplace(g, L, x, y, w = 56) {
  rect(g, x - 8, y - 50, w + 16, 6, '#6a5a4a'); hline(g, x - 8, y - 50, w + 16, '#8a7a6a');
  for (let yy = y - 44; yy < y; yy += 5) { const off = ((yy - y) / 5 | 0) % 2 ? 5 : 0; for (let xx = x - 8 + off; xx < x + w + 8; xx += 10) rect(g, xx, yy, 9, 4, hash(xx, yy) < 0.5 ? '#6e6258' : '#5e5248'); hline(g, x - 8, yy + 4, w + 16, '#3d3630'); }
  rect(g, x + 6, y - 36, w - 12, 36, '#0a0806'); rect(g, x + 8, y - 34, w - 16, 34, '#120e0a');
  rect(g, x + 12, y - 7, w - 24, 4, '#3a2a1c'); rect(g, x + 16, y - 11, w - 32, 4, '#4a3624'); rect(g, x + 14, y - 3, w - 28, 2, '#2d3038');
  L.fires.push({ x: x + w / 2, y: y - 17, w: w - 30, h: 16, r: 100, big: true });
  rect(g, x - 2, y, w + 4, 2, '#5a5754');
}
function shelf(g, x, y, w, col = '#6a4a30') { rect(g, x, y, w, 3, col); hline(g, x, y, w, scale(col, 1.3)); rect(g, x + 2, y + 3, 2, 3, scale(col, 0.7)); rect(g, x + w - 4, y + 3, 2, 3, scale(col, 0.7)); }
function jar(g, x, y, h, col, lid = '#b8a070') { rect(g, x, y - h, 6, h, col); rect(g, x + 1, y - h, 1, h, mix(col, '#ffffff', 0.4)); rect(g, x, y - h - 1, 6, 2, lid); }
function book(g, x, y, h, col) { rect(g, x, y - h, 3, h, col); rect(g, x + 1, y - h + 2, 1, 1, mix(col, '#ffffff', 0.5)); rect(g, x + 1, y - 3, 1, 1, mix(col, '#ffffff', 0.5)); return x + 3; }
function books(g, x, y, n, seed) { let px = x; for (let i = 0; i < n; i++) { const h = 8 + (hash(seed, i) * 6 | 0); px = book(g, px, y, h, ['#8a3a3a', '#3a5a8a', '#5a7a3a', '#b8903a', '#6a4a7a', '#3a6a6a', '#a06a4a'][(hash(seed, i, 1) * 7) | 0]) + (hash(seed, i, 2) < 0.2 ? 2 : 0); } return px; }
function picture(g, x, y, w, h, kind, frame = '#8a6a44') {
  rect(g, x - 2, y - 2, w + 4, h + 4, frame); rect(g, x - 1, y - 1, w + 2, h + 2, scale(frame, 0.6));
  if (kind === 'lake') { rect(g, x, y, w, h * 0.5, '#7a9ab8'); rect(g, x, y + h * 0.5, w, h * 0.5, '#3e6f90'); rect(g, x + 2, y + h * 0.35, w - 4, 2, '#4d5e55'); rect(g, x + w * 0.6, y + h * 0.6, 4, 2, '#5c4030'); }
  else if (kind === 'portrait') { rect(g, x, y, w, h, '#c9b9a0'); rect(g, x + w / 2 - 2, y + 3, 4, 4, '#e6c3a0'); rect(g, x + w / 2 - 3, y + 2, 6, 2, '#3a2a1c'); rect(g, x + w / 2 - 4, y + 7, 8, h - 8, '#4a5a6a'); }
  else if (kind === 'boat') { rect(g, x, y, w, h, '#b9cbd6'); rect(g, x + 2, y + h - 5, w - 4, 3, '#5c4030'); rect(g, x + w / 2, y + 2, 1, h - 6, '#3a2a1c'); rect(g, x + w / 2 + 1, y + 3, 5, 4, '#e8e2d2'); }
  else if (kind === 'crayon') { rect(g, x, y, w, h, '#f0ead8'); rect(g, x + 2, y + 2, 4, 4, '#f2c14e'); rect(g, x + 4, y + h - 5, 6, 3, '#ff8c66'); rect(g, x + 10, y + h - 4, 2, 1, '#ff8c66'); rect(g, x + w - 6, y + 4, 3, 3, '#7fe0c3'); rect(g, x + 2, y + h - 2, w - 4, 1, '#5e8a4a'); }
  else if (kind === 'map') { rect(g, x, y, w, h, '#d8c8a0'); rect(g, x + 3, y + 3, w * 0.4, h * 0.5, '#a8b890'); rect(g, x + w * 0.55, y + 5, w * 0.35, h * 0.6, '#a8b890'); rect(g, x + 2, y + h - 4, w - 4, 1, '#8a7a5a'); }
}
function table(g, x, y, w, col = '#7a5a3a', h = 14) {
  rect(g, x, y - h, w, 3, col); hline(g, x, y - h, w, scale(col, 1.3)); rect(g, x + 2, y - h + 3, 2, h - 3, scale(col, 0.8)); rect(g, x + w - 4, y - h + 3, 2, h - 3, scale(col, 0.8));
}
function bed(g, x, y, w, quilt = ['#8a3a3a', '#d8c48a'], pillow = '#e8e2d2') {
  rect(g, x - 3, y - 26, 4, 26, '#4a3324'); rect(g, x + w - 1, y - 18, 4, 18, '#4a3324'); rect(g, x - 3, y - 26, w + 6, 3, '#5c4030'); rect(g, x - 2, y - 23, w + 4, 9, '#5c4030'); rect(g, x, y - 21, w, 5, '#6e4e38');
  rect(g, x, y - 10, w, 8, '#5a4a3a'); rect(g, x + 1, y - 12, w - 2, 3, '#c9c3b4');
  for (let yy = y - 11; yy < y - 3; yy += 3) for (let xx = x + 13; xx < x + w - 1; xx += 4) rect(g, xx, yy, 3, 2, ((xx + yy) / 4 | 0) % 2 ? quilt[0] : quilt[1]);
  rect(g, x + 2, y - 15, 12, 4, pillow); rect(g, x + 2, y - 15, 12, 1, mix(pillow, '#ffffff', 0.5));
  rect(g, x, y - 2, w, 2, '#3a2a1c');
}
function armchair(g, x, y, col = '#6a4a4a') {
  rect(g, x, y - 30, 8, 30, col); rect(g, x + 1, y - 28, 4, 24, scale(col, 1.15));
  rect(g, x + 8, y - 12, 18, 12, col); rect(g, x + 26, y - 17, 6, 17, col);
  rect(g, x + 9, y - 11, 16, 3, scale(col, 1.2)); rect(g, x, y, 32, 1, scale(col, 0.6)); rect(g, x + 26, y - 17, 6, 2, scale(col, 1.15));
}
function sofa(g, x, y, w, col = '#3d6b5a', cushion = '#c46a5a') {
  rect(g, x, y - 24, w, 12, col); rect(g, x + 3, y - 22, w - 6, 9, scale(col, 1.15));
  rect(g, x, y - 12, w, 12, col); rect(g, x, y - 27, 8, 27, col); rect(g, x + w - 8, y - 27, 8, 27, col);
  rect(g, x + 10, y - 12, (w - 22) / 2, 3, cushion); rect(g, x + w / 2 + 1, y - 12, (w - 22) / 2, 3, cushion); rect(g, x, y, w, 1, scale(col, 0.6));
}
function crate(g, x, y, s = 14, col = '#6a5438') { rect(g, x, y - s, s, s, col); outline(g, x, y - s, s, s, scale(col, 0.7)); hline(g, x + 1, y - s + 1, s - 2, scale(col, 1.2)); rect(g, x + 1, y - (s >> 1), s - 2, 1, scale(col, 0.7)); }
function barrel(g, x, y, w = 12, h = 20, col = '#4a3324') { rect(g, x, y - h, w, h, col); rect(g, x + 1, y - h, 2, h, scale(col, 1.25)); rect(g, x, y - h + 2, w, 1, '#2d3038'); rect(g, x, y - 3, w, 1, '#2d3038'); rect(g, x, y - (h >> 1), w, 1, '#2d3038'); }
function bucket(g, x, y, col = '#8a8a80') { rect(g, x, y - 8, 8, 8, col); rect(g, x + 1, y - 8, 1, 8, scale(col, 1.3)); rect(g, x - 1, y - 9, 10, 1, scale(col, 0.7)); rect(g, x + 3, y - 12, 2, 1, scale(col, 0.7)); rect(g, x + 2, y - 11, 1, 2, scale(col, 0.7)); rect(g, x + 5, y - 11, 1, 2, scale(col, 0.7)); }
function boots(g, x, y, col = '#2d3038') { rect(g, x, y - 13, 5, 13, col); rect(g, x + 5, y - 4, 4, 4, col); rect(g, x + 8, y - 13, 5, 13, col); rect(g, x + 13, y - 4, 4, 4, col); rect(g, x + 1, y - 13, 1, 10, scale(col, 1.4)); rect(g, x + 9, y - 13, 1, 10, scale(col, 1.4)); rect(g, x, y - 14, 5, 1, scale(col, 1.3)); rect(g, x + 8, y - 14, 5, 1, scale(col, 1.3)); }
function ropeCoil(g, x, y, col = '#c9b28a') { for (let i = 0; i < 4; i++) outline(g, x - 4 - i, y - 4 - i, 9 + i * 2, 9 + i * 2, i % 2 ? col : scale(col, 0.75)); rect(g, x, y - 9, 1, 3, '#3a3a3c'); }
function net(g, x, y, w, h, col = '#c9b28a') { for (let yy = y; yy < y + h; yy += 4) for (let xx = x; xx < x + w; xx += 4) rect(g, xx + ((yy - y) / 4 % 2 ? 2 : 0), yy, 1, 1, col); for (let i = 0; i < 3; i++) rect(g, x + 4 + i * (w / 3 | 0), y + h, 3, 3, i % 2 ? '#e0685a' : '#e8e2d2'); }
function plantPot(g, x, y, big = false) { rect(g, x - 5, y - 10, 11, 10, '#a05a3a'); rect(g, x - 6, y - 11, 13, 2, '#b8683f'); const h = big ? 22 : 10; rect(g, x, y - 8 - h, 1, h, '#3f6a30'); for (let i = 0; i < (big ? 5 : 2); i++) { const ly = y - 14 - i * 4, d = i % 2 ? 1 : -1; rect(g, x + d, ly, d * 5, 2, '#5a8a44'); rect(g, x + d * 5, ly - 1, 1, 1, '#4a7a3a'); } }
function coatRack(g, x, y) { rect(g, x, y - 48, 3, 48, '#4a3324'); rect(g, x - 5, y - 2, 13, 2, '#4a3324'); rect(g, x - 6, y - 47, 15, 3, '#4a3324'); rect(g, x - 10, y - 44, 10, 26, '#3d6b5a'); rect(g, x - 11, y - 45, 12, 4, '#3d6b5a'); rect(g, x - 8, y - 40, 2, 18, scale('#3d6b5a', 0.8)); rect(g, x + 5, y - 47, 9, 4, '#5a4a34'); rect(g, x + 2, y - 43, 14, 2, '#5a4a34'); }
function clockFace(g, L, x, y, r = 8) { disc(g, x, y, r + 2, '#3a2a1c'); disc(g, x, y, r, '#e8e2d2'); for (let i = 0; i < 12; i += 3) { const a = i / 12 * Math.PI * 2; rect(g, x + Math.sin(a) * (r - 2) - 0.5, y - Math.cos(a) * (r - 2) - 0.5, 1, 1, '#1a1712'); } L.clocks.push({ x, y, r }); }
function counter(f, x, w, top = '#c9b28a', front = '#5a4030') {
  // waist-high: the keeper stands behind it and shows from the belt up
  rect(f, x, G0 - 14, w, 14, front); for (let xx = x; xx < x + w; xx += 24) vline(f, xx, G0 - 14, 14, scale(front, 1.25)); hline(f, x, G0 - 4, w, scale(front, 0.7)); hline(f, x, G0 - 9, w, scale(front, 0.8));
  rect(f, x - 3, G0 - 17, w + 6, 3, top); hline(f, x - 3, G0 - 17, w + 6, mix(top, '#ffffff', 0.35)); hline(f, x - 3, G0 - 15, w + 6, scale(top, 0.7));
}

/* ------------------------------------------------------------ people --- */
function shadow(ctx, x, y, r = 8) { ellipse(ctx, x, y, r, 2, 'rgba(6,8,14,0.4)'); }
function bubbleZ(ctx, x, y, clock) { for (let k = 0; k < 2; k++) { const t = (clock * 0.45 + k * 0.5) % 1; ctx.globalAlpha = 1 - t; text(ctx, 'z', x + 4 + t * 8 + k * 3, y - 6 - t * 18, { color: '#cfd8ea', shadow: false }); } ctx.globalAlpha = 1; }
function smokePuff(ctx, x, y, clock, n = 3, col = 'rgba(200,200,210,') { for (let k = 0; k < n; k++) { const t = (clock * 0.35 + k / n) % 1; ctx.fillStyle = `${col}${0.4 * (1 - t)})`; ctx.fillRect(R(x + Math.sin((t + k) * 6) * 3 + t * 5), R(y - t * 26), 2, 2); } }
/** Keepers turn to face whoever is nearest. */
const facing = (kx, p, others) => { let best = p, bd = Math.abs(p.walk.x - kx); for (const o of others || []) { const d = Math.abs(o.walk.x - kx); if (d < bd) { bd = d; best = o; } } return best.walk.x < kx ? -1 : 1; };

/* ------------------------------------------------------------- bakes --- */
// Each bake paints two layers: `g` (behind the keeper) and `f` (counters and props the
// keeper stands behind). Live things register in L. The wall runs from CEIL to the
// floor line; above CEIL is ceiling, below G0 is floor.
const CEIL = 204;
function newLive() { return { windows: [], curtains: [], lamps: [], fires: [], steam: [], clocks: [], slab: null }; }

function bakeFishmonger(g, f, L, season) {
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#4a5058');
  wallTiles(g, 0, ceil, w, G0 - ceil);
  hangingLamp(g, L, 240, 226, ceil, '#2e5a3e'); hangingLamp(g, L, 400, 226, ceil, '#2e5a3e');
  rect(g, 0, G0 - 50, w, 7, '#3d6b8a'); for (let x = 0; x < w; x += 8) { rect(g, x + 1, G0 - 48, 3, 1, '#8fb4cc'); rect(g, x + 3, G0 - 47, 3, 1, '#8fb4cc'); rect(g, x + 5, G0 - 46, 2, 1, '#8fb4cc'); }
  skirting(g, w, G0, '#3a3f44');
  floorFlags(g, w);
  g.fillStyle = ditherPattern(g, '#7d8a94', 0.4); ellipse2(g, 150, 326, 30, 4); ellipse2(g, 300, 342, 46, 5);
  g.fillStyle = ditherPattern(g, '#b8a878', 0.3); ellipse2(g, 420, 320, 50, 6);
  door(g, L, 20, G0 - 36, 36, '#3d5468');
  rect(g, 50, G0 - 50, 1, 5, '#3a3a3c'); rect(g, 48, G0 - 45, 5, 4, '#e8b04a'); rect(g, 49, G0 - 41, 3, 1, '#b8863a');
  windowFrame(g, L, 84, 220, 40, 26, { trim: '#e8e2d2' });
  jar(g, 88, 249, 7, '#a8c8a0'); disc(g, 106, 247, 2, '#e8d04a'); disc(g, 111, 247, 2, '#e8d04a'); disc(g, 108, 244, 2, '#f0dc5a');
  // hanging rail with dried fish, a net and a lantern
  rect(g, 150, 212, 330, 2, '#3a3a3c');
  for (const hx of [166, 184, 204, 222]) { rect(g, hx, 214, 1, 3, '#8a8a80'); rect(g, hx - 2, 217, 5, 12, hash(hx, 1) < 0.5 ? '#a89a7c' : '#8a7a5c'); rect(g, hx - 1, 218, 1, 10, '#c9b28a'); rect(g, hx - 3, 229, 7, 3, '#6a5a3c'); rect(g, hx - 1, 216, 3, 1, '#4a4a3c'); }
  net(g, 244, 216, 40, 18);
  rect(g, 300, 214, 1, 5, '#3a3a3c'); rect(g, 297, 219, 7, 9, '#3a3a3c'); rect(g, 298, 220, 5, 7, '#e8b04a'); L.lamps.push({ x: 300.5, y: 223, r: 34, color: '#ffb257', kind: 'lantern', on: 'always', w: 5, glass: [298, 220, 5, 7] });
  // chalkboard (live text), a clock and a poster of the lake
  rect(g, 318, 208, 124, 56, '#5a4030'); rect(g, 320, 210, 120, 52, '#233a2e'); L.board = { x: 320, y: 210, w: 120, h: 52 };
  clockFace(g, L, 474, 222, 8);
  picture(g, 462, 244, 30, 18, 'lake', '#5a4030');
  // ice crate, salt barrels, crates (the cat sleeps up there), boots, bucket and mop
  crate(g, 148, G0, 22, '#8a8a80'); rect(g, 148, G0 - 26, 22, 4, '#e6ebef'); rect(g, 150, G0 - 27, 18, 1, '#f4f8fa'); text(g, 'ICE', 159, G0 - 18, { color: '#2d3038', align: 'center', shadow: false });
  barrel(g, 438, G0, 12, 20); barrel(g, 452, G0, 12, 17);
  crate(g, 470, G0, 14); crate(g, 486, G0, 14); crate(g, 478, G0 - 14, 12, '#7a6448');
  boots(g, 56, G0, '#3d5468'); bucket(g, 76, G0); rect(g, 88, G0 - 36, 2, 36, '#8a6a44'); rect(g, 85, G0 - 4, 8, 4, '#c9c3b4');
  rect(g, 190, 226, 14, 20, '#e8e2d2'); rect(g, 192, 228, 10, 16, '#d8d0bc'); rect(g, 194, 232, 2, 9, '#3d5468'); rect(g, 198, 232, 2, 9, '#3d5468'); rect(g, 193, 241, 4, 2, '#3d5468'); rect(g, 197, 241, 4, 2, '#3d5468');
  // front: marble counter with the ice, scales, register and the chopping board
  counter(f, 200, 220, '#c9cbc6', '#5a4030'); for (let i = 0; i < 10; i++) rect(f, 202 + i * 22 + (hash(i, 1) * 10 | 0), G0 - 16 + (hash(i, 2) * 2 | 0), 6 + (hash(i, 3) * 8 | 0), 1, '#a8acab');
  L.slab = { x: 206, y: G0 - 18, w: 160 };
  rect(f, 202, G0 - 19, 170, 3, '#e6ebef'); rect(f, 206, G0 - 20, 160, 1, '#f4f8fa'); f.fillStyle = ditherPattern(f, '#b8d0e0', 0.4); f.fillRect(202, G0 - 18, 170, 2);
  rect(f, 204, G0 - 22, 6, 3, '#4a7a3a'); rect(f, 206, G0 - 24, 3, 2, '#5a8a44'); disc(f, 366, G0 - 21, 2, '#e8d04a'); disc(f, 371, G0 - 20, 2, '#f0dc5a');
  rect(f, 380, G0 - 19, 12, 2, '#b8863a'); rect(f, 385, G0 - 31, 2, 12, '#b8863a'); rect(f, 376, G0 - 31, 20, 1, '#d8a84a'); rect(f, 376, G0 - 30, 1, 5, '#b8863a'); rect(f, 395, G0 - 30, 1, 5, '#b8863a'); rect(f, 373, G0 - 25, 7, 2, '#d8a84a'); rect(f, 392, G0 - 25, 7, 2, '#d8a84a');
  rect(f, 402, G0 - 30, 18, 13, '#2d3038'); rect(f, 404, G0 - 29, 14, 5, '#3d414a'); for (let i = 0; i < 4; i++) rect(f, 405 + i * 3, G0 - 22, 2, 2, '#e8e2d2'); rect(f, 402, G0 - 32, 18, 2, '#4a4d56');
  rect(f, 300, G0 - 19, 26, 2, '#c9a86a'); rect(f, 300, G0 - 19, 26, 1, '#e0c080');
}

function bakeTackle(g, f, L, season) {
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#2d2621'); beams(g, w, ceil, 3);
  wallBoards(g, 0, ceil, w, G0 - ceil, '#8a6a44', true, 7);
  skirting(g, w, G0, '#4a3324');
  floorBoards(g, w, '#6a4a30');
  rug(g, 250, 306, 110, 30, '#7a3a3a', '#c9a86a');
  door(g, L, 20, G0 - 36, 36, '#5c4030');
  coatRack(g, 58, G0); clockFace(g, L, 62, 218, 8);
  // rod rack; the rods are live because they depend on what you own
  rect(g, 76, 220, 124, G0 - 4 - 220, '#5a4030'); outline(g, 76, 220, 124, G0 - 4 - 220, '#3e2c20'); rect(g, 76, 224, 124, 3, '#7a5a3a'); rect(g, 76, G0 - 24, 124, 3, '#7a5a3a');
  for (let i = 0; i < 4; i++) { const rx = 92 + i * 30; rect(g, rx - 3, 224, 7, 3, '#3e2c20'); rect(g, rx - 3, G0 - 24, 7, 3, '#3e2c20'); }
  L.rack = { x: 92, step: 30, top: 230, bottom: G0 - 26, tag: G0 - 18 };
  text(g, 'RODS', 138, 210, { color: '#e8b04a', align: 'center', shadow: '#2a1a10' });
  windowFrame(g, L, 220, 208, 56, 24, { trim: '#c9b28a', curtains: '#7a3a3a' });
  shelf(g, 212, 250, 92, '#4a3324'); L.spools = { x: 218, y: 250, step: 22 };
  shelf(g, 212, 270, 92, '#4a3324'); jar(g, 216, 270, 10, '#a8b890'); jar(g, 224, 270, 8, '#c9a86a'); rect(g, 234, 260, 14, 10, '#3d6b5a'); rect(g, 235, 261, 12, 3, '#e8e2d2'); rect(g, 252, 263, 10, 7, '#8a3a3a'); rect(g, 266, 261, 8, 9, '#c9b28a'); rect(g, 278, 265, 20, 5, '#2d3038'); rect(g, 279, 266, 18, 1, '#5a5d66');
  rect(g, 340, 206, 92, 28, '#4a3324'); outline(g, 340, 206, 92, 28, '#7a5a3a'); rect(g, 344, 210, 84, 20, '#3e2c20'); L.trophy = { x: 386, y: 218 };
  text(g, 'BAIT', 388, 236, { color: '#e8b04a', align: 'center', shadow: '#2a1a10' });
  rect(g, 324, 244, 128, 42, '#c9b28a'); for (let y = 248; y < 286; y += 5) for (let x = 328; x < 452; x += 5) rect(g, x, y, 1, 1, '#8a7a5c'); L.pegs = { x: 336, y: 246, step: 30 };
  rect(g, 462, 208, 44, 44, '#d8c8a0'); outline(g, 462, 208, 44, 44, '#8a7a5a');
  for (let y = 0; y < 34; y++) for (let x = 0; x < 40; x++) if (lakeNorm(x * 16, y * 10.6) < 1) rect(g, 464 + x, 212 + y, 1, 1, lakeNorm(x * 16, y * 10.6) < 0.5 ? '#3e6f90' : '#5f8fb0');
  rect(g, 474, 238, 2, 2, '#e0685a'); text(g, 'LAKE', 484, 245, { color: '#5a4a34', align: 'center', shadow: false });
  rect(g, 464, 258, 40, 28, '#e8e2d2'); rect(g, 464, 258, 40, 8, '#8a3a3a'); L.calendar = { x: 484, y: 259 };
  stove(g, L, 464, G0, 'potbelly', ceil); rect(g, 492, G0 - 12, 18, 12, '#6a5438'); for (let i = 0; i < 4; i++) rect(g, 493 + i * 4, G0 - 17, 3, 6, '#8a6a44');
  rect(g, 210, G0 - 16, 16, 16, '#8a8a80'); rect(g, 211, G0 - 16, 1, 16, '#b8b8b0'); rect(g, 209, G0 - 17, 18, 1, '#6a6a60'); rect(g, 208, G0 - 28, 20, 10, '#e8e2d2'); text(g, 'FREE', 218, G0 - 27, { color: '#3a2a1c', align: 'center', shadow: false });
  hangingLamp(g, L, 150, 226, ceil, '#8a3a3a'); hangingLamp(g, L, 400, 228, ceil, '#8a3a3a');
  // front: the glass counter with reels and fly boxes inside; vise and magnifier on top
  rect(f, 236, G0 - 16, 148, 16, '#5a4030'); rect(f, 240, G0 - 14, 140, 11, '#2c3f50'); rect(f, 240, G0 - 14, 140, 2, '#4c6a86'); outline(f, 239, G0 - 15, 142, 13, '#b8863a');
  for (let i = 0; i < 5; i++) { const rx = 248 + i * 26; disc(f, rx + 4, G0 - 8, 3, '#8a8a80'); disc(f, rx + 4, G0 - 8, 1, '#3a3a3c'); rect(f, rx + 12, G0 - 10, 9, 5, i % 2 ? '#8a3a3a' : '#3d6b5a'); rect(f, rx + 13, G0 - 9, 7, 1, '#e8e2d2'); }
  rect(f, 232, G0 - 19, 156, 3, '#c9b28a'); hline(f, 232, G0 - 19, 156, '#e0c890'); hline(f, 232, G0 - 17, 156, '#8a6a44');
  rect(f, 296, G0 - 27, 3, 8, '#2d3038'); rect(f, 292, G0 - 29, 12, 2, '#3a3a3c'); rect(f, 302, G0 - 31, 4, 3, '#5a5d66');
  rect(f, 330, G0 - 21, 2, 2, '#2d3038'); rect(f, 331, G0 - 36, 1, 15, '#3a3a3c'); rect(f, 326, G0 - 38, 12, 3, '#2d3038'); L.lamps.push({ x: 332, y: G0 - 33, r: 34, color: '#ffe6b0', kind: 'mag', on: 'always', w: 10, glass: [327, G0 - 35, 10, 1] });
  rect(f, 350, G0 - 24, 14, 5, '#8a3a3a'); for (let i = 0; i < 3; i++) rect(f, 352 + i * 4, G0 - 23, 2, 2, ['#e8b04a', '#7fe0c3', '#ff8c66'][i]);
  rect(f, 254, G0 - 26, 1, 7, '#e0685a'); rect(f, 256, G0 - 28, 1, 9, '#7fe0c3'); rect(f, 258, G0 - 25, 1, 6, '#e8b04a');
}

function bakeBoatyard(g, f, L, season) {
  const w = 600, ceil = 196;
  rect(g, 0, 0, w, ceil, '#232628'); for (let x = 0; x < w; x += 12) vline(g, x, 0, ceil, '#1c1f21');
  beams(g, w, ceil, 4, '#3a3230'); rect(g, 0, ceil - 5, w, 5, '#4a4240'); hline(g, 0, ceil - 5, w, '#5c5452');
  wallBoards(g, 0, ceil, w, G0 - ceil, '#5d6260', false, 9);
  skirting(g, w, G0, '#3a3d3c');
  floorConcrete(g, w);
  door(g, L, 20, G0 - 36, 36, '#4a4744', false);
  rect(g, 62, 204, 64, 36, '#2c4a6e'); outline(g, 62, 204, 64, 36, '#1a2a44'); outline(g, 70, 218, 48, 10, '#a8c8e8'); rect(g, 70, 223, 48, 1, '#a8c8e8'); rect(g, 92, 210, 1, 8, '#a8c8e8'); for (let i = 0; i < 4; i++) rect(g, 66 + i * 14, 233, 10, 1, '#7aa0c8');
  for (let i = 0; i < 3; i++) rect(g, 64, 206 + i * 3, 12, 1, '#a8c8e8');
  L.storage = { x: 64, y: G0 };
  ropeCoil(g, 152, 212); ropeCoil(g, 174, 216, '#a89a7c');
  disc(g, 300, 218, 10, '#e8e2d2'); disc(g, 300, 218, 6, '#5d6260'); for (const a of [0, 1.57, 3.14, 4.71]) rect(g, 300 + Math.cos(a) * 8 - 2, 218 + Math.sin(a) * 8 - 2, 4, 4, '#e0685a');
  rect(g, 208, 206, 28, 28, '#e8e2d2'); for (let i = 0; i < 5; i++) hline(g, 211, 211 + i * 5, 22 - (hash(i, 9) * 8 | 0), '#8a8a80'); rect(g, 208, 206, 28, 1, '#3a3a3c');
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
  cageLamp(g, L, 240, ceil, 22); cageLamp(g, L, 420, ceil, 20);
  // front: trestles (the hull is live), the workbench, an anchor and chain, sawdust
  for (const tx of [176, 300]) { rect(f, tx - 14, G0 - 18, 28, 3, '#6a5438'); rect(f, tx - 12, G0 - 15, 3, 15, '#5a4a34'); rect(f, tx + 9, G0 - 15, 3, 15, '#5a4a34'); rect(f, tx - 15, G0 - 8, 30, 2, '#5a4a34'); }
  rect(f, 346, G0 - 20, 96, 5, '#8a6a44'); hline(f, 346, G0 - 20, 96, '#a88a5c'); rect(f, 348, G0 - 15, 6, 15, '#5a4a34'); rect(f, 434, G0 - 15, 6, 15, '#5a4a34'); rect(f, 348, G0 - 7, 92, 2, '#6a5438');
  rect(f, 352, G0 - 28, 12, 8, '#2d3038'); rect(f, 349, G0 - 26, 6, 3, '#3a3d46'); rect(f, 366, G0 - 25, 4, 4, '#3a3d46');
  for (let i = 0; i < 3; i++) { rect(f, 384 + i * 12, G0 - 29, 9, 9, ['#e0685a', '#3d6b8a', '#e8e2d2'][i]); rect(f, 385 + i * 12, G0 - 30, 7, 2, '#8a8a80'); }
  rect(f, 424, G0 - 31, 16, 11, '#5a4030'); rect(f, 426, G0 - 29, 8, 6, '#c9b28a'); rect(f, 436, G0 - 29, 2, 2, '#e8b04a'); rect(f, 426, G0 - 22, 12, 1, '#3a2a1c');
  rect(f, 360, G0 - 14, 30, 14, '#6a5438'); for (let i = 0; i < 3; i++) rect(f, 362 + i * 9, G0 - 12, 7, 10, '#7a6448'); rect(f, 360, G0 - 14, 30, 1, '#8a7458');
  rect(f, 132, G0 - 30, 3, 30, '#5a5d66'); rect(f, 124, G0 - 23, 19, 2, '#5a5d66'); rect(f, 120, G0 - 8, 6, 3, '#5a5d66'); rect(f, 141, G0 - 8, 6, 3, '#5a5d66'); rect(f, 122, G0 - 6, 24, 3, '#5a5d66'); disc(f, 133, G0 - 32, 3, '#5a5d66'); disc(f, 133, G0 - 32, 1, '#4a4c4d');
  for (let i = 0; i < 8; i++) rect(f, 100 + i * 4, G0 - 3 + (i % 2), 3, 2, '#5a5d66');
  f.fillStyle = ditherPattern(f, '#c0a870', 0.5); ellipse2(f, 240, G0 + 4, 50, 3);
}

function bakeHouse1(g, f, L, season) {   // Marla: rose paper, rocking chair, stove, quilted bed
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#d8d0bc'); beams(g, w, ceil, 2, '#6a5438');
  wallPaper(g, 0, ceil, w, G0 - ceil, '#d6c2a8', 'rose', '#c46a6a');
  rect(g, 0, ceil, w, 3, '#a08a6a'); skirting(g, w, G0, '#8a6a44');
  floorBoards(g, w, '#7a5a3a');
  rug(g, 200, 304, 150, 34, '#5a6a8a', '#c9a86a');
  door(g, L, 20, G0 - 36, 36, '#5c4030');
  windowFrame(g, L, 78, 218, 44, 28, { trim: '#e8e2d2', curtains: '#e8d8c8', plant: true, lace: true });
  // dresser with plates and a teapot
  rect(g, 154, G0 - 44, 60, 44, '#8a6a44'); rect(g, 154, G0 - 46, 60, 3, '#a88a5c'); for (let i = 0; i < 3; i++) { rect(g, 158, G0 - 40 + i * 13, 52, 10, '#6a4a30'); rect(g, 181, G0 - 36 + i * 13, 6, 2, '#e8b04a'); }
  shelf(g, 150, 232, 68, '#8a6a44'); for (let i = 0; i < 4; i++) { disc(g, 160 + i * 16, 228, 4, '#e8e2d2'); disc(g, 160 + i * 16, 228, 2, '#6a9ab8'); }
  rect(g, 160, G0 - 54, 12, 8, '#8fb4cc'); rect(g, 158, G0 - 52, 2, 3, '#8fb4cc'); rect(g, 172, G0 - 51, 3, 2, '#8fb4cc'); rect(g, 164, G0 - 56, 4, 2, '#8fb4cc');
  picture(g, 232, 212, 18, 18, 'portrait'); picture(g, 258, 210, 26, 16, 'boat'); picture(g, 292, 214, 18, 14, 'lake'); clockFace(g, L, 338, 224, 8);
  rect(g, 224, G0 - 12, 22, 12, '#c9a86a'); outline(g, 224, G0 - 12, 22, 12, '#8a6a44'); disc(g, 230, G0 - 14, 4, '#c46a6a'); disc(g, 239, G0 - 14, 4, '#5a6a8a'); disc(g, 235, G0 - 18, 3, '#e8e2d2');
  stove(g, L, 380, G0, 'range', ceil);
  shelf(g, 372, 246, 52, '#6a5438'); for (let i = 0; i < 5; i++) jar(g, 374 + i * 10, 246, 6 + (i % 2) * 2, ['#c9a86a', '#8a3a3a', '#a8b890', '#d8c48a', '#6a4a7a'][i]);
  bed(g, 440, G0, 62, ['#8a3a3a', '#d8c48a']);
  rect(g, 418, G0 - 22, 20, 3, '#6a4a30'); rect(g, 420, G0 - 19, 3, 19, '#6a4a30'); rect(g, 433, G0 - 19, 3, 19, '#6a4a30'); tableLamp(g, L, 428, G0 - 22, '#e8c890', 56);
  table(g, 296, G0, 30, '#6a4a30', 14); rect(g, 302, G0 - 18, 6, 4, '#e8e2d2'); rect(g, 308, G0 - 17, 2, 2, '#e8e2d2'); candle(g, L, 318, G0 - 14);
  L.chair = { x: 262, y: G0 };
  hangingLamp(g, L, 300, 226, ceil, '#d8c48a', 66, 'dim');
}

function bakeHouse2(g, f, L, season) {   // the Okafors: books, a desk, a radio, a world map
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#c9c3b4');
  wallPaper(g, 0, ceil, w, G0 - ceil, '#8fa0ac', 'stripe', '#7f909c');
  rect(g, 0, ceil, w, 3, '#5a6a76'); skirting(g, w, G0, '#3d4a54');
  floorBoards(g, w, '#5a4a3a');
  rug(g, 170, 308, 140, 30, '#8a3a3a', '#d8c48a');
  door(g, L, 20, G0 - 36, 36, '#3d4a54');
  rect(g, 60, 208, 100, G0 - 208, '#4a3324'); for (let i = 0; i < 4; i++) { const sy = 228 + i * 20; shelf(g, 62, sy, 96, '#6a4a30'); books(g, 64, sy, 20 + (i * 3) % 5, i + 7); }
  rect(g, 60, 208, 3, G0 - 208, '#3e2c20'); rect(g, 157, 208, 3, G0 - 208, '#3e2c20'); rect(g, 60, 206, 100, 3, '#5c4030');
  picture(g, 180, 212, 70, 30, 'map', '#5a4a3a'); coatRack(g, 168, G0); plantPot(g, 192, G0, true);
  windowFrame(g, L, 270, 214, 64, 30, { trim: '#e8e2d2', curtains: '#c46a5a' });
  clockFace(g, L, 356, 222, 8);
  sofa(g, 386, G0, 70);
  rect(g, 462, G0 - 22, 30, 3, '#6a4a30'); rect(g, 464, G0 - 19, 3, 19, '#6a4a30'); rect(g, 487, G0 - 19, 3, 19, '#6a4a30');
  rect(g, 466, G0 - 36, 24, 14, '#5a4030'); rect(g, 468, G0 - 34, 11, 10, '#c9b28a'); rect(g, 481, G0 - 34, 6, 6, '#e8b04a'); rect(g, 481, G0 - 26, 6, 1, '#e8e2d2'); rect(g, 470, G0 - 32, 7, 1, '#3a2a1c'); rect(g, 470, G0 - 30, 7, 1, '#3a2a1c'); rect(g, 470, G0 - 28, 7, 1, '#3a2a1c'); L.lamps.push({ x: 484, y: G0 - 31, r: 16, color: '#ffd28a', kind: 'radio', on: 'always', w: 6, glass: [481, G0 - 34, 6, 6] });
  rect(g, 358, G0 - 30, 26, 30, '#4a3324'); rect(g, 360, G0 - 16, 22, 12, '#3e2c20'); rect(g, 358, G0 - 34, 26, 4, '#6a4a30'); disc(g, 370, G0 - 34, 6, '#1a1a1c'); disc(g, 370, G0 - 34, 2, '#c46a5a'); rect(g, 379, G0 - 39, 1, 6, '#8a8a80');
  rect(g, 500, G0 - 28, 2, 28, '#3a3a3c'); rect(g, 496, G0 - 2, 10, 2, '#3a3a3c'); disc(g, 501, G0 - 34, 6, '#3e6f90'); rect(g, 498, G0 - 36, 3, 2, '#5a8a44'); rect(g, 502, G0 - 32, 4, 3, '#5a8a44');
  // front: the desk. Tunde sits behind it.
  rect(f, 236, G0 - 16, 80, 3, '#7a5a3a'); hline(f, 236, G0 - 16, 80, '#a88a5c'); rect(f, 238, G0 - 13, 76, 13, '#5a4030'); rect(f, 242, G0 - 10, 30, 5, '#4a3324'); rect(f, 280, G0 - 10, 30, 5, '#4a3324'); rect(f, 244, G0 - 8, 4, 1, '#e8b04a'); rect(f, 282, G0 - 8, 4, 1, '#e8b04a');
  rect(f, 296, G0 - 19, 8, 3, '#2d3038'); rect(f, 290, G0 - 21, 2, 5, '#e8b04a');
  deskLamp(f, L, 306, G0 - 16, 'dim', -1);
  L.desk = { x: 276, y: G0 };
  hangingLamp(g, L, 300, 226, ceil, '#e8e2d2', 66, 'dim');
}

function bakeHouse3(g, f, L, season) {   // Bram: dark planks, hearth, nets, the big pike
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#2d2621'); beams(g, w, ceil, 3, '#4a3a2c');
  wallBoards(g, 0, ceil, w, G0 - ceil, '#5a4634', false, 8);
  skirting(g, w, G0, '#3a2a1c');
  floorBoards(g, w, '#4e3826');
  rug(g, 180, 310, 120, 28, '#6a5438', '#c9b28a', false);
  door(g, L, 20, G0 - 36, 36, '#3e2c20');
  boots(g, 58, G0, '#4a3324'); rect(g, 80, G0 - 46, 3, 46, '#3a2a1c'); rect(g, 74, G0 - 48, 16, 3, '#3a2a1c'); rect(g, 70, G0 - 44, 10, 24, '#c9b28a'); rect(g, 68, G0 - 45, 14, 4, '#c9b28a');
  net(g, 90, 214, 56, 30, '#a89a7c'); ropeCoil(g, 160, 222); rect(g, 100, G0 - 40, 3, 3, '#e0685a'); rect(g, 130, G0 - 44, 3, 3, '#e8e2d2');
  windowFrame(g, L, 176, 218, 52, 28, { trim: '#8a7a5c', curtains: '#5a6a5a' });
  fireplace(g, L, 320, G0, 64);
  rect(g, 320, G0 - 74, 64, 18, '#2d3038'); rect(g, 322, G0 - 73, 60, 16, '#8a7a5c'); rect(g, 328, G0 - 68, 48, 8, '#7d9c5b'); rect(g, 328, G0 - 68, 48, 2, '#5e7a44'); rect(g, 366, G0 - 71, 10, 5, '#7d9c5b'); rect(g, 372, G0 - 73, 5, 3, '#5e7a44'); rect(g, 324, G0 - 66, 8, 4, '#7d9c5b'); rect(g, 326, G0 - 65, 2, 1, '#e8e2d2'); for (let i = 0; i < 5; i++) rect(g, 334 + i * 8, G0 - 62, 3, 1, '#c9d8a0');
  rect(g, 308, G0 - 58, 10, 8, '#a8c8a0'); rect(g, 309, G0 - 55, 8, 3, '#5c4030'); rect(g, 312, G0 - 57, 2, 2, '#e8e2d2'); rect(g, 318, G0 - 59, 2, 3, '#a08a5c');
  rect(g, 388, G0 - 66, 5, 12, '#8a8a80'); rect(g, 389, G0 - 64, 3, 8, '#e8e2d2'); L.barometer = { x: 390, y: G0 - 60 };
  rect(g, 300, G0 - 80, 100, 3, '#8a6a44'); rect(g, 300, G0 - 80, 10, 3, '#a88a5c');
  picture(g, 424, 214, 40, 24, 'lake', '#3e2c20'); clockFace(g, L, 488, 224, 8);
  rect(g, 438, G0 - 56, 1, 8, '#3a3a3c'); rect(g, 435, G0 - 48, 7, 7, '#e8b04a'); rect(g, 436, G0 - 47, 5, 5, '#fff2c0'); L.lamps.push({ x: 438.5, y: G0 - 45, r: 50, color: '#ffb257', kind: 'lantern', on: 'dim', w: 5, glass: [436, G0 - 47, 5, 5] });
  bed(g, 450, G0, 56, ['#3d6b5a', '#c9b28a'], '#d8d0bc');
  L.chair = { x: 264, y: G0 }; armchair(g, 244, G0, '#6a4a4a');
  table(g, 206, G0, 28, '#4e3826', 14); rect(g, 212, G0 - 18, 8, 4, '#c9b28a'); rect(g, 220, G0 - 17, 4, 2, '#3a2a1c');
  hangingLamp(g, L, 300, 228, ceil, '#5a4a34', 56, 'dim');
}

function bakeHouse4(g, f, L, season) {   // the Reyes home: warm paper, crayon art, toys, a bunk bed
  const w = 512, ceil = CEIL;
  ceiling(g, w, ceil, '#e8e2d2');
  wallPaper(g, 0, ceil, w, G0 - ceil, '#e0c48a', 'stencil', '#c8a060');
  rect(g, 0, ceil, w, 3, '#b8903a'); rect(g, 0, G0 - 40, w, 3, '#c46a5a'); for (let x = 0; x < w; x += 12) rect(g, x + 4, G0 - 39, 4, 1, '#e0c48a'); skirting(g, w, G0, '#a88a5c');
  floorBoards(g, w, '#8a6a44');
  rug(g, 150, 306, 120, 32, '#5a8a44', '#e8e2d2');
  door(g, L, 20, G0 - 36, 36, '#c46a5a');
  rect(g, 60, 212, 110, 1, '#8a8a80'); for (let i = 0; i < 5; i++) { rect(g, 66 + i * 22, 213, 6, 8, ['#e0685a', '#7fe0c3', '#e8b04a', '#5a6a8a', '#e8e2d2'][i]); rect(g, 66 + i * 22, 210, 1, 3, '#c9b28a'); rect(g, 71 + i * 22, 210, 1, 3, '#c9b28a'); }
  picture(g, 70, 230, 22, 16, 'crayon', '#c9b28a'); picture(g, 100, 234, 26, 16, 'crayon', '#c9b28a'); picture(g, 134, 228, 20, 18, 'crayon', '#c9b28a');
  windowFrame(g, L, 176, 214, 66, 30, { trim: '#e8e2d2', curtains: '#7fe0c3' });
  rect(g, 206, 224, 6, 6, '#f2c14e'); rect(g, 208, 222, 2, 10, '#f2c14e'); rect(g, 204, 226, 10, 2, '#f2c14e');
  clockFace(g, L, 278, 224, 8);
  stove(g, L, 300, G0, 'range', ceil); shelf(g, 296, 250, 44, '#a88a5c'); for (let i = 0; i < 4; i++) jar(g, 300 + i * 10, 250, 6, ['#e0685a', '#5a6a8a', '#e8b04a', '#7fe0c3'][i]);
  rect(g, 350, G0 - 36, 3, 36, '#c9b28a'); rect(g, 366, G0 - 36, 3, 36, '#c9b28a'); rect(g, 350, G0 - 24, 19, 3, '#c9b28a'); rect(g, 352, G0 - 40, 16, 4, '#e0685a'); rect(g, 350, G0 - 16, 19, 2, '#c9b28a'); rect(g, 352, G0 - 34, 15, 8, '#e0685a');
  // bunk bed on the right with a ladder; toys scattered on the floor
  rect(g, 400, G0 - 60, 4, 60, '#8a6a44'); rect(g, 480, G0 - 60, 4, 60, '#8a6a44'); rect(g, 400, G0 - 60, 84, 3, '#8a6a44');
  rect(g, 404, G0 - 40, 76, 5, '#a88a5c'); rect(g, 405, G0 - 45, 74, 5, '#5a6a8a'); rect(g, 407, G0 - 48, 14, 4, '#e8e2d2');
  rect(g, 404, G0 - 8, 76, 5, '#a88a5c'); rect(g, 405, G0 - 13, 74, 5, '#e0685a'); rect(g, 407, G0 - 16, 14, 4, '#e8e2d2');
  for (let i = 0; i < 5; i++) rect(g, 487, G0 - 54 + i * 11, 12, 2, '#8a6a44'); rect(g, 487, G0 - 58, 2, 58, '#8a6a44'); rect(g, 497, G0 - 58, 2, 58, '#8a6a44');
  rect(g, 216, G0 - 6, 6, 6, '#e0685a'); rect(g, 223, G0 - 6, 6, 6, '#5a6a8a'); rect(g, 219, G0 - 12, 6, 6, '#e8b04a'); disc(g, 250, G0 - 4, 4, '#7fe0c3'); rect(g, 248, G0 - 5, 2, 2, '#e8e2d2');
  shelf(g, 462, G0 - 66, 24, '#a88a5c'); tableLamp(g, L, 474, G0 - 66, '#e8c890', 50, 'dim'); L.nightlight = { x: 410, y: G0 - 22 };
  rect(g, 408, G0 - 26, 4, 4, '#c9b28a'); rect(g, 409, G0 - 28, 2, 2, '#f2c14e');
  // front: the kitchen table with the sewing machine; Elena sits behind it
  table(f, 130, G0, 96, '#a88a5c', 14); rect(f, 150, G0 - 25, 28, 11, '#2d3038'); rect(f, 152, G0 - 23, 24, 2, '#e0685a'); rect(f, 172, G0 - 31, 4, 7, '#2d3038'); rect(f, 156, G0 - 33, 14, 3, '#3a3d46'); rect(f, 190, G0 - 18, 12, 4, '#7fe0c3'); rect(f, 204, G0 - 17, 8, 3, '#e0685a');
  L.table = { x: 168, y: G0 };
  hangingLamp(g, L, 250, 226, ceil, '#e8e2d2', 66, 'dim');
}

const BAKERS = { fishmonger: bakeFishmonger, tackle: bakeTackle, boatyard: bakeBoatyard, house1: bakeHouse1, house2: bakeHouse2, house3: bakeHouse3, house4: bakeHouse4 };

function bake(id, season) {
  const rm = ROOMS[id], L = newLive();
  const [back, g] = mkCanvas(rm.w, H), [front, f] = mkCanvas(rm.w, H);
  BAKERS[id](g, f, L, season);
  return { season, back, front, live: L };
}
function getBake(id, season) {
  let b = bakes.get(id);
  if (!b || b.season !== season) { b = bake(id, season); bakes.set(id, b); }
  return b;
}

/* -------------------------------------------------------------- live --- */
const HILL = ['#6a7e6c', '#5e7a58', '#7a6e58', '#8f9aa4'];
const WATER = ['#3e6f90', '#33668f', '#355a78', '#4b6e88'];

/** The world outside a window: sky, hills, stars, weather on the glass. */
function drawWindowView(G, state, win, sky) {
  const { ctx, wx, clock, season } = G;
  const { top, hor, eff } = sky;
  const { x, y, w, h } = win;
  const bands = Math.max(2, h >> 2);
  for (let i = 0; i < bands; i++) { ctx.fillStyle = mix(top, hor, 0.3 + 0.7 * i / (bands - 1)); ctx.fillRect(x, y + R(i * h / bands), w, R(h / bands) + 1); }
  if (eff < 0.5 && wx.sky < 0.6) {
    ctx.fillStyle = `rgba(230,236,255,${(0.5 - eff) * 1.6 * (1 - wx.sky)})`;
    for (let i = 0, n = (w * h) / 70; i < n; i++) { const tw = hash(i, Math.floor(clock * 2), x) > 0.15 ? 1 : 0; if (tw) ctx.fillRect(x + R(hash(i, x) * (w - 1)), y + R(hash(x, i) * h * 0.55), 1, 1); }
    if (win.big && wx.sky < 0.45) { disc(ctx, x + w - 12, y + 16, 5, '#d6deee'); disc(ctx, x + w - 10, y + 15, 4, mix(top, hor, 0.3)); }
  }
  // far hills, then water for the openings that look onto the lake
  const hy = y + h * (win.water ? 0.5 : 0.66);
  let hc = mix(HILL[season], '#1c2438', (1 - eff) * 0.85);
  hc = mix(hc, '#7b8794', wx.sky * 0.3);
  for (let xx = 0; xx < w; xx++) { const hh = 4 + Math.sin((xx + x) * 0.07) * 3 + Math.sin((xx + x) * 0.21) * 2; ctx.fillStyle = hc; ctx.fillRect(x + xx, R(hy - hh), 1, R(y + h - (hy - hh))); if (((xx + x) | 0) % 7 === 0) { const t = 2 + (hash(xx + x, 1) * 3 | 0); for (let k = 0; k < t; k++) ctx.fillRect(x + xx, R(hy - hh) - t + k, 1, 1); } }
  if (win.water) {
    const wy = y + h - win.water, wc = mix(WATER[season], '#101828', (1 - eff) * 0.8);
    ctx.fillStyle = wc; ctx.fillRect(x, wy, w, win.water);
    ctx.fillStyle = mix(wc, hor, 0.45); for (let i = 0; i < 14; i++) { const sx = (hash(i, 1) * w + clock * (4 + i)) % w, sy = wy + 2 + (hash(i, 2) * (win.water - 4) | 0); if (Math.sin(clock * 2 + i) > 0.1) ctx.fillRect(R(x + sx), sy, 3, 1); }
    // a post and a moored rowboat just outside
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(x + 8, wy - 16, 2, 20); ctx.fillStyle = '#2e2018'; ctx.fillRect(x + 20, wy + 4, 18, 4); ctx.fillStyle = '#6e4a32'; ctx.fillRect(x + 22, wy + 5, 14, 2);
  }
  // weather on the glass
  const rain = wx.kind === 'rain' || wx.kind === 'storm';
  if (rain && wx.k > 0) {
    ctx.fillStyle = 'rgba(215,230,245,0.55)';
    for (let i = 0, n = (w * h) / 60 * wx.k; i < n; i++) { const sx = x + R(hash(i, 3, x) * (w - 1)); const t = (clock * 0.3 * (0.5 + hash(i, 4)) + hash(i, 5, x)) % 1; ctx.fillRect(sx, y + R(t * (h - 3)), 1, 3); }
    ctx.fillStyle = 'rgba(200,220,240,0.35)';
    for (let i = 0, n = (w * h) / 40 * wx.k; i < n; i++) ctx.fillRect(x + R(hash(i, 6, x) * (w - 1)), y + R(hash(i, 7, x) * (h - 1)), 1, 1);
    if (wx.kind === 'storm' && (wx.wind || 0) !== 0) { ctx.fillStyle = 'rgba(180,200,225,0.2)'; for (let i = 0; i < w; i += 3) ctx.fillRect(x + i, y + ((i * 7 + R(clock * 60)) % h), 1, 2); }
  }
  if (wx.kind === 'snow' && wx.k > 0) {
    ctx.fillStyle = 'rgba(240,246,250,0.85)';
    for (let i = 0, n = (w * h) / 50 * wx.k; i < n; i++) { const t = (clock * 0.12 * (0.6 + hash(i, 8)) + hash(i, 9, x)) % 1; ctx.fillRect(x + R((hash(i, 10, x) * w + Math.sin(clock + i) * 3 + w) % w), y + R(t * (h - 1)), 1, 1); }
  }
  if (season === 3) { ctx.fillStyle = '#e6ebef'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillStyle = ditherPattern(ctx, '#e6ebef', 0.5); ctx.fillRect(x, y + h - 4, w, 2); }
  // glass: a diagonal sheen and the cross bar
  ctx.fillStyle = 'rgba(255,255,255,0.09)'; for (let i = 0; i < h; i++) ctx.fillRect(x + w - 4 - (i >> 1), y + i, 2, 1);
  if (win.bar) { ctx.fillStyle = '#1a1712'; ctx.fillRect(x + (w >> 1), y, 1, h); ctx.fillRect(x, y + (h >> 1), w, 1); }
  if (win.lace) { ctx.fillStyle = ditherPattern(ctx, '#f0ead8', 0.4); ctx.fillRect(x, y, w, 6); ctx.fillRect(x, y + (h >> 1) + 1, w, 4); }
}

/** Daylight falling through a window: a dithered shaft to the floor with dust in it. */
function drawShaft(G, win, sky) {
  const { ctx, clock, wx } = G;
  if (sky.eff < 0.2 || win.small) return;
  const a = sky.eff * (0.55 - wx.sky * 0.4);
  if (a <= 0) return;
  const { x, y, w, h } = win, col = mix(sky.hor, '#fff4d0', 0.5);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = ditherPattern(ctx, col, a * 0.32);
  const drop = G0 + 40 - (y + h);
  for (let i = 0; i < drop; i += 2) { const t = i / drop; ctx.fillRect(R(x + t * 26), y + h + i, R(w + t * 30), 2); }
  ctx.fillStyle = ditherPattern(ctx, col, a * 0.25); ctx.fillRect(x + 6, G0 + 2, w + 22, 12);
  ctx.globalCompositeOperation = 'source-over';
  if (!G.reduceMotion) { ctx.fillStyle = `rgba(255,244,220,${0.5 * a})`; for (let i = 0; i < 14; i++) { const t = (clock * 0.05 * (0.5 + hash(i, 1)) + hash(i, 2, x)) % 1; ctx.fillRect(R(x + hash(i, 3, x) * w + t * 26 + Math.sin(clock + i) * 4), R(y + h + t * drop), 1, 1); } }
}

function lampState(G, state, l, house, sleeping) {
  const { light, wx } = G, dim = light < 0.6 || wx.sky > 0.4;
  if (sleeping && house && l.kind !== 'radio' && l.kind !== 'night') return 0;
  if (l.on === 'always') return dim ? 1 : 0.55;
  if (l.on === 'dim') return dim ? 1 : 0;
  return light < 0.5 ? 1 : 0;
}
function drawLampGlow(ctx, l, on, clock, reduceMotion) {
  if (l.glass) { ctx.fillStyle = on ? '#fff0c0' : '#5a5248'; ctx.fillRect(...l.glass); if (on && !reduceMotion && Math.sin(clock * 11 + l.x) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(l.glass[0] + 1, l.glass[1] + 1, 1, 1); } return; }
  if (!on) return;
  const x = R(l.x), y = R(l.y);
  if (l.kind === 'hang') { ctx.fillStyle = '#fff2c0'; ctx.fillRect(x - 3, y - 3, 6, 2); ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - 6, y - 1, 12, 1); }
  else if (l.kind === 'table') { ctx.fillStyle = ditherPattern(ctx, '#fff2c0', 0.55); ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillStyle = '#fff2c0'; ctx.fillRect(x - 1, y + 1, 2, 2); }
  else if (l.kind === 'desk') { ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - 3, y, 6, 1); }
  else if (l.kind === 'cage') { ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - 2, y - 3, 4, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 2, 2); }
  else if (l.kind === 'candle') { const f = Math.sin(clock * 13 + x) > 0 ? 1 : 0; ctx.fillStyle = '#ffd05a'; ctx.fillRect(x - 1, y - 1 + f, 2, 3); ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - 1, y + 1, 1, 1); }
}
function fireFrame(ctx, f, k, clock, reduceMotion) {
  // k: 1 full blaze, 0.3 embers. Stacked pixel tongues that change with the clock.
  const t = reduceMotion ? 0 : clock;
  const { x, y, w, h } = f, n = Math.max(2, w >> 2);
  ctx.fillStyle = k > 0.5 ? '#6a1e10' : '#3a1008'; ctx.fillRect(R(x - w / 2), R(y + h / 2 - 2), w, 3);
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + 1 + i * (w - 2) / (n - 1 || 1), ph = hash(i, f.x) * 6;
    const tall = k * h * (0.55 + 0.45 * Math.abs(Math.sin(t * 7 + ph)));
    if (k > 0.5) { ctx.fillStyle = '#ff7a2a'; ctx.fillRect(R(fx - 1), R(y + h / 2 - tall), 3, R(tall)); ctx.fillStyle = '#ffd05a'; ctx.fillRect(R(fx), R(y + h / 2 - tall * 0.6), 1, R(tall * 0.6)); }
    else if (hash(i, Math.floor(t * 3)) < 0.5 + k) { ctx.fillStyle = '#c84a22'; ctx.fillRect(R(fx), R(y + h / 2 - 1), 1, 1); }
  }
  if (k > 0.5 && !reduceMotion) { ctx.fillStyle = '#fff0a0'; for (let i = 0; i < 2; i++) { const s = (t * 1.3 + i * 0.5) % 1; if (hash(i, Math.floor(t * 2)) < 0.6) ctx.fillRect(R(x + Math.sin((s + i) * 8) * 3), R(y - s * (h + 4)), 1, 1); } }
}
function clockHands(ctx, c, minute) {
  const { x, y, r } = c, mh = (minute % 60) / 60, hh = ((minute / 60) % 12) / 12;
  for (const [a, len, col] of [[hh, r * 0.5, '#1a1712'], [mh, r * 0.78, '#3a2a1c']]) {
    const ang = a * Math.PI * 2;
    for (let i = 0; i <= len; i++) ctx.fillStyle = col, ctx.fillRect(R(x + Math.sin(ang) * i), R(y - Math.cos(ang) * i), 1, 1);
  }
  ctx.fillStyle = '#8a3a3a'; ctx.fillRect(x, y, 1, 1);
}
function drawFishShape(ctx, x, y, len, col, dir = 1) {
  // a lying fish: tapered body, tail, eye, a lighter belly stripe
  const h = Math.max(3, R(len * 0.32));
  for (let i = 0; i < len; i++) { const t = i / len, hh = Math.max(1, R(h * Math.sin(Math.PI * (0.1 + t * 0.85)))); ctx.fillStyle = col; ctx.fillRect(R(x + i * dir), R(y - hh / 2), 1, hh); }
  ctx.fillStyle = col; ctx.fillRect(R(x + len * dir), y - 2, R(2 * dir) || 1, 1); ctx.fillRect(R(x + (len + 1) * dir), y - 3, R(2 * dir) || 1, 6); ctx.fillRect(R(x + len * dir), y + 1, R(2 * dir) || 1, 1);
  ctx.fillStyle = mix(col, '#ffffff', 0.35); ctx.fillRect(R(x + 2 * dir), y + 1, R((len - 4) * dir) || 1, 1);
  ctx.fillStyle = '#0a0806'; ctx.fillRect(R(x + 2 * dir), y - 1, 1, 1);
}

/* ------------------------------------------------ per-room live things --- */
function chalkboard(ctx, L, state, season) {
  const b = L.board, day = state.time.day;
  text(ctx, 'TODAY', b.x + b.w / 2, b.y + 3, { color: '#dfe3d8', align: 'center', shadow: false });
  ctx.fillStyle = '#9aa598'; ctx.fillRect(b.x + 30, b.y + 11, b.w - 60, 1);
  const pool = FISH.filter(f => f.id !== 'boot' && (f.seasons === 'all' || f.seasons.includes(season)));
  for (let i = 0; i < 4; i++) {
    const f = pool[(hash(day, i) * pool.length) | 0];
    text(ctx, f.name, b.x + 5, b.y + 14 + i * 9, { color: i % 2 ? '#dfe3d8' : '#d8dcc8', shadow: false });
    text(ctx, `${f.ppk}g/kg`, b.x + b.w - 5, b.y + 14 + i * 9, { color: '#e8c96a', align: 'right', shadow: false });
  }
}
const KEEPERS = {
  hesper: { pal: { h: '#3a2a1c', s: '#c9956a', c: '#3d5468', d: '#2d3038', b: '#1a1720', a: '#e8e2d2', t: '#e8e2d2' }, apron: true, hat: 'kerchief', hair: 'short' },
  ansel:  { pal: { h: '#8a7a5c', s: '#e6c3a0', c: '#5a6a3a', d: '#4a3324', b: '#1a1720', t: '#5a4030' }, hat: 'cap', glasses: true, hair: 'short' },
  dov:    { pal: { h: '#3a2a1c', s: '#c9956a', c: '#3d6b8a', d: '#4a4744', b: '#1a1720', t: '#e8b04a' }, hat: 'brim', beard: true },
  marla:  { pal: { h: '#d8d0bc', s: '#e6c3a0', c: '#8a5a7a', d: '#5a4a4a', b: '#3a2a1c' }, hair: 'bun', glasses: true },
  tunde:  { pal: { h: '#1a1712', s: '#7a4a2a', c: '#c46a5a', d: '#3d4a54', b: '#1a1720' }, glasses: true, hair: 'short' },
  ada:    { pal: { h: '#2a1a10', s: '#8a5a3a', c: '#e8b04a', d: '#5a4a4a', b: '#3a2a1c' }, hair: 'curls' },
  bram:   { pal: { h: '#d8d0bc', s: '#c9956a', c: '#3d6b5a', d: '#4a3324', b: '#1a1720' }, hair: 'bald', beard: true },
  elena:  { pal: { h: '#2a1a10', s: '#c9956a', c: '#5a8a44', d: '#5a4a4a', b: '#3a2a1c' }, hair: 'long' },
  nico:   { pal: { h: '#2a1a10', s: '#d8a880', c: '#e0685a', d: '#5a6a8a', b: '#3a2a1c', t: '#3d6b8a' }, hat: 'cap' },
};
function liveFishmonger(G, state, p, L, layer, ctx, clock, sleeping, others) {
  if (layer === 'back') {
    chalkboard(ctx, L, state, G.season);
    // Hesper behind the counter, chopping; she turns to face you
    const frame = G.reduceMotion ? 0 : Math.floor(clock * 2) % 2, x = 282, y = G0 - 10, dir = facing(x, p, others);
    drawFigure(ctx, x, y, { ...KEEPERS.hesper, dir, arm: frame });
    const hx = x + dir * 6;
    ctx.fillStyle = '#b8bcc0'; if (frame) { ctx.fillRect(hx - 1, y - 37, 3, 7); ctx.fillStyle = '#5a4030'; ctx.fillRect(hx - 1, y - 30, 2, 2); } else { ctx.fillRect(hx - 1, y - 20, 3, 7); ctx.fillStyle = '#5a4030'; ctx.fillRect(hx - 1, y - 22, 2, 2); }
    drawCat(ctx, 470, G0 - 26, '#d08a3a', Math.floor(clock * 0.7) % 2);
  } else {
    const slab = state.empire.slab || [];
    slab.forEach((f, i) => { const spec = FISH_BY_ID[f.id]; if (!spec) return; const len = clamp(6 + Math.sqrt(f.weight) * 5, 6, 22); drawFishShape(ctx, L.slab.x + 2 + i * 18, L.slab.y - 2, len, spec.color, 1); });
    ctx.fillStyle = '#d98aa0'; ctx.fillRect(306, G0 - 22, 5, 3); ctx.fillRect(314, G0 - 22, 4, 3); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(312, G0 - 21, 1, 2);
    if (p.hold.length) { const f = p.hold[0]; drawFishShape(ctx, 374, G0 - 27, 6, FISH_BY_ID[f.id]?.color || '#8ab4c8', 1); }
  }
}
const ROD_COL = ['#c9b28a', '#e8e2d2', '#2d3038', '#8ab4c8'], LINE_COL = ['#e8e2d2', '#a8c8e0', '#5a8a44', '#c8ccd4'];
function liveTackle(G, state, p, L, layer, ctx, clock, sleeping, others) {
  const e = state.empire;
  if (layer !== 'back') return;
  for (let i = 0; i < 4; i++) {
    const rx = L.rack.x + i * L.rack.step, owned = i <= e.rod, col = owned ? ROD_COL[i] : scale(ROD_COL[i], 0.7);
    ctx.fillStyle = col; ctx.fillRect(rx, L.rack.top, 1, L.rack.bottom - L.rack.top); ctx.fillStyle = scale(col, 1.2); ctx.fillRect(rx, L.rack.top, 1, 2);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = i === 2 ? '#e0685a' : '#6a5438'; ctx.fillRect(rx - 1, L.rack.top + 4 + k * 8, 3, 1); }
    disc(ctx, rx + 2, L.rack.bottom - 8, 2, '#3a3a3c'); ctx.fillStyle = i === 3 ? '#8ab4c8' : '#8a8a80'; ctx.fillRect(rx + 2, L.rack.bottom - 8, 1, 1);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(rx - 1, L.rack.bottom - 6, 3, 6);
    if (i === 3) { ctx.fillStyle = `rgba(160,220,255,${0.3 + 0.2 * Math.sin(clock * 3)})`; ctx.fillRect(rx - 1, L.rack.top, 3, 12); }
    if (owned) text(ctx, i === e.rod ? 'yours' : 'old', rx, L.rack.tag, { color: '#8fd47f', align: 'center', shadow: false });
    else if (i === e.rod + 1) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(rx - 11, L.rack.tag - 2, 22, 10); text(ctx, `${GEAR.rod[i].price}`, rx, L.rack.tag, { color: '#2a1a10', align: 'center', shadow: false }); }
    else text(ctx, `${GEAR.rod[i].price}`, rx, L.rack.tag, { color: '#a89a7c', align: 'center', shadow: false });
  }
  for (let i = 0; i < 4; i++) {
    const sx = L.spools.x + i * L.spools.step, owned = i <= e.line, col = owned ? LINE_COL[i] : scale(LINE_COL[i], 0.55);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(sx, L.spools.y - 10, 12, 10); ctx.fillStyle = col; ctx.fillRect(sx + 1, L.spools.y - 8, 10, 6); ctx.fillStyle = scale(col, 0.7); for (let k = 0; k < 3; k++) ctx.fillRect(sx + 1, L.spools.y - 7 + k * 2, 10, 1);
    if (i === e.line) { ctx.fillStyle = '#8fd47f'; ctx.fillRect(sx + 4, L.spools.y - 14, 4, 2); }
    else if (i === e.line + 1) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(sx + 4, L.spools.y - 14, 4, 2); }
  }
  for (let i = 0; i < 4; i++) {
    const bx = L.pegs.x + i * L.pegs.step, by = L.pegs.y + 8, cur = e.bait === i && (i === 0 || e.baitCount > 0);
    ctx.fillStyle = '#3a3a3c'; ctx.fillRect(bx + 4, by - 6, 1, 4);
    if (i === 0) { ctx.fillStyle = '#7a5a3a'; ctx.fillRect(bx, by - 2, 10, 9); ctx.fillStyle = '#5a4030'; ctx.fillRect(bx, by - 2, 10, 2); ctx.fillStyle = '#d98aa0'; ctx.fillRect(bx + 2, by + 1, 3, 1); ctx.fillRect(bx + 6, by + 3, 2, 1); }
    else if (i === 1) { ctx.fillStyle = '#e8d04a'; ctx.fillRect(bx + 1, by - 1, 8, 10); ctx.fillStyle = '#b8a070'; ctx.fillRect(bx + 1, by - 2, 8, 2); ctx.fillStyle = '#f0e8a0'; ctx.fillRect(bx + 3, by + 3, 2, 2); ctx.fillRect(bx + 6, by + 5, 1, 2); }
    else if (i === 2) { ctx.fillStyle = 'rgba(190,220,240,0.8)'; ctx.fillRect(bx, by - 1, 10, 11); ctx.fillStyle = '#6f9fbf'; ctx.fillRect(bx + 2, by + 3, 4, 2); ctx.fillRect(bx + 5, by + 6, 3, 2); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(bx + 3, by - 2, 4, 1); }
    else { ctx.fillStyle = '#3a3a3c'; ctx.fillRect(bx + 4, by - 2, 2, 4); ctx.fillStyle = `rgba(120,255,160,${0.6 + 0.4 * Math.sin(clock * 4)})`; ctx.fillRect(bx + 3, by + 2, 4, 6); ctx.fillStyle = '#e8ffe8'; ctx.fillRect(bx + 4, by + 3, 2, 2); }
    if (cur) { ctx.fillStyle = '#8fd47f'; ctx.fillRect(bx + 3, by + 12, 4, 2); if (i > 0) text(ctx, `x${e.baitCount}`, bx + 5, by + 16, { color: '#8fd47f', align: 'center', shadow: false }); }
  }
  const best = e.best, spec = best && FISH.find(f => f.name === best.name);
  if (spec) { const len = clamp(14 + Math.sqrt(best.weight) * 9, 14, 64); drawFishShape(ctx, L.trophy.x - len / 2, L.trophy.y - 4, len, spec.color, 1); text(ctx, `${best.weight} kg  ${best.by}`, L.trophy.x, L.trophy.y + 3, { color: '#c9b28a', align: 'center', shadow: false }); }
  else text(ctx, 'your fish here', L.trophy.x, L.trophy.y - 3, { color: '#7a6a4c', align: 'center', shadow: false });
  text(ctx, SEASON_NAMES[G.season].slice(0, 3).toUpperCase(), L.calendar.x, L.calendar.y, { color: '#e8e2d2', align: 'center', shadow: false });
  text(ctx, `${dayOfSeason(state.time.day)}`, L.calendar.x, L.calendar.y + 10, { color: '#3a2a1c', align: 'center', shadow: false, scale: 2 });
  // Ansel at the vise under his magnifier
  const frame = G.reduceMotion ? 0 : Math.floor(clock * 1.4) % 2, x = 318, y = G0 - 10, dir = facing(x, p, others);
  drawFigure(ctx, x, y, { ...KEEPERS.ansel, dir, arm: frame });
  ctx.fillStyle = '#e0685a'; ctx.fillRect(x + dir * 6, y - (frame ? 31 : 13), 1, 2);
}
function liveBoatyard(G, state, p, L, layer, ctx, clock, sleeping, others) {
  const e = state.empire;
  if (layer === 'back') {
    const s = L.storage, own = e.storage, tint = i => i <= own ? 1 : 0.6;
    ctx.fillStyle = scale('#8a8a80', tint(0)); ctx.fillRect(s.x, s.y - 12, 11, 12); ctx.fillStyle = scale('#b8b8b0', tint(0)); ctx.fillRect(s.x + 1, s.y - 12, 1, 12);
    ctx.fillStyle = scale('#3d6b8a', tint(1)); ctx.fillRect(s.x + 16, s.y - 16, 26, 16); ctx.fillStyle = scale('#e8e2d2', tint(1)); ctx.fillRect(s.x + 16, s.y - 18, 26, 3);
    ctx.fillStyle = scale('#e8e2d2', tint(2)); ctx.fillRect(s.x + 46, s.y - 24, 30, 24); ctx.fillStyle = scale('#8ab4c8', tint(2)); ctx.fillRect(s.x + 48, s.y - 22, 26, 3); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(s.x + 58, s.y - 15, 5, 1);
    ctx.fillStyle = scale('#5a4030', tint(3)); ctx.fillRect(s.x + 16, s.y - 42, 60, 22); ctx.fillStyle = scale('#7a5a3a', tint(3)); for (let k = 0; k < 3; k++) ctx.fillRect(s.x + 17, s.y - 41 + k * 7, 58, 1); ctx.fillStyle = scale('#2d3038', tint(3)); ctx.fillRect(s.x + 42, s.y - 34, 9, 3);
    for (let i = 0; i < 4; i++) { const px = [s.x + 4, s.x + 28, s.x + 60, s.x + 46][i], py = [s.y - 16, s.y - 22, s.y - 28, s.y - 46][i]; ctx.fillStyle = i <= own ? '#8fd47f' : i === own + 1 ? '#f2c14e' : '#5d6260'; ctx.fillRect(px, py, 3, 2); }
    text(ctx, 'HOLDS', s.x + 40, s.y - 54, { color: '#e8b04a', align: 'center', shadow: '#1a1a1c' });
    const en = e.engine, E = L.engines;
    const slots = [[E.x + 6, E.y1], [E.x + 44, E.y1], [E.x + 6, E.y2], [E.x + 44, E.y2]];
    slots.forEach(([ex, ey], i) => {
      const k = i <= en ? 1 : 0.6;
      if (i === 0) { ctx.fillStyle = scale('#a8825a', k); for (let j = 0; j < 22; j++) { ctx.fillRect(ex + j, ey - 4 - j, 1, 1); ctx.fillRect(ex + 22 - j, ey - 4 - j, 1, 1); } ctx.fillStyle = scale('#c9b28a', k); ctx.fillRect(ex - 1, ey - 8, 4, 5); ctx.fillRect(ex + 20, ey - 8, 4, 5); }
      else { const big = i === 3, col = i === 1 ? '#5d6260' : i === 2 ? '#3a3a3c' : '#8a3a3a'; ctx.fillStyle = scale(col, k); ctx.fillRect(ex + 2, ey - 30, 14 + (big ? 6 : 0), 12); ctx.fillStyle = scale(mix(col, '#ffffff', 0.25), k); ctx.fillRect(ex + 3, ey - 29, 12 + (big ? 6 : 0), 3); ctx.fillStyle = scale('#2d3038', k); ctx.fillRect(ex + 7, ey - 18, 4, 14); ctx.fillRect(ex + 5, ey - 6, 8, 4); if (i === 2) { ctx.fillStyle = scale(col, k); ctx.fillRect(ex + 18, ey - 28, 8, 10); ctx.fillStyle = scale('#2d3038', k); ctx.fillRect(ex + 21, ey - 18, 3, 14); } if (big) { ctx.fillStyle = scale('#e8b04a', k); ctx.fillRect(ex + 6, ey - 26, 6, 2); } }
      ctx.fillStyle = i <= en ? '#8fd47f' : i === en + 1 ? '#f2c14e' : '#5d6260'; ctx.fillRect(ex + 26, ey - 32, 3, 2);
      if (i === en + 1) text(ctx, `${GEAR.engine[i].price}`, ex + 12, ey - 40, { color: '#f2c14e', align: 'center', shadow: '#1a1a1c' });
    });
    drawGull(ctx, 558, G0 - 4, Math.sin(clock * 0.7) > 0.95);
  } else {
    // the hull on the trestles: whatever boat the crew owns
    const tier = e.boat, len = GEAR.boat[tier].len * 4, hx = 240 - len / 2, hy = G0 - 19;
    const cols = ['#6e4a32', '#e8e2d2', '#3d6b8a', '#3a5a44'][tier], trim = ['#a8825a', '#3d6b8a', '#e8e2d2', '#e8b04a'][tier];
    for (let i = 0; i < 13; i++) { const inset = R((i * i) / 9); ctx.fillStyle = i < 2 ? trim : i % 3 ? cols : scale(cols, 0.85); ctx.fillRect(R(hx + inset), hy - 14 + i, R(len - inset * 2), 1); }
    ctx.fillStyle = scale(cols, 0.55); ctx.fillRect(R(hx + 8), hy - 2, R(len - 16), 2);
    if (tier >= 2) { ctx.fillStyle = tier === 2 ? '#c9b28a' : '#e8e2d2'; ctx.fillRect(R(hx + len * 0.55), hy - 28, R(len * 0.3), 14); ctx.fillStyle = '#2c3f50'; ctx.fillRect(R(hx + len * 0.58), hy - 26, 6, 5); ctx.fillRect(R(hx + len * 0.7), hy - 26, 6, 5); }
    if (tier === 3) { ctx.fillStyle = '#5a4030'; ctx.fillRect(R(hx + len * 0.4), hy - 52, 2, 38); ctx.fillRect(R(hx + len * 0.3), hy - 46, R(len * 0.24), 1); ctx.fillStyle = '#e0685a'; ctx.fillRect(R(hx + len * 0.9), hy - 24, 3, 5); }
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(R(hx + 4), hy - 42, 8, 10); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(R(hx + 7), hy - 44, 2, 3); ctx.fillStyle = '#8a8a80'; ctx.fillRect(R(hx + 6), hy - 39, 4, 1); ctx.fillRect(R(hx + 6), hy - 37, 4, 1); ctx.fillRect(R(hx + 6), hy - 35, 3, 1);
    // Dov sanding the stern; sawdust falls
    const frame = G.reduceMotion ? 0 : Math.floor(clock * 3.2) % 2, x = 356 - frame, y = G0;
    shadow(ctx, x, y, 9);
    drawFigure(ctx, x, y, { ...KEEPERS.dov, dir: -1, arm: 2 });
    ctx.fillStyle = '#c9b28a'; ctx.fillRect(x - 15, y - 21, 6, 4);
    if (!G.reduceMotion) { ctx.fillStyle = '#e0d0a0'; for (let i = 0; i < 4; i++) { const t = (clock * 0.9 + i * 0.25) % 1; ctx.fillRect(R(x - 14 - t * 6 + Math.sin(t * 9 + i) * 2), R(y - 18 + t * 18), 1, 1); } }
  }
}
function liveHouse1(G, state, p, L, layer, ctx, clock, sleeping) {
  if (layer !== 'back') return;
  const rock = G.reduceMotion ? 0 : Math.sin(clock * 2.2);
  const cx = L.chair.x - 8, cy = G0 - R(rock);
  ctx.fillStyle = '#6a4a30'; ctx.fillRect(cx - 6, G0 - 2, 34, 2); ctx.fillRect(cx - 2, cy - 32, 3, 32); ctx.fillRect(cx + 16, cy - 12, 3, 12); ctx.fillRect(cx - 2, cy - 13, 22, 3);
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(cx, cy - 30, 1, 17); ctx.fillRect(cx + 2, cy - 29, 1, 16); ctx.fillRect(cx + 4, cy - 28, 1, 15);
  if (!sleeping) {
    const frame = Math.floor(clock * 2.5) % 2;
    drawSeated(ctx, L.chair.x, cy, { ...KEEPERS.marla, dir: 1, arm: 1 });
    ctx.fillStyle = '#c46a6a'; ctx.fillRect(L.chair.x + 2, cy - 15, 7, 4); ctx.fillStyle = '#8a8a80'; ctx.fillRect(L.chair.x + 5 + frame, cy - 19 - frame, 1, 5); ctx.fillRect(L.chair.x + 9, cy - 18, 1, 4);
    ctx.fillStyle = '#c46a6a'; ctx.fillRect(L.chair.x - 16, G0 - 6, 6, 4); for (let i = 0; i < 8; i++) ctx.fillRect(L.chair.x - 10 + (i >> 1), G0 - 6 - (i % 2), 1, 1);
    drawCat(ctx, 338, G0, '#8a7a6a', Math.floor(clock * 0.8) % 2);
  } else {
    drawSleeper(ctx, 442, G0 - 17, { ...KEEPERS.marla, hair: 'bun' });
    ctx.fillStyle = '#8a3a3a'; ctx.fillRect(452, G0 - 13, 46, 4); ctx.fillStyle = '#d8c48a'; ctx.fillRect(452, G0 - 13, 46, 1);
    drawCat(ctx, 484, G0 - 12, '#8a7a6a', 0);
    bubbleZ(ctx, 452, G0 - 22, clock);
  }
}
function liveHouse2(G, state, p, L, layer, ctx, clock, sleeping) {
  if (layer === 'back') {
    const page = !sleeping && !G.reduceMotion && (clock % 3.2) < 0.35;
    drawSeated(ctx, L.desk.x - 14, G0 - 2, { ...KEEPERS.tunde, dir: 1, arm: page ? 0 : 1 });
    if (sleeping) bubbleZ(ctx, L.desk.x - 8, G0 - 30, clock);
    if (!sleeping) { drawSeated(ctx, 426, G0 - 2, { ...KEEPERS.ada, dir: -1, arm: 1 }); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(416, G0 - 20, 6, 5); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(416, G0 - 20, 6, 1); if (Math.sin(clock * 0.6) > 0.7) { ctx.fillStyle = '#e8e2d2'; ctx.fillRect(414, G0 - 23, 2, 2); } }
  } else {
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(264, G0 - 20, 20, 4); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(273, G0 - 20, 1, 4); ctx.fillStyle = '#8a8a80'; ctx.fillRect(266, G0 - 19, 6, 1); ctx.fillRect(276, G0 - 19, 6, 1); ctx.fillRect(266, G0 - 17, 5, 1);
    if (!sleeping) smokePuff(ctx, 300, G0 - 21, clock, 2, 'rgba(230,230,235,');
  }
}
function liveHouse3(G, state, p, L, layer, ctx, clock, sleeping) {
  if (layer !== 'back') return;
  const x = L.chair.x + 2;
  drawSeated(ctx, x, G0 - 2, { ...KEEPERS.bram, dir: 1, arm: 0 });
  if (!sleeping) { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + 4, G0 - 26, 5, 1); ctx.fillRect(x + 8, G0 - 28, 2, 3); if (!G.reduceMotion) smokePuff(ctx, x + 9, G0 - 30, clock, 3); }
  else bubbleZ(ctx, x + 4, G0 - 32, clock);
  drawDog(ctx, 288, G0, '#8a6a44', Math.floor(clock * 0.9) % 2);
  const b = L.barometer, ang = { clear: 0.35, overcast: 0, rain: -0.4, storm: -0.9, snow: -0.3 }[G.wx.kind] || 0;
  ctx.fillStyle = '#e0685a'; ctx.fillRect(R(b.x + Math.sin(ang) * 2), R(b.y - Math.cos(ang) * 2), 1, 1); ctx.fillRect(b.x, b.y, 1, 1);
}
function liveHouse4(G, state, p, L, layer, ctx, clock, sleeping) {
  if (layer === 'back') {
    if (!sleeping) {
      const frame = G.reduceMotion ? 0 : Math.floor(clock * 4) % 2;
      drawSeated(ctx, L.table.x - 28, G0 - 2, { ...KEEPERS.elena, dir: 1, arm: 1 });
      const kf = Math.floor(clock * 1.6) % 2;
      drawKid(ctx, 246, G0, { ...KEEPERS.nico, dir: 1, arm: kf, moving: false });
      ctx.fillStyle = '#5c4030'; ctx.fillRect(256 + kf * 2, G0 - 4, 10, 4); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(260 + kf * 2, G0 - 9, 3, 5);
    } else {
      drawSleeper(ctx, 407, G0 - 21, KEEPERS.nico); ctx.fillStyle = '#e0685a'; ctx.fillRect(418, G0 - 16, 44, 3);
      drawSleeper(ctx, 407, G0 - 53, KEEPERS.elena); ctx.fillStyle = '#5a6a8a'; ctx.fillRect(418, G0 - 48, 44, 3);
      bubbleZ(ctx, 416, G0 - 26, clock);
      ctx.fillStyle = '#5c4030'; ctx.fillRect(388, G0 - 4, 10, 4); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(392, G0 - 9, 3, 5);
    }
  } else if (!sleeping) {
    const frame = G.reduceMotion ? 0 : Math.floor(clock * 4) % 2;
    ctx.fillStyle = '#7fe0c3'; ctx.fillRect(176, G0 - 16, 14 - frame, 2); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(174, G0 - 30 + frame, 1, 3);
  }
}
const LIVE = { fishmonger: liveFishmonger, tackle: liveTackle, boatyard: liveBoatyard, house1: liveHouse1, house2: liveHouse2, house3: liveHouse3, house4: liveHouse4 };

/** Is the hearth or stove lit in this room right now? 1 blaze, 0.3 embers, 0 cold. */
function fireLevel(id, G, state, sleeping) {
  if (id === 'tackle' || id === 'boatyard') return 1;
  const cold = G.season === 3 || G.wx.kind === 'rain' || G.wx.kind === 'storm' || G.wx.kind === 'snow', dim = G.light < 0.6 || G.wx.sky > 0.4;
  if (sleeping) return 0.3;
  return cold || dim ? 1 : id === 'house1' ? 0.3 : 0;
}

/* ------------------------------------------------------------- scene --- */
export function drawRoom(G, state, p, cam, vw, vh, others = []) {
  const { ctx, clock, season, reduceMotion } = G;
  const id = p.room, rm = ROOMS[id], B = getBake(id, season), L = B.live;
  const house = !!BUILDING_BY_ID[id].house, sleeping = house && asleep(state.time.minute);
  const sky = skyColors(G, state);
  // beyond the walls, if the pane is wider than the room
  ctx.fillStyle = '#07080c'; ctx.fillRect(cam.x - 2, cam.y - 2, vw + 4, vh + 4);
  ctx.drawImage(B.back, 0, 0);
  for (const w of L.windows) drawWindowView(G, state, w, sky);
  for (const c of L.curtains) drawCurtains(ctx, c);
  for (const w of L.windows) if (!w.small) drawShaft(G, w, sky);
  const fire = fireLevel(id, G, state, sleeping);
  for (const f of L.fires) fireFrame(ctx, f, fire, clock, reduceMotion);
  if (fire > 0.5 && !reduceMotion) for (const s of L.steam) smokePuff(ctx, s.x, s.y, clock, 3, 'rgba(235,238,245,');
  for (const l of L.lamps) drawLampGlow(ctx, l, lampState(G, state, l, house, sleeping) > 0, clock, reduceMotion);
  if (L.nightlight && sleeping) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(L.nightlight.x - 1, L.nightlight.y - 6, 2, 2); }
  for (const c of L.clocks) clockHands(ctx, c, state.time.minute);
  LIVE[id](G, state, p, L, 'back', ctx, clock, sleeping, others);
  ctx.drawImage(B.front, 0, 0);
  LIVE[id](G, state, p, L, 'front', ctx, clock, sleeping, others);
  for (const o of others) drawWalker(G, o, false);
  drawWalker(G, p);
}

export function roomLights(G, state, p, cam, vw) {
  const { clock, reduceMotion, light } = G, id = p.room, B = getBake(id, G.season), L = B.live;
  const house = !!BUILDING_BY_ID[id].house, sleeping = house && asleep(state.time.minute);
  const sky = skyColors(G, state), flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.5;
  const out = [];
  for (const w of L.windows) if (sky.eff > 0.05) out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: w.small ? 30 : w.big ? 130 : 84, color: mix(sky.hor, '#ffffff', 0.4), a: sky.eff * (w.small ? 0.5 : 0.95), win: !w.big, fixed: true });
  if (sky.eff < 0.5 && G.wx.sky < 0.5) for (const w of L.windows) if (!w.small) out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2 + 10, r: w.big ? 110 : 70, color: '#33456e', a: (0.5 - sky.eff) * 1.4 * (1 - G.wx.sky * 2), win: true, fixed: true });
  for (const l of L.lamps) { const k = lampState(G, state, l, house, sleeping); if (k > 0) out.push({ x: l.x, y: l.y, r: l.r + flick, color: l.color, a: k, fixed: true }); }
  const fire = fireLevel(id, G, state, sleeping);
  for (const f of L.fires) if (fire > 0) out.push({ x: f.x, y: f.y, r: (f.r || 40) * (fire > 0.5 ? 1 : 0.5) + flick * 2, color: fire > 0.5 ? '#ff9a3a' : '#c84a22', a: fire > 0.5 ? 0.9 : 0.5, fixed: true });
  if (L.nightlight && sleeping) out.push({ x: L.nightlight.x, y: L.nightlight.y - 5, r: 26, color: '#f2c14e', a: 0.7, fixed: true });
  if (id === 'tackle') out.push({ x: L.rack.x + 3 * L.rack.step, y: L.rack.top + 12, r: 22, color: '#8ab4c8', a: 0.4 + 0.2 * Math.sin(clock * 3), win: true, fixed: true });
  if (id === 'tackle') out.push({ x: L.pegs.x + 3 * L.pegs.step + 5, y: L.pegs.y + 12, r: 16, color: '#80ffa0', a: 0.5, win: true, fixed: true });
  return out;
}

/* ---------------------------------------------------------- talking --- */
const LINES = {
  fishmonger: {
    haul: ["Let's see what the lake gave you.", 'Ice is fresh. Lay them out.', "Fine. I'll weigh them myself."],
    empty: ["Nothing to sell? The lake's not going anywhere.", 'Come back with fish and we will talk.', 'Slab is bare today. Get out there.'],
    storm: ['Wild out there. The deep ones bite in this.'], night: ["Late haul? I'm still up."], winter: ['Cold keeps them fresh on the step.'], overcast: ['Ghost eel weather. Bring me one.'],
  },
  tackle: {
    any: ['Rods, line, bait. Worms are free, mind.', 'Braided line held my last pike. Just saying.', 'Keep the fish in your zone and ease off the reel.'],
    rain: ['Rain brings the bass up. Take grubs.'], night: ['Glow lure works wonders after dark.'], overcast: ['Eels like a grey day.'], snow: ['Burbot under the ice. Patience.'], best: ["Nothing finer than the Moonlit rod. I'd know, I made it."],
  },
  boatyard: {
    any: ["Hull's coming along. What can I get you?", 'A cabin boat keeps the rain off. Mostly.', 'Jet drive scares the ducks. Worth it.'],
    storm: ["Wouldn't take a rowboat out in this."], trawler: ['Look at you. King of the lake. The sea is yours too.'], night: ['Working late. Lamp oil is cheap.'], river: ['A Skiff will get you up the Ash River. Watch the rapids.'], ocean: ['Only a Trawler takes the swell out on the Grey Sea.'],
  },
  house1: {
    any: ['Come in, dear, mind the cat.', 'Tom used to fish that deep water. Terrible eel man.', 'Pudding caught a mouse. Very proud.'],
    rain: ['Listen to that rain on the roof.'], winter: ["Kettle's on. Warm yourself by the stove."], sleeping: ['(Marla is asleep. The cat is not.)'],
  },
  house2: {
    any: ["Ada's reading. I'm pretending to.", 'Did you know the lake has no outlet? Odd, that.', 'The radio only gets one station. It plays weather.'],
    rain: ['Rain on the roof, a book, the radio. Perfect.'], overcast: ['Grey days are for reading, not fishing.'], sleeping: ['(Tunde has nodded off over his book)'],
  },
  house3: {
    any: ['Forty years on that lake. Sturgeon are patient. Be patient.', 'Biggest pike I ever landed is over the fire. Nine kilo.', "That's Skipper. He's earned his rest."],
    storm: ["Storm's when the big ones come up. Heed it."], night: ['Fire and a dog. What else is there.'], sleeping: ['(Bram is snoring in his chair)'], river: ['Salmon run the Ash in summer and autumn. Fish the pools below the rapids.'], ocean: ['I saw a blue shark off the reef once. Never again, and I was glad.'],
  },
  house4: {
    any: ['Nico wants a boat like yours.', 'Mind the blocks, he leaves them everywhere.', 'Sewing his sails. Paper ones, for now.'],
    snow: ["Snow days. He's been at the window since dawn."], rain: ['He asked if fish get wet in the rain.'], sleeping: ['(the house is asleep; a nightlight glows)'],
  },
};
const ANCHOR = { fishmonger: [282, G0 - 48], tackle: [318, G0 - 48], boatyard: [356, G0 - 40], house1: [262, G0 - 40], house2: [262, G0 - 40], house3: [266, G0 - 40], house4: [140, G0 - 40] };
const SLEEP_ANCHOR = { house1: [446, G0 - 28], house2: [262, G0 - 40], house3: [266, G0 - 40], house4: [412, G0 - 62] };

/** A greeting or reply from whoever lives here, positioned above them. */
export function roomPopup(state, ev, clock) {
  const id = ev.room, p = state.players[ev.seat], rm = ROOMS[id];
  if (!rm || !p) return null;
  const set = LINES[id], w = state.weather?.kind || 'clear', k = state.weather?.intensity || 0;
  const minute = state.time.minute, night = minute < 5.5 * 60 || minute > 20.5 * 60, season = seasonOf(state.time.day);
  const house = !!BUILDING_BY_ID[id].house, sleeping = house && asleep(minute);
  const pick = arr => arr[(hash(Math.floor(clock * 10), id.length, ev.seat) * arr.length) | 0];
  let pool = [];
  if (sleeping) pool = set.sleeping;
  else {
    const special = [];
    if (k > 0.5 && set[w]) special.push(...set[w]);
    if (night && set.night) special.push(...set.night);
    if (season === 3 && set.winter) special.push(...set.winter);
    if (id === 'tackle' && state.empire.rod === 3) special.push(...set.best);
    if (set.river && state.empire.boat < 1) special.push(...set.river);
    if (set.ocean && state.empire.boat >= 1 && state.empire.boat < 3) special.push(...set.ocean);
    if (id === 'boatyard' && state.empire.boat === 3) special.push(...set.trawler);
    const base = id === 'fishmonger' ? (p.hold.length ? set.haul : set.empty) : set.any;
    pool = special.length && hash(Math.floor(clock * 7), 3) < 0.6 ? special : base;
  }
  const [x, y] = (sleeping && SLEEP_ANCHOR[id]) || ANCHOR[id];
  return { x, y, text: pick(pool), color: sleeping ? '#98a4b2' : '#f2e6c8', life: 3 };
}

/** What the TV should be playing: the room of the first player who is indoors. */
export function ambienceFor(state, lightLvl) {
  const inside = Object.values(state.players).filter(p => p.loc === 'room' && !p.door);
  if (!inside.length) return null;
  const id = inside[0].room, w = state.weather, k = w?.intensity || 0;
  const house = !!BUILDING_BY_ID[id].house, sleeping = house && asleep(state.time.minute);
  const rain = w && (w.kind === 'rain' || w.kind === 'storm') ? k : 0;
  const season = seasonOf(state.time.day);
  const cold = season === 3 || rain > 0 || w?.kind === 'snow', dim = lightLvl < 0.6;
  const fire = id === 'tackle' ? 1 : id === 'boatyard' ? 0 : sleeping ? 0.3 : cold || dim ? 1 : id === 'house1' ? 0.3 : 0;
  return {
    rain: rain * (id === 'boatyard' ? 1 : 0.6),
    wind: (w?.kind === 'storm' ? k : 0) * (id === 'boatyard' ? 1 : 0.35),
    fire, clock: id !== 'boatyard' ? 1 : 0, shed: id === 'boatyard' ? 1 : 0,
  };
}
