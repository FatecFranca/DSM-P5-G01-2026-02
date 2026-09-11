import { create } from "zustand";
import type { ItemState, LessonProgress } from "../domain/types";

type StudyState = {
  currentLessonId: string;
  progress: Record<string, LessonProgress>;
  itemStates: Record<string, ItemState>;
  setCurrentLesson: (id: string) => void;
  hydrate: (progress: LessonProgress[], itemStates: ItemState[]) => void;
  setProgress: (item: LessonProgress) => void;
  setItemState: (state: ItemState) => void;
  applyRemote: (merged: { progress: LessonProgress[]; itemStates: ItemState[] }) => void;
};

const byKey = <T>(items: T[], key: (item: T) => string) => Object.fromEntries(items.map((item) => [key(item), item]));

export const useStudyStore = create<StudyState>((set) => ({
  currentLessonId: "lesson-A", progress: {}, itemStates: {},
  setCurrentLesson: (currentLessonId) => set({ currentLessonId }),
  hydrate: (progress, itemStates) => set({ progress: byKey(progress, (item) => item.lessonId), itemStates: byKey(itemStates, (state) => state.itemId) }),
  setProgress: (item) => set((state) => ({ progress: { ...state.progress, [item.lessonId]: item } })),
  setItemState: (item) => set((state) => ({ itemStates: { ...state.itemStates, [item.itemId]: item } })),
  applyRemote: (merged) => set((state) => ({ progress: { ...state.progress, ...byKey(merged.progress, (item) => item.lessonId) }, itemStates: { ...state.itemStates, ...byKey(merged.itemStates, (item) => item.itemId) } })),
}));
