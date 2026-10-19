import { describe, expect, it } from "vitest";
import { PLACEMENT_QUESTIONS, placementGuidance, recommendPlacementLevel } from "./placement";

describe("nivelamento inicial", () => {
  it("oferece quatro perguntas progressivas por toque", () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(4);
    expect(PLACEMENT_QUESTIONS.every((question) => question.options.includes(question.answer))).toBe(true);
  });

  it("recomenda o nível a partir dos acertos em sequência", () => {
    expect(recommendPlacementLevel([false])).toBe(1);
    expect(recommendPlacementLevel([true, false])).toBe(2);
    expect(recommendPlacementLevel([true, true, false])).toBe(3);
    expect(recommendPlacementLevel([true, true, true, false])).toBe(4);
    expect(recommendPlacementLevel([true, true, true, true])).toBe(5);
  });

  it("orienta o estudante com mensagem adequada ao nível", () => {
    expect(placementGuidance(1)).toMatch(/letras/i);
    expect(placementGuidance(5)).toMatch(/consolidar|revisão/i);
  });
});
