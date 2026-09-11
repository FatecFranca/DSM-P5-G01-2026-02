def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def units_of(content, kind=None):
    return [unit for track in content["tracks"] for unit in track["units"] if kind is None or unit["kind"] == kind]


def test_health_and_seeded_content(client):
    assert client.get("/health").json() == {"status": "ok"}
    content = client.get("/v1/content").json()
    letters = [unit["focus_letter"] for unit in units_of(content, "letter")]
    assert set(letters) == set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    assert "".join(letters) == "AEIOUMLPSTRNDCGBFVHQJKZXWY"
    assert next(unit for unit in units_of(content, "letter") if unit["focus_letter"] == "G")["phase"] == 2
    assert {item["type"] for unit in units_of(content, "letter") for item in unit["items"]} == {
        "listen_choose", "recognize_letter", "find_in_word", "syllable_listen_choose", "complete_word"
    }
    assert [track["kind"] for track in content["tracks"]] == ["phonics", "theme"]
    assert {unit["kind"] for unit in units_of(content)} == {"letter", "word", "sentence"}
    assert len(content["words"]) >= 8 and all(word["review_status"] != "candidate" for word in content["words"])
    assert all(set(word["required_letters"]).issubset(set(letters)) for word in content["words"])
    assert next(word for word in content["words"] if word["text"] == "ÔNIBUS")["required_letters"] == "IOUSNB"
    push_schema = client.get("/openapi.json").json()["components"]["schemas"]["SyncPushResult"]
    assert "accepted_ids" in push_schema["required"]


def test_register_login_refresh_rotation_and_logout(client):
    registered = client.post("/v1/auth/register", json={"email": "user@example.com", "password": "Senha-forte-123"})
    assert registered.status_code == 201
    assert client.post("/v1/auth/register", json={"email": "USER@example.com", "password": "Senha-forte-123"}).status_code == 409
    assert client.post("/v1/auth/login", json={"email": "user@example.com", "password": "errada"}).status_code == 401
    logged = client.post("/v1/auth/login", json={"email": "user@example.com", "password": "Senha-forte-123"}).json()
    old_refresh = logged["refresh_token"]
    rotated = client.post("/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != old_refresh
    assert client.post("/v1/auth/refresh", json={"refresh_token": old_refresh}).status_code == 401
    new_refresh = rotated.json()["refresh_token"]
    assert client.post("/v1/auth/logout", json={"refresh_token": new_refresh}).status_code == 204
    assert client.post("/v1/auth/refresh", json={"refresh_token": new_refresh}).status_code == 401


def test_sync_is_idempotent_and_isolated(client, auth):
    headers = bearer(auth)
    payload = {"events": [
        {"client_event_id": "evt-1", "type": "attempt", "occurred_at": "2026-09-10T12:00:00Z", "payload": {
            "client_attempt_id": "attempt-1", "item_id": "exercise-A-listen", "unit_id": "lesson-A", "exercise_type": "listen_choose", "answer": "A", "correct": True, "duration_ms": 1200
        }},
        {"client_event_id": "evt-2", "type": "progress", "occurred_at": "2026-09-10T12:00:01Z", "payload": {
            "unit_id": "lesson-A", "status": "completed", "completed_exercises": 3
        }}
    ]}
    first = client.post("/v1/sync/push", headers=headers, json=payload)
    second = client.post("/v1/sync/push", headers=headers, json=payload)
    assert first.status_code == 200 and first.json()["accepted"] == 2
    assert second.status_code == 200 and second.json()["duplicates"] == 2
    assert first.json()["accepted_ids"] == ["evt-1", "evt-2"]
    assert second.json()["accepted_ids"] == ["evt-1", "evt-2"]
    assert len(client.get("/v1/progress", headers=headers).json()["items"]) == 1
    assert len(client.get("/v1/attempts", headers=headers).json()["items"]) == 1
    pull = client.get("/v1/sync/pull?cursor=0", headers=headers).json()
    assert len(pull["events"]) == 2 and pull["next_cursor"] > 0

    other = client.post("/v1/auth/register", json={"email": "bia@example.com", "password": "Senha-forte-123"}).json()
    assert client.get("/v1/progress", headers=bearer(other)).json()["items"] == []
    assert client.get("/v1/attempts", headers=bearer(other)).json()["items"] == []
    assert client.get("/v1/sync/pull?cursor=0", headers=bearer(other)).json()["events"] == []


def test_validation_and_attempt_id_uniqueness(client, auth):
    headers = bearer(auth)
    invalid = client.post("/v1/sync/push", headers=headers, json={"events": [{
        "client_event_id": "bad", "type": "attempt", "occurred_at": "2026-09-10T12:00:00Z",
        "payload": {"raw_image": "must-not-be-sent"}
    }]})
    assert invalid.status_code == 422
    unknown = client.post("/v1/sync/push", headers=headers, json={"events": [{
        "client_event_id": "unknown", "type": "attempt", "occurred_at": "2026-09-10T12:00:00Z",
        "payload": {"client_attempt_id": "u", "item_id": "item-inexistente", "answer": "A", "correct": True, "duration_ms": 1}
    }]})
    assert unknown.status_code == 422 and "item-inexistente" in unknown.json()["detail"]
    event = {"client_event_id": "a", "type": "attempt", "occurred_at": "2026-09-10T12:00:00Z", "payload": {
        "client_attempt_id": "same", "item_id": "exercise-A-listen", "answer": "A", "correct": True, "duration_ms": 500
    }}
    assert client.post("/v1/sync/push", headers=headers, json={"events": [event]}).status_code == 200
    event["client_event_id"] = "b"
    result = client.post("/v1/sync/push", headers=headers, json={"events": [event]})
    assert result.status_code == 200 and result.json()["duplicates"] == 1
