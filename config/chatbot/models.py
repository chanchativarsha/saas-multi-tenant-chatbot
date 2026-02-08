from django.db import models
from .nlp import generate_vector
import json

class FAQ(models.Model):

    RESPONSE_TYPE_TEXT = 'text'
    RESPONSE_TYPE_RICH = 'rich'
    RESPONSE_TYPE_CHOICES = [
        (RESPONSE_TYPE_TEXT,'Simple Text'),
        (RESPONSE_TYPE_RICH,'Rich Options/Guided Flow')
    ]

    question = models.CharField(max_length=255)

    response_type = models.CharField(max_length=10, choices=RESPONSE_TYPE_CHOICES,default=RESPONSE_TYPE_TEXT)

    answer = models.TextField(blank=True,null=True,help_text="Used if respone is Simple Text")

    rich_response = models.JSONField(blank=True,null=True,help_text="Used if response type is 'Rich Options.'")

    created_at = models.DateTimeField(auto_now_add=True)

    #this will save the vector embeddings in database
    question_vector = models.JSONField(
        blank=True,
        null=True,
        editable=False,
        help_text="Auto-generated vector for search"
    )

    def __str__(self):
        return self.question
    
    #overriding the existing the save method, to implement the custom logic
    def save(self, *args, **kwargs):
        self.question_vector = generate_vector(self.question)
        super().save(*args, **kwargs)

class ChatRule(models.Model):
    """
    Stores the JSON-based rule flows for guided conversations.
    """
    node_id = models.CharField(max_length=100, unique=True,help_text="A unique ID for this rule node")
    rule_data = models.JSONField(default=dict, help_text="The JSON object defining the rule's message and options")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.node_id
    

class FormSubmission(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15,blank=True,null=True)
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Submission from {self.name}"
    
class AnalyticsLog(models.Model):
    event_type = models.CharField(max_length=100)
    details = models.JSONField(blank=True,null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.event_type
