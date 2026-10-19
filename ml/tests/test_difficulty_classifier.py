import json
from pathlib import Path

from alfabetiza_ml.difficulty import FEATURE_NAMES, LABELS, classify_with_model, extract_features, load_model
from alfabetiza_ml.tabular import WordFeatures, classify_word_difficulty
from alfabetiza_ml.train_difficulty import train

ROOT = Path(__file__).resolve().parents[1]
LABELS_PATH = ROOT / "data" / "difficulty_labels.json"


def test_feature_vector_has_stable_length_and_syllabic_signals():
    features = extract_features("PRATO", "PRA-TO", 0.5)
    assert len(features) == len(FEATURE_NAMES)
    assert features[0] == 2  # syllable_count
    assert features[3] >= 1  # consonant_clusters
    assert features[6] >= 1  # onset_clusters (PRA)


def test_supervised_training_promotes_and_roundtrips_manifest(tmp_path):
    out = tmp_path / "difficulty_manifest.json"
    report_path = tmp_path / "difficulty_eval.json"
    report = train(LABELS_PATH, out, report_path)
    assert report["metrics"]["macro_f1"] >= 0.7
    assert report["promotion_allowed"] is True
    model = load_model(out)
    assert model.promotion_allowed is True
    assert set(model.labels) == set(LABELS)
    assert classify_with_model(model, "CASA", "CA-SA", 0.9) == "facil"
    assert classify_with_model(model, "TRABALHO", "TRA-BA-LHO", 0.7) == "dificil"
    assert classify_with_model(model, "PRATO", "PRA-TO", 0.55) in LABELS


def test_rule_fallback_remains_available_without_manifest():
    assert classify_word_difficulty(WordFeatures(syllables=1, length=3, frequency=0.9)) == "facil"
    assert classify_word_difficulty(WordFeatures(syllables=4, length=10, accented=True, consonant_clusters=2, frequency=0.1)) == "dificil"


def test_labels_file_covers_three_classes():
    rows = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
    difficulties = {row["difficulty"] for row in rows}
    assert difficulties == set(LABELS)
    assert len(rows) >= 30
