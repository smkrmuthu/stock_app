/**
 * DashboardPage.js
 * Main dashboard page — mounts all dashboard components.
 * Each page has a render(container) and optional destroy() method.
 */

import { Dashboard } from '../components/dashboard/Dashboard.js';

export class DashboardPage {
  constructor() {
    this._dashboard = new Dashboard();
  }

  render(container) {
    this._dashboard.render(container);
  }

  destroy() {
    if (this._dashboard.destroy) {
      this._dashboard.destroy();
    }
  }
}

export const dashboardPage = new DashboardPage();
