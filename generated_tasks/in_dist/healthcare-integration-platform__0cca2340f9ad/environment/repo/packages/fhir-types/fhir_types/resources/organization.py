"""FHIR R4 Organization type."""

from dataclasses import dataclass, field


@dataclass
class Organization:
    id: str
    resourceType: str = "Organization"
    meta: dict = field(default_factory=dict)
