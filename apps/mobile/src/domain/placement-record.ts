import type { TrailPlacement } from "./trail";
import { PLACEMENT_QUIZ_VERSION, placementHitList, scorePlacement, type PlacementResponses, type PlacementScore } from "./placement";
import { placementPoints } from "./points";

/**
 * O que fica salvo e vai para a API: as respostas brutas. A correção é sempre refeita a partir delas, então o app,
 * a API e a carga PostgreSQL chegam ao mesmo resultado (contracts/placement-quiz.json).
 */
export type PlacementRecord = {
  resultId: string;
  quizVersion: string;
  completedAt: string;
  /** A pessoa pulou o quiz inteiro. */
  skipped: boolean;
  responses: PlacementResponses;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Valida um registro salvo ou recebido; descarta versão diferente, data inválida ou respostas que não corrigem. */
export function parsePlacementRecord(value: unknown): PlacementRecord | undefined {
  if (!isRecordObject(value)) return undefined;
  const { resultId, quizVersion, completedAt, skipped, responses } = value;
  if (typeof resultId !== "string" || !resultId || quizVersion !== PLACEMENT_QUIZ_VERSION) return undefined;
  if (typeof completedAt !== "string" || Number.isNaN(Date.parse(completedAt)) || !isRecordObject(responses)) return undefined;
  const record: PlacementRecord = { resultId, quizVersion, completedAt, skipped: skipped === true, responses: responses as PlacementResponses };
  try { scorePlacement(record.responses, { skipped: record.skipped }); } catch { return undefined; }
  return record;
}

/** Último nivelamento vence (refazer substitui o anterior); empate de horário decide pelo id, para ser estável. */
export function latestPlacement(a: PlacementRecord | undefined, b: PlacementRecord | undefined): PlacementRecord | undefined {
  if (!a || !b) return a ?? b;
  const delta = Date.parse(b.completedAt) - Date.parse(a.completedAt);
  return delta > 0 || (delta === 0 && b.resultId > a.resultId) ? b : a;
}

export const scoreOf = (record: PlacementRecord): PlacementScore => scorePlacement(record.responses, { skipped: record.skipped });

export function trailPlacementOf(record: PlacementRecord | undefined): TrailPlacement | undefined {
  if (!record) return undefined;
  const { startLevel, creditedLetters } = scoreOf(record);
  return { startLevel, creditedLetters };
}

export const placementPointsOf = (record: PlacementRecord): number => placementPoints(placementHitList(record.responses));
