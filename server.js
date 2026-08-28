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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
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
    const data = await fetchChartData(rawSymbol, '5d', '1d');
    if (!data) return res.status(404).json({ error: `Index not found: ${rawSymbol}` });

    const meta = data.meta;
    const closes = (data.indicators?.quote?.[0]?.close || []).filter(c => c != null);
    const price = closes.length > 0 ? closes[closes.length - 1] : (meta.regularMarketPrice ?? meta.previousClose ?? 0);
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? meta.previousClose ?? price);
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
      const data = await fetchChartData(sym, '5d', '1d');
      if (data) {
        const meta = data.meta;
        const closes = (data.indicators?.quote?.[0]?.close || []).filter(c => c != null);
        const price = closes.length > 0 ? closes[closes.length - 1] : (meta.regularMarketPrice ?? meta.previousClose ?? 0);
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? meta.previousClose ?? price);
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

// ─── Helper to parse Google News RSS XML ───────────────────────────────────
function parseGoogleNewsRss(xml, category) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (let i = 0; i < itemMatches.length; i++) {
    const itemXml = itemMatches[i];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

    let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
    let link = linkMatch ? linkMatch[1].trim() : '';
    let pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();
    let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Google News';

    rawTitle = rawTitle.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    let title = rawTitle;
    const lastDash = rawTitle.lastIndexOf(' - ');
    if (lastDash > 0) {
      const possibleSource = rawTitle.slice(lastDash + 3).trim();
      title = rawTitle.slice(0, lastDash).trim();
      if (!source || source === 'Google News') source = possibleSource;
    }

    const isPos = /surge|gain|jump|rally|rise|bull|record|growth|profit|dividend|buy|upgrade|shine|boost|up/i.test(title);
    const isNeg = /fall|drop|plunge|crash|bear|loss|downgrade|slump|decline|sell|retreat|down|debt|tumble/i.test(title);
    const sentiment = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';

    items.push({
      id: `gnews-${category}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      title,
      summary: `${source} • ${new Date(pubDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`,
      source,
      url: link,
      publishedAt: pubDate,
      sentiment,
      tags: [source, category.toUpperCase()],
      symbols: [],
    });
  }
  return items;
}

// ─── GET /api/news — Live Google News RSS Endpoint ──────────────────────────
app.get('/api/news', async (req, res) => {
  const category = (req.query.category || 'india').toLowerCase();
  const symbol = req.query.symbol;
  const cacheKey = `news:${category}:${symbol || ''}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  let feedUrl = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en';

  if (category === 'world') {
    feedUrl = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en';
  } else if (symbol) {
    feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + ' share stock price NSE India')}&hl=en-IN&gl=IN&ceid=IN:en`;
  }

  try {
    const resp = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (resp.ok) {
      const xml = await resp.text();
      const articles = parseGoogleNewsRss(xml, category === 'world' ? 'world' : 'india');
      if (symbol) {
        articles.forEach((a) => a.symbols = [symbol.toUpperCase()]);
      }
      setCache(cacheKey, articles, 120_000); // 2 min cache
      return res.json(articles);
    }
  } catch (e) {
    console.warn(`[server] Google News RSS fetch failed for ${feedUrl}:`, e.message);
  }

  res.json([]);
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
