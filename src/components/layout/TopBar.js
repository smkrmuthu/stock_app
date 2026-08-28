/**
 * TopBar.js
 * Fixed top navigation bar with brand logo, search, and market status.
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { StockSearch } from '../dashboard/StockSearch.js';
import { getNSEMarketStatus } from '../../utils/marketHours.js';

export class TopBar {
  constructor() {
    this._element = null;
    this._clockTimer = null;
  }

  render(container) {
    const status = getNSEMarketStatus();
    const el = document.createElement('header');
    el.className = 'topbar';
    el.setAttribute('role', 'banner');
    el.innerHTML = `
      <div class="topbar__brand">
        <div class="topbar__logo" aria-hidden="true">SP</div>
        <div>
          <div class="topbar__title">StockPulse</div>
          <div class="topbar__subtitle">Market Intelligence</div>
        </div>
      </div>

      <div class="topbar__center" id="topbar-search-slot"></div>

      <div class="topbar__right">
        <div class="market-badge" id="market-status-badge" title="${status.description}">
          <span class="market-badge__dot"></span>
          <span id="market-status-label">${status.statusLabel}</span>
        </div>
        <div class="last-updated" id="clock-display" title="Indian Standard Time (IST)">
          <span id="current-time">--:--:--</span>
          <span style="color: var(--color-text-muted)">IST</span>
        </div>
      </div>
    `;

    container.appendChild(el);
    this._element = el;

    // Mount search into its slot
    const searchSlot = el.querySelector('#topbar-search-slot');
    const search = new StockSearch();
    search.render(searchSlot);

    // Live clock and real-time market status
    this._startClock();
    this._updateMarketStatus();
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const el = document.getElementById('current-time');
      if (el) el.textContent = timeStr;
      this._updateMarketStatus();
    };
    update();
    this._clockTimer = setInterval(update, 1000);
  }

  _updateMarketStatus() {
    const status = getNSEMarketStatus();
    const badge = document.getElementById('market-status-badge');
    const label = document.getElementById('market-status-label');

    if (badge && label) {
      badge.setAttribute('title', status.description);
      label.textContent = status.statusLabel;

      const dot = badge.querySelector('.market-badge__dot');
      if (status.isOpen) {
        badge.style.background = 'var(--color-positive-bg)';
        badge.style.borderColor = 'rgba(16,185,129,0.3)';
        badge.style.color = 'var(--color-positive)';
        if (dot) {
          dot.style.background = 'var(--color-positive)';
          dot.style.animation = 'pulse-badge 2s infinite';
        }
      } else {
        badge.style.background = 'var(--color-negative-bg)';
        badge.style.borderColor = 'rgba(239,68,68,0.25)';
        badge.style.color = 'var(--color-negative)';
        if (dot) {
          dot.style.background = 'var(--color-negative)';
          dot.style.animation = 'none';
        }
      }
    }
  }

  destroy() {
    if (this._clockTimer) clearInterval(this._clockTimer);
  }
}
