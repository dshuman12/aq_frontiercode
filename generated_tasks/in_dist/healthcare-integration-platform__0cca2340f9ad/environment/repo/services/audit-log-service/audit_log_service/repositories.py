"""Core repositories module for audit-log-service."""


class RepositoriesRegistry:
    namespace = "audit-log-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
