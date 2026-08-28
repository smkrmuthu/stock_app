/**
 * marketHours.js
 * Accurate Market Trading Session & Status Utility for Indian (NSE/BSE) and US (NASDAQ/NYSE) Exchanges.
 * 
 * Rules:
 *   - NSE/BSE (India): Monday - Friday, 09:15 AM to 03:30 PM IST (Asia/Kolkata).
 *   - NASDAQ/NYSE (US): Monday - Friday, 09:30 AM to 04:00 PM EST/EDT (America/New_York).
 */

/**
 * Get current time details in a specific timezone.
 */
function getTimeInTimezone(timeZone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const totalMinutes = hour * 60 + minute;
  const weekday = map.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  return { hour, minute, totalMinutes, weekday, isWeekend, timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

/**
 * Check if the Indian Stock Market (NSE / BSE) is currently open for regular trading.
 * Session: Monday - Friday, 09:15 AM – 03:30 PM IST.
 */
export function getNSEMarketStatus() {
  const ist = getTimeInTimezone('Asia/Kolkata');

  const NSE_OPEN_MINS = 9 * 60 + 15;   // 09:15 AM IST (555 mins)
  const NSE_CLOSE_MINS = 15 * 60 + 30; // 03:30 PM IST (930 mins)

  if (ist.isWeekend) {
    return {
      isOpen: false,
      exchange: 'NSE',
      session: 'WEEKEND',
      statusLabel: 'NSE Closed',
      badgeClass: 'closed',
      description: 'Weekend — Market Closed (Opens Monday 9:15 AM IST)',
      tagText: '🔴 Market Closed • Weekend',
      istTime: ist.timeStr,
    };
  }

  if (ist.totalMinutes < NSE_OPEN_MINS) {
    return {
      isOpen: false,
      exchange: 'NSE',
      session: 'PRE_OPEN',
      statusLabel: 'NSE Pre-Market',
      badgeClass: 'closed',
      description: 'Market Closed (Opens at 9:15 AM IST)',
      tagText: '🟡 Pre-Market • Opens 9:15 AM IST',
      istTime: ist.timeStr,
    };
  }

  if (ist.totalMinutes >= NSE_CLOSE_MINS) {
    return {
      isOpen: false,
      exchange: 'NSE',
      session: 'CLOSED',
      statusLabel: 'NSE Closed',
      badgeClass: 'closed',
      description: 'Market Closed for Today (Closed at 3:30 PM IST)',
      tagText: '🔴 Market Closed • Last Traded Price',
      istTime: ist.timeStr,
    };
  }

  return {
    isOpen: true,
    exchange: 'NSE',
    session: 'LIVE',
    statusLabel: 'NSE Open',
    badgeClass: 'open',
    description: '🟢 Live Trading Session (Closes 3:30 PM IST)',
    tagText: '🟢 Live Market Stream',
    istTime: ist.timeStr,
  };
}

/**
 * Check general market status for a given stock exchange (NSE, BSE, NASDAQ, NYSE).
 */
export function getMarketStatusForExchange(exchange = 'NSE') {
  const ex = (exchange || 'NSE').toUpperCase();

  if (ex === 'NASDAQ' || ex === 'NYSE') {
    const ny = getTimeInTimezone('America/New_York');
    const US_OPEN_MINS = 9 * 60 + 30;  // 09:30 AM EST
    const US_CLOSE_MINS = 16 * 60;     // 04:00 PM EST

    if (ny.isWeekend) {
      return {
        isOpen: false,
        exchange: ex,
        session: 'WEEKEND',
        statusLabel: `${ex} Closed`,
        description: 'Weekend — US Market Closed',
        tagText: `🔴 ${ex} Closed • Weekend`,
      };
    }

    if (ny.totalMinutes >= US_OPEN_MINS && ny.totalMinutes < US_CLOSE_MINS) {
      return {
        isOpen: true,
        exchange: ex,
        session: 'LIVE',
        statusLabel: `${ex} Open`,
        description: `🟢 Live Trading Session (${ex})`,
        tagText: `🟢 Live Market Stream • ${ex}`,
      };
    }

    return {
      isOpen: false,
      exchange: ex,
      session: 'CLOSED',
      statusLabel: `${ex} Closed`,
      description: `${ex} Market Closed (Regular hours: 9:30 AM – 4:00 PM EST)`,
      tagText: `🔴 ${ex} Closed • Last Traded Price`,
    };
  }

  // Default to Indian Exchange (NSE/BSE)
  return getNSEMarketStatus();
}
