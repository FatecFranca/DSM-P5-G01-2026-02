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

  it("projeta as trilhas do banco de questões da Larissa", () => {
    const tracks = toTracks(bundle());
    expect(tracks.map((track) => track.kind)).toEqual(["phonics", "theme", "theme", "theme", "theme"]);
    expect(tracks.map((track) => track.title)).toEqual(["Alfabeto", "Sílabas", "Sílabas complexas", "Palavras", "Frases"]);
    const letters = tracks[0].units;
    expect(letters.map((unit) => unit.letter).join("")).toBe("AEIOUMLPSTRNDCGBFVHQJKZXWY");
    expect(letters.every((unit, index) => unit.order === index + 1 && unit.prerequisiteLetters.length === index)).toBe(true);
    expect(letters.find((unit) => unit.letter === "G")?.phase).toBe(2);
    const unit = (id: string) => tracks.flatMap((track) => track.units).find((entry) => entry.id === id)!;
    expect(unit("lesson-A").exercises.map((exercise) => exercise.id)).toEqual(["exercise-A-listen", "bq-1A-abelha", "bq-1A-anjo", "bq-1D-abelha", "bq-1D-anjo"]);
    const [listen, abelha, , firstLast] = unit("lesson-A").exercises;
    expect(listen).toMatchObject({ type: "listen_choose", answer: "A", options: ["A", "E", "M", "O", "P"], ttsText: "a", difficulty: "introducao" });
    expect(abelha).toMatchObject({ type: "initial_sound", answer: "A", maskedWord: "_BELHA", contextLabel: "_BELHA", image: "🐝", inlineAudio: true, ttsText: "ABELHA" });
    expect(firstLast).toMatchObject({ type: "first_last_letters", contextWord: "ABELHA", targetPositions: [0, 5], answer: "1,6", image: "🐝" });
    const neighbors = unit("lesson-E").exercises.find((exercise) => exercise.type === "alphabet_neighbors")!;
    expect(neighbors).toMatchObject({ answer: "D E F", contextLabel: "_ E _", targetLetter: "E" });
    const gap = unit("complexas-1-inicial").exercises.find((exercise) => exercise.id === "bq-2B-sorvete-inicial")!;
    expect(gap).toMatchObject({ type: "syllable_position_choose", answer: "SOR", maskedWord: "___ VE TE", image: "🍦" });
    const casa = unit("silabas-completar").exercises[0];
    expect(casa).toMatchObject({ answer: "CA", imageAsset: "images/words/casa.svg", options: ["DA", "CA", "BO"] });
    const separate = unit("complexas-1-separar").exercises[0];
    expect(separate).toMatchObject({ type: "word_from_syllables", answer: "CA-SA", tokens: ["SA", "CA"], contextLabel: "CASA" });
    const formed = unit("complexas-1-formar").exercises[0];
    expect(formed).toMatchObject({ type: "syllables_to_word", answer: "CASA", contextLabel: "CA + SA" });
    const drawing = unit("palavras-desenho").exercises[0];
    expect(drawing).toMatchObject({ type: "picture_choose", answer: "FOLHA", contextLabel: "FOLHA", optionImages: { FOLHA: { image: "🍃" }, CHAMA: { image: "🔥" }, FOCA: { image: "🦭" } } });
    const fit = unit("palavras-completar-5").exercises.find((exercise) => exercise.id === "bq-3E-u-uva")!;
    expect(fit).toMatchObject({ type: "word_letter_fit", answer: "uva", targetLetter: "U" });
    expect(fit.wordChoices?.find((card) => card.id === "uva")).toMatchObject({ before: "", after: "VA", image: "🍇" });
    const order = unit("frases-montar").exercises[0];
    expect(order).toMatchObject({ type: "sentence_order", contextLabel: "A ___ É UMA FRUTA", image: "🍊", tokens: ["FRUTA", "A", "UMA", "É", "LARANJA"] });
    expect(contextualIllustration("MALA")).toBe("🧳");
  });

  it("rejeita estrutura inválida sem lançar exceção", () => {
    expect(validateBundle(null)).toEqual(["Bundle não é um objeto."]);
    expect(validateBundle({ version: "x", learning_order: "A" })).toContain("Bundle sem trilhas.");
    const broken = bundle();
    (itemOf(broken, "lesson-A", "listen_choose") as unknown as { options: unknown }).options = "A";
    expect(validateBundle(broken)).toContain("exercise-A-listen: opções inválidas.");
  });

  it("rejeita posições erradas, distrator ambíguo, montagem trivial e palavra não publicada", () => {
    const item = (value: ContentBundle, id: string) => value.tracks.flatMap((track) => track.units).flatMap((unit) => unit.items).find((entry) => entry.id === id)!;
    const wrongPositions = bundle();
    item(wrongPositions, "bq-1D-ilha").payload!.target_indices = [2];
    expect(validateBundle(wrongPositions)).toContain("bq-1D-ilha: deve marcar a primeira e a última letra de ILHA.");

    const revealed = bundle();
    (item(revealed, "bq-1A-escada").payload!.context as Record<string, unknown>).masked_word = "ESCADA";
    expect(validateBundle(revealed)).toContain("bq-1A-escada: a palavra lacunada deve esconder a resposta.");

    const trivial = bundle();
    const build = item(trivial, "bq-2D-panela");
    build.payload = { ...build.payload, tokens: build.answer.split("-") };
    expect(validateBundle(trivial)).toContain("bq-2D-panela: tokens devem ser as sílabas da resposta em outra ordem.");

    const unpublished = bundle();
    item(unpublished, "bq-2E-casa").options!.push("JANELAS");
    expect(validateBundle(unpublished)).toContain("bq-2E-casa: palavra JANELAS não está no catálogo publicado.");

    const ambiguous = bundle();
    for (const card of item(ambiguous, "bq-3E-a-anjo").word_choices!) Object.assign(card, { word: `A${card.word.slice(1)}`, before: "", after: card.word.slice(1) });
    expect(validateBundle(ambiguous)).toContain("bq-3E-a-anjo: exatamente uma palavra deve se completar com A.");

    const missing = bundle();
    unitOf(missing, "lesson-M").items = unitOf(missing, "lesson-M").items.filter((entry) => entry.type !== "first_last_letters");
    expect(validateBundle(missing)).toContain("lesson-M: faltam exercícios obrigatórios (first_last_letters).");
  });

  it("rejeita ativo visual ausente e rótulo acessível vazio", () => {
    const unknown = bundle();
    itemOf(unknown, "silabas-completar", "syllable_position_choose").payload!.image_asset = "images/words/janela.svg";
    expect(validateBundle(unknown)).toContain("bq-2A-casa-casa: image_asset deve referenciar uma ilustração local ou mídia administrada conhecida.");
    const unlabeled = bundle();
    itemOf(unlabeled, "silabas-completar", "syllable_position_choose").payload!.image_alt = "";
    expect(validateBundle(unlabeled)).toContain("bq-2A-casa-casa: image_alt é obrigatório.");
  });

  it("aceita mídia administrada publicada pela API e a projeta para o renderer", () => {
    const managed = bundle();
    const assetId = "media/4e90e53a-70d6-4bd3-a6f7-a2fedca7a7b0";
    managed.assets ??= [];
    managed.assets.push({ id: assetId, kind: "image", license: "CC BY 4.0", attribution: "Autoria informada", url: "/v1/media/4e90e53a-70d6-4bd3-a6f7-a2fedca7a7b0" });
    const item = itemOf(managed, "palavras-ligar-1", "word_image_choose");
    Object.assign(item.payload!, { image_asset: assetId, image_alt: "Foto de escada.", license: "CC BY 4.0", attribution: "Autoria informada" });
    expect(validateBundle(managed)).toEqual([]);
    const exercise = toTracks(managed).flatMap((track) => track.units).find((unit) => unit.id === "palavras-ligar-1")!.exercises[0];
    expect(exercise).toMatchObject({ imageAsset: assetId, imageUri: "/v1/media/4e90e53a-70d6-4bd3-a6f7-a2fedca7a7b0" });
  });

  it("recusa URL de mídia que não seja HTTP(S)", () => {
    const managed = bundle();
    const assetId = "media/imagem-segura";
    managed.assets ??= [];
    managed.assets.push({ id: assetId, kind: "image", license: "CC BY 4.0", attribution: "Autoria informada", url: "file:///tmp/imagem.png" });
    const item = itemOf(managed, "palavras-ligar-1", "word_image_choose");
    Object.assign(item.payload!, { image_asset: assetId, image_alt: "Foto de escada.", license: "CC BY 4.0", attribution: "Autoria informada" });
    expect(validateBundle(managed)).toContain(`${item.id}: URL de mídia inválida.`);
  });
});
