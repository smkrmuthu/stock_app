/**
 * NewsPanel.js
 * Right-side panel with Market News.
 * Tabs: World Business | Indian Stocks | [Stock Symbol]
 * Removed "ALL" news tab as requested.
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { store } from '../../core/Store.js';
import { newsService } from '../../services/NewsService.js';
import { renderNewsCard } from '../news/NewsCard.js';
import { APP_CONFIG } from '../../config/app.config.js';

export class NewsPanel {
  constructor() {
    this._element = null;
    this._activeTab = 'india'; // Default to 'india' ('india' | 'world' | 'symbol')
    this._currentSymbol = null;
    this._refreshTimer = null;
    this._unsubscribe = null;
    this._unsubscribeStock = null;
  }

  render(container) {
    const el = document.createElement('aside');
    el.className = 'news-panel';
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', 'Market News');
    el.innerHTML = this._buildShell();

    container.appendChild(el);
    this._element = el;
    this._bindTabEvents();
    this._loadAllNews();
    this._setupAutoRefresh();
    this._setupStoreSubscription();
    this._setupStockEventListener();
  }

  _buildShell() {
    return `
      <div class="news-panel__header">
        <div class="news-panel__title" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span>📰</span>
            <span>Google News Feed</span>
          </div>
          <span style="font-size: 10px; font-weight: var(--fw-bold); color: var(--color-brand-light); background: rgba(59,130,246,0.1); padding: 2px 6px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.05em;">Live</span>
        </div>
      </div>

      <div class="news-tabs" role="tablist" aria-label="News categories" id="news-tabs-bar">
        <button
          class="news-tab active"
          id="tab-india"
          role="tab"
          aria-selected="true"
          data-tab="india"
        >
          🇮🇳 India <span class="news-tab-count" id="count-india">--</span>
        </button>
        <button
          class="news-tab"
          id="tab-world"
          role="tab"
          aria-selected="false"
          data-tab="world"
        >
          🌐 World <span class="news-tab-count" id="count-world">--</span>
        </button>
        <button
          class="news-tab"
          id="tab-symbol"
          role="tab"
          aria-selected="false"
          data-tab="symbol"
          style="display: none;"
        >
          🎯 <span id="symbol-tab-name">Symbol</span> <span class="news-tab-count" id="count-symbol">0</span>
        </button>
      </div>

      <div
        id="news-feed-container"
        class="news-feed"
        role="tabpanel"
        aria-label="News articles"
        aria-live="polite"
      >
        ${this._buildSkeletons()}
      </div>

      <div class="refresh-indicator" id="news-refresh-indicator">
        <span class="refresh-indicator__dot"></span>
        <span id="news-last-refresh">Loading feed...</span>
      </div>
    `;
  }

  _buildSkeletons() {
    return Array.from({ length: 5 }, () => `
      <div class="news-card" style="gap: var(--space-3);">
        <div class="skeleton skeleton-text" style="width: 40%;"></div>
        <div class="skeleton skeleton-text" style="width: 95%;"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
        <div class="skeleton skeleton-text" style="width: 70%;"></div>
      </div>
    `).join('');
  }

  _bindTabEvents() {
    this._element.querySelectorAll('.news-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabKey = tab.dataset.tab;
        this._setActiveTab(tabKey);
      });
    });
  }

  _setActiveTab(tabKey) {
    this._activeTab = tabKey;

    // Update tab styles
    this._element.querySelectorAll('.news-tab').forEach((tab) => {
      const isActive = tab.dataset.tab === tabKey;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });

    this._renderCurrentTabFeed();
  }

  _renderCurrentTabFeed() {
    const { allNews, worldNews, indiaNews, symbolNews } = store.getState();
    let articles = [];

    switch (this._activeTab) {
      case 'india':
        articles = indiaNews;
        break;
      case 'world':
        articles = worldNews;
        break;
      case 'symbol':
        articles = symbolNews;
        break;
      default:
        articles = indiaNews;
    }

    this._renderNewsFeed(articles);
  }

  async _loadAllNews() {
    try {
      const [all, world, india] = await Promise.all([
        newsService.getAllNews(),
        newsService.getWorldNews(),
        newsService.getIndiaNews(),
      ]);

      let symbolNews = [];
      if (this._currentSymbol) {
        symbolNews = await newsService.getNewsForSymbol(this._currentSymbol);
      }

      store.setState({ allNews: all, worldNews: world, indiaNews: india, symbolNews });
      this._updateTabCounts(world.length, india.length, symbolNews.length);
      this._renderCurrentTabFeed();
      this._updateRefreshTime();
    } catch (err) {
      console.error('[NewsPanel] Failed to load news:', err);
      this._renderError();
    }
  }

  _updateTabCounts(worldCount, indiaCount, symbolCount) {
    const elWorld = this._element?.querySelector('#count-world');
    const elIndia = this._element?.querySelector('#count-india');
    const elSymbol = this._element?.querySelector('#count-symbol');

    if (elWorld) elWorld.textContent = worldCount;
    if (elIndia) elIndia.textContent = indiaCount;
    if (elSymbol) elSymbol.textContent = symbolCount;
  }

  _setupStockEventListener() {
    this._unsubscribeStock = eventBus.on(EVENTS.STOCK_SEARCH, async ({ symbol }) => {
      if (!symbol) return;
      this._currentSymbol = symbol.toUpperCase();

      const symbolNews = await newsService.getNewsForSymbol(this._currentSymbol);
      store.setState({ symbolNews });

      const symbolTab = this._element?.querySelector('#tab-symbol');
      const symbolTabName = this._element?.querySelector('#symbol-tab-name');
      const elSymbolCount = this._element?.querySelector('#count-symbol');

      if (symbolTab && symbolTabName) {
        symbolTabName.textContent = this._currentSymbol;
        if (elSymbolCount) elSymbolCount.textContent = symbolNews.length;
        symbolTab.style.display = 'inline-flex';
      }

      if (symbolNews.length > 0) {
        this._setActiveTab('symbol');
      } else {
        this._renderCurrentTabFeed();
      }
    });
  }

  _renderNewsFeed(articles) {
    const feed = this._element?.querySelector('#news-feed-container');
    if (!feed) return;

    if (!articles || articles.length === 0) {
      feed.innerHTML = `
        <div class="loader" style="padding: var(--space-8) var(--space-4);">
          <div style="font-size: 2rem;">📭</div>
          <div class="loader__text" style="text-align: center;">
            No news articles found${this._activeTab === 'symbol' ? ` for ${this._currentSymbol}` : ''}.
          </div>
        </div>
      `;
      return;
    }

    feed.innerHTML = articles
      .map((article, i) => renderNewsCard(article, i))
      .join('');

    feed.querySelectorAll('.news-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url && url !== '#') {
          window.open(url, '_blank', 'noopener noreferrer');
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') card.click();
      });
    });
  }

  _renderError() {
    const feed = this._element?.querySelector('#news-feed-container');
    if (!feed) return;
    feed.innerHTML = `
      <div class="error-state" style="padding: var(--space-8)">
        <div class="error-state__icon">📡</div>
        <div class="error-state__title" style="font-size: var(--text-base)">Could not load news</div>
        <div class="error-state__message" style="font-size: var(--text-xs)">Check your connection or API configuration.</div>
      </div>
    `;
  }

  _updateRefreshTime() {
    const el = this._element?.querySelector('#news-last-refresh');
    if (el) {
      el.textContent = `Updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  _setupAutoRefresh() {
    this._refreshTimer = setInterval(
      () => this._loadAllNews(),
      APP_CONFIG.newsRefreshInterval
    );
  }

  _setupStoreSubscription() {
    this._unsubscribe = store.subscribe((state, prev) => {
      if (
        state.worldNews !== prev.worldNews ||
        state.indiaNews !== prev.indiaNews ||
        state.symbolNews !== prev.symbolNews
      ) {
        this._updateTabCounts(
          state.worldNews.length,
          state.indiaNews.length,
          state.symbolNews.length
        );
        this._renderCurrentTabFeed();
      }
    });
  }

  destroy() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    if (this._unsubscribe) this._unsubscribe();
    if (this._unsubscribeStock) this._unsubscribeStock();
  }
}
