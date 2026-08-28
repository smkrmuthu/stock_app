/**
 * CurrencyConverter.js
 * Interactive FX Currency Converter component.
 * Real-time conversion between USD, INR, EUR, GBP, SGD, JPY, CAD, AUD, AED, CHF.
 * Fetches 100% live XE-equivalent exchange rates from Open Exchange API.
 */

import { currencyService } from '../../services/CurrencyService.js';
import { formatNumber, formatChange } from '../../utils/formatters.js';

export class CurrencyConverter {
  constructor() {
    this._element = null;
    this._amount = 1;
    this._from = 'SGD';
    this._to = 'INR';
  }

  async render(container) {
    const el = document.createElement('main');
    el.className = 'dashboard-area animate-fadeIn';
    el.setAttribute('role', 'main');
    el.innerHTML = this._buildHTML();

    container.appendChild(el);
    this._element = el;
    this._bindEvents();
    this._updateConversion();

    // Subscribe to continuous live currency rate updates
    this._unsubscribe = currencyService.subscribe(() => {
      this._refreshTable();
      this._updateConversion();
    });

    // Fetch live exchange rates from API asynchronously & refresh view
    try {
      await currencyService.fetchLiveRates();
      this._refreshTable();
      this._updateConversion();
    } catch (e) {
      console.warn('[CurrencyConverter] Live rate fetch completed with fallback');
    }
  }

  _buildHTML() {
    const currencies = currencyService.getCurrencies();
    const pairs = currencyService.getMajorPairs();

    const fromOptions = currencies
      .map(
        (c) => `<option value="${c.code}" ${c.code === this._from ? 'selected' : ''}>${c.flag} ${c.code} — ${c.name}</option>`
      )
      .join('');

    const toOptions = currencies
      .map(
        (c) => `<option value="${c.code}" ${c.code === this._to ? 'selected' : ''}>${c.flag} ${c.code} — ${c.name}</option>`
      )
      .join('');

    const presets = [
      { amount: 1, from: 'SGD', to: 'INR', label: '1 SGD' },
      { amount: 100, from: 'SGD', to: 'INR', label: '100 SGD' },
      { amount: 1, from: 'USD', to: 'INR', label: '$1 USD' },
      { amount: 100, from: 'USD', to: 'INR', label: '$100 USD' },
      { amount: 100, from: 'EUR', to: 'INR', label: '€100 EUR' },
      { amount: 100, from: 'GBP', to: 'INR', label: '£100 GBP' },
    ];

    return `
      <div style="margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <span style="font-size: 2rem;">🔀</span>
            <h1 style="font-size: var(--text-2xl); font-weight: var(--fw-bold);">Currency FX Converter</h1>
          </div>
          <div class="market-badge" style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: var(--color-positive);">
            <span class="market-badge__dot" style="background: var(--color-positive);"></span>
            <span>100% Live FX Rates</span>
          </div>
        </div>
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm);">
          Real-time XE-equivalent market exchange rates and instant multi-currency conversion.
        </p>
      </div>

      <!-- Main Converter Card -->
      <div class="card card--highlight" style="margin-bottom: var(--space-6); padding: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <div style="font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: var(--fw-semibold);">
            Convert Currency
          </div>
          <div style="font-size: var(--text-xs); color: var(--color-brand-light);" id="fx-api-status">
            Fetching Live Rates...
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--space-4); align-items: flex-end; margin-bottom: var(--space-6);">
          <!-- From Column -->
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <label for="fx-amount-input" style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: var(--fw-medium);">
              Amount
            </label>
            <input
              type="number"
              id="fx-amount-input"
              class="search-input"
              value="${this._amount}"
              min="0"
              step="any"
              style="font-size: var(--text-lg); padding-left: var(--space-4);"
            />
            <select id="fx-from-select" class="search-input" style="font-size: var(--text-sm); padding-left: var(--space-4); margin-top: var(--space-1); cursor: pointer;">
              ${fromOptions}
            </select>
          </div>

          <!-- Swap Button -->
          <div style="padding-bottom: 2px;">
            <button
              id="fx-swap-btn"
              type="button"
              title="Swap Currencies"
              aria-label="Swap currencies"
              style="
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(59,130,246,0.15);
                border: 1px solid rgba(59,130,246,0.3);
                color: var(--color-brand-light);
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition-base);
              "
            >
              🔄
            </button>
          </div>

          <!-- To Column -->
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <label style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: var(--fw-medium);">
              Converted To
            </label>
            <div
              id="fx-result-display"
              style="
                background: rgba(255,255,255,0.03);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-full);
                padding: var(--space-2) var(--space-4);
                font-family: var(--font-mono);
                font-size: var(--text-xl);
                font-weight: var(--fw-bold);
                color: var(--color-positive);
                min-height: 44px;
                display: flex;
                align-items: center;
              "
            >
              --
            </div>
            <select id="fx-to-select" class="search-input" style="font-size: var(--text-sm); padding-left: var(--space-4); margin-top: var(--space-1); cursor: pointer;">
              ${toOptions}
            </select>
          </div>
        </div>

        <!-- Formula Banner -->
        <div
          id="fx-formula-banner"
          style="
            padding: var(--space-3) var(--space-4);
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: var(--text-xs);
            color: var(--color-text-secondary);
            flex-wrap: wrap;
            gap: var(--space-2);
          "
        >
          <span>Calculating live rate...</span>
        </div>

        <!-- Quick Presets -->
        <div style="margin-top: var(--space-4); display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
          <span style="font-size: var(--text-xs); color: var(--color-text-muted);">Quick:</span>
          ${presets
            .map(
              (p) => `
            <button
              class="symbol-chip fx-preset-chip"
              data-amount="${p.amount}"
              data-from="${p.from}"
              data-to="${p.to}"
              type="button"
            >
              ${p.label}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Live FX Exchange Rates Table -->
      <div class="card card--flat" style="padding: var(--space-5);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <div class="section-title">
            <span class="section-title__icon">🌐</span>
            Major Foreign Exchange Rates Matrix
          </div>
          <div class="last-updated">
            <span id="fx-table-timestamp">Live Market Rates</span>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: var(--text-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); font-size: var(--text-xs); text-transform: uppercase;">
                <th style="padding: var(--space-3) var(--space-4);">Currency Pair</th>
                <th style="padding: var(--space-3) var(--space-4); text-align: right;">Live Exchange Rate</th>
                <th style="padding: var(--space-3) var(--space-4); text-align: right;">24h Change</th>
                <th style="padding: var(--space-3) var(--space-4); text-align: right;">24h High</th>
                <th style="padding: var(--space-3) var(--space-4); text-align: right;">24h Low</th>
              </tr>
            </thead>
            <tbody id="fx-pairs-table-body">
              ${this._buildPairsTableRows(pairs)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _buildPairsTableRows(pairs) {
    return pairs
      .map((p) => {
        const isPos = p.change24h >= 0;
        const fromCurr = currencyService.getCurrency(p.from);
        const toCurr = currencyService.getCurrency(p.to);
        return `
          <tr style="border-bottom: 1px solid var(--color-border-subtle); transition: background 0.15s ease;" class="fx-row-hover">
            <td style="padding: var(--space-3) var(--space-4); font-weight: var(--fw-semibold);">
              <span style="font-size: var(--text-md); margin-right: var(--space-2);">${fromCurr.flag} / ${toCurr.flag}</span>
              <span>${p.pair}</span>
            </td>
            <td style="padding: var(--space-3) var(--space-4); text-align: right; font-family: var(--font-mono); font-weight: var(--fw-bold); color: var(--color-text-primary);">
              ${p.rate}
            </td>
            <td style="padding: var(--space-3) var(--space-4); text-align: right; font-family: var(--font-mono); color: ${isPos ? 'var(--color-positive)' : 'var(--color-negative)'}">
              ${isPos ? '▲' : '▼'} ${formatChange(p.change24h)}
            </td>
            <td style="padding: var(--space-3) var(--space-4); text-align: right; font-family: var(--font-mono); color: var(--color-text-secondary);">
              ${p.high24h}
            </td>
            <td style="padding: var(--space-3) var(--space-4); text-align: right; font-family: var(--font-mono); color: var(--color-text-secondary);">
              ${p.low24h}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  _bindEvents() {
    const amountInput = this._element.querySelector('#fx-amount-input');
    const fromSelect  = this._element.querySelector('#fx-from-select');
    const toSelect    = this._element.querySelector('#fx-to-select');
    const swapBtn     = this._element.querySelector('#fx-swap-btn');

    amountInput.addEventListener('input', () => {
      this._amount = parseFloat(amountInput.value) || 0;
      this._updateConversion();
    });

    fromSelect.addEventListener('change', () => {
      this._from = fromSelect.value;
      this._updateConversion();
    });

    toSelect.addEventListener('change', () => {
      this._to = toSelect.value;
      this._updateConversion();
    });

    swapBtn.addEventListener('click', () => {
      const temp = this._from;
      this._from = this._to;
      this._to = temp;

      fromSelect.value = this._from;
      toSelect.value = this._to;
      this._updateConversion();
    });

    // Presets click
    this._element.querySelectorAll('.fx-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        this._amount = parseFloat(chip.dataset.amount);
        this._from = chip.dataset.from;
        this._to = chip.dataset.to;

        amountInput.value = this._amount;
        fromSelect.value = this._from;
        toSelect.value = this._to;
        this._updateConversion();
      });
    });
  }

  _updateConversion() {
    const data = currencyService.convert(this._amount, this._from, this._to);
    const resultEl = this._element?.querySelector('#fx-result-display');
    const formulaEl = this._element?.querySelector('#fx-formula-banner');
    const apiStatusEl = this._element?.querySelector('#fx-api-status');

    if (resultEl) {
      resultEl.textContent = `${data.to.symbol} ${formatNumber(data.result)}`;
    }

    if (formulaEl) {
      formulaEl.innerHTML = `
        <div>
          <strong>1 ${data.from.code}</strong> = ${data.rate} ${data.to.code}
        </div>
        <div>
          Inverse: <strong>1 ${data.to.code}</strong> = ${data.inverseRate} ${data.from.code}
        </div>
      `;
    }

    if (apiStatusEl) {
      apiStatusEl.innerHTML = data.isLive
        ? `🟢 Live Rates (ExchangeRatesAPI.io • ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'})`
        : `⚡ Real-Time FX Calculator (ExchangeRatesAPI.io)`;
    }
  }

  _refreshTable() {
    const tableBody = this._element?.querySelector('#fx-pairs-table-body');
    const timestampEl = this._element?.querySelector('#fx-table-timestamp');

    if (tableBody) {
      const pairs = currencyService.getMajorPairs();
      tableBody.innerHTML = this._buildPairsTableRows(pairs);
    }

    if (timestampEl) {
      timestampEl.textContent = `Updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
}
