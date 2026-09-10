import type { LessonProgress, SyncEvent } from "../domain/types";

export type ApiSyncEvent = { client_event_id: string; type: string; occurred_at: string; payload: Record<string, unknown> };
export const parseAcceptedIds = (data: { accepted_ids?: string[]; acceptedIds?: string[] }) => data.accepted_ids ?? data.acceptedIds ?? [];
export function toApiEvent(event: SyncEvent): ApiSyncEvent {
  const p = event.payload as Record<string, unknown>;
  const occurredAt = String(p.createdAt ?? p.updatedAt ?? new Date().toISOString());
  if (event.type === "attempt") return { client_event_id: event.id, type: "attempt", occurred_at: occurredAt, payload: { client_attempt_id: p.clientAttemptId, exercise_id: p.exerciseId, answer: p.answer, correct: p.correct, confidence: p.confidence ?? null, uncertain: p.uncertain ?? false, duration_ms: p.durationMs, model_version: p.modelVersion ?? null } };
  const completed = (p.completedTypes as string[] | undefined) ?? [];
  return { client_event_id: event.id, type: "progress", occurred_at: occurredAt, payload: { lesson_id: p.lessonId, status: p.completed ? "completed" : completed.length ? "in_progress" : "not_started", completed_exercises: completed.length } };
}

export function mergeProgress(local: LessonProgress | undefined, remote: LessonProgress): LessonProgress {
  if (!local) return remote;
  const completedTypes = [...new Set([...local.completedTypes, ...remote.completedTypes])];
  const latest = Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
  return { ...latest, completedTypes, score: Math.max(local.score, remote.score, completedTypes.length), completed: local.completed || remote.completed || completedTypes.length === 3 };
}
