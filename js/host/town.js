// The town: a single street seen side-on. Facades are baked per season into an
// offscreen canvas; sky, hills, wet ground, windows and the walker are per frame.
import { TOWN, BUILDINGS, seasonOf } from '../game/world.js';
import { mkCanvas, R, hash, mix, scale, disc, ellipse, dith, ditherPattern, ditherRect, text, textWidth, sprite, clamp } from './gfx.js';

const TW = TOWN.w, H = 360, G0 = TOWN.ground;

// Buildings along the street. Shops come from world.js (positions are gameplay);
// fillers are scenery only.
const SHOP_LOOK = {
  fishmonger: { mat: 'siding', wall: '#4f6a80', wall2: '#3f5668', roof: '#3b3f4a', trim: '#d8d0bc', awning: ['#3d6b8a', '#d5d9dc'], sign: 'FISH', item: 'fish' },
  tackle:     { mat: 'brick',  wall: '#7c4a3c', wall2: '#5e3830', roof: '#4a3a34', trim: '#c9b88e', awning: ['#8a5a30', '#d9c27a'], sign: 'TACKLE', item: 'rods' },
  boatyard:   { mat: 'stone',  wall: '#6f7570', wall2: '#585e5a', roof: '#3f4a48', trim: '#b8b4a0', awning: null, sign: 'BOATS', item: 'anchor' },
};
const FILLERS = [
  { x: 200, w: 62, h: 86, mat: 'brick', wall: '#6a4e3e', wall2: '#513a2e', roof: '#3a3238', trim: '#b8a888' },
  { x: 445, w: 66, h: 116, mat: 'brick', wall: '#5a3c38', wall2: '#43302c', roof: '#33303a', trim: '#a89a7c' },
  { x: 680, w: 56, h: 100, mat: 'siding', wall: '#6d6a5a', wall2: '#555345', roof: '#3a3a3c', trim: '#c8c0a8' },
  { x: 925, w: 58, h: 92, mat: 'stone', wall: '#5d6260', wall2: '#484c4b', roof: '#35393a', trim: '#a8a89c' },
];
const LAMPS = [160, 300, 450, 600, 760, 890];

let baked = null, bakedSeason = -1, WINDOWS = [];

/* ------------------------------------------------------------ facade --- */
function wallPattern(g, x, y, w, h, spec) {
  g.fillStyle = spec.wall; g.fillRect(x, y, w, h);
  if (spec.mat === 'brick') {
    const dark = spec.wall2, mortar = scale(spec.wall, 0.72);
    for (let yy = y; yy < y + h; yy += 3) {
      g.fillStyle = mortar; g.fillRect(x, yy + 2, w, 1);
      const off = ((yy - y) / 3) % 2 ? 3 : 0;
      for (let xx = x + off; xx < x + w; xx += 6) {
        g.fillStyle = mortar; g.fillRect(xx, yy, 1, 2);
        if (hash(xx, yy, 2) < 0.18) { g.fillStyle = dark; g.fillRect(xx + 1, yy, 5, 2); }
        else if (hash(xx, yy, 3) < 0.1) { g.fillStyle = scale(spec.wall, 1.12); g.fillRect(xx + 1, yy, 5, 1); }
      }
    }
  } else if (spec.mat === 'siding') {
    for (let yy = y; yy < y + h; yy += 4) {
      g.fillStyle = spec.wall2; g.fillRect(x, yy + 3, w, 1);
      g.fillStyle = scale(spec.wall, 1.08); g.fillRect(x, yy, w, 1);
    }
  } else {
    // stone: irregular blocks
    for (let yy = y; yy < y + h; yy += 5) {
      const off = ((yy - y) / 5) % 2 ? 5 : 0;
      g.fillStyle = scale(spec.wall, 0.7); g.fillRect(x, yy + 4, w, 1);
      for (let xx = x + off; xx < x + w; xx += 10 + (hash(xx, yy) * 4 | 0)) {
        g.fillStyle = scale(spec.wall, 0.7); g.fillRect(xx, yy, 1, 4);
        g.fillStyle = hash(xx, yy, 1) < 0.3 ? spec.wall2 : scale(spec.wall, 1.05 + hash(xx, yy, 2) * 0.1); g.fillRect(xx + 1, yy, 8, 4);
      }
    }
  }
}

function windowFrame(g, x, y, w, h, spec, snow) {
  // sill, frame, glass with a sky reflection and a cross bar (glow is an overlay per frame)
  g.fillStyle = scale(spec.trim, 0.8); g.fillRect(x - 2, y + h, w + 4, 2);
  g.fillStyle = '#1a1712'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#4c6a86'; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, w, 2);
  g.fillStyle = '#1a1712'; g.fillRect(x + (w >> 1), y, 1, h); g.fillRect(x, y + (h >> 1), w, 1);
  g.fillStyle = spec.trim; g.fillRect(x - 1, y - 2, w + 2, 1);
  if (snow) { g.fillStyle = '#e6ebef'; g.fillRect(x - 2, y + h - 1, w + 4, 2); g.fillRect(x - 1, y - 3, w + 2, 1); }
  WINDOWS.push({ x, y, w, h, seed: x * 7 + y });
}

function roof(g, x, y, w, spec, snow, pitch = 12) {
  for (let i = 0; i < pitch; i++) {
    g.fillStyle = i % 2 ? spec.roof : scale(spec.roof, 1.25);
    g.fillRect(x - 6 + i, y - pitch + i, w + 12 - i * 2, 1);
  }
  g.fillStyle = ditherPattern(g, scale(spec.roof, 0.6), 0.35); g.fillRect(x - 6, y - pitch, w + 12, pitch);
  g.fillStyle = scale(spec.roof, 0.55); g.fillRect(x - 6, y - 1, w + 12, 2);
  if (snow) { for (let i = 0; i < 3; i++) g.fillRect(x - 6 + i * 2, y - pitch + i, w + 12 - i * 4, 1), g.fillStyle = '#e6ebef'; g.fillRect(x - 7, y - pitch + 2, w + 14, 2); }
  // chimney
  g.fillStyle = '#4a4242'; g.fillRect(x + w - 14, y - pitch - 4, 5, pitch + 2);
  g.fillStyle = '#5c5252'; g.fillRect(x + w - 15, y - pitch - 5, 7, 2);
}

function shopFront(g, b, look, x, y, w, snow) {
  // big display window, door, awning, sign
  const doorX = b.x - 8, wx = x + 6, ww = doorX - 4 - wx;
  g.fillStyle = '#1a1712'; g.fillRect(wx - 1, G0 - 40, ww + 2, 26);
  g.fillStyle = '#2c3f50'; g.fillRect(wx, G0 - 39, ww, 24);
  g.fillStyle = '#3d5468'; g.fillRect(wx, G0 - 39, ww, 4);
  WINDOWS.push({ x: wx, y: G0 - 39, w: ww, h: 24, seed: wx, shop: true });
  // goods in the window
  if (look.item === 'fish') for (let i = 0; i < 4; i++) { const fx = wx + 4 + i * 10; g.fillStyle = i % 2 ? '#8ab4c8' : '#d8b86a'; g.fillRect(fx, G0 - 26, 6, 3); g.fillRect(fx + 6, G0 - 27, 2, 5); g.fillStyle = '#e8e2d2'; g.fillRect(wx + 2, G0 - 20, ww - 4, 2); }
  if (look.item === 'rods') for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#c9b28a' : '#8a6a48'; g.fillRect(wx + 4 + i * 7, G0 - 36, 1, 20); g.fillStyle = '#e0685a'; g.fillRect(wx + 3 + i * 7, G0 - 30 + i, 3, 2); }
  if (look.item === 'anchor') { const ax = wx + ww / 2 | 0; g.fillStyle = '#9aa0a8'; g.fillRect(ax, G0 - 36, 2, 18); g.fillRect(ax - 6, G0 - 30, 14, 2); g.fillRect(ax - 8, G0 - 22, 4, 2); g.fillRect(ax + 6, G0 - 22, 4, 2); g.fillRect(ax - 8, G0 - 20, 18, 2); }
  // door with steps and a lantern
  g.fillStyle = '#1a1712'; g.fillRect(doorX - 2, G0 - 40, 20, 40);
  g.fillStyle = '#4a3324'; g.fillRect(doorX, G0 - 38, 16, 38);
  g.fillStyle = '#5c4030'; g.fillRect(doorX + 2, G0 - 36, 12, 16); g.fillRect(doorX + 2, G0 - 18, 12, 14);
  g.fillStyle = '#1a1712'; g.fillRect(doorX + 3, G0 - 34, 10, 10);
  g.fillStyle = '#3d5468'; g.fillRect(doorX + 4, G0 - 33, 8, 8);
  WINDOWS.push({ x: doorX + 4, y: G0 - 33, w: 8, h: 8, seed: doorX, door: true });
  g.fillStyle = '#e8b04a'; g.fillRect(doorX + 12, G0 - 18, 2, 2);
  g.fillStyle = '#6a6660'; g.fillRect(doorX - 4, G0 - 2, 24, 2); g.fillStyle = '#7c7872'; g.fillRect(doorX - 4, G0 - 2, 24, 1);
  // awning
  if (look.awning) {
    const ay = G0 - 46;
    for (let i = 0; i < 6; i++) { g.fillStyle = i < 5 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'; }
    g.fillStyle = 'rgba(8,10,16,0.35)'; g.fillRect(wx - 4, ay + 6, w - 8, 3);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? look.awning[0] : look.awning[1];
      for (let xx = wx - 4 + i; xx < x + w - 6 - i; xx += 8) { g.fillRect(xx, ay + i, 4, 1); g.fillStyle = i % 2 ? look.awning[1] : look.awning[0]; g.fillRect(xx + 4, ay + i, 4, 1); g.fillStyle = i % 2 ? look.awning[0] : look.awning[1]; }
    }
    g.fillStyle = scale(look.awning[0], 0.6); g.fillRect(wx - 4, ay + 7, w - 8, 1);
    for (let xx = wx - 4; xx < x + w - 6; xx += 8) g.fillRect(xx, ay + 8, 1, 1);
    if (snow) { g.fillStyle = '#e6ebef'; g.fillRect(wx - 2, ay - 1, w - 12, 2); }
  }
  // sign board
  const sw = textWidth(look.sign) + 12, sx = R(b.x - sw / 2), sy = G0 - 62;
  g.fillStyle = '#1a1712'; g.fillRect(sx - 1, sy - 1, sw + 2, 13);
  g.fillStyle = '#2a2018'; g.fillRect(sx, sy, sw, 11);
  g.fillStyle = look.trim; g.fillRect(sx, sy, sw, 1); g.fillRect(sx, sy + 10, sw, 1);
  text(g, look.sign, b.x, sy + 2, { color: '#e8b04a', align: 'center', shadow: '#0a0806' });
  // sign brackets and a lamp above the sign
  g.fillStyle = '#3a3a3c'; g.fillRect(sx - 3, sy + 4, 3, 1); g.fillRect(sx + sw, sy + 4, 3, 1);
}

function building(g, spec, x, y, w, h, snow, shopB) {
  // drop shadow to the right, then walls
  g.fillStyle = 'rgba(6,8,14,0.4)'; g.fillRect(x + w, y + 4, 4, h - 4);
  wallPattern(g, x, y, w, h, spec);
  // corner quoins and a base course
  g.fillStyle = scale(spec.wall, 0.75); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  g.fillStyle = '#4a4744'; g.fillRect(x, G0 - 6, w, 6); g.fillStyle = '#5a5754'; g.fillRect(x, G0 - 6, w, 1);
  // floor line
  g.fillStyle = scale(spec.wall, 0.7); g.fillRect(x, G0 - 44, w, 2);
  // upper windows
  const floors = h > 100 ? 2 : 1;
  for (let f = 0; f < floors; f++) {
    const wy = G0 - 44 - (shopB ? 34 : 24) - f * 28;
    if (wy < y + 6) continue;
    const cols = Math.max(1, Math.floor((w - 12) / 22));
    const span = cols * 22, sx = x + R((w - span) / 2) + 6;
    for (let k = 0; k < cols; k++) windowFrame(g, sx + k * 22, wy, 10, 12, spec, snow);
  }
  if (shopB) shopFront(g, shopB, spec, x, y, w, snow);
  else {
    // a plain ground floor: one window and a door
    windowFrame(g, x + 8, G0 - 34, 10, 14, spec, snow);
    g.fillStyle = '#1a1712'; g.fillRect(x + w - 22, G0 - 34, 14, 34);
    g.fillStyle = '#3e2c20'; g.fillRect(x + w - 21, G0 - 33, 12, 33);
    g.fillStyle = '#e8b04a'; g.fillRect(x + w - 12, G0 - 18, 1, 1);
    g.fillStyle = '#6a6660'; g.fillRect(x + w - 24, G0 - 2, 18, 2);
    // house number plate
    g.fillStyle = spec.trim; g.fillRect(x + w - 30, G0 - 30, 6, 4);
  }
  roof(g, x, y, w, spec, snow, h > 100 ? 10 : 14);
  // drainpipe
  g.fillStyle = '#3a3a3c'; g.fillRect(x + w - 3, y, 2, h);
  g.fillStyle = '#4c4c50'; g.fillRect(x + w - 3, y, 1, h);
}

function lampPost(g, x) {
  g.fillStyle = '#23262e'; g.fillRect(x - 2, G0 - 2, 6, 2);
  g.fillStyle = '#2d3038'; g.fillRect(x, G0 - 46, 2, 44);
  g.fillStyle = '#3d414a'; g.fillRect(x, G0 - 46, 1, 44);
  g.fillStyle = '#2d3038'; g.fillRect(x - 3, G0 - 48, 8, 2); g.fillRect(x - 3, G0 - 55, 1, 7); g.fillRect(x + 4, G0 - 55, 1, 7);
  g.fillStyle = '#23262e'; g.fillRect(x - 4, G0 - 56, 10, 2); g.fillRect(x, G0 - 58, 2, 2);
  g.fillStyle = '#5a5248'; g.fillRect(x - 2, G0 - 54, 6, 6); // glass, painted over when lit
}

function streetProps(g, snow) {
  // bench, barrels, crates, a planter, a bicycle leaning at the fence
  const bench = x => { g.fillStyle = '#4a3324'; g.fillRect(x, G0 - 9, 22, 2); g.fillRect(x, G0 - 13, 22, 2); g.fillStyle = '#2d3038'; g.fillRect(x + 2, G0 - 7, 2, 7); g.fillRect(x + 18, G0 - 7, 2, 7); g.fillStyle = '#5c4030'; g.fillRect(x, G0 - 13, 22, 1); };
  const barrel = (x, h = 10) => { g.fillStyle = '#4a3324'; g.fillRect(x, G0 - h, 8, h); g.fillStyle = '#5c4030'; g.fillRect(x + 1, G0 - h, 2, h); g.fillStyle = '#2d3038'; g.fillRect(x, G0 - h + 2, 8, 1); g.fillRect(x, G0 - 3, 8, 1); if (snow) { g.fillStyle = '#e6ebef'; g.fillRect(x, G0 - h - 1, 8, 1); } };
  const crate = (x, s = 8) => { g.fillStyle = '#6a5438'; g.fillRect(x, G0 - s, s, s); g.fillStyle = '#4a3324'; g.fillRect(x, G0 - s, s, 1); g.fillRect(x, G0 - s, 1, s); g.fillRect(x + s - 1, G0 - s, 1, s); g.fillRect(x, G0 - 1, s, 1); g.fillRect(x + 1, G0 - s + 1, s - 2, 1); };
  bench(236); barrel(392); barrel(401, 8); crate(634); crate(642, 6); bench(650 - 30); barrel(896);
  // fence at the far end and a tree
  for (let x = 892; x < 958; x += 4) { g.fillStyle = '#3e3a34'; g.fillRect(x, G0 - 14, 2, 14); }
  g.fillStyle = '#4a4640'; g.fillRect(892, G0 - 11, 66, 1); g.fillRect(892, G0 - 5, 66, 1);
  // fishing net and buoys by the fishmonger
  g.fillStyle = '#c9b28a'; for (let i = 0; i < 6; i++) g.fillRect(262 + i * 3, G0 - 30 + (i % 2) * 2, 1, 1);
  g.fillStyle = '#e0685a'; g.fillRect(266, G0 - 24, 3, 3); g.fillStyle = '#e8e2d2'; g.fillRect(270, G0 - 22, 3, 3);
}

function bakeTown(season) {
  WINDOWS = [];
  const snow = season === 3;
  const [c, g] = mkCanvas(TW, H);
  // Pier end: planks and posts on the water side
  g.fillStyle = '#2f2118'; for (let x = 28; x < 92; x += 10) g.fillRect(x, G0 - 18, 3, 20);
  for (let y = G0 - 12; y < G0; y += 3) { g.fillStyle = (y / 3 | 0) % 2 ? '#8a5f42' : '#7a5238'; g.fillRect(24, y, 70, 2); g.fillStyle = '#4a3020'; g.fillRect(24, y + 2, 70, 1); }
  g.fillStyle = '#2a1e16'; g.fillRect(38, G0 - 44, 2, 34); g.fillRect(36, G0 - 45, 6, 1);
  // a moored rowboat
  g.fillStyle = '#2e2018'; g.fillRect(56, G0 - 6, 22, 5); g.fillStyle = '#6e4a32'; g.fillRect(58, G0 - 5, 18, 3); g.fillStyle = '#a8825a'; g.fillRect(60, G0 - 4, 14, 1);
  // Buildings, back to front by height so taller ones sit behind
  const all = [];
  for (const b of BUILDINGS) if (b.w) all.push({ b, spec: SHOP_LOOK[b.id], x: b.x - b.w / 2, w: b.w, h: 96 });
  for (const f of FILLERS) all.push({ b: null, spec: f, x: f.x - f.w / 2, w: f.w, h: f.h });
  all.sort((a, b) => b.h - a.h);
  for (const it of all) building(g, it.spec, R(it.x), G0 - it.h, it.w, it.h, snow, it.b);
  for (const lx of LAMPS) lampPost(g, lx);
  streetProps(g, snow);
  // Sidewalk and road
  g.fillStyle = '#4e4c4a'; g.fillRect(0, G0, TW, 8);
  g.fillStyle = '#5c5a58'; g.fillRect(0, G0, TW, 1);
  for (let x = 0; x < TW; x += 12) { g.fillStyle = '#434240'; g.fillRect(x, G0 + 1, 1, 7); }
  g.fillStyle = '#3a3937'; g.fillRect(0, G0 + 8, TW, 2);
  g.fillStyle = '#2b2d33'; g.fillRect(0, G0 + 10, TW, H - G0 - 10);
  for (let y = G0 + 10; y < H; y++) for (let x = 0; x < TW; x += 2) {
    const n = hash(x, y, 8);
    if (n < 0.08) { g.fillStyle = '#33363d'; g.fillRect(x, y, 2, 1); } else if (n > 0.965) { g.fillStyle = '#22242a'; g.fillRect(x, y, 1, 1); }
  }
  g.fillStyle = '#5a5548'; for (let x = 8; x < TW; x += 28) g.fillRect(x, G0 + 38, 14, 1);
  if (snow) { g.fillStyle = '#dfe5ea'; g.fillRect(0, G0, TW, 3); g.fillStyle = ditherPattern(g, '#dfe5ea', 0.35); g.fillRect(0, G0 + 10, TW, 14); g.fillRect(0, G0 + 40, TW, 20); }
  return c;
}

/* --------------------------------------------------------------- sky --- */
/** Sky gradient for the current time and weather; the rooms use it through their windows. */
export function skyColors(G, state) {
  const { light, wx } = G;
  const m = state.time.minute, evening = m > 720;
  const dusk = 1 - Math.abs(light * 2 - 1);
  const eff = light * (1 - wx.sky);
  let top = mix(mix('#0b1020', '#5d8fb8', eff), evening ? '#c47040' : '#d6a060', dusk * 0.6 * (1 - wx.sky));
  let hor = mix(mix('#1a2238', '#b9cbd6', eff), evening ? '#e6a05a' : '#f0c890', dusk * 0.8 * (1 - wx.sky));
  if (wx.sky > 0) { top = mix(top, '#3d4652', wx.sky * 0.7); hor = mix(hor, '#6e7883', wx.sky * 0.7); }
  return { top, hor, eff, dusk };
}

function drawSky(G, cam, pw, ph, state) {
  const { ctx, light, wx, clock } = G;
  const { top, hor, eff, dusk } = skyColors(G, state);
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1), y = R(t * (G0 - 60));
    ctx.fillStyle = mix(top, hor, t); ctx.fillRect(cam.x, y, pw, R((G0 - 60) / (bands - 1)) + 1);
    if (i < bands - 1) { ctx.fillStyle = ditherPattern(ctx, mix(top, hor, (i + 1) / (bands - 1)), 0.5); ctx.fillRect(cam.x, y + R((G0 - 60) / (bands - 1)) - 6, pw, 6); }
  }
  ctx.fillStyle = mix(top, hor, 1); ctx.fillRect(cam.x, G0 - 60, pw, 60);
  // stars
  if (eff < 0.5 && wx.sky < 0.6) for (let i = 0; i < 70; i++) {
    const x = R(hash(i, 21) * (TW + 200) - cam.x * 0.15) % (pw + 40), y = R(hash(21, i) * 170);
    const tw = hash(i, Math.floor(clock * 2)) > 0.12 ? 1 : 0;
    ctx.fillStyle = `rgba(230,236,255,${(0.5 - eff) * 1.5 * (0.5 + tw * 0.5) * (1 - wx.sky)})`; ctx.fillRect(cam.x + x, y, 1, 1);
  }
  // sun or moon with a halo
  const sunX = cam.x + pw * 0.78, sunY = cam.y + 44;
  if (light > 0.3 && wx.sky < 0.5) {
    ctx.fillStyle = ditherPattern(ctx, mix(hor, '#fff4c8', 0.6), 0.4 * (1 - wx.sky)); disc2(ctx, sunX, sunY, 16);
    disc(ctx, sunX, sunY, 8, mix('#fff2b0', hor, wx.sky)); disc(ctx, sunX - 1, sunY - 1, 6, '#fffaf0');
  } else if (light <= 0.3 && wx.sky < 0.45) {
    const mx = sunX - pw * 0.45, my = sunY + 8;
    ctx.fillStyle = ditherPattern(ctx, '#3a4a6e', 0.4 * (1 - wx.sky)); disc2(ctx, mx, my, 14);
    disc(ctx, mx, my, 6, '#d6deee'); disc(ctx, mx + 2, my - 1, 5, top); disc(ctx, mx - 1, my, 4, '#e8eefa'); disc(ctx, mx + 2, my - 1, 4, top);
  }
  // clouds: soft pixel lumps drifting, thicker under cover
  const n = 4 + R(wx.sky * 10);
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, 51) * 1400 + clock * (3 + i * 0.7) * (1 + (wx.wind || 0))) % (pw + 300)) - 150 + cam.x, y = 20 + hash(i, 52) * 90 + cam.y;
    const w = 40 + hash(i, 53) * 60, col = mix(mix(hor, '#ffffff', 0.15 * eff), '#3e4652', wx.sky * 0.8);
    ctx.fillStyle = ditherPattern(ctx, col, wx.sky > 0 ? 0.8 : 0.55);
    for (let k = 0; k < 4; k++) { const cx = x + k * w / 4, r = 6 + hash(i, k) * 8; disc2(ctx, cx, y + (k % 2) * 3, r); }
    ctx.fillStyle = ditherPattern(ctx, scale(col, 0.85), 0.5); ctx.fillRect(R(x), R(y + 6), R(w), 3);
  }
}
function disc2(ctx, x, y, r) { for (let dy = -r; dy <= r; dy++) { const half = Math.floor(Math.sqrt(r * r - dy * dy) * 1.4); ctx.fillRect(R(x - half), R(y + dy * 0.7), half * 2 + 1, 1); } }

function drawHills(G, cam, pw, season) {
  const { ctx, light, wx } = G;
  const eff = light * (1 - wx.sky);
  const HILL = [['#6a7e6c', '#4d5e55'], ['#5e7a58', '#3f5a44'], ['#7a6e58', '#54503f'], ['#8f9aa4', '#5c6a76']][season];
  const nightMix = 1 - eff;
  for (const [par, base, col, ph] of [[0.2, 200, mix(HILL[0], '#1c2438', nightMix * 0.85), 0.017], [0.45, 236, mix(HILL[1], '#141a2a', nightMix * 0.85), 0.031]]) {
    ctx.fillStyle = mix(col, '#7b8794', wx.sky * (0.4 - par * 0.3) + (wx.kind === 'fog' ? wx.k * 0.5 : 0));
    for (let x = 0; x < pw; x += 2) {
      const wxp = x + cam.x * par;
      const hgt = 30 + Math.sin(wxp * ph) * 18 + Math.sin(wxp * ph * 2.7) * 9 + Math.sin(wxp * 0.11) * 3;
      ctx.fillRect(R(cam.x + x), R(base - hgt), 2, R(hgt + 80));
      // pine silhouettes along the ridge
      if ((wxp | 0) % 9 === 0) { const t = 4 + (hash(wxp | 0, 1) * 6 | 0); for (let k = 0; k < t; k++) ctx.fillRect(R(cam.x + x) - k / 2, R(base - hgt) - t + k, k + 1, 1); }
    }
  }
}

/* ------------------------------------------------------------ walker --- */
const WALK = [
  ['...hhh...', '..hhhhh..', '.hhhhhhh.', '..sssss..', '..s.s.s..', '..sssss..', '...sss...', '..ccccc..', '.ccccccc.', '.c.ccc.c.', '.c.ccc.c.', '.s.ccc.s.', '..ccccc..', '..ddddd..', '..dd.dd..', '..dd.dd..', '..dd.dd..', '..bb.bb..'],
  ['...hhh...', '..hhhhh..', '.hhhhhhh.', '..sssss..', '..s.s.s..', '..sssss..', '...sss...', '..ccccc..', '.ccccccc.', '.c.ccc.c.', '..cccc.c.', '.s.ccc.s.', '..ccccc..', '..ddddd..', '.dd...dd.', '.dd...dd.', 'dd.....dd', 'bb.....bb'],
  ['...hhh...', '..hhhhh..', '.hhhhhhh.', '..sssss..', '..s.s.s..', '..sssss..', '...sss...', '..ccccc..', '.ccccccc.', '.c.ccc.c.', '.c.ccc.c.', '.s.ccc.s.', '..ccccc..', '..ddddd..', '..dddd...', '..dd.dd..', '..dd.dd..', '..bb.bb..'],
  ['...hhh...', '..hhhhh..', '.hhhhhhh.', '..sssss..', '..s.s.s..', '..sssss..', '...sss...', '..ccccc..', '.ccccccc.', '.c.ccc.c.', '.c.cccc..', '.s.ccc.s.', '..ccccc..', '..ddddd..', '.dd...dd.', '.dd...dd.', 'dd.....dd', 'bb.....bb'],
];
export function drawWalker(G, p, showPrompt = true) {
  const { ctx, clock } = G;
  const w = p.walk, x = R(w.x), y = G0;
  const frame = w.moving ? [1, 0, 3, 2][Math.floor(w.t * 7) % 4] : 0;
  const pal = { h: p.color, s: '#e6c3a0', c: scale(p.color, 0.62), d: '#2c2a36', b: '#1a1720' };
  const spr = sprite(WALK[frame], pal, w.dir < 0);
  ellipse(ctx, x, y, 5, 1, 'rgba(6,8,14,0.45)');
  ctx.drawImage(spr, x - 4, y - 18);
  // eyes
  ctx.fillStyle = '#1a1720'; ctx.fillRect(x + (w.dir > 0 ? 1 : -2), y - 14, 1, 1);
  if (showPrompt && p.near && !p.menu && !p.door && p.prompt) text(ctx, p.prompt, x, y - 32, { color: '#f2c14e', align: 'center' });
}

/* ------------------------------------------------------------- scene --- */
let wet = 0;
export function drawTown(G, state, p, cam, pw, ph) {
  const { ctx, light, wx, clock, season, wfx } = G;
  if (bakedSeason !== season) { baked = bakeTown(season); bakedSeason = season; }
  const raining = wx.kind === 'rain' || wx.kind === 'storm';
  wet = clamp(wet + (raining ? wx.k * 0.4 : -0.05) * 0.016, 0, 1);
  drawSky(G, cam, pw, ph, state);
  drawHills(G, cam, pw, season);
  // lake water at the dock end
  const wcol = ['#3e6f90', '#33668f', '#355a78', '#4b6e88'][season];
  ctx.fillStyle = wcol; ctx.fillRect(0, G0 - 14, 122, 14);
  ctx.fillStyle = scale(wcol, 1.3); for (let i = 0; i < 12; i++) { const x = (hash(i, 1) * 120 + clock * 6) % 120, y = G0 - 12 + (hash(i, 2) * 11 | 0); if (Math.sin(clock * 2 + i) > 0.2) ctx.fillRect(R(x), y, 3, 1); }
  ctx.fillStyle = '#4e4c4a'; ctx.fillRect(0, G0 - 8, 22, 8);
  ctx.drawImage(baked, 0, 0);
  wfx.cloudShadows(ctx, cam, pw, ph, state, clock);
  // Window glow (the light map adds the pools; this is the glass itself)
  const night = light < 0.55 || wx.sky > 0.4;
  const dusk = clamp((0.75 - light) / 0.5, 0, 1);   // lights come on as the sun goes
  for (const w of WINDOWS) {
    if (w.x < cam.x - 40 || w.x > cam.x + pw + 40) continue;
    const lit = (night || dusk > 0) && (w.shop || w.door || hash(w.seed, 1) < 0.72);
    if (lit) {
      ctx.globalAlpha = (w.shop ? 0.6 : 0.9) * Math.max(dusk, night ? 1 : 0);
      ctx.fillStyle = w.shop ? '#f3c672' : hash(w.seed, 2) < 0.3 ? '#ffd98a' : '#f0b862';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.globalAlpha = 1;
      if (!w.shop && !w.door) {
        // curtains, cross bar, sometimes a plant or a figure on the sill
        ctx.fillStyle = '#b8823e'; ctx.fillRect(w.x, w.y, 2, w.h); ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
        ctx.fillStyle = '#1a1712'; ctx.fillRect(w.x + (w.w >> 1), w.y, 1, w.h); ctx.fillRect(w.x, w.y + (w.h >> 1), w.w, 1);
        if (hash(w.seed, 3) < 0.25) { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(w.x + 3, w.y + w.h - 4, 3, 3); }
        else if (hash(w.seed, 3) > 0.85) { ctx.fillStyle = '#4a6a3a'; ctx.fillRect(w.x + w.w - 5, w.y + w.h - 3, 3, 2); }
      }
    } else if (night) {
      ctx.fillStyle = 'rgba(10,14,22,0.75)'; ctx.fillRect(w.x, w.y, w.w, w.h);
      if (!w.shop && !w.door) { ctx.fillStyle = '#1a1712'; ctx.fillRect(w.x + (w.w >> 1), w.y, 1, w.h); ctx.fillRect(w.x, w.y + (w.h >> 1), w.w, 1); }
    }
  }
  // Lamp glass
  for (const lx of LAMPS) { ctx.fillStyle = night ? '#ffd27a' : '#6a6258'; ctx.fillRect(lx - 2, G0 - 54, 6, 6); if (night) { ctx.fillStyle = '#fff4d0'; ctx.fillRect(lx, G0 - 52, 2, 2); } }
  // Chimney smoke at night or in the cold
  if (!G.reduceMotion && (night || season === 3)) for (const f of [...FILLERS.map(f => f.x + f.w / 2 - 12), 330 + 60 - 12, 560 + 70 - 12, 810 + 80 - 12]) {
    for (let k = 0; k < 4; k++) { const t = (clock * 0.5 + k * 0.25 + f * 0.01) % 1; ctx.fillStyle = `rgba(200,200,210,${0.35 * (1 - t)})`; ctx.fillRect(R(f + Math.sin((t + k) * 5) * 3 + t * 6), R(G0 - 110 - t * 30), 2, 2); }
  }
  // Wet road: reflections of every light source, mirrored below the kerb
  if (wet > 0.02) {
    const lights = townLights(G, state, p, cam, pw);
    ctx.globalCompositeOperation = 'screen';
    for (const L of lights) {
      if (L.y > G0) continue;
      const ry = G0 + 10, len = R((G0 - L.y) * 0.6), wob = Math.sin(clock * 3 + L.x) * 1.5;
      ctx.fillStyle = ditherPattern(ctx, L.color, 0.45 * wet * L.a);
      for (let i = 0; i < len; i += 2) ctx.fillRect(R(L.x + wob * (i / len) - 2 - i / 8), ry + i, 4 + i / 4, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    // puddles
    for (let i = 0; i < 9; i++) {
      const x = 60 + hash(i, 61) * (TW - 120), y = G0 + 16 + hash(i, 62) * 36, rw = 12 + hash(i, 63) * 22;
      ctx.fillStyle = ditherPattern(ctx, mix('#2b2d33', '#8fa4b8', 0.35 * wet), 0.7 * wet);
      ellipse2(ctx, x, y, rw, 3);
    }
  }
  drawWalker(G, p);
}
function ellipse2(ctx, x, y, rx, ry) { for (let dy = -ry; dy <= ry; dy++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); ctx.fillRect(R(x - half), R(y + dy), half * 2 + 1, 1); } }

export function townLights(G, state, p, cam, pw) {
  const { light, wx, clock, reduceMotion } = G;
  const night = light < 0.55 || wx.sky > 0.4;
  const flick = reduceMotion ? 0 : Math.sin(clock * 9) * 1.2;
  const L = [];
  for (const lx of LAMPS) if (lx > cam.x - 80 && lx < cam.x + pw + 80) L.push({ x: lx + 1, y: G0 - 51, r: 62 + flick, color: '#ffb257', a: night ? 1 : 0.3 });
  L.push({ x: 39, y: G0 - 44, r: 30 + flick, color: '#ffb257', a: night ? 1 : 0.3 });
  if (night) for (const w of WINDOWS) {
    if (w.x < cam.x - 60 || w.x > cam.x + pw + 60) continue;
    if (w.shop) L.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 34, color: '#ffc46a', a: 0.9, win: true });
    else if (w.door || hash(w.seed, 1) < 0.72) L.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 16, color: '#ffc46a', a: 0.7, win: true });
  }
  return L;
}

/* -------------------------------------------------------------- menu --- */
export function drawMenu(G, state, p, cam, pw, ph) {
  const { ctx } = G;
  const m = p.menu, rows = m.items.length;
  const mw = Math.min(pw - 16, 250), mh = 34 + rows * 20 + 8;
  const x = R(cam.x + pw / 2 - mw / 2), y = R(cam.y + 36);
  ctx.fillStyle = 'rgba(4,6,10,0.55)'; ctx.fillRect(x + 4, y + 4, mw, mh);
  ctx.fillStyle = '#0d1018'; ctx.fillRect(x, y, mw, mh);
  ctx.fillStyle = '#3a4252'; ctx.fillRect(x, y, mw, 1); ctx.fillRect(x, y + mh - 1, mw, 1); ctx.fillRect(x, y, 1, mh); ctx.fillRect(x + mw - 1, y, 1, mh);
  ctx.fillStyle = '#e8b04a'; ctx.fillRect(x + 1, y + 1, mw - 2, 1);
  const title = { fishmonger: 'FISHMONGER', tackle: 'TACKLE SHOP', boatyard: 'BOATYARD' }[m.shop];
  text(ctx, title, x + 10, y + 9, { color: '#f2c14e' });
  text(ctx, `${state.empire.gold} g`, x + mw - 10, y + 9, { color: '#f2c14e', align: 'right' });
  ctx.fillStyle = '#2a3040'; ctx.fillRect(x + 8, y + 22, mw - 16, 1);
  m.items.forEach((it, i) => {
    const ry = y + 32 + i * 20, cur = i === m.cursor;
    if (cur) { ctx.fillStyle = '#1e2636'; ctx.fillRect(x + 5, ry - 4, mw - 10, 19); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 5, ry - 4, 2, 19); }
    const col = !it.enabled && it.kind !== 'leave' ? '#6f7b88' : cur ? '#ffffff' : '#e8e2d2';
    text(ctx, (cur ? '> ' : '  ') + it.label, x + 12, ry, { color: col });
    if (it.desc) text(ctx, it.desc, x + 24, ry + 9, { color: '#8e9aa8' });
    if (it.price !== null && it.price !== undefined) text(ctx, it.price < 0 ? `+${-it.price} g` : `${it.price} g`, x + mw - 12, ry, { color: it.price < 0 ? '#8fd47f' : it.enabled ? '#f2c14e' : '#6f7b88', align: 'right' });
  });
}
