from django.urls import path
from .views import DashboardView, FlowView
urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path("flow/", FlowView.as_view(), name="flow-builder"),
]
