from datetime import datetime
from typing import Annotated, Literal, Union
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class Credentials(BaseModel):
    email: EmailStr; password: str = Field(min_length=8, max_length=128)
class LoginCredentials(BaseModel):
    email: EmailStr; password: str = Field(min_length=1, max_length=128)
class RefreshRequest(BaseModel): refresh_token: str
class Tokens(BaseModel): access_token: str; refresh_token: str; token_type: str = "bearer"; expires_in: int

class AttemptPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client_attempt_id: str = Field(min_length=1, max_length=100); exercise_id: str
    answer: str = Field(max_length=500); correct: bool; confidence: float | None = Field(default=None, ge=0, le=1)
    uncertain: bool; duration_ms: int = Field(ge=0, le=3_600_000); model_version: str | None = Field(default=None, max_length=80)
class ProgressPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lesson_id: str; status: Literal["not_started", "in_progress", "completed"]; completed_exercises: int = Field(ge=0)
class AttemptEvent(BaseModel):
    client_event_id: str = Field(min_length=1, max_length=100); type: Literal["attempt"]; occurred_at: datetime; payload: AttemptPayload
class ProgressEvent(BaseModel):
    client_event_id: str = Field(min_length=1, max_length=100); type: Literal["progress"]; occurred_at: datetime; payload: ProgressPayload
SyncEventIn = Annotated[Union[AttemptEvent, ProgressEvent], Field(discriminator="type")]
class SyncPush(BaseModel): events: list[SyncEventIn] = Field(max_length=500)
class SyncPushResult(BaseModel):
    accepted: int
    duplicates: int
    accepted_ids: list[str]
