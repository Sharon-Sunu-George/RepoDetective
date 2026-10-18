
"""Gemma model provider using Google's official Gen AI SDK."""

from __future__ import annotations

from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings


class GemmaService:
    """Generate text using Gemma, with explicitly labelled mock fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        api_base: str | None = None,
        model: str | None = None,
        mock_mode: bool | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = (
            api_key if api_key is not None else settings.gemma_api_key
        )
        self.model = model or settings.gemma_model
        self.timeout = (
            timeout
            if timeout is not None
            else settings.gemma_timeout_seconds
        )

        # Never silently force live mode without credentials.
        if mock_mode is not None:
            self.mock_mode = mock_mode
        else:
            self.mock_mode = (
                settings.gemma_mock_mode or not self.api_key
            )

        self.client = (
            genai.Client(api_key=self.api_key)
            if self.api_key and not self.mock_mode
            else None
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
        """Return a dictionary containing text, mode, and model."""

        if self.mock_mode or self.client is None:
            return {
                "text": self._mock_text(prompt, system),
                "mode": "mock",
                "model": f"{self.model} (mock)",
            }

        try:
            config = types.GenerateContentConfig(
                system_instruction=system or None,
                max_output_tokens=max_tokens,
                temperature=temperature,
                http_options=types.HttpOptions(
                    timeout=int(self.timeout * 1000)
                ),
            )

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

           
            generated_text = getattr(response, "text", None)

            if not generated_text or not generated_text.strip():
                print("Gemma returned no text. Raw response:", response)
                raise RuntimeError("Gemma returned an empty response.")

            return {
                "text": generated_text,
                "mode": "live",
                "model": self.model,
            }

        except Exception as exc:
            # Keep failures visible instead of pretending the response is live.
            print(
                f"Gemma API request failed: "
                f"{type(exc).__name__}: {exc}"
            )

            return {
                "text": (
                    self._mock_text(prompt, system)
                    + "\n\n[MOCK FALLBACK: The live Gemma API request "
                    "failed. Check the backend terminal for details.]"
                ),
                "mode": "mock",
                "model": f"{self.model} (mock-fallback)",
            }

    def _mock_text(
        self,
        prompt: str,
        system: str | None,
    ) -> str:
        """Return a clearly labelled deterministic mock response."""

        header = (
            "[MOCK OUTPUT — no live Gemma inference. "
            "Configure the API key and disable mock mode.]"
        )

        snippet = prompt[:400].replace("\n", " ")
        system_part = f"System: {system[:120]} | " if system else ""

        return (
            f"{header}\n"
            f"{system_part}Prompt preview: {snippet}...\n"
            f"This is a mock explanation, not a real AI response "
            f"from {self.model}."
        )
