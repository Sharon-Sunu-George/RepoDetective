"""Pydantic schemas for repository-related endpoints."""

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.security import SecurityError, validate_and_parse_github_url


# ---------------------------------------------------------------------------
# Request / response helpers
# ---------------------------------------------------------------------------


class RepositoryAnalyzeRequest(BaseModel):
    repository_url: str = Field(..., description="Public GitHub URL, e.g. https://github.com/owner/repo")

    @field_validator("repository_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        try:
            validate_and_parse_github_url(v)
        except SecurityError as exc:
            raise ValueError(str(exc)) from exc
        return v.strip()


class RepositoryFileInfo(BaseModel):
    path: str
    size: Optional[int] = None
    type: Optional[str] = None  # "file" | "dir"
    language: Optional[str] = None
    truncated: bool = False


class RepositoryAnalysisResult(BaseModel):
    """Structured analysis returned by the parser + agents."""

    owner: str
    repo: str
    url: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    readme: Optional[str] = None
    languages: dict[str, int] = Field(default_factory=dict)
    directory_tree: list[dict[str, Any]] = Field(default_factory=list)
    important_files: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    file_relationships: list[dict[str, Any]] = Field(default_factory=list)
    file_contents: dict[str, str] = Field(default_factory=dict)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RepositoryAnalyzeResponse(BaseModel):
    repository: dict[str, str]
    analysis: RepositoryAnalysisResult
    # Full agent workflow output
    agents: Optional[dict[str, Any]] = None


# Backwards-compat simple model (already existed)
class Repository(BaseModel):
    owner: str
    name: str
    url: str
