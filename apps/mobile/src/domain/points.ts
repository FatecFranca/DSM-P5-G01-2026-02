/**
 * Pontos do aluno (pop-up "Muito bem!" e perfil do Figma). Regra provisória, ajustável aqui e espelhada na API
 * (apps/api/app/leaderboard.py): acerto de primeira vale mais que acerto depois de errar, e errar nunca tira pontos.
 */
export const POINTS_FIRST_TRY = 3;
export const POINTS_RECOVERED = 1;
/** Quiz de nivelamento: cada resposta certa vale 10 (o pop-up do Figma mostra 30 para três acertos). */
export const POINTS_PER_PLACEMENT_HIT = 10;

export const placementPoints = (results: readonly boolean[]): number => results.filter(Boolean).length * POINTS_PER_PLACEMENT_HIT;

export function sessionPoints(summary: { correct: number; recovered: number }): number {
  const firstTry = Math.max(0, summary.correct - summary.recovered);
  return firstTry * POINTS_FIRST_TRY + summary.recovered * POINTS_RECOVERED;
}

type ScoredAttempt = { clientAttemptId: string; exerciseId: string; correct: boolean; createdAt: string; sessionId?: string; positionInSession?: number; attemptIndexInItem?: number };

/**
 * Total de todas as tentativas, agrupadas por (sessão, item): o grupo com acerto vale 3 se nenhum erro veio antes
 * do primeiro acerto, senão 1. Tentativas antigas sem sessão contam sozinhas (3 na primeira apresentação, senão 1).
 */
export function totalPoints(attempts: readonly ScoredAttempt[]): number {
  const groups = new Map<string, ScoredAttempt[]>();
  for (const attempt of attempts) {
    const key = attempt.sessionId ? `${attempt.sessionId}\u0000${attempt.exerciseId}` : `solo\u0000${attempt.clientAttemptId}`;
    groups.set(key, [...(groups.get(key) ?? []), attempt]);
  }
  let total = 0;
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || (a.positionInSession ?? 0) - (b.positionInSession ?? 0) || (a.attemptIndexInItem ?? 0) - (b.attemptIndexInItem ?? 0));
    const firstCorrect = ordered.findIndex((attempt) => attempt.correct);
    if (firstCorrect < 0) continue;
    const recovered = ordered[0].sessionId ? firstCorrect > 0 : (ordered[0].attemptIndexInItem ?? 1) > 1;
    total += recovered ? POINTS_RECOVERED : POINTS_FIRST_TRY;
  }
  return total;
}
