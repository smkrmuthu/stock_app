# 🚀 StockPulse — Market Intelligence, Live FX & Airline Timings

**StockPulse** is a real-time trading dashboard, live multi-currency FX converter, and airline flight radar & booking system.

---

## 🌟 Key Features

### 1. 📈 Real-Time Stock Market Intelligence
- **Multi-Tier Live Engine**: Fetches live quotes with multi-domain failover (`query1`/`query2`), browser CORS proxy fallback for static GitHub Pages, and a realistic tick engine.
- **Top Indices Ticker**: Auto-refreshing marquee with SENSEX, NIFTY 50, NIFTY BANK, S&P 500, NASDAQ, DOW, Gold, Crude Oil, and USD/INR.
- **Visual Candlestick & Volume Chart**: Interactive canvas charts with technical indicator overlays and volume histogram.
- **Unlisted Entity Detection**: Educational alert screen for unlisted companies (e.g., Milky Mist, Zerodha, boAt) with suggestions for public sector alternatives.

### 2. 💱 Live Currency FX Converter
- **100% Live Exchange Rates**: Connected to open FX rate endpoints (`open.er-api.com` / `exchangerate-api`) with 15s auto-polling.
- **Multi-Currency Support**: USD, INR, EUR, GBP, SGD, AED, SAR, MYR, THB, JPY, CAD, AUD, CHF, CNY, NZD.
- **Cross-Rate Matrix**: Dynamic 24h High, Low, and Change % metrics with instant currency swapping and preset buttons.

### 3. ✈️ Airline Timings & Live Flight Tracker
- **Real-Time Flight Radar**: Live flight status badges (`🟢 On Time`, `🟡 Check-in Open`, `⚡ Final Boarding Call`, `🔵 In Flight — 36,000 ft`).
- **Detailed Telemetry**: Departure countdowns, Gate numbers, Terminals, Aircraft type (`Airbus A350-900`, `Boeing 787-9 Dreamliner`), Baggage allowance.
- **Verified Schedules**: Major Indian and International routes (MAA ↔ SIN, BOM ↔ DEL, DEL ↔ LHR, MAA ↔ DXB, etc.).
- **Interactive Booking & E-Tickets**: Seat selection (`Window`, `Aisle`, `Middle`), passenger details, instant PNR generation, and confirmed electronic ticket receipt.

---

## 🚀 One-Click GitHub Deployment Guide

Follow these simple steps to deploy your workable live demo link to GitHub Pages:

### Step 1: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `Stock_App` or `stockpulse-dashboard`).
3. Choose **Public** and do **NOT** initialize with a README or .gitignore (we already created them).
4. Click **Create repository**.

### Step 1: Push Your Code to GitHub
The remote `origin` is already configured to `https://github.com/smkrmuthu/stock_app.git`.
Run this command in your interactive terminal:

```bash
git push -u origin main
```

*(If prompted, enter your GitHub username and Personal Access Token / password).*

### Step 2: Enable GitHub Pages for Demo Link
1. In your GitHub repository: [github.com/smkrmuthu/stock_app](https://github.com/smkrmuthu/stock_app)
2. Go to **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select:
   - **GitHub Actions**
4. The included `.github/workflows/deploy.yml` workflow will automatically build Vite and deploy your live demo!
5. Your live demo link will be available at:
   ```
   https://smkrmuthu.github.io/stock_app/
   ```

---

## 💻 Local Development

To run the application locally with full Node.js API backend proxy:

```bash
# Install dependencies
npm install

# Start both Express API backend & Vite dev server
npm run dev

# Or build production static bundle
npm run build

# Preview production build locally
npm run preview
```
