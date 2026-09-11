"""Replay de tentativas: reconstrói, para cada tentativa, o estado do item e do aprendiz COMO ESTAVAM antes dela.

Nada de vazamento de futuro: o estado avança só depois de a linha ser emitida. Features, regras e scheduler são os do
servidor (`app.ranking.*`), então o que se avalia aqui é exatamente o que /v1/ranking/next serve.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

from app.content_types import LEARNING_ORDER
from app.ranking.features import FEATURE_NAMES, Context, ItemMeta, LearnerStats, feature_vector, recall_curve
from app.ranking.rules import rules_p_recall
from app.ranking.scheduler import State, apply_result, is_mastered


@dataclass(frozen=True)
class AttemptRecord:
    user_id: str
    item_id: str
    unit_id: str | None
    exercise_type: str | None
    correct: bool
    occurred_at: datetime
    audio_repeats: int | None = None
    position_in_session: int | None = None
    attempt_index_in_item: int | None = None


@dataclass(frozen=True)
class Row:
    user_id: str
    item_id: str
    occurred_at: datetime
    features: list[float]
    p_rules: float
    p_item_history: float
    label: int


ITEM_PRIOR = 0.85


def frontier_of(states: dict[str, State], units_of: dict[str, str | None]) -> int:
    """Letras consecutivas, desde o início da ordem, com ao menos um item dominado na unidade da letra."""
    mastered_units = {units_of.get(item_id) for item_id, state in states.items() if is_mastered(state)}
    frontier = 0
    for letter in LEARNING_ORDER:
        if f"lesson-{letter}" not in mastered_units: break
        frontier += 1
    return frontier


def replay(attempts: Iterable[AttemptRecord], metas: dict[str, ItemMeta]) -> list[Row]:
    ordered = sorted(attempts, key=lambda record: (record.occurred_at, record.user_id, record.item_id))
    learners: dict[str, LearnerStats] = defaultdict(LearnerStats)
    states: dict[str, dict[str, State]] = defaultdict(dict)
    units_of: dict[str, dict[str, str | None]] = defaultdict(dict)
    rows: list[Row] = []
    for record in ordered:
        meta = metas.get(record.item_id)
        if meta is None: continue
        learner = learners[record.user_id]; user_states = states[record.user_id]
        learner.frontier_index = frontier_of(user_states, units_of[record.user_id])
        state = user_states.get(record.item_id)
        context = Context(position_in_session=record.position_in_session or 1, attempt_index_in_item=record.attempt_index_in_item or 1)
        features = feature_vector(state, meta, learner, context, record.occurred_at)
        p_rules = rules_p_recall(state, meta, learner, recall_curve(state, record.occurred_at))
        p_history = (state.reps - state.lapses) / state.reps if state and state.reps else ITEM_PRIOR
        rows.append(Row(record.user_id, record.item_id, record.occurred_at, features, p_rules, p_history, int(record.correct)))
        learner.observe(record.exercise_type, record.correct, record.audio_repeats, record.occurred_at)
        user_states[record.item_id] = apply_result(state, item_id=record.item_id, unit_id=record.unit_id, correct=record.correct, now=record.occurred_at)
        units_of[record.user_id][record.item_id] = record.unit_id
    return rows


def load_from_database(database_url: str, *, consent_only: bool = True) -> tuple[list[AttemptRecord], dict[str, ItemMeta]]:
    """Lê tentativas e catálogo direto do banco da API (somente leitura). Sem consentimento de pesquisa, a tentativa fica de fora."""
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session
    from app.models import Attempt, Item, Sentence, Unit, User, Word
    from app.ranking.service import item_meta, naive

    engine = create_engine(database_url)
    with Session(engine) as db:
        query = select(Attempt).join(User, User.id == Attempt.user_id)
        if consent_only: query = query.where(User.research_consent.is_(True))
        attempts = [AttemptRecord(a.user_id, a.item_id, a.unit_id, a.exercise_type, a.correct, naive(a.occurred_at), a.audio_repeats, a.position_in_session, a.attempt_index_in_item) for a in db.scalars(query).all()]
        units = {unit.id: unit for unit in db.scalars(select(Unit)).all()}
        words = {word.text: word for word in db.scalars(select(Word)).all()}
        sentences = {sentence.id: sentence for sentence in db.scalars(select(Sentence)).all()}
        metas = {item.id: item_meta(item, units.get(item.unit_id), words, sentences) for item in db.scalars(select(Item)).all()}
    return attempts, metas


__all__ = ["AttemptRecord", "Row", "FEATURE_NAMES", "replay", "load_from_database"]
