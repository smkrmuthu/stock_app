/**
 * Dashboard.js
 * Main Stock Market Intelligence Dashboard Orchestrator.
 * 
 * Features:
 *   - Auto-loads featured live stock on startup
 *   - Live multi-index ticker bar with 15s auto-refresh
 *   - Real-time tick subscription with green/red price flash animations
 *   - Unlisted private company detection with listed alternatives
 *   - Candlestick & statistical visualization
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { store } from '../../core/Store.js';
import { stockService } from '../../services/StockService.js';
import { PriceDisplay } from './PriceDisplay.js';
import { StockStats } from './StockStats.js';
import { CandlestickChart } from './CandlestickChart.js';
import { formatCurrency, formatChange, formatChangeAmount, getDirection } from '../../utils/formatters.js';
import { getNSEMarketStatus, getMarketStatusForExchange } from '../../utils/marketHours.js';
import indicesSnapshot from '../../data/indices_snapshot.json';

const QUICK_PICKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT', 'ITC', 'AAPL', 'TSLA', 'NVDA'];

const TICKER_FALLBACK = indicesSnapshot && indicesSnapshot.length > 0 ? indicesSnapshot : [
  { symbol: 'SENSEX',    yahooTicker: '%5EBSESN',   price: '77,264.51', change: '-208.39', changePct: '-0.27%', positive: false, prefix: '' },
  { symbol: 'NIFTY 50',  yahooTicker: '%5ENSEI',    price: '24,175.65', change: '-32.15',  changePct: '-0.13%', positive: false, prefix: '' },
  { symbol: 'NIFTY BANK',yahooTicker: '%5ENSEBANK',  price: '57,496.30', change: '-287.50', changePct: '-0.50%', positive: false, prefix: '' },
  { symbol: 'S&P 500',   yahooTicker: '%5EGSPC',    price: '7,730.99',  change: '+55.29',  changePct: '+0.72%', positive: true,  prefix: '' },
  { symbol: 'NASDAQ',    yahooTicker: '%5EIXIC',    price: '26,541.35', change: '+411.15', changePct: '+1.57%', positive: true,  prefix: '' },
  { symbol: 'DOW JONES', yahooTicker: '%5EDJI',     price: '53,569.44', change: '+105.54', changePct: '+0.20%', positive: true,  prefix: '' },
  { symbol: 'GOLD',      yahooTicker: 'GC%3DF',     price: '4,647.70',  change: '-16.80',  changePct: '-0.35%', positive: false, prefix: '$' },
  { symbol: 'CRUDE OIL', yahooTicker: 'CL%3DF',     price: '83.11',     change: '-0.41',   changePct: '-0.50%', positive: false, prefix: '$' },
  { symbol: 'USD/INR',   yahooTicker: 'USDINR%3DX', price: '95.37',     change: '-0.16',   changePct: '-0.17%', positive: false, prefix: '₹' },
];

async function fetchBatchTickerQuotes(symbols) {
  try {
    const encodedSymbols = encodeURIComponent(symbols.join(','));
    const res = await fetch(`/api/stock/ticker-batch/${encodedSymbols}`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Backend unavailable (static hosting)
  }
  return null;
}

export class Dashboard {
  constructor() {
    this._element = null;
    this._priceDisplay = new PriceDisplay();
    this._stockStats = new StockStats();
    this._candlestickChart = null;
    this._unsubscribeSearch = null;
    this._unsubscribeTicks = null;
    this._tickerRefreshTimer = null;
    this._currentStockSymbol = 'RELIANCE';
  }

  render(container) {
    const el = document.createElement('main');
    el.className = 'dashboard-area';
    el.setAttribute('role', 'main');
    el.innerHTML = this._buildShell();

    container.appendChild(el);
    this._element = el;
    this._bindQuickPicks();
    this._setupEventListeners();

    // Auto-load default active stock
    this._fetchAndRender(this._currentStockSymbol);

    // Initial ticker fetch
    this._refreshTicker();

    // Only start polling interval if market is currently OPEN
    const marketStatus = getNSEMarketStatus();
    if (marketStatus.isOpen) {
      this._tickerRefreshTimer = setInterval(() => this._refreshTicker(), 30000);
    }

    // Live tick subscription for active quote (only active during open hours)
    this._unsubscribeTicks = stockService.subscribe((cache) => {
      this._handleLiveTick(cache);
    });
  }

  _buildTickerHTML(data) {
    return data
      .map((t) => `
        <div class="ticker-item">
          <span class="ticker-item__symbol">${t.symbol}</span>
          <span class="ticker-item__price">${t.prefix || ''}${t.price}</span>
          <span class="ticker-item__change ${t.positive ? 'positive' : 'negative'}">${t.positive ? '▲' : '▼'} ${t.changePct}</span>
        </div>
      `).join('');
  }

  async _refreshTicker() {
    const symbols = TICKER_FALLBACK.map(t => t.yahooTicker);
    const results = await fetchBatchTickerQuotes(symbols);

    const updatedData = TICKER_FALLBACK.map((t) => {
      const live = results ? results[t.yahooTicker] : null;
      if (!live) {
        return t;
      }
      const fmt = (n) => n >= 1000
        ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : n.toFixed(2);
      return {
        ...t,
        price: fmt(live.price),
        changePct: `${live.positive ? '+' : ''}${live.pct.toFixed(2)}%`,
        positive: live.positive,
      };
    });

    const track = this._element?.querySelector('#ticker-track');
    if (track) track.innerHTML = this._buildTickerHTML(updatedData);
  }

  _buildShell() {
    const tickerItems = this._buildTickerHTML(TICKER_FALLBACK);
    const marketStatus = getNSEMarketStatus();

    const quickChips = QUICK_PICKS.map((sym) => `
      <button
        class="symbol-chip ${sym === this._currentStockSymbol ? 'symbol-chip--active' : ''}"
        id="chip-${sym.toLowerCase()}"
        data-symbol="${sym}"
        aria-label="View ${sym}"
        type="button"
      >
        ${sym}
      </button>
    `).join('');

    return `
      <!-- Ticker Bar -->
      <div class="ticker-bar" role="marquee" aria-label="Market indices ticker">
        <div class="ticker-track" id="ticker-track">${tickerItems}</div>
      </div>

      <!-- Quick Chips Bar -->
      <div style="padding: var(--space-4) 0 0 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;" id="quick-picks-container">
            <span style="font-size: var(--text-xs); color: var(--color-text-muted); font-weight: var(--fw-semibold); text-transform: uppercase;">
              ⚡ Popular Equities:
            </span>
            ${quickChips}
          </div>
          <div class="market-badge" style="
            background: ${marketStatus.isOpen ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)'};
            border: 1px solid ${marketStatus.isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'};
            color: ${marketStatus.isOpen ? 'var(--color-positive)' : 'var(--color-negative)'};
          ">
            <span class="market-badge__dot" style="
              background: ${marketStatus.isOpen ? 'var(--color-positive)' : 'var(--color-negative)'};
              ${marketStatus.isOpen ? '' : 'animation: none;'}
            "></span>
            <span id="live-feed-status">${marketStatus.isOpen ? '🟢 Live Market Stream' : '🔴 ' + marketStatus.description}</span>
          </div>
        </div>
      </div>

      <!-- Stock Content Area -->
      <div style="padding: 0 0 var(--space-6) 0;">
        <div id="stock-content-area">
          <div class="loader animate-fadeIn">
            <div class="loader__spinner"></div>
            <div class="loader__text">Connecting to Live Exchange Feed...</div>
          </div>
        </div>
      </div>
    `;
  }

  _bindQuickPicks() {
    this._element?.querySelectorAll('.symbol-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const symbol = chip.dataset.symbol;
        if (!symbol) return;
        this._updateActiveChip(symbol);
        eventBus.emit(EVENTS.STOCK_SEARCH, { symbol });
        const input = document.getElementById('stock-search-input');
        if (input) input.value = symbol;
      });
    });
  }

  _updateActiveChip(symbol) {
    this._element?.querySelectorAll('.symbol-chip').forEach((c) => {
      if (c.dataset.symbol === symbol) {
        c.classList.add('symbol-chip--active');
        c.style.background = 'var(--color-brand)';
        c.style.color = '#ffffff';
      } else {
        c.classList.remove('symbol-chip--active');
        c.style.background = '';
        c.style.color = '';
      }
    });
  }

  _setupEventListeners() {
    this._unsubscribeSearch = eventBus.on(EVENTS.STOCK_SEARCH, ({ symbol }) => {
      this._currentStockSymbol = symbol.toUpperCase().trim();
      this._updateActiveChip(this._currentStockSymbol);
      this._fetchAndRender(this._currentStockSymbol);
    });
  }

  _handleLiveTick(cache) {
    const activeStock = cache[this._currentStockSymbol];
    if (!activeStock) return;

    // Do not alter or flash numbers if exchange is closed
    const marketStatus = getMarketStatusForExchange(activeStock.exchange || 'NSE');
    if (!marketStatus.isOpen) return;

    const priceEl = this._element?.querySelector('#live-price-display');
    const changeEl = this._element?.querySelector('#live-change-display');

    if (priceEl && changeEl) {
      const currency = activeStock.currency || 'INR';
      const locale = currency === 'INR' ? 'en-IN' : 'en-US';
      const direction = getDirection(activeStock.change);
      const arrow = direction === 'positive' ? '▲' : direction === 'negative' ? '▼' : '●';

      const oldPrice = parseFloat(priceEl.textContent.replace(/[^0-9.-]+/g, '')) || 0;
      const isUp = activeStock.price >= oldPrice;

      priceEl.textContent = formatCurrency(activeStock.price, currency, locale);
      
      // Flash green or red for live tick animation
      priceEl.style.transition = 'color 0.15s ease';
      priceEl.style.color = isUp ? 'var(--color-positive)' : 'var(--color-negative)';
      setTimeout(() => {
        if (priceEl) priceEl.style.color = 'var(--color-text-primary)';
      }, 400);

      changeEl.className = `stock-change ${direction}`;
      changeEl.innerHTML = `
        <span class="stock-change__arrow">${arrow}</span>
        <span>${formatChangeAmount(activeStock.change, currency, locale)}</span>
        <span>(${formatChange(activeStock.changePercent)})</span>
      `;
    }
  }

  async _fetchAndRender(symbol) {
    const contentArea = this._element?.querySelector('#stock-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="loader animate-fadeIn">
        <div class="loader__spinner"></div>
        <div class="loader__text">Loading live data for ${symbol}...</div>
      </div>
    `;

    store.setState({ isLoading: true, error: null });

    try {
      const stock = await stockService.getQuote(symbol);
      store.setState({ currentSymbol: symbol, currentStock: stock, isLoading: false });

      if (this._candlestickChart) this._candlestickChart.destroy();
      this._candlestickChart = new CandlestickChart();

      contentArea.innerHTML = `
        <div class="animate-fadeIn">
          ${this._priceDisplay.render(stock)}
          ${this._candlestickChart.render(stock)}
          ${this._stockStats.render(stock)}
        </div>
      `;

      this._candlestickChart.mount();

    } catch (err) {
      console.warn('[Dashboard] Unlisted or invalid entity:', err);
      store.setState({ isLoading: false, error: err.message });

      const brand = err.brandInfo || {
        name: `${symbol.toUpperCase()} (Unlisted Company)`,
        reason: err.message,
        suggestedSector: 'Listed Market Equities',
        suggestions: QUICK_PICKS,
      };

      const suggestedChips = (brand.suggestions || QUICK_PICKS)
        .map((s) => `<button class="symbol-chip" data-symbol="${s}" type="button">${s}</button>`)
        .join('');

      contentArea.innerHTML = `
        <div class="card card--highlight animate-fadeIn" style="padding: var(--space-8); text-align: center; max-width: 680px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: var(--space-3);">🏢</div>
          <div class="stock-exchange-badge" style="background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: var(--color-negative); margin-bottom: var(--space-3);">
            UNLISTED PRIVATE ENTITY
          </div>
          <h2 style="font-size: var(--text-2xl); font-weight: var(--fw-bold); margin-bottom: var(--space-3); color: var(--color-text-primary);">
            ${brand.name || symbol.toUpperCase()}
          </h2>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--space-6);">
            ${err.message}
          </p>

          <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-5);">
            <div style="font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: var(--fw-semibold); margin-bottom: var(--space-3);">
              Explore ${brand.suggestedSector || 'Listed Equities'}:
            </div>
            <div class="welcome-state__chips" role="group">
              ${suggestedChips}
            </div>
          </div>
        </div>
      `;

      contentArea.querySelectorAll('.symbol-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const sym = chip.dataset.symbol;
          eventBus.emit(EVENTS.STOCK_SEARCH, { symbol: sym });
          const input = document.getElementById('stock-search-input');
          if (input) input.value = sym;
        });
      });
    }
  }

  destroy() {
    if (this._unsubscribeSearch) this._unsubscribeSearch();
    if (this._unsubscribeTicks) this._unsubscribeTicks();
    if (this._tickerRefreshTimer) clearInterval(this._tickerRefreshTimer);
    if (this._candlestickChart) this._candlestickChart.destroy();
  }
}
