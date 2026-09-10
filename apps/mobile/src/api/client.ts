import Constants from "expo-constants";
import type { SyncEvent } from "../domain/types";
import type { LessonProgress } from "../domain/types";
import { toApiEvent } from "../sync/contract";

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
  const data = await response.json() as { accepted_ids?: string[]; acceptedIds?: string[] };
  return { acceptedIds: data.accepted_ids ?? data.acceptedIds ?? [] };
}
export async function pullEvents(cursor: string | null, accessToken: string): Promise<{ cursor: string; progress: LessonProgress[] }> {
  const response = await fetch(`${apiUrl}/v1/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Falha ao receber atualizações (${response.status})`);
  const data = await response.json() as { next_cursor: string | number; events?: Array<{ type: string; occurred_at: string; payload: Record<string, unknown> }> };
  const legacyOrder: LessonProgress["completedTypes"] = ["listen_choose", "recognize", "find_in_word", "complete_word"];
  const progress = (data.events ?? []).filter((event) => event.type === "progress").map(({ payload: p, occurred_at }) => { const count = Number(p.completed_exercises ?? 0); const completedTypes = Array.isArray(p.completed_types) ? p.completed_types.filter((item): item is LessonProgress["completedTypes"][number] => typeof item === "string") : legacyOrder.slice(0, count); return { lessonId: String(p.lesson_id), completedTypes, score: count, completed: p.status === "completed", status: p.status === "completed" ? "mastered" as const : "learning" as const, attempts: Number(p.attempts ?? 0), correctAttempts: Number(p.correct_attempts ?? 0), accuracy: typeof p.accuracy === "number" ? p.accuracy : undefined, reviewCount: Number(p.review_count ?? 0), lastPracticedAt: typeof p.last_practiced_at === "string" ? p.last_practiced_at : undefined, nextReviewAt: typeof p.next_review_at === "string" ? p.next_review_at : undefined, updatedAt: occurred_at }; });
  return { cursor: String(data.next_cursor), progress };
}
