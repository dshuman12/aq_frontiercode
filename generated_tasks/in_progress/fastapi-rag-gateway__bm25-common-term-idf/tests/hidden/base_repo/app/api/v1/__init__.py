"""Version 1 of the public API."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    admin,
    api_keys,
    auth,
    chat,
    conversations,
    documents,
    health,
    metrics,
    search,
    users,
)

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(metrics.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
router.include_router(documents.router, prefix="/documents", tags=["documents"])
router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(search.router, prefix="/search", tags=["search"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])

__all__ = ["router"]
