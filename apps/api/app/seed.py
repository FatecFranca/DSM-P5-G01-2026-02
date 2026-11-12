"""Sincroniza o banco com o currículo do banco de questões da Larissa (app/question_bank.py). Idempotente.

Itens, unidades, trilhas, palavras e frases que saem do catálogo viram `retired` em vez de apagados, porque
tentativas e progresso os referenciam. Palavras do banco de candidatos (app/data/word_bank.json) entram como
`candidate` e nunca geram exercício sozinhas.
"""
import json
import uuid
from sqlalchemy import select
from . import question_bank as qb
from .content import content_body, content_checksum
from .content_data import ACCENTS, ASSET_ATTRIBUTION, ASSET_LICENSE, required_letters, syllable_pattern
from .content_ids import lesson_id_for
from .content_types import LEARNING_ORDER, PHASE_SPECS, TARGET_OF, ExerciseType
from .db import SessionLocal
from .models import Asset, ContentStudioState, ContentVersion, Item, Sentence, Syllable, Track, Unit, Word, WordTrack
from .word_bank import WORD_BANK_PATH

LETTERS = LEARNING_ORDER
PHASES = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}
CURATED_STATUSES = ("pending", "approved")
SYLLABLE_TYPES = (ExerciseType.SYLLABLE_LISTEN_CHOOSE, ExerciseType.SYLLABLE_POSITION_CHOOSE)


def upsert_items(db, unit: Unit, specs: list[dict]) -> None:
    wanted = set()
    for position, spec in enumerate(specs, 1):
        item_id = spec["id"]
        item = db.get(Item, item_id) or Item(id=item_id)
        kind = spec["type"]
        item.unit_id, item.type, item.item_kind, item.position = unit.id, kind.value, TARGET_OF[kind].value, position
        item.instruction, item.answer, item.options, item.context_word, item.word_choices, item.payload = spec["instruction"], spec["answer"], spec.get("options"), spec.get("context_word"), spec.get("word_choices"), spec.get("payload")
        item.target_id, item.tts_fallback_text, item.audio_asset = spec.get("target_id"), spec["tts"], None
        item.required_letters = required_letters(spec["required"])
        item.review_status = "pending" if item.review_status in ("retired", "candidate", None) else item.review_status
        db.add(item); wanted.add(item_id)
    for stale in db.scalars(select(Item).where(Item.unit_id == unit.id, Item.id.not_in(wanted))).all():
        stale.review_status = "retired"


def upsert_word(db, words: dict[str, Word], text: str, **fields) -> Word:
    word = words.get(text)
    if not word:
        # ID determinístico: o bundle exportado e o ETag não podem mudar a cada seed.
        word = words[text] = Word(id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"alfabetiza:word:{text}")), text=text); db.add(word)
    for name, value in fields.items():
        setattr(word, name, value)
    word.required_letters, word.accented, word.length = required_letters(text), any(c in ACCENTS for c in text), len(text)
    return word


def upsert_syllable(db, text: str) -> Syllable:
    syllable = db.get(Syllable, text) or Syllable(id=text)
    letters = required_letters(text)
    syllable.text, syllable.pattern, syllable.required_letters = text, syllable_pattern(text), letters
    syllable.position = max((LETTERS.index(letter) for letter in letters), default=0)
    syllable.review_status = "pending"
    db.add(syllable)
    return syllable


def upsert_unit(db, track: Track, position: int, spec: dict) -> Unit:
    unit = db.get(Unit, spec["id"]) or Unit(id=spec["id"])
    unit.track_id, unit.kind, unit.title, unit.position = track.id, spec["kind"], spec["title"], position
    unit.focus_letter, unit.phase, unit.phase_title = spec.get("focus_letter"), spec.get("phase"), spec.get("phase_title")
    unit.required_letters, unit.review_status = spec["required_letters"], "pending"
    db.add(unit)
    db.flush()
    upsert_items(db, unit, spec["items"])
    return unit


def word_visual(text: str) -> dict:
    asset = qb.SVG.get(text)
    if not asset:
        return {"image_asset": None, "image_alt": None, "license": None, "attribution": None}
    return {"image_asset": asset, "image_alt": f"Desenho de {text.lower()}.", "license": ASSET_LICENSE, "attribution": ASSET_ATTRIBUTION}


def retire_missing(db, model, keep: set[str], where=None) -> None:
    query = select(model).where(model.id.not_in(keep))
    if where is not None:
        query = query.where(where)
    for stale in db.scalars(query).all():
        if stale.review_status in CURATED_STATUSES:
            stale.review_status = "retired"


def seed_content():
    with SessionLocal() as db:
        # Depois que o Estúdio é aberto, a curadoria humana é a fonte de verdade. Seeds seguintes continuam úteis
        # em bancos novos/testes, mas jamais sobrescrevem o catálogo local administrado.
        if db.get(ContentStudioState, 1):
            return
        words = {word.text: word for word in db.scalars(select(Word)).all()}
        catalog = qb.catalog_words()
        for text, parts in catalog.items():
            difficulty = qb.word_difficulty(parts)
            word = upsert_word(db, words, text, syllables=parts, initial_difficulty=difficulty, difficulty_rationale="palavra do banco de questões da Larissa", source="curadoria", **word_visual(text))
            if word.review_status not in CURATED_STATUSES: word.review_status, word.current_difficulty = "pending", difficulty
        for text, word in words.items():
            if word.source == "curadoria" and text not in catalog and word.review_status in CURATED_STATUSES:
                word.review_status = "retired"
        if WORD_BANK_PATH.exists():
            for entry in json.loads(WORD_BANK_PATH.read_text(encoding="utf-8")):
                curated = entry["text"] in words
                word = upsert_word(db, words, entry["text"], frequency=entry.get("frequency"), raw_frequency=entry.get("raw_frequency"), frequency_source=entry.get("source"))
                if not curated:
                    word.syllables, word.initial_difficulty, word.current_difficulty, word.source = entry["syllables"].split("-"), entry["difficulty"], entry["difficulty"], entry.get("source")
                    if word.review_status not in CURATED_STATUSES: word.review_status = "candidate"
        db.flush()

        letter_units = qb.letter_units()
        theme_tracks = qb.theme_tracks()
        all_specs = [item for unit in letter_units for item in unit["items"]] + [item for track in theme_tracks for unit in track["units"] for item in unit["items"]]
        syllables = {part for parts in catalog.values() for part in parts}
        syllables |= {option for item in all_specs if item["type"] in SYLLABLE_TYPES for option in item.get("options") or []}
        for text in sorted(syllables): upsert_syllable(db, text)
        retire_missing(db, Syllable, syllables)

        for visual in qb.SVG.values():
            asset = db.get(Asset, visual) or Asset(id=visual)
            asset.kind, asset.license, asset.attribution = "image", ASSET_LICENSE, ASSET_ATTRIBUTION
            db.add(asset)

        track_ids, unit_ids = {"alphabet"}, set()
        alphabet = db.get(Track, "alphabet") or Track(id="alphabet")
        alphabet.slug, alphabet.title, alphabet.kind, alphabet.position, alphabet.description = "alfabeto", "Alfabeto", "phonics", 1, "Nível 1: as 26 letras, vogais primeiro (banco de questões da Larissa)."
        alphabet.review_status = "pending"
        db.add(alphabet)
        for position, entry in enumerate(letter_units, 1):
            letter = entry["letter"]
            phase, phase_title = PHASES[letter]
            spec = {"id": lesson_id_for(letter), "kind": "letter", "title": f"Letra {letter}", "focus_letter": letter, "phase": phase, "phase_title": phase_title,
                    "required_letters": LETTERS[: position - 1], "items": entry["items"]}
            upsert_unit(db, alphabet, position, spec); unit_ids.add(spec["id"])

        sentences = {entry["id"]: entry for entry in qb.sentences()}
        for spec in theme_tracks:
            track = db.get(Track, spec["id"]) or Track(id=spec["id"])
            track.slug, track.title, track.kind, track.position, track.description = spec["slug"], spec["title"], spec["kind"], spec["position"], spec.get("description")
            track.review_status = "pending"
            db.add(track); db.flush(); track_ids.add(track.id)
            for position, unit_spec in enumerate(spec["units"], 1):
                upsert_unit(db, track, position, unit_spec); unit_ids.add(unit_spec["id"])
            if spec["id"] == "frases":
                for data in sentences.values():
                    sentence = db.get(Sentence, data["id"]) or Sentence(id=data["id"])
                    tokens = data["text"].split(" ")
                    visual = word_visual(data["text"])
                    sentence.text, sentence.track_id, sentence.word_count, sentence.required_letters = data["text"], track.id, len(tokens), required_letters(data["text"])
                    sentence.required_word_ids = [words[token].id for token in tokens if token in words and words[token].review_status in CURATED_STATUSES]
                    sentence.image_asset, sentence.license, sentence.attribution = visual["image_asset"], visual["license"], visual["attribution"]
                    sentence.image_alt, sentence.review_status = data["image_alt"][:120], "pending"
                    db.add(sentence)
            catalog_track_words = sorted({item["target_id"] for unit in spec["units"] for item in unit["items"] if item.get("target_id") in catalog})
            for word_position, text in enumerate(catalog_track_words, 1):
                link = db.get(WordTrack, (words[text].id, track.id)) or WordTrack(word_id=words[text].id, track_id=track.id)
                link.position = word_position; db.add(link)
        retire_missing(db, Sentence, set(sentences))
        # Trilhas e unidades do catálogo anterior (Tem em casa, Família) saem do bundle; os itens delas também.
        retire_missing(db, Track, track_ids)
        retire_missing(db, Unit, unit_ids)
        for stale in db.scalars(select(Item).where(Item.unit_id.not_in(unit_ids))).all():
            stale.review_status = "retired"
        db.commit()

        body = content_body(db)
        checksum = content_checksum(body)
        latest = db.scalar(select(ContentVersion).order_by(ContentVersion.id.desc()))
        if not latest or latest.checksum != checksum:
            db.add(ContentVersion(version=checksum[:16], checksum=checksum, notes="seed: banco de questões da Larissa")); db.commit()


if __name__ == "__main__": seed_content()
