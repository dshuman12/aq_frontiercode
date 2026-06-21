"""FHIR R4 ServiceRequest type."""

from dataclasses import dataclass, field


@dataclass
class ServiceRequest:
    id: str
    resourceType: str = "ServiceRequest"
    meta: dict = field(default_factory=dict)
