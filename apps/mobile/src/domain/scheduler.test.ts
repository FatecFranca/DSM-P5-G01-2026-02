import { describe, expect, it } from "vitest";
import { MAX_HALF_LIFE_HOURS, MIN_HALF_LIFE_HOURS, applyResult, halfLifeHours, isDue, isMastered, isWeak } from "./scheduler";

const now = new Date("2026-09-16T10:00:00Z");
const hours = (value: number) => new Date(now.getTime() + value * 60 * 60 * 1000);

describe("repetição espaçada por item", () => {
  it("dobra a meia-vida a cada acerto dentro dos limites", () => {
    expect(halfLifeHours(0)).toBe(MIN_HALF_LIFE_HOURS);
    expect(halfLifeHours(1)).toBe(8);
    expect(halfLifeHours(3)).toBe(32);
    expect(halfLifeHours(20)).toBe(MAX_HALF_LIFE_HOURS);
  });

  it("segue a tabela de transições: acerto sobe 1, erro cai 2 e zera a sequência", () => {
    const first = applyResult(undefined, { itemId: "i", unitId: "u", correct: true, now });
    expect(first).toMatchObject({ strength: 1, halfLifeHours: 8, reps: 1, lapses: 0, consecutiveCorrect: 1, lastResult: true, dueAt: hours(8).toISOString() });
    const second = applyResult(first, { itemId: "i", unitId: "u", correct: true, now: hours(8) });
    expect(second).toMatchObject({ strength: 2, halfLifeHours: 16, reps: 2, consecutiveCorrect: 2 });
    const third = applyResult(second, { itemId: "i", unitId: "u", correct: false, now: hours(24) });
    expect(third).toMatchObject({ strength: 0, halfLifeHours: MIN_HALF_LIFE_HOURS, reps: 3, lapses: 1, consecutiveCorrect: 0, lastResult: false, dueAt: hours(28).toISOString() });
    const floor = applyResult(third, { itemId: "i", unitId: "u", correct: false, now: hours(28) });
    expect(floor.strength).toBe(0);
  });

  it("classifica vencido, fraco e dominado", () => {
    const state = applyResult(undefined, { itemId: "i", unitId: "u", correct: true, now });
    expect(isDue(state, hours(7))).toBe(false);
    expect(isDue(state, hours(8))).toBe(true);
    expect(isMastered(state)).toBe(true);
    expect(isWeak(state)).toBe(false);
    const lapsed = applyResult(state, { itemId: "i", unitId: "u", correct: false, now: hours(9) });
    expect(isMastered(lapsed)).toBe(false);
    expect(isWeak(lapsed)).toBe(true);
    let recovered = lapsed;
    for (let index = 0; index < 3; index += 1) recovered = applyResult(recovered, { itemId: "i", unitId: "u", correct: true, now: hours(10 + index) });
    expect(isWeak(recovered)).toBe(false);
  });
});
