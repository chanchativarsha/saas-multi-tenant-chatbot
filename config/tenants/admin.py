from django.contrib import admin
from .models import Client, Domain, Plan, Subscription

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name','schema_name','owner','website','subscription','created_on')
    list_filter = ('industry','created_on')
    search_fields = ('name','schema_name')

    fieldsets = (
        (None, {
            'fields': ('name', 'schema_name', 'owner')
        }),
        ('Company Info (Metadata)', {
            'description': "Store the client's website and industry for our records.",
            'fields': ('website', 'industry')
        }),
        ('SaaS Subscription',{
            'description':"Link the client to their subscription object. (Create the Subscription object first)",
            'fields':('subscription',)
        }), 
    )
@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain','tenant','is_primary')
    search_fields = ('domain',)
    list_editable = ('tenant','is_primary')

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name','price','max_faqs','max_leads')
    # list_filter = ('active','plan')
    search_fields = ('client__name','payment_gateway_id')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id','plan','get_client_name','active','expires_on')
    list_filter = ('active','plan')
    search_fields = ('client__name','payment_gateway_id')

    @admin.display(description='Client')
    def get_client_name(self, obj):

        client = Client.objects.filter(subscription=obj).first()
        return client.name if client else "Not Linked"