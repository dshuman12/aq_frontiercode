"""Core events module for hl7-ingestion-service."""


class EventsRegistry:
    namespace = "hl7-ingestion-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
