"""Treina e salva os modelos LDA e LR selecionados no benchmark humano."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from .benchmark_human_ratings import CORPUS, ROOT, consolidated_labels, features, models

ARTIFACT_DIR = ROOT / "ml" / "artifacts"
MODEL_NAMES = ("SVM", "LR", "LDA")


def training_data() -> tuple[pd.DataFrame, pd.Series, dict]:
    labels = consolidated_labels()
    corpus = pd.read_excel(CORPUS).drop_duplicates("PALAVRA")
    data = labels.merge(corpus, on="PALAVRA", how="inner").drop_duplicates("LEMA")
    return features(data), data["DIFICULDADE"], {
        "source_corpus": str(CORPUS),
        "training_rows": len(data),
        "class_counts": data["DIFICULDADE"].value_counts().to_dict(),
        "feature_names": list(features(data).columns),
        "random_state": 7,
    }


def train_and_save() -> dict:
    X, y, metadata = training_data()
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    saved = {}
    for name in MODEL_NAMES:
        model = models()[name]
        model.fit(X, y)
        path = ARTIFACT_DIR / f"{name.lower()}_dificuldade_humana.joblib"
        joblib.dump({"model": model, "metadata": metadata}, path)
        loaded = joblib.load(path)
        if loaded["model"].predict(X.iloc[:5]).tolist() != model.predict(X.iloc[:5]).tolist():
            raise RuntimeError(f"falha ao validar a serialização de {name}")
        saved[name] = str(path)
    manifest = {"models": saved, **metadata}
    manifest_path = ARTIFACT_DIR / "modelos_dificuldade_humana_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"manifest": str(manifest_path), **manifest}


if __name__ == "__main__":
    print(json.dumps(train_and_save(), ensure_ascii=False))
