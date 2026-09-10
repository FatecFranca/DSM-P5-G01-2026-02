import json

from scripts.export_content_bundle import BUNDLE_PATH, render_bundle


def test_committed_seed_bundle_matches_seed(client):
    assert BUNDLE_PATH.exists(), "rode: python scripts/export_content_bundle.py"
    committed = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    assert committed == json.loads(render_bundle()), "bundle desatualizado: rode python scripts/export_content_bundle.py"
    served = client.get("/v1/content").json()
    assert committed == served
