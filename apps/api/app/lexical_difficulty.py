"""Inferência local do classificador lexical do Prosa (manifesto em ml/artifacts).

Implementação em Python puro — a API não depende do pacote ml em runtime.
A curadoria em content_data.WORDS continua soberana.
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = REPO_ROOT / "ml" / "artifacts" / "difficulty_manifest.json"
ACCENT_CHARS = set("ÁÉÍÓÚÂÊÔÃÕÀÜÇ")
VOWELS = set("AEIOU")


def _strip_marks(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(ch) != "Mn")


def _consonant_clusters(text: str) -> int:
    base = _strip_marks(text)
    count = runs = 0
    for ch in base:
        if ch not in VOWELS and ch.isalpha():
            runs += 1
            if runs == 2:
                count += 1
        else:
            runs = 0
    return count


def _syllable_shape(syllable: str) -> str:
    shape = re.sub(r"[AEIOU]", "V", re.sub(r"[^AEIOU]", "C", _strip_marks(syllable)))
    return shape if shape else "outro"


def extract_features(text: str, syllables: list[str] | str, frequency: float = 0.5) -> list[float]:
    parts = syllables.split("-") if isinstance(syllables, str) else list(syllables)
    parts = [part for part in parts if part]
    shapes = [_syllable_shape(part) for part in parts]
    return [
        float(max(1, len(parts))),
        float(len(text)),
        1.0 if any(ch in ACCENT_CHARS for ch in text.upper()) else 0.0,
        float(_consonant_clusters(text)),
        float(max((len(part) for part in parts), default=len(text))),
        float(sum(1 for shape in shapes if shape in {"CVC", "VC", "CCVC"})),
        float(sum(1 for shape in shapes if shape.startswith("CC"))),
        float(sum(1 for shape in shapes if shape not in {"V", "CV", "CVV"})),
        float(frequency),
    ]


def _predict(payload: dict, features: list[float]) -> str:
    means = payload["means"]
    stds = payload["stds"]
    z = [(value - mean) / std for value, mean, std in zip(features, means, stds, strict=True)]
    scores = [
        intercept + sum(weight * feature for weight, feature in zip(coef, z, strict=True))
        for intercept, coef in zip(payload["intercepts"], payload["coefs"], strict=True)
    ]
    peak = max(scores)
    exps = [math.exp(score - peak) for score in scores]
    total = sum(exps) or 1.0
    proba = {label: value / total for label, value in zip(payload["labels"], exps, strict=True)}
    return max(proba, key=proba.get)


@lru_cache(maxsize=4)
def _manifest(path: str) -> dict | None:
    candidate = Path(path)
    if not candidate.exists():
        return None
    payload = json.loads(candidate.read_text(encoding="utf-8"))
    if not payload.get("promotion_allowed"):
        return None
    return payload


def classify_word(text: str, syllables: list[str] | str, frequency: float = 0.5, *, manifest_path: Path | None = None) -> str | None:
    """Devolve facil|medio|dificil ou None se o manifesto não estiver disponível/promovido."""
    payload = _manifest(str(manifest_path or DEFAULT_MANIFEST))
    if payload is None:
        return None
    return _predict(payload, extract_features(text, syllables, frequency))
