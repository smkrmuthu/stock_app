/**
 * Store.js
 * Lightweight reactive state store using Proxy.
 * Components can read state and subscribe to changes.
 * Simple alternative to Redux/Zustand — can be replaced in Phase 8.
 *
 * Usage:
 *   import { store } from './Store.js';
 *   store.setState({ currentSymbol: 'RELIANCE' });
 *   store.subscribe((state) => { console.log(state.currentSymbol); });
 */

import { eventBus } from './EventBus.js';

class Store {
  constructor(initialState = {}) {
    this._state = { ...initialState };
    this._subscribers = [];
  }

  /**
   * Get current state (read-only snapshot).
   * @returns {Object} Current state object
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Update state with partial updates (like React setState).
   * @param {Object|Function} updater - Object or function returning updates
   */
  setState(updater) {
    const prev = { ...this._state };
    const updates = typeof updater === 'function' ? updater(prev) : updater;
    this._state = { ...this._state, ...updates };
    this._notify(this._state, prev);
  }

  /**
   * Subscribe to state changes.
   * @param {Function} handler - Called with (newState, prevState)
   * @returns {Function} Unsubscribe function
   */
  subscribe(handler) {
    this._subscribers.push(handler);
    return () => {
      this._subscribers = this._subscribers.filter((h) => h !== handler);
    };
  }

  /**
   * Reset entire state to initial state.
   */
  reset(initialState = {}) {
    this._state = { ...initialState };
    this._notify(this._state, {});
  }

  _notify(newState, prevState) {
    this._subscribers.forEach((handler) => {
      try {
        handler(newState, prevState);
      } catch (err) {
        console.error('[Store] Error in subscriber:', err);
      }
    });
  }
}

// Global application state
export const store = new Store({
  // Currently viewed stock
  currentSymbol: null,
  currentStock: null,

  // News state
  newsCategory: 'all', // 'all' | 'world' | 'india' | 'symbol'
  allNews: [],
  worldNews: [],
  indiaNews: [],
  symbolNews: [],

  // UI state
  isLoading: false,
  isNewsLoading: false,
  error: null,

  // Watchlist (Phase 5)
  watchlist: [],

  // Portfolio (Phase 4)
  portfolio: [],

  // User preferences
  preferences: {
    theme: 'dark',
    currency: 'INR',
    locale: 'en-IN',
  },
});
