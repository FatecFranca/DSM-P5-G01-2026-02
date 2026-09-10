from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt
from .db import get_db
from .models import AuthSession, User
from .security import decode

bearer = HTTPBearer()
def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    try: data = decode(credentials.credentials, "access")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid or expired access token")
    session = db.get(AuthSession, data["sid"])
    user = db.get(User, data["sub"])
    if not session or session.revoked_at or not user or session.user_id != user.id: raise HTTPException(401, "Session is not active")
    return user
