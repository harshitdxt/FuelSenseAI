from django.urls import path
from . import views


urlpatterns = [
    path("", views.home, name="home"),

    path("dashboard/", views.dashboard, name="dashboard"),

    path("history/", views.history, name="history"),

    path("about/", views.about, name="about"),

    path("predict/", views.predict, name="predict"),

    # API
    path("api/predict/", views.predict_api, name="predict_api"),

    path("api/market/", views.market_api, name="market_api"),

    path("api/dashboard/", views.dashboard_api, name="dashboard_api"),
]