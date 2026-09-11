import { lessonIdFor } from "./content-ids";
import { isDue, isMastered, type ItemState } from "./scheduler";
import type { LessonProgress, Unit } from "./types";

export type Feedback = { kind: "success" | "try-again" | "incorrect"; title: string; message: string };

type ProgressMap = Record<string, { completed?: boolean } | undefined>;
type StateMap = Record<string, ItemState | undefined>;

/**
 * O progresso da unidade é um resumo derivado dos estados por item: concluída quando todo item foi acertado no
 * último encontro; `needs_review` quando concluída e algum item venceu. `reviewCount` é herdado e incrementado
 * pelo chamador ao fechar uma sessão de revisão.
 */
export function deriveProgress(unit: Unit, states: StateMap, now: Date, current?: LessonProgress): LessonProgress {
  const known = unit.exercises.map((exercise) => ({ exercise, state: states[exercise.id] })).filter((entry): entry is { exercise: Unit["exercises"][number]; state: ItemState } => entry.state !== undefined);
  const mastered = known.filter(({ state }) => isMastered(state));
  const completed = unit.exercises.length > 0 && mastered.length === unit.exercises.length;
  const due = mastered.some(({ state }) => isDue(state, now));
  const attempts = known.reduce((total, { state }) => total + state.reps, 0);
  const correctAttempts = known.reduce((total, { state }) => total + state.reps - state.lapses, 0);
  const completedTypes = [...new Set(mastered.map(({ exercise }) => exercise.type))];
  const lastPracticedAt = known.map(({ state }) => state.lastSeenAt).sort().at(-1);
  const nextReviewAt = mastered.map(({ state }) => state.dueAt).sort()[0];
  return {
    lessonId: unit.id, completedTypes, score: completedTypes.length, completed,
    status: completed ? (due ? "needs_review" : "mastered") : known.length ? "learning" : "available",
    attempts, correctAttempts, accuracy: attempts ? correctAttempts / attempts : undefined,
    reviewCount: current?.reviewCount ?? 0, lastPracticedAt, nextReviewAt, updatedAt: now.toISOString(),
  };
}

/** Uma letra conta como apresentada quando sua unidade foi concluída. */
export const isLetterPresented = (letter: string, progress: ProgressMap): boolean => progress[lessonIdFor(letter)]?.completed === true;

/**
 * Portão pedagógico único para letras e trilhas temáticas: toda letra pré-requisito precisa estar dominada.
 * A unidade sem pré-requisitos (a letra A) está sempre liberada; a trilha temática nunca libera nada por si.
 */
export function isLessonUnlocked(lesson: { prerequisiteLetters: string[] }, progress: ProgressMap): boolean {
  return lesson.prerequisiteLetters.every((letter) => isLetterPresented(letter, progress));
}

/** Itens da unidade já vistos e vencidos: o que a sessão de revisão precisa cobrir. */
export const dueItems = (unit: Unit, states: StateMap, now: Date) => unit.exercises.filter((exercise) => { const state = states[exercise.id]; return state !== undefined && isDue(state, now); });

export const lessonNeedsReview = (unit: Unit, states: StateMap, now: Date): boolean => dueItems(unit, states, now).length > 0;
