import { LEARNING_ORDER, PHASES, normalizeExerciseType, requiredTypesFor } from "../domain/exercise-types";
import type { Exercise, LetterLesson, WordChoice } from "../domain/types";

// Formato de GET /v1/content e de assets/content/seed-bundle.json. As regras pedagógicas espelham apps/api/app/content_lint.py.
export type BundleWordChoice = { id: string; word: string; before: string; after: string };
export type BundleExercise = { id: string; type: string; instruction: string; answer: string; audio_asset?: string | null; options?: string[] | null; context_word?: string | null; word_choices?: BundleWordChoice[] | null; position: number };
export type BundleLesson = { id: string; letter: string; title: string; position: number; phase: number; phase_title: string; exercises: BundleExercise[] };
export type ContentBundle = { version: string; learning_order: string; modules: Array<{ id: string; title: string; position: number; lessons: BundleLesson[] }>; words: Array<{ text: string; syllables: string; required_letters: string; difficulty: string }> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isWordChoice = (value: unknown): value is BundleWordChoice => isRecord(value) && ["id", "word", "before", "after"].every((key) => typeof value[key] === "string");
const lettersOf = (word: string) => new Set([...word.normalize("NFD")].filter((character) => character >= "A" && character <= "Z"));
const byPosition = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position);

function structuralErrors(value: unknown): string[] {
  if (!isRecord(value)) return ["Bundle não é um objeto."];
  const errors: string[] = [];
  if (typeof value.version !== "string" || !value.version) errors.push("Bundle sem versão.");
  if (typeof value.learning_order !== "string") errors.push("Bundle sem learning_order.");
  if (!Array.isArray(value.modules)) return [...errors, "Bundle sem módulos."];
  for (const module of value.modules) {
    if (!isRecord(module) || !Array.isArray(module.lessons)) { errors.push("Módulo inválido."); continue; }
    for (const lesson of module.lessons) {
      if (!isRecord(lesson) || typeof lesson.id !== "string" || typeof lesson.letter !== "string" || typeof lesson.position !== "number" || typeof lesson.phase !== "number" || typeof lesson.phase_title !== "string" || !Array.isArray(lesson.exercises)) { errors.push("Lição inválida."); continue; }
      for (const exercise of lesson.exercises) {
        if (!isRecord(exercise) || typeof exercise.id !== "string" || typeof exercise.type !== "string" || typeof exercise.instruction !== "string" || typeof exercise.answer !== "string" || typeof exercise.position !== "number") { errors.push(`Exercício inválido em ${lesson.id}.`); continue; }
        if (exercise.options != null && !isStringArray(exercise.options)) errors.push(`${exercise.id}: opções inválidas.`);
        if (exercise.word_choices != null && !(Array.isArray(exercise.word_choices) && exercise.word_choices.every(isWordChoice))) errors.push(`${exercise.id}: opções de palavra inválidas.`);
      }
    }
  }
  return errors;
}

function pedagogicalErrors(bundle: ContentBundle): string[] {
  const errors: string[] = [];
  const order = bundle.learning_order;
  if (order !== LEARNING_ORDER) errors.push("A ordem de aprendizagem não corresponde ao contrato.");
  const lessons = byPosition(bundle.modules.flatMap((module) => module.lessons));
  if (lessons.map((lesson) => lesson.letter).join("") !== LEARNING_ORDER) errors.push("A trilha deve conter as 26 letras na ordem definida.");
  const ids = lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id));
  if (new Set(ids).size !== ids.length) errors.push("IDs de exercício duplicados.");
  for (const lesson of lessons) {
    const { letter } = lesson;
    const phase = PHASES.find((item) => item.letters.includes(letter));
    if (!phase || phase.phase !== lesson.phase || phase.title !== lesson.phase_title) errors.push(`${lesson.id}: fase incorreta.`);
    const allowed = new Set(order.slice(0, order.indexOf(letter) + 1));
    const futureLetters = (word: string) => [...lettersOf(word)].filter((character) => !allowed.has(character)).sort().join("");
    const types = lesson.exercises.map((exercise) => normalizeExerciseType(exercise.type));
    const missing = requiredTypesFor(letter).filter((type) => !types.includes(type));
    if (missing.length) errors.push(`${lesson.id}: faltam exercícios obrigatórios (${missing.join(", ")}).`);
    for (const exercise of lesson.exercises) {
      const type = normalizeExerciseType(exercise.type);
      const where = exercise.id;
      const options = exercise.options ?? [];
      if (!type) { errors.push(`${where}: tipo desconhecido ${exercise.type}.`); continue; }
      if (type === "listen_choose" || type === "recognize_letter") {
        if (exercise.answer !== letter || !options.includes(letter)) errors.push(`${where}: a resposta deve ser ${letter} e estar entre as opções.`);
      } else if (type === "find_in_word") {
        const word = exercise.context_word ?? "";
        const future = futureLetters(word);
        if (future) errors.push(`${where}: ${word} usa letra ainda não apresentada (${future}).`);
        if (!word.includes(letter) || exercise.answer !== `${word.indexOf(letter) + 1}ª posição` || !options.includes(exercise.answer)) errors.push(`${where}: a resposta deve ser a primeira posição de ${letter} em ${word} e estar entre as opções.`);
      } else if (type === "complete_word") {
        const choices = exercise.word_choices ?? [];
        if (choices.length < 2) errors.push(`${where}: precisa de ao menos um distrator.`);
        const fits = choices.filter((choice) => choice.before + letter + choice.after === choice.word);
        if (fits.length !== 1 || fits[0].id !== exercise.answer) errors.push(`${where}: exatamente uma opção deve ser completada por ${letter}, e ela deve ser a resposta.`);
        for (const choice of choices) {
          const { word } = choice;
          if (choice.before.length + 1 + choice.after.length !== word.length || !word.startsWith(choice.before) || !word.endsWith(choice.after)) errors.push(`${where}: lacuna inválida em ${word}.`);
          const future = futureLetters(word);
          if (future) errors.push(`${where}: ${word} usa letra ainda não apresentada (${future}).`);
          if (choice.id !== exercise.answer && word.includes(letter)) errors.push(`${where}: o distrator ${word} contém a letra ${letter}.`);
        }
      }
    }
  }
  return errors;
}

/** Lista vazia significa bundle aceito. Um bundle com erros nunca deve substituir o conteúdo em uso. */
export function validateBundle(value: unknown): string[] {
  const errors = structuralErrors(value);
  return errors.length ? errors : pedagogicalErrors(value as ContentBundle);
}

const toWordChoice = (choice: BundleWordChoice): WordChoice => ({ id: choice.id, word: choice.word, before: choice.before, after: choice.after, image: "🔤", imageLabel: choice.word, audioText: choice.word });

function toExercise(exercise: BundleExercise): Exercise {
  const type = normalizeExerciseType(exercise.type);
  if (!type) throw new Error(`Tipo de exercício desconhecido: ${exercise.type}`);
  return { id: exercise.id, type, instruction: exercise.instruction, answer: exercise.answer, ...(exercise.options ? { options: exercise.options } : {}), ...(exercise.context_word ? { contextWord: exercise.context_word } : {}), ...(exercise.word_choices ? { wordChoices: exercise.word_choices.map(toWordChoice) } : {}) };
}

/** Projeta um bundle já validado no modelo que as telas consomem. */
export function toLessons(bundle: ContentBundle): LetterLesson[] {
  const order = bundle.learning_order;
  return byPosition(bundle.modules.flatMap((module) => module.lessons)).map((lesson) => ({
    id: lesson.id, order: lesson.position, phase: lesson.phase as 1 | 2 | 3, phaseTitle: lesson.phase_title, letter: lesson.letter,
    prerequisiteLetters: order.slice(0, order.indexOf(lesson.letter)).split(""),
    exercises: byPosition(lesson.exercises).map(toExercise),
  }));
}
