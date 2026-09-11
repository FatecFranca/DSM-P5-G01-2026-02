import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors";

const storage = vi.hoisted(() => ({ sessionStorage: { load: vi.fn(), save: vi.fn(), clear: vi.fn() } }));
const auth = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../storage/session", () => storage);
vi.mock("../store/auth-store", () => ({ useAuthStore: { getState: () => auth } }));

const { withSession } = await import("./session-retry");

describe("renovação de sessão na sincronização", () => {
  beforeEach(() => { vi.clearAllMocks(); storage.sessionStorage.load.mockResolvedValue({ accessToken: "velho", refreshToken: "r" }); });

  it("usa o token atual quando ele ainda vale", async () => {
    const run = vi.fn().mockResolvedValue("ok");
    expect(await withSession(run)).toBe("ok");
    expect(run).toHaveBeenCalledExactlyOnceWith("velho");
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it("renova e repete uma única vez quando o token expirou", async () => {
    storage.sessionStorage.load.mockResolvedValueOnce({ accessToken: "velho", refreshToken: "r" }).mockResolvedValueOnce({ accessToken: "novo", refreshToken: "r2" });
    const run = vi.fn().mockRejectedValueOnce(new ApiError("Falha de sincronização (401)", 401)).mockResolvedValueOnce("ok");
    expect(await withSession(run)).toBe("ok");
    expect(auth.refresh).toHaveBeenCalledOnce();
    expect(run.mock.calls.map(([token]) => token)).toEqual(["velho", "novo"]);
  });

  it("não repete indefinidamente: um segundo 401 propaga", async () => {
    storage.sessionStorage.load.mockResolvedValue({ accessToken: "velho", refreshToken: "r" });
    const run = vi.fn().mockRejectedValue(new ApiError("Falha de sincronização (401)", 401));
    await expect(withSession(run)).rejects.toThrow("401");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("não tenta renovar quando o erro não é de sessão", async () => {
    const run = vi.fn().mockRejectedValue(new ApiError("Falha de sincronização (503)", 503));
    await expect(withSession(run)).rejects.toThrow("503");
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledOnce();
  });

  it("propaga o erro original quando a renovação não devolve token", async () => {
    const run = vi.fn().mockRejectedValue(new ApiError("expirado", 401));
    storage.sessionStorage.load.mockResolvedValueOnce({ accessToken: "velho", refreshToken: "r" }).mockResolvedValueOnce({ accessToken: null, refreshToken: null });
    await expect(withSession(run)).rejects.toThrow("expirado");
    expect(run).toHaveBeenCalledOnce();
  });

  it("exige login quando não há sessão salva", async () => {
    storage.sessionStorage.load.mockResolvedValue({ accessToken: null, refreshToken: null });
    const run = vi.fn();
    await expect(withSession(run)).rejects.toThrow("Faça login");
    expect(run).not.toHaveBeenCalled();
  });
});
