import { describe, expect, it } from "vitest";
import { joinTokens } from "./order";

describe("montagem ordenada", () => {
  it("mantém compatibilidade com sílabas e frases", () => {
    expect(joinTokens("word_from_syllables", ["CA", "SA"])).toBe("CA-SA");
    expect(joinTokens("sentence_order", ["A", "SALA", "É", "GRANDE"])).toBe("A SALA É GRANDE");
  });
});
