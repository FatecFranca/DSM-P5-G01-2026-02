import { describe, expect, it } from "vitest";
import type { LessonProgress, SyncEvent } from "../domain/types";
import { canonicalizeProgress, mergeProgress, parseAcceptedIds, toApiEvent } from "./contract";
describe("contrato da API de sync", () => {
  it("converte tentativa camelCase para envelope snake_case com IDs canônicos", () => {
    const event: SyncEvent = { id: "evt-1", type: "attempt", payload: { clientAttemptId: "try-1", lessonId: "letter-a", exerciseId: "A-complete-word", exerciseType: "complete_word", answer: "cachorro", correct: true, durationMs: 1200, createdAt: "2026-01-01T00:00:00Z" } };
    expect(toApiEvent(event)).toEqual({ client_event_id: "evt-1", type: "attempt", occurred_at: "2026-01-01T00:00:00Z", payload: { client_attempt_id: "try-1", item_id: "exercise-A-complete-word", unit_id: "lesson-A", exercise_type: "complete_word", answer: "cachorro", correct: true, duration_ms: 1200 } });
  });
  it("envia progresso com metadados de domínio", () => { const event: SyncEvent = { id: "p", type: "progress", payload: { lessonId: "letter-a", completedTypes: ["listen_choose", "recognize_letter"], score: 2, completed: false, updatedAt: "2026-01-01T00:00:00Z" } }; expect(toApiEvent(event)).toEqual({ client_event_id: "p", type: "progress", occurred_at: "2026-01-01T00:00:00Z", payload: { unit_id: "lesson-A", status: "in_progress", completed_exercises: 2, completed_types: ["listen_choose", "recognize_letter"], attempts: 0, correct_attempts: 0, accuracy: null, review_count: 0, last_practiced_at: null, next_review_at: null } }); });
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
