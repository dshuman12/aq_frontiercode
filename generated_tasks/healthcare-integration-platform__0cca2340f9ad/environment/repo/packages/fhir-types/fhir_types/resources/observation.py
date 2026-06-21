"""FHIR R4 Observation type."""

from dataclasses import dataclass, field


@dataclass
class Observation:
    id: str
    resourceType: str = "Observation"
    meta: dict = field(default_factory=dict)
