/**
 * WatchlistPage.js
 * Placeholder for Phase 5 — Watchlist feature.
 * Currently shows a "Coming Soon" state.
 */

export class WatchlistPage {
  render(container) {
    const el = document.createElement('main');
    el.className = 'dashboard-area';
    el.setAttribute('role', 'main');
    el.innerHTML = `
      <div class="welcome-state animate-fadeIn" style="margin-top: var(--space-8);">
        <div class="welcome-state__icon">⭐</div>
        <h1 class="welcome-state__title">Watchlist</h1>
        <p class="welcome-state__subtitle">
          Save your favorite stocks and track them in one place.
          This feature is coming in Phase 5 of development.
        </p>
        <div style="
          padding: var(--space-4) var(--space-6);
          background: rgba(59,130,246,0.08);
          border: 1px dashed rgba(59,130,246,0.3);
          border-radius: var(--radius-lg);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        ">
          🚀 Coming in Phase 5 — Price alerts, target tracking, and portfolio correlation
        </div>
      </div>
    `;
    container.appendChild(el);
  }
}

export const watchlistPage = new WatchlistPage();
