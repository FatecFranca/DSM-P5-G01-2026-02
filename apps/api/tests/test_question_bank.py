import importlib.util
from pathlib import Path

import pytest

from app import seed
from app.db import SessionLocal
from app.models import Item, Track, Unit

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "export_question_bank.py"
BANK = Path(__file__).resolve().parents[1] / "app" / "data" / "banco_questoes.json"


def test_committed_question_bank_matches_the_generator():
    spec = importlib.util.spec_from_file_location("export_question_bank", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not module.GENERATOR.exists():
        pytest.skip("bancoquestoesequiz ausente (container só com apps/api)")
    assert BANK.read_text(encoding="utf-8") == module.render(), "rode apps/api/scripts/export_question_bank.py"


def test_every_bank_question_reaches_the_app(client):
    import json
    questions = {entry["id"]: entry for entry in json.loads(BANK.read_text(encoding="utf-8"))["questoes"]}
    content = client.get("/v1/content").json()
    sources = {item["payload"]["source"]["question_id"] for track in content["tracks"] for unit in track["units"] for item in unit["items"]}
    assert sources == set(questions)


def test_seed_retires_the_previous_catalog(client):
    with SessionLocal() as db:
        db.add(Track(id="casa", slug="tem-em-casa", title="Tem em casa", kind="theme", position=2, review_status="pending"))
        db.flush()
        db.add(Unit(id="casa-1", track_id="casa", kind="word", title="Coisas da casa", position=1, required_letters="AC", review_status="pending"))
        db.flush()
        db.add(Item(id="item-casa-1-1", unit_id="casa-1", type="word_listen_choose", item_kind="word", instruction="Ouça.", answer="CASA", position=1, review_status="pending"))
        db.commit()
    seed.seed_content()
    content = client.get("/v1/content").json()
    assert "casa" not in {track["id"] for track in content["tracks"]}
    with SessionLocal() as db:
        assert db.get(Track, "casa").review_status == "retired"
        assert db.get(Unit, "casa-1").review_status == "retired"
        assert db.get(Item, "item-casa-1-1").review_status == "retired"


def test_catalog_fits_the_postgres_columns(client):
    # SQLite não confere tamanho de VARCHAR; o Postgres da produção, sim (ex.: syllables.pattern é VARCHAR(4)).
    from app.models import Item, Syllable, Word
    content = client.get("/v1/content").json()
    assert all(len(syllable["pattern"]) <= Syllable.__table__.c.pattern.type.length for syllable in content["syllables"])
    assert all(len(word["text"]) <= Word.__table__.c.text.type.length for word in content["words"])
    columns = Item.__table__.c
    for track in content["tracks"]:
        for unit in track["units"]:
            for item in unit["items"]:
                assert len(item["id"]) <= columns.id.type.length and len(item["answer"]) <= columns.answer.type.length
                assert len(item["instruction"]) <= columns.instruction.type.length and len(item["tts_fallback_text"] or "") <= columns.tts_fallback_text.type.length
                assert len(item["target_id"] or "") <= columns.target_id.type.length and len(item["context_word"] or "") <= columns.context_word.type.length
