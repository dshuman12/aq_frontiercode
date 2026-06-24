"""Ollama LLM provider (local models)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.llm.base import BaseLLMProvider, ChatMessage, GenerationParams
from app.rag.types import GenerationOutput, StreamChunk

try:  # pragma: no cover - optional dependency
    import httpx
except Exception:  # pragma: no cover
    httpx = None  # type: ignore[assignment]


class OllamaLLMProvider(BaseLLMProvider):
    name = "ollama"
    supports_streaming = True

    def _ensure_httpx(self):
        if httpx is None:
            raise ConfigurationError("Install 'httpx' to use the Ollama LLM provider.")

    @property
    def base_url(self) -> str:
        return str(self.settings.ollama_base_url or "http://localhost:11434")

    async def acomplete(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> GenerationOutput:
        self._ensure_httpx()
        kwargs = self._build_kwargs(params)
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": kwargs["model"],
                        "messages": self._make_messages(messages),
                        "stream": False,
                        "options": {
                            "temperature": kwargs.get("temperature"),
                            "num_predict": kwargs.get("max_tokens"),
                        },
                    },
                )
                response.raise_for_status()
            except Exception as exc:  # pragma: no cover - network behaviour
                raise ExternalServiceError("Ollama call failed.", cause=exc) from exc
        body = response.json()
        return GenerationOutput(
            text=body.get("message", {}).get("content", ""),
            model=body.get("model", kwargs["model"]),
            finish_reason=body.get("done_reason"),
        )

    async def astream(
        self,
        messages: Sequence[ChatMessage],
        *,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[StreamChunk]:  # pragma: no cover - integration only
        self._ensure_httpx()
        kwargs = self._build_kwargs(params)
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": kwargs["model"],
                    "messages": self._make_messages(messages),
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    import json

                    payload = json.loads(line)
                    delta = payload.get("message", {}).get("content", "")
                    finished = bool(payload.get("done"))
                    yield StreamChunk(
                        delta=delta,
                        finish_reason=payload.get("done_reason") if finished else None,
                        is_final=finished,
                    )


__all__ = ["OllamaLLMProvider"]
