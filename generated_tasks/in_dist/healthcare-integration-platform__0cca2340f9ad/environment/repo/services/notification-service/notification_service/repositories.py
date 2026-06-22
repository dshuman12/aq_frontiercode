"""Core repositories module for notification-service."""


class RepositoriesRegistry:
    namespace = "notification-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
