import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from .content import PUBLISHED
from .content_ids import canonical_exercise_id, canonical_lesson_id
from .content_types import normalize_exercise_type
from .db import get_db
from .deps import current_user
from .models import Attempt, Item, ItemState, Progress, SyncEvent, Unit, User
from .schemas import DEPRECATED_ATTEMPT_FIELDS, DEPRECATED_PROGRESS_FIELDS, SyncPush, SyncPushResult

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

def require(db: Session, model, identifier: str, event_id: str):
    if db.get(model, identifier) is None:
        raise HTTPException(422, f"{event_id}: {model.__tablename__} {identifier} não existe no catálogo")

def progress_dict(x: Progress) -> dict:
    return {"unit_id": x.unit_id, "status": x.status, "completed_exercises": x.completed_exercises, "completed_types": x.completed_types or [], "attempts": x.attempts, "correct_attempts": x.correct_attempts, "accuracy": x.accuracy, "review_count": x.review_count, "last_practiced_at": x.last_practiced_at, "next_review_at": x.next_review_at, "updated_at": x.updated_at}

def item_state_dict(x: ItemState) -> dict:
    return {"item_id": x.item_id, "unit_id": x.unit_id, "strength": x.strength, "half_life_hours": x.half_life_hours, "due_at": x.due_at, "reps": x.reps, "lapses": x.lapses, "consecutive_correct": x.consecutive_correct, "last_result": x.last_result, "last_seen_at": x.last_seen_at, "updated_at": x.updated_at}

def recompute_progress(db: Session, user_id: str, unit_id: str, occurred_at) -> None:
    """O progresso da unidade é um resumo dos item_states (docs/adr/0003); espelha deriveProgress do app."""
    items = [item for item in db.scalars(select(Item).where(Item.unit_id == unit_id)).all() if item.review_status in PUBLISHED]
    states = {state.item_id: state for state in db.scalars(select(ItemState).where(ItemState.user_id == user_id, ItemState.unit_id == unit_id)).all()}
    known = [(item, states[item.id]) for item in items if item.id in states]
    mastered = [(item, state) for item, state in known if state.consecutive_correct >= 1]
    completed = bool(items) and len(mastered) == len(items)
    due = any(comparable(state.due_at) <= comparable(occurred_at) for _, state in mastered)
    progress = db.scalar(select(Progress).where(Progress.user_id == user_id, Progress.unit_id == unit_id))
    if not progress:
        progress = Progress(user_id=user_id, unit_id=unit_id, status="not_started", completed_exercises=0, updated_at=occurred_at); db.add(progress)
    attempts = sum(state.reps for _, state in known)
    progress.status = "needs_review" if completed and due else "completed" if completed else "in_progress" if known else "not_started"
    progress.completed_exercises = len(mastered); progress.completed_types = list(dict.fromkeys(item.type for item, _ in mastered))
    progress.attempts = attempts; progress.correct_attempts = sum(state.reps - state.lapses for _, state in known); progress.accuracy = progress.correct_attempts / attempts if attempts else None
    progress.last_practiced_at = max((state.last_seen_at for _, state in known), default=None, key=comparable)
    progress.next_review_at = min((state.due_at for _, state in mastered), default=None, key=comparable)
    if comparable(occurred_at) >= comparable(progress.updated_at): progress.updated_at = occurred_at

router = APIRouter(prefix="/v1", tags=["learning"])

@router.get("/progress")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Progress).where(Progress.user_id == user.id).order_by(Progress.unit_id)).all()
    return {"items": [progress_dict(x) for x in items]}

@router.get("/item-states")
def item_states(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(ItemState).where(ItemState.user_id == user.id).order_by(ItemState.item_id)).all()
    return {"items": [item_state_dict(x) for x in items]}

@router.get("/attempts")
def attempts(limit: int = Query(default=100, ge=1, le=500), user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.occurred_at.desc()).limit(limit)).all()
    return {"items": [{
        "client_attempt_id": x.client_attempt_id, "item_id": x.item_id, "unit_id": x.unit_id, "exercise_type": x.exercise_type,
        "answer": x.answer, "correct": x.correct, "duration_ms": x.duration_ms, "occurred_at": x.occurred_at,
        "session_id": x.session_id, "position_in_session": x.position_in_session, "attempt_index_in_item": x.attempt_index_in_item, "audio_repeats": x.audio_repeats,
        "time_to_first_interaction_ms": x.time_to_first_interaction_ms, "served_by": x.served_by, "served_policy_version": x.served_policy_version, "served_model_version": x.served_model_version,
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
            event.payload.item_id = canonicalized(event.payload.item_id, canonical_exercise_id)
            event.payload.unit_id = canonicalized(event.payload.unit_id, canonical_lesson_id) if event.payload.unit_id else None
            kind = normalize_exercise_type(event.payload.exercise_type) if event.payload.exercise_type else None
            event.payload.exercise_type = kind.value if kind else None
            require(db, Item, event.payload.item_id, event.client_event_id)
            if event.payload.unit_id: require(db, Unit, event.payload.unit_id, event.client_event_id)
            payload = event.payload.model_dump(mode="json", exclude=DEPRECATED_ATTEMPT_FIELDS)
            prior = db.scalar(select(Attempt).where(Attempt.user_id == user.id, Attempt.client_attempt_id == event.payload.client_attempt_id))
            if prior:
                duplicates += 1
                accepted_ids.append(event.client_event_id)
                continue
            db.add(Attempt(user_id=user.id, occurred_at=event.occurred_at, **event.payload.model_dump(exclude=DEPRECATED_ATTEMPT_FIELDS)))
        elif event.type == "item_state":
            event.payload.item_id = canonicalized(event.payload.item_id, canonical_exercise_id)
            event.payload.unit_id = canonicalized(event.payload.unit_id, canonical_lesson_id) if event.payload.unit_id else None
            require(db, Item, event.payload.item_id, event.client_event_id)
            if event.payload.unit_id: require(db, Unit, event.payload.unit_id, event.client_event_id)
            payload = event.payload.model_dump(mode="json")
            state = db.scalar(select(ItemState).where(ItemState.user_id == user.id, ItemState.item_id == event.payload.item_id))
            if not state:
                state = ItemState(user_id=user.id, updated_at=event.occurred_at, **event.payload.model_dump()); db.add(state)
            else:
                # Último registro vence; repetições e lapsos só crescem — o mesmo padrão do progresso e do app.
                if comparable(event.occurred_at) >= comparable(state.updated_at):
                    for name, value in event.payload.model_dump(exclude={"reps", "lapses"}).items(): setattr(state, name, value)
                    state.updated_at = event.occurred_at
                state.reps = max(state.reps, event.payload.reps); state.lapses = max(state.lapses, event.payload.lapses)
            db.flush()
            if state.unit_id: recompute_progress(db, user.id, state.unit_id, event.occurred_at)
        else:
            event.payload.unit_id = canonicalized(event.payload.unit_id, canonical_lesson_id)
            event.payload.completed_types = normalized_types(event.payload.completed_types)
            require(db, Unit, event.payload.unit_id, event.client_event_id)
            payload = event.payload.model_dump(mode="json", exclude=DEPRECATED_PROGRESS_FIELDS)
            item = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.unit_id == event.payload.unit_id))
            if not item:
                db.add(Progress(user_id=user.id, updated_at=event.occurred_at, **event.payload.model_dump(exclude=DEPRECATED_PROGRESS_FIELDS)))
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
