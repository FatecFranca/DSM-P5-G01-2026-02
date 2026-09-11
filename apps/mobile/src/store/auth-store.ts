import { create } from "zustand";
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh, register as apiRegister, isUnauthorized } from "../api/client";
import { normalizeEmail } from "../domain/auth";
import { sessionStorage } from "../storage/session";

type AuthState = { status: "loading" | "authenticated" | "anonymous"; accessToken: string | null; restore: () => Promise<void>; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; refresh: () => Promise<void>; logout: () => Promise<void> };
export const useAuthStore = create<AuthState>((set) => ({
  status: "loading", accessToken: null,
  restore: async () => { const saved = await sessionStorage.load(); set({ status: saved.accessToken && saved.refreshToken ? "authenticated" : "anonymous", accessToken: saved.accessToken }); },
  login: async (email, password) => { const value = await apiLogin(normalizeEmail(email), password); await sessionStorage.save(value.accessToken, value.refreshToken); set({ status: "authenticated", accessToken: value.accessToken }); },
  register: async (name, email, password) => { const value = await apiRegister(name.trim(), normalizeEmail(email), password); await sessionStorage.save(value.accessToken, value.refreshToken); set({ status: "authenticated", accessToken: value.accessToken }); },
  refresh: async () => {
    const saved = await sessionStorage.load();
    if (!saved.refreshToken) throw new Error("Sessão indisponível");
    try {
      const value = await apiRefresh(saved.refreshToken);
      await sessionStorage.save(value.accessToken, value.refreshToken);
      set({ status: "authenticated", accessToken: value.accessToken });
    } catch (error) {
      // Refresh recusado: a sessão acabou. Encerrar leva o app de volta ao login em vez de fingir que está offline.
      if (isUnauthorized(error)) { await sessionStorage.clear(); set({ status: "anonymous", accessToken: null }); }
      throw error;
    }
  },
  logout: async () => { const saved = await sessionStorage.load(); try { if (saved.refreshToken) await apiLogout(saved.refreshToken); } finally { await sessionStorage.clear(); set({ status: "anonymous", accessToken: null }); } },
}));
