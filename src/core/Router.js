/**
 * Router.js
 * Universal client-side router for SPA navigation.
 * Supports Hash routing & Path routing for 100% reliability on GitHub Pages and localhost.
 * 
 * Works seamlessly with subdirectories (e.g. https://smkrmuthu.github.io/stock_app/#/currency).
 */

import { eventBus, EVENTS } from './EventBus.js';

class Router {
  constructor() {
    this._routes = new Map();
    this._currentRoute = null;
    this._outlet = null;

    // Listen to hash and history navigation
    window.addEventListener('hashchange', () => this._handleNavigation());
    window.addEventListener('popstate', () => this._handleNavigation());
  }

  setOutlet(outlet) {
    this._outlet = outlet;
  }

  register(path, page) {
    const cleanPath = this._normalizePath(path);
    this._routes.set(cleanPath, page);
  }

  navigate(path) {
    const cleanPath = this._normalizePath(path);
    if (window.location.hash !== `#${cleanPath}`) {
      window.location.hash = cleanPath === '/' ? '' : cleanPath;
    }
    this._handleNavigation();
  }

  init() {
    this._handleNavigation();
  }

  _normalizePath(p) {
    if (!p) return '/';
    let clean = p.replace(/^#/, '').trim();
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean || '/';
  }

  _getCurrentPath() {
    // 1. Check hash first (most reliable for GitHub Pages)
    if (window.location.hash) {
      return this._normalizePath(window.location.hash);
    }

    // 2. Check pathname, stripping base repository subpaths (e.g. /stock_app/currency -> /currency)
    const rawPath = window.location.pathname || '/';
    const segments = rawPath.split('/').filter(Boolean);

    // If last segment matches a registered route, use it
    if (segments.length > 0) {
      const last = '/' + segments[segments.length - 1];
      if (this._routes.has(last)) return last;
    }

    return '/';
  }

  _handleNavigation() {
    const path = this._getCurrentPath();
    const matchedPage = this._routes.get(path) || this._routes.get('/');

    if (!matchedPage || !this._outlet) {
      console.warn(`[Router] Route not matched for: ${path}, defaulting to home`);
      const fallback = this._routes.get('/');
      if (fallback) {
        this._currentRoute = fallback;
        this._outlet.innerHTML = '';
        fallback.render(this._outlet);
      }
      return;
    }

    if (this._currentRoute && this._currentRoute.destroy) {
      this._currentRoute.destroy();
    }

    this._currentRoute = matchedPage;
    this._outlet.innerHTML = '';
    matchedPage.render(this._outlet);

    // Notify sidebar and UI of route change
    eventBus.emit('route:changed', { path });
  }
}

export const router = new Router();
