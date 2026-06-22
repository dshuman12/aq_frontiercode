"""Core events module for auth-service."""


class EventsRegistry:
    namespace = "auth-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
