"""FHIR R4 Immunization type."""

from dataclasses import dataclass, field


@dataclass
class Immunization:
    id: str
    resourceType: str = "Immunization"
    meta: dict = field(default_factory=dict)
