"""Prompt template tests."""

from __future__ import annotations

import pytest

from app.rag.prompts import PromptTemplate, default_qa_prompt


def test_template_renders_required_variables() -> None:
    template = PromptTemplate("Hello $name", required_variables=("name",))
    assert template.render(name="world") == "Hello world"


def test_template_rejects_missing_required_variables() -> None:
    template = PromptTemplate("Hello $name", required_variables=("name",))
    with pytest.raises(ValueError):
        template.render()


def test_default_qa_prompt_renders() -> None:
    rendered = default_qa_prompt.render(context="ctx", question="why?")
    assert "ctx" in rendered
    assert "why?" in rendered
