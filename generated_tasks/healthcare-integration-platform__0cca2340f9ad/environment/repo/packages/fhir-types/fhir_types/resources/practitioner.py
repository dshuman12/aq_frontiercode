"""FHIR R4 Practitioner type."""

from dataclasses import dataclass, field


@dataclass
class Practitioner:
    id: str
    resourceType: str = "Practitioner"
    meta: dict = field(default_factory=dict)
