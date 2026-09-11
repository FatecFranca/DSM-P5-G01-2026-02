import { beforeEach, describe, expect, it, vi } from "vitest";
import seed from "../../assets/content/seed-bundle.json";

const database = vi.hoisted(() => ({ getContentBundle: vi.fn(), saveContentBundle: vi.fn() }));
const client = vi.hoisted(() => ({ fetchContent: vi.fn() }));
vi.mock("../storage/database", () => database);
vi.mock("../api/client", () => client);

const { loadContent, refreshContent, requiredTypesOf, useContentStore } = await import("./store");

describe("carregamento de conteúdo", () => {
  beforeEach(() => { vi.clearAllMocks(); useContentStore.setState({ version: "", source: "seed", tracks: [], units: [] }); });

  it("usa o bundle embarcado quando não há cache válido", async () => {
    database.getContentBundle.mockResolvedValue({ version: "x", etag: "\"x\"", payload: { version: "x" } });
    expect(await loadContent()).toBe("seed");
    expect(useContentStore.getState().tracks).toHaveLength(2);
    expect(useContentStore.getState().units).toHaveLength(29);
    expect(useContentStore.getState().version).toBe(seed.version);
    expect(requiredTypesOf("lesson-A")).toEqual(["listen_choose", "recognize_letter"]);
    expect(requiredTypesOf("inexistente")).toBeUndefined();
  });

  it("prefere o cache local válido e envia seu ETag ao atualizar", async () => {
    database.getContentBundle.mockResolvedValue({ version: seed.version, etag: "\"abc\"", payload: seed });
    expect(await loadContent()).toBe("cache");
    client.fetchContent.mockResolvedValue({ notModified: true });
    expect(await refreshContent()).toBe("unchanged");
    expect(client.fetchContent).toHaveBeenCalledWith("\"abc\"");
  });

  it("nunca substitui o conteúdo em uso por um bundle inválido", async () => {
    database.getContentBundle.mockResolvedValue(undefined);
    await loadContent();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    client.fetchContent.mockResolvedValue({ notModified: false, bundle: { version: "v2", learning_order: "ABC", tracks: [] }, etag: "\"v2\"" });
    expect(await refreshContent()).toBe("rejected");
    expect(database.saveContentBundle).not.toHaveBeenCalled();
    expect(useContentStore.getState().source).toBe("seed");
    warn.mockRestore();
  });

  it("persiste e aplica um bundle válido vindo do servidor", async () => {
    database.getContentBundle.mockResolvedValue(undefined);
    await loadContent();
    const updated = { ...JSON.parse(JSON.stringify(seed)), version: "v2" };
    client.fetchContent.mockResolvedValue({ notModified: false, bundle: updated, etag: "\"v2\"" });
    expect(await refreshContent()).toBe("updated");
    expect(database.saveContentBundle).toHaveBeenCalledWith(updated, "\"v2\"");
    expect(useContentStore.getState()).toMatchObject({ version: "v2", source: "server" });
  });
});
