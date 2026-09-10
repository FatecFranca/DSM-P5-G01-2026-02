// Espelha contracts/exercise-types.json e contracts/pedagogy.json; exercise-types.test.ts garante a paridade.
export const EXERCISE_TYPES = ["listen_choose", "recognize_letter", "find_in_word", "complete_word"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const LEGACY_EXERCISE_TYPE_ALIASES: Readonly<Record<string, ExerciseType>> = { recognize: "recognize_letter" };
export const EXERCISE_ID_SUFFIX: Readonly<Record<ExerciseType, string>> = { listen_choose: "listen", recognize_letter: "recognize", find_in_word: "find", complete_word: "complete-word" };
export const REQUIRED_LETTER_EXERCISE_TYPES: readonly ExerciseType[] = ["listen_choose", "recognize_letter", "find_in_word"];
export const FIND_IN_WORD_EXEMPT_LETTERS = "AE";
export const requiredTypesFor = (letter: string): ExerciseType[] => REQUIRED_LETTER_EXERCISE_TYPES.filter((type) => type !== "find_in_word" || !FIND_IN_WORD_EXEMPT_LETTERS.includes(letter));

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
