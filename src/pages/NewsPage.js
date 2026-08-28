/**
 * NewsPage.js
 * Dedicated Page module for Market Google News Feed (Mobile & Full-View).
 */

import { NewsPanel } from '../components/layout/NewsPanel.js';

export class NewsPage {
  constructor() {
    this._newsPanel = null;
  }

  render(container) {
    const el = document.createElement('main');
    el.className = 'dashboard-area news-page-container animate-fadeIn';
    el.setAttribute('role', 'main');
    el.innerHTML = `
      <div style="margin-bottom: var(--space-4);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <span style="font-size: 2rem;">📰</span>
            <h1 style="font-size: var(--text-2xl); font-weight: var(--fw-bold);">Google News Live Feed</h1>
          </div>
          <div class="market-badge" style="background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); color: var(--color-brand-light);">
            <span class="market-badge__dot" style="background: var(--color-brand-light);"></span>
            <span>Real-Time Headlines</span>
          </div>
        </div>
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm);">
          Live Indian stock market and global economic business headlines from verified publishers.
        </p>
      </div>
      <div id="news-page-outlet" class="news-page-outlet card card--flat" style="padding: 0; overflow: hidden; min-height: 500px;"></div>
    `;

    container.appendChild(el);
    const outlet = el.querySelector('#news-page-outlet');
    this._newsPanel = new NewsPanel();
    this._newsPanel.render(outlet);
  }
}

export const newsPage = new NewsPage();
