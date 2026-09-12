def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def item_state(event_id, item_id, occurred_at, **overrides):
    payload = {"item_id": item_id, "unit_id": "lesson-A", "strength": 1, "half_life_hours": 8, "due_at": "2026-09-16T18:00:00Z", "reps": 1, "lapses": 0,
               "consecutive_correct": 1, "last_result": True, "last_seen_at": occurred_at, **overrides}
    return {"client_event_id": event_id, "type": "item_state", "occurred_at": occurred_at, "payload": payload}


def push(client, headers, *events):
    response = client.post("/v1/sync/push", headers=headers, json={"events": list(events)})
    assert response.status_code == 200, response.text
    return response.json()


def test_item_states_are_stored_merged_and_pulled(client, auth):
    headers = bearer(auth)
    push(client, headers, item_state("s1", "exercise-A-listen", "2026-09-16T10:00:00Z"))
    # Registro mais antigo não sobrescreve, mas reps/lapses só crescem.
    push(client, headers, item_state("s2", "exercise-A-listen", "2026-09-16T09:00:00Z", strength=0, reps=4, lapses=2, consecutive_correct=0, last_result=False))
    [state] = client.get("/v1/item-states", headers=headers).json()["items"]
    assert state["strength"] == 1 and state["reps"] == 4 and state["lapses"] == 2 and state["consecutive_correct"] == 1
    # Registro mais novo sobrescreve.
    push(client, headers, item_state("s3", "exercise-A-listen", "2026-09-16T11:00:00Z", strength=2, half_life_hours=16, reps=5, consecutive_correct=2, due_at="2026-09-17T03:00:00Z"))
    [state] = client.get("/v1/item-states", headers=headers).json()["items"]
    assert state["strength"] == 2 and state["reps"] == 5 and state["lapses"] == 2
    pulled = [event for event in client.get("/v1/sync/pull?cursor=0", headers=headers).json()["events"] if event["type"] == "item_state"]
    assert len(pulled) == 3 and pulled[-1]["payload"]["half_life_hours"] == 16
    recusado = push(client, headers, item_state("bad", "item-inexistente", "2026-09-16T12:00:00Z"))
    assert recusado["rejected"] == 1 and recusado["accepted"] == 0


def test_progress_is_derived_from_item_states(client, auth):
    headers = bearer(auth)
    push(client, headers, item_state("a", "exercise-A-listen", "2026-09-16T10:00:00Z"))
    [progress] = client.get("/v1/progress", headers=headers).json()["items"]
    assert progress["unit_id"] == "lesson-A" and progress["status"] == "in_progress" and progress["completed_exercises"] == 1 and progress["completed_types"] == ["listen_choose"]
    push(client, headers, item_state("b", "exercise-A-recognize", "2026-09-16T10:05:00Z", reps=2, lapses=1))
    [progress] = client.get("/v1/progress", headers=headers).json()["items"]
    assert progress["status"] == "in_progress" and progress["completed_exercises"] == 2 and progress["attempts"] == 3 and progress["correct_attempts"] == 2
    assert progress["accuracy"] == 2 / 3 and progress["next_review_at"].startswith("2026-09-16T18:00:00")
    # Com sete habilidades, dominar apenas um item ainda não conclui a unidade.
    push(client, headers, item_state("c", "exercise-A-listen", "2026-09-17T10:00:00Z", due_at="2026-09-17T09:00:00Z", reps=2, consecutive_correct=2))
    assert client.get("/v1/progress", headers=headers).json()["items"][0]["status"] == "in_progress"
    push(client, headers, item_state("d", "exercise-A-listen", "2026-09-17T11:00:00Z", strength=0, reps=3, lapses=1, consecutive_correct=0, last_result=False, due_at="2026-09-17T15:00:00Z"))
    [progress] = client.get("/v1/progress", headers=headers).json()["items"]
    assert progress["status"] == "in_progress" and progress["completed_exercises"] == 1


def test_attempts_carry_session_context(client, auth):
    headers = bearer(auth)
    attempt = {"client_attempt_id": "t1", "item_id": "exercise-A-listen", "unit_id": "lesson-A", "exercise_type": "listen_choose", "answer": "A", "correct": False, "duration_ms": 900,
               "session_id": "sess-1", "position_in_session": 3, "attempt_index_in_item": 2, "audio_repeats": 2, "time_to_first_interaction_ms": 400, "served_by": "rules", "served_policy_version": "session-v1"}
    push(client, headers, {"client_event_id": "a1", "type": "attempt", "occurred_at": "2026-09-16T10:00:00Z", "payload": attempt})
    [stored] = client.get("/v1/attempts", headers=headers).json()["items"]
    assert {key: stored[key] for key in ("session_id", "position_in_session", "attempt_index_in_item", "audio_repeats", "time_to_first_interaction_ms", "served_by", "served_policy_version")} == {
        "session_id": "sess-1", "position_in_session": 3, "attempt_index_in_item": 2, "audio_repeats": 2, "time_to_first_interaction_ms": 400, "served_by": "rules", "served_policy_version": "session-v1"}
    assert client.post("/v1/sync/push", headers=headers, json={"events": [{"client_event_id": "a2", "type": "attempt", "occurred_at": "2026-09-16T10:00:00Z", "payload": {**attempt, "client_attempt_id": "t2", "served_by": "oracle"}}]}).status_code == 422


def test_unknown_content_rejects_only_that_event_and_keeps_the_batch(client, auth):
    """Um exercício removido numa versão antiga do app não pode travar a fila inteira do cliente."""
    headers = bearer(auth)
    result = push(client, headers,
                  {"client_event_id": "legado", "type": "attempt", "occurred_at": "2026-09-16T10:00:00Z", "payload": {
                      "client_attempt_id": "legado-1", "item_id": "A-write", "unit_id": "lesson-A", "answer": "A", "correct": True, "duration_ms": 900}},
                  item_state("bom", "exercise-A-listen", "2026-09-16T10:01:00Z"),
                  {"client_event_id": "unidade-sumida", "type": "progress", "occurred_at": "2026-09-16T10:02:00Z", "payload": {
                      "unit_id": "lesson-ZZ", "status": "completed", "completed_exercises": 1}})
    assert result["accepted"] == 1 and result["accepted_ids"] == ["bom"]
    assert result["rejected"] == 2 and result["rejected_ids"] == ["legado", "unidade-sumida"]
    assert [item["reason"] for item in result["rejections"]] == ["item A-write não existe no catálogo", "unidade lesson-ZZ não existe no catálogo"]
    assert [item["item_id"] for item in client.get("/v1/item-states", headers=headers).json()["items"]] == ["exercise-A-listen"]
    assert client.get("/v1/attempts", headers=headers).json()["items"] == []
    # Rejeição não cria evento: reenviar continua rejeitando, sem virar duplicata silenciosa.
    again = push(client, headers, {"client_event_id": "legado", "type": "attempt", "occurred_at": "2026-09-16T10:00:00Z", "payload": {
        "client_attempt_id": "legado-1", "item_id": "A-write", "unit_id": "lesson-A", "answer": "A", "correct": True, "duration_ms": 900}})
    assert again["rejected"] == 1 and again["accepted"] == 0
