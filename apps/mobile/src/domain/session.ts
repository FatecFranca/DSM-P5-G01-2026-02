import { isDue, isWeak, type ItemState } from "./scheduler";

// Fila de sessão determinística (docs/adr/0003): vencidos e fracos primeiro, novos na ordem do currículo,
// o resto como reserva. O embaralhamento usa um gerador semeado, então a mesma semente produz a mesma fila.
export type SessionMix = { due: number; weak: number; new: number };
export const DEFAULT_MIX: SessionMix = { due: 0.4, weak: 0.3, new: 0.3 };
export const SESSION_POLICY_VERSION = "session-v1";
/** Um item errado volta no máximo esta distância adiante na mesma sessão. */
export const RETRY_DISTANCE = 3;

/** FNV-1a de 32 bits: semente estável a partir de texto. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (const character of text) { hash ^= character.codePointAt(0) ?? 0; hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash >>> 0;
}

/** mulberry32: rápido, determinístico e suficiente para embaralhar uma fila. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) { const other = Math.floor(random() * (index + 1)); [copy[index], copy[other]] = [copy[other], copy[index]]; }
  return copy;
}

export type SessionInput<T extends { id: string }> = { exercises: readonly T[]; states: Record<string, ItemState | undefined>; now: Date; size?: number; mix?: SessionMix; seed: string };

export function buildSession<T extends { id: string }>({ exercises, states, now, size = exercises.length, mix = DEFAULT_MIX, seed }: SessionInput<T>): T[] {
  const random = mulberry32(hashSeed(seed));
  const stateOf = (exercise: T) => states[exercise.id];
  const due = exercises.filter((exercise) => { const state = stateOf(exercise); return state !== undefined && isDue(state, now); })
    .sort((a, b) => Date.parse(stateOf(a)!.dueAt) - Date.parse(stateOf(b)!.dueAt) || stateOf(b)!.lapses - stateOf(a)!.lapses || a.id.localeCompare(b.id));
  const weak = exercises.filter((exercise) => { const state = stateOf(exercise); return state !== undefined && !isDue(state, now) && isWeak(state); })
    .sort((a, b) => stateOf(b)!.lapses - stateOf(a)!.lapses || a.id.localeCompare(b.id));
  const fresh = exercises.filter((exercise) => stateOf(exercise) === undefined);
  const chosen = new Set([...due, ...weak, ...fresh]);
  const rest = exercises.filter((exercise) => !chosen.has(exercise));
  const quota = (share: number) => Math.round(size * share);
  const picked = [...due.slice(0, quota(mix.due)), ...weak.slice(0, quota(mix.weak)), ...fresh.slice(0, quota(mix.new))];
  const taken = new Set(picked);
  // Cota que sobra é redistribuída em ordem fixa: vencidos → fracos → novos → reserva.
  for (const bucket of [due, weak, fresh, rest]) for (const exercise of bucket) { if (picked.length >= size) break; if (!taken.has(exercise)) { picked.push(exercise); taken.add(exercise); } }
  const inBucket = (bucket: T[]) => picked.filter((exercise) => bucket.includes(exercise));
  // Vencidos, depois fracos, cada grupo embaralhado; novos mantêm a ordem do currículo, porque ela é pedagógica.
  return [...shuffle(inBucket(due), random), ...shuffle(inBucket(weak), random), ...inBucket(fresh), ...shuffle(inBucket(rest), random)];
}

/** Reinsere o item errado `distance` posições adiante (ou no fim, se a fila for menor). */
export function reinsert<T>(queue: readonly T[], item: T, distance = RETRY_DISTANCE): T[] {
  const position = Math.min(distance, queue.length);
  return [...queue.slice(0, position), item, ...queue.slice(position)];
}

export type SessionOutcome = { correct: number; errors: number; recoveredItemIds: readonly string[]; audioPlays: number };
export function sessionSummary(outcome: SessionOutcome) {
  const attempts = outcome.correct + outcome.errors;
  return { ...outcome, attempts, accuracy: attempts ? outcome.correct / attempts : 0, recovered: new Set(outcome.recoveredItemIds).size };
}

export const selectedPositionsAnswer = (positions: readonly number[]) => [...positions].sort((a, b) => a - b).map((value) => value + 1).join(",");
