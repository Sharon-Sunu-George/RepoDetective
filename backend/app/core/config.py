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
    cors_origins: str = "http://localhost:8000,http://localhost:8005,http://127.0.0.1:8005,http://127.0.0.1:8000,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8443,http://127.0.0.1:8443,http://localhost:5173,http://127.0.0.1:5173,*"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # GitHub
    github_token: str = ""
    github_api_base: str = "https://api.github.com"
    github_timeout_seconds: float = 10.0

    # Gemini / generic LLM provider (supports Gemini models with fallback cascade)
    gemini_api_key: str = ""
    gemma_api_key: str = ""  # backwards compatibility
    gemini_api_base: str = ""  # e.g. https://api.example.com/v1 or empty for Google AI Studio
    gemma_api_base: str = ""  # backwards compatibility
    gemini_model: str = "gemini-3.1-flash-lite"
    gemma_model: str = "gemini-3.1-flash-lite"  # backwards compatibility
    gemini_timeout_seconds: float = 45.0
    gemma_timeout_seconds: float = 45.0  # backwards compatibility
    # When True (or when no credentials), use deterministic mock responses
    gemini_mock_mode: bool = False
    gemma_mock_mode: bool = False  # backwards compatibility

    @property
    def effective_api_key(self) -> str:
        return self.gemini_api_key or self.gemma_api_key

    @property
    def effective_api_base(self) -> str:
        return self.gemini_api_base or self.gemma_api_base

    @property
    def effective_model(self) -> str:
        return self.gemini_model or self.gemma_model or "gemini-3.1-flash-lite"

    # Sarvam AI Voice Agent (Indus / Samvaad)
    sarvam_api_key: str = ""
    sarvam_app_id: str = "Conversatio-6103dad4-f01f"
    sarvam_workspace_id: str = ""
    sarvam_org_id: str = ""
    sarvam_tts_model: str = "bulbul:v4-flash"
    sarvam_stt_model: str = "saaras:v4"
    sarvam_api_base: str = "https://apps.sarvam.ai/api/app-runtime"
    sarvam_timeout_seconds: float = 30.0

    # Parser / security limits
    max_files_to_fetch: int = 30
    max_file_size_bytes: int = 100_000  # 100 KB per file
    max_total_bytes: int = 500_000  # 500 KB total

    # Boolean parser for environment strings that may be "true"/"false" or "release"/"development"
    @field_validator("debug", "gemma_mock_mode", "gemini_mock_mode", mode="before")
    @classmethod
    def parse_bool(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.lower() in {"true", "1", "yes", "on"}
        return bool(v)

    @field_validator("github_timeout_seconds", "gemma_timeout_seconds", "gemini_timeout_seconds", mode="before")
    @classmethod
    def parse_float(cls, v: Any) -> float:
        try:
            return float(v)
        except Exception:
            return 10.0 if "github" in cls.__name__ else 30.0


settings = Settings()
