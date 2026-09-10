import { describe, expect, it } from "vitest";
import { canonicalExerciseId, canonicalLessonId, exerciseIdFor, lessonIdFor } from "./content-ids";

describe("IDs canônicos de conteúdo", () => {
  it("compõe IDs no formato do servidor", () => {
    expect(lessonIdFor("a")).toBe("lesson-A");
    expect(exerciseIdFor("A", "recognize_letter")).toBe("exercise-A-recognize");
    expect(exerciseIdFor("M", "complete_word")).toBe("exercise-M-complete-word");
  });

  it("traduz formatos legados e preserva IDs já canônicos ou desconhecidos", () => {
    expect(canonicalLessonId("letter-a")).toBe("lesson-A");
    expect(canonicalLessonId("lesson-A")).toBe("lesson-A");
    expect(canonicalExerciseId("A-listen")).toBe("exercise-A-listen");
    expect(canonicalExerciseId("exercise-A-find_in_word")).toBe("exercise-A-find");
    expect(canonicalExerciseId("exercise-A-recognize")).toBe("exercise-A-recognize");
    expect(canonicalExerciseId("sem-padrao")).toBe("sem-padrao");
  });
});
