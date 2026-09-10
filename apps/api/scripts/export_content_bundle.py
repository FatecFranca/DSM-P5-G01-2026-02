"""Gera apps/mobile/assets/content/seed-bundle.json a partir do seed, num SQLite temporário.

O bundle é o que o app usa no primeiro boot, antes de conseguir baixar /v1/content.
tests/test_seed_bundle.py falha se o arquivo commitado divergir do seed.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT.parents[1] / "apps" / "mobile" / "assets" / "content" / "seed-bundle.json"


def render_bundle() -> str:
    os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    os.environ.setdefault("JWT_SECRET", "seed-bundle-export-not-a-real-secret")
    sys.path.insert(0, str(ROOT))
    from app.content import content_bundle
    from app.content_lint import lint_content
    from app.db import Base, SessionLocal, engine
    from app.seed import seed_content

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed_content()
    with SessionLocal() as db:
        bundle = content_bundle(db)
    if errors := lint_content(bundle):
        raise SystemExit("Conteúdo semente inválido:\n" + "\n".join(errors))
    return json.dumps(bundle, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    BUNDLE_PATH.parent.mkdir(parents=True, exist_ok=True)
    BUNDLE_PATH.write_text(render_bundle(), encoding="utf-8", newline="\n")
    print(f"wrote {BUNDLE_PATH}")
