import { describe, expect, it } from "vitest";
import exerciseContract from "../../../../contracts/exercise-types.json";
import pedagogyContract from "../../../../contracts/pedagogy.json";
import { EXERCISE_ID_SUFFIX, EXERCISE_TYPES, FIND_IN_WORD_EXEMPT_LETTERS, LEARNING_ORDER, LEGACY_EXERCISE_TYPE_ALIASES, PHASES, RENDERER_OF, REQUIRED_LETTER_EXERCISE_TYPES, TARGET_OF, normalizeExerciseType, normalizeExerciseTypes, requiredLetters, requiredTypesFor } from "./exercise-types";

describe("contrato compartilhado com a API", () => {
  it("espelha contracts/exercise-types.json", () => {
    expect([...EXERCISE_TYPES]).toEqual(exerciseContract.types.map((item) => item.id));
    expect(LEGACY_EXERCISE_TYPE_ALIASES).toEqual(exerciseContract.legacy_aliases);
    expect(EXERCISE_ID_SUFFIX).toEqual(Object.fromEntries(exerciseContract.types.map((item) => [item.id, item.id_suffix])));
    expect(TARGET_OF).toEqual(Object.fromEntries(exerciseContract.types.map((item) => [item.id, item.target])));
    expect(RENDERER_OF).toEqual(Object.fromEntries(exerciseContract.types.map((item) => [item.id, item.renderer])));
    expect([...new Set(Object.values(RENDERER_OF))].sort()).toEqual([...exerciseContract.renderers].sort());
  });

  it("espelha contracts/pedagogy.json", () => {
    expect(LEARNING_ORDER).toBe(pedagogyContract.learning_order);
    expect(PHASES).toEqual(pedagogyContract.phases);
    expect([...REQUIRED_LETTER_EXERCISE_TYPES]).toEqual(pedagogyContract.required_letter_exercise_types);
    expect(FIND_IN_WORD_EXEMPT_LETTERS).toBe(pedagogyContract.find_in_word_exempt_letters);
    expect(requiredTypesFor("A")).toEqual(["listen_choose", "recognize_letter"]);
    expect(requiredTypesFor("M")).toEqual(["listen_choose", "recognize_letter", "find_in_word"]);
  });

  it("traduz o tipo legado e descarta tipos removidos ou inválidos", () => {
    expect(normalizeExerciseType("recognize")).toBe("recognize_letter");
    expect(normalizeExerciseType("write")).toBeUndefined();
    expect(normalizeExerciseTypes(["listen_choose", "recognize", "recognize_letter", "write", 3])).toEqual(["listen_choose", "recognize_letter"]);
    expect(normalizeExerciseTypes(undefined)).toEqual([]);
  });

  it("calcula letras necessárias na ordem de aprendizagem, sem acentos", () => {
    expect(requiredLetters("ÔNIBUS")).toBe("IOUSNB");
    expect(requiredLetters("A SALA É GRANDE")).toBe("AELSRNDG");
    expect(requiredLetters("")).toBe("");
  });
});
