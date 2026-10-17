"""Schemas for agent execution endpoints."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    repository_url: str


class AgentRunRequest(BaseModel):
    repository_url: str = Field(..., description="Public GitHub URL")
    agents: Optional[list[str]] = Field(
        default=None, description="Subset to run: analyst, teacher, verification. Default all three."
    )


class AgentFinding(BaseModel):
    id: str
    summary: str
    evidence_paths: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class AnalystOutput(BaseModel):
    findings: list[AgentFinding] = Field(default_factory=list)
    important_files: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    languages: dict[str, int] = Field(default_factory=dict)
    relationships: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class TeacherMission(BaseModel):
    id: str
    title: str
    explanation: str
    hint: str
    evidence_paths: list[str] = Field(default_factory=list)


class TeacherOutput(BaseModel):
    overview: str
    missions: list[TeacherMission] = Field(default_factory=list)


class VerificationIssue(BaseModel):
    severity: str  # "error" | "warning"
    message: str
    path: Optional[str] = None


class VerificationOutput(BaseModel):
    passed: bool
    issues: list[VerificationIssue] = Field(default_factory=list)
    verified_paths: list[str] = Field(default_factory=list)
    unsupported_claims: list[str] = Field(default_factory=list)


class AgentRunResponse(BaseModel):
    repository: dict[str, str]
    analyst: Optional[AnalystOutput] = None
    teacher: Optional[TeacherOutput] = None
    verification: Optional[VerificationOutput] = None
    final_verified: bool
    gemma_mode: str  # "live" | "mock"
