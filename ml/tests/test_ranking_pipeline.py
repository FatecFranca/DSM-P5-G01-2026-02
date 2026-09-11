import json
import random
from datetime import datetime, timedelta

from app.ranking.features import FEATURE_NAMES, ItemMeta
from app.ranking.model import parse_manifest
from app.ranking.scheduler import apply_result
from alfabetiza_ml.replay import AttemptRecord, replay
from alfabetiza_ml.train_ranking import gate, metrics_for, train_and_evaluate

import numpy as np

START = datetime(2026, 9, 1, 9, 0)


def catalog() -> dict[str, ItemMeta]:
    metas = {}
    for index, letter in enumerate("AEIOUML"):
        for kind in ("listen", "recognize"):
            metas[f"exercise-{letter}-{kind}"] = ItemMeta(f"exercise-{letter}-{kind}", "listen_choose" if kind == "listen" else "recognize_letter", "letter", difficulty="facil" if index < 5 else "medio", max_letter_index=index)
    return metas


def simulate(users: int = 40, days: int = 12, seed: int = 3) -> list[AttemptRecord]:
    """Aprendizes sintéticos: acerto ~ Bernoulli(2^(-t/meia-vida verdadeira)), com habilidade por usuário."""
    rng = random.Random(seed)
    metas = catalog()
    records = []
    for user in range(users):
        skill = rng.uniform(0.7, 1.3)
        states = {}
        for day in range(days):
            for position, (item_id, meta) in enumerate(metas.items(), 1):
                if rng.random() < 0.4: continue
                now = START + timedelta(days=day, minutes=position * 3 + user)
                state = states.get(item_id)
                elapsed = (now - state.last_seen_at).total_seconds() / 3600 if state else None
                p = 0.55 * skill if state is None else min(0.98, (2 ** (-elapsed / (state.half_life_hours * skill))) * 0.9 + 0.08)
                correct = rng.random() < p
                records.append(AttemptRecord(f"u{user}", item_id, f"lesson-{item_id.split('-')[1]}", meta.type, correct, now, audio_repeats=rng.choice([0, 0, 1, 2]), position_in_session=position, attempt_index_in_item=1))
                states[item_id] = apply_result(state, item_id=item_id, unit_id=None, correct=correct, now=now)
    return records


def test_replay_reconstructs_state_before_each_attempt_without_leakage():
    metas = catalog()
    attempts = [AttemptRecord("u1", "exercise-A-listen", "lesson-A", "listen_choose", True, START), AttemptRecord("u1", "exercise-A-listen", "lesson-A", "listen_choose", False, START + timedelta(hours=9)),
                AttemptRecord("u1", "exercise-A-listen", "lesson-A", "listen_choose", True, START + timedelta(hours=10))]
    rows = replay(reversed(attempts), metas)
    names = list(FEATURE_NAMES)
    first, second, third = (dict(zip(names, row.features)) for row in rows)
    assert first["is_first_encounter"] == 1 and first["reps"] == 0 and first["user_attempts_log"] == 0
    assert second["is_first_encounter"] == 0 and second["reps"] == 1 and second["strength"] == 1 and second["user_accuracy"] == 1
    assert third["reps"] == 2 and third["lapses"] == 1 and third["strength"] == 0 and third["consecutive_correct"] == 0 and third["user_accuracy"] == 0.5
    assert [row.label for row in rows] == [1, 0, 1]
    assert rows[1].p_rules < rows[0].p_rules and 0 < rows[2].p_rules < 1 and rows[2].p_item_history == 0.5


def test_training_produces_a_manifest_the_server_accepts_and_beats_baselines_on_synthetic_data():
    rows = replay(simulate(), catalog())
    manifest = train_and_evaluate(rows)
    assert manifest["features"] == list(FEATURE_NAMES) and manifest["policy_version"] == "session-v1"
    assert manifest["trained_on"]["rows"] == len(rows) and manifest["trained_on"]["users"] == 40
    for evaluation in manifest["evaluations"].values():
        assert set(evaluation) == {"model", "baseline_rules", "baseline_item_history", "baseline_constant"}
        assert all(0 < entry["log_loss"] < 5 and 0 <= entry["ece"] <= 1 for entry in evaluation.values())
    assert manifest["promotion_allowed"] is True, manifest["gate_reasons"]
    model = parse_manifest(json.loads(json.dumps(manifest)))
    p = model.predict(rows[0].features)
    assert 0 < p < 1


def test_gate_rejects_small_uncalibrated_or_losing_models():
    good = {"model": {"rows": 500, "log_loss": 0.40, "ece": 0.02}, "baseline_rules": {"log_loss": 0.50}, "baseline_item_history": {"log_loss": 0.55}, "baseline_constant": {"log_loss": 0.60}}
    assert gate({"temporal": good, "by_user": good}) == (True, [])
    small = {**good, "model": {**good["model"], "rows": 50}}
    assert gate({"temporal": small}) [1] == ["temporal: 50 linhas < 200"]
    uncalibrated = {**good, "model": {**good["model"], "ece": 0.2}}
    assert "ECE" in gate({"temporal": uncalibrated})[1][0]
    losing = {**good, "model": {**good["model"], "log_loss": 0.52}}
    promoted, reasons = gate({"temporal": losing})
    assert not promoted and any("baseline_rules" in reason for reason in reasons)


def test_metrics_are_finite_and_ece_is_zero_for_a_perfectly_calibrated_constant():
    y = np.array([1] * 85 + [0] * 15); p = np.full(100, 0.85)
    metrics = metrics_for(y, p)
    assert abs(metrics.ece) < 1e-9 and metrics.auc == 0.5 and 0 < metrics.log_loss < 1 and metrics.rows == 100
