"""Test for learning endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


def test_learning_path_generation(client: TestClient, mock_github_bundle: dict) -> None:
    """Test learning path generation."""
    with patch("app.api.routes.lessons.GitHubService") as MockGitHubService, \
         patch("app.api.routes.lessons.RepositoryParser") as MockRepositoryParser:
        
        mock_github_instance = MagicMock()
        mock_github_instance.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockGitHubService.return_value = mock_github_instance
        
        MockRepositoryParser.return_value.parse = MagicMock(return_value=mock_github_bundle)
        
        response = client.post(
            "/api/learning-path",
            json={
                "repository_url": "https://github.com/testowner/testrepo",
                "level": "beginner",
                "goal": "Learn the basics"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["repository"]["owner"] == "testowner"
        assert data["repository"]["repo"] == "testrepo"
        assert data["level"] == "beginner"
        assert "overview" in data
        assert "missions" in data
        assert len(data["missions"]) > 0


def test_lesson_retrieval(client: TestClient, mock_github_bundle: dict) -> None:
    """Test lesson retrieval."""
    with patch("app.api.routes.lessons.GitHubService") as MockGitHubService, \
         patch("app.api.routes.lessons.RepositoryParser") as MockRepositoryParser:
        
        MockGitHubService.return_value.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockRepositoryParser.return_value.parse = MagicMock(return_value=mock_github_bundle)
        
        # First get the learning path to find a mission ID
        response = client.post(
            "/api/learning-path",
            json={"repository_url": "https://github.com/testowner/testrepo"}
        )
        learning_path = response.json()
        mission_id = learning_path["missions"][0]["id"]
        
        # Now retrieve the specific lesson
        response = client.get(
            f"/api/lessons/{mission_id}",
            params={"repository_url": "https://github.com/testowner/testrepo"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "title" in data
        assert "body" in data
        assert "evidence_paths" in data


def test_hint_generation(client: TestClient, mock_github_bundle: dict) -> None:
    """Test hint generation."""
    with patch("app.api.routes.lessons.GitHubService") as MockGitHubService, \
         patch("app.api.routes.lessons.RepositoryParser") as MockRepositoryParser:
        
        MockGitHubService.return_value.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockRepositoryParser.return_value.parse = MagicMock(return_value=mock_github_bundle)
        
        response = client.post(
            "/api/hints",
            json={
                "repository_url": "https://github.com/testowner/testrepo",
                "mission_id": "m1-orientation",
                "attempt": None
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "mission_id" in data
        assert "hint" in data
        assert "evidence_paths" in data


def test_challenge_checking(client: TestClient, mock_github_bundle: dict) -> None:
    """Test challenge answer checking."""
    with patch("app.api.routes.lessons.GitHubService") as MockGitHubService, \
         patch("app.api.routes.lessons.RepositoryParser") as MockRepositoryParser:
        
        MockGitHubService.return_value.fetch_repository = AsyncMock(return_value=mock_github_bundle)
        MockRepositoryParser.return_value.parse = MagicMock(return_value=mock_github_bundle)
        
        response = client.post(
            "/api/challenges/check",
            json={
                "repository_url": "https://github.com/testowner/testrepo",
                "mission_id": "m1-orientation",
                "answer": "This is a test answer"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "mission_id" in data
        assert "correct" in data
        assert "feedback" in data
        assert "expected_keywords" in data
