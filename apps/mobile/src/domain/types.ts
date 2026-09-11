import type { ExerciseType, ItemKind } from "./exercise-types";

export type { ExerciseType, ItemKind };
export type LessonStatus = "locked" | "available" | "learning" | "review" | "mastered" | "needs_review";

export type WordChoice = {
  id: string;
  image: string;
  imageLabel: string;
  audioText: string;
  before: string;
  after: string;
  word: string;
};

export type Exercise = {
  id: string;
  type: ExerciseType;
  itemKind: ItemKind;
  targetId?: string;
  instruction: string;
  /** O que o botão de áudio fala; para sílabas, palavras e frases é o próprio alvo, nunca a consoante isolada. */
  ttsText: string;
  answer: string;
  requiredLetters: string;
  options?: string[];
  contextWord?: string;
  wordChoices?: WordChoice[];
  /** Peças a ordenar (sílabas ou palavras) nos exercícios de montagem. */
  tokens?: string[];
  /** Frase com a lacuna `___` nos exercícios de completar frase. */
  sentence?: string;
};

export type UnitKind = "letter" | "word" | "sentence";

/** Unidade de estudo: uma letra da trilha fônica ou um grupo de palavras/frases de uma trilha temática. */
export type Unit = {
  id: string;
  trackId: string;
  kind: UnitKind;
  title: string;
  order: number;
  phase?: 1 | 2 | 3;
  phaseTitle?: string;
  letter?: string;
  /** Letras que precisam estar dominadas antes desta unidade; é o portão pedagógico, a trilha nunca libera nada. */
  prerequisiteLetters: string[];
  exercises: Exercise[];
};

export type Track = {
  id: string;
  slug: string;
  title: string;
  kind: "phonics" | "theme";
  description?: string;
  order: number;
  units: Unit[];
};

export type LessonProgress = {
  lessonId: string;
  completedTypes: ExerciseType[];
  score: number;
  completed: boolean;
  status?: LessonStatus;
  attempts?: number;
  correctAttempts?: number;
  reviewCount?: number;
  accuracy?: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  updatedAt: string;
};

export type Attempt = {
  clientAttemptId: string;
  lessonId: string;
  exerciseId: string;
  exerciseType: ExerciseType;
  answer: string;
  correct: boolean;
  durationMs: number;
  createdAt: string;
};

export type SyncEvent = {
  id: string;
  type: "attempt" | "progress";
  payload: Record<string, unknown>;
  retries?: number;
};
