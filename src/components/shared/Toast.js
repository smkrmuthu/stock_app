/**
 * Toast.js
 * Notification toast component. Listens to EVENTS.TOAST_SHOW.
 * Usage: eventBus.emit(EVENTS.TOAST_SHOW, { message: '...', type: 'success' | 'error' | 'info' })
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';

export class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    this._setup();
  }

  _setup() {
    eventBus.on(EVENTS.TOAST_SHOW, ({ message, type = 'info', duration = 4000 }) => {
      this._show(message, type, duration);
    });
  }

  _show(message, type, duration) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || 'ℹ'}</span>
      <span class="toast__message">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
