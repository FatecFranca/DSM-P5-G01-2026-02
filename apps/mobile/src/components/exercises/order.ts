/** Sílabas usam hífen; letras de uma palavra ficam juntas; palavras de uma frase usam espaço. */
export const joinTokens = (type: string, picked: string[]) => picked.join(type === "word_from_syllables" ? "-" : type === "letters_to_word" ? "" : " ");
