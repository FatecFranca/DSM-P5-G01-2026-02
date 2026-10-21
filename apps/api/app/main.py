from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from .auth import router as auth_router
from .content import router as content_router
from .leaderboard import router as leaderboard_router
from .me import router as me_router
from .admin import media_router, router as admin_router
from .ranking.router import router as ranking_router
from .sync import router as sync_router
from .word_studio import router as word_studio_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Prosa API", version="0.1.0", lifespan=lifespan)
app.include_router(auth_router); app.include_router(content_router); app.include_router(sync_router); app.include_router(ranking_router); app.include_router(me_router); app.include_router(admin_router); app.include_router(media_router); app.include_router(word_studio_router); app.include_router(leaderboard_router)
# Interface local distribuída no próprio servidor, sem depender do diretório
# atual de execução (uvicorn, testes e executável usam CWDs diferentes).
ADMIN_WEB_ROOT = Path(__file__).resolve().parents[2] / "admin"
app.mount("/admin", StaticFiles(directory=ADMIN_WEB_ROOT, html=True), name="admin-web")

@app.get("/health", tags=["operations"])
def health(): return {"status": "ok"}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

