/**
 * validators.js
 * Input validation helpers.
 */

/**
 * Validate a stock symbol input.
 * Rules: 1–10 chars, letters, numbers, dots, hyphens only.
 */
export function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required.' };
  }
  const trimmed = symbol.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Symbol cannot be empty.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Symbol is too long (max 20 chars).' };
  }
  if (!/^[A-Za-z0-9.\-&]+$/.test(trimmed)) {
    return { valid: false, error: 'Symbol contains invalid characters.' };
  }
  return { valid: true, value: trimmed.toUpperCase() };
}
