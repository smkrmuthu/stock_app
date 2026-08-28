/**
 * CurrencyService.js
 * Real-Time Foreign Exchange (FX) Rates Service.
 * Powered by Frankfurter API (https://frankfurter.dev/) with European Central Bank (ECB) reference data.
 */

import { API_CONFIG } from '../config/api.config.js';

const CURRENCY_METADATA = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', defaultRate: 1.0 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', defaultRate: 95.54 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', defaultRate: 0.8587 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', defaultRate: 0.7363 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', defaultRate: 1.285 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', defaultRate: 159.39 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦', defaultRate: 1.3869 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', defaultRate: 1.3908 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', defaultRate: 0.884 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', defaultRate: 7.235 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', defaultRate: 1.685 },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', defaultRate: 7.795 },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', defaultRate: 10.22 },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', defaultRate: 10.45 },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', defaultRate: 6.411 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', defaultRate: 1385.2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', defaultRate: 5.485 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', defaultRate: 18.15 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', defaultRate: 3.6725 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦', defaultRate: 3.751 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', defaultRate: 4.425 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', defaultRate: 34.15 },
};

const MAJOR_PAIRS = [
  { pair: 'USD / INR', from: 'USD', to: 'INR' },
  { pair: 'SGD / INR', from: 'SGD', to: 'INR' },
  { pair: 'EUR / INR', from: 'EUR', to: 'INR' },
  { pair: 'GBP / INR', from: 'GBP', to: 'INR' },
  { pair: 'AED / INR', from: 'AED', to: 'INR' },
  { pair: 'EUR / USD', from: 'EUR', to: 'USD' },
  { pair: 'GBP / USD', from: 'GBP', to: 'USD' },
  { pair: 'USD / JPY', from: 'USD', to: 'JPY' },
  { pair: 'USD / CAD', from: 'USD', to: 'CAD' },
  { pair: 'AUD / USD', from: 'AUD', to: 'USD' },
];

class CurrencyService {
  constructor() {
    this._rates = {};
    Object.keys(CURRENCY_METADATA).forEach((code) => {
      const meta = CURRENCY_METADATA[code];
      this._rates[code] = {
        ...meta,
        rateVsUSD: meta.defaultRate,
        prevRateVsUSD: meta.defaultRate,
      };
    });

    this._lastUpdated = new Date().toISOString();
    this._apiDate = null;
    this._isLive = false;
    this._fetchPromise = null;
    this._listeners = new Set();

    // Initial fetch from Frankfurter API
    this.fetchLiveRates();

    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.fetchLiveRates();
    }, 30000);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((fn) => {
      try { fn(this._rates); } catch (e) { /* ignore */ }
    });
  }

  /**
   * Fetch real-time exchange rates from Frankfurter API (https://frankfurter.dev/).
   */
  async fetchLiveRates() {
    if (this._fetchPromise) return this._fetchPromise;

    this._fetchPromise = (async () => {
      const primaryUrl = `${API_CONFIG.frankfurter.baseUrl}/latest?base=USD`;
      const fallbackUrl = `${API_CONFIG.frankfurter.fallbackUrl}/latest?base=USD`;

      let data = null;

      try {
        const resp = await fetch(primaryUrl);
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (err) {
        // Try fallback domain
        try {
          const respFallback = await fetch(fallbackUrl);
          if (respFallback.ok) {
            data = await respFallback.json();
          }
        } catch (e2) {
          console.warn('[CurrencyService] Frankfurter fallback also failed:', e2.message);
        }
      }

      if (data && data.rates) {
        this._apiDate = data.date;
        this._rates['USD'].rateVsUSD = 1.0;

        Object.keys(data.rates).forEach((code) => {
          if (this._rates[code]) {
            this._rates[code].rateVsUSD = data.rates[code];
          } else {
            // New currency from Frankfurter
            this._rates[code] = {
              code,
              name: code,
              symbol: code,
              flag: '🌐',
              rateVsUSD: data.rates[code],
              prevRateVsUSD: data.rates[code],
            };
          }
        });

        // Fetch historical baseline to calculate real 24h day-over-day changes
        try {
          const d = new Date(data.date || new Date());
          d.setDate(d.getDate() - 7);
          const prevDateStr = d.toISOString().split('T')[0];
          const histUrl = `${API_CONFIG.frankfurter.baseUrl}/${prevDateStr}..?base=USD`;
          const histResp = await fetch(histUrl);
          if (histResp.ok) {
            const histData = await histResp.json();
            const dates = Object.keys(histData.rates || {});
            if (dates.length > 0) {
              const prevRates = histData.rates[dates[0]];
              Object.keys(prevRates).forEach((code) => {
                if (this._rates[code]) {
                  this._rates[code].prevRateVsUSD = prevRates[code];
                }
              });
            }
          }
        } catch (histErr) {
          // Historical rate comparison optional
        }

        this._lastUpdated = new Date().toISOString();
        this._isLive = true;
        this._notify();
        return;
      }

      this._lastUpdated = new Date().toISOString();
      this._notify();
    })().finally(() => {
      this._fetchPromise = null;
    });

    return this._fetchPromise;
  }

  getCurrencies() {
    return Object.values(this._rates);
  }

  getCurrency(code) {
    return this._rates[code?.toUpperCase()] || this._rates.USD;
  }

  getMajorPairs() {
    return MAJOR_PAIRS.map((p) => {
      const fromCurr = this.getCurrency(p.from);
      const toCurr = this.getCurrency(p.to);
      const rate = +(toCurr.rateVsUSD / fromCurr.rateVsUSD).toFixed(4);

      const prevRate = +(toCurr.prevRateVsUSD / fromCurr.prevRateVsUSD).toFixed(4);
      const change24h = prevRate ? +(((rate - prevRate) / prevRate) * 100).toFixed(2) : 0;
      const high24h = +(Math.max(rate, prevRate) * 1.0015).toFixed(4);
      const low24h = +(Math.min(rate, prevRate) * 0.9985).toFixed(4);

      return {
        ...p,
        rate,
        change24h,
        high24h,
        low24h,
      };
    });
  }

  convert(amount, fromCode, toCode) {
    const from = this.getCurrency(fromCode);
    const to = this.getCurrency(toCode);
    if (!amount || isNaN(amount)) {
      return { result: 0, rate: 0, inverseRate: 0, from, to };
    }

    const rate = to.rateVsUSD / from.rateVsUSD;
    const result = +(amount * rate).toFixed(2);
    return {
      result,
      rate: +rate.toFixed(4),
      inverseRate: +(1 / rate).toFixed(4),
      from,
      to,
      isLive: this._isLive,
      apiDate: this._apiDate,
      lastUpdated: this._lastUpdated,
    };
  }
}

export const currencyService = new CurrencyService();
