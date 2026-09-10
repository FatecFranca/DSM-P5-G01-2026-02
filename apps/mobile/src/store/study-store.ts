import { create } from "zustand";
import type { LessonProgress } from "../domain/types";

type StudyState = { currentLessonId: string; progress: Record<string, LessonProgress>; setCurrentLesson: (id: string) => void; hydrateProgress: (items: LessonProgress[]) => void; setProgress: (item: LessonProgress) => void };
export const useStudyStore = create<StudyState>((set) => ({
  currentLessonId: "letter-a", progress: {}, setCurrentLesson: (currentLessonId) => set({ currentLessonId }),
  hydrateProgress: (items) => set({ progress: Object.fromEntries(items.map((item) => [item.lessonId, item])) }),
  setProgress: (item) => set((state) => ({ progress: { ...state.progress, [item.lessonId]: item } })),
}));
