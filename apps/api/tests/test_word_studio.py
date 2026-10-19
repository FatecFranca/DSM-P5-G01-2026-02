def _admin(client):
    result = client.post("/v1/admin/setup", json={"email": "admin-words@example.com", "password": "Senha-forte-123"})
    assert result.status_code in (200, 201), result.text
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_list_create_confirm_and_correct_word_labels(client, monkeypatch):
    headers = _admin(client)
    monkeypatch.setattr("app.word_studio.classify_word", lambda *args, **kwargs: "medio")

    created = client.post("/v1/admin/words", headers=headers, json={"text": "PLANETA", "syllables": "PLA-NE-TA", "frequency": 0.4})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["text"] == "PLANETA"
    assert body["model_difficulty"] == "medio"
    assert body["label_feedback"] == "pending"

    listed = client.get("/v1/admin/words?q=PLANETA", headers=headers)
    assert listed.status_code == 200
    assert any(item["text"] == "PLANETA" for item in listed.json()["items"])

    confirmed = client.post(f"/v1/admin/words/{body['id']}/feedback", headers=headers, json={"verdict": "confirm"})
    assert confirmed.status_code == 200
    assert confirmed.json()["label_feedback"] == "confirmed"
    assert confirmed.json()["current_difficulty"] == "medio"

    corrected = client.post(
        f"/v1/admin/words/{body['id']}/feedback",
        headers=headers,
        json={"verdict": "correct", "difficulty": "dificil"},
    )
    assert corrected.status_code == 200
    assert corrected.json()["label_feedback"] == "corrected"
    assert corrected.json()["current_difficulty"] == "dificil"
    assert corrected.json()["model_difficulty"] == "medio"

    exported = client.get("/v1/admin/words/export-labels", headers=headers)
    assert exported.status_code == 200
    assert any(item["text"] == "PLANETA" and item["difficulty"] == "dificil" for item in exported.json()["items"])


def test_create_word_rejects_duplicate(client, monkeypatch):
    headers = _admin(client)
    monkeypatch.setattr("app.word_studio.classify_word", lambda *args, **kwargs: "facil")
    # CASA já vem do seed; o endpoint deve rejeitar duplicata.
    response = client.post("/v1/admin/words", headers=headers, json={"text": "casa"})
    assert response.status_code == 409
