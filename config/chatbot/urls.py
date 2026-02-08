from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'faqs',views.FAQViewSet)
router.register(r'submissions',views.FormSubmissionViewSet)
router.register(r'analytics',views.AnalyticsLogViewSet)
router.register(r'rules',views.ChatRuleViewSet,basename='rule')

urlpatterns = [
    path('interact/',views.ChatbotInteractView.as_view(),name='chatbot-interact'),
    path('analytics/summary/',views.AnalyticsSummaryView.as_view(),name='analytics-summary'),
    path('',include(router.urls)),
]