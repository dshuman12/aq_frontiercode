"""Deterministic mock LLM provider used in tests and demos."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Sequence

from app.rag.llm.base import BaseLLMProvider, ChatMessage, GenerationParams
from app.rag.types import GenerationOutput, GenerationUsage, StreamChunk


class MockLLMProvider(BaseLLMProvider):
    """Echoes back the prompt with retrieval context attached."""

    name = "mock"
    supports_streaming = True

    async def acomplete(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> GenerationOutput:
        last_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            "",
        )
        text = (
            "[mock-llm] "
            f"You asked: {last_user[:200]} -- responding with the {len(messages)} "
            "messages that were provided."
        )
        usage = GenerationUsage(
            prompt_tokens=sum(len(m.content) for m in messages) // 4,
            completion_tokens=len(text) // 4,
            total_tokens=(sum(len(m.content) for m in messages) + len(text)) // 4,
        )
        return GenerationOutput(
            text=text,
            model=self.model,
            finish_reason="stop",
            usage=usage,
        )

    async def astream(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[StreamChunk]:
        result = await self.acomplete(messages, params=params)
        words = result.text.split()
        for index, word in enumerate(words):
            await asyncio.sleep(0)
            yield StreamChunk(
                delta=word + (" " if index < len(words) - 1 else ""),
                is_final=False,
            )
        yield StreamChunk(delta="", is_final=True, finish_reason="stop")


__all__ = ["MockLLMProvider"]
