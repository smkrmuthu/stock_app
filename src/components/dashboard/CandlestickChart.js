/**
 * CandlestickChart.js
 * Renders an interactive candlestick (OHLC) chart using HTML5 Canvas.
 * Supports D (1 Day), M (1 Month), Y (1 Year) timeframe selectors.
 * Generates realistic OHLC data seeded from the stock's live price.
 */

export class CandlestickChart {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._data = [];
    this._timeframe = 'D';
    this._stock = null;
    this._tooltip = null;
    this._resizeObserver = null;
  }

  render(stock) {
    this._stock = stock;
    this._data = this._generateOHLC(stock, 'D');

    return `
      <div class="card" id="candlestick-chart-card" style="padding: var(--space-5); margin-top: var(--space-5);">
        <!-- Chart Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <div style="font-size: var(--text-base); font-weight: var(--fw-bold); color: var(--color-text-primary);">
              ${stock.symbol} — Price Chart
            </div>
            <div style="font-size: var(--text-xs); color: var(--color-text-muted);">
              ${stock.companyName} • ${stock.exchange}
            </div>
          </div>

          <!-- Timeframe Selector: D / M / Y -->
          <div id="chart-timeframe-btns" style="display: flex; gap: 0; border: 1px solid var(--color-border);">
            <button type="button" class="chart-tf-btn active" data-tf="D"
              style="padding: 6px 16px; font-size: var(--text-xs); font-weight: var(--fw-bold); letter-spacing: 0.06em; cursor: pointer;
                     background: var(--color-brand); color: var(--color-bg-primary); border: none;">
              D
            </button>
            <button type="button" class="chart-tf-btn" data-tf="M"
              style="padding: 6px 16px; font-size: var(--text-xs); font-weight: var(--fw-bold); letter-spacing: 0.06em; cursor: pointer;
                     background: var(--color-bg-card); color: var(--color-text-primary); border: none; border-left: 1px solid var(--color-border);">
              M
            </button>
            <button type="button" class="chart-tf-btn" data-tf="Y"
              style="padding: 6px 16px; font-size: var(--text-xs); font-weight: var(--fw-bold); letter-spacing: 0.06em; cursor: pointer;
                     background: var(--color-bg-card); color: var(--color-text-primary); border: none; border-left: 1px solid var(--color-border);">
              Y
            </button>
          </div>
        </div>

        <!-- Canvas -->
        <div style="position: relative; width: 100%; height: 380px;">
          <canvas id="candlestick-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          <div id="chart-tooltip" style="
            display: none; position: absolute; pointer-events: none; z-index: 10;
            background: var(--color-bg-card); border: 1px solid var(--color-border);
            padding: 8px 12px; font-size: 11px; color: var(--color-text-primary);
            font-family: var(--font-sans); line-height: 1.6; white-space: nowrap;
          "></div>
          <div id="chart-crosshair-x" style="display:none; position:absolute; top:0; width:1px; height:100%; background: var(--color-border); pointer-events:none;"></div>
          <div id="chart-crosshair-y" style="display:none; position:absolute; left:0; height:1px; width:100%; background: var(--color-border); pointer-events:none;"></div>
        </div>

        <!-- Volume label -->
        <div style="font-size: 10px; color: var(--color-text-muted); margin-top: var(--space-2); letter-spacing: 0.04em;">
          VOL <span id="chart-vol-label">${this._formatVol(this._data[this._data.length - 1]?.volume || 0)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Call this AFTER the HTML from render() is in the DOM.
   */
  mount() {
    const canvas = document.getElementById('candlestick-canvas');
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._tooltip = document.getElementById('chart-tooltip');

    this._setCanvasSize();
    this._draw();
    this._bindEvents();

    // Resize observer for responsive canvas
    this._resizeObserver = new ResizeObserver(() => {
      this._setCanvasSize();
      this._draw();
    });
    this._resizeObserver.observe(canvas.parentElement);
  }

  _setCanvasSize() {
    const parent = this._canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = parent.clientWidth * dpr;
    this._canvas.height = parent.clientHeight * dpr;
    this._ctx.scale(dpr, dpr);
    this._w = parent.clientWidth;
    this._h = parent.clientHeight;
  }

  _bindEvents() {
    // Timeframe buttons
    const btnGroup = document.getElementById('chart-timeframe-btns');
    if (btnGroup) {
      btnGroup.querySelectorAll('.chart-tf-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._timeframe = btn.dataset.tf;
          btnGroup.querySelectorAll('.chart-tf-btn').forEach((b) => {
            b.style.background = 'var(--color-bg-card)';
            b.style.color = 'var(--color-text-primary)';
            b.classList.remove('active');
          });
          btn.style.background = 'var(--color-brand)';
          btn.style.color = 'var(--color-bg-primary)';
          btn.classList.add('active');
          this._data = this._generateOHLC(this._stock, this._timeframe);
          this._draw();
        });
      });
    }

    // Mouse move for crosshair + tooltip
    this._canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
    this._canvas.addEventListener('mouseleave', () => this._hideTooltip());
  }

  _handleMouseMove(e) {
    const rect = this._canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { padL, padR, padT, padB } = this._getPadding();
    const chartW = this._w - padL - padR;
    const n = this._data.length;
    const candleW = chartW / n;
    const idx = Math.floor((mx - padL) / candleW);

    if (idx < 0 || idx >= n) {
      this._hideTooltip();
      return;
    }

    const bar = this._data[idx];
    const cx = document.getElementById('chart-crosshair-x');
    const cy = document.getElementById('chart-crosshair-y');
    if (cx) { cx.style.display = 'block'; cx.style.left = `${padL + idx * candleW + candleW / 2}px`; }
    if (cy) { cy.style.display = 'block'; cy.style.top = `${my}px`; }

    if (this._tooltip) {
      const isUp = bar.close >= bar.open;
      const clr = isUp ? '#22c55e' : '#ef4444';
      this._tooltip.innerHTML = `
        <div style="font-weight:800; margin-bottom:2px;">${bar.label}</div>
        <div>O: ${bar.open.toFixed(2)}</div>
        <div>H: ${bar.high.toFixed(2)}</div>
        <div>L: ${bar.low.toFixed(2)}</div>
        <div style="color:${clr}; font-weight:800;">C: ${bar.close.toFixed(2)}</div>
        <div style="color:var(--color-text-muted);">Vol: ${this._formatVol(bar.volume)}</div>
      `;
      this._tooltip.style.display = 'block';

      // Position tooltip
      let tx = padL + idx * candleW + candleW + 8;
      if (tx + 140 > this._w) tx = padL + idx * candleW - 140;
      this._tooltip.style.left = `${tx}px`;
      this._tooltip.style.top = `${Math.max(10, my - 60)}px`;
    }
  }

  _hideTooltip() {
    if (this._tooltip) this._tooltip.style.display = 'none';
    const cx = document.getElementById('chart-crosshair-x');
    const cy = document.getElementById('chart-crosshair-y');
    if (cx) cx.style.display = 'none';
    if (cy) cy.style.display = 'none';
  }

  _getPadding() {
    return { padL: 60, padR: 16, padT: 16, padB: 50 };
  }

  _draw() {
    const ctx = this._ctx;
    const data = this._data;
    if (!ctx || !data.length) return;

    const w = this._w;
    const h = this._h;
    const { padL, padR, padT, padB } = this._getPadding();

    // Clear
    ctx.clearRect(0, 0, w, h);

    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const n = data.length;

    // Price range
    let minP = Infinity, maxP = -Infinity;
    for (const d of data) {
      if (d.low < minP) minP = d.low;
      if (d.high > maxP) maxP = d.high;
    }
    const pRange = maxP - minP || 1;
    const pPad = pRange * 0.08;
    minP -= pPad;
    maxP += pPad;
    const totalRange = maxP - minP;

    const priceToY = (p) => padT + chartH * (1 - (p - minP) / totalRange);

    // Grid lines & price axis labels
    const gridColor = 'rgba(128,128,128,0.15)';
    const gridSteps = 5;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.font = '11px Archivo, sans-serif';
    ctx.fillStyle = 'rgba(128,128,128,0.7)';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridSteps; i++) {
      const p = minP + (totalRange / gridSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(p.toFixed(2), padL - 6, y + 4);
    }
    ctx.setLineDash([]);

    // Candle width
    const candleW = chartW / n;
    const bodyW = Math.max(2, candleW * 0.6);

    // Volume max
    let maxVol = 0;
    for (const d of data) { if (d.volume > maxVol) maxVol = d.volume; }
    const volH = chartH * 0.18;

    // Draw each candle
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const cx = padL + i * candleW + candleW / 2;
      const isUp = d.close >= d.open;

      // Wick
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, priceToY(d.high));
      ctx.lineTo(cx, priceToY(d.low));
      ctx.stroke();

      // Body
      const bodyTop = priceToY(Math.max(d.open, d.close));
      const bodyBot = priceToY(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBot - bodyTop);

      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
      if (!isUp) {
        ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyHeight);
      } else {
        // Hollow candle for up
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyHeight);
        ctx.fillStyle = 'rgba(34,197,94,0.15)';
        ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyHeight);
      }

      // Volume bar
      const vBarH = maxVol ? (d.volume / maxVol) * volH : 0;
      ctx.fillStyle = isUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
      ctx.fillRect(cx - bodyW / 2, h - padB - vBarH, bodyW, vBarH);
    }

    // X-axis date labels (show ~6–8 evenly spaced labels)
    ctx.fillStyle = 'rgba(128,128,128,0.7)';
    ctx.textAlign = 'center';
    ctx.font = '10px Archivo, sans-serif';
    const labelStep = Math.max(1, Math.floor(n / 7));
    for (let i = 0; i < n; i += labelStep) {
      const cx = padL + i * candleW + candleW / 2;
      ctx.fillText(data[i].label, cx, h - padB + 16);
    }
    // Always label the last candle
    if (n > 1) {
      const lastCx = padL + (n - 1) * candleW + candleW / 2;
      ctx.fillText(data[n - 1].label, lastCx, h - padB + 16);
    }
  }

  /**
   * Generate OHLC candle data based on timeframe.
   * D = intraday 5-min candles for today
   * M = daily candles for the last 30 days
   * Y = weekly candles for the last 52 weeks
   */
  _generateOHLC(stock, tf) {
    const price = stock.price || 100;
    const candles = [];
    const seed = this._hashCode(stock.symbol + tf);
    let s = seed;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

    if (tf === 'D') {
      // Intraday: 5-min candles from 09:15 to 15:30 (75 candles)
      const numCandles = 75;
      let p = price * (0.98 + rand() * 0.04);
      for (let i = 0; i < numCandles; i++) {
        const totalMin = 9 * 60 + 15 + i * 5;
        const hh = Math.floor(totalMin / 60);
        const mm = totalMin % 60;
        const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

        const volatility = price * 0.004;
        const drift = (rand() - 0.48) * volatility;
        const open = p;
        const close = open + drift;
        const high = Math.max(open, close) + rand() * volatility * 0.5;
        const low = Math.min(open, close) - rand() * volatility * 0.5;
        const volume = Math.floor(50000 + rand() * 200000);

        candles.push({ label, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
        p = close;
      }
    } else if (tf === 'M') {
      // 30 daily candles
      const numCandles = 30;
      let p = price * (0.92 + rand() * 0.08);
      const now = new Date();
      for (let i = numCandles - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;

        const volatility = price * 0.015;
        const drift = (rand() - 0.47) * volatility;
        const open = p;
        const close = open + drift;
        const high = Math.max(open, close) + rand() * volatility * 0.6;
        const low = Math.min(open, close) - rand() * volatility * 0.6;
        const volume = Math.floor(500000 + rand() * 3000000);

        candles.push({ label, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
        p = close;
      }
    } else {
      // Y: 52 weekly candles
      const numCandles = 52;
      let p = price * (0.7 + rand() * 0.25);
      const now = new Date();
      for (let i = numCandles - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;

        const volatility = price * 0.03;
        const drift = (rand() - 0.46) * volatility;
        const open = p;
        const close = open + drift;
        const high = Math.max(open, close) + rand() * volatility * 0.7;
        const low = Math.min(open, close) - rand() * volatility * 0.7;
        const volume = Math.floor(2000000 + rand() * 10000000);

        candles.push({ label, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
        p = close;
      }
    }

    return candles;
  }

  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  _formatVol(v) {
    if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
    if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + ' K';
    return v.toString();
  }

  destroy() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }
}
