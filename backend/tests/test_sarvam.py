"""Tests for Sarvam AI Voice Agent endpoints and session signing proxy."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_sarvam_status_endpoint():
    """Verify status endpoint returns configuration without exposing secrets."""
    response = client.get("/api/sarvam/status")
    assert response.status_code == 200
    data = response.json()
    assert "has_api_key" in data
    assert "configured" in data
    assert "tts_model" in data
    assert "stt_model" in data
    assert "supported_languages" in data
    # Ensure sensitive credentials are NOT exposed
    assert "api_key" not in data
    assert "sk_" not in str(data)


def test_sarvam_session_url_missing_credentials(monkeypatch):
    """Verify session URL endpoint rejects requests when API key is missing."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    
    response = client.post("/api/sarvam/session-url", json={})
    assert response.status_code == 400
    assert "SARVAM_API_KEY is not configured" in response.json()["detail"]


def test_sarvam_session_url_missing_org(monkeypatch):
    """Verify session URL endpoint validates missing org or workspace IDs."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "sarvam_api_key", "dummy_key")
    monkeypatch.setattr(settings, "sarvam_org_id", "")
    
    response = client.post("/api/sarvam/session-url", json={})
    assert response.status_code == 422
    assert "SARVAM_ORG_ID" in response.json()["detail"]


def test_sarvam_converse_instant_grounded():
    """Verify voice converse endpoint responds accurately with repository grounding."""
    payload = {
        "repository_url": "https://github.com/vercel/ms",
        "spoken_query": "What is the primary entry point?",
        "language_code": "en-IN",
    }
    response = client.post("/api/sarvam/converse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response_text" in data
    assert "entry point" in data["response_text"].lower()
    assert data["language_code"] == "en-IN"
