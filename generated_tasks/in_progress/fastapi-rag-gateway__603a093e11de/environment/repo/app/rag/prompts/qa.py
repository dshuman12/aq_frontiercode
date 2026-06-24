"""Question-answering prompts."""

from __future__ import annotations

from app.rag.prompts.base import PromptTemplate

default_qa_prompt = PromptTemplate(
    template=(
        "Use the following pieces of context to answer the user's question.\n"
        "If you don't know the answer, say so honestly — do not invent facts.\n\n"
        "Context:\n${context}\n\n"
        "Question: ${question}\n\n"
        "Provide a concise answer and, where helpful, mention the source titles."
    ),
    required_variables=("context", "question"),
    name="default-qa",
)


CITATION_QA_PROMPT = PromptTemplate(
    template=(
        "You are a careful assistant. Use ONLY the numbered context entries to "
        "answer the question. Add citation markers like [1], [2] after the "
        "sentences they support.\n\n"
        "Context:\n${context}\n\n"
        "Question: ${question}\n\n"
        "Answer:"
    ),
    required_variables=("context", "question"),
    name="citation-qa",
)


CONVERSATIONAL_QA_PROMPT = PromptTemplate(
    template=(
        "Continue the conversation given the supplied context. Refuse politely "
        "if the answer is not contained in the context.\n\n"
        "Conversation history:\n${history}\n\n"
        "Context:\n${context}\n\n"
        "User: ${question}\n"
        "Assistant:"
    ),
    required_variables=("history", "context", "question"),
    name="conversational-qa",
)


__all__ = [
    "CITATION_QA_PROMPT",
    "CONVERSATIONAL_QA_PROMPT",
    "default_qa_prompt",
]
