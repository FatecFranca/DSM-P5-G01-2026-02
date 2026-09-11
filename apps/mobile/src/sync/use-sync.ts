import { useMutation } from "@tanstack/react-query";
import { pullEvents, pushEvents } from "../api/client";
import { requiredTypesOf } from "../content/store";
import { acknowledgeEvents, applyPulled, deferEvents, getQueue, getSyncCursor } from "../storage/database";
import { sessionStorage } from "../storage/session";
import { useStudyStore } from "../store/study-store";

export function useSync() {
  const applyRemote = useStudyStore((state) => state.applyRemote);
  return useMutation({ mutationFn: async () => {
    const events = await getQueue();
    try {
      const session = await sessionStorage.load();
      if (!session.accessToken) throw new Error("Faça login para sincronizar");
      const result = events.length ? await pushEvents(events, session.accessToken) : { acceptedIds: [] };
      await acknowledgeEvents(result.acceptedIds);
      const incoming = await pullEvents(await getSyncCursor(), session.accessToken);
      applyRemote(await applyPulled(incoming, requiredTypesOf));
      return result.acceptedIds.length;
    } catch (error) { await deferEvents(events); throw error; }
  } });
}
