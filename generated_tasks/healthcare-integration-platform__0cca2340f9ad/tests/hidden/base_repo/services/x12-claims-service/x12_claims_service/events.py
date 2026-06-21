"""Core events module for x12-claims-service."""


class EventsRegistry:
    namespace = "x12-claims-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
