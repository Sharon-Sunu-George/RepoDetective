"""Application configuration loaded from environment variables."""

from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object.

    All fields have safe defaults so the app boots without a .env file.
    Secrets are never committed — see .env.example.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding="utf-8")

    # General
    app_name: str = "RepoDetective API"
    environment: str = "development"
    debug: bool = False

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8443,http://127.0.0.1:8443,http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # GitHub
    github_token: str = ""
    github_api_base: str = "https://api.github.com"
    github_timeout_seconds: float = 10.0

    # Gemma / generic LLM provider
    gemma_api_key: str = ""
    gemma_api_base: str = ""  # e.g. https://api.example.com/v1
    gemma_model: str = "gemma-3-4b-it"
    gemma_timeout_seconds: float = 30.0
    # When True (or when no credentials), use deterministic mock responses
    gemma_mock_mode: bool = True

    # Parser / security limits
    max_files_to_fetch: int = 30
    max_file_size_bytes: int = 100_000  # 100 KB per file
    max_total_bytes: int = 500_000  # 500 KB total

    # Boolean parser for environment strings that may be "true"/"false" or "release"/"development"
    @field_validator("debug", "gemma_mock_mode", mode="before")
    @classmethod
    def parse_bool(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.lower() in {"true", "1", "yes", "on"}
        return bool(v)

    @field_validator("github_timeout_seconds", "gemma_timeout_seconds", mode="before")
    @classmethod
    def parse_float(cls, v: Any) -> float:
        try:
            return float(v)
        except Exception:
            return 10.0 if "github" in cls.__name__ else 30.0


settings = Settings()
