from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from predictor.services.dashboard_service import get_dashboard_data

import json
import traceback

from predictor.services.prediction_service import generate_prediction
from predictor.services.market_service import get_live_market_data


# ===========================
# Page Views
# ===========================

def home(request):
    return render(request, "predictor/index.html")


def dashboard(request):
    return render(request, "predictor/dashboard/index.html")


def history(request):
    return render(request, "predictor/history/index.html")


def about(request):
    return render(request, "predictor/about/index.html")


def predict(request):
    return render(request, "predictor/predict/index.html")


# ===========================
# Prediction API
# ===========================

@csrf_exempt
@require_POST
def predict_api(request):

    try:
        data = json.loads(request.body)

        city = data.get("city")
        fuel = data.get("fuel")

        # True only for "Analyze Market"
        use_live_market = data.get("use_live_market", False)

        if use_live_market:

            market = get_live_market_data()

            brent_crude = market["brent_crude"]
            usd_inr = market["usd_inr"]

        else:

            brent_crude = float(data.get("brent_crude"))
            usd_inr = float(data.get("usd_inr"))

        prediction = generate_prediction(
        city=city,
        fuel=fuel,
        brent_crude=brent_crude,
        usd_inr=usd_inr
    )

        return JsonResponse({
        "success": True,
        **prediction
    })

    except Exception as e:

        traceback.print_exc()

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=400)


# ===========================
# Live Market API
# ===========================

@require_GET
def market_api(request):

    try:
        market = get_live_market_data()

        return JsonResponse({
        "success": True,
        **market
    })

    except Exception as e:

        traceback.print_exc()

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
    
@require_GET
def dashboard_api(request):

    try:

        data = get_dashboard_data()

        return JsonResponse({
            "success": True,
            **data
        })

    except Exception as e:

        traceback.print_exc()

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)