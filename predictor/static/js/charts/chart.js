/* ===========================================================
   predictor/static/js/charts/chart.js
   FuelSense AI — Chart Components

   Contains ONLY: Chart.js initialization, chart updates, chart
   animations, chart helper functions. Charts are built as
   reusable factories — pass in real data (from Django views /
   the /api/predict/ history, or a future market-data endpoint).
   No hardcoded prediction values live in this file.

   Depends on: Chart.js (loaded via CDN before this file) and the
   design tokens in fuelsense-core.css (read here via
   getComputedStyle so chart colors always match the theme).
   =========================================================== */

const FuelSenseCharts = (function () {

  const root = getComputedStyle(document.documentElement);
  const color = (name) => root.getPropertyValue(name).trim();

  const THEME = {
    amber: color('--accent-amber') || '#F2A93B',
    amberDim: color('--accent-amber-dim') || '#B8802A',
    teal: color('--accent-teal') || '#35D0B5',
    danger: color('--danger') || '#E8654B',
    textMuted: color('--text-muted') || '#8996A3',
    textDim: color('--text-dim') || '#5C6873',
    surface: color('--surface') || '#161E29',
    bgElevated: color('--bg-elevated') || '#101620',
    gridLine: 'rgba(237,241,245,0.05)',
    tooltipBg: '#101620',
    tooltipBorder: 'rgba(237,241,245,0.16)',
  };

  const FONT_MONO = 'IBM Plex Mono';

  const registry = {}; // keeps one Chart instance per canvas id

  /* ---------------- Shared helpers ---------------- */
  function buildGradient(ctx, hexColor, alphaTop = 0.28) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, hexToRgba(hexColor, alphaTop));
    gradient.addColorStop(1, hexToRgba(hexColor, 0));
    return gradient;
  }

  function hexToRgba(hex, alpha) {
    const parsed = hex.replace('#', '');
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function baseTooltip(valuePrefix = '', valueSuffix = '') {
    return {
      backgroundColor: THEME.tooltipBg,
      borderColor: THEME.tooltipBorder,
      borderWidth: 1,
      titleColor: THEME.textMuted,
      bodyColor: '#EDF1F5',
      titleFont: { family: FONT_MONO, size: 11 },
      bodyFont: { family: FONT_MONO, size: 13, weight: '600' },
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (c) => `${valuePrefix}${c.parsed.y}${valueSuffix}`,
      },
    };
  }

  function baseScales(valuePrefix = '') {
    return {
      x: {
        grid: { color: THEME.gridLine },
        ticks: { color: THEME.textDim, font: { family: FONT_MONO, size: 11 } },
      },
      y: {
        grid: { color: THEME.gridLine },
        ticks: {
          color: THEME.textDim,
          font: { family: FONT_MONO, size: 11 },
          callback: (v) => `${valuePrefix}${v}`,
        },
      },
    };
  }

  /* ---------------- Generic reusable line chart factory ---------------- */
  // labels: string[], data: number[], canvasId: string
  // options: { color, valuePrefix, valueSuffix, fill }
  function renderLineChart(canvasId, labels, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const lineColor = options.color || THEME.amber;
    const valuePrefix = options.valuePrefix || '';
    const valueSuffix = options.valueSuffix || '';

    if (registry[canvasId]) {
      registry[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: lineColor,
          backgroundColor: options.fill === false ? 'transparent' : buildGradient(ctx, lineColor),
          fill: options.fill !== false,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#0A0E13',
          pointBorderWidth: 2,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: baseTooltip(valuePrefix, valueSuffix),
        },
        scales: baseScales(valuePrefix),
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    });

    registry[canvasId] = chart;
    return chart;
  }

  /* ---------------- Update an existing chart without full re-init ---------------- */
  function updateChart(canvasId, labels, data) {
    const chart = registry[canvasId];
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  }

  /* ---------------- Named chart types (Price Trend page usage) ---------------- */

  // Historical Petrol Prices — amber line, currency-formatted
  function renderPetrolHistoryChart(canvasId, labels, data) {
    return renderLineChart(canvasId, labels, data, {
      color: THEME.amber,
      valuePrefix: '₹',
    });
  }

  // Brent Crude Trend — amber-dim line, USD-formatted
  function renderBrentTrendChart(canvasId, labels, data) {
    return renderLineChart(canvasId, labels, data, {
      color: THEME.amberDim,
      valuePrefix: '$',
    });
  }

  // USD-INR Trend — teal line, plain numeric
  function renderUsdInrTrendChart(canvasId, labels, data) {
    return renderLineChart(canvasId, labels, data, {
      color: THEME.teal,
    });
  }

  // Prediction History — teal line, currency-formatted (pairs with history/index.html)
  function renderPredictionHistoryChart(canvasId, labels, data) {
    return renderLineChart(canvasId, labels, data, {
      color: THEME.teal,
      valuePrefix: '₹',
    });
  }

  /* ---------------- Range-toggle wiring (1D / 1W / 1M / 1Y) ---------------- */
  // datasetByRange: { '1D': {labels, data}, '1W': {...}, ... }
  // renderFn: one of the render* functions above
  function wireRangeToggle(toggleSelector, canvasId, datasetByRange, renderFn, defaultRange = '1W') {
    const toggle = document.querySelector(toggleSelector);
    if (!toggle) return;

    const draw = (rangeKey) => {
      const set = datasetByRange[rangeKey];
      if (!set) return;
      renderFn(canvasId, set.labels, set.data);
    };

    draw(defaultRange);

    toggle.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        draw(btn.dataset.range);
      });
    });
  }

  return {
    renderLineChart,
    updateChart,
    renderPetrolHistoryChart,
    renderBrentTrendChart,
    renderUsdInrTrendChart,
    renderPredictionHistoryChart,
    wireRangeToggle,
  };
})();