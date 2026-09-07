// Assembles the town from a kit: the harbour front, the boatyard, the shops and houses,
// the square with its well and market, the chapel and the lane. The kit supplies the
// materials and the sprites; this file supplies the layout, which all three styles share.
import { TOWN, BUILDINGS } from '../../game/world.js';
import { mkCanvas, hash, text } from '../gfx.js';
import { rect, hline, vline, fillTile, gable, roofSlope, eaveShadow, scale, mix } from './kit.js';

const TW = TOWN.w, H = 360, G0 = TOWN.ground, SQ = TOWN.square;
export const LAMP_X = [150, 300, 440, 522, 758, 970, 1050, 1150, 1246];

// Per-building plans: height, storeys, roof kind, colour tone, dormers
const PLAN = {
  fishmonger: { h: 100, floors: 2, roof: 'hip', tone: 0, door: 1, shop: 'fish', sign: 'FISHMONGER' },
  tackle:     { h: 114, floors: 2, roof: 'hip', tone: 1, door: 0, shop: 'rod', sign: 'TACKLE' },
  house1:     { h: 84,  floors: 1, roof: 'gable', tone: 2, door: 2, num: 3, dormer: true },
  house2:     { h: 118, floors: 2, roof: 'hip', tone: 3, door: 3, num: 5 },
  house3:     { h: 80,  floors: 1, roof: 'hip', tone: 1, door: 1, num: 7, dormer: true },
  house4:     { h: 110, floors: 2, roof: 'gable', tone: 0, door: 4, num: 9 },
};

export function bakeTown(K, season) {
  const snow = season === 3 || K.alwaysSnow;
  const out = { windows: [], lamps: [], smoke: [], bunting: [], signs: [], perches: [] };
  const [c, g] = mkCanvas(TW, H);
  const W = r => { out.windows.push(r); return r; }, L = l => { out.lamps.push(l); return l; };
  const opts = { ground: G0 };

  // ---- harbour front: the quay wall with its posts, ladder, lantern, dinghy and pots
  fillTile(g, 0, G0 - 16, 120, 16, K.stoneTile, K.stonePal, 0, G0 - 16); hline(g, 0, G0 - 16, 120, K.stoneLight || '#c4b89e');
  rect(g, 118, G0 - 16, 2, 16, K.stoneDark || '#867a64');
  for (const px of [18, 60, 102]) K.post(g, px, G0 - 16);
  rect(g, 84, G0 - 16, 1, 16, K.iron); rect(g, 90, G0 - 16, 1, 16, K.iron); for (let k = 0; k < 4; k++) rect(g, 84, G0 - 13 + k * 4, 7, 1, K.iron);
  rect(g, 38, G0 - 50, 2, 34, K.iron); L({ x: 39, y: G0 - 54, r: 34, glass: [37, G0 - 56, 4, 4] });
  rect(g, 35, G0 - 58, 8, 8, K.iron); rect(g, 37, G0 - 56, 4, 4, '#5a5248'); rect(g, 36, G0 - 60, 6, 2, K.iron);
  K.dinghy(g, 44, G0 - 16);
  K.pot(g, 100, G0 - 16); K.pot(g, 107, G0 - 20);
  if (K.quayExtras) K.quayExtras(g, G0, out);

  // ---- buildings, tallest first so the lower ones sit in front of their neighbours' eaves
  const list = BUILDINGS.filter(b => b.id !== 'dock').map(b => ({ b, x: Math.round(b.cx - b.w / 2), w: b.w, h: b.id === 'boatyard' ? (K.boatyardH || 92) : b.id === 'chapel' ? (K.chapelH || 96) : PLAN[b.id].h }));
  list.sort((a, b) => b.h - a.h);
  for (const it of list) {
    if (it.b.id === 'boatyard') boatyard(g, K, it, out, snow);
    else if (it.b.id === 'chapel') chapel(g, K, it, out, snow);
    else building(g, K, it, out, snow);
  }

  // ---- the square: a low wall with a view, the lantern tree, two stalls round the well, a bench and the notice board
  square(g, K, out, snow);

  // ---- street furniture
  for (const lx of LAMP_X) L(K.lampPost(g, lx, G0));
  K.barrel(g, 428, G0); K.crate(g, 439, G0); K.barrel(g, 1052, G0 - 2); K.crate(g, 1150, G0); K.crate(g, 1158, G0 - 10);
  K.planter(g, 196, G0); K.planter(g, 1236, G0);
  K.hull(g, 288, G0 - 24); rect(g, 290, G0 - 16, 4, 16, '#5a4030'); rect(g, 308, G0 - 16, 4, 16, '#5a4030');
  K.fence(g, 1256, G0, 24);
  K.tree(g, 1270, G0);

  // ---- the ground: kerb and cobbles with cart ruts, plus the slipway rails to the water
  ground(g, K, snow);
  for (let k = 0; k < 2; k++) rect(g, 118, G0 + 6 + k * 6, 60, 1, K.iron);
  if (K.extras) K.extras(g, G0, out, snow);
  return { canvas: c, ...out };
}

function building(g, K, it, out, snow) {
  const { b, x, w, h } = it, p = PLAN[b.id], y = G0 - h, door = K.doors[p.door % K.doors.length];
  const W = r => { out.windows.push(r); return r; }, L = l => { out.lamps.push(l); return l; };
  // shadow on the neighbour to the right, then the wall
  rect(g, x + w, y + 6, 3, h - 6, 'rgba(6,8,14,0.35)');
  K.wall(g, x, y, w, h, p.tone, { ground: G0, floors: p.floors, jetty: p.floors > 1 && !p.shop });
  // upper windows
  if (p.floors > 1) {
    const cols = Math.max(1, Math.floor((w - 12) / 30)), span = cols * 30, sx = x + Math.round((w - span) / 2) + 15;
    for (let k = 0; k < cols; k++) W(K.windowAt(g, sx + k * 30, y + 10, door));
  }
  // ground floor
  if (p.shop) {
    const wx = x + 8, ww = Math.max(28, b.x - 14 - wx);
    W(K.shopWindow(g, wx, G0 - 40, ww, 26, door, p.shop));
    W(K.doorAt(g, b.x, G0 - 1, door));
    L(K.lanternAt(g, b.x + 14, G0 - 34));
    K.sign(g, b.cx, y + 42, p.sign, p.shop);
  } else {
    const wy = G0 - 40;
    W(K.windowAt(g, x + 16, wy, door));
    W(K.doorAt(g, b.x, G0 - 1, door));
    L(K.lanternAt(g, b.x + 14, G0 - 34));
    K.numberPlate(g, x + w - 8, G0 - 30, p.num);
  }
  // roof, chimney, dormer
  if (p.roof === 'gable') {
    const gh = Math.round(w * 0.55);
    K.gableRoof(g, x, y, w, gh, snow);
    out.smoke.push(K.chimney(g, x + w - 18, y - Math.round(gh * 0.55)).x);
  } else {
    const pitch = p.dormer ? 24 : h > 100 ? 14 : 18;
    const s = K.roof(g, x, y, w, 'hip', pitch, snow);
    out.smoke.push(K.chimney(g, x + w - 20, s.y + 2).x);
    if (p.shop) out.perches.push([x + 12, s.y + 1]);
    if (p.dormer) W(K.dormer(g, x + (w >> 1), s.y + 8));
  }
}

function boatyard(g, K, it, out, snow) {
  const { b, x, w, h } = it, y = G0 - h;
  const W = r => { out.windows.push(r); return r; }, L = l => { out.lamps.push(l); return l; };
  rect(g, x + w, y + 6, 3, h - 6, 'rgba(6,8,14,0.35)');
  K.wall(g, x, y, w, h, 1, { ground: G0, floors: 1, jetty: false, shed: true });
  // tall sliding doors on the left with a hull inside, the yard door and a window on the right
  K.slidingDoors(g, x + 8, G0 - 1, 66, 60, out);
  W(K.windowAt(g, x + w - 34, y + 20, K.doors[0]));
  W(K.doorAt(g, b.x, G0 - 1, K.doors[0]));
  L(K.lanternAt(g, b.x + 14, G0 - 34));
  K.sign(g, x + 40, y + 16, 'BOATYARD', 'anchor');
  const s = K.shedRoof ? K.shedRoof(g, x, y, w, 16, snow) : K.roof(g, x, y, w, 'hip', 16, snow);
  out.smoke.push(K.chimney(g, x + w - 24, s.y + 2).x);
}

function chapel(g, K, it, out, snow) {
  const { b, x, w, h } = it, y = G0 - h, cx = x + (w >> 1);
  const W = r => { out.windows.push(r); return r; }, L = l => { out.lamps.push(l); return l; };
  K.chapelWall(g, x, y, w, h, G0);
  W(K.roseWindow(g, cx, y + 30));
  W(K.doorAt(g, b.x, G0 - 1, K.chapelDoor));
  L(K.lanternAt(g, b.x + 14, G0 - 34));
  // bell tower and spire above the ridge
  const s = K.roof(g, x, y, w, 'hip', 14, snow);
  K.tower(g, cx, s.y + 6, out, snow);
  out.perches.push([x + w - 14, s.y + 2]);
}

function square(g, K, out, snow) {
  const x0 = SQ.x0, x1 = SQ.x1, wx = SQ.well;
  K.squareWall(g, x0, x1, G0, snow);
  const lamps = K.tree(g, x0 + 36, G0, { lanterns: !!K.bunting });
  for (const l of lamps) out.lamps.push(l);
  if (K.bunting) out.bunting.push({ x0: x0 + 40, x1: x1 - 16, y: G0 - 92, colors: K.bunting });
  K.bench(g, x0 + 2, G0);
  K.stall(g, wx - 46, G0, K.stallTints[0]); K.stall(g, wx + 46, G0, K.stallTints[1]);
  K.well(g, wx, G0);
  K.board(g, x1 - 26, G0);
}

function ground(g, K, snow) {
  const C = K.ground;
  rect(g, 0, G0, TW, 8, C.kerb); hline(g, 0, G0, TW, mix(C.kerb, '#ffffff', 0.3));
  for (let x = 0; x < TW; x += 12) vline(g, x + ((x / 12 | 0) % 2 ? 6 : 0), G0 + 1, 7, scale(C.kerb, 0.82));
  rect(g, 0, G0 + 8, TW, 2, scale(C.kerb, 0.6));
  rect(g, 0, G0 + 10, TW, H - G0 - 10, C.cobble);
  K.paving(g, 0, G0 + 10, TW, H - G0 - 10);
  if (snow) K.snowGround(g, 0, G0, TW, H - G0);
}
