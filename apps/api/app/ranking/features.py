"""Vetor de features de uma tentativa/candidato. Uma única implementação, usada pelo serviço e pelo replay.

Tudo que entra aqui é derivado do que já é registrado (item_states, attempts, catálogo). Nada de vazamento de futuro:
`state` é o estado do item ANTES do encontro e `learner` agrega só tentativas anteriores.
"""
import math
from dataclasses import dataclass, field
from datetime import datetime

from ..content_types import LEARNING_ORDER, ExerciseType
from .scheduler import State

DIFFICULTY_ORD = {"facil": 0.0, "medio": 1.0, "dificil": 2.0}
KINDS = ("letter", "syllable", "word", "sentence")
TYPES = tuple(kind.value for kind in ExerciseType)

FEATURE_NAMES: tuple[str, ...] = (
    "is_first_encounter", "log_hours_since_seen", "reps", "lapses", "strength", "log_half_life_hours", "consecutive_correct", "item_accuracy", "elapsed_over_half_life", "recall_curve",
    "user_attempts_log", "user_accuracy", "user_type_accuracy", "user_mean_audio_repeats", "days_since_first_session",
    *(f"kind_{kind}" for kind in KINDS), *(f"type_{kind}" for kind in TYPES),
    "target_length", "syllable_count", "accented", "frequency", "difficulty_ord", "letter_distance_from_frontier",
    "position_in_session", "attempt_index_in_item", "hour_sin", "hour_cos",
)


@dataclass(frozen=True)
class ItemMeta:
    item_id: str
    type: str
    item_kind: str
    target_length: int = 1
    syllable_count: int = 1
    accented: bool = False
    frequency: float | None = None
    difficulty: str = "medio"
    max_letter_index: int = 0


@dataclass
class LearnerStats:
    attempts: int = 0
    correct: int = 0
    by_type: dict[str, tuple[int, int]] = field(default_factory=dict)
    audio_repeats_total: int = 0
    audio_repeats_count: int = 0
    first_session_at: datetime | None = None
    frontier_index: int = 0  # letras consecutivas dominadas desde o início da ordem

    def observe(self, exercise_type: str | None, correct: bool, audio_repeats: int | None, occurred_at: datetime) -> None:
        self.attempts += 1; self.correct += 1 if correct else 0
        if exercise_type:
            attempts, hits = self.by_type.get(exercise_type, (0, 0)); self.by_type[exercise_type] = (attempts + 1, hits + (1 if correct else 0))
        if audio_repeats is not None:
            self.audio_repeats_total += audio_repeats; self.audio_repeats_count += 1
        if self.first_session_at is None or occurred_at < self.first_session_at:
            self.first_session_at = occurred_at


@dataclass(frozen=True)
class Context:
    position_in_session: int = 1
    attempt_index_in_item: int = 1


def recall_curve(state: State | None, now: datetime) -> float:
    """Curva de esquecimento 2^(-t/meia-vida): o piso de regras e uma feature do modelo."""
    if state is None:
        return 0.0
    elapsed = max(0.0, (now - state.last_seen_at).total_seconds() / 3600)
    return 2 ** (-elapsed / max(state.half_life_hours, 1e-6))


def feature_vector(state: State | None, item: ItemMeta, learner: LearnerStats, context: Context, now: datetime) -> list[float]:
    elapsed_hours = max(0.0, (now - state.last_seen_at).total_seconds() / 3600) if state else 0.0
    user_type = learner.by_type.get(item.type, (0, 0))
    hour = now.hour + now.minute / 60
    values = {
        "is_first_encounter": 0.0 if state else 1.0,
        "log_hours_since_seen": math.log1p(elapsed_hours),
        "reps": float(state.reps) if state else 0.0,
        "lapses": float(state.lapses) if state else 0.0,
        "strength": float(state.strength) if state else 0.0,
        "log_half_life_hours": math.log(state.half_life_hours) if state else 0.0,
        "consecutive_correct": float(state.consecutive_correct) if state else 0.0,
        "item_accuracy": (state.reps - state.lapses) / state.reps if state and state.reps else 0.0,
        "elapsed_over_half_life": elapsed_hours / state.half_life_hours if state else 0.0,
        "recall_curve": recall_curve(state, now),
        "user_attempts_log": math.log1p(learner.attempts),
        "user_accuracy": learner.correct / learner.attempts if learner.attempts else 0.0,
        "user_type_accuracy": user_type[1] / user_type[0] if user_type[0] else 0.0,
        "user_mean_audio_repeats": learner.audio_repeats_total / learner.audio_repeats_count if learner.audio_repeats_count else 0.0,
        "days_since_first_session": max(0.0, (now - learner.first_session_at).total_seconds() / 86400) if learner.first_session_at else 0.0,
        **{f"kind_{kind}": 1.0 if item.item_kind == kind else 0.0 for kind in KINDS},
        **{f"type_{kind}": 1.0 if item.type == kind else 0.0 for kind in TYPES},
        "target_length": float(item.target_length),
        "syllable_count": float(item.syllable_count),
        "accented": 1.0 if item.accented else 0.0,
        "frequency": item.frequency if item.frequency is not None else 0.5,
        "difficulty_ord": DIFFICULTY_ORD.get(item.difficulty, 1.0),
        "letter_distance_from_frontier": float(item.max_letter_index - learner.frontier_index),
        "position_in_session": float(context.position_in_session),
        "attempt_index_in_item": float(context.attempt_index_in_item),
        "hour_sin": math.sin(2 * math.pi * hour / 24),
        "hour_cos": math.cos(2 * math.pi * hour / 24),
    }
    return [values[name] for name in FEATURE_NAMES]


def letter_index(letter: str | None) -> int:
    return LEARNING_ORDER.index(letter) if letter and letter in LEARNING_ORDER else 0
