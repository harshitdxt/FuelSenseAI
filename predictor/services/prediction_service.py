from predictor.services.model_service import predict_price


def calculate_confidence(brent, usd):
    confidence = 95

    # Brent confidence penalty
    if brent > 90:
        confidence -= (brent - 90) * 0.4

    # USD-INR confidence penalty
    if usd > 85:
        confidence -= (usd - 85) * 0.5

    confidence = max(60, min(95, round(confidence)))

    return confidence


def get_market_health(confidence):

    if confidence >= 90:
        return "Stable"

    elif confidence >= 80:
        return "Moderate"

    elif confidence >= 70:
        return "Volatile"

    else:
        return "High Risk"


def get_prediction_range(price, confidence):

    spread = (100 - confidence) * 0.08

    return (
        round(price - spread, 2),
        round(price + spread, 2)
    )


def generate_prediction(city, fuel, brent_crude, usd_inr):

    predicted_price = predict_price(
        city=city,
        fuel=fuel,
        brent_crude=brent_crude,
        usd_inr=usd_inr
    )

    confidence = calculate_confidence(
        brent_crude,
        usd_inr
    )

    range_low, range_high = get_prediction_range(
        predicted_price,
        confidence
    )

    market_health = get_market_health(confidence)

    return {
        "predicted_price": predicted_price,
        "confidence": confidence,
        "market_health": market_health,
        "range_low": range_low,
        "range_high": range_high,
        "insight": "Prediction generated successfully using the Random Forest model."
    }