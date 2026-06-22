"""Core models module for notification-service."""


class ModelsRegistry:
    namespace = "notification-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
