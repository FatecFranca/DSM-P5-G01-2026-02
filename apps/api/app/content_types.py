"""Espelha contracts/exercise-types.json e contracts/pedagogy.json; tests/test_contracts.py garante a paridade."""
from enum import StrEnum


class ExerciseType(StrEnum):
    LISTEN_CHOOSE = "listen_choose"
    RECOGNIZE_LETTER = "recognize_letter"
    FIND_IN_WORD = "find_in_word"
    SYLLABLE_LISTEN_CHOOSE = "syllable_listen_choose"
    COMPLETE_WORD = "complete_word"
    WORD_LISTEN_CHOOSE = "word_listen_choose"
    WORD_FROM_SYLLABLES = "word_from_syllables"
    SENTENCE_FILL_WORD = "sentence_fill_word"
    SENTENCE_ORDER = "sentence_order"


class ItemKind(StrEnum):
    LETTER = "letter"
    SYLLABLE = "syllable"
    WORD = "word"
    SENTENCE = "sentence"


class Renderer(StrEnum):
    CHOICE = "choice"
    WORD_CHOICES = "word_choices"
    ORDER = "order"


TARGET_OF: dict[ExerciseType, ItemKind] = {
    ExerciseType.LISTEN_CHOOSE: ItemKind.LETTER, ExerciseType.RECOGNIZE_LETTER: ItemKind.LETTER, ExerciseType.FIND_IN_WORD: ItemKind.LETTER,
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: ItemKind.SYLLABLE,
    ExerciseType.COMPLETE_WORD: ItemKind.WORD, ExerciseType.WORD_LISTEN_CHOOSE: ItemKind.WORD, ExerciseType.WORD_FROM_SYLLABLES: ItemKind.WORD,
    ExerciseType.SENTENCE_FILL_WORD: ItemKind.SENTENCE, ExerciseType.SENTENCE_ORDER: ItemKind.SENTENCE,
}
RENDERER_OF: dict[ExerciseType, Renderer] = {
    ExerciseType.LISTEN_CHOOSE: Renderer.CHOICE, ExerciseType.RECOGNIZE_LETTER: Renderer.CHOICE, ExerciseType.FIND_IN_WORD: Renderer.CHOICE,
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: Renderer.CHOICE, ExerciseType.COMPLETE_WORD: Renderer.WORD_CHOICES, ExerciseType.WORD_LISTEN_CHOOSE: Renderer.CHOICE,
    ExerciseType.WORD_FROM_SYLLABLES: Renderer.ORDER, ExerciseType.SENTENCE_FILL_WORD: Renderer.CHOICE, ExerciseType.SENTENCE_ORDER: Renderer.ORDER,
}
EXERCISE_ID_SUFFIX: dict[ExerciseType, str] = {
    ExerciseType.LISTEN_CHOOSE: "listen", ExerciseType.RECOGNIZE_LETTER: "recognize", ExerciseType.FIND_IN_WORD: "find",
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: "syllable", ExerciseType.COMPLETE_WORD: "complete-word", ExerciseType.WORD_LISTEN_CHOOSE: "word",
    ExerciseType.WORD_FROM_SYLLABLES: "build", ExerciseType.SENTENCE_FILL_WORD: "fill", ExerciseType.SENTENCE_ORDER: "order",
}
LEGACY_ALIASES: dict[str, ExerciseType] = {"recognize": ExerciseType.RECOGNIZE_LETTER}
REQUIRED_LETTER_EXERCISE_TYPES = (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER, ExerciseType.FIND_IN_WORD)
FIND_IN_WORD_EXEMPT_LETTERS = "AE"

LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY"
VOWELS = "AEIOU"
PHASE_SPECS = ((1, "Vogais", "AEIOU"), (2, "Consoantes de alta utilidade", "MLPSTRNDCG"), (3, "Ampliação do vocabulário", "BFVHQJKZXWY"))


def required_types_for(letter: str) -> tuple[ExerciseType, ...]:
    return tuple(kind for kind in REQUIRED_LETTER_EXERCISE_TYPES if kind is not ExerciseType.FIND_IN_WORD or letter not in FIND_IN_WORD_EXEMPT_LETTERS)


def normalize_exercise_type(value: str) -> ExerciseType | None:
    """Traduz tipos legados (ex.: "recognize") e devolve None para tipos removidos (ex.: "write")."""
    if value in ExerciseType._value2member_map_:
        return ExerciseType(value)
    return LEGACY_ALIASES.get(value)
