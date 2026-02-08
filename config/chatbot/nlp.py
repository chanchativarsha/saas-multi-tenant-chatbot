from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f'Error loading model: {e}')

def generate_vector(text: str):
    '''takes a string returns its vector embedding as python list'''
    if not model or not text:
        return None
    
    embedding = model.encode(text)
    return embedding.tolist()

def find_best_faq(user_question: str):
    '''finds most relevant faq for user's question from the client's database'''
    from .models import FAQ

    if not model:
        return None
    
    user_vector = np.array(generate_vector(user_question))

    all_faqs = FAQ.objects.exclude(question_vector = None)

    if not all_faqs.exists():
        return None
    
    faq_vectors = np.array([faq.question_vector for faq in all_faqs])

    user_vector_2d = user_vector.reshape(1, -1)
    similarities = cosine_similarity(user_vector_2d, faq_vectors)

    best_match_index = np.argmax(similarities)
    best_match_score = similarities[0][best_match_index]

    CONFIDENCE_THRESHOLD = 0.5

    if best_match_score >= CONFIDENCE_THRESHOLD:
        best_faq = all_faqs[int(best_match_index)]
        return best_faq
    else:
        return None
    

