"""Treino do classificador supervisionado de dificuldade lexical (Prosa §3.8).

Uso:
  python -m alfabetiza_ml.train_difficulty --out artifacts/difficulty_manifest.json --report reports/difficulty_eval.json
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedKFold

from .difficulty import FEATURE_NAMES, LABELS, DifficultyModel, extract_features

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LABELS = ROOT / "data" / "difficulty_labels.json"
MIN_MACRO_F1 = 0.7
MIN_ROWS = 30
EPS = 1e-6


def load_rows(path: Path) -> list[dict]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"conjunto de rótulos vazio: {path}")
    for row in rows:
        if row.get("difficulty") not in LABELS:
            raise ValueError(f"rótulo inválido em {row.get('text')}: {row.get('difficulty')}")
    return rows


def matrix(rows: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    X = np.array([extract_features(row["text"], row["syllables"], float(row.get("frequency", 0.5))) for row in rows], dtype=float)
    y = np.array([row["difficulty"] for row in rows])
    return X, y


def fit_model(X: np.ndarray, y: np.ndarray) -> DifficultyModel:
    means = X.mean(axis=0)
    stds = X.std(axis=0)
    stds[stds < EPS] = 1.0
    Z = (X - means) / stds
    clf = LogisticRegression(max_iter=2000, solver="lbfgs", random_state=7)
    clf.fit(Z, y)
    label_order = list(clf.classes_)
    return DifficultyModel(
        means=tuple(float(value) for value in means),
        stds=tuple(float(value) for value in stds),
        intercepts=tuple(float(value) for value in clf.intercept_),
        coefs=tuple(tuple(float(value) for value in row) for row in clf.coef_),
        labels=tuple(str(label) for label in label_order),
        version=datetime.now(timezone.utc).strftime("difficulty-%Y%m%d"),
        promotion_allowed=False,
    )


def cross_validate(X: np.ndarray, y: np.ndarray, folds: int = 5) -> dict:
    counts = Counter(y.tolist())
    n_splits = min(folds, min(counts.values()))
    if n_splits < 2:
        raise ValueError("cada classe precisa de ao menos 2 exemplos para validação cruzada")
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=7)
    y_true: list[str] = []
    y_pred: list[str] = []
    for train_idx, test_idx in skf.split(X, y):
        model = fit_model(X[train_idx], y[train_idx])
        for features, label in zip(X[test_idx], y[test_idx], strict=True):
            y_true.append(str(label))
            y_pred.append(model.predict(features.tolist()))
    return {
        "folds": n_splits,
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=list(LABELS), average="macro")),
        "report": classification_report(y_true, y_pred, labels=list(LABELS), output_dict=True),
        "class_counts": dict(counts),
    }


def train(labels_path: Path, out: Path, report_path: Path) -> dict:
    rows = load_rows(labels_path)
    X, y = matrix(rows)
    if len(rows) < MIN_ROWS:
        raise ValueError(f"mínimo de {MIN_ROWS} exemplos rotulados; recebido {len(rows)}")
    metrics = cross_validate(X, y)
    model = fit_model(X, y)
    promoted = metrics["macro_f1"] >= MIN_MACRO_F1 and len(rows) >= MIN_ROWS and len(set(y.tolist())) == len(LABELS)
    model = DifficultyModel(
        means=model.means,
        stds=model.stds,
        intercepts=model.intercepts,
        coefs=model.coefs,
        labels=model.labels,
        version=model.version,
        promotion_allowed=promoted,
    )
    manifest = model.to_manifest()
    manifest["trained_on"] = str(labels_path.as_posix())
    manifest["training_rows"] = len(rows)
    manifest["feature_names"] = list(FEATURE_NAMES)
    manifest["gate"] = {"min_macro_f1": MIN_MACRO_F1, "min_rows": MIN_ROWS, "passed": promoted}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "labels_path": str(labels_path),
        "manifest_path": str(out),
        "promotion_allowed": promoted,
        "metrics": metrics,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Treina o classificador de dificuldade lexical do Prosa")
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "difficulty_manifest.json")
    parser.add_argument("--report", type=Path, default=ROOT / "reports" / "difficulty_eval.json")
    args = parser.parse_args()
    report = train(args.labels, args.out, args.report)
    print(json.dumps({"promotion_allowed": report["promotion_allowed"], "macro_f1": report["metrics"]["macro_f1"], "accuracy": report["metrics"]["accuracy"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
