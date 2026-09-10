import { describe, expect, it } from "vitest";
import { feedbackFor, nextProgress } from "./learning";

describe("aprendizagem respeitosa", () => {
  it("convida a tentar novamente quando a inferência é incerta", () => {
    expect(feedbackFor({ className: "B", confidence: 0.42, uncertain: true, modelVersion: "fallback-1" }, "A").kind).toBe("try-again");
  });

  it("só conclui a lição depois dos três tipos de exercício", () => {
    let progress = nextProgress(undefined, "listen_choose", true);
    progress = nextProgress(progress, "recognize", true);
    expect(progress.completed).toBe(false);
    progress = nextProgress(progress, "complete_word", true);
    expect(progress.completed).toBe(true);
    expect(progress.score).toBe(3);
  });

  it("ignora o tipo antigo de escrita ao atualizar progresso salvo", () => {
    const progress = nextProgress({ lessonId: "letter-a", completedTypes: ["listen_choose", "recognize", "write" as never], score: 3, completed: true, updatedAt: "2026-01-01T00:00:00Z" }, "complete_word", true);
    expect(progress.completedTypes).toEqual(["listen_choose", "recognize", "complete_word"]);
    expect(progress.completed).toBe(true);
  });
});
