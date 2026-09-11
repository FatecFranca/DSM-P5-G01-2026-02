from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..content_ids import canonical_exercise_id, canonical_lesson_id
from ..db import get_db
from ..deps import current_user
from ..models import User
from .service import rank_next

router = APIRouter(prefix="/v1/ranking", tags=["ranking"])


class RankingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=1, max_length=64)
    unit_id: str | None = Field(default=None, max_length=64)
    candidate_item_ids: list[str] = Field(min_length=1, max_length=200)
    session_size: int = Field(default=8, ge=1, le=50)
    now: datetime | None = None


class RankedItemOut(BaseModel):
    item_id: str; p_recall: float; rank: int; source: str; reason: str


class RankingResponse(BaseModel):
    request_id: str; source: str; model_version: str | None; policy_version: str; served_at: datetime; items: list[RankedItemOut]


@router.post("/next", response_model=RankingResponse)
def next_items(body: RankingRequest, user: User = Depends(current_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    candidates = list(dict.fromkeys(canonical_exercise_id(item_id) for item_id in body.candidate_item_ids))
    try:
        result = rank_next(db, user, settings, session_id=body.session_id, unit_id=canonical_lesson_id(body.unit_id) if body.unit_id else None, candidate_item_ids=candidates, session_size=body.session_size, now=body.now)
    except LookupError as error:
        raise HTTPException(422, str(error))
    return RankingResponse(request_id=result.request_id, source=result.source, model_version=result.model_version, policy_version=result.policy_version, served_at=result.served_at,
                           items=[RankedItemOut(item_id=item.item_id, p_recall=item.p_recall, rank=item.rank, source=item.source, reason=item.reason) for item in result.items])
