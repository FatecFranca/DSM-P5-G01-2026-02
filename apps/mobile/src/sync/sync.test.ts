import { describe, expect, it, vi } from "vitest";
import { flushQueue, retryDelayMs } from "./sync";
import type { SyncEvent } from "../domain/types";

describe("sincronização offline", () => {
  it("remove apenas eventos confirmados e envia IDs idempotentes uma vez por lote", async () => {
    const events: SyncEvent[] = [{ id: "a", type: "attempt", payload: {} }, { id: "b", type: "progress", payload: {} }];
    const push = vi.fn().mockResolvedValue({ acceptedIds: ["a"] });
    expect(await flushQueue(events, push)).toEqual([events[1]]);
    expect(push).toHaveBeenCalledWith(events);
  });

  it("aplica backoff exponencial limitado", () => {
    expect(retryDelayMs(0)).toBe(1_000);
    expect(retryDelayMs(20)).toBe(60_000);
  });
});
