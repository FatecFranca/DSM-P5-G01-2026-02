import { useEffect, useState } from "react";
import { getLeaderboard, getMe } from "../api/client";
import { achievementBonus } from "../domain/achievements";
import { totalPoints } from "../domain/points";
import { displayName } from "../domain/profile";
import { streakDays } from "../domain/streak";
import { getAttempts, getSetting, PLACEMENT_POINTS_KEY, setSetting, USER_NAME_KEY } from "../storage/database";
import { withSession } from "../sync/session-retry";
import { syncNow } from "../sync/use-sync";
import { loadUnlockLedger } from "./achievements";

export type LearnerStats = { name: string | null; points: number; streak: number; position: number | null };

/**
 * Dados do perfil (Figma 1:94 e 1:200). Pontos e dias seguidos saem das tentativas locais e funcionam offline;
 * o nome vem do cache e é atualizado pela API (contas sem nome usam o começo do e-mail); o lugar só aparece
 * quando o placar do servidor responde.
 */

export function useLearnerStats(): LearnerStats {
  const [stats, setStats] = useState<LearnerStats>({ name: null, points: 0, streak: 0, position: null });
  useEffect(() => {
    let cancelled = false;
    const merge = (partial: Partial<LearnerStats>) => { if (!cancelled) setStats((current) => ({ ...current, ...partial })); };
    // Os pontos do quiz de nivelamento ficam só no aparelho: as perguntas do quiz não são itens sincronizados.
    // Os bônus das conquistas também ficam só no aparelho (o placar do servidor conta apenas as tentativas).
    void Promise.all([getAttempts(), getSetting(USER_NAME_KEY), getSetting(PLACEMENT_POINTS_KEY), loadUnlockLedger()])
      .then(([attempts, cachedName, placement, ledger]) => merge({ points: totalPoints(attempts) + (Number(placement) || 0) + achievementBonus(ledger), streak: streakDays(attempts.map((attempt) => attempt.createdAt), new Date()), ...(cachedName ? { name: cachedName } : {}) }))
      .catch(() => undefined);
    void withSession(getMe)
      .then((me) => { const name = displayName(me); if (!name) return; merge({ name }); void setSetting(USER_NAME_KEY, name); })
      .catch(() => undefined);
    // O lugar vem do servidor: sincroniza antes para contar as lições feitas desde a última vez.
    void syncNow().catch(() => undefined).then(() => withSession(getLeaderboard))
      .then((board) => merge({ position: board.position > 0 ? board.position : null }))
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return stats;
}
