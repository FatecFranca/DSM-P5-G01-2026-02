from sqlalchemy import select

from app.db import SessionLocal
from app.models import Word


def test_content_etag_and_not_modified(client):
    first = client.get("/v1/content")
    etag = first.headers["etag"]
    assert first.status_code == 200 and first.headers["cache-control"] == "no-cache"
    assert first.json()["version"] == etag.strip('"')[:16]
    cached = client.get("/v1/content", headers={"If-None-Match": etag})
    assert cached.status_code == 304 and cached.content == b"" and cached.headers["etag"] == etag
    assert client.get("/v1/content", headers={"If-None-Match": f'"antigo", W/{etag}'}).status_code == 304
    assert client.get("/v1/content", headers={"If-None-Match": '"antigo"'}).status_code == 200


def test_content_etag_changes_when_data_changes(client):
    before = client.get("/v1/content").headers["etag"]
    with SessionLocal() as db:
        db.scalar(select(Word).where(Word.text == "CASA")).current_difficulty = "medio"
        db.commit()
    after = client.get("/v1/content", headers={"If-None-Match": before})
    assert after.status_code == 200 and after.headers["etag"] != before
