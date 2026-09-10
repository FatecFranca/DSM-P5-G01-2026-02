import { describe, expect, it } from "vitest";
import seed from "../../assets/content/seed-bundle.json";
import { toLessons, validateBundle, type ContentBundle } from "./schema";

const bundle = () => JSON.parse(JSON.stringify(seed)) as ContentBundle;
const lessonOf = (value: ContentBundle, letter: string) => value.modules.flatMap((module) => module.lessons).find((lesson) => lesson.letter === letter)!;

describe("bundle de conteúdo", () => {
  it("aceita o bundle semente embarcado", () => {
    expect(validateBundle(seed)).toEqual([]);
  });

  it("projeta as 26 lições na ordem, com pré-requisitos e exercícios por letra", () => {
    const lessons = toLessons(bundle());
    expect(lessons.map((lesson) => lesson.letter).join("")).toBe("AEIOUMLPSTRNDCGBFVHQJKZXWY");
    expect(lessons.every((lesson, index) => lesson.order === index + 1 && lesson.prerequisiteLetters.length === index)).toBe(true);
    expect(lessons.find((lesson) => lesson.letter === "G")?.phase).toBe(2);
    const types = (letter: string) => lessons.find((lesson) => lesson.letter === letter)!.exercises.map((exercise) => exercise.type);
    expect(types("A")).toEqual(["listen_choose", "recognize_letter"]);
    expect(types("M")).toEqual(["listen_choose", "recognize_letter", "find_in_word"]);
    expect(types("L")).toEqual(["listen_choose", "recognize_letter", "find_in_word", "complete_word"]);
    const complete = lessons.flatMap((lesson) => lesson.exercises.filter((exercise) => exercise.type === "complete_word"));
    expect(new Set(complete.map((exercise) => exercise.wordChoices!.findIndex((choice) => choice.id === exercise.answer)))).toEqual(new Set([0, 1]));
    expect(complete.every((exercise) => exercise.wordChoices!.length >= 2)).toBe(true);
  });

  it("rejeita estrutura inválida sem lançar exceção", () => {
    expect(validateBundle(null)).toEqual(["Bundle não é um objeto."]);
    expect(validateBundle({ version: "x", learning_order: "A" })).toContain("Bundle sem módulos.");
    const broken = bundle();
    (lessonOf(broken, "A").exercises[0] as unknown as { options: unknown }).options = "A";
    expect(validateBundle(broken)).toContain("exercise-A-listen: opções inválidas.");
  });

  it("rejeita palavra com letra futura, distrator ambíguo, ordem alterada e exercício faltando", () => {
    const withFuture = bundle();
    const findI = lessonOf(withFuture, "I").exercises.find((exercise) => exercise.type === "find_in_word")!;
    Object.assign(findI, { context_word: "PIPA", answer: "2ª posição", options: ["1ª posição", "2ª posição", "3ª posição", "4ª posição"] });
    expect(validateBundle(withFuture)).toEqual(["exercise-I-find: PIPA usa letra ainda não apresentada (P)."]);

    const ambiguous = bundle();
    lessonOf(ambiguous, "L").exercises.find((exercise) => exercise.type === "complete_word")!.word_choices!.push({ id: "lama", word: "LAMA", before: "", after: "AMA" });
    expect(validateBundle(ambiguous)).toContain("exercise-L-complete-word: exatamente uma opção deve ser completada por L, e ela deve ser a resposta.");

    const reordered = bundle();
    lessonOf(reordered, "A").position = 30;
    expect(validateBundle(reordered)).toContain("A trilha deve conter as 26 letras na ordem definida.");

    const missing = bundle();
    lessonOf(missing, "M").exercises.pop();
    expect(validateBundle(missing)).toEqual(["lesson-M: faltam exercícios obrigatórios (find_in_word)."]);
  });
});
