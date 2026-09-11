from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite+pysqlite:///./alfabetiza.db"
    jwt_secret: str = Field(default="development-only-secret-change-me", min_length=32)
    access_token_minutes: int = Field(default=15, ge=1)
    refresh_token_days: int = Field(default=30, ge=1)
    environment: str = "development"
    # Ranking no servidor (docs/adr/0004). Desligado por padrão; ligar é o kill switch inverso.
    ranking_model_enabled: bool = False
    ranking_model_path: str | None = None
    # Shadow mode: o modelo é calculado e registrado em ranking_logs, mas as regras são servidas.
    ranking_shadow_mode: bool = True
    ranking_epsilon: float = Field(default=0.05, ge=0, le=0.5)
    ranking_cold_start_attempts: int = Field(default=50, ge=0)
    ranking_min_item_encounters: int = Field(default=2, ge=0)

    @model_validator(mode="after")
    def secure_production(self):
        if self.environment == "production" and "change-me" in self.jwt_secret:
            raise ValueError("JWT_SECRET must be configured in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
