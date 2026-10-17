"""Test for GitHub URL validation."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.security import SecurityError, validate_and_parse_github_url


def test_valid_github_url() -> None:
    """Test that valid GitHub URLs are accepted."""
    owner, repo = validate_and_parse_github_url("https://github.com/owner/repo")
    assert owner == "owner"
    assert repo == "repo"
    
    owner, repo = validate_and_parse_github_url("https://github.com/owner/repo.git")
    assert owner == "owner"
    assert repo == "repo"


def test_invalid_github_url() -> None:
    """Test that invalid GitHub URLs are rejected."""
    # Test http URL - should fail regex validation
    with pytest.raises(SecurityError):
        validate_and_parse_github_url("http://github.com/owner/repo")
    
    # Test invalid host - should fail regex validation
    with pytest.raises(SecurityError, match="Invalid GitHub URL"):
        validate_and_parse_github_url("https://gitlab.com/owner/repo")
    
    # Test incomplete URL - should fail regex validation
    with pytest.raises(SecurityError, match="Invalid GitHub URL"):
        validate_and_parse_github_url("https://github.com/owner")


def test_endpoint_invalid_url(client: TestClient) -> None:
    """Test that the analyze endpoint rejects invalid GitHub URLs."""
    # Invalid URL - wrong format (http instead of https) - should be validation error (422)
    response = client.post(
        "/api/repositories/analyze",
        json={"repository_url": "http://github.com/owner/repo"}
    )
    # Pydantic validation returns 422 for validation errors
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    
    # Empty URL - Pydantic validation returns 422
    response = client.post(
        "/api/repositories/analyze",
        json={"repository_url": ""}
    )
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    
    # URL that's too long - caught by Pydantic validation (422)
    long_url = "https://github.com/" + "a" * 200
    response = client.post(
        "/api/repositories/analyze",
        json={"repository_url": long_url}
    )
    assert response.status_code == 422
