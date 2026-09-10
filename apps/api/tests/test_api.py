def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_health_and_seeded_content(client):
    assert client.get("/health").json() == {"status": "ok"}
    content = client.get("/v1/content").json()
    letters = {lesson["letter"] for module in content["modules"] for lesson in module["lessons"]}
    assert letters == set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    assert {exercise["type"] for module in content["modules"] for lesson in module["lessons"] for exercise in lesson["exercises"]} == {
        "listen_choose", "recognize_letter", "write_letter"
    }
    assert 4 <= len(content["words"]) <= 8
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
            "client_attempt_id": "attempt-1", "exercise_id": "exercise-A-write", "answer": "A", "correct": True,
            "confidence": 0.91, "uncertain": False, "duration_ms": 1200, "model_version": "letters-1"
        }},
        {"client_event_id": "evt-2", "type": "progress", "occurred_at": "2026-09-10T12:00:01Z", "payload": {
            "lesson_id": "lesson-A", "status": "completed", "completed_exercises": 3
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
    event = {"client_event_id": "a", "type": "attempt", "occurred_at": "2026-09-10T12:00:00Z", "payload": {
        "client_attempt_id": "same", "exercise_id": "exercise-A-write", "answer": "A", "correct": True,
        "confidence": 0.5, "uncertain": True, "duration_ms": 500, "model_version": "v1"
    }}
    assert client.post("/v1/sync/push", headers=headers, json={"events": [event]}).status_code == 200
    event["client_event_id"] = "b"
    result = client.post("/v1/sync/push", headers=headers, json={"events": [event]})
    assert result.status_code == 200 and result.json()["duplicates"] == 1
