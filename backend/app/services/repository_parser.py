"""Repository parsing: important files, languages, entry points, relationships."""

from __future__ import annotations

import os
import re
from typing import Any

# Heuristic: files that are almost always important
IMPORTANT_NAMES = {
    "readme.md",
    "readme",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "cargo.toml",
    "go.mod",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "makefile",
    "main.py",
    "app.py",
    "index.js",
    "index.ts",
    "main.go",
    "main.rs",
    "manage.py",
}

ENTRYPOINT_CANDIDATES = {
    "main.py",
    "app.py",
    "manage.py",
    "index.js",
    "index.ts",
    "server.js",
    "app.js",
    "main.go",
    "main.rs",
    "main.java",
    "program.cs",
}

EXT_TO_LANG = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript",
    ".tsx": "TypeScript",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
}

# Regexes to extract import relationships (Python + JS/TS)
_PY_IMPORT = re.compile(r"^\s*(?:from\s+([\w\.]+)\s+import|import\s+([\w\.]+))", re.MULTILINE)
_JS_IMPORT = re.compile(
    r"""(?:import\s+.*?from\s+['\"]([^'\"]+)['\"]|require\s*\(\s*['\"]([^'\"]+)['\"]\s*\))""",
)


def _ext(path: str) -> str:
    return os.path.splitext(path)[1].lower()


class RepositoryParser:
    """Parses repository contents into structured data with evidence."""

    def parse(self, bundle: dict[str, Any]) -> dict[str, Any]:
        """Parse a bundle as returned by GitHubService.fetch_repository.

        Returns a dict suitable for schemas.RepositoryAnalysisResult fields.
        """
        tree: list[dict[str, Any]] = bundle.get("tree") or []
        file_contents: dict[str, str] = bundle.get("file_contents") or {}
        metadata: dict[str, Any] = bundle.get("metadata") or {}
        languages: dict[str, int] = bundle.get("languages") or {}
        readme: str | None = bundle.get("readme")
        warnings: list[str] = list(bundle.get("warnings") or [])
        owner = bundle.get("owner", "")
        repo = bundle.get("repo", "")

        all_paths = [e.get("path", "") for e in tree if e.get("type") == "blob" and e.get("path")]
        # Fallback: if tree is empty but we have file_contents, use those keys
        if not all_paths and file_contents:
            all_paths = list(file_contents.keys())

        # Important files
        important = self._important_files(all_paths, file_contents)

        # Entry points
        entry_points = self._entry_points(all_paths)

        # Languages: prefer GitHub-provided, else infer from extensions
        if not languages:
            languages = self._infer_languages(all_paths)

        # File relationships from imports present in fetched contents
        relationships = self._relationships(file_contents)

        # Evidence: for each finding, point to paths that support it
        evidence = self._evidence(all_paths, important, entry_points, relationships, languages, readme)

        # Directory tree (simplified)
        directory_tree = [{"path": e.get("path"), "type": e.get("type")} for e in tree[:500]]

        if not all_paths:
            warnings.append("No files found in repository tree.")

        result: dict[str, Any] = {
            "owner": owner,
            "repo": repo,
            "url": f"https://github.com/{owner}/{repo}" if owner and repo else "",
            "metadata": {
                "description": metadata.get("description"),
                "stars": metadata.get("stargazers_count"),
                "forks": metadata.get("forks_count"),
                "default_branch": bundle.get("default_branch"),
                "size": metadata.get("size"),
                "open_issues": metadata.get("open_issues_count"),
            },
            "readme": readme,
            "languages": languages,
            "directory_tree": directory_tree,
            "important_files": important,
            "entry_points": entry_points,
            "file_relationships": relationships,
            "file_contents": file_contents,
            "evidence": evidence,
            "warnings": warnings,
        }
        return result

    # ------------------------------------------------------------------
    def select_files_to_fetch(self, tree: list[dict[str, Any]]) -> list[str]:
        """Rank files for fetching (called before contents are available)."""
        blobs = [e for e in tree if e.get("type") == "blob" and e.get("path")]
        # Score each path
        scored: list[tuple[int, str]] = []
        for e in blobs:
            path: str = e["path"]
            lower = path.lower()
            base = os.path.basename(lower)
            score = 0
            if base in IMPORTANT_NAMES:
                score += 100
            if base in ENTRYPOINT_CANDIDATES:
                score += 80
            # Prefer top-level config/docs
            if "/" not in path:
                score += 10
            # Prefer smaller namedirs over deep nested vendor
            depth = path.count("/")
            score -= depth * 2
            # Skip likely vendored / generated
            if any(seg in lower for seg in ("node_modules/", "vendor/", ".git/", "__pycache__/", ".venv/")):
                score -= 200
            # Prefer source extensions
            if _ext(path) in EXT_TO_LANG or base == "readme.md" or lower.endswith(".json") or lower.endswith(".toml"):
                score += 5
            # Skip huge binaries
            if _ext(path) in (".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".bin", ".mp4"):
                score -= 500
            scored.append((score, path))
        scored.sort(reverse=True, key=lambda x: x[0])
        # Return top N that have positive-ish score or at least top overall
        # Ensure README is included if present
        result = [p for s, p in scored if s > -100][:50]
        # Always include a readme if exists
        for s, p in scored:
            if os.path.basename(p).lower() == "readme.md" and p not in result:
                result.insert(0, p)
                break
        return result

    # ------------------------------------------------------------------
    def _important_files(self, paths: list[str], file_contents: dict[str, str]) -> list[str]:
        found: list[str] = []
        lower_map = {p.lower(): p for p in paths}
        for name in IMPORTANT_NAMES:
            if name in lower_map:
                found.append(lower_map[name])
        # Also include any top-level config-like files present in file_contents that match important names
        for p in file_contents:
            if os.path.basename(p).lower() in IMPORTANT_NAMES and p not in found:
                found.append(p)
        # Deduplicate preserving order
        seen: set[str] = set()
        deduped: list[str] = []
        for p in found:
            if p not in seen:
                seen.add(p)
                deduped.append(p)
        # Also include fetched files that look like entry-like
        return deduped[:20]

    def _entry_points(self, paths: list[str]) -> list[str]:
        result: list[str] = []
        by_base = {os.path.basename(p).lower(): p for p in paths}
        for cand in ENTRYPOINT_CANDIDATES:
            if cand in by_base:
                result.append(by_base[cand])
        # Also detect app/main at any depth with higher priority if top-level
        return result[:10]

    def _infer_languages(self, paths: list[str]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for p in paths:
            lang = EXT_TO_LANG.get(_ext(p))
            if lang:
                counts[lang] = counts.get(lang, 0) + 1
        return counts

    def _relationships(self, file_contents: dict[str, str]) -> list[dict[str, Any]]:
        rels: list[dict[str, Any]] = []
        for path, content in file_contents.items():
            imports: list[str] = []
            ext = _ext(path)
            if ext == ".py":
                for m in _PY_IMPORT.finditer(content):
                    mod = m.group(1) or m.group(2)
                    if mod:
                        imports.append(mod.strip())
            elif ext in (".js", ".ts", ".jsx", ".tsx"):
                for m in _JS_IMPORT.finditer(content):
                    mod = m.group(1) or m.group(2)
                    if mod:
                        imports.append(mod.strip())
            else:
                continue
            if imports:
                # Deduplicate
                uniq = []
                seen = set()
                for im in imports:
                    if im not in seen:
                        seen.add(im)
                        uniq.append(im)
                rels.append({"file": path, "imports": uniq[:20]})
        return rels

    def _evidence(
        self,
        all_paths: list[str],
        important: list[str],
        entry_points: list[str],
        relationships: list[dict[str, Any]],
        languages: dict[str, int],
        readme: str | None,
    ) -> list[dict[str, Any]]:
        ev: list[dict[str, Any]] = []
        if important:
            ev.append({"claim": "important_files identified", "paths": important[:5]})
        if entry_points:
            ev.append({"claim": "entry points detected", "paths": entry_points})
        if relationships:
            ev.append(
                {
                    "claim": "file relationships via imports",
                    "paths": [r["file"] for r in relationships[:5]],
                }
            )
        if languages:
            # evidence for languages: sample files per language
            top_lang = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:2]
            ev.append({"claim": f"languages: {', '.join(k for k, _ in top_lang)}", "paths": important[:3]})
        if readme:
            # find readme path
            rpaths = [p for p in all_paths if os.path.basename(p).lower() == "readme.md"]
            if rpaths:
                ev.append({"claim": "README present", "paths": rpaths[:1]})
        return ev
