"""Espelha contracts/exercise-types.json e contracts/pedagogy.json; tests/test_contracts.py garante a paridade."""
from enum import StrEnum


class ExerciseType(StrEnum):
    LISTEN_CHOOSE = "listen_choose"
    RECOGNIZE_LETTER = "recognize_letter"
    FIND_IN_WORD = "find_in_word"
    COMPLETE_WORD = "complete_word"


LEGACY_ALIASES: dict[str, ExerciseType] = {"recognize": ExerciseType.RECOGNIZE_LETTER}
REQUIRED_LETTER_EXERCISE_TYPES = (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER, ExerciseType.FIND_IN_WORD)
FIND_IN_WORD_EXEMPT_LETTERS = "AE"


def required_types_for(letter: str) -> tuple[ExerciseType, ...]:
    return tuple(kind for kind in REQUIRED_LETTER_EXERCISE_TYPES if kind is not ExerciseType.FIND_IN_WORD or letter not in FIND_IN_WORD_EXEMPT_LETTERS)

LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY"
PHASE_SPECS = ((1, "Vogais", "AEIOU"), (2, "Consoantes de alta utilidade", "MLPSTRNDCG"), (3, "Ampliação do vocabulário", "BFVHQJKZXWY"))


def normalize_exercise_type(value: str) -> ExerciseType | None:
    """Traduz tipos legados (ex.: "recognize") e devolve None para tipos removidos (ex.: "write")."""
    if value in ExerciseType._value2member_map_:
        return ExerciseType(value)
    return LEGACY_ALIASES.get(value)


EXERCISE_ID_SUFFIX: dict[ExerciseType, str] = {
    ExerciseType.LISTEN_CHOOSE: "listen", ExerciseType.RECOGNIZE_LETTER: "recognize",
    ExerciseType.FIND_IN_WORD: "find", ExerciseType.COMPLETE_WORD: "complete-word",
}
