import json
from pathlib import Path

import joblib

# ==========================
# Project Paths
# ==========================

BASE_DIR = Path(__file__).resolve().parent.parent.parent

MODEL_DIR = BASE_DIR / "model"

# ==========================
# Load Model
# ==========================

model = joblib.load(MODEL_DIR / "fuel_price_model.pkl")

# ==========================
# Load Encoders
# ==========================

city_encoder = joblib.load(MODEL_DIR / "city_encoder.pkl")
fuel_encoder = joblib.load(MODEL_DIR / "fuel_encoder.pkl")

# ==========================
# Load Feature Order
# ==========================

with open(MODEL_DIR / "feature_config.json", "r") as f:
    feature_config = json.load(f)

FEATURE_ORDER = feature_config["feature_order"]

from datetime import datetime
import pandas as pd


def predict_price(city, fuel, brent_crude, usd_inr):
    """
    Predict petrol/diesel price using the trained Random Forest model.
    """

    # Encode categorical values
    city_encoded = city_encoder.transform([city])[0]
    fuel_encoded = fuel_encoder.transform([fuel])[0]

    # Today's date features
    today = datetime.today()

    month = today.month
    year = today.year
    day = today.day
    day_of_week = today.weekday()

    # Create input in EXACT training order
    input_data = pd.DataFrame([{
        "city": city_encoded,
        "fuel": fuel_encoded,
        "Brent_Crude": brent_crude,
        "USD_INR": usd_inr,
        "Month": month,
        "Year": year,
        "Day": day,
        "DayOfWeek": day_of_week
    }])

    # Keep feature order exactly the same
    input_data = input_data[FEATURE_ORDER]

    prediction = model.predict(input_data)[0]

    return round(float(prediction), 2)


print("✅ FuelSense AI Model Loaded")
print("✅ Encoders Loaded")
print("✅ Feature Configuration Loaded")