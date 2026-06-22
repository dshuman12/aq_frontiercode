"""Core models module for api-gateway."""


class ModelsRegistry:
    namespace = "api-gateway.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
