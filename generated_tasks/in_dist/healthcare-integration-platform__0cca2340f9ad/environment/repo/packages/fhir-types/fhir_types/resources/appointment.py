"""FHIR R4 Appointment type."""

from dataclasses import dataclass, field


@dataclass
class Appointment:
    id: str
    resourceType: str = "Appointment"
    meta: dict = field(default_factory=dict)
