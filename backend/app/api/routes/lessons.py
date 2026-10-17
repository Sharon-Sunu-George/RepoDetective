"""Learning-path, lesson, hint, and challenge endpoints.

These endpoints re-fetch and re-parse the repository on each call (stateless).
For the hackathon demo a simple in-memory cache could be added later.
"""

from fastapi import APIRouter, HTTPException

from app.core.security import SecurityError, validate_and_parse_github_url
from app.schemas.lesson import ChallengeCheckRequest, HintRequest, LearningPathRequest
from app.services.github_service import GitHubError, GitHubService
from app.services.lesson_service import LessonService
from app.services.repository_parser import RepositoryParser

router = APIRouter(prefix="/api", tags=["lessons"])


async def _get_parsed(repository_url: str) -> dict:
    try:
        owner, repo = validate_and_parse_github_url(repository_url)
    except SecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    github = GitHubService()
    try:
        bundle = await github.fetch_repository(owner, repo)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    parser = RepositoryParser()
    parsed = parser.parse(bundle)
    parsed["_owner"] = owner
    parsed["_repo"] = repo
    return parsed


@router.post("/learning-path", summary="Generate a learning path")
async def generate_learning_path(body: LearningPathRequest) -> dict:
    parsed = await _get_parsed(body.repository_url)
    svc = LessonService()
    path = svc.build_learning_path(parsed, level=body.level, goal=body.goal)
    return {
        "repository": {"owner": parsed["_owner"], "repo": parsed["_repo"], "url": f"https://github.com/{parsed['_owner']}/{parsed['_repo']}"},
        "level": path["level"],
        "overview": path["overview"],
        "missions": path["missions"],
    }


@router.get("/lessons/{lesson_id}", summary="Retrieve a single lesson")
async def get_lesson(lesson_id: str, repository_url: str) -> dict:
    parsed = await _get_parsed(repository_url)
    svc = LessonService()
    lesson = svc.get_lesson(parsed, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson {lesson_id} not found.")
    return lesson


@router.post("/hints", summary="Get a hint for a mission")
async def get_hint(body: HintRequest) -> dict:
    parsed = await _get_parsed(body.repository_url)
    svc = LessonService()
    hint = svc.get_hint(parsed, body.mission_id, body.attempt)
    if not hint:
        raise HTTPException(status_code=404, detail=f"Mission {body.mission_id} not found.")
    return hint


@router.post("/challenges/check", summary="Check a challenge answer")
async def check_challenge(body: ChallengeCheckRequest) -> dict:
    parsed = await _get_parsed(body.repository_url)
    svc = LessonService()
    result = svc.check_answer(parsed, body.mission_id, body.answer)
    if not result:
        raise HTTPException(status_code=404, detail=f"Mission {body.mission_id} not found.")
    return result
