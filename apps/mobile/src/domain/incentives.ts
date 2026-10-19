/** Mensagens de incentivo em texto (identidade visual do Jaguá fica para outra entrega). */
const SUCCESS_TITLES = ["Muito bem!", "Ótimo!", "Cada conquista conta!", "Isso mesmo!"] as const;
const SESSION_MESSAGES = [
  "Cada conquista conta. Continue no seu ritmo.",
  "Você avançou mais um passo na leitura.",
  "Bom trabalho. A prática diária fortalece a confiança.",
  "Erros também ensinam. Voltar e tentar de novo faz parte.",
] as const;

const pick = <T extends string>(items: readonly T[], seed: string): T => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash + seed.charCodeAt(index) * (index + 1)) % 997;
  return items[hash % items.length]!;
};

export const successIncentiveTitle = (seed: string): string => pick(SUCCESS_TITLES, seed);

export const sessionIncentiveMessage = (seed: string, perfect: boolean, recovered: boolean): string => {
  if (perfect) return "Excelente: você acertou sem precisar repetir. Cada conquista conta!";
  if (recovered) return "Você voltou aos desafios e transformou erros em aprendizagem. Cada conquista conta!";
  return pick(SESSION_MESSAGES, seed);
};
