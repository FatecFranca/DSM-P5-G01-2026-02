"""Porta em Python de apps/mobile/src/domain/scheduler.ts, usada pelo replay para reconstruir o estado antes de cada tentativa."""
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

BASE_HOURS = 4.0
MIN_HALF_LIFE_HOURS = 4.0
MAX_HALF_LIFE_HOURS = 90.0 * 24


def half_life_hours(strength: int) -> float:
    return min(MAX_HALF_LIFE_HOURS, max(MIN_HALF_LIFE_HOURS, BASE_HOURS * 2 ** strength))


@dataclass(frozen=True)
class State:
    item_id: str
    unit_id: str | None
    strength: int
    half_life_hours: float
    due_at: datetime
    reps: int
    lapses: int
    consecutive_correct: int
    last_result: bool
    last_seen_at: datetime


def apply_result(current: State | None, *, item_id: str, unit_id: str | None, correct: bool, now: datetime) -> State:
    strength = (current.strength if current else 0) + 1 if correct else max(0, (current.strength if current else 0) - 2)
    half_life = half_life_hours(strength)
    return State(
        item_id=item_id, unit_id=unit_id, strength=strength, half_life_hours=half_life, due_at=now + timedelta(hours=half_life),
        reps=(current.reps if current else 0) + 1, lapses=(current.lapses if current else 0) + (0 if correct else 1),
        consecutive_correct=(current.consecutive_correct if current else 0) + 1 if correct else 0,
        last_result=correct, last_seen_at=now,
    )


def is_due(state: State, now: datetime) -> bool:
    return state.due_at <= now


def is_weak(state: State) -> bool:
    return state.lapses > 0 and state.consecutive_correct < 3


def is_mastered(state: State) -> bool:
    return state.consecutive_correct >= 1


def with_time(state: State, **fields) -> State:
    return replace(state, **fields)
