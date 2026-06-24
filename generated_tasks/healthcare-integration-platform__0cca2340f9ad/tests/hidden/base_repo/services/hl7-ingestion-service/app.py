"""Runtime entry point for the hl7-ingestion-service."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceConfig:
    name: str = "hl7-ingestion-service"
    version: str = "0.1.0"
    audit_topic: str = "audit.events"


def health() -> dict[str, str]:
    return {"service": ServiceConfig.name, "status": "ok"}


if __name__ == "__main__":
    print(health())
