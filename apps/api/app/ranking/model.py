"""Modelo de ranking servido em Python puro a partir de um manifesto JSON (coeficientes de regressão logística).

Treino e avaliação vivem em ml/ (alfabetiza_ml.train_ranking). O servidor só aplica a fórmula e nunca importa numpy ou
scikit-learn. Um manifesto sem `promotion_allowed` ou com features diferentes das de FEATURE_NAMES é recusado.
"""
import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from .features import FEATURE_NAMES


@dataclass(frozen=True)
class RankingModel:
    model_version: str
    policy_version: str
    means: tuple[float, ...]
    stds: tuple[float, ...]
    coef: tuple[float, ...]
    intercept: float
    calibration_a: float
    calibration_b: float
    valid_range: tuple[float, float]

    def predict(self, features: list[float]) -> float:
        z = self.intercept + sum(weight * (value - mean) / std for weight, value, mean, std in zip(self.coef, features, self.means, self.stds))
        raw = 1 / (1 + math.exp(-max(-30.0, min(30.0, z))))
        # Calibração de Platt sobre o logit: a=1, b=0 é identidade.
        logit = math.log(raw / (1 - raw)) if 0 < raw < 1 else (30.0 if raw >= 1 else -30.0)
        return 1 / (1 + math.exp(-(self.calibration_a * logit + self.calibration_b)))

    def in_range(self, p: float) -> bool:
        return self.valid_range[0] <= p <= self.valid_range[1]


class InvalidManifest(ValueError):
    pass


def parse_manifest(data: dict) -> RankingModel:
    required = {"model_version", "policy_version", "features", "means", "stds", "coef", "intercept", "promotion_allowed"}
    if missing := required - data.keys():
        raise InvalidManifest(f"manifesto sem campos: {', '.join(sorted(missing))}")
    if not data["promotion_allowed"]:
        raise InvalidManifest("manifesto não promovido: o gate de avaliação não aprovou este modelo")
    if tuple(data["features"]) != FEATURE_NAMES:
        raise InvalidManifest("features do manifesto diferem das do servidor")
    size = len(FEATURE_NAMES)
    if not (len(data["means"]) == len(data["stds"]) == len(data["coef"]) == size) or any(std <= 0 for std in data["stds"]):
        raise InvalidManifest("vetores do manifesto com tamanho ou desvio inválido")
    calibration = data.get("calibration") or {}
    valid_range = tuple(data.get("valid_range") or (0.02, 0.98))
    return RankingModel(
        model_version=str(data["model_version"]), policy_version=str(data["policy_version"]),
        means=tuple(float(value) for value in data["means"]), stds=tuple(float(value) for value in data["stds"]), coef=tuple(float(value) for value in data["coef"]),
        intercept=float(data["intercept"]), calibration_a=float(calibration.get("a", 1.0)), calibration_b=float(calibration.get("b", 0.0)),
        valid_range=(float(valid_range[0]), float(valid_range[1])),
    )


@lru_cache(maxsize=4)
def load_model(path: str) -> RankingModel:
    """Cacheado por caminho: trocar o artefato é trocar a variável de ambiente e reiniciar (ou chamar `load_model.cache_clear()`)."""
    return parse_manifest(json.loads(Path(path).read_text(encoding="utf-8")))
