import { describe, expect, it } from "vitest";
import { decodeOutputs, hasNativeOnnxRuntime, preprocessPoints, ResilientLetterClassifier, type LetterClassifier } from "./letter-classifier";

describe("classificador local resiliente", () => {
  it("usa fallback sem armazenar os pontos quando o ONNX não está disponível", async () => {
    const primary: LetterClassifier = { classify: async () => { throw new Error("native unavailable"); } };
    const fallback: LetterClassifier = { classify: async (_points, hint = "A") => ({ className: hint, confidence: 0.8, uncertain: false, modelVersion: "fallback-test" }) };
    const result = await new ResilientLetterClassifier(primary, fallback).classify([{ x: 1, y: 1 }], "M");
    expect(result).toEqual({ className: "M", confidence: 0.8, uncertain: false, modelVersion: "fallback-test" });
  });
  it("só considera o runtime ONNX disponível quando a bridge expõe install", () => {
    expect(hasNativeOnnxRuntime({ install: () => undefined })).toBe(true);
    expect(hasNativeOnnxRuntime({})).toBe(false);
    expect(hasNativeOnnxRuntime(null)).toBe(false);
  });
  it("normaliza e rasteriza o traço em 1x256 sem sair de 0..1", () => {
    const pixels = preprocessPoints([{ x: 20, y: 40 }, { x: 120, y: 240 }]);
    expect(pixels).toHaveLength(256);
    expect(Math.max(...pixels)).toBe(1);
    expect(Math.min(...pixels)).toBeGreaterThanOrEqual(0);
  });
  it("decodifica label e maior probabilidade com limiar do manifesto", () => {
    const result = decodeOutputs(["C"], [0.1, 0.2, 0.7], "0.1.0");
    expect(result).toEqual({ className: "C", confidence: 0.7, uncertain: false, modelVersion: "0.1.0" });
  });
});
