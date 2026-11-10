import { describe, expect, it } from "vitest";
import { latestPlacement, parsePlacementRecord, placementPointsOf, trailPlacementOf, type PlacementRecord } from "./placement-record";

const full = { F1: 2, F2: 1, F3: 3, F4: 2, M1: 3, M2: 1, M3: 2, M4: 3, D1: 1, D2: 2, D3: null, D4: null };
const record = (overrides: Partial<PlacementRecord> = {}): PlacementRecord => ({ resultId: "r1", quizVersion: "nivelamento-v1", completedAt: "2026-11-10T12:00:00.000Z", skipped: false, responses: full, ...overrides });

describe("registro do nivelamento", () => {
  it("aceita só registros completos da versão atual com respostas válidas", () => {
    expect(parsePlacementRecord(record())).toEqual(record());
    expect(parsePlacementRecord(JSON.parse(JSON.stringify(record())))).toEqual(record());
    expect(parsePlacementRecord({ ...record(), quizVersion: "outro" })).toBeUndefined();
    expect(parsePlacementRecord({ ...record(), responses: { F1: 9 } })).toBeUndefined();
    expect(parsePlacementRecord({ ...record(), resultId: "" })).toBeUndefined();
    expect(parsePlacementRecord({ ...record(), completedAt: "ontem" })).toBeUndefined();
    expect(parsePlacementRecord(null)).toBeUndefined();
    expect(parsePlacementRecord("x")).toBeUndefined();
  });

  it("o mais recente vence, com desempate estável pelo id", () => {
    const old = record({ resultId: "a", completedAt: "2026-11-01T00:00:00.000Z" });
    const recent = record({ resultId: "b" });
    expect(latestPlacement(old, recent)).toBe(recent);
    expect(latestPlacement(recent, old)).toBe(recent);
    expect(latestPlacement(undefined, old)).toBe(old);
    expect(latestPlacement(old, undefined)).toBe(old);
    expect(latestPlacement(record({ resultId: "a" }), record({ resultId: "b" }))?.resultId).toBe("b");
  });

  it("deriva da correção o que a trilha usa: nível e letras creditadas", () => {
    expect(trailPlacementOf(record())).toEqual({ startLevel: 3, creditedLetters: "AEIOUMLPSTRNDCG" });
    expect(trailPlacementOf(record({ skipped: true, responses: {} }))).toEqual({ startLevel: 1, creditedLetters: "" });
    expect(trailPlacementOf(undefined)).toBeUndefined();
  });

  it("dá dez pontos por acerto", () => {
    expect(placementPointsOf(record())).toBe(100);
    expect(placementPointsOf(record({ skipped: true, responses: {} }))).toBe(0);
  });
});
