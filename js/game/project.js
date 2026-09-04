// Full state -> what one phone needs. Keeps payloads small and hides nothing the
// phone should not see (there is no secret state in a co-op game, but the phone
// still does not need boat coordinates).
import { gearStats } from '../shared/catalog.js';
import { seasonOf } from './world.js';

const r2 = n => Math.round(n * 100) / 100;

export function project(state, seat) {
  const p = state.players[seat];
  if (!p) return null;
  const gear = gearStats(state.empire);
  const f = p.fishing;
  return {
    phase: state.phase, seat, name: p.name, color: p.color,
    gold: state.empire.gold, bait: gear.baitName, baitCount: state.empire.baitCount,
    hold: p.hold.length, cap: gear.cap,
    day: state.time.day, season: seasonOf(state.time.day), minute: Math.floor(state.time.minute),
    loc: p.loc, prompt: p.prompt, aLabel: p.aLabel || 'Cast', near: p.near || null,
    fishing: f ? {
      stage: f.stage, power: f.power !== undefined ? r2(f.power) : undefined,
      fpos: f.fpos !== undefined ? r2(f.fpos) : undefined, zpos: f.zpos !== undefined ? r2(f.zpos) : undefined,
      zsize: f.zsize, prog: f.prog !== undefined ? r2(f.prog) : undefined,
      tension: f.tension !== undefined ? r2(f.tension) : undefined,
      tug: f.tug ? f.tug.phase : null, tugT: f.tug?.phase === 'open' ? r2(f.tug.t / f.tug.dur) : undefined,
      win: f.stage === 'bite' ? r2(f.win / f.winDur) : undefined,
      fish: f.fish ? { name: f.fish.name, weight: f.fish.weight, price: f.fish.price, tier: f.fish.tier } : null,
      reason: f.reason,
    } : null,
    menu: p.menu ? { shop: p.menu.shop, cursor: p.menu.cursor, items: p.menu.items } : null,
  };
}
