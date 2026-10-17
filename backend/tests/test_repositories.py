"""Test for repository analysis endpoint with mocked dependencies."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


def test_analyze_repository_success(client: TestClient, mock_github_bundle: dict) -> None:
    """Test successful repository analysis with mocked GitHub service."""
    # Mock the GitHub service and its dependencies
    with patch("app.api.routes.repositories.GitHubService") as MockGitHubService, \
         patch("app.api.routes.repositories.RepositoryParser") as MockRepositoryParser, \
         patch("app.api.routes.repositories.RepositoryAnalyst") as MockRepositoryAnalyst, \
         patch("app.api.routes.repositories.AITeacher") as MockAITeacher, \
         patch("app.api.routes.repositories.VerificationAgent") as MockVerificationAgent, \
         patch("app.api.routes.repositories.GemmaService") as MockGemmaService:
        
        # Setup mock instances
        mock_github_instance = MagicMock()
        mock_github_instance.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockGitHubService.return_value = mock_github_instance
        
        mock_parser_instance = MagicMock()
        mock_parser_instance.parse = MagicMock(return_value=mock_github_bundle)
        MockRepositoryParser.return_value = mock_parser_instance
        
        mock_analyst_instance = MagicMock()
        mock_analyst_instance.analyze = AsyncMock(return_value={
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
        })
        MockRepositoryAnalyst.return_value = mock_analyst_instance
        
        mock_teacher_instance = MagicMock()
        mock_teacher_instance.teach = AsyncMock(return_value={
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
        MockAITeacher.return_value = mock_teacher_instance
        
        mock_verifier_instance = MagicMock()
        mock_verifier_instance.verify = MagicMock(return_value={
            "passed": True,
            "issues": [],
            "verified_paths": ["README.md"],
            "unsupported_claims": [],
        })
        MockVerificationAgent.return_value = mock_verifier_instance
        
        mock_gemma_instance = MagicMock()
        mock_gemma_instance.mode = "mock"
        MockGemmaService.return_value = mock_gemma_instance
        
        # Make the API request
        response = client.post(
            "/api/repositories/analyze",
            json={"repository_url": "https://github.com/testowner/testrepo"}
        )
        
        # Verify the response
        assert response.status_code == 200
        data = response.json()
        
        assert data["repository"]["owner"] == "testowner"
        assert data["repository"]["repo"] == "testrepo"
        assert "analysis" in data
        assert "agents" in data
        assert data["agents"]["final_verified"] == True
        assert data["agents"]["gemma_mode"] == "mock"


def test_analyze_repository_missing_readme(client: TestClient) -> None:
    """Test analysis with missing README."""
    bundle_without_readme = {
        "owner": "testowner",
        "repo": "testrepo",
        "url": "https://github.com/testowner/testrepo",
        "metadata": {"description": "Test repo"},
        "languages": {},
        "readme": None,
        "tree": [],
        "file_contents": {},
        "important_files": [],
        "entry_points": [],
        "file_relationships": [],
        "evidence": [],
        "warnings": ["No README found"],
    }
    
    with patch("app.api.routes.repositories.GitHubService") as MockGitHubService, \
         patch("app.api.routes.repositories.RepositoryParser") as MockRepositoryParser, \
         patch("app.api.routes.repositories.RepositoryAnalyst") as MockRepositoryAnalyst, \
         patch("app.api.routes.repositories.AITeacher") as MockAITeacher, \
         patch("app.api.routes.repositories.VerificationAgent") as MockVerificationAgent, \
         patch("app.api.routes.repositories.GemmaService") as MockGemmaService:
        
        mock_github_instance = MagicMock()
        mock_github_instance.fetch_repository = AsyncMock(return_value=bundle_without_readme)
        MockGitHubService.return_value = mock_github_instance
        
        MockRepositoryParser.return_value.parse = MagicMock(return_value=bundle_without_readme)
        MockRepositoryAnalyst.return_value.analyze = AsyncMock(return_value={
            "findings": [],
            "important_files": [],
            "entry_points": [],
            "languages": {},
            "relationships": [],
            "warnings": [],
        })
        MockAITeacher.return_value.teach = AsyncMock(return_value={
            "overview": "Overview",
            "missions": [],
        })
        MockVerificationAgent.return_value.verify = MagicMock(return_value={
            "passed": True,
            "issues": [],
            "verified_paths": [],
            "unsupported_claims": [],
        })
        MockGemmaService.return_value.mode = "mock"
        
        response = client.post(
            "/api/repositories/analyze",
            json={"repository_url": "https://github.com/testowner/testrepo"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "analysis" in data
        assert data["analysis"]["readme"] is None
