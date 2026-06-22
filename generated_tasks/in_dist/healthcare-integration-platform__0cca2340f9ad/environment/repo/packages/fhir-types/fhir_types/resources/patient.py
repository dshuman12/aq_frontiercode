"""FHIR R4 Patient type."""

from dataclasses import dataclass, field


@dataclass
class Patient:
    id: str
    resourceType: str = "Patient"
    meta: dict = field(default_factory=dict)
