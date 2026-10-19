"""Curadoria lexical e feedback humano sobre o classificador (ADR 0005)."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .content_data import ACCENTS, required_letters, strip_marks
from .db import get_db
from .lexical_difficulty import classify_word
from .models import User, Word

router = APIRouter(prefix="/v1/admin/words", tags=["word-studio"])
DIFFICULTIES = ("facil", "medio", "dificil")
FEEDBACKS = ("pending", "confirmed", "corrected")


def admin(user: User = Depends(__import__("app.deps", fromlist=["current_user"]).current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator access is required")
    return user


class NewWord(BaseModel):
    text: str = Field(min_length=2, max_length=40)
    syllables: str | None = Field(default=None, max_length=80, description="Ex.: CA-SA; se omitido, tenta silabificar.")
    frequency: float | None = Field(default=0.5, ge=0, le=1)


class FeedbackBody(BaseModel):
    verdict: str = Field(description="confirm = modelo acertou; correct = humano corrige")
    difficulty: str | None = Field(default=None, description="Obrigatório quando verdict=correct")


def _syllabify(text: str) -> list[str]:
    try:
        import pyphen
        inserted = pyphen.Pyphen(lang="pt_BR").inserted(text.casefold())
        parts = [part.upper() for part in inserted.split("-") if part]
        if parts and len("".join(parts)) == len(strip_marks(text)):
            # Reaplica acentos da forma original quando o tamanho bate.
            flat = list(text.upper())
            out, i = [], 0
            for ch in "-".join(parts):
                if ch == "-":
                    out.append("-")
                else:
                    out.append(flat[i]); i += 1
            return "".join(out).split("-")
        if parts:
            return parts
    except Exception:
        pass
    # Fallback conservador: uma sílaba por vogal (aproximação).
    upper = text.upper()
    chunks, buffer = [], ""
    vowels = set("AEIOUÁÉÍÓÚÂÊÔÃÕÀÜ")
    for index, ch in enumerate(upper):
        buffer += ch
        if ch in vowels:
            nxt = upper[index + 1] if index + 1 < len(upper) else ""
            if not nxt or nxt in vowels:
                chunks.append(buffer); buffer = ""
            elif index + 2 < len(upper) and upper[index + 2] not in vowels:
                continue
            else:
                chunks.append(buffer); buffer = ""
    if buffer:
        chunks.append(buffer)
    return chunks or [upper]


def _serialize(word: Word) -> dict:
    return {
        "id": word.id,
        "text": word.text,
        "syllables": word.syllables or [],
        "syllables_text": "-".join(word.syllables or []),
        "frequency": word.frequency,
        "source": word.source,
        "review_status": word.review_status,
        "current_difficulty": word.current_difficulty,
        "initial_difficulty": word.initial_difficulty,
        "model_difficulty": word.model_difficulty,
        "label_feedback": word.label_feedback or "pending",
        "difficulty_rationale": word.difficulty_rationale,
        "labeled_at": word.labeled_at.isoformat() if word.labeled_at else None,
        "labeled_by": word.labeled_by,
        "required_letters": word.required_letters,
    }


def _ensure_prediction(word: Word) -> str | None:
    if word.model_difficulty in DIFFICULTIES:
        return word.model_difficulty
    predicted = classify_word(word.text, word.syllables or [word.text], float(word.frequency or 0.5))
    if predicted:
        word.model_difficulty = predicted
        if not word.label_feedback:
            word.label_feedback = "pending"
    return predicted


@router.get("")
def list_words(
    q: str | None = None,
    feedback: str | None = Query(default=None, description="pending|confirmed|corrected"),
    status: str | None = Query(default=None, description="candidate|pending|approved"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(admin),
    db: Session = Depends(get_db),
):
    stmt = select(Word).order_by(Word.text)
    if q:
        like = f"%{q.strip().upper()}%"
        stmt = stmt.where(or_(Word.text.like(like), Word.source.ilike(f"%{q.strip()}%")))
    if feedback in FEEDBACKS:
        if feedback == "pending":
            stmt = stmt.where(or_(Word.label_feedback.is_(None), Word.label_feedback == "pending"))
        else:
            stmt = stmt.where(Word.label_feedback == feedback)
    if status:
        stmt = stmt.where(Word.review_status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.offset(offset).limit(limit)).all()
    items = []
    for word in rows:
        _ensure_prediction(word)
        items.append(_serialize(word))
    db.commit()
    counts = {}
    for key in FEEDBACKS:
        clause = or_(Word.label_feedback.is_(None), Word.label_feedback == "pending") if key == "pending" else Word.label_feedback == key
        counts[key] = db.scalar(select(func.count(Word.id)).where(clause)) or 0
    return {"total": total, "offset": offset, "limit": limit, "counts": counts, "items": items}


@router.get("/export-labels")
def export_labels(_: User = Depends(admin), db: Session = Depends(get_db)):
    """Rótulos humanos confirmados/corrigidos no formato do treino (difficulty_labels.json)."""
    rows = db.scalars(
        select(Word).where(Word.label_feedback.in_(("confirmed", "corrected"))).order_by(Word.text)
    ).all()
    items = [
        {
            "text": word.text,
            "syllables": "-".join(word.syllables or []),
            "frequency": float(word.frequency or 0.5),
            "difficulty": word.current_difficulty,
            "source": "human-feedback",
            "model_difficulty": word.model_difficulty,
            "label_feedback": word.label_feedback,
        }
        for word in rows
        if word.current_difficulty in DIFFICULTIES
    ]
    return {"count": len(items), "items": items}


@router.post("", status_code=201)
def create_word(data: NewWord, user: User = Depends(admin), db: Session = Depends(get_db)):
    text = re.sub(r"\s+", "", data.text.strip().upper())
    if len(text) < 2 or not strip_marks(text).isalpha():
        raise HTTPException(400, "Informe uma palavra válida em português.")
    existing = db.scalar(select(Word).where(Word.text == text))
    if existing:
        raise HTTPException(409, f"A palavra {text} já existe no catálogo.")
    if data.syllables:
        parts = [part.strip().upper() for part in data.syllables.replace(" ", "").split("-") if part.strip()]
    else:
        parts = _syllabify(text)
    if not parts:
        raise HTTPException(400, "Não foi possível silabificar; informe syllables no formato CA-SA.")
    frequency = 0.5 if data.frequency is None else float(data.frequency)
    predicted = classify_word(text, parts, frequency) or "medio"
    word = Word(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"prosa:word:{text}")),
        text=text,
        syllables=parts,
        required_letters=required_letters(text),
        accented=any(ch in ACCENTS for ch in text),
        length=len(text),
        frequency=frequency,
        frequency_source="admin",
        initial_difficulty=predicted,
        current_difficulty=predicted,
        model_difficulty=predicted,
        label_feedback="pending",
        difficulty_rationale="Predição do classificador lexical; aguarda confirmação humana.",
        source="admin",
        review_status="candidate",
    )
    db.add(word)
    db.commit()
    db.refresh(word)
    return _serialize(word)


@router.post("/{word_id}/predict")
def repredict(word_id: str, _: User = Depends(admin), db: Session = Depends(get_db)):
    word = db.get(Word, word_id)
    if not word:
        raise HTTPException(404, "Palavra não encontrada.")
    predicted = classify_word(word.text, word.syllables or [word.text], float(word.frequency or 0.5))
    if not predicted:
        raise HTTPException(503, "Manifesto do classificador indisponível ou não promovido.")
    word.model_difficulty = predicted
    if word.label_feedback not in {"confirmed", "corrected"}:
        word.current_difficulty = predicted
        word.label_feedback = "pending"
        word.difficulty_rationale = "Nova predição do classificador; aguarda confirmação humana."
    db.commit()
    db.refresh(word)
    return _serialize(word)


@router.post("/{word_id}/feedback")
def feedback(word_id: str, data: FeedbackBody, user: User = Depends(admin), db: Session = Depends(get_db)):
    word = db.get(Word, word_id)
    if not word:
        raise HTTPException(404, "Palavra não encontrada.")
    _ensure_prediction(word)
    verdict = data.verdict.strip().lower()
    now = datetime.now(timezone.utc)
    if verdict in {"confirm", "confirmed", "agree"}:
        if word.model_difficulty not in DIFFICULTIES:
            raise HTTPException(400, "Não há predição do modelo para confirmar.")
        word.current_difficulty = word.model_difficulty
        word.label_feedback = "confirmed"
        word.difficulty_rationale = f"Humano confirmou a predição do modelo ({word.model_difficulty})."
    elif verdict in {"correct", "corrected", "fix"}:
        difficulty = (data.difficulty or "").strip().lower()
        if difficulty not in DIFFICULTIES:
            raise HTTPException(400, "Informe difficulty: facil, medio ou dificil.")
        word.current_difficulty = difficulty
        word.label_feedback = "corrected"
        word.difficulty_rationale = (
            f"Humano corrigiu a predição {word.model_difficulty or 'ausente'} para {difficulty}."
        )
    else:
        raise HTTPException(400, "verdict deve ser confirm ou correct.")
    word.labeled_at = now
    word.labeled_by = user.email
    if word.review_status == "candidate":
        word.review_status = "pending"
    db.commit()
    db.refresh(word)
    return _serialize(word)
