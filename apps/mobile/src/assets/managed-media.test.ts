import { describe, expect, it } from "vitest";
import { isManagedMediaId, isSafeApiMediaPath, isSafeApiMediaUrl, isSafeRemoteImageUrl } from "./managed-media";

describe("mídia administrada", () => {
  it("aceita apenas IDs de mídia controlados pelo servidor", () => {
    expect(isManagedMediaId("media/9fc4d0aa-0ab0-4e22-a045-89ca3b675671" as unknown)).toBe(true);
    expect(isManagedMediaId("images/words/casa.svg")).toBe(false);
    expect(isManagedMediaId("media/../../segredo")).toBe(false);
    expect(isManagedMediaId("https://origem.example/imagem.png")).toBe(false);
  });

  it("só deixa o catálogo usar HTTP(S) como fonte remota", () => {
    expect(isSafeRemoteImageUrl("https://127.0.0.1:8000/v1/media/media%2Fabc.png")).toBe(true);
    expect(isSafeRemoteImageUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeRemoteImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeApiMediaPath("/v1/media/4e90e53a.png")).toBe(true);
    expect(isSafeApiMediaPath("/v1/content")).toBe(false);
    expect(isSafeApiMediaUrl("https://api.example/v1/media/4e90e53a.png")).toBe(true);
    expect(isSafeApiMediaUrl("https://origin.example/imagem.png")).toBe(false);
  });
});
