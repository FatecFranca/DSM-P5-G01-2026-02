"""Serviço de ranking: pontua candidatos com regras e, quando permitido, com o modelo; registra tudo em ranking_logs.

Fallback é por ITEM, não por requisição: itens frios entram por regra, quentes por modelo, e `reason` diz qual.
Em shadow mode o modelo é calculado e registrado, mas as regras são servidas.
"""
import logging
import random
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import Settings
from ..content_types import LEARNING_ORDER
from ..models import Attempt, Item, ItemState, Progress, RankingLog, Sentence, Unit, User, Word
from .features import Context, ItemMeta, LearnerStats, feature_vector, letter_index, recall_curve
from .model import InvalidManifest, RankingModel, load_model
from .rules import RULES_POLICY_VERSION, Scored, bucket_of, rank_candidates, rules_p_recall
from .scheduler import State

logger = logging.getLogger(__name__)
MODEL_LATENCY_BUDGET_MS = 50.0


@dataclass(frozen=True)
class RankedItem:
    item_id: str
    p_recall: float
    p_rules: float
    p_model: float | None
    rank: int
    source: str  # model | rules-fallback
    reason: str


@dataclass(frozen=True)
class RankingResult:
    request_id: str
    source: str
    model_version: str | None
    policy_version: str
    served_at: datetime
    items: list[RankedItem]


def state_from_row(row: ItemState) -> State:
    return State(item_id=row.item_id, unit_id=row.unit_id, strength=row.strength, half_life_hours=row.half_life_hours, due_at=naive(row.due_at), reps=row.reps, lapses=row.lapses, consecutive_correct=row.consecutive_correct, last_result=row.last_result, last_seen_at=naive(row.last_seen_at))


def naive(value: datetime) -> datetime:
    return value.replace(tzinfo=None) if value.tzinfo else value


def item_meta(item: Item, unit: Unit | None, words: dict[str, Word], sentences: dict[str, Sentence]) -> ItemMeta:
    letters = item.required_letters or (unit.required_letters if unit else "")
    focus = unit.focus_letter if unit else None
    max_index = max([letter_index(letter) for letter in letters] + [letter_index(focus)], default=0)
    if item.item_kind == "word" and item.target_id in words:
        word = words[item.target_id]
        return ItemMeta(item.id, item.type, item.item_kind, target_length=word.length or len(word.text), syllable_count=len(word.syllables or []) or 1, accented=word.accented, frequency=word.frequency, difficulty=word.current_difficulty, max_letter_index=max_index)
    if item.item_kind == "sentence" and item.target_id in sentences:
        sentence = sentences[item.target_id]
        return ItemMeta(item.id, item.type, item.item_kind, target_length=len(sentence.text), syllable_count=sentence.word_count or 1, accented=any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in sentence.text), frequency=None, difficulty=sentence.difficulty, max_letter_index=max_index)
    if item.item_kind == "syllable":
        return ItemMeta(item.id, item.type, item.item_kind, target_length=len(item.answer), syllable_count=1, difficulty="facil", max_letter_index=max_index)
    phase = unit.phase if unit and unit.phase else 1
    return ItemMeta(item.id, item.type, item.item_kind, target_length=1, syllable_count=1, difficulty=("facil", "medio", "dificil")[min(phase, 3) - 1], max_letter_index=max_index)


def learner_stats(db: Session, user_id: str) -> LearnerStats:
    stats = LearnerStats()
    stats.attempts, stats.correct = (db.execute(select(func.count(Attempt.id), func.coalesce(func.sum(func.cast(Attempt.correct, func.count().type)), 0)).where(Attempt.user_id == user_id)).one())
    stats.attempts = int(stats.attempts or 0); stats.correct = int(stats.correct or 0)
    for exercise_type, attempts, hits in db.execute(select(Attempt.exercise_type, func.count(Attempt.id), func.sum(func.cast(Attempt.correct, func.count().type))).where(Attempt.user_id == user_id, Attempt.exercise_type.is_not(None)).group_by(Attempt.exercise_type)).all():
        stats.by_type[exercise_type] = (int(attempts), int(hits or 0))
    total, count = db.execute(select(func.coalesce(func.sum(Attempt.audio_repeats), 0), func.count(Attempt.audio_repeats)).where(Attempt.user_id == user_id, Attempt.audio_repeats.is_not(None))).one()
    stats.audio_repeats_total, stats.audio_repeats_count = int(total or 0), int(count or 0)
    first = db.scalar(select(func.min(Attempt.occurred_at)).where(Attempt.user_id == user_id))
    stats.first_session_at = naive(first) if first else None
    completed = {row.unit_id for row in db.scalars(select(Progress).where(Progress.user_id == user_id, Progress.status.in_(("completed", "mastered", "needs_review")))).all()}
    frontier = 0
    for letter in LEARNING_ORDER:
        if f"lesson-{letter}" not in completed: break
        frontier += 1
    stats.frontier_index = frontier
    return stats


def load_ranking_model(settings: Settings) -> tuple[RankingModel | None, str | None]:
    """Devolve (modelo, motivo da ausência)."""
    if not settings.ranking_model_enabled: return None, "model_disabled"
    if not settings.ranking_model_path: return None, "model_unavailable"
    try:
        return load_model(settings.ranking_model_path), None
    except (OSError, ValueError, InvalidManifest) as error:
        logger.warning("ranking model unavailable: %s", error)
        return None, "model_unavailable"


def rank_next(db: Session, user: User, settings: Settings, *, session_id: str, unit_id: str | None, candidate_item_ids: list[str], session_size: int, now: datetime | None = None) -> RankingResult:
    served_at = now or datetime.now(timezone.utc)
    reference = naive(served_at)
    request_id = str(uuid.uuid4())
    items = {item.id: item for item in db.scalars(select(Item).where(Item.id.in_(candidate_item_ids))).all()}
    if missing := [item_id for item_id in candidate_item_ids if item_id not in items]:
        raise LookupError(f"itens desconhecidos: {', '.join(missing)}")
    units = {unit.id: unit for unit in db.scalars(select(Unit).where(Unit.id.in_({item.unit_id for item in items.values()}))).all()}
    words = {word.text: word for word in db.scalars(select(Word).where(Word.text.in_({item.target_id for item in items.values() if item.item_kind == "word" and item.target_id}))).all()}
    sentences = {sentence.id: sentence for sentence in db.scalars(select(Sentence).where(Sentence.id.in_({item.target_id for item in items.values() if item.item_kind == "sentence" and item.target_id}))).all()}
    states = {row.item_id: state_from_row(row) for row in db.scalars(select(ItemState).where(ItemState.user_id == user.id, ItemState.item_id.in_(candidate_item_ids))).all()}
    learner = learner_stats(db, user.id)
    model, model_reason = load_ranking_model(settings)
    cold_user = learner.attempts < settings.ranking_cold_start_attempts

    scored: dict[str, tuple[Scored, float, float | None, str, str]] = {}
    for position, item_id in enumerate(candidate_item_ids):
        item = items[item_id]; state = states.get(item_id); meta = item_meta(item, units.get(item.unit_id), words, sentences)
        curve = recall_curve(state, reference)
        p_rules = rules_p_recall(state, meta, learner, curve)
        p_model: float | None = None; source, reason = "rules-fallback", model_reason or "rules"
        if model is not None:
            started = time.perf_counter()
            p_model = model.predict(feature_vector(state, meta, learner, Context(position_in_session=position + 1, attempt_index_in_item=1), reference))
            latency_ms = (time.perf_counter() - started) * 1000
            if cold_user: reason = "cold_start_user"
            elif state is None or state.reps < settings.ranking_min_item_encounters: reason = "cold_item"
            elif latency_ms > MODEL_LATENCY_BUDGET_MS: reason = "latency"
            elif not model.in_range(p_model): reason = "out_of_range"
            elif settings.ranking_shadow_mode: reason = "shadow_mode"
            else: source, reason = "model", "model"
        p_served = p_model if source == "model" and p_model is not None else p_rules
        scored[item_id] = (Scored(item_id=item_id, p_recall=p_served, is_new=state is None, curriculum_position=position), p_rules, p_model, source, reason)

    ordered = rank_candidates([entry[0] for entry in scored.values()])
    selected = ordered[:session_size]
    # ε-exploração determinística por request_id: sem ela, o ranking enviesa os próprios dados futuros.
    explored: str | None = None
    if len(ordered) > session_size and settings.ranking_epsilon > 0 and random.Random(request_id).random() < settings.ranking_epsilon:
        explored = random.Random(request_id + ":explore").choice(ordered[session_size:]).item_id
        selected = [*selected[:-1], scored[explored][0]]

    ranked: list[RankedItem] = []
    for rank, entry in enumerate(selected, 1):
        _, p_rules, p_model, source, reason = scored[entry.item_id]
        reason = "explore" if entry.item_id == explored else f"{reason}:{bucket_of(entry)}"
        ranked.append(RankedItem(item_id=entry.item_id, p_recall=round(entry.p_recall, 4), p_rules=round(p_rules, 4), p_model=round(p_model, 4) if p_model is not None else None, rank=rank, source=source, reason=reason))

    response_source = "model" if any(item.source == "model" for item in ranked) else "rules-fallback"
    policy_version = model.policy_version if model and response_source == "model" else RULES_POLICY_VERSION
    db.add(RankingLog(id=request_id, user_id=user.id, session_id=session_id, unit_id=unit_id, candidate_item_ids=candidate_item_ids, scores=[item.__dict__ for item in ranked], source=response_source, model_version=model.model_version if model else None, policy_version=policy_version, served_at=served_at))
    db.commit()
    return RankingResult(request_id=request_id, source=response_source, model_version=model.model_version if model else None, policy_version=policy_version, served_at=served_at, items=ranked)
