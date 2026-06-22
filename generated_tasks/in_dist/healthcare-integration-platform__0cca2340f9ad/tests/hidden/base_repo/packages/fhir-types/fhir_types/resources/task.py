"""FHIR R4 Task type."""

from dataclasses import dataclass, field


@dataclass
class Task:
    id: str
    resourceType: str = "Task"
    meta: dict = field(default_factory=dict)
