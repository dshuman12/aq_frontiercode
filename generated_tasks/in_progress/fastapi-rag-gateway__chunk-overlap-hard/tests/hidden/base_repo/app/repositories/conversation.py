"""Conversation repository."""

from __future__ import annotations

from app.core.pagination import Page, PageRequest
from app.models.conversation import Conversation
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    async def list_for_owner(
        self, owner_id: str, request: PageRequest, *, pinned_first: bool = True
    ) -> Page[Conversation]:
        order = (
            (Conversation.is_pinned.desc(), Conversation.last_activity_at.desc())
            if pinned_first
            else (Conversation.last_activity_at.desc(),)
        )
        return await self.page(
            request,
            Conversation.owner_id == owner_id,
            Conversation.deleted_at.is_(None),
            order_by=order,
        )

    async def touch(self, conversation: Conversation) -> Conversation:
        from app.core.security import utc_now

        conversation.last_activity_at = utc_now()
        await self.session.flush()
        return conversation
