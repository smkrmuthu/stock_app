/**
 * app.config.js
 * Global application configuration and feature flags.
 * To enable a feature, set its flag to `true`.
 * This file is the single source of truth for all feature toggles.
 */

export const APP_CONFIG = {
  name: 'StockPulse',
  version: '1.0.0',
  theme: 'dark', // 'dark' | 'light'

  /**
   * Feature Flags — toggle to enable/disable features without code removal.
   * Future features can be added here and built behind flags.
   */
  features: {
    realTimeQuotes: false,         // Phase 2: WebSocket live prices
    candlestickChart: false,       // Phase 3: Chart.js / TradingView widget
    portfolioTracker: false,       // Phase 4: Portfolio P&L
    watchlistAlerts: false,        // Phase 5: Price alerts
    orderSimulation: false,        // Phase 6: Paper trading
    technicalIndicators: false,    // Phase 7: RSI, MACD, Bollinger Bands
    userAuth: false,               // Phase 8: Login / profile
  },

  /**
   * Data source toggle.
   * When false: uses mock data (StockService, NewsService return mock objects).
   * When true: calls real API endpoints defined in api.config.js.
   */
  useRealAPI: false,

  /**
   * News panel refresh interval in milliseconds.
   */
  newsRefreshInterval: 60000, // 60 seconds

  /**
   * Quote refresh interval in milliseconds (used in Phase 2).
   */
  quoteRefreshInterval: 5000, // 5 seconds
};
