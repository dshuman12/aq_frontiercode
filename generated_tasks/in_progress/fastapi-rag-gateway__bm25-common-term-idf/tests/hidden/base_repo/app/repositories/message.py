"""Conversation message repository."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select

from app.models.message import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    model = Message

    async def history(self, conversation_id: str, *, limit: int = 50) -> Sequence[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.seq.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def next_seq(self, conversation_id: str) -> int:
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.coalesce(func.max(Message.seq), 0)).where(
                Message.conversation_id == conversation_id
            )
        )
        return int(result.scalar_one() or 0) + 1
