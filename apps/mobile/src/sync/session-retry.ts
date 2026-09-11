import { isUnauthorized } from "../api/errors";
import { sessionStorage } from "../storage/session";
import { useAuthStore } from "../store/auth-store";

/**
 * O access token dura minutos; o refresh, semanas. Sem esta renovação, o app para de sincronizar
 * silenciosamente depois do primeiro vencimento e parece estar offline.
 * Executa com o token atual e, em 401, renova a sessão uma única vez antes de repetir.
 */
export async function withSession<T>(run: (accessToken: string) => Promise<T>): Promise<T> {
  const session = await sessionStorage.load();
  if (!session.accessToken) throw new Error("Faça login para sincronizar");
  try {
    return await run(session.accessToken);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    await useAuthStore.getState().refresh();
    const renewed = await sessionStorage.load();
    if (!renewed.accessToken) throw error;
    return run(renewed.accessToken);
  }
}
