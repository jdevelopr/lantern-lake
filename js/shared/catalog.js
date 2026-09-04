// Gear tiers and fish species. Pure data; the rules in game/ interpret it.

export const GEAR = {
  rod: [
    { name: 'Bamboo rod',     price: 0,    zone: 0.26, rate: 0.17, desc: 'Creaky but honest' },
    { name: 'Fiberglass rod', price: 250,  zone: 0.32, rate: 0.21, desc: 'Wider catch zone' },
    { name: 'Carbon rod',     price: 900,  zone: 0.38, rate: 0.26, desc: 'Fast, forgiving' },
    { name: 'Moonlit rod',    price: 3000, zone: 0.44, rate: 0.32, desc: 'Sings when it bends' },
  ],
  line: [
    { name: 'Cotton line',  price: 0,    mult: 1.0,  desc: 'Snaps under a big fish' },
    { name: 'Nylon line',   price: 180,  mult: 0.8,  desc: 'Holds 20% more' },
    { name: 'Braided line', price: 700,  mult: 0.62, desc: 'Holds 40% more' },
    { name: 'Silk-steel',   price: 2200, mult: 0.48, desc: 'Nearly unbreakable' },
  ],
  // Bait is consumable: sold in packs of ten, one used per cast. Tier 0 is free and endless.
  bait: [
    { name: 'Worms',     price: 0,   wait: 1.0,  window: 0.45, rare: 0,   desc: 'Free from the garden' },
    { name: 'Grubs',     price: 30,  wait: 0.8,  window: 0.55, rare: 0.5, desc: 'Faster bites' },
    { name: 'Minnows',   price: 90,  wait: 0.65, window: 0.62, rare: 1.2, desc: 'Big fish notice' },
    { name: 'Glow lure', price: 250, wait: 0.5,  window: 0.72, rare: 2.5, desc: 'Rare fish at night' },
  ],
  boat: [
    { name: 'Rowboat',    price: 0,    hold: 0,  speed: 1.0,  len: 16, desc: 'Two oars and a wish' },
    { name: 'Skiff',      price: 400,  hold: 2,  speed: 1.1,  len: 19, desc: '+2 hold, a bit quicker' },
    { name: 'Cabin boat', price: 1500, hold: 6,  speed: 1.15, len: 23, desc: '+6 hold, has a roof' },
    { name: 'Trawler',    price: 5000, hold: 12, speed: 1.2,  len: 27, desc: '+12 hold, king of the lake' },
  ],
  engine: [
    { name: 'Oars',          price: 0,    speed: 42,  accel: 60,  desc: 'Slow and quiet' },
    { name: 'Outboard',      price: 300,  speed: 62,  accel: 110, desc: 'Puttering along' },
    { name: 'Twin outboard', price: 1100, speed: 82,  accel: 160, desc: 'Leaves a wake' },
    { name: 'Jet drive',     price: 3500, speed: 108, accel: 230, desc: 'Scares the ducks' },
  ],
  storage: [
    { name: 'Bucket',    price: 0,    cap: 4,  desc: 'Holds 4 fish' },
    { name: 'Cooler',    price: 150,  cap: 8,  desc: 'Holds 8 fish' },
    { name: 'Icebox',    price: 600,  cap: 14, desc: 'Holds 14 fish' },
    { name: 'Fish hold', price: 2000, cap: 24, desc: 'Holds 24 fish' },
  ],
};

export const GEAR_KEYS = ['rod', 'line', 'bait', 'boat', 'engine', 'storage'];

/** Resolve the empire's gear levels into the numbers the rules use. */
export function gearStats(empire) {
  const rod = GEAR.rod[empire.rod], line = GEAR.line[empire.line];
  const bait = empire.baitCount > 0 ? GEAR.bait[empire.bait] : GEAR.bait[0];
  const boat = GEAR.boat[empire.boat], engine = GEAR.engine[empire.engine];
  const storage = GEAR.storage[empire.storage];
  return {
    zone: rod.zone, rate: rod.rate, lineMult: line.mult,
    waitMult: bait.wait, window: bait.window, rare: bait.rare, baitName: bait.name,
    speed: engine.speed * boat.speed, accel: engine.accel, boatLen: boat.len,
    cap: storage.cap + boat.hold,
  };
}

// zones: shallows, reeds, open, deep. time: day, night, any. seasons: 'all' or list.
// behavior: calm (drifts), darter (sudden bursts), diver (sinks then leaps).
export const FISH = [
  { id: 'bluegill',  name: 'Bluegill',        zones: ['shallows', 'reeds'], seasons: 'all',          time: 'any',   w: [0.2, 0.8], ppk: 4,  tier: 1, behavior: 'calm',   rarity: 30, color: '#6f9fbf' },
  { id: 'perch',     name: 'Yellow perch',    zones: ['shallows', 'open'],  seasons: 'all',          time: 'day',   w: [0.3, 1.2], ppk: 5,  tier: 1, behavior: 'calm',   rarity: 25, color: '#e0b84a' },
  { id: 'sunfish',   name: 'Sunfish',         zones: ['shallows'],          seasons: [1],            time: 'day',   w: [0.2, 0.6], ppk: 5,  tier: 1, behavior: 'calm',   rarity: 22, color: '#f2a25a' },
  { id: 'crappie',   name: 'Crappie',         zones: ['reeds'],             seasons: [0, 1],         time: 'any',   w: [0.3, 1.0], ppk: 6,  tier: 1, behavior: 'darter', rarity: 20, color: '#a9b6a0' },
  { id: 'boot',      name: 'Old boot',        zones: ['shallows', 'open'],  seasons: 'all',          time: 'any',   w: [0.4, 0.9], ppk: 1,  tier: 1, behavior: 'calm',   rarity: 7,  color: '#6b4a32' },
  { id: 'carp',      name: 'Common carp',     zones: ['reeds', 'open'],     seasons: 'all',          time: 'any',   w: [1, 8],     ppk: 4,  tier: 2, behavior: 'diver',  rarity: 15, color: '#b48a4e' },
  { id: 'bass',      name: 'Largemouth bass', zones: ['reeds'],             seasons: [0, 1, 2],      time: 'day',   w: [1, 5],     ppk: 12, tier: 2, behavior: 'darter', rarity: 14, color: '#5e8a4a' },
  { id: 'catfish',   name: 'Channel catfish', zones: ['deep'],              seasons: 'all',          time: 'night', w: [2, 12],    ppk: 8,  tier: 2, behavior: 'diver',  rarity: 12, color: '#7a7f8a' },
  { id: 'walleye',   name: 'Walleye',         zones: ['open', 'deep'],      seasons: [0, 2],         time: 'night', w: [1, 4],     ppk: 14, tier: 2, behavior: 'darter', rarity: 10, color: '#c9b36a' },
  { id: 'trout',     name: 'Rainbow trout',   zones: ['open'],              seasons: [0, 2],         time: 'day',   w: [0.5, 3],   ppk: 16, tier: 2, behavior: 'darter', rarity: 10, color: '#d98aa0' },
  { id: 'pike',      name: 'Northern pike',   zones: ['reeds', 'open'],     seasons: [2, 3],         time: 'any',   w: [2, 10],    ppk: 15, tier: 3, behavior: 'darter', rarity: 7,  color: '#7d9c5b' },
  { id: 'burbot',    name: 'Burbot',          zones: ['deep'],              seasons: [3],            time: 'night', w: [1, 5],     ppk: 18, tier: 3, behavior: 'calm',   rarity: 6,  color: '#8d7a63' },
  { id: 'koi',       name: 'Golden koi',      zones: ['shallows'],          seasons: [0],            time: 'day',   w: [1, 3],     ppk: 60, tier: 3, behavior: 'darter', rarity: 2,  color: '#ffd24a' },
  { id: 'eel',       name: 'Ghost eel',       zones: ['deep'],              seasons: 'all',          time: 'night', w: [1, 4],     ppk: 40, tier: 3, behavior: 'diver',  rarity: 2,  color: '#cfe6ee' },
  { id: 'lantern',   name: 'Lanternfish',     zones: ['open', 'deep'],      seasons: [1, 2],         time: 'night', w: [0.5, 2],   ppk: 45, tier: 3, behavior: 'darter', rarity: 3,  color: '#ffe680' },
  { id: 'muskie',    name: 'Muskellunge',     zones: ['deep'],              seasons: [1, 2],         time: 'any',   w: [5, 20],    ppk: 25, tier: 4, behavior: 'darter', rarity: 3,  color: '#8fa86a' },
  { id: 'sturgeon',  name: 'Lake sturgeon',   zones: ['deep'],              seasons: 'all',          time: 'night', w: [10, 60],   ppk: 20, tier: 4, behavior: 'diver',  rarity: 2,  color: '#5e6b7a' },
];

export const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));

export const SHOPS = {
  dock:       { title: 'Dock' },
  fishmonger: { title: 'Fishmonger' },
  tackle:     { title: 'Tackle shop' },
  boatyard:   { title: 'Boatyard' },
};
