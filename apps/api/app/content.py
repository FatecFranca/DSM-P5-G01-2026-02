from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from .db import get_db
from .models import Lesson, Module, Word

router = APIRouter(prefix="/v1", tags=["content"])

@router.get("/content")
def content(db: Session = Depends(get_db)):
    modules = db.scalars(select(Module).options(selectinload(Module.lessons).selectinload(Lesson.exercises)).order_by(Module.position)).unique().all()
    words = db.scalars(select(Word).order_by(Word.text)).all()
    return {"version": "2026.09.1", "modules": [{"id": m.id, "title": m.title, "position": m.position, "lessons": [{
        "id": l.id, "letter": l.letter, "title": l.title, "position": l.position, "exercises": [{"id": e.id, "type": e.type, "instruction": e.instruction, "answer": e.answer, "audio_asset": e.audio_asset, "options": e.options, "position": e.position} for e in l.exercises]
    } for l in m.lessons]} for m in modules], "words": [{"text": w.text, "syllables": w.syllables, "difficulty": w.current_difficulty} for w in words]}
