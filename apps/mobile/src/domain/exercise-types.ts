// Espelha contracts/exercise-types.json e contracts/pedagogy.json; exercise-types.test.ts garante a paridade.
export const EXERCISE_TYPES = ["listen_choose", "recognize_letter", "find_in_word", "initial_sound", "find_all_in_word", "compare_words", "mixed_review", "syllable_listen_choose", "complete_word", "word_listen_choose", "word_from_syllables", "sentence_fill_word", "sentence_order", "syllable_position_choose", "word_image_choose", "sentence_image_choose", "first_last_letters", "alphabet_neighbors", "syllables_to_word", "picture_choose", "word_letter_fit"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type ItemKind = "letter" | "syllable" | "word" | "sentence";
export type Renderer = "choice" | "word_choices" | "order" | "multi_select";

export const TARGET_OF: Readonly<Record<ExerciseType, ItemKind>> = { listen_choose: "letter", recognize_letter: "letter", find_in_word: "letter", initial_sound: "letter", find_all_in_word: "letter", compare_words: "letter", mixed_review: "letter", syllable_listen_choose: "syllable", complete_word: "letter", word_listen_choose: "word", word_from_syllables: "word", sentence_fill_word: "sentence", sentence_order: "sentence", syllable_position_choose: "syllable", word_image_choose: "word", sentence_image_choose: "sentence", first_last_letters: "letter", alphabet_neighbors: "letter", syllables_to_word: "word", picture_choose: "word", word_letter_fit: "letter" };
export const RENDERER_OF: Readonly<Record<ExerciseType, Renderer>> = { listen_choose: "choice", recognize_letter: "choice", find_in_word: "choice", initial_sound: "choice", find_all_in_word: "multi_select", compare_words: "choice", mixed_review: "choice", syllable_listen_choose: "choice", complete_word: "choice", word_listen_choose: "choice", word_from_syllables: "order", sentence_fill_word: "choice", sentence_order: "order", syllable_position_choose: "choice", word_image_choose: "choice", sentence_image_choose: "choice", first_last_letters: "multi_select", alphabet_neighbors: "choice", syllables_to_word: "choice", picture_choose: "choice", word_letter_fit: "word_choices" };
export const EXERCISE_ID_SUFFIX: Readonly<Record<ExerciseType, string>> = { listen_choose: "listen", recognize_letter: "recognize", find_in_word: "find", initial_sound: "initial-sound", find_all_in_word: "find-all", compare_words: "compare", mixed_review: "review", syllable_listen_choose: "syllable", complete_word: "complete-word", word_listen_choose: "word", word_from_syllables: "build", sentence_fill_word: "fill", sentence_order: "order", syllable_position_choose: "syllable-position", word_image_choose: "word-image", sentence_image_choose: "sentence-image", first_last_letters: "first-last", alphabet_neighbors: "neighbors", syllables_to_word: "syllables-word", picture_choose: "picture", word_letter_fit: "letter-fit" };
export const LEGACY_EXERCISE_TYPE_ALIASES: Readonly<Record<string, ExerciseType>> = { recognize: "recognize_letter" };
export const REQUIRED_LETTER_EXERCISE_TYPES: readonly ExerciseType[] = ["listen_choose", "initial_sound", "first_last_letters"];
export const LETTER_EXERCISES_PER_LESSON = { minimum: 5, maximum: 10 } as const;
export const FIND_IN_WORD_EXEMPT_LETTERS = "AE";
export const requiredTypesFor = (letter: string): ExerciseType[] => { void letter; return [...REQUIRED_LETTER_EXERCISE_TYPES]; };

export const LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY";
export const PHASES = [
  { phase: 1, title: "Vogais", letters: "AEIOU" },
  { phase: 2, title: "Consoantes de alta utilidade", letters: "MLPSTRNDCG" },
  { phase: 3, title: "Ampliação do vocabulário", letters: "BFVHQJKZXWY" },
] as const;

const known = new Set<string>(EXERCISE_TYPES);

/** Traduz tipos legados (ex.: "recognize") e descarta tipos removidos (ex.: "write"). */
export function normalizeExerciseType(value: unknown): ExerciseType | undefined {
  if (typeof value !== "string") return undefined;
  return known.has(value) ? (value as ExerciseType) : LEGACY_EXERCISE_TYPE_ALIASES[value];
}

export function normalizeExerciseTypes(values: unknown): ExerciseType[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(normalizeExerciseType).filter((item): item is ExerciseType => item !== undefined))];
}

/** Letras necessárias, na ordem de aprendizagem, ignorando acentos e tudo que não é letra. Espelha content_data.required_letters. */
export function requiredLetters(text: string): string {
  const present = new Set([...text.normalize("NFD").toUpperCase()].filter((character) => character >= "A" && character <= "Z"));
  return [...LEARNING_ORDER].filter((letter) => present.has(letter)).join("");
}
