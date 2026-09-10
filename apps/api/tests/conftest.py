import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-with-at-least-32-characters"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app
from app.seed import seed_content


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed_content()
    with TestClient(app) as value:
        yield value


@pytest.fixture()
def auth(client):
    response = client.post("/v1/auth/register", json={"email": "ana@example.com", "password": "Senha-forte-123"})
    assert response.status_code == 201
    return response.json()
