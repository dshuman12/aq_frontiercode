"""LLM provider abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Iterable, Sequence
from dataclasses import dataclass, field

from app.core.config import Settings, get_settings
from app.rag.types import (
    ChatTurn,
    GenerationOutput,
    GenerationUsage,
    StreamChunk,
)

ChatMessage = ChatTurn
GenerationResult = GenerationOutput


@dataclass(slots=True)
class GenerationParams:
    """Optional per-call generation overrides."""

    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    stop: tuple[str, ...] | None = None
    metadata: dict[str, object] = field(default_factory=dict)


class BaseLLMProvider(ABC):
    """Async-friendly LLM provider."""

    name: str = "base"
    supports_streaming: bool = False

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def model(self) -> str:
        return self.settings.llm_model

    # ------------------------------------------------------------------

    @abstractmethod
    async def acomplete(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> GenerationOutput:
        """Run a non-streaming completion."""

    async def astream(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """Default streaming fallback that yields the full result as one chunk."""

        result = await self.acomplete(messages, params=params)
        yield StreamChunk(delta=result.text, finish_reason=result.finish_reason, is_final=True)

    # ------------------------------------------------------------------

    def _build_kwargs(self, params: GenerationParams | None) -> dict[str, object]:
        params = params or GenerationParams()
        return {
            "model": params.model or self.model,
            "temperature": (
                params.temperature
                if params.temperature is not None
                else self.settings.llm_temperature
            ),
            "max_tokens": params.max_tokens or self.settings.llm_max_tokens,
            "top_p": params.top_p,
            "stop": list(params.stop) if params.stop else None,
        }

    @staticmethod
    def _make_messages(messages: Iterable[ChatMessage]) -> list[dict[str, str]]:
        return [{"role": message.role, "content": message.content} for message in messages]

    @staticmethod
    def _usage_from_dict(payload: dict | None) -> GenerationUsage | None:
        if not payload:
            return None
        return GenerationUsage(
            prompt_tokens=payload.get("prompt_tokens"),
            completion_tokens=payload.get("completion_tokens"),
            total_tokens=payload.get("total_tokens"),
        )


LLMProvider = BaseLLMProvider


__all__ = [
    "BaseLLMProvider",
    "ChatMessage",
    "GenerationParams",
    "GenerationResult",
    "LLMProvider",
]
