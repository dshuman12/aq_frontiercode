"""Chat service.

Wraps the :class:`~app.rag.pipeline.RAGPipeline` and persists the
resulting messages, citations and token counts.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation
from app.models.message import Message
from app.rag.llm import GenerationParams
from app.rag.memory import BaseMemory, get_memory
from app.rag.pipeline import RAGPipeline, RAGRequest, RAGResponse
from app.rag.types import StreamChunk
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.schemas.chat import ChatCitation, ChatRequest, ChatResponse, ChatStreamChunk


class ChatService:
    """High-level chat orchestration."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        settings: Settings | None = None,
        pipeline: RAGPipeline | None = None,
        memory: BaseMemory | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.pipeline = pipeline or RAGPipeline(settings=self.settings)
        self.memory = (
            memory
            or self.pipeline.memory
            or get_memory(self.settings.memory_kind, settings=self.settings)
        )
        self.conversations = ConversationRepository(session)
        self.messages = MessageRepository(session)

    # ------------------------------------------------------------------

    async def ensure_conversation(
        self, owner_id: str | None, conversation_id: str | None
    ) -> Conversation:
        if conversation_id:
            conversation = await self.conversations.get(conversation_id)
            if conversation is None or conversation.deleted_at is not None:
                raise NotFoundError(
                    f"Conversation {conversation_id!r} not found.",
                    details={"conversation_id": conversation_id},
                )
            return conversation
        conversation = Conversation(
            owner_id=owner_id,
            title="New chat",
        )
        await self.conversations.create(conversation)
        return conversation

    # ------------------------------------------------------------------

    async def chat(self, owner_id: str | None, payload: ChatRequest) -> ChatResponse:
        conversation = await self.ensure_conversation(owner_id, payload.conversation_id)
        params = self._build_generation_params(payload)
        request = RAGRequest(
            query=payload.message,
            conversation_id=conversation.id,
            top_k=payload.top_k,
            system_prompt=payload.system_prompt,
            use_history=payload.use_history,
            generation=params,
            metadata=dict(payload.metadata or {}),
        )
        started = time.monotonic()
        response = await self.pipeline.arun(request)
        latency = (time.monotonic() - started) * 1000
        await self._persist(conversation, payload, response, latency)
        return ChatResponse(
            conversation_id=conversation.id,
            message_id=response.metadata.get("assistant_message_id", "") or "",
            answer=response.answer,
            citations=[
                ChatCitation(
                    chunk_id=item.id,
                    document_id=item.document_id,
                    title=item.document_title,
                    snippet=item.text[:400],
                    score=item.score,
                    metadata=dict(item.metadata),
                )
                for item in response.citations
            ],
            model=response.model,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            total_tokens=response.total_tokens,
            latency_ms=response.latency_ms or latency,
            metadata={"retrieved_count": len(response.citations)},
        )

    async def stream(
        self, owner_id: str | None, payload: ChatRequest
    ) -> AsyncIterator[ChatStreamChunk]:
        conversation = await self.ensure_conversation(owner_id, payload.conversation_id)
        params = self._build_generation_params(payload)
        request = RAGRequest(
            query=payload.message,
            conversation_id=conversation.id,
            top_k=payload.top_k,
            system_prompt=payload.system_prompt,
            use_history=payload.use_history,
            generation=params,
            metadata=dict(payload.metadata or {}),
        )
        chunks: list[str] = []
        async for chunk in self.pipeline.astream(request):
            chunks.append(chunk.delta)
            yield self._to_stream_chunk(conversation, chunk)
        # Persist the assistant message after the stream finishes.
        full_text = "".join(chunks)
        await self._persist_messages(conversation, payload, full_text, [], None)

    # ------------------------------------------------------------------

    def _build_generation_params(self, payload: ChatRequest) -> GenerationParams:
        return GenerationParams(
            model=payload.model,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )

    async def _persist(
        self,
        conversation: Conversation,
        payload: ChatRequest,
        response: RAGResponse,
        latency: float,
    ) -> None:
        citations = [
            {
                "chunk_id": item.id,
                "document_id": item.document_id,
                "title": item.document_title,
                "score": item.score,
            }
            for item in response.citations
        ]
        assistant = await self._persist_messages(
            conversation, payload, response.answer, citations, response
        )
        response.metadata["assistant_message_id"] = assistant.id

    async def _persist_messages(
        self,
        conversation: Conversation,
        payload: ChatRequest,
        answer: str,
        citations: list[dict],
        response: RAGResponse | None,
    ) -> Message:
        next_seq = await self.messages.next_seq(conversation.id)
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=payload.message,
            seq=next_seq,
            citations=[],
            metadata=dict(payload.metadata or {}),
        )
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            seq=next_seq + 1,
            citations=citations,
            prompt_tokens=getattr(response, "prompt_tokens", None),
            completion_tokens=getattr(response, "completion_tokens", None),
            total_tokens=getattr(response, "total_tokens", None),
            latency_ms=getattr(response, "latency_ms", None),
            model=getattr(response, "model", None),
            finish_reason=getattr(response, "finish_reason", None),
        )
        await self.messages.create(user_message)
        await self.messages.create(assistant_message)
        conversation.message_count = (conversation.message_count or 0) + 2
        await self.conversations.touch(conversation)
        return assistant_message

    @staticmethod
    def _to_stream_chunk(conversation: Conversation, chunk: StreamChunk) -> ChatStreamChunk:
        return ChatStreamChunk(
            conversation_id=conversation.id,
            message_id="",
            delta=chunk.delta,
            is_final=chunk.is_final,
            finish_reason=chunk.finish_reason,
            citations=[],
        )


__all__ = ["ChatService"]
