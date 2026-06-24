"""Conversation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user, db_session, page_params
from app.api.responses import to_envelope
from app.core.exceptions import NotFoundError
from app.core.pagination import PageRequest
from app.core.security import utc_now
from app.models.conversation import Conversation
from app.models.user import User
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.schemas.common import PageEnvelope, StatusResponse
from app.schemas.conversation import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter()


@router.get("/", response_model=PageEnvelope[ConversationOut])
async def list_conversations(
    request: PageRequest = Depends(page_params),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PageEnvelope[ConversationOut]:
    repo = ConversationRepository(session)
    page = await repo.list_for_owner(user.id, request)
    items = [ConversationOut.model_validate(item) for item in page.items]
    return to_envelope(page, items)


@router.post("/", response_model=ConversationOut, status_code=201)
async def create_conversation(
    payload: ConversationCreate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> ConversationOut:
    conversation = Conversation(
        owner_id=user.id,
        title=payload.title or "New chat",
        metadata=dict(payload.metadata or {}),
    )
    repo = ConversationRepository(session)
    await repo.create(conversation)
    await session.commit()
    return ConversationOut.model_validate(conversation)


@router.get("/{conversation_id}", response_model=ConversationOut)
async def read_conversation(
    conversation_id: str,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> ConversationOut:
    conversation = await _owned_conversation(session, conversation_id, user)
    messages = await MessageRepository(session).history(conversation.id)
    payload = ConversationOut.model_validate(conversation)
    payload.messages = [MessageOut.model_validate(m) for m in messages]
    return payload


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> ConversationOut:
    conversation = await _owned_conversation(session, conversation_id, user)
    if payload.title is not None:
        conversation.title = payload.title
    if payload.is_pinned is not None:
        conversation.is_pinned = payload.is_pinned
    if payload.summary is not None:
        conversation.summary = payload.summary
    if payload.metadata is not None:
        conversation.metadata = dict(payload.metadata)
    await session.flush()
    await session.commit()
    return ConversationOut.model_validate(conversation)


@router.delete("/{conversation_id}", response_model=StatusResponse)
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StatusResponse:
    conversation = await _owned_conversation(session, conversation_id, user)
    conversation.deleted_at = utc_now()
    await session.flush()
    await session.commit()
    return StatusResponse(status="ok", message="Conversation deleted")


async def _owned_conversation(
    session: AsyncSession, conversation_id: str, user: User
) -> Conversation:
    repo = ConversationRepository(session)
    conversation = await repo.get(conversation_id)
    if (
        conversation is None
        or conversation.deleted_at is not None
        or conversation.owner_id != user.id
    ):
        raise NotFoundError("Conversation not found.")
    return conversation


__all__ = ["router"]
