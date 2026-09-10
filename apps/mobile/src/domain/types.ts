export type ExerciseType = "listen_choose" | "recognize" | "complete_word";

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
  wordChoices?: WordChoice[];
};

export type LetterLesson = {
  id: string;
  order: number;
  letter: string;
  syllables: string[];
  exercises: Exercise[];
};

export type InferenceResult = {
  className: string;
  confidence: number;
  uncertain: boolean;
  modelVersion: string;
};

export type LessonProgress = {
  lessonId: string;
  completedTypes: ExerciseType[];
  score: number;
  completed: boolean;
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
