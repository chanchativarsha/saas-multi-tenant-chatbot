from django.db import connection
from django.utils import timezone
from django.http import Http404, JsonResponse
from .models import Client
from chatbot.models import FormSubmission

class HeaderTenantMiddleware:
    """
    Middleware to select the tenant based on X-Client-ID header.
    """
    
    
    def __init__(self,get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        connection.set_schema_to_public()
        client_id_header = request.headers.get('X-Client-ID')
        
        if not client_id_header:
            return self.get_response(request)
        
        try:
            tenant = Client.objects.select_related('subscription','subscription__plan').get(schema_name=client_id_header)
        except Client.DoesNotExist:
            return JsonResponse({"error": f"Client with ID '{client_id_header}' does not exist."}, status=404)

        is_public_api = request.path.startswith('/api/v1/interact') or \
                            request.path.startswith('api/v1/submissions')
        
        if is_public_api:
            subscription = tenant.subscription

            if not subscription:
                return JsonResponse({"error": "No subscription found. Please subscribe."}, status=402) # 402 Payment Required
            
            if not subscription.active:
                return JsonResponse({"error": "Subscription is inactive. Please contact support."}, status=402)
            
            if subscription.expires_on and subscription.expires_on < timezone.now().date():
                subscription.active= False
                subscription.save()
                return JsonResponse({"error": "Subscription has expired. Please renew."}, status=402)
        
        connection.set_tenant(tenant)
        request.tenant = tenant

        if request.path.startswith('/api/v1/submissions/') and request.method == 'POST':
            if tenant.subscription and tenant.subscription.plan:
                plan = tenant.subscription.plan

                current_leads = FormSubmission.objects.count()
                if current_leads >= plan.max_leads:
                    return JsonResponse({
                        "error": f"Lead limit of {plan.max_leads} reached for your plan. Please upgrade."
                    }, status=402)
        
        response = self.get_response(request)

        connection.set_schema_to_public()
        return response