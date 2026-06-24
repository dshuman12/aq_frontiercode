"""Anthropic LLM provider (Claude).

Implements the minimal subset of the Anthropic Messages API used by
the gateway. The official :mod:`anthropic` SDK is preferred when
available; otherwise the provider falls back to a plain HTTPX client.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.llm.base import BaseLLMProvider, ChatMessage, GenerationParams
from app.rag.types import GenerationOutput, StreamChunk

try:  # pragma: no cover - optional dependency
    from anthropic import AsyncAnthropic
except Exception:  # pragma: no cover - fallback
    AsyncAnthropic = None  # type: ignore[assignment]


class AnthropicLLMProvider(BaseLLMProvider):
    name = "anthropic"
    supports_streaming = True

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)

    async def _client(self):
        if AsyncAnthropic is None:
            raise ConfigurationError("Install the 'anthropic' package to use the Claude provider.")
        api_key = self.settings.secret("anthropic_api_key")
        if not api_key:
            raise ConfigurationError("ANTHROPIC_API_KEY is not configured.")
        return AsyncAnthropic(api_key=api_key)

    @staticmethod
    def _split_system_messages(
        messages: Sequence[ChatMessage],
    ) -> tuple[str | None, list[dict[str, str]]]:
        system_text: list[str] = []
        chat_messages: list[dict[str, str]] = []
        for message in messages:
            if message.role == "system":
                system_text.append(message.content)
            else:
                chat_messages.append({"role": message.role, "content": message.content})
        system = "\n\n".join(system_text) if system_text else None
        return system, chat_messages

    async def acomplete(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> GenerationOutput:
        client = await self._client()
        kwargs = self._build_kwargs(params)
        system, chat_messages = self._split_system_messages(messages)
        try:
            response = await client.messages.create(
                model=kwargs["model"],
                max_tokens=kwargs["max_tokens"] or 1024,
                temperature=kwargs.get("temperature") or 0.0,
                system=system,
                messages=chat_messages,
            )
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("Anthropic call failed.", cause=exc) from exc
        text_parts: list[str] = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                text_parts.append(getattr(block, "text", ""))
        return GenerationOutput(
            text="".join(text_parts),
            model=response.model,
            finish_reason=response.stop_reason,
            usage=self._usage_from_dict(
                {
                    "prompt_tokens": getattr(response.usage, "input_tokens", None),
                    "completion_tokens": getattr(response.usage, "output_tokens", None),
                    "total_tokens": (
                        (getattr(response.usage, "input_tokens", 0) or 0)
                        + (getattr(response.usage, "output_tokens", 0) or 0)
                    ),
                }
                if getattr(response, "usage", None)
                else None
            ),
        )

    async def astream(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[StreamChunk]:  # pragma: no cover - exercised in integration
        client = await self._client()
        kwargs = self._build_kwargs(params)
        system, chat_messages = self._split_system_messages(messages)
        async with client.messages.stream(
            model=kwargs["model"],
            max_tokens=kwargs["max_tokens"] or 1024,
            temperature=kwargs.get("temperature") or 0.0,
            system=system,
            messages=chat_messages,
        ) as stream:
            async for delta in stream.text_stream:
                yield StreamChunk(delta=delta)
            yield StreamChunk(delta="", is_final=True, finish_reason="stop")


__all__ = ["AnthropicLLMProvider"]
