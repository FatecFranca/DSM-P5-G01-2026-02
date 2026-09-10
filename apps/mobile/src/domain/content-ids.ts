import { EXERCISE_ID_SUFFIX, type ExerciseType } from "./exercise-types";

// Versões anteriores do app usavam `letter-a` e `A-listen`; o formato canônico é o do servidor.
const LEGACY_LESSON = /^letter-([a-z])$/;
const EXERCISE = /^(?:exercise-)?([A-Z])-(listen|recognize|find|find_in_word|complete-word)$/;

export const lessonIdFor = (letter: string) => `lesson-${letter.toUpperCase()}`;
export const exerciseIdFor = (letter: string, type: ExerciseType) => `exercise-${letter.toUpperCase()}-${EXERCISE_ID_SUFFIX[type]}`;

export function canonicalLessonId(id: string): string {
  const match = LEGACY_LESSON.exec(id);
  return match ? lessonIdFor(match[1]) : id;
}

export function canonicalExerciseId(id: string): string {
  const match = EXERCISE.exec(id);
  return match ? `exercise-${match[1]}-${match[2] === "find_in_word" ? "find" : match[2]}` : id;
}
