// Characters: the player's walker and everyone in town, drawn procedurally at the scale
// of the buildings (32 px tall, a door is 36). No outlines: parts are self-shaded on their
// lower and back edges. A four-phase walk, hats, hair, aprons, beards, sitting and sleeping. Facing is a
// mirror, so every part is placed in "facing right" coordinates.
import { R, scale, mix } from './gfx.js';

const DEF = { h: '#3a2a1c', s: '#e6c3a0', e: '#2a2230', c: '#5a6a8a', d: '#3d3a4a', b: '#2a2434', w: '#e8e2d2', k: '#3a3040', a: '#e8e2d2', t: '#5a4030', g: '#e8b04a' };

function painter(ctx, x, y, dir, P) {
  const rect = (px, py, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(px, py, w, h); };
  // dx is the left edge when facing right; mirrored it becomes the right edge
  const px = (dx, w) => dir > 0 ? R(x + dx) : R(x - dx - w + 1);
  // parts are shaded on their lower and back edges with a darker tone of their own colour
  const part = (dx, dy, w, h, col) => { const X = px(dx, w), Y = R(y + dy); rect(X, Y, w, h, col); const e = scale(col, 0.72); rect(X, Y + h - 1, w, 1, e); rect(dir > 0 ? X : X + w - 1, Y, 1, h, e); };
  const fill = (dx, dy, w, h, col) => rect(px(dx, w), R(y + dy), w, h, col);
  return { part, fill };
}

function head(D, P, hb, o) {
  const { part, fill } = D, hair = o.hair || 'short';
  part(-5, hb, 10, 10, P.s);
  // hair: top, back of the head, fringe, a highlight
  if (hair !== 'bald') { fill(-5, hb, 10, 4, P.h); fill(-5, hb + 4, 2, 4, P.h); fill(-3, hb + 4, 3, 1, P.h); fill(-3, hb + 1, 4, 1, mix(P.h, '#ffffff', 0.18)); }
  else { fill(-5, hb + 2, 2, 5, P.h); fill(3, hb + 2, 2, 5, P.h); fill(-4, hb, 8, 1, mix(P.s, '#ffffff', 0.2)); }
  if (hair === 'bun') { part(-8, hb + 3, 3, 3, P.h); }
  if (hair === 'long') { part(-7, hb + 3, 3, 12, P.h); fill(-5, hb + 4, 2, 6, P.h); }
  if (hair === 'curls') { fill(-6, hb + 1, 12, 5, P.h); fill(-6, hb + 6, 2, 3, P.h); fill(4, hb + 6, 2, 2, P.h); }
  // face
  fill(0, hb + 5, 1, 1, P.e); fill(3, hb + 5, 1, 1, P.e);
  fill(4, hb + 6, 1, 1, scale(P.s, 0.85)); fill(1, hb + 8, 3, 1, scale(P.s, 0.78)); fill(-4, hb + 5, 1, 2, scale(P.s, 0.9));
  if (o.glasses) { fill(-1, hb + 4, 3, 3, 'rgba(180,200,220,0.5)'); fill(3, hb + 4, 2, 3, 'rgba(180,200,220,0.5)'); fill(-1, hb + 4, 1, 3, '#5a5040'); fill(2, hb + 4, 1, 3, '#5a5040'); fill(4, hb + 4, 1, 3, '#5a5040'); }
  if (o.beard) { fill(-2, hb + 7, 8, 3, P.h); fill(-1, hb + 10, 6, 1, P.h); fill(1, hb + 8, 3, 1, scale(P.h, 0.7)); }
  // hats
  if (o.hat === 'cap') { part(-6, hb - 1, 12, 3, P.t); part(4, hb + 1, 5, 1, scale(P.t, 0.8)); }
  else if (o.hat === 'brim') { part(-4, hb - 3, 8, 4, P.t); part(-7, hb + 1, 14, 1, P.t); fill(-4, hb, 8, 1, scale(P.t, 0.75)); }
  else if (o.hat === 'beanie') { part(-6, hb - 2, 12, 5, P.t); fill(-6, hb + 2, 12, 1, mix(P.t, '#ffffff', 0.25)); fill(-1, hb - 3, 2, 1, mix(P.t, '#ffffff', 0.3)); }
  else if (o.hat === 'kerchief') { part(-6, hb - 1, 12, 4, P.t); fill(-7, hb + 3, 3, 4, P.t); }
}

/**
 * A standing or walking person, feet at (x, y). o: { dir, pal, phase 0..3, moving, arm 0 down |
 * 1 raised | 2 forward, hat, hair, apron, beard, glasses, bob }.
 */
export function drawFigure(ctx, x, y, o = {}) {
  const P = { ...DEF, ...(o.pal || {}) }, dir = o.dir || 1, D = painter(ctx, x, y, dir, P);
  const { part, fill } = D;
  const ph = o.moving ? (o.phase | 0) % 4 : 0;
  const fx = o.moving ? [3, 1, -2, 1][ph] : 0, bx = -fx;
  const bob = o.moving && ph % 2 ? -1 : 0;
  const C = scale(P.c, 0.78), Dk = scale(P.d, 0.8);
  // back arm, back leg
  part(-8, -20 + bob, 3, 9, C); fill(-8, -11 + bob, 3, 2, scale(P.s, 0.9));
  part(-5 + bx, -10, 5, 9, Dk); part(-6 + bx, -3, 6, 3, P.b);
  // torso, belt, apron
  part(-6, -21 + bob, 12, 11, P.c); fill(-6, -21 + bob, 3, 11, C); fill(-2, -21 + bob, 5, 2, P.w);
  fill(1, -18 + bob, 1, 1, P.k); fill(1, -15 + bob, 1, 1, P.k);
  fill(-6, -11 + bob, 12, 2, P.k); fill(0, -11 + bob, 2, 1, P.g);
  if (o.apron) { fill(-4, -18 + bob, 9, 8, P.a); fill(-4, -18 + bob, 9, 1, scale(P.a, 0.8)); fill(-2, -13 + bob, 5, 1, scale(P.a, 0.85)); }
  // front leg and boot
  part(0 + fx, -10, 5, 9, P.d); part(-1 + fx, -3, 6, 3, P.b); fill(fx, -3, 1, 1, mix(P.b, '#ffffff', 0.25));
  // neck and head
  fill(-1, -22 + bob, 4, 1, scale(P.s, 0.88));
  head(D, P, -32 + bob, o);
  // front arm
  if (o.arm === 1) { part(5, -27 + bob, 3, 8, P.c); fill(5, -29 + bob, 3, 2, P.s); }
  else if (o.arm === 2) { part(5, -19 + bob, 7, 3, P.c); fill(11, -19 + bob, 2, 3, P.s); }
  else { const sw = o.moving ? [1, 0, -1, 0][ph] : 0; part(5 + sw, -20 + bob, 3, 9, P.c); fill(5 + sw, -11 + bob, 3, 2, P.s); }
}

/** Seated, feet at (x, y), facing `dir`. arm 0 hands in lap, 1 hands forward (reading, knitting). */
export function drawSeated(ctx, x, y, o = {}) {
  const P = { ...DEF, ...(o.pal || {}) }, dir = o.dir || 1, D = painter(ctx, x, y, dir, P);
  const { part, fill } = D;
  const C = scale(P.c, 0.78);
  part(6, -7, 4, 7, P.d); part(5, -3, 6, 3, P.b);
  part(-3, -11, 11, 4, scale(P.d, 0.9));
  part(-7, -19, 3, 8, C);
  part(-6, -21, 10, 11, P.c); fill(-6, -21, 3, 11, C); fill(-2, -21, 4, 2, P.w); fill(-6, -12, 10, 2, P.k);
  if (o.apron) { fill(-4, -18, 8, 7, P.a); }
  fill(-1, -22, 4, 1, scale(P.s, 0.88));
  head(D, P, -32, o);
  if (o.arm === 1) { part(1, -16, 6, 3, P.c); fill(6, -16, 2, 2, P.s); fill(2, -13, 2, 1, P.s); }
  else { part(2, -19, 3, 8, P.c); fill(2, -12, 3, 2, P.s); }
}

/** A child, 22 px tall, feet at (x, y). */
export function drawKid(ctx, x, y, o = {}) {
  const P = { ...DEF, ...(o.pal || {}) }, dir = o.dir || 1, D = painter(ctx, x, y, dir, P);
  const { part, fill } = D;
  const ph = o.moving ? (o.phase | 0) % 4 : 0, fx = o.moving ? [2, 0, -1, 0][ph] : 0;
  part(-3 - fx, -6, 3, 6, scale(P.d, 0.8)); part(0 + fx, -6, 3, 6, P.d);
  part(-4, -14, 8, 8, P.c); fill(-4, -14, 2, 8, scale(P.c, 0.8)); fill(-1, -14, 3, 1, P.w);
  part(-6, -13, 2, 6, scale(P.c, 0.8));
  part(-4, -22, 8, 8, P.s); fill(-4, -22, 8, 3, P.h); fill(-4, -19, 2, 3, P.h); fill(-2, -21, 3, 1, mix(P.h, '#ffffff', 0.2));
  fill(0, -18, 1, 1, P.e); fill(2, -18, 1, 1, P.e); fill(1, -16, 2, 1, scale(P.s, 0.8));
  if (o.arm === 1) { part(4, -18, 2, 5, P.c); fill(4, -19, 2, 1, P.s); } else { part(4, -13, 2, 6, P.c); fill(4, -8, 2, 1, P.s); }
  if (o.hat === 'cap') { part(-5, -23, 10, 2, P.t); part(3, -21, 4, 1, P.t); }
}

/** Asleep: a head on the pillow with a blanket over the rest. (x, y) is the pillow's left top. */
export function drawSleeper(ctx, x, y, o = {}) {
  const P = { ...DEF, ...(o.pal || {}) }, D = painter(ctx, x, y, 1, P), { part, fill } = D;
  part(0, 0, 9, 7, P.s); fill(0, 0, 9, 3, P.h); fill(0, 3, 2, 3, P.h);
  fill(3, 4, 2, 1, P.e); fill(6, 4, 2, 1, P.e); fill(4, 6, 2, 1, scale(P.s, 0.8));
  if (o.beard) fill(2, 5, 6, 2, P.h);
  if (o.hair === 'long') fill(-2, 2, 3, 6, P.h);
}

/** Animals at the same scale. */
export function drawCat(ctx, x, y, col, tail = 0, curled = true) {
  // curled on its side; the tail flicks between two positions
  const o = scale(col, 0.7);
  const rect = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };
  rect(x, y - 7, 14, 7, col); rect(x, y - 1, 14, 1, o); rect(x, y - 7, 1, 7, o);
  rect(x + 9, y - 9, 5, 4, col); rect(x + 9, y - 11, 2, 2, col); rect(x + 12, y - 11, 2, 2, col);
  rect(x + 10, y - 8, 1, 1, '#1a1712'); rect(x + 13, y - 8, 1, 1, '#1a1712');
  rect(x + 2, y - 5, 4, 3, scale(col, 0.85));
  if (tail) rect(x - 4, y - 4, 5, 2, col); else rect(x - 3, y - 2, 4, 2, col);
  rect(x + 3, y - 1, 3, 1, scale(col, 0.7)); rect(x + 8, y - 1, 3, 1, scale(col, 0.7));
}
export function drawDog(ctx, x, y, col, breath = 0) {
  const o = scale(col, 0.7);
  const rect = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };
  rect(x, y - 8 - breath, 22, 8 + breath, col); rect(x, y - 1, 22, 1, o);
  rect(x + 17, y - 12, 7, 6, col); rect(x + 22, y - 10, 3, 3, o);
  rect(x + 21, y - 11, 1, 1, '#1a1712'); rect(x + 24, y - 9, 1, 1, '#1a1712');
  rect(x + 15, y - 12, 3, 4, scale(col, 0.75));
  rect(x - 5, y - 6, 5, 2, col); rect(x - 6, y - 7, 2, 2, col);
  rect(x + 2, y - 2, 5, 2, scale(col, 0.7)); rect(x + 12, y - 2, 5, 2, scale(col, 0.7));
  rect(x + 4, y - 6, 6, 2, scale(col, 0.85));
}
export function drawGull(ctx, x, y, blink = false) {
  const rect = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };
  rect(x, y - 8, 10, 5, '#e8e2d2'); rect(x, y - 5, 7, 2, '#c9c3b4'); rect(x, y - 3, 7, 1, '#a8a49a');
  rect(x + 7, y - 12, 4, 4, '#e8e2d2'); rect(x + 11, y - 10, 3, 1, '#e8b04a');
  rect(x + 9, y - 11, 1, 1, blink ? '#e8e2d2' : '#2a2230');
  rect(x - 3, y - 7, 4, 2, '#c9c3b4');
  rect(x + 3, y - 3, 1, 3, '#e8b04a'); rect(x + 6, y - 3, 1, 3, '#e8b04a'); rect(x + 2, y, 3, 1, '#e8b04a'); rect(x + 5, y, 3, 1, '#e8b04a');
}
