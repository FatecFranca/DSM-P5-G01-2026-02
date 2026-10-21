import { describe, expect, it } from "vitest";
import { nextTrailUnit, stageStatus, trailStage, unitsForStage, unitStatus } from "./trail";
import type { Track, Unit } from "./types";

const letter = (id: string, phase: 1 | 2 | 3, order: number, prerequisiteLetters: string[] = []): Unit =>
  ({ id: `lesson-${id}`, trackId: "alphabet", kind: "letter", title: id, letter: id, phase, order, prerequisiteLetters, exercises: [] });

const tracks: Track[] = [
  {
    id: "alphabet", slug: "alfabeto", title: "Alfabeto", kind: "phonics", order: 1,
    units: [letter("E", 1, 2, ["A"]), letter("A", 1, 1), letter("M", 2, 3, ["A", "E"]), letter("B", 3, 4, ["A", "E", "M"])],
  },
  {
    id: "casa", slug: "tem-em-casa", title: "Tem em casa", kind: "theme", order: 2,
    units: [
      { id: "casa-silabas", trackId: "casa", kind: "syllable", title: "Sílabas", order: 2, prerequisiteLetters: ["M"], exercises: [] },
      { id: "casa-1", trackId: "casa", kind: "word", title: "Palavras", order: 1, prerequisiteLetters: ["M"], exercises: [] },
      { id: "casa-frases", trackId: "casa", kind: "sentence", title: "Frases", order: 3, prerequisiteLetters: ["M"], exercises: [] },
    ],
  },
];

const ids = (units: Unit[]) => units.map((unit) => unit.id);

describe("etapas da árvore da trilha", () => {
  it("agrupa a trilha fônica por fase, em ordem", () => {
    expect(ids(unitsForStage(tracks, trailStage("vogais")!))).toEqual(["lesson-A", "lesson-E"]);
    expect(ids(unitsForStage(tracks, trailStage("consoantes")!))).toEqual(["lesson-M"]);
    expect(ids(unitsForStage(tracks, trailStage("letras")!))).toEqual(["lesson-A", "lesson-E", "lesson-M", "lesson-B"]);
  });

  it("agrupa as trilhas temáticas por tipo de unidade", () => {
    expect(ids(unitsForStage(tracks, trailStage("silabas-simples")!))).toEqual(["casa-silabas"]);
    expect(ids(unitsForStage(tracks, trailStage("palavras")!))).toEqual(["casa-1", "casa-frases"]);
  });

  it("procura a próxima lição na ordem pedagógica, não na visual", () => {
    expect(nextTrailUnit(tracks, {})?.id).toBe("lesson-A");
    const done = { "lesson-A": { completed: true }, "lesson-E": { completed: true }, "lesson-M": { completed: true } };
    expect(nextTrailUnit(tracks, done)?.id).toBe("lesson-B");
  });

  it("começa liberada na etapa Letras, no A", () => {
    const letras = unitsForStage(tracks, trailStage("letras")!);
    expect(stageStatus(letras, {}, nextTrailUnit(tracks, {}))).toBe("current");
    expect(unitStatus(letras[0], {}, nextTrailUnit(tracks, {}))).toBe("current");
  });

  it("marca o estado das lições e das etapas", () => {
    const progress = { "lesson-A": { completed: true } };
    const next = nextTrailUnit(tracks, progress);
    const vogais = unitsForStage(tracks, trailStage("vogais")!);
    expect(vogais.map((unit) => unitStatus(unit, progress, next))).toEqual(["done", "current"]);
    expect(stageStatus(vogais, progress, next)).toBe("current");
    expect(stageStatus(unitsForStage(tracks, trailStage("letras")!), progress, next)).toBe("current");
    expect(stageStatus(unitsForStage(tracks, trailStage("consoantes")!), progress, next)).toBe("locked");
    expect(stageStatus([], progress, next)).toBe("locked");
  });

  it("não reconhece etapa desconhecida", () => {
    expect(trailStage("frases")).toBeUndefined();
  });
});
