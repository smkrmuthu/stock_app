/**
 * main.js
 * Application entry point.
 * Creates the App instance and initializes on DOMContentLoaded.
 */

import { App } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app');

  if (!rootElement) {
    console.error('[main] Root element #app not found!');
    return;
  }

  const app = new App(rootElement);
  app.init();

  // Register Progressive Web App (PWA) Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] ServiceWorker registration successful with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] ServiceWorker registration skipped/failed:', err);
        });
    });
  }
});
