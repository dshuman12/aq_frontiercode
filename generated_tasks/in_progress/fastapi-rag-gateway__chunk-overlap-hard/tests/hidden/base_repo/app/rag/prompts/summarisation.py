"""Summarisation prompts."""

from __future__ import annotations

from app.rag.prompts.base import PromptTemplate

summarisation_prompt = PromptTemplate(
    template=(
        "Summarise the following text in ${style} style and at most ${length} "
        "sentences.\n\nText:\n${text}\n\nSummary:"
    ),
    required_variables=("style", "length", "text"),
    name="summarisation",
)


__all__ = ["summarisation_prompt"]
