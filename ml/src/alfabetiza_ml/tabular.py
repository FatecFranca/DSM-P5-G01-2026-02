from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .difficulty import DifficultyModel, extract_features, load_model


@dataclass(frozen=True)
class WordFeatures:
    syllables: int
    length: int
    accented: bool = False
    consonant_clusters: int = 0
    frequency: float = 0.5
    success_rate: float | None = None
    mean_response_seconds: float | None = None
    attempts: int = 0
    text: str | None = None
    syllable_text: str | None = None


def _rule_score(features: WordFeatures) -> str:
    score = features.syllables + features.length / 5 + features.consonant_clusters
    score += 1 if features.accented else 0
    score += max(0.0, 0.5 - features.frequency)
    if features.attempts >= 10 and features.success_rate is not None:
        score += (1 - features.success_rate) * 2
        score += 0.5 if (features.mean_response_seconds or 0) > 12 else 0
    return "facil" if score < 3 else "medio" if score < 5 else "dificil"


def classify_word_difficulty(features: WordFeatures, model: DifficultyModel | None = None) -> str:
    """Classifica dificuldade lexical.

    Preferência: manifesto supervisionado (`difficulty.py`) quando disponível e promovido.
    Fallback: regras bootstrap históricas (sempre seguras sem artefato).
    """
    if model is not None and model.promotion_allowed and features.text and features.syllable_text:
        return model.predict(extract_features(features.text, features.syllable_text, features.frequency))
    return _rule_score(features)


def load_difficulty_model(path: str | Path | None = None) -> DifficultyModel | None:
    candidate = Path(path) if path else Path(__file__).resolve().parents[2] / "artifacts" / "difficulty_manifest.json"
    if not candidate.exists():
        return None
    model = load_model(candidate)
    return model if model.promotion_allowed else None


def recommend_activity(*, difficulty: str, recent_error_rate: float, response_seconds: float, audio_repeats: int, real_samples: int = 0) -> dict:
    """Classificador B: fallback explícito até existir volume real consentido."""
    risk = recent_error_rate >= 0.6 or response_seconds > 25 or audio_repeats >= 3
    if risk:
        exercise = "ouvir_e_escolher"
    elif difficulty == "dificil" or recent_error_rate >= 0.35:
        exercise = "reconhecer_letra"
    else:
        exercise = "complete_word"
    return {"exercise": exercise, "abandonmentRisk": risk, "source": "rules-fallback", "trainingSamples": real_samples}
