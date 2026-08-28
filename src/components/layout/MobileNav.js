/**
 * MobileNav.js
 * Native-feeling Bottom Navigation Bar for Mobile and Small Tablet screens.
 * Responsive, touch-friendly tab bar with active routing state.
 */

import { router } from '../../core/Router.js';

export class MobileNav {
  constructor() {
    this._element = null;
  }

  render(container) {
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Mobile Navigation');

    nav.innerHTML = `
      <a href="#/" class="mobile-nav__item" data-route="/" id="mobile-nav-dashboard">
        <span class="mobile-nav__icon">📊</span>
        <span class="mobile-nav__label">Markets</span>
      </a>
      <a href="#/watchlist" class="mobile-nav__item" data-route="/watchlist" id="mobile-nav-watchlist">
        <span class="mobile-nav__icon">⭐</span>
        <span class="mobile-nav__label">Watchlist</span>
      </a>
      <a href="#/currency" class="mobile-nav__item" data-route="/currency" id="mobile-nav-currency">
        <span class="mobile-nav__icon">🔀</span>
        <span class="mobile-nav__label">Currency</span>
      </a>
      <a href="#/news" class="mobile-nav__item" data-route="/news" id="mobile-nav-news">
        <span class="mobile-nav__icon">📰</span>
        <span class="mobile-nav__label">News</span>
      </a>
      <button type="button" class="mobile-nav__item" id="mobile-nav-search-btn" aria-label="Search Stocks">
        <span class="mobile-nav__icon">🔍</span>
        <span class="mobile-nav__label">Search</span>
      </button>
    `;

    container.appendChild(nav);
    this._element = nav;
    this._bindEvents();
    this._updateActiveState();
  }

  _bindEvents() {
    // Listen for hash changes to update active state
    window.addEventListener('hashchange', () => this._updateActiveState());

    // Search button quick focus
    const searchBtn = this._element.querySelector('#mobile-nav-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const searchInput = document.getElementById('stock-search-input');
        if (searchInput) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          searchInput.focus();
          searchInput.select();
        }
      });
    }
  }

  _updateActiveState() {
    if (!this._element) return;
    const currentHash = window.location.hash.replace('#', '') || '/';

    this._element.querySelectorAll('.mobile-nav__item[data-route]').forEach((item) => {
      const route = item.dataset.route;
      const isActive = (route === '/' && (currentHash === '/' || currentHash === '')) || currentHash === route;
      item.classList.toggle('active', isActive);
    });
  }
}
