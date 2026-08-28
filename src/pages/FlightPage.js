/**
 * FlightPage.js
 * Airline Booking Page Orchestrator.
 * Connects FlightSearchForm, FlightCard, and FlightService for seamless airline ticket booking.
 */

import { FlightSearchForm } from '../components/flights/FlightSearchForm.js';
import { renderFlightCard, bindFlightBookingEvents } from '../components/flights/FlightCard.js';
import { flightService } from '../services/FlightService.js';

export const flightPage = {
  render(container) {
    const el = document.createElement('div');
    el.className = 'flight-page animate-fadeIn';
    el.style.width = '100%';
    el.style.maxWidth = '1200px';
    el.style.margin = '0 auto';
    el.style.padding = 'var(--space-6) var(--space-4)';

    el.innerHTML = `
      <div id="flight-form-container"></div>
      
      <!-- Results & Bookings Grid -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 id="flight-results-title" style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-text-primary); margin: 0;">
            Available Flights
          </h3>
          <div id="flight-results-count" style="font-size: var(--text-xs); color: var(--color-text-muted);">
            Searching flights...
          </div>
        </div>

        <div id="flight-results-list">
          <div class="loader">
            <div class="loader__spinner"></div>
            <div class="loader__text">Searching airline schedules...</div>
          </div>
        </div>
      </div>

      <!-- Recent PNR Bookings Section -->
      <div id="recent-bookings-section" style="margin-top: var(--space-8);"></div>
    `;

    container.appendChild(el);

    // Initialize search form
    const formContainer = el.querySelector('#flight-form-container');
    const searchForm = new FlightSearchForm(async (query) => {
      await this._handleFlightSearch(el, query);
    });
    searchForm.render(formContainer);

    this._renderRecentBookings(el);

    // Re-render confirmed bookings on update
    window.addEventListener('flight-booking-updated', () => {
      this._renderRecentBookings(el);
    });
  },

  async _handleFlightSearch(pageEl, query) {
    const listEl = pageEl.querySelector('#flight-results-list');
    const countEl = pageEl.querySelector('#flight-results-count');
    const titleEl = pageEl.querySelector('#flight-results-title');

    if (!listEl) return;

    listEl.innerHTML = `
      <div class="loader" style="padding: var(--space-8);">
        <div class="loader__spinner"></div>
        <div class="loader__text">Searching available flights from ${query.origin} to ${query.destination}...</div>
      </div>
    `;

    try {
      const flights = await flightService.searchFlights(query);
      
      if (titleEl) {
        titleEl.textContent = `Flights from ${query.origin} ✈️ ${query.destination} (${query.tripType === 'two-way' ? 'Two Way / Round Trip' : 'One Way'})`;
      }

      if (countEl) {
        countEl.textContent = `${flights.length} flights found • ${query.stops.toUpperCase()}`;
      }

      if (!flights || flights.length === 0) {
        listEl.innerHTML = `
          <div class="card card--highlight" style="padding: var(--space-8); text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: var(--space-2);">🚫</div>
            <div style="font-size: var(--text-base); font-weight: var(--fw-bold); color: var(--color-text-primary);">No Flights Found</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 4px;">
              No flights matched your selected stop filter (${query.stops}). Try selecting "All Flights".
            </div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = flights.map((f) => renderFlightCard(f)).join('');
      bindFlightBookingEvents(listEl, flights);

    } catch (e) {
      console.error('[FlightPage] Search failed:', e);
      listEl.innerHTML = `
        <div class="card card--highlight" style="padding: var(--space-6); text-align: center; color: var(--color-negative);">
          Failed to search flights. Please try again.
        </div>
      `;
    }
  },

  _renderRecentBookings(pageEl) {
    const section = pageEl.querySelector('#recent-bookings-section');
    if (!section) return;

    const bookings = flightService.getBookings();
    if (!bookings || bookings.length === 0) {
      section.innerHTML = '';
      return;
    }

    const cards = bookings.map((b) => `
      <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-3); border-left: 4px solid var(--color-positive);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span class="stock-exchange-badge" style="background: rgba(34,197,94,0.15); color: var(--color-positive);">PNR: ${b.pnr}</span>
            <span style="font-weight: var(--fw-bold); margin-left: 8px;">${b.flight.airline} (${b.flight.flightNumber})</span>
          </div>
          <div style="font-size: var(--text-xs); color: var(--color-text-muted);">
            Booked for ${b.passenger.name} • ${new Date(b.bookedAt).toLocaleDateString()}
          </div>
        </div>
        <div style="font-size: var(--text-sm); margin-top: 6px; color: var(--color-text-secondary);">
          Route: <strong>${b.flight.origin} ✈️ ${b.flight.destination}</strong> | Depart: <strong>${b.flight.departDate} at ${b.flight.departTime}</strong>
          ${b.flight.returnFlight ? `<br><span style="color: var(--color-brand-light);">🔄 Return Leg:</span> <strong>${b.flight.returnFlight.origin} ✈️ ${b.flight.returnFlight.destination}</strong> | Depart: <strong>${b.flight.returnFlight.departDate} at ${b.flight.returnFlight.departTime}</strong>` : ''}
        </div>
      </div>
    `).join('');

    section.innerHTML = `
      <h3 style="font-size: var(--text-base); font-weight: var(--fw-bold); margin-bottom: var(--space-3); color: var(--color-text-primary);">
        📋 Your Confirmed E-Tickets (${bookings.length})
      </h3>
      ${cards}
    `;
  },
};
