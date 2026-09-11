"""IDs canônicos de conteúdo.

Versões anteriores do app usavam `letter-a` e `A-listen`, e seeds novos geravam `exercise-A-find_in_word`.
Unidades de letra: `lesson-A`; itens de letra: `exercise-A-<sufixo do contrato>`; itens de trilha temática: `item-<unidade>-<n>`.
"""
import re

from .content_types import EXERCISE_ID_SUFFIX, ExerciseType

_LEGACY_LESSON = re.compile(r"^letter-([a-z])$")
_EXERCISE = re.compile(r"^(?:exercise-)?([A-Z])-(listen|recognize|find|find_in_word|complete-word|syllable)$")


def lesson_id_for(letter: str) -> str:
    return f"lesson-{letter.upper()}"


def exercise_id_for(letter: str, kind: str) -> str:
    return f"exercise-{letter.upper()}-{EXERCISE_ID_SUFFIX[ExerciseType(kind)]}"


def item_id_for(unit_id: str, index: int) -> str:
    return f"item-{unit_id}-{index}"


def canonical_lesson_id(value: str) -> str:
    match = _LEGACY_LESSON.match(value)
    return lesson_id_for(match.group(1)) if match else value


def canonical_exercise_id(value: str) -> str:
    match = _EXERCISE.match(value)
    if not match:
        return value
    return f"exercise-{match.group(1)}-{'find' if match.group(2) == 'find_in_word' else match.group(2)}"
