import { useMutation } from "@tanstack/react-query";
import { pullEvents, pushEvents } from "../api/client";
import { requiredTypesOf } from "../content/store";
import { acknowledgeEvents, applyPulled, deferEvents, getQueue, getSyncCursor } from "../storage/database";
import { withSession } from "./session-retry";
import { useStudyStore } from "../store/study-store";

export function useSync() {
  const applyRemote = useStudyStore((state) => state.applyRemote);
  return useMutation({ mutationFn: async () => {
    const events = await getQueue();
    try {
      return await withSession(async (accessToken) => {
        const result = events.length ? await pushEvents(events, accessToken) : { acceptedIds: [], rejections: [] };
        // Rejeitados saem da fila junto com os aceitos: reenviá-los travaria a sincronização para sempre.
        if (result.rejections.length) console.warn("Eventos descartados pelo servidor:", result.rejections.map((item) => `${item.id}: ${item.reason}`).join("; "));
        await acknowledgeEvents([...result.acceptedIds, ...result.rejections.map((item) => item.id)]);
        const incoming = await pullEvents(await getSyncCursor(), accessToken);
        applyRemote(await applyPulled(incoming, requiredTypesOf));
        return result.acceptedIds.length;
      });
    } catch (error) { await deferEvents(events); console.warn("Sincronização falhou:", error instanceof Error ? error.message : error); throw error; }
  } });
}
