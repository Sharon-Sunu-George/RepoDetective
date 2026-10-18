"""Repository Analyst Agent — structured findings from parsed repo data."""

from __future__ import annotations

from typing import Any

from app.services.gemma_service import GemmaService


class RepositoryAnalyst:
    """Agent that inspects a repository and extracts insights.

    Produces structured findings with evidence paths. Optionally augments
    summaries via Gemma (mock or live) but never fabricates paths.
    """

    def __init__(self, gemma: GemmaService | None = None) -> None:
        self.gemma = gemma or GemmaService()

    async def analyze(self, parsed: dict[str, Any]) -> dict[str, Any]:
        """Return analyst output dict (conforms to schemas.agent.AnalystOutput shape)."""
        important = parsed.get("important_files") or []
        entry_points = parsed.get("entry_points") or []
        languages = parsed.get("languages") or {}
        relationships = parsed.get("file_relationships") or []
        warnings = parsed.get("warnings") or []
        file_contents = parsed.get("file_contents") or {}

        findings: list[dict[str, Any]] = []

        if important:
            findings.append(
                {
                    "id": "finding-important-files",
                    "summary": f"Key files: {', '.join(important[:5])}. These define configuration, dependencies, and documentation.",
                    "evidence_paths": important[:5],
                    "confidence": 0.9,
                }
            )
        if entry_points:
            findings.append(
                {
                    "id": "finding-entrypoints",
                    "summary": f"Probable entry point(s): {', '.join(entry_points)}. Start reading there to understand execution flow.",
                    "evidence_paths": entry_points,
                    "confidence": 0.8,
                }
            )
        if languages:
            top = sorted(languages.items(), key=lambda x: x[1], reverse=True)
            findings.append(
                {
                    "id": "finding-languages",
                    "summary": f"Primary languages: {', '.join(f'{k} ({v} files)' for k, v in top[:3])}.",
                    "evidence_paths": important[:2] if important else [],
                    "confidence": 0.85,
                }
            )
        if relationships:
            sample = relationships[:2]
            findings.append(
                {
                    "id": "finding-relationships",
                    "summary": f"Detected {len(relationships)} files with import relationships (e.g. {sample[0]['file']} imports {', '.join(sample[0]['imports'][:2])}).",
                    "evidence_paths": [r["file"] for r in sample],
                    "confidence": 0.75,
                }
            )
        if not findings:
            findings.append(
                {
                    "id": "finding-empty",
                    "summary": "No strong signals detected — repository may be empty, or only unsupported file types were found.",
                    "evidence_paths": [],
                    "confidence": 0.5,
                }
            )

        # Optional Gemma enrichment for the first finding's summary (labelled)
        if not self.gemma.mock_mode:
            try:
                prompt = f"Summarise these findings in one sentence for a beginner: {findings[0]['summary']}"
                res = await self.gemma.generate(prompt, system="You are a concise code analyst.")
                if res.get("text"):
                    findings[0]["summary"] += f" [Gemma: {res['text'][:180]}]"
            except Exception:
                pass

        return {
            "findings": findings,
            "important_files": important,
            "entry_points": entry_points,
            "languages": languages,
            "relationships": relationships,
            "warnings": warnings,
            "_file_contents_keys": list(file_contents.keys()),
        }
