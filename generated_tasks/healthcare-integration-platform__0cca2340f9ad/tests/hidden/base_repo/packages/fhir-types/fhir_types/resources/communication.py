"""FHIR R4 Communication type."""

from dataclasses import dataclass, field


@dataclass
class Communication:
    id: str
    resourceType: str = "Communication"
    meta: dict = field(default_factory=dict)
