import { isUnauthorized } from "../api/errors";
import { sessionStorage } from "../storage/session";
import { useAuthStore } from "../store/auth-store";

/**
 * O access token dura minutos; o refresh, semanas. Sem esta renovação, o app para de sincronizar
 * silenciosamente depois do primeiro vencimento e parece estar offline.
 * Executa com o token atual e, em 401, renova a sessão uma única vez antes de repetir.
 */
export class SessionMissingError extends Error {
  constructor() { super("Faça login para sincronizar"); this.name = "SessionMissingError"; }
}

export async function withSession<T>(run: (accessToken: string) => Promise<T>): Promise<T> {
  const session = await sessionStorage.load();
  if (!session.accessToken) {
    // Token sumiu do aparelho: encerra a sessão para o app voltar ao login na hora, em vez de seguir "offline".
    await useAuthStore.getState().logout().catch(() => undefined);
    throw new SessionMissingError();
  }
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
