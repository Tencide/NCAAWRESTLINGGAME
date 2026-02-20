/**
 * Save/Load game state. Deterministic: same seed + same choices => identical outcomes after reload.
 * State includes rngState so RNG continues from correct position.
 */

const STORAGE_KEY = 'wrestlingpath_save';

export function saveGame(state: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function loadGame(): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem(STORAGE_KEY);
}

export function deleteSave(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
