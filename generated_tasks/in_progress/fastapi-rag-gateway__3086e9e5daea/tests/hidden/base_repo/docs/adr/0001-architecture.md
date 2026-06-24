# ADR 0001 — Layered architecture with pluggable providers

* Status: Accepted
* Date: 2026-05-04

## Context

The original FastAPI RAG Gateway was implemented in a single
`rag_core.py` file. As the project grew we needed:

* Multi-tenant support (users, API keys, audit logs).
* Multiple LLM and embedding providers.
* Async ingestion via background workers.
* A test suite that does not require external services.
* A clear extension point for new vector stores and retrievers.

## Decision

Adopt a layered architecture with explicit dependency rules:

1. `app.core` provides cross-cutting primitives (config, logging,
   security, middleware, exceptions, events, constants).
2. `app.db`, `app.models`, `app.repositories` form the persistence
   layer.
3. `app.rag` packages every RAG building block behind a small set of
   abstract base classes (`BaseChunker`, `BaseEmbeddingProvider`,
   `BaseLLMProvider`, `BaseVectorStore`, `BaseRetriever`,
   `BaseReranker`, `BaseMemory`).
4. `app.services` contains use cases that combine repositories + RAG
   components.
5. `app.api` exposes versioned HTTP routes that depend on services
   through FastAPI's DI system.
6. `app.workers`, `app.cli`, `app.observability`, `app.cache`
   support cross-cutting operations.

Each provider is selected at runtime via `Settings`, with factory
functions returning the appropriate implementation. Every provider has
a `mock` / `memory` variant for testing.

## Consequences

* **Pros** — clear separation, easy to test, simple to extend with new
  providers, and supports evolutionary deployment topologies (single
  process, separate API + worker, multiple replicas behind a load
  balancer).
* **Cons** — more files and ceremony than the original prototype. New
  contributors need to understand the layering, but
  `docs/architecture.md` and the per-package `__init__.py` docstrings
  make this approachable.

## Alternatives considered

* Keep everything in `rag_core.py`. Rejected — adding multi-tenancy and
  background processing without a clear architecture would create
  tightly coupled code.
* Adopt a framework like Django. Rejected — FastAPI + SQLAlchemy gives
  us native async support, OpenAPI generation, and avoids importing a
  large dependency we wouldn't otherwise need.
