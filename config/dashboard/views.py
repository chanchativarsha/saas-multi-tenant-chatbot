from django.views.generic import TemplateView
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.utils.decorators import method_decorator

class DashboardView(TemplateView):
    template_name = "dashboard/index.html"

@method_decorator(xframe_options_sameorigin, name="dispatch")
class FlowView(TemplateView):
    template_name = "dashboard/flow.html"