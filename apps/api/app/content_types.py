"""Espelha contracts/exercise-types.json e contracts/pedagogy.json; tests/test_contracts.py garante a paridade."""
from enum import StrEnum


class ExerciseType(StrEnum):
    LISTEN_CHOOSE = "listen_choose"
    RECOGNIZE_LETTER = "recognize_letter"
    FIND_IN_WORD = "find_in_word"
    INITIAL_SOUND = "initial_sound"
    FIND_ALL_IN_WORD = "find_all_in_word"
    COMPARE_WORDS = "compare_words"
    MIXED_REVIEW = "mixed_review"
    SYLLABLE_LISTEN_CHOOSE = "syllable_listen_choose"
    COMPLETE_WORD = "complete_word"
    WORD_LISTEN_CHOOSE = "word_listen_choose"
    WORD_FROM_SYLLABLES = "word_from_syllables"
    SENTENCE_FILL_WORD = "sentence_fill_word"
    SENTENCE_ORDER = "sentence_order"
    SYLLABLE_POSITION_CHOOSE = "syllable_position_choose"
    WORD_IMAGE_CHOOSE = "word_image_choose"
    SENTENCE_IMAGE_CHOOSE = "sentence_image_choose"


class ItemKind(StrEnum):
    LETTER = "letter"
    SYLLABLE = "syllable"
    WORD = "word"
    SENTENCE = "sentence"


class Renderer(StrEnum):
    CHOICE = "choice"
    WORD_CHOICES = "word_choices"
    ORDER = "order"
    MULTI_SELECT = "multi_select"


TARGET_OF: dict[ExerciseType, ItemKind] = {
    ExerciseType.LISTEN_CHOOSE: ItemKind.LETTER, ExerciseType.RECOGNIZE_LETTER: ItemKind.LETTER, ExerciseType.FIND_IN_WORD: ItemKind.LETTER,
    ExerciseType.INITIAL_SOUND: ItemKind.LETTER, ExerciseType.FIND_ALL_IN_WORD: ItemKind.LETTER, ExerciseType.COMPARE_WORDS: ItemKind.LETTER, ExerciseType.MIXED_REVIEW: ItemKind.LETTER,
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: ItemKind.SYLLABLE,
    ExerciseType.COMPLETE_WORD: ItemKind.LETTER, ExerciseType.WORD_LISTEN_CHOOSE: ItemKind.WORD, ExerciseType.WORD_FROM_SYLLABLES: ItemKind.WORD,
    ExerciseType.SENTENCE_FILL_WORD: ItemKind.SENTENCE, ExerciseType.SENTENCE_ORDER: ItemKind.SENTENCE,
    ExerciseType.SYLLABLE_POSITION_CHOOSE: ItemKind.SYLLABLE, ExerciseType.WORD_IMAGE_CHOOSE: ItemKind.WORD,
    ExerciseType.SENTENCE_IMAGE_CHOOSE: ItemKind.SENTENCE,
}
RENDERER_OF: dict[ExerciseType, Renderer] = {
    ExerciseType.LISTEN_CHOOSE: Renderer.CHOICE, ExerciseType.RECOGNIZE_LETTER: Renderer.CHOICE, ExerciseType.FIND_IN_WORD: Renderer.CHOICE,
    ExerciseType.INITIAL_SOUND: Renderer.CHOICE, ExerciseType.FIND_ALL_IN_WORD: Renderer.MULTI_SELECT, ExerciseType.COMPARE_WORDS: Renderer.CHOICE, ExerciseType.MIXED_REVIEW: Renderer.CHOICE,
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: Renderer.CHOICE, ExerciseType.COMPLETE_WORD: Renderer.CHOICE, ExerciseType.WORD_LISTEN_CHOOSE: Renderer.CHOICE,
    ExerciseType.WORD_FROM_SYLLABLES: Renderer.ORDER, ExerciseType.SENTENCE_FILL_WORD: Renderer.CHOICE, ExerciseType.SENTENCE_ORDER: Renderer.ORDER,
    ExerciseType.SYLLABLE_POSITION_CHOOSE: Renderer.CHOICE, ExerciseType.WORD_IMAGE_CHOOSE: Renderer.CHOICE,
    ExerciseType.SENTENCE_IMAGE_CHOOSE: Renderer.CHOICE,
}
EXERCISE_ID_SUFFIX: dict[ExerciseType, str] = {
    ExerciseType.LISTEN_CHOOSE: "listen", ExerciseType.RECOGNIZE_LETTER: "recognize", ExerciseType.FIND_IN_WORD: "find",
    ExerciseType.INITIAL_SOUND: "initial-sound", ExerciseType.FIND_ALL_IN_WORD: "find-all", ExerciseType.COMPARE_WORDS: "compare", ExerciseType.MIXED_REVIEW: "review",
    ExerciseType.SYLLABLE_LISTEN_CHOOSE: "syllable", ExerciseType.COMPLETE_WORD: "complete-word", ExerciseType.WORD_LISTEN_CHOOSE: "word",
    ExerciseType.WORD_FROM_SYLLABLES: "build", ExerciseType.SENTENCE_FILL_WORD: "fill", ExerciseType.SENTENCE_ORDER: "order",
    ExerciseType.SYLLABLE_POSITION_CHOOSE: "syllable-position", ExerciseType.WORD_IMAGE_CHOOSE: "word-image",
    ExerciseType.SENTENCE_IMAGE_CHOOSE: "sentence-image",
}
LEGACY_ALIASES: dict[str, ExerciseType] = {"recognize": ExerciseType.RECOGNIZE_LETTER}
REQUIRED_LETTER_EXERCISE_TYPES = (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER, ExerciseType.INITIAL_SOUND, ExerciseType.FIND_ALL_IN_WORD, ExerciseType.COMPARE_WORDS, ExerciseType.COMPLETE_WORD, ExerciseType.MIXED_REVIEW)
FIND_IN_WORD_EXEMPT_LETTERS = "AE"

LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY"
VOWELS = "AEIOU"
PHASE_SPECS = ((1, "Vogais", "AEIOU"), (2, "Consoantes de alta utilidade", "MLPSTRNDCG"), (3, "Ampliação do vocabulário", "BFVHQJKZXWY"))


def required_types_for(letter: str) -> tuple[ExerciseType, ...]:
    return REQUIRED_LETTER_EXERCISE_TYPES


def normalize_exercise_type(value: str) -> ExerciseType | None:
    """Traduz tipos legados (ex.: "recognize") e devolve None para tipos removidos (ex.: "write")."""
    if value in ExerciseType._value2member_map_:
        return ExerciseType(value)
    return LEGACY_ALIASES.get(value)
