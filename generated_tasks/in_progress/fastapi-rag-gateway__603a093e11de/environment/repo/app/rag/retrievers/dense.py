"""Dense vector retriever — embeds the query and searches the vector store."""

from __future__ import annotations

from app.rag.embeddings import BaseEmbeddingProvider, get_embedding_provider
from app.rag.retrievers.base import BaseRetriever, RetrievedItem
from app.rag.vectorstores import BaseVectorStore, get_vector_store


class DenseRetriever(BaseRetriever):
    name = "dense"

    def __init__(
        self,
        *,
        settings=None,
        embedder: BaseEmbeddingProvider | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        super().__init__(settings=settings)
        self.embedder = embedder or get_embedding_provider(self.settings)
        self.vector_store = vector_store or get_vector_store(self.settings)

    def retrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        if not query.strip():
            return []
        embedding = self.embedder.embed(query).vector
        filter = kwargs.get("filter")
        results = self.vector_store.query(embedding, top_k=top_k, filter=filter)
        return self.assign_ranks(
            [
                RetrievedItem(
                    id=result.id,
                    text=result.text,
                    score=result.score,
                    metadata=result.metadata,
                    document_id=result.metadata.get("document_id"),
                    document_title=result.metadata.get("document_title"),
                )
                for result in results
            ]
        )

    async def aretrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        embedding = await self.embedder.aembed(query)
        filter = kwargs.get("filter")
        results = await self.vector_store.aquery(embedding.vector, top_k=top_k, filter=filter)
        return self.assign_ranks(
            [
                RetrievedItem(
                    id=result.id,
                    text=result.text,
                    score=result.score,
                    metadata=result.metadata,
                    document_id=result.metadata.get("document_id"),
                    document_title=result.metadata.get("document_title"),
                )
                for result in results
            ]
        )


__all__ = ["DenseRetriever"]
