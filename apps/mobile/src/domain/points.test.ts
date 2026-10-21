import { describe, expect, it } from "vitest";
import { placementPoints, sessionPoints, totalPoints } from "./points";

describe("placementPoints", () => {
  it("dá 10 por resposta certa no quiz de nivelamento", () => {
    expect(placementPoints([true, true, true, false])).toBe(30);
    expect(placementPoints([])).toBe(0);
  });
});

// sessionId null = tentativa antiga, sem sessão (undefined acionaria o valor padrão do parâmetro).
const attempt = (id: string, exerciseId: string, correct: boolean, minute: number, sessionId: string | null = "s1", attemptIndexInItem = 1) =>
  ({ clientAttemptId: id, exerciseId, correct, createdAt: `2026-10-21T10:${String(minute).padStart(2, "0")}:00.000Z`, sessionId: sessionId ?? undefined, attemptIndexInItem });

describe("totalPoints", () => {
  it("soma 3 por item acertado de primeira e 1 por item recuperado, por sessão", () => {
    expect(totalPoints([
      attempt("a", "x", true, 1),
      attempt("b", "y", false, 2), attempt("c", "y", true, 3),
      attempt("d", "x", true, 4, "s2"),
    ])).toBe(7);
  });

  it("item sem acerto não pontua e tentativas sem sessão contam sozinhas", () => {
    expect(totalPoints([attempt("a", "x", false, 1), attempt("b", "z", true, 2, null, 1), attempt("c", "z", true, 3, null, 2)])).toBe(4);
  });
});

describe("sessionPoints", () => {
  it("dá 3 pontos por acerto de primeira", () => {
    expect(sessionPoints({ correct: 7, recovered: 0 })).toBe(21);
  });

  it("dá 1 ponto por erro recuperado e nunca tira pontos", () => {
    expect(sessionPoints({ correct: 7, recovered: 2 })).toBe(17);
    expect(sessionPoints({ correct: 0, recovered: 0 })).toBe(0);
  });
});
