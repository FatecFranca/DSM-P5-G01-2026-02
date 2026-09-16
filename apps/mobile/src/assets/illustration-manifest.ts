export const ILLUSTRATION_LICENSE = "Projeto Alfabetiza";
export const ILLUSTRATION_ATTRIBUTION = "Equipe Projeto Alfabetiza";

const WORD_IDS = ["casa", "mesa", "cama", "sala", "copo", "prato", "porta", "panela", "tapete"] as const;
const SENTENCE_IDS = ["casa-frase-1", "casa-frase-2", "casa-frase-3", "casa-frase-4", "casa-frase-5"] as const;

export const ILLUSTRATION_MANIFEST = Object.freeze({
  ...Object.fromEntries(WORD_IDS.map((id) => [`images/words/${id}.svg`, { path: `assets/images/words/${id}.svg`, license: ILLUSTRATION_LICENSE, attribution: ILLUSTRATION_ATTRIBUTION }])),
  ...Object.fromEntries(SENTENCE_IDS.map((id) => [`images/sentences/${id}.svg`, { path: `assets/images/sentences/${id}.svg`, license: ILLUSTRATION_LICENSE, attribution: ILLUSTRATION_ATTRIBUTION }])),
}) as Readonly<Record<string, { path: string; license: string; attribution: string }>>;

export const isKnownIllustration = (id: unknown): id is string => typeof id === "string" && Object.hasOwn(ILLUSTRATION_MANIFEST, id);
