"""AI Teacher Agent — turns analyst findings into beginner-friendly missions."""

from __future__ import annotations

from typing import Any

from app.services.gemma_service import GemmaService


class AITeacher:
    """Agent that turns repository insights into teaching content.

    Consumes the RepositoryAnalyst output and produces an overview and
    guided missions. Every mission cites evidence paths from the analyst.
    No paths are invented — only those present in the analyst output are used.
    """

    def __init__(self, gemma: GemmaService | None = None) -> None:
        self.gemma = gemma or GemmaService()

    async def teach(self, analyst_output: dict[str, Any], parsed: dict[str, Any]) -> dict[str, Any]:
        """Return teacher output dict (conforms to schemas.agent.TeacherOutput shape)."""
        important = analyst_output.get("important_files") or parsed.get("important_files") or []
        entry_points = analyst_output.get("entry_points") or parsed.get("entry_points") or []
        relationships = analyst_output.get("relationships") or parsed.get("file_relationships") or []
        languages = analyst_output.get("languages") or parsed.get("languages") or {}

        top_lang = next(iter(sorted(languages, key=lambda k: languages[k], reverse=True)), "this project") if languages else "this project"

        overview = (
            f"Welcome! This repository is primarily {top_lang}. "
            f"We will explore {len(important)} key files and trace execution from {entry_points[0] if entry_points else 'the most important file'}."
        )

        missions: list[dict[str, Any]] = []

        # Mission 1
        m1_paths = [p for p in important if "readme" in p.lower()][:1] or important[:1]
        missions.append(
            {
                "id": "m1-orientation",
                "title": "Orient yourself in the repository",
                "explanation": (
                    "Every repo tells a story through its top-level files. The README explains the purpose, "
                    "and config files reveal the tech stack. Your first task is to read them and summarise the project's goal in one sentence."
                ),
                "hint": "Open README.md first, then package.json / pyproject.toml / Cargo.toml if present. What problem does this project solve?",
                "evidence_paths": m1_paths,
            }
        )

        # Mission 2
        if entry_points:
            missions.append(
                {
                    "id": "m2-entrypoint",
                    "title": f"Trace the entry point: {entry_points[0]}",
                    "explanation": (
                        f"An entry point is where execution starts. Open {entry_points[0]} and follow the code top-to-bottom. "
                        "Note which modules it imports and what it does on startup (e.g. starting a server, parsing arguments)."
                    ),
                    "hint": f"Read {entry_points[0]} and list its imports. Which import seems most central?",
                    "evidence_paths": entry_points[:1],
                }
            )
        else:
            missions.append(
                {
                    "id": "m2-entrypoint",
                    "title": "Find the entry point",
                    "explanation": "No obvious entry point was detected. Scan the file list for candidates like main.*, app.*, index.*, or server.* and propose one with justification.",
                    "hint": "Check for files named main, app, index, or server, or a start script in package.json.",
                    "evidence_paths": important[:2],
                }
            )

        # Mission 3
        if relationships:
            src = relationships[0]
            missions.append(
                {
                    "id": "m3-relationships",
                    "title": "Follow an import edge",
                    "explanation": (
                        f"File {src['file']} imports {', '.join(src['imports'][:3])}. "
                        "Pick one import, open the target module, and explain how the two files collaborate."
                    ),
                    "hint": "Use the import line as a clue — why does the importer need the imported module?",
                    "evidence_paths": [src["file"]],
                }
            )
        else:
            missions.append(
                {
                    "id": "m3-relationships",
                    "title": "Map how files connect",
                    "explanation": "No import edges were extracted (perhaps the fetched files had no imports). Use file names and the README to hypothesise two connections.",
                    "hint": "Even without import data, directory grouping and naming reveal intent.",
                    "evidence_paths": important[:2],
                }
            )

        # Ensure evidence_paths are from analyst/parsed only (defensive)
        all_known_paths = set(important) | set(entry_points) | {r["file"] for r in relationships} | set(parsed.get("file_contents", {}).keys())
        # Also allow readme-like paths from tree evidence
        for m in missions:
            m["evidence_paths"] = [p for p in m["evidence_paths"] if p in all_known_paths] or m["evidence_paths"][:1]

        # Optional Gemma enrichment (labelled)
        if not self.gemma.mock_mode:
            try:
                prompt = f"Rewrite this overview to be more beginner-friendly (one paragraph): {overview}"
                res = await self.gemma.generate(prompt, system="You are a friendly coding tutor for beginners.")
                if res.get("text"):
                    overview = res["text"][:500]
            except Exception:
                pass

        return {"overview": overview, "missions": missions}
