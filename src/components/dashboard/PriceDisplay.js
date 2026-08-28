/**
 * PriceDisplay.js
 * Renders the large price header with animated change indicator.
 */

import {
  formatCurrency,
  formatChange,
  formatChangeAmount,
  getDirection,
} from '../../utils/formatters.js';

export class PriceDisplay {
  render(stock) {
    const currency  = stock.currency || 'INR';
    const locale    = currency === 'INR' ? 'en-IN' : 'en-US';
    const direction = getDirection(stock.change);
    const arrow     = direction === 'positive' ? '▲' : direction === 'negative' ? '▼' : '●';

    return `
      <div class="stock-header animate-fadeInDown">
        <div class="stock-header__top">
          <div class="stock-header__meta">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="stock-symbol">${stock.symbol}</span>
              <span class="stock-exchange-badge">${stock.exchange}</span>
            </div>
            <div class="stock-company">${stock.companyName}</div>
            <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2); flex-wrap: wrap;">
              ${stock.sector
                ? `<span style="
                    font-size: var(--text-xs);
                    padding: 2px 8px;
                    background: rgba(139,92,246,0.12);
                    border: 1px solid rgba(139,92,246,0.2);
                    border-radius: var(--radius-full);
                    color: #a78bfa;
                    font-weight: var(--fw-medium);
                  ">${stock.sector}</span>`
                : ''}
              ${stock.industry
                ? `<span style="
                    font-size: var(--text-xs);
                    padding: 2px 8px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-full);
                    color: var(--color-text-muted);
                    font-weight: var(--fw-medium);
                  ">${stock.industry}</span>`
                : ''}
            </div>
          </div>

          <div class="stock-header__price">
            <div
              class="stock-price"
              id="live-price-display"
              aria-label="Current price ${formatCurrency(stock.price, currency, locale)}"
            >
              ${formatCurrency(stock.price, currency, locale)}
            </div>
            <div class="stock-change ${direction}" id="live-change-display">
              <span class="stock-change__arrow">${arrow}</span>
              <span>${formatChangeAmount(stock.change, currency, locale)}</span>
              <span>(${formatChange(stock.changePercent)})</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
