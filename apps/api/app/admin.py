"""Backend do Estúdio local de conteúdo.

O editor trabalha em um snapshot no SQLite; somente uma publicação validada
troca o snapshot que /v1/content expõe. Assim tentativas apontando para IDs
antigos continuam válidas e um novo seed não atropela a curadoria local.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import socket
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import issue
from .content import content_body, content_checksum
from .content_lint import lint_content
from .db import get_db
from .models import Asset, ContentStudioState, ContentVersion, Item, Sentence, Syllable, Track, Unit, User, Word
from .schemas import Credentials, LoginCredentials, Tokens
from .security import hash_password, verify_password
from .content_types import ExerciseType, TARGET_OF

router = APIRouter(prefix="/v1/admin", tags=["content-studio"])
media_router = APIRouter(prefix="/v1", tags=["media"])
MEDIA_ROOT = Path(__file__).resolve().parent / "data" / "media"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/svg+xml": ".svg"}


class PublishRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=255)


class ImportImage(BaseModel):
    url: HttpUrl
    alt: str = Field(min_length=1, max_length=120)
    license: str = Field(min_length=1, max_length=120)
    attribution: str = Field(min_length=1, max_length=255)


def admin(user: User = Depends(__import__("app.deps", fromlist=["current_user"]).current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator access is required")
    return user


def _state(db: Session, initial: dict | None = None) -> ContentStudioState:
    state = db.get(ContentStudioState, 1)
    if not state:
        body = initial if initial is not None else content_body(db)
        state = ContentStudioState(id=1, draft=body, published=None)
        db.add(state); db.flush()
    if state.draft is None:
        state.draft = state.published or initial or content_body(db)
    return state


def _ids(body: dict) -> tuple[set[str], set[str]]:
    units = {u["id"] for t in body.get("tracks", []) for u in t.get("units", [])}
    items = {i["id"] for t in body.get("tracks", []) for u in t.get("units", []) for i in u.get("items", [])}
    return units, items


def _validate_draft(body: dict, published: dict | None) -> list[str]:
    if not isinstance(body, dict): return ["O catálogo precisa ser um objeto JSON."]
    errors = lint_content(body)
    if published:
        old_units, old_items = _ids(published); new_units, new_items = _ids(body)
        missing_units, missing_items = old_units - new_units, old_items - new_items
        if missing_units: errors.append("Unidades publicadas não podem ser apagadas; marque-as como retired.")
        if missing_items: errors.append("Atividades publicadas não podem ser apagadas; marque-as como retired.")
    return errors


def _materialize(db: Session, body: dict) -> None:
    """Espelha o snapshot publicado nas tabelas operacionais.

    Sync, ranking e chaves estrangeiras continuam consultando Item/Unit; o
    snapshot sozinho não basta para itens novos. Registros ausentes são
    aposentados em vez de removidos para preservar tentativas e progresso.
    """
    wanted_tracks, wanted_units, wanted_items = set(), set(), set()
    for track_data in body["tracks"]:
        track = db.get(Track, track_data["id"]) or Track(id=track_data["id"])
        for key in ("slug", "title", "kind", "description", "position"):
            setattr(track, key, track_data.get(key))
        track.review_status = "approved"; wanted_tracks.add(track.id); db.add(track)
        for unit_data in track_data["units"]:
            unit = db.get(Unit, unit_data["id"]) or Unit(id=unit_data["id"])
            for key in ("kind", "title", "position", "phase", "phase_title", "focus_letter", "required_letters"):
                setattr(unit, key, unit_data.get(key))
            unit.track_id = track.id; unit.review_status = "approved"; wanted_units.add(unit.id); db.add(unit)
            for item_data in unit_data["items"]:
                item = db.get(Item, item_data["id"]) or Item(id=item_data["id"])
                for key in ("type", "item_kind", "target_id", "instruction", "answer", "options", "context_word", "word_choices", "payload", "required_letters", "audio_asset", "tts_fallback_text", "position"):
                    setattr(item, key, item_data.get(key))
                item.unit_id = unit.id; item.review_status = "approved"; wanted_items.add(item.id); db.add(item)
    for row in db.scalars(select(Item).where(Item.id.not_in(wanted_items))).all(): row.review_status = "retired"
    for row in db.scalars(select(Unit).where(Unit.id.not_in(wanted_units))).all(): row.review_status = "retired"
    for row in db.scalars(select(Track).where(Track.id.not_in(wanted_tracks))).all(): row.review_status = "retired"
    for data in body.get("words", []):
        word = db.get(Word, data["id"]) or Word(id=data["id"], text=data["text"])
        word.text, word.syllables, word.required_letters = data["text"], data["syllables"], data["required_letters"]
        word.current_difficulty, word.frequency, word.review_status = data.get("difficulty", "medio"), data.get("frequency"), "approved"
        word.image_asset, word.image_alt, word.license, word.attribution = data.get("image_asset"), data.get("image_alt"), data.get("license"), data.get("attribution")
        db.add(word)
    for data in body.get("sentences", []):
        sentence = db.get(Sentence, data["id"]) or Sentence(id=data["id"], text=data["text"])
        for key in ("text", "required_letters", "required_word_ids", "difficulty", "image_asset", "image_alt", "license", "attribution"):
            setattr(sentence, key, data.get(key))
        sentence.word_count = len(sentence.text.split()); sentence.review_status = "approved"; db.add(sentence)
    for data in body.get("syllables", []):
        syllable = db.get(Syllable, data["id"]) or Syllable(id=data["id"])
        syllable.text, syllable.pattern, syllable.required_letters, syllable.position = data["text"], data["pattern"], data["required_letters"], data["position"]
        syllable.review_status = "approved"; db.add(syllable)


@router.get("/setup/status")
def setup_status(db: Session = Depends(get_db)):
    return {"configured": bool(db.scalar(select(User.id).where(User.is_admin.is_(True))))}


@router.post("/setup", response_model=Tokens, status_code=201)
def setup(data: Credentials, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.is_admin.is_(True))):
        raise HTTPException(409, "The local administrator is already configured")
    email = data.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    user = User(email=email, password_hash=hash_password(data.password), is_admin=True)
    db.add(user); db.flush(); _state(db)
    return issue(db, user)


@router.post("/login", response_model=Tokens)
def login(data: LoginCredentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.is_admin or not verify_password(user.password_hash, data.password):
        raise HTTPException(401, "Invalid administrator credentials")
    return issue(db, user)


@router.get("/draft")
def get_draft(_: User = Depends(admin), db: Session = Depends(get_db)):
    return _state(db).draft


@router.get("/types")
def exercise_types(_: User = Depends(admin)):
    """Tipos efetivamente aceitos, para o seletor não inventar aliases."""
    return {"items": [{"id": kind.value, "item_kind": TARGET_OF[kind].value,
                       "label": kind.value.replace("_", " ").capitalize()} for kind in ExerciseType]}


@router.get("/assets")
def list_assets(_: User = Depends(admin), db: Session = Depends(get_db)):
    rows = db.scalars(select(Asset).where(Asset.kind == "image").order_by(Asset.id)).all()
    return {"items": [{"id": row.id, "url": f"/v1/media/{row.id.removeprefix('media/')}", "alt": row.alt,
                       "license": row.license, "attribution": row.attribution} for row in rows]}


@router.put("/draft")
def save_draft(body: dict = Body(...), _: User = Depends(admin), db: Session = Depends(get_db)):
    state = _state(db)
    errors = _validate_draft(body, state.published)
    # É permitido salvar rascunho incompleto: o painel precisa mostrar os erros
    # enquanto a pessoa está montando a atividade. Publicar é o bloqueio real.
    state.draft = body; db.commit()
    return {"saved": True, "errors": errors}


@router.post("/validate")
def validate(_: User = Depends(admin), db: Session = Depends(get_db)):
    state = _state(db)
    errors = _validate_draft(state.draft, state.published)
    return {"valid": not errors, "errors": errors}


@router.post("/publish")
def publish(data: PublishRequest, user: User = Depends(admin), db: Session = Depends(get_db)):
    state = _state(db)
    errors = _validate_draft(state.draft, state.published)
    if errors:
        raise HTTPException(422, {"message": "O catálogo possui erros e não foi publicado.", "errors": errors})
    snapshot = json.loads(json.dumps(state.draft, ensure_ascii=False))
    checksum = content_checksum(snapshot)
    _materialize(db, snapshot); state.published = snapshot
    latest = db.scalar(select(ContentVersion).order_by(ContentVersion.id.desc()))
    if not latest or latest.checksum != checksum or not latest.snapshot:
        db.add(ContentVersion(version=checksum[:16], checksum=checksum, notes=data.notes, snapshot=snapshot, author_id=user.id))
    db.commit()
    return {"published": True, "version": checksum[:16], "etag": checksum}


@router.get("/versions")
def versions(_: User = Depends(admin), db: Session = Depends(get_db)):
    rows = db.scalars(select(ContentVersion).order_by(ContentVersion.id.desc())).all()
    return [{"id": row.id, "version": row.version, "checksum": row.checksum, "notes": row.notes, "published_at": row.published_at, "author_id": row.author_id} for row in rows]


@router.post("/versions/{version_id}/restore")
def restore(version_id: int, data: PublishRequest, user: User = Depends(admin), db: Session = Depends(get_db)):
    version = db.get(ContentVersion, version_id)
    if not version or not version.snapshot:
        raise HTTPException(404, "Version snapshot not found")
    state = _state(db)
    errors = _validate_draft(version.snapshot, state.published)
    if errors:
        raise HTTPException(422, {"message": "A versão não respeita o contrato atual.", "errors": errors})
    state.draft = json.loads(json.dumps(version.snapshot, ensure_ascii=False)); state.published = json.loads(json.dumps(version.snapshot, ensure_ascii=False)); _materialize(db, state.published)
    checksum = content_checksum(state.published)
    db.add(ContentVersion(version=checksum[:16], checksum=checksum, notes=data.notes or f"restauração da versão {version_id}", snapshot=state.published, author_id=user.id))
    db.commit()
    return {"restored": True, "version": checksum[:16]}


def _validate_image(data: bytes, content_type: str | None) -> tuple[str, str]:
    content_type = (content_type or "").lower().split(";", 1)[0]
    if len(data) > MAX_IMAGE_BYTES: raise HTTPException(413, "Image exceeds the 5 MB limit")
    if not data: raise HTTPException(422, "Empty image")
    magic = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png", b"RIFF": "image/webp"}
    detected = next((kind for prefix, kind in magic.items() if data.startswith(prefix)), None)
    if data.lstrip().startswith(b"<svg") or b"<svg" in data[:512].lower(): detected = "image/svg+xml"
    if not detected or detected not in IMAGE_TYPES or (content_type and content_type != detected):
        raise HTTPException(422, "Only valid JPEG, PNG, WebP or SVG images are accepted")
    return detected, IMAGE_TYPES[detected]


def _save_image(data: bytes, content_type: str, alt: str, license: str, attribution: str, db: Session) -> dict:
    _, extension = _validate_image(data, content_type)
    asset_id = f"media/{uuid.uuid4().hex}{extension}"
    output = MEDIA_ROOT / asset_id.removeprefix("media/"); output.parent.mkdir(parents=True, exist_ok=True); output.write_bytes(data)
    db.add(Asset(id=asset_id, kind="image", license=license, attribution=attribution, checksum=hashlib.sha256(data).hexdigest(), alt=alt))
    state = _state(db)
    draft = json.loads(json.dumps(state.draft, ensure_ascii=False))
    assets = draft.setdefault("assets", [])
    assets[:] = [entry for entry in assets if entry.get("id") != asset_id]
    assets.append({"id": asset_id, "kind": "image", "alt": alt, "license": license, "attribution": attribution})
    state.draft = draft; db.commit()
    return {"id": asset_id, "url": f"/v1/media/{asset_id.removeprefix('media/')}", "alt": alt, "license": license, "attribution": attribution}


@router.post("/assets/upload")
async def upload_image(file: UploadFile = File(...), alt: str = "", license: str = "Arquivo próprio", attribution: str = "Administrador local", _: User = Depends(admin), db: Session = Depends(get_db)):
    if not alt.strip(): raise HTTPException(422, "Accessible image description is required")
    return _save_image(await file.read(MAX_IMAGE_BYTES + 1), file.content_type or "", alt.strip(), license, attribution, db)


def _safe_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname: raise HTTPException(422, "Only http(s) image URLs are allowed")
    try: addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except OSError: raise HTTPException(422, "Could not resolve image host")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global: raise HTTPException(422, "Private or local image hosts are not allowed")


class _RejectRedirect(urllib.request.HTTPRedirectHandler):
    """Uma URL de imagem não pode trocar de host depois da validação anti-SSRF."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        raise HTTPException(422, "Image URLs with redirects are not allowed")


@router.post("/assets/import-url")
def import_image(data: ImportImage, _: User = Depends(admin), db: Session = Depends(get_db)):
    url = str(data.url); _safe_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": "Prosa-Local-Studio/1.0"})
    try:
        # Não seguir redirects: sem isso uma URL pública aprovada poderia
        # redirecionar o processo local para uma rede privada.
        with urllib.request.build_opener(_RejectRedirect()).open(request, timeout=10) as response:
            if response.status != 200: raise HTTPException(422, "Image URL did not return 200")
            if int(response.headers.get("Content-Length", "0") or 0) > MAX_IMAGE_BYTES: raise HTTPException(413, "Image exceeds the 5 MB limit")
            binary = response.read(MAX_IMAGE_BYTES + 1); content_type = response.headers.get_content_type()
    except HTTPException: raise
    except Exception: raise HTTPException(422, "Could not download the image")
    return _save_image(binary, content_type, data.alt, data.license, data.attribution, db)


@media_router.get("/media/{asset_path:path}", include_in_schema=False)
def media(asset_path: str, db: Session = Depends(get_db)):
    asset_id = f"media/{asset_path}"
    asset = db.get(Asset, asset_id)
    if not asset or asset.kind != "image": raise HTTPException(404, "Media not found")
    candidate = (MEDIA_ROOT / asset_path).resolve()
    if MEDIA_ROOT.resolve() not in candidate.parents or not candidate.is_file(): raise HTTPException(404, "Media file not found")
    return FileResponse(candidate)
