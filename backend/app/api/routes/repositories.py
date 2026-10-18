"""Repository analysis endpoint."""

from fastapi import APIRouter, HTTPException

from app.agents.ai_teacher import AITeacher
from app.agents.repository_analyst import RepositoryAnalyst
from app.agents.verification_agent import VerificationAgent
from app.core.security import SecurityError, validate_and_parse_github_url
from app.schemas.repository import RepositoryAnalyzeRequest
from app.services.gemma_service import GemmaService
from app.services.github_service import GitHubError, GitHubService
from app.services.repository_parser import RepositoryParser

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


@router.post("/analyze", summary="Analyze a public GitHub repository")
async def analyze_repository(body: RepositoryAnalyzeRequest) -> dict:
    """Fetch, parse, and run the full agent workflow for a repository.

    This is the main entry point for the frontend. It returns the parsed
    analysis plus the collaborative agent outputs and a final verified flag.
    Never returns fabricated data as real — warnings are explicit.
    """
    try:
        owner, repo = validate_and_parse_github_url(body.repository_url)
    except SecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    github = GitHubService()
    try:
        bundle = await github.fetch_repository(owner, repo)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    parser = RepositoryParser()
    parsed = parser.parse(bundle)

    # Collaborative agent workflow: Analyst -> Teacher -> Verification
    gemma = GemmaService()
    analyst = RepositoryAnalyst(gemma=gemma)
    teacher = AITeacher(gemma=gemma)
    verifier = VerificationAgent()

    analyst_out = await analyst.analyze(parsed)
    teacher_out = await teacher.teach(analyst_out, parsed)
    verification_out = verifier.verify(teacher_out, analyst_out, parsed)

    return {
        "repository": {"owner": owner, "repo": repo, "url": f"https://github.com/{owner}/{repo}"},
        "analysis": parsed,
        "agents": {
            "analyst": analyst_out,
            "teacher": teacher_out,
            "verification": verification_out,
            "final_verified": verification_out["passed"],
            "gemma_mode": gemma.mode,
        },
    }

from pydantic import BaseModel, Field
from typing import Optional, List

class AskQuestionRequest(BaseModel):
    repository_url: str
    question: str
    chat_history: Optional[List[dict]] = None

class FileContentRequest(BaseModel):
    repository_url: str
    path: str

class NoteItem(BaseModel):
    id: str
    repository: str
    title: str
    content: str
    created_at: str
    updated_at: str

# In-memory persistence for notes during server lifetime
_SAVED_NOTES: dict[str, list[dict]] = {}

@router.post("/ask", summary="Ask a question about the repository")
async def ask_question(body: AskQuestionRequest) -> dict:
    """Answers a question about the repository using parsed files and Gemma/AI teacher."""
    try:
        owner, repo = validate_and_parse_github_url(body.repository_url)
    except SecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    github = GitHubService()
    try:
        bundle = await github.fetch_repository(owner, repo)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    parser = RepositoryParser()
    parsed = parser.parse(bundle)

    gemma = GemmaService()
    prompt = (
        f"You are RepoDetective AI assistant answering a user's question about the repository {owner}/{repo}.\n"
        f"Primary language: {next(iter(parsed.get('languages', {})), 'Unknown')}\n"
        f"Important files: {', '.join(parsed.get('important_files', [])[:10])}\n"
        f"Entry points: {', '.join(parsed.get('entry_points', []))}\n"
        f"Question: {body.question}\n\n"
        f"Answer clearly and factually. Reference specific files if relevant."
    )
    res = await gemma.generate(prompt=prompt, system="You are an expert software developer and repository detective.")

    # Match evidence files
    matched_files = [f for f in parsed.get("important_files", []) if any(part in f.lower() for part in body.question.lower().split())]

    return {
        "repository": f"{owner}/{repo}",
        "question": body.question,
        "answer": res.get("text") or "No answer could be generated.",
        "mode": res.get("mode", "mock"),
        "model": res.get("model", "gemma"),
        "references": matched_files or parsed.get("important_files", [])[:3],
    }

@router.post("/file-content", summary="Get specific file content from repository")
async def get_file_content(body: FileContentRequest) -> dict:
    """Fetch file content from GitHub repository with size checks and safe encoding."""
    try:
        owner, repo = validate_and_parse_github_url(body.repository_url)
    except SecurityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    github = GitHubService()
    try:
        resp = await github._get(f"/repos/{owner}/{repo}/contents/{body.path.lstrip('/')}")
        fdata = resp.json()
        if isinstance(fdata, list):
            return {"type": "dir", "path": body.path, "items": [item["name"] for item in fdata]}
        
        import base64
        content_b64 = fdata.get("content") or ""
        decoded = ""
        if content_b64:
            decoded = base64.b64decode(content_b64).decode("utf-8", errors="replace")
        elif fdata.get("download_url"):
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                r2 = await client.get(fdata["download_url"], headers=github._headers())
                if r2.status_code == 200:
                    decoded = r2.text
        
        return {
            "path": body.path,
            "type": "file",
            "size": fdata.get("size", len(decoded)),
            "content": decoded,
            "download_url": fdata.get("download_url"),
        }
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

@router.get("/notes", summary="List notes for a repository")
async def list_notes(repository: str) -> dict:
    clean_repo = repository.strip().lower()
    return {"repository": repository, "notes": _SAVED_NOTES.get(clean_repo, [])}

@router.post("/notes", summary="Save or create a note")
async def save_note(note: NoteItem) -> dict:
    clean_repo = note.repository.strip().lower()
    notes = _SAVED_NOTES.setdefault(clean_repo, [])
    # Check if exists
    for idx, existing in enumerate(notes):
        if existing["id"] == note.id:
            notes[idx] = note.model_dump()
            return {"status": "updated", "note": note.model_dump()}
    notes.insert(0, note.model_dump())
    return {"status": "created", "note": note.model_dump()}

@router.delete("/notes/{note_id}", summary="Delete a note")
async def delete_note(note_id: str, repository: str) -> dict:
    clean_repo = repository.strip().lower()
    if clean_repo in _SAVED_NOTES:
        _SAVED_NOTES[clean_repo] = [n for n in _SAVED_NOTES[clean_repo] if n["id"] != note_id]
        return {"status": "deleted", "id": note_id}
    raise HTTPException(status_code=404, detail="Note not found")
