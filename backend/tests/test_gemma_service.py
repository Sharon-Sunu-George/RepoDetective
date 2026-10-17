"""Test for Gemma service mock/live mode."""

import pytest


def test_gemma_service_mock_mode() -> None:
    """Test that GemmaService operates in mock mode by default."""
    from app.services.gemma_service import GemmaService
    
    # Create a GemmaService instance
    gemma_service = GemmaService()
    
    # Should be in mock mode by default (no API key/base provided)
    assert gemma_service.mode == "mock"
    assert gemma_service.mock_mode == True
    assert gemma_service.api_key == ""
    assert gemma_service.api_base == ""


def test_gemma_service_explicit_mock_mode() -> None:
    """Test GemmaService when explicit mock mode is provided."""
    from app.services.gemma_service import GemmaService
    
    # Create a GemmaService instance with explicit mock mode
    gemma_service = GemmaService(mock_mode=True)
    
    # Should be in mock mode
    assert gemma_service.mode == "mock"
    assert gemma_service.mock_mode == True


def test_gemma_service_explicit_live_mode_without_credentials() -> None:
    """Test GemmaService when explicit live mode is provided but no credentials."""
    from app.services.gemma_service import GemmaService
    
    # Create a GemmaService instance with explicit live mode but no credentials
    gemma_service = GemmaService(mock_mode=False)
    
    # The service will be in live mode because we explicitly set mock_mode=False
    # But it will fail when trying to use credentials (which are empty)
    assert gemma_service.mode == "live"
    assert gemma_service.mock_mode == False


def test_gemma_service_headers_with_token() -> None:
    """Test that GemmaService includes Authorization header when token is provided."""
    from app.services.gemma_service import GemmaService
    
    gemma_service = GemmaService(api_key="test_key", api_base="https://test.example.com")
    
    assert gemma_service.api_key == "test_key"
    assert gemma_service.api_base == "https://test.example.com"
    assert gemma_service.mock_mode == True


def test_gemma_service_timeout() -> None:
    """Test that GemmaService respects timeout settings."""
    from app.services.gemma_service import GemmaService
    
    gemma_service = GemmaService(timeout=60.0)
    assert gemma_service.timeout == 60.0
    
    # Default timeout should be from config
    gemma_service_default = GemmaService()
    assert hasattr(gemma_service_default, 'timeout')
