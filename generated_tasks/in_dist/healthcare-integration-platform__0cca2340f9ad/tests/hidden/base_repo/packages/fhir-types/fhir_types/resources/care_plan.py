"""FHIR R4 CarePlan type."""

from dataclasses import dataclass, field


@dataclass
class CarePlan:
    id: str
    resourceType: str = "CarePlan"
    meta: dict = field(default_factory=dict)
