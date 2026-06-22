"""Core models module for audit-log-service."""


class ModelsRegistry:
    namespace = "audit-log-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
