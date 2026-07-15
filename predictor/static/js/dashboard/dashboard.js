
/* ---------------- DOM refs ---------------- */

// Section 1 — Today's Live Market
const liveBrent = document.getElementById('liveBrent');
const liveUsdInr = document.getElementById('liveUsdInr');
const liveInflation = document.getElementById('liveInflation');

// Section 2 — AI Prediction
const aiPredictedPrice = document.getElementById('aiPredictedPrice');
const aiRange = document.getElementById('aiRange');
const aiConfidence = document.getElementById('aiConfidence');

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
  if (liveBrent)
    liveBrent.textContent = formatUsd(data.brent_crude);

  if (liveUsdInr)
    liveUsdInr.textContent =
      data.usd_inr != null ? data.usd_inr.toFixed(2) : "—";

  if (liveInflation)
    liveInflation.textContent = formatPercent(data.inflation);
}

/* ---------------- Render: Section 2 — AI Prediction ---------------- */

function renderAiPrediction(data) {
  if (aiPredictedPrice)
    aiPredictedPrice.textContent =
      `${formatCurrency(data.ai_predicted_price)}/L`;

  if (aiRange)
    aiRange.textContent =
      `${formatCurrency(data.range_low)} – ${formatCurrency(data.range_high)}`;

  if (aiConfidence)
    aiConfidence.textContent =
      data.confidence != null ? `${data.confidence}%` : "—";
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