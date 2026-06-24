"""OpenRouter LLM provider — wraps OpenAI's API with a different base URL."""

from __future__ import annotations

from app.core.exceptions import ConfigurationError
from app.rag.llm.openai import OpenAIChatLLMProvider


class OpenRouterLLMProvider(OpenAIChatLLMProvider):
    name = "openrouter"

    def _api_key(self) -> str | None:
        return self.settings.secret("openrouter_api_key") or self.settings.secret("openai_api_key")

    def _base_url(self) -> str | None:
        url = self.settings.llm_base_url
        if not url:
            raise ConfigurationError(
                "RAG_LLM_BASE_URL is required when using the OpenRouter provider."
            )
        return str(url)


__all__ = ["OpenRouterLLMProvider"]
