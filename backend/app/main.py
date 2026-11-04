from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import agents, health, lessons, repositories, sarvam
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
app.include_router(sarvam.router)

# Mount frontend production build if available
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    if (frontend_dist / "images").exists():
        app.mount("/images", StaticFiles(directory=str(frontend_dist / "images")), name="images")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str, request: Request):
        accept_header = request.headers.get("accept", "")
        # If accessing root '/' without explicitly asking for html (or when test client / API hits root)
        if (not full_path or full_path == "") and "text/html" not in accept_header:
            return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}

        # Don't intercept API routes or docs
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")

        
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

else:
    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}

