import hashlib
import json
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from .content_types import LEARNING_ORDER
from .db import get_db
from .models import Lesson, Module, Word

router = APIRouter(prefix="/v1", tags=["content"])

def content_body(db: Session) -> dict:
    modules = db.scalars(select(Module).options(selectinload(Module.lessons).selectinload(Lesson.exercises)).order_by(Module.position)).unique().all()
    words = db.scalars(select(Word).order_by(Word.text)).all()
    return {"learning_order": LEARNING_ORDER, "modules": [{"id": m.id, "title": m.title, "position": m.position, "lessons": [{
        "id": l.id, "letter": l.letter, "title": l.title, "position": l.position, "phase": l.phase, "phase_title": l.phase_title, "exercises": [{"id": e.id, "type": e.type, "instruction": e.instruction, "answer": e.answer, "audio_asset": e.audio_asset, "options": e.options, "context_word": e.context_word, "word_choices": e.word_choices, "position": e.position} for e in l.exercises]
    } for l in m.lessons]} for m in modules], "words": [{"text": w.text, "syllables": w.syllables, "required_letters": w.required_letters, "difficulty": w.current_difficulty} for w in words]}

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
