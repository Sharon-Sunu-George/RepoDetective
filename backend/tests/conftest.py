"""Test configuration and fixtures for RepoDetective backend."""

from typing import Any, AsyncGenerator

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def mock_github_bundle() -> dict[str, Any]:
    """Mock repository bundle for testing."""
    return {
        "owner": "testowner",
        "repo": "testrepo",
        "url": "https://github.com/testowner/testrepo",
        "metadata": {
            "description": "Test repository",
            "stargazers_count": 10,
            "forks_count": 2,
            "default_branch": "main",
            "size": 1024,
            "open_issues_count": 5,
        },
        "languages": {"Python": 50, "JavaScript": 30},
        "readme": "# Test Repo\nThis is a test repository.",
        "tree": [
            {"path": "README.md", "type": "blob", "size": 45},
            {"path": "src/main.py", "type": "blob", "size": 1024},
            {"path": "src/utils.py", "type": "blob", "size": 500},
            {"path": "tests/test_main.py", "type": "blob", "size": 200},
        ],
        "file_contents": {
            "README.md": "# Test Repo\nThis is a test repository.",
            "src/main.py": "def main():\n    return 'Hello World'\n",
            "src/utils.py": "def helper():\n    return 42\n",
            "tests/test_main.py": "def test_main():\n    assert True\n",
        },
        "important_files": ["README.md", "src/main.py"],
        "entry_points": ["src/main.py"],
        "file_relationships": [
            {"file": "src/main.py", "imports": ["src.utils"]},
            {"file": "src/utils.py", "imports": []},
        ],
        "evidence": [
            {"claim": "important_files identified", "paths": ["README.md", "src/main.py"]},
            {"claim": "entry points detected", "paths": ["src/main.py"]},
        ],
        "warnings": [],
        "default_branch": "main",
    }


@pytest.fixture
async def mock_github_service(mock_github_bundle: dict[str, Any]) -> AsyncMock:
    """Mock GitHubService for testing."""
    mock_service = AsyncMock()
    mock_service.fetch_repository = AsyncMock(return_value=mock_github_bundle)
    return mock_service


@pytest.fixture
async def mock_parser() -> MagicMock:
    """Mock RepositoryParser for testing."""
    mock_parser = MagicMock()
    mock_parser.parse = MagicMock(return_value={
        "owner": "testowner",
        "repo": "testrepo",
        "url": "https://github.com/testowner/testrepo",
        "metadata": {"description": "Test repo"},
        "languages": {"Python": 1},
        "readme": "# Test",
        "directory_tree": [],
        "important_files": ["README.md"],
        "entry_points": ["src/main.py"],
        "file_relationships": [],
        "file_contents": {},
        "evidence": [],
        "warnings": [],
    })
    return mock_parser


@pytest.fixture
async def mock_gemma_service() -> MagicMock:
    """Mock GemmaService for testing."""
    mock_gemma = MagicMock()
    mock_gemma.mode = "mock"
    mock_gemma.generate = AsyncMock(return_value={"text": "Mocked response", "mode": "mock", "model": "gemma-mock"})
    return mock_gemma


@pytest.fixture
async def mock_analyst(mock_parser: MagicMock, mock_gemma_service: MagicMock) -> MagicMock:
    """Mock RepositoryAnalyst for testing."""
    mock_analyst = MagicMock()
    mock_analyst.analyze = AsyncMock(return_value={
        "findings": [
            {
                "id": "finding-important-files",
                "summary": "Key files: README.md",
                "evidence_paths": ["README.md"],
                "confidence": 0.9,
            }
        ],
        "important_files": ["README.md"],
        "entry_points": ["src/main.py"],
        "languages": {"Python": 1},
        "relationships": [],
        "warnings": [],
        "_file_contents_keys": [],
    })
    return mock_analyst


@pytest.fixture
async def mock_teacher(mock_analyst: MagicMock) -> MagicMock:
    """Mock AITeacher for testing."""
    mock_teacher = MagicMock()
    mock_teacher.teach = AsyncMock(return_value={
        "overview": "Test repository overview",
        "missions": [
            {
                "id": "m1-orientation",
                "title": "Orient yourself in the repository",
                "explanation": "Test explanation",
                "hint": "Test hint",
                "evidence_paths": ["README.md"],
            }
        ],
    })
    return mock_teacher


@pytest.fixture
async def mock_verifier(mock_teacher: MagicMock) -> MagicMock:
    """Mock VerificationAgent for testing."""
    mock_verifier = MagicMock()
    mock_verifier.verify = MagicMock(return_value={
        "passed": True,
        "issues": [],
        "verified_paths": ["README.md"],
        "unsupported_claims": [],
    })
    return mock_verifier
