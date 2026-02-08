from rest_framework.views import APIView 
from rest_framework.response import Response
from rest_framework import viewsets, permissions, serializers
from rest_framework.authentication import TokenAuthentication
from .models import FAQ, FormSubmission, AnalyticsLog, ChatRule
from .serializers import FAQSerializer, FormSubmissionSerializer, AnalyticsLogSerializer, ChatRuleSerializer
from .nlp import find_best_faq
import json
from django.utils import timezone
from .permissions import IsAuthenticatedOrWriteOnly

class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """
        Custom logic that runs when a new FAQ is created (POST).
        We check the plan limits here.
        """
        tenant = self.request.tenant
        
        if tenant.subscription and tenant.subscription.plan:
            plan = tenant.subscription.plan
            
            current_faq_count = FAQ.objects.count()
            
            if current_faq_count >= plan.max_faqs:
                # Block the request if the limit is reached
                raise serializers.ValidationError({
                    "error": f"FAQ limit of {plan.max_faqs} reached for your plan. Please upgrade to add more."
                })
        
        serializer.save()

class FormSubmissionViewSet(viewsets.ModelViewSet):
    queryset = FormSubmission.objects.all()
    serializer_class = FormSubmissionSerializer
    http_method_names = ['get','head','options','post']
    permission_classes = [IsAuthenticatedOrWriteOnly]

class AnalyticsLogViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsLog.objects.all()
    serializer_class = AnalyticsLogSerializer
    http_method_names = ['get','head','options']
    permission_classes = [permissions.IsAuthenticated]

class ChatRuleViewSet(viewsets.ModelViewSet):
    queryset = ChatRule.objects.all()
    serializer_class = ChatRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    

class ChatbotInteractView(APIView):
    '''Takes user's message and 
        1. Finds the best FAQ using the NLP engine.
        2. (Future) Triggers a rule-based flow.'''
    
    permission_classes = [permissions.AllowAny]
    
    def post(self,request, *args, **kwargs):

        interaction_type = request.data.get('type','text')
        payload = request.data.get('payload')
        #user_message = request.data.get('message', None)

        if not payload:
            return Response(
                {"answer":"No input received."},
                status=400
            )
        
        AnalyticsLog.objects.create(
            event_type=f'interaction_{interaction_type}',
            details={"message": payload}
        )

        if interaction_type == 'text':
            #----NLP--PATH----
            best_faq = find_best_faq(payload)

            if best_faq:
                if best_faq.response_type == FAQ.RESPONSE_TYPE_RICH:
                    return Response(best_faq.rich_response)
                else:
                    return ResourceWarning({
                        "question":best_faq.question,
                        "answer": best_faq.answer
                    })
            else:
                return Response({
                    "question": "Not Found",
                    "answer":"I'm sorry, I don't have a confident answer for that. You can try rephrasing, or contact our support team."
                })
        
        elif interaction_type == 'rule':
            node_id = payload

            if node_id == 'show_form':
                return Response({
                    "type":"show_form",
                    "message":"Please fill out the form below and our team will get back to you."
                })
            
            try:
                rule_node = ChatRule.objects.get(node_id=node_id)
                return Response(rule_node.rule_data)
            
            except ChatRule.DoesNotExist:
                return Response({"answer":"Sorry, that option is not valid."},status=404)
            except json.JSONDecodeError:
                return Response({"answer":"Error: Chatbot configuration is invalid."},status=500)
            
class AnalyticsSummaryView(APIView):
    """
    Provides a high level summary of analytics for
    the client dashboard homepage.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    def get(self,request, *args, **kwargs):
        
        # 1. Total Leads (all-time)
        total_leads = FormSubmission.objects.count()
        
        # 2. Leads Captured Today
        today = timezone.now().date()
        leads_today = FormSubmission.objects.filter(
            submitted_at__date = today
        ).count()

        # 3. Chats Started
        chats_started = AnalyticsLog.objects.filter(
            event_type='interaction_rule',
            details__message='welcome_node'
        ).count()

        # 4. FAQs Clicked/Asked (NLP interactions)
        faqs_clicked = AnalyticsLog.objects.filter(
            event_type='interaction_text'
        ).count()

        # 5. Chat Redirects (Forms shown)
        # 'interaction_rule' with payload 'show_form'
        chat_redirects = AnalyticsLog.objects.filter(
            event_type='interaction_rule',
            details__message='show_form'
        ).count()


        summary_data = {
            'totalLeadsCaptured': total_leads,
            'leadsCapturedToday': leads_today,
            'chatsStarted': chats_started,
            'faqsClicked': faqs_clicked,
            'chatRedirects': chat_redirects
        }

        return Response(summary_data)
