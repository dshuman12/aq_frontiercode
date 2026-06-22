"""FHIR R4 Device type."""

from dataclasses import dataclass, field


@dataclass
class Device:
    id: str
    resourceType: str = "Device"
    meta: dict = field(default_factory=dict)
