"""Test for agent collaboration workflow."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


def test_agent_workflow_full(client: TestClient, mock_github_bundle: dict) -> None:
    """Test the complete Analyst -> Teacher -> Verification workflow."""
    with patch("app.api.routes.agents.GitHubService") as MockGitHubService, \
         patch("app.api.routes.agents.RepositoryParser") as MockRepositoryParser, \
         patch("app.api.routes.agents.RepositoryAnalyst") as MockRepositoryAnalyst, \
         patch("app.api.routes.agents.AITeacher") as MockAITeacher, \
         patch("app.api.routes.agents.VerificationAgent") as MockVerificationAgent, \
         patch("app.api.routes.agents.GemmaService") as MockGemmaService:
        
        # Setup mocks
        mock_github_instance = MagicMock()
        mock_github_instance.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockGitHubService.return_value = mock_github_instance
        
        MockRepositoryParser.return_value.parse = MagicMock(return_value=mock_github_bundle)
        
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
                    "explanation": "Test explanation referencing README.md",
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
        
        # Run all three agents
        response = client.post(
            "/api/agents/run",
            json={
                "repository_url": "https://github.com/testowner/testrepo",
                "agents": ["analyst", "teacher", "verification"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["repository"]["owner"] == "testowner"
        assert data["repository"]["repo"] == "testrepo"
        assert "analyst" in data
        assert "teacher" in data
        assert "verification" in data
        assert data["final_verified"] == True
        assert data["gemma_mode"] == "mock"


def test_agent_workflow_verification_fails(client: TestClient) -> None:
    """Test that verification fails when evidence paths are missing."""
    with patch("app.api.routes.agents.GitHubService") as MockGitHubService, \
         patch("app.api.routes.agents.RepositoryParser") as MockRepositoryParser, \
         patch("app.api.routes.agents.RepositoryAnalyst") as MockRepositoryAnalyst, \
         patch("app.api.routes.agents.AITeacher") as MockAITeacher, \
         patch("app.api.routes.agents.VerificationAgent") as MockVerificationAgent, \
         patch("app.api.routes.agents.GemmaService") as MockGemmaService:
        
        # Setup mocks with missing evidence path
        MockRepositoryParser.return_value.parse = MagicMock(return_value={
            "owner": "testowner",
            "repo": "testrepo",
            "url": "https://github.com/testowner/testrepo",
            "metadata": {},
            "languages": {},
            "readme": None,
            "directory_tree": [],
            "important_files": [],
            "entry_points": [],
            "file_relationships": [],
            "file_contents": {},
            "evidence": [],
            "warnings": [],
        })
        
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
            "missions": [
                {
                    "id": "m1-orientation",
                    "title": "Test",
                    "explanation": "Test explanation",
                    "hint": "Test hint",
                    "evidence_paths": ["nonexistent/file.txt"],  # This path doesn't exist
                }
            ],
        })
        
        MockVerificationAgent.return_value.verify = MagicMock(return_value={
            "passed": False,
            "issues": [
                {
                    "severity": "error",
                    "message": "Mission m1-orientation references unknown path: nonexistent/file.txt",
                    "path": "nonexistent/file.txt",
                }
            ],
            "verified_paths": [],
            "unsupported_claims": ["Mission m1-orientation references missing path nonexistent/file.txt"],
        })
        
        # Create a mock GitHubService instance
        mock_github_instance = MagicMock()
        mock_github_instance.fetch_repository = AsyncMock(return_value={
            "owner": "testowner",
            "repo": "testrepo",
            "url": "https://github.com/testowner/testrepo",
            "metadata": {},
            "languages": {},
            "readme": None,
            "directory_tree": [],
            "file_contents": {},
            "warnings": [],
        })
        MockGitHubService.return_value = mock_github_instance
        
        # Mock GemmaService
        mock_gemma_instance = MagicMock()
        mock_gemma_instance.mode = "mock"
        MockGemmaService.return_value = mock_gemma_instance
        
        response = client.post(
            "/api/agents/run",
            json={
                "repository_url": "https://github.com/testowner/testrepo",
                "agents": ["analyst", "teacher", "verification"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["final_verified"] == False
        assert "verification" in data
        assert data["verification"]["passed"] == False
        assert len(data["verification"]["issues"]) > 0
        assert any(issue["severity"] == "error" for issue in data["verification"]["issues"])

