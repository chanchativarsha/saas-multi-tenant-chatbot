from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
from django.conf import settings

class Plan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10,decimal_places=2)

    max_faqs = models.IntegerField(default=10,help_text="Maximum number of NLP-based FAQs allowed.")
    max_leads = models.IntegerField(default=100, help_text="Maximum number of form submissions allowed per month.")

    def __str__(self):
        return f"{self.name}, (Price: {self.price}/mo)"

class Subscription(models.Model):
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL,null=True,blank=True)
    active = models.BooleanField(default=True,help_text="Is the subscription currently active?")
    expires_on = models.DateField(null=True,blank=True,help_text="When the subscription expires")
    payment_gateway_id = models.CharField(max_length=100,blank=True,null=True)

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    def __str__(self):
        plan_name = self.plan.name if self.plan else "No Plan"
        status = "Active" if self.active else "Inactive"

        return f"{plan_name} ({status})"

class Client(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)

    website = models.URLField(
        max_length=200,
        blank=True,
        null=True,
        help_text="The client's main website (e.g., https://metascifor.com)"
    )

    industry = models.CharField(
        max_length=100,
        blank=True, null=True,
        help_text="The client's industry (e.g., 'Technology', 'Legal', 'Retail')"
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="clients",
        null=True, blank=True #optional for now, remove at production level
    )

    subscription = models.OneToOneField(
        Subscription, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="The client's current subscription package."
    )

    auto_create_schema = True

    def __str__(self):
        return self.name
    
class Domain(DomainMixin):

    pass