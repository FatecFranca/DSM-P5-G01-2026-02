/**
 * Ligas do caminho da leitura. Espelha apps/api/app/leaderboard.py::LEAGUES (ids, nomes e pontos mínimos):
 * mudar uma exige mudar a outra. A liga vem da soma de todos os pontos e só sobe; o placar dentro dela é da semana.
 */
export type LeagueId = "lapis" | "caderno" | "livro" | "estante" | "biblioteca";
export type LeagueInfo = { id: LeagueId; name: string; minPoints: number; color: string };

export const LEAGUES: readonly LeagueInfo[] = [
  { id: "lapis", name: "Lápis", minPoints: 0, color: "#E9A23B" },
  { id: "caderno", name: "Caderno", minPoints: 150, color: "#2F7FC1" },
  { id: "livro", name: "Livro", minPoints: 400, color: "#28724C" },
  { id: "estante", name: "Estante", minPoints: 800, color: "#8456B8" },
  { id: "biblioteca", name: "Biblioteca", minPoints: 1500, color: "#C2414F" },
];

export const leagueIndex = (id: string): number => Math.max(0, LEAGUES.findIndex((league) => league.id === id));

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dias inteiros até o fim da semana da liga (segunda 00h); no domingo, ou se a data vier inválida, é 0. */
export function daysLeft(endsAt: string, now: Date): number {
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS) - 1);
}

export const weekEndText = (days: number): string =>
  days === 0 ? "A semana termina hoje" : days === 1 ? "A semana termina amanhã" : `A semana termina em ${days} dias`;

/** Frase do rodapé: quanto falta para a próxima liga, ou que a pessoa já está na última. */
export function nextLeagueText(totalPoints: number, next: { name: string; minPoints: number } | null): string {
  if (!next) return "Você está na última liga. Continue lendo!";
  const missing = Math.max(0, next.minPoints - totalPoints);
  return missing === 1 ? `Falta 1 ponto para a liga ${next.name}` : `Faltam ${missing} pontos para a liga ${next.name}`;
}
