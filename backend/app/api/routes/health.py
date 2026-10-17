"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/health", summary="Health check")
async def health_check() -> dict:
    """Return service health. Used by frontend and monitors."""
    return {"status": "ok"}


# Backwards-compat: also expose at /health for earlier spec
@router.get("/health", include_in_schema=False)
async def health_check_legacy() -> dict:
    return {"status": "ok"}
