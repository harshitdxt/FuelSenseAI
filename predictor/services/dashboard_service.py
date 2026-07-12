from predictor.services.market_service import get_live_market_data
from predictor.services.prediction_service import generate_prediction


def get_dashboard_data():
    """
    The only place LIVE market data and AI prediction data meet.
    Returns one flat dict with two clearly separated groups of
    fields — LIVE (straight from market_service, untouched) and
    AI (straight from prediction_service, untouched) — so nothing
    downstream has to guess where a value came from.
    """

    market = get_live_market_data()

    prediction = generate_prediction(
        city="Delhi",
        fuel="petrol",
        brent_crude=market["brent_crude"],
        usd_inr=market["usd_inr"],
    )

    return {
        # ---------------- LIVE (from market_service.py) ----------------
        "brent_crude": market["brent_crude"],
        "usd_inr": market["usd_inr"],
        "live_petrol_price": market["live_petrol_price"],  # None until Petrol Price API is connected
        "inflation": market["inflation"],
        "market_health": market["market_health"],
        "last_updated": market["last_updated"],
        "sources": market["sources"],

        # ---------------- AI (from prediction_service.py) ----------------
        "ai_predicted_price": prediction["ai_predicted_price"],
        "confidence": prediction["confidence"],
        "range_low": prediction["range_low"],
        "range_high": prediction["range_high"],

        # Prediction-derived market health, namespaced separately so it
        # never collides with the live "market_health" above. Not in
        # your minimal spec's example, but prediction_service.py still
        # returns it and dropping it silently would lose data — kept
        # here for future use, ignore it in dashboard.js if you don't
        # need it yet.
        "ai_market_health": prediction["market_health"],

        # AI-only explanation text, exposed here too in case a future
        # Dashboard AI Insight panel wants it without a second request.
        "insight": prediction["insight"],

        # Difference is intentionally NOT computed here. It depends on
        # live_petrol_price, which is still a placeholder (None) — the
        # frontend should compute
        #   ai_predicted_price - live_petrol_price
        # itself once live_petrol_price is real, so this endpoint never
        # ships a difference calculated against a fake number.
    }