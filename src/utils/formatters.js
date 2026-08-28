/**
 * formatters.js
 * Centralized number, currency, date, and percentage formatters.
 * All UI display formatting should go through these functions.
 */

/**
 * Format a currency value with locale-appropriate symbol and notation.
 * @param {number} value - Raw value
 * @param {string} currency - ISO currency code (INR, USD, etc.)
 * @param {string} locale - BCP47 locale (default en-IN)
 */
export function formatCurrency(value, currency = 'INR', locale = 'en-IN') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a large number with compact notation (1.2M, 4.5B, etc.)
 */
export function formatCompact(value, locale = 'en-IN') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a plain number with commas.
 */
export function formatNumber(value, locale = 'en-IN') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a percentage change with sign (+/-).
 */
export function formatChange(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a price change amount with sign.
 */
export function formatChangeAmount(value, currency = 'INR', locale = 'en-IN') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value, currency, locale)}`;
}

/**
 * Get the CSS class suffix for a value direction.
 * Returns 'positive', 'negative', or 'neutral'
 */
export function getDirection(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Format a full date-time string for display.
 */
export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format market cap with Indian/international notation.
 */
export function formatMarketCap(value, currency = 'INR') {
  if (!value) return '—';
  if (currency === 'INR') {
    // Use Indian notation (Cr, L Cr)
    if (value >= 10000000000) return `₹${(value / 10000000).toFixed(0)} Cr`;
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(0)} L`;
    return formatCompact(value);
  }
  return formatCompact(value);
}
