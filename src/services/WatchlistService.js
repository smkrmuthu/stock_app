/**
 * WatchlistService.js
 * Manages user watchlist with localStorage persistence.
 * Used in Phase 5 — stubbed here for early wiring.
 */

import { storage } from '../utils/storage.js';

const WATCHLIST_KEY = 'sp_watchlist';

class WatchlistService {
  getAll() {
    return storage.get(WATCHLIST_KEY) || [];
  }

  add(symbol) {
    const list = this.getAll();
    if (!list.includes(symbol)) {
      list.push(symbol.toUpperCase());
      storage.set(WATCHLIST_KEY, list);
    }
    return list;
  }

  remove(symbol) {
    const list = this.getAll().filter((s) => s !== symbol.toUpperCase());
    storage.set(WATCHLIST_KEY, list);
    return list;
  }

  has(symbol) {
    return this.getAll().includes(symbol.toUpperCase());
  }

  clear() {
    storage.remove(WATCHLIST_KEY);
  }
}

export const watchlistService = new WatchlistService();
