"""Agent execution endpoint — runs the collaborative workflow."""

from fastapi import APIRouter, HTTPException

from app.agents.ai_teacher import AITeacher
from app.agents.repository_analyst import RepositoryAnalyst
from app.agents.verification_agent import VerificationAgent
from app.core.security import SecurityError, validate_and_parse_github_url
from app.schemas.agent import AgentRunRequest
from app.services.gemma_service import GemmaService
from app.services.github_service import GitHubError, GitHubService
from app.services.repository_parser import RepositoryParser

router = APIRouter(prefix="/api/agents", tags=["agents"])

_ALLOWED = {"analyst", "teacher", "verification"}


@router.post("/run", summary="Run the agent collaboration workflow")
async def run_agents(body: AgentRunRequest) -> dict:
    """Run Analyst -> Teacher -> Verification in sequence.

    The agents exchange structured outputs; verification checks that teacher
    outputs are grounded in analyst evidence. Individual results plus a final
    verified flag are returned.
    """
    try:
        owner, repo = validate_and_parse_github_url(body.repository_url)
    except SecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    want = set(a.lower() for a in (body.agents or ["analyst", "teacher", "verification"]))
    unknown = want - _ALLOWED
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown agents: {', '.join(sorted(unknown))}")

    github = GitHubService()
    try:
        bundle = await github.fetch_repository(owner, repo)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    parser = RepositoryParser()
    parsed = parser.parse(bundle)

    gemma = GemmaService()
    analyst_out = None
    teacher_out = None
    verification_out = None

    # Analyst always runs if teacher or verification is requested (they depend on it)
    need_analyst = bool(want & {"analyst", "teacher", "verification"})
    if need_analyst:
        analyst = RepositoryAnalyst(gemma=gemma)
        analyst_out = await analyst.analyze(parsed)

    if "teacher" in want or "verification" in want:
        # Teacher needs analyst output
        if analyst_out is None:
            analyst = RepositoryAnalyst(gemma=gemma)
            analyst_out = await analyst.analyze(parsed)
        teacher = AITeacher(gemma=gemma)
        teacher_out = await teacher.teach(analyst_out, parsed)

    if "verification" in want:
        if analyst_out is None or teacher_out is None:
            raise HTTPException(status_code=500, detail="Verification requires analyst and teacher outputs.")
        verifier = VerificationAgent()
        verification_out = verifier.verify(teacher_out, analyst_out, parsed)

    # If only analyst was requested, omit teacher/verification
    if "teacher" not in want:
        teacher_out = None
        # also no verification if teacher omitted
        if "verification" not in want:
            verification_out = None

    final_verified = bool(verification_out and verification_out.get("passed")) if verification_out is not None else False

    # When only analyst/teacher requested, final_verified reflects whether any verification was run
    resp: dict = {
        "repository": {"owner": owner, "repo": repo, "url": f"https://github.com/{owner}/{repo}"},
        "analyst": analyst_out if "analyst" in want else None,
        "teacher": teacher_out,
        "verification": verification_out,
        "final_verified": final_verified,
        "gemma_mode": gemma.mode,
    }
    # Prune None analyst if not wanted explicitly but was run for dependency
    if "analyst" not in want and analyst_out is not None and "teacher" in want:
        # Keep it for transparency — frontend can ignore
        resp["analyst"] = analyst_out
    return resp
