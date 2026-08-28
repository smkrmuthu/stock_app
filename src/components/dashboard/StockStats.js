/**
 * StockStats.js
 * Renders the key statistics grid for a stock.
 * Each stat is independently rendered and extensible.
 */

import {
  formatCurrency,
  formatCompact,
  formatNumber,
  formatMarketCap,
  formatChange,
  getDirection,
} from '../../utils/formatters.js';

export class StockStats {
  render(stock) {
    const currency = stock.currency || 'INR';
    const locale   = currency === 'INR' ? 'en-IN' : 'en-US';

    // Day range fill percentage
    const range = stock.high - stock.low;
    const pos   = range > 0 ? ((stock.price - stock.low) / range) * 100 : 50;

    const stats = [
      {
        id: 'stat-open',
        label: 'Open',
        value: formatCurrency(stock.open, currency, locale),
        icon: '↗',
      },
      {
        id: 'stat-prev-close',
        label: 'Prev. Close',
        value: formatCurrency(stock.previousClose, currency, locale),
        icon: '↙',
      },
      {
        id: 'stat-volume',
        label: 'Volume',
        value: formatCompact(stock.volume, locale),
        sub: `Avg: ${formatCompact(stock.avgVolume, locale)}`,
        icon: '📊',
      },
      {
        id: 'stat-market-cap',
        label: 'Market Cap',
        value: formatMarketCap(stock.marketCap, currency),
        icon: '🏛',
      },
      {
        id: 'stat-pe-ratio',
        label: 'P/E Ratio',
        value: stock.peRatio ? stock.peRatio.toFixed(1) : '—',
        sub: `EPS: ${stock.eps ? formatCurrency(stock.eps, currency, locale) : '—'}`,
        icon: '📐',
      },
      {
        id: 'stat-week-high',
        label: '52W High',
        value: formatCurrency(stock.week52High, currency, locale),
        valueClass: 'positive',
        icon: '⬆',
      },
      {
        id: 'stat-week-low',
        label: '52W Low',
        value: formatCurrency(stock.week52Low, currency, locale),
        valueClass: 'negative',
        icon: '⬇',
      },
      {
        id: 'stat-dividend',
        label: 'Div. Yield',
        value: stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A',
        icon: '💰',
      },
    ];

    return `
      <div class="section-header">
        <div class="section-title">
          <span class="section-title__icon">📋</span>
          Key Statistics
        </div>
        <div class="last-updated">
          <span style="font-size: 10px;">🔄</span>
          <span>${this._formatTime(stock.lastUpdated)}</span>
        </div>
      </div>

      <!-- Day Range Card -->
      <div class="card card--flat animate-fadeInUp" style="margin-bottom: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <span style="font-size: var(--text-sm); color: var(--color-text-muted); font-weight: var(--fw-medium); text-transform: uppercase; letter-spacing: 0.08em;">Day Range</span>
          <span style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--fw-semibold); color: var(--color-text-primary);">
            ${formatCurrency(stock.price, currency, locale)}
          </span>
        </div>
        <div class="range-bar-container">
          <div class="range-bar-labels">
            <span>L: ${formatCurrency(stock.low, currency, locale)}</span>
            <span>H: ${formatCurrency(stock.high, currency, locale)}</span>
          </div>
          <div class="range-bar">
            <div class="range-bar__fill" style="width: ${pos}%"></div>
            <div class="range-bar__marker" style="left: ${pos}%"></div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        ${stats.map((s, i) => `
          <div class="stat-card animate-fadeInUp stagger-${Math.min(i + 1, 8)}" id="${s.id}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value ${s.valueClass || ''}">${s.value}</div>
            ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  _formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
