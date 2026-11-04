"""Gemini / generic LLM model provider — resilient with multi-model fallback cascade."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Primary and fallback models supported by Google AI Studio
CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


class GemmaService:
    """Wraps Gemini / generic LLM inference.

    - Reads credentials from environment (GEMINI_API_KEY / GEMMA_API_KEY).
    - When mock_mode is True or credentials are missing, returns deterministic
      mock responses.
    - When live, queries Google AI Studio with candidate Gemini models,
      transparently falling back across models if high load or rate limits occur.
    - Also supports OpenAI-compatible endpoints if custom api_base is configured.
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_base: str | None = None,
        model: str | None = None,
        mock_mode: bool | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.effective_api_key
        self.api_base = (
            api_base if api_base is not None else settings.effective_api_base or ""
        ).rstrip("/")
        self.model = model or settings.effective_model
        if mock_mode is not None:
            self.mock_mode = mock_mode
        else:
            self.mock_mode = settings.gemini_mock_mode or settings.gemma_mock_mode or not self.api_key
        self.timeout = (
            timeout
            if timeout is not None
            else (settings.gemini_timeout_seconds or settings.gemma_timeout_seconds)
        )

    @property
    def mode(self) -> str:
        return "mock" if self.mock_mode else "live"

    async def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 800,
        temperature: float = 0.4,
    ) -> dict[str, Any]:
        """Generate text. Returns {text, mode, model}."""
        if self.mock_mode or not self.api_key:
            return {
                "text": self._mock_text(prompt, system),
                "mode": "mock",
                "model": f"{self.model} (mock)",
            }

        full_user_prompt = (
            f"System Instruction: {system}\n\nUser Question/Task:\n{prompt}"
            if system
            else prompt
        )

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            # 1. Native Google AI Studio / Generative Language API
            if not self.api_base or "googleapis.com" in self.api_base:
                # Order candidate models: selected model first, followed by others
                models_to_try = [self.model]
                for m in CANDIDATE_MODELS:
                    clean_m = m.replace("models/", "")
                    if clean_m not in models_to_try and f"models/{clean_m}" not in models_to_try:
                        models_to_try.append(clean_m)

                output_token_limit = max(max_tokens, 2048)
                payload_google: dict[str, Any] = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": full_user_prompt}],
                        }
                    ],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": output_token_limit,
                    },
                }

                if system:
                    payload_google["systemInstruction"] = {
                        "parts": [{"text": system}]
                    }

                last_error_msg = ""
                for model_candidate in models_to_try:
                    target_model = model_candidate if model_candidate.startswith("models/") else f"models/{model_candidate}"
                    url = f"https://generativelanguage.googleapis.com/v1beta/{target_model}:generateContent?key={self.api_key}"
                    
                    try:
                        for attempt in range(2):
                            resp = await client.post(url, json=payload_google, timeout=30.0)
                            if resp.status_code == 200:
                                data = resp.json()
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    answer_parts = [p.get("text", "") for p in parts if not p.get("thought", False)]
                                    text = "".join(answer_parts).strip()
                                    if not text:
                                        text = "".join(p.get("text", "") for p in parts).strip()
                                    if text:
                                        return {
                                            "text": text,
                                            "mode": "live",
                                            "model": target_model.replace("models/", ""),
                                        }
                            elif resp.status_code in (500, 503) and attempt == 0:
                                await asyncio.sleep(0.5)
                                continue
                            else:
                                last_error_msg = f"HTTP {resp.status_code}: {resp.text[:120]}"
                                break
                    except Exception as e:
                        last_error_msg = str(e)
                        logger.warning(f"Gemini model {target_model} failed: {e}. Trying next candidate...")
                        continue

                return {
                    "text": f"⚠️ **Gemini Inference Notice**: Unable to complete request ({last_error_msg}). Please retry.",
                    "mode": "live-error",
                    "model": self.model.replace("models/", ""),
                }

            # 2. OpenAI-compatible endpoint (when custom api_base is provided)
            if self.api_base:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                payload: dict[str, Any] = {
                    "model": self.model,
                    "messages": [],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                if system:
                    payload["messages"].append({"role": "system", "content": system})
                payload["messages"].append({"role": "user", "content": prompt})

                try:
                    url = f"{self.api_base}/chat/completions"
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code < 400:
                        data = resp.json()
                        text = (
                            data.get("choices", [{}])[0].get("message", {}).get("content")
                            or data.get("choices", [{}])[0].get("text")
                            or ""
                        )
                        if text:
                            return {"text": text, "mode": "live", "model": self.model}
                except Exception:
                    pass

        # Fallback to mock with clear labelling
        return {
            "text": self._mock_text(prompt, system)
            + "\n\n[Note: live Gemini call failed or timed out; returned mock output.]",
            "mode": "mock",
            "model": f"{self.model} (mock-fallback)",
        }

    def _mock_text(self, prompt: str, system: str | None) -> str:
        header = "[MOCK Gemini output — no live inference; configure GEMINI_API_KEY in backend/.env to enable live mode]\n"
        snippet = prompt[:400].replace("\n", " ")
        sys_part = f"System: {system[:120]} | " if system else ""
        return (
            f"{header}{sys_part}Prompt preview: {snippet}...\n"
            "This is a deterministic mock explanation. In live mode this would be generated by Gemini "
            f"({self.model}). Provide API credentials to get real inference."
        )


# Alias GeminiService to GemmaService so existing imports work seamlessly
GeminiService = GemmaService
