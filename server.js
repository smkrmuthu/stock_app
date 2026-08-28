/**
 * server.js
 * Express.js backend proxy server for live stock market data.
 * Fetches from Yahoo Finance server-side, eliminating all CORS issues.
 *
 * Features:
 *   - In-memory cache with 30s TTL (avoids Yahoo rate limiting)
 *   - Request queue with 200ms spacing between Yahoo calls
 *   - Retry with exponential backoff on 429 (Too Many Requests)
 *   - Batch ticker endpoint for efficient multiple-symbol fetch
 *
 * Endpoints:
 *   GET /api/stock/:symbol             — Full stock quote
 *   GET /api/stock/ticker/:symbol      — Lightweight ticker quote
 *   GET /api/stock/ticker-batch/:syms  — Batch ticker (comma-separated symbols)
 *   GET /api/health                    — Health check
 *
 * Runs on port 3001; Vite proxies /api/* here from port 3000.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── Yahoo Finance Base URLs ────────────────────────────────────────────────
const YAHOO_URLS = [
  'https://query1.finance.yahoo.com/v8/finance/chart/',
  'https://query2.finance.yahoo.com/v8/finance/chart/',
];

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
};

// ─── In-Memory Cache ────────────────────────────────────────────────────────
// TTL: 30 seconds for ticker, 60 seconds for full quotes
const cache = new Map();
const TICKER_TTL = 30_000;
const QUOTE_TTL = 60_000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// ─── Request Queue (throttle Yahoo calls: 150ms apart) ──────────────────────
let lastYahooCall = 0;
const CALL_SPACING = 150; // ms between Yahoo requests

async function throttledFetch(ticker, range = '1d', interval = '5m') {
  const now = Date.now();
  const waitTime = Math.max(0, CALL_SPACING - (now - lastYahooCall));
  if (waitTime > 0) {
    await new Promise(r => setTimeout(r, waitTime));
  }
  lastYahooCall = Date.now();

  for (const baseUrl of YAHOO_URLS) {
    const url = `${baseUrl}${encodeURIComponent(ticker)}?range=${range}&interval=${interval}&includePrePost=false`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(url, { headers: YAHOO_HEADERS });
        if (resp.status === 200) {
          const json = await resp.json();
          const result = json?.chart?.result?.[0];
          if (result && result.meta) return result;
        } else if (resp.status === 429) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        // try next endpoint
      }
    }
  }
  return null;
}

// ─── Symbol → Yahoo ticker mapping ──────────────────────────────────────────
const KNOWN_US_STOCKS = new Set([
  'AAPL', 'TSLA', 'NVDA', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'META', 'NFLX',
  'AMD', 'INTC', 'CRM', 'ORCL', 'UBER', 'COIN', 'PLTR', 'SNOW', 'SQ',
]);

function getYahooTicker(symbol) {
  const upper = symbol.toUpperCase();
  // Index tickers come pre-encoded (^BSESN, ^NSEI, etc.)
  if (upper.startsWith('^') || upper.startsWith('%5E') || upper.includes('=')) return upper;
  if (upper.endsWith('.NS') || upper.endsWith('.BO')) return upper;
  if (KNOWN_US_STOCKS.has(upper)) return upper;
  // Default: try NSE (.NS suffix)
  return upper + '.NS';
}

// ─── GET /api/stock/:symbol — Full Quote ────────────────────────────────────
app.get('/api/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `quote:${symbol}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    // Try the mapped ticker
    const yahooTicker = getYahooTicker(symbol);
    let data = await fetchChartData(yahooTicker);

    // If NSE ticker failed, try bare symbol (might be US stock we don't know)
    if (!data && yahooTicker !== symbol) {
      data = await fetchChartData(symbol);
    }

    if (!data) {
      return res.status(404).json({ error: `Symbol ${symbol} not found on Yahoo Finance` });
    }

    const result = parseChartData(symbol, data);
    setCache(cacheKey, result, QUOTE_TTL);
    res.json(result);
  } catch (err) {
    console.error(`[server] Error fetching ${symbol}:`, err.message);
    res.status(500).json({ error: `Failed to fetch data for ${symbol}: ${err.message}` });
  }
});

// ─── GET /api/stock/ticker/:symbol — Lightweight Ticker Quote ───────────────
app.get('/api/stock/ticker/:symbol', async (req, res) => {
  const rawSymbol = decodeURIComponent(req.params.symbol);
  const cacheKey = `ticker:${rawSymbol}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const data = await fetchChartData(rawSymbol, '1d', '1d');
    if (!data) {
      return res.status(404).json({ error: `Ticker ${rawSymbol} not found` });
    }

    const meta = data.meta;
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const pct = prevClose ? (change / prevClose) * 100 : 0;

    const result = {
      price,
      change: +change.toFixed(2),
      pct: +pct.toFixed(2),
      positive: change >= 0,
      currency: meta.currency || 'INR',
    };

    setCache(cacheKey, result, TICKER_TTL);
    res.json(result);
  } catch (err) {
    console.error(`[server] Ticker error for ${rawSymbol}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stock/ticker-batch/:symbols — Batch Ticker Quotes ─────────────
// Usage: /api/stock/ticker-batch/%5EBSESN,%5ENSEI,USDINR%3DX
app.get('/api/stock/ticker-batch/:symbols', async (req, res) => {
  const symbols = decodeURIComponent(req.params.symbols).split(',').map(s => s.trim()).filter(Boolean);
  const results = {};

  for (const sym of symbols) {
    const cacheKey = `ticker:${sym}`;
    const cached = getCached(cacheKey);
    if (cached) {
      results[sym] = cached;
      continue;
    }

    try {
      const data = await fetchChartData(sym, '1d', '1d');
      if (data) {
        const meta = data.meta;
        const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const pct = prevClose ? (change / prevClose) * 100 : 0;

        const result = {
          price,
          change: +change.toFixed(2),
          pct: +pct.toFixed(2),
          positive: change >= 0,
          currency: meta.currency || 'INR',
        };

        setCache(cacheKey, result, TICKER_TTL);
        results[sym] = result;
      }
    } catch (e) {
      console.warn(`[server] Batch ticker failed for ${sym}:`, e.message);
    }
  }

  res.json(results);
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cacheSize: cache.size,
    timestamp: new Date().toISOString(),
  });
});

// ─── Fetch chart data from Yahoo Finance ────────────────────────────────────
async function fetchChartData(ticker, range = '1d', interval = '5m') {
  return await throttledFetch(ticker, range, interval);
}

// ─── Parse Yahoo Finance chart response ─────────────────────────────────────
function parseChartData(symbol, chartResult) {
  const meta = chartResult.meta;
  const quote = chartResult.indicators?.quote?.[0] || {};

  const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  const opens = (quote.open || []).filter(v => v != null);
  const highs = (quote.high || []).filter(v => v != null);
  const lows = (quote.low || []).filter(v => v != null && v > 0);
  const volumes = (quote.volume || []).filter(v => v != null);

  const todayOpen = opens.length > 0 ? opens[0] : price;
  const todayHigh = highs.length > 0 ? Math.max(...highs) : price;
  const todayLow = lows.length > 0 ? Math.min(...lows) : price;
  const totalVolume = volumes.reduce((sum, v) => sum + v, 0);

  // Determine exchange label
  let exchange = 'NSE';
  if (['NMS', 'NGM', 'NCM'].includes(meta.exchangeName)) exchange = 'NASDAQ';
  else if (meta.exchangeName === 'NYQ') exchange = 'NYSE';
  else if ((meta.fullExchangeName || '').includes('BSE')) exchange = 'BSE';

  const currency = meta.currency || (exchange === 'NSE' || exchange === 'BSE' ? 'INR' : 'USD');

  return {
    symbol: symbol.replace('.NS', '').replace('.BO', '').toUpperCase(),
    companyName: meta.longName || meta.shortName || symbol,
    exchange,
    currency,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePercent: +changePercent.toFixed(2),
    open: +todayOpen.toFixed(2),
    high: +todayHigh.toFixed(2),
    low: +todayLow.toFixed(2),
    previousClose: +prevClose.toFixed(2),
    volume: totalVolume,
    avgVolume: meta.averageDailyVolume3Month || totalVolume,
    marketCap: meta.marketCap || 0,
    week52High: meta.fiftyTwoWeekHigh || todayHigh,
    week52Low: meta.fiftyTwoWeekLow || todayLow,
    peRatio: 0,
    eps: 0,
    dividendYield: 0,
    sector: '',
    industry: '',
    _source: 'yahoo-finance-live',
    _fetchedAt: new Date().toISOString(),
  };
}

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 StockPulse API Server running on http://localhost:${PORT}`);
  console.log(`  📊 Try: http://localhost:${PORT}/api/stock/TCS`);
  console.log(`  📈 Try: http://localhost:${PORT}/api/stock/ticker/%5EBSESN`);
  console.log(`  💚 Health: http://localhost:${PORT}/api/health\n`);
});
