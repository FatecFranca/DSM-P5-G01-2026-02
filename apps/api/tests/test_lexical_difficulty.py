from pathlib import Path

from app.lexical_difficulty import classify_word

MANIFEST = Path(__file__).resolve().parents[3] / "ml" / "artifacts" / "difficulty_manifest.json"


def test_lexical_classifier_manifest_classifies_syllabic_extremes():
    if not MANIFEST.exists():
        return
    assert classify_word("CASA", ["CA", "SA"], 0.9, manifest_path=MANIFEST) == "facil"
    assert classify_word("TRABALHO", ["TRA", "BA", "LHO"], 0.7, manifest_path=MANIFEST) == "dificil"
