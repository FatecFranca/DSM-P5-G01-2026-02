from datetime import datetime
from typing import Annotated, Literal, Union
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class Credentials(BaseModel):
    email: EmailStr; password: str = Field(min_length=8, max_length=128)
class LoginCredentials(BaseModel):
    email: EmailStr; password: str = Field(min_length=1, max_length=128)
class RefreshRequest(BaseModel): refresh_token: str
class Tokens(BaseModel): access_token: str; refresh_token: str; token_type: str = "bearer"; expires_in: int

class AttemptPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client_attempt_id: str = Field(min_length=1, max_length=100)
    item_id: str | None = Field(default=None, max_length=80); unit_id: str | None = Field(default=None, max_length=64); exercise_type: str | None = Field(default=None, max_length=32)
    answer: str = Field(max_length=500); correct: bool; duration_ms: int = Field(ge=0, le=3_600_000)
    # Contexto de sessão (docs/adr/0003), todo opcional para não quebrar clientes anteriores.
    session_id: str | None = Field(default=None, max_length=64); position_in_session: int | None = Field(default=None, ge=1); attempt_index_in_item: int | None = Field(default=None, ge=1)
    audio_repeats: int | None = Field(default=None, ge=0); time_to_first_interaction_ms: int | None = Field(default=None, ge=0, le=3_600_000)
    served_by: Literal["rules", "model"] | None = None; served_policy_version: str | None = Field(default=None, max_length=32); served_model_version: str | None = Field(default=None, max_length=80)
    # Aceitos por uma release: nomes antigos (exercise_id/lesson_id) e campos do classificador removido (ignorados).
    exercise_id: str | None = Field(default=None, max_length=80); lesson_id: str | None = Field(default=None, max_length=64)
    confidence: float | None = Field(default=None, ge=0, le=1); uncertain: bool | None = None; model_version: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def adopt_legacy_names(self):
        self.item_id = self.item_id or self.exercise_id; self.unit_id = self.unit_id or self.lesson_id
        if not self.item_id: raise ValueError("item_id é obrigatório")
        return self

DEPRECATED_ATTEMPT_FIELDS = {"confidence", "uncertain", "model_version", "exercise_id", "lesson_id"}

class ProgressPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    unit_id: str | None = Field(default=None, max_length=64); lesson_id: str | None = Field(default=None, max_length=64)
    status: Literal["not_started", "in_progress", "completed", "mastered", "review", "needs_review"]; completed_exercises: int = Field(ge=0); completed_types: list[str] = Field(default_factory=list, max_length=10)
    attempts: int = Field(default=0, ge=0); correct_attempts: int = Field(default=0, ge=0); accuracy: float | None = Field(default=None, ge=0, le=1); review_count: int = Field(default=0, ge=0); last_practiced_at: datetime | None = None; next_review_at: datetime | None = None

    @model_validator(mode="after")
    def adopt_legacy_names(self):
        self.unit_id = self.unit_id or self.lesson_id
        if not self.unit_id: raise ValueError("unit_id é obrigatório")
        return self

DEPRECATED_PROGRESS_FIELDS = {"lesson_id"}

class ItemStatePayload(BaseModel):
    """Espelha apps/mobile/src/domain/scheduler.ts::ItemState."""
    model_config = ConfigDict(extra="forbid")
    item_id: str = Field(min_length=1, max_length=80); unit_id: str | None = Field(default=None, max_length=64)
    strength: int = Field(ge=0); half_life_hours: float = Field(gt=0); due_at: datetime
    reps: int = Field(ge=0); lapses: int = Field(ge=0); consecutive_correct: int = Field(ge=0); last_result: bool; last_seen_at: datetime

class AttemptEvent(BaseModel):
    client_event_id: str = Field(min_length=1, max_length=100); type: Literal["attempt"]; occurred_at: datetime; payload: AttemptPayload
class ProgressEvent(BaseModel):
    client_event_id: str = Field(min_length=1, max_length=100); type: Literal["progress"]; occurred_at: datetime; payload: ProgressPayload
class ItemStateEvent(BaseModel):
    client_event_id: str = Field(min_length=1, max_length=100); type: Literal["item_state"]; occurred_at: datetime; payload: ItemStatePayload
SyncEventIn = Annotated[Union[AttemptEvent, ProgressEvent, ItemStateEvent], Field(discriminator="type")]
class SyncPush(BaseModel): events: list[SyncEventIn] = Field(max_length=500)
class SyncRejection(BaseModel):
    client_event_id: str
    reason: str

class SyncPushResult(BaseModel):
    accepted: int
    duplicates: int
    accepted_ids: list[str]
    # Eventos que o catálogo atual não reconhece (ex.: exercício removido numa versão antiga do app).
    # Vêm separados para o cliente tirá-los da fila: derrubar o lote inteiro travaria a sincronização para sempre.
    rejected: int = 0
    rejected_ids: list[str] = []
    rejections: list[SyncRejection] = []
