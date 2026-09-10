import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from .content_ids import canonical_exercise_id, canonical_lesson_id
from .content_types import normalize_exercise_type
from .db import get_db
from .deps import current_user
from .models import Attempt, Progress, SyncEvent, User
from .schemas import DEPRECATED_ATTEMPT_FIELDS, SyncPush, SyncPushResult

logger = logging.getLogger(__name__)
REVIEW_STATUSES = {"review", "needs_review"}

def comparable(value):
    return value.replace(tzinfo=None)

def canonicalized(value: str, canonical) -> str:
    # Clientes antigos enviam IDs legados; o log mede quando o alias pode ser removido.
    result = canonical(value)
    if result != value: logger.info("deprecated_id %s -> %s", value, result)
    return result

def normalized_types(values: list[str]) -> list[str]:
    kinds = (normalize_exercise_type(value) for value in values)
    return list(dict.fromkeys(kind.value for kind in kinds if kind))

router = APIRouter(prefix="/v1", tags=["learning"])

@router.get("/progress")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Progress).where(Progress.user_id == user.id).order_by(Progress.lesson_id)).all()
    return {"items": [{"lesson_id": x.lesson_id, "status": x.status, "completed_exercises": x.completed_exercises, "completed_types": x.completed_types or [], "attempts": x.attempts, "correct_attempts": x.correct_attempts, "accuracy": x.accuracy, "review_count": x.review_count, "last_practiced_at": x.last_practiced_at, "next_review_at": x.next_review_at, "updated_at": x.updated_at} for x in items]}

@router.get("/attempts")
def attempts(limit: int = Query(default=100, ge=1, le=500), user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.occurred_at.desc()).limit(limit)).all()
    return {"items": [{
        "client_attempt_id": x.client_attempt_id, "exercise_id": x.exercise_id, "lesson_id": x.lesson_id, "exercise_type": x.exercise_type,
        "answer": x.answer, "correct": x.correct, "duration_ms": x.duration_ms, "served_model_version": x.served_model_version, "occurred_at": x.occurred_at,
    } for x in items]}

@router.post("/sync/push", response_model=SyncPushResult)
def push(body: SyncPush, user: User = Depends(current_user), db: Session = Depends(get_db)):
    accepted = duplicates = 0
    accepted_ids: list[str] = []
    for event in body.events:
        existing = db.scalar(select(SyncEvent).where(SyncEvent.user_id == user.id, SyncEvent.client_event_id == event.client_event_id))
        if existing:
            duplicates += 1
            accepted_ids.append(event.client_event_id)
            continue
        if event.type == "attempt":
            event.payload.exercise_id = canonicalized(event.payload.exercise_id, canonical_exercise_id)
            event.payload.lesson_id = canonicalized(event.payload.lesson_id, canonical_lesson_id) if event.payload.lesson_id else None
            kind = normalize_exercise_type(event.payload.exercise_type) if event.payload.exercise_type else None
            event.payload.exercise_type = kind.value if kind else None
            payload = event.payload.model_dump(mode="json", exclude=DEPRECATED_ATTEMPT_FIELDS)
            prior = db.scalar(select(Attempt).where(Attempt.user_id == user.id, Attempt.client_attempt_id == event.payload.client_attempt_id))
            if prior:
                duplicates += 1
                accepted_ids.append(event.client_event_id)
                continue
            db.add(Attempt(user_id=user.id, occurred_at=event.occurred_at, **event.payload.model_dump(exclude=DEPRECATED_ATTEMPT_FIELDS)))
        else:
            event.payload.lesson_id = canonicalized(event.payload.lesson_id, canonical_lesson_id)
            event.payload.completed_types = normalized_types(event.payload.completed_types)
            payload = event.payload.model_dump(mode="json")
            item = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.lesson_id == event.payload.lesson_id))
            if not item:
                db.add(Progress(user_id=user.id, updated_at=event.occurred_at, **event.payload.model_dump()))
            else:
                # Tipos concluídos só acumulam; o resto é last-write-wins pelo relógio do cliente.
                item.completed_types = list(dict.fromkeys([*(item.completed_types or []), *event.payload.completed_types]))
                if comparable(event.occurred_at) >= comparable(item.updated_at):
                    # Uma lição concluída só sai desse estado para revisão, nunca de volta para "em andamento".
                    regression = item.status == "completed" and event.payload.status not in REVIEW_STATUSES | {"completed", "mastered"}
                    item.status = "completed" if regression else event.payload.status
                    item.completed_exercises = max(item.completed_exercises, event.payload.completed_exercises); item.attempts = max(item.attempts, event.payload.attempts); item.correct_attempts = max(item.correct_attempts, event.payload.correct_attempts); item.accuracy = event.payload.accuracy; item.review_count = max(item.review_count, event.payload.review_count); item.last_practiced_at = event.payload.last_practiced_at; item.next_review_at = event.payload.next_review_at; item.updated_at = event.occurred_at
        db.add(SyncEvent(user_id=user.id, client_event_id=event.client_event_id, type=event.type, payload=payload, occurred_at=event.occurred_at))
        accepted += 1
        accepted_ids.append(event.client_event_id)
    db.commit()
    return SyncPushResult(accepted=accepted, duplicates=duplicates, accepted_ids=accepted_ids)

@router.get("/sync/pull")
def pull(cursor: int = Query(default=0, ge=0), limit: int = Query(default=200, ge=1, le=500), user: User = Depends(current_user), db: Session = Depends(get_db)):
    events = db.scalars(select(SyncEvent).where(SyncEvent.user_id == user.id, SyncEvent.id > cursor).order_by(SyncEvent.id).limit(limit)).all()
    return {"events": [{"cursor": e.id, "client_event_id": e.client_event_id, "type": e.type, "payload": e.payload, "occurred_at": e.occurred_at} for e in events], "next_cursor": events[-1].id if events else cursor, "has_more": len(events) == limit}
