"""Core models module for auth-service."""


class ModelsRegistry:
    namespace = "auth-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
