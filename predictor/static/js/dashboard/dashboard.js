/* ===========================================================
   predictor/static/js/dashboard/dashboard.js
   FuelSense AI — Dashboard logic (clean rewrite)

   The ONLY responsibilities of this file:
     1. Load /api/dashboard/ (via the shared MarketStore service)
     2. Receive JSON
     3. Update the UI

   Nothing else. No hardcoded prices, no dummy calculations, no
   placeholder numbers, no simulation logic. Every value rendered
   here comes directly from the response built by
   dashboard_service.py — LIVE fields from market_service.py, AI
   fields from prediction_service.py.

   Removed in this rewrite (all of it was dead or fake):
     - The old mock BASE object (₹96.72, ₹101.72, 87%, etc.)
     - Sparkline mock series + drawing logic
     - The fake 1D/1W/1M/1Y price trend chart data
     - The entire Prediction Center / Scenario Simulator block —
       those element IDs (analyzeBtn, crudeSlider, etc.) don't even
       exist on this page; that code belonged to predict.js and was
       silently a no-op here.
     - updateInsightText(), which hand-generated fake AI narrative
       client-side. The API now returns a real "insight" string.

   Fields with no backing endpoint yet (WTI Crude, Diesel, the
   Price Trend chart's history) are left as honest empty states in
   the HTML — this file does not fabricate values for them. See the
   "NOT YET CONNECTED" comments in dashboard/index.html.
   =========================================================== */

/* ---------------- DOM refs ---------------- */

// Section 1 — Today's Live Market
const liveBrent = document.getElementById('liveBrent');
const liveUsdInr = document.getElementById('liveUsdInr');
const livePetrol = document.getElementById('livePetrol');
const liveInflation = document.getElementById('liveInflation');

// Section 2 — AI Prediction
const aiPredictedPrice = document.getElementById('aiPredictedPrice');
const aiRange = document.getElementById('aiRange');
const aiConfidence = document.getElementById('aiConfidence');
const aiDifference = document.getElementById('aiDifference');

// Live Market Center (same ids as before — section kept unchanged)
const dashBrent = document.getElementById('dashBrent');
const dashUsdInr = document.getElementById('dashUsdInr');
const dashPetrol = document.getElementById('dashPetrol');
const dashInflation = document.getElementById('dashInflation');
const dashMarketHealth = document.getElementById('dashMarketHealth');

// AI Insight Engine
const insightBubble = document.getElementById('insightBubble');

// Page header
const lastUpdatedEl = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');

/* ---------------- Formatting helpers ---------------- */
// Every formatter returns '—' for null/undefined rather than
// rendering "₹NaN" or "$undefined" — this is how live_petrol_price
// (currently always null) stays honest instead of looking broken.

function formatCurrency(value) {
  return value === null || value === undefined ? '—' : `₹${value.toFixed(2)}`;
}

function formatUsd(value) {
  return value === null || value === undefined ? '—' : `$${value.toFixed(2)}`;
}

function formatPercent(value) {
  return value === null || value === undefined ? '—' : `${value.toFixed(2)}%`;
}

/* ---------------- Render: Section 1 + Live Market Center ---------------- */

function renderLiveMarket(data) {
  if (liveBrent) liveBrent.textContent = formatUsd(data.brent_crude);
  if (liveUsdInr) liveUsdInr.textContent = data.usd_inr != null ? data.usd_inr.toFixed(2) : '—';
  if (livePetrol) livePetrol.textContent = data.live_petrol_price != null ? `${formatCurrency(data.live_petrol_price)}/L` : 'Coming soon';
  if (liveInflation) liveInflation.textContent = formatPercent(data.inflation);

  // Live Market Center shows the same live fields — kept in sync from one source
  if (dashBrent) dashBrent.textContent = formatUsd(data.brent_crude);
  if (dashUsdInr) dashUsdInr.textContent = data.usd_inr != null ? data.usd_inr.toFixed(2) : '—';
  if (dashPetrol) dashPetrol.textContent = data.live_petrol_price != null ? formatCurrency(data.live_petrol_price) : 'Coming soon';
  if (dashInflation) dashInflation.textContent = formatPercent(data.inflation);
  if (dashMarketHealth) dashMarketHealth.textContent = data.market_health || '—';
}

/* ---------------- Render: Section 2 — AI Prediction ---------------- */

function renderAiPrediction(data) {
  if (aiPredictedPrice) aiPredictedPrice.textContent = `${formatCurrency(data.ai_predicted_price)}/L`;
  if (aiRange) aiRange.textContent = `${formatCurrency(data.range_low)} – ${formatCurrency(data.range_high)}`;
  if (aiConfidence) aiConfidence.textContent = data.confidence != null ? `${data.confidence}%` : '—';

  if (aiDifference) {
    // Difference depends on live_petrol_price, which is null until the
    // Petrol Price API is connected — this auto-updates once it isn't.
    if (data.live_petrol_price == null || data.ai_predicted_price == null) {
      aiDifference.textContent = 'Available once live petrol price is connected';
      aiDifference.className = 'intel-value';
      aiDifference.style.fontSize = '0.95rem';
    } else {
      const diff = data.ai_predicted_price - data.live_petrol_price;
      const arrow = diff >= 0 ? '▲' : '▼';
      aiDifference.textContent = `${arrow} ₹${Math.abs(diff).toFixed(2)}`;
      aiDifference.className = 'intel-value ' + (diff >= 0 ? 'up' : 'down');
    }
  }
}

/* ---------------- Render: AI Insight Engine ---------------- */

function renderInsight(data) {
  if (insightBubble && data.insight) {
    insightBubble.innerHTML = `<p>${data.insight}</p>`;
  }
}

/* ---------------- Render: page meta ---------------- */

function renderPageMeta(data) {
  if (lastUpdatedEl) {
    lastUpdatedEl.innerHTML = `<span class="dot"></span> Updated ${data.last_updated || 'just now'}`;
  }
}

/* ---------------- Load ---------------- */

async function loadDashboardData() {
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');
  }

  try {
    const data = await MarketStore.load();

    if (data && data.error) {
      console.error('Dashboard API error:', data.error);
      return;
    }

    renderLiveMarket(data);
    renderAiPrediction(data);
    renderInsight(data);
    renderPageMeta(data);
  } catch (error) {
    console.error('Dashboard API error:', error);
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('spinning');
    }
  }
}

document.addEventListener('DOMContentLoaded', loadDashboardData);

// Refresh button now does a real reload — not a fake spin-then-nothing.
if (refreshBtn) {
  refreshBtn.addEventListener('click', loadDashboardData);
}

/* ---------------- Feature importance bars ----------------
   Widths come from static data-width attributes already in the
   HTML (the trained model's real, fixed global feature importances
   — not a live/per-request value). This just triggers the existing
   reveal-on-scroll animation; it does not invent any numbers. */

const fpFills = document.querySelectorAll('.fp-fill');
const fpIO = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.style.width = entry.target.dataset.width + '%';
    fpIO.unobserve(entry.target);
  });
}, { threshold: 0.4 });
fpFills.forEach((el) => fpIO.observe(el));