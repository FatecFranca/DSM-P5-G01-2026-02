import numpy as np

from alfabetiza_ml.demo_data import make_demo_dataset
from alfabetiza_ml.preprocessing import preprocess_image
from alfabetiza_ml.inference import infer_onnx
from alfabetiza_ml.tabular import WordFeatures, classify_word_difficulty, recommend_activity
from alfabetiza_ml.train import train, writer_split


def test_writer_split_has_no_leakage():
    _, _, writers = make_demo_dataset(writers=8, samples_per_letter=1)
    train_idx, test_idx = writer_split(writers)
    assert set(writers[train_idx]).isdisjoint(writers[test_idx])


def test_preprocessing_centers_and_normalizes_light_background():
    image = np.ones((30, 20), dtype=np.float32)
    image[4:25, 8:11] = 0
    result = preprocess_image(image)
    assert result.shape == (16, 16)
    assert result.dtype == np.float32
    assert result.max() <= 1 and result.min() >= 0
    assert result[:, 6:10].sum() > 0


def test_training_is_reproducible_and_writes_manifest(tmp_path):
    first = train(tmp_path / "a", seed=7)
    second = train(tmp_path / "b", seed=7)
    assert first["metrics"]["f1_macro"] == second["metrics"]["f1_macro"]
    assert first["artifactSha256"] == second["artifactSha256"]
    assert set(first["dataset"]["trainWriters"]).isdisjoint(first["dataset"]["testWriters"])
    assert first["dataset"]["promotionAllowed"] is False


def test_exported_onnx_runs_when_optional_runtime_is_installed(tmp_path):
    try:
        import onnxruntime as ort
    except ImportError:
        return
    manifest = train(tmp_path)
    assert manifest["export"]["format"] == "onnx"
    session = ort.InferenceSession(str(tmp_path / "letter_classifier.onnx"), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    label, probabilities = session.run(None, {input_name: np.zeros((1, 256), dtype=np.float32)})
    assert label.shape == (1,)
    assert probabilities.shape == (1, 26)
    assert np.isclose(probabilities.sum(), 1.0)
    result = infer_onnx(np.zeros((16, 16), dtype=np.float32), tmp_path)
    assert set(result) == {"className", "confidence", "uncertain", "modelVersion"}
    assert 0 <= result["confidence"] <= 1


def test_tabular_a_and_b_have_safe_rule_fallbacks():
    assert classify_word_difficulty(WordFeatures(syllables=1, length=3, frequency=0.9)) == "facil"
    result = recommend_activity(difficulty="dificil", recent_error_rate=0.7, response_seconds=8, audio_repeats=0)
    assert result == {"exercise": "ouvir_e_escolher", "abandonmentRisk": True, "source": "rules-fallback", "trainingSamples": 0}
