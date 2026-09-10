import * as SQLite from "expo-sqlite";
import type { Attempt, LessonProgress, SyncEvent } from "../domain/types";
import { mergeProgress } from "../sync/contract";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
const db = () => (database ??= SQLite.openDatabaseAsync("alfabetiza.db"));

export async function initializeDatabase(): Promise<void> {
  const conn = await db();
  await conn.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS attempts (client_attempt_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS progress (lesson_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, retries INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`);
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync("INSERT OR IGNORE INTO attempts VALUES (?, ?, ?)", attempt.clientAttemptId, JSON.stringify(attempt), attempt.createdAt);
    await conn.runAsync("INSERT OR IGNORE INTO sync_queue (id, type, payload) VALUES (?, 'attempt', ?)", attempt.clientAttemptId, JSON.stringify(attempt));
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

export async function getQueue(): Promise<SyncEvent[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ id: string; type: SyncEvent["type"]; payload: string; retries: number }>("SELECT id, type, payload, retries FROM sync_queue WHERE next_attempt_at IS NULL OR next_attempt_at <= datetime('now') ORDER BY rowid LIMIT 50");
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
export async function applyPulledProgress(items: LessonProgress[], cursor: string): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    for (const remote of items) { const row = await conn.getFirstAsync<{ payload: string }>("SELECT payload FROM progress WHERE lesson_id = ?", remote.lessonId); const merged = mergeProgress(row ? JSON.parse(row.payload) as LessonProgress : undefined, remote); await conn.runAsync("INSERT OR REPLACE INTO progress VALUES (?, ?, ?)", merged.lessonId, JSON.stringify(merged), merged.updatedAt); }
    await conn.runAsync("INSERT OR REPLACE INTO settings VALUES ('sync_cursor', ?)", cursor);
  });
}
