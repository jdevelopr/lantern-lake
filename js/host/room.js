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
import { getStyle } from './style.js';
import { BAKERS } from './art/rooms.js';
import { M, at } from './art/fixtures.js';

const G0 = TOWN.ground, H = 360;
const bakes = new Map();   // room id -> { season, canvas, live }

/* ------------------------------------------------------------ helpers --- */
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(R(x), R(y), R(w), R(h)); };
const hline = (g, x, y, w, c) => rect(g, x, y, w, 1, c);
const vline = (g, x, y, h, c) => rect(g, x, y, 1, h, c);
const outline = (g, x, y, w, h, c) => { hline(g, x, y, w, c); hline(g, x, y + h - 1, w, c); vline(g, x, y, h, c); vline(g, x + w - 1, y, h, c); };
/** Sleeping hours: residents are in bed, lamps off. */
const asleep = minute => minute >= 22 * 60 || minute < 5.5 * 60;

/* ---------------------------------------------------------- curtains --- */
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

/* ------------------------------------------------------------ people --- */
function shadow(ctx, x, y, r = 8) { ellipse(ctx, x, y, r, 2, 'rgba(6,8,14,0.4)'); }
function bubbleZ(ctx, x, y, clock) { for (let k = 0; k < 2; k++) { const t = (clock * 0.45 + k * 0.5) % 1; ctx.globalAlpha = 1 - t; text(ctx, 'z', x + 4 + t * 8 + k * 3, y - 6 - t * 18, { color: '#cfd8ea', shadow: false }); } ctx.globalAlpha = 1; }
function smokePuff(ctx, x, y, clock, n = 3, col = 'rgba(200,200,210,') { for (let k = 0; k < n; k++) { const t = (clock * 0.35 + k / n) % 1; ctx.fillStyle = `${col}${0.4 * (1 - t)})`; ctx.fillRect(R(x + Math.sin((t + k) * 6) * 3 + t * 5), R(y - t * 26), 2, 2); } }
/** Keepers turn to face whoever is nearest. */
const facing = (kx, p, others) => { let best = p, bd = Math.abs(p.walk.x - kx); for (const o of others || []) { const d = Math.abs(o.walk.x - kx); if (d < bd) { bd = d; best = o; } } return best.walk.x < kx ? -1 : 1; };

/* ------------------------------------------------------------- bakes --- */
function newLive() { return { windows: [], curtains: [], lamps: [], fires: [], steam: [], clocks: [], slab: null }; }

function bake(id, season) {
  const rm = ROOMS[id], L = newLive();
  const [back, g] = mkCanvas(rm.w, H), [front, f] = mkCanvas(rm.w, H);
  BAKERS[id](g, f, L, season, getStyle());
  return { key: season + '|' + getStyle(), back, front, live: L };
}
function getBake(id, season) {
  let b = bakes.get(id);
  if (!b || b.key !== season + '|' + getStyle()) { b = bake(id, season); bakes.set(id, b); }
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
  if (season === 3 || win.frost) { ctx.fillStyle = '#e6ebef'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillStyle = ditherPattern(ctx, '#e6ebef', 0.5); ctx.fillRect(x, y + h - 4, w, 2); }
  if (win.frost) { ctx.fillStyle = ditherPattern(ctx, '#e8f0f8', 0.45); for (let i = 0; i < 6; i++) { ctx.fillRect(x, y + i, 6 - i, 1); ctx.fillRect(x + w - 6 + i, y + i, 6 - i, 1); ctx.fillRect(x, y + h - 1 - i, 8 - i, 1); ctx.fillRect(x + w - 8 + i, y + h - 1 - i, 8 - i, 1); } }
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
  hesper: { pal: { h: '#3a2a1c', s: '#d8b090', c: '#3d5468', d: '#2d3038', b: '#1a1720', a: '#e8e2d2', t: '#e8e2d2' }, apron: true, hat: 'kerchief', hair: 'short' },
  ansel:  { pal: { h: '#8a7a5c', s: '#e6c3a0', c: '#5a6a3a', d: '#4a3324', b: '#1a1720', t: '#5a4030' }, hat: 'flatcap', glasses: true, hair: 'short', apron: true },
  dov:    { pal: { h: '#3a2a1c', s: '#c9956a', c: '#3d6b8a', d: '#4a4744', b: '#1a1720', t: '#e8b04a' }, hat: 'brim', beard: true, coat: true },
  marla:  { pal: { h: '#d8d0bc', s: '#e6c3a0', c: '#8a5a7a', d: '#5a4a4a', b: '#3a2a1c', f: '#c46a6a' }, hair: 'bun', glasses: true, scarf: true },
  tunde:  { pal: { h: '#1a1712', s: '#7a4a2a', c: '#c46a5a', d: '#3d4a54', b: '#1a1720' }, glasses: true, hair: 'short' },
  ada:    { pal: { h: '#2a1a10', s: '#8a5a3a', c: '#e8b04a', d: '#5a4a4a', b: '#3a2a1c' }, hair: 'curls' },
  bram:   { pal: { h: '#d8d0bc', s: '#c9956a', c: '#3d6b5a', d: '#4a3324', b: '#1a1720' }, hair: 'bald', beard: true, stubble: true },
  elena:  { pal: { h: '#2a1a10', s: '#c9956a', c: '#5a8a44', d: '#5a4a4a', b: '#3a2a1c' }, hair: 'long' },
  nico:   { pal: { h: '#2a1a10', s: '#d8a880', c: '#e0685a', d: '#5a6a8a', b: '#3a2a1c', t: '#3d6b8a' }, hat: 'cap' },
};
function liveFishmonger(G, state, p, L, layer, ctx, clock, sleeping, others) {
  if (layer === 'back') {
    chalkboard(ctx, L, state, G.season);
    // Hesper behind the counter, chopping; she turns to face you
    const frame = G.reduceMotion ? 0 : Math.floor(clock * 2) % 2, x = 282, y = G0 - 10, dir = facing(x, p, others);
    drawFigure(ctx, x, y, { ...KEEPERS.hesper, dir, arm: frame, stand: clock });
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
  drawFigure(ctx, x, y, { ...KEEPERS.ansel, dir, arm: frame, stand: clock });
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
    drawFigure(ctx, x, y, { ...KEEPERS.dov, dir: -1, arm: 2, stand: clock });
    ctx.fillStyle = '#c9b28a'; ctx.fillRect(x - 15, y - 21, 6, 4);
    if (!G.reduceMotion) { ctx.fillStyle = '#e0d0a0'; for (let i = 0; i < 4; i++) { const t = (clock * 0.9 + i * 0.25) % 1; ctx.fillRect(R(x - 14 - t * 6 + Math.sin(t * 9 + i) * 2), R(y - 18 + t * 18), 1, 1); } }
  }
}
function liveHouse1(G, state, p, L, layer, ctx, clock, sleeping) {
  if (layer !== 'back') return;
  const rock = G.reduceMotion ? 0 : Math.sin(clock * 2.2);
  const cx = L.chair.x - 8, cy = G0 - R(rock);
  at(ctx, M.rocker, { O: '#6a4a30', l: '#8a6a44', o: '#4a3020' }, cx - 6, cy - 22);
  if (!sleeping) {
    const frame = Math.floor(clock * 2.5) % 2;
    drawSeated(ctx, L.chair.x, cy, { ...KEEPERS.marla, dir: 1, arm: 1 });
    ctx.fillStyle = '#c46a6a'; ctx.fillRect(L.chair.x + 2, cy - 15, 7, 4); ctx.fillStyle = '#8a8a80'; ctx.fillRect(L.chair.x + 5 + frame, cy - 19 - frame, 1, 5); ctx.fillRect(L.chair.x + 9, cy - 18, 1, 4);
    ctx.fillStyle = '#c46a6a'; ctx.fillRect(L.chair.x - 16, G0 - 6, 6, 4); for (let i = 0; i < 8; i++) ctx.fillRect(L.chair.x - 10 + (i >> 1), G0 - 6 - (i % 2), 1, 1);
    drawCat(ctx, 338, G0, '#8a7a6a', Math.floor(clock * 0.8) % 2);
  } else {
    drawSleeper(ctx, 440, G0 - 27, { ...KEEPERS.marla, hair: 'bun' });
    ctx.fillStyle = '#8a3a3a'; ctx.fillRect(454, G0 - 22, 48, 4); ctx.fillStyle = '#d8c48a'; ctx.fillRect(454, G0 - 22, 48, 1);
    drawCat(ctx, 486, G0 - 16, '#8a7a6a', 0);
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
      drawSleeper(ctx, 405, G0 - 23, KEEPERS.nico); ctx.fillStyle = '#e0685a'; ctx.fillRect(420, G0 - 14, 52, 3);
      drawSleeper(ctx, 405, G0 - 53, KEEPERS.elena); ctx.fillStyle = '#5a6a8a'; ctx.fillRect(420, G0 - 44, 52, 3);
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
