// Host-only rules. Pure over state: no DOM, no network. Randomness via rand(state).
import { GEAR, GEAR_KEYS, gearStats, FISH_BY_ID } from '../shared/catalog.js';
import { PLAYER_COLORS, MIN_PER_SEC, DAY_MINUTES, SEASON_DAYS } from '../shared/protocol.js';
import { WORLD, TOWN, ROCKS, DOCK, BUILDINGS, clampToLake, nearDock, seasonOf } from './world.js';
import { rand, castPower, pickFish, startReel, tickReel } from './fishing.js';

export function initState(seed = 1) {
  return {
    phase: 'lobby', tick: 0, seed,
    time: { minute: 8 * 60 + 30, day: 1 },
    empire: {
      gold: 40, rod: 0, line: 0, bait: 0, baitCount: 0, boat: 0, engine: 0, storage: 0,
      earned: 0, caught: 0, best: null, log: {},
    },
    players: {},
    events: [],
  };
}

const emptyInput = () => ({ x: 0, y: 0, a: false, an: 0, pull: 0, back: 0, sel: -1, selN: 0 });

export function addPlayer(state, seat, cid, name, saved = null) {
  const p = {
    seat, cid, name, color: PLAYER_COLORS[seat % PLAYER_COLORS.length], connected: true,
    loc: 'lake',
    boat: { x: DOCK.spawn.x + seat * 26, y: DOCK.spawn.y - seat * 6, vx: 0, vy: 0, heading: -Math.PI / 2 },
    walk: { x: 90, dir: 1, moving: false, t: 0 },
    fishing: null, menu: null, hold: [], prompt: '',
    stats: { caught: 0, earned: 0, best: null },
    input: emptyInput(), prev: emptyInput(),
  };
  if (saved) { p.hold = saved.hold || []; p.stats = saved.stats || p.stats; p.name = saved.name || name; }
  state.players[seat] = p;
  return p;
}

export function reduce(state, action) {
  switch (action.type) {
    case 'input': {
      const p = state.players[action.seat];
      if (p) Object.assign(p.input, action.payload);
      return state;
    }
    case 'connected': {
      const p = state.players[action.seat];
      if (p) { p.connected = action.connected; p.input = emptyInput(); p.prev = emptyInput(); }
      return state;
    }
    case 'tick': return tick(state, action.dt / 1000);
    default: return state;
  }
}

function tick(state, dt) {
  state.tick++;
  const t = state.time;
  t.minute += MIN_PER_SEC * dt;
  if (t.minute >= DAY_MINUTES) {
    t.minute -= DAY_MINUTES;
    t.day++;
    state.events.push({ n: 'newday', day: t.day, season: seasonOf(t.day), newSeason: (t.day - 1) % SEASON_DAYS === 0 });
  }
  const gear = gearStats(state.empire);
  for (const p of Object.values(state.players)) {
    if (p.connected) {
      const inp = p.input, prev = p.prev;
      const edge = {
        pressA: inp.an !== prev.an, releaseA: !inp.a,
        pulled: inp.pull !== prev.pull, back: inp.back !== prev.back,
        sel: inp.selN !== prev.selN ? inp.sel : -1,
      };
      if (p.loc === 'lake') tickLake(state, p, edge, gear, dt);
      else tickTown(state, p, edge, gear, dt);
      p.prev = { ...inp };
    }
  }
  return state;
}

/* --------------------------------------------------------------- lake --- */

function tickLake(state, p, edge, gear, dt) {
  const b = p.boat, f = p.fishing, inp = p.input;
  const full = p.hold.length >= gear.cap;

  if (!f) {
    // Movement: arcade steering. Stick vector is the desired velocity.
    const mag = Math.hypot(inp.x, inp.y);
    const tx = mag > 0.15 ? inp.x / Math.max(1, mag) * gear.speed : 0;
    const ty = mag > 0.15 ? inp.y / Math.max(1, mag) * gear.speed : 0;
    const dvx = tx - b.vx, dvy = ty - b.vy, dl = Math.hypot(dvx, dvy);
    const step = gear.accel * dt;
    if (dl <= step) { b.vx = tx; b.vy = ty; } else { b.vx += dvx / dl * step; b.vy += dvy / dl * step; }
    if (mag > 0.15) {
      const want = Math.atan2(inp.y, inp.x);
      let d = want - b.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      b.heading += d * Math.min(1, 7 * dt);
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const c = clampToLake(b.x, b.y, 0.94);
    if (c.hit) { b.x = c.x; b.y = c.y; b.vx *= 0.2; b.vy *= 0.2; }
    for (const r of ROCKS) {
      const dx = b.x - r.x, dy = b.y - r.y, d = Math.hypot(dx, dy), min = r.r + 7;
      if (d < min && d > 0) { b.x = r.x + dx / d * min; b.y = r.y + dy / d * min; b.vx *= 0.3; b.vy *= 0.3; }
    }
    p.moving = Math.hypot(b.vx, b.vy) > 4;

    const docking = nearDock(b.x, b.y);
    p.prompt = docking ? 'Dock' : full ? 'Hold full' : 'Cast';
    p.aLabel = docking ? 'Dock' : 'Cast';
    if (edge.pressA) {
      if (docking) {
        p.loc = 'town'; p.walk.x = 90; p.walk.dir = 1; b.vx = b.vy = 0;
        state.events.push({ n: 'dock', seat: p.seat });
      } else if (!full) {
        p.fishing = { stage: 'charging', t: 0, power: 0 };
        b.vx = b.vy = 0;
      } else {
        state.events.push({ n: 'holdfull', seat: p.seat });
      }
    }
    return;
  }

  p.moving = false;
  switch (f.stage) {
    case 'charging': {
      f.t += dt; f.power = castPower(f.t);
      p.prompt = 'Release to cast'; p.aLabel = 'Cast';
      if (edge.releaseA && f.t > 0.05) {
        const dist = 26 + f.power * 105;
        const tx = b.x + Math.cos(b.heading) * dist, ty = b.y + Math.sin(b.heading) * dist;
        const c = clampToLake(tx, ty, 0.97);
        f.stage = 'flying'; f.t = 0; f.dur = 0.5;
        f.from = { x: b.x + Math.cos(b.heading) * 8, y: b.y + Math.sin(b.heading) * 8 };
        f.to = { x: c.x, y: c.y }; f.bx = f.from.x; f.by = f.from.y;
        f.usedBait = state.empire.baitCount > 0;
        if (f.usedBait) state.empire.baitCount--;
        state.events.push({ n: 'cast', seat: p.seat, power: f.power });
      }
      return;
    }
    case 'flying': {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.bx = f.from.x + (f.to.x - f.from.x) * k;
      f.by = f.from.y + (f.to.y - f.from.y) * k;
      f.arc = Math.sin(k * Math.PI) * (12 + Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * 0.15);
      p.prompt = ''; p.aLabel = 'Wait';
      if (k >= 1) {
        f.stage = 'waiting'; f.arc = 0;
        f.wait = (2.5 + rand(state) * 6) * gear.waitMult;
        f.nibble = 0; f.nextNibble = 1 + rand(state) * 2; f.dip = 0;
        state.events.push({ n: 'splash', seat: p.seat, x: f.bx, y: f.by });
      }
      return;
    }
    case 'waiting': {
      f.wait -= dt;
      f.nextNibble -= dt;
      if (f.nibble > 0) f.nibble -= dt;
      else if (f.nextNibble <= 0) { f.nibble = 0.35; f.nextNibble = 0.8 + rand(state) * 2.5; }
      f.dip = f.nibble > 0 ? 1.5 : 0;
      p.prompt = 'Waiting'; p.aLabel = 'Wait';
      if (edge.back) { p.fishing = null; return; }
      if (f.wait <= 0) {
        f.stage = 'bite'; f.win = gear.window; f.winDur = gear.window; f.dip = 4;
        state.events.push({ n: 'bite', seat: p.seat, x: f.bx, y: f.by });
      }
      return;
    }
    case 'bite': {
      f.win -= dt;
      p.prompt = 'Hook!'; p.aLabel = 'Hook';
      if (edge.pressA) {
        const fish = pickFish(state, f.bx, f.by, gear);
        startReel(f, fish, gear, state);
        state.events.push({ n: 'hooked', seat: p.seat, tier: fish.tier });
      } else if (f.win <= 0) {
        f.stage = 'lost'; f.t = 1.1; f.reason = 'It got away';
        state.events.push({ n: 'lost', seat: p.seat });
      }
      return;
    }
    case 'reel': {
      p.prompt = f.tug?.phase === 'open' ? 'Pull!' : 'Reel'; p.aLabel = 'Reel';
      const r = tickReel(f, inp.a, edge.pulled, dt, gear, state, state.events, p.seat);
      if (r === 'caught') {
        f.stage = 'caught'; f.t = 2.2;
        const fish = f.fish;
        p.hold.push({ id: fish.id, name: fish.name, weight: fish.weight, price: fish.price, tier: fish.tier });
        p.stats.caught++; state.empire.caught++;
        state.empire.log[fish.id] = (state.empire.log[fish.id] || 0) + 1;
        const rec = { name: fish.name, weight: fish.weight, by: p.name, seat: p.seat };
        if (!p.stats.best || fish.weight > p.stats.best.weight) p.stats.best = rec;
        if (!state.empire.best || fish.weight > state.empire.best.weight) state.empire.best = rec;
        state.events.push({ n: 'caught', seat: p.seat, fish, x: f.bx, y: f.by });
      } else if (r === 'lost') {
        f.stage = 'lost'; f.t = 1.2; f.reason = 'Line snapped';
        state.events.push({ n: 'snap', seat: p.seat, x: f.bx, y: f.by });
      }
      return;
    }
    case 'caught':
    case 'lost': {
      f.t -= dt;
      p.prompt = ''; p.aLabel = 'Cast';
      if (f.t <= 0 || edge.pressA) p.fishing = null;
      return;
    }
  }
}

/* --------------------------------------------------------------- town --- */

function nearestBuilding(x) {
  let best = null, bd = 26;
  for (const b of BUILDINGS) { const d = Math.abs(b.x - x); if (d < bd) { bd = d; best = b; } }
  return best;
}

function tickTown(state, p, edge, gear, dt) {
  const w = p.walk, inp = p.input;
  if (p.menu) {
    tickMenu(state, p, edge, gear, dt);
    return;
  }
  const vx = Math.abs(inp.x) > 0.2 ? Math.sign(inp.x) * Math.min(1, Math.abs(inp.x) * 1.2) * 72 : 0;
  w.x = Math.max(24, Math.min(TOWN.w - 24, w.x + vx * dt));
  w.moving = vx !== 0;
  if (vx) w.dir = Math.sign(vx);
  w.t += dt;
  const b = nearestBuilding(w.x);
  p.near = b?.id || null;
  p.prompt = b ? (b.id === 'dock' ? 'Set sail' : b.label) : '';
  p.aLabel = b ? (b.id === 'dock' ? 'Sail' : 'Enter') : 'Walk';
  if (edge.pressA && b) {
    if (b.id === 'dock') {
      p.loc = 'lake';
      p.boat.x = DOCK.spawn.x + p.seat * 26; p.boat.y = DOCK.spawn.y - p.seat * 6;
      p.boat.vx = p.boat.vy = 0; p.boat.heading = -Math.PI / 2;
      state.events.push({ n: 'sail', seat: p.seat });
    } else {
      p.menu = { shop: b.id, cursor: 0, nav: 0, items: shopItems(state, b.id, p) };
      state.events.push({ n: 'open', seat: p.seat });
    }
  }
}

/** Build the menu rows for a shop. Called on open and after every purchase. */
export function shopItems(state, shop, p) {
  const e = state.empire, items = [];
  const upgrade = key => {
    const lvl = e[key], next = GEAR[key][lvl + 1];
    if (!next) return { kind: 'max', label: GEAR[key][lvl].name, desc: 'Best there is', price: null, enabled: false };
    return { kind: 'buy', key, label: next.name, desc: next.desc, price: next.price, enabled: e.gold >= next.price };
  };
  if (shop === 'fishmonger') {
    const value = p.hold.reduce((s, f) => s + f.price, 0);
    items.push({ kind: 'sell', label: 'Sell catch', desc: p.hold.length ? `${p.hold.length} fish` : 'Nothing to sell', price: value ? -value : null, enabled: p.hold.length > 0 });
    if (p.hold.length) {
      const best = [...p.hold].sort((a, b) => b.price - a.price)[0];
      items.push({ kind: 'info', label: `Best: ${best.name}`, desc: `${best.weight} kg`, price: -best.price, enabled: false });
    }
  } else if (shop === 'tackle') {
    items.push(upgrade('rod'), upgrade('line'));
    for (let i = 1; i < GEAR.bait.length; i++) {
      const b = GEAR.bait[i];
      const owned = e.bait === i ? ` (${e.baitCount} left)` : '';
      items.push({ kind: 'bait', key: i, label: `${b.name} x10${owned}`, desc: b.desc, price: b.price, enabled: e.gold >= b.price });
    }
  } else if (shop === 'boatyard') {
    items.push(upgrade('boat'), upgrade('engine'), upgrade('storage'));
  }
  items.push({ kind: 'leave', label: 'Leave', desc: '', price: null, enabled: true });
  return items;
}

function tickMenu(state, p, edge, gear, dt) {
  const m = p.menu, inp = p.input;
  p.prompt = ''; p.aLabel = 'Select';
  // Stick navigation with a repeat delay; phones can also tap a row directly.
  m.nav = Math.max(0, m.nav - dt);
  if (m.nav === 0 && Math.abs(inp.y) > 0.5) {
    m.cursor = (m.cursor + (inp.y > 0 ? 1 : -1) + m.items.length) % m.items.length;
    m.nav = 0.22;
    state.events.push({ n: 'ui', seat: p.seat });
  }
  if (Math.abs(inp.y) <= 0.5) m.nav = Math.min(m.nav, 0.0);
  let choose = -1;
  if (edge.sel >= 0 && edge.sel < m.items.length) { m.cursor = edge.sel; choose = edge.sel; }
  else if (edge.pressA) choose = m.cursor;
  if (edge.back) { p.menu = null; state.events.push({ n: 'close', seat: p.seat }); return; }
  if (choose < 0) return;

  const it = m.items[choose], e = state.empire;
  if (it.kind === 'leave') { p.menu = null; state.events.push({ n: 'close', seat: p.seat }); return; }
  if (!it.enabled) { state.events.push({ n: 'nope', seat: p.seat }); return; }
  if (it.kind === 'sell') {
    const value = -it.price;
    e.gold += value; e.earned += value; p.stats.earned += value;
    state.events.push({ n: 'sold', seat: p.seat, value, count: p.hold.length });
    p.hold = [];
  } else if (it.kind === 'buy') {
    e.gold -= it.price; e[it.key]++;
    state.events.push({ n: 'buy', seat: p.seat, label: it.label, key: it.key });
  } else if (it.kind === 'bait') {
    e.gold -= it.price;
    if (e.bait === it.key) e.baitCount += 10; else { e.bait = it.key; e.baitCount = 10; }
    state.events.push({ n: 'buy', seat: p.seat, label: it.label, key: 'bait' });
  }
  m.items = shopItems(state, m.shop, p);
  m.cursor = Math.min(m.cursor, m.items.length - 1);
}

/* --------------------------------------------------------------- save --- */

export function toSave(state, code) {
  return {
    v: 1, code, savedAt: Date.now(),
    time: state.time, empire: state.empire, seed: state.seed,
    players: Object.values(state.players).map(p => ({ seat: p.seat, cid: p.cid, name: p.name, hold: p.hold, stats: p.stats })),
  };
}

export function fromSave(save) {
  const s = initState(save.seed || 1);
  s.time = { ...save.time };
  s.empire = { ...s.empire, ...save.empire };
  s.savedPlayers = save.players || [];
  return s;
}

export { GEAR_KEYS, FISH_BY_ID, WORLD, TOWN };
