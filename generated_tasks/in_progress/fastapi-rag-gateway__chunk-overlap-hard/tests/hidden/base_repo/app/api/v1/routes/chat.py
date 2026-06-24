"""Chat endpoints (sync + streaming)."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user, db_session, get_app_settings
from app.core.config import Settings
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> ChatResponse:
    service = ChatService(session, settings=settings)
    response = await service.chat(user.id, payload)
    await session.commit()
    return response


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> StreamingResponse:
    service = ChatService(session, settings=settings)

    async def event_stream():
        try:
            async for chunk in service.stream(user.id, payload):
                payload_bytes = chunk.model_dump_json().encode("utf-8")
                yield b"data: " + payload_bytes + b"\n\n"
        finally:
            await session.commit()
        yield b"event: done\ndata: " + json.dumps({"status": "ok"}).encode("utf-8") + b"\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


__all__ = ["router"]
