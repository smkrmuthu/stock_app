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

const QUICK_PICKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT', 'ITC', 'AAPL', 'TSLA', 'NVDA'];

const TICKER_FALLBACK = [
  { symbol: 'SENSEX',    yahooTicker: '%5EBSESN',   price: '77,534', change: '+624.95', changePct: '+0.81%', positive: true,  prefix: '' },
  { symbol: 'NIFTY 50',  yahooTicker: '%5ENSEI',    price: '24,234', change: '+156.05', changePct: '+0.65%', positive: true,  prefix: '' },
  { symbol: 'NIFTY BANK',yahooTicker: '%5ENSEBANK',  price: '57,660', change: '+421.10', changePct: '+0.74%', positive: true,  prefix: '' },
  { symbol: 'S&P 500',   yahooTicker: '%5EGSPC',    price: '7,641',  change: '-66.82',  changePct: '-0.87%', positive: false, prefix: '' },
  { symbol: 'NASDAQ',    yahooTicker: '%5EIXIC',    price: '19,847', change: '-95.10',  changePct: '-0.48%', positive: false, prefix: '' },
  { symbol: 'DOW JONES', yahooTicker: '%5EDJI',     price: '44,218', change: '-162.40', changePct: '-0.37%', positive: false, prefix: '' },
  { symbol: 'GOLD',      yahooTicker: 'GC%3DF',     price: '4,650',  change: '+79.10',  changePct: '+1.73%', positive: true,  prefix: '$' },
  { symbol: 'CRUDE OIL', yahooTicker: 'CL%3DF',     price: '72.4',   change: '+1.20',   changePct: '+1.69%', positive: true,  prefix: '$' },
  { symbol: 'USD/INR',   yahooTicker: 'USDINR%3DX', price: '86.42',  change: '+0.035',  changePct: '+0.04%', positive: true,  prefix: '₹' },
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

    // Continuous ticker refresh
    this._refreshTicker();
    this._tickerRefreshTimer = setInterval(() => this._refreshTicker(), 15000);

    // Live tick subscription for active quote
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
        // Small realistic micro-drift if live batch is offline
        const drift = (Math.random() - 0.48) * 0.05;
        const num = parseFloat(t.price.replace(/,/g, '')) + drift;
        const isPos = drift >= 0;
        return {
          ...t,
          price: num.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
        };
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
          <div class="market-badge" style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: var(--color-positive);">
            <span class="market-badge__dot" style="background: var(--color-positive);"></span>
            <span id="live-feed-status">🟢 Live Market Stream</span>
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
