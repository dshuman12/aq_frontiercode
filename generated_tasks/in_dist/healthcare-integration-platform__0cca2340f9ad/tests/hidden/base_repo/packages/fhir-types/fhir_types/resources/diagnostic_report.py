"""FHIR R4 DiagnosticReport type."""

from dataclasses import dataclass, field


@dataclass
class DiagnosticReport:
    id: str
    resourceType: str = "DiagnosticReport"
    meta: dict = field(default_factory=dict)
