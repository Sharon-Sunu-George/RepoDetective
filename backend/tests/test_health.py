"""Test for health endpoint."""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    """Test that the health endpoint returns OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "ok"}

    # Also test the root endpoint
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "RepoDetective API"
    assert "docs" in data
