import json
from pathlib import Path

import pytest

from app.placement import BANDS, CREDIT_PHASES_BY_START_LEVEL, ITEMS, MIN_EASY_ANSWERED, MIXES, QUIZ_VERSION, START_LEVEL_CAP, START_LEVEL_MIN_HITS, BAND_THRESHOLD, PlacementError, score_placement

CONTRACT = json.loads((Path(__file__).resolve().parents[3] / "contracts" / "placement-quiz.json").read_text(encoding="utf-8"))
PHASE_LETTERS = {phase["phase"]: phase["letters"] for phase in json.loads((Path(__file__).resolve().parents[3] / "contracts" / "pedagogy.json").read_text(encoding="utf-8"))["phases"]}
FULL = {"F1": 2, "F2": 1, "F3": 3, "F4": 2, "M1": 3, "M2": 1, "M3": 2, "M4": 3, "D1": 1, "D2": 2, "D3": 3, "D4": 1}


def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def placement_event(result_id, occurred_at, responses, skipped=False, version=QUIZ_VERSION):
    return {"client_event_id": f"placement:{result_id}", "type": "placement", "occurred_at": occurred_at,
            "payload": {"result_id": result_id, "quiz_version": version, "skipped": skipped, "responses": responses}}


def push(client, headers, *events):
    response = client.post("/v1/sync/push", headers=headers, json={"events": list(events)})
    assert response.status_code == 200, response.text
    return response.json()


def test_mirrors_the_shared_contract():
    assert QUIZ_VERSION == CONTRACT["id"]
    assert [(item.id, item.band, item.level, item.answer, item.options) for item in ITEMS] == [
        (item["id"], item["band"], item["level"], item["answer"], len(item["options"])) for item in CONTRACT["items"]]
    assert list(BANDS) == CONTRACT["bands"]
    assert (BAND_THRESHOLD, MIN_EASY_ANSWERED) == (CONTRACT["scoring"]["band_threshold"], CONTRACT["scoring"]["min_easy_answered"])
    assert MIXES == CONTRACT["mixes"]
    assert START_LEVEL_CAP == CONTRACT["start_level"]["cap_by_difficulty"]
    assert {str(level): hits for level, hits in START_LEVEL_MIN_HITS.items()} == CONTRACT["start_level"]["min_hits_by_level"]
    assert {str(level): list(phases) for level, phases in CREDIT_PHASES_BY_START_LEVEL.items()} == CONTRACT["credit"]["phases_by_start_level"]


@pytest.mark.parametrize("example", CONTRACT["examples"], ids=[example["name"] for example in CONTRACT["examples"]])
def test_scores_every_contract_example_like_the_app(example):
    result = score_placement(example["responses"], skipped=example.get("skipped", False))
    expected = example["expected"]
    assert result["hits"] == expected["hits"]
    assert result["difficulty"] == expected["difficulty"]
    assert result["provisional"] is expected["provisional"]
    assert result["provisional_reason"] == expected["provisional_reason"]
    assert result["start_level"] == expected["start_level"]
    assert result["credited_letters"] == "".join(PHASE_LETTERS[phase] for phase in expected["credited_phases"])
    assert result["mix"] == CONTRACT["mixes"][expected["difficulty"]]


@pytest.mark.parametrize("responses", [{"X9": 1}, {"F1": 4}, {"F1": 0}, {"F1": True}, {"F1": "2"}])
def test_rejects_unknown_ids_and_invalid_choices(responses):
    with pytest.raises(PlacementError):
        score_placement(responses)


def test_push_stores_server_scored_result_and_latest_is_exposed(client, auth):
    headers = bearer(auth)
    assert client.get("/v1/placement", headers=headers).json() == {"result": None}
    result = push(client, headers, placement_event("r1", "2026-11-10T10:00:00Z", FULL))
    assert result["accepted_ids"] == ["placement:r1"] and result["rejected"] == 0
    push(client, headers, placement_event("r0", "2026-11-01T10:00:00Z", {}, skipped=True))
    latest = client.get("/v1/placement", headers=headers).json()["result"]
    assert latest["result_id"] == "r1" and latest["difficulty"] == "dificil" and latest["start_level"] == 4
    assert latest["hits"] == {"facil": 4, "medio": 4, "dificil": 4} and latest["provisional"] is False
    pulled = [event for event in client.get("/v1/sync/pull?cursor=0", headers=headers).json()["events"] if event["type"] == "placement"]
    assert [event["payload"]["result_id"] for event in pulled] == ["r1", "r0"]
    assert pulled[0]["payload"]["responses"] == FULL and pulled[0]["payload"]["difficulty"] == "dificil"


def test_duplicate_push_is_idempotent(client, auth):
    headers = bearer(auth)
    push(client, headers, placement_event("r1", "2026-11-10T10:00:00Z", FULL))
    again = push(client, headers, placement_event("r1", "2026-11-10T10:00:00Z", FULL))
    assert again["duplicates"] == 1 and again["accepted"] == 0


def test_invalid_or_outdated_result_is_rejected_without_blocking_the_batch(client, auth):
    headers = bearer(auth)
    result = push(client, headers, placement_event("bad", "2026-11-10T10:00:00Z", {"F1": 9}), placement_event("old", "2026-11-10T10:00:00Z", FULL, version="nivelamento-v0"),
                  placement_event("ok", "2026-11-10T11:00:00Z", {"F1": 2}))
    assert result["accepted_ids"] == ["placement:ok"]
    assert sorted(result["rejected_ids"]) == ["placement:bad", "placement:old"]
    assert client.get("/v1/placement", headers=headers).json()["result"]["provisional_reason"] == "quiz_incompleto"


def test_placement_requires_authentication(client):
    assert client.get("/v1/placement").status_code in (401, 403)
