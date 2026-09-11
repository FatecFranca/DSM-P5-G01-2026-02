import json

from sqlalchemy import select

from app import seed
from app.content_lint import lint_content
from app.db import SessionLocal
from app.models import Word
from app.word_bank import load_word_bank


def test_word_bank_has_at_least_1000_filtered_words():
    words = load_word_bank()
    assert len(words) >= 1000
    assert words[0]["text"] == "QUE"
    assert any(item["text"] == "VOCÊ" for item in words)
    assert all(len(item["text"]) >= 3 for item in words)
    assert all(item["raw_frequency"] >= 10 for item in words)


def test_word_bank_entries_become_candidates_and_enrich_curated_words(client, monkeypatch, tmp_path):
    bank = tmp_path / "word_bank.json"
    bank.write_text(json.dumps([
        {"text": "CASA", "syllables": "CA-SA", "frequency": 0.91, "raw_frequency": 1200, "difficulty": "facil", "source": "corpus-santos-toni"},
        {"text": "JANELA", "syllables": "JA-NE-LA", "frequency": 0.42, "raw_frequency": 80, "difficulty": "medio", "source": "corpus-santos-toni"},
    ]), encoding="utf-8")
    monkeypatch.setattr(seed, "WORD_BANK_PATH", bank)
    seed.seed_content()
    seed.seed_content()  # idempotente

    with SessionLocal() as db:
        casa = db.scalar(select(Word).where(Word.text == "CASA"))
        janela = db.scalar(select(Word).where(Word.text == "JANELA"))
        assert casa.review_status == "pending" and casa.source == "curadoria" and casa.frequency == 0.91 and casa.frequency_source == "corpus-santos-toni"
        assert janela.review_status == "candidate" and janela.syllables == ["JA", "NE", "LA"] and janela.required_letters == "AELNJ"
        assert db.scalar(select(Word).where(Word.text == "JANELA").where(Word.review_status == "candidate")) is not None

    content = client.get("/v1/content").json()
    assert "JANELA" not in {word["text"] for word in content["words"]}
    assert lint_content(content) == []
