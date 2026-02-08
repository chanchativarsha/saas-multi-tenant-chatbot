from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Plan
from .serializers import PlanSerializer
import razorpay

razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID,settings.RAZORPAY_KEY_SECRET))

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]

class CreateRazorpayOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self,request,*args,**kwargs):
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({"error": "Plan ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)
        
        amount_in_paise = int(plan.price*100)

        order_data = {
            "amount": amount_in_paise,
            "currency":"INR",
            "receipt":f"order_rcptid_{request.user.id}_{plan_id}",
            "notes":{
                "client_id":request.tenant.id,
                "user_id":request.user.id,
                "plan": plan.name
            }
        }

        try:
            order = razorpay_client.order.create(data=order_data)
        except Exception as e:
            return Response({"error": f"Error creating Razorpay order: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "order_id":order['id'],
            "amount": order['amount'],
            "currency":order['currency'],
            "razorpay_key_id":settings.RAZORPAY_KEY_ID
        }, status=status.HTTP_201_CREATED)
