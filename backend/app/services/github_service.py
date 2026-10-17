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

        # 5. Select files to fetch content for
        from app.services.repository_parser import RepositoryParser

        parser = RepositoryParser()
        # Use parser to rank files without needing content yet
        provisional = parser.select_files_to_fetch(tree_entries)

        file_contents: dict[str, str] = {}
        total_bytes = 0
        for path in provisional:
            if len(file_contents) >= settings.max_files_to_fetch:
                warnings.append(f"File fetch limit reached ({settings.max_files_to_fetch}).")
                break
            try:
                f_resp = await self._get(f"/repos/{owner}/{repo}/contents/{path}")
                fdata = f_resp.json()
                # GitHub may return list for directories — skip
                if isinstance(fdata, list):
                    continue
                if fdata.get("type") != "file":
                    continue
                size = fdata.get("size") or 0
                if size > settings.max_file_size_bytes:
                    warnings.append(f"Skipped {path}: exceeds per-file limit ({size} bytes).")
                    continue
                if total_bytes + size > settings.max_total_bytes:
                    warnings.append(f"Total fetch budget exceeded; skipping remaining files from {path}.")
                    break
                content_b64 = fdata.get("content") or ""
                encoding = fdata.get("encoding")
                if encoding == "base64" and content_b64:
                    try:
                        decoded = base64.b64decode(content_b64).decode("utf-8", errors="replace")
                    except Exception:
                        warnings.append(f"Could not decode {path}.")
                        continue
                else:
                    # Fallback: try raw download_url
                    download_url = fdata.get("download_url")
                    if download_url:
                        async with httpx.AsyncClient(timeout=self.timeout) as c2:
                            r2 = await c2.get(download_url, headers=self._headers())
                            if r2.status_code == 200:
                                decoded = r2.text[: settings.max_file_size_bytes]
                            else:
                                continue
                    else:
                        continue
                # Truncate to limit anyway
                if len(decoded.encode("utf-8")) > settings.max_file_size_bytes:
                    decoded = decoded[: settings.max_file_size_bytes]
                    warnings.append(f"Truncated {path} to size limit.")
                file_contents[path] = decoded
                total_bytes += size
            except GitHubError as exc:
                if exc.status_code == 404:
                    warnings.append(f"File not found when fetching {path}.")
                    continue
                raise

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
        return bundle
