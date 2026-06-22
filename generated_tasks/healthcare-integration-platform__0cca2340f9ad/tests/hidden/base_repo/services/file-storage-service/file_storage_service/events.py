"""Core events module for file-storage-service."""


class EventsRegistry:
    namespace = "file-storage-service.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
