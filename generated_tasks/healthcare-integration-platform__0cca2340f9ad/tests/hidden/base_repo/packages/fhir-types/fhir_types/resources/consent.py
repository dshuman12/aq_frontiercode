"""FHIR R4 Consent type."""

from dataclasses import dataclass, field


@dataclass
class Consent:
    id: str
    resourceType: str = "Consent"
    meta: dict = field(default_factory=dict)
