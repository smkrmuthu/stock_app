/**
 * scripts/sync-market-data.js
 * Automatically fetches official exchange closing quotes for all popular Indian (NSE) and US equities
 * and market indices, writing an accurate market snapshot for static deployment (GitHub Pages).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYMBOLS = [
  // NSE (India)
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy', industry: 'Oil & Gas / Retail / Telecom' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', sector: 'Technology', industry: 'IT Services & Consulting' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Financials', industry: 'Banking & Financial Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Financials', industry: 'Private Sector Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials', industry: 'Public Sector Banking' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Industrials', industry: 'Infrastructure & Engineering' },
  { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'Consumer Goods', industry: 'FMCG & Conglomerate' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecommunications', industry: 'Telecom Services' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', sector: 'Materials', industry: 'Steel & Metallurgy' },
  { symbol: 'HATSUN', name: 'Hatsun Agro Product Ltd', exchange: 'NSE', sector: 'Consumer Goods', industry: 'Dairy & FMCG Products' },
  { symbol: 'HERITAGE', name: 'Heritage Foods Ltd', exchange: 'NSE', sector: 'Consumer Goods', industry: 'Dairy & Retail Food' },
  { symbol: 'DODLA', name: 'Dodla Dairy Ltd', exchange: 'NSE', sector: 'Consumer Goods', industry: 'Dairy Processing' },
  { symbol: 'ZOMATO', name: 'Zomato Limited', exchange: 'NSE', sector: 'Consumer Services', industry: 'Quick Commerce & Food Delivery' },
  { symbol: '20MICRONS', name: '20 Microns Limited', exchange: 'NSE', sector: 'Materials', industry: 'Industrial Minerals' },
  // US Equities
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', industry: 'Consumer Electronics & Software' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'EV & Clean Energy' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', industry: 'AI Hardware & Semiconductors' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', industry: 'Cloud & Enterprise Software' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Communication', industry: 'Internet & Search Engine' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'E-Commerce & AWS Cloud' },
];

const INDICES = [
  { symbol: 'SENSEX', yahooTicker: '^BSESN', prefix: '' },
  { symbol: 'NIFTY 50', yahooTicker: '^NSEI', prefix: '' },
  { symbol: 'NIFTY BANK', yahooTicker: '^NSEBANK', prefix: '' },
  { symbol: 'S&P 500', yahooTicker: '^GSPC', prefix: '' },
  { symbol: 'NASDAQ', yahooTicker: '^IXIC', prefix: '' },
  { symbol: 'DOW JONES', yahooTicker: '^DJI', prefix: '' },
  { symbol: 'GOLD', yahooTicker: 'GC=F', prefix: '$' },
  { symbol: 'CRUDE OIL', yahooTicker: 'CL=F', prefix: '$' },
  { symbol: 'USD/INR', yahooTicker: 'USDINR=X', prefix: '₹' },
];

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
};

async function fetchQuote(item) {
  const isUS = item.exchange === 'NASDAQ' || item.exchange === 'NYSE';
  const ticker = isUS ? item.symbol : `${item.symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=5m&includePrePost=false`;

  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result || !result.meta) throw new Error('No meta');

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0] || {};
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = +(price - prevClose).toFixed(2);
    const changePercent = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

    const opens = (quote.open || []).filter(v => v != null);
    const highs = (quote.high || []).filter(v => v != null);
    const lows = (quote.low || []).filter(v => v != null && v > 0);
    const volumes = (quote.volume || []).filter(v => v != null);

    const open = opens.length > 0 ? +opens[0].toFixed(2) : price;
    const high = highs.length > 0 ? +Math.max(...highs).toFixed(2) : (meta.regularMarketDayHigh || price);
    const low = lows.length > 0 ? +Math.min(...lows).toFixed(2) : (meta.regularMarketDayLow || price);
    const totalVolume = volumes.reduce((sum, v) => sum + v, 0) || meta.regularMarketVolume || 0;

    return {
      symbol: item.symbol,
      companyName: item.name,
      exchange: item.exchange,
      sector: item.sector,
      industry: item.industry,
      price: +price.toFixed(2),
      change,
      changePercent,
      open,
      high,
      low,
      previousClose: +prevClose.toFixed(2),
      volume: totalVolume,
      avgVolume: meta.averageDailyVolume3Month || totalVolume,
      marketCap: meta.marketCap || 0,
      peRatio: 0,
      eps: 0,
      week52High: meta.fiftyTwoWeekHigh || high,
      week52Low: meta.fiftyTwoWeekLow || low,
      dividendYield: 0,
      currency: meta.currency || (isUS ? 'USD' : 'INR'),
      _source: 'official-exchange-live',
      _fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[sync] Failed to fetch ${item.symbol}:`, err.message);
    return null;
  }
}

async function fetchIndexQuote(item) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.yahooTicker)}?range=1d&interval=5m&includePrePost=false`;

  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta');

    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = +(price - prevClose).toFixed(2);
    const pct = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

    const fmt = (n) => n >= 1000
      ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toFixed(2);

    return {
      symbol: item.symbol,
      yahooTicker: encodeURIComponent(item.yahooTicker),
      price: fmt(price),
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
      changePct: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      positive: change >= 0,
      prefix: item.prefix,
    };
  } catch (err) {
    console.warn(`[sync] Failed index ${item.symbol}:`, err.message);
    return null;
  }
}

async function syncAll() {
  console.log('🔄 Fetching official exchange market quotes...');
  const snapshot = {};

  for (const item of SYMBOLS) {
    const q = await fetchQuote(item);
    if (q) {
      snapshot[item.symbol] = q;
      console.log(`  ✓ ${item.symbol.padEnd(10)} ₹${String(q.price).padStart(8)}  ${q.change >= 0 ? '+' : ''}${q.change} (${q.changePercent}%)`);
    }
  }

  const outPath = path.resolve(__dirname, '../src/data/market_snapshot.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`✅ Snapshot saved to ${outPath} (${Object.keys(snapshot).length} symbols)`);

  console.log('\n🔄 Fetching market indices quotes...');
  const indicesList = [];
  for (const idx of INDICES) {
    const iq = await fetchIndexQuote(idx);
    if (iq) {
      indicesList.push(iq);
      console.log(`  ✓ ${idx.symbol.padEnd(12)} ${iq.price.padStart(10)}  ${iq.changePct}`);
    }
  }

  const indicesPath = path.resolve(__dirname, '../src/data/indices_snapshot.json');
  fs.writeFileSync(indicesPath, JSON.stringify(indicesList, null, 2), 'utf-8');
  console.log(`✅ Indices snapshot saved to ${indicesPath} (${indicesList.length} indices)`);

  console.log('\n🔄 Fetching live market news headlines...');
  const newsQueries = [
    { q: 'India Stock Market', cat: 'india' },
    { q: 'NIFTY 50 Sensex', cat: 'india' },
    { q: 'Global Markets Business', cat: 'world' },
    { q: 'Wall Street Economy', cat: 'world' },
  ];

  const newsList = [];
  const seenTitles = new Set();

  for (const { q, cat } of newsQueries) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=10`;
      const resp = await fetch(url, { headers: YAHOO_HEADERS });
      if (resp.ok) {
        const json = await resp.json();
        for (const n of (json?.news || [])) {
          if (n.title && !seenTitles.has(n.title.toLowerCase())) {
            seenTitles.add(n.title.toLowerCase());
            const title = n.title;
            const isPos = /surge|gain|jump|rally|rise|bull|record|growth|profit|dividend|buy|upgrade/i.test(title);
            const isNeg = /fall|drop|plunge|crash|bear|loss|downgrade|slump|decline|sell|retreat/i.test(title);
            const sentiment = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';

            newsList.push({
              id: n.uuid || `news-${cat}-${newsList.length + 1}`,
              category: cat,
              title: n.title,
              summary: `${n.publisher || 'Financial Wire'} • ${n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Live'}`,
              source: n.publisher || 'Market Wire',
              url: n.link || 'https://finance.yahoo.com',
              publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
              sentiment,
              tags: [q, cat.toUpperCase()],
              symbols: [],
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[sync] Failed news for ${q}:`, e.message);
    }
  }

  newsList.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const newsPath = path.resolve(__dirname, '../src/data/news_snapshot.json');
  fs.writeFileSync(newsPath, JSON.stringify(newsList, null, 2), 'utf-8');
  console.log(`✅ News snapshot saved to ${newsPath} (${newsList.length} articles)`);
}

syncAll();
