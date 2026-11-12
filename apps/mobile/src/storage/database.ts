import * as SQLite from "expo-sqlite";
import { latestPlacement, parsePlacementRecord, placementPointsOf, scoreOf, type PlacementRecord } from "../domain/placement-record";
import type { Attempt, ExerciseType, ItemState, LessonProgress, SyncEvent } from "../domain/types";
import { canonicalizeProgress, mergeItemState, mergeProgress } from "../sync/contract";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
const db = () => (database ??= SQLite.openDatabaseAsync("alfabetiza.db"));

export async function initializeDatabase(): Promise<void> {
  const conn = await db();
  await conn.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS attempts (client_attempt_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS progress (lesson_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS item_states (item_id TEXT PRIMARY KEY NOT NULL, unit_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, retries INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS content_bundle (id INTEGER PRIMARY KEY CHECK (id = 1), version TEXT NOT NULL, etag TEXT, payload TEXT NOT NULL, installed_at TEXT NOT NULL);`);
  await canonicalizeLocalProgress(conn);
}

// Uma vez por aparelho: regrava o progresso salvo sob IDs legados (`letter-a`) no formato canônico.
async function canonicalizeLocalProgress(conn: SQLite.SQLiteDatabase): Promise<void> {
  const marker = await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'content_ids'");
  if (marker?.value === "1") return;
  await conn.withTransactionAsync(async () => {
    const rows = await conn.getAllAsync<{ payload: string }>("SELECT payload FROM progress");
    await conn.runAsync("DELETE FROM progress");
    for (const item of canonicalizeProgress(rows.map((row) => JSON.parse(row.payload) as LessonProgress))) await conn.runAsync("INSERT INTO progress VALUES (?, ?, ?)", item.lessonId, JSON.stringify(item), item.updatedAt);
    await conn.runAsync("INSERT OR REPLACE INTO settings VALUES ('content_ids', '1')");
  });
}

export async function getContentBundle(): Promise<{ version: string; etag: string | null; payload: unknown } | undefined> {
  const conn = await db();
  const row = await conn.getFirstAsync<{ version: string; etag: string | null; payload: string }>("SELECT version, etag, payload FROM content_bundle WHERE id = 1");
  if (!row) return undefined;
  try { return { version: row.version, etag: row.etag, payload: JSON.parse(row.payload) as unknown }; } catch { return undefined; }
}

export async function saveContentBundle(bundle: { version: string }, etag: string | null): Promise<void> {
  const conn = await db();
  await conn.runAsync("INSERT OR REPLACE INTO content_bundle (id, version, etag, payload, installed_at) VALUES (1, ?, ?, ?, ?)", bundle.version, etag, JSON.stringify(bundle), new Date().toISOString());
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync("INSERT OR IGNORE INTO attempts VALUES (?, ?, ?)", attempt.clientAttemptId, JSON.stringify(attempt), attempt.createdAt);
    await conn.runAsync("INSERT OR IGNORE INTO sync_queue (id, type, payload) VALUES (?, 'attempt', ?)", attempt.clientAttemptId, JSON.stringify(attempt));
  });
}

/** Estado por item e progresso da unidade são gravados juntos; na fila, cada um é coalescido pelo id (só o último vai). */
export async function saveItemState(state: ItemState, progress: LessonProgress): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync("INSERT OR REPLACE INTO item_states VALUES (?, ?, ?, ?)", state.itemId, state.unitId, JSON.stringify(state), state.updatedAt);
    await conn.runAsync("INSERT OR REPLACE INTO sync_queue (id, type, payload) VALUES (?, 'item_state', ?)", `item_state:${state.itemId}`, JSON.stringify(state));
    await conn.runAsync("INSERT OR REPLACE INTO progress VALUES (?, ?, ?)", progress.lessonId, JSON.stringify(progress), progress.updatedAt);
    await conn.runAsync("INSERT OR REPLACE INTO sync_queue (id, type, payload) VALUES (?, 'progress', ?)", `progress:${progress.lessonId}`, JSON.stringify(progress));
  });
}

export async function saveProgress(progress: LessonProgress): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync("INSERT OR REPLACE INTO progress VALUES (?, ?, ?)", progress.lessonId, JSON.stringify(progress), progress.updatedAt);
    await conn.runAsync("INSERT OR REPLACE INTO sync_queue (id, type, payload) VALUES (?, 'progress', ?)", `progress:${progress.lessonId}`, JSON.stringify(progress));
  });
}

export async function getProgress(): Promise<LessonProgress[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ payload: string }>("SELECT payload FROM progress ORDER BY updated_at DESC");
  return rows.map((row) => JSON.parse(row.payload) as LessonProgress);
}

export async function getItemStates(): Promise<ItemState[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ payload: string }>("SELECT payload FROM item_states");
  return rows.map((row) => JSON.parse(row.payload) as ItemState);
}

export async function getQueue(): Promise<SyncEvent[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ id: string; type: SyncEvent["type"]; payload: string; retries: number }>("SELECT id, type, payload, retries FROM sync_queue WHERE next_attempt_at IS NULL OR next_attempt_at <= datetime('now') ORDER BY rowid LIMIT 200");
  return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) as Record<string, unknown> }));
}

export async function acknowledgeEvents(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const conn = await db();
  await conn.runAsync(`DELETE FROM sync_queue WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
}

export async function deferEvents(events: SyncEvent[]): Promise<void> {
  const conn = await db();
  for (const event of events) await conn.runAsync("UPDATE sync_queue SET retries = retries + 1, next_attempt_at = datetime('now', ?) WHERE id = ?", `+${Math.ceil(Math.min(60, 2 ** (event.retries ?? 0)))} seconds`, event.id);
}

export async function getSyncCursor(): Promise<string | null> { const conn = await db(); return (await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'sync_cursor'"))?.value ?? null; }

export async function getSetting(key: string): Promise<string | null> {
  const conn = await db();
  return (await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", key))?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = await db();
  await conn.runAsync("INSERT OR REPLACE INTO settings VALUES (?, ?)", key, value);
}

/** Todas as tentativas locais; base dos pontos e dos dias seguidos do perfil, que funcionam offline. */
export async function getAttempts(): Promise<Attempt[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ payload: string }>("SELECT payload FROM attempts ORDER BY created_at");
  return rows.map((row) => JSON.parse(row.payload) as Attempt);
}

export const PLACEMENT_DONE_KEY = "placement_done";
/** Pontos do último quiz de nivelamento (não viram tentativas: as perguntas do quiz não são itens do conteúdo). */
export const PLACEMENT_POINTS_KEY = "placement_points";
/** Nome vindo de GET /v1/me, guardado para o perfil abrir offline. */
export const USER_NAME_KEY = "user_name";
export const PLACEMENT_LEVEL_KEY = "placement_level";
/** Último nivelamento (JSON de PlacementRecord: respostas brutas; a correção é refeita ao ler). */
export const PLACEMENT_RESULT_KEY = "placement_result";
/** Conquistas registradas no aparelho (JSON `{ [id]: { at: ISO, celebrated: boolean } }`, ver domain/achievements). */
export const ACHIEVEMENTS_KEY = "achievements";

export async function getPlacement(): Promise<PlacementRecord | undefined> {
  const raw = await getSetting(PLACEMENT_RESULT_KEY);
  if (!raw) return undefined;
  try { return parsePlacementRecord(JSON.parse(raw)); } catch { return undefined; }
}

/** Grava o resultado e os resumos que o resto do app lê. Refazer o quiz nunca tira pontos já ganhos. */
async function writePlacement(conn: SQLite.SQLiteDatabase, record: PlacementRecord): Promise<void> {
  const previousPoints = Number((await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", PLACEMENT_POINTS_KEY))?.value ?? 0) || 0;
  const upsert = "INSERT OR REPLACE INTO settings VALUES (?, ?)";
  await conn.runAsync(upsert, PLACEMENT_RESULT_KEY, JSON.stringify(record));
  await conn.runAsync(upsert, PLACEMENT_DONE_KEY, "1");
  await conn.runAsync(upsert, PLACEMENT_LEVEL_KEY, String(scoreOf(record).startLevel));
  await conn.runAsync(upsert, PLACEMENT_POINTS_KEY, String(Math.max(previousPoints, placementPointsOf(record))));
}

export async function savePlacement(record: PlacementRecord): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await writePlacement(conn, record);
    await conn.runAsync("INSERT OR IGNORE INTO sync_queue (id, type, payload) VALUES (?, 'placement', ?)", `placement:${record.resultId}`, JSON.stringify(record));
  });
}

export async function applyPulled(incoming: { progress: LessonProgress[]; itemStates: ItemState[]; placements?: PlacementRecord[]; cursor: string }, requiredTypesOf: (lessonId: string) => readonly ExerciseType[] | undefined): Promise<{ progress: LessonProgress[]; itemStates: ItemState[]; placement?: PlacementRecord }> {
  const conn = await db();
  const progress: LessonProgress[] = []; const itemStates: ItemState[] = [];
  let placement: PlacementRecord | undefined;
  await conn.withTransactionAsync(async () => {
    // Nivelamento feito em outro aparelho: o mais recente vence, sem reenfileirar.
    const local = await getPlacement();
    const latest = (incoming.placements ?? []).reduce<PlacementRecord | undefined>((best, remote) => latestPlacement(best, remote), local);
    if (latest && latest !== local) { await writePlacement(conn, latest); placement = latest; }
    for (const remote of incoming.itemStates) {
      const row = await conn.getFirstAsync<{ payload: string }>("SELECT payload FROM item_states WHERE item_id = ?", remote.itemId);
      const merged = mergeItemState(row ? JSON.parse(row.payload) as ItemState : undefined, remote);
      await conn.runAsync("INSERT OR REPLACE INTO item_states VALUES (?, ?, ?, ?)", merged.itemId, merged.unitId, JSON.stringify(merged), merged.updatedAt);
      itemStates.push(merged);
    }
    for (const remote of incoming.progress) {
      const row = await conn.getFirstAsync<{ payload: string }>("SELECT payload FROM progress WHERE lesson_id = ?", remote.lessonId);
      const merged = mergeProgress(row ? JSON.parse(row.payload) as LessonProgress : undefined, remote, requiredTypesOf(remote.lessonId));
      await conn.runAsync("INSERT OR REPLACE INTO progress VALUES (?, ?, ?)", merged.lessonId, JSON.stringify(merged), merged.updatedAt);
      progress.push(merged);
    }
    await conn.runAsync("INSERT OR REPLACE INTO settings VALUES ('sync_cursor', ?)", incoming.cursor);
  });
  return { progress, itemStates, placement };
}

/** Dono dos dados locais (id da conta). Sem ele não dá para saber de quem é o progresso guardado no aparelho. */
export const OWNER_KEY = "owner_id";

/**
 * Garante que o banco local pertence à conta que acabou de entrar. Se for outra conta (ou o dono é desconhecido
 * e `strict`), apaga progresso, tentativas, fila de sincronização e configurações da conta anterior; o conteúdo
 * baixado e a marca de migração ficam. Devolve true quando apagou.
 */
export async function claimLocalData(accountId: string | undefined, strict: boolean): Promise<boolean> {
  const conn = await db();
  const owner = (await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", OWNER_KEY))?.value;
  const foreign = accountId ? (owner ? owner !== accountId : strict) : false;
  if (foreign) {
    await conn.withTransactionAsync(async () => {
      await conn.execAsync("DELETE FROM attempts; DELETE FROM progress; DELETE FROM item_states; DELETE FROM sync_queue; DELETE FROM settings WHERE key <> 'content_ids';");
    });
  }
  if (accountId && (foreign || !owner)) await conn.runAsync("INSERT OR REPLACE INTO settings VALUES (?, ?)", OWNER_KEY, accountId);
  return foreign;
}
