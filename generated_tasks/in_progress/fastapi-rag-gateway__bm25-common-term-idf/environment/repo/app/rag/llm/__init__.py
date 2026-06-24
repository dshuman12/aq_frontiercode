"""Pluggable LLM providers."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError
from app.rag.llm.anthropic import AnthropicLLMProvider
from app.rag.llm.base import (
    BaseLLMProvider,
    ChatMessage,
    GenerationParams,
    GenerationResult,
    LLMProvider,
)
from app.rag.llm.mock import MockLLMProvider
from app.rag.llm.ollama import OllamaLLMProvider
from app.rag.llm.openai import OpenAIChatLLMProvider
from app.rag.llm.openrouter import OpenRouterLLMProvider


def get_llm_provider(settings: Settings | None = None) -> BaseLLMProvider:
    settings = settings or get_settings()
    name = settings.llm_provider
    if name == "openai":
        return OpenAIChatLLMProvider(settings=settings)
    if name == "openrouter":
        return OpenRouterLLMProvider(settings=settings)
    if name == "anthropic":
        return AnthropicLLMProvider(settings=settings)
    if name == "ollama":
        return OllamaLLMProvider(settings=settings)
    if name == "mock":
        return MockLLMProvider(settings=settings)
    raise ConfigurationError(f"Unknown LLM provider: {name!r}")


__all__ = [
    "AnthropicLLMProvider",
    "BaseLLMProvider",
    "ChatMessage",
    "GenerationParams",
    "GenerationResult",
    "LLMProvider",
    "MockLLMProvider",
    "OllamaLLMProvider",
    "OpenAIChatLLMProvider",
    "OpenRouterLLMProvider",
    "get_llm_provider",
]
