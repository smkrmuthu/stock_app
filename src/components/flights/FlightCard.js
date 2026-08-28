/**
 * FlightCard.js
 * Interactive Airline Flight Result Card with Live Flight Timings,
 * Radar Telemetry, Status Badges, and Complete Booking Modal with E-Ticket generation.
 */

import { eventBus, EVENTS } from '../../core/EventBus.js';
import { flightService } from '../../services/FlightService.js';

export function renderFlightCard(flight) {
  const isDirect = flight.isDirect;
  const priceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(flight.price);
  const status = flight.liveStatus || {
    statusText: '🟢 On Time',
    badgeColor: '#10b981',
    countdown: 'Scheduled',
    altitude: 'Ground',
    speed: '0 km/h',
  };

  const outboundHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); width: 100%;">
      <!-- Airline Info -->
      <div style="display: flex; align-items: center; gap: var(--space-3); min-width: 190px;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(255,255,255,0.06); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
          ${flight.airlineLogo}
        </div>
        <div>
          <div style="font-weight: var(--fw-bold); font-size: var(--text-sm); color: var(--color-text-primary);">
            ${flight.airline}
          </div>
          <div style="font-size: var(--text-xs); color: var(--color-text-muted);">
            ${flight.flightNumber} • ${flight.cabinClass.toUpperCase()} • ${flight.aircraft || 'Airbus A321'}
          </div>
        </div>
      </div>

      <!-- Times & Route -->
      <div style="display: flex; align-items: center; gap: var(--space-6); text-align: center;">
        <div style="text-align: left;">
          <div style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-text-primary);">${flight.departTime}</div>
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">${flight.origin} (${flight.terminal})</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; min-width: 110px;">
          <span style="font-size: 10px; color: var(--color-text-muted); font-weight: var(--fw-semibold);">⏱️ ${flight.duration}</span>
          <div style="width: 100%; height: 2px; background: var(--color-border); position: relative; margin: 3px 0;">
            <div style="position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: ${isDirect ? 'var(--color-positive)' : 'var(--color-warning)'};"></div>
          </div>
          <span style="font-size: 9px; color: ${isDirect ? 'var(--color-positive)' : 'var(--color-warning)'}; font-weight: var(--fw-bold);">${flight.stops}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-text-primary);">${flight.arrivalTime}</div>
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">${flight.destination}</div>
        </div>
      </div>

      <!-- Live Radar & Status Badge -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 150px;">
        <div style="
          padding: 3px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: var(--fw-bold);
          background: rgba(255,255,255,0.06);
          border: 1px solid ${status.badgeColor};
          color: ${status.badgeColor};
        ">
          ${status.statusText}
        </div>
        <div style="font-size: 10px; color: var(--color-text-muted);">
          Gate: <strong>${flight.gate}</strong> • ${status.countdown}
        </div>
      </div>
    </div>
  `;

  let returnHtml = '';
  if (flight.returnFlight) {
    const rf = flight.returnFlight;
    returnHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); width: 100%; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(255,255,255,0.06);">
        <!-- Return Airline Info -->
        <div style="display: flex; align-items: center; gap: var(--space-3); min-width: 190px;">
          <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(255,255,255,0.06); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
            ${rf.airlineLogo}
          </div>
          <div>
            <div style="font-weight: var(--fw-bold); font-size: var(--text-sm); color: var(--color-text-primary);">
              ${rf.airline}
            </div>
            <div style="font-size: var(--text-xs); color: var(--color-text-muted);">
              ${rf.flightNumber} • Return Leg • ${rf.aircraft || 'Airbus A321'}
            </div>
          </div>
        </div>

        <!-- Times & Route -->
        <div style="display: flex; align-items: center; gap: var(--space-6); text-align: center;">
          <div style="text-align: left;">
            <div style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-text-primary);">${rf.departTime}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">${rf.origin} (${rf.terminal})</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; min-width: 110px;">
            <span style="font-size: 10px; color: var(--color-text-muted); font-weight: var(--fw-semibold);">⏱️ ${rf.duration}</span>
            <div style="width: 100%; height: 2px; background: var(--color-border); position: relative; margin: 3px 0;">
              <div style="position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: ${rf.isDirect ? 'var(--color-positive)' : 'var(--color-warning)'};"></div>
            </div>
            <span style="font-size: 9px; color: ${rf.isDirect ? 'var(--color-positive)' : 'var(--color-warning)'}; font-weight: var(--fw-bold);">${rf.stops}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-text-primary);">${rf.arrivalTime}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">${rf.destination}</div>
          </div>
        </div>

        <!-- Return Date -->
        <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: var(--fw-semibold); min-width: 150px; text-align: right;">
          📅 ${rf.departDate} • Gate ${rf.gate}
        </div>
      </div>
    `;
  }

  return `
    <div class="card card--highlight animate-fadeIn" style="margin-bottom: var(--space-4); padding: var(--space-5);">
      <div style="display: flex; flex-direction: column; gap: var(--space-3);">
        <!-- Title & Price Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: 11px; font-weight: var(--fw-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-brand-light);">
              ${flight.returnFlight ? '🔄 Round Trip Package' : '🛫 One Way Non-Stop'}
            </span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(59,130,246,0.1); color: var(--color-brand-light);">
              📅 Depart: ${flight.departDate}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div style="text-align: right;">
              <span style="font-size: var(--text-xl); font-weight: var(--fw-bold); color: var(--color-positive);">${priceFormatted}</span>
              <span style="font-size: 10px; color: var(--color-text-muted);"> total</span>
            </div>
            <button
              type="button"
              class="btn-book-flight symbol-chip"
              data-flight-id="${flight.id}"
              style="
                background: linear-gradient(135deg, var(--color-positive), #059669);
                color: #ffffff;
                font-weight: var(--fw-bold);
                padding: var(--space-2) var(--space-5);
                box-shadow: 0 2px 8px rgba(16,185,129,0.3);
                cursor: pointer;
              "
            >
              Book Ticket ✈️
            </button>
          </div>
        </div>
        
        ${outboundHtml}
        ${returnHtml}
      </div>

      <!-- Baggage & Amenities Footer -->
      <div style="
        margin-top: var(--space-3);
        padding-top: var(--space-2);
        border-top: 1px dashed var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        flex-wrap: wrap;
        gap: var(--space-2);
      ">
        <div>🧳 ${flight.baggage} • 🍱 Complimentary Meal • 📶 In-Flight Wi-Fi</div>
        <div style="color: var(--color-positive); font-weight: var(--fw-semibold);">
          ⚡ Live Flight • Only ${flight.seatsAvailable} seats available at this fare
        </div>
      </div>
    </div>
  `;
}

export function bindFlightBookingEvents(container, flights) {
  container.querySelectorAll('.btn-book-flight').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const flightId = btn.dataset.flightId;
      const flight = flights.find((f) => f.id === flightId);
      if (!flight) return;

      const passengerName = prompt(`Enter Lead Passenger Full Name for ${flight.airline} ${flight.flightNumber}:`, 'Muthu Kumar');
      if (!passengerName) return;

      const seatChoice = prompt(`Select Preferred Seat (e.g. 12A Window, 12B Middle, 12C Aisle):`, '12A (Window)');

      try {
        const booking = await flightService.bookFlight(flight, {
          name: passengerName,
          seat: seatChoice || '12A (Window)',
          email: 'muthu@example.com',
        });
        
        const priceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(flight.price);

        let confirmMsg = `🎉 E-TICKET CONFIRMED!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🎫 PNR Reference: ${booking.pnr}\n` +
          `✈️ Airline: ${flight.airline} (${flight.flightNumber})\n` +
          `🛫 Route: ${flight.origin} (${flight.terminal}) ➔ ${flight.destination}\n` +
          `📅 Date: ${flight.departDate} at ${flight.departTime}\n` +
          `🚪 Gate: ${flight.gate} | 💺 Seat: ${booking.passenger.seat}\n` +
          `👤 Passenger: ${passengerName}\n` +
          `💳 Fare Paid: ${priceFormatted}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Status: Confirmed ✓ • Electronic Boarding Pass Ready`;

        if (flight.returnFlight) {
          confirmMsg += `\n\n🔄 Return Flight: ${flight.returnFlight.airline} (${flight.returnFlight.flightNumber})\n` +
            `Route: ${flight.returnFlight.origin} ➔ ${flight.returnFlight.destination}\n` +
            `Date: ${flight.returnFlight.departDate} at ${flight.returnFlight.departTime}`;
        }

        alert(confirmMsg);

        eventBus.emit(EVENTS.TOAST_SHOW, {
          message: `E-Ticket Booked! PNR: ${booking.pnr}`,
          type: 'success',
          duration: 5000,
        });

        // Trigger page refresh to show recent booking
        window.dispatchEvent(new CustomEvent('flight-booking-updated'));

      } catch (e) {
        alert('Booking could not be processed. Please try again.');
      }
    });
  });
}
