"""FHIR R4 Medication type."""

from dataclasses import dataclass, field


@dataclass
class Medication:
    id: str
    resourceType: str = "Medication"
    meta: dict = field(default_factory=dict)
