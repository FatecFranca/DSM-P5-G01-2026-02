import { lessonIdFor } from "./content-ids";
import { REQUIRED_LETTER_EXERCISE_TYPES, normalizeExerciseTypes } from "./exercise-types";
import type { ExerciseType, LessonProgress } from "./types";

export type Feedback = { kind: "success" | "try-again" | "incorrect"; title: string; message: string };

export function nextProgress(current: LessonProgress | undefined, type: ExerciseType, correct: boolean, requiredTypes: readonly ExerciseType[] = REQUIRED_LETTER_EXERCISE_TYPES): LessonProgress {
  const completedTypes = normalizeExerciseTypes(current?.completedTypes);
  const updated = correct && !completedTypes.includes(type) ? [...completedTypes, type] : completedTypes;
  const now = new Date();
  const attempts = (current?.attempts ?? 0) + 1;
  const correctAttempts = (current?.correctAttempts ?? 0) + (correct ? 1 : 0);
  const completed = requiredTypes.every((item) => updated.includes(item));
  const nextReviewAt = completed ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() : current?.nextReviewAt;
  return { lessonId: current?.lessonId ?? "current", completedTypes: updated, score: updated.length, completed, status: completed ? "mastered" : "learning", attempts, correctAttempts, reviewCount: current?.reviewCount ?? 0, accuracy: correctAttempts / attempts, lastPracticedAt: now.toISOString(), nextReviewAt, updatedAt: now.toISOString() };
}

export function isLessonUnlocked(lesson: { order: number; prerequisiteLetters: string[] }, progress: Record<string, { completed?: boolean } | undefined>): boolean {
  return lesson.order === 1 || lesson.prerequisiteLetters.every((letter) => progress[lessonIdFor(letter)]?.completed === true);
}

export function lessonNeedsReview(progress: LessonProgress | undefined, now = new Date()): boolean {
  return Boolean(progress?.completed && progress.nextReviewAt && Date.parse(progress.nextReviewAt) <= now.getTime());
}
