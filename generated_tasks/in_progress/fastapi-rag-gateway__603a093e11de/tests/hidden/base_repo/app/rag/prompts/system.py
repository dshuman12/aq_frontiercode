"""System-prompt presets."""

from __future__ import annotations

from app.rag.prompts.base import PromptTemplate

DEFAULT_SYSTEM_PROMPT = PromptTemplate(
    template=(
        "You are the FastAPI RAG Gateway assistant. Answer questions concisely "
        "and cite the supplied context when relevant. Decline politely when the "
        "context does not support the answer."
    ),
    required_variables=(),
    name="default-system",
)


GUARDRAIL_SYSTEM_PROMPT = PromptTemplate(
    template=(
        "You are a safety-focused assistant. Refuse requests that involve "
        "personal data exfiltration, illegal activity, or generating malware. "
        "When refusing, explain why in one short sentence."
    ),
    required_variables=(),
    name="guardrail-system",
)


def rag_system_prompt(persona: str | None = None) -> str:
    """Return a system prompt describing the assistant persona."""

    persona = (persona or "").strip()
    if not persona:
        return DEFAULT_SYSTEM_PROMPT.render()
    return (
        "You are an assistant with the following persona: "
        f"{persona}. Always cite supporting context."
    )


__all__ = [
    "DEFAULT_SYSTEM_PROMPT",
    "GUARDRAIL_SYSTEM_PROMPT",
    "rag_system_prompt",
]
