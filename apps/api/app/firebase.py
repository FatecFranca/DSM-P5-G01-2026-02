from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .config import get_settings


class FirebaseAuthError(Exception):
    def __init__(self, message: str, status: int = 401):
        super().__init__(message); self.status = status


def verify_firebase_token(value: str) -> dict:
    """Valida assinatura, validade, emissor e audiência (projeto) do ID token do Firebase; exige e-mail verificado."""
    project = get_settings().firebase_project_id
    if not project: raise FirebaseAuthError("Firebase sign-in is not configured", 503)
    try: claims = id_token.verify_firebase_token(value, google_requests.Request(), audience=project)
    except ValueError: raise FirebaseAuthError("Invalid Firebase token")
    if not claims.get("email") or not claims.get("email_verified"): raise FirebaseAuthError("Account email is not verified")
    return claims
