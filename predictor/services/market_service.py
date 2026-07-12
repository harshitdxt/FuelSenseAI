import os
import time
import logging
import requests
from datetime import datetime

from dotenv import load_dotenv

# ============================================
# Load Environment Variables
# ============================================

load_dotenv()

OILPRICE_API_KEY = os.getenv("OILPRICE_API_KEY")


# ============================================
# Logging
# ============================================

logger = logging.getLogger(__name__)

# ============================================
# Cache Configuration
# ============================================

CACHE_DURATION = 300  # 5 Minutes

_market_cache = {
    "timestamp": 0,
    "brent": None,
    "usd_inr": None,
    "inflation": None,
}

# ============================================
# Oil Price API
# ============================================

def get_live_brent_price():

    headers = {
        "Authorization": f"Token {OILPRICE_API_KEY}"
    }

    url = (
        "https://api.oilpriceapi.com/v1/prices/latest"
        "?by_code=BRENT_CRUDE_USD"
    )

    response = requests.get(url, headers=headers, timeout=10)

    response.raise_for_status()

    data = response.json()

    price = data["data"]["price"]

    logger.info(f"Live Brent Price: {price}")

    return float(price)

# ============================================
# Frankfurter API
# ============================================

def get_live_usd_inr():

    url = "https://api.frankfurter.app/latest?from=USD&to=INR"

    response = requests.get(url, timeout=10)

    response.raise_for_status()

    data = response.json()

    rate = data["rates"]["INR"]

    logger.info(f"Live USD-INR: {rate}")

    return float(rate)


# ============================================
# World Bank API
# ============================================

def get_india_inflation():

    url = (
        "https://api.worldbank.org/v2/"
        "country/IND/"
        "indicator/FP.CPI.TOTL.ZG"
        "?format=json"
    )

    response = requests.get(url, timeout=15)

    response.raise_for_status()

    data = response.json()

    return float(data[1][0]["value"])


# ============================================
# Petrol Price API (not yet integrated)
# ============================================
# TODO: replace this with a real call once a live retail petrol price
# source is connected. Returning None (not a fake number) so the
# frontend can clearly show "—" / "Coming soon" instead of a value
# that looks live but isn't. This is the only intentional placeholder
# left in the live-data path, and it's explicit rather than hidden
# inside a mixed field like the old "petrol_price".

def get_live_petrol_price():
    return None


# ============================================
# Market Health (derived from live indicators only —
# no AI/model involvement, so it belongs here, not in
# prediction_service.py)
# ============================================

def calculate_market_health(inflation):
    """
    Simple, transparent heuristic based purely on live inflation data.
    Replace with a richer live-data model later (e.g. factoring in
    Brent/USD-INR volatility) — the important part is that this is a
    real calculation now, not a hardcoded string.
    """
    if inflation is None:
        return "Unknown"
    if inflation < 4:
        return "Stable"
    if inflation < 6:
        return "Moderate"
    return "Volatile"


# ============================================
# Cached Market Data
# ============================================

def get_live_market_data():

    current_time = time.time()

    if (
        current_time - _market_cache["timestamp"]
        < CACHE_DURATION
    ):
        logger.info("Returning Cached Market Data")

        return {
            "brent_crude": _market_cache["brent"],
            "usd_inr": _market_cache["usd_inr"],
            "live_petrol_price": get_live_petrol_price(),
            "inflation": _market_cache["inflation"],
            "market_health": calculate_market_health(_market_cache["inflation"]),
            "last_updated": datetime.now().strftime("%I:%M %p"),
            "sources": ["OilPriceAPI", "Frankfurter", "World Bank"],
        }

    logger.info("Fetching Live Market Data")

    brent = get_live_brent_price()

    usd = get_live_usd_inr()

    inflation = get_india_inflation()

    _market_cache["timestamp"] = current_time
    _market_cache["brent"] = brent
    _market_cache["usd_inr"] = usd
    _market_cache["inflation"] = inflation

    return {
        "brent_crude": brent,
        "usd_inr": usd,
        "live_petrol_price": get_live_petrol_price(),
        "inflation": inflation,
        "market_health": calculate_market_health(inflation),
        "last_updated": datetime.now().strftime("%I:%M %p"),
        "sources": ["OilPriceAPI", "Frankfurter", "World Bank"],
    }