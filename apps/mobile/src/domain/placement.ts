import type { LearningLevelId } from "./levels";

export type PlacementQuestion = {
  id: string;
  level: LearningLevelId;
  instruction: string;
  ttsText: string;
  answer: string;
  options: string[];
};

/** Nivelamento curto por toque: orienta a entrada sem pular conteúdo obrigatório. */
export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  {
    id: "placement-letter",
    level: 1,
    instruction: "Toque na letra A.",
    ttsText: "Toque na letra A.",
    answer: "A",
    options: ["A", "E", "O"],
  },
  {
    id: "placement-syllable",
    level: 2,
    instruction: "Qual sílaba começa a palavra CASA?",
    ttsText: "Qual sílaba começa a palavra CASA?",
    answer: "CA",
    options: ["CA", "SA", "ME"],
  },
  {
    id: "placement-word",
    level: 3,
    instruction: "Qual palavra combina com uma casa?",
    ttsText: "Qual palavra combina com uma casa?",
    answer: "CASA",
    options: ["CASA", "COPO", "MESA"],
  },
  {
    id: "placement-phrase",
    level: 4,
    instruction: "Qual frase fala de dormir?",
    ttsText: "Qual frase fala de dormir?",
    answer: "EU DURMO NA CAMA",
    options: ["EU DURMO NA CAMA", "O COPO ESTÁ NA MESA", "A SALA É GRANDE"],
  },
] as const;

/**
 * Recomenda o próximo nível a praticar: acertos em sequência elevam o ponto de partida sugerido;
 * o primeiro erro interrompe a progressão do nivelamento.
 */
export function recommendPlacementLevel(results: readonly boolean[]): LearningLevelId {
  let level: LearningLevelId = 1;
  for (let index = 0; index < PLACEMENT_QUESTIONS.length; index += 1) {
    if (!results[index]) return level;
    const next = Math.min(5, PLACEMENT_QUESTIONS[index].level + 1) as LearningLevelId;
    level = next;
  }
  return level;
}

export const placementGuidance = (level: LearningLevelId): string => {
  if (level <= 1) return "Vamos começar pelas letras. Ouça, toque e avance no seu ritmo.";
  if (level === 2) return "Você já reconhece letras. O próximo passo são as sílabas.";
  if (level === 3) return "Bom caminho. Pratique palavras do cotidiano com imagens e áudio.";
  if (level === 4) return "Você está pronto para frases curtas. Continue com calma.";
  return "Que tal consolidar o que já sabe? A revisão reforça a leitura.";
};
