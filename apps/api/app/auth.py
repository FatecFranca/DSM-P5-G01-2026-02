from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
import jwt
from .config import get_settings
from .db import get_db
from .models import AuthSession, User
from .schemas import FirebaseLogin, LoginCredentials, RefreshRequest, Registration, Tokens
from .firebase import FirebaseAuthError, verify_firebase_token
from .security import decode, hash_password, jti_hash, token, verify_password

router = APIRouter(prefix="/v1/auth", tags=["authentication"])

def issue(db: Session, user: User) -> Tokens:
    settings = get_settings(); session = AuthSession(user_id=user.id, refresh_jti_hash="", expires_at=datetime.now(timezone.utc)+timedelta(days=settings.refresh_token_days))
    db.add(session); db.flush()
    access, _ = token(user.id, session.id, "access", timedelta(minutes=settings.access_token_minutes))
    refresh, jti = token(user.id, session.id, "refresh", timedelta(days=settings.refresh_token_days))
    session.refresh_jti_hash = jti_hash(jti); db.commit()
    return Tokens(access_token=access, refresh_token=refresh, expires_in=settings.access_token_minutes*60)

@router.post("/register", response_model=Tokens, status_code=201)
def register(data: Registration, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)): raise HTTPException(409, "Email already registered")
    user = User(email=email, name=data.name, password_hash=hash_password(data.password)); db.add(user); db.flush()
    return issue(db, user)

@router.post("/login", response_model=Tokens)
def login(data: LoginCredentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(user.password_hash, data.password): raise HTTPException(401, "Invalid credentials")
    return issue(db, user)

@router.post("/refresh", response_model=Tokens)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    try: claims = decode(data.refresh_token, "refresh")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid or expired refresh token")
    session = db.get(AuthSession, claims["sid"]); user = db.get(User, claims["sub"])
    if not session or not user or session.user_id != user.id or session.revoked_at or session.refresh_jti_hash != jti_hash(claims["jti"]): raise HTTPException(401, "Refresh token is no longer active")
    settings = get_settings()
    access, _ = token(user.id, session.id, "access", timedelta(minutes=settings.access_token_minutes))
    refresh_value, new_jti = token(user.id, session.id, "refresh", timedelta(days=settings.refresh_token_days))
    session.refresh_jti_hash = jti_hash(new_jti); session.expires_at = datetime.now(timezone.utc)+timedelta(days=settings.refresh_token_days); db.commit()
    return Tokens(access_token=access, refresh_token=refresh_value, expires_in=settings.access_token_minutes*60)

@router.post("/logout", status_code=204)
def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    try: claims = decode(data.refresh_token, "refresh")
    except jwt.InvalidTokenError: return Response(status_code=204)
    session = db.get(AuthSession, claims["sid"])
    if session and session.refresh_jti_hash == jti_hash(claims["jti"]): session.revoked_at = datetime.now(timezone.utc); db.commit()
    return Response(status_code=204)

@router.post("/firebase", response_model=Tokens)
def firebase_login(data: FirebaseLogin, db: Session = Depends(get_db)):
    try: claims = verify_firebase_token(data.id_token)
    except FirebaseAuthError as error: raise HTTPException(error.status, str(error))
    uid, email = claims["sub"], claims["email"].lower()
    user = db.scalar(select(User).where(User.firebase_uid == uid))
    if not user:
        # Vincula a conta do Firebase a um cadastro existente do mesmo e-mail (verificado); senão cria uma nova.
        user = db.scalar(select(User).where(User.email == email))
        if user: user.firebase_uid = uid
        else:
            user = User(email=email, name=(claims.get("given_name") or claims.get("name") or "").strip()[:80] or None, firebase_uid=uid); db.add(user)
        db.flush()
    return issue(db, user)
