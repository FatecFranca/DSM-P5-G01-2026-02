export type ExerciseType = "listen_choose" | "recognize" | "find_in_word" | "complete_word";
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
  instruction: string;
  answer: string;
  options?: string[];
  contextWord?: string;
  wordChoices?: WordChoice[];
};

export type LetterLesson = {
  id: string;
  order: number;
  phase: 1 | 2 | 3;
  phaseTitle: string;
  letter: string;
  prerequisiteLetters: string[];
  syllables: string[];
  exercises: Exercise[];
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
  confidence?: number;
  uncertain?: boolean;
  modelVersion?: string;
  durationMs: number;
  createdAt: string;
};

export type SyncEvent = {
  id: string;
  type: "attempt" | "progress";
  payload: Record<string, unknown>;
  retries?: number;
};
