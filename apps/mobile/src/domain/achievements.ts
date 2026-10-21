import { localDay } from "./streak";

/**
 * Conquistas ("Minhas conquistas", Figma 9:435, e o pop-up "Parabéns", 9:554). Tudo é derivado dos dados que já
 * ficam no aparelho (tentativas, progresso, nivelamento) mais o lugar no placar, quando a API responde.
 * As seis primeiras são as do Figma; as demais seguem a mesma ideia: valorizar constância e persistência, nunca punir.
 */

export type AchievementIcon = "crown" | "paw" | "star" | "cap" | "clock" | "medal" | "check" | "heart" | "book" | "trophy" | "target";
export type AchievementId =
  | "primeira-fase" | "respostas-seguidas-10" | "dias-seguidos-7" | "primeira-trilha" | "rapido-5" | "primeiro-lugar"
  | "primeiro-acerto" | "nivelamento" | "dias-seguidos-3" | "dias-seguidos-30" | "acertos-100" | "persistente-10"
  | "podio" | "pontos-100" | "trilha-completa";

export type AchievementDefinition = {
  id: AchievementId;
  title: string;
  /** Frase lida pelo botão de áudio e pelo leitor de tela. */
  description: string;
  icon: AchievementIcon;
  /** Cor do selo conquistado (Figma: verde ou azul com aro dourado). */
  tone: "green" | "blue";
  /** Pontos ganhos ao desbloquear (o pop-up mostra "50 pontos conquistados!"). */
  reward: number;
};

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: "primeira-fase", title: "Primeira fase", description: "Complete a primeira lição da trilha.", icon: "crown", tone: "green", reward: 50 },
  { id: "respostas-seguidas-10", title: "10 respostas seguidas", description: "Acerte 10 respostas seguidas.", icon: "paw", tone: "blue", reward: 50 },
  { id: "dias-seguidos-7", title: "7 dias seguidos", description: "Estude 7 dias seguidos.", icon: "star", tone: "green", reward: 50 },
  { id: "primeira-trilha", title: "Primeira trilha", description: "Complete todas as lições de uma etapa da trilha.", icon: "cap", tone: "blue", reward: 100 },
  { id: "rapido-5", title: "5 respostas em 50 segundos", description: "Acerte 5 respostas em menos de 50 segundos.", icon: "clock", tone: "green", reward: 50 },
  { id: "primeiro-lugar", title: "Primeiro lugar", description: "Fique em primeiro lugar na pontuação.", icon: "medal", tone: "blue", reward: 100 },
  { id: "primeiro-acerto", title: "Primeiro acerto", description: "Acerte a sua primeira resposta.", icon: "check", tone: "green", reward: 20 },
  { id: "nivelamento", title: "Ponto de partida", description: "Faça o quiz de nivelamento.", icon: "book", tone: "blue", reward: 20 },
  { id: "dias-seguidos-3", title: "3 dias seguidos", description: "Estude 3 dias seguidos.", icon: "star", tone: "blue", reward: 20 },
  { id: "persistente-10", title: "Não desistiu", description: "Acerte 10 desafios depois de ter errado.", icon: "heart", tone: "green", reward: 50 },
  { id: "acertos-100", title: "100 acertos", description: "Acerte 100 respostas.", icon: "target", tone: "blue", reward: 100 },
  { id: "pontos-100", title: "100 pontos", description: "Junte 100 pontos nas lições.", icon: "paw", tone: "green", reward: 50 },
  { id: "podio", title: "Pódio", description: "Fique entre os 3 primeiros da pontuação.", icon: "trophy", tone: "green", reward: 50 },
  { id: "dias-seguidos-30", title: "30 dias seguidos", description: "Estude 30 dias seguidos.", icon: "star", tone: "blue", reward: 200 },
  { id: "trilha-completa", title: "Trilha completa", description: "Complete todas as etapas da trilha.", icon: "crown", tone: "blue", reward: 200 },
];

type AttemptFact = { exerciseId: string; correct: boolean; createdAt: string; sessionId?: string; attemptIndexInItem?: number };

export type AchievementFacts = {
  attempts: readonly AttemptFact[];
  /** Lições concluídas e quando (o `updatedAt` do progresso). */
  completedLessons: readonly { completedAt: string }[];
  /** Etapas da árvore da trilha: lições no total e concluídas. */
  stages: readonly { total: number; done: number; doneAt?: string }[];
  placementDone: boolean;
  /** Pontos das lições (sem os bônus das próprias conquistas, para não haver ciclo). */
  points: number;
  /** Lugar no placar e total de aprendizes; null quando a API não respondeu. */
  position: number | null;
  learners: number;
};

export type AchievementStatus = AchievementDefinition & {
  current: number;
  target: number;
  unlocked: boolean;
  /** Quando a condição foi cumprida, se dá para saber pelos dados (as de placar não têm data). */
  achievedAt?: string;
};

type Progress = Pick<AchievementStatus, "current" | "target" | "unlocked" | "achievedAt">;

/** Desbloqueia ao chegar em `target`; a data vem do evento que completou a meta, quando conhecido. */
const progress = (current: number, target: number, achievedAt?: string): Progress =>
  ({ current: Math.min(current, target), target, unlocked: current >= target, achievedAt: current >= target ? achievedAt : undefined });

const byTime = (attempts: readonly AttemptFact[]) => [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

/** Maior sequência de acertos (um erro recomeça a contagem) e o instante em que ela chegou a `goal`. */
export function longestCorrectRun(attempts: readonly AttemptFact[], goal: number): { best: number; reachedAt?: string } {
  let run = 0; let best = 0; let reachedAt: string | undefined;
  for (const attempt of byTime(attempts)) {
    run = attempt.correct ? run + 1 : 0;
    best = Math.max(best, run);
    if (run === goal && !reachedAt) reachedAt = attempt.createdAt;
  }
  return { best, reachedAt };
}

/** Mais acertos dentro de qualquer janela de `windowMs` na mesma sessão, e o primeiro instante em que chegou a `goal`. */
export function fastestBurst(attempts: readonly AttemptFact[], goal: number, windowMs: number): { best: number; reachedAt?: string } {
  const sessions = new Map<string, AttemptFact[]>();
  for (const attempt of byTime(attempts)) if (attempt.correct) sessions.set(attempt.sessionId ?? "", [...(sessions.get(attempt.sessionId ?? "") ?? []), attempt]);
  let best = 0; let reachedAt: string | undefined;
  for (const hits of sessions.values()) {
    let start = 0;
    for (let end = 0; end < hits.length; end += 1) {
      while (Date.parse(hits[end].createdAt) - Date.parse(hits[start].createdAt) > windowMs) start += 1;
      const count = end - start + 1;
      best = Math.max(best, count);
      if (count >= goal && (!reachedAt || hits[end].createdAt < reachedAt)) reachedAt = hits[end].createdAt;
    }
  }
  return { best, reachedAt };
}

/** Maior sequência de dias seguidos com prática (no calendário do aparelho) e o primeiro instante do dia que chegou a `goal`. */
export function longestDayStreak(times: readonly string[], goal: number): { best: number; reachedAt?: string } {
  const firstOfDay = new Map<string, string>();
  for (const time of [...times].sort()) { const day = localDay(new Date(time)); if (!firstOfDay.has(day)) firstOfDay.set(day, time); }
  let run = 0; let best = 0; let previous: string | undefined; let reachedAt: string | undefined;
  for (const day of [...firstOfDay.keys()].sort()) {
    const [year, month, date] = day.split("-").map(Number);
    run = previous && localDay(new Date(year, month - 1, date - 1)) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    if (run === goal && !reachedAt) reachedAt = firstOfDay.get(day);
    previous = day;
  }
  return { best, reachedAt };
}

/** Instante do n-ésimo evento em ordem cronológica, se existir. */
const nth = (times: readonly string[], n: number): string | undefined => [...times].sort()[n - 1];

export function evaluateAchievements(facts: AchievementFacts): AchievementStatus[] {
  const hits = facts.attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.createdAt);
  // Acerto depois de errar: a reapresentação do item na mesma sessão (attemptIndexInItem > 1).
  const recovered = facts.attempts.filter((attempt) => attempt.correct && (attempt.attemptIndexInItem ?? 1) > 1).map((attempt) => attempt.createdAt);
  const lessons = facts.completedLessons.map((lesson) => lesson.completedAt);
  const run = longestCorrectRun(facts.attempts, 10);
  const burst = fastestBurst(facts.attempts, 5, 50_000);
  const times = facts.attempts.map((attempt) => attempt.createdAt);
  const streak = (goal: number) => { const result = longestDayStreak(times, goal); return progress(result.best, goal, result.reachedAt); };
  const stages = facts.stages.filter((stage) => stage.total > 0);
  const doneStages = stages.filter((stage) => stage.done >= stage.total);
  const doneAts = doneStages.map((stage) => stage.doneAt).filter((at): at is string => Boolean(at)).sort();
  // Sem etapa concluída, "Primeira trilha" mostra a etapa mais adiantada (ex.: 1/6).
  const closest = [...stages].sort((a, b) => b.done / b.total - a.done / a.total || a.total - b.total)[0];
  const ranked = facts.position !== null && facts.learners > 1;

  const rules: Record<AchievementId, Progress> = {
    "primeira-fase": progress(lessons.length, 1, nth(lessons, 1)),
    "respostas-seguidas-10": progress(run.best, 10, run.reachedAt),
    "dias-seguidos-7": streak(7),
    "primeira-trilha": doneStages.length ? progress(1, 1, doneAts[0]) : progress(closest?.done ?? 0, closest?.total ?? 1),
    "rapido-5": progress(burst.best, 5, burst.reachedAt),
    "primeiro-lugar": progress(ranked && facts.position === 1 ? 1 : 0, 1),
    "primeiro-acerto": progress(hits.length, 1, nth(hits, 1)),
    "nivelamento": progress(facts.placementDone ? 1 : 0, 1),
    "dias-seguidos-3": streak(3),
    "persistente-10": progress(recovered.length, 10, nth(recovered, 10)),
    "acertos-100": progress(hits.length, 100, nth(hits, 100)),
    "pontos-100": progress(facts.points, 100),
    "podio": progress(ranked && (facts.position ?? 0) <= 3 ? 1 : 0, 1),
    "dias-seguidos-30": streak(30),
    "trilha-completa": progress(doneStages.length, Math.max(1, stages.length), doneAts.at(-1)),
  };
  return ACHIEVEMENTS.map((definition) => ({ ...definition, ...rules[definition.id] }));
}

/** Conquista já registrada no aparelho: quando foi cumprida e se o pop-up já apareceu. */
export type UnlockRecord = { at: string; celebrated: boolean };
export type UnlockLedger = Partial<Record<AchievementId, UnlockRecord>>;

/**
 * Junta o que foi avaliado agora com o que já estava registrado. Conquista registrada nunca se perde (sair do pódio
 * não tira o selo). Devolve o registro atualizado e as que ainda pedem pop-up, na ordem do catálogo.
 */
export function mergeUnlocks(statuses: readonly AchievementStatus[], ledger: UnlockLedger, now: Date): { ledger: UnlockLedger; fresh: AchievementId[] } {
  const next: UnlockLedger = { ...ledger };
  for (const status of statuses) if (status.unlocked && !next[status.id]) next[status.id] = { at: status.achievedAt ?? now.toISOString(), celebrated: false };
  const fresh = ACHIEVEMENTS.map((definition) => definition.id).filter((id) => next[id] && !next[id].celebrated);
  return { ledger: next, fresh };
}

/** Pontos extras das conquistas registradas, somados aos das lições no perfil. */
export const achievementBonus = (ledger: UnlockLedger): number =>
  ACHIEVEMENTS.reduce((total, definition) => total + (ledger[definition.id] ? definition.reward : 0), 0);

/** Visão da tela: registradas contam como conquistadas, com a data do registro; conquistadas vêm primeiro. */
export function achievementBoard(statuses: readonly AchievementStatus[], ledger: UnlockLedger): AchievementStatus[] {
  const merged = statuses.map((status) => {
    const record = ledger[status.id];
    return record ? { ...status, unlocked: true, current: status.target, achievedAt: record.at } : status;
  });
  return [...merged.filter((status) => status.unlocked), ...merged.filter((status) => !status.unlocked)];
}

/** "18/10/2026", no calendário do aparelho. */
export const formatAchievementDate = (iso: string): string => { const [year, month, day] = localDay(new Date(iso)).split("-"); return `${day}/${month}/${year}`; };
