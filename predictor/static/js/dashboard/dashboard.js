/* ===========================================================
   FuelSense AI — Dashboard logic
   Uses mock data. Replace the MOCK section with real values
   passed from Django views / a JSON API endpoint.
   =========================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- MOCK DATA (replace with API/context data) ---------------- */
  const BASE = {
    crude: 84.12,       // USD per barrel (Brent)
    usdInr: 83.47,
    retailPrice: 96.72, // INR/L current retail
    predicted: 101.72,  // INR/L AI estimate
    confidence: 87,      // %
  };

  const sparkSeries = {
    brent:  [81, 82.4, 81.9, 83.1, 83.8, 83.4, 84.12],
    wti:    [78, 79.1, 78.6, 79.8, 80.2, 80.6, 80.65],
    usdinr: [83.1, 83.2, 83.35, 83.28, 83.4, 83.5, 83.47],
    petrol: [95.9, 96.1, 96.0, 96.3, 96.5, 96.6, 96.72],
  };

  /* ---------------- Sparklines (inline SVG) ---------------- */
  function buildSparkline(el, data, color) {
    const w = 100, h = 32, pad = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = (max - min) || 1;
    const points = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    });
    const d = 'M' + points.join(' L');
    el.innerHTML = `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${d}" stroke="${color}" style="stroke-dasharray:300;stroke-dashoffset:300;animation:draw-spark 1.2s ease forwards;"/>
    </svg>`;
  }
  const styleTag = document.createElement('style');
  styleTag.textContent = `@keyframes draw-spark{to{stroke-dashoffset:0;}}`;
  document.head.appendChild(styleTag);

  document.querySelectorAll('[data-spark]').forEach(el => {
    const key = el.dataset.spark;
    const trend = el.dataset.trend || 'up';
    const color = trend === 'up' ? 'var(--accent-teal)' : 'var(--danger)';
    if (sparkSeries[key]) buildSparkline(el, sparkSeries[key], color);
  });

  /* ---------------- Price trend chart (Chart.js) ---------------- */
  const ctx = document.getElementById('priceTrendChart');
  let trendChart;
  const ranges = {
    '1D': { labels: ['9AM','11AM','1PM','3PM','5PM','7PM','9PM'], data: [96.1,96.3,96.2,96.5,96.6,96.7,96.72] },
    '1W': { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data: [95.4,95.8,96.0,96.1,96.4,96.6,96.72] },
    '1M': { labels: ['W1','W2','W3','W4'], data: [94.8,95.5,96.0,96.72] },
    '1Y': { labels: ['Jan','Mar','May','Jul','Sep','Nov'], data: [91.2,93.4,94.1,95.0,96.0,96.72] },
  };

  function renderChart(rangeKey) {
    const r = ranges[rangeKey];
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: r.labels,
        datasets: [{
          label: 'Petrol Price (INR/L)',
          data: r.data,
          borderColor: '#F2A93B',
          backgroundColor: (gradCtx) => {
            const g = gradCtx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(242,169,59,0.28)');
            g.addColorStop(1, 'rgba(242,169,59,0)');
            return g;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#F2A93B',
          pointBorderColor: '#0A0E13',
          pointBorderWidth: 2,
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#101620',
            borderColor: 'rgba(237,241,245,0.16)',
            borderWidth: 1,
            titleColor: '#8996A3',
            bodyColor: '#EDF1F5',
            titleFont: { family: 'IBM Plex Mono', size: 11 },
            bodyFont: { family: 'IBM Plex Mono', size: 13, weight: '600' },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: (c) => `₹${c.parsed.y.toFixed(2)} / L` }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(237,241,245,0.05)' },
            ticks: { color: '#5C6873', font: { family: 'IBM Plex Mono', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(237,241,245,0.05)' },
            ticks: {
              color: '#5C6873', font: { family: 'IBM Plex Mono', size: 11 },
              callback: (v) => '₹' + v
            }
          }
        }
      }
    });
  }

  if (ctx) {
    renderChart('1W');
    document.querySelectorAll('.range-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.range-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderChart(btn.dataset.range);
      });
    });
  }

  /* ---------------- Prediction center ---------------- */
  const analyzeBtn = document.getElementById('analyzeBtn');
  const predictAgainBtn = document.getElementById('predictAgainBtn');
  const thinking = document.getElementById('aiThinking');
  const resultValue = document.getElementById('predResultValue');
  const resultRange = document.getElementById('predResultRange');
  const confFill = document.getElementById('predConfFill');
  const confPct = document.getElementById('predConfPct');

  function runPrediction(crude, usdInr) {
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (thinking) thinking.classList.add('show');
    if (resultValue) resultValue.style.opacity = '0.35';

    setTimeout(() => {
      const predicted = computePrediction(crude, usdInr);
      const confidence = Math.min(96, Math.max(72, Math.round(87 - Math.abs(crude - BASE.crude) * 0.6)));

      if (thinking) thinking.classList.remove('show');
      if (analyzeBtn) analyzeBtn.disabled = false;
      if (resultValue) {
        resultValue.style.opacity = '1';
        FuelSenseCore.countUp(resultValue, { to: predicted, decimals: 2, prefix: '₹', suffix: '/L', duration: 900 });
      }
      if (resultRange) {
        resultRange.textContent = `Expected range ₹${(predicted - 1.6).toFixed(2)} – ₹${(predicted + 1.6).toFixed(2)}`;
      }
      if (confFill) confFill.style.width = confidence + '%';
      if (confPct) confPct.textContent = confidence + '%';

      updateInsightText(crude, usdInr, confidence);
    }, 1400);
  }

  function computePrediction(crude, usdInr) {
    // Simple illustrative linear blend — swap for a real API call to your
    // Django prediction endpoint (which wraps the trained Random Forest model).
    const crudeEffect = (crude - BASE.crude) * 0.42;
    const usdEffect = (usdInr - BASE.usdInr) * 0.9;
    return BASE.predicted + crudeEffect + usdEffect;
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => runPrediction(
      parseFloat(crudeSlider ? crudeSlider.value : BASE.crude),
      parseFloat(usdSlider ? usdSlider.value : BASE.usdInr)
    ));
  }
  if (predictAgainBtn) {
    predictAgainBtn.addEventListener('click', () => runPrediction(
      parseFloat(crudeSlider ? crudeSlider.value : BASE.crude),
      parseFloat(usdSlider ? usdSlider.value : BASE.usdInr)
    ));
  }

  /* ---------------- AI Insight text ---------------- */
  function updateInsightText(crude, usdInr, confidence) {
    const bubble = document.getElementById('insightBubble');
    if (!bubble) return;
    const crudeUp = crude > BASE.crude;
    const usdUp = usdInr > BASE.usdInr;
    const stability = confidence > 85 ? 'low' : confidence > 75 ? 'moderate' : 'elevated';

    bubble.innerHTML = `
      <p>Today's market conditions remain <span class="hl-teal">${stability === 'low' ? 'stable' : stability + ' volatility'}</span>. Crude oil is the dominant driver of this prediction, contributing the largest share of the model's decision.</p>
      <p>Brent crude is trending <span class="hl">${crudeUp ? 'upward' : 'downward'}</span>, while the USD-INR exchange rate is <span class="hl">${usdUp ? 'strengthening against the rupee' : 'holding relatively steady'}</span>, giving it a secondary but measurable influence.</p>
      <p>Historical patterns suggest <span class="hl-teal">${stability} short-term volatility</span>, and the model's confidence sits at <span class="hl">${confidence}%</span>.</p>
    `;
  }

  /* ---------------- Feature importance bars ---------------- */
  const fpFills = document.querySelectorAll('.fp-fill');
  const fpIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.width = entry.target.dataset.width + '%';
      fpIO.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  fpFills.forEach(el => fpIO.observe(el));

  /* ---------------- Scenario simulator ---------------- */
  const crudeSlider = document.getElementById('crudeSlider');
  const usdSlider = document.getElementById('usdSlider');
  const crudeVal = document.getElementById('crudeVal');
  const usdVal = document.getElementById('usdVal');
  const simPredicted = document.getElementById('simPredicted');
  const simConfidence = document.getElementById('simConfidence');
  const simHealth = document.getElementById('simHealth');
  const simRange = document.getElementById('simRange');

  function flash(el) {
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
  }

  function updateSimOutputs() {
    if (!crudeSlider || !usdSlider) return;
    const crude = parseFloat(crudeSlider.value);
    const usd = parseFloat(usdSlider.value);
    crudeVal.textContent = '$' + crude.toFixed(2);
    usdVal.textContent = usd.toFixed(2);

    const predicted = computePrediction(crude, usd);
    const confidence = Math.min(96, Math.max(68, Math.round(87 - Math.abs(crude - BASE.crude) * 0.6 - Math.abs(usd - BASE.usdInr) * 1.2)));
    const health = confidence > 85 ? 'Stable' : confidence > 75 ? 'Moderate' : 'Volatile';

    simPredicted.textContent = '₹' + predicted.toFixed(2) + '/L';
    simConfidence.textContent = confidence + '%';
    simHealth.textContent = health;
    simRange.textContent = `₹${(predicted - 1.6).toFixed(2)} – ₹${(predicted + 1.6).toFixed(2)}`;

    [simPredicted, simConfidence, simHealth, simRange].forEach(flash);
  }

  if (crudeSlider && usdSlider) {
    crudeSlider.addEventListener('input', updateSimOutputs);
    usdSlider.addEventListener('input', updateSimOutputs);
    updateSimOutputs();
  }

  const simResetBtn = document.getElementById('simReset');
  if (simResetBtn) {
    simResetBtn.addEventListener('click', () => {
      crudeSlider.value = BASE.crude;
      usdSlider.value = BASE.usdInr;
      updateSimOutputs();
    });
  }

  /* ---------------- Refresh market ---------------- */
  const refreshBtn = document.getElementById('refreshBtn');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      refreshBtn.disabled = true;
      setTimeout(() => {
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
        if (lastUpdatedEl) {
          const now = new Date();
          lastUpdatedEl.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }, 900);
    });
  }
});

/* ===========================
   Live Dashboard Data
=========================== */

async function loadDashboardData() {

    try {

        const data = await MarketStore.load();

        if (!data.success) return;

        document.getElementById("dashBrent").textContent =
            `$${data.brent_crude.toFixed(2)}`;

        document.getElementById("dashDiesel").textContent =
            `₹${data.diesel_price.toFixed(2)}`;

        document.getElementById("dashInflation").textContent =
            `${data.inflation.toFixed(2)}%`;

        document.getElementById("dashUsdInr").textContent =
            data.usd_inr.toFixed(2);

        document.getElementById("dashPetrol").textContent =
            `₹${data.petrol_price.toFixed(2)}`;

        document.getElementById("dashMarketHealth").textContent =
            data.market_health;

        document.getElementById("dashLastUpdated").textContent =
            data.last_updated;

    }

    catch (error) {

        console.error("Dashboard API Error:", error);

    }

}

document.addEventListener("DOMContentLoaded", loadDashboardData);