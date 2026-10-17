"""Security helpers: URL validation, input limits, and sanitisation."""

import re
from urllib.parse import urlparse

# Only public github.com repos are supported in this MVP.
_GITHUB_RE = re.compile(
    r"^https://github\.com/(?P<owner>[A-Za-z0-9_.\-]+)/(?P<repo>[A-Za-z0-9_.\-]+)(?:\.git)?/?(?:[?#].*)?$",
    re.IGNORECASE,
)

# Block private / loopback / metadata-ish patterns early.
_BLOCKED_HOSTS = {"localhost", "127.0.0.1", "::1", "169.254.169.254"}


class SecurityError(ValueError):
    pass


def validate_and_parse_github_url(url: str) -> tuple[str, str]:
    """Validate a user-supplied repository URL.

    Returns (owner, repo) on success. Raises SecurityError with a user-facing
    message on failure. The returned repo name has a trailing .git stripped.
    """
    if not url or not isinstance(url, str):
        raise SecurityError("repository_url is required.")
    url = url.strip()
    if len(url) > 2048:
        raise SecurityError("URL is too long.")
    
    # Auto-prepend https://github.com/ if user passed owner/repo
    if re.match(r"^[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+(?:\.git)?/?$", url):
        url = f"https://github.com/{url}"

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SecurityError("URL must start with https://github.com/owner/repo or owner/repo format.")
    if parsed.hostname and parsed.hostname.lower() in _BLOCKED_HOSTS:
        raise SecurityError("URL host is not allowed.")
    m = _GITHUB_RE.match(url)
    if not m:
        raise SecurityError(
            "Invalid GitHub URL. Expected format: https://github.com/owner/repo or owner/repo"
        )
    owner = m.group("owner")
    repo = m.group("repo")
    # Strip trailing .git if captured (regex already handles it but be safe)
    if repo.lower().endswith(".git"):
        repo = repo[:-4]
    # GitHub names are 1-100 chars; extra sanity
    if not owner or not repo or len(owner) > 100 or len(repo) > 100:
        raise SecurityError("Invalid owner or repository name.")
    return owner, repo


def normalise_github_url(owner: str, repo: str) -> str:
    return f"https://github.com/{owner}/{repo}"
