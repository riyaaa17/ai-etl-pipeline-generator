import firebase_admin
from firebase_admin import auth as firebase_auth

# Explicitly set project ID since we're using ADC instead of a service account key
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={
        "projectId": "logical-hallway-499706-c3"
    })

def verify_token(id_token: str):
    """
    Verifies a Firebase ID token sent from the frontend.
    Returns the decoded token (contains uid, email, etc.) if valid.
    """
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Invalid or expired token: {e}")