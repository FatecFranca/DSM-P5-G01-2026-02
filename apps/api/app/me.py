from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .db import get_db
from .deps import current_user
from .models import User

router = APIRouter(prefix="/v1/me", tags=["account"])


class ResearchConsent(BaseModel):
    consent: bool


@router.get("/research-consent")
def read_consent(user: User = Depends(current_user)):
    return {"consent": user.research_consent, "consented_at": user.research_consent_at}


@router.put("/research-consent")
def write_consent(body: ResearchConsent, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Consentimento separado do cadastro (PRIVACY_AND_ACCESSIBILITY.md): só tentativas de quem consentiu entram no treino."""
    user.research_consent = body.consent
    user.research_consent_at = datetime.now(timezone.utc) if body.consent else None
    db.commit()
    return {"consent": user.research_consent, "consented_at": user.research_consent_at}
