import json

import pytest

from app.config import get_settings
from app.ranking.features import FEATURE_NAMES
from app.ranking.model import load_model


def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def item_state(event_id, item_id, occurred_at, **overrides):
    payload = {"item_id": item_id, "unit_id": "lesson-A", "strength": 1, "half_life_hours": 8, "due_at": "2026-09-16T18:00:00Z", "reps": 1, "lapses": 0,
               "consecutive_correct": 1, "last_result": True, "last_seen_at": occurred_at, **overrides}
    return {"client_event_id": event_id, "type": "item_state", "occurred_at": occurred_at, "payload": payload}


def attempt(event_id, item_id, occurred_at, correct=True, **overrides):
    payload = {"client_attempt_id": event_id, "item_id": item_id, "unit_id": "lesson-A", "exercise_type": "listen_choose", "answer": "A", "correct": correct, "duration_ms": 500, "audio_repeats": 1, **overrides}
    return {"client_event_id": event_id, "type": "attempt", "occurred_at": occurred_at, "payload": payload}


def push(client, headers, *events):
    response = client.post("/v1/sync/push", headers=headers, json={"events": list(events)})
    assert response.status_code == 200, response.text


def manifest(tmp_path, promotion_allowed=True, features=None):
    size = len(FEATURE_NAMES)
    data = {"model_version": "ranking-test-1", "policy_version": "session-v1", "features": list(features or FEATURE_NAMES), "means": [0.0] * size, "stds": [1.0] * size,
            "coef": [0.0] * size, "intercept": 0.0, "calibration": {"a": 1.0, "b": 0.0}, "valid_range": [0.02, 0.98], "promotion_allowed": promotion_allowed}
    path = tmp_path / "ranking_manifest.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


@pytest.fixture()
def settings():
    value = get_settings()
    original = value.model_dump()
    yield value
    for key, item in original.items(): setattr(value, key, item)
    load_model.cache_clear()


CANDIDATES = ["exercise-A-listen", "exercise-A-recognize", "exercise-E-listen", "exercise-E-recognize", "exercise-I-listen"]


def test_rules_ranking_puts_forgotten_items_first_then_new_in_curriculum_order(client, auth):
    headers = bearer(auth)
    push(client, headers,
         item_state("s1", "exercise-A-recognize", "2026-09-10T10:00:00Z", due_at="2026-09-10T18:00:00Z"),  # visto há dias: esquecido
         item_state("s2", "exercise-E-listen", "2026-09-16T09:30:00Z", strength=5, half_life_hours=128, due_at="2026-09-21T09:30:00Z"))  # firme
    response = client.post("/v1/ranking/next", headers=headers, json={"session_id": "sess-1", "unit_id": "lesson-A", "candidate_item_ids": CANDIDATES, "session_size": 5, "now": "2026-09-16T10:00:00Z"})
    assert response.status_code == 200, response.text
    body = response.json()
    order = [item["item_id"] for item in body["items"]]
    assert order == ["exercise-A-recognize", "exercise-A-listen", "exercise-E-recognize", "exercise-I-listen", "exercise-E-listen"]
    assert body["source"] == "rules-fallback" and body["policy_version"] == "rules-v1" and body["model_version"] is None
    reasons = {item["item_id"]: item["reason"] for item in body["items"]}
    assert reasons["exercise-A-recognize"] == "model_disabled:review" and reasons["exercise-A-listen"] == "model_disabled:new" and reasons["exercise-E-listen"] == "model_disabled:strong"
    forgotten = next(item for item in body["items"] if item["item_id"] == "exercise-A-recognize")
    assert forgotten["p_recall"] < 0.05
    assert client.post("/v1/ranking/next", headers=headers, json={"session_id": "s", "candidate_item_ids": ["item-inexistente"]}).status_code == 422


def test_ranking_logs_every_response_and_accepts_legacy_ids(client, auth, settings):
    headers = bearer(auth)
    settings.ranking_epsilon = 0
    first = client.post("/v1/ranking/next", headers=headers, json={"session_id": "sess-2", "candidate_item_ids": ["A-listen", "exercise-A-recognize"], "session_size": 1}).json()
    assert first["items"][0]["item_id"] == "exercise-A-listen" and first["items"][0]["rank"] == 1
    from sqlalchemy import select
    from app.db import SessionLocal
    from app.models import RankingLog
    with SessionLocal() as db:
        [log] = db.scalars(select(RankingLog)).all()
        assert log.id == first["request_id"] and log.session_id == "sess-2" and log.source == "rules-fallback"
        assert [entry["item_id"] for entry in log.scores] == ["exercise-A-listen"] and log.candidate_item_ids == ["exercise-A-listen", "exercise-A-recognize"]


def test_model_is_shadowed_then_served_only_for_warm_users_and_items(client, auth, settings, tmp_path):
    headers = bearer(auth)
    settings.ranking_model_enabled = True; settings.ranking_model_path = str(manifest(tmp_path)); settings.ranking_cold_start_attempts = 2; settings.ranking_min_item_encounters = 2; settings.ranking_epsilon = 0
    push(client, headers, item_state("s1", "exercise-A-listen", "2026-09-16T09:00:00Z", reps=3), item_state("s2", "exercise-A-recognize", "2026-09-16T09:00:00Z", reps=1))
    request = {"session_id": "sess-3", "candidate_item_ids": ["exercise-A-listen", "exercise-A-recognize", "exercise-E-listen"], "session_size": 3, "now": "2026-09-16T10:00:00Z"}
    cold = client.post("/v1/ranking/next", headers=headers, json=request).json()
    assert cold["source"] == "rules-fallback" and all(item["reason"].startswith("cold_start_user") for item in cold["items"])
    push(client, headers, attempt("a1", "exercise-A-listen", "2026-09-16T09:10:00Z"), attempt("a2", "exercise-A-listen", "2026-09-16T09:20:00Z", correct=False))
    shadow = client.post("/v1/ranking/next", headers=headers, json=request).json()
    assert shadow["source"] == "rules-fallback" and shadow["model_version"] == "ranking-test-1"
    reasons = {item["item_id"]: item["reason"] for item in shadow["items"]}
    assert reasons["exercise-A-listen"].startswith("shadow_mode") and reasons["exercise-A-recognize"].startswith("cold_item") and reasons["exercise-E-listen"].startswith("cold_item")
    settings.ranking_shadow_mode = False
    live = client.post("/v1/ranking/next", headers=headers, json=request).json()
    assert live["source"] == "model" and live["policy_version"] == "session-v1"
    served = {item["item_id"]: item for item in live["items"]}
    assert served["exercise-A-listen"]["source"] == "model" and served["exercise-A-listen"]["p_recall"] == 0.5 and served["exercise-A-listen"]["reason"] == "model:review"
    assert served["exercise-A-recognize"]["source"] == "rules-fallback" and served["exercise-E-listen"]["source"] == "rules-fallback"


def test_invalid_or_unpromoted_manifest_falls_back_to_rules(client, auth, settings, tmp_path):
    headers = bearer(auth)
    settings.ranking_model_enabled = True; settings.ranking_shadow_mode = False; settings.ranking_cold_start_attempts = 0; settings.ranking_min_item_encounters = 0
    settings.ranking_model_path = str(manifest(tmp_path, promotion_allowed=False))
    body = client.post("/v1/ranking/next", headers=headers, json={"session_id": "s", "candidate_item_ids": ["exercise-A-listen"]}).json()
    assert body["source"] == "rules-fallback" and body["items"][0]["reason"] == "model_unavailable:new"
    load_model.cache_clear()
    settings.ranking_model_path = str(manifest(tmp_path / "other", features=["x", *FEATURE_NAMES[1:]]) if (tmp_path / "other").mkdir() is None else "")
    body = client.post("/v1/ranking/next", headers=headers, json={"session_id": "s", "candidate_item_ids": ["exercise-A-listen"]}).json()
    assert body["source"] == "rules-fallback" and body["items"][0]["reason"] == "model_unavailable:new"


def test_epsilon_exploration_is_deterministic_per_request(client, auth, settings):
    headers = bearer(auth)
    settings.ranking_epsilon = 0.5
    explored = 0
    for index in range(20):
        body = client.post("/v1/ranking/next", headers=headers, json={"session_id": f"sess-{index}", "candidate_item_ids": CANDIDATES, "session_size": 2}).json()
        assert len(body["items"]) == 2
        explored += any(item["reason"] == "explore" for item in body["items"])
    assert 0 < explored < 20


def test_research_consent_endpoint(client, auth):
    headers = bearer(auth)
    assert client.get("/v1/me/research-consent", headers=headers).json() == {"consent": False, "consented_at": None}
    granted = client.put("/v1/me/research-consent", headers=headers, json={"consent": True}).json()
    assert granted["consent"] is True and granted["consented_at"]
    assert client.put("/v1/me/research-consent", headers=headers, json={"consent": False}).json() == {"consent": False, "consented_at": None}
