# rag_core.py
import os
from typing import Any, Dict
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from indexing import load_and_index_documents
from langchain_core.language_models import BaseChatModel
from dotenv import load_dotenv
import logging

load_dotenv() 

logger = logging.getLogger(__name__)

class RAGCore:
    def __init__(self):
        logger.info("Initializing RAGCore...")
        
        vector_store = load_and_index_documents()
        if not vector_store:
            raise RuntimeError("RAG system failed to load documents. Check indexing.py logs.")

        logger.info("Vector store loaded successfully")
        
        self.retriever = vector_store.as_retriever(search_kwargs={"k": 2})
        
        rag_model = os.getenv("RAG_LLM_MODEL")
        rag_base_url = os.getenv("RAG_LLM_BASE_URL")
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

        if not rag_model or not rag_base_url:
            raise ValueError("RAG LLM configuration (RAG_LLM_MODEL / RAG_LLM_BASE_URL) not set in .env.")
        
        if not openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not set in .env. Get one from https://openrouter.ai/keys")
            
        logger.info(f"Initializing LLM with model: {rag_model}, base_url: {rag_base_url}")
        
        self.llm: BaseChatModel = ChatOpenAI(
            model=rag_model,
            openai_api_key=openrouter_api_key,
            base_url=rag_base_url,
            temperature=0
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm, 
            chain_type="stuff", 
            retriever=self.retriever,
            return_source_documents=True  # This might help with debugging
        )
        
        logger.info("RAGCore initialized successfully")
    
    async def query(self, question: str) -> Dict[str, Any]:
        """Runs the RAG chain ASYNCHRONOUSLY and returns the answer and retrieved context."""
        try:
            result = await self.qa_chain.ainvoke({"query": question})
            
            retrieved_docs = await self.retriever.aget_relevant_documents(question)
            context = [doc.page_content for doc in retrieved_docs]
            
            return {
                "answer": result.get("result", "Sorry, I couldn't find an answer."),
                "context": context
            }
        except Exception as e:
            logger.error(f"Query error: {e}", exc_info=True)
            raise