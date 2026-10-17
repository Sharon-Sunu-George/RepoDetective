"""Schemas for learning / lesson endpoints."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class Lesson(BaseModel):
    title: str
    content: str


# New richer schemas ---------------------------------------------------------


class LearningPathRequest(BaseModel):
    repository_url: str = Field(..., description="Public GitHub URL")
    level: str = Field(default="beginner", description="beginner | intermediate | advanced")
    goal: Optional[str] = Field(default=None, description="Optional learning goal")


class Mission(BaseModel):
    id: str
    title: str
    description: str
    hint: Optional[str] = None
    evidence_paths: list[str] = Field(default_factory=list)
    difficulty: str = "beginner"


class LearningPathResponse(BaseModel):
    repository: dict[str, str]
    level: str
    missions: list[Mission]
    overview: str


class LessonDetail(BaseModel):
    id: str
    title: str
    body: str
    evidence_paths: list[str] = Field(default_factory=list)


class HintRequest(BaseModel):
    repository_url: str
    mission_id: str
    attempt: Optional[str] = None


class HintResponse(BaseModel):
    mission_id: str
    hint: str
    evidence_paths: list[str] = Field(default_factory=list)


class ChallengeCheckRequest(BaseModel):
    repository_url: str
    mission_id: str
    answer: str


class ChallengeCheckResponse(BaseModel):
    mission_id: str
    correct: bool
    feedback: str
    expected_keywords: list[str] = Field(default_factory=list)
