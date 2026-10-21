/** Dia local (AAAA-MM-DD) de um instante; os dias seguidos seguem o calendário do aparelho, não UTC. */
export const localDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Dias seguidos com prática ("Dias seguidos" do perfil no Figma). Hoje ainda sem prática não zera a sequência:
 * ela conta até ontem, para não punir quem ainda vai estudar no dia.
 */
export function streakDays(practiceTimes: readonly string[], now: Date): number {
  const days = new Set(practiceTimes.map((time) => localDay(new Date(time))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDay(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
