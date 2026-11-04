"""Sarvam AI Voice Agent secure proxy router.

Handles:
- Agent status check (without exposing secrets)
- Conversational turn processing with repository context
- Text-to-speech audio synthesis (Bulbul v4-flash / v3)
- Speech-to-text audio transcription (Saaras v4)
- Graceful fallbacks when credentials are not yet populated
"""

import base64
import logging
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sarvam", tags=["sarvam"])


class SarvamStatusResponse(BaseModel):
    configured: bool
    has_api_key: bool
    app_id: str | None = None
    workspace_id: str | None = None
    org_id: str | None = None
    tts_model: str
    stt_model: str
    supported_languages: list[dict[str, str]]


class ConverseRequest(BaseModel):
    repository_url: str = Field(..., description="Repository URL or identifier")
    spoken_query: str = Field(..., description="Transcribed or typed user query")
    language_code: str = Field(default="en-IN", description="Language code e.g. en-IN, hi-IN")
    chat_history: list[dict[str, Any]] = Field(default_factory=list)
    repo_context: dict[str, Any] | None = Field(default=None)


class ConverseResponse(BaseModel):
    response_text: str
    language_code: str
    agent_id: str | None = None
    audio_base64: str | None = None
    mode: str = "sarvam"


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech")
    target_language_code: str = Field(default="en-IN", description="Language code e.g. en-IN, hi-IN")
    speaker: str = Field(default="anand", description="Speaker voice identifier")
    speech_sample_rate: int = Field(default=22050, description="Sample rate in Hz")


class TTSResponse(BaseModel):
    audio_base64: str
    language_code: str
    format: str = "audio/wav"


SUPPORTED_LANGUAGES = [
    {"code": "en-IN", "name": "English (India)"},
    {"code": "hi-IN", "name": "Hindi (हिन्दी)"},
    {"code": "bn-IN", "name": "Bengali (বাংলা)"},
    {"code": "ta-IN", "name": "Tamil (தமிழ்)"},
    {"code": "te-IN", "name": "Telugu (తెలుగు)"},
    {"code": "mr-IN", "name": "Marathi (मराठी)"},
    {"code": "gu-IN", "name": "Gujarati (ગુજરાતી)"},
    {"code": "kn-IN", "name": "Kannada (ಕನ್ನಡ)"},
    {"code": "ml-IN", "name": "Malayalam (മലയാളം)"},
    {"code": "pa-IN", "name": "Punjabi (ਪੰਜਾਬੀ)"},
    {"code": "od-IN", "name": "Odia (ଓଡ଼ିଆ)"},
]


@router.get("/status", response_model=SarvamStatusResponse)
async def get_sarvam_status():
    """Returns agent configuration status without revealing any secret API keys."""
    has_key = bool(settings.sarvam_api_key and settings.sarvam_api_key.strip())
    is_configured = has_key

    return SarvamStatusResponse(
        configured=is_configured,
        has_api_key=has_key,
        app_id=settings.sarvam_app_id if settings.sarvam_app_id else None,
        workspace_id=settings.sarvam_workspace_id if settings.sarvam_workspace_id else None,
        org_id=settings.sarvam_org_id if settings.sarvam_org_id else None,
        tts_model=settings.sarvam_tts_model,
        stt_model=settings.sarvam_stt_model,
        supported_languages=SUPPORTED_LANGUAGES,
    )


@router.post("/converse", response_model=ConverseResponse)
async def converse_with_sarvam_agent(payload: ConverseRequest):
    """Processes user voice/text query with repository context through Sarvam AI with ultra-fast latency."""
    repo_name = payload.repository_url.split("/")[-2:]
    formatted_repo = "/".join(repo_name) if len(repo_name) == 2 else payload.repository_url
    q = payload.spoken_query.lower()

    # Retrieve cached repository bundle if available for ultra-rich instant responses
    owner = repo_name[0] if len(repo_name) == 2 else "vercel"
    repo = repo_name[1] if len(repo_name) == 2 else "ms"
    
    from app.services.github_service import _REPO_BUNDLE_CACHE
    from app.services.repository_parser import RepositoryParser
    from app.services.gemma_service import GemmaService
    
    cache_key = f"{owner.lower()}/{repo.lower()}"
    bundle = _REPO_BUNDLE_CACHE.get(cache_key)
    parsed = RepositoryParser().parse(bundle) if bundle else {}
    
    entry_pts = parsed.get("entry_points") or ["index.ts", "package.json"]
    important_files = parsed.get("important_files") or ["package.json", "src/index.ts", "readme.md"]
    languages = list(parsed.get("languages", {}).keys()) or ["TypeScript", "JavaScript"]
    primary_lang = languages[0] if languages else "TypeScript"

    # Use Gemma to formulate a natural, concise spoken answer (like ChatGPT / Real Voice AI)
    gemma = GemmaService()
    spoken_prompt = (
        f"You are the Voice AI Agent interrogating GitHub repository '{owner}/{repo}'.\n"
        f"The user spoke to you: '{payload.spoken_query}'.\n"
        f"Context: {owner}/{repo} (Primary language: {primary_lang}, key files: {', '.join(important_files[:2])}).\n"
        f"Reply in 1 or 2 natural, concise spoken sentences directly answering them. "
        f"Do not use markdown, bullet points, or code formatting."
    )
    
    reply = ""
    try:
        gemma_res = await gemma.generate(prompt=spoken_prompt, max_tokens=100, temperature=0.3)
        candidate = gemma_res.get("text", "").strip()
        if candidate and "⚠️" not in candidate and "[MOCK" not in candidate:
            reply = candidate.replace("`", "").replace("*", "").replace("#", "").strip()
    except Exception as e:
        logger.warning(f"Voice Gemma generation error: {e}")

    if not reply:
        if any(k in q for k in ["hi", "hello", "hey"]):
            reply = f"Hello Detective! I am ready to interrogate the repository {formatted_repo}. What would you like to explore?"
        elif any(k in q for k in ["entry", "main", "start"]):
            reply = f"In {formatted_repo}, the main entry point is {entry_pts[0] if entry_pts else 'index.ts'}."
        else:
            reply = f"In {formatted_repo}, {primary_lang} is the primary language, with core logic located in {important_files[0] if important_files else 'the source files'}."

    audio_b64 = None
    try:
        audio_b64 = await _synthesize_speech_internal(reply, payload.language_code)
    except Exception as e:
        logger.warning(f"Voice synthesis in converse failed: {e}")

    return ConverseResponse(
        response_text=reply,
        language_code=payload.language_code,
        agent_id=settings.sarvam_app_id or "Conversatio-6103dad4-f01f",
        audio_base64=audio_b64,
        mode="sarvam-voice",
    )


async def _synthesize_speech_internal(text: str, language_code: str) -> str | None:
    """Helper to synthesize audio via Sarvam Bulbul TTS."""
    if not (settings.sarvam_api_key and settings.sarvam_api_key.strip()):
        return None

    try:
        url = f"{settings.sarvam_api_base}/text-to-speech"
        headers = {
            "api-subscription-key": settings.sarvam_api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "text": text[:500],  # Limit chunk size for fast TTS response
            "target_language_code": language_code,
            "model": settings.sarvam_tts_model,
            "speaker": "anand",
            "speech_sample_rate": 22050,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                audios = data.get("audios", [])
                if audios:
                    return audios[0]
    except Exception as e:
        logger.warning(f"Sarvam internal TTS synthesis error: {e}")
    return None


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech_proxy(payload: TTSRequest):
    """Secure proxy for Sarvam Bulbul Text-to-Speech without exposing API keys to browser."""
    if not (settings.sarvam_api_key and settings.sarvam_api_key.strip()):
        raise HTTPException(
            status_code=400,
            detail="SARVAM_API_KEY is not configured in backend .env file.",
        )

    url = f"{settings.sarvam_api_base}/text-to-speech"
    headers = {
        "api-subscription-key": settings.sarvam_api_key.strip(),
        "Content-Type": "application/json",
    }
    body = {
        "text": payload.text,
        "target_language_code": payload.target_language_code,
        "model": settings.sarvam_tts_model,
        "speaker": payload.speaker,
        "speech_sample_rate": payload.speech_sample_rate,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.sarvam_timeout_seconds) as client:
            res = await client.post(url, headers=headers, json=body)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Sarvam TTS API returned error: {res.text}",
                )
            data = res.json()
            audios = data.get("audios", [])
            if not audios:
                raise HTTPException(status_code=502, detail="No audio returned from Sarvam TTS.")

            return TTSResponse(
                audio_base64=audios[0],
                language_code=payload.target_language_code,
                format="audio/wav",
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=504, detail=f"Failed to connect to Sarvam TTS API: {exc}")


class STTRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio bytes (WAV/WebM/MP3)")
    filename: str = Field(default="audio.wav", description="Audio filename")
    language_code: str = Field(default="en-IN", description="Language code e.g. en-IN, hi-IN")


@router.post("/stt")
async def speech_to_text_proxy(payload: STTRequest):
    """Secure proxy for Sarvam Saaras Speech-to-Text without exposing API keys."""
    if not (settings.sarvam_api_key and settings.sarvam_api_key.strip()):
        raise HTTPException(
            status_code=400,
            detail="SARVAM_API_KEY is not configured in backend .env file.",
        )

    url = f"{settings.sarvam_api_base}/speech-to-text"
    headers = {"api-subscription-key": settings.sarvam_api_key.strip()}

    try:
        content = base64.b64decode(payload.audio_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio data: {e}")

    files = {"file": (payload.filename, content, "audio/wav")}
    data = {
        "model": settings.sarvam_stt_model,
        "language_code": payload.language_code,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.sarvam_timeout_seconds) as client:
            res = await client.post(url, headers=headers, files=files, data=data)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Sarvam STT error: {res.text}")
            return res.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=504, detail=f"Failed to reach Sarvam STT service: {exc}")


class SignedUrlRequest(BaseModel):
    org_id: str | None = None
    workspace_id: str | None = None
    app_id: str | None = None
    user_identifier: str = "detective-user"
    user_identifier_type: str = "custom"
    interaction_type: str = "call"
    version: int | None = None


@router.post("/session-url")
async def get_sarvam_session_url(payload: SignedUrlRequest):
    """Secure proxy for getting the signed WebSocket URL from Sarvam API without exposing the secret API key to the browser."""
    api_key = settings.sarvam_api_key.strip() if settings.sarvam_api_key else ""
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="SARVAM_API_KEY is not configured in backend .env file.",
        )

    org_id = payload.org_id or settings.sarvam_org_id
    workspace_id = payload.workspace_id or settings.sarvam_workspace_id
    app_id = payload.app_id or settings.sarvam_app_id or "Conversatio-6103dad4-f01f"

    missing = []
    if not org_id:
        missing.append("SARVAM_ORG_ID (organization ID)")
    if not workspace_id:
        missing.append("SARVAM_WORKSPACE_ID (workspace ID)")
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required Sarvam Indus configuration: {', '.join(missing)}. Please configure in backend/.env.",
        )

    # Sarvam official URL pattern: {baseUrl}orgs/{org_id}/workspaces/{workspace_id}/apps/{app_id}/url
    base = settings.sarvam_api_base.rstrip("/")
    target_url = f"{base}/orgs/{org_id}/workspaces/{workspace_id}/apps/{app_id}/url"
    params = {
        "user_identifier": payload.user_identifier,
        "user_identifier_type": payload.user_identifier_type,
        "interaction_type": payload.interaction_type,
    }
    if payload.version:
        params["version"] = str(payload.version)

    headers = {
        "X-API-Key": api_key,
        "api-subscription-key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(target_url, params=params, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Sarvam session URL error ({resp.status_code}): {resp.text}",
                )
            return resp.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=504, detail=f"Failed to reach Sarvam session endpoint: {exc}")
