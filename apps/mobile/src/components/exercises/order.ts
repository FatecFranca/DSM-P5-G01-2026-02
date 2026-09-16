/** Sílabas usam hífen; palavras de uma frase usam espaço. */
export const joinTokens = (type: string, picked: string[]) => picked.join(type === "word_from_syllables" ? "-" : " ");
