"""FHIR R4 ExplanationOfBenefit type."""

from dataclasses import dataclass, field


@dataclass
class ExplanationOfBenefit:
    id: str
    resourceType: str = "ExplanationOfBenefit"
    meta: dict = field(default_factory=dict)
