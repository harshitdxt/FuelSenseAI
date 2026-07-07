from predictor.services.market_service import get_live_market_data
from predictor.services.prediction_service import generate_prediction


def get_dashboard_data():

    market = get_live_market_data()

    prediction = generate_prediction(
        city="Delhi",
        fuel="petrol",
        brent_crude=market["brent_crude"],
        usd_inr=market["usd_inr"]
    )

    petrol_price = prediction["predicted_price"]

    diesel_price = round(petrol_price - 10, 2)

    return {

        "brent_crude": market["brent_crude"],

        "usd_inr": market["usd_inr"],

        "market_health": market["market_health"],

        "petrol_price": prediction["predicted_price"],

        "confidence": prediction["confidence"],

        "range_low": prediction["range_low"],

        "range_high": prediction["range_high"],

        "last_updated": market["last_updated"],

        "sources": market["sources"],

        "diesel_price": diesel_price,

        "inflation": market["inflation"], 

    }