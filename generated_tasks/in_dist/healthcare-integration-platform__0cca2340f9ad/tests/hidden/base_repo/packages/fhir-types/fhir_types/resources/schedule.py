"""FHIR R4 Schedule type."""

from dataclasses import dataclass, field


@dataclass
class Schedule:
    id: str
    resourceType: str = "Schedule"
    meta: dict = field(default_factory=dict)
