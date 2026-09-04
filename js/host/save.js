// Saves live in the host browser's localStorage, one slot per room code.
const PREFIX = 'lanternlake-save-';

export function saveGame(save) {
  try { localStorage.setItem(PREFIX + save.code, JSON.stringify(save)); } catch (e) { console.warn('save failed', e); }
}
export function loadGame(code) {
  try { const raw = localStorage.getItem(PREFIX + code); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function deleteGame(code) { localStorage.removeItem(PREFIX + code); }
export function listGames() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) { const s = loadGame(k.slice(PREFIX.length)); if (s) out.push(s); }
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}
