"""Settings tests."""

from __future__ import annotations

import pytest

from app.core.config import Settings


def test_defaults_are_consistent() -> None:
    settings = Settings()
    assert settings.app_name
    assert settings.app_version
    assert settings.api_prefix.startswith("/")
    assert settings.environment in {"development", "staging", "production", "test"}


def test_secret_helper_returns_plaintext() -> None:
    settings = Settings()
    assert settings.secret("nonexistent") is None
    assert settings.mask_secret("nonexistent") is None


def test_resolve_path_returns_path() -> None:
    settings = Settings()
    path = settings.resolve_path("data/example.txt")
    assert str(path).endswith("data/example.txt")


def test_dump_redacts_secrets() -> None:
    settings = Settings()
    dump = settings.model_dump_safe()
    sensitive_suffixes = ("_password", "_api_key", "_dsn", "secret_key")
    for key, value in dump.items():
        if any(key.endswith(suffix) or key == suffix for suffix in sensitive_suffixes):
            if value in (None, ""):
                continue
            assert any(ch in str(value) for ch in ("…", "*"))


@pytest.mark.parametrize(
    "name",
    ["llm_provider", "embedding_provider", "vector_store", "retriever", "reranker"],
)
def test_provider_names_are_strings(name: str) -> None:
    settings = Settings()
    assert isinstance(getattr(settings, name), str)
