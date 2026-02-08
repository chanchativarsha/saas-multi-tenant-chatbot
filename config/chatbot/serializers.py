from rest_framework import serializers
from .models import FAQ, FormSubmission, AnalyticsLog, ChatRule

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id','question','response_type','answer','rich_response','created_at']
        read_only_fields = ['created_at']

class ChatRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRule 
        fields = ['id','node_id','rule_data']

class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSubmission
        fields = ['id','name','email','phone','message','submitted_at']
        read_only_fields = ['submitted_at']

class AnalyticsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsLog
        field = ['id','event_type','details','timestamp']
        read_only_fields = ['timestamp']