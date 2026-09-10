from app.content_ids import canonical_exercise_id, canonical_lesson_id, exercise_id_for, lesson_id_for


def test_canonical_ids_translate_legacy_formats():
    assert canonical_lesson_id("letter-a") == "lesson-A"
    assert canonical_lesson_id("lesson-A") == "lesson-A"
    assert canonical_exercise_id("A-listen") == "exercise-A-listen"
    assert canonical_exercise_id("M-complete-word") == "exercise-M-complete-word"
    assert canonical_exercise_id("exercise-A-find_in_word") == "exercise-A-find"
    assert canonical_exercise_id("exercise-A-recognize") == "exercise-A-recognize"
    assert canonical_exercise_id("sem-padrao") == "sem-padrao"


def test_seed_uses_canonical_ids(client):
    content = client.get("/v1/content").json()
    for module in content["modules"]:
        for lesson in module["lessons"]:
            assert lesson["id"] == lesson_id_for(lesson["letter"])
            assert [item["id"] for item in lesson["exercises"]] == [exercise_id_for(lesson["letter"], item["type"]) for item in lesson["exercises"]]


def test_sync_push_stores_canonical_ids_for_legacy_clients(client, auth):
    headers = {"Authorization": f"Bearer {auth['access_token']}"}
    events = [
        {"client_event_id": "legacy-1", "type": "attempt", "occurred_at": "2026-09-15T12:00:00Z", "payload": {
            "client_attempt_id": "legacy-attempt", "exercise_id": "A-listen", "answer": "A", "correct": True, "duration_ms": 900}},
        {"client_event_id": "legacy-2", "type": "progress", "occurred_at": "2026-09-15T12:00:01Z", "payload": {
            "lesson_id": "letter-a", "status": "in_progress", "completed_exercises": 1, "completed_types": ["listen_choose"]}},
    ]
    assert client.post("/v1/sync/push", headers=headers, json={"events": events}).status_code == 200
    assert [item["lesson_id"] for item in client.get("/v1/progress", headers=headers).json()["items"]] == ["lesson-A"]
    assert [item["exercise_id"] for item in client.get("/v1/attempts", headers=headers).json()["items"]] == ["exercise-A-listen"]
    pulled = client.get("/v1/sync/pull?cursor=0", headers=headers).json()["events"]
    assert pulled[0]["payload"]["exercise_id"] == "exercise-A-listen" and pulled[1]["payload"]["lesson_id"] == "lesson-A"
