import { describe, expect, it } from "vitest";
import { streakDays } from "./streak";

const at = (day: number, hour = 10) => new Date(2026, 9, day, hour).toISOString();
const now = new Date(2026, 9, 21, 15);

describe("streakDays", () => {
  it("conta dias consecutivos até hoje", () => {
    expect(streakDays([at(19), at(20), at(21), at(21, 18)], now)).toBe(3);
  });

  it("sem prática hoje, a sequência conta até ontem", () => {
    expect(streakDays([at(19), at(20)], now)).toBe(2);
  });

  it("um dia sem prática interrompe a sequência", () => {
    expect(streakDays([at(17), at(18), at(20), at(21)], now)).toBe(2);
    expect(streakDays([at(18)], now)).toBe(0);
    expect(streakDays([], now)).toBe(0);
  });
});
