"""FHIR R4 Coverage type."""

from dataclasses import dataclass, field


@dataclass
class Coverage:
    id: str
    resourceType: str = "Coverage"
    meta: dict = field(default_factory=dict)
