import { describe, expect, it } from "vitest";
import seed from "../../assets/content/seed-bundle.json";
import { contextualIllustration, toTracks, validateBundle, type ContentBundle } from "./schema";

const bundle = () => JSON.parse(JSON.stringify(seed)) as ContentBundle;
const unitOf = (value: ContentBundle, id: string) => value.tracks.flatMap((track) => track.units).find((unit) => unit.id === id)!;
const itemOf = (value: ContentBundle, unitId: string, type: string) => unitOf(value, unitId).items.find((item) => item.type === type)!;

describe("bundle de conteúdo", () => {
  it("aceita o bundle semente embarcado", () => {
    expect(validateBundle(seed)).toEqual([]);
  });

  it("projeta trilhas e unidades com pré-requisitos e exercícios por tipo de unidade", () => {
    const tracks = toTracks(bundle());
    expect(tracks.map((track) => track.kind)).toEqual(["phonics", "theme"]);
    const letters = tracks[0].units;
    expect(letters.map((unit) => unit.letter).join("")).toBe("AEIOUMLPSTRNDCGBFVHQJKZXWY");
    expect(letters.every((unit, index) => unit.order === index + 1 && unit.prerequisiteLetters.length === index)).toBe(true);
    expect(letters.find((unit) => unit.letter === "G")?.phase).toBe(2);
    const types = (id: string) => tracks.flatMap((track) => track.units).find((unit) => unit.id === id)!.exercises.map((exercise) => exercise.type);
    expect(types("lesson-A")).toEqual(["listen_choose", "recognize_letter", "initial_sound", "find_all_in_word", "compare_words", "complete_word", "mixed_review"]);
    expect(types("lesson-M")).toEqual(types("lesson-A"));
    expect(types("lesson-L")).toEqual(types("lesson-A"));
    const findAll = letters[0].exercises.find((exercise) => exercise.type === "find_all_in_word")!;
    expect(findAll).toMatchObject({ contextWord: "MALA", answer: "2,4", targetPositions: [1, 3], successFeedback: "Você encontrou todas as letras A em MALA." });
    const complete = letters[0].exercises.find((exercise) => exercise.type === "complete_word")!;
    expect(complete).toMatchObject({ answer: "A", contextWord: "MALA", maskedWord: "M_LA", contextLabel: "M_LA", inlineAudio: true, ttsText: "MALA" });
    expect(complete.instruction).toBe("Qual letra completa esta palavra?");
    expect(complete.ttsText).not.toBe(complete.instruction);
    expect(complete.wordChoices).toBeUndefined();
    expect(contextualIllustration("MALA")).toBe("🧳");
    const casa = tracks[1].units.find((unit) => unit.id === "casa-1")!;
    expect(casa.prerequisiteLetters).toEqual(["A", "E", "M", "L", "S", "C"]);
    const build = casa.exercises.find((exercise) => exercise.type === "word_from_syllables")!;
    expect(build).toMatchObject({ itemKind: "word", targetId: "CASA", answer: "CA-SA", tokens: ["SA", "CA"], ttsText: "CASA" });
    const fill = tracks[1].units.find((unit) => unit.id === "casa-frases")!.exercises.find((exercise) => exercise.type === "sentence_fill_word")!;
    expect(fill).toMatchObject({ sentence: "EU DURMO NA ___", answer: "CAMA", options: ["CAMA", "COPO", "PORTA"], ttsText: "EU DURMO NA CAMA" });
  });

  it("rejeita estrutura inválida sem lançar exceção", () => {
    expect(validateBundle(null)).toEqual(["Bundle não é um objeto."]);
    expect(validateBundle({ version: "x", learning_order: "A" })).toContain("Bundle sem trilhas.");
    const broken = bundle();
    (itemOf(broken, "lesson-A", "listen_choose") as unknown as { options: unknown }).options = "A";
    expect(validateBundle(broken)).toContain("exercise-A-listen: opções inválidas.");
  });

  it("rejeita posições erradas, distrator ambíguo, montagem trivial e palavra não publicada", () => {
    const wrongPositions = bundle();
    itemOf(wrongPositions, "lesson-I", "find_all_in_word").payload!.target_indices = [2];
    expect(validateBundle(wrongPositions)).toContain("exercise-I-find-all: deve marcar exatamente todas as ocorrências de I em IDADE.");

    const ambiguous = bundle();
    (ambiguous.tracks[0].units.find((unit) => unit.id === "lesson-L")!.items.find((item) => item.type === "complete_word")!.payload!.context as Record<string, unknown>).masked_word = "LATA";
    expect(validateBundle(ambiguous)).toContain("exercise-L-complete-word: a lacuna deve formar a palavra de contexto somente com L.");

    const trivial = bundle();
    const build = itemOf(trivial, "casa-1", "word_from_syllables");
    build.payload = { tokens: build.answer.split("-") };
    expect(validateBundle(trivial)).toContain(`${build.id}: tokens devem ser as sílabas da resposta em outra ordem.`);

    const unpublished = bundle();
    itemOf(unpublished, "casa-frases", "sentence_fill_word").options!.push("JANELA");
    expect(validateBundle(unpublished)).toContain("item-casa-frases-1: palavra JANELA não está no catálogo publicado.");

    const missing = bundle();
    unitOf(missing, "lesson-M").items = unitOf(missing, "lesson-M").items.filter((item) => item.type !== "initial_sound");
    expect(validateBundle(missing)).toEqual(["lesson-M: faltam exercícios obrigatórios (initial_sound)."]);
  });
});
