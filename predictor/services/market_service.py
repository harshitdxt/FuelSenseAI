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
            "inflation": _market_cache["inflation"],
            "market_health": "Stable",
            "last_updated": datetime.now().strftime("%I:%M %p"),
            "sources": ["OilPriceAPI", "Frankfurter"],
            "inflation": _market_cache["inflation"],
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
        "inflation": inflation,
        "market_health": "Stable",
        "last_updated": datetime.now().strftime("%I:%M %p"),
        "sources": ["OilPriceAPI", "Frankfurter", "World Bank"],
    }