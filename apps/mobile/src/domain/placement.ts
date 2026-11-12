// Espelha contracts/placement-quiz.json (fonte: bancoquestoesequiz/QUIZ_NIVELAMENTO.md); placement.test.ts garante a
// paridade, e a API (app/placement.py) e a carga PostgreSQL corrigem com a mesma regra.
import { PHASES } from "./exercise-types";

export type PlacementBand = "facil" | "medio" | "dificil";
export type PlacementStartLevel = 1 | 2 | 3 | 4;
export type BandMix = Readonly<Record<PlacementBand, number>>;

export type PlacementOption = { label: string; image?: string };
export type PlacementStimulus = { audio?: string; image?: string; image_alt?: string; text?: string };
export type PlacementItem = {
  id: string;
  order: number;
  band: PlacementBand;
  /** Nível do Prosa que o item mede (1 Letras, 2 Sílabas, 3 Palavras, 4 Frases). */
  level: PlacementStartLevel;
  skill: string;
  instruction: string;
  stimulus: PlacementStimulus;
  options: PlacementOption[];
  /** Índice da opção correta, começando em 1. */
  answer: number;
};

export const PLACEMENT_QUIZ_VERSION = "nivelamento-v1";
export const PLACEMENT_INTRO = "Vamos fazer algumas atividades para escolher por onde começar. Faça no seu ritmo. Se quiser, você pode pular uma questão.";
export const PLACEMENT_OUTRO = "Vamos começar com atividades no seu ritmo. Conforme você pratica, vamos ajustando as próximas.";
/** Demonstração sem pontuação: ensina a selecionar e confirmar antes da primeira questão. */
export const PLACEMENT_DEMO = {
  instruction: "Toque no círculo.",
  options: [{ label: "Círculo", shape: "circle" }, { label: "Quadrado", shape: "square" }],
  answer: 1,
} as const satisfies { instruction: string; options: readonly { label: string; shape: "circle" | "square" }[]; answer: number };

const ask = { letter: "Ouça e toque na letra que você ouviu.", syllable: "Olhe a imagem e toque na sílaba que falta." };

export const PLACEMENT_ITEMS: readonly PlacementItem[] = [
  { id: "F1", order: 1, band: "facil", level: 1, skill: "nome_da_vogal", instruction: ask.letter, stimulus: { audio: "A" }, options: [{ label: "O" }, { label: "A" }, { label: "E" }], answer: 2 },
  { id: "F2", order: 2, band: "facil", level: 1, skill: "nome_da_consoante", instruction: ask.letter, stimulus: { audio: "eme" }, options: [{ label: "M" }, { label: "N" }, { label: "P" }], answer: 1 },
  { id: "F3", order: 3, band: "facil", level: 2, skill: "silaba_inicial", instruction: ask.syllable, stimulus: { image: "images/words/casa.svg", image_alt: "Desenho de uma casa.", text: "___ SA" }, options: [{ label: "PA" }, { label: "MA" }, { label: "CA" }], answer: 3 },
  {
    id: "F4", order: 4, band: "facil", level: 3, skill: "leitura_de_palavra", instruction: "Leia a palavra e toque na imagem que combina.", stimulus: { text: "COPO" },
    options: [{ label: "Prato", image: "images/words/prato.svg" }, { label: "Copo", image: "images/words/copo.svg" }, { label: "Colher", image: "images/quiz/colher.svg" }], answer: 2,
  },
  { id: "M1", order: 5, band: "medio", level: 2, skill: "silaba_interna", instruction: ask.syllable, stimulus: { image: "images/words/panela.svg", image_alt: "Desenho de uma panela de cozinha.", text: "PA ___ LA" }, options: [{ label: "NA" }, { label: "ME" }, { label: "NE" }], answer: 3 },
  { id: "M2", order: 6, band: "medio", level: 2, skill: "silaba_final", instruction: ask.syllable, stimulus: { image: "images/words/tapete.svg", image_alt: "Desenho de um tapete.", text: "TA PE ___" }, options: [{ label: "TE" }, { label: "TA" }, { label: "TO" }], answer: 1 },
  { id: "M3", order: 7, band: "medio", level: 3, skill: "discriminacao_de_palavras", instruction: "Olhe a imagem e toque na palavra que combina.", stimulus: { image: "images/quiz/sapato.svg", image_alt: "Desenho de um sapato fechado." }, options: [{ label: "SACOLA" }, { label: "SAPATO" }, { label: "SABÃO" }], answer: 2 },
  {
    id: "M4", order: 8, band: "medio", level: 4, skill: "compreensao_de_frase", instruction: "Leia a frase e toque na imagem que combina.", stimulus: { text: "O COPO ESTÁ NA MESA." },
    options: [
      { label: "Copo debaixo da mesa", image: "images/quiz/copo-debaixo-da-mesa.svg" },
      { label: "Copo no chão, ao lado da mesa", image: "images/quiz/copo-no-chao.svg" },
      { label: "Copo em cima da mesa", image: "images/quiz/copo-em-cima-da-mesa.svg" },
    ], answer: 3,
  },
  { id: "D1", order: 9, band: "dificil", level: 2, skill: "encontro_consonantal", instruction: ask.syllable, stimulus: { image: "images/quiz/prato-vazio.svg", image_alt: "Desenho de um prato vazio.", text: "___ TO" }, options: [{ label: "PRA" }, { label: "BRA" }, { label: "TRA" }], answer: 1 },
  {
    id: "D2", order: 10, band: "dificil", level: 4, skill: "discriminacao_de_frases", instruction: "Olhe a cena e toque na frase que descreve o que acontece.",
    stimulus: { image: "images/quiz/varal.svg", image_alt: "Pessoa colocando um prendedor em uma camiseta no varal, ao lado de outras roupas penduradas." },
    options: [{ label: "A PESSOA DOBRA A ROUPA." }, { label: "A PESSOA ESTENDE A ROUPA." }, { label: "A PESSOA LAVA A ROUPA." }], answer: 2,
  },
  { id: "D3", order: 11, band: "dificil", level: 4, skill: "informacao_explicita", instruction: "Leia o aviso. Em qual dia a feira vai abrir?", stimulus: { text: "A FEIRA ABRE NO SÁBADO. NO DOMINGO, A FEIRA FICA FECHADA." }, options: [{ label: "DOMINGO" }, { label: "SEGUNDA-FEIRA" }, { label: "SÁBADO" }], answer: 3 },
  {
    id: "D4", order: 12, band: "dificil", level: 4, skill: "relacao_entre_frases", instruction: "Leia o texto. Por que Rui pegou o guarda-chuva?", stimulus: { text: "RUI VIU QUE ESTAVA CHOVENDO. ANTES DE SAIR, PEGOU O GUARDA-CHUVA." },
    options: [{ label: "PORQUE ESTAVA CHOVENDO." }, { label: "PORQUE IA COMPRAR UM GUARDA-CHUVA." }, { label: "PORQUE ESTAVA FAZENDO SOL." }], answer: 1,
  },
];

export const PLACEMENT_RULES = {
  bands: ["facil", "medio", "dificil"] as PlacementBand[],
  scoring: { band_threshold: 3, min_easy_answered: 3 },
  mixes: {
    facil: { facil: 6, medio: 3, dificil: 1 },
    medio: { facil: 3, medio: 5, dificil: 2 },
    dificil: { facil: 2, medio: 3, dificil: 5 },
  } as Record<PlacementBand, BandMix>,
  startLevel: {
    capByDifficulty: { facil: 1, medio: 3, dificil: 4 } as Record<PlacementBand, PlacementStartLevel>,
    minHitsByLevel: { 1: 2, 2: 3, 3: 2, 4: 3 } as Record<string, number>,
  },
  creditPhasesByStartLevel: { 1: [], 2: [1, 2], 3: [1, 2], 4: [1, 2, 3] } as Record<string, number[]>,
  itemDifficultyBands: { introducao: "facil", facil: "facil", medio: "medio", revisao: "medio", desafio: "dificil" } as Record<string, PlacementBand>,
  defaultItemBand: "medio" as PlacementBand,
};

/** Índice escolhido (1 a 3) ou `null` quando a pessoa pulou. ID ausente: questão não alcançada. */
export type PlacementResponses = Readonly<Record<string, number | null>>;
export type ProvisionalReason = "quiz_pulado" | "quiz_incompleto" | "poucas_respostas_faceis" | "resultado_contrastante";

export type PlacementScore = {
  hits: Record<PlacementBand, number>;
  answered: Record<PlacementBand, number>;
  skippedItems: string[];
  difficulty: PlacementBand;
  provisional: boolean;
  provisionalReason: ProvisionalReason | null;
  startLevel: PlacementStartLevel;
  /** Letras que contam como apresentadas para abrir unidades; vazio quando o resultado é provisório. */
  creditedLetters: string;
  mix: BandMix;
};

const byId = new Map(PLACEMENT_ITEMS.map((item) => [item.id, item]));
const zero = (): Record<PlacementBand, number> => ({ facil: 0, medio: 0, dificil: 0 });

export const creditedLettersFor = (startLevel: PlacementStartLevel): string => {
  const phases = new Set(PLACEMENT_RULES.creditPhasesByStartLevel[String(startLevel)] ?? []);
  return PHASES.filter((phase) => phases.has(phase.phase)).map((phase) => phase.letters).join("");
};

/** Faixa do quiz correspondente à dificuldade publicada no exercício (`payload.difficulty`). */
export const itemBand = (difficulty: string | undefined): PlacementBand =>
  (difficulty !== undefined && Object.hasOwn(PLACEMENT_RULES.itemDifficultyBands, difficulty) ? PLACEMENT_RULES.itemDifficultyBands[difficulty] : undefined) ?? PLACEMENT_RULES.defaultItemBand;

function validate(responses: PlacementResponses): void {
  for (const [id, choice] of Object.entries(responses)) {
    const item = byId.get(id);
    if (!item) throw new Error(`ID ${id} não pertence ao quiz de nivelamento.`);
    if (choice !== null && (!Number.isInteger(choice) || choice < 1 || choice > item.options.length)) throw new Error(`Use o índice 1 a ${item.options.length} ou null em ${id}.`);
  }
}

const isHit = (item: PlacementItem, responses: PlacementResponses) => responses[item.id] === item.answer;

/** Acerto de cada item respondido (pulados e não alcançados ficam de fora), na ordem do quiz. */
export const placementHitList = (responses: PlacementResponses): boolean[] =>
  PLACEMENT_ITEMS.filter((item) => typeof responses[item.id] === "number").map((item) => isHit(item, responses));

/**
 * Corrige o quiz (regra de QUIZ_NIVELAMENTO.md, igual a banco_questoes.corrigir_quiz): uma faixa é atingida com pelo
 * menos três acertos em quatro. Quiz pulado, incompleto, com menos de três fáceis respondidas ou com fáceis baixas e
 * faixas altas atingidas vira fácil provisório. O nível de partida é o maior nível, até o teto da dificuldade, em que
 * ele e todos os anteriores atingem o mínimo de acertos.
 */
export function scorePlacement(responses: PlacementResponses, options: { skipped?: boolean } = {}): PlacementScore {
  validate(responses);
  const { band_threshold: threshold, min_easy_answered: minEasy } = PLACEMENT_RULES.scoring;
  const hits = zero(); const answered = zero(); const skippedItems: string[] = [];
  for (const item of PLACEMENT_ITEMS) {
    if (!Object.hasOwn(responses, item.id)) continue;
    if (responses[item.id] === null) { skippedItems.push(item.id); continue; }
    answered[item.band] += 1;
    if (isHit(item, responses)) hits[item.band] += 1;
  }
  const missing = PLACEMENT_ITEMS.some((item) => !Object.hasOwn(responses, item.id));
  const provisionalReason: ProvisionalReason | null = options.skipped ? "quiz_pulado"
    : missing ? "quiz_incompleto"
      : answered.facil < minEasy ? "poucas_respostas_faceis"
        : hits.facil < threshold && Math.max(hits.medio, hits.dificil) >= threshold ? "resultado_contrastante" : null;
  const provisional = provisionalReason !== null;
  const difficulty: PlacementBand = provisional || hits.facil < threshold ? "facil" : hits.medio >= threshold && hits.dificil >= threshold ? "dificil" : "medio";

  let startLevel: PlacementStartLevel = 1;
  if (!provisional) {
    const cap = PLACEMENT_RULES.startLevel.capByDifficulty[difficulty];
    for (let level = 1 as PlacementStartLevel; level <= cap; level = (level + 1) as PlacementStartLevel) {
      const levelHits = PLACEMENT_ITEMS.filter((item) => item.level === level && isHit(item, responses)).length;
      if (levelHits < PLACEMENT_RULES.startLevel.minHitsByLevel[String(level)]) break;
      startLevel = level;
    }
  }
  return { hits, answered, skippedItems, difficulty, provisional, provisionalReason, startLevel, creditedLetters: provisional ? "" : creditedLettersFor(startLevel), mix: PLACEMENT_RULES.mixes[difficulty] };
}

const LEVEL_GUIDANCE: Record<PlacementStartLevel, string> = {
  1: "Vamos começar pelas letras. Ouça, toque e avance no seu ritmo.",
  2: "Você já reconhece letras. O próximo passo são as sílabas.",
  3: "Bom caminho. Pratique palavras do cotidiano com imagens e áudio.",
  4: "Você está pronto para frases curtas. Continue com calma.",
};

export const placementGuidance = (score: Pick<PlacementScore, "startLevel" | "provisional">): string =>
  score.provisional ? `${LEVEL_GUIDANCE[1]} Vamos ajustando conforme você pratica.` : LEVEL_GUIDANCE[score.startLevel];

/** Marcador de lacuna do contrato; é só um sinal, não o número de letras. */
export const PLACEMENT_GAP = "___";
export type StimulusPart = { kind: "text"; text: string } | { kind: "gap"; slots: number };

/**
 * Quebra o texto do estímulo em trechos e lacunas. Cada lacuna mostra uma casa por letra da resposta: "___ SA" com
 * opções PA/MA/CA vira duas casas, não três. Todas as opções de um item têm o mesmo tamanho, então a contagem não
 * entrega o gabarito; se um dia divergirem, vale a maior.
 */
export function stimulusParts(item: Pick<PlacementItem, "stimulus" | "options">): StimulusPart[] {
  const text = item.stimulus.text ?? "";
  const slots = Math.max(1, ...item.options.map((option) => option.label.replace(/\s/g, "").length));
  return text.split(PLACEMENT_GAP).flatMap((segment, index): StimulusPart[] => [
    ...(index > 0 ? [{ kind: "gap", slots } as const] : []),
    ...(segment.trim() ? [{ kind: "text", text: segment.trim() } as const] : []),
  ]);
}
