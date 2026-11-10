import { isLessonOpen } from "./learning";
import { LEARNING_LEVELS, type LearningLevelId } from "./levels";
import type { Track, Unit, UnitKind } from "./types";

type ProgressMap = Record<string, { completed?: boolean } | undefined>;

/** Etapas da árvore da trilha (Figma 9:138). */
export type TrailStageId = "letras" | "vogais" | "consoantes" | "silabas-simples" | "silabas-complexas" | "palavras";

export type TrailStage = {
  id: TrailStageId;
  title: string;
  /** Fases da trilha fônica que a etapa mostra, ou tipos de unidade das trilhas temáticas. */
  phases?: readonly (1 | 2 | 3)[];
  unitKinds?: readonly UnitKind[];
};

/** Ordem visual da árvore, de baixo para cima. */
export const TRAIL_STAGES: readonly TrailStage[] = [
  // Letras é a etapa inicial: o alfabeto inteiro, começando pelo A. Vogais e Consoantes recortam as mesmas lições
  // (o progresso é o mesmo), e as letras da fase 3 (B, F, V…) só aparecem em Letras.
  { id: "letras", title: "Letras", phases: [1, 2, 3] },
  { id: "vogais", title: "Vogais", phases: [1] },
  { id: "consoantes", title: "Consoantes", phases: [2] },
  { id: "silabas-simples", title: "Sílabas simples", unitKinds: ["syllable"] },
  { id: "silabas-complexas", title: "Sílabas complexas", unitKinds: ["word_image"] },
  { id: "palavras", title: "Palavras", unitKinds: ["word", "sentence", "sentence_image"] },
];

/** Ordem pedagógica: a próxima lição é procurada nesta ordem, não na ordem visual da árvore. */
const LEARNING_ORDER: readonly TrailStageId[] = ["letras", "silabas-simples", "silabas-complexas", "palavras"];

export const trailStage = (id: string | undefined): TrailStage | undefined => TRAIL_STAGES.find((stage) => stage.id === id);

export function unitsForStage(tracks: Track[], stage: TrailStage): Unit[] {
  if (stage.phases) {
    const phases = new Set(stage.phases);
    const phonics = tracks.find((track) => track.kind === "phonics");
    return (phonics?.units ?? []).filter((unit) => unit.phase !== undefined && phases.has(unit.phase)).sort((a, b) => a.order - b.order);
  }
  const kinds = new Set(stage.unitKinds ?? []);
  return [...tracks]
    .sort((a, b) => a.order - b.order)
    .flatMap((track) => [...track.units].sort((a, b) => a.order - b.order).filter((unit) => kinds.has(unit.kind)));
}

export type TrailStatus = "done" | "current" | "available" | "locked";

/** O que o nivelamento muda na trilha: o nível por onde começar e as letras creditadas (vazio = nenhum crédito). */
export type TrailPlacement = { startLevel: LearningLevelId; creditedLetters: string };

const isDone = (unit: Unit, progress: ProgressMap) => progress[unit.id]?.completed === true;
const isOpen = (unit: Unit, progress: ProgressMap, creditedLetters = "") => isLessonOpen(unit, progress, creditedLetters);

/** Unidades das trilhas temáticas de um nível do Prosa, na ordem das trilhas e das unidades. */
const themeUnitsForLevel = (tracks: Track[], level: LearningLevelId): Unit[] => {
  const kinds = new Set(LEARNING_LEVELS.find((item) => item.id === level)?.unitKinds ?? []);
  return [...tracks].sort((a, b) => a.order - b.order).flatMap((track) => [...track.units].sort((a, b) => a.order - b.order).filter((unit) => kinds.has(unit.kind)));
};

/**
 * Próxima lição de toda a trilha: a primeira liberada e não concluída, na ordem pedagógica. Com nivelamento, começa
 * pelas unidades do nível sugerido em diante; esgotadas, volta à ordem pedagógica (letras e sílabas que faltam).
 */
export function nextTrailUnit(tracks: Track[], progress: ProgressMap, placement?: TrailPlacement): Unit | null {
  const credited = placement?.creditedLetters ?? "";
  const pending = (unit: Unit) => isOpen(unit, progress, credited) && !isDone(unit, progress);
  for (let level = placement && placement.startLevel > 1 ? placement.startLevel : 5; level <= 4; level += 1) {
    const unit = themeUnitsForLevel(tracks, level as LearningLevelId).find(pending);
    if (unit) return unit;
  }
  for (const id of LEARNING_ORDER) {
    const unit = unitsForStage(tracks, trailStage(id)!).find(pending);
    if (unit) return unit;
  }
  return null;
}

export function unitStatus(unit: Unit, progress: ProgressMap, next: Unit | null, creditedLetters = ""): TrailStatus {
  if (unit.id === next?.id) return "current";
  if (isDone(unit, progress)) return "done";
  return isOpen(unit, progress, creditedLetters) ? "available" : "locked";
}

export function stageStatus(units: Unit[], progress: ProgressMap, next: Unit | null, creditedLetters = ""): TrailStatus {
  if (units.some((unit) => unit.id === next?.id)) return "current";
  if (units.length > 0 && units.every((unit) => isDone(unit, progress))) return "done";
  return units.some((unit) => isOpen(unit, progress, creditedLetters)) ? "available" : "locked";
}
