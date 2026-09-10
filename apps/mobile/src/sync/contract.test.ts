import { describe, expect, it } from "vitest";
import type { LessonProgress, SyncEvent } from "../domain/types";
import { mergeProgress, parseAcceptedIds, toApiEvent } from "./contract";
describe("contrato da API de sync", () => {
  it("converte tentativa camelCase para envelope e payload snake_case", () => {
    const event: SyncEvent = { id: "evt-1", type: "attempt", payload: { clientAttemptId: "try-1", lessonId: "letter-a", exerciseId: "A-complete-word", exerciseType: "complete_word", answer: "cachorro", correct: true, durationMs: 1200, createdAt: "2026-01-01T00:00:00Z" } };
    expect(toApiEvent(event)).toEqual({ client_event_id: "evt-1", type: "attempt", occurred_at: "2026-01-01T00:00:00Z", payload: { client_attempt_id: "try-1", exercise_id: "A-complete-word", answer: "cachorro", correct: true, confidence: null, uncertain: false, duration_ms: 1200, model_version: null } });
  });
  it("envia progresso sem campos extras proibidos", () => { const event: SyncEvent = { id: "p", type: "progress", payload: { lessonId: "letter-a", completedTypes: ["listen_choose", "recognize"], score: 2, completed: false, updatedAt: "2026-01-01T00:00:00Z" } }; expect(toApiEvent(event)).toEqual({ client_event_id: "p", type: "progress", occurred_at: "2026-01-01T00:00:00Z", payload: { lesson_id: "letter-a", status: "in_progress", completed_exercises: 2 } }); });
  it("mapeia accepted_ids da API", () => expect(parseAcceptedIds({ accepted_ids: ["novo", "duplicado"] })).toEqual(["novo", "duplicado"]));
  it("une progresso sem regredir em conflito", () => {
    const local: LessonProgress = { lessonId: "letter-a", completedTypes: ["listen_choose"], score: 1, completed: false, updatedAt: "2026-01-02T00:00:00Z" };
    const remote: LessonProgress = { lessonId: "letter-a", completedTypes: ["recognize"], score: 1, completed: false, updatedAt: "2026-01-01T00:00:00Z" };
    expect(mergeProgress(local, remote).completedTypes).toEqual(["listen_choose", "recognize"]);
    expect(mergeProgress(local, remote).updatedAt).toBe(local.updatedAt);
  });
});
