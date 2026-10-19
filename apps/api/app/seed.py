"""Sincroniza o banco com o catálogo curado de content_data.py. Idempotente: cria, atualiza e aposenta.

Itens que saem do catálogo viram `retired` em vez de apagados, porque tentativas e progresso os referenciam.
Palavras do banco de candidatos (app/data/word_bank.json) entram como `candidate` e nunca geram exercício sozinhas.
"""
import json
import uuid
from sqlalchemy import select
from .content import content_body, content_checksum
from .content_data import ACCENTS, ASSET_ATTRIBUTION, ASSET_LICENSE, LESSON_CONTEXT, SENTENCES, TRACKS, VISUAL_DISTRACTORS, WORDS, WORD_ILLUSTRATIONS, deterministic_shuffle, required_letters, syllable_exercise, syllable_pattern
from .content_ids import exercise_id_for, item_id_for, lesson_id_for
from .content_types import LEARNING_ORDER, PHASE_SPECS, TARGET_OF, ExerciseType
from .db import SessionLocal
from .models import Asset, ContentStudioState, ContentVersion, Item, Sentence, Syllable, Track, Unit, Word, WordTrack
from .word_bank import WORD_BANK_PATH

LETTERS = LEARNING_ORDER
PHASES = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}
CURATED_STATUSES = ("pending", "approved")


def word_choice(word: str, blank: int) -> dict:
    return {"id": word.lower(), "word": word, "before": word[:blank], "after": word[blank + 1:]}


def letter_item_specs(letter: str) -> list[dict]:
    """Sete práticas curtas e complementares, curadas explicitamente para cada letra."""
    index = LETTERS.index(letter)
    context, hunt_word, review_word, sound_distractor, other_distractor = LESSON_CONTEXT[letter]
    visual = VISUAL_DISTRACTORS[letter]
    positions = [i + 1 for i, char in enumerate(hunt_word) if char == letter]
    blank = hunt_word.index(letter)
    masked_hunt_word = f"{hunt_word[:blank]}_{hunt_word[blank + 1:]}"
    review_blank = review_word.index(letter)
    masked_review_word = f"{review_word[:review_blank]}_{review_word[review_blank + 1:]}"

    def metadata(objective: str, difficulty: str, rationale: str, correct: str, retry: str) -> dict:
        return {
            "pedagogical_objective": objective,
            "difficulty": difficulty,
            "anti_elimination_rationale": rationale,
            "feedback": {"correct": correct, "incorrect": retry},
            "review": {
                "status": "pending_human_review",
                "criterion": "Aprovar após adulto alfabetizando compreender a instrução, justificar a resposta e não depender da posição das opções.",
            },
            "context": {"word": context, "audience": "adulto", "situation": "uso cotidiano"},
        }

    hidden_context = lambda word, masked: {"word": word, "masked_word": masked, "hide_word": True, "inline_audio": True, "audience": "adulto", "situation": "uso cotidiano"}
    # Para U, UAU × AU torna visível a presença inicial de U sem introduzir
    # letras futuras. As demais lições usam a segunda palavra contextual.
    comparison_word = "AU" if letter == "U" else hunt_word
    specs = [
        dict(type=ExerciseType.LISTEN_CHOOSE, instruction="Qual letra completa esta palavra?", answer=letter,
             options=visual[index % 3:] + visual[:index % 3], context_word=context, tts=context,
             payload={**metadata("Associar o som da palavra à letra inicial ausente.", "introducao", "A resposta depende de ouvir a palavra e relacionar seu som inicial à lacuna.", f"Isso: {letter} completa a palavra.", "Ouça a palavra novamente e preste atenção ao primeiro som."), "context": hidden_context(context, f"_{context[1:]}")}),
        dict(type=ExerciseType.RECOGNIZE_LETTER, instruction="Qual letra você ouviu?", answer=letter,
             options=list(reversed(visual)), context_word=None, tts=letter,
             payload=metadata("Discriminar visualmente a letra ouvida.", "facil", "Os distratores têm traços semelhantes; é preciso reconhecer a forma.", f"Você reconheceu a forma de {letter}.", "Ouça novamente e compare as formas.")),
        dict(type=ExerciseType.INITIAL_SOUND, instruction="Ouça a palavra. Qual é a primeira letra?", answer=letter,
             options=[sound_distractor, letter, other_distractor], context_word=context, tts=context,
             payload={**metadata("Relacionar o som inicial à letra.", "medio", "As alternativas são letras de sons ou formas próximos.", f"Correto: a palavra começa com o som de {letter}.", "Ouça devagar e perceba o primeiro som."), "context": hidden_context(context, f"_{context[1:]}")}),
        dict(type=ExerciseType.FIND_ALL_IN_WORD, instruction="Ouça a letra e toque em todas as ocorrências na palavra.", answer=",".join(map(str, positions)),
             options=[str(i + 1) for i in range(len(hunt_word))], context_word=hunt_word, tts=letter,
             payload={**metadata("Localizar todas as ocorrências da letra numa palavra.", "medio", "Há várias posições possíveis e todas precisam ser verificadas.", f"Você encontrou todas as letras {letter} em {hunt_word}.", f"Leia {hunt_word} da esquerda para a direita e tente novamente."), "characters": list(hunt_word), "target_indices": positions}),
        dict(type=ExerciseType.COMPARE_WORDS, instruction="Compare as palavras. Qual letra inicia a primeira?", answer=letter,
             options=[other_distractor, sound_distractor, letter], context_word=context, tts=f"{context}. {comparison_word}.",
             payload={**metadata("Comparar palavras e identificar a letra inicial relevante.", "medio", "Duas palavras reais exigem atenção à palavra perguntada.", f"Certo: {context} inicia com {letter}.", "Observe o começo da primeira palavra e compare outra vez."), "words": [context, comparison_word], "changed_position": 1}),
        dict(type=ExerciseType.COMPLETE_WORD, instruction="Qual letra completa esta palavra?", answer=letter,
             options=visual[2:] + visual[:2], target_id=hunt_word, context_word=hunt_word, tts=hunt_word,
             payload={**metadata("Completar uma palavra cotidiana a partir do áudio e da lacuna.", "medio", "Lacuna e distratores são plausíveis; o áudio determina a resposta sem exibir a palavra pronta.", f"Isso: {letter} completa a palavra.", "Ouça a palavra novamente e escolha a letra que falta."), "context": hidden_context(hunt_word, masked_hunt_word)}),
        dict(type=ExerciseType.MIXED_REVIEW, instruction="Revisão: qual letra falta nesta palavra?", answer=letter,
             options=visual[1:] + visual[:1], context_word=review_word, tts=review_word,
             payload={**metadata("Recuperar a letra em outro contexto e outra ordem de opções.", "revisao", "A palavra aparece com lacuna e exige nova associação entre áudio e escrita.", f"Boa revisão: {letter} completa a palavra.", "Ouça novamente e observe a posição da lacuna."), "context": hidden_context(review_word, masked_review_word)}),
    ]
    if syllable := syllable_exercise(letter):
        target, options = syllable
        specs.append(dict(type=ExerciseType.SYLLABLE_LISTEN_CHOOSE, instruction="Ouça e escolha a sílaba.", answer=target,
                          options=options, target_id=target, tts=target,
                          payload=metadata("Associar a sílaba ouvida à sua forma escrita.", "medio", "As alternativas compartilham a mesma consoante e diferem apenas na vogal.", f"Isso: você reconheceu a sílaba {target}.", "Ouça novamente e compare o som da vogal.")))
    return specs


def thematic_metadata(objective: str, difficulty: str, rationale: str, correct: str, retry: str, **extra) -> dict:
    return {
        "pedagogical_objective": objective,
        "difficulty": difficulty,
        "anti_elimination_rationale": rationale,
        "feedback": {"correct": correct, "incorrect": retry},
        "review": {
            "status": "pending_human_review",
            "criterion": "Aprovar após adulto alfabetizando compreender a instrução, distinguir os distratores e justificar a resposta sem depender da posição.",
        },
        **extra,
    }


def word_unit_item_specs(words: list[str], syllables_of: dict[str, list[str]]) -> list[dict]:
    specs = []
    for position, word in enumerate(words):
        others = [other for other in words if other != word]
        distractors = (others[position:] + others[:position])[:2]
        options = sorted([word, *distractors])
        specs.append(dict(type=ExerciseType.WORD_LISTEN_CHOOSE, instruction="Ouça e escolha a palavra.", answer=word, options=options, target_id=word, tts=word, required=word))
        parts = syllables_of[word]
        illustration = WORD_ILLUSTRATIONS.get(word, {})
        specs.append(dict(type=ExerciseType.WORD_FROM_SYLLABLES, instruction="Ouça e monte a palavra tocando as sílabas na ordem.", answer="-".join(parts),
                          payload={"tokens": deterministic_shuffle(parts), **illustration}, target_id=word, tts=word, required=word))
    return specs


def syllable_position_item_specs(words: list[str], syllables_of: dict[str, list[str]]) -> list[dict]:
    specs = []
    for index, word in enumerate(words):
        parts = syllables_of[word]
        position = "initial" if index % 2 == 0 else "final"
        answer = parts[0] if position == "initial" else parts[-1]
        distractors = []
        for other in words[index + 1:] + words[:index]:
            candidate = syllables_of[other][0 if position == "initial" else -1]
            if candidate != answer and candidate not in distractors:
                distractors.append(candidate)
            if len(distractors) == 2:
                break
        payload = thematic_metadata(
            f"Identificar a sílaba {('inicial' if position == 'initial' else 'final')} de uma palavra cotidiana.", "medio",
            "As três sílabas pertencem a palavras da mesma trilha; imagem e áudio determinam a resposta.",
            f"Correto: {answer} é a sílaba {('inicial' if position == 'initial' else 'final')}.",
            "Ouça a palavra novamente e perceba a parte pedida.", word=word, syllables=parts, position=position, **WORD_ILLUSTRATIONS[word])
        specs.append(dict(type=ExerciseType.SYLLABLE_POSITION_CHOOSE,
                          instruction=f"Qual é a sílaba {('inicial' if position == 'initial' else 'final')} da palavra da imagem?",
                          answer=answer, options=deterministic_shuffle([answer, *distractors]), target_id=answer, tts=word, required=word, payload=payload))
    return specs


def word_image_item_specs(words: list[str]) -> list[dict]:
    specs = []
    for index, word in enumerate(words):
        distractors = (words[index + 1:] + words[:index])[:2]
        payload = thematic_metadata("Relacionar uma ilustração à palavra escrita.", "medio",
                                    "Todas as alternativas são palavras concretas da mesma trilha.",
                                    f"Correto: a imagem representa {word}.", "Observe a imagem e compare cada palavra novamente.", **WORD_ILLUSTRATIONS[word])
        specs.append(dict(type=ExerciseType.WORD_IMAGE_CHOOSE, instruction="Qual palavra corresponde à imagem?", answer=word,
                          options=deterministic_shuffle([word, *distractors]), target_id=word, tts=word, required=word, payload=payload))
    return specs


def sentence_image_item_specs(sentence_ids: list[str], sentences: dict[str, dict]) -> list[dict]:
    specs = []
    for index, sentence_id in enumerate(sentence_ids):
        sentence = sentences[sentence_id]
        distractor_ids = (sentence_ids[index + 1:] + sentence_ids[:index])[:2]
        options = [sentence["text"], *(sentences[value]["text"] for value in distractor_ids)]
        visual = {key: sentence[key] for key in ("image_asset", "image_alt", "license", "attribution")}
        payload = thematic_metadata("Relacionar uma cena cotidiana à frase que a descreve.", "desafio",
                                    "As alternativas são frases completas da mesma situação temática.",
                                    "Correto: a frase descreve a cena.", "Observe quem, o objeto e a ação da cena antes de tentar novamente.", **visual)
        specs.append(dict(type=ExerciseType.SENTENCE_IMAGE_CHOOSE, instruction="Qual frase descreve a cena?", answer=sentence["text"],
                          options=deterministic_shuffle(options), target_id=sentence_id, tts=sentence["text"], required=sentence["text"], payload=payload))
    return specs


def sentence_unit_item_specs(sentence_ids: list[str], sentences: dict[str, dict]) -> list[dict]:
    specs = []
    for sentence_id in sentence_ids:
        sentence = sentences[sentence_id]
        text = sentence["text"]
        if blank := sentence.get("blank"):
            gapped = text.replace(blank, "___", 1)
            specs.append(dict(type=ExerciseType.SENTENCE_FILL_WORD, instruction=f"Complete a frase: {gapped}.", answer=blank, options=sorted([blank, *sentence["distractors"]]), payload={"sentence": gapped, "blank": blank}, target_id=sentence_id, tts=text, required=text))
        if sentence.get("order"):
            tokens = text.split(" ")
            specs.append(dict(type=ExerciseType.SENTENCE_ORDER, instruction="Toque nas palavras na ordem para formar a frase.", answer=text, payload={"tokens": deterministic_shuffle(tokens)}, target_id=sentence_id, tts=text, required=text))
    return specs


def upsert_items(db, unit: Unit, specs: list[dict], id_of, required_default: str) -> None:
    wanted = set()
    for position, spec in enumerate(specs, 1):
        item_id = id_of(spec, position)
        item = db.get(Item, item_id) or Item(id=item_id)
        kind = spec["type"]
        item.unit_id, item.type, item.item_kind, item.position = unit.id, kind.value, TARGET_OF[kind].value, position
        item.instruction, item.answer, item.options, item.context_word, item.word_choices, item.payload = spec["instruction"], spec["answer"], spec.get("options"), spec.get("context_word"), spec.get("word_choices"), spec.get("payload")
        item.target_id, item.tts_fallback_text, item.audio_asset = spec.get("target_id"), spec["tts"], None
        item.required_letters = required_letters(spec["required"]) if "required" in spec else required_default
        if item.review_status == "retired": item.review_status = "pending"
        db.add(item); wanted.add(item_id)
    for stale in db.scalars(select(Item).where(Item.unit_id == unit.id, Item.id.not_in(wanted))).all():
        stale.review_status = "retired"


def upsert_word(db, words: dict[str, Word], text: str, **fields) -> Word:
    word = words.get(text)
    if not word:
        # ID determinístico: o bundle exportado e o ETag não podem mudar a cada seed.
        word = words[text] = Word(id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"alfabetiza:word:{text}")), text=text); db.add(word)
    for name, value in fields.items():
        if value is not None: setattr(word, name, value)
    word.required_letters, word.accented, word.length = required_letters(text), any(c in ACCENTS for c in text), len(text)
    return word


def upsert_syllable(db, text: str) -> None:
    syllable = db.get(Syllable, text) or Syllable(id=text)
    letters = required_letters(text)
    syllable.text, syllable.pattern, syllable.required_letters = text, syllable_pattern(text), letters
    syllable.position = max((LETTERS.index(letter) for letter in letters), default=0)
    db.add(syllable)


def seed_content():
    with SessionLocal() as db:
        # Depois que o Estúdio é aberto, a curadoria humana é a fonte de
        # verdade. Seeds seguintes continuam úteis em bancos novos/testes, mas
        # jamais sobrescrevem o catálogo local administrado.
        if db.get(ContentStudioState, 1):
            return
        words = {word.text: word for word in db.scalars(select(Word)).all()}
        for text, syllables, difficulty, rationale in WORDS:
            word = upsert_word(db, words, text, syllables=syllables, initial_difficulty=difficulty, difficulty_rationale=rationale, source="curadoria", **WORD_ILLUSTRATIONS.get(text, {}))
            if word.review_status not in CURATED_STATUSES: word.review_status, word.current_difficulty = "pending", difficulty
        if WORD_BANK_PATH.exists():
            for entry in json.loads(WORD_BANK_PATH.read_text(encoding="utf-8")):
                curated = entry["text"] in words
                word = upsert_word(db, words, entry["text"], frequency=entry.get("frequency"), raw_frequency=entry.get("raw_frequency"), frequency_source=entry.get("source"))
                if not curated:
                    word.syllables, word.initial_difficulty, word.current_difficulty, word.source = entry["syllables"].split("-"), entry["difficulty"], entry["difficulty"], entry.get("source")
                    if word.review_status not in CURATED_STATUSES: word.review_status = "candidate"
        db.flush()
        syllables_of = {word.text: list(word.syllables or []) for word in words.values()}
        for text, *_ in WORDS:
            for part in syllables_of[text]: upsert_syllable(db, part)
        for metadata in WORD_ILLUSTRATIONS.values():
            asset = db.get(Asset, metadata["image_asset"]) or Asset(id=metadata["image_asset"])
            asset.kind, asset.license, asset.attribution = "image", metadata["license"], metadata["attribution"]
            db.add(asset)
        for data in SENTENCES:
            asset = db.get(Asset, data["image_asset"]) or Asset(id=data["image_asset"])
            asset.kind, asset.license, asset.attribution = "image", data["license"], data["attribution"]
            db.add(asset)

        alphabet = db.get(Track, "alphabet") or Track(id="alphabet")
        alphabet.slug, alphabet.title, alphabet.kind, alphabet.position, alphabet.description = "alfabeto", "Alfabeto", "phonics", 1, "As 26 letras em ordem progressiva."
        db.add(alphabet)
        for position, letter in enumerate(LETTERS, 1):
            unit = db.get(Unit, lesson_id_for(letter)) or Unit(id=lesson_id_for(letter))
            unit.track_id, unit.kind, unit.focus_letter, unit.title, unit.position = alphabet.id, "letter", letter, f"Letra {letter}", position
            unit.phase, unit.phase_title = PHASES[letter]
            unit.required_letters = LETTERS[: position - 1]
            db.add(unit)
            specs = letter_item_specs(letter)
            for spec in specs:
                if spec["type"] is ExerciseType.SYLLABLE_LISTEN_CHOOSE:
                    for option in spec["options"]: upsert_syllable(db, option)
            upsert_items(db, unit, specs, lambda spec, _position: exercise_id_for(letter, spec["type"]), unit.required_letters)

        sentences = {sentence["id"]: sentence for sentence in SENTENCES}
        for spec in TRACKS:
            track = db.get(Track, spec["id"]) or Track(id=spec["id"])
            track.slug, track.title, track.kind, track.position, track.description = spec["slug"], spec["title"], spec["kind"], spec["position"], spec.get("description")
            db.add(track)
            for position, unit_spec in enumerate(spec["units"], 1):
                unit = db.get(Unit, unit_spec["id"]) or Unit(id=unit_spec["id"])
                unit.track_id, unit.kind, unit.title, unit.position, unit.focus_letter, unit.phase, unit.phase_title = track.id, unit_spec["kind"], unit_spec["title"], position, None, None, None
                db.add(unit)
                if unit_spec["kind"] in {"word", "syllable", "word_image"}:
                    for word_position, text in enumerate(unit_spec["words"], 1):
                        link = db.get(WordTrack, (words[text].id, track.id)) or WordTrack(word_id=words[text].id, track_id=track.id)
                        link.position = word_position; db.add(link)
                    if unit_spec["kind"] == "word":
                        item_specs = word_unit_item_specs(unit_spec["words"], syllables_of)
                    elif unit_spec["kind"] == "syllable":
                        item_specs = syllable_position_item_specs(unit_spec["words"], syllables_of)
                    else:
                        item_specs = word_image_item_specs(unit_spec["words"])
                    unit.required_letters = required_letters("".join(unit_spec["words"]))
                else:
                    for sentence_id in unit_spec["sentences"]:
                        data = sentences[sentence_id]
                        sentence = db.get(Sentence, sentence_id) or Sentence(id=sentence_id)
                        tokens = data["text"].split(" ")
                        sentence.text, sentence.track_id, sentence.word_count, sentence.required_letters = data["text"], track.id, len(tokens), required_letters(data["text"])
                        sentence.required_word_ids = [words[token].id for token in tokens if token in words]
                        sentence.image_asset, sentence.image_alt = data["image_asset"], data["image_alt"]
                        sentence.license, sentence.attribution = data["license"], data["attribution"]
                        db.add(sentence)
                    item_specs = (sentence_image_item_specs(unit_spec["sentences"], sentences)
                                  if unit_spec["kind"] == "sentence_image" else sentence_unit_item_specs(unit_spec["sentences"], sentences))
                    unit.required_letters = required_letters("".join(sentences[sentence_id]["text"] for sentence_id in unit_spec["sentences"]))
                upsert_items(db, unit, item_specs, lambda _spec, position, unit_id=unit.id: item_id_for(unit_id, position), unit.required_letters)
        db.commit()

        body = content_body(db)
        checksum = content_checksum(body)
        latest = db.scalar(select(ContentVersion).order_by(ContentVersion.id.desc()))
        if not latest or latest.checksum != checksum:
            db.add(ContentVersion(version=checksum[:16], checksum=checksum, notes="seed")); db.commit()


if __name__ == "__main__": seed_content()
