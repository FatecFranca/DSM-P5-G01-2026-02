import type { InferenceResult } from "../domain/types";
export type Point = { x: number; y: number };
export interface LetterClassifier { classify(points: Point[], expectedHint?: string): Promise<InferenceResult> }
const SIZE = 16; const MODEL_VERSION = "0.1.0"; const CONFIDENCE_THRESHOLD = 0.65;
export function hasNativeOnnxRuntime(nativeModule: unknown): boolean {
  return typeof (nativeModule as { install?: unknown } | null | undefined)?.install === "function";
}
export function preprocessPoints(points: Point[]): number[] {
  const pixels = new Array<number>(SIZE * SIZE).fill(0); if (!points.length) return pixels;
  const xs = points.map((p) => p.x); const ys = points.map((p) => p.y); const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX); const height = Math.max(1, maxY - minY); const scale = 12 / Math.max(width, height); const ox = (SIZE - width * scale) / 2; const oy = (SIZE - height * scale) / 2;
  const normalized = points.map((p) => ({ x: Math.round(ox + (p.x - minX) * scale), y: Math.round(oy + (p.y - minY) * scale) }));
  const paint = (x: number, y: number) => { for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) { const px = x + dx; const py = y + dy; if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) pixels[py * SIZE + px] = dx === 0 && dy === 0 ? 1 : Math.max(pixels[py * SIZE + px], 0.45); } };
  normalized.forEach((point, index) => { const previous = normalized[Math.max(0, index - 1)]; const steps = Math.max(1, Math.ceil(Math.hypot(point.x - previous.x, point.y - previous.y) * 2)); for (let step = 0; step <= steps; step += 1) paint(Math.round(previous.x + ((point.x - previous.x) * step) / steps), Math.round(previous.y + ((point.y - previous.y) * step) / steps)); });
  return pixels;
}
export function decodeOutputs(labels: ArrayLike<string>, probabilities: ArrayLike<number>, modelVersion = MODEL_VERSION): InferenceResult { const confidence = Array.from(probabilities).reduce((best, value) => Math.max(best, Number(value)), 0); return { className: String(labels[0] ?? ""), confidence, uncertain: confidence < CONFIDENCE_THRESHOLD, modelVersion }; }
class HeuristicFallbackClassifier implements LetterClassifier { async classify(points: Point[], expectedHint = "A"): Promise<InferenceResult> { const enoughTrace = points.length >= 12; return { className: expectedHint, confidence: enoughTrace ? 0.66 : 0.35, uncertain: !enoughTrace, modelVersion: "heuristic-fallback-1" }; } }
type OrtSession = { inputNames: readonly string[]; outputNames: readonly string[]; run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: unknown }>> };
export class OnnxLetterClassifier implements LetterClassifier {
  private session?: Promise<OrtSession>;
  private async load(): Promise<OrtSession> { if (!this.session) this.session = (async () => {
    const { NativeModules } = await import("react-native");
    if (!hasNativeOnnxRuntime(NativeModules?.Onnxruntime)) throw new Error("Bridge ONNX nativa indisponível; usando fallback.");
    const [{ Asset }, ort] = await Promise.all([import("expo-asset"), import("onnxruntime-react-native")]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro precisa de referência estática para incluir o modelo.
    const asset = Asset.fromModule(require("../../assets/models/letter_classifier.onnx")); await asset.downloadAsync(); const uri = asset.localUri ?? asset.uri; if (!uri) throw new Error("Modelo ONNX indisponível"); return await ort.InferenceSession.create(uri) as unknown as OrtSession; })(); return this.session; }
  async classify(points: Point[]): Promise<InferenceResult> { const session = await this.load(); const ort = await import("onnxruntime-react-native"); const input = new ort.Tensor("float32", Float32Array.from(preprocessPoints(points)), [1, SIZE * SIZE]); const outputs = await session.run({ [session.inputNames[0] ?? "X"]: input }); const label = outputs[session.outputNames[0] ?? "label"]?.data; const probabilities = outputs[session.outputNames[1] ?? "probabilities"]?.data; if (!label || !probabilities) throw new Error("Saída ONNX incompatível"); return decodeOutputs(label as ArrayLike<string>, probabilities as ArrayLike<number>); }
}
export class ResilientLetterClassifier implements LetterClassifier { constructor(private readonly primary: LetterClassifier = new OnnxLetterClassifier(), private readonly fallback: LetterClassifier = new HeuristicFallbackClassifier()) {} async classify(points: Point[], expectedHint?: string): Promise<InferenceResult> { try { return await this.primary.classify(points, expectedHint); } catch { return this.fallback.classify(points, expectedHint); } } }
export const letterClassifier: LetterClassifier = new ResilientLetterClassifier();
