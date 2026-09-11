// Repetição espaçada por ITEM (docs/adr/0003). Funções puras com `now` injetado.
// A variável central é a meia-vida: é exatamente o que o ranking no servidor vai prever depois, então o
// armazenamento não muda quando o modelo entrar — só a fórmula de `halfLifeHours` é substituída.
export type ItemState = {
  itemId: string;
  unitId: string;
  /** Cresce 1 por acerto, cai 2 por erro, nunca negativo. */
  strength: number;
  halfLifeHours: number;
  dueAt: string;
  reps: number;
  lapses: number;
  consecutiveCorrect: number;
  lastResult: boolean;
  lastSeenAt: string;
  updatedAt: string;
};

export const BASE_HOURS = 4;
export const MIN_HALF_LIFE_HOURS = 4;
export const MAX_HALF_LIFE_HOURS = 90 * 24;

export const halfLifeHours = (strength: number): number => Math.min(MAX_HALF_LIFE_HOURS, Math.max(MIN_HALF_LIFE_HOURS, BASE_HOURS * 2 ** strength));

export function applyResult(current: ItemState | undefined, input: { itemId: string; unitId: string; correct: boolean; now: Date }): ItemState {
  const strength = input.correct ? (current?.strength ?? 0) + 1 : Math.max(0, (current?.strength ?? 0) - 2);
  const halfLife = halfLifeHours(strength);
  const seenAt = input.now.toISOString();
  return {
    itemId: input.itemId, unitId: input.unitId, strength, halfLifeHours: halfLife,
    dueAt: new Date(input.now.getTime() + halfLife * 60 * 60 * 1000).toISOString(),
    reps: (current?.reps ?? 0) + 1, lapses: (current?.lapses ?? 0) + (input.correct ? 0 : 1),
    consecutiveCorrect: input.correct ? (current?.consecutiveCorrect ?? 0) + 1 : 0,
    lastResult: input.correct, lastSeenAt: seenAt, updatedAt: seenAt,
  };
}

export const isDue = (state: ItemState, now: Date): boolean => Date.parse(state.dueAt) <= now.getTime();
/** Já errou e ainda não recuperou três acertos seguidos. */
export const isWeak = (state: ItemState): boolean => state.lapses > 0 && state.consecutiveCorrect < 3;
/** Conta para a conclusão da unidade: o último encontro foi um acerto. */
export const isMastered = (state: ItemState): boolean => state.consecutiveCorrect >= 1;
