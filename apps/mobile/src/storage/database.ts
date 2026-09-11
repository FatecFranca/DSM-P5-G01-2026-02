import * as SQLite from "expo-sqlite";
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

export async function applyPulled(incoming: { progress: LessonProgress[]; itemStates: ItemState[]; cursor: string }, requiredTypesOf: (lessonId: string) => readonly ExerciseType[] | undefined): Promise<{ progress: LessonProgress[]; itemStates: ItemState[] }> {
  const conn = await db();
  const progress: LessonProgress[] = []; const itemStates: ItemState[] = [];
  await conn.withTransactionAsync(async () => {
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
  return { progress, itemStates };
}
