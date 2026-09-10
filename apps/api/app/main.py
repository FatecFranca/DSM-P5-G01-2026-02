from contextlib import asynccontextmanager
from fastapi import FastAPI
from .auth import router as auth_router
from .content import router as content_router
from .sync import router as sync_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Alfabetiza API", version="0.1.0", lifespan=lifespan)
app.include_router(auth_router); app.include_router(content_router); app.include_router(sync_router)

@app.get("/health", tags=["operations"])
def health(): return {"status": "ok"}
