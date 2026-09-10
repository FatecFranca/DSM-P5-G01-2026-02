import { describe, expect, it } from "vitest";
import { lessonIdFor } from "./content-ids";
import { isLessonUnlocked, nextProgress } from "./learning";

describe("aprendizagem respeitosa", () => {
  it("só conclui a lição depois dos três tipos de exercício", () => {
    let progress = nextProgress(undefined, "listen_choose", true);
    progress = nextProgress(progress, "recognize_letter", true);
    expect(progress.completed).toBe(false);
    progress = nextProgress(progress, "find_in_word", true);
    expect(progress.completed).toBe(true);
    expect(progress.score).toBe(3);
  });

  it("ignora o tipo antigo de escrita ao atualizar progresso salvo", () => {
    const progress = nextProgress({ lessonId: "letter-a", completedTypes: ["listen_choose", "recognize" as never, "write" as never], score: 3, completed: true, updatedAt: "2026-01-01T00:00:00Z" }, "find_in_word", true);
    expect(progress.completedTypes).toEqual(["listen_choose", "recognize_letter", "find_in_word"]);
    expect(progress.completed).toBe(true);
  });

  it("exige todos os exercícios da unidade antes de dominar a letra", () => {
    let progress = nextProgress(undefined, "listen_choose", true, ["listen_choose", "recognize_letter", "find_in_word"]);
    progress = nextProgress(progress, "recognize_letter", true, ["listen_choose", "recognize_letter", "find_in_word"]);
    expect(progress.completed).toBe(false);
    progress = nextProgress(progress, "find_in_word", true, ["listen_choose", "recognize_letter", "find_in_word"]);
    expect(progress.completed).toBe(true);
    expect(progress.status).toBe("mastered");
    expect(progress.accuracy).toBe(1);
  });

  it("libera uma letra somente quando todos os pré-requisitos foram dominados", () => {
    const lesson = { order: 6, prerequisiteLetters: ["A", "E", "I", "O", "U"] };
    const complete = Object.fromEntries(lesson.prerequisiteLetters.map((letter) => [lessonIdFor(letter), { completed: true }]));
    expect(isLessonUnlocked(lesson, complete)).toBe(true);
    expect(isLessonUnlocked(lesson, { ...complete, [lessonIdFor("U")]: { completed: false } })).toBe(false);
  });
});
