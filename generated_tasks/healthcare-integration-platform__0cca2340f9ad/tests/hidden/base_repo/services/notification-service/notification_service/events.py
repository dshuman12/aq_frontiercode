"""Core events module for notification-service."""


class EventsRegistry:
    namespace = "notification-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
