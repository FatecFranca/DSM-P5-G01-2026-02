import hashlib, uuid
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from .config import get_settings

hasher = PasswordHasher()

def hash_password(value: str) -> str: return hasher.hash(value)
def verify_password(hashed: str, value: str) -> bool:
    try: return hasher.verify(hashed, value)
    except VerifyMismatchError: return False

def jti_hash(jti: str) -> str: return hashlib.sha256(jti.encode()).hexdigest()

def token(user_id: str, session_id: str, token_type: str, lifetime: timedelta, jti: str | None = None) -> tuple[str, str]:
    settings = get_settings(); now = datetime.now(timezone.utc); jti = jti or str(uuid.uuid4())
    encoded = jwt.encode({"sub": user_id, "sid": session_id, "type": token_type, "jti": jti, "iat": now, "exp": now + lifetime}, settings.jwt_secret, algorithm="HS256")
    return encoded, jti

def decode(value: str, expected: str) -> dict:
    data = jwt.decode(value, get_settings().jwt_secret, algorithms=["HS256"])
    if data.get("type") != expected: raise jwt.InvalidTokenError("invalid token type")
    return data
