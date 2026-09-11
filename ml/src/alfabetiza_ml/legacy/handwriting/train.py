from __future__ import annotations

import argparse
import hashlib
import json
import platform
import time
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupShuffleSplit

from ... import __version__
from .demo_data import LETTERS, make_demo_dataset
from .preprocessing import flatten_images


def writer_split(writer_ids: np.ndarray, test_size: float = 0.25, seed: int = 20260910):
    train, test = next(GroupShuffleSplit(1, test_size=test_size, random_state=seed).split(writer_ids, groups=writer_ids))
    if set(writer_ids[train]) & set(writer_ids[test]):
        raise RuntimeError("writer leakage detected")
    return train, test


def metrics(y_true, y_pred, classes=LETTERS):
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    return {"accuracy": accuracy_score(y_true, y_pred), "precision_macro": precision, "recall_macro": recall, "f1_macro": f1,
            "confusion_matrix": confusion_matrix(y_true, y_pred, labels=classes).tolist(), "class_order": list(classes)}


def train(output: Path, seed: int = 20260910) -> dict:
    np.random.seed(seed)
    images, labels, writers = make_demo_dataset(seed=seed)
    x = flatten_images(images)
    train_idx, test_idx = writer_split(writers, seed=seed)
    baseline = DummyClassifier(strategy="most_frequent").fit(x[train_idx], labels[train_idx])
    model = LogisticRegression(max_iter=500, random_state=seed).fit(x[train_idx], labels[train_idx])
    output.mkdir(parents=True, exist_ok=True)
    baseline_metrics = metrics(labels[test_idx], baseline.predict(x[test_idx]))
    started = time.perf_counter()
    predictions = model.predict(x[test_idx])
    latency_ms = (time.perf_counter() - started) * 1000 / len(test_idx)
    artifact = output / "letter_classifier.joblib"
    joblib.dump(model, artifact)
    export = {"format": "joblib", "path": artifact.name, "onnxAvailable": False,
              "reason": "Install the 'onnx' extra to generate the mobile artifact."}
    try:
        from skl2onnx import to_onnx
        onnx_path = output / "letter_classifier.onnx"
        onnx_path.write_bytes(to_onnx(
            model,
            x[:1].astype(np.float32),
            target_opset=17,
            options={id(model): {"zipmap": False}},
        ).SerializeToString())
        export = {"format": "onnx", "path": onnx_path.name, "onnxAvailable": True}
    except ImportError:
        pass
    model_metrics = metrics(labels[test_idx], predictions)
    model_metrics["latency_ms_per_sample_python"] = latency_ms
    manifest = {"schemaVersion": 1, "modelVersion": __version__, "createdBy": "deterministic-demo-pipeline",
                "seed": seed, "dataset": {"kind": "synthetic-demo", "promotionAllowed": False, "writers": len(set(writers)),
                "trainWriters": sorted(set(writers[train_idx])), "testWriters": sorted(set(writers[test_idx]))},
                "input": {"shape": [1, 256], "imageSize": [16, 16], "foreground": "white", "classes": list(LETTERS)},
                "output": {"className": "string", "confidence": "0..1", "uncertain": "confidence < 0.65", "modelVersion": __version__},
                "baselineMetrics": baseline_metrics, "metrics": model_metrics, "export": export,
                "runtime": {"python": platform.python_version(), "scikitLearn": sklearn.__version__}}
    artifact_path = output / export["path"]
    manifest["artifactSha256"] = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    manifest["artifactBytes"] = artifact_path.stat().st_size
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (output / "metrics.json").write_text(json.dumps({"baseline": baseline_metrics, "adjusted": model_metrics}, indent=2), encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("artifacts"))
    parser.add_argument("--seed", type=int, default=20260910)
    args = parser.parse_args()
    print(json.dumps(train(args.output, args.seed), indent=2))


if __name__ == "__main__":
    main()
