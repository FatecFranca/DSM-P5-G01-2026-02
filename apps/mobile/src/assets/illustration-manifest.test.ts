import { describe, expect, it } from "vitest";
import { ILLUSTRATION_ATTRIBUTION, ILLUSTRATION_LICENSE, ILLUSTRATION_MANIFEST, isKnownIllustration } from "./illustration-manifest";

const QUIZ = ["colher", "copo-debaixo-da-mesa", "copo-em-cima-da-mesa", "copo-no-chao", "prato-vazio", "sapato", "varal"];

describe("manifesto de ilustrações offline", () => {
  it("publica as nove palavras, as cinco cenas e as sete ilustrações do nivelamento", () => {
    expect(Object.keys(ILLUSTRATION_MANIFEST).sort()).toEqual([
      ...["cama", "casa", "copo", "mesa", "panela", "porta", "prato", "sala", "tapete"].map((name) => `images/words/${name}.svg`),
      ...[1, 2, 3, 4, 5].map((number) => `images/sentences/casa-frase-${number}.svg`),
      ...QUIZ.map((name) => `images/quiz/${name}.svg`),
    ].sort());
    expect(Object.values(ILLUSTRATION_MANIFEST).every((asset) => asset.license === ILLUSTRATION_LICENSE && asset.attribution === ILLUSTRATION_ATTRIBUTION)).toBe(true);
  });

  it("não aceita IDs remotos, caminhos arbitrários ou ativos ausentes", () => {
    expect(isKnownIllustration("images/words/casa.svg")).toBe(true);
    expect(isKnownIllustration("images/quiz/varal.svg")).toBe(true);
    expect(isKnownIllustration("https://example.test/casa.svg")).toBe(false);
    expect(isKnownIllustration("images/words/janela.svg")).toBe(false);
  });
});
