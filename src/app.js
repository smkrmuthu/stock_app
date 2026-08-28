/**
 * app.js
 * Root application controller.
 * Bootstraps all layout components and registers routes.
 */

import { router } from './core/Router.js';
import { TopBar } from './components/layout/TopBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { NewsPanel } from './components/layout/NewsPanel.js';
import { MobileNav } from './components/layout/MobileNav.js';
import { Toast } from './components/shared/Toast.js';
import { dashboardPage } from './pages/DashboardPage.js';
import { watchlistPage } from './pages/WatchlistPage.js';
import { currencyPage } from './pages/CurrencyPage.js';
import { flightPage } from './pages/FlightPage.js';
import { newsPage } from './pages/NewsPage.js';

export class App {
  constructor(rootElement) {
    this._root = rootElement;
  }

  init() {
    // 1. Render permanent layout shell
    this._renderLayout();

    // 2. Register page routes
    router.register('/', dashboardPage);
    router.register('/currency', currencyPage);
    router.register('/flights', flightPage);
    router.register('/watchlist', watchlistPage);
    router.register('/news', newsPage);

    // 3. Set router outlet and initialize
    const pageOutlet = document.getElementById('page-outlet');
    router.setOutlet(pageOutlet);
    router.init();

    console.log('[App] StockPulse initialized ✓');
  }

  _renderLayout() {
    // Top Bar (fixed header)
    const topBar = new TopBar();
    topBar.render(this._root);

    // Main content wrapper
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    this._root.appendChild(mainContent);

    // Sidebar
    const sidebar = new Sidebar();
    sidebar.render(mainContent);

    // Page outlet (dynamic content area — managed by Router)
    const pageOutlet = document.createElement('div');
    pageOutlet.id = 'page-outlet';
    pageOutlet.style.flex = '1';
    pageOutlet.style.display = 'contents'; // Let children participate in flex flow
    mainContent.appendChild(pageOutlet);

    // Right News Panel (Desktop only sidebar)
    const newsPanel = new NewsPanel();
    newsPanel.render(mainContent);

    // Mobile Bottom Navigation Bar (Mobile / Tablet)
    const mobileNav = new MobileNav();
    mobileNav.render(this._root);

    // Toast system (global)
    new Toast();
  }
}
