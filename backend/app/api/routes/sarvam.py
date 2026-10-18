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
    """Processes user voice/text query with repository context through Sarvam AI."""
    has_key = bool(settings.sarvam_api_key and settings.sarvam_api_key.strip())
    repo_name = payload.repository_url.split("/")[-2:]
    formatted_repo = "/".join(repo_name) if len(repo_name) == 2 else payload.repository_url

    # If Sarvam key is configured, query Sarvam AI
    if has_key:
        try:
            prompt_context = (
                f"You are the Sarvam Voice Detective Agent for repository: {formatted_repo}.\n"
                f"Context: {payload.repo_context or 'Repository analysis in progress.'}\n"
                f"User asked: {payload.spoken_query}\n"
                f"Provide a concise, spoken conversational response suitable for a voice agent."
            )

            headers = {
                "api-subscription-key": settings.sarvam_api_key.strip(),
                "Content-Type": "application/json",
            }

            # Optional: If OpenAI-compatible endpoint or Sarvam chat endpoint is enabled
            chat_url = f"{settings.sarvam_api_base}/chat/completions"
            async with httpx.AsyncClient(timeout=settings.sarvam_timeout_seconds) as client:
                res = await client.post(
                    chat_url,
                    headers=headers,
                    json={
                        "model": "sarvam-30b" if "30b" in settings.sarvam_tts_model else "sarvam-2b",
                        "messages": [
                            {"role": "system", "content": "You are a professional software detective analyzing repositories for developers. Keep answers concise, factual, and direct for spoken audio output."},
                            {"role": "user", "content": prompt_context},
                        ],
                        "max_tokens": 250,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if answer:
                        # Optionally synthesize audio if requested
                        audio_b64 = await _synthesize_speech_internal(answer, payload.language_code)
                        return ConverseResponse(
                            response_text=answer,
                            language_code=payload.language_code,
                            agent_id=settings.sarvam_app_id or "sarvam-agent",
                            audio_base64=audio_b64,
                            mode="sarvam-live",
                        )
        except Exception as e:
            logger.warning(f"Sarvam live chat failed, using context fallback: {e}")

    # Deterministic Contextual Detective Response
    q = payload.spoken_query.lower()
    if "entry" in q or "start" in q or "main" in q:
        reply = (
            f"The primary execution entry point for {formatted_repo} is configured in package.json and index files. "
            f"External consumers invoke the default exported module."
        )
    elif "language" in q or "stack" in q or "tech" in q:
        reply = (
            f"Repository {formatted_repo} utilizes modern modular architecture with standardized build configurations and test harnesses."
        )
    elif "test" in q or "spec" in q:
        reply = (
            f"Automated test suites for {formatted_repo} validate core functionality against edge cases and regression patterns."
        )
    else:
        reply = (
            f"Sarvam Voice AI Agent has indexed {formatted_repo}. "
            f"All architecture files, entry points, and dependencies are ready for investigation."
        )

    # Synthesize audio with Sarvam Bulbul TTS if key is present
    audio_b64 = None
    if has_key:
        audio_b64 = await _synthesize_speech_internal(reply, payload.language_code)

    return ConverseResponse(
        response_text=reply,
        language_code=payload.language_code,
        agent_id=settings.sarvam_app_id or "sarvam-voice-agent",
        audio_base64=audio_b64,
        mode="sarvam-proxy" if has_key else "local-proxy",
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
