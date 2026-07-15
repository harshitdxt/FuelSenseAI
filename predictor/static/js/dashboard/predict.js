/* ===========================================================
   predictor/static/js/dashboard/predict.js
   FuelSense AI — Prediction Logic

   Contains ONLY: prediction logic, prediction loading state,
   prediction result rendering, scenario simulator.

   Talks to the real Django backend at /api/predict/ (trained
   Random Forest model via predict_price()). No mock/placeholder
   prediction values — every number rendered here comes from the
   API response.

   Depends on: fuelsense-core.js (FuelSenseCore.countUp, reveal)
   already loaded. Does not duplicate anything defined there.
   =========================================================== */

const FuelSensePredict = (function () {

  /* ---------------- Config ---------------- */
  // Single configurable constant — change this if the endpoint moves.
  const PREDICT_ENDPOINT = '/api/predict/';

  // TODO: replace with real selectors once city/fuel inputs are added
  // to predict/index.html. Kept as named constants (not magic strings)
  // so this is a one-line change when that UI ships.
  const DEFAULT_CITY = 'Delhi';
const DEFAULT_FUEL = 'petrol';

  // Live-market defaults used until the live market integration is
  // wired in. These match the scenario simulator's slider defaults.
  let liveBrent = 84.12;
  let liveUsdInr = 83.47;

  const DEBOUNCE_MS = 450;

  /* ---------------- DOM refs ---------------- */
  const analyzeBtn = document.getElementById('analyzeBtn');
  const predictAgainBtn = document.getElementById('predictAgainBtn');
  const aiThinking = document.getElementById('aiThinking');

  const predResultValue = document.getElementById('predResultValue');
  const predResultRange = document.getElementById('predResultRange');
  const predConfFill = document.getElementById('predConfFill');
  const predConfPct = document.getElementById('predConfPct');
  const insightBubble = document.getElementById('insightBubble');

  const crudeSlider = document.getElementById('crudeSlider');
  const usdSlider = document.getElementById('usdSlider');
  const crudeVal = document.getElementById('crudeVal');
  const usdVal = document.getElementById('usdVal');
  const simReset = document.getElementById('simReset');

  const simPredicted = document.getElementById('simPredicted');
  const simConfidence = document.getElementById('simConfidence');
  const simHealth = document.getElementById('simHealth');
  const simRange = document.getElementById('simRange');

  let debounceTimer = null;

  /* ---------------- CSRF helper (standard Django pattern) ---------------- */
  function getCookie(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? decodeURIComponent(match.pop()) : '';
  }

  /* ---------------- API call ---------------- */
async function fetchPrediction(payload) {

  const response = await fetch(PREDICT_ENDPOINT, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },

    body: JSON.stringify(payload),

  });

  if (!response.ok) {
    throw new Error(`Prediction request failed (${response.status})`);
  }

  return response.json();
}

  /* ---------------- Market health helper ---------------- */
  // Confidence is returned by the model; market health is a simple
  // client-side read of that confidence band (no separate API field).
  function marketHealthFromConfidence(confidence) {
    if (confidence >= 85) return 'Stable';
    if (confidence >= 75) return 'Moderate';
    return 'Volatile';
  }

  /* ---------------- Loading state ---------------- */
  function setLoading(isLoading) {
    if (analyzeBtn) analyzeBtn.disabled = isLoading;
    if (predictAgainBtn) predictAgainBtn.disabled = isLoading;
    if (aiThinking) aiThinking.classList.toggle('show', isLoading);
    if (predResultValue) predResultValue.style.opacity = isLoading ? '0.35' : '1';
  }

  /* ---------------- Error state ---------------- */
  function showError(message) {
    if (!insightBubble) return;
    insightBubble.innerHTML = `<p class="pred-error">${message} Please try again in a moment.</p>`;
  }

  /* ---------------- Render prediction result ---------------- */
  function renderResult(data) {
    const {
    ai_predicted_price,
    confidence,
    range_low,
    range_high,
    insight
} = data;

    if (predResultValue) {
      predResultValue.textContent = `₹${ai_predicted_price.toFixed(2)}/L`;
    }
    if (predResultRange) {
      predResultRange.textContent = `Expected range ₹${range_low.toFixed(2)} – ₹${range_high.toFixed(2)}`;
    }
    if (predConfFill) predConfFill.style.width = `${confidence}%`;
    if (predConfPct) predConfPct.textContent = `${confidence}%`;
    if (insightBubble && insight) {
      insightBubble.innerHTML = `<p>${insight}</p>`;
    }
  }

  /* ---------------- Main prediction center flow ---------------- */
  async function runPrediction(overrides = {}) {
    const payload = {
    city: overrides.city ?? DEFAULT_CITY,
    fuel: overrides.fuel ?? DEFAULT_FUEL,
    use_live_market: true
};

    setLoading(true);
    try {
      const data = await fetchPrediction(payload);
      renderResult(data);
    } catch (err) {
      showError('The AI Insight Engine could not reach the prediction service.');
      console.error('FuelSensePredict: prediction request failed', err);
    } finally {
      setLoading(false);
    }
  }

  if (analyzeBtn) analyzeBtn.addEventListener('click', () => runPrediction());
  if (predictAgainBtn) predictAgainBtn.addEventListener('click', () => runPrediction());

  /* ---------------- Scenario simulator ---------------- */
  function flash(el) {
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
  }

  function updateSliderLabels() {
    if (crudeSlider && crudeVal) crudeVal.textContent = `$${parseFloat(crudeSlider.value).toFixed(2)}`;
    if (usdSlider && usdVal) usdVal.textContent = parseFloat(usdSlider.value).toFixed(2);
  }

  async function loadLiveMarket() {

    try {

        const data = await MarketStore.load();

        if (!data.success) return;

        if (crudeSlider) crudeSlider.value = data.brent_crude;

        if (usdSlider) usdSlider.value = data.usd_inr;

        liveBrent = data.brent_crude;

        liveUsdInr = data.usd_inr;

        updateSliderLabels();

    }

    catch(error){

        console.error("Unable to load live market", error);

    }

}

  async function runSimulation() {
    if (!crudeSlider || !usdSlider) return;

    const brent_crude = parseFloat(crudeSlider.value);
    const usd_inr = parseFloat(usdSlider.value);

    try {
      const data = await fetchPrediction({
        city: DEFAULT_CITY,
        fuel: DEFAULT_FUEL,
        brent_crude,
        usd_inr,
      });

      if (simPredicted) simPredicted.textContent = `₹${data.ai_predicted_price.toFixed(2)}/L`;
      if (simConfidence) simConfidence.textContent = `${data.confidence}%`;
      if (simHealth) simHealth.textContent = marketHealthFromConfidence(data.confidence);
      if (simRange) simRange.textContent = `₹${data.range_low.toFixed(2)} – ₹${data.range_high.toFixed(2)}`;

      [simPredicted, simConfidence, simHealth, simRange].forEach(flash);
    } catch (err) {
      if (simPredicted) simPredicted.textContent = 'Unavailable';
      console.error('FuelSensePredict: simulation request failed', err);
    }
  }

  function onSliderInput() {
    updateSliderLabels();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSimulation, DEBOUNCE_MS);
  }

  if (crudeSlider) crudeSlider.addEventListener('input', onSliderInput);
  if (usdSlider) usdSlider.addEventListener('input', onSliderInput);

  if (simReset) {
  simReset.addEventListener('click', () => {

    if (crudeSlider) crudeSlider.value = liveBrent;
    if (usdSlider) usdSlider.value = liveUsdInr;

    updateSliderLabels();
    runSimulation();

  });
}

  /* ---------------- Init ---------------- */
  async function init() {

    await loadLiveMarket();

    updateSliderLabels();

    if (crudeSlider && usdSlider)
        runSimulation();

    // Automatically get the latest AI prediction
    await runPrediction();

}

  return { init, runPrediction, runSimulation };
})();

document.addEventListener('DOMContentLoaded', FuelSensePredict.init);

/* ===========================================================
   FuelSense Live Market Dashboard
=========================================================== */

const FuelSenseLiveMarket = (() => {

    const API = "/api/market/";

    const brentValue = document.getElementById("brentValue");
    const usdValue = document.getElementById("usdInrValue");
    const healthValue = document.getElementById("marketHealthValue");

    const lastUpdated = document.getElementById("marketLastUpdated");
    const sources = document.getElementById("marketSources");

    const refreshBtn = document.getElementById("marketRefreshBtn");
    const retryBtn = document.getElementById("marketRetryBtn");
    const errorBox = document.getElementById("marketError");

    async function loadMarket() {

        try {

            errorBox?.classList.remove("show");

            const response = await fetch(API);

            const data = await response.json();

            if (!data.success)
                throw new Error("Market API failed");

            if (brentValue)
                brentValue.textContent = `$${data.brent_crude.toFixed(2)}`;

            if (usdValue)
                usdValue.textContent = `₹${data.usd_inr.toFixed(2)}`;

            if (healthValue)
                healthValue.textContent = data.market_health;

            if (lastUpdated)
                lastUpdated.innerHTML =
                    `<span class="dot"></span> Updated ${data.last_updated}`;

            if (sources) {

                sources.innerHTML = "";

                data.sources.forEach(source => {

                    const pill = document.createElement("span");

                    pill.className = "source-pill";

                    pill.textContent = source;

                    sources.appendChild(pill);

                });

            }

        }

        catch (err) {

            console.error(err);

            errorBox?.classList.add("show");

        }

    }

    if (refreshBtn)
        refreshBtn.addEventListener("click", loadMarket);

    if (retryBtn)
        retryBtn.addEventListener("click", loadMarket);

    document.addEventListener("DOMContentLoaded", () => {

        loadMarket();

        // refresh every 15 minutes
        setInterval(loadMarket, 15 * 60 * 1000);

    });

})();