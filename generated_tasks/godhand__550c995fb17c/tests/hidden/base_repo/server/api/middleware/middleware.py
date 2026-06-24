from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import get_app_config

def register_middleware(app: FastAPI) -> None:
    cfg = get_app_config()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.CORS_ALLOWED_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )
