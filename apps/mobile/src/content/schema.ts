import { LEARNING_ORDER, LETTER_EXERCISES_PER_LESSON, PHASES, TARGET_OF, normalizeExerciseType, requiredLetters, requiredTypesFor } from "../domain/exercise-types";
import type { Exercise, Track, Unit, WordChoice } from "../domain/types";
import { ILLUSTRATION_ATTRIBUTION, ILLUSTRATION_LICENSE, isKnownIllustration } from "../assets/illustration-manifest";

/** Aceita o nome atual (Prosa) e o legado (Alfabetiza) durante a transição de marca. */
const ACCEPTED_ILLUSTRATION_LICENSES = new Set([ILLUSTRATION_LICENSE, "Projeto Alfabetiza"]);
const ACCEPTED_ILLUSTRATION_ATTRIBUTIONS = new Set([ILLUSTRATION_ATTRIBUTION, "Equipe Projeto Alfabetiza"]);
import { isManagedMediaId, isSafeApiMediaPath, isSafeApiMediaUrl } from "../assets/managed-media";

// Formato de GET /v1/content e de assets/content/seed-bundle.json. As regras pedagógicas espelham apps/api/app/content_lint.py.
export type BundleWordChoice = { id: string; word: string; before: string; after: string; image?: string; image_asset?: string };
export type BundleItem = { id: string; type: string; item_kind: string; target_id?: string | null; instruction: string; answer: string; options?: string[] | null; context_word?: string | null; word_choices?: BundleWordChoice[] | null; payload?: Record<string, unknown> | null; required_letters: string; audio_asset?: string | null; tts_fallback_text?: string | null; position: number };
export type BundleUnit = { id: string; kind: string; title: string; position: number; phase?: number | null; phase_title?: string | null; focus_letter?: string | null; required_letters: string; items: BundleItem[] };
export type BundleTrack = { id: string; slug: string; title: string; kind: string; description?: string | null; position: number; units: BundleUnit[] };
export type BundleWord = { id: string; text: string; syllables: string[]; required_letters: string; difficulty: string; frequency?: number | null; review_status: string; image_asset?: string | null; image_alt?: string | null; license?: string | null; attribution?: string | null };
export type BundleSentence = { id: string; text: string; required_letters: string; required_word_ids: string[]; difficulty: string; review_status: string; image_asset?: string | null; image_alt?: string | null; license?: string | null; attribution?: string | null };
export type BundleSyllable = { id: string; text: string; pattern: string; required_letters: string; position: number };
/** `url` é uma URL da cópia local servida pela API, nunca a URL externa importada pelo administrador. */
export type BundleAsset = { id: string; kind: string; license?: string | null; attribution?: string | null; url?: string | null };
export type ContentBundle = { version: string; learning_order: string; tracks: BundleTrack[]; words: BundleWord[]; sentences: BundleSentence[]; syllables: BundleSyllable[]; assets?: BundleAsset[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isWordChoice = (value: unknown): value is BundleWordChoice => isRecord(value) && ["id", "word", "before", "after"].every((key) => typeof value[key] === "string");
const optionalString = (value: unknown) => value == null || typeof value === "string";
const byPosition = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position);
const sortedTokens = (tokens: string[]) => [...tokens].sort().join("|");
const CONTEXT_EMOJI: Record<string, string> = { "ÁGUA": "💧", MALA: "🧳", CASA: "🏠", CAMA: "🛏️", COPO: "🥛", GATO: "🐈", MESA: "🪑", ÔNIBUS: "🚌", TELEFONE: "📱", PORTA: "🚪", SAÚDE: "🩺", QUEIJO: "🧀", CHAVE: "🔑", PAPEL: "📄" };
export const contextualIllustration = (word?: string) => word ? (CONTEXT_EMOJI[word.toUpperCase()] ?? "🔤") : undefined;

function structuralErrors(value: unknown): string[] {
  if (!isRecord(value)) return ["Bundle não é um objeto."];
  const errors: string[] = [];
  if (typeof value.version !== "string" || !value.version) errors.push("Bundle sem versão.");
  if (typeof value.learning_order !== "string") errors.push("Bundle sem learning_order.");
  if (!Array.isArray(value.tracks)) return [...errors, "Bundle sem trilhas."];
  for (const name of ["words", "sentences", "syllables"]) {
    if (!Array.isArray(value[name]) || !(value[name] as unknown[]).every((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.text === "string" && typeof entry.required_letters === "string")) errors.push(`Bundle sem lista válida de ${name}.`);
  }
  if (value.assets != null && (!Array.isArray(value.assets) || !value.assets.every((asset) => isRecord(asset) && typeof asset.id === "string" && typeof asset.kind === "string" && optionalString(asset.url) && optionalString(asset.license) && optionalString(asset.attribution)))) errors.push("Bundle sem lista válida de ativos.");
  if (Array.isArray(value.words) && !value.words.every((word) => isRecord(word) && isStringArray(word.syllables) && typeof word.review_status === "string")) errors.push("Palavra sem sílabas ou status.");
  for (const track of value.tracks) {
    if (!isRecord(track) || typeof track.id !== "string" || typeof track.slug !== "string" || typeof track.title !== "string" || typeof track.kind !== "string" || typeof track.position !== "number" || !Array.isArray(track.units)) { errors.push("Trilha inválida."); continue; }
    for (const unit of track.units) {
      if (!isRecord(unit) || typeof unit.id !== "string" || typeof unit.kind !== "string" || typeof unit.title !== "string" || typeof unit.position !== "number" || typeof unit.required_letters !== "string" || !optionalString(unit.focus_letter) || !optionalString(unit.phase_title) || !Array.isArray(unit.items)) { errors.push(`Unidade inválida em ${track.id}.`); continue; }
      for (const item of unit.items) {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.type !== "string" || typeof item.item_kind !== "string" || typeof item.instruction !== "string" || typeof item.answer !== "string" || typeof item.required_letters !== "string" || typeof item.position !== "number" || !optionalString(item.target_id) || !optionalString(item.context_word) || !optionalString(item.tts_fallback_text)) { errors.push(`Item inválido em ${unit.id}.`); continue; }
        if (item.options != null && !isStringArray(item.options)) errors.push(`${item.id}: opções inválidas.`);
        if (item.word_choices != null && !(Array.isArray(item.word_choices) && item.word_choices.every(isWordChoice))) errors.push(`${item.id}: opções de palavra inválidas.`);
        if (item.payload != null && !isRecord(item.payload)) errors.push(`${item.id}: payload inválido.`);
      }
    }
  }
  return errors;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const REQUIRED_METADATA = ["pedagogical_objective", "difficulty", "anti_elimination_rationale", "feedback", "review"];
const stripMarks = (text: string) => text.normalize("NFD").replace(/\p{Mn}/gu, "").toUpperCase();
const distinct = (options: string[], minimum = 3, maximum = 5) => options.length >= minimum && options.length <= maximum && new Set(options).size === options.length;
const sameList = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Espelha apps/api/app/content_lint.py: cada adaptação para toque do banco de questões tem uma única resposta certa. */
function pedagogicalErrors(bundle: ContentBundle): string[] {
  const errors: string[] = [];
  const order = bundle.learning_order;
  if (order !== LEARNING_ORDER) errors.push("A ordem de aprendizagem não corresponde ao contrato.");
  const words = new Map(bundle.words.map((word) => [word.text, word]));
  const sentences = new Map(bundle.sentences.map((sentence) => [sentence.id, sentence]));
  const syllables = new Set(bundle.syllables.map((syllable) => syllable.id));
  const assets = new Map((bundle.assets ?? []).map((asset) => [asset.id, asset]));
  const imageMetadataErrors = (where: string, payload: Record<string, unknown>) => {
    const asset = payload.image_asset;
    const registered = typeof asset === "string" ? assets.get(asset) : undefined;
    const localIllustration = isKnownIllustration(asset);
    const managedIllustration = isManagedMediaId(asset) && registered?.kind === "image";
    if (!localIllustration && !managedIllustration) errors.push(`${where}: image_asset deve referenciar uma ilustração local ou mídia administrada conhecida.`);
    if (registered?.url != null && !isSafeApiMediaUrl(registered.url) && !(managedIllustration && isSafeApiMediaPath(registered.url))) errors.push(`${where}: URL de mídia inválida.`);
    if (typeof payload.image_alt !== "string" || !payload.image_alt.trim()) errors.push(`${where}: image_alt é obrigatório.`);
    if (!localIllustration && (!payload.license || !payload.attribution)) errors.push(`${where}: licença e autoria do ativo são obrigatórias.`);
    if (localIllustration && (!ACCEPTED_ILLUSTRATION_LICENSES.has(String(payload.license ?? "")) || !ACCEPTED_ILLUSTRATION_ATTRIBUTIONS.has(String(payload.attribution ?? "")))) {
      errors.push(`${where}: licença e autoria do ativo não correspondem ao manifesto local.`);
    }
  };
  const units = bundle.tracks.flatMap((track) => track.units.map((unit) => ({ track, unit })));
  const letterUnits = byPosition(units.filter(({ unit }) => unit.kind === "letter").map(({ unit }) => unit));
  if (letterUnits.map((unit) => unit.focus_letter ?? "").join("") !== LEARNING_ORDER) errors.push("A trilha fônica deve conter as 26 letras na ordem definida.");
  const ids = units.flatMap(({ unit }) => unit.items.map((item) => item.id));
  if (new Set(ids).size !== ids.length) errors.push("IDs de item duplicados.");
  for (const { track, unit } of units) {
    const letter = unit.focus_letter ?? "";
    if (!unit.items.length) errors.push(`${unit.id}: unidade sem itens.`);
    if (unit.kind === "letter") {
      if (track.kind !== "phonics" || !letter) { errors.push(`${unit.id}: unidade de letra fora da trilha fônica.`); continue; }
      const index = order.indexOf(letter);
      const phase = PHASES.find((entry) => entry.letters.includes(letter));
      if (!phase || phase.phase !== unit.phase || phase.title !== unit.phase_title) errors.push(`${unit.id}: fase incorreta.`);
      if (unit.required_letters !== order.slice(0, index)) errors.push(`${unit.id}: pré-requisitos devem ser as letras anteriores.`);
      const types = unit.items.map((item) => normalizeExerciseType(item.type));
      const missing = requiredTypesFor(letter).filter((type) => !types.includes(type));
      if (missing.length) errors.push(`${unit.id}: faltam exercícios obrigatórios (${missing.join(", ")}).`);
      if (unit.items.length < LETTER_EXERCISES_PER_LESSON.minimum || unit.items.length > LETTER_EXERCISES_PER_LESSON.maximum) errors.push(`${unit.id}: a lição de letra deve ter de ${LETTER_EXERCISES_PER_LESSON.minimum} a ${LETTER_EXERCISES_PER_LESSON.maximum} exercícios.`);
    } else if (!order.startsWith(unit.required_letters)) {
      errors.push(`${unit.id}: required_letters deve ser um trecho inicial da ordem de aprendizagem (portão do nível).`);
    }
    for (const item of unit.items) {
      const where = item.id;
      const type = normalizeExerciseType(item.type);
      const options = item.options ?? [];
      const answer = item.answer;
      if (!type) { errors.push(`${where}: tipo desconhecido ${item.type}.`); continue; }
      if (item.item_kind !== TARGET_OF[type]) errors.push(`${where}: item_kind deve ser ${TARGET_OF[type]}.`);
      const payload = item.payload ?? {};
      const missingMetadata = REQUIRED_METADATA.filter((key) => !(key in payload));
      if (missingMetadata.length) errors.push(`${where}: metadados pedagógicos ausentes (${missingMetadata.join(", ")}).`);
      const feedback = isRecord(payload.feedback) ? payload.feedback : {}; const review = isRecord(payload.review) ? payload.review : {};
      if (typeof feedback.correct !== "string" || !feedback.correct || typeof feedback.incorrect !== "string" || !feedback.incorrect) errors.push(`${where}: feedback correto e de nova tentativa são obrigatórios.`);
      if (!["pending_human_review", "approved", "changes_requested"].includes(String(review.status)) || typeof review.criterion !== "string" || !review.criterion) errors.push(`${where}: status e critério de revisão pedagógica são obrigatórios.`);
      if (answer && item.instruction.split(/\s+/).includes(answer)) errors.push(`${where}: o enunciado revela a resposta ${answer}.`);
      const context = isRecord(payload.context) ? payload.context : {};
      const masked = typeof context.masked_word === "string" ? context.masked_word : undefined;
      if (masked !== undefined && (!masked.includes("_") || context.hide_word !== true)) errors.push(`${where}: a palavra lacunada deve esconder a resposta.`);
      if (context.hide_word === true && item.context_word && item.instruction.includes(item.context_word)) errors.push(`${where}: o enunciado não pode mostrar a palavra escondida.`);
      if (payload.image_asset != null) imageMetadataErrors(where, payload);
      const word = item.context_word ?? "";
      if (type === "listen_choose" || type === "recognize_letter") {
        if ((unit.kind === "letter" && answer !== letter) || !options.includes(answer) || !distinct(options)) errors.push(`${where}: a letra ouvida deve ser a resposta, entre três a cinco opções distintas.`);
      } else if (type === "initial_sound") {
        if (!word || answer !== stripMarks(word)[0] || !options.includes(answer) || !distinct(options, 3, 4)) errors.push(`${where}: a resposta deve ser a letra inicial de ${word}, entre três ou quatro opções distintas.`);
        if (masked !== undefined && masked !== `_${word.slice(1)}`) errors.push(`${where}: a lacuna deve esconder só a letra inicial de ${word}.`);
      } else if (type === "first_last_letters") {
        const expected = [1, word.length];
        if (word.length < 2 || !sameList(payload.characters, [...word]) || !sameList(payload.target_indices, expected) || answer !== expected.join(",")) errors.push(`${where}: deve marcar a primeira e a última letra de ${word}.`);
        if (!sameList(options, [...word].map((_, index) => String(index + 1)))) errors.push(`${where}: opções devem representar todas as posições da palavra.`);
      } else if (type === "alphabet_neighbors") {
        const target = typeof payload.letter === "string" ? payload.letter : "";
        const index = target ? ALPHABET.indexOf(target) : -1;
        if (index <= 0 || index >= 25 || answer !== `${ALPHABET[index - 1]} ${target} ${ALPHABET[index + 1]}` || !options.includes(answer) || !distinct(options, 3, 3)) errors.push(`${where}: a resposta deve ser a letra anterior, ${target} e a posterior, entre três sequências.`);
      } else if (type === "syllable_listen_choose") {
        if (!options.includes(answer) || item.target_id !== answer || !distinct(options, 2, 5)) errors.push(`${where}: a sílaba-alvo deve ser a resposta e estar entre as opções.`);
        for (const option of options) if (!syllables.has(option)) errors.push(`${where}: sílaba ${option} não catalogada.`);
      } else if (type === "syllable_position_choose") {
        const catalogued = words.get(typeof payload.word === "string" ? payload.word : "");
        const parts = isStringArray(payload.syllables) ? payload.syllables : [];
        const position = payload.position;
        const expected = position === "initial" ? parts[0] : position === "final" ? parts.at(-1) : undefined;
        if (!catalogued || !sameList(parts, catalogued.syllables) || answer !== expected || item.target_id !== answer) errors.push(`${where}: a resposta deve ser a sílaba catalogada na posição pedida.`);
        if (!options.includes(answer) || !distinct(options) || options.some((option) => !syllables.has(option))) errors.push(`${where}: deve oferecer de três a cinco sílabas catalogadas e distintas, incluindo a resposta.`);
        const gapAt = position === "initial" ? 0 : parts.length - 1;
        if (masked !== undefined && !sameList(masked.split(" "), parts.map((part, index) => index === gapAt ? "___" : part))) errors.push(`${where}: a lacuna deve esconder só a sílaba pedida.`);
      } else if (type === "word_from_syllables") {
        const parts = answer.split("-");
        const tokens = isStringArray(payload.tokens) ? payload.tokens : [];
        const catalogued = words.get(item.target_id ?? "");
        if (!catalogued || catalogued.syllables.join("-") !== answer) errors.push(`${where}: a resposta deve ser a separação silábica catalogada de ${item.target_id ?? ""}.`);
        if (sortedTokens(tokens) !== sortedTokens(parts) || (tokens.join("-") === answer && new Set(parts).size > 1)) errors.push(`${where}: tokens devem ser as sílabas da resposta em outra ordem.`);
        if (catalogued && item.instruction.includes(catalogued.text)) errors.push(`${where}: o enunciado de montagem não pode revelar a palavra pronta.`);
      } else if (type === "syllables_to_word") {
        const parts = isStringArray(payload.syllables) ? payload.syllables : [];
        if (!parts.length || answer !== parts.join("") || item.target_id !== answer || !options.includes(answer) || !distinct(options, 3, 3)) errors.push(`${where}: a resposta deve ser a palavra formada pelas sílabas, entre três palavras.`);
        for (const option of options) if (!words.has(option)) errors.push(`${where}: palavra ${option} não está no catálogo publicado.`);
      } else if (type === "word_letter_fit") {
        const cards = item.word_choices ?? [];
        const target = typeof payload.letter === "string" ? payload.letter : "";
        const fitting = cards.filter((card) => card.before === "" && stripMarks(card.word).slice(0, 1) === target && card.word.slice(1) === card.after);
        if (cards.length < 2 || fitting.length !== 1 || fitting[0].id !== answer || new Set(cards.map((card) => card.id)).size !== cards.length) errors.push(`${where}: exatamente uma palavra deve se completar com ${target}.`);
        if (cards.some((card) => card.word !== card.before + card.word.charAt(card.before.length) + card.after)) errors.push(`${where}: cada cartão deve ter uma única lacuna.`);
      } else if (type === "word_listen_choose") {
        if (!options.includes(answer) || options.length < 2 || item.target_id !== answer) errors.push(`${where}: a palavra-alvo deve ser a resposta e estar entre as opções.`);
        for (const option of options) if (!words.has(option)) errors.push(`${where}: palavra ${option} não está no catálogo publicado.`);
      } else if (type === "word_image_choose" || type === "picture_choose") {
        if (item.target_id !== answer || !words.has(answer) || !options.includes(answer) || !distinct(options)) errors.push(`${where}: deve oferecer de três a cinco palavras distintas publicadas, incluindo a palavra-alvo.`);
        if (options.some((option) => !words.has(option))) errors.push(`${where}: todas as opções devem ser palavras publicadas.`);
        if (type === "word_image_choose" && !payload.image_asset && typeof context.image !== "string") errors.push(`${where}: a palavra precisa de figura.`);
        if (type === "picture_choose" && !sameList(Object.keys(isRecord(payload.option_images) ? payload.option_images : {}).sort(), [...options].sort())) errors.push(`${where}: cada opção precisa de figura.`);
      } else if (type === "sentence_fill_word") {
        const sentence = sentences.get(item.target_id ?? "");
        const gapped = typeof payload.sentence === "string" ? payload.sentence : "";
        if (!sentence || !gapped.includes("___") || gapped.replace("___", answer) !== sentence.text) errors.push(`${where}: a frase com a lacuna preenchida deve ser a frase catalogada.`);
        if (!options.includes(answer) || options.length < 2) errors.push(`${where}: a resposta deve estar entre as opções.`);
      } else if (type === "sentence_order") {
        const sentence = sentences.get(item.target_id ?? "");
        const tokens = isStringArray(payload.tokens) ? payload.tokens : [];
        if (!sentence || answer !== sentence.text) errors.push(`${where}: a resposta deve ser a frase catalogada.`);
        if (sortedTokens(tokens) !== sortedTokens(answer.split(" ")) || tokens.join(" ") === answer) errors.push(`${where}: tokens devem ser as palavras da frase em outra ordem.`);
      } else if (type === "sentence_image_choose") {
        const sentence = sentences.get(item.target_id ?? "");
        if (!sentence || answer !== sentence.text || !options.includes(answer) || !distinct(options, 3, 3)) errors.push(`${where}: deve oferecer três frases distintas, incluindo a cena-alvo.`);
        if (!payload.image_asset && typeof context.image !== "string") errors.push(`${where}: a cena precisa de figura.`);
      } else if (type !== "find_all_in_word" && !options.includes(answer)) {
        errors.push(`${where}: a resposta deve estar entre as opções.`);
      }
    }
  }
  for (const word of words.values()) {
    if (word.required_letters !== requiredLetters(word.text) || !word.syllables.length) errors.push(`palavra ${word.text}: required_letters ou sílabas inconsistentes.`);
  }
  return errors;
}

/** Lista vazia significa bundle aceito. Um bundle com erros nunca deve substituir o conteúdo em uso. */
export function validateBundle(value: unknown): string[] {
  const errors = structuralErrors(value);
  return errors.length ? errors : pedagogicalErrors(value as ContentBundle);
}

const toWordChoice = (choice: BundleWordChoice): WordChoice => ({ id: choice.id, word: choice.word, before: choice.before, after: choice.after, image: choice.image ?? contextualIllustration(choice.word) ?? "🔤", ...(isKnownIllustration(choice.image_asset) ? { imageAsset: choice.image_asset } : {}), imageLabel: choice.word, audioText: choice.word });

function toExercise(item: BundleItem, visual?: { image_asset?: string | null; image_alt?: string | null }, assets = new Map<string, BundleAsset>()): Exercise {
  const type = normalizeExerciseType(item.type);
  if (!type) throw new Error(`Tipo de exercício desconhecido: ${item.type}`);
  const tokens = isStringArray(item.payload?.tokens) ? item.payload.tokens : undefined;
  const sentence = typeof item.payload?.sentence === "string" ? item.payload.sentence : undefined;
  const payloadText = (key: string) => typeof item.payload?.[key] === "string" ? item.payload[key] as string : undefined;
  const nested = (key: string) => isRecord(item.payload?.[key]) ? item.payload[key] as Record<string, unknown> : undefined;
  const context = nested("context"); const feedback = nested("feedback"); const review = nested("review");
  const contextText = (key: string) => typeof context?.[key] === "string" ? context[key] as string : undefined;
  const characters = isStringArray(item.payload?.characters) ? item.payload.characters.join("") : undefined;
  const compareWords = isStringArray(item.payload?.words) ? item.payload.words : undefined;
  const imageAsset = payloadText("image_asset") ?? visual?.image_asset ?? undefined;
  const imageAlt = payloadText("image_alt") ?? visual?.image_alt ?? undefined;
  const imageUri = imageAsset ? assets.get(imageAsset)?.url : undefined;
  const contextWord = item.context_word ?? contextText("word") ?? undefined;
  const maskedWord = contextText("masked_word");
  const hideWord = context?.hide_word === true;
  const inlineAudio = context?.inline_audio === true;
  const optionImages = isRecord(item.payload?.option_images)
    ? Object.fromEntries(Object.entries(item.payload.option_images).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])).map(([option, visual]) => [option, {
      ...(typeof visual.image === "string" ? { image: visual.image } : {}), ...(isKnownIllustration(visual.image_asset) ? { imageAsset: visual.image_asset } : {}),
    }]))
    : undefined;
  const targetPositions = Array.isArray(item.payload?.target_indices) && item.payload.target_indices.every((value) => typeof value === "number" && Number.isInteger(value) && value > 0) ? (item.payload.target_indices as number[]).map((value) => value - 1) : undefined;
  return {
    id: item.id, type, itemKind: TARGET_OF[type], instruction: item.instruction, answer: item.answer, requiredLetters: item.required_letters,
    ttsText: item.tts_fallback_text ?? item.instruction,
    ...(item.target_id ? { targetId: item.target_id } : {}), ...(item.options ? { options: item.options } : {}), ...(item.context_word ? { contextWord: item.context_word } : {}),
    ...(item.word_choices ? { wordChoices: item.word_choices.map(toWordChoice) } : {}), ...(tokens ? { tokens } : {}), ...(sentence ? { sentence } : {}),
    ...(imageAsset ? { imageAsset, imageLabel: imageAlt ?? "Ilustração contextual" } : {}),
    ...(imageUri && (isSafeApiMediaUrl(imageUri) || isSafeApiMediaPath(imageUri)) ? { imageUri } : {}),
    ...((contextText("image") ?? contextualIllustration(contextWord)) ? { image: contextText("image") ?? contextualIllustration(contextWord) } : {}),
    ...((contextText("image_label") ?? contextWord) ? { imageLabel: contextText("image_label") ?? (hideWord ? "Ilustração da palavra" : `Ilustração de ${contextWord}`) } : {}),
    ...(maskedWord ? { maskedWord, contextLabel: maskedWord } : (!hideWord && (contextText("label") ?? contextWord) ? { contextLabel: contextText("label") ?? contextWord } : {})),
    ...(inlineAudio ? { inlineAudio: true } : {}), ...(payloadText("pedagogical_objective") ? { skill: payloadText("pedagogical_objective"), pedagogicalObjective: payloadText("pedagogical_objective") } : {}),
    ...(payloadText("anti_elimination_rationale") ? { antiEliminationRationale: payloadText("anti_elimination_rationale") } : {}), ...(payloadText("difficulty") ? { difficulty: payloadText("difficulty") } : {}),
    ...(typeof feedback?.correct === "string" ? { successFeedback: feedback.correct } : {}), ...(typeof feedback?.incorrect === "string" ? { errorFeedback: feedback.incorrect } : {}),
    ...(targetPositions ? { targetPositions } : {}), ...(characters ? { contextWord: characters } : {}),
    ...(typeof review?.status === "string" ? { reviewStatus: review.status } : {}), ...(typeof review?.criterion === "string" ? { reviewCriterion: review.criterion } : {}),
    ...(compareWords ? { compareWords } : {}),
    ...(optionImages ? { optionImages } : {}), ...(payloadText("letter") ? { targetLetter: payloadText("letter") } : {}),
  };
}

/** Projeta um bundle já validado no modelo que as telas consomem. */
export function toTracks(bundle: ContentBundle): Track[] {
  const assets = new Map((bundle.assets ?? []).map((asset) => [asset.id, asset]));
  const visuals = new Map<string, { image_asset?: string | null; image_alt?: string | null }>([
    ...bundle.words.map((word) => [word.id, word] as const),
    ...bundle.sentences.map((sentence) => [sentence.id, sentence] as const),
  ]);
  return byPosition(bundle.tracks).map((track) => ({
    id: track.id, slug: track.slug, title: track.title, kind: track.kind === "phonics" ? "phonics" : "theme", ...(track.description ? { description: track.description } : {}), order: track.position,
    units: byPosition(track.units).map((unit): Unit => ({
      id: unit.id, trackId: track.id, kind: (["letter", "word", "sentence", "syllable", "word_image", "sentence_image"].includes(unit.kind) ? unit.kind : "word") as Unit["kind"], title: unit.title, order: unit.position,
      ...(unit.phase ? { phase: unit.phase as 1 | 2 | 3 } : {}), ...(unit.phase_title ? { phaseTitle: unit.phase_title } : {}), ...(unit.focus_letter ? { letter: unit.focus_letter } : {}),
      prerequisiteLetters: unit.required_letters.split("").filter(Boolean),
      exercises: byPosition(unit.items).map((item) => toExercise(item, item.target_id ? visuals.get(item.target_id) : undefined, assets)),
    })),
  }));
}
