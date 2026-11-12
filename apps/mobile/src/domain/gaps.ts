/** Trecho de texto ou lacuna de uma palavra/frase lacunada. */
export type GapPart = { kind: "text"; text: string } | { kind: "gap"; slots: number };

/**
 * Quebra um texto lacunado em trechos e lacunas, com uma casa por letra que falta. Um `_` é uma letra
 * ("_BELHA", "_ E _"); `___` marca uma sílaba ou palavra e ganha tantas casas quanto a maior opção, para a contagem
 * não entregar o gabarito ("___ VE TE" com SOR/CA/NA vira três casas).
 */
export function gapParts(text: string, options: readonly string[] = []): GapPart[] {
  const longest = Math.max(1, ...options.map((option) => option.replace(/\s/g, "").length));
  return text.split(/(_+)/).flatMap((segment): GapPart[] => {
    if (/^_+$/.test(segment)) return [{ kind: "gap", slots: segment.length === 1 ? 1 : longest }];
    const trimmed = segment.trim();
    return trimmed ? [{ kind: "text", text: trimmed }] : [];
  });
}

/** Texto lido pelo leitor de tela: cada lacuna vira "espaço". */
export const gapAccessibilityLabel = (text: string) => text.replace(/_+/g, " espaço ").replace(/\s+/g, " ").trim();
