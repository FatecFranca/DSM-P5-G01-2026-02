"""Treino e avaliação do modelo de ranking (docs/adr/0004).

Modelo: regressão logística sobre as features do servidor, padronizada, com calibração de Platt ajustada numa fatia
de validação. Dois cortes obrigatórios: temporal (passado → futuro) e por usuário (usuários inéditos, mede cold start).
O manifesto só recebe `promotion_allowed: true` se o modelo bater TODAS as baselines em log-loss nos dois cortes e
ficar abaixo do limiar de ECE. Sem volume suficiente o gate reprova — e isso é o resultado correto.

Uso: python -m alfabetiza_ml.train_ranking --database-url ... --out artifacts/ranking_manifest.json --report reports/ranking_eval.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score

from app.ranking.features import FEATURE_NAMES
from .replay import Row, load_from_database, replay

POLICY_VERSION = "session-v1"
CONSTANT_BASELINE = 0.85
ECE_THRESHOLD = 0.05
MIN_ROWS = 200
EPS = 1e-6


@dataclass
class Metrics:
    rows: int
    log_loss: float
    brier: float
    ece: float
    auc: float | None
    reliability: list[dict]


def clip(values: np.ndarray) -> np.ndarray:
    return np.clip(values, EPS, 1 - EPS)


def expected_calibration_error(y: np.ndarray, p: np.ndarray, bins: int = 10) -> tuple[float, list[dict]]:
    edges = np.linspace(0, 1, bins + 1)
    ece, table = 0.0, []
    for low, high in zip(edges[:-1], edges[1:]):
        mask = (p >= low) & (p < high if high < 1 else p <= high)
        if not mask.any(): continue
        confidence, accuracy, weight = float(p[mask].mean()), float(y[mask].mean()), float(mask.mean())
        ece += weight * abs(confidence - accuracy)
        table.append({"bin": [round(float(low), 2), round(float(high), 2)], "count": int(mask.sum()), "confidence": round(confidence, 4), "accuracy": round(accuracy, 4)})
    return ece, table


def metrics_for(y: np.ndarray, p: np.ndarray) -> Metrics:
    p = clip(p)
    auc = float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None
    ece, table = expected_calibration_error(y, p)
    return Metrics(rows=int(len(y)), log_loss=float(log_loss(y, p, labels=[0, 1])), brier=float(brier_score_loss(y, p)), ece=float(ece), auc=auc, reliability=table)


def temporal_split(rows: list[Row], test_fraction: float = 0.2) -> tuple[list[Row], list[Row]]:
    ordered = sorted(rows, key=lambda row: row.occurred_at)
    cut = int(len(ordered) * (1 - test_fraction))
    return ordered[:cut], ordered[cut:]


def user_split(rows: list[Row], test_fraction: float = 0.2, seed: int = 7) -> tuple[list[Row], list[Row]]:
    users = sorted({row.user_id for row in rows})
    held = set(random.Random(seed).sample(users, k=max(1, int(len(users) * test_fraction)))) if len(users) > 1 else set()
    return [row for row in rows if row.user_id not in held], [row for row in rows if row.user_id in held]


@dataclass
class Fitted:
    means: list[float]
    stds: list[float]
    coef: list[float]
    intercept: float
    calibration_a: float
    calibration_b: float

    def predict(self, X: np.ndarray) -> np.ndarray:
        z = self.intercept + ((X - np.array(self.means)) / np.array(self.stds)) @ np.array(self.coef)
        raw = clip(1 / (1 + np.exp(-np.clip(z, -30, 30))))
        logit = np.log(raw / (1 - raw))
        return 1 / (1 + np.exp(-(self.calibration_a * logit + self.calibration_b)))


def fit(train: list[Row], seed: int = 7) -> Fitted:
    X = np.array([row.features for row in train], dtype=float); y = np.array([row.label for row in train])
    means = X.mean(axis=0); stds = X.std(axis=0); stds[stds < EPS] = 1.0
    Z = (X - means) / stds
    # A última fatia temporal do treino calibra; o modelo é ajustado no resto.
    cut = int(len(train) * 0.8)
    model = LogisticRegression(max_iter=1000, C=1.0, random_state=seed).fit(Z[:cut], y[:cut])
    raw = clip(model.predict_proba(Z[cut:])[:, 1]) if cut < len(train) and len(np.unique(y[cut:])) > 1 else None
    a, b = 1.0, 0.0
    if raw is not None:
        logit = np.log(raw / (1 - raw)).reshape(-1, 1)
        platt = LogisticRegression(C=1e6, max_iter=1000).fit(logit, y[cut:])
        a, b = float(platt.coef_[0][0]), float(platt.intercept_[0])
    return Fitted(means=means.tolist(), stds=stds.tolist(), coef=model.coef_[0].tolist(), intercept=float(model.intercept_[0]), calibration_a=a, calibration_b=b)


def evaluate(fitted: Fitted, test: list[Row]) -> dict:
    y = np.array([row.label for row in test]); X = np.array([row.features for row in test], dtype=float)
    return {
        "model": asdict(metrics_for(y, fitted.predict(X))),
        "baseline_rules": asdict(metrics_for(y, np.array([row.p_rules for row in test]))),
        "baseline_item_history": asdict(metrics_for(y, np.array([row.p_item_history for row in test]))),
        "baseline_constant": asdict(metrics_for(y, np.full(len(y), CONSTANT_BASELINE))),
    }


def gate(evaluations: dict[str, dict], min_rows: int = MIN_ROWS, ece_threshold: float = ECE_THRESHOLD) -> tuple[bool, list[str]]:
    """Promove só se, em TODOS os cortes, o modelo bate todas as baselines em log-loss e calibra abaixo do limiar."""
    reasons: list[str] = []
    for name, evaluation in evaluations.items():
        model = evaluation["model"]
        if model["rows"] < min_rows: reasons.append(f"{name}: {model['rows']} linhas < {min_rows}")
        if model["ece"] > ece_threshold: reasons.append(f"{name}: ECE {model['ece']:.3f} > {ece_threshold}")
        for baseline in ("baseline_rules", "baseline_item_history", "baseline_constant"):
            if model["log_loss"] >= evaluation[baseline]["log_loss"]: reasons.append(f"{name}: log-loss {model['log_loss']:.4f} não bate {baseline} ({evaluation[baseline]['log_loss']:.4f})")
    return not reasons, reasons


def build_manifest(fitted: Fitted, evaluations: dict[str, dict], rows: list[Row], *, promotion_allowed: bool, reasons: list[str], trained_at: datetime | None = None) -> dict:
    trained_at = trained_at or datetime.now(timezone.utc)
    feature_hash = hashlib.sha256("|".join(FEATURE_NAMES).encode()).hexdigest()[:16]
    version = f"ranking-{trained_at:%Y%m%d}-{feature_hash[:6]}"
    return {
        "model_version": version, "policy_version": POLICY_VERSION, "features": list(FEATURE_NAMES), "feature_hash": feature_hash,
        "means": fitted.means, "stds": fitted.stds, "coef": fitted.coef, "intercept": fitted.intercept,
        "calibration": {"a": fitted.calibration_a, "b": fitted.calibration_b}, "valid_range": [0.02, 0.98],
        "trained_on": {"rows": len(rows), "users": len({row.user_id for row in rows}), "items": len({row.item_id for row in rows}),
                       "from": min(row.occurred_at for row in rows).isoformat() if rows else None, "to": max(row.occurred_at for row in rows).isoformat() if rows else None, "trained_at": trained_at.isoformat()},
        "evaluations": evaluations, "promotion_allowed": promotion_allowed, "gate_reasons": reasons,
    }


def train_and_evaluate(rows: list[Row], seed: int = 7) -> dict:
    if len(rows) < 20: raise ValueError(f"poucas tentativas para treinar: {len(rows)}")
    evaluations = {}
    for name, splitter in (("temporal", temporal_split), ("by_user", lambda data: user_split(data, seed=seed))):
        train, test = splitter(rows)
        if not train or not test or len({row.label for row in train}) < 2: raise ValueError(f"corte {name} sem dados suficientes")
        evaluations[name] = evaluate(fit(train, seed), test)
    fitted = fit(sorted(rows, key=lambda row: row.occurred_at), seed)
    promoted, reasons = gate(evaluations)
    return build_manifest(fitted, evaluations, rows, promotion_allowed=promoted, reasons=reasons)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--include-without-consent", action="store_true", help="NÃO usar em produção: ignora o consentimento de pesquisa")
    parser.add_argument("--out", default="artifacts/ranking_manifest.json")
    parser.add_argument("--report", default="reports/ranking_eval.json")
    args = parser.parse_args()
    attempts, metas = load_from_database(args.database_url, consent_only=not args.include_without_consent)
    manifest = train_and_evaluate(replay(attempts, metas))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True); Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.report).write_text(json.dumps({key: manifest[key] for key in ("model_version", "trained_on", "evaluations", "promotion_allowed", "gate_reasons")}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    status = "PROMOVIDO" if manifest["promotion_allowed"] else "REPROVADO no gate: " + "; ".join(manifest["gate_reasons"])
    print(f"{manifest['model_version']}: {status}")
    for name, evaluation in manifest["evaluations"].items():
        print(f"  {name}: modelo log-loss {evaluation['model']['log_loss']:.4f} ECE {evaluation['model']['ece']:.3f} | regras {evaluation['baseline_rules']['log_loss']:.4f} | histórico {evaluation['baseline_item_history']['log_loss']:.4f} | constante {evaluation['baseline_constant']['log_loss']:.4f}")


if __name__ == "__main__":
    main()
