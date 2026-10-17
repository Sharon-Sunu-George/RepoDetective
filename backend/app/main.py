"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import agents, health, lessons, repositories
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="RepoDetective — analyse GitHub repos and generate guided learning missions. See /docs for Swagger UI.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(repositories.router)
app.include_router(lessons.router)
app.include_router(agents.router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
