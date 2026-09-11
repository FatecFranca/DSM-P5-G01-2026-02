import { describe, expect, it } from "vitest";
import type { ItemState, LessonProgress, SyncEvent } from "../domain/types";
import { canonicalizeProgress, mergeItemState, mergeProgress, parseAcceptedIds, parsePulledItemState, toApiEvent } from "./contract";
describe("contrato da API de sync", () => {
  it("converte tentativa camelCase para envelope snake_case com IDs canônicos e contexto de sessão", () => {
    const event: SyncEvent = { id: "evt-1", type: "attempt", payload: { clientAttemptId: "try-1", lessonId: "letter-a", exerciseId: "A-complete-word", exerciseType: "complete_word", answer: "cachorro", correct: true, durationMs: 1200, createdAt: "2026-01-01T00:00:00Z", sessionId: "s1", positionInSession: 2, attemptIndexInItem: 1, audioRepeats: 3, timeToFirstInteractionMs: 800, servedBy: "rules", servedPolicyVersion: "session-v1" } };
    expect(toApiEvent(event)).toEqual({ client_event_id: "evt-1", type: "attempt", occurred_at: "2026-01-01T00:00:00Z", payload: { client_attempt_id: "try-1", item_id: "exercise-A-complete-word", unit_id: "lesson-A", exercise_type: "complete_word", answer: "cachorro", correct: true, duration_ms: 1200, session_id: "s1", position_in_session: 2, attempt_index_in_item: 1, audio_repeats: 3, time_to_first_interaction_ms: 800, served_by: "rules", served_policy_version: "session-v1", served_model_version: null } });
  });
  it("envia progresso com metadados de domínio", () => { const event: SyncEvent = { id: "p", type: "progress", payload: { lessonId: "letter-a", completedTypes: ["listen_choose", "recognize_letter"], score: 2, completed: false, updatedAt: "2026-01-01T00:00:00Z" } }; expect(toApiEvent(event)).toEqual({ client_event_id: "p", type: "progress", occurred_at: "2026-01-01T00:00:00Z", payload: { unit_id: "lesson-A", status: "in_progress", completed_exercises: 2, completed_types: ["listen_choose", "recognize_letter"], attempts: 0, correct_attempts: 0, accuracy: null, review_count: 0, last_practiced_at: null, next_review_at: null } }); });
  it("envia e recebe estado por item no formato do servidor", () => {
    const state: ItemState = { itemId: "A-listen", unitId: "letter-a", strength: 2, halfLifeHours: 16, dueAt: "2026-01-02T00:00:00Z", reps: 3, lapses: 1, consecutiveCorrect: 2, lastResult: true, lastSeenAt: "2026-01-01T08:00:00Z", updatedAt: "2026-01-01T08:00:00Z" };
    const wire = toApiEvent({ id: "item_state:A-listen", type: "item_state", payload: state as unknown as Record<string, unknown> });
    expect(wire).toEqual({ client_event_id: "item_state:A-listen", type: "item_state", occurred_at: "2026-01-01T08:00:00Z", payload: { item_id: "exercise-A-listen", unit_id: "lesson-A", strength: 2, half_life_hours: 16, due_at: "2026-01-02T00:00:00Z", reps: 3, lapses: 1, consecutive_correct: 2, last_result: true, last_seen_at: "2026-01-01T08:00:00Z" } });
    expect(parsePulledItemState(wire.payload, "2026-01-01T09:00:00Z")).toEqual({ ...state, itemId: "exercise-A-listen", unitId: "lesson-A", updatedAt: "2026-01-01T09:00:00Z" });
    expect(parsePulledItemState({ item_id: "x" }, "2026-01-01T09:00:00Z")).toBeUndefined();
  });
  it("mescla estado por item: último vence, repetições e lapsos só crescem", () => {
    const local: ItemState = { itemId: "i", unitId: "u", strength: 3, halfLifeHours: 32, dueAt: "2026-01-03T00:00:00Z", reps: 5, lapses: 2, consecutiveCorrect: 3, lastResult: true, lastSeenAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" };
    const remote: ItemState = { ...local, strength: 0, halfLifeHours: 4, reps: 2, lapses: 1, consecutiveCorrect: 0, lastResult: false, updatedAt: "2026-01-01T00:00:00Z" };
    expect(mergeItemState(local, remote)).toEqual(local);
    expect(mergeItemState(local, { ...remote, updatedAt: "2026-01-04T00:00:00Z" })).toMatchObject({ strength: 0, reps: 5, lapses: 2, updatedAt: "2026-01-04T00:00:00Z" });
    expect(mergeItemState(undefined, remote)).toBe(remote);
  });
  it("mapeia accepted_ids da API", () => expect(parseAcceptedIds({ accepted_ids: ["novo", "duplicado"] })).toEqual(["novo", "duplicado"]));
  it("une progresso sem regredir em conflito", () => {
    const local: LessonProgress = { lessonId: "letter-a", completedTypes: ["listen_choose"], score: 1, completed: false, updatedAt: "2026-01-02T00:00:00Z" };
    const remote: LessonProgress = { lessonId: "letter-a", completedTypes: ["recognize_letter"], score: 1, completed: false, updatedAt: "2026-01-01T00:00:00Z" };
    expect(mergeProgress(local, remote).completedTypes).toEqual(["listen_choose", "recognize_letter"]);
    expect(mergeProgress(local, remote).updatedAt).toBe(local.updatedAt);
    const fuller = { ...remote, completedTypes: ["recognize_letter", "find_in_word"] as LessonProgress["completedTypes"] };
    expect(mergeProgress(local, fuller).completed).toBe(false);
    expect(mergeProgress(local, fuller, ["listen_choose", "recognize_letter", "find_in_word"]).completed).toBe(true);
    expect(mergeProgress(local, fuller, ["listen_choose", "recognize_letter", "find_in_word", "complete_word"]).completed).toBe(false);
  });
  it("reúne progresso legado sob o ID canônico sem perder conclusão", () => {
    const legacy: LessonProgress = { lessonId: "letter-a", completedTypes: ["listen_choose", "recognize" as never], score: 2, completed: true, updatedAt: "2026-01-01T00:00:00Z" };
    const current: LessonProgress = { lessonId: "lesson-A", completedTypes: ["find_in_word"], score: 1, completed: false, updatedAt: "2026-01-02T00:00:00Z" };
    const [merged, ...rest] = canonicalizeProgress([legacy, current, { ...legacy, lessonId: "letter-e" }]);
    expect(rest.map((item) => item.lessonId)).toEqual(["lesson-E"]);
    expect(merged.lessonId).toBe("lesson-A");
    expect(merged.completed).toBe(true);
    expect(merged.completedTypes).toEqual(["listen_choose", "recognize_letter", "find_in_word"]);
  });
});
