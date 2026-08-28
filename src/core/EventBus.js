/**
 * EventBus.js
 * Lightweight Pub/Sub event system.
 * Components subscribe to events; other components publish events.
 * This decouples components — no direct imports or tight coupling.
 *
 * Usage:
 *   EventBus.on('stock:selected', (data) => { ... });
 *   EventBus.emit('stock:selected', { symbol: 'RELIANCE' });
 *   EventBus.off('stock:selected', handler);
 */

class EventBus {
  constructor() {
    this._events = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function for easy cleanup
   */
  on(event, handler) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} handler - The exact handler to remove
   */
  off(event, handler) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter((h) => h !== handler);
  }

  /**
   * Publish an event with optional data payload.
   * @param {string} event - Event name
   * @param {*} data - Payload to pass to all subscribers
   */
  emit(event, data) {
    if (!this._events[event]) return;
    this._events[event].forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  /**
   * Subscribe to an event once; automatically unsubscribes after first call.
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * List all registered event names (for debugging).
   */
  listEvents() {
    return Object.keys(this._events);
  }
}

// Singleton instance shared across the entire app
export const eventBus = new EventBus();

/**
 * Application-wide event names registry.
 * Use these constants instead of raw strings to avoid typos.
 */
export const EVENTS = {
  // Stock events
  STOCK_SEARCH:        'stock:search',
  STOCK_LOADED:        'stock:loaded',
  STOCK_ERROR:         'stock:error',
  STOCK_CLEARED:       'stock:cleared',

  // News events
  NEWS_LOADED:         'news:loaded',
  NEWS_FILTER_CHANGED: 'news:filter-changed',
  NEWS_ERROR:          'news:error',

  // UI events
  LOADING_START:       'ui:loading-start',
  LOADING_STOP:        'ui:loading-stop',
  TOAST_SHOW:          'ui:toast-show',
  THEME_CHANGED:       'ui:theme-changed',

  // Watchlist events (Phase 5)
  WATCHLIST_UPDATED:   'watchlist:updated',
  WATCHLIST_ADD:       'watchlist:add',
  WATCHLIST_REMOVE:    'watchlist:remove',

  // Alert events (Phase 5)
  ALERT_TRIGGERED:     'alert:triggered',
  ALERT_SET:           'alert:set',
};
