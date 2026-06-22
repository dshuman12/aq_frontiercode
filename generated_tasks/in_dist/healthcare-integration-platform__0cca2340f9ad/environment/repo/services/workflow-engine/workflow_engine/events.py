"""Core events module for workflow-engine."""


class EventsRegistry:
    namespace = "workflow-engine.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
