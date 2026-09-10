import type { ExerciseType, LetterLesson, WordChoice } from "./types";

export const LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY".split("");
const ALPHABET = LEARNING_ORDER;
const PHASES = {
  1: { title: "Vogais", letters: "AEIOU" },
  2: { title: "Consoantes de alta utilidade", letters: "MLPSTRNDCG" },
  3: { title: "Ampliação do vocabulário", letters: "BFVHQJKZXWY" },
} as const;
const phaseFor = (letter: string): 1 | 2 | 3 => PHASES[1].letters.includes(letter) ? 1 : PHASES[2].letters.includes(letter) ? 2 : 3;
const syllables: Record<string, string[]> = {
  A: ["A"], B: ["BA", "BE"], C: ["CA", "CE"], D: ["DA", "DE"], E: ["E"], F: ["FA", "FE"],
  G: ["GA", "GE"], H: ["HA"], I: ["I"], J: ["JA", "JE"], K: ["KA"], L: ["LA", "LE"], M: ["MA", "ME"],
  N: ["NA", "NE"], O: ["O"], P: ["PA", "PE"], Q: ["QUA", "QUE"], R: ["RA", "RE"], S: ["SA", "SE"],
  T: ["TA", "TE"], U: ["U"], V: ["VA", "VE"], W: ["WA"], X: ["XA", "XE"], Y: ["YA"], Z: ["ZA", "ZE"],
};

const alternatives = (index: number) => [ALPHABET[index], ALPHABET[(index + 1) % 26], ALPHABET[(index + 2) % 26]];

const choice = (word: string): WordChoice => ({ id: word.toLowerCase(), image: "🔤", imageLabel: word, audioText: word, before: "", after: word.slice(1), word });
const contextWords: Record<string, string> = { A: "MALA", E: "MESA", I: "PIPA", O: "NOME", U: "RUA", M: "MALA", L: "MALA", P: "PATO", S: "SALA", T: "PATO", R: "RUA", N: "NOME", D: "DADO", C: "CASA", G: "GATO", B: "BOLA", F: "FACA", V: "VACA", H: "HORA", Q: "QUILO", J: "JOGO", K: "KARATE", Z: "ZERO", X: "XALE", W: "WIFI", Y: "YOGA" };

const wordChoices: Record<string, WordChoice[]> = {
  M: [choice("MALA"), choice("MAMA")], L: [choice("LATA"), choice("MALA")], P: [choice("PATO"), choice("PIPA")], S: [choice("SALA"), choice("SAPO")], T: [choice("TATU"), choice("TALA")], R: [choice("RUA"), choice("RATO")], N: [choice("NOME"), choice("NANA")], D: [choice("DADO"), choice("DAMA")], C: [choice("CAMA"), choice("CASA")], G: [choice("GATO"), choice("GOLA")], B: [choice("BOLA"), choice("BALA")], F: [choice("FACA"), choice("FADA")], V: [choice("VACA"), choice("VILA")], H: [choice("HORA"), choice("HINO")], Q: [choice("QUILO"), choice("QUASE")], J: [choice("JOGO"), choice("JANTA")], K: [choice("KARATE"), choice("KILO")], Z: [choice("ZERO"), choice("ZONA")], X: [choice("XALE"), choice("XEROX")], W: [choice("WIFI"), choice("WEB")], Y: [choice("YOGA")],
};

export const LETTERS: LetterLesson[] = ALPHABET.map((letter, index) => {
  const allowed = new Set([...ALPHABET.slice(0, index), letter]);
  const availableWords = (wordChoices[letter] ?? []).filter((word) => [...word.word].every((value) => allowed.has(value)));
  const contextWord = contextWords[letter];
  const firstPosition = contextWord.indexOf(letter) + 1;
  const positionOptions = Array.from({ length: contextWord.length }, (_, position) => `${position + 1}ª posição`);
  return {
  id: `letter-${letter.toLowerCase()}`,
  order: index + 1,
  phase: phaseFor(letter),
  phaseTitle: PHASES[phaseFor(letter)].title,
  letter,
  prerequisiteLetters: ALPHABET.slice(0, index),
  syllables: syllables[letter],
  exercises: [
    { id: `${letter}-listen`, type: "listen_choose", instruction: `Ouça e escolha a letra ${letter}.`, answer: letter, options: alternatives(index) },
    { id: `${letter}-recognize`, type: "recognize", instruction: `Encontre a letra ${letter}.`, answer: letter, options: alternatives(index).reverse() },
    { id: `${letter}-find`, type: "find_in_word", instruction: `Onde aparece primeiro a letra ${letter} na palavra ${contextWord}?`, answer: `${firstPosition}ª posição`, options: positionOptions, contextWord },
    ...(availableWords.length ? [{ id: `${letter}-complete-word`, type: "complete_word" as const, instruction: `Em qual palavra entra a letra ${letter}?`, answer: availableWords[0].id, wordChoices: availableWords }] : []),
  ],
};
});

export const WORDS = [
  { word: "CASA", syllables: ["CA", "SA"], difficulty: "facil" },
  { word: "MAMA", syllables: ["MA", "MA"], difficulty: "facil" },
  { word: "MESA", syllables: ["ME", "SA"], difficulty: "facil" },
  { word: "SALA", syllables: ["SA", "LA"], difficulty: "facil" },
  { word: "PATO", syllables: ["PA", "TO"], difficulty: "facil" },
  { word: "RUA", syllables: ["RU", "A"], difficulty: "facil" },
  { word: "MALA", syllables: ["MA", "LA"], difficulty: "facil" },
  { word: "NOME", syllables: ["NO", "ME"], difficulty: "facil" },
  { word: "GATO", syllables: ["GA", "TO"], difficulty: "facil" },
];

export function validateCatalog(lessons: LetterLesson[]): string[] {
  const errors: string[] = [];
  if (lessons.map((item) => item.letter).join("") !== ALPHABET.join("")) errors.push("O alfabeto deve conter as 26 letras em ordem.");
  const required: ExerciseType[] = ["listen_choose", "recognize", "find_in_word"];
  for (const lesson of lessons) {
    if (required.some((type) => !lesson.exercises.some((item) => item.type === type))) errors.push(`Exercícios incompletos em ${lesson.letter}.`);
  }
  const expectedOrder = "AEIOUMLPSTRNDCGBFVHQJKZXWY";
  if (lessons.map((item) => item.letter).join("") !== expectedOrder) errors.push("A trilha deve seguir a ordem progressiva definida.");
  if (lessons.find((item) => item.letter === "G")?.phase !== 2) errors.push("A letra G deve pertencer à segunda fase.");
  for (const lesson of lessons) {
    if (lesson.prerequisiteLetters.length !== lesson.order - 1) errors.push(`Pré-requisitos incompletos em ${lesson.letter}.`);
    const allowed = new Set([...lesson.prerequisiteLetters, lesson.letter]);
    for (const word of lesson.exercises.flatMap((item) => item.wordChoices ?? [])) {
      if (![...word.word].every((letter) => allowed.has(letter))) errors.push(`Palavra ${word.word} usa letra futura em ${lesson.letter}.`);
    }
  }
  return errors;
}
