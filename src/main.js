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
});
