"""Core events module for terminology-service."""


class EventsRegistry:
    namespace = "terminology-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
