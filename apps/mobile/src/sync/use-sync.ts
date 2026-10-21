import { useMutation } from "@tanstack/react-query";
import { pullEvents, pushEvents } from "../api/client";
import { requiredTypesOf } from "../content/store";
import { acknowledgeEvents, applyPulled, deferEvents, getQueue, getSyncCursor } from "../storage/database";
import { SessionMissingError, withSession } from "./session-retry";
import { useStudyStore } from "../store/study-store";

let inFlight: Promise<number> | null = null;

async function runSync(): Promise<number> {
  const events = await getQueue();
  try {
    return await withSession(async (accessToken) => {
      const result = events.length ? await pushEvents(events, accessToken) : { acceptedIds: [], rejections: [] };
      // Rejeitados saem da fila junto com os aceitos: reenviá-los travaria a sincronização para sempre.
      if (result.rejections.length) console.warn("Eventos descartados pelo servidor:", result.rejections.map((item) => `${item.id}: ${item.reason}`).join("; "));
      await acknowledgeEvents([...result.acceptedIds, ...result.rejections.map((item) => item.id)]);
      const incoming = await pullEvents(await getSyncCursor(), accessToken);
      useStudyStore.getState().applyRemote(await applyPulled(incoming, requiredTypesOf));
      return result.acceptedIds.length;
    });
  } catch (error) {
    await deferEvents(events);
    // Sem sessão o app já está indo para o login; não é falha de sincronização para avisar.
    if (!(error instanceof SessionMissingError)) console.warn("Sincronização falhou:", error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Envia a fila local ao servidor e traz o que veio de outros aparelhos. O placar do servidor só conta tentativas
 * sincronizadas, então isto roda ao terminar uma lição e antes de abrir o ranking ou o perfil.
 * Chamadas simultâneas reaproveitam a mesma sincronização, para não mandar a mesma fila duas vezes.
 */
export function syncNow(): Promise<number> {
  inFlight ??= runSync().finally(() => { inFlight = null; });
  return inFlight;
}

export function useSync() {
  return useMutation({ mutationFn: syncNow });
}
