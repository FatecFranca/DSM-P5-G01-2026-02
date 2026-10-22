import Constants from "expo-constants";
import { Platform } from "react-native";
import { ApiError } from "./errors";
import type { ItemState, LessonProgress, SyncEvent } from "../domain/types";
import { canonicalLessonId } from "../domain/content-ids";
import { normalizeExerciseTypes } from "../domain/exercise-types";
import { parseAcceptedIds, parsePulledItemState, parseRejections, toApiEvent } from "../sync/contract";

// 10.0.2.2 é o alias do emulador Android para a máquina host; no simulador iOS o host é localhost.
const configuredApiUrl = String(Constants.expoConfig?.extra?.apiUrl ?? "http://10.0.2.2:8000");
const apiUrl = Platform.OS === "ios" ? configuredApiUrl.replace("10.0.2.2", "localhost") : configuredApiUrl;
/** A API resolve IDs administrados; o app nunca monta caminho de arquivo local. */
export const mediaUrlForAsset = (assetId: string): string => `${apiUrl.replace(/\/$/, "")}/v1/media/${encodeURIComponent(assetId.startsWith("media/") ? assetId.slice("media/".length) : assetId)}`;
/** Converte o caminho relativo publicado pela API em URL que o React Native pode baixar. */
export const resolveMediaUrl = (url: string | undefined, assetId?: string): string | undefined => {
  if (url?.startsWith("http://") || url?.startsWith("https://")) return url;
  if (url?.startsWith("/v1/media/")) return `${apiUrl.replace(/\/$/, "")}${url}`;
  return assetId?.startsWith("media/") ? mediaUrlForAsset(assetId) : undefined;
};
export { ApiError, isUnauthorized } from "./errors";
export type AuthTokens = { accessToken: string; refreshToken: string };
const tokens = (value: { access_token?: string; refresh_token?: string; accessToken?: string; refreshToken?: string }): AuthTokens => {
  const accessToken = value.access_token ?? value.accessToken; const refreshToken = value.refresh_token ?? value.refreshToken;
  if (!accessToken || !refreshToken) throw new Error("Resposta de autenticação inválida");
  return { accessToken, refreshToken };
};
async function authRequest(path: string, body: Record<string, string>): Promise<AuthTokens> {
  const response = await fetch(`${apiUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new ApiError(response.status === 401 ? "E-mail ou senha não conferem." : `Não foi possível entrar (${response.status}).`, response.status);
  return tokens(await response.json() as Record<string, string>);
}
export const login = (email: string, password: string) => authRequest("/v1/auth/login", { email, password });
export const register = (name: string, email: string, password: string) => authRequest("/v1/auth/register", { name, email, password });
export const loginWithFirebase = (idToken: string) => authRequest("/v1/auth/firebase", { id_token: idToken });
export const refresh = (refreshToken: string) => authRequest("/v1/auth/refresh", { refresh_token: refreshToken });
export async function logout(refreshToken: string): Promise<void> { await fetch(`${apiUrl}/v1/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }) }); }
export type PushResult = { acceptedIds: string[]; rejections: Array<{ id: string; reason: string }> };
export async function pushEvents(events: SyncEvent[], accessToken?: string | null): Promise<PushResult> {
  const response = await fetch(`${apiUrl}/v1/sync/push`, { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ events: events.map(toApiEvent) }) });
  if (!response.ok) throw new ApiError(`Falha de sincronização (${response.status}): ${(await response.text()).slice(0, 300)}`, response.status);
  const data = await response.json() as { accepted_ids?: string[]; acceptedIds?: string[]; rejections?: Array<{ client_event_id?: string; reason?: string }>; rejected_ids?: string[] };
  return { acceptedIds: parseAcceptedIds(data), rejections: parseRejections(data) };
}
const pulledStatus = (value: unknown): LessonProgress["status"] => value === "completed" || value === "mastered" ? "mastered" : value === "review" || value === "needs_review" ? value : "learning";
export type PulledEvents = { cursor: string; progress: LessonProgress[]; itemStates: ItemState[] };
export async function pullEvents(cursor: string | null, accessToken: string): Promise<PulledEvents> {
  const response = await fetch(`${apiUrl}/v1/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ApiError(`Falha ao receber atualizações (${response.status})`, response.status);
  const data = await response.json() as { next_cursor: string | number; events?: Array<{ type: string; occurred_at: string; payload: Record<string, unknown> }> };
  const events = data.events ?? [];
  const progress = events.filter((event) => event.type === "progress").map(({ payload: p, occurred_at }) => { const count = Number(p.completed_exercises ?? 0); const completedTypes = normalizeExerciseTypes(p.completed_types); return { lessonId: canonicalLessonId(String(p.unit_id ?? p.lesson_id)), completedTypes, score: count, completed: p.status === "completed" || p.status === "mastered", status: pulledStatus(p.status), attempts: Number(p.attempts ?? 0), correctAttempts: Number(p.correct_attempts ?? 0), accuracy: typeof p.accuracy === "number" ? p.accuracy : undefined, reviewCount: Number(p.review_count ?? 0), lastPracticedAt: typeof p.last_practiced_at === "string" ? p.last_practiced_at : undefined, nextReviewAt: typeof p.next_review_at === "string" ? p.next_review_at : undefined, updatedAt: occurred_at }; });
  const itemStates = events.filter((event) => event.type === "item_state").map(({ payload, occurred_at }) => parsePulledItemState(payload, occurred_at)).filter((state): state is ItemState => state !== undefined);
  return { cursor: String(data.next_cursor), progress, itemStates };
}
export type Me = { name: string | null; email: string };
export async function getMe(accessToken: string): Promise<Me> {
  const response = await fetch(`${apiUrl}/v1/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ApiError(`Falha ao carregar o perfil (${response.status})`, response.status);
  const data = await response.json() as { name?: string | null; email?: string };
  return { name: data.name ?? null, email: String(data.email ?? "") };
}
/** Placar entre alunos: pontos calculados no servidor a partir das tentativas sincronizadas, e o lugar. */
export type Leaderboard = { points: number; position: number; learners: number };
export async function getLeaderboard(accessToken: string): Promise<Leaderboard> {
  const response = await fetch(`${apiUrl}/v1/leaderboard/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ApiError(`Falha ao carregar o placar (${response.status})`, response.status);
  const data = await response.json() as { points?: number; position?: number; learners?: number };
  return { points: Number(data.points ?? 0), position: Number(data.position ?? 0), learners: Number(data.learners ?? 0) };
}
export type LeaderboardEntry = { position: number; name: string; points: number; me: boolean };
export type LeaderboardTop = Leaderboard & { entries: LeaderboardEntry[]; me: LeaderboardEntry };
/** Primeiros do placar e a linha de quem chama (tela "Minha pontuação"); os outros aparecem só pelo primeiro nome. */
export async function getLeaderboardTop(accessToken: string, limit = 4): Promise<LeaderboardTop> {
  const response = await fetch(`${apiUrl}/v1/leaderboard?limit=${limit}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ApiError(`Falha ao carregar o placar (${response.status})`, response.status);
  const data = await response.json() as Partial<LeaderboardTop>;
  const entry = (raw: Partial<LeaderboardEntry> | undefined): LeaderboardEntry => ({ position: Number(raw?.position ?? 0), name: String(raw?.name ?? ""), points: Number(raw?.points ?? 0), me: Boolean(raw?.me) });
  return { points: Number(data.points ?? 0), position: Number(data.position ?? 0), learners: Number(data.learners ?? 0), entries: (data.entries ?? []).map(entry), me: entry(data.me) };
}
export type League = { id: string; name: string; minPoints: number };
export type LeagueBoard = { league: League; next: League | null; totalPoints: number; endsAt: string; members: number; entries: LeaderboardEntry[]; me: LeaderboardEntry };
export async function getLeagueBoard(accessToken: string, limit = 10): Promise<LeagueBoard> {
  const response = await fetch(`${apiUrl}/v1/leaderboard/league?limit=${limit}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new ApiError(`Falha ao carregar a liga (${response.status})`, response.status);
  type Raw = { league?: { id?: string; name?: string; min_points?: number }; next?: Raw["league"] | null; total_points?: number; ends_at?: string; members?: number; entries?: Partial<LeaderboardEntry>[]; me?: Partial<LeaderboardEntry> };
  const data = await response.json() as Raw;
  const league = (raw: Raw["league"]): League => ({ id: String(raw?.id ?? ""), name: String(raw?.name ?? ""), minPoints: Number(raw?.min_points ?? 0) });
  const entry = (raw: Partial<LeaderboardEntry> | undefined): LeaderboardEntry => ({ position: Number(raw?.position ?? 0), name: String(raw?.name ?? ""), points: Number(raw?.points ?? 0), me: Boolean(raw?.me) });
  return { league: league(data.league), next: data.next ? league(data.next) : null, totalPoints: Number(data.total_points ?? 0), endsAt: String(data.ends_at ?? ""),
    members: Number(data.members ?? 0), entries: (data.entries ?? []).map(entry), me: entry(data.me) };
}
export async function fetchContent(etag: string | null): Promise<{ notModified: true } | { notModified: false; bundle: unknown; etag: string | null }> {
  const response = await fetch(`${apiUrl}/v1/content`, { headers: etag ? { "If-None-Match": etag } : {} });
  if (response.status === 304) return { notModified: true };
  if (!response.ok) throw new ApiError(`Falha ao baixar conteúdo (${response.status})`, response.status);
  return { notModified: false, bundle: await response.json() as unknown, etag: response.headers.get("etag") };
}

/** Resposta de POST /v1/ranking/next (docs/adr/0004). O ranking só reordena; a sessão local continua válida sem ele. */
export type RankingResponse = { request_id: string; source: "model" | "rules-fallback"; model_version: string | null; policy_version: string; items: Array<{ item_id: string; rank: number; source: string; reason: string }> };
export async function rankNext(body: { session_id: string; unit_id: string; candidate_item_ids: string[]; session_size: number }, accessToken: string, timeoutMs = 1500): Promise<RankingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiUrl}/v1/ranking/next`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) throw new ApiError(`Falha ao ordenar a sessão (${response.status})`, response.status);
    return await response.json() as RankingResponse;
  } finally { clearTimeout(timer); }
}
