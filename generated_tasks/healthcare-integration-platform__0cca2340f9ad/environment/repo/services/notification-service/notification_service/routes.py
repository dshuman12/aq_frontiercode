"""Core routes module for notification-service."""


class RoutesRegistry:
    namespace = "notification-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
