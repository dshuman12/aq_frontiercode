"""Top-level FastAPI entrypoint.

Historically this module was the entire application. It now delegates
to :mod:`app.factory` so the production-grade architecture under
``app/`` is exposed via the same ``main:app`` ASGI entrypoint that is
referenced from the Dockerfile, ``fly.toml`` and ``render.yaml``.

The legacy ``/query`` endpoint and ``RAGCore`` initialisation behaviour
are preserved so existing clients and deployment recipes keep working.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.factory import create_app
from rag_core import RAGCore

load_dotenv()
logging.basicConfig(level=logging.INFO)

rag_instance: RAGCore | None = None


class QueryRequest(BaseModel):
    question: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the legacy :class:`RAGCore` instance for ``/query``."""

    global rag_instance
    try:
        if not os.getenv("OPENAI_API_KEY"):
            logging.warning(
                "OPENAI_API_KEY not set — legacy /query endpoint will be unavailable."
            )
            rag_instance = None
        else:
            rag_instance = RAGCore()
            logging.info("RAG Core initialized successfully.")
        yield
    except Exception as exc:  # pragma: no cover - defensive
        logging.error("RAG Initialization Failed: %s", exc)
        rag_instance = None
        yield
    finally:
        rag_instance = None


app = create_app()
app.router.lifespan_context = lifespan  # type: ignore[assignment]


@app.get("/legacy", include_in_schema=False)
async def _legacy_redirect() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.post("/query", tags=["legacy"])
async def query_rag_endpoint(request: QueryRequest):
    """Answers a question using the multi-document knowledge base.

    Preserved for backwards compatibility — new clients should use the
    ``/api/v1/chat`` endpoints instead.
    """

    if rag_instance is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service is initializing or unavailable. Check server logs.",
        )
    try:
        return await rag_instance.query(request.question)
    except Exception as exc:  # pragma: no cover - I/O
        logging.error("Query error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing query: {exc}",
        )


def main() -> None:
    port = int(os.getenv("UVICORN_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":  # pragma: no cover
    main()
