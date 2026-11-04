"""GitHub API integration — metadata, README, tree, and file contents."""

from __future__ import annotations

import base64
from typing import Any

import httpx

from app.core.config import settings


class GitHubError(Exception):
    """Raised for GitHub API failures with a user-facing message and status code."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


_REPO_BUNDLE_CACHE: dict[str, dict[str, Any]] = {}


class GitHubService:
    """Interacts with the GitHub REST API with timeouts and rate-limit handling."""

    def __init__(
        self,
        token: str | None = None,
        api_base: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.token = token if token is not None else settings.github_token
        self.api_base = (api_base or settings.github_api_base).rstrip("/")
        self.timeout = timeout if timeout is not None else settings.github_api_base and settings.github_timeout_seconds or 10.0
        # Ensure numeric
        try:
            self.timeout = float(self.timeout)
        except Exception:
            self.timeout = 10.0

    # ------------------------------------------------------------------
    def _headers(self) -> dict[str, str]:
        h: dict[str, str] = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "RepoDetective/1.0",
        }
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> httpx.Response:
        url = f"{self.api_base}{path}"
        async with httpx.AsyncClient(timeout=self.timeout, headers=self._headers(), follow_redirects=True) as client:
            try:
                resp = await client.get(url, params=params)
            except httpx.TimeoutException as exc:
                raise GitHubError("GitHub API timed out. Please try again.", status_code=504) from exc
            except httpx.RequestError as exc:
                raise GitHubError(f"Network error contacting GitHub: {exc}", status_code=502) from exc
            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                raise GitHubError(
                    "GitHub rate limit exceeded. Add GITHUB_TOKEN or try again later.",
                    status_code=429,
                )
            if resp.status_code == 404:
                raise GitHubError("Repository not found or is private.", status_code=404)
            if resp.status_code == 401:
                # If configured token is invalid or expired, retry without authorization for public repositories
                if self.token:
                    async with httpx.AsyncClient(timeout=self.timeout, headers={"Accept": "application/vnd.github.v3+json"}, follow_redirects=True) as fallback_client:
                        fallback_resp = await fallback_client.get(url, params=params)
                        if fallback_resp.status_code < 400:
                            return fallback_resp
                raise GitHubError("GitHub authentication failed. Check GITHUB_TOKEN.", status_code=401)
            if resp.status_code >= 400:
                # Truncate body to avoid leaking huge payloads
                body = resp.text[:500]
                raise GitHubError(f"GitHub API error {resp.status_code}: {body}", status_code=502)
            return resp

    # ------------------------------------------------------------------
    async def fetch_repository(self, owner: str, repo: str) -> dict[str, Any]:
        """Fetch full bundle: metadata, languages, README, tree, and selected files.

        Limits enforced: max files, max file size, max total bytes.
        Treats all content as untrusted — never executed.
        """
        cache_key = f"{owner.lower()}/{repo.lower()}"
        if cache_key in _REPO_BUNDLE_CACHE:
            return _REPO_BUNDLE_CACHE[cache_key]

        # 1. Metadata
        meta_resp = await self._get(f"/repos/{owner}/{repo}")

        metadata = meta_resp.json()
        default_branch = metadata.get("default_branch") or "main"

        # 2. Languages
        try:
            lang_resp = await self._get(f"/repos/{owner}/{repo}/languages")
            languages = lang_resp.json() if lang_resp.status_code == 200 else {}
        except GitHubError:
            languages = {}

        # 3. README (optional)
        readme_text: str | None = None
        try:
            r_resp = await self._get(f"/repos/{owner}/{repo}/readme")
            data = r_resp.json()
            if data.get("content"):
                try:
                    readme_text = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                except Exception:
                    readme_text = None
        except GitHubError as exc:
            if exc.status_code != 404:
                # Non-404 README errors are warnings, not fatal
                readme_text = None
            else:
                readme_text = None

        # 4. Directory tree (recursive)
        tree_entries: list[dict[str, Any]] = []
        warnings: list[str] = []
        try:
            # Need commit SHA for tree; fetch branch ref
            branch_resp = await self._get(f"/repos/{owner}/{repo}/branches/{default_branch}")
            sha = branch_resp.json().get("commit", {}).get("sha")
            if not sha:
                # Fallback: use default_branch name directly (works for some repos)
                sha = default_branch
            tree_resp = await self._get(f"/repos/{owner}/{repo}/git/trees/{sha}", params={"recursive": "1"})
            tree_data = tree_resp.json()
            if tree_data.get("truncated"):
                warnings.append("Directory tree was truncated by GitHub (large repository).")
            for item in tree_data.get("tree", []):
                # item: {path, mode, type, sha, size, url}
                tree_entries.append(item)
            # Empty repo: tree may be empty and no branch — treat as empty
            if not tree_entries:
                warnings.append("Repository appears empty or tree is empty.")
        except GitHubError as exc:
            if exc.status_code == 404:
                # Empty repo or missing branch
                warnings.append("Could not retrieve directory tree — repository may be empty.")
                tree_entries = []
            else:
                raise

        # 5. Select key files to fetch content for in parallel (top 5 critical files for instant forensic analysis)
        from app.services.repository_parser import RepositoryParser
        import asyncio

        parser = RepositoryParser()
        provisional = parser.select_files_to_fetch(tree_entries)[:5]

        file_contents: dict[str, str] = {}
        total_bytes = 0

        async def fetch_file(path: str):
            try:
                f_resp = await self._get(f"/repos/{owner}/{repo}/contents/{path}")
                fdata = f_resp.json()
                if isinstance(fdata, list) or fdata.get("type") != "file":
                    return None
                size = fdata.get("size") or 0
                if size > settings.max_file_size_bytes:
                    return None
                content_b64 = fdata.get("content") or ""
                decoded = ""
                if fdata.get("encoding") == "base64" and content_b64:
                    try:
                        decoded = base64.b64decode(content_b64).decode("utf-8", errors="replace")
                    except Exception:
                        return None
                return (path, decoded, size)
            except Exception:
                return None

        fetched_results = await asyncio.gather(*(fetch_file(p) for p in provisional), return_exceptions=True)
        for item in fetched_results:
            if isinstance(item, tuple) and item is not None:
                p, dec, sz = item
                if dec:
                    file_contents[p] = dec[:settings.max_file_size_bytes]
                    total_bytes += sz

        bundle: dict[str, Any] = {
            "metadata": metadata,
            "languages": languages,
            "readme": readme_text,
            "tree": tree_entries,
            "file_contents": file_contents,
            "warnings": warnings,
            "owner": owner,
            "repo": repo,
            "default_branch": default_branch,
        }
        _REPO_BUNDLE_CACHE[cache_key] = bundle
        return bundle

