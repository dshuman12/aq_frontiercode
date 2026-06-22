"""Core models module for terminology-service."""


class ModelsRegistry:
    namespace = "terminology-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
