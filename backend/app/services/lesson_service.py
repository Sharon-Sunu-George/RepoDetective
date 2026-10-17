"""Lesson / learning-path orchestration (deterministic, with optional Gemma augment)."""

from __future__ import annotations

from typing import Any

from app.services.gemma_service import GemmaService


def _missions_from_analysis(analysis: dict[str, Any], level: str = "beginner") -> list[dict[str, Any]]:
    """Derive missions from parsed analysis. Purely deterministic."""
    important = analysis.get("important_files") or []
    entry_points = analysis.get("entry_points") or []
    languages = analysis.get("languages") or {}
    relationships = analysis.get("file_relationships") or []
    top_lang = sorted(languages.items(), key=lambda x: x[1], reverse=True)
    top_lang_name = top_lang[0][0] if top_lang else "this repository"

    missions: list[dict[str, Any]] = []

    # Mission 1: orientation
    missions.append(
        {
            "id": "m1-orientation",
            "title": "Orient yourself in the repository",
            "description": (
                f"Explore the top-level structure and README. Identify what {top_lang_name} project this is "
                f"and what its purpose appears to be from the README and file layout."
            ),
            "hint": "Start by opening README.md and the top-level config file (package.json / pyproject.toml / Cargo.toml).",
            "evidence_paths": [p for p in important if "readme" in p.lower()][:1] or important[:1],
            "difficulty": level,
        }
    )
    # Mission 2: entry point
    if entry_points:
        missions.append(
            {
                "id": "m2-entrypoint",
                "title": f"Trace the entry point: {entry_points[0]}",
                "description": f"Open {entry_points[0]} and describe what happens when the program starts. What functions or routes are registered first?",
                "hint": f"Read {entry_points[0]} top-to-bottom; note imports and the main block / exported app / server listen call.",
                "evidence_paths": entry_points[:1],
                "difficulty": level,
            }
        )
    else:
        missions.append(
            {
                "id": "m2-entrypoint",
                "title": "Find the entry point",
                "description": "No obvious entry point was detected. Look for a file that wires the app together (e.g. main / app / index / server) and propose one.",
                "hint": "Check for files named main.*, app.*, index.*, server.* or a package.json scripts.start entry.",
                "evidence_paths": important[:2],
                "difficulty": level,
            }
        )
    # Mission 3: relationships / imports
    if relationships:
        sample = relationships[0]
        missions.append(
            {
                "id": "m3-relationships",
                "title": "Map how files connect",
                "description": f"File {sample['file']} imports {', '.join(sample['imports'][:3])}. Follow one import and explain the relationship.",
                "hint": "Use the import statements as edges in a graph; explain why the imported module exists.",
                "evidence_paths": [sample["file"]],
                "difficulty": level,
            }
        )
    else:
        missions.append(
            {
                "id": "m3-relationships",
                "title": "Map how files connect",
                "description": "No import edges were extracted (or files were not fetched). Pick two files and hypothesise how they relate from names and README.",
                "hint": "Even without import data, file names and directory grouping reveal intent.",
                "evidence_paths": important[:2],
                "difficulty": level,
            }
        )

    # Ensure evidence_paths exist
    for m in missions:
        if not m["evidence_paths"]:
            m["evidence_paths"] = important[:1]
    return missions


class LessonService:
    """Builds lessons / learning paths from repository analysis."""

    def __init__(self, gemma: GemmaService | None = None) -> None:
        self.gemma = gemma or GemmaService()

    def build_learning_path(
        self, analysis: dict[str, Any], level: str = "beginner", goal: str | None = None
    ) -> dict[str, Any]:
        missions = _missions_from_analysis(analysis, level=level)
        overview = (
            f"This {level} learning path guides you through the repository step by step. "
            f"Languages: {', '.join(analysis.get('languages', {}).keys()) or 'unknown'}. "
            f"Important files: {', '.join(analysis.get('important_files', [])[:3]) or 'none detected'}. "
        )
        if goal:
            overview += f"Your goal: {goal}. "
        return {
            "level": level,
            "overview": overview.strip(),
            "missions": missions,
        }

    def get_lesson(self, analysis: dict[str, Any], lesson_id: str) -> dict[str, Any] | None:
        path = self.build_learning_path(analysis)
        for m in path["missions"]:
            if m["id"] == lesson_id:
                return {
                    "id": m["id"],
                    "title": m["title"],
                    "body": m["description"] + f"\n\nHint: {m['hint']}",
                    "evidence_paths": m["evidence_paths"],
                }
        return None

    def get_hint(self, analysis: dict[str, Any], mission_id: str, attempt: str | None = None) -> dict[str, Any] | None:
        path = self.build_learning_path(analysis)
        for m in path["missions"]:
            if m["id"] == mission_id:
                hint = m["hint"]
                if attempt:
                    hint += f" Your attempt mentioned: '{attempt[:120]}' — focus on the evidence files."
                return {"mission_id": mission_id, "hint": hint, "evidence_paths": m["evidence_paths"]}
        return None

    def check_answer(self, analysis: dict[str, Any], mission_id: str, answer: str) -> dict[str, Any] | None:
        """Deterministic keyword check (no LLM grading in mock path)."""
        path = self.build_learning_path(analysis)
        target = next((m for m in path["missions"] if m["id"] == mission_id), None)
        if not target:
            return None
        # Expected keywords from evidence paths / title
        keywords = []
        for p in target.get("evidence_paths", []):
            # use file basename without extension as keyword
            import os

            base = os.path.splitext(os.path.basename(p))[0].lower()
            if base and base not in ("readme", "index", "main"):
                keywords.append(base)
        keywords += [w.lower() for w in target["title"].split() if len(w) > 4][:3]
        keywords = list(dict.fromkeys(keywords))[:5]
        if not keywords:
            keywords = ["repository", "file"]
        ans_lower = answer.lower()
        hits = sum(1 for k in keywords if k in ans_lower)
        # Need at least 1 keyword or >20 chars to pass (lenient for MVP)
        correct = hits >= 1 or len(answer.strip()) > 40
        feedback = (
            f"Found {hits}/{len(keywords)} expected keywords ({', '.join(keywords)}). "
            + ("Good — your answer references the evidence." if correct else "Try referencing the evidence files more directly.")
        )
        return {"mission_id": mission_id, "correct": correct, "feedback": feedback, "expected_keywords": keywords}

    async def enrich_with_gemma(self, analysis: dict[str, Any], level: str = "beginner") -> str:
        """Optionally enrich overview with Gemma (mock or live)."""
        prompt = f"Create a 2-sentence beginner-friendly overview for a repo with languages {analysis.get('languages')} and files {analysis.get('important_files')[:5]}."
        result = await self.gemma.generate(prompt, system="You are a helpful coding tutor.")
        return result.get("text", "")
