from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


router = DefaultRouter()
router.register(r'plans',views.PlanViewSet,basename='plan')

urlpatterns = [
    path('',include(router.urls)),

    path('create-order/',views.CreateRazorpayOrderView.as_view(),name='create-razorpay-order'),

    #webhook URL add here later
]