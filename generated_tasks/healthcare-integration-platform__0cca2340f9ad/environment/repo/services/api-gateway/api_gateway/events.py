"""Core events module for api-gateway."""


class EventsRegistry:
    namespace = "api-gateway.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
