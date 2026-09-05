// Text for the Fish Journal, shared by the TV and the phone: where and when a species
// bites, what weather favours it, and a hint for the ones you have not caught yet.
import { FISH, WATER_OF } from './catalog.js';
import { ZONE_LABELS, WATER_NAMES } from '../game/waters.js';
import { WEATHER } from '../game/weather.js';
import { SEASON_NAMES } from './protocol.js';
import { seasonOf, dayOfSeason } from '../game/world.js';

export const ZONE_NAMES = ZONE_LABELS;
const ZONE_IN = { shallows: 'the shallows', reeds: 'the reeds', open: 'open water', deep: 'the deep water', rapids: 'the rapids', pool: 'a pool', run: 'the run', bank: 'the undercut banks', shoal: 'the shoals', reef: 'the reef', blue: 'the deep blue' };
const WATER_ON = { lake: 'on the lake', river: 'on the Ash River', ocean: 'out on the Grey Sea' };
const STYLE = { calm: 'Drifts, easy to hold', darter: 'Darts, keep up', diver: 'Dives, then leaps' };
const TIME = { day: 'By day', night: 'After dark', any: 'Day or night' };

export const list = arr => arr.join(', ');

/** Static facts about a species. */
export function speciesInfo(spec) {
  const seasons = spec.seasons === 'all' ? ['Any season'] : spec.seasons.map(i => SEASON_NAMES[i]);
  const favours = Object.entries(WEATHER).filter(([k, d]) => d.favors[spec.id]).map(([k, d]) => d.label);
  return {
    water: WATER_NAMES[WATER_OF(spec)], waterKey: WATER_OF(spec),
    zones: spec.zones.map(z => ZONE_NAMES[z]),
    seasons, time: TIME[spec.time] || TIME.any,
    weather: favours.length ? favours : ['Any weather'],
    price: `${spec.ppk} g/kg`, style: STYLE[spec.behavior] || '',
    weight: `${spec.w[0]} to ${spec.w[1]} kg`,
    stars: spec.tier,
  };
}

/** One nudge for a species you have not landed: a place, a season and a time. */
export function hintFor(spec) {
  const zone = ZONE_IN[spec.zones[0]];
  const season = spec.seasons === 'all' ? '' : ` in ${SEASON_NAMES[spec.seasons[0]].toLowerCase()}`;
  const time = spec.time === 'night' ? ', after dark' : spec.time === 'day' ? ', by day' : '';
  const where = WATER_OF(spec) === 'lake' ? '' : ` ${WATER_ON[WATER_OF(spec)]}`;
  return `Try ${zone}${where}${season}${time}`;
}

/** "Spring day 2, the reeds, rain" for a journal entry's first catch. */
export function firstText(first) {
  if (!first) return '';
  const w = (WEATHER[first.weather] || WEATHER.clear).label.toLowerCase();
  const where = first.water && first.water !== 'lake' ? ` ${WATER_ON[first.water]}` : '';
  return `${SEASON_NAMES[seasonOf(first.day)]} day ${dayOfSeason(first.day)}, ${ZONE_IN[first.zone] || first.zone}${where}, ${w}`;
}

/** Everything a page needs, for species index i and a player's log. */
export function journalPage(i, log) {
  const n = FISH.length, idx = ((i % n) + n) % n, spec = FISH[idx], entry = log?.[spec.id] || null;
  return { idx, n, spec, entry, caught: !!entry, info: speciesInfo(spec), hint: hintFor(spec), first: entry ? firstText(entry.first) : '' };
}

export function journalTotals(log) {
  let species = 0, count = 0;
  for (const f of FISH) { const e = log?.[f.id]; if (e) { species++; count += e.n; } }
  return { species, count, total: FISH.length };
}
