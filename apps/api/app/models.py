import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    refresh_jti_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --- Conteúdo -----------------------------------------------------------------------------------------------------
# Dois eixos independentes (docs/adr/0002): o portão pedagógico é `required_letters` (letras já apresentadas ao aprendiz);
# a trilha é só agrupamento temático e nunca libera nada. `review_status`: candidate | pending | approved | rejected.

class Track(Base):
    __tablename__ = "tracks"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True); title: Mapped[str] = mapped_column(String(120)); kind: Mapped[str] = mapped_column(String(16), default="theme")  # phonics | theme
    description: Mapped[str | None] = mapped_column(String(255), nullable=True); position: Mapped[int] = mapped_column(Integer)
    review_status: Mapped[str] = mapped_column(String(16), default="pending"); version: Mapped[int] = mapped_column(Integer, default=1)
    units: Mapped[list["Unit"]] = relationship(order_by="Unit.position", cascade="all, delete-orphan")


class Unit(Base):
    __tablename__ = "units"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    track_id: Mapped[str] = mapped_column(ForeignKey("tracks.id"))
    kind: Mapped[str] = mapped_column(String(16), default="letter")  # letter | word | sentence
    title: Mapped[str] = mapped_column(String(120)); position: Mapped[int] = mapped_column(Integer)
    phase: Mapped[int | None] = mapped_column(Integer, nullable=True); phase_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    focus_letter: Mapped[str | None] = mapped_column(String(1), nullable=True); required_letters: Mapped[str] = mapped_column(String(26), default="")
    review_status: Mapped[str] = mapped_column(String(16), default="pending"); version: Mapped[int] = mapped_column(Integer, default=1)
    items: Mapped[list["Item"]] = relationship(order_by="Item.position", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("units.id"))
    type: Mapped[str] = mapped_column(String(32)); item_kind: Mapped[str] = mapped_column(String(16), default="letter"); target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    instruction: Mapped[str] = mapped_column(String(255)); answer: Mapped[str] = mapped_column(String(80)); options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    context_word: Mapped[str | None] = mapped_column(String(40), nullable=True); word_choices: Mapped[list | None] = mapped_column(JSON, nullable=True); payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    required_letters: Mapped[str] = mapped_column(String(26), default="")
    audio_asset: Mapped[str | None] = mapped_column(String(255), nullable=True); tts_fallback_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer); review_status: Mapped[str] = mapped_column(String(16), default="pending")


class Word(Base):
    __tablename__ = "words"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    text: Mapped[str] = mapped_column(String(40), unique=True); syllables: Mapped[list] = mapped_column(JSON, default=list); required_letters: Mapped[str] = mapped_column(String(26), default="")
    accented: Mapped[bool] = mapped_column(Boolean, default=False); length: Mapped[int] = mapped_column(Integer, default=0)
    frequency: Mapped[float | None] = mapped_column(Float, nullable=True); raw_frequency: Mapped[int | None] = mapped_column(Integer, nullable=True); frequency_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    initial_difficulty: Mapped[str] = mapped_column(String(16), default="medio"); current_difficulty: Mapped[str] = mapped_column(String(16), default="medio"); difficulty_rationale: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_asset: Mapped[str | None] = mapped_column(String(255), nullable=True); image_alt: Mapped[str | None] = mapped_column(String(120), nullable=True); audio_asset: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region_notes: Mapped[str | None] = mapped_column(String(255), nullable=True); license: Mapped[str | None] = mapped_column(String(120), nullable=True); attribution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True); review_status: Mapped[str] = mapped_column(String(16), default="candidate"); content_version: Mapped[int] = mapped_column(Integer, default=1)


class Syllable(Base):
    __tablename__ = "syllables"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)  # o próprio texto, ex.: "MA"
    text: Mapped[str] = mapped_column(String(16)); pattern: Mapped[str] = mapped_column(String(4))  # V | CV | CVC | CCV | CVV | outro
    required_letters: Mapped[str] = mapped_column(String(26), default=""); position: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[str] = mapped_column(String(16), default="facil"); audio_asset: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_status: Mapped[str] = mapped_column(String(16), default="pending")


class Sentence(Base):
    __tablename__ = "sentences"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    text: Mapped[str] = mapped_column(String(200)); track_id: Mapped[str | None] = mapped_column(ForeignKey("tracks.id"), nullable=True)
    required_word_ids: Mapped[list] = mapped_column(JSON, default=list); required_letters: Mapped[str] = mapped_column(String(26), default=""); word_count: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[str] = mapped_column(String(16), default="medio"); audio_asset: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_asset: Mapped[str | None] = mapped_column(String(255), nullable=True); image_alt: Mapped[str | None] = mapped_column(String(120), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True); attribution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_status: Mapped[str] = mapped_column(String(16), default="pending"); content_version: Mapped[int] = mapped_column(Integer, default=1)


class WordTrack(Base):
    __tablename__ = "word_tracks"
    word_id: Mapped[str] = mapped_column(ForeignKey("words.id"), primary_key=True); track_id: Mapped[str] = mapped_column(ForeignKey("tracks.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class ContentReview(Base):
    __tablename__ = "content_reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    entity_type: Mapped[str] = mapped_column(String(16)); entity_id: Mapped[str] = mapped_column(String(80)); entity_version: Mapped[int] = mapped_column(Integer, default=1)
    reviewer: Mapped[str] = mapped_column(String(120)); decision: Mapped[str] = mapped_column(String(16)); source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True); reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(255), primary_key=True)  # caminho relativo, ex.: audio/syllable/ma.mp3
    kind: Mapped[str] = mapped_column(String(16)); audio_kind: Mapped[str | None] = mapped_column(String(16), nullable=True)  # phoneme | letter_name | syllable | word | sentence | instruction
    license: Mapped[str | None] = mapped_column(String(120), nullable=True); attribution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True); duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ContentVersion(Base):
    __tablename__ = "content_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version: Mapped[str] = mapped_column(String(32)); checksum: Mapped[str] = mapped_column(String(64)); notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# --- Aprendizagem -------------------------------------------------------------------------------------------------

class Attempt(Base):
    __tablename__ = "attempts"; __table_args__ = (UniqueConstraint("user_id", "client_attempt_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    client_attempt_id: Mapped[str] = mapped_column(String(100)); item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    unit_id: Mapped[str | None] = mapped_column(ForeignKey("units.id"), nullable=True); exercise_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    answer: Mapped[str] = mapped_column(Text); correct: Mapped[bool] = mapped_column(Boolean); duration_ms: Mapped[int] = mapped_column(Integer)
    served_model_version: Mapped[str | None] = mapped_column(String(80), nullable=True); occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Progress(Base):
    __tablename__ = "progress"; __table_args__ = (UniqueConstraint("user_id", "unit_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("units.id")); status: Mapped[str] = mapped_column(String(20)); completed_exercises: Mapped[int] = mapped_column(Integer); completed_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0); correct_attempts: Mapped[int] = mapped_column(Integer, default=0); accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0); last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True); next_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SyncEvent(Base):
    __tablename__ = "sync_events"; __table_args__ = (UniqueConstraint("user_id", "client_event_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    client_event_id: Mapped[str] = mapped_column(String(100)); type: Mapped[str] = mapped_column(String(20)); payload: Mapped[dict] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True)); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
