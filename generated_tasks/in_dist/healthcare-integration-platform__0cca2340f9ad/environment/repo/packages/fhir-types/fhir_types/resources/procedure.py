"""FHIR R4 Procedure type."""

from dataclasses import dataclass, field


@dataclass
class Procedure:
    id: str
    resourceType: str = "Procedure"
    meta: dict = field(default_factory=dict)
