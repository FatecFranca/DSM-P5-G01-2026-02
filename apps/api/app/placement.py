"""Quiz de nivelamento: espelha contracts/placement-quiz.json (tests/test_placement.py garante a paridade).

A correção é a mesma do app (src/domain/placement.ts) e de banco_questoes.corrigir_quiz: o servidor recebe só as
respostas brutas e recalcula tudo, então o resultado guardado não depende da versão do aplicativo.
"""
from dataclasses import dataclass

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .content_types import PHASE_SPECS
from .db import get_db
from .deps import current_user
from .models import PlacementResult, User

QUIZ_VERSION = "nivelamento-v1"
BANDS = ("facil", "medio", "dificil")
BAND_THRESHOLD = 3
MIN_EASY_ANSWERED = 3
MIXES = {
    "facil": {"facil": 6, "medio": 3, "dificil": 1},
    "medio": {"facil": 3, "medio": 5, "dificil": 2},
    "dificil": {"facil": 2, "medio": 3, "dificil": 5},
}
START_LEVEL_CAP = {"facil": 1, "medio": 3, "dificil": 4}
START_LEVEL_MIN_HITS = {1: 2, 2: 3, 3: 2, 4: 3}
CREDIT_PHASES_BY_START_LEVEL = {1: (), 2: (1, 2), 3: (1, 2), 4: (1, 2, 3)}


@dataclass(frozen=True)
class QuizItem:
    id: str
    band: str
    level: int
    answer: int
    options: int = 3


ITEMS = (
    QuizItem("F1", "facil", 1, 2), QuizItem("F2", "facil", 1, 1), QuizItem("F3", "facil", 2, 3), QuizItem("F4", "facil", 3, 2),
    QuizItem("M1", "medio", 2, 3), QuizItem("M2", "medio", 2, 1), QuizItem("M3", "medio", 3, 2), QuizItem("M4", "medio", 4, 3),
    QuizItem("D1", "dificil", 2, 1), QuizItem("D2", "dificil", 4, 2), QuizItem("D3", "dificil", 4, 3), QuizItem("D4", "dificil", 4, 1),
)
BY_ID = {item.id: item for item in ITEMS}


class PlacementError(ValueError):
    """Respostas que não pertencem ao quiz atual."""


def credited_letters(start_level: int) -> str:
    phases = set(CREDIT_PHASES_BY_START_LEVEL[start_level])
    return "".join(letters for phase, _, letters in PHASE_SPECS if phase in phases)


def score_placement(responses: dict, skipped: bool = False) -> dict:
    """Uma faixa é atingida com 3 acertos em 4; resultado provisório vira fácil, nível 1 e nenhum crédito."""
    for item_id, choice in responses.items():
        item = BY_ID.get(item_id)
        if item is None:
            raise PlacementError(f"ID {item_id} não pertence ao quiz de nivelamento")
        if choice is not None and (type(choice) is not int or not 1 <= choice <= item.options):
            raise PlacementError(f"use o índice 1 a {item.options} ou null em {item_id}")
    hits = dict.fromkeys(BANDS, 0); answered = dict.fromkeys(BANDS, 0); skipped_items = []
    is_hit = lambda item: responses.get(item.id) == item.answer  # noqa: E731
    for item in ITEMS:
        if item.id not in responses:
            continue
        if responses[item.id] is None:
            skipped_items.append(item.id); continue
        answered[item.band] += 1
        hits[item.band] += is_hit(item)
    if skipped:
        reason = "quiz_pulado"
    elif any(item.id not in responses for item in ITEMS):
        reason = "quiz_incompleto"
    elif answered["facil"] < MIN_EASY_ANSWERED:
        reason = "poucas_respostas_faceis"
    elif hits["facil"] < BAND_THRESHOLD and max(hits["medio"], hits["dificil"]) >= BAND_THRESHOLD:
        reason = "resultado_contrastante"
    else:
        reason = None
    provisional = reason is not None
    if provisional or hits["facil"] < BAND_THRESHOLD:
        difficulty = "facil"
    elif hits["medio"] >= BAND_THRESHOLD and hits["dificil"] >= BAND_THRESHOLD:
        difficulty = "dificil"
    else:
        difficulty = "medio"
    start_level = 1
    if not provisional:
        for level in range(1, START_LEVEL_CAP[difficulty] + 1):
            if sum(is_hit(item) for item in ITEMS if item.level == level) < START_LEVEL_MIN_HITS[level]:
                break
            start_level = level
    return {"hits": hits, "answered": answered, "skipped_items": skipped_items, "difficulty": difficulty, "provisional": provisional,
            "provisional_reason": reason, "start_level": start_level, "credited_letters": "" if provisional else credited_letters(start_level),
            "mix": MIXES[difficulty]}


def result_dict(row: PlacementResult) -> dict:
    return {"result_id": row.result_id, "quiz_version": row.quiz_version, "skipped": row.skipped, "responses": row.responses,
            "hits": {"facil": row.hits_facil, "medio": row.hits_medio, "dificil": row.hits_dificil}, "difficulty": row.difficulty,
            "provisional": row.provisional, "provisional_reason": row.provisional_reason, "start_level": row.start_level,
            "credited_letters": row.credited_letters, "completed_at": row.completed_at}


router = APIRouter(prefix="/v1/placement", tags=["learning"])


@router.get("")
def latest_placement(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Último nivelamento concluído pela pessoa; `null` quando ainda não fez."""
    row = db.scalar(select(PlacementResult).where(PlacementResult.user_id == user.id).order_by(PlacementResult.completed_at.desc(), PlacementResult.result_id.desc()).limit(1))
    return {"result": result_dict(row) if row else None}
