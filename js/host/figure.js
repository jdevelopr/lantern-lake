// Characters, assembled from hand-drawn pixel maps (art/people-*.js): legs, torso with
// the arm pose, head, hair, hat and overlays are separate layers so every resident,
// keeper and player shares one sheet per art style while wearing their own outfit. Six
// walk frames with a body bob and arm swing, blinking when idle. No black outlines.
import { scale, mix, R } from './gfx.js';
import { blit } from './art/px.js';
import { S, getStyle } from './style.js';
import { A, CAT, DOG, GULL } from './art/people-a.js';
import { B } from './art/people-b.js';
import { C } from './art/people-c.js';

const SHEETS = { storybook: A, harbour: B, north: C };
export const sheet = () => SHEETS[getStyle()] || A;

const DEF = { h: '#3a2a1c', s: '#e6c3a0', e: '#2a2230', c: '#5a6a8a', d: '#3d3a4a', b: '#2a2434', w: '#e8e2d2', a: '#e8e2d2', t: '#5a4030', f: '#c86a5a', r: '#c84a3a' };

const palCache = new Map();
/** Character palette -> map keys. Cached per outfit. */
function palette(p) {
  const key = Object.values(p).join('|');
  let P = palCache.get(key);
  if (P) return P;
  const cheek = p.f && S().cheek !== null ? p.f : p.s;
  P = {
    S: p.s, s: scale(p.s, 0.82), E: p.e, W: '#ffffff', K: cheek, M: scale(p.s, 0.62),
    H: p.h, h: scale(p.h, 0.7),
    C: p.c, c: scale(p.c, 0.72), L: mix(p.c, '#ffffff', 0.22),
    T: p.d, t: scale(p.d, 0.76), u: scale(p.d, 0.58),
    B: p.b, b: mix(p.b, '#ffffff', 0.3), D: scale(p.b, 0.7),
    A: p.a, a: scale(p.a, 0.8), N: p.t, n: scale(p.t, 0.7), R: p.r, r: scale(p.r, 0.72),
    G: '#6a6050', j: mix(p.s, p.h, 0.38), F: p.c, f: scale(p.c, 0.7), Y: '#e8b04a', g: '#9aa0a8',
  };
  palCache.set(key, P);
  return P;
}
const ARM = ['down', 'raise', 'point', 'carry'];

/**
 * A standing or walking person, feet centred at (x, y). o: { dir, pal, moving, phase (walk
 * time), arm 0 down | 1 raised | 2 forward | 3 carry, hat, hair, apron, scarf, beard,
 * glasses, stubble, stand (idle time, for blinking) }.
 */
export function drawFigure(ctx, x, y, o = {}) {
  const K = sheet(), P = palette({ ...DEF, ...(o.pal || {}) }), flip = (o.dir || 1) < 0;
  const left = R(x) - (K.W >> 1), top = R(y) - K.H + 1;
  const at = (rows, rowTop) => blit(ctx, rows, P, left, top + rowTop, flip);
  let bob = 0, legs = K.legs.stand, arm = ARM[o.arm || 0];
  if (o.moving) {
    const f = Math.floor((o.phase || 0) * 10) % 6;
    legs = K.legs.walk[f]; bob = K.walkBob[f]; arm = K.walkArm[f];
  }
  at(legs, K.legsTop);
  drawUpper(at, K, o, arm, bob);
}

function drawUpper(at, K, o, arm, bob) {
  at(K.torso[arm] || K.torso.down, K.torsoTop + bob);
  if (o.apron && K.apron) at(K.apron.map, K.apron.top + bob);
  at(K.head, bob);
  const blink = o.stand !== undefined && K.blink && ((o.stand * 0.9) % 4) < 0.15;
  if (blink) at(K.blink.map, K.blink.top + bob);
  if (o.stubble && K.stubble) at(K.stubble.map, K.stubble.top + bob);
  if (o.beard && K.beard) at(K.beard.map, K.beard.top + bob);
  if (o.glasses && K.glasses) at(K.glasses.map, K.glasses.top + bob);
  const hair = K.hair[o.hair || 'short'] || K.hair.short;
  at(hair, bob);
  if (o.scarf && K.scarf) at(K.scarf.map, K.scarf.top + bob);
  if (o.hat && K.hat[o.hat]) at(K.hat[o.hat], K.hatTop + bob);
}

/** Sitting on a chair or bench, feet on the floor at y; the knees point along dir. */
export function drawSeated(ctx, x, y, o = {}) {
  const K = sheet(), P = palette({ ...DEF, ...(o.pal || {}) }), flip = (o.dir || 1) < 0;
  const left = R(x) - (K.W >> 1), top = R(y) - K.H + 1;
  const at = (rows, rowTop) => blit(ctx, rows, P, left, top + rowTop, flip);
  at(K.legs.seated, K.legsTop);
  drawUpper(at, K, o, ARM[o.arm || 0], 0);
}

/** A child, feet at (x, y). o: { dir, pal, hair, hat, arm 0|1 }. */
export function drawKid(ctx, x, y, o = {}) {
  const K = sheet().kid, P = palette({ ...DEF, ...(o.pal || {}) }), flip = (o.dir || 1) < 0;
  const left = R(x) - (K.W >> 1), top = R(y) - K.H + 1;
  blit(ctx, K.body, P, left, top, flip);
  if (o.arm === 1) blit(ctx, K.raise, P, left, top + K.raiseTop, flip);
  blit(ctx, K.hair, P, left, top + K.hairTop, flip);
  if (o.hat && K.hat && K.hat[o.hat]) blit(ctx, K.hat[o.hat], P, left, top + K.hatTop, flip);
}

/** Asleep: the head on a pillow at (x, y) (top-left of the head), eyes shut. */
export function drawSleeper(ctx, x, y, o = {}) {
  const K = sheet(), P = palette({ ...DEF, ...(o.pal || {}) });
  blit(ctx, K.sleeper, P, R(x), R(y));
}

export function drawCat(ctx, x, y, col, tail = 0) {
  const P = { F: col, f: scale(col, 0.7), E: '#2a2230' };
  const m = CAT.frames[tail % 2 ? 1 : 0];
  blit(ctx, m, P, R(x) - 7, R(y) - m.length + 1);
}
export function drawDog(ctx, x, y, col, breath = 0) {
  const P = { F: col, f: scale(col, 0.7) };
  const m = DOG.frames[breath % 2 ? 1 : 0];
  blit(ctx, m, P, R(x) - 8, R(y) - m.length + 1);
}
export function drawGull(ctx, x, y, blink = false) {
  const P = { W: '#f0f2f4', w: '#c8ccd0', g: '#9aa0a8', Y: '#e8b04a', E: blink ? '#f0f2f4' : '#1a1712' };
  const m = GULL.frames[0];
  blit(ctx, m, P, R(x) - 5, R(y) - m.length + 1);
}
