/**
 * FlightSearchForm.js
 * Interactive Airline Booking Search Form.
 * Options: Source, Destination, Date, One Way / Two Way (Round Trip), Stopping (Direct / 1 Stop / All).
 * Includes strict Date Validation between Departure & Return dates.
 */

import { AIRPORTS } from '../../services/FlightService.js';

export class FlightSearchForm {
  constructor(onSearch) {
    this._onSearch = onSearch;
    this._tripType = 'one-way'; // 'one-way' | 'two-way'
    this._stops = 'all';        // 'all' | 'direct' | '1-stop'
    this._element = null;
  }

  render(container) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const card = document.createElement('div');
    card.className = 'card card--highlight animate-fadeIn';
    card.style.padding = 'var(--space-6)';
    card.style.marginBottom = 'var(--space-6)';

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-4);">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <span style="font-size: 1.8rem;">✈️</span>
          <div>
            <h2 style="font-size: var(--text-xl); font-weight: var(--fw-bold); margin: 0; color: var(--color-text-primary);">
              Airline Flight Booking
            </h2>
            <p style="font-size: var(--text-xs); color: var(--color-text-muted); margin: 0;">
              Search & book domestic and international flights
            </p>
          </div>
        </div>

        <!-- Trip Type Selector (One Way vs Two Way) -->
        <div class="currency-presets" style="margin: 0;" role="radiogroup" aria-label="Trip Type">
          <button type="button" class="preset-btn active" id="btn-oneway" data-triptype="one-way">
            ✈️ One Way
          </button>
          <button type="button" class="preset-btn" id="btn-twoway" data-triptype="two-way">
            🔄 Two Way (Round Trip)
          </button>
        </div>
      </div>

      <!-- Main Search Controls Form -->
      <form id="flight-search-form" style="display: flex; flex-direction: column; gap: var(--space-5);">
        
        <!-- Controls Row 1: Source, Swap, Destination -->
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--space-3); align-items: center;">
          <!-- Source (Origin) -->
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              🛫 SOURCE (FROM)
            </label>
            <select id="flight-origin" class="currency-select" style="width: 100%; font-size: var(--text-sm);">
              ${AIRPORTS.map((a) => `<option value="${a.code}" ${a.code === 'MAA' ? 'selected' : ''}>${a.city} (${a.code}) — ${a.name}</option>`).join('')}
            </select>
          </div>

          <!-- Swap Button -->
          <div style="padding-top: 18px;">
            <button
              type="button"
              id="btn-swap-airports"
              class="symbol-chip"
              style="padding: var(--space-3); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;"
              title="Swap Origin & Destination"
            >
              🔄
            </button>
          </div>

          <!-- Destination -->
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              🛬 DESTINATION (TO)
            </label>
            <select id="flight-destination" class="currency-select" style="width: 100%; font-size: var(--text-sm);">
              ${AIRPORTS.map((a) => `<option value="${a.code}" ${a.code === 'SIN' ? 'selected' : ''}>${a.city} (${a.code}) — ${a.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Controls Row 2: Dates, Stops Filter, Cabin Class -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
          <!-- Departure Date -->
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              📅 DEPARTURE DATE
            </label>
            <input
              type="date"
              id="flight-depart-date"
              value="${tomorrow}"
              min="${today}"
              class="currency-input"
              style="font-size: var(--text-sm); padding: var(--space-3);"
            />
          </div>

          <!-- Return Date (Two Way) -->
          <div id="return-date-wrapper" style="opacity: 0.4; pointer-events: none; transition: all 0.2s ease;">
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              📅 RETURN DATE (TWO WAY)
            </label>
            <input
              type="date"
              id="flight-return-date"
              value="${nextWeek}"
              min="${tomorrow}"
              class="currency-input"
              style="font-size: var(--text-sm); padding: var(--space-3);"
            />
          </div>

          <!-- Stops Filter -->
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              🛑 STOPPING (FLIGHT STOPS)
            </label>
            <select id="flight-stops" class="currency-select" style="width: 100%; font-size: var(--text-sm);">
              <option value="all" selected>All Flights (Direct + Stops)</option>
              <option value="direct">Direct / Non-stop Only</option>
              <option value="1-stop">1 Stop Flights Only</option>
            </select>
          </div>

          <!-- Cabin Class -->
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: 6px; font-weight: var(--fw-semibold);">
              💺 CABIN CLASS
            </label>
            <select id="flight-class" class="currency-select" style="width: 100%; font-size: var(--text-sm);">
              <option value="economy" selected>Economy</option>
              <option value="premium">Premium Economy</option>
              <option value="business">Business Class</option>
            </select>
          </div>
        </div>

        <!-- Date Validation Alert Message Container -->
        <div id="date-validation-alert" style="display: none; padding: var(--space-3); background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-md); color: var(--color-negative); font-size: var(--text-xs); align-items: center; gap: 8px;">
          ⚠️ <strong>Date Validation Warning:</strong> <span id="date-validation-text">Return date cannot be earlier than departure date.</span>
        </div>

        <!-- Submit Button -->
        <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
          <button
            type="submit"
            class="symbol-chip"
            style="
              background: linear-gradient(135deg, var(--color-brand), #2563eb);
              color: #ffffff;
              padding: var(--space-3) var(--space-8);
              font-size: var(--text-base);
              font-weight: var(--fw-bold);
              border-radius: var(--radius-md);
              box-shadow: 0 4px 14px rgba(59,130,246,0.3);
              cursor: pointer;
            "
          >
            🔍 Search Available Flights
          </button>
        </div>
      </form>
    `;

    container.appendChild(card);
    this._element = card;
    this._bindFormEvents();
    
    // Trigger initial search on load
    this._submitSearch();
  }

  _bindFormEvents() {
    const btnOneWay = this._element.querySelector('#btn-oneway');
    const btnTwoWay = this._element.querySelector('#btn-twoway');
    const returnWrapper = this._element.querySelector('#return-date-wrapper');
    const departInput = this._element.querySelector('#flight-depart-date');
    const returnInput = this._element.querySelector('#flight-return-date');
    const selectOrigin = this._element.querySelector('#flight-origin');
    const selectDest = this._element.querySelector('#flight-destination');
    const selectStops = this._element.querySelector('#flight-stops');
    const selectClass = this._element.querySelector('#flight-class');
    const alertBox = this._element.querySelector('#date-validation-alert');

    // Sync return date min attribute whenever departure date changes
    departInput.addEventListener('change', () => {
      returnInput.min = departInput.value;
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    returnInput.addEventListener('change', () => {
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    // Auto-update search when dropdown fields change
    selectOrigin.addEventListener('change', () => {
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    selectDest.addEventListener('change', () => {
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    selectStops.addEventListener('change', () => {
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    selectClass.addEventListener('change', () => {
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    // Trip Type toggles (One Way vs Two Way)
    btnOneWay.addEventListener('click', () => {
      this._tripType = 'one-way';
      btnOneWay.classList.add('active');
      btnTwoWay.classList.remove('active');
      returnWrapper.style.opacity = '0.4';
      returnWrapper.style.pointerEvents = 'none';
      returnInput.style.border = '1px solid var(--color-border)';
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    btnTwoWay.addEventListener('click', () => {
      this._tripType = 'two-way';
      btnTwoWay.classList.add('active');
      btnOneWay.classList.remove('active');
      returnWrapper.style.opacity = '1';
      returnWrapper.style.pointerEvents = 'auto';
      returnInput.style.border = '2px solid var(--color-brand-light)';
      
      // Ensure min is set and validate
      returnInput.min = departInput.value;
      if (returnInput.value < departInput.value) {
        returnInput.value = departInput.value;
      }
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    // Swap Airports button
    const btnSwap = this._element.querySelector('#btn-swap-airports');
    btnSwap.addEventListener('click', () => {
      const temp = selectOrigin.value;
      selectOrigin.value = selectDest.value;
      selectDest.value = temp;
      if (this._validateDates()) {
        this._submitSearch();
      }
    });

    // Submit handler
    const form = this._element.querySelector('#flight-search-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submitSearch();
    });
  }

  _validateDates() {
    const departInput = this._element.querySelector('#flight-depart-date');
    const returnInput = this._element.querySelector('#flight-return-date');
    const origin = this._element.querySelector('#flight-origin').value;
    const destination = this._element.querySelector('#flight-destination').value;
    const alertBox = this._element.querySelector('#date-validation-alert');
    const alertText = this._element.querySelector('#date-validation-text');

    let hasError = false;
    let errorMsg = '';

    // Route same source/destination validation
    if (origin === destination) {
      hasError = true;
      errorMsg = 'Source (From) and Destination (To) airports cannot be the same!';
    }
    // Date sequence validation for Two Way Trip
    else if (this._tripType === 'two-way') {
      if (returnInput.value && departInput.value && returnInput.value < departInput.value) {
        hasError = true;
        errorMsg = `Return Date (${returnInput.value}) cannot be earlier than Departure Date (${departInput.value}).`;
      }
    }

    if (hasError) {
      if (alertBox && alertText) {
        alertText.textContent = errorMsg;
        alertBox.style.display = 'flex';
      }
      return false;
    } else {
      if (alertBox) {
        alertBox.style.display = 'none';
      }
      return true;
    }
  }

  _submitSearch() {
    const origin = this._element.querySelector('#flight-origin').value;
    const destination = this._element.querySelector('#flight-destination').value;
    const departDate = this._element.querySelector('#flight-depart-date').value;
    const returnDate = this._element.querySelector('#flight-return-date').value;
    const stops = this._element.querySelector('#flight-stops').value;
    const cabinClass = this._element.querySelector('#flight-class').value;

    if (!this._validateDates()) {
      return;
    }

    if (this._onSearch) {
      this._onSearch({
        origin,
        destination,
        departDate,
        returnDate: this._tripType === 'two-way' ? returnDate : null,
        tripType: this._tripType,
        stops,
        cabinClass,
      });
    }
  }
}
