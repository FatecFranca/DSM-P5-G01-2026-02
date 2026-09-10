import type { SyncEvent } from "../domain/types";

type Push = (events: SyncEvent[]) => Promise<{ acceptedIds: string[] }>;

export const retryDelayMs = (retries: number) => Math.min(60_000, 1_000 * 2 ** retries);

export async function flushQueue(events: SyncEvent[], push: Push): Promise<SyncEvent[]> {
  if (events.length === 0) return [];
  const unique = [...new Map(events.map((event) => [event.id, event])).values()];
  const { acceptedIds } = await push(unique);
  const accepted = new Set(acceptedIds);
  return unique.filter((event) => !accepted.has(event.id));
}
