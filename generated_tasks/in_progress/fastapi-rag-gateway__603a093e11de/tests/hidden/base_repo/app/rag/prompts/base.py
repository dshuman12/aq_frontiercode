"""Prompt template helper."""

from __future__ import annotations

import string
from dataclasses import dataclass, field


@dataclass(slots=True)
class PromptTemplate:
    """A safe-substitution prompt template."""

    template: str
    required_variables: tuple[str, ...] = field(default_factory=tuple)
    name: str = "prompt"

    def render(self, **values: object) -> str:
        missing = [var for var in self.required_variables if var not in values]
        if missing:
            raise ValueError(f"Prompt {self.name!r} is missing variables: {', '.join(missing)}")
        return string.Template(self.template).safe_substitute(values)

    def __call__(self, **values: object) -> str:
        return self.render(**values)


__all__ = ["PromptTemplate"]
