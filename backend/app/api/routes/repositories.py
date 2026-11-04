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

    # Grounding context: Extract real README, file structure, and package manifest (optimized for fast prompt ingestion)
    readme_snippet = (bundle.get("readme") or "")[:1000]

    # Build context from actual parsed files (concise snippets for rapid inference)
    key_files_snippets = []
    file_contents_map = bundle.get("file_contents", {})
    for path, content in list(file_contents_map.items())[:3]:
        if not ("lock" in path.lower() or path.lower().endswith(".map")):
            clean_content = content[:450].strip()
            if clean_content:
                key_files_snippets.append(f"--- File: {path} ---\n{clean_content}")
    files_context = "\n\n".join(key_files_snippets)


    # Format previous conversation history if provided
    history_lines = []
    if body.chat_history:
        for turn in body.chat_history[-4:]:  # last 4 turns
            role = "User" if turn.get("role") == "user" else "Detective"
            text = turn.get("text") or turn.get("content") or ""
            if text:
                history_lines.append(f"{role}: {text}")
    history_context = "\n".join(history_lines)

    is_greeting = body.question.strip().lower() in ["hi", "hello", "hey", "hola", "sup", "what's up", "good morning", "good evening", "how are you"]
    
    if is_greeting:
        prompt = (
            f"You are the RepoDetective AI Teaching Agent assisting a developer investigating the GitHub repository '{owner}/{repo}'.\n"
            f"The user just greeted you with: '{body.question}'.\n"
            f"Reply naturally, concisely, and warmly like a friendly AI assistant (like ChatGPT/Detective). "
            f"Welcome them to the case on '{owner}/{repo}', briefly let them know what this repository is about in 1-2 friendly sentences, and ask what they would like to investigate or understand first."
        )
    else:
        prompt = (
            f"You are the RepoDetective AI Teaching Agent, an expert conversational coding assistant (like ChatGPT) specializing in repository forensics.\n\n"
            f"Repository: {owner}/{repo}\n"
            f"Primary Language: {next(iter(parsed.get('languages', {})), 'Unknown')}\n"
            f"Entry Points: {', '.join(parsed.get('entry_points', []))}\n"
            f"Important Files: {', '.join(parsed.get('important_files', [])[:5])}\n"
            f"README Motive: {(readme_snippet or 'N/A')[:400]}\n\n"
            f"Key File Evidence:\n{files_context or 'N/A'}\n\n"
        )
        if history_context:
            prompt += f"Recent Chat History:\n{history_context}\n\n"

        prompt += (
            f"User Question: {body.question}\n\n"
            f"Respond directly and conversationally to the user's question, explaining concepts clearly with natural phrasing (like ChatGPT). "
            f"Ground your answer in the repository evidence above and mention the relevant filenames where helpful. "
            f"Do not output internal scratchpads, meta-prompts, or drafting thoughts."
        )

    res = await gemma.generate(prompt=prompt, max_tokens=600, temperature=0.3)

    # Match evidence files
    matched_files = [f for f in parsed.get("important_files", []) if any(part in f.lower() for part in body.question.lower().split())]

    # Clean any internal scratchpad if model output leaked any thinking
    raw_answer = res.get("text") or "No answer could be generated."
    clean_answer = raw_answer
    
    # Strip thinking markers if present
    if "</think>" in raw_answer:
        clean_answer = raw_answer.split("</think>")[-1].strip()
    elif "\n\n" in raw_answer and any(marker in raw_answer for marker in ["*   Draft", "*   Constraint:", "*   User Question:", "*   Role:"]):
        paragraphs = raw_answer.split("\n\n")
        # Keep non-scratchpad paragraphs
        non_scratchpad = [p for p in paragraphs if not (p.strip().startswith("*   ") and any(k in p for k in ["User Question:", "Role:", "Repository:", "Evidence", "Draft", "Constraint:", "Technical Implementation:", "Explain clearly?"]))]
        clean_answer = "\n\n".join(non_scratchpad).strip() or raw_answer


    return {
        "repository": f"{owner}/{repo}",
        "question": body.question,
        "answer": clean_answer,
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
