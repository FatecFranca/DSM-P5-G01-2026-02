import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/client";
import { useContentStore } from "../content/store";
import { ACHIEVEMENTS, achievementBoard, evaluateAchievements, mergeUnlocks, type AchievementId, type AchievementStatus, type UnlockLedger } from "../domain/achievements";
import { totalPoints } from "../domain/points";
import { TRAIL_STAGES, unitsForStage } from "../domain/trail";
import { ACHIEVEMENTS_KEY, getAttempts, getSetting, PLACEMENT_POINTS_KEY, setSetting } from "../storage/database";
import { useStudyStore } from "../store/study-store";
import { withSession } from "../sync/session-retry";

export async function loadUnlockLedger(): Promise<UnlockLedger> {
  try { return JSON.parse((await getSetting(ACHIEVEMENTS_KEY)) ?? "{}") as UnlockLedger; } catch { return {}; }
}

/** Lugar no placar, quando a API responde; offline as conquistas de placar só esperam. */
async function standing(): Promise<{ position: number | null; learners: number }> {
  try { const board = await withSession(getLeaderboard); return { position: board.position > 0 ? board.position : null, learners: board.learners }; } catch { return { position: null, learners: 0 }; }
}

/**
 * Avalia as conquistas com os dados do aparelho, registra as novas e devolve o quadro da tela e as que ainda pedem
 * pop-up. `withRanking: false` pula a chamada ao placar (fim de lição: o pop-up não pode esperar a rede).
 */
export async function syncAchievements({ withRanking = true }: { withRanking?: boolean } = {}): Promise<{ board: AchievementStatus[]; fresh: AchievementId[] }> {
  const [attempts, placement, ledger, rank] = await Promise.all([getAttempts(), getSetting(PLACEMENT_POINTS_KEY), loadUnlockLedger(), withRanking ? standing() : Promise.resolve({ position: null, learners: 0 })]);
  const progress = useStudyStore.getState().progress;
  const tracks = useContentStore.getState().tracks;
  const completed = Object.values(progress).filter((item) => item?.completed);
  const stages = TRAIL_STAGES.map((stage) => {
    const units = unitsForStage(tracks, stage);
    const done = units.filter((unit) => progress[unit.id]?.completed);
    const doneAt = units.length && done.length === units.length ? done.map((unit) => progress[unit.id]!.updatedAt).sort().at(-1) : undefined;
    return { total: units.length, done: done.length, doneAt };
  });
  const statuses = evaluateAchievements({
    attempts, completedLessons: completed.map((item) => ({ completedAt: item.updatedAt })), stages,
    placementDone: placement !== null, points: totalPoints(attempts) + (Number(placement) || 0), ...rank,
  });
  const merged = mergeUnlocks(statuses, ledger, new Date());
  if (Object.keys(merged.ledger).length !== Object.keys(ledger).length) await setSetting(ACHIEVEMENTS_KEY, JSON.stringify(merged.ledger));
  return { board: achievementBoard(statuses, merged.ledger), fresh: merged.fresh };
}

/** Marca as conquistas cujo pop-up já apareceu, para não repetir. */
export async function markCelebrated(ids: readonly AchievementId[]): Promise<void> {
  if (!ids.length) return;
  const ledger = await loadUnlockLedger();
  for (const id of ids) { const record = ledger[id]; if (record) ledger[id] = { ...record, celebrated: true }; }
  await setSetting(ACHIEVEMENTS_KEY, JSON.stringify(ledger));
}

const LOCKED: AchievementStatus[] = ACHIEVEMENTS.map((definition) => ({ ...definition, current: 0, target: 1, unlocked: false }));

/** Quadro da tela "Minhas conquistas". Começa com o catálogo bloqueado e atualiza quando os dados chegam. */
export function useAchievements(): { board: AchievementStatus[]; fresh: AchievementId[]; ready: boolean } {
  const [state, setState] = useState({ board: LOCKED, fresh: [] as AchievementId[], ready: false });
  useEffect(() => {
    let cancelled = false;
    void syncAchievements()
      .then((result) => { if (!cancelled) setState({ ...result, ready: true }); })
      .catch(() => { if (!cancelled) setState((current) => ({ ...current, ready: true })); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
