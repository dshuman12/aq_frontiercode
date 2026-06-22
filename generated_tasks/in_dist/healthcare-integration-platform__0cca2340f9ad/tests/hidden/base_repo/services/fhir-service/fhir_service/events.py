"""Core events module for fhir-service."""


class EventsRegistry:
    namespace = "fhir-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
