from rest_framework import permissions

class IsAuthenticatedOrWriteOnly(permissions.BasePermission):
    """
    Custom permission to allow unauthenticated POST requests,
    but require authentication for all other methods (GET, PUT, DELETE).
    
    - Used for the FormSubmissionViewSet:
    -   ALLOW: Anonymous users (from the widget) to POST new submissions.
    -   SECURE: Authenticated clients (from the dashboard) to GET their submissions.
    """

    def has_permission(self, request, view):
        # Allow any 'POST' request (e.g., creating a new submission)
        if request.method == 'POST':
            return True
        
        # For all other methods (GET, PUT, DELETE, etc.),
        # ensure the user is authenticated.
        return request.user and request.user.is_authenticated