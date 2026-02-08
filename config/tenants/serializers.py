from dj_rest_auth.serializers import LoginSerializer, TokenSerializer
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import Plan

class CustomLoginSerializer(LoginSerializer):
    """
    Custom serializer for login to add the client's schema name
    to the login response.
    """
    client_schema_name = serializers.CharField(read_only=True)
    debug_serializer = serializers.CharField(read_only=True)

    def validate(self,attrs):

        attrs = super().validate(attrs)
        user = attrs.get('user')

        if user and user.is_authenticated:
            try:
                client = user.clients.first()

                if client:
                    attrs['client_schema_name'] = client.schema_name
                else:
                    attrs['client_schema_name'] = None

            except Exception as e:
                attrs['client_schema_name'] = None
        
        return attrs    
    
class CustomTokenSerializer(TokenSerializer):
    client_schema_name = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()
    
    class Meta:
        model = Token
        fields = ('key','client_schema_name','subscription')
    
    def get_client_schema_name(self,obj):
        user =obj.user
        try:
            client = user.clients.first()

            if client:
                return client.schema_name

            else:
                return None
        except Exception as e:
            print(f'Error Occured: {e}')
            return None
    
    def get_subscription(self,obj):
        user = obj.user
        try:
            client = user.clients.select_related('subscription','subscription__plan').first()
            if client and client.subscription and client.subscription.plan:
                plan = client.subscription.plan

                return {
                    'plan_name':plan.name,
                    'status':'active' if client.subscription.active else "inactive",
                    'expires_on': client.subscription.expires_on,
                    'limits':{
                        'max_faqs':plan.max_faqs,
                        'max_leads':plan.max_leads
                    }
                }
            else:
                return None
        except Exception as e:
            print(f"[Debug] CustomTokenSerializer: ERROR finding subscription: {e}")
            return None
        
class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id","name","price","max_faqs","max_leads",]