/**
 * api.config.js
 * API endpoint definitions and key configuration.
 * Keys are read from environment variables (import.meta.env) in Vite.
 * Create a `.env` file in the project root with your keys.
 *
 * Example .env:
 *   VITE_ALPHA_VANTAGE_KEY=your_key_here
 *   VITE_NEWS_API_KEY=your_key_here
 */

export const API_CONFIG = {
  /**
   * Alpha Vantage — Stock quotes, historical data, technical indicators.
   * Free tier: 25 requests/day.  Premium tiers available.
   * Sign up: https://www.alphavantage.co/support/#api-key
   */
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    key: import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'demo',
    endpoints: {
      globalQuote: 'GLOBAL_QUOTE',
      overview: 'OVERVIEW',
      timeSeries: {
        daily: 'TIME_SERIES_DAILY',
        intraday: 'TIME_SERIES_INTRADAY',
      },
    },
  },

  /**
   * NewsAPI — World business and Indian stock market news.
   * Free tier: 100 requests/day.
   * Sign up: https://newsapi.org/register
   */
  newsApi: {
    baseUrl: 'https://newsapi.org/v2',
    key: import.meta.env.VITE_NEWS_API_KEY || '',
    endpoints: {
      topHeadlines: '/top-headlines',
      everything: '/everything',
    },
  },

  /**
   * NSE India — Indian stock market data (public endpoints).
   * No API key required for basic data.
   */
  nseIndia: {
    baseUrl: 'https://www.nseindia.com/api',
    endpoints: {
      quote: '/quote-equity',
      marketStatus: '/marketStatus',
    },
  },
};
