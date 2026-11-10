import { describe, expect, it } from "vitest";
import quizContract from "../../../../contracts/placement-quiz.json";
import pedagogyContract from "../../../../contracts/pedagogy.json";
import { isKnownIllustration } from "../assets/illustration-manifest";
import {
  PLACEMENT_DEMO, PLACEMENT_INTRO, PLACEMENT_ITEMS, PLACEMENT_OUTRO, PLACEMENT_QUIZ_VERSION, PLACEMENT_RULES,
  creditedLettersFor, itemBand, placementGuidance, placementHitList, scorePlacement, type PlacementResponses,
} from "./placement";

type Example = { name: string; skipped?: boolean; responses: PlacementResponses; expected: { hits: Record<string, number>; difficulty: string; provisional: boolean; provisional_reason: string | null; start_level: number; credited_phases: number[] } };

const lettersOfPhases = (phases: number[]) => pedagogyContract.phases.filter((phase) => phases.includes(phase.phase)).map((phase) => phase.letters).join("");

describe("quiz de nivelamento: contrato compartilhado", () => {
  it("espelha contracts/placement-quiz.json", () => {
    expect(PLACEMENT_QUIZ_VERSION).toBe(quizContract.id);
    expect(PLACEMENT_INTRO).toBe(quizContract.intro);
    expect(PLACEMENT_OUTRO).toBe(quizContract.outro);
    expect(PLACEMENT_DEMO).toEqual(quizContract.demo);
    expect(PLACEMENT_ITEMS).toEqual(quizContract.items);
    expect(PLACEMENT_RULES).toEqual({
      bands: quizContract.bands, scoring: quizContract.scoring, mixes: quizContract.mixes,
      startLevel: { capByDifficulty: quizContract.start_level.cap_by_difficulty, minHitsByLevel: quizContract.start_level.min_hits_by_level },
      creditPhasesByStartLevel: quizContract.credit.phases_by_start_level,
      itemDifficultyBands: quizContract.item_difficulty_bands, defaultItemBand: quizContract.default_item_band,
    });
  });

  it("tem 12 itens em ordem, quatro por faixa, gabarito entre as opções e posições balanceadas", () => {
    expect(PLACEMENT_ITEMS.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const band of ["facil", "medio", "dificil"]) expect(PLACEMENT_ITEMS.filter((item) => item.band === band)).toHaveLength(4);
    expect(PLACEMENT_ITEMS.every((item) => item.answer >= 1 && item.answer <= item.options.length)).toBe(true);
    const positions = PLACEMENT_ITEMS.map((item) => item.answer);
    expect([1, 2, 3].map((value) => positions.filter((position) => position === value).length)).toEqual([4, 4, 4]);
  });

  it("nunca lê em voz alta o texto avaliado: o áudio só existe nos itens de escuta", () => {
    for (const item of PLACEMENT_ITEMS) {
      if (item.stimulus.audio) expect(item.stimulus.text).toBeUndefined();
      if (item.stimulus.text) expect(item.instruction).not.toContain(item.stimulus.text);
    }
  });

  it("só usa ilustrações embarcadas, todas com texto alternativo", () => {
    for (const item of PLACEMENT_ITEMS) {
      if (item.stimulus.image) { expect(isKnownIllustration(item.stimulus.image)).toBe(true); expect(item.stimulus.image_alt).toBeTruthy(); }
      for (const option of item.options) if (option.image) expect(isKnownIllustration(option.image)).toBe(true);
    }
  });
});

describe("correção do quiz", () => {
  for (const example of quizContract.examples as Example[]) {
    it(`segue o exemplo do contrato: ${example.name}`, () => {
      const result = scorePlacement(example.responses, { skipped: example.skipped });
      expect(result.hits).toEqual(example.expected.hits);
      expect(result.difficulty).toBe(example.expected.difficulty);
      expect(result.provisional).toBe(example.expected.provisional);
      expect(result.provisionalReason).toBe(example.expected.provisional_reason);
      expect(result.startLevel).toBe(example.expected.start_level);
      expect(result.creditedLetters).toBe(lettersOfPhases(example.expected.credited_phases));
      expect(result.mix).toEqual(quizContract.mixes[example.expected.difficulty as "facil"]);
    });
  }

  it("rejeita IDs desconhecidos e índices fora das opções", () => {
    expect(() => scorePlacement({ X9: 1 })).toThrow(/ID/);
    expect(() => scorePlacement({ F1: 4 })).toThrow(/índice/);
    expect(() => scorePlacement({ F1: 0 })).toThrow(/índice/);
    expect(() => scorePlacement({ F1: 1.5 })).toThrow(/índice/);
  });

  it("conta respostas puladas à parte, sem somar acerto", () => {
    const result = scorePlacement({ F1: null, F2: 1, F3: 3, F4: 2 });
    expect(result.skippedItems).toEqual(["F1"]);
    expect(result.hits.facil).toBe(3);
    expect(result.answered.facil).toBe(3);
  });

  it("lista o acerto de cada item respondido, na ordem do quiz, para a pontuação", () => {
    expect(placementHitList({ F2: 1, F1: 2, F3: 1, F4: null })).toEqual([true, true, false]);
  });
});

describe("crédito e faixa dos exercícios", () => {
  it("converte o nível de partida em letras já apresentadas, na ordem das fases", () => {
    expect(creditedLettersFor(1)).toBe("");
    expect(creditedLettersFor(2)).toBe("AEIOUMLPSTRNDCG");
    expect(creditedLettersFor(4)).toBe(pedagogyContract.learning_order);
  });

  it("classifica a dificuldade publicada do exercício em uma faixa do quiz", () => {
    expect(itemBand("introducao")).toBe("facil");
    expect(itemBand("revisao")).toBe("medio");
    expect(itemBand("desafio")).toBe("dificil");
    expect(itemBand(undefined)).toBe("medio");
    expect(itemBand("desconhecida")).toBe("medio");
  });

  it("orienta com mensagem para o nível e avisa quando é provisório", () => {
    const skipped = scorePlacement({}, { skipped: true });
    expect(placementGuidance(skipped)).toMatch(/letras/i);
    expect(placementGuidance(skipped)).toMatch(/ajust/i);
    const full = scorePlacement({ F1: 2, F2: 1, F3: 3, F4: 2, M1: 3, M2: 1, M3: 2, M4: 3, D1: 1, D2: 2, D3: 3, D4: 1 });
    expect(placementGuidance(full)).toMatch(/frases/i);
  });
});
