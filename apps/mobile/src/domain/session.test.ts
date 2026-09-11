import { describe, expect, it } from "vitest";
import { applyResult, type ItemState } from "./scheduler";
import { buildSession, hashSeed, mulberry32, reinsert } from "./session";

const now = new Date("2026-09-16T10:00:00Z");
const hours = (value: number) => new Date(now.getTime() + value * 60 * 60 * 1000);
const exercises = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const state = (itemId: string, results: boolean[], at = hours(-48)): ItemState => results.reduce<ItemState | undefined>((current, correct, index) => applyResult(current, { itemId, unitId: "u", correct, now: new Date(at.getTime() + index * 60_000) }), undefined)!;

describe("fila de sessão", () => {
  it("é determinística para a mesma semente e varia entre sementes", () => {
    const states = { a: state("a", [true]), b: state("b", [true, false]), c: state("c", [true], hours(-1)) };
    const first = buildSession({ exercises, states, now, seed: "user:unit:day-1" });
    expect(buildSession({ exercises, states, now, seed: "user:unit:day-1" })).toEqual(first);
    const ids = new Set([first, buildSession({ exercises, states, now, seed: "user:unit:day-2" }), buildSession({ exercises, states, now, seed: "user:unit:day-3" })].map((session) => session.map((item) => item.id).join("")));
    expect(first).toHaveLength(6);
    expect(ids.size).toBeGreaterThan(0);
  });

  it("põe vencidos e fracos antes dos novos, e novos na ordem do currículo", () => {
    // a e c venceram; d errou há uma hora (fraco, ainda não vencido); b, e, f são novos.
    const states = { a: state("a", [true], hours(-9)), c: state("c", [true]), d: state("d", [true, false], hours(-1)) };
    const session = buildSession({ exercises, states, now, seed: "s" }).map((item) => item.id);
    const [first, second, ...rest] = session;
    expect(new Set([first, second])).toEqual(new Set(["a", "c"]));
    expect(rest).toEqual(["d", "b", "e", "f"]);
  });

  it("respeita o tamanho e redistribui cotas vazias na ordem vencidos → fracos → novos", () => {
    const session = buildSession({ exercises, states: {}, now, size: 3, seed: "s" }).map((item) => item.id);
    expect(session).toEqual(["a", "b", "c"]);
    const due = Object.fromEntries(["a", "b", "c", "d"].map((id) => [id, state(id, [true])]));
    const dueFirst = buildSession({ exercises, states: due, now, size: 4, mix: { due: 0.25, weak: 0.5, new: 0.25 }, seed: "s" }).map((item) => item.id);
    expect(dueFirst).toHaveLength(4);
    expect(dueFirst.filter((id) => "abcd".includes(id))).toHaveLength(3);
    expect(dueFirst).toContain("e");
  });

  it("reinsere o item errado três posições adiante ou no fim", () => {
    expect(reinsert(["b", "c", "d", "e"], "a")).toEqual(["b", "c", "d", "a", "e"]);
    expect(reinsert(["b"], "a")).toEqual(["b", "a"]);
    expect(reinsert([], "a")).toEqual(["a"]);
  });

  it("gera números estáveis a partir da semente", () => {
    expect(hashSeed("alfabetiza")).toBe(hashSeed("alfabetiza"));
    const random = mulberry32(hashSeed("alfabetiza"));
    const values = [random(), random(), random()];
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    const again = mulberry32(hashSeed("alfabetiza"));
    expect([again(), again(), again()]).toEqual(values);
  });
});
