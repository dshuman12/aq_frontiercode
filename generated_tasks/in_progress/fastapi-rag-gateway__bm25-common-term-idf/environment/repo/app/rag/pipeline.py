"""High-level RAG pipeline that ties everything together."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field

from app.core.config import Settings, get_settings
from app.rag.embeddings import BaseEmbeddingProvider, get_embedding_provider
from app.rag.llm import (
    BaseLLMProvider,
    ChatMessage,
    GenerationParams,
    get_llm_provider,
)
from app.rag.memory import BaseMemory, get_memory
from app.rag.prompts import (
    DEFAULT_SYSTEM_PROMPT,
    PromptTemplate,
    default_qa_prompt,
)
from app.rag.rerankers import BaseReranker, get_reranker
from app.rag.retrievers import BaseRetriever, RetrievedItem, get_retriever
from app.rag.types import GenerationOutput, StreamChunk
from app.rag.vectorstores import BaseVectorStore, get_vector_store


@dataclass(slots=True)
class RAGRequest:
    """Inputs for a single RAG query."""

    query: str
    conversation_id: str | None = None
    top_k: int = 4
    score_threshold: float | None = None
    rerank: bool | None = None
    system_prompt: str | None = None
    use_history: bool = True
    metadata: dict[str, object] = field(default_factory=dict)
    extra_filter: dict[str, object] | None = None
    generation: GenerationParams | None = None


@dataclass(slots=True)
class RAGResponse:
    """Result of running the pipeline."""

    answer: str
    citations: list[RetrievedItem]
    model: str
    finish_reason: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: float | None = None
    metadata: dict[str, object] = field(default_factory=dict)


class RAGPipeline:
    """Composable RAG pipeline.

    The pipeline owns a retriever, optional reranker, prompt template,
    LLM provider and conversation memory. Each component can be swapped
    via constructor arguments to support unit testing or alternative
    deployments.
    """

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        retriever: BaseRetriever | None = None,
        reranker: BaseReranker | None = None,
        llm: BaseLLMProvider | None = None,
        embeddings: BaseEmbeddingProvider | None = None,
        vector_store: BaseVectorStore | None = None,
        memory: BaseMemory | None = None,
        prompt: PromptTemplate | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.embeddings = embeddings or get_embedding_provider(self.settings)
        self.vector_store = vector_store or get_vector_store(self.settings)
        self.retriever = retriever or get_retriever(self.settings.retriever, settings=self.settings)
        self.reranker = reranker or get_reranker(self.settings.reranker, settings=self.settings)
        self.llm = llm or get_llm_provider(self.settings)
        self.memory = memory or get_memory(self.settings.memory_kind, settings=self.settings)
        self.prompt = prompt or default_qa_prompt

    # ------------------------------------------------------------------

    async def arun(self, request: RAGRequest) -> RAGResponse:
        started = time.monotonic()
        retrieved = await self._retrieve(request)
        messages = self._build_messages(request, retrieved)
        result = await self.llm.acomplete(messages, params=request.generation)
        latency = (time.monotonic() - started) * 1000
        self._update_memory(request, messages[-1], result)
        return RAGResponse(
            answer=result.text,
            citations=retrieved,
            model=result.model,
            finish_reason=result.finish_reason,
            prompt_tokens=getattr(result.usage, "prompt_tokens", None),
            completion_tokens=getattr(result.usage, "completion_tokens", None),
            total_tokens=getattr(result.usage, "total_tokens", None),
            latency_ms=latency,
            metadata={"retrieved_count": len(retrieved)},
        )

    async def astream(self, request: RAGRequest) -> AsyncIterator[StreamChunk]:
        retrieved = await self._retrieve(request)
        messages = self._build_messages(request, retrieved)
        async for chunk in self.llm.astream(messages, params=request.generation):
            yield chunk
        # Final chunk with citations payload — caller can inspect via
        # ``raw`` to surface them through SSE.
        yield StreamChunk(
            delta="",
            is_final=True,
            finish_reason="stop",
            raw={"citations": [item.__dict__ for item in retrieved]},
        )

    # ------------------------------------------------------------------

    async def _retrieve(self, request: RAGRequest) -> list[RetrievedItem]:
        items = await self.retriever.aretrieve(
            request.query,
            top_k=max(request.top_k * 2, request.top_k),
            filter=request.extra_filter,
        )
        if request.score_threshold is not None:
            items = [item for item in items if item.score >= request.score_threshold]
        rerank = request.rerank
        if rerank is None:
            rerank = self.settings.rerank_enabled
        if rerank:
            items = await self.reranker.arerank(request.query, items, top_k=request.top_k)
        return list(items[: request.top_k])

    # ------------------------------------------------------------------

    def _build_messages(
        self,
        request: RAGRequest,
        retrieved: Sequence[RetrievedItem],
    ) -> list[ChatMessage]:
        system_text = request.system_prompt or DEFAULT_SYSTEM_PROMPT.render()
        context = self._format_context(retrieved)
        prompt = self.prompt.render(context=context, question=request.query)
        history: list[ChatMessage] = []
        if request.use_history and request.conversation_id:
            history = self.memory.messages(request.conversation_id)
        messages: list[ChatMessage] = [ChatMessage(role="system", content=system_text)]
        messages.extend(history)
        messages.append(ChatMessage(role="user", content=prompt))
        return messages

    @staticmethod
    def _format_context(items: Sequence[RetrievedItem]) -> str:
        if not items:
            return "(no supporting context found)"
        parts: list[str] = []
        for index, item in enumerate(items, start=1):
            title = item.document_title or item.document_id or item.id
            parts.append(f"[{index}] {title}\n{item.text.strip()}")
        return "\n\n".join(parts)

    def _update_memory(
        self,
        request: RAGRequest,
        last_user_message: ChatMessage,
        result: GenerationOutput,
    ) -> None:
        if not request.conversation_id:
            return
        self.memory.remember(
            request.conversation_id,
            ChatMessage(role="user", content=last_user_message.content),
        )
        self.memory.remember(
            request.conversation_id,
            ChatMessage(role="assistant", content=result.text),
        )


__all__ = ["RAGPipeline", "RAGRequest", "RAGResponse"]
