import { describe, expect, it } from "vitest";
import { LEARNING_LEVELS, levelForUnitKind, unitsForLevel } from "./levels";
import type { Track } from "./types";

const tracks: Track[] = [
  {
    id: "alphabet",
    slug: "alfabeto",
    title: "Alfabeto",
    kind: "phonics",
    order: 1,
    units: [
      { id: "lesson-A", trackId: "alphabet", kind: "letter", title: "A", order: 1, prerequisiteLetters: [], exercises: [] },
    ],
  },
  {
    id: "casa",
    slug: "tem-em-casa",
    title: "Tem em casa",
    kind: "theme",
    order: 2,
    units: [
      { id: "casa-silabas", trackId: "casa", kind: "syllable", title: "Sílabas", order: 1, prerequisiteLetters: [], exercises: [] },
      { id: "casa-1", trackId: "casa", kind: "word", title: "Palavras", order: 2, prerequisiteLetters: [], exercises: [] },
      { id: "casa-frases", trackId: "casa", kind: "sentence", title: "Frases", order: 3, prerequisiteLetters: [], exercises: [] },
    ],
  },
];

describe("níveis pedagógicos do Prosa", () => {
  it("define os cinco níveis da proposta", () => {
    expect(LEARNING_LEVELS.map((level) => level.id)).toEqual([1, 2, 3, 4, 5]);
    expect(LEARNING_LEVELS.map((level) => level.shortTitle)).toEqual(["Letras", "Sílabas", "Palavras", "Frases", "Consolidação"]);
  });

  it("mapeia unidades para o nível correspondente", () => {
    expect(levelForUnitKind("letter")).toBe(1);
    expect(levelForUnitKind("syllable")).toBe(2);
    expect(levelForUnitKind("word_image")).toBe(3);
    expect(levelForUnitKind("sentence_image")).toBe(4);
    expect(unitsForLevel(tracks, 1).map((unit) => unit.id)).toEqual(["lesson-A"]);
    expect(unitsForLevel(tracks, 2).map((unit) => unit.id)).toEqual(["casa-silabas"]);
    expect(unitsForLevel(tracks, 3).map((unit) => unit.id)).toEqual(["casa-1"]);
    expect(unitsForLevel(tracks, 4).map((unit) => unit.id)).toEqual(["casa-frases"]);
    expect(unitsForLevel(tracks, 5)).toEqual([]);
  });
});
