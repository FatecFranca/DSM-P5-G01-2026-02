import type { Track, Unit, UnitKind } from "./types";

/** Níveis do Prosa (proposta pedagógica): mapeiam o conteúdo já publicado sem alterar o catálogo. */
export type LearningLevelId = 1 | 2 | 3 | 4 | 5;

export type LearningLevel = {
  id: LearningLevelId;
  title: string;
  shortTitle: string;
  description: string;
  unitKinds: readonly UnitKind[];
};

export const LEARNING_LEVELS: readonly LearningLevel[] = [
  { id: 1, title: "Nível 1 — Letras", shortTitle: "Letras", description: "Reconhecer vogais e consoantes com áudio e toque.", unitKinds: ["letter"] },
  { id: 2, title: "Nível 2 — Sílabas", shortTitle: "Sílabas", description: "Identificar e ordenar blocos silábicos.", unitKinds: ["syllable"] },
  { id: 3, title: "Nível 3 — Palavras", shortTitle: "Palavras", description: "Associar figuras e compor palavras do cotidiano.", unitKinds: ["word", "word_image"] },
  { id: 4, title: "Nível 4 — Frases", shortTitle: "Frases", description: "Organizar e compreender frases curtas.", unitKinds: ["sentence", "sentence_image"] },
  { id: 5, title: "Nível 5 — Consolidação", shortTitle: "Consolidação", description: "Revisão e prática ampliada do que já foi aprendido.", unitKinds: [] },
] as const;

export const levelForUnitKind = (kind: UnitKind): LearningLevelId => {
  if (kind === "letter") return 1;
  if (kind === "syllable") return 2;
  if (kind === "word" || kind === "word_image") return 3;
  return 4;
};

export const unitsForLevel = (tracks: Track[], levelId: LearningLevelId): Unit[] => {
  if (levelId === 5) return [];
  const kinds = new Set(LEARNING_LEVELS.find((level) => level.id === levelId)?.unitKinds ?? []);
  return tracks.flatMap((track) => track.units.filter((unit) => kinds.has(unit.kind)));
};

export const levelLabel = (levelId: LearningLevelId): string => LEARNING_LEVELS.find((level) => level.id === levelId)?.title ?? `Nível ${levelId}`;
