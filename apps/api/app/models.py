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


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(120)); position: Mapped[int] = mapped_column(Integer)
    lessons: Mapped[list["Lesson"]] = relationship(order_by="Lesson.position", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id"))
    letter: Mapped[str] = mapped_column(String(1)); title: Mapped[str] = mapped_column(String(120)); position: Mapped[int] = mapped_column(Integer); phase: Mapped[int] = mapped_column(Integer, default=1); phase_title: Mapped[str] = mapped_column(String(120), default="Vogais")
    exercises: Mapped[list["Exercise"]] = relationship(order_by="Exercise.position", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"))
    type: Mapped[str] = mapped_column(String(32)); instruction: Mapped[str] = mapped_column(String(255)); answer: Mapped[str] = mapped_column(String(16)); context_word: Mapped[str | None] = mapped_column(String(40), nullable=True)
    audio_asset: Mapped[str] = mapped_column(String(255)); options: Mapped[list | None] = mapped_column(JSON); position: Mapped[int] = mapped_column(Integer)


class Word(Base):
    __tablename__ = "words"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    text: Mapped[str] = mapped_column(String(40), unique=True); syllables: Mapped[str] = mapped_column(String(80)); required_letters: Mapped[str] = mapped_column(String(26), default=""); accented: Mapped[bool] = mapped_column(Boolean)
    length: Mapped[int] = mapped_column(Integer); frequency: Mapped[float] = mapped_column(Float)
    initial_difficulty: Mapped[str] = mapped_column(String(16)); current_difficulty: Mapped[str] = mapped_column(String(16)); classifier_version: Mapped[str] = mapped_column(String(40))


class Attempt(Base):
    __tablename__ = "attempts"; __table_args__ = (UniqueConstraint("user_id", "client_attempt_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    client_attempt_id: Mapped[str] = mapped_column(String(100)); exercise_id: Mapped[str] = mapped_column(String(80))
    answer: Mapped[str] = mapped_column(Text); correct: Mapped[bool] = mapped_column(Boolean); confidence: Mapped[float | None] = mapped_column(Float)
    uncertain: Mapped[bool] = mapped_column(Boolean); duration_ms: Mapped[int] = mapped_column(Integer); model_version: Mapped[str | None] = mapped_column(String(80)); occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Progress(Base):
    __tablename__ = "progress"; __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(String(64)); status: Mapped[str] = mapped_column(String(20)); completed_exercises: Mapped[int] = mapped_column(Integer)
    attempts: Mapped[int] = mapped_column(Integer, default=0); correct_attempts: Mapped[int] = mapped_column(Integer, default=0); accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0); last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True); next_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SyncEvent(Base):
    __tablename__ = "sync_events"; __table_args__ = (UniqueConstraint("user_id", "client_event_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True); user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    client_event_id: Mapped[str] = mapped_column(String(100)); type: Mapped[str] = mapped_column(String(20)); payload: Mapped[dict] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True)); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
