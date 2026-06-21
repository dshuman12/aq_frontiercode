"""FHIR R4 DocumentReference type."""

from dataclasses import dataclass, field


@dataclass
class DocumentReference:
    id: str
    resourceType: str = "DocumentReference"
    meta: dict = field(default_factory=dict)
