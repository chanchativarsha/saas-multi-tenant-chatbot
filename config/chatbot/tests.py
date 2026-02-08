from django.test import TestCase, Client as TestClient
from django.db import connection
from tenants.models import Client, Domain
from chatbot.models import FAQ
import json

# ai-generated specialized test case for the chatbot
class ChatbotNLPTestCase(TestCase):
    """
    Test suite for the multi-tenant NLP engine.
    Demonstrates asking various questions to different clients
    and receiving the correct, isolated answers, using Meta Scifor (a software company)
    as a specific example with updated details.
    """

    @classmethod
    def setUpTestData(cls):
        """
        Set up the test clients and their unique FAQs once for the entire test class.
        """
        print("\n--- Setting up Test Environment ---")

        # --- Create Client A: Meta Scifor (Using User's Details) ---
        cls.client_a_schema = 'meta_scifor_a' # UPDATED schema name
        cls.client_a = Client.objects.create(name='Meta Scifor', schema_name=cls.client_a_schema) # UPDATED name and schema
        Domain.objects.create(tenant=cls.client_a, domain='chatbot.metascifor.com', is_primary=True) # UPDATED domain
        print(f"Created Client: Meta Scifor (schema: {cls.client_a_schema})") # UPDATED print

        # Switch to Client A's schema to add FAQs
        connection.set_tenant(cls.client_a)
        # FAQs tailored to a software development company
        cls.metascifor_faqs = [
            {"q": "What kind of software projects does Meta Scifor handle?", "a": "We specialize in custom software development, including web applications, mobile apps, and AI/ML solutions."}, # Updated name in Q
            {"q": "What technologies do you use?", "a": "Our team is proficient in Python (Django, Flask), JavaScript (React, Node.js), Java, cloud platforms (AWS, Azure), and various database technologies."},
            {"q": "What is your development process?", "a": "We follow agile methodologies, focusing on iterative development, regular communication, and client feedback."},
            {"q": "Can you provide a project quote?", "a": "Yes, please use our contact form to provide details about your project, and we'll get back to you with an estimate."},
            {"q": "Where is Meta Scifor located?", "a": "Our main development center is in Bangalore, India."}, # Updated name in Q
            {"q": "How can I contact Meta Scifor for project inquiries?", "a": "The best way is to fill out the project inquiry form on our website or email sales@metascifor.test."}, # Updated name in Q
            {"q": "Do you offer post-launch support?", "a": "Yes, we offer various support and maintenance packages to ensure your software runs smoothly after launch."},
        ]
        for faq_data in cls.metascifor_faqs:
            FAQ.objects.create(question=faq_data["q"], answer=faq_data["a"])
        print(f"Added {len(cls.metascifor_faqs)} FAQs for Meta Scifor.") # UPDATED print

        # --- IMPORTANT FIX: Switch back to public schema BEFORE creating Client B ---
        connection.set_schema_to_public()
        print("Switched back to public schema.")

        # --- Create Client B: Global Goods (Unchanged) ---
        cls.client_b_schema = 'globalgoods'
        cls.client_b = Client.objects.create(name='Global Goods', schema_name=cls.client_b_schema)
        Domain.objects.create(tenant=cls.client_b, domain='globalgoods.test', is_primary=True)
        print(f"Created Client: Global Goods (schema: {cls.client_b_schema})")

        # Switch to Client B's schema to add FAQs
        connection.set_tenant(cls.client_b)
        cls.globalgoods_faqs = [
            {"q": "What products do you sell?", "a": "We sell sustainable home goods and organic foods."},
            {"q": "Where are you located?", "a": "We are an online-only store based out of Seattle."},
            {"q": "How do I track my order?", "a": "You can track your order using the link in your shipping confirmation email."},
            {"q": "What is your return policy?", "a": "We offer a 30-day return policy on most items."},
            {"q": "Do you ship internationally?", "a": "Yes, we ship to most countries worldwide."},
        ]
        for faq_data in cls.globalgoods_faqs:
            FAQ.objects.create(question=faq_data["q"], answer=faq_data["a"])
        print(f"Added {len(cls.globalgoods_faqs)} FAQs for Global Goods.")

        # --- Reset connection to public schema ---
        connection.set_schema_to_public()
        print("--- Test Setup Complete ---")

    def test_multi_tenant_nlp_engine(self):
        """
        Simulates asking questions to both clients and verifies the answers.
        """
        print("\n--- Starting NLP Engine Test ---")
        client = TestClient() # Django's built-in test client

        # --- Test Cases for Client A (Meta Scifor) ---
        metascifor_tests = [
            {"ask": "What types of software do you build?", "expect": "We specialize in custom software development, including web applications, mobile apps, and AI/ML solutions."},
            {"ask": "What programming languages do you use?", "expect": "Our team is proficient in Python (Django, Flask), JavaScript (React, Node.js), Java, cloud platforms (AWS, Azure), and various database technologies."},
            {"ask": "How do you manage projects?", "expect": "We follow agile methodologies, focusing on iterative development, regular communication, and client feedback."},
            {"ask": "How can I get a price estimate?", "expect": "Yes, please use our contact form to provide details about your project, and we'll get back to you with an estimate."},
            {"ask": "Where is your office located?", "expect": "Our main development center is in Bangalore, India."},
            {"ask": "How do I contact sales?", "expect": "The best way is to fill out the project inquiry form on our website or email sales@metascifor.test."},
            {"ask": "Do you provide maintenance?", "expect": "Yes, we offer various support and maintenance packages to ensure your software runs smoothly after launch."},
        ]

        print("\n--- Testing Client A: Meta Scifor ---") # UPDATED print
        for test_case in metascifor_tests:
            print(f"\nUser Asks (Meta Scifor): '{test_case['ask']}'") # UPDATED print
            print(f"Expected Answer:       '{test_case['expect']}'")

            response = client.post(
                '/api/v1/interact/',
                data=json.dumps({"type": "text", "payload": test_case['ask']}),
                content_type='application/json',
                HTTP_X_CLIENT_ID=self.client_a_schema # UPDATED to use the correct schema variable ('meta_scifor_a')
            )

            self.assertEqual(response.status_code, 200, f"API failed for question: {test_case['ask']}")
            response_data = response.json()
            actual_answer = response_data.get('answer', 'ERROR: No answer found in response')
            print(f"Actual Answer:         '{actual_answer}'")
            self.assertEqual(actual_answer, test_case['expect'])
            print(">>> Result: CORRECT <<<")

        # --- Test Cases for Client B (Global Goods - Unchanged) ---
        globalgoods_tests = [
            {"ask": "What kind of items do you have?", "expect": "We sell sustainable home goods and organic foods."},
            {"ask": "Where is your store?", "expect": "We are an online-only store based out of Seattle."},
            {"ask": "How do returns work?", "expect": "We offer a 30-day return policy on most items."},
            {"ask": "Where is my package?", "expect": "You can track your order using the link in your shipping confirmation email."},
            {"ask": "Do you deliver outside the US?", "expect": "Yes, we ship to most countries worldwide."},
        ]

        print("\n--- Testing Client B: Global Goods ---")
        for test_case in globalgoods_tests:
            print(f"\nUser Asks (Global Goods): '{test_case['ask']}'")
            print(f"Expected Answer:         '{test_case['expect']}'")

            response = client.post(
                '/api/v1/interact/',
                data=json.dumps({"type": "text", "payload": test_case['ask']}),
                content_type='application/json',
                HTTP_X_CLIENT_ID=self.client_b_schema # Use Client B's header
            )

            self.assertEqual(response.status_code, 200, f"API failed for question: {test_case['ask']}")
            response_data = response.json()
            actual_answer = response_data.get('answer', 'ERROR: No answer found in response')
            print(f"Actual Answer:           '{actual_answer}'")
            self.assertEqual(actual_answer, test_case['expect'])
            print(">>> Result: CORRECT <<<")

        print("\n--- NLP Engine Test Complete ---")

