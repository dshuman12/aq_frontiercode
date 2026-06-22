"""FHIR R4 Encounter type."""

from dataclasses import dataclass, field


@dataclass
class Encounter:
    id: str
    resourceType: str = "Encounter"
    meta: dict = field(default_factory=dict)
