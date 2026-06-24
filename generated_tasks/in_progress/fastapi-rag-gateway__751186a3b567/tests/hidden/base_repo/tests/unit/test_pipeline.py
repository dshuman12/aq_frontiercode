"""End-to-end RAG pipeline test using mock providers."""

from __future__ import annotations

import asyncio

import pytest

from app.core.config import Settings
from app.rag.chunking import get_chunker
from app.rag.embeddings.mock import MockEmbeddingProvider
from app.rag.llm.mock import MockLLMProvider
from app.rag.memory.window import WindowMemory
from app.rag.pipeline import RAGPipeline, RAGRequest
from app.rag.rerankers.identity import IdentityReranker
from app.rag.retrievers.dense import DenseRetriever
from app.rag.types import Document
from app.rag.vectorstores import VectorStoreItem
from app.rag.vectorstores.memory import InMemoryVectorStore


def _setup() -> RAGPipeline:
    settings = Settings()
    embedder = MockEmbeddingProvider(settings=settings)
    store = InMemoryVectorStore(settings=settings)
    chunker = get_chunker("recursive")
    docs = [
        Document(text="Cats are independent pets that often sleep most of the day.", title="cats"),
        Document(text="Dogs are loyal companions that need daily exercise.", title="dogs"),
    ]
    chunks = chunker.chunk_many(docs)
    items = []
    for index, chunk in enumerate(chunks):
        embedding = embedder.embed(chunk.text).vector
        items.append(
            VectorStoreItem(
                id=f"c{index}",
                text=chunk.text,
                embedding=embedding,
                metadata={"document_title": chunk.document_title or "?"},
            )
        )
    store.upsert(items)
    return RAGPipeline(
        settings=settings,
        retriever=DenseRetriever(settings=settings, embedder=embedder, vector_store=store),
        reranker=IdentityReranker(settings=settings),
        llm=MockLLMProvider(settings=settings),
        embeddings=embedder,
        vector_store=store,
        memory=WindowMemory(settings=settings),
    )


@pytest.mark.asyncio
async def test_pipeline_returns_answer_and_citations() -> None:
    pipeline = _setup()
    response = await pipeline.arun(RAGRequest(query="What do cats do?"))
    assert response.answer
    assert response.citations


def test_pipeline_can_run_via_asyncio_run() -> None:
    pipeline = _setup()
    response = asyncio.run(pipeline.arun(RAGRequest(query="What do dogs do?")))
    assert response.answer
