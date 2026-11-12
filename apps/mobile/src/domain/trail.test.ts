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
  { id: "silabas", slug: "silabas", title: "Sílabas", kind: "theme", order: 2, units: [
    { id: "casa-silabas", trackId: "silabas", kind: "syllable", title: "Sílabas", order: 1, prerequisiteLetters: ["M"], exercises: [] },
  ] },
  { id: "silabas-complexas", slug: "silabas-complexas", title: "Sílabas complexas", kind: "theme", order: 3, units: [
    { id: "complexas-1", trackId: "silabas-complexas", kind: "syllable", title: "Separe", order: 1, prerequisiteLetters: ["M"], exercises: [] },
  ] },
  { id: "palavras", slug: "palavras", title: "Palavras", kind: "theme", order: 4, units: [
    { id: "casa-1", trackId: "palavras", kind: "word", title: "Palavras", order: 1, prerequisiteLetters: ["M"], exercises: [] },
  ] },
  { id: "frases", slug: "frases", title: "Frases", kind: "theme", order: 5, units: [
    { id: "casa-frases", trackId: "frases", kind: "sentence", title: "Frases", order: 1, prerequisiteLetters: ["M"], exercises: [] },
  ] },
];

const ids = (units: Unit[]) => units.map((unit) => unit.id);

describe("etapas da árvore da trilha", () => {
  it("agrupa a trilha fônica por fase, em ordem", () => {
    expect(ids(unitsForStage(tracks, trailStage("vogais")!))).toEqual(["lesson-A", "lesson-E"]);
    expect(ids(unitsForStage(tracks, trailStage("consoantes")!))).toEqual(["lesson-M"]);
    expect(ids(unitsForStage(tracks, trailStage("letras")!))).toEqual(["lesson-A", "lesson-E", "lesson-M", "lesson-B"]);
  });

  it("agrupa os níveis 2 a 4 pelas trilhas do banco de questões", () => {
    expect(ids(unitsForStage(tracks, trailStage("silabas-simples")!))).toEqual(["casa-silabas"]);
    expect(ids(unitsForStage(tracks, trailStage("silabas-complexas")!))).toEqual(["complexas-1"]);
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

  it("começa pelo nível sugerido no nivelamento quando há crédito de letras", () => {
    const credit = (startLevel: 1 | 2 | 3 | 4) => ({ startLevel, creditedLetters: startLevel > 1 ? "AEM" : "" });
    expect(nextTrailUnit(tracks, {}, credit(2))?.id).toBe("casa-silabas");
    expect(nextTrailUnit(tracks, {}, credit(3))?.id).toBe("casa-1");
    expect(nextTrailUnit(tracks, {}, credit(4))?.id).toBe("casa-frases");
    expect(nextTrailUnit(tracks, {}, credit(1))?.id).toBe("lesson-A");
    // Acabou o que há do nível sugerido em diante: volta à ordem pedagógica, que ainda tem as letras e as sílabas.
    expect(nextTrailUnit(tracks, { "casa-frases": { completed: true } }, credit(4))?.id).toBe("lesson-A");
    expect(nextTrailUnit(tracks, { "casa-1": { completed: true }, "casa-frases": { completed: true } }, credit(3))?.id).toBe("lesson-A");
  });

  it("sem crédito, o nível sugerido não abre nada: a sugestão cai na primeira lição liberada", () => {
    expect(nextTrailUnit(tracks, {}, { startLevel: 3, creditedLetters: "" })?.id).toBe("lesson-A");
  });

  it("mostra as unidades abertas pelo crédito como liberadas, e as letras continuam sem concluir", () => {
    const placement = { startLevel: 3 as const, creditedLetters: "AEM" };
    const next = nextTrailUnit(tracks, {}, placement);
    const letras = unitsForStage(tracks, trailStage("letras")!);
    expect(letras.map((unit) => unitStatus(unit, {}, next, placement.creditedLetters))).toEqual(["available", "available", "available", "available"]);
    expect(stageStatus(letras, {}, next, placement.creditedLetters)).toBe("available");
    expect(stageStatus(unitsForStage(tracks, trailStage("palavras")!), {}, next, placement.creditedLetters)).toBe("current");
    expect(unitStatus(letras[0], {}, next)).toBe("available");
    expect(unitStatus(letras[1], {}, next)).toBe("locked");
  });

  it("não reconhece etapa desconhecida", () => {
    expect(trailStage("frases")).toBeUndefined();
  });
});
