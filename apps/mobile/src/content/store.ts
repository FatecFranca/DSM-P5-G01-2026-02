import { create } from "zustand";
import seed from "../../assets/content/seed-bundle.json";
import { fetchContent } from "../api/client";
import type { LetterLesson } from "../domain/types";
import { getContentBundle, saveContentBundle } from "../storage/database";
import { toLessons, validateBundle, type ContentBundle } from "./schema";

export type ContentSource = "seed" | "cache" | "server";
type ContentState = { version: string; source: ContentSource; lessons: LetterLesson[]; setBundle: (bundle: ContentBundle, source: ContentSource) => void };

export const useContentStore = create<ContentState>((set) => ({
  version: "", source: "seed", lessons: [],
  setBundle: (bundle, source) => set({ version: bundle.version, source, lessons: toLessons(bundle) }),
}));

/** Bundle embarcado no app; um erro aqui é erro de build, não de runtime. */
export function seedBundle(): ContentBundle {
  const errors = validateBundle(seed);
  if (errors.length) throw new Error(`Conteúdo embarcado inválido: ${errors.join(" ")}`);
  return seed as ContentBundle;
}

/** Primeiro boot funciona sem rede: usa o cache local se válido, senão o bundle embarcado. */
export async function loadContent(): Promise<ContentSource> {
  const cached = await getContentBundle();
  if (cached && validateBundle(cached.payload).length === 0) { useContentStore.getState().setBundle(cached.payload as ContentBundle, "cache"); return "cache"; }
  useContentStore.getState().setBundle(seedBundle(), "seed");
  return "seed";
}

/** Baixa /v1/content com ETag. Um bundle inválido é descartado e o conteúdo em uso permanece. */
export async function refreshContent(): Promise<"updated" | "unchanged" | "rejected"> {
  const cached = await getContentBundle();
  const etag = useContentStore.getState().source === "seed" ? null : cached?.etag ?? null;
  const result = await fetchContent(etag);
  if (result.notModified) return "unchanged";
  const errors = validateBundle(result.bundle);
  if (errors.length) { console.warn("Bundle de conteúdo rejeitado:", errors.join(" ")); return "rejected"; }
  const bundle = result.bundle as ContentBundle;
  await saveContentBundle(bundle, result.etag);
  useContentStore.getState().setBundle(bundle, "server");
  return "updated";
}

export const requiredTypesOf = (lessonId: string) => useContentStore.getState().lessons.find((lesson) => lesson.id === lessonId)?.exercises.map((exercise) => exercise.type);
