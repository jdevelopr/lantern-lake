// Shared constants. Keep this file tiny — anything with logic belongs in game/.

export const SLUG = 'lanternlake';   // namespaces the PeerJS id: lanternlake-ABCD
export const MAX_PLAYERS = 2;        // phones only; the TV host never plays
export const MIN_PLAYERS = 1;        // one phone can start; a second can join later
export const INTRO_MS = 5200;        // opening performance length
export const SOLO_CODE = 'SOLO';     // save-slot code for the host's single-player mode

// Player colours: coral and mint read well on both the night lake and daylight.
export const PLAYER_COLORS = ['#ff8c66', '#7fe0c3'];

export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

// Day/night. 4 game-minutes per real second: a full day is 6 real minutes.
export const MIN_PER_SEC = 4;
export const DAY_MINUTES = 1440;
export const SEASON_DAYS = 3;

export function clockText(minute) {
  const h = Math.floor(minute / 60) % 24, m = Math.floor(minute % 60);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'am' : 'pm'}`;
}
