/**
 * Sidebar.js
 * Left navigation sidebar with section-based nav.
 * Uses router for navigation; nav items are data-driven for easy extensibility.
 */

import { router } from '../../core/Router.js';
import { eventBus } from '../../core/EventBus.js';
import { APP_CONFIG } from '../../config/app.config.js';

// Navigation items registry — add new items here as features are built
const NAV_ITEMS = [
  { id: 'nav-dashboard', icon: '📊', label: 'Dashboard', path: '/', section: 'main', active: true },
  {
    id: 'nav-currency',
    icon: '🔀',
    label: 'Currency FX',
    path: '/currency',
    section: 'main',
    badge: 'LIVE',
  },
  {
    id: 'nav-flights',
    icon: '✈️',
    label: 'Airline Booking',
    path: '/flights',
    section: 'main',
    badge: 'NEW',
  },
  {
    id: 'nav-watchlist',
    icon: '⭐',
    label: 'Watchlist',
    path: '/watchlist',
    section: 'main',
    featureFlag: 'watchlistAlerts',
    badge: null,
  },
  {
    id: 'nav-portfolio',
    icon: '💼',
    label: 'Portfolio',
    path: '/portfolio',
    section: 'main',
    featureFlag: 'portfolioTracker',
  },
  {
    id: 'nav-charts',
    icon: '📈',
    label: 'Charts',
    path: '/charts',
    section: 'main',
    featureFlag: 'candlestickChart',
  },
  {
    id: 'nav-alerts',
    icon: '🔔',
    label: 'Alerts',
    path: '/alerts',
    section: 'tools',
    featureFlag: 'watchlistAlerts',
  },
  {
    id: 'nav-screener',
    icon: '🔍',
    label: 'Screener',
    path: '/screener',
    section: 'tools',
    featureFlag: 'technicalIndicators',
  },
  {
    id: 'nav-settings',
    icon: '⚙️',
    label: 'Settings',
    path: '/settings',
    section: 'bottom',
  },
];

export class Sidebar {
  constructor() {
    this._element = null;
    this._activePath = window.location.pathname || '/';
  }

  render(container) {
    const el = document.createElement('nav');
    el.className = 'sidebar';
    el.setAttribute('role', 'navigation');
    el.setAttribute('aria-label', 'Main navigation');

    el.innerHTML = this._buildHTML();
    container.appendChild(el);
    this._element = el;
    this._bindEvents();
  }

  _buildHTML() {
    const mainItems = this._buildNavItems('main');
    const toolItems = this._buildNavItems('tools');
    const bottomItems = this._buildNavItems('bottom');

    return `
      <div class="sidebar__section">
        <div class="sidebar__section-label">Markets & Services</div>
        <ul class="sidebar__nav" role="list">${mainItems}</ul>
      </div>

      <div class="sidebar__divider"></div>

      <div class="sidebar__section">
        <div class="sidebar__section-label">Tools</div>
        <ul class="sidebar__nav" role="list">${toolItems}</ul>
      </div>

      <div style="flex: 1"></div>
      <div class="sidebar__divider"></div>

      <div class="sidebar__section">
        <ul class="sidebar__nav" role="list">${bottomItems}</ul>
      </div>

      <div style="padding: var(--space-4) var(--space-4);">
        <div style="
          padding: var(--space-3);
          background: rgba(59,130,246,0.08);
          border: 1px solid rgba(59,130,246,0.15);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          line-height: 1.5;
        ">
          <div style="font-weight: var(--fw-semibold); color: var(--color-brand-light); margin-bottom: 2px;">v${APP_CONFIG.version}</div>
          Work In Progress — Extensible Multi-Service Platform
        </div>
      </div>
    `;
  }

  _buildNavItems(section) {
    return NAV_ITEMS
      .filter((item) => item.section === section)
      .filter((item) => !item.featureFlag || APP_CONFIG.features[item.featureFlag])
      .map((item) => {
        const isActive = item.path === this._activePath;
        const badgeHtml = item.badge
          ? `<span class="sidebar__nav-badge">${item.badge}</span>`
          : '';
        return `
          <li
            class="sidebar__nav-item${isActive ? ' active' : ''}"
            id="${item.id}"
            data-path="${item.path}"
            role="listitem"
            tabindex="0"
            title="${item.label}"
          >
            <span class="sidebar__nav-icon" aria-hidden="true">${item.icon}</span>
            <span>${item.label}</span>
            ${badgeHtml}
          </li>
        `;
      })
      .join('');
  }

  _bindEvents() {
    this._element.querySelectorAll('.sidebar__nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        this._setActive(item);
        router.navigate(path);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });

    // Sync with router changes
    eventBus.on('route:changed', ({ path }) => {
      const matchingItem = this._element.querySelector(`.sidebar__nav-item[data-path="${path}"]`);
      if (matchingItem) {
        this._setActive(matchingItem);
      }
    });
  }

  _setActive(activeItem) {
    this._element.querySelectorAll('.sidebar__nav-item').forEach((el) => {
      el.classList.remove('active');
    });
    activeItem.classList.add('active');
  }
}
