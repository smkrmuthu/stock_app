/**
 * StockSearch.js
 * Symbol search/input widget with live autocomplete suggestions dropdown.
 * Supports keyboard navigation (Up/Down/Enter/Escape) and click selection.
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { validateSymbol } from '../../utils/validators.js';
import { stockService } from '../../services/StockService.js';
import { formatCurrency, formatChange } from '../../utils/formatters.js';

export class StockSearch {
  constructor() {
    this._element = null;
    this._suggestions = [];
    this._selectedIndex = -1;
    this._debounceTimer = null;
  }

  render(container) {
    const el = document.createElement('div');
    el.className = 'search-wrapper';
    el.innerHTML = `
      <input
        type="text"
        id="stock-search-input"
        class="search-input"
        placeholder="Search symbol (e.g. RELIANCE, TCS, AAPL, NVDA)..."
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        aria-label="Stock symbol search"
        aria-expanded="false"
        aria-autocomplete="list"
        aria-controls="search-suggestions-list"
        maxlength="20"
      />
      <button
        id="stock-search-btn"
        class="search-btn"
        aria-label="Search stock"
        type="button"
      >
        Search
      </button>
      <div
        id="search-suggestions-list"
        class="search-suggestions"
        role="listbox"
        aria-label="Stock suggestions"
        style="display: none;"
      ></div>
    `;

    container.appendChild(el);
    this._element = el;
    this._bindEvents();
  }

  _bindEvents() {
    const input = this._element.querySelector('#stock-search-input');
    const btn   = this._element.querySelector('#stock-search-btn');
    const dropdown = this._element.querySelector('#search-suggestions-list');

    // Input changes — handle debounced suggestions
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      input.value = input.value.toUpperCase();
      input.setSelectionRange(pos, pos);

      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._handleInputChange(input.value.trim());
      }, 150);
    });

    // Focus input — show suggestions if query exists or popular suggestions
    input.addEventListener('focus', () => {
      this._handleInputChange(input.value.trim());
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (dropdown.style.display !== 'none' && this._suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._selectedIndex = Math.min(this._selectedIndex + 1, this._suggestions.length - 1);
          this._updateSelectionState();
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._selectedIndex = Math.max(this._selectedIndex - 1, -1);
          this._updateSelectionState();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          if (this._selectedIndex >= 0 && this._selectedIndex < this._suggestions.length) {
            this._selectSuggestion(this._suggestions[this._selectedIndex]);
          } else {
            this._submit(input.value);
          }
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          this._hideDropdown();
          return;
        }
      } else if (e.key === 'Enter') {
        this._submit(input.value);
      }
    });

    // Button click
    btn.addEventListener('click', () => this._submit(input.value));

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this._element.contains(e.target)) {
        this._hideDropdown();
      }
    });

    // Listen for external symbol selection (e.g. sidebar quick picks)
    eventBus.on('search:set-symbol', (symbol) => {
      input.value = symbol;
      this._hideDropdown();
      this._submit(symbol);
    });
  }

  async _handleInputChange(query) {
    if (!query) {
      this._hideDropdown();
      return;
    }

    try {
      const results = await stockService.search(query);
      this._suggestions = results;
      this._selectedIndex = -1;

      if (results.length > 0) {
        this._renderDropdown(results);
      } else {
        this._renderNoResults(query);
      }
    } catch (err) {
      console.error('[StockSearch] Suggestion error:', err);
      this._hideDropdown();
    }
  }

  _renderDropdown(items) {
    const dropdown = this._element.querySelector('#search-suggestions-list');
    const input = this._element.querySelector('#stock-search-input');
    if (!dropdown) return;

    dropdown.innerHTML = items.map((item, index) => {
      const isPos = item.change >= 0;
      const currency = item.currency || 'INR';
      const locale = currency === 'INR' ? 'en-IN' : 'en-US';

      return `
        <div
          class="suggestion-item"
          role="option"
          id="suggestion-${index}"
          aria-selected="false"
          data-index="${index}"
          data-symbol="${item.symbol}"
        >
          <div class="suggestion-item__main">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span class="suggestion-symbol">${item.symbol}</span>
              <span class="suggestion-exchange" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(59,130,246,0.12); color: var(--color-brand-light);">${item.exchange}</span>
            </div>
            <div class="suggestion-company">${item.companyName}</div>
          </div>
          <div class="suggestion-item__price">
            ${item.price > 0 ? `
              <span class="suggestion-price-val">${formatCurrency(item.price, currency, locale)}</span>
              <span class="suggestion-change ${isPos ? 'positive' : 'negative'}">
                ${isPos ? '▲' : '▼'} ${formatChange(item.changePercent)}
              </span>
            ` : `
              <span style="font-size: 11px; color: var(--color-text-muted);">🏛️ NSE Stock</span>
            `}
          </div>
        </div>
      `;
    }).join('');

    dropdown.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');

    // Bind click handlers to suggestion items
    dropdown.querySelectorAll('.suggestion-item').forEach((el) => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index, 10);
        if (this._suggestions[index]) {
          this._selectSuggestion(this._suggestions[index]);
        }
      });
    });
  }

  _renderNoResults(query) {
    const dropdown = this._element.querySelector('#search-suggestions-list');
    const input = this._element.querySelector('#stock-search-input');
    if (!dropdown) return;

    dropdown.innerHTML = `
      <div class="suggestion-no-results">
        <span>No matching symbols for "<strong>${query}</strong>"</span>
        <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px;">
          Press Enter to attempt search anyway
        </div>
      </div>
    `;
    dropdown.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');
  }

  _updateSelectionState() {
    const dropdown = this._element.querySelector('#search-suggestions-list');
    if (!dropdown) return;

    dropdown.querySelectorAll('.suggestion-item').forEach((el, idx) => {
      const isSelected = idx === this._selectedIndex;
      el.classList.toggle('selected', isSelected);
      el.setAttribute('aria-selected', isSelected.toString());

      if (isSelected) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  _selectSuggestion(item) {
    const input = this._element.querySelector('#stock-search-input');
    if (input) input.value = item.symbol;
    this._hideDropdown();
    this._submit(item.symbol);
  }

  _hideDropdown() {
    const dropdown = this._element.querySelector('#search-suggestions-list');
    const input = this._element.querySelector('#stock-search-input');
    if (dropdown) dropdown.style.display = 'none';
    if (input) input.setAttribute('aria-expanded', 'false');
    this._selectedIndex = -1;
  }

  _submit(rawValue) {
    this._hideDropdown();
    const { valid, value, error } = validateSymbol(rawValue);

    if (!valid) {
      eventBus.emit(EVENTS.TOAST_SHOW, { message: error, type: 'error' });
      return;
    }

    eventBus.emit(EVENTS.STOCK_SEARCH, { symbol: value });
  }
}
