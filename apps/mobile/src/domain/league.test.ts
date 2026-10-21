import { describe, expect, it } from "vitest";
import { daysLeft, LEAGUES, leagueIndex, nextLeagueText, weekEndText } from "./league";

describe("league", () => {
  it("keeps the leagues in increasing order of points", () => {
    expect(LEAGUES.map((league) => league.id)).toEqual(["lapis", "caderno", "livro", "estante", "biblioteca"]);
    expect(LEAGUES.every((league, index) => index === 0 || league.minPoints > LEAGUES[index - 1].minPoints)).toBe(true);
    expect(leagueIndex("livro")).toBe(2);
    expect(leagueIndex("desconhecida")).toBe(0);
  });

  it("counts whole days left until Monday midnight", () => {
    const endsAt = "2026-10-26T03:00:00Z"; // segunda 00h em Brasília
    expect(daysLeft(endsAt, new Date("2026-10-21T13:00:00Z"))).toBe(4); // quarta: qui, sex, sáb, dom
    expect(daysLeft(endsAt, new Date("2026-10-24T13:00:00Z"))).toBe(1); // sábado: termina amanhã
    expect(daysLeft(endsAt, new Date("2026-10-25T13:00:00Z"))).toBe(0); // domingo: termina hoje
    expect(daysLeft("", new Date())).toBe(0);
  });

  it("says how the week ends and what is missing for the next league", () => {
    expect([0, 1, 4].map(weekEndText)).toEqual(["A semana termina hoje", "A semana termina amanhã", "A semana termina em 4 dias"]);
    expect(nextLeagueText(120, { name: "Caderno", minPoints: 150 })).toBe("Faltam 30 pontos para a liga Caderno");
    expect(nextLeagueText(149, { name: "Caderno", minPoints: 150 })).toBe("Falta 1 ponto para a liga Caderno");
    expect(nextLeagueText(2000, null)).toBe("Você está na última liga. Continue lendo!");
  });
});
