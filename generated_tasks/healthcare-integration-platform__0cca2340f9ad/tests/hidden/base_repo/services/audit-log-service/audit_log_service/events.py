"""Core events module for audit-log-service."""


class EventsRegistry:
    namespace = "audit-log-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
