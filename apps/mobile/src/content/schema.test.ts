import { describe, expect, it } from "vitest";
import seed from "../../assets/content/seed-bundle.json";
import { toTracks, validateBundle, type ContentBundle } from "./schema";

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
    expect(types("lesson-A")).toEqual(["listen_choose", "recognize_letter"]);
    expect(types("lesson-M")).toEqual(["listen_choose", "recognize_letter", "find_in_word", "syllable_listen_choose"]);
    expect(types("lesson-L")).toEqual(["listen_choose", "recognize_letter", "find_in_word", "syllable_listen_choose", "complete_word"]);
    const casa = tracks[1].units.find((unit) => unit.id === "casa-1")!;
    expect(casa.prerequisiteLetters).toEqual(["A", "E", "M", "L", "S", "C"]);
    const build = casa.exercises.find((exercise) => exercise.type === "word_from_syllables")!;
    expect(build).toMatchObject({ itemKind: "word", targetId: "CASA", answer: "CA-SA", tokens: ["SA", "CA"], ttsText: "CASA" });
    const fill = tracks[1].units.find((unit) => unit.id === "casa-frases")!.exercises.find((exercise) => exercise.type === "sentence_fill_word")!;
    expect(fill).toMatchObject({ sentence: "EU DURMO NA ___", answer: "CAMA", options: ["CAMA", "COPO", "PORTA"], ttsText: "EU DURMO NA CAMA" });
    const syllable = letters.find((unit) => unit.letter === "M")!.exercises.find((exercise) => exercise.type === "syllable_listen_choose")!;
    expect(syllable.ttsText).toBe(syllable.answer);
  });

  it("rejeita estrutura inválida sem lançar exceção", () => {
    expect(validateBundle(null)).toEqual(["Bundle não é um objeto."]);
    expect(validateBundle({ version: "x", learning_order: "A" })).toContain("Bundle sem trilhas.");
    const broken = bundle();
    (itemOf(broken, "lesson-A", "listen_choose") as unknown as { options: unknown }).options = "A";
    expect(validateBundle(broken)).toContain("exercise-A-listen: opções inválidas.");
  });

  it("rejeita letra futura, distrator ambíguo, sílaba fora da fase, montagem trivial e palavra não publicada", () => {
    const withFuture = bundle();
    Object.assign(itemOf(withFuture, "lesson-I", "find_in_word"), { context_word: "PIPA", answer: "2ª posição", options: ["1ª posição", "2ª posição", "3ª posição", "4ª posição"] });
    expect(validateBundle(withFuture)).toEqual(["exercise-I-find: PIPA usa letra ainda não apresentada (P)."]);

    const ambiguous = bundle();
    itemOf(ambiguous, "lesson-L", "complete_word").word_choices!.push({ id: "lama", word: "LAMA", before: "", after: "AMA" });
    expect(validateBundle(ambiguous)).toContain("exercise-L-complete-word: exatamente uma opção deve ser completada por L, e ela deve ser a resposta.");

    const earlySyllable = bundle();
    itemOf(earlySyllable, "lesson-M", "syllable_listen_choose").options![0] = "BA";
    expect(validateBundle(earlySyllable)).toContain("exercise-M-syllable: BA usa letra ainda não apresentada (B).");

    const trivial = bundle();
    const build = itemOf(trivial, "casa-1", "word_from_syllables");
    build.payload = { tokens: build.answer.split("-") };
    expect(validateBundle(trivial)).toContain(`${build.id}: tokens devem ser as sílabas da resposta em outra ordem.`);

    const unpublished = bundle();
    itemOf(unpublished, "casa-frases", "sentence_fill_word").options!.push("JANELA");
    expect(validateBundle(unpublished)).toContain("item-casa-frases-1: palavra JANELA não está no catálogo publicado.");

    const missing = bundle();
    unitOf(missing, "lesson-M").items = unitOf(missing, "lesson-M").items.filter((item) => item.type !== "find_in_word");
    expect(validateBundle(missing)).toEqual(["lesson-M: faltam exercícios obrigatórios (find_in_word)."]);
  });
});
