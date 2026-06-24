"""OpenAI chat-completions LLM provider."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.llm.base import BaseLLMProvider, ChatMessage, GenerationParams
from app.rag.types import GenerationOutput, StreamChunk

try:  # pragma: no cover - optional dependency
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - graceful degradation
    AsyncOpenAI = None  # type: ignore[assignment]


class OpenAIChatLLMProvider(BaseLLMProvider):
    name = "openai"
    supports_streaming = True

    def __init__(self, *, settings=None, client=None) -> None:
        super().__init__(settings=settings)
        self._client_override = client

    async def _client(self):
        if self._client_override is not None:
            return self._client_override
        if AsyncOpenAI is None:
            raise ConfigurationError("Install 'openai' to use the OpenAI chat provider.")
        api_key = self._api_key()
        if not api_key:
            raise ConfigurationError("OPENAI_API_KEY is not configured.")
        kwargs: dict = {"api_key": api_key}
        base_url = self._base_url()
        if base_url:
            kwargs["base_url"] = str(base_url)
        return AsyncOpenAI(**kwargs)

    def _api_key(self) -> str | None:
        return self.settings.secret("openai_api_key")

    def _base_url(self) -> str | None:
        return getattr(self.settings, "openai_base_url", None)

    async def acomplete(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> GenerationOutput:
        client = await self._client()
        kwargs = self._build_kwargs(params)
        try:
            response = await client.chat.completions.create(
                messages=self._make_messages(messages),
                **{k: v for k, v in kwargs.items() if v is not None},
            )
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("OpenAI completion failed.", cause=exc) from exc
        choice = response.choices[0]
        return GenerationOutput(
            text=choice.message.content or "",
            model=response.model,
            finish_reason=choice.finish_reason,
            usage=self._usage_from_dict(response.usage.model_dump() if response.usage else None),
            raw={"id": response.id},
        )

    async def astream(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[StreamChunk]:
        client = await self._client()
        kwargs = self._build_kwargs(params)
        try:
            stream = await client.chat.completions.create(
                messages=self._make_messages(messages),
                stream=True,
                **{k: v for k, v in kwargs.items() if v is not None},
            )
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("OpenAI stream failed.", cause=exc) from exc
        async for chunk in stream:
            choice = chunk.choices[0]
            delta = (choice.delta.content or "") if choice.delta else ""
            yield StreamChunk(
                delta=delta,
                finish_reason=choice.finish_reason,
                is_final=choice.finish_reason is not None,
            )


__all__ = ["OpenAIChatLLMProvider"]
