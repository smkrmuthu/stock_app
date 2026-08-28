/**
 * CurrencyPage.js
 * Page module for Currency FX Converter tab.
 */

import { CurrencyConverter } from '../components/currency/CurrencyConverter.js';

export class CurrencyPage {
  constructor() {
    this._converter = new CurrencyConverter();
  }

  render(container) {
    this._converter.render(container);
  }
}

export const currencyPage = new CurrencyPage();
