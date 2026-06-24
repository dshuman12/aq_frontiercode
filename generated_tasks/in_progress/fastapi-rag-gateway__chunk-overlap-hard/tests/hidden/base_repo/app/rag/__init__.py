"""Retrieval-Augmented Generation building blocks.

The :mod:`app.rag` package is intentionally framework-light: every
abstract base class is a small protocol-like ``ABC`` with no required
runtime dependencies. Concrete implementations live in their own
modules and import optional libraries lazily, so importing
``app.rag`` does not pull in heavy machinery.
"""

from __future__ import annotations

from app.rag.chunking import Chunk, get_chunker
from app.rag.embeddings import EmbeddingProvider, get_embedding_provider
from app.rag.llm import ChatMessage, GenerationResult, LLMProvider, get_llm_provider
from app.rag.loaders import DocumentLoader, LoaderResult, get_loader
from app.rag.memory import ConversationMemory, get_memory
from app.rag.pipeline import RAGPipeline, RAGRequest, RAGResponse
from app.rag.prompts import PromptTemplate, default_qa_prompt
from app.rag.rerankers import Reranker, get_reranker
from app.rag.retrievers import RetrievedItem, Retriever, get_retriever
from app.rag.vectorstores import (
    VectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
    get_vector_store,
)

__all__ = [
    "Chunk",
    "ChatMessage",
    "ConversationMemory",
    "DocumentLoader",
    "EmbeddingProvider",
    "GenerationResult",
    "LLMProvider",
    "LoaderResult",
    "PromptTemplate",
    "RAGPipeline",
    "RAGRequest",
    "RAGResponse",
    "Reranker",
    "RetrievedItem",
    "Retriever",
    "VectorStore",
    "VectorStoreItem",
    "VectorStoreQueryResult",
    "default_qa_prompt",
    "get_chunker",
    "get_embedding_provider",
    "get_llm_provider",
    "get_loader",
    "get_memory",
    "get_reranker",
    "get_retriever",
    "get_vector_store",
]
