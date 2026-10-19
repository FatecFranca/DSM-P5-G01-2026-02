def _admin(client):
    result = client.post("/v1/admin/setup", json={"email": "admin@example.com", "password": "Senha-forte-123"})
    assert result.status_code == 201
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_local_admin_publishes_snapshot_and_seed_cannot_overwrite(client):
    headers = _admin(client)
    draft = client.get("/v1/admin/draft", headers=headers)
    assert draft.status_code == 200
    body = draft.json()
    u_unit = next(unit for track in body["tracks"] for unit in track["units"] if unit["focus_letter"] == "U")
    assert all(item.get("context_word") != "UNIDADE" for item in u_unit["items"])
    assert {item.get("context_word") for item in u_unit["items"] if item.get("context_word")} == {"UAU"}
    assert client.post("/v1/admin/validate", headers=headers).json()["valid"]
    old_etag = client.get("/v1/content").headers["etag"]
    response = client.post("/v1/admin/publish", json={"notes": "primeira versão"}, headers=headers)
    assert response.status_code == 200
    assert client.get("/v1/content").headers["etag"] == old_etag
    assert client.get("/v1/admin/versions", headers=headers).json()[0]["notes"] == "primeira versão"


def test_admin_requires_local_session_and_invalid_draft_is_never_published(client):
    assert client.get("/v1/admin/draft").status_code in (401, 403)
    headers = _admin(client)
    draft = client.get("/v1/admin/draft", headers=headers).json()
    draft["learning_order"] = "ABC"
    assert client.put("/v1/admin/draft", json=draft, headers=headers).status_code == 200
    validation = client.post("/v1/admin/validate", headers=headers).json()
    assert not validation["valid"]
    assert client.post("/v1/admin/publish", headers=headers).status_code == 422


def test_local_studio_page_and_contract_types_are_available(client):
    page = client.get("/admin/")
    assert page.status_code == 200
    assert "Estúdio" in page.text
    headers = _admin(client)
    types = client.get("/v1/admin/types", headers=headers).json()["items"]
    assert {entry["id"] for entry in types} >= {"word_image_choose", "sentence_image_choose", "word_from_syllables"}
    assert {entry["item_kind"] for entry in types} >= {"letter", "word", "sentence", "syllable"}


def test_uploaded_asset_is_copied_locally_and_served(client):
    headers = _admin(client)
    response = client.post("/v1/admin/assets/upload?alt=Pessoa&license=CC0&attribution=Autor", headers=headers,
                           files={"file": ("person.png", b"\x89PNG\r\n\x1a\nlocal-image", "image/png")})
    assert response.status_code == 200, response.text
    media = client.get(response.json()["url"])
    assert media.status_code == 200
    assert media.content.startswith(b"\x89PNG")
    listed = client.get("/v1/admin/assets", headers=headers).json()["items"]
    assert next(entry for entry in listed if entry["id"] == response.json()["id"])["alt"] == "Pessoa"


def test_url_import_rejects_local_network_targets(client):
    headers = _admin(client)
    response = client.post("/v1/admin/assets/import-url", headers=headers, json={
        "url": "http://127.0.0.1/nao-importar.png",
        "alt": "Imagem de teste",
        "license": "CC0",
        "attribution": "Teste",
    })
    assert response.status_code == 422
    assert "Private or local" in response.json()["detail"]


def test_publication_changes_etag_and_an_older_snapshot_can_be_restored(client):
    headers = _admin(client)
    assert client.post("/v1/admin/publish", json={"notes": "base"}, headers=headers).status_code == 200
    first = client.get("/v1/admin/versions", headers=headers).json()[0]
    draft = client.get("/v1/admin/draft", headers=headers).json()
    item = draft["tracks"][0]["units"][0]["items"][0]
    item["tts_fallback_text"] = "Ouça com atenção."
    old_etag = client.get("/v1/content").headers["etag"]
    assert client.put("/v1/admin/draft", json=draft, headers=headers).status_code == 200
    assert client.post("/v1/admin/publish", json={"notes": "áudio"}, headers=headers).status_code == 200
    assert client.get("/v1/content").headers["etag"] != old_etag
    assert client.post(f"/v1/admin/versions/{first['id']}/restore", json={}, headers=headers).status_code == 200
    assert client.get("/v1/content").headers["etag"] == old_etag
