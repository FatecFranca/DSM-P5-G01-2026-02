import { canonicalExerciseId, canonicalLessonId } from "../domain/content-ids";
import { normalizeExerciseType, normalizeExerciseTypes } from "../domain/exercise-types";
import type { ExerciseType, ItemState, LessonProgress, SyncEvent } from "../domain/types";

export type ApiSyncEvent = { client_event_id: string; type: string; occurred_at: string; payload: Record<string, unknown> };
export const parseAcceptedIds = (data: { accepted_ids?: string[]; acceptedIds?: string[] }) => data.accepted_ids ?? data.acceptedIds ?? [];
/** Eventos que o catálogo atual não reconhece; saem da fila para não travá-la indefinidamente. */
export const parseRejections = (data: { rejections?: Array<{ client_event_id?: string; reason?: string }>; rejected_ids?: string[] }) =>
  (data.rejections ?? []).map((item) => ({ id: String(item.client_event_id ?? ""), reason: String(item.reason ?? "motivo desconhecido") })).filter((item) => item.id)
    .concat((data.rejected_ids ?? []).filter((id) => !(data.rejections ?? []).some((item) => item.client_event_id === id)).map((id) => ({ id, reason: "motivo desconhecido" })));

// No domínio do app a unidade é `lessonId` e o item é `exerciseId`; no fio são `unit_id` e `item_id`.
export function toApiEvent(event: SyncEvent): ApiSyncEvent {
  const p = event.payload as Record<string, unknown>;
  const occurredAt = String(p.createdAt ?? p.updatedAt ?? new Date().toISOString());
  if (event.type === "attempt") return { client_event_id: event.id, type: "attempt", occurred_at: occurredAt, payload: {
    client_attempt_id: p.clientAttemptId, item_id: canonicalExerciseId(String(p.exerciseId)), unit_id: canonicalLessonId(String(p.lessonId)), exercise_type: normalizeExerciseType(p.exerciseType) ?? null,
    answer: p.answer, correct: p.correct, duration_ms: p.durationMs,
    session_id: p.sessionId ?? null, position_in_session: p.positionInSession ?? null, attempt_index_in_item: p.attemptIndexInItem ?? null, audio_repeats: p.audioRepeats ?? null,
    time_to_first_interaction_ms: p.timeToFirstInteractionMs ?? null, served_by: p.servedBy ?? null, served_policy_version: p.servedPolicyVersion ?? null, served_model_version: p.servedModelVersion ?? null,
  } };
  if (event.type === "item_state") return { client_event_id: event.id, type: "item_state", occurred_at: occurredAt, payload: {
    item_id: canonicalExerciseId(String(p.itemId)), unit_id: canonicalLessonId(String(p.unitId)), strength: p.strength, half_life_hours: p.halfLifeHours, due_at: p.dueAt,
    reps: p.reps, lapses: p.lapses, consecutive_correct: p.consecutiveCorrect, last_result: p.lastResult, last_seen_at: p.lastSeenAt,
  } };
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

/** Último registro vence; repetições e lapsos só crescem — o mesmo padrão do servidor. */
export function mergeItemState(local: ItemState | undefined, remote: ItemState): ItemState {
  if (!local) return remote;
  const latest = Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt) ? remote : local;
  return { ...latest, reps: Math.max(local.reps, remote.reps), lapses: Math.max(local.lapses, remote.lapses) };
}

const number = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const text = (value: unknown) => (typeof value === "string" ? value : undefined);

/** Converte um evento `item_state` recebido no pull; devolve `undefined` se o payload não tiver o mínimo. */
export function parsePulledItemState(payload: Record<string, unknown>, occurredAt: string): ItemState | undefined {
  const itemId = text(payload.item_id); const unitId = text(payload.unit_id); const dueAt = text(payload.due_at); const lastSeenAt = text(payload.last_seen_at);
  if (!itemId || !unitId || !dueAt || !lastSeenAt) return undefined;
  return { itemId: canonicalExerciseId(itemId), unitId: canonicalLessonId(unitId), strength: number(payload.strength), halfLifeHours: number(payload.half_life_hours, 4), dueAt, reps: number(payload.reps), lapses: number(payload.lapses), consecutiveCorrect: number(payload.consecutive_correct), lastResult: payload.last_result === true, lastSeenAt, updatedAt: occurredAt };
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
