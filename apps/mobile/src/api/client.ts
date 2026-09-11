import Constants from "expo-constants";
import type { ItemState, LessonProgress, SyncEvent } from "../domain/types";
import { canonicalLessonId } from "../domain/content-ids";
import { normalizeExerciseTypes } from "../domain/exercise-types";
import { parseAcceptedIds, parsePulledItemState, toApiEvent } from "../sync/contract";

const apiUrl = String(Constants.expoConfig?.extra?.apiUrl ?? "http://10.0.2.2:8000");
export type AuthTokens = { accessToken: string; refreshToken: string };
const tokens = (value: { access_token?: string; refresh_token?: string; accessToken?: string; refreshToken?: string }): AuthTokens => {
  const accessToken = value.access_token ?? value.accessToken; const refreshToken = value.refresh_token ?? value.refreshToken;
  if (!accessToken || !refreshToken) throw new Error("Resposta de autenticação inválida");
  return { accessToken, refreshToken };
};
async function authRequest(path: string, body: Record<string, string>): Promise<AuthTokens> {
  const response = await fetch(`${apiUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(response.status === 401 ? "E-mail ou senha não conferem." : `Não foi possível entrar (${response.status}).`);
  return tokens(await response.json() as Record<string, string>);
}
export const login = (email: string, password: string) => authRequest("/v1/auth/login", { email, password });
export const register = (name: string, email: string, password: string) => authRequest("/v1/auth/register", { name, email, password });
export const refresh = (refreshToken: string) => authRequest("/v1/auth/refresh", { refresh_token: refreshToken });
export async function logout(refreshToken: string): Promise<void> { await fetch(`${apiUrl}/v1/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }) }); }
export async function pushEvents(events: SyncEvent[], accessToken?: string | null): Promise<{ acceptedIds: string[] }> {
  const response = await fetch(`${apiUrl}/v1/sync/push`, { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ events: events.map(toApiEvent) }) });
  if (!response.ok) throw new Error(`Falha de sincronização (${response.status})`);
  return { acceptedIds: parseAcceptedIds(await response.json() as { accepted_ids?: string[]; acceptedIds?: string[] }) };
}
const pulledStatus = (value: unknown): LessonProgress["status"] => value === "completed" || value === "mastered" ? "mastered" : value === "review" || value === "needs_review" ? value : "learning";
export type PulledEvents = { cursor: string; progress: LessonProgress[]; itemStates: ItemState[] };
export async function pullEvents(cursor: string | null, accessToken: string): Promise<PulledEvents> {
  const response = await fetch(`${apiUrl}/v1/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Falha ao receber atualizações (${response.status})`);
  const data = await response.json() as { next_cursor: string | number; events?: Array<{ type: string; occurred_at: string; payload: Record<string, unknown> }> };
  const events = data.events ?? [];
  const progress = events.filter((event) => event.type === "progress").map(({ payload: p, occurred_at }) => { const count = Number(p.completed_exercises ?? 0); const completedTypes = normalizeExerciseTypes(p.completed_types); return { lessonId: canonicalLessonId(String(p.unit_id ?? p.lesson_id)), completedTypes, score: count, completed: p.status === "completed" || p.status === "mastered", status: pulledStatus(p.status), attempts: Number(p.attempts ?? 0), correctAttempts: Number(p.correct_attempts ?? 0), accuracy: typeof p.accuracy === "number" ? p.accuracy : undefined, reviewCount: Number(p.review_count ?? 0), lastPracticedAt: typeof p.last_practiced_at === "string" ? p.last_practiced_at : undefined, nextReviewAt: typeof p.next_review_at === "string" ? p.next_review_at : undefined, updatedAt: occurred_at }; });
  const itemStates = events.filter((event) => event.type === "item_state").map(({ payload, occurred_at }) => parsePulledItemState(payload, occurred_at)).filter((state): state is ItemState => state !== undefined);
  return { cursor: String(data.next_cursor), progress, itemStates };
}
export async function fetchContent(etag: string | null): Promise<{ notModified: true } | { notModified: false; bundle: unknown; etag: string | null }> {
  const response = await fetch(`${apiUrl}/v1/content`, { headers: etag ? { "If-None-Match": etag } : {} });
  if (response.status === 304) return { notModified: true };
  if (!response.ok) throw new Error(`Falha ao baixar conteúdo (${response.status})`);
  return { notModified: false, bundle: await response.json() as unknown, etag: response.headers.get("etag") };
}

/** Resposta de POST /v1/ranking/next (docs/adr/0004). O ranking só reordena; a sessão local continua válida sem ele. */
export type RankingResponse = { request_id: string; source: "model" | "rules-fallback"; model_version: string | null; policy_version: string; items: Array<{ item_id: string; rank: number; source: string; reason: string }> };
export async function rankNext(body: { session_id: string; unit_id: string; candidate_item_ids: string[]; session_size: number }, accessToken: string, timeoutMs = 1500): Promise<RankingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiUrl}/v1/ranking/next`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) throw new Error(`Falha ao ordenar a sessão (${response.status})`);
    return await response.json() as RankingResponse;
  } finally { clearTimeout(timer); }
}
