// The town: a harbour front, a street of shops and houses, a square with a well and a
// market, a chapel and a lane, all seen side-on. The facades are assembled from one of
// three art kits (art/kit-*.js) by art/townbake.js and baked per season; sky, hills, wet
// ground, windows, lamps, smoke, bunting and the walker are drawn per frame.
import { TOWN, seasonOf } from '../game/world.js';
import { R, hash, mix, scale, disc, ellipse, ditherPattern, text, clamp } from './gfx.js';
import { drawFigure, drawGull, drawCat, sheet } from './figure.js';
import { S, getStyle } from './style.js';
import { bakeTown } from './art/townbake.js';
import { KIT_A } from './art/kit-a.js';
import { KIT_B } from './art/kit-b.js';
import { KIT_C } from './art/kit-c.js';

const TW = TOWN.w, H = 360, G0 = TOWN.ground;
const KITS = { storybook: KIT_A, harbour: KIT_B, north: KIT_C };
export const kit = () => KITS[getStyle()] || KIT_A;
let baked = null, bakedKey = '';
const harbour = () => getStyle() === 'harbour';
const north = () => getStyle() === 'north';

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
    ctx.fillStyle = ditherPattern(ctx, col, wx.sky > 0 ? 0.45 : 0.3);
    for (let k = 0; k < 4; k++) { const cx = x + k * w / 4, r = 6 + hash(i, k) * 8; disc2(ctx, cx, y + (k % 2) * 3, r); }
    ctx.fillStyle = ditherPattern(ctx, scale(col, 0.85), 0.25); ctx.fillRect(R(x), R(y + 6), R(w), 3);
  }
}
function disc2(ctx, x, y, r) { for (let dy = -r; dy <= r; dy++) { const half = Math.floor(Math.sqrt(r * r - dy * dy) * 1.4); ctx.fillRect(R(x - half), R(y + dy * 0.7), half * 2 + 1, 1); } }

function drawHills(G, cam, pw, season) {
  const { ctx, light, wx } = G;
  const eff = light * (1 - wx.sky);
  const HILL = [['#6a7e6c', '#4d5e55'], ['#5e7a58', '#3f5a44'], ['#7a6e58', '#54503f'], ['#8f9aa4', '#5c6a76']][season];
  const nightMix = 1 - eff;
  for (const [par, base, col, ph] of [[0.2, 200, mix(HILL[0], '#1c2438', nightMix * 0.85), 0.017], [0.45, 236, mix(HILL[1], '#141a2a', nightMix * 0.85), 0.031]]) {
    ctx.fillStyle = mix(col, '#7b8794', wx.sky * (0.4 - par * 0.3));
    // Sample the ridge in the hill's own (parallax) space at fixed even columns, so the
    // silhouette and the pines stay put while the camera slides past them.
    const off = cam.x * par, x0 = Math.floor(off / 2) * 2;
    for (let wxp = x0; wxp < off + pw + 2; wxp += 2) {
      const hgt = 30 + Math.sin(wxp * ph) * 18 + Math.sin(wxp * ph * 2.7) * 9 + Math.sin(wxp * 0.11) * 3;
      const sx = R(cam.x + wxp - off), top = R(base - hgt);
      ctx.fillRect(sx, top, 2, R(hgt + 80));
    }
    // pine silhouettes along the ridge, one every 9 units of hill space
    for (let wxp = Math.floor(off / 9) * 9; wxp < off + pw + 9; wxp += 9) {
      const hgt = 30 + Math.sin(wxp * ph) * 18 + Math.sin(wxp * ph * 2.7) * 9 + Math.sin(wxp * 0.11) * 3;
      const sx = R(cam.x + wxp - off), top = R(base - hgt), t = 4 + (hash(wxp, 1) * 6 | 0);
      for (let k = 0; k < t; k++) ctx.fillRect(sx - (k >> 1), top - t + k, k + 1, 1);
    }
    // a landmark on the far ridge: a windmill turning, or a lighthouse
    if (par < 0.3) {
      const wxp = 420, hgt = 30 + Math.sin(wxp * ph) * 18 + Math.sin(wxp * ph * 2.7) * 9 + Math.sin(wxp * 0.11) * 3;
      const sx = R(cam.x + wxp - off), top = R(base - hgt);
      if (!harbour()) {
        ctx.fillRect(sx - 4, top - 22, 8, 22); ctx.fillRect(sx - 6, top - 24, 12, 3); ctx.fillRect(sx - 3, top - 26, 6, 2);
        const a = G.reduceMotion ? 0.5 : G.clock * 0.6;
        for (let k = 0; k < 4; k++) { const ang = a + k * Math.PI / 2; for (let i = 2; i < 16; i++) ctx.fillRect(R(sx + Math.cos(ang) * i), R(top - 22 + Math.sin(ang) * i), i < 6 ? 1 : 2, 1); }
      } else {
        ctx.fillRect(sx - 3, top - 26, 6, 26); ctx.fillRect(sx - 5, top - 28, 10, 2); ctx.fillRect(sx - 4, top - 32, 8, 4); ctx.fillRect(sx - 2, top - 34, 4, 2);
        LIGHTHOUSE.x = sx; LIGHTHOUSE.y = top - 30;
      }
    }
  }
}
export const LIGHTHOUSE = { x: 0, y: 0 };

/* ------------------------------------------------------------ walker --- */
/** The player's outfit: their colour as a coat, a hat in the style's manner. */
export function playerPal(p) {
  return { c: p.color, t: scale(p.color, 0.62), h: '#3a2a1c', s: S().skin[0], d: harbour() ? '#2a2e3a' : '#4a4a6a', b: '#2a2434', w: '#e8e2d2', f: scale(p.color, 0.8), r: scale(p.color, 0.8), a: '#e8e2d2' };
}
export function drawWalker(G, p, showPrompt = true) {
  const { ctx, clock } = G;
  const w = p.walk, x = R(w.x), y = G0;
  ellipse(ctx, x, y, 8, 2, 'rgba(6,8,14,0.4)');
  const st = getStyle();
  drawFigure(ctx, x, y, { dir: w.dir, pal: playerPal(p), moving: w.moving, phase: w.t, stand: clock, hat: st === 'harbour' ? 'beanie' : st === 'north' ? 'fur' : 'cap', scarf: st !== 'storybook' });
  if (showPrompt && p.near && !p.menu && !p.door && p.prompt) text(ctx, p.prompt, x, y - sheet().H - 14, { color: '#f2c14e', align: 'center' });
}

/* ------------------------------------------------------------- scene --- */
let wet = 0;
export function drawTown(G, state, p, cam, pw, ph) {
  const { ctx, light, wx, clock, season, wfx } = G;
  const key = `${season}|${getStyle()}`;
  if (bakedKey !== key) { baked = bakeTown(kit(), season); bakedKey = key; }
  const P = S();
  const raining = wx.kind === 'rain' || wx.kind === 'storm';
  wet = clamp(wet + (raining ? wx.k * 0.4 : -0.05) * 0.016, 0, 1);
  drawSky(G, cam, pw, ph, state);
  drawHills(G, cam, pw, season);
  // harbour water at the quay
  const wcol = mix(['#3e6f90', '#33668f', '#355a78', '#4b6e88'][season], P.water, 0.5);
  ctx.fillStyle = wcol; ctx.fillRect(0, G0 - 14, 120, 14);
  ctx.fillStyle = scale(wcol, 1.3); for (let i = 0; i < 12; i++) { const x = (hash(i, 1) * 118 + clock * 6) % 118, y = G0 - 12 + (hash(i, 2) * 11 | 0); if (Math.sin(clock * 2 + i) > 0.2) ctx.fillRect(R(x), y, 3, 1); }
  ctx.drawImage(baked.canvas, 0, 0);
  wfx.cloudShadows(ctx, cam, pw, ph, state, clock);
  // window glass: warm when lit, dark at night
  const night = light < 0.55 || wx.sky > 0.4;
  const dusk = clamp((0.75 - light) / 0.5, 0, 1);
  for (const w of baked.windows) {
    if (w.x < cam.x - 40 || w.x > cam.x + pw + 40) continue;
    const lit = (night || dusk > 0) && !w.boarded && (w.shop || w.door || hash(w.seed, 1) < 0.72);
    if (lit) {
      ctx.globalAlpha = (w.dim ? 0.3 : w.shop ? 0.6 : 0.9) * Math.max(dusk, night ? 1 : 0);
      ctx.fillStyle = w.shop ? '#f3c672' : hash(w.seed, 2) < 0.3 ? '#ffd98a' : '#f0b862';
      if (w.round) { disc(ctx, w.x + (w.w >> 1), w.y + (w.h >> 1), w.w >> 1, ctx.fillStyle); } else ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.globalAlpha = 1;
      if (!w.shop && !w.door) {
        // curtains and the glazing bars back over the glow, and something on the sill
        ctx.fillStyle = kit().curtain(w.seed); ctx.fillRect(w.x, w.y, 2, w.h); ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
        ctx.fillStyle = kit().trim; ctx.fillRect(w.x + (w.w >> 1) - (w.arch ? 1 : 0), w.y, w.arch ? 2 : 1, w.h); ctx.fillRect(w.x, w.y + (w.h >> 1) - 1, w.w, 1);
        if (hash(w.seed, 3) < 0.25) { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(w.x + 3, w.y + w.h - 4, 3, 3); }
        else if (hash(w.seed, 3) > 0.85) { ctx.fillStyle = '#4a6a3a'; ctx.fillRect(w.x + w.w - 5, w.y + w.h - 3, 3, 2); }
      }
    } else if (night) {
      ctx.fillStyle = 'rgba(10,14,22,0.75)'; if (w.round) disc(ctx, w.x + (w.w >> 1), w.y + (w.h >> 1), w.w >> 1, ctx.fillStyle); else ctx.fillRect(w.x, w.y, w.w, w.h);
      if (!w.shop && !w.door) { ctx.fillStyle = kit().trim; ctx.fillRect(w.x + (w.w >> 1) - (w.arch ? 1 : 0), w.y, w.arch ? 2 : 1, w.h); ctx.fillRect(w.x, w.y + (w.h >> 1) - 1, w.w, 1); }
    }
  }
  // lamp glass
  for (const l of baked.lamps) if (l.glass) { ctx.fillStyle = night ? P.lampGlass : '#6a6258'; ctx.fillRect(...l.glass); if (night) { ctx.fillStyle = '#fff4d0'; ctx.fillRect(l.glass[0] + 1, l.glass[1] + 1, l.glass[2] - 2, 2); } }
  // bunting across the square, swaying
  for (const b of baked.bunting) for (let x = b.x0; x < b.x1; x += 6) {
    const t = (x - b.x0) / (b.x1 - b.x0), sag = Math.sin(t * Math.PI) * 10, y = R(b.y + sag + Math.sin(clock * 2 + x * 0.1) * 0.6);
    kit().buntingAt(ctx, x, y, b.colors[(x / 6 | 0) % b.colors.length]);
  }
  // a cat on the quay wall, gulls on the roofs by day
  drawCat(ctx, 70, G0 - 16, harbour() ? '#4a4a48' : north() ? '#e8e2d2' : '#d08a3a', Math.floor(clock * 0.7) % 2);
  if (light > 0.3) for (const [gx, gy] of baked.perches) if (gx > cam.x - 20 && gx < cam.x + pw + 20) drawGull(ctx, gx, gy, Math.sin(clock * 0.8 + gx) > 0.94);
  // chimney smoke at night or in the cold
  if (!G.reduceMotion && (night || season === 3 || north())) for (const f of baked.smoke) {
    if (f < cam.x - 30 || f > cam.x + pw + 30) continue;
    for (let k = 0; k < 4; k++) { const t = (clock * 0.5 + k * 0.25 + f * 0.01) % 1; ctx.fillStyle = `rgba(200,200,210,${0.35 * (1 - t)})`; ctx.fillRect(R(f + Math.sin((t + k) * 5) * 3 + t * 6), R(G0 - 118 - t * 30), 2, 2); }
  }
  // wet ground: reflections of the lights mirrored below the kerb, then puddles
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
    for (let i = 0; i < 12; i++) {
      const x = 60 + hash(i, 61) * (TW - 120), y = G0 + 16 + hash(i, 62) * 36, rw = 12 + hash(i, 63) * 22;
      ctx.fillStyle = ditherPattern(ctx, mix(P.ground, '#8fa4b8', 0.35 * wet), 0.7 * wet);
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
  for (const l of baked.lamps) if (l.x > cam.x - 80 && l.x < cam.x + pw + 80) L.push({ x: l.x + 0.5, y: l.y, r: l.r + (l.tree ? 0 : flick), color: l.tree ? '#ffd27a' : '#ffb257', a: night ? 1 : 0.3 });
  if (night) for (const w of baked.windows) {
    if (w.x < cam.x - 60 || w.x > cam.x + pw + 60) continue;
    if (w.shop) L.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: w.dim ? 18 : 34, color: '#ffc46a', a: w.dim ? 0.4 : 0.9, win: true });
    else if (!w.boarded && (w.door || hash(w.seed, 1) < 0.72)) L.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 16, color: '#ffc46a', a: 0.7, win: true });
  }
  if (harbour() && night && Math.sin(clock * 1.5) > 0.4) L.push({ x: LIGHTHOUSE.x, y: LIGHTHOUSE.y, r: 40, color: '#ffe6b0', a: 0.9, win: true });
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
