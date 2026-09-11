import { canonicalExerciseId, canonicalLessonId } from "../domain/content-ids";
import { normalizeExerciseType, normalizeExerciseTypes } from "../domain/exercise-types";
import type { ExerciseType, LessonProgress, SyncEvent } from "../domain/types";

export type ApiSyncEvent = { client_event_id: string; type: string; occurred_at: string; payload: Record<string, unknown> };
export const parseAcceptedIds = (data: { accepted_ids?: string[]; acceptedIds?: string[] }) => data.accepted_ids ?? data.acceptedIds ?? [];
export function toApiEvent(event: SyncEvent): ApiSyncEvent {
  const p = event.payload as Record<string, unknown>;
  const occurredAt = String(p.createdAt ?? p.updatedAt ?? new Date().toISOString());
  if (event.type === "attempt") return { client_event_id: event.id, type: "attempt", occurred_at: occurredAt, payload: { client_attempt_id: p.clientAttemptId, item_id: canonicalExerciseId(String(p.exerciseId)), unit_id: canonicalLessonId(String(p.lessonId)), exercise_type: normalizeExerciseType(p.exerciseType) ?? null, answer: p.answer, correct: p.correct, duration_ms: p.durationMs } };
  const completed = (p.completedTypes as string[] | undefined) ?? [];
  return { client_event_id: event.id, type: "progress", occurred_at: occurredAt, payload: { unit_id: canonicalLessonId(String(p.lessonId)), status: p.status === "review" || p.status === "needs_review" ? p.status : p.completed || p.status === "mastered" ? "completed" : completed.length ? "in_progress" : "not_started", completed_exercises: completed.length, completed_types: completed, attempts: p.attempts ?? 0, correct_attempts: p.correctAttempts ?? 0, accuracy: p.accuracy ?? null, review_count: p.reviewCount ?? 0, last_practiced_at: p.lastPracticedAt ?? null, next_review_at: p.nextReviewAt ?? null } };
}

/** `requiredTypes` vem da lição no bundle; sem ele, a conclusão só é herdada, nunca deduzida. */
export function mergeProgress(local: LessonProgress | undefined, remote: LessonProgress, requiredTypes?: readonly ExerciseType[]): LessonProgress {
  if (!local) return remote;
  const completedTypes = normalizeExerciseTypes([...local.completedTypes, ...remote.completedTypes]);
  const latest = Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
  return { ...latest, completedTypes, score: Math.max(local.score, remote.score, completedTypes.length), completed: local.completed || remote.completed || (requiredTypes !== undefined && requiredTypes.every((type) => completedTypes.includes(type))) };
}

/** Reúne progresso salvo sob IDs legados (`letter-a`) no ID canônico, mesclando duplicatas. */
export function canonicalizeProgress(items: LessonProgress[]): LessonProgress[] {
  const merged = new Map<string, LessonProgress>();
  for (const item of items) {
    const canonical = { ...item, lessonId: canonicalLessonId(item.lessonId), completedTypes: normalizeExerciseTypes(item.completedTypes) };
    merged.set(canonical.lessonId, mergeProgress(merged.get(canonical.lessonId), canonical));
  }
  return [...merged.values()];
}
