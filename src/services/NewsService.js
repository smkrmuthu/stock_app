/**
 * NewsService.js
 * Real-Time Live Financial & Stock Market News Service.
 * Fetches real-time market news headlines from Express Proxy backend or synchronized news snapshot.
 */

import newsSnapshot from '../data/news_snapshot.json';

class NewsService {
  constructor() {
    this._snapshot = Array.isArray(newsSnapshot) && newsSnapshot.length > 0 ? newsSnapshot : [];
  }

  /**
   * Fetch all market news.
   */
  async getAllNews() {
    try {
      const resp = await fetch('/api/news?category=all');
      if (resp.ok) {
        const live = await resp.json();
        if (Array.isArray(live) && live.length > 0) return live;
      }
    } catch (e) {
      // Backend not available (static hosting)
    }
    return this._sortNews([...this._snapshot]);
  }

  /**
   * Fetch world business news.
   */
  async getWorldNews() {
    try {
      const resp = await fetch('/api/news?category=world');
      if (resp.ok) {
        const live = await resp.json();
        if (Array.isArray(live) && live.length > 0) return live;
      }
    } catch (e) {
      // Backend not available (static hosting)
    }
    return this._sortNews(this._snapshot.filter((n) => n.category === 'world'));
  }

  /**
   * Fetch Indian stock market news.
   */
  async getIndiaNews() {
    try {
      const resp = await fetch('/api/news?category=india');
      if (resp.ok) {
        const live = await resp.json();
        if (Array.isArray(live) && live.length > 0) return live;
      }
    } catch (e) {
      // Backend not available (static hosting)
    }
    return this._sortNews(this._snapshot.filter((n) => n.category === 'india'));
  }

  /**
   * Fetch news matching a specific stock symbol (e.g., RELIANCE, TCS, INFY).
   */
  async getNewsForSymbol(symbol) {
    if (!symbol) return [];
    const symUpper = symbol.toUpperCase().trim();

    try {
      const resp = await fetch(`/api/news?symbol=${encodeURIComponent(symUpper)}`);
      if (resp.ok) {
        const live = await resp.json();
        if (Array.isArray(live) && live.length > 0) return live;
      }
    } catch (e) {
      // Backend not available
    }

    const all = await this.getAllNews();
    const filtered = all.filter((item) => {
      const inSymbols = (item.symbols || []).includes(symUpper);
      const inTitle = item.title.toUpperCase().includes(symUpper);
      const inSummary = (item.summary || '').toUpperCase().includes(symUpper);
      const inTags = (item.tags || []).some((t) => t.toUpperCase().includes(symUpper));
      return inSymbols || inTitle || inSummary || inTags;
    });

    return filtered.length > 0 ? filtered : all.slice(0, 5);
  }

  _sortNews(articles) {
    return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
}

export const newsService = new NewsService();
