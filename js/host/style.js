// Art direction switch. Three complete looks for the town and everyone in it share one
// renderer; the style picks the character sheet, the town kit and the interior materials.
// Chosen on the title screen, with ?style=storybook | harbour | north, remembered in
// localStorage, or LL.style('harbour'). Moody harbour is the default.
export const STYLES = {
  storybook: {
    name: 'Cosy storybook',
    // people: stocky, big heads, bright clothes, rosy cheeks
    fig: { H: 28, headW: 11, headH: 10, torsoH: 8, torsoW: 10, legH: 7, bootH: 2, armLen: 7, eye: 'big', neck: 1 },
    skin: ['#f2c9a4', '#e8b48a', '#d9a077', '#b8845c'], cheek: '#e89a8a',
    hair: ['#6b3f22', '#c8783a', '#2c2118', '#e8c26a', '#8a5a3a', '#d8d0bc'],
    coats: ['#d9564a', '#3d8a8a', '#e0a63a', '#6a5aa8', '#4e8a4e', '#c86a9a', '#3a6ab8'],
    trousers: ['#4a4a6a', '#6a4a3a', '#3a5a4a', '#5a3a4a'],
    // buildings: timber frames on whitewash, terracotta tiles, painted doors, flower boxes
    plaster: ['#f0e6d2', '#e8dcc0', '#f4ecdc', '#e0d4b8'], beam: '#5a3e2a', tile: '#b8623a', tile2: '#9a4e30', slate: '#6a7a8a',
    stone: '#a89a80', doors: ['#c84a3a', '#3a7a9a', '#5a8a3a', '#e0a63a', '#7a4a9a'], trim: '#f8f4ec', glass: '#8fc4e0',
    ground: '#b8a888', ground2: '#a09070', kerb: '#c8bca0', water: '#4a8fb0', sky: { tint: '#ffd9a0' },
    signBoard: '#f4e6c0', signText: '#5a3e2a', lamp: '#4a3a2a', lampGlass: '#ffd27a', bunting: ['#e0685a', '#f2c14e', '#7fe0c3', '#8fb4e0'],
  },
  harbour: {
    name: 'Moody harbour',
    // people: tall and lean, small heads, oilskins and wool, muted
    fig: { H: 36, headW: 8, headH: 9, torsoH: 12, torsoW: 9, legH: 11, bootH: 3, armLen: 10, eye: 'small', neck: 2 },
    skin: ['#d8b090', '#c9a07a', '#b88a66', '#8a6a4c'], cheek: null,
    hair: ['#3a2a1c', '#5a4a3a', '#1a1712', '#8a7a5c', '#a8a098', '#6a3a2a'],
    coats: ['#2f3d57', '#5a6a4a', '#8a4a34', '#c8a03a', '#4a4a50', '#6a5a3a', '#3a5a6a'],
    trousers: ['#2a2e3a', '#3a3a3c', '#4a3a30', '#2e3a2e'],
    // buildings: weathered clapboard, tarred boards, slate and corrugated iron, rust
    // painted boards, each house its own faded colour: blue-grey, falu red, ochre, bottle green, chalk
    plaster: ['#6a7a86', '#8a4e3a', '#9a8a60', '#3e5048', '#a8a498'], beam: '#2e2a26', tile: '#4a4e58', tile2: '#3a3e48', slate: '#3e4650',
    stone: '#6a6a66', doors: ['#3a4a5a', '#5a3a2a', '#2e4a3e', '#6a6a60', '#4a3a4a'], trim: '#d8d0bc', glass: '#4c6a86',
    ground: '#4e4c4a', ground2: '#3a3937', kerb: '#5c5a58', water: '#2f5a74', sky: { tint: '#9aa4b4' },
    signBoard: '#c9b28a', signText: '#2a1a10', lamp: '#2d3038', lampGlass: '#ffd27a', bunting: null,
  },
  north: {
    name: 'Snowbound north',
    // people: bundled up, fur collars, mittens, rosy cheeks
    fig: { H: 32, headW: 10, headH: 9, torsoH: 10, torsoW: 9, legH: 7, bootH: 3, armLen: 8, eye: 'small', neck: 1 },
    skin: ['#f2d2b8', '#e8bc9a', '#d4a27e', '#b8846a'], cheek: '#e0908a',
    hair: ['#5a3a22', '#e8c26a', '#2c2118', '#c8783a', '#d8d0bc', '#8a5a3a'],
    coats: ['#8a2e2e', '#2e5a3e', '#2f3d6b', '#c8903a', '#e8e2d2', '#5a3a6a', '#3a6a7a'],
    trousers: ['#2a2e3a', '#3a2a22', '#4a4a50', '#2e3a2e'],
    // buildings: stacked logs and stave timber, steep shingled roofs under snow, carved bargeboards
    plaster: ['#8a6242', '#7a563a', '#a07048', '#6a4a32', '#b88a5a'], beam: '#3a2a1c', tile: '#5a4030', tile2: '#4a3324', slate: '#e8eef2',
    stone: '#7a7a76', doors: ['#8a2e2e', '#2e5a3e', '#2f3d6b', '#c8903a', '#3a2a1c'], trim: '#e8e2d2', glass: '#7aa8c8',
    ground: '#dfe6ec', ground2: '#c4ced8', kerb: '#a8b0b8', water: '#2f4a64', sky: { tint: '#c8d8e8' },
    signBoard: '#c9a86a', signText: '#3a2a1c', lamp: '#2d3038', lampGlass: '#ffd27a', bunting: ['#8a2e2e', '#e8e2d2', '#2e5a3e', '#c8903a'],
  },
};
let current = null;
export function getStyle() {
  if (current) return current;
  let key = 'harbour';
  try { key = new URLSearchParams(location.search).get('style') || localStorage.getItem('ll-style') || key; } catch {}
  current = STYLES[key] ? key : 'harbour';
  return current;
}
export function setStyle(key) {
  if (!STYLES[key]) return current;
  current = key;
  try { localStorage.setItem('ll-style', key); } catch {}
  for (const fn of listeners) fn(key);
  return key;
}
export const S = () => STYLES[getStyle()];
const listeners = [];
export const onStyleChange = fn => listeners.push(fn);
