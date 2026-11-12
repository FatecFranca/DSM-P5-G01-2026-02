import { describe, expect, it } from "vitest";
import { gapAccessibilityLabel, gapParts } from "./gaps";

describe("texto lacunado", () => {
  it("um traço é uma letra; três traços valem a maior opção", () => {
    expect(gapParts("_BELHA", ["A", "E", "I"])).toEqual([{ kind: "gap", slots: 1 }, { kind: "text", text: "BELHA" }]);
    expect(gapParts("___ VE TE", ["SOR", "CA", "NA"])).toEqual([{ kind: "gap", slots: 3 }, { kind: "text", text: "VE TE" }]);
    expect(gapParts("___ SA", ["DA", "CA", "BO"])).toEqual([{ kind: "gap", slots: 2 }, { kind: "text", text: "SA" }]);
    expect(gapParts("_ E _")).toEqual([{ kind: "gap", slots: 1 }, { kind: "text", text: "E" }, { kind: "gap", slots: 1 }]);
  });
  it("frase com lacuna de palavra usa a maior palavra das peças", () => {
    expect(gapParts("A ___ É UMA FRUTA", ["FRUTA", "LARANJA"])).toEqual([{ kind: "text", text: "A" }, { kind: "gap", slots: 7 }, { kind: "text", text: "É UMA FRUTA" }]);
  });
  it("lê cada lacuna como espaço", () => {
    expect(gapAccessibilityLabel("___ VE TE")).toBe("espaço VE TE");
  });
});
