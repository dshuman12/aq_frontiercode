"""FHIR R4 Condition type."""

from dataclasses import dataclass, field


@dataclass
class Condition:
    id: str
    resourceType: str = "Condition"
    meta: dict = field(default_factory=dict)
