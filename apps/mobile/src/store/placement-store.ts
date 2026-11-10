import { create } from "zustand";
import { trailPlacementOf, type PlacementRecord } from "../domain/placement-record";
import type { TrailPlacement } from "../domain/trail";

type PlacementState = {
  record?: PlacementRecord;
  /** Derivado do registro: nível de partida e letras creditadas que a trilha e as lições usam. */
  trail?: TrailPlacement;
  setPlacement: (record: PlacementRecord | undefined) => void;
};

export const usePlacementStore = create<PlacementState>((set) => ({
  setPlacement: (record) => set({ record, trail: trailPlacementOf(record) }),
}));

/** Letras creditadas pelo nivelamento; vazio sem nivelamento ou com resultado provisório. */
export const useCreditedLetters = (): string => usePlacementStore((state) => state.trail?.creditedLetters ?? "");
