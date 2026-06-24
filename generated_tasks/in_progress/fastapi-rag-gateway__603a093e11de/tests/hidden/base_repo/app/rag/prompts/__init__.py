"""Prompt templates used by the RAG pipeline."""

from __future__ import annotations

from app.rag.prompts.base import PromptTemplate
from app.rag.prompts.qa import default_qa_prompt
from app.rag.prompts.summarisation import summarisation_prompt
from app.rag.prompts.system import (
    DEFAULT_SYSTEM_PROMPT,
    GUARDRAIL_SYSTEM_PROMPT,
    rag_system_prompt,
)

__all__ = [
    "DEFAULT_SYSTEM_PROMPT",
    "GUARDRAIL_SYSTEM_PROMPT",
    "PromptTemplate",
    "default_qa_prompt",
    "rag_system_prompt",
    "summarisation_prompt",
]
