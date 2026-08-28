/**
 * storage.js
 * LocalStorage abstraction with JSON serialization and error handling.
 */

export const storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`[Storage] Failed to get "${key}":`, err);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[Storage] Failed to set "${key}":`, err);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[Storage] Failed to remove "${key}":`, err);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('[Storage] Failed to clear:', err);
    }
  },
};
