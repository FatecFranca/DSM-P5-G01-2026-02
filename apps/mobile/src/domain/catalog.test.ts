import { describe, expect, it } from "vitest";
import { LETTERS, WORDS, validateCatalog } from "./catalog";

describe("catálogo pedagógico", () => {
  it("contém as 26 letras em ordem, cada uma com associação de palavra", () => {
    expect(LETTERS.map((item) => item.letter).join("")).toBe("AEIOUMLPSTRNDCGBFVHQJKZXWY");
    expect(validateCatalog(LETTERS)).toEqual([]);
    expect(LETTERS.every((item) => item.exercises.some((exercise) => exercise.type === "find_in_word"))).toBe(true);
    expect(LETTERS.filter((item) => item.phase === 1).every((item) => item.exercises.length === 3)).toBe(true);
    expect(LETTERS.filter((item) => item.phase > 1).every((item) => item.exercises.length >= 3)).toBe(true);
    const findA = LETTERS[0].exercises.find((item) => item.type === "find_in_word");
    expect(findA?.instruction).toBe("Onde aparece primeiro a letra A na palavra MALA?");
    expect(findA?.contextWord).toBe("MALA");
    expect(new Set(LETTERS[0].exercises.map((item) => item.instruction)).size).toBe(3);
  });

  it("organiza as letras em três fases e antecipa G para a segunda", () => {
    expect(LETTERS.filter((item) => item.phase === 1).map((item) => item.letter).join("")).toBe("AEIOU");
    expect(LETTERS.filter((item) => item.phase === 2).map((item) => item.letter).join("")).toBe("MLPSTRNDCG");
    expect(LETTERS.find((item) => item.letter === "G")?.phase).toBe(2);
    expect(LETTERS.every((item, index) => item.prerequisiteLetters.length === index)).toBe(true);
    expect(validateCatalog(LETTERS).filter((error) => error.includes("letra futura"))).toEqual([]);
  });

  it("traz entre 8 e 12 palavras contextualizadas", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(8);
    expect(WORDS.length).toBeLessThanOrEqual(12);
  });
});
