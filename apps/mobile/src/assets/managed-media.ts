/** Identificadores gerenciados nunca carregam uma URL escolhida pelo bundle. */
export const isManagedMediaId = (value: unknown): value is string =>
  typeof value === "string" && /^media\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);

/** A URL só vem do catálogo publicado; URLs de importação jamais chegam ao app. */
export const isSafeRemoteImageUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; }
  catch { return false; }
};

/** Caminho relativo aceito somente para o endpoint de mídia da própria API. */
export const isSafeApiMediaPath = (value: unknown): value is string =>
  typeof value === "string" && /^\/v1\/media\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);

/** Mesmo quando absoluto, o arquivo deve vir do endpoint de mídia controlado pela API. */
export const isSafeApiMediaUrl = (value: unknown): value is string => {
  if (!isSafeRemoteImageUrl(value)) return false;
  try { return /^\/v1\/media\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(new URL(value).pathname); }
  catch { return false; }
};
