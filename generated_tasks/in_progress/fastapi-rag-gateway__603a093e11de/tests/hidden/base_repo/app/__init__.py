"""FastAPI RAG Gateway — production application package.

This package contains the production-grade architecture for the
FastAPI RAG Gateway service. It is organised into layered subpackages:

* :mod:`app.core` — cross-cutting primitives (config, logging, security,
  middleware, exceptions, events, constants).
* :mod:`app.db` — SQLAlchemy session management and database initialisation.
* :mod:`app.models` — ORM models for persistent state.
* :mod:`app.schemas` — Pydantic request/response schemas.
* :mod:`app.repositories` — data-access layer.
* :mod:`app.services` — business logic / use-cases.
* :mod:`app.rag` — pluggable RAG building blocks (chunkers, loaders,
  embeddings, vector stores, retrievers, rerankers, LLMs, prompts).
* :mod:`app.api` — FastAPI routers grouped by API version.
* :mod:`app.workers` — Celery background workers.
* :mod:`app.cache` — Redis / in-memory caching utilities.
* :mod:`app.observability` — metrics, tracing, error reporting.
* :mod:`app.utils` — small reusable helpers.
* :mod:`app.cli` — Typer-based operational CLI.

The legacy modules at the repository root (``main.py``, ``rag_core.py``,
``indexing.py``) remain functional and now delegate to this package so
that existing scripts and deployment recipes continue to work.
"""

from __future__ import annotations

__all__ = [
    "__version__",
    "__title__",
    "__summary__",
    "get_version",
]

__version__ = "1.0.0"
__title__ = "fastapi-rag-gateway"
__summary__ = (
    "Production-grade Retrieval-Augmented Generation gateway built on "
    "FastAPI, SQLAlchemy, LangChain and a pluggable provider model."
)


def get_version() -> str:
    """Return the package version string."""

    return __version__
