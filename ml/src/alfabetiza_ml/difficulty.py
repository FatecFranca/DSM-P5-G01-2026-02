"""Classificador supervisionado de dificuldade lexical (fácil / médio / difícil).

Features derivadas da estrutura silábica e da frequência. O manifesto exporta coeficientes
para inferência em Python puro (API e scripts), sem depender de scikit-learn em runtime.
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

LABELS = ("facil", "medio", "dificil")
FEATURE_NAMES = (
    "syllable_count",
    "length",
    "accented",
    "consonant_clusters",
    "max_syllable_len",
    "cvc_like",
    "onset_clusters",
    "complex_shapes",
    "frequency",
)
ACCENT_CHARS = set("ÁÉÍÓÚÂÊÔÃÕÀÜÇ")
VOWELS = set("AEIOU")


def strip_marks(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(ch) != "Mn")


def consonant_clusters(text: str) -> int:
    base = strip_marks(text)
    count = runs = 0
    for ch in base:
        if ch not in VOWELS and ch.isalpha():
            runs += 1
            if runs == 2:
                count += 1
        else:
            runs = 0
    return count


def syllable_shape(syllable: str) -> str:
    shape = re.sub(r"[AEIOU]", "V", re.sub(r"[^AEIOU]", "C", strip_marks(syllable)))
    return shape if shape else "outro"


def extract_features(text: str, syllables: str | list[str], frequency: float = 0.5) -> list[float]:
    parts = syllables.split("-") if isinstance(syllables, str) else list(syllables)
    parts = [part for part in parts if part]
    shapes = [syllable_shape(part) for part in parts]
    return [
        float(max(1, len(parts))),
        float(len(text)),
        1.0 if any(ch in ACCENT_CHARS for ch in text.upper()) else 0.0,
        float(consonant_clusters(text)),
        float(max((len(part) for part in parts), default=len(text))),
        float(sum(1 for shape in shapes if shape in {"CVC", "VC", "CCVC"})),
        float(sum(1 for shape in shapes if shape.startswith("CC"))),
        float(sum(1 for shape in shapes if shape not in {"V", "CV", "CVV"})),
        float(frequency),
    ]


@dataclass(frozen=True)
class DifficultyModel:
    means: tuple[float, ...]
    stds: tuple[float, ...]
    intercepts: tuple[float, ...]
    coefs: tuple[tuple[float, ...], ...]
    labels: tuple[str, ...]
    version: str
    promotion_allowed: bool

    def scores(self, features: list[float]) -> list[float]:
        z = [(value - mean) / std for value, mean, std in zip(features, self.means, self.stds, strict=True)]
        return [
            intercept + sum(weight * feature for weight, feature in zip(coef, z, strict=True))
            for intercept, coef in zip(self.intercepts, self.coefs, strict=True)
        ]

    def predict_proba(self, features: list[float]) -> dict[str, float]:
        raw = self.scores(features)
        peak = max(raw)
        exps = [math.exp(score - peak) for score in raw]
        total = sum(exps) or 1.0
        return {label: value / total for label, value in zip(self.labels, exps, strict=True)}

    def predict(self, features: list[float]) -> str:
        proba = self.predict_proba(features)
        return max(proba, key=proba.get)

    def to_manifest(self) -> dict:
        return {
            "model": "lexical-difficulty-logreg",
            "version": self.version,
            "promotion_allowed": self.promotion_allowed,
            "feature_names": list(FEATURE_NAMES),
            "labels": list(self.labels),
            "means": list(self.means),
            "stds": list(self.stds),
            "intercepts": list(self.intercepts),
            "coefs": [list(row) for row in self.coefs],
        }

    @classmethod
    def from_manifest(cls, payload: dict) -> "DifficultyModel":
        return cls(
            means=tuple(float(value) for value in payload["means"]),
            stds=tuple(float(value) for value in payload["stds"]),
            intercepts=tuple(float(value) for value in payload["intercepts"]),
            coefs=tuple(tuple(float(value) for value in row) for row in payload["coefs"]),
            labels=tuple(payload["labels"]),
            version=str(payload.get("version", "unknown")),
            promotion_allowed=bool(payload.get("promotion_allowed", False)),
        )


def load_model(path: Path) -> DifficultyModel:
    return DifficultyModel.from_manifest(json.loads(path.read_text(encoding="utf-8")))


def classify_with_model(model: DifficultyModel, text: str, syllables: str | list[str], frequency: float = 0.5) -> str:
    return model.predict(extract_features(text, syllables, frequency))
