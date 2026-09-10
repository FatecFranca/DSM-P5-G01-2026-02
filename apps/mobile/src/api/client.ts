import Constants from "expo-constants";
import type { SyncEvent } from "../domain/types";
import type { LessonProgress } from "../domain/types";
import { canonicalLessonId } from "../domain/content-ids";
import { normalizeExerciseTypes } from "../domain/exercise-types";
import { parseAcceptedIds, toApiEvent } from "../sync/contract";

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
export async function pullEvents(cursor: string | null, accessToken: string): Promise<{ cursor: string; progress: LessonProgress[] }> {
  const response = await fetch(`${apiUrl}/v1/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Falha ao receber atualizações (${response.status})`);
  const data = await response.json() as { next_cursor: string | number; events?: Array<{ type: string; occurred_at: string; payload: Record<string, unknown> }> };
  const progress = (data.events ?? []).filter((event) => event.type === "progress").map(({ payload: p, occurred_at }) => { const count = Number(p.completed_exercises ?? 0); const completedTypes = normalizeExerciseTypes(p.completed_types); return { lessonId: canonicalLessonId(String(p.lesson_id)), completedTypes, score: count, completed: p.status === "completed" || p.status === "mastered", status: pulledStatus(p.status), attempts: Number(p.attempts ?? 0), correctAttempts: Number(p.correct_attempts ?? 0), accuracy: typeof p.accuracy === "number" ? p.accuracy : undefined, reviewCount: Number(p.review_count ?? 0), lastPracticedAt: typeof p.last_practiced_at === "string" ? p.last_practiced_at : undefined, nextReviewAt: typeof p.next_review_at === "string" ? p.next_review_at : undefined, updatedAt: occurred_at }; });
  return { cursor: String(data.next_cursor), progress };
}
export async function fetchContent(etag: string | null): Promise<{ notModified: true } | { notModified: false; bundle: unknown; etag: string | null }> {
  const response = await fetch(`${apiUrl}/v1/content`, { headers: etag ? { "If-None-Match": etag } : {} });
  if (response.status === 304) return { notModified: true };
  if (!response.ok) throw new Error(`Falha ao baixar conteúdo (${response.status})`);
  return { notModified: false, bundle: await response.json() as unknown, etag: response.headers.get("etag") };
}
