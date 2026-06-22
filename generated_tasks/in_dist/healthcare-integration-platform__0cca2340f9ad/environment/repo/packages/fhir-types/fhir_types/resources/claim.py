"""FHIR R4 Claim type."""

from dataclasses import dataclass, field


@dataclass
class Claim:
    id: str
    resourceType: str = "Claim"
    meta: dict = field(default_factory=dict)
