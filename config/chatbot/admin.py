# chatbot/admin.py
from django.contrib import admin
from .models import FAQ, FormSubmission, AnalyticsLog

admin.site.register(FAQ)
admin.site.register(FormSubmission)
admin.site.register(AnalyticsLog)