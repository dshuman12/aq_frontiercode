"""FHIR R4 Specimen type."""

from dataclasses import dataclass, field


@dataclass
class Specimen:
    id: str
    resourceType: str = "Specimen"
    meta: dict = field(default_factory=dict)
