def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def progress_event(event_id, occurred_at, **payload):
    base = {"unit_id": "lesson-A", "status": "in_progress", "completed_exercises": 1, "completed_types": ["listen_choose"]}
    return {"client_event_id": event_id, "type": "progress", "occurred_at": occurred_at, "payload": {**base, **payload}}


def push(client, headers, *events):
    response = client.post("/v1/sync/push", headers=headers, json={"events": list(events)})
    assert response.status_code == 200, response.text
    return response.json()


def test_completed_types_are_persisted_normalized_and_accumulated(client, auth):
    headers = bearer(auth)
    push(client, headers, progress_event("p1", "2026-09-15T10:00:00Z", completed_types=["listen_choose", "recognize", "write"]))
    push(client, headers, progress_event("p2", "2026-09-15T09:00:00Z", completed_types=["find_in_word"]))
    [item] = client.get("/v1/progress", headers=headers).json()["items"]
    assert item["completed_types"] == ["listen_choose", "recognize_letter", "find_in_word"]
    assert item["status"] == "in_progress" and item["completed_exercises"] == 1
    pulled = client.get("/v1/sync/pull?cursor=0", headers=headers).json()["events"]
    assert pulled[0]["payload"]["completed_types"] == ["listen_choose", "recognize_letter"]


def test_completed_lesson_can_move_to_review_but_not_back_to_in_progress(client, auth):
    headers = bearer(auth)
    push(client, headers, progress_event("c1", "2026-09-15T10:00:00Z", status="completed", completed_exercises=3))
    push(client, headers, progress_event("c2", "2026-09-15T11:00:00Z", status="in_progress"))
    assert client.get("/v1/progress", headers=headers).json()["items"][0]["status"] == "completed"
    push(client, headers, progress_event("c3", "2026-09-15T12:00:00Z", status="needs_review", next_review_at="2026-09-15T12:00:00Z"))
    [item] = client.get("/v1/progress", headers=headers).json()["items"]
    assert item["status"] == "needs_review" and item["completed_exercises"] == 3


def test_attempts_record_lesson_and_type_and_ignore_classifier_fields(client, auth):
    headers = bearer(auth)
    attempt = {"client_attempt_id": "t1", "item_id": "exercise-M-find", "unit_id": "letter-m", "exercise_type": "find_in_word", "answer": "1ª posição", "correct": True, "duration_ms": 800,
               "confidence": 0.9, "uncertain": False, "model_version": "letters-1"}
    push(client, headers, {"client_event_id": "a1", "type": "attempt", "occurred_at": "2026-09-15T10:00:00Z", "payload": attempt})
    [item] = client.get("/v1/attempts", headers=headers).json()["items"]
    assert item["unit_id"] == "lesson-M" and item["exercise_type"] == "find_in_word" and item["served_model_version"] is None
    assert not {"confidence", "uncertain", "model_version"} & item.keys()
    [event] = client.get("/v1/sync/pull?cursor=0", headers=headers).json()["events"]
    assert not {"confidence", "uncertain", "model_version"} & event["payload"].keys()
    assert client.post("/v1/sync/push", headers=headers, json={"events": [{"client_event_id": "a2", "type": "attempt", "occurred_at": "2026-09-15T10:00:00Z", "payload": {**attempt, "client_attempt_id": "t2", "raw_image": "x"}}]}).status_code == 422
