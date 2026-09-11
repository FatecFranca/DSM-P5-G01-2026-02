import hashlib
import json
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from .content_types import LEARNING_ORDER
from .db import get_db
from .models import Sentence, Syllable, Track, Unit, Word

router = APIRouter(prefix="/v1", tags=["content"])
PUBLISHED = ("pending", "approved")  # candidate, retired e rejected ficam fora do bundle.

def content_body(db: Session) -> dict:
    tracks = db.scalars(select(Track).options(selectinload(Track.units).selectinload(Unit.items)).order_by(Track.position)).unique().all()
    words = db.scalars(select(Word).where(Word.review_status.in_(PUBLISHED)).order_by(Word.text)).all()
    sentences = db.scalars(select(Sentence).where(Sentence.review_status.in_(PUBLISHED)).order_by(Sentence.id)).all()
    syllables = db.scalars(select(Syllable).where(Syllable.review_status.in_(PUBLISHED)).order_by(Syllable.position, Syllable.text)).all()
    return {
        "learning_order": LEARNING_ORDER,
        "tracks": [{"id": t.id, "slug": t.slug, "title": t.title, "kind": t.kind, "description": t.description, "position": t.position, "units": [{
            "id": u.id, "kind": u.kind, "title": u.title, "position": u.position, "phase": u.phase, "phase_title": u.phase_title, "focus_letter": u.focus_letter, "required_letters": u.required_letters,
            "items": [{"id": i.id, "type": i.type, "item_kind": i.item_kind, "target_id": i.target_id, "instruction": i.instruction, "answer": i.answer, "options": i.options, "context_word": i.context_word,
                       "word_choices": i.word_choices, "payload": i.payload, "required_letters": i.required_letters, "audio_asset": i.audio_asset, "tts_fallback_text": i.tts_fallback_text, "position": i.position}
                      for i in u.items if i.review_status in PUBLISHED],
        } for u in t.units if u.review_status in PUBLISHED]} for t in tracks if t.review_status in PUBLISHED],
        "words": [{"id": w.id, "text": w.text, "syllables": w.syllables, "required_letters": w.required_letters, "difficulty": w.current_difficulty, "frequency": w.frequency, "review_status": w.review_status} for w in words],
        "sentences": [{"id": s.id, "text": s.text, "required_letters": s.required_letters, "required_word_ids": s.required_word_ids, "difficulty": s.difficulty, "review_status": s.review_status} for s in sentences],
        "syllables": [{"id": s.id, "text": s.text, "pattern": s.pattern, "required_letters": s.required_letters, "position": s.position} for s in syllables],
    }

def content_checksum(body: dict) -> str:
    # O ETag é o hash do próprio conteúdo: muda sempre que qualquer dado muda, sem versão manual para esquecer.
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()

def content_bundle(db: Session) -> dict:
    body = content_body(db)
    return {"version": content_checksum(body)[:16], **body}

@router.get("/content")
def content(request: Request, response: Response, db: Session = Depends(get_db)):
    body = content_body(db)
    checksum = content_checksum(body)
    headers = {"ETag": f'"{checksum}"', "Cache-Control": "no-cache"}
    if headers["ETag"] in {tag.strip().removeprefix("W/") for tag in request.headers.get("if-none-match", "").split(",")}:
        return Response(status_code=304, headers=headers)
    for name, value in headers.items(): response.headers[name] = value
    return {"version": checksum[:16], **body}
