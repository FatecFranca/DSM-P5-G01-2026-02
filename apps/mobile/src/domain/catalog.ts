import type { ExerciseType, LetterLesson, WordChoice } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const syllables: Record<string, string[]> = {
  A: ["A"], B: ["BA", "BE"], C: ["CA", "CE"], D: ["DA", "DE"], E: ["E"], F: ["FA", "FE"],
  G: ["GA", "GE"], H: ["HA"], I: ["I"], J: ["JA", "JE"], K: ["KA"], L: ["LA", "LE"], M: ["MA", "ME"],
  N: ["NA", "NE"], O: ["O"], P: ["PA", "PE"], Q: ["QUA", "QUE"], R: ["RA", "RE"], S: ["SA", "SE"],
  T: ["TA", "TE"], U: ["U"], V: ["VA", "VE"], W: ["WA"], X: ["XA", "XE"], Y: ["YA"], Z: ["ZA", "ZE"],
};

const alternatives = (index: number) => [ALPHABET[index], ALPHABET[(index + 1) % 26], ALPHABET[(index + 2) % 26]];

const choice = (id: string, image: string, imageLabel: string, audioText: string, before: string, after: string, word: string): WordChoice => ({ id, image, imageLabel, audioText, before, after, word });

const wordChoices: Record<string, WordChoice[]> = {
  A: [choice("cachorro", "🐶", "cachorro", "Cachorro", "C", "CHORRO", "CACHORRO"), choice("coelho", "🐰", "coelho", "Coelho", "C", "ELHO", "COELHO")],
  B: [choice("bola", "⚽", "bola", "Bola", "", "OLA", "BOLA"), choice("casa", "🏠", "casa", "Casa", "", "ASA", "CASA")],
  C: [choice("cachorro", "🐶", "cachorro", "Cachorro", "", "ACHORRO", "CACHORRO"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  D: [choice("dente", "🦷", "dente", "Dente", "", "ENTE", "DENTE"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  E: [choice("elefante", "🐘", "elefante", "Elefante", "", "LEFANTE", "ELEFANTE"), choice("cachorro", "🐶", "cachorro", "Cachorro", "", "ACHORRO", "CACHORRO")],
  F: [choice("foca", "🦭", "foca", "Foca", "", "OCA", "FOCA"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  G: [choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO"), choice("sapo", "🐸", "sapo", "Sapo", "", "APO", "SAPO")],
  H: [choice("hora", "⏰", "hora", "Hora", "", "ORA", "HORA"), choice("bola", "⚽", "bola", "Bola", "", "OLA", "BOLA")],
  I: [choice("ilha", "🏝️", "ilha", "Ilha", "", "LHA", "ILHA"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  J: [choice("jacare", "🐊", "jacaré", "Jacaré", "", "ACARÉ", "JACARÉ"), choice("cachorro", "🐶", "cachorro", "Cachorro", "", "ACHORRO", "CACHORRO")],
  K: [choice("quilo", "⚖️", "quilo", "Quilo", "", "ILO", "KILO"), choice("fila", "🚶", "fila", "Fila", "", "ILA", "FILA")],
  L: [choice("leao", "🦁", "leão", "Leão", "", "EÃO", "LEÃO"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  M: [choice("macaco", "🐒", "macaco", "Macaco", "", "ACACO", "MACACO"), choice("casa", "🏠", "casa", "Casa", "", "ASA", "CASA")],
  N: [choice("nariz", "👃", "nariz", "Nariz", "", "ARIZ", "NARIZ"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  O: [choice("osso", "🦴", "osso", "Osso", "", "SSO", "OSSO"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  P: [choice("pato", "🦆", "pato", "Pato", "", "ATO", "PATO"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  Q: [choice("queijo", "🧀", "queijo", "Queijo", "", "UEIJO", "QUEIJO"), choice("casa", "🏠", "casa", "Casa", "", "ASA", "CASA")],
  R: [choice("ra", "🐸", "rã", "Rã", "", "Ã", "RÃ"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  S: [choice("sapo", "🐸", "sapo", "Sapo", "", "APO", "SAPO"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  T: [choice("tartaruga", "🐢", "tartaruga", "Tartaruga", "", "ARTARUGA", "TARTARUGA"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  U: [choice("uva", "🍇", "uva", "Uva", "", "VA", "UVA"), choice("ovo", "🥚", "ovo", "Ovo", "", "VO", "OVO")],
  V: [choice("vaca", "🐄", "vaca", "Vaca", "", "ACA", "VACA"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  W: [choice("wifi", "📶", "wi-fi", "Wi-fi", "", "IFI", "WIFI"), choice("bola", "⚽", "bola", "Bola", "", "OLA", "BOLA")],
  X: [choice("xadrez", "♟️", "xadrez", "Xadrez", "", "ADREZ", "XADREZ"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
  Y: [choice("yoga", "🧘", "ioga", "Ioga", "", "OGA", "YOGA"), choice("bola", "⚽", "bola", "Bola", "", "OLA", "BOLA")],
  Z: [choice("zebra", "🦓", "zebra", "Zebra", "", "EBRA", "ZEBRA"), choice("gato", "🐱", "gato", "Gato", "", "ATO", "GATO")],
};

export const LETTERS: LetterLesson[] = ALPHABET.map((letter, index) => ({
  id: `letter-${letter.toLowerCase()}`,
  order: index + 1,
  letter,
  syllables: syllables[letter],
  exercises: [
    { id: `${letter}-listen`, type: "listen_choose", instruction: `Ouça e escolha a letra ${letter}.`, answer: letter, options: alternatives(index) },
    { id: `${letter}-recognize`, type: "recognize", instruction: `Encontre a letra ${letter}.`, answer: letter, options: alternatives(index).reverse() },
    { id: `${letter}-complete-word`, type: "complete_word", instruction: `Em qual palavra entra a letra ${letter}?`, answer: wordChoices[letter][0].id, wordChoices: wordChoices[letter] },
  ],
}));

export const WORDS = [
  { word: "CASA", syllables: ["CA", "SA"], difficulty: "facil" },
  { word: "MESA", syllables: ["ME", "SA"], difficulty: "facil" },
  { word: "RUA", syllables: ["RU", "A"], difficulty: "facil" },
  { word: "MALA", syllables: ["MA", "LA"], difficulty: "facil" },
  { word: "NOME", syllables: ["NO", "ME"], difficulty: "facil" },
  { word: "SAUDE", syllables: ["SAU", "DE"], difficulty: "medio" },
];

export function validateCatalog(lessons: LetterLesson[]): string[] {
  const errors: string[] = [];
  if (lessons.map((item) => item.letter).join("") !== ALPHABET.join("")) errors.push("O alfabeto deve conter as 26 letras em ordem.");
  const required: ExerciseType[] = ["listen_choose", "recognize", "complete_word"];
  for (const lesson of lessons) {
    if (new Set(lesson.exercises.map((item) => item.type)).size !== required.length || required.some((type) => !lesson.exercises.some((item) => item.type === type))) errors.push(`Exercícios incompletos em ${lesson.letter}.`);
  }
  return errors;
}
