"""FHIR R4 MedicationRequest type."""

from dataclasses import dataclass, field


@dataclass
class MedicationRequest:
    id: str
    resourceType: str = "MedicationRequest"
    meta: dict = field(default_factory=dict)
