"""Sincroniza o banco com o catálogo curado de content_data.py. Idempotente: cria, atualiza e aposenta.

Itens que saem do catálogo viram `retired` em vez de apagados, porque tentativas e progresso os referenciam.
Palavras do banco de candidatos (app/data/word_bank.json) entram como `candidate` e nunca geram exercício sozinhas.
"""
import json
import uuid
from sqlalchemy import select
from .content import content_body, content_checksum
from .content_data import ACCENTS, CONTEXT_WORDS, SENTENCES, TRACKS, WORDS, WORD_CHOICES, deterministic_shuffle, required_letters, syllable_exercise, syllable_pattern
from .content_ids import exercise_id_for, item_id_for, lesson_id_for
from .content_types import LEARNING_ORDER, PHASE_SPECS, TARGET_OF, ExerciseType
from .db import SessionLocal
from .models import ContentVersion, Item, Sentence, Syllable, Track, Unit, Word, WordTrack
from .word_bank import WORD_BANK_PATH

LETTERS = LEARNING_ORDER
PHASES = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}
CURATED_STATUSES = ("pending", "approved")


def word_choice(word: str, blank: int) -> dict:
    return {"id": word.lower(), "word": word, "before": word[:blank], "after": word[blank + 1:]}


def letter_item_specs(letter: str) -> list[dict]:
    """Itens de uma unidade de letra, na ordem de apresentação."""
    index = LETTERS.index(letter)
    options = [letter, LETTERS[(index + 1) % 26], LETTERS[(index + 2) % 26]]
    specs = [dict(type=ExerciseType.LISTEN_CHOOSE, instruction=f"Ouça e escolha a letra {letter}.", answer=letter, options=options, tts=f"Ouça e escolha a letra {letter}."),
             dict(type=ExerciseType.RECOGNIZE_LETTER, instruction=f"Encontre a letra {letter}.", answer=letter, options=options[::-1], tts=f"Encontre a letra {letter}.")]
    if word := CONTEXT_WORDS.get(letter):
        specs.append(dict(type=ExerciseType.FIND_IN_WORD, instruction=f"Onde aparece primeiro a letra {letter} na palavra {word}?", answer=f"{word.index(letter) + 1}ª posição",
                          options=[f"{item + 1}ª posição" for item in range(len(word))], context_word=word, tts=f"Onde aparece primeiro a letra {letter} na palavra {word}?"))
    if syllable := syllable_exercise(letter):
        target, options = syllable
        specs.append(dict(type=ExerciseType.SYLLABLE_LISTEN_CHOOSE, instruction="Ouça e escolha a sílaba.", answer=target, options=options, target_id=target, tts=target))
    if letter in WORD_CHOICES:
        (correct, correct_blank), (distractor, distractor_blank) = WORD_CHOICES[letter]
        choices = [word_choice(correct, correct_blank), word_choice(distractor, distractor_blank)]
        # Alterna a posição da resposta para que ela não fique sempre em primeiro.
        specs.append(dict(type=ExerciseType.COMPLETE_WORD, instruction=f"Em qual palavra entra a letra {letter}?", answer=correct.lower(), word_choices=choices[::-1] if index % 2 else choices, target_id=correct, tts=f"Em qual palavra entra a letra {letter}?"))
    return specs


def word_unit_item_specs(words: list[str], syllables_of: dict[str, list[str]]) -> list[dict]:
    specs = []
    for position, word in enumerate(words):
        others = [other for other in words if other != word]
        distractors = (others[position:] + others[:position])[:2]
        options = sorted([word, *distractors])
        specs.append(dict(type=ExerciseType.WORD_LISTEN_CHOOSE, instruction="Ouça e escolha a palavra.", answer=word, options=options, target_id=word, tts=word, required=word))
        parts = syllables_of[word]
        specs.append(dict(type=ExerciseType.WORD_FROM_SYLLABLES, instruction=f"Monte a palavra {word} tocando as sílabas na ordem.", answer="-".join(parts), payload={"tokens": deterministic_shuffle(parts)}, target_id=word, tts=word, required=word))
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
        words = {word.text: word for word in db.scalars(select(Word)).all()}
        for text, syllables, difficulty, rationale in WORDS:
            word = upsert_word(db, words, text, syllables=syllables, initial_difficulty=difficulty, difficulty_rationale=rationale, source="curadoria")
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
                if unit_spec["kind"] == "word":
                    for word_position, text in enumerate(unit_spec["words"], 1):
                        link = db.get(WordTrack, (words[text].id, track.id)) or WordTrack(word_id=words[text].id, track_id=track.id)
                        link.position = word_position; db.add(link)
                    item_specs = word_unit_item_specs(unit_spec["words"], syllables_of)
                    unit.required_letters = required_letters("".join(unit_spec["words"]))
                else:
                    for sentence_id in unit_spec["sentences"]:
                        data = sentences[sentence_id]
                        sentence = db.get(Sentence, sentence_id) or Sentence(id=sentence_id)
                        tokens = data["text"].split(" ")
                        sentence.text, sentence.track_id, sentence.word_count, sentence.required_letters = data["text"], track.id, len(tokens), required_letters(data["text"])
                        sentence.required_word_ids = [words[token].id for token in tokens if token in words]
                        db.add(sentence)
                    item_specs = sentence_unit_item_specs(unit_spec["sentences"], sentences)
                    unit.required_letters = required_letters("".join(sentences[sentence_id]["text"] for sentence_id in unit_spec["sentences"]))
                upsert_items(db, unit, item_specs, lambda _spec, position, unit_id=unit.id: item_id_for(unit_id, position), unit.required_letters)
        db.commit()

        body = content_body(db)
        checksum = content_checksum(body)
        latest = db.scalar(select(ContentVersion).order_by(ContentVersion.id.desc()))
        if not latest or latest.checksum != checksum:
            db.add(ContentVersion(version=checksum[:16], checksum=checksum, notes="seed")); db.commit()


if __name__ == "__main__": seed_content()
