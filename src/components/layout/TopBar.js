/**
 * TopBar.js
 * Fixed top navigation bar with brand logo, search, and market status.
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { StockSearch } from '../dashboard/StockSearch.js';

export class TopBar {
  constructor() {
    this._element = null;
  }

  render(container) {
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
        <div class="market-badge" id="market-status-badge" title="Market Status">
          <span class="market-badge__dot"></span>
          <span id="market-status-label">NSE Open</span>
        </div>
        <div class="last-updated" id="clock-display">
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

    // Live clock
    this._startClock();
    this._updateMarketStatus();
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const el = document.getElementById('current-time');
      if (el) el.textContent = timeStr;
    };
    update();
    setInterval(update, 1000);
  }

  _updateMarketStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMins = hours * 60 + minutes;
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

    // NSE: 9:15 AM – 3:30 PM IST on weekdays
    const nseOpen  = 9 * 60 + 15;
    const nseClose = 15 * 60 + 30;

    const badge = document.getElementById('market-status-badge');
    const label = document.getElementById('market-status-label');

    if (badge && label) {
      const isOpen = isWeekday && totalMins >= nseOpen && totalMins < nseClose;
      if (isOpen) {
        badge.style.background = 'var(--color-positive-bg)';
        badge.style.borderColor = 'rgba(16,185,129,0.3)';
        badge.style.color = 'var(--color-positive)';
        badge.querySelector('.market-badge__dot').style.background = 'var(--color-positive)';
        label.textContent = 'NSE Open';
      } else {
        badge.style.background = 'var(--color-negative-bg)';
        badge.style.borderColor = 'rgba(239,68,68,0.2)';
        badge.style.color = 'var(--color-negative)';
        badge.querySelector('.market-badge__dot').style.background = 'var(--color-negative)';
        badge.querySelector('.market-badge__dot').style.animation = 'none';
        label.textContent = 'NSE Closed';
      }
    }
  }
}
