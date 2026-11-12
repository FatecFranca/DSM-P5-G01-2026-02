import { create } from "zustand";
import { login as apiLogin, loginWithFirebase as apiLoginWithFirebase, logout as apiLogout, refresh as apiRefresh, register as apiRegister, isUnauthorized } from "../api/client";
import { accountIdFromToken, normalizeEmail } from "../domain/auth";
import { claimLocalData, setSetting, USER_NAME_KEY } from "../storage/database";
import { sessionStorage } from "../storage/session";
import { usePlacementStore } from "./placement-store";
import { useStudyStore } from "./study-store";

/** Entrar com outra conta nunca herda o progresso, o nivelamento nem a fila de sincronização da anterior. */
async function adoptLocalData(accessToken: string, strict = true): Promise<void> {
  if (await claimLocalData(accountIdFromToken(accessToken), strict)) {
    useStudyStore.getState().hydrate([], []);
    usePlacementStore.getState().setPlacement(undefined);
  }
}

type AuthState = { status: "loading" | "authenticated" | "anonymous"; accessToken: string | null; restore: () => Promise<void>; login: (email: string, password: string) => Promise<void>; loginWithFirebase: (idToken: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; refresh: () => Promise<void>; logout: () => Promise<void> };
export const useAuthStore = create<AuthState>((set) => ({
  status: "loading", accessToken: null,
  restore: async () => { const saved = await sessionStorage.load(); if (saved.accessToken && saved.refreshToken) await adoptLocalData(saved.accessToken, false).catch(() => undefined); set({ status: saved.accessToken && saved.refreshToken ? "authenticated" : "anonymous", accessToken: saved.accessToken }); },
  login: async (email, password) => { const value = await apiLogin(normalizeEmail(email), password); await adoptLocalData(value.accessToken); await sessionStorage.save(value.accessToken, value.refreshToken); set({ status: "authenticated", accessToken: value.accessToken }); },
  loginWithFirebase: async (idToken) => { const value = await apiLoginWithFirebase(idToken); await adoptLocalData(value.accessToken); await sessionStorage.save(value.accessToken, value.refreshToken); set({ status: "authenticated", accessToken: value.accessToken }); },
  register: async (name, email, password) => { const value = await apiRegister(name.trim(), normalizeEmail(email), password); await adoptLocalData(value.accessToken); await sessionStorage.save(value.accessToken, value.refreshToken); await setSetting(USER_NAME_KEY, name.trim()).catch(() => undefined); set({ status: "authenticated", accessToken: value.accessToken }); },
  refresh: async () => {
    const saved = await sessionStorage.load();
    if (!saved.refreshToken) { await sessionStorage.clear(); set({ status: "anonymous", accessToken: null }); throw new Error("Sessão indisponível"); }
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
