# Architecture

The FastAPI RAG Gateway is organised as a layered application that
clearly separates **transport**, **business logic**, **data access**,
and **third-party providers**. Each layer depends only on the layer
beneath it, which makes the codebase easy to test and reason about.

```
              ┌──────────────────────────────┐
              │        HTTP clients          │
              └──────────────┬───────────────┘
                             │
                ┌────────────▼────────────┐
                │   ASGI / FastAPI app    │  app/factory.py + app/api
                ├─────────────────────────┤
                │   Middleware chain      │  app/core/middleware.py
                │   (request id, CORS,    │
                │    rate limit, errors)  │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │   Services              │  app/services
                │   (orchestrate use cases)│
                └────────────┬────────────┘
                             │
       ┌───────────────────────────────────────┐
       │ Repositories                          │  app/repositories
       │ (data access on top of SQLAlchemy)    │
       └────────────┬───────────────┬──────────┘
                    │               │
       ┌────────────▼─┐    ┌────────▼───────────┐
       │ Database     │    │ RAG components     │  app/rag/...
       │ (Postgres /  │    │ (loaders, chunkers,│
       │  SQLite)     │    │  embeddings, LLMs, │
       └──────────────┘    │  vector stores,    │
                           │  retrievers,       │
                           │  rerankers, …)     │
                           └────────────────────┘
```

## Modules

| Module | Responsibility |
| --- | --- |
| `app.core` | Configuration, logging, security, exceptions, middleware, events, constants. |
| `app.db` | SQLAlchemy 2.0 async session, base classes, schema bootstrap. |
| `app.models` | ORM models (User, Document, Chunk, Conversation, Message, ApiKey, AuditLog, IngestionJob, RateLimit). |
| `app.repositories` | Generic + per-model data access layer with pagination + soft delete helpers. |
| `app.schemas` | Pydantic request/response schemas. |
| `app.services` | Use cases — auth, users, API keys, documents, ingestion, chat, search, analytics. |
| `app.rag` | Loaders, chunkers, embeddings, vector stores, retrievers, rerankers, LLMs, prompt templates, conversation memory, end-to-end pipeline. |
| `app.api` | Versioned FastAPI routers. |
| `app.workers` | Celery application, periodic schedule, async tasks. |
| `app.observability` | Prometheus metrics, OpenTelemetry tracing, Sentry. |
| `app.cache` | In-memory + Redis cache backends. |
| `app.cli` | Typer-based ops CLI. |
| `tests` | Unit, integration and end-to-end tests. |

## Backwards compatibility

The original entry points at the repository root (`main.py`,
`rag_core.py`, `indexing.py`, `eval/test_rag.py`) remain functional.
They are now thin compatibility shims that delegate to the modules in
`app/` so existing scripts and deployment recipes continue to work.

## RAG pipeline

`app.rag.pipeline.RAGPipeline` is the high-level orchestrator that
combines a retriever, optional reranker, prompt template, LLM provider,
and conversation memory. Each component is pluggable via the factory
functions in `app.rag.*` and is configured through
[`Settings`](configuration.md).

```python
from app.rag.pipeline import RAGPipeline, RAGRequest

pipeline = RAGPipeline()
response = await pipeline.arun(RAGRequest(query="What is RAG?"))
print(response.answer)
print(response.citations)
```

For streaming, call `pipeline.astream(...)` which yields `StreamChunk`
objects suitable for SSE.

## Persistence

The database schema is defined declaratively in `app/models`. A typed
generic base repository in `app/repositories/base.py` provides:

* `get`, `find_one`, `find_all`, `count`
* `add`, `add_all`, `delete`, `soft_delete`
* `page(request, *whereclauses)` — efficient paginated queries

Each domain repository extends the generic class and adds query helpers
specific to its model (e.g. `UserRepository.get_by_email`,
`MessageRepository.history`).

## API

Routers live under `app/api/v1/routes`. Each router focuses on a single
resource and uses dependency injection for authentication, pagination,
database sessions and feature flags. Routes return Pydantic schemas
defined in `app.schemas` so OpenAPI documentation stays in sync with the
implementation.

Read [docs/api.md](api.md) for the canonical endpoint reference.

## Workers

Long-running ingestion, cleanup and analytics rollups are dispatched via
Celery. The worker app falls back to an in-process stub when Celery is
not installed, so unit tests do not require a broker. See
[docs/runbook.md](runbook.md) for operating the workers.
