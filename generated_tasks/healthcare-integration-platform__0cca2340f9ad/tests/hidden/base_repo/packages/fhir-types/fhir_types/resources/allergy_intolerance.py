"""FHIR R4 AllergyIntolerance type."""

from dataclasses import dataclass, field


@dataclass
class AllergyIntolerance:
    id: str
    resourceType: str = "AllergyIntolerance"
    meta: dict = field(default_factory=dict)
