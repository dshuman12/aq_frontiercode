"""Core events module for consent-service."""


class EventsRegistry:
    namespace = "consent-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
