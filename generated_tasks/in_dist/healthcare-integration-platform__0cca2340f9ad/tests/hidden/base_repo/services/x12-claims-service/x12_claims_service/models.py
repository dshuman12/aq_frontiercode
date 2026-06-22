"""Core models module for x12-claims-service."""


class ModelsRegistry:
    namespace = "x12-claims-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
