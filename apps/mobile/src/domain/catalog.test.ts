import { describe, expect, it } from "vitest";
import { LETTERS, WORDS, validateCatalog } from "./catalog";

describe("catálogo pedagógico", () => {
  it("contém as 26 letras em ordem, cada uma com associação de palavra", () => {
    expect(LETTERS.map((item) => item.letter).join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(validateCatalog(LETTERS)).toEqual([]);
    expect(LETTERS.every((item) => item.exercises.length === 3)).toBe(true);
    const completeA = LETTERS[0].exercises.find((item) => item.type === "complete_word");
    expect(completeA?.instruction).toBe("Em qual palavra entra a letra A?");
    expect(completeA?.wordChoices?.map((item) => item.word)).toEqual(["CACHORRO", "COELHO"]);
    expect(new Set(LETTERS[0].exercises.map((item) => item.instruction)).size).toBe(3);
  });

  it("traz entre 4 e 8 palavras contextualizadas", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(4);
    expect(WORDS.length).toBeLessThanOrEqual(8);
  });
});
