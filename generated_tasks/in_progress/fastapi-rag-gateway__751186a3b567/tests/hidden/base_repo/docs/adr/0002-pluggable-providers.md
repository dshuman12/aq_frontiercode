# ADR 0002 — Pluggable providers behind small base classes

* Status: Accepted
* Date: 2026-05-04

## Context

The gateway needs to integrate with several external services
(OpenAI, OpenRouter, Anthropic, Ollama, HuggingFace, Sentence
Transformers, Chroma, FAISS, Qdrant, Pinecone, pgvector, …) as well as
ship usable mock implementations for tests and offline development.

## Decision

Each concept (loader, chunker, embedding provider, LLM provider, vector
store, retriever, reranker, memory) is described by a small abstract
base class in `app/rag/<concept>/base.py`. Concrete implementations
live in sibling modules. The package's `__init__.py` exposes a
`get_<concept>(...)` factory which:

1. Reads `Settings` to pick the implementation.
2. Instantiates the concrete class with provider-specific config.
3. Validates that any required optional dependency is installed and
   raises a clear `ConfigurationError` otherwise.

Each provider that wraps a third-party SDK gracefully degrades when the
SDK is missing — imports are deferred so the application remains
importable and the user is told which package to install.

## Consequences

* **Pros** — uniform mental model, easy to add new providers,
  reproducible tests (mock everywhere), no hidden coupling between
  providers.
* **Cons** — a small amount of boilerplate per provider. We accept this
  in exchange for the clarity and testability gained.
