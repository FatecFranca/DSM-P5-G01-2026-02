import { describe, expect, it } from "vitest";
import { achievementBoard, achievementBonus, evaluateAchievements, fastestBurst, formatAchievementDate, longestCorrectRun, longestDayStreak, mergeUnlocks, type AchievementFacts } from "./achievements";

const at = (day: number, hour = 10, second = 0) => new Date(2026, 9, day, hour, 0, second).toISOString();
const hit = (createdAt: string, extra: { correct?: boolean; sessionId?: string; attemptIndexInItem?: number } = {}) =>
  ({ exerciseId: "x", correct: extra.correct ?? true, createdAt, sessionId: extra.sessionId ?? "s1", attemptIndexInItem: extra.attemptIndexInItem });
const facts = (partial: Partial<AchievementFacts> = {}): AchievementFacts =>
  ({ attempts: [], completedLessons: [], stages: [], placementDone: false, points: 0, position: null, learners: 0, ...partial });
const byId = (list: ReturnType<typeof evaluateAchievements>) => Object.fromEntries(list.map((status) => [status.id, status]));

describe("longestCorrectRun", () => {
  it("um erro recomeça a contagem e guarda quando a meta foi atingida", () => {
    const attempts = [hit(at(1, 10, 1)), hit(at(1, 10, 2)), hit(at(1, 10, 3), { correct: false }), hit(at(1, 10, 4)), hit(at(1, 10, 5)), hit(at(1, 10, 6))];
    expect(longestCorrectRun(attempts, 3)).toEqual({ best: 3, reachedAt: at(1, 10, 6) });
    expect(longestCorrectRun(attempts, 4)).toEqual({ best: 3, reachedAt: undefined });
  });
});

describe("fastestBurst", () => {
  it("conta acertos dentro da janela, só na mesma sessão", () => {
    const quick = [0, 10, 20, 30, 40].map((second) => hit(at(1, 10, second)));
    expect(fastestBurst(quick, 5, 50_000)).toEqual({ best: 5, reachedAt: at(1, 10, 40) });
    const slow = [0, 30, 59].map((second) => hit(at(1, 10, second)));
    expect(fastestBurst(slow, 5, 50_000).best).toBe(2);
    const split = [hit(at(1, 10, 0), { sessionId: "a" }), hit(at(1, 10, 1), { sessionId: "b" })];
    expect(fastestBurst(split, 2, 50_000).best).toBe(1);
  });
});

describe("longestDayStreak", () => {
  it("acha a maior sequência mesmo que já tenha sido interrompida", () => {
    const times = [at(1), at(2), at(3), at(3, 18), at(5), at(6)];
    expect(longestDayStreak(times, 3)).toEqual({ best: 3, reachedAt: at(3) });
    expect(longestDayStreak([], 3)).toEqual({ best: 0, reachedAt: undefined });
  });
});

describe("evaluateAchievements", () => {
  it("começa tudo bloqueado, com o progresso de cada meta", () => {
    const list = evaluateAchievements(facts());
    expect(list).toHaveLength(15);
    expect(list.every((status) => !status.unlocked)).toBe(true);
    expect(byId(list)["primeiro-lugar"]).toMatchObject({ current: 0, target: 1 });
  });

  it("libera as do Figma a partir dos dados do aparelho", () => {
    const week = [1, 2, 3, 4, 5, 6, 7].map((day) => hit(at(day)));
    const list = byId(evaluateAchievements(facts({
      attempts: week, completedLessons: [{ completedAt: at(2, 12) }],
      stages: [{ total: 6, done: 1 }, { total: 2, done: 0 }], position: 1, learners: 4,
    })));
    expect(list["primeira-fase"]).toMatchObject({ unlocked: true, achievedAt: at(2, 12) });
    expect(list["dias-seguidos-7"]).toMatchObject({ unlocked: true, achievedAt: at(7) });
    expect(list["primeiro-acerto"]).toMatchObject({ unlocked: true, achievedAt: at(1) });
    expect(list["primeira-trilha"]).toMatchObject({ unlocked: false, current: 1, target: 6 });
    expect(list["primeiro-lugar"].unlocked).toBe(true);
    expect(list["podio"].unlocked).toBe(true);
  });

  it("sozinho no placar não conta como primeiro lugar", () => {
    expect(byId(evaluateAchievements(facts({ position: 1, learners: 1 })))["primeiro-lugar"].unlocked).toBe(false);
  });

  it("etapa concluída libera a primeira trilha com a data da etapa", () => {
    const list = byId(evaluateAchievements(facts({ stages: [{ total: 2, done: 2, doneAt: at(9) }, { total: 3, done: 1 }] })));
    expect(list["primeira-trilha"]).toMatchObject({ unlocked: true, achievedAt: at(9) });
    expect(list["trilha-completa"]).toMatchObject({ unlocked: false, current: 1, target: 2 });
  });

  it("persistência conta acertos depois de errar", () => {
    const attempts = Array.from({ length: 10 }, (_, index) => hit(at(1, 10, index), { attemptIndexInItem: 2 }));
    expect(byId(evaluateAchievements(facts({ attempts })))["persistente-10"]).toMatchObject({ unlocked: true, achievedAt: at(1, 10, 9) });
  });
});

describe("mergeUnlocks e achievementBoard", () => {
  const now = new Date(2026, 9, 21, 15);

  it("registra as novas para o pop-up e nunca tira uma conquista", () => {
    const first = mergeUnlocks(evaluateAchievements(facts({ position: 2, learners: 5 })), {}, now);
    expect(first.fresh).toEqual(["podio"]);
    expect(first.ledger.podio).toEqual({ at: now.toISOString(), celebrated: false });
    const celebrated = { podio: { ...first.ledger.podio!, celebrated: true } };
    const later = mergeUnlocks(evaluateAchievements(facts({ position: 9, learners: 9 })), celebrated, now);
    expect(later.fresh).toEqual([]);
    expect(achievementBoard(evaluateAchievements(facts()), later.ledger)[0]).toMatchObject({ id: "podio", unlocked: true });
  });

  it("soma os pontos das conquistas registradas", () => {
    expect(achievementBonus({})).toBe(0);
    expect(achievementBonus({ podio: { at: at(1), celebrated: true }, "primeiro-acerto": { at: at(1), celebrated: false } })).toBe(70);
  });

  it("formata a data como no Figma", () => {
    expect(formatAchievementDate(at(18))).toBe("18/10/2026");
  });
});
