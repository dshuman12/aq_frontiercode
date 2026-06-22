"""FHIR R4 Location type."""

from dataclasses import dataclass, field


@dataclass
class Location:
    id: str
    resourceType: str = "Location"
    meta: dict = field(default_factory=dict)
